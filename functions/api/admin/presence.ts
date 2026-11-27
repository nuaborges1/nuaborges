/**
 * Cloudflare Pages Function: GET / POST /api/admin/presence
 *
 * Presença discreta do painel administrativo:
 * - POST (sessão da Nua Borges): registra heartbeat leve + página atual e atividade recente.
 * - GET (exclusivo do perfil PHDEV): informa se a Nua está online e qual página acessa,
 *   considerando expiração de heartbeat (45s), inatividade do usuário (3 min) e revogação de sessão.
 * - Armazenamento: chave única `nua_panel_presence:nua` em `site_content` (sem nova infra).
 */

import {
  getSessionCookie,
  resolveAdminPanelProfile,
  type SessionPayload,
} from '../_authHelper';
import { isAdminSessionActive, parseAndVerifyActiveAdminSession } from '../_central/adminSessions';
import { getAdminSessionSecret } from '../_central/secrets';
import { getSupabaseClient } from '../_supabaseClient';
import type { CentralActor, CentralEnv } from '../_central/types';

type PagesContext<T = CentralEnv> = {
  request: Request;
  env: T;
  data?: { actor?: CentralActor };
};

export const PRESENCE_STORAGE_KEY = 'nua_panel_presence:nua';
export const PRESENCE_HEARTBEAT_TTL_MS = 45 * 1000;
export const PRESENCE_INACTIVITY_TTL_MS = 3 * 60 * 1000;

export interface NuaPresenceRecord {
  sessionId: string;
  module: string;
  moduleLabel: string;
  pathname: string;
  lastSeenAt: string;
  lastActivityAt: string;
  online: boolean;
}

const NO_STORE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

function sanitizeModule(raw: unknown): string {
  const clean = String(raw || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return clean.slice(0, 40) || 'dashboard';
}

function sanitizeLabel(raw: unknown): string {
  return String(raw || '')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, 60);
}

function sanitizePathname(raw: unknown): string {
  const clean = String(raw || '').trim().replace(/[\r\n\t]+/g, '');
  if (!clean.startsWith('/')) return '/admin';
  return clean.slice(0, 120);
}

