/**
 * Cloudflare Pages Function: GET / POST /api/admin/notification-prefs
 *
 * Persistência de preferências de alertas e reconhecimento de pedidos
 * por perfil administrativo autenticado (`nua` vs `phdev`).
 *
 * - Não confunde preferência salva com permissão real do navegador (específica do dispositivo).
 * - Reconhecer uma notificação NUNCA altera o estado financeiro do pedido.
 * - Armazenamento em `site_content` via `getNuaIdAdapter` (compatível com testes isolados).
 */

import {
  getSessionCookie,
  resolveAdminOperator,
  type AdminPanelProfile,
} from '../_authHelper';
import { parseAndVerifyActiveAdminSession } from '../_central/adminSessions';
import { getAdminSessionSecret } from '../_central/secrets';
import type { CentralActor, CentralEnv } from '../_central/types';
import { getNuaIdAdapter, type NuaIdEnv } from '../id/_nuaIdStore';

type PagesContext<T = CentralEnv & NuaIdEnv> = {
  request: Request;
  env: T;
  data?: { actor?: CentralActor };
};

export interface AdminNotificationSettings {
  alertsEnabled: boolean;
  soundEnabled: boolean;
  windowsNotificationEnabled: boolean;
  tabFlashEnabled: boolean;
}

export interface AdminNotificationPersistedState {
  profile: AdminPanelProfile;
  settings: AdminNotificationSettings;
  acknowledgedOrderIds: string[];
  permissionPromptDismissedAt: string | null;
  updatedAt: string;
}

export const DEFAULT_ADMIN_NOTIFICATION_SETTINGS: AdminNotificationSettings = {
  alertsEnabled: true,
  soundEnabled: true,
  windowsNotificationEnabled: true,
  tabFlashEnabled: true,
};

const MAX_ACKNOWLEDGED_IDS = 400;

const NO_STORE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

export function notificationPrefsKey(profile: AdminPanelProfile): string {
  return `nua_admin_notif_state:${profile === 'phdev' ? 'phdev' : 'nua'}`;
}

async function resolveAuthenticatedProfile(
  context: PagesContext
): Promise<{ profile: AdminPanelProfile; subject: string } | null> {
  const { request, env, data } = context;

  // 1. Ator já validado pelo gateway central (ou injetado em testes)
  if (data?.actor?.role) {
    const role = data.actor.role;
    const subject = data.actor.subject;
    const profile = data.actor.authMethod === 'local_dev' ? 'nua' : resolveAdminOperator({ sub: subject, role });
    return profile ? { profile, subject } : null;
  }

  // 2. Fallback direto via cookie/bearer de sessão ativa
  const secret = getAdminSessionSecret(env);
  if (secret) {
    const cookieToken = getSessionCookie(request);
    const authHeader = request.headers.get('Authorization');
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const token = cookieToken || bearer;
    if (token) {
      const payload = await parseAndVerifyActiveAdminSession(env, token, secret, [
        'admin',
        'dev',
        'client',
      ]);
      const profile = payload && resolveAdminOperator(payload);
      if (profile && payload) return { profile, subject: payload.sub };
    }
  }

  // 3. Ambiente local de desenvolvimento (localhost)
  try {
    const url = new URL(request.url);
    const isLoopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    const isProd = String(env?.ENVIRONMENT || '').toLowerCase() === 'production';
    if (isLoopback && !isProd) {
      const requestedProfile = url.searchParams.get('profile');
      return {
        profile: requestedProfile === 'phdev' ? 'phdev' : 'nua',
        subject: 'local_dev',
      };
    }
  } catch {}

  return null;
}

function normalizeState(
  profile: AdminPanelProfile,
  raw: Partial<AdminNotificationPersistedState> | null | undefined
): AdminNotificationPersistedState {
  const s: Partial<AdminNotificationSettings> = raw?.settings || {};
  const ackList = Array.isArray(raw?.acknowledgedOrderIds)
    ? Array.from(
        new Set(
          raw.acknowledgedOrderIds
            .map((id) => String(id || '').trim())
            .filter((id) => id.length > 0 && id.length <= 128)
        )
      ).slice(0, MAX_ACKNOWLEDGED_IDS)
    : [];

  return {
    profile,
    settings: {
      alertsEnabled: typeof s.alertsEnabled === 'boolean' ? s.alertsEnabled : true,
      soundEnabled: typeof s.soundEnabled === 'boolean' ? s.soundEnabled : true,
      windowsNotificationEnabled:
        typeof s.windowsNotificationEnabled === 'boolean' ? s.windowsNotificationEnabled : true,
      tabFlashEnabled: typeof s.tabFlashEnabled === 'boolean' ? s.tabFlashEnabled : true,
    },
    acknowledgedOrderIds: ackList,
    permissionPromptDismissedAt:
      typeof raw?.permissionPromptDismissedAt === 'string'
        ? raw.permissionPromptDismissedAt
        : null,
    updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  };
}

