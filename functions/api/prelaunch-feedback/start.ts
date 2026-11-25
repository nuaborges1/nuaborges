/**
 * Cloudflare Pages Function: POST /api/prelaunch-feedback/start
 *
 * Marca um link `available` como `in_progress` ao iniciar o preenchimento.
 */

import { getSupabaseClient } from '../_supabaseClient';
import { checkAndConsumeRateLimit } from '../id/_rateLimiter';
import { getClientIp, sha256Hex } from '../id/_crypto';
import {
  findLinkByRawCode,
  getFeedbackSettings,
  isValidFeedbackCodeFormat,
  type PrelaunchFeedbackEnv,
} from './_store';

type PagesContext<T = PrelaunchFeedbackEnv> = {
  request: Request;
  env: T;
};

const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
};

export const onRequestPost = async (context: PagesContext) => {
  const { request, env } = context;

  try {
    const ipHash = await sha256Hex(getClientIp(request));
    const rl = await checkAndConsumeRateLimit(env, `prelaunch_start_ip:${ipHash}`, 40, 600);
    if (!rl.allowed) {
      return new Response(JSON.stringify({ ok: false, state: 'rate_limited' }), {
        status: 429,
        headers: HEADERS,
      });
    }

    const body = (await request.json().catch(() => ({}))) as { code?: string };
    const rawCode = String(body?.code || '').trim();
    if (!isValidFeedbackCodeFormat(rawCode)) {
      return new Response(JSON.stringify({ ok: false, state: 'invalid' }), {
        status: 404,
        headers: HEADERS,
      });
    }

    const [settings, { link }] = await Promise.all([
      getFeedbackSettings(env),
      findLinkByRawCode(env, rawCode),
    ]);

    if (!link) {
      return new Response(JSON.stringify({ ok: false, state: 'invalid' }), {
        status: 404,
        headers: HEADERS,
      });
    }
    if (link.status === 'completed') {
      return new Response(
        JSON.stringify({
          ok: false,
          state: 'completed',
          message: 'Essa avaliação já foi enviada. Muito obrigada por participar!',
        }),
        { status: 409, headers: HEADERS }
      );
    }
    if (link.status === 'revoked') {
      return new Response(JSON.stringify({ ok: false, state: 'revoked' }), {
        status: 403,
        headers: HEADERS,
      });
    }
    if (!settings.collectionActive) {
      return new Response(JSON.stringify({ ok: false, state: 'closed' }), {
        status: 403,
        headers: HEADERS,
      });
    }

    if (link.status === 'available') {
      const sb = getSupabaseClient(env);
      if (sb) {
        const nowIso = new Date().toISOString();
        await sb
          .from('prelaunch_feedback_links')
          .update({
            status: 'in_progress',
            started_at: nowIso,
            updated_at: nowIso,
          })
          .eq('id', link.id)
          .eq('status', 'available');
      }
    }

    return new Response(JSON.stringify({ ok: true, state: 'in_progress', linkId: link.id }), {
      status: 200,
      headers: HEADERS,
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, state: 'error' }), {
      status: 503,
      headers: HEADERS,
    });
  }
};
