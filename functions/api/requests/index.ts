/**
 * /api/requests — Central de Solicitações (protegida pelo _middleware.ts: admin only).
 * GET  : lista solicitações
 * POST : { action: 'create' | 'update' | 'message' | 'delete', ... }
 * (POST único porque o CORS do middleware só permite GET/POST.)
 * Persistência: KV NUA_CONTENT (índice `requests:index` + `request:<id>`), fallback em memória no dev.
 */

import {
  analyzeRequest,
  interviewAssistant,
  buildHeuristicAiPrompt,
  detectTargetFilesHeuristic,
  sanitizeTargetFiles,
} from '../_geminiService';
import { recordAuditEvent } from '../_auditHelper';

interface Env {
  NUA_CONTENT?: any;
  CONTENT_KV?: any;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
}

type PagesContext<T = any> = { request: Request; env: T };

const STATUSES = ['new', 'analyzing', 'planned', 'in_progress', 'review', 'done', 'rejected'];
const INDEX_KEY = 'requests:index';
const mem = new Map<string, string>();

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

const store = (env: Env) => {
  const kv = env.NUA_CONTENT || env.CONTENT_KV;
  if (kv && typeof kv.get === 'function') {
    return {
      get: (k: string): Promise<string | null> => kv.get(k),
      put: (k: string, v: string) => kv.put(k, v),
      del: (k: string) => kv.delete(k),
    };
  }
  return {
    get: async (k: string) => mem.get(k) ?? null,
    put: async (k: string, v: string) => void mem.set(k, v),
    del: async (k: string) => void mem.delete(k),
  };
};

const now = () => new Date().toISOString();
const clean = (v: any, max: number) => String(v ?? '').trim().slice(0, max);

