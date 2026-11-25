/**
 * Guardião Central de Rate Limiting Atômico.
 *
 * Corrige NUA-AUD-007: usa a RPC atômica `increment_rate_limit_atomic` no Supabase
 * para evitar race conditions em rajadas simultâneas, com fallback transparente
 * para o adapter KV (testes unitários / transição pré-migration).
 */

import { getSupabaseClient } from '../_supabaseClient';
import { getNuaIdAdapter } from '../id/_nuaIdStore';
import { hashIpPseudonym } from './secrets';
import type { CentralEnv, RateLimitPolicy } from './types';

export interface AtomicRateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

interface LegacyBucket {
  timestamps: number[];
}

export async function consumeAtomicRateLimit(
  env: CentralEnv,
  bucketKey: string,
  maxRequests: number,
  windowSeconds: number
): Promise<AtomicRateLimitResult> {
  // Em testes unitários injetados, usa o store de teste diretamente
  if ((env as any)?.__NUA_ID_TEST_STORE__) {
    return consumeViaAdapterFallback(env, bucketKey, maxRequests, windowSeconds);
  }

  const sb = getSupabaseClient(env as any);
  if (sb) {
    try {
      const { data, error } = await sb.rpc('increment_rate_limit_atomic', {
        p_bucket_key: bucketKey,
        p_window_seconds: windowSeconds,
        p_max_requests: maxRequests,
      });

      if (!error && data && typeof data === 'object') {
        return {
          allowed: Boolean((data as any).allowed),
          remaining: Number((data as any).remaining ?? 0),
          retryAfterSeconds: Number((data as any).retry_after_seconds ?? 0),
        };
      }
    } catch {
      // Fallback controlado abaixo se a RPC ainda não tiver sido aplicada
    }
  }

  return consumeViaAdapterFallback(env, bucketKey, maxRequests, windowSeconds);
}

async function consumeViaAdapterFallback(
  env: CentralEnv,
  bucketKey: string,
  maxRequests: number,
  windowSeconds: number
): Promise<AtomicRateLimitResult> {
  const adapter = getNuaIdAdapter(env as any);
  if (!adapter) {
    return { allowed: true, remaining: maxRequests, retryAfterSeconds: 0 };
  }

  const nowMs = Date.now();
  const windowMs = windowSeconds * 1000;
  const storageKey = `nua_id:rl:${bucketKey}`;

  const bucket = (await adapter.kvGet<LegacyBucket>(storageKey)) || { timestamps: [] };
  const active = (bucket.timestamps || []).filter((ts) => nowMs - ts < windowMs);

  if (active.length >= maxRequests) {
    const oldest = active[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - nowMs) / 1000));
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  active.push(nowMs);
  await adapter.kvSet(storageKey, { timestamps: active, windowSeconds });
  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - active.length),
    retryAfterSeconds: 0,
  };
}

export async function checkRouteRateLimit(
  request: Request,
  env: CentralEnv,
  policy: RateLimitPolicy
): Promise<AtomicRateLimitResult> {
  const rawIp =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For') ||
    'unknown';
  const ipHash = await hashIpPseudonym(rawIp, env);
  const bucketKey = `${policy.bucket}:${ipHash}`;
  return consumeAtomicRateLimit(env, bucketKey, policy.maxRequests, policy.windowSeconds);
}
