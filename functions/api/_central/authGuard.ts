/**
 * Guardião Central de Autenticação e RBAC (`authGuard.ts`).
 *
 * Resolve o ator autenticado em um único lugar, valida revogação de sessão (`jti`)
 * no servidor, impede uso de `ADMIN_PASSWORD` como chave de API e aplica RBAC.
 */

import {
  getSessionCookie,
  timingSafeEqualString,
  type UserRole,
} from '../_authHelper';
import { parseAndVerifyActiveAdminSession } from './adminSessions';
import { hasAdminCapability } from './adminCapabilities';
import { getAdminSessionSecret, getDedicatedMasterSecret } from './secrets';
import type { CentralActor, CentralEnv, RoutePolicy } from './types';

export interface AuthGuardResult {
  ok: boolean;
  status?: number;
  error?: string;
  actor?: CentralActor;
  role?: UserRole;
}

export function extractCronSecretFromRequest(request: Request): string {
  const explicitHeader = (request.headers.get('x-cron-secret') || '').trim();
  if (explicitHeader) return explicitHeader;
  const authHeader = request.headers.get('Authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return '';
}

export async function isValidCronSecretRequest(request: Request, env: CentralEnv): Promise<boolean> {
  const expected = String(env?.CRON_SECRET || '').trim();
  if (!expected) return false;
  const provided = extractCronSecretFromRequest(request);
  if (!provided) return false;
  return timingSafeEqualString(provided, expected);
}

export async function enforceRouteAuth(params: {
  request: Request;
  env: CentralEnv;
  pathname: string;
  policy: RoutePolicy;
  isLocalDev: boolean;
  localAdminActor?: CentralActor;
}): Promise<AuthGuardResult> {
  const { request, env, pathname, policy, isLocalDev, localAdminActor } = params;

  if (
    policy.auth === 'none' ||
    policy.auth === 'customer_handler' ||
    policy.auth === 'contract_handler' ||
    policy.auth === 'webhook_signed'
  ) {
    return { ok: true };
  }

  if (policy.auth === 'cron_secret') {
    if (!(await isValidCronSecretRequest(request, env))) {
      return { ok: false, status: 401, error: 'Credencial de cron inválida ou ausente.' };
    }
    return {
      ok: true,
      actor: { role: 'admin', subject: 'cron_worker', authMethod: 'cron_secret' },
      role: 'admin',
    };
  }

  if (policy.auth === 'cron_or_superadmin' && (await isValidCronSecretRequest(request, env))) {
    return {
      ok: true,
      actor: { role: 'admin', subject: 'cron_worker', authMethod: 'cron_secret' },
      role: 'admin',
    };
  }

  const sessionSecret = getAdminSessionSecret(env);
  const dedicatedMaster = getDedicatedMasterSecret(env);

  if (!sessionSecret && !dedicatedMaster && !env?.ADMIN_PASSWORD) {
    return {
      ok: false,
      status: 503,
      error: 'Servidor sem segredo criptográfico de autenticação configurado.',
    };
  }

  let actor: CentralActor | null = isLocalDev && localAdminActor?.authMethod === 'local_session'
    ? localAdminActor
    : null;

  // 1. Cookie HttpOnly (caminho principal para o painel admin)
  const sessionCookie = getSessionCookie(request);
  if (!actor && sessionCookie && sessionSecret) {
    const payload = await parseAndVerifyActiveAdminSession(env, sessionCookie, sessionSecret);
    if (payload) {
      actor = {
        role: payload.role,
        subject: payload.sub,
        jti: payload.nonce,
        authMethod: 'cookie',
      };
    }
  }

  // 2. X-Master-Key ou Authorization Bearer (somente para superadmin / admingeral)
  if (!actor) {
    const authHeader = request.headers.get('Authorization');
    const masterKeyHeader = request.headers.get('X-Master-Key');
    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7).trim()
      : '';
    const candidateMaster = masterKeyHeader?.trim() || bearerToken;

    if (
      candidateMaster &&
      dedicatedMaster &&
      (await timingSafeEqualString(candidateMaster, dedicatedMaster))
    ) {
      actor = {
        role: 'admin',
        subject: 'master_key',
        authMethod: 'master_key',
      };
    } else if (bearerToken && sessionSecret) {
      const payload = await parseAndVerifyActiveAdminSession(env, bearerToken, sessionSecret);
      if (payload) {
        actor = {
          role: payload.role,
          subject: payload.sub,
          jti: payload.nonce,
          authMethod: 'bearer',
        };
      }
    }
  }

  if (!actor && isLocalDev && !sessionCookie && !request.headers.has('Authorization') && !request.headers.has('X-Master-Key')) {
    actor = { role: 'client', subject: 'local_dev', authMethod: 'local_dev' };
  }

  if (!actor) {
    return {
      ok: false,
      status: 401,
      error: 'Acesso não autorizado. Faça login no painel administrativo.',
    };
  }

  let capability = policy.adminCapability;
  if (pathname === '/api/admin/refund' && request.method === 'POST') {
    const body = await request.clone().json().catch(() => null) as { action?: unknown } | null;
    if (body?.action === 'reconcile') capability = 'payments.refund.reconcile';
  }

  // Legacy portal credentials keep their existing scope on the older requests flow.
  let legacyRequestAllowed = true;
  if (actor.role === 'client' && pathname === '/api/requests' && request.method !== 'GET') {
    const body = await request.clone().json().catch(() => null) as { action?: unknown } | null;
    legacyRequestAllowed = request.method === 'POST' &&
      typeof body?.action === 'string' && ['interview', 'create', 'message'].includes(body.action);
  }

  if (!capability || !hasAdminCapability(actor, capability) || !legacyRequestAllowed) {
    return {
      ok: false,
      status: 403,
      error: 'Acesso negado: perfil sem autorização para esta operação.',
      role: actor.role,
    };
  }
  return { ok: true, actor, role: actor.role };
}
