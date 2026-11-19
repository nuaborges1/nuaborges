/**
 * Rate Limiter Persistente — NUA ID
 *
 * Não depende apenas de memória do Worker/isolate: persiste janelas deslizantes
 * via adapter do NUA ID (Supabase KV ou store de teste).
 */

import { getNuaIdAdapter, NuaIdEnv } from './_nuaIdStore';

interface RateLimitBucket {
  timestamps: number[];
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export async function checkAndConsumeRateLimit(
  env: NuaIdEnv,
  bucketKey: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const adapter = getNuaIdAdapter(env);
  if (!adapter) {
    return { allowed: true, remaining: maxRequests, retryAfterSeconds: 0 };
  }

  const nowMs = Date.now();
  const windowMs = windowSeconds * 1000;
  const storageKey = `nua_id:rl:${bucketKey}`;

  const bucket = (await adapter.kvGet<RateLimitBucket>(storageKey)) || { timestamps: [] };
  const active = (bucket.timestamps || []).filter((ts) => nowMs - ts < windowMs);

  if (active.length >= maxRequests) {
    const oldest = active[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - nowMs) / 1000));
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  active.push(nowMs);
  await adapter.kvSet(storageKey, { timestamps: active });

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - active.length),
    retryAfterSeconds: 0,
  };
}
