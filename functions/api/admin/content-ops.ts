/**
 * Cloudflare Pages Function: /api/admin/content-ops
 *
 * Endpoint para a NuaIA aplicar operações atômicas (set/append/remove)
 * sobre o SiteContent do painel administrativo, com persistência no Supabase.
 *
 * Exige autenticação admin/dev (middleware já garante).
 *
 * Body:
 *   { ops: Array<{action:'set'|'append'|'remove', path:string, value?:any}>, content?: SiteContent, editorName?: string }
 *
 * Resposta:
 *   { success: boolean, content: SiteContent, version: number, updatedAt: string, changes: Array }
 */

import { applyContentOps, draftForAi, rehydrateLibrary } from '../../../lib/nuaAi/contentOps.mjs';
import { recordAuditEvent } from '../_auditHelper';
import { verifySessionToken, getSessionCookie } from '../_authHelper';
import { getSupabaseClient, isSupabaseConfigured } from '../_supabaseClient';
import { saveSiteContentToSupabase, getSiteContentFromSupabase } from '../supabase/content';

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  ADMIN_API_SECRET?: string;
  ADMIN_PASSWORD?: string;
  [key: string]: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

const KV_PRIVATE_CONTENT_KEY = 'private_admin_content';

function sanitizeForAi(content: any): any {
  return draftForAi(content);
}

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  // Autenticação (mesma estratégia de /api/content/sync)
  const url = new URL(request.url);
  const authHeader = request.headers.get('Authorization');
  const sessionCookie = getSessionCookie(request);
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : sessionCookie;
  const secret = env.ADMIN_API_SECRET || env.ADMIN_PASSWORD;
  const isAuth = secret && token ? await verifySessionToken(token, secret) : false;

  if (!isAuth) {
    return new Response(
      JSON.stringify({ error: 'Sessão inválida ou expirada.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Payload inválido.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { ops, content: incomingContent, editorName = 'Nua IA' } = body;

  if (!Array.isArray(ops) || ops.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Nenhuma operação informada.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (ops.length > 40) {
    return new Response(
      JSON.stringify({ error: 'Operações demais de uma vez (máx. 40).' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Obtém o conteúdo atual do Supabase como base (fonte de verdade)
  let currentContent: any = null;
  if (isSupabaseConfigured(env)) {
    const supabase = getSupabaseClient(env);
    if (supabase) {
      try {
        const { data } = await supabase
          .from('site_content')
          .select('content, updated_at, version')
          .eq('key', KV_PRIVATE_CONTENT_KEY)
          .maybeSingle();
        if (data?.content && typeof data.content === 'object') {
          currentContent = data.content;
          if (!currentContent._updatedAt && data.updated_at) {
            currentContent._updatedAt = data.updated_at;
          }
          if (!currentContent._version && data.version) {
            currentContent._version = data.version;
          }
        }
      } catch {}
    }
  }

  // Se o caller enviou content explícito, usa como base (útil quando o client já tem o draft atualizado)
  const baseContent = incomingContent || currentContent;
  if (!baseContent || typeof baseContent !== 'object') {
    return new Response(
      JSON.stringify({ error: 'Conteúdo base não encontrado. Salve um rascunho primeiro.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Aplica as operações atômicas
  const result = applyContentOps(JSON.parse(JSON.stringify(baseContent)), ops);
  if (!result.ok) {
    return new Response(
      JSON.stringify({ error: result.errors.join('; ') }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const nextContent = result.content;
  const nowIso = new Date().toISOString();
  const nextVersion = Number(nextContent._version || 0) + 1;

  // Anexa metadados de versão
  nextContent._updatedAt = nowIso;
  nextContent._version = nextVersion;

  // Persistência no Supabase (private_admin_content + published_content sanitizado)
  let supabaseResult: { success: boolean; version?: number; error?: string } = { success: false };
  if (isSupabaseConfigured(env)) {
    const supabase = getSupabaseClient(env);
    if (supabase) {
      const publicContent = sanitizeForAi(nextContent);
      supabaseResult = await saveSiteContentToSupabase(env, KV_PRIVATE_CONTENT_KEY, nextContent, editorName);

      // Também grava a versão pública (sanitizada) para consumo imediato pelo site
      if (supabaseResult.success) {
        await saveSiteContentToSupabase(env, 'published_content', publicContent, editorName).catch(() => {});
      }

      // Backup
      try {
        await supabase.from('content_backups').insert({
          content_key: KV_PRIVATE_CONTENT_KEY,
          snapshot: nextContent,
          created_at: nowIso,
        }).catch(() => {});
      } catch {}
    }
  } else {
    supabaseResult = { success: false, error: 'Supabase não configurado.' };
  }

  // Auditoria
  const changedPaths = ops.map((o) => o.path).filter(Boolean);
  try {
    await recordAuditEvent(env, request, {
      type: 'CONTENT_OPS',
      severity: 'info',
      summary: `Nua IA editou ${changedPaths.length} campo(s): ${changedPaths.join(', ')}`,
      details: {
        sectionsModified: changedPaths,
        editor: editorName,
        timestamp: nowIso,
        changes: result.changes,
      },
    }).catch(() => {});
  } catch {}

  return new Response(
    JSON.stringify({
      success: supabaseResult.success,
      content: nextContent,
      version: nextVersion,
      updatedAt: nowIso,
      changes: result.changes,
      error: supabaseResult.error,
    }),
    {
      status: supabaseResult.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

export const onRequest = async (context: PagesContext<Env>) => {
  if (context.request.method === 'POST') {
    return onRequestPost(context);
  }
  return new Response(
    JSON.stringify({ error: 'Método não permitido.' }),
    { status: 405, headers: { 'Content-Type': 'application/json' } }
  );
};
