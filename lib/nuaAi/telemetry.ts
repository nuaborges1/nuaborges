/**
 * NUA IA — Telemetria, Auditoria e Métricas de Consumo
 * 
 * Registra indicadores detalhados para visualização exclusiva em /admingeral:
 * - total_conversations, total_messages, model_calls, local_responses
 * - local_response_rate (% de chamadas economizadas)
 * - tokens_input, tokens_output, estimated_cost
 * - kb_searches, kb_hits, kb_miss_rate, respostas_com_citacao
 */

import fs from 'node:fs';
import path from 'node:path';

export interface AiTelemetryMetrics {
  totalConversations: number;
  totalMessages: number;
  modelCalls: number;
  localResponses: number;
  localResponseRate: number; // Porcentagem de respostas locais
  tokensInput: number;
  tokensOutput: number;
  estimatedCostUsd: number;
  averageLatencyMs: number;
  kbSearches: number;
  kbHits: number;
  kbMissRate: number;
  responsesWithCitation: number;
  responsesWithoutBase: number;
  historySearches: number;
  knowledgeSearches: number;
  memorySearches: number;
  lastUpdated: string;
  recentEvents: Array<{
    timestamp: string;
    type: string;
    detail: string;
    tokens?: number;
    latencyMs?: number;
  }>;
}

const DEFAULT_METRICS: AiTelemetryMetrics = {
  totalConversations: 0,
  totalMessages: 0,
  modelCalls: 0,
  localResponses: 0,
  localResponseRate: 0,
  tokensInput: 0,
  tokensOutput: 0,
  estimatedCostUsd: 0,
  averageLatencyMs: 0,
  kbSearches: 0,
  kbHits: 0,
  kbMissRate: 0,
  responsesWithCitation: 0,
  responsesWithoutBase: 0,
  historySearches: 0,
  knowledgeSearches: 0,
  memorySearches: 0,
  lastUpdated: new Date().toISOString(),
  recentEvents: [],
};

function resolveTelemetryPath(): string {
  const dir = path.resolve(process.cwd(), 'nua-ai', 'telemetry');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, 'ai-metrics.json');
}

export function getAiTelemetryMetrics(): AiTelemetryMetrics {
  const filePath = resolveTelemetryPath();
  try {
    if (!fs.existsSync(filePath)) {
      return DEFAULT_METRICS;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[AiTelemetry] Erro ao ler métricas:', err);
    return DEFAULT_METRICS;
  }
}

export function saveAiTelemetryMetrics(metrics: AiTelemetryMetrics): void {
  const filePath = resolveTelemetryPath();
  metrics.lastUpdated = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(metrics, null, 2), 'utf8');
}

export function trackAiInteraction(data: {
  isLocalResponse: boolean;
  intent: string;
  tokensInput?: number;
  tokensOutput?: number;
  latencyMs?: number;
  kbUsed?: boolean;
  hasCitation?: boolean;
  historyUsed?: boolean;
  knowledgeUsed?: boolean;
  memoryUsed?: boolean;
  model?: string;
}): void {
  const m = getAiTelemetryMetrics();

  m.totalMessages += 1;
  if (data.isLocalResponse) {
    m.localResponses += 1;
  } else {
    m.modelCalls += 1;
  }

  m.localResponseRate = Number(((m.localResponses / m.totalMessages) * 100).toFixed(1));

  if (data.tokensInput) m.tokensInput += data.tokensInput;
  if (data.tokensOutput) m.tokensOutput += data.tokensOutput;

  // Custo aproximado Gemini 3.1 Flash-Lite: $0.075 / 1M input, $0.30 / 1M output
  const cost = ((data.tokensInput || 0) * 0.075 + (data.tokensOutput || 0) * 0.3) / 1000000;
  m.estimatedCostUsd = Number((m.estimatedCostUsd + cost).toFixed(5));

  if (data.latencyMs) {
    m.averageLatencyMs = Math.round((m.averageLatencyMs * (m.totalMessages - 1) + data.latencyMs) / m.totalMessages);
  }

  if (data.kbUsed !== undefined) {
    m.kbSearches += 1;
    if (data.kbUsed) {
      m.kbHits += 1;
    }
    m.kbMissRate = Number((((m.kbSearches - m.kbHits) / m.kbSearches) * 100).toFixed(1));
  }

  if (data.hasCitation) {
    m.responsesWithCitation += 1;
  }

  if (data.historyUsed) m.historySearches += 1;
  if (data.knowledgeUsed) m.knowledgeSearches += 1;
  if (data.memoryUsed) m.memorySearches += 1;

  m.recentEvents.unshift({
    timestamp: new Date().toISOString(),
    type: data.isLocalResponse ? 'local_response' : 'model_call',
    detail: `Intenção: ${data.intent} | Modelo: ${data.model || 'local'}`,
    tokens: (data.tokensInput || 0) + (data.tokensOutput || 0),
    latencyMs: data.latencyMs,
  });

  if (m.recentEvents.length > 50) {
    m.recentEvents = m.recentEvents.slice(0, 50);
  }

  saveAiTelemetryMetrics(m);
}
