/**
 * Cloudflare Pages Function: POST /api/cron/hygiene
 *
 * Rotina diária de higiene de registros efêmeros comprovadamente expirados
 * (OTPs, sessões expiradas e buckets de rate limit).
 *
 * Acionada pelo Worker existente `workers/reminders-cron` (opt-in via `ENABLE_DAILY_HYGIENE=true`),
 * com autenticação via `CRON_SECRET`, lock anti-concorrência e throttle diário de 24h.
 */

import { timingSafeEqual } from '../id/_crypto';
import { getNuaIdAdapter, NuaIdEnv, recordCustomerAuditEvent } from '../id/_nuaIdStore';
import { runEphemeralHygiene } from './_hygiene';

interface HygieneCronEnv extends NuaIdEnv {
  CRON_SECRET?: string;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

const LOCK_KEY = 'nua_id:hygiene_lock';
const LAST_RUN_KEY = 'nua_id:hygiene_daily_last_run';
const LOCK_TTL_MS = 90_000;
const DAILY_INTERVAL_MS = 23 * 60 * 60 * 1000 + 50 * 60 * 1000; // 23h50min

async function acquireLock(
  adapter: ReturnType<typeof getNuaIdAdapter>,
  ownerId: string,
  nowMs: number
): Promise<boolean> {
  if (!adapter) return true;
  const payload = { owner: ownerId, until: nowMs + LOCK_TTL_MS };
  if (adapter.kvCreate) {
    const created = await adapter.kvCreate(LOCK_KEY, payload).catch(() => false);
    if (created) return true;
  }
  const existing = await adapter.kvGet<{ owner?: string; until?: number }>(LOCK_KEY, true).catch(() => null);
  if (existing && typeof existing.until === 'number' && existing.until > nowMs) {
    return false;
  }
  const saved = await adapter.kvSet(LOCK_KEY, payload).catch(() => false);
  if (!saved) return false;
  const confirmed = await adapter.kvGet<{ owner?: string }>(LOCK_KEY, true).catch(() => null);
  return confirmed?.owner === ownerId;
}

export const onRequestPost = async (context: PagesContext<HygieneCronEnv>) => {
  const { request, env } = context;

  const configuredSecret = String(env.CRON_SECRET || '').trim();
  if (!configuredSecret) {
    return new Response(
      JSON.stringify({ success: false, error: 'CRON_SECRET não configurado no servidor.' }),
      { status: 503, headers: JSON_HEADERS }
    );
  }

  const explicitHeader = (request.headers.get('x-cron-secret') || '').trim();
  const authHeader = request.headers.get('Authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const token = explicitHeader || bearerToken;
  if (!token || !timingSafeEqual(token, configuredSecret)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Não autorizado.' }),
      { status: 401, headers: JSON_HEADERS }
    );
  }

  const adapter = getNuaIdAdapter(env);
  const nowMs = Date.now();
  const lockOwner = crypto.randomUUID();
  const lockAcquired = await acquireLock(adapter, lockOwner, nowMs);
  if (!lockAcquired) {
    return new Response(
      JSON.stringify({ success: true, skipped: true, reason: 'already_running' }),
      { status: 200, headers: JSON_HEADERS }
    );
  }

  try {
    if (adapter) {
      const lastRun = await adapter.kvGet<{ atMs?: number }>(LAST_RUN_KEY, true).catch(() => null);
      if (lastRun && typeof lastRun.atMs === 'number' && nowMs - lastRun.atMs < DAILY_INTERVAL_MS) {
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: 'daily_interval_not_elapsed' }),
          { status: 200, headers: JSON_HEADERS }
        );
      }
    }

    const summary = await runEphemeralHygiene(env, nowMs);

    if (adapter && summary.errors === 0) {
      await adapter.kvSet(LAST_RUN_KEY, { atMs: nowMs, atIso: new Date(nowMs).toISOString() }).catch(() => {});
    }

    await recordCustomerAuditEvent(env, {
      profileId: null,
      action: 'ephemeral_hygiene_run',
      details: summary,
    });

    return new Response(JSON.stringify({ success: true, summary }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (err: any) {
    const safeMsg = String(err?.message || 'unexpected_error').slice(0, 140);
    console.error(`[CronHygiene] Erro inesperado: ${safeMsg}`);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro na execução da rotina de higiene.' }),
      { status: 500, headers: JSON_HEADERS }
    );
  } finally {
    if (adapter) {
      const current = await adapter.kvGet<{ owner?: string }>(LOCK_KEY, true).catch(() => null);
      if (!current || current.owner === lockOwner) {
        await adapter.kvDelete(LOCK_KEY).catch(() => {});
      }
    }
  }
};

export const onRequestGet = async () =>
  new Response(JSON.stringify({ success: false, error: 'Use POST.' }), {
    status: 405,
    headers: JSON_HEADERS,
  });