export const onRequestGet = async ({ env }: PagesContext<Env>) => {
  const s = store(env);
  const ids: string[] = JSON.parse((await s.get(INDEX_KEY)) || '[]');
  const items = (await Promise.all(ids.map((id) => s.get(`request:${id}`))))
    .filter(Boolean)
    .map((x) => JSON.parse(x as string));
  return json({ requests: items, geminiConfigured: !!env.GEMINI_API_KEY });
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;
  const s = store(env);
  const body: any = await request.json().catch(() => ({}));
  const ids: string[] = JSON.parse((await s.get(INDEX_KEY)) || '[]');

  // 1. Entrevista Conversacional Adaptativa da Cliente com o Gemini
  if (body.action === 'interview') {
    const category = clean(body.category, 120) || 'Geral';
    const message = clean(body.message, 3000);
    const history = Array.isArray(body.history) ? body.history : [];
    if (!message) return json({ error: 'Mensagem vazia.' }, 400);

    const result = await interviewAssistant(env, category, history, message);
    return json(result);
  }

  // 2. Registro oficial da solicitação
  if (body.action === 'create') {
    const text = clean(body.text, 5000);
    if (text.length < 3) return json({ error: 'Descreva a solicitação.' }, 400);
    const id = crypto.randomUUID();

    let analysis: any;
    if (body.triage && typeof body.triage === 'object') {
      const triageTitle = clean(body.triage.title, 120) || text.slice(0, 60);
      const rawType = clean(body.triage.type, 30);
      const triageType = ['bug', 'feature', 'improvement', 'content', 'visual', 'technical', 'out_of_scope'].includes(rawType)
        ? rawType
        : 'improvement';
      const rawPriority = clean(body.triage.priority, 20);
      const triagePriority = ['low', 'medium', 'high', 'critical'].includes(rawPriority)
        ? rawPriority
        : 'medium';
      const triageSummary = clean(body.triage.summary, 1000) || text.slice(0, 300);
      const categoryName = clean(body.category, 100) || 'Geral';
      const rawScope = clean(body.triage.contractScope, 40);
      const triageContractScope = [
        'garantia',
        'franquia_suporte',
        'homologacao_ajuste',
        'fora_de_escopo_orcamento',
        'a_confirmar_pelo_dev',
      ].includes(rawScope)
        ? rawScope
        : 'franquia_suporte';

      const candidateFiles = Array.isArray(body.triage.targetFiles) ? body.triage.targetFiles : [];
      const triageFiles = sanitizeTargetFiles(candidateFiles, text, categoryName);

      // DEFESA CONTRA PROMPT INJECTION: O prompt é SEMPRE gerado no servidor
      // NUNCA aceita body.triage.aiAgentPrompt do cliente
      const triagePrompt = buildHeuristicAiPrompt(
        triageTitle,
        triageSummary,
        triageType,
        triagePriority,
        triageFiles,
        categoryName
      );

      analysis = {
        title: triageTitle,
        type: triageType,
        priority: triagePriority,
        summary: triageSummary,
        contractScope: triageContractScope,
        technicalPlan: clean(body.triage.technicalPlan, 4000) || `Ajustar os arquivos: ${triageFiles.join(', ')}.`,
        targetFiles: triageFiles,
        aiAgentPrompt: triagePrompt,
        clarifyingQuestions: [],
        source: body.triage.source === 'gemini' && env.GEMINI_API_KEY ? 'gemini' : 'heuristic',
      };
    } else {
      analysis = await analyzeRequest(env, text);
    }

    // Separação estrita de autoria: assistente de IA é rotulado como 'ia'
    const conversationMessages = Array.isArray(body.conversation) && body.conversation.length > 0
      ? body.conversation.map((m: any) => ({
          at: m.at || now(),
          role: m.role === 'assistant' ? 'ia' : m.role === 'dev' || m.role === 'admin' ? 'admin' : 'client',
          text: clean(m.content || m.text || '', 3000),
        }))
      : [{ at: now(), role: 'client', text }];

    const item = {
      id,
      createdAt: now(),
      updatedAt: now(),
      status: 'new',
      originalText: text,
      category: clean(body.category, 100) || 'Geral',
      ...analysis,
      history: [{ at: now(), event: 'created', detail: `Triagem: ${analysis.source}` }],
      messages: conversationMessages,
    };
    await s.put(`request:${id}`, JSON.stringify(item));
    await s.put(INDEX_KEY, JSON.stringify([id, ...ids].slice(0, 500)));
    await recordAuditEvent(env, request, {
      type: 'REQUEST_CREATED',
      severity: 'info',
      summary: `Nova solicitação: ${item.title}`,
      details: { id, type: item.type, priority: item.priority },
    }).catch(() => {});
    return json({ request: item }, 201);
  }

  const id = clean(body.id, 64);
  const raw = id ? await s.get(`request:${id}`) : null;
  if (!raw) return json({ error: 'Solicitação não encontrada.' }, 404);
  const item = JSON.parse(raw);

  if (body.action === 'delete') {
    await s.del(`request:${id}`);
    await s.put(INDEX_KEY, JSON.stringify(ids.filter((i) => i !== id)));
    return json({ success: true });
  }

  if (body.action === 'update') {
    if (body.status && STATUSES.includes(body.status) && body.status !== item.status) {
      item.history.push({ at: now(), event: 'status', detail: `${item.status} → ${body.status}` });
      item.status = body.status;
    }
    if (['low', 'medium', 'high', 'critical'].includes(body.priority) && body.priority !== item.priority) {
      item.history.push({ at: now(), event: 'priority', detail: `${item.priority} → ${body.priority}` });
      item.priority = body.priority;
    }
    if (body.reanalyze) {
      Object.assign(item, await analyzeRequest(env, item.originalText));
      item.history.push({ at: now(), event: 'reanalyzed', detail: `Fonte: ${item.source}` });
    }
  } else if (body.action === 'message') {
    const text = clean(body.text, 3000);
    if (!text) return json({ error: 'Mensagem vazia.' }, 400);
    item.messages.push({ at: now(), role: body.role === 'client' ? 'client' : 'admin', text });
  } else {
    return json({ error: 'Ação inválida.' }, 400);
  }

  item.updatedAt = now();
  await s.put(`request:${id}`, JSON.stringify(item));
  return json({ request: item });
};
