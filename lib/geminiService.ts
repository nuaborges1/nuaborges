/**
 * geminiService.ts — Serviço server-side para triagem e entrevista via Gemini API.
 * 
 * NUNCA importar em componentes client.
 * Compatível exclusivamente com ambientes edge/serverless (Cloudflare Pages Functions / Workers).
 * Utiliza estritamente APIs Web universais (fetch, AbortController) sem dependências de Node.js.
 */

import { CLIENT_CHAT_CONTEXT, DEV_TRIAGE_CONTEXT } from './projectKnowledge';
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
  isExplicitOutOfScope,
} from './requestHeuristics';

// Re-exporta funções puras para uso do servidor
export {
  detectTargetFilesHeuristic,
  buildHeuristicAiPrompt,
  buildAgentPrompt,
  classifyContractScope,
  classifyRequestType,
  classifyRequestPriority,
};

export interface GeminiEnv {
  GEMINI_API_KEY?: string;
  GEMINI_MODELS?: string;
  GEMINI_MODEL?: string;
}

export interface RequestAnalysis {
  title: string;
  type: RequestType;
  priority: RequestPriority;
  summary: string;
  contractScope: ContractScope;
  technicalPlan: string;
  targetFiles: string[];
  aiAgentPrompt: string;
  clarifyingQuestions: string[];
  source: 'gemini' | 'heuristic';
  model?: string;
  fallbackReason?: string;
}

export interface InterviewMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface InterviewResponse {
  reply: string;
  enoughInformation: boolean;
  suggestedOptions?: string[];
  triage?: {
    title: string;
    type: RequestType;
    priority: RequestPriority;
    summary: string;
    contractScope: ContractScope;
    technicalPlan: string;
    targetFiles: string[];
  };
  source: 'gemini' | 'heuristic';
  model?: string;
  fallbackReason?: string;
}

interface CallGeminiResult {
  data: Record<string, unknown> | null;
  model?: string;
  fallbackReason?: string;
}

interface GeminiContentPart {
  text?: string;
  thought?: boolean;
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiContentPart[];
}

/**
 * Trunca uma string de forma segura preservando caracteres multibyte.
 */
function safeTruncate(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str;
  return Array.from(str).slice(0, maxLength).join('');
}

/**
 * Faz parse seguro de JSON garantindo que o resultado seja um objeto (rejeita arrays e primitivos).
 */
export function parseJsonSafely(raw: string): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'string') return null;
  const clean = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

  try {
    const val = JSON.parse(clean);
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      return val as Record<string, unknown>;
    }
    return null;
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const val = JSON.parse(match[0]);
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
          return val as Record<string, unknown>;
        }
      } catch {}
    }
    return null;
  }
}

/**
 * Obtém a lista deduplicada de modelos Gemini a serem consultados em sequência.
 */
function resolveCandidateModels(env: GeminiEnv): string[] {
  const defaults = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.8-flash'];
  const fromList = env.GEMINI_MODELS
    ? env.GEMINI_MODELS.split(',').map((m) => m.trim()).filter(Boolean)
    : [];
  const single = env.GEMINI_MODEL ? [env.GEMINI_MODEL.trim()] : [];

  const combined = [...single, ...fromList, ...defaults];
  const unique: string[] = [];
  for (const m of combined) {
    if (!unique.includes(m)) unique.push(m);
  }
  return unique;
}

/**
 * Realiza chamada resiliente multi-modelo à API do Gemini com:
 * - Timeout por tentativa (8s) e orçamento global máximo (15s);
 * - Suporte a systemInstruction e structured output (responseSchema);
 * - Gestão de falhas (401/403 param imediatamente; 429/5xx/timeout/400 testam próximo modelo);
 * - Filtro de parts de pensamento e validação de finishReason/blockReason.
 */
