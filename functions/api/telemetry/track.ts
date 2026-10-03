/**
 * Cloudflare Pages Function: POST /api/telemetry/track
 *
 * Recebe pings de visualização de página da aplicação para contagem de acessos.
 */

import { recordPageview } from '../_telemetryHelper';

interface Env {
  BUCKET?: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      path?: string;
      title?: string;
    };

    const recorded = await recordPageview(env, request, body.path);

    return new Response(JSON.stringify({ success: true, accessId: recorded.id }), {
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
