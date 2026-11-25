/**
 * Resolução Fail-Closed de Segredos Criptográficos e Pseudonimização de IP.
 *
 * Em produção, nunca faz fallback para ADMIN_PASSWORD nem para strings hardcoded.
 */

import type { CentralEnv } from './types';

export function isProductionEnv(env: CentralEnv): boolean {
  const e = String(env?.ENVIRONMENT || '').trim().toLowerCase();
  if (e === 'development' || e === 'dev' || e === 'test') return false;
  if (e === 'production') return true;
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') return false;
  return true;
}

/**
 * Segredo dedicado para assinatura de tokens de sessão do painel administrativo.
 * Prioriza ADMIN_SESSION_SECRET -> ADMIN_API_SECRET (se distinto de ADMIN_PASSWORD).
 * Em produção, falha fechado (retorna null) se apenas ADMIN_PASSWORD existir.
 */
export function getAdminSessionSecret(env: CentralEnv): string | null {
  const dedicatedSession = String(env?.ADMIN_SESSION_SECRET || '').trim();
  if (dedicatedSession.length >= 24 && dedicatedSession !== env?.ADMIN_PASSWORD) {
    return dedicatedSession;
  }

  const dedicatedApi = String(env?.ADMIN_API_SECRET || '').trim();
  if (dedicatedApi.length >= 24 && dedicatedApi !== env?.ADMIN_PASSWORD) {
    return dedicatedApi;
  }

  // Fallback permitido apenas fora de produção (dev local / testes unitários)
  if (!isProductionEnv(env)) {
    return dedicatedSession || dedicatedApi || String(env?.ADMIN_PASSWORD || '').trim() || 'dev-local-admin-secret-only';
  }

  return null;
}

/**
 * Retorna ADMIN_API_SECRET somente se configurado com entropia mínima (>=24)
 * e estritamente diferente de ADMIN_PASSWORD.
 */
export function getDedicatedMasterSecret(env: CentralEnv): string | null {
  const apiSecret = String(env?.ADMIN_API_SECRET || '').trim();
  if (apiSecret.length >= 24 && apiSecret !== env?.ADMIN_PASSWORD) {
    return apiSecret;
  }
  return null;
}

/**
 * Segredo isolado do domínio NUA ID (nunca reutiliza ADMIN_API_SECRET em produção).
 */
export function getNuaIdSecret(env: CentralEnv): string | null {
  const nuaIdSecret = String(env?.NUA_ID_SECRET || '').trim();
  if (nuaIdSecret.length >= 16) {
    return nuaIdSecret;
  }
  if (!isProductionEnv(env)) {
    return nuaIdSecret || 'dev-local-nua-id-secret-only-24ch';
  }
  return null;
}

/**
 * Segredo dedicado para pseudonimização de endereços IP (HMAC-SHA256).
 */
export function getIpHashSecret(env: CentralEnv): string {
  const dedicated = String(env?.IP_HASH_SECRET || '').trim();
  if (dedicated.length >= 16) return dedicated;

  const nuaIdSecret = String(env?.NUA_ID_SECRET || '').trim();
  if (nuaIdSecret.length >= 24) return `ip-hash:${nuaIdSecret}`;

  const sessionSecret = getAdminSessionSecret(env);
  if (sessionSecret) return `ip-hash:${sessionSecret}`;

  if (!isProductionEnv(env)) {
    return 'dev-local-ip-hash-salt-nonprod';
  }
  // Em produção sem nenhum segredo, usa salt efêmero aleatório por isolate (nunca constante pública)
  const ephemeral = new Uint8Array(16);
  crypto.getRandomValues(ephemeral);
  return Array.from(ephemeral, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Pseudonimiza um IP usando HMAC-SHA256 truncado (16 bytes hex) — aderente à LGPD.
 */
export async function hashIpPseudonym(ip: string | null | undefined, env: CentralEnv): Promise<string> {
  const normalized = String(ip || '').split(',')[0].trim();
  if (!normalized) return 'unknown';

  const secret = getIpHashSecret(env);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(normalized));
  const bytes = new Uint8Array(sig).slice(0, 12);
  return 'iph_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
