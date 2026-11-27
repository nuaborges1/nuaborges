/**
 * Cloudflare Pages Function: GET / POST /api/admin/verbal-identity
 *
 * Controle administrativo EXCLUSIVO da conta desenvolvedor (PHDEV) para ativar
 * ou desativar a Identidade Verbal Autoral Experimental.
 *
 * Segurança obrigatória:
 * - Rota registrada no gateway central default-deny (`surface: 'admin'`,
 *   `auth: 'admin_rbac'`, `csrf: 'strict_cookie'`).
 * - Validação estrita da sessão ativa (não revogada em `admin_sessions`) +
 *   `resolveAdminPanelProfile(session) === 'phdev'`.
 * - A conta da Nua Borges (`profile: 'nua'`, mesmo com `role === 'dev'`) e
 *   demais contas recebem `403 Forbidden` no servidor.
 * - Toda tentativa negada e toda alteração bem-sucedida são registradas no
 *   log de auditoria (`recordAuditEvent`).
 */

import {
  getSessionCookie,
  resolveAdminPanelProfile,
  type SessionPayload,
} from '../_authHelper';
import { parseAndVerifyActiveAdminSession } from '../_central/adminSessions';
import { getAdminSessionSecret } from '../_central/secrets';
import { recordAuditEvent } from '../_auditHelper';
import {
  readVerbalIdentityConfig,
  saveVerbalIdentityConfig,
} from '../_verbalIdentityStore';
import type { CentralActor, CentralEnv } from '../_central/types';
import type { CopyMode } from '../../../lib/copy/types';

type PagesContext<T = CentralEnv> = {
  request: Request;
  env: T;
  data?: { actor?: CentralActor };
};

const NO_STORE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

function jsonResponse(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: NO_STORE_HEADERS,
  });
}

async function resolveAuthenticatedSession(
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

async function requirePhdevSession(
  request: Request,
  env: CentralEnv
): Promise<{ session: SessionPayload } | { errorResponse: Response }> {
  const session = await resolveAuthenticatedSession(request, env);
  if (!session) {
    return {
      errorResponse: jsonResponse(
        { success: false, error: 'Sessão administrativa obrigatória.' },
        401
      ),
    };
  }

  const profile = resolveAdminPanelProfile(session);
  if (profile !== 'phdev') {
    await recordAuditEvent(env, request, {
      type: 'VERBAL_IDENTITY_FORBIDDEN_ACCESS',
      severity: 'warning',
      summary: `Tentativa bloqueada de acesso ao controle experimental de identidade verbal (perfil: ${profile}).`,
      details: {
        method: request.method,
        profile,
        role: session.role,
        sub: session.sub || null,
      },
    });
    return {
      errorResponse: jsonResponse(
        {
          success: false,
          code: 'PHDEV_ONLY',
          error: 'Acesso restrito exclusivamente à conta do desenvolvedor (PHDEV).',
        },
        403
      ),
    };
  }

  return { session };
}

function parseRequestedMode(body: unknown): CopyMode | null {
  if (!body || typeof body !== 'object') return null;
  const obj = body as Record<string, unknown>;

  if (typeof obj.enabled === 'boolean') {
    return obj.enabled ? 'nua_autoral_experimental' : 'original';
  }
  if (obj.mode === 'original' || obj.mode === 'nua_autoral_experimental') {
    return obj.mode;
  }
  return null;
}

export async function onRequestGet(context: PagesContext) {
  const auth = await requirePhdevSession(context.request, context.env);
  if ('errorResponse' in auth) return auth.errorResponse;

  const config = await readVerbalIdentityConfig(context.env as any, { bypassCache: true });

  return jsonResponse({
    success: true,
    config,
  });
}

export async function onRequestPost(context: PagesContext) {
  const auth = await requirePhdevSession(context.request, context.env);
  if ('errorResponse' in auth) return auth.errorResponse;

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse(
      { success: false, error: 'Corpo JSON inválido.' },
      400
    );
  }

  const nextMode = parseRequestedMode(body);
  if (!nextMode) {
    return jsonResponse(
      {
        success: false,
        error: 'Informe `enabled` (boolean) ou `mode` ("original" | "nua_autoral_experimental").',
      },
      400
    );
  }

  const previous = await readVerbalIdentityConfig(context.env as any, { bypassCache: true });
  const saved = await saveVerbalIdentityConfig(context.env as any, nextMode, 'phdev');

  if (!saved.success) {
    return jsonResponse(
      {
        success: false,
        error: saved.error || 'Falha ao salvar a configuração experimental.',
        config: saved.config,
      },
      500
    );
  }

  await recordAuditEvent(context.env, context.request, {
    type: 'VERBAL_IDENTITY_TOGGLED',
    severity: 'info',
    summary:
      nextMode === 'nua_autoral_experimental'
        ? 'PHDEV ativou a Identidade Verbal Autoral Experimental.'
        : 'PHDEV desativou a Identidade Verbal Experimental (Copy Original restaurada).',
    details: {
      previousMode: previous.mode,
      nextMode: saved.config.mode,
      version: saved.config.version,
      updatedBy: 'phdev',
    },
  });

  return jsonResponse({
    success: true,
    config: saved.config,
    message:
      nextMode === 'nua_autoral_experimental'
        ? 'Identidade verbal autoral experimental ativada.'
        : 'Comunicação original restaurada.',
  });
}
