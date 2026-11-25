/**
 * Rate Limiter Persistente e Atômico — Facade sobre `_central/rateLimitGuard.ts`.
 *
 * Mantém a assinatura pública `checkAndConsumeRateLimit` utilizada pelos endpoints,
 * executando incremento atômico via RPC SQL `increment_rate_limit_atomic` no Supabase
 * (com fallback KV em testes unitários).
 */

import { consumeAtomicRateLimit, type AtomicRateLimitResult } from '../_central/rateLimitGuard';
import type { NuaIdEnv } from './_nuaIdStore';

export type RateLimitResult = AtomicRateLimitResult;

export async function checkAndConsumeRateLimit(
  env: NuaIdEnv,
  bucketKey: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  return consumeAtomicRateLimit(env as any, bucketKey, maxRequests, windowSeconds);
}
