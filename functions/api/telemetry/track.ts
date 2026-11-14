/**
 * Cloudflare Pages Function: POST /api/telemetry/track
 *
 * Recebe pings de visualização de página da aplicação para contagem de acessos.
 */

import { recordPageview } from '../_telemetryHelper';

interface Env {
  [key: string]: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

// Rate limiting map for telemetry (max 40 requests per minute per IP)
const trackRateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_TRACK_PER_MINUTE = 40;
const TRACK_WINDOW_MS = 60 * 1000;

function checkTrackRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = trackRateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    trackRateLimitMap.set(ip, { count: 1, resetTime: now + TRACK_WINDOW_MS });
    return true;
  }
  if (record.count >= MAX_TRACK_PER_MINUTE) {
    return false;
  }
  record.count += 1;
  return true;
}

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  const clientIp =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For') ||
    '127.0.0.1';

  if (!checkTrackRateLimit(clientIp)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '60',
      },
    });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      path?: string;
      title?: string;
    };

    const rawPath = typeof body.path === 'string' ? body.path.trim().substring(0, 120) : '/';
    const cleanPath = rawPath.replace(/[^\w\-\/\?\.#]/gi, '');

    const recorded = await recordPageview(env, request, cleanPath);

    return new Response(JSON.stringify({ success: true, accessId: recorded ? recorded.id : null }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[TelemetryTrack] Erro ao registrar acesso:', err);
    return new Response(
      JSON.stringify({ error: 'Falha ao registrar telemetria de acesso.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
