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
import { parseAndVerifySessionToken, getSessionCookie, timingSafeEqualString } from '../_authHelper';
import { getSupabaseClient, isSupabaseConfigured } from '../_supabaseClient';
import { saveSiteContentToSupabase, getSiteContentFromSupabase } from '../supabase/content';
import { guardPurchasedPackChanges } from '../content/_purchasedPacks';
import { getAdminSessionSecret, getDedicatedMasterSecret } from '../_central/secrets';

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
  const base = draftForAi(content);
  if (base?.avulsos && Array.isArray(base.avulsos.items)) {
    base.avulsos = {
      ...base.avulsos,
      items: base.avulsos.items
        // Keep active single-item products in the published checkout catalog.
        // Private media URLs are stripped from the resulting public item below.
        .filter((item: any) => item && item.active !== false)
        .map((item: any) => {
          const rawExclusive = Array.isArray(item.exclusivePhotos) ? item.exclusivePhotos : [];
          const rawVideos = Array.isArray(item.videos) ? item.videos : [];
          const safeVideos = rawVideos.map((v: any, idx: number) => ({
            id: v?.id || `vid-${idx + 1}`,
            title: v?.title || `Vídeo ${idx + 1}`,
            duration: v?.duration || undefined,
            posterUrl:
              typeof v?.posterUrl === 'string' && !v.posterUrl.includes('/private/')
                ? v.posterUrl
                : undefined,
            url: '',
          }));
          const { protectedMedia: _pm, privateFiles: _pf, files: _f, ...restItem } = item;
          return {
            ...restItem,
            exclusivePhotos: [],
            exclusivePhotosCount: rawExclusive.length,
            videos: safeVideos,
            videosCount: rawVideos.length,
          };
        }),
    };
  }
  return base;
}

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  // Autenticação (aceita Bearer token de sessão, cookie ou X-Master-Key para chamadas internas de serviço)
  const url = new URL(request.url);
  const authHeader = request.headers.get('Authorization');
  const masterKeyHeader = request.headers.get('X-Master-Key');
  const sessionCookie = getSessionCookie(request);
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : sessionCookie;
  const secret = getAdminSessionSecret(env);

  const hasDedicatedApiSecret = Boolean(
    env.ADMIN_API_SECRET &&
      env.ADMIN_API_SECRET.length >= 24 &&
      env.ADMIN_API_SECRET !== env.ADMIN_PASSWORD
  );
  const cleanMasterKey = masterKeyHeader?.trim() || '';
  const isMasterKeyValid =
    hasDedicatedApiSecret &&
    Boolean(cleanMasterKey) &&
    (await timingSafeEqualString(cleanMasterKey, env.ADMIN_API_SECRET!));
  const { parseAndVerifyActiveAdminSession } = await import('../_central/adminSessions');
  const parsedSession = await parseAndVerifyActiveAdminSession(env as any, token, secret, ['admin', 'dev', 'client']);
  const isAuth = isMasterKeyValid || Boolean(parsedSession);

  if (!isAuth) {
    return new Response(
      JSON.stringify({ error: 'Seu acesso expirou. Entre novamente no painel.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Dados inválidos. Tente novamente.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { ops, content: incomingContent, editorName = 'Nay' } = body;

  // Obtém o conteúdo atual do Supabase como base (fonte de verdade)
  let currentContent: any = null;
  if (isSupabaseConfigured(env)) {
    const supabase = getSupabaseClient(env);
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('site_content')
          .select('content, updated_at, version')
          .eq('key', KV_PRIVATE_CONTENT_KEY)
          .maybeSingle();
        if (error) throw error;
        if (data?.content && typeof data.content === 'object') {
          currentContent = data.content;
          if (!currentContent._updatedAt && data.updated_at) {
            currentContent._updatedAt = data.updated_at;
          }
          if (!currentContent._version && data.version) {
            currentContent._version = data.version;
          }
        }
      } catch {
        return Response.json({ error: 'Não foi possível consultar o catálogo atual. Tente salvar novamente.' }, { status: 503 });
      }
    }
  }

  let nextContent: any;
  let changes: any[] = [];

  if (Array.isArray(ops) && ops.length > 0) {
    if (ops.length > 40) {
      return new Response(
        JSON.stringify({ error: 'Operações demais de uma vez (máx. 40).' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Prioriza sempre o registro completo do Supabase como base para nunca perder library/mídias privadas (AUD-025)
    const baseContent = currentContent || incomingContent;
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

    nextContent = result.content;
    changes = result.changes;
  } else if (incomingContent && typeof incomingContent === 'object') {
    // Rehidrata biblioteca/mídias do Supabase caso o payload recebido tenha sido podado para a IA
    const clonedIncoming = JSON.parse(JSON.stringify(incomingContent));
    nextContent = currentContent
      ? rehydrateLibrary(clonedIncoming, currentContent)
      : clonedIncoming;
    changes = [{ action: 'replace_content', path: 'root' }];
  } else {
    return new Response(
      JSON.stringify({ error: 'Nenhuma alteração foi informada.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  // Resolve papel do chamador (NUA-AUD-012: bloqueia alteração de `adminUi` para role `client`)
  let callerRole: string | null = (context as any)?.data?.actor?.role || null;
  const resolvedSecret = getAdminSessionSecret(env);
  const dedicatedMaster = getDedicatedMasterSecret(env);
  if (!callerRole && cleanMasterKey && dedicatedMaster && (await timingSafeEqualString(cleanMasterKey, dedicatedMaster))) {
    callerRole = 'admin';
  } else if (!callerRole && parsedSession?.role) {
    callerRole = parsedSession.role;
  }

  if (callerRole === 'client') {
    const touchesAdminUiOp =
      Array.isArray(ops) &&
      ops.some((op: any) => String(op?.path || '').trim().toLowerCase().startsWith('adminui'));
    const touchesAdminUiFull =
      incomingContent &&
      typeof incomingContent === 'object' &&
      'adminUi' in incomingContent &&
      JSON.stringify(incomingContent.adminUi) !== JSON.stringify(currentContent?.adminUi);
    if (touchesAdminUiOp || touchesAdminUiFull) {
      return new Response(
        JSON.stringify({
          error: 'Acesso negado: alterações estruturais em adminUi são restritas ao superadministrador.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  const restricted = await guardPurchasedPackChanges(env, currentContent?.avulsos?.items, nextContent?.avulsos?.items);
  if (restricted) return restricted;

  const nowIso = new Date().toISOString();
  const nextVersion = Number(nextContent._version || 0) + 1;

  // Anexa metadados de versão
  nextContent._updatedAt = nowIso;
  nextContent._version = nextVersion;

  // Persistência no Supabase APENAS em private_admin_content (rascunho seguro — publicação exige ação explícita)
  let supabaseResult: { success: boolean; version?: number; error?: string } = { success: false };
  if (isSupabaseConfigured(env)) {
    const supabase = getSupabaseClient(env);
    if (supabase) {
      supabaseResult = await saveSiteContentToSupabase(env, KV_PRIVATE_CONTENT_KEY, nextContent, editorName);

      // Backup
      try {
        await supabase.from('content_backups').insert({
          content_key: KV_PRIVATE_CONTENT_KEY,
          snapshot: nextContent,
          created_at: nowIso,
        });
      } catch (backupErr) {
        console.warn('[ContentOps] Backup snapshot warning:', backupErr);
      }
    }
  } else {
    // Ambiente local ou sem Supabase configurado: considera salvo localmente
    supabaseResult = { success: true, version: nextVersion };
  }

  // Auditoria
  const changedPaths = Array.isArray(ops) ? ops.map((o) => o.path).filter(Boolean) : ['draft_root'];
  try {
    await recordAuditEvent(env, request, {
      type: 'CONTENT_OPS',
      severity: 'info',
      summary: `${editorName} editou ${changedPaths.length} campo(s) do site`,
      details: {
        sectionsModified: changedPaths,
        editor: editorName,
        timestamp: nowIso,
        changes,
      },
    }).catch(() => {});
  } catch {}

  return new Response(
    JSON.stringify({
      success: supabaseResult.success,
      content: nextContent,
      version: nextVersion,
      updatedAt: nowIso,
      changes,
      error: supabaseResult.success ? undefined : 'Não foi possível salvar as alterações. Tente novamente em instantes.',
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
    JSON.stringify({ error: 'Ação não permitida.' }),
    { status: 405, headers: { 'Content-Type': 'application/json' } }
  );
};
