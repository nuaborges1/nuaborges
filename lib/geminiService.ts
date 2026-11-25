/**
 * geminiService.ts — Serviço server-side para triagem e entrevista via Gemini API.
 * 
 * NUNCA importar em componentes client.
 * Compatível exclusivamente com ambientes edge/serverless (Cloudflare Pages Functions / Workers).
 * Utiliza estritamente APIs Web universais (fetch, AbortController) sem dependências de Node.js.
 */

import {
  VALID_TYPES,
  VALID_PRIORITIES,
  VALID_SCOPES,
  RequestType,
  RequestPriority,
  ContractScope,
  ProjectPhaseContext,
  detectTargetFilesHeuristic,
  sanitizeTargetFiles,
  classifyRequestType,
  classifyRequestPriority,
  classifyContractScope,
  buildAgentPrompt,
  buildHeuristicAiPrompt,
  normalizeText,
} from './requestHeuristics';

import {
  GeminiEnv,
  RequestAnalysis,
  InterviewMessage,
  InterviewResponse,
  CallGeminiResult,
  GeminiContent,
} from './gemini/types';

import { safeTruncate, parseJsonSafely, callGeminiApi } from './gemini/apiClient';
import {
  ANALYZE_REQUEST_SYSTEM_PROMPT,
  ANALYZE_REQUEST_RESPONSE_SCHEMA,
  INTERVIEW_ASSISTANT_SYSTEM_PROMPT,
  INTERVIEW_RESPONSE_SCHEMA,
} from './gemini/prompts';

// Re-exporta tipos e funções puras para uso do servidor
export type {
  GeminiEnv,
  RequestAnalysis,
  InterviewMessage,
  InterviewResponse,
  CallGeminiResult,
};

export {
  parseJsonSafely,
  detectTargetFilesHeuristic,
  buildHeuristicAiPrompt,
  buildAgentPrompt,
  classifyContractScope,
  classifyRequestType,
  classifyRequestPriority,
};

/**
 * Realiza triagem heurística determinística (fallback 0ms sem consumo de API).
 */
export function heuristicOneShot(text: string, ctx?: ProjectPhaseContext): RequestAnalysis {
  const type = classifyRequestType(text);
  const priority = classifyRequestPriority(text, type);
  const contractScope = classifyContractScope(text, ctx);

  const cleanText = text.trim();
  const title = cleanText.length <= 70 ? cleanText : `${cleanText.slice(0, 67)}...`;
  const summary = safeTruncate(cleanText, 300);
  const targetFiles = detectTargetFilesHeuristic(cleanText);

  const aiAgentPrompt = buildAgentPrompt({
    title,
    summary,
    type,
    priority,
    contractScope,
    targetFiles,
    clientText: cleanText,
  });

  return {
    title,
    type,
    priority,
    summary,
    contractScope,
    technicalPlan: `1. Abrir arquivos-alvo: ${targetFiles.join(', ')}.\n2. Executar ajuste conforme especificação.\n3. Validar compilação com npx tsc --noEmit.\n4. Testar em resoluções mobile e desktop.`,
    targetFiles,
    aiAgentPrompt,
    clarifyingQuestions: [],
    source: 'heuristic',
  };
}

/**
 * Análise Técnica Aprofundada para a Central do Philippe:
 * Não pede o aiAgentPrompt ao modelo; obtém campos estruturados e monta o prompt via buildAgentPrompt().
 */
export async function analyzeRequest(
  env: GeminiEnv,
  text: string,
  options?: ProjectPhaseContext
): Promise<RequestAnalysis> {
  const boundedText = safeTruncate(text.trim(), 4000);

  const geminiResult = await callGeminiApi(env, {
    systemPrompt: ANALYZE_REQUEST_SYSTEM_PROMPT,
    contents: [
      {
        role: 'user',
        parts: [{ text: `SOLICITAÇÃO DA CLIENTE:\n${boundedText}` }],
      },
    ],
    responseSchema: ANALYZE_REQUEST_RESPONSE_SCHEMA,
    maxOutputTokens: 1200,
    temperature: 0.1,
    validator: (data) =>
      typeof data.title === 'string' &&
      typeof data.summary === 'string' &&
      VALID_TYPES.includes(data.type as any) &&
      VALID_PRIORITIES.includes(data.priority as any) &&
      VALID_SCOPES.includes(data.contractScope as any),
  });

  const parsed = geminiResult.data;
  if (!parsed) {
    const fallback = heuristicOneShot(boundedText, options);
    fallback.fallbackReason = geminiResult.fallbackReason;
    return fallback;
  }

  const rawTitle = String(parsed.title || '').trim();
  const title = rawTitle.length <= 70 ? rawTitle : `${rawTitle.slice(0, 67)}...`;
  const summary = String(parsed.summary || '').trim().slice(0, 1000) || boundedText.slice(0, 300);

  const type = VALID_TYPES.includes(parsed.type as any)
    ? (parsed.type as RequestType)
    : classifyRequestType(boundedText);

  const priority = VALID_PRIORITIES.includes(parsed.priority as any)
    ? (parsed.priority as RequestPriority)
    : classifyRequestPriority(boundedText, type);

  const contractScope = VALID_SCOPES.includes(parsed.contractScope as any)
    ? (parsed.contractScope as ContractScope)
    : classifyContractScope(boundedText, options);

  const targetFiles = sanitizeTargetFiles(parsed.targetFiles, boundedText);

  const clarifyingQuestions = Array.isArray(parsed.clarifyingQuestions)
    ? parsed.clarifyingQuestions
        .filter((q) => typeof q === 'string')
        .map((q) => safeTruncate(String(q).trim(), 200))
        .slice(0, 4)
    : [];

  const technicalPlan =
    String(parsed.technicalPlan || '').trim().slice(0, 4000) ||
    `Ajustar arquivos-alvo: ${targetFiles.join(', ')}.`;

  const aiAgentPrompt = buildAgentPrompt({
    title,
    summary,
    type,
    priority,
    contractScope,
    targetFiles,
    clientText: boundedText,
  });

  return {
    title,
    type,
    priority,
    summary,
    contractScope,
    technicalPlan,
    targetFiles,
    aiAgentPrompt,
    clarifyingQuestions,
    source: 'gemini',
    model: geminiResult.model,
    fallbackReason: undefined,
  };
}

