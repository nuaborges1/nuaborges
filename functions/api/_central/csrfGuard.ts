/**
 * Guardião CSRF Estrito — Pasta Central Controladora.
 *
 * Corrige NUA-AUD-010: além de bloquear Origin/Referer inválidos, rejeita mutações
 * autenticadas por cookie quando AMBOS Origin e Referer estiverem ausentes em produção.
 */

import { isOriginAllowed } from './hostGuard';
import type { CsrfMode } from './types';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export interface CsrfCheckResult {
  allowed: boolean;
  reason?: string;
}

export function validateCsrfRequest(params: {
  request: Request;
  csrfMode: CsrfMode;
  extraOrigins: string[];
  allowLocal: boolean;
  isProd: boolean;
  isMasterKeyAuth?: boolean;
}): CsrfCheckResult {
  const { request, csrfMode, extraOrigins, allowLocal, isProd, isMasterKeyAuth } = params;

  if (!MUTATION_METHODS.has(request.method.toUpperCase())) {
    return { allowed: true };
  }

  if (csrfMode === 'exempt_signed' || csrfMode === 'none') {
    return { allowed: true };
  }

  const origin = request.headers.get('Origin');
  const referer = request.headers.get('Referer');
  const secFetchSite = (request.headers.get('Sec-Fetch-Site') || '').trim().toLowerCase();

  if (origin) {
    if (!isOriginAllowed(origin, extraOrigins, allowLocal)) {
      return { allowed: false, reason: 'Origem de requisição não autorizada (CSRF Protection).' };
    }
    return { allowed: true };
  }

  if (referer) {
    try {
      const refUrl = new URL(referer);
      if (!isOriginAllowed(refUrl.origin, extraOrigins, allowLocal)) {
        return { allowed: false, reason: 'Referer de requisição não autorizado (CSRF Protection).' };
      }
      return { allowed: true };
    } catch {
      return { allowed: false, reason: 'Referer inválido.' };
    }
  }

  // Sem Origin e sem Referer:
  // Chamadas server-to-server com X-Master-Key (sem cookie de navegador) são permitidas.
  const hasCookie = Boolean(request.headers.get('Cookie'));
  if (isMasterKeyAuth && !hasCookie) {
    return { allowed: true };
  }

  // Se o navegador enviou Sec-Fetch-Site explicitamente cross-site, bloqueia sempre
  if (secFetchSite === 'cross-site') {
    return { allowed: false, reason: 'Requisição cross-site bloqueada (CSRF Protection).' };
  }

  // Em produção, mutação com cookie de sessão sem Origin e sem Referer é rejeitada
  if (isProd && hasCookie) {
    return {
      allowed: false,
      reason: 'Cabeçalho Origin ou Referer obrigatório para requisições autenticadas por cookie.',
    };
  }

  return { allowed: true };
}
