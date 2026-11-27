/**
 * Pipeline Central da Pasta Controladora (`functions/api/_central/index.ts`).
 *
 * Orquestra em ordem determinística todos os guardiões modulares:
 * 1. CORS & Preflight OPTIONS
 * 2. Resolução de Política (Default-Deny para rotas não cadastradas)
 * 3. Autenticação & RBAC Centralizados (+ injeção de `context.data.actor`)
 * 4. Isolamento de Host/Superfície (`admin.*` vs domínio público)
 * 5. Kill-Switch / Modo Manutenção
 * 6. Proteção CSRF Estrita
 * 7. Rate Limit Atômico
 * 8. Execução protegida com Envelope Seguro de Erro + Headers de Segurança
 */

import { resolveRoutePolicy } from './policies';
import { isProductionEnv } from './secrets';
import {
  applySecurityHeaders,
  buildCorsHeaders,
  collectExtraOrigins,
  isHostAllowedForSurface,
} from './hostGuard';
import { enforceRouteAuth } from './authGuard';
import { activeContainment, readContainments } from './containment';
import { getKillSwitchFlags } from './killSwitch';
import { validateCsrfRequest } from './csrfGuard';
import { checkRouteRateLimit } from './rateLimitGuard';
import { createCorrelationId, jsonError, safeInternalError } from './errorHandler';
import { emitProtocolEvent } from './protocolActivity';
import type { CentralEnv, PagesMiddlewareContext } from './types';