/**
 * Conversação Adaptativa com a Cliente (Nua Borges):
 * - Rápida, elegante, acolhedora e direta;
 * - SÓ menciona contrato quando realmente necessário (fora de escopo ou pergunta explícita);
 * - Não fecha ticket prematuramente em saudações ou mensagens curtas.
 */
export async function interviewAssistant(
  env: GeminiEnv,
  category: string,
  history: InterviewMessage[],
  newMessage: string,
  options?: ProjectPhaseContext
): Promise<InterviewResponse> {
  const boundedMessage = safeTruncate(newMessage.trim(), 2000);

  // Validação estrita do histórico (apenas roles 'user'|'assistant' e texto string)
  const validHistory: GeminiContent[] = [];
  const safeHistoryItems = Array.isArray(history) ? history.slice(-10) : [];

  for (const item of safeHistoryItems) {
    if (!item || typeof item !== 'object') continue;
    if (item.role !== 'user' && item.role !== 'assistant') continue;
    if (typeof item.content !== 'string') continue;

    validHistory.push({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: safeTruncate(item.content.trim(), 1000) }],
    });
  }

  // Agrega texto das falas da CLIENTE exclusivamente para classificação
  const clientTexts = [
    ...safeHistoryItems.filter((m) => m.role === 'user').map((m) => m.content),
    boundedMessage,
  ];
  const combinedClientText = clientTexts.join(' ').trim();
  const userTurnsCount = clientTexts.length;

  const normMessage = normalizeText(boundedMessage);

  // Verificação de saudação ou mensagem sem substância
  const isGreetingOrShort =
    normMessage.length < 15 ||
    /^(oi|ola|bom dia|boa tarde|boa noite|opa|ei|alo|tudo bem)\b/.test(normMessage);

  const contents: GeminiContent[] = [
    ...validHistory,
    {
      role: 'user',
      parts: [
        {
          text: `[Categoria selecionada: ${category}]\nMensagem da cliente: ${boundedMessage}`,
        },
      ],
    },
  ];

  const geminiResult = await callGeminiApi(env, {
    systemPrompt: INTERVIEW_ASSISTANT_SYSTEM_PROMPT,
    contents,
    responseSchema: INTERVIEW_RESPONSE_SCHEMA,
    maxOutputTokens: 700,
    temperature: 0.3,
    validator: (data) => typeof data.reply === 'string' && typeof data.enoughInformation === 'boolean',
  });

  const parsed = geminiResult.data;

  if (parsed && typeof parsed.reply === 'string') {
    // Sanitização rigorosa da resposta
    const sanitizedReply = safeTruncate(parsed.reply.trim(), 600);

    // Sanitização das opções sugeridas (máximo 3, até 60 chars cada, sem strings vazias)
    const sanitizedOptions = Array.isArray(parsed.suggestedOptions)
      ? parsed.suggestedOptions
          .filter((opt) => typeof opt === 'string' && opt.trim().length > 0)
          .map((opt) => safeTruncate(String(opt).trim(), 60))
          .slice(0, 3)
      : undefined;

    // Se a mensagem for mera saudação no primeiro turno, impede fechamento prematuro
    const isEnough =
      isGreetingOrShort && userTurnsCount === 1
        ? false
        : Boolean(parsed.enoughInformation || userTurnsCount >= 2);

    let triageResult: any = undefined;
    if (isEnough) {
      const suggestedType = classifyRequestType(combinedClientText);
      const suggestedPriority = classifyRequestPriority(combinedClientText, suggestedType);
      const suggestedScope = classifyContractScope(combinedClientText, options);
      const targetFiles = sanitizeTargetFiles(
        (parsed.triage as any)?.targetFiles,
        combinedClientText,
        category
      );

      const rawTitle = String((parsed.triage as any)?.title || combinedClientText).trim();
      const title = rawTitle.length <= 60 ? rawTitle : `${rawTitle.slice(0, 57)}...`;

      triageResult = {
        title: title || `Solicitação • ${category}`,
        type: suggestedType,
        priority: suggestedPriority,
        summary: safeTruncate(
          String((parsed.triage as any)?.summary || combinedClientText).trim(),
          300
        ),
        contractScope: suggestedScope,
        technicalPlan: `Ajustar componentes: ${targetFiles.join(', ')}.`,
        targetFiles,
      };
    }

    return {
      reply: sanitizedReply,
      enoughInformation: isEnough,
      suggestedOptions: sanitizedOptions && sanitizedOptions.length > 0 ? sanitizedOptions : undefined,
      triage: triageResult,
      source: 'gemini',
      model: geminiResult.model,
      fallbackReason: undefined,
    };
  }

  // ─── Fallback Heurístico Robusto (0ms, sem promessas falsas de prioridade) ────────
  const fallbackType = classifyRequestType(combinedClientText);
  const fallbackPriority = classifyRequestPriority(combinedClientText, fallbackType);
  const fallbackScope = classifyContractScope(combinedClientText, options);
  const targetFiles = detectTargetFilesHeuristic(combinedClientText, category);

  // Caso 1: Saudação inicial ou texto excessivamente curto
  if (isGreetingOrShort && userTurnsCount === 1) {
    return {
      reply: `Olá, Nua! Como posso ajudar você hoje?\n\n- Me conte o que você gostaria de alterar no site (como fotos, textos, músicas ou novas ideias) para prepararmos tudo.`,
      enoughInformation: false,
      suggestedOptions: ['Trocar fotos da capa', 'Adicionar novo artigo', 'Ajustar um texto'],
      source: 'heuristic',
      fallbackReason: geminiResult.fallbackReason,
    };
  }

  // Caso 2: Demanda nítida fora de escopo (loja, pagamentos, assinaturas, agendamento)
  if (fallbackScope === 'fora_de_escopo_orcamento') {
    return {
      reply: `Essa ideia envolve uma funcionalidade nova que não fazia parte da estrutura inicial do site.\n\n- O **Philippe** preparará uma proposta técnica com **orçamento prévio** para sua avaliação.\n- Deseja que eu encaminhe para ele analisar?`,
      enoughInformation: true,
      suggestedOptions: ['Encaminhar para orçamento', 'Deixar para depois'],
      triage: {
        title: `Nova Demanda • ${category}`,
        type: 'feature',
        priority: 'medium',
        summary: safeTruncate(combinedClientText, 300),
        contractScope: 'fora_de_escopo_orcamento',
        technicalPlan: `Desenvolver proposta técnica e orçamento para novas ferramentas.`,
        targetFiles,
      },
      source: 'heuristic',
      fallbackReason: geminiResult.fallbackReason,
    };
  }

  // Caso 3: Relato de bug ou falha técnica
  if (fallbackType === 'bug') {
    return {
      reply: `Compreendido! Registrei as informações desse problema técnico para o **Philippe** investigar no código.\n\n- Você pode confirmar abaixo para enviar à Central dele.`,
      enoughInformation: true,
      suggestedOptions: ['Confirmar envio ao Philippe', 'Adicionar mais um detalhe'],
      triage: {
        title: `Correção • ${category}`,
        type: 'bug',
        priority: fallbackPriority,
        summary: safeTruncate(combinedClientText, 300),
        contractScope: fallbackScope,
        technicalPlan: `Investigar e corrigir falha nos componentes: ${targetFiles.join(', ')}.`,
        targetFiles,
      },
      source: 'heuristic',
      fallbackReason: geminiResult.fallbackReason,
    };
  }

  // Caso 4: Solicitação normal de alteração ou conteúdo
  return {
    reply: `Perfeito! Registrei o seu pedido de alteração para o **Philippe** implementar.\n\n- Podemos encaminhar para a Central dele agora?`,
    enoughInformation: true,
    suggestedOptions: ['Pode enviar ao Philippe', 'Quero acrescentar um detalhe'],
    triage: {
      title: `Ajuste • ${category}`,
      type: fallbackType,
      priority: fallbackPriority,
      summary: safeTruncate(combinedClientText, 300),
      contractScope: fallbackScope,
      technicalPlan: `Aplicar alterações nos arquivos: ${targetFiles.join(', ')}.`,
      targetFiles,
    },
    source: 'heuristic',
    fallbackReason: geminiResult.fallbackReason,
  };
}
