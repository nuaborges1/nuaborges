/**
 * NUA IA — Motor Central de Inteligência e Orquestração
 * 
 * Executa o fluxo completo entre as 5 camadas de contexto:
 * 1. Sanitização de dados sensíveis e LGPD (sanitizer.ts)
 * 2. Classificação de intenções e roteamento inteligente (classifier.ts)
 * 3. Respostas locais canônicas (Scientific KB e Knowledge Base) em <2ms
 * 4. Recuperação seletiva de evidências científicas (OMS, MS, FEBRASGO, Basson)
 * 5. Recuperação de fatos consolidados da marca e rotina do painel
 * 6. Consulta à memória persistente e busca em históricos passados
 * 7. Invocação do modelo Gemini com controle de tokens e degradação graciosa
 * 8. Telemetria, custo e detecção de candidatos a aprendizado (pending_review)
 * 9. Persistência atômica no histórico JSONL e índice
 */

import { detectHistoricalReference, searchHistoricalSnippet } from './searchEngine';
import { getLoadedMemory, extractRelevantMemoryFacts } from './memoryStore';
import { appendHistoryTurn, getConversationTurns, getHistoryIndex } from './historyStore';
import { buildGeminiPayload } from './promptBuilder';
import { callNuaAiModel, resolveGeminiApiKey } from './modelClient';
import { NuaAiChatRequest, NuaAiChatResponse, HistoryTurn } from './types';
import { sanitizeTextForStorageAndPrompt } from './sanitizer';
import { classifyIntent } from './classifier';
import { searchScientificKb, tryLocalScientificResponse } from './scientificKb';
import { searchKnowledge, tryLocalKnowledgeResponse, getLoadedKnowledge } from './knowledgeStore';
import { tryLocalTechnicalForwardingResponse } from './technicalForwarder';
import { extractProposalFromHistory } from './ticketExtractor';
import { trackAiInteraction, getAiTelemetryMetrics } from './telemetry';
import { addCandidate, getCandidates, saveCandidates } from './candidatesStore';

/**
 * Padrão para detectar se a Nua estabeleceu uma nova preferência, regra ou decisão
 * para ser enviada como candidato de aprendizado controlado (pending_review).
 */
const DECISION_DETECTION_REGEX = /(?:decidi que|a partir de agora|minha nova prioridade|nova regra|quero que voc[eê] lembre|nunca mais)/i;

/**
 * Processa uma mensagem enviada pela Nua para a Nua IA.
 */