export async function runCentralApiGateway(
  context: PagesMiddlewareContext<CentralEnv>
): Promise<Response> {
  const { request, env, next } = context;
  const correlationId = createCorrelationId();
  const url = new URL(request.url);
  const pathname = url.pathname;

  const isProd = isProductionEnv(env);
  const isLoopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  const allowLocalOrigins = !isProd || isLoopback;
  const extraOrigins = collectExtraOrigins(env);
  const corsHeaders = buildCorsHeaders(request, extraOrigins, allowLocalOrigins);

  // 1. Preflight CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // 2. Política declarativa (Default-Deny para rotas não cadastradas ou removidas)
  const policy = resolveRoutePolicy(pathname, request.method);
  if (!policy) {
    return jsonError(404, 'Endpoint não encontrado ou desativado.', corsHeaders, {
      code: 'ROUTE_NOT_FOUND',
      correlationId,
    });
  }

  // 3. Autenticação & RBAC centralizados
  const authResult = await enforceRouteAuth({
    request,
    env,
    pathname,
    policy,
    isLocalDev: isLoopback && !isProd,
    localAdminActor: context.data?.localAdminActor,
  });

  if (!authResult.ok) {
    if (policy.surface === 'admin' || policy.surface === 'superadmin') {
      void emitProtocolEvent(env, request, {
        protocol: 'minato',
        category: 'sessao',
        actor: 'sistema',
        type: 'ADMIN_LOGIN_FAIL',
        severity: 'warning',
        summary: `Acesso negado (${authResult.status || 401}) em ${request.method} ${pathname}`,
        details: { route: pathname, method: request.method, status: authResult.status || 401, correlationId },
      }).catch(() => {});
    }
    return jsonError(
      authResult.status || 401,
      authResult.error || 'Acesso não autorizado.',
      corsHeaders,
      { code: authResult.status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED', correlationId }
    );
  }

  if (context.data && authResult.actor) {
    context.data.actor = authResult.actor;
  }

  // 4. Isolamento de Host/Superfície (impede rotas admin no host público em produção;
  //    chamadas server-to-server autenticadas com CRON_SECRET seguem superfície cron)
  const effectiveSurface =
    authResult.actor?.authMethod === 'cron_secret' ? 'cron' : policy.surface;
  if (!isHostAllowedForSurface(url, effectiveSurface, isProd, env)) {
    return jsonError(
      403,
      'Esta operação administrativa só está disponível no domínio oficial do painel.',
      corsHeaders,
      { code: 'HOST_NOT_ALLOWED', correlationId }
    );
  }

  // 5. Kill-Switch / Modo Manutenção
  if (!policy.bypassMaintenance) {
    const flags = await getKillSwitchFlags(env);
    if (flags.maintenanceMode) {
      return jsonError(503, flags.maintenanceMessage, corsHeaders, {
        code: 'MAINTENANCE_MODE',
        correlationId,
      });
    }
    if (policy.moduleKey && flags.disabledModules.includes(policy.moduleKey)) {
      return jsonError(
        503,
        'Este recurso está temporariamente pausado pela administração. Tente novamente em instantes.',
        corsHeaders,
        { code: 'MODULE_DISABLED', correlationId }
      );
    }
  }

  // 6. Proteção CSRF Estrita
  const csrf = validateCsrfRequest({
    request,
    csrfMode: authResult.actor?.authMethod === 'cron_secret' ? 'exempt_signed' : policy.csrf,
    extraOrigins,
    allowLocal: allowLocalOrigins,
    isProd,
    isMasterKeyAuth: authResult.actor?.authMethod === 'master_key',
  });
  if (!csrf.allowed) {
    void emitProtocolEvent(env, request, {
      protocol: 'kakashi',
      category: 'seguranca',
      actor: 'sistema',
      type: 'GATEWAY_SECURITY_BLOCK',
      severity: 'warning',
      summary: `Requisição bloqueada por proteção CSRF em ${request.method} ${pathname}`,
      details: { route: pathname, method: request.method, reason: csrf.reason || 'CSRF_BLOCKED', correlationId },
    }).catch(() => {});
    return jsonError(403, csrf.reason || 'Requisição bloqueada (CSRF Protection).', corsHeaders, {
      code: 'CSRF_BLOCKED',
      correlationId,
    });
  }

  // Read persisted emergency state even when an ordinary maintenance exception applies.
  if (pathname !== '/api/control/system' && !/^\/api\/auth\/(?:login|logout|session)$/.test(pathname)) {
    try {
      const records = await readContainments(env);
      if (context.data) context.data.containments = records;
      const containment = activeContainment(records, pathname, policy);
      if (containment) return jsonError(503,
        'Este serviço está temporariamente indisponível.', corsHeaders, { code: 'INCIDENT_CONTAINMENT', correlationId });
    } catch {
      const publicRead = (request.method === 'GET' || request.method === 'HEAD') && policy.surface === 'public';
      const controlledMutation = Boolean(policy.moduleKey) && request.method !== 'GET' && request.method !== 'HEAD';
      if (controlledMutation || (env.NUA_EMERGENCY_ACCESS_VERIFIED === 'true' && !publicRead)) {
        return jsonError(503, 'Não foi possível confirmar o estado operacional.', corsHeaders, {
          code: 'CONTAINMENT_STATE_UNAVAILABLE', correlationId,
        });
      }
    }
  }

  // 7. Rate Limiting Atômico (quando definido na política da rota)
  if (policy.rateLimit) {
    const rl = await checkRouteRateLimit(request, env, policy.rateLimit);
    if (!rl.allowed) {
      void emitProtocolEvent(env, request, {
        protocol: 'kakashi',
        category: 'seguranca',
        actor: 'sistema',
        type: 'GATEWAY_SECURITY_BLOCK',
        severity: 'warning',
        summary: `Rate limit acionado em ${request.method} ${pathname}`,
        details: { route: pathname, method: request.method, retryAfterSeconds: rl.retryAfterSeconds, correlationId },
      }).catch(() => {});
      return jsonError(
        429,
        'Muitas requisições em sequência. Aguarde alguns instantes e tente novamente.',
        corsHeaders,
        {
          code: 'RATE_LIMITED',
          correlationId,
          retryAfterSeconds: rl.retryAfterSeconds,
        }
      );
    }
  }

  // 8. Executa handler de domínio protegido contra vazamento de exceções
  try {
    const response = await next();
    const isAdminWrite =
      (policy.surface === 'admin' || policy.surface === 'superadmin') &&
      request.method !== 'GET' &&
      request.method !== 'HEAD' &&
      response.status < 400 &&
      pathname !== '/api/admin/presence' &&
      pathname !== '/api/control/system' &&
      pathname !== '/api/audit/event' &&
      !/^\/api\/(?:media\/(?:upload|delete)|content\/sync|auth\/(?:login|logout)|admin\/(?:refund|content-ops|customers|verbal-identity|prelaunch-feedback)|personalizados\/admin|appointments\/admin|finance\/admin)$/.test(pathname);
    if (isAdminWrite && authResult.actor) {
      const actorKind = authResult.actor.subject === 'phdev' ? 'phdev' : 'nua';
      void emitProtocolEvent(env, request, {
        protocol: actorKind === 'phdev' ? 'tobirama' : 'tobirama',
        category: 'publicacao',
        actor: actorKind,
        type: 'ADMIN_MUTATION',
        severity: 'info',
        summary: `${actorKind.toUpperCase()} executou ${request.method} ${pathname}`,
        details: { route: pathname, method: request.method, status: response.status, correlationId },
      }).catch(() => {});
    }
    return applySecurityHeaders(response, corsHeaders, url, correlationId);
  } catch (err) {
    return safeInternalError(`api:${pathname}`, err, corsHeaders);
  }
}