export const onRequestGet = async (context: PagesContext) => {
  const caller = await resolveAuthenticatedProfile(context);
  if (!caller) {
    return new Response(JSON.stringify({ success: false, error: 'Não autorizado.' }), {
      status: 401,
      headers: NO_STORE_HEADERS,
    });
  }

  const adapter = getNuaIdAdapter(context.env);
  const stored = adapter
    ? await adapter
        .kvGet<Partial<AdminNotificationPersistedState>>(notificationPrefsKey(caller.profile))
        .catch(() => null)
    : null;

  const state = normalizeState(caller.profile, stored);

  return new Response(JSON.stringify({ success: true, state }), {
    status: 200,
    headers: NO_STORE_HEADERS,
  });
};

export const onRequestPost = async (context: PagesContext) => {
  const caller = await resolveAuthenticatedProfile(context);
  if (!caller) {
    return new Response(JSON.stringify({ success: false, error: 'Não autorizado.' }), {
      status: 401,
      headers: NO_STORE_HEADERS,
    });
  }

  const adapter = getNuaIdAdapter(context.env);
  if (!adapter) {
    return new Response(
      JSON.stringify({ success: false, error: 'Armazenamento de preferências indisponível.' }),
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  const body: any = await context.request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return new Response(JSON.stringify({ success: false, error: 'Payload inválido.' }), {
      status: 400,
      headers: NO_STORE_HEADERS,
    });
  }

  const key = notificationPrefsKey(caller.profile);
  const current = normalizeState(
    caller.profile,
    await adapter.kvGet<Partial<AdminNotificationPersistedState>>(key).catch(() => null)
  );

  const action = String(body.action || 'save_settings').trim();
  const nowIso = new Date().toISOString();
  let next: AdminNotificationPersistedState = { ...current, updatedAt: nowIso };

  if (action === 'save_settings') {
    const patch = body.settings && typeof body.settings === 'object' ? body.settings : body;
    next.settings = {
      alertsEnabled:
        typeof patch.alertsEnabled === 'boolean'
          ? patch.alertsEnabled
          : current.settings.alertsEnabled,
      soundEnabled:
        typeof patch.soundEnabled === 'boolean'
          ? patch.soundEnabled
          : current.settings.soundEnabled,
      windowsNotificationEnabled:
        typeof patch.windowsNotificationEnabled === 'boolean'
          ? patch.windowsNotificationEnabled
          : current.settings.windowsNotificationEnabled,
      tabFlashEnabled:
        typeof patch.tabFlashEnabled === 'boolean'
          ? patch.tabFlashEnabled
          : current.settings.tabFlashEnabled,
    };
  } else if (action === 'acknowledge') {
    const incomingIds = Array.isArray(body.orderIds)
      ? body.orderIds
      : typeof body.orderId === 'string'
        ? [body.orderId]
        : [];
    const cleaned = incomingIds
      .map((id: unknown) => String(id || '').trim())
      .filter((id: string) => id.length > 0 && id.length <= 128);
    // Mantém os IDs mais recentes no início e limita o histórico
    const merged = Array.from(new Set([...cleaned, ...current.acknowledgedOrderIds])).slice(
      0,
      MAX_ACKNOWLEDGED_IDS
    );
    next.acknowledgedOrderIds = merged;
  } else if (action === 'dismiss_permission_prompt') {
    next.permissionPromptDismissedAt = nowIso;
  } else {
    return new Response(JSON.stringify({ success: false, error: 'Ação não suportada.' }), {
      status: 400,
      headers: NO_STORE_HEADERS,
    });
  }

  const saved = await adapter.kvSet(key, next);
  if (!saved) {
    return new Response(
      JSON.stringify({ success: false, error: 'Não foi possível salvar as preferências.' }),
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  return new Response(JSON.stringify({ success: true, state: next }), {
    status: 200,
    headers: NO_STORE_HEADERS,
  });
};

export const onRequestOptions = async () => new Response(null, { status: 204 });