export async function processNuaAiChat(
  request: NuaAiChatRequest,
  env?: { GEMINI_API_KEY?: string; GEMINI_MODEL?: string }
): Promise<NuaAiChatResponse> {
  const rawMessage = (request.message || '').trim();
  if (!rawMessage) {
    return {
      reply: 'Oi, Nua! Como posso te ajudar com ideias, roteiros, planejamento ou dúvidas de sexologia hoje?',
      conversationId: request.conversationId || `conv_${Date.now()}`,
      sourcesUsed: { memory: true, history: false, scientific: false, knowledge: false },
      modelUsed: 'instant',
      source: 'heuristic',
    };
  }

  // 1. Sanitização estrita de dados sensíveis (LGPD)
  const { sanitized: userMessage, hasSensitiveData } = sanitizeTextForStorageAndPrompt(rawMessage);
  const conversationId = request.conversationId || `conv_${Date.now()}`;

  // 2. Classificação de intenções
  const intentInfo = classifyIntent(userMessage);

  // 3a. Confirmação Explícita de Envio ao Philippe ("manda pra ele", "pode mandar", "envia", etc.)
  if (intentInfo.primaryIntent === 'DISPATCH_CONFIRMATION') {
    const activeTurns = request.conversationId ? getConversationTurns(conversationId, 12) : [];
    const proposal = extractProposalFromHistory(activeTurns);

    let confirmationReply: string;
    if (proposal) {
      confirmationReply = [
        '✅ **Pedido encaminhado com sucesso para a Central do Philippe!**',
        '',
        'Já registrei a sua solicitação com todo o carinho e enviei direto para a fila do Philippe. Você não precisa se preocupar em copiar nada: o pedido já está na Central dele e você pode acompanhar o status, prazos e respostas dele na aba **Meus Pedidos** aqui no seu painel! 🌸',
        '',
        '📋 RESUMO DO PEDIDO PARA O PHILIPPE:',
        `• Tipo: ${proposal.type}`,
        `• O quê: ${proposal.title}`,
        `• Onde: ${proposal.section}`,
        `• Detalhes: ${proposal.details}`,
      ].join('\n');
    } else {
      confirmationReply = 'Oi, Nua! 🌸 O que exatamente você gostaria que eu enviasse para o Philippe? Me conta a sua ideia ou o que gostaria de ajustar no site que eu organizo tudo e encaminho para a Central dele agora mesmo!';
    }

    const now = new Date().toISOString();
    await appendHistoryTurn({
      timestamp: now,
      conversation_id: conversationId,
      role: 'user',
      content: userMessage,
    });
    await appendHistoryTurn({
      timestamp: new Date().toISOString(),
      conversation_id: conversationId,
      role: 'assistant',
      content: confirmationReply,
    });

    trackAiInteraction({
      isLocalResponse: true,
      intent: 'DISPATCH_CONFIRMATION',
      knowledgeUsed: true,
      latencyMs: 1,
      model: 'instant-ticket-dispatcher',
    });

    return {
      reply: confirmationReply,
      conversationId,
      sourcesUsed: {
        memory: true,
        history: true,
        scientific: false,
        knowledge: true,
      },
      modelUsed: 'instant-ticket-dispatcher',
      source: 'knowledge_store',
    };
  }

  // 3b. Encaminhamento Técnico Obrigatório ao Desenvolvedor (Fast-Path Local)
  if (intentInfo.primaryIntent === 'TECHNICAL_REQUEST') {
    const technicalReply = tryLocalTechnicalForwardingResponse(userMessage);
    if (technicalReply) {
      const now = new Date().toISOString();
      await appendHistoryTurn({
        timestamp: now,
        conversation_id: conversationId,
        role: 'user',
        content: userMessage,
      });
      await appendHistoryTurn({
        timestamp: new Date().toISOString(),
        conversation_id: conversationId,
        role: 'assistant',
        content: technicalReply,
      });

      trackAiInteraction({
        isLocalResponse: true,
        intent: 'TECHNICAL_REQUEST',
        knowledgeUsed: true,
        latencyMs: 1,
        model: 'instant-technical-forwarder',
      });

      return {
        reply: technicalReply,
        conversationId,
        sourcesUsed: {
          memory: true,
          history: false,
          scientific: false,
          knowledge: true,
        },
        modelUsed: 'instant-technical-forwarder',
        source: 'knowledge_store',
      };
    }
  }

  // 3c. Fast-Path Local: Respostas Canônicas Instantâneas (APENAS se for pergunta factual simples)
  if (intentInfo.canAnswerLocally) {
    // Tentativa de resposta científica canônica
    const localScientificReply = tryLocalScientificResponse(userMessage);
    if (localScientificReply) {
      const now = new Date().toISOString();
      await appendHistoryTurn({
        timestamp: now,
        conversation_id: conversationId,
        role: 'user',
        content: userMessage,
      });
      await appendHistoryTurn({
        timestamp: new Date().toISOString(),
        conversation_id: conversationId,
        role: 'assistant',
        content: localScientificReply,
      });

      trackAiInteraction({
        isLocalResponse: true,
        intent: intentInfo.primaryIntent,
        kbUsed: true,
        hasCitation: true,
        latencyMs: 1,
        model: 'instant-scientific-rag',
      });

      return {
        reply: localScientificReply,
        conversationId,
        sourcesUsed: {
          memory: true,
          history: false,
          scientific: true,
          scientificCitation: 'OMS / Basson (Base Curada Local)',
          knowledge: false,
        },
        modelUsed: 'instant-scientific-rag',
        source: 'scientific_kb',
      };
    }

    // Tentativa de resposta operacional/explicativa do site e painel
    const localKnowledgeReply = tryLocalKnowledgeResponse(userMessage);
    if (localKnowledgeReply) {
      const now = new Date().toISOString();
      await appendHistoryTurn({
        timestamp: now,
        conversation_id: conversationId,
        role: 'user',
        content: userMessage,
      });
      await appendHistoryTurn({
        timestamp: new Date().toISOString(),
        conversation_id: conversationId,
        role: 'assistant',
        content: localKnowledgeReply,
      });

      trackAiInteraction({
        isLocalResponse: true,
        intent: intentInfo.primaryIntent,
        knowledgeUsed: true,
        latencyMs: 1,
        model: 'instant-knowledge-rag',
      });

      return {
        reply: localKnowledgeReply,
        conversationId,
        sourcesUsed: {
          memory: true,
          history: false,
          scientific: false,
          knowledge: true,
        },
        modelUsed: 'instant-knowledge-rag',
        source: 'knowledge_store',
      };
    }
  }

  // 4. Recuperação na Camada 5 (Scientific KB)
  const scientificMatches = intentInfo.consultScientificKb
    ? searchScientificKb(userMessage, 2)
    : [];

  // 5. Recuperação na Camada 3 (Knowledge Store da Nua)
  const knowledgeItems = intentInfo.consultKnowledge
    ? searchKnowledge(userMessage)
    : [];

  // 6. Detecção e busca em conversas passadas (Camada 1 - History)
  const hasHistoryRef = intentInfo.consultHistory || detectHistoricalReference(userMessage);
  let historicalSnippet = null;
  if (hasHistoryRef) {
    historicalSnippet = searchHistoricalSnippet(userMessage, conversationId);
  }

  // 7. Carrega turnos recentes da conversa ativa se for continuação (Camada 4 - Current Context)
  let activeTurns: HistoryTurn[] = [];
  if (request.conversationId) {
    activeTurns = getConversationTurns(conversationId, 6);
  }

  // 8. Monta o payload seguro e enxuto com as 5 camadas
  const promptPayload = buildGeminiPayload({
    userMessage,
    activeTurns,
    historicalSnippet,
    scientificMatches,
    knowledgeItems,
  });

  // 9. Chama o modelo com timeout, fallback e medição de latência
  const startTime = Date.now();
  const apiKey = env?.GEMINI_API_KEY || resolveGeminiApiKey();
  const candidateModels = env?.GEMINI_MODEL ? [env.GEMINI_MODEL] : undefined;

  const modelResult = await callNuaAiModel({
    systemPrompt: promptPayload.systemPrompt,
    contents: promptPayload.contents,
    apiKey,
    candidateModels,
  });

  const latencyMs = Date.now() - startTime;
  const assistantReply = modelResult.reply;

  // 10. Detecção de novos candidatos a aprendizado controlado (pending_review)
  if (DECISION_DETECTION_REGEX.test(userMessage)) {
    try {
      addCandidate({
        target: 'memory',
        category: 'decisao_estrategica',
        proposedContent: userMessage,
        reason: 'Detectada instrução explícita de mudança ou decisão de formato/rotina.',
        sourceConversationId: conversationId,
      });
    } catch (err) {
      console.warn('[Engine] Erro ao registrar candidato:', err);
    }
  }

  // 11. Grava os novos turnos no histórico JSONL e atualiza índice
  const now = new Date().toISOString();
  await appendHistoryTurn({
    timestamp: now,
    conversation_id: conversationId,
    role: 'user',
    content: userMessage,
  });

  await appendHistoryTurn({
    timestamp: new Date().toISOString(),
    conversation_id: conversationId,
    role: 'assistant',
    content: assistantReply,
  });

  // 12. Registro de telemetria e custo
  const approxInputTokens = Math.round(promptPayload.systemPrompt.length / 4 + userMessage.length / 4);
  const approxOutputTokens = Math.round(assistantReply.length / 4);
  const hasCitation =
    scientificMatches.length > 0 ||
    /\[Fonte|Referência Científica|OMS|Ministério da Saúde|FEBRASGO|Basson/i.test(assistantReply);

  trackAiInteraction({
    isLocalResponse: false,
    intent: intentInfo.primaryIntent,
    tokensInput: approxInputTokens,
    tokensOutput: approxOutputTokens,
    latencyMs,
    kbUsed: scientificMatches.length > 0,
    hasCitation,
    historyUsed: !!historicalSnippet,
    knowledgeUsed: knowledgeItems.length > 0,
    memoryUsed: true,
    model: modelResult.modelUsed,
  });

  // 13. Retorna resposta estruturada
  return {
    reply: assistantReply,
    conversationId,
    sourcesUsed: {
      memory: true,
      history: !!historicalSnippet,
      historyTitle: historicalSnippet?.title,
      entitiesMatched: historicalSnippet?.matchedEntities,
      scientific: scientificMatches.length > 0,
      scientificCitation: scientificMatches[0]?.chunk.citation,
      knowledge: knowledgeItems.length > 0,
    },
    modelUsed: modelResult.modelUsed,
    source: modelResult.source,
  };
}

/**
 * Retorna as conversas indexadas para a tela de histórico visual.
 */
export function listNuaAiConversations() {
  const index = getHistoryIndex();
  return index.conversations || [];
}

/**
 * Retorna a memória consolidada para consulta (somente autorizados).
 */
export function getNuaAiMemory() {
  return getLoadedMemory();
}

/**
 * Retorna a base de conhecimento consolidado para consulta.
 */
export function getNuaAiKnowledge() {
  return getLoadedKnowledge();
}

/**
 * Retorna os candidatos a aprendizado pendentes de revisão.
 */
export function getNuaAiCandidates() {
  return getCandidates();
}

/**
 * Retorna as métricas de telemetria acumuladas.
 */
export function getNuaAiTelemetry() {
  return getAiTelemetryMetrics();
}
