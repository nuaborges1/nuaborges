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
import { getKillSwitchFlags } from './killSwitch';
import { validateCsrfRequest } from './csrfGuard';
import { checkRouteRateLimit } from './rateLimitGuard';
import { createCorrelationId, jsonError, safeInternalError } from './errorHandler';
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
  });

  if (!authResult.ok) {
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
    csrfMode: policy.csrf,
    extraOrigins,
    allowLocal: allowLocalOrigins,
    isProd,
    isMasterKeyAuth: authResult.actor?.authMethod === 'master_key',
  });
  if (!csrf.allowed) {
    return jsonError(403, csrf.reason || 'Requisição bloqueada (CSRF Protection).', corsHeaders, {
      code: 'CSRF_BLOCKED',
      correlationId,
    });
  }

  // 7. Rate Limiting Atômico (quando definido na política da rota)
  if (policy.rateLimit) {
    const rl = await checkRouteRateLimit(request, env, policy.rateLimit);
    if (!rl.allowed) {
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
    return applySecurityHeaders(response, corsHeaders, url, correlationId);
  } catch (err) {
    return safeInternalError(`api:${pathname}`, err, corsHeaders);
  }
}