async function resolveCallerSession(
  request: Request,
  env: CentralEnv
): Promise<SessionPayload | null> {
  const secret = getAdminSessionSecret(env);
  if (!secret) return null;
  const cookieToken = getSessionCookie(request);
  const authHeader = request.headers.get('Authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const token = cookieToken || bearer;
  if (!token) return null;
  return parseAndVerifyActiveAdminSession(env, token, secret, ['admin', 'dev', 'client']);
}

export async function clearNuaPresenceOnLogout(
  env: CentralEnv,
  sessionId?: string | null
): Promise<void> {
  const sb = getSupabaseClient(env as any);
  if (!sb) return;
  try {
    const { data } = await sb
      .from('site_content')
      .select('content')
      .eq('key', PRESENCE_STORAGE_KEY)
      .maybeSingle();

    const current = data?.content as Partial<NuaPresenceRecord> | undefined;
    if (!current || (sessionId && current.sessionId && current.sessionId !== sessionId)) {
      return;
    }

    const nowIso = new Date().toISOString();
    await sb.from('site_content').upsert(
      {
        key: PRESENCE_STORAGE_KEY,
        content: {
          ...current,
          online: false,
          lastSeenAt: nowIso,
        },
        updated_at: nowIso,
      },
      { onConflict: 'key' }
    );
  } catch {
    // Best-effort no logout
  }
}

export function isPresenceActive(
  record: Partial<NuaPresenceRecord> | null | undefined,
  nowMs = Date.now()
): record is NuaPresenceRecord {
  if (!record || record.online !== true) return false;
  const seenMs = typeof record.lastSeenAt === 'string' ? Date.parse(record.lastSeenAt) : NaN;
  const actMs = typeof record.lastActivityAt === 'string' ? Date.parse(record.lastActivityAt) : NaN;
  if (!Number.isFinite(seenMs) || !Number.isFinite(actMs)) return false;
  if (nowMs - seenMs > PRESENCE_HEARTBEAT_TTL_MS) return false;
  if (nowMs - actMs > PRESENCE_INACTIVITY_TTL_MS) return false;
  return true;
}

export const onRequestPost = async (context: PagesContext) => {
  const { request, env } = context;
  if (context.data?.actor?.authMethod === 'local_dev' || context.data?.actor?.authMethod === 'local_session') {
    return Response.json({ success: true, ignored: true }, { headers: NO_STORE_HEADERS });
  }
  const session = await resolveCallerSession(request, env);
  if (!session) {
    return new Response(JSON.stringify({ success: false, error: 'Não autorizado.' }), {
      status: 401,
      headers: NO_STORE_HEADERS,
    });
  }

  // Apenas a sessão da Nua Borges reporta presença
  if (resolveAdminPanelProfile(session) !== 'nua') {
    return new Response(JSON.stringify({ success: true, ignored: true }), {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  }

  const sb = getSupabaseClient(env as any);
  if (!sb) {
    return new Response(JSON.stringify({ success: true, stored: false }), {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  }

  const body = (await request.json().catch(() => ({}))) as {
    module?: string;
    moduleLabel?: string;
    pathname?: string;
    active?: boolean;
    offline?: boolean;
    lastActivityAt?: string;
  };

  const nowIso = new Date().toISOString();

  if (body.offline === true) {
    await clearNuaPresenceOnLogout(env, session.nonce);
    return new Response(JSON.stringify({ success: true, online: false }), {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  }

  const { data: existingRow } = await sb
    .from('site_content')
    .select('content')
    .eq('key', PRESENCE_STORAGE_KEY)
    .maybeSingle();

  const prev = (existingRow?.content || {}) as Partial<NuaPresenceRecord>;
  const isActive = body.active !== false;
  const parsedClientAct =
    typeof body.lastActivityAt === 'string' && Number.isFinite(Date.parse(body.lastActivityAt))
      ? new Date(Math.min(Date.parse(body.lastActivityAt), Date.now())).toISOString()
      : null;

  const nextRecord: NuaPresenceRecord = {
    sessionId: session.nonce,
    module: sanitizeModule(body.module ?? prev.module),
    moduleLabel: sanitizeLabel(body.moduleLabel ?? prev.moduleLabel) || 'Início',
    pathname: sanitizePathname(body.pathname ?? prev.pathname),
    lastSeenAt: nowIso,
    lastActivityAt: isActive
      ? parsedClientAct || nowIso
      : prev.sessionId === session.nonce && prev.lastActivityAt
        ? prev.lastActivityAt
        : nowIso,
    online: true,
  };

  await sb.from('site_content').upsert(
    {
      key: PRESENCE_STORAGE_KEY,
      content: nextRecord,
      updated_at: nowIso,
    },
    { onConflict: 'key' }
  );

  return new Response(JSON.stringify({ success: true, online: true }), {
    status: 200,
    headers: NO_STORE_HEADERS,
  });
};

export const onRequestGet = async (context: PagesContext) => {
  const { request, env } = context;
  const session = await resolveCallerSession(request, env);
  const isLocalDeveloper = context.data?.actor?.authMethod === 'local_session' && context.data.actor.subject === 'phdev';
  if (!session && !isLocalDeveloper) {
    return new Response(JSON.stringify({ success: false, error: 'Não autorizado.' }), {
      status: 401,
      headers: NO_STORE_HEADERS,
    });
  }

  // Leitura de presença é ESTRITAMENTE exclusiva do perfil PHDEV
  if (session && resolveAdminPanelProfile(session) !== 'phdev') {
    return new Response(JSON.stringify({ success: false, error: 'Acesso restrito.' }), {
      status: 403,
      headers: NO_STORE_HEADERS,
    });
  }

  const sb = getSupabaseClient(env as any);
  if (!sb) {
    return new Response(JSON.stringify({ online: false }), {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  }

  try {
    const { data, error } = await sb
      .from('site_content')
      .select('content')
      .eq('key', PRESENCE_STORAGE_KEY)
      .maybeSingle();

    if (error || !data?.content) {
      return new Response(JSON.stringify({ online: false }), {
        status: 200,
        headers: NO_STORE_HEADERS,
      });
    }

    const record = data.content as Partial<NuaPresenceRecord>;
    if (!isPresenceActive(record)) {
      return new Response(JSON.stringify({ online: false }), {
        status: 200,
        headers: NO_STORE_HEADERS,
      });
    }

    // Confirma que a sessão reportada ainda não foi revogada
    if (record.sessionId && !(await isAdminSessionActive(env, record.sessionId))) {
      return new Response(JSON.stringify({ online: false }), {
        status: 200,
        headers: NO_STORE_HEADERS,
      });
    }

    return new Response(
      JSON.stringify({
        online: true,
        module: record.module,
        moduleLabel: record.moduleLabel,
        pathname: record.pathname,
        lastSeenAt: record.lastSeenAt,
        lastActivityAt: record.lastActivityAt,
      }),
      { status: 200, headers: NO_STORE_HEADERS }
    );
  } catch {
    return new Response(JSON.stringify({ online: false }), {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  }
};