async function callGeminiApi(
  env: GeminiEnv,
  options: {
    systemPrompt: string;
    contents: GeminiContent[];
    responseSchema: Record<string, unknown>;
    maxOutputTokens: number;
    temperature: number;
    validator?: (parsed: Record<string, unknown>) => boolean;
  }
): Promise<CallGeminiResult> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return { data: null, fallbackReason: 'missing_api_key' };
  }

  const models = resolveCandidateModels(env);
  const totalBudgetMs = 15000;
  const perAttemptTimeoutMs = 8000;
  const deadline = Date.now() + totalBudgetMs;
  let lastFailureReason = 'unknown_failure';

  for (const model of models) {
    const remainingBudget = deadline - Date.now();
    if (remainingBudget <= 500) {
      lastFailureReason = 'timeout_budget_exhausted';
      break;
    }

    const attemptTimeout = Math.min(perAttemptTimeoutMs, remainingBudget);

    // Tenta primeiro com thinkingBudget mínimo seguro; se falhar com 400, repete sem thinkingConfig
    const tryCall = async (withThinking: boolean) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), attemptTimeout);

      try {
        const generationConfig: Record<string, unknown> = {
          responseMimeType: 'application/json',
          responseSchema: options.responseSchema,
          maxOutputTokens: options.maxOutputTokens,
          temperature: options.temperature,
        };

        if (withThinking) {
          generationConfig.thinkingConfig = { thinkingBudget: 0 };
        }

        const bodyPayload = {
          systemInstruction: {
            parts: [{ text: options.systemPrompt }],
          },
          contents: options.contents,
          generationConfig,
        };

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            body: JSON.stringify(bodyPayload),
            signal: controller.signal,
          }
        );

        return { res, status: res.status };
      } finally {
        clearTimeout(timer);
      }
    };

    try {
      let callResult = await tryCall(true);

      // Se retornou 400 com thinkingConfig, repete uma vez sem thinkingConfig para o mesmo modelo
      if (callResult.status === 400) {
        callResult = await tryCall(false);
      }

      const { res, status } = callResult;

      // 401 / 403: Chave inválida ou não autorizada — encerra imediatamente sem tentar outros modelos
      if (status === 401 || status === 403) {
        return { data: null, model, fallbackReason: 'auth' };
      }

      // Outros erros HTTP (400, 404, 429, 500, 503): tenta o próximo modelo
      if (!res.ok) {
        lastFailureReason = `http_${status}`;
        continue;
      }

      const jsonResponse: any = await res.json().catch(() => null);
      if (!jsonResponse) {
        lastFailureReason = 'invalid_http_json';
        continue;
      }

      // Verificação de bloqueio por moderação
      if (jsonResponse.promptFeedback?.blockReason) {
        lastFailureReason = `blocked_${jsonResponse.promptFeedback.blockReason}`;
        continue;
      }

      const candidate = jsonResponse.candidates?.[0];
      if (!candidate) {
        lastFailureReason = 'no_candidates';
        continue;
      }

      // Verificação do motivo de finalização
      if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'MAX_TOKENS') {
        lastFailureReason = `finish_${candidate.finishReason.toLowerCase()}`;
        continue;
      }

      const parts: any[] = candidate.content?.parts || [];
      // Juntar todas as parts de texto que NÃO sejam de pensamento interno
      const textParts = parts
        .filter((p) => p && typeof p.text === 'string' && !p.thought)
        .map((p) => p.text)
        .join('');

      const parsed = parseJsonSafely(textParts);
      if (!parsed) {
        lastFailureReason = 'malformed_json_response';
        continue;
      }

      if (options.validator && !options.validator(parsed)) {
        lastFailureReason = 'schema_validation_failed';
        continue;
      }

      return { data: parsed, model, fallbackReason: undefined };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        lastFailureReason = 'timeout_attempt';
      } else {
        lastFailureReason = err?.message || 'fetch_exception';
      }
      continue;
    }
  }

  return { data: null, fallbackReason: lastFailureReason };
}

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

  const systemPrompt = `
Você é o Arquiteto de Software sênior do site Nua Borges.
Analise a solicitação da cliente e retorne APENAS campos técnicos estruturados em JSON.
Nunca revele identificadores pessoais (CPFs, telefones ou e-mails).

${DEV_TRIAGE_CONTEXT}

DIRETRIZES DE ENQUADRAMENTO CONTRATUAL:
- "garantia": defeito real no código desenvolvido em projeto já homologado.
- "franquia_suporte": pequeno ajuste de texto, foto, link ou orientação.
- "homologacao_ajuste": alteração ou refinamento durante a entrega/homologação.
- "fora_de_escopo_orcamento": loja, pagamentos, assinaturas, agendamento de consultas, CRM, app nativo.
- "a_confirmar_pelo_dev": relatos com indício de ação da cliente (DNS, senha, upload excessivo).
`.trim();

  const responseSchema = {
    type: 'OBJECT',
    properties: {
      title: { type: 'STRING' },
      type: { type: 'STRING', enum: [...VALID_TYPES] },
      priority: { type: 'STRING', enum: [...VALID_PRIORITIES] },
      summary: { type: 'STRING' },
      contractScope: { type: 'STRING', enum: [...VALID_SCOPES] },
      technicalPlan: { type: 'STRING' },
      targetFiles: { type: 'ARRAY', items: { type: 'STRING' } },
      clarifyingQuestions: { type: 'ARRAY', items: { type: 'STRING' } },
    },
    required: [
      'title',
      'type',
      'priority',
      'summary',
      'contractScope',
      'technicalPlan',
      'targetFiles',
    ],
  };

  const geminiResult = await callGeminiApi(env, {
    systemPrompt,
    contents: [
      {
        role: 'user',
        parts: [{ text: `SOLICITAÇÃO DA CLIENTE:\n${boundedText}` }],
      },
    ],
    responseSchema,
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

  const normCombined = normalizeText(combinedClientText);
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

  const systemPrompt = `
Você é a IA assistente técnica oficial do site Nua Borges.
Você FAZ PARTE DO PROJETO e atende a cliente (Nayara "Nua" Borges), que não é programadora.

${CLIENT_CHAT_CONTEXT}

REGRAS DE RESPOSTA:
1. Respostas curtas (40 a 70 palavras), com negrito nas palavras essenciais e tópicos claros.
2. NUNCA cite números de cláusulas ("Cláusula 6.2", etc.) e NUNCA justifique alterações rotineiras com burocracia jurídica.
3. Se ela pedir algo fora de escopo (loja, checkout, área de membros, agendamento de consultas): avise com elegância e simpatia que se trata de uma funcionalidade nova e que o Philippe preparará uma proposta técnica com orçamento prévio.
4. Se ela apenas disse uma saudação (ex.: "oi", "olá") ou frase muito curta, defina "enoughInformation": false e faça uma pergunta calorosa sobre o que ela gostaria de ajustar.
5. Se ela já detalhou o pedido OU se este for o segundo turno da conversa (userTurnsCount >= 2), defina "enoughInformation": true.
`.trim();

  const responseSchema = {
    type: 'OBJECT',
    properties: {
      reply: { type: 'STRING' },
      enoughInformation: { type: 'BOOLEAN' },
      suggestedOptions: { type: 'ARRAY', items: { type: 'STRING' } },
      triage: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          type: { type: 'STRING', enum: [...VALID_TYPES] },
          priority: { type: 'STRING', enum: [...VALID_PRIORITIES] },
          summary: { type: 'STRING' },
          contractScope: { type: 'STRING', enum: [...VALID_SCOPES] },
          technicalPlan: { type: 'STRING' },
          targetFiles: { type: 'ARRAY', items: { type: 'STRING' } },
        },
      },
    },
    required: ['reply', 'enoughInformation'],
  };

  const geminiResult = await callGeminiApi(env, {
    systemPrompt,
    contents,
    responseSchema,
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

    let triageResult = undefined;
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
