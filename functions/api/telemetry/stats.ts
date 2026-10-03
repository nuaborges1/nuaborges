/**
 * Cloudflare Pages Function: /api/telemetry/stats
 *
 * GET: Retorna as estatísticas consolidadas de acessos para o Master Admin.
 * POST / DELETE: Permite zerar métricas de telemetria de testes.
 */

import { getTelemetryStats, resetTelemetryStats } from '../_telemetryHelper';

interface Env {
  BUCKET?: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestGet = async (context: PagesContext<Env>) => {
  const { env } = context;

  try {
    const stats = await getTelemetryStats(env);

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[TelemetryStats] Erro ao buscar métricas:', err);
    return new Response(
      JSON.stringify({ error: 'Falha ao buscar estatísticas de acesso.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;
  const url = new URL(request.url);

  if (url.searchParams.get('action') === 'reset') {
    try {
      const stats = await resetTelemetryStats(env);
      return new Response(JSON.stringify({ success: true, stats }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Falha ao resetar métricas' }), { status: 500 });
    }
  }

  return onRequestGet(context);
};

export const onRequestDelete = async (context: PagesContext<Env>) => {
  const { env } = context;
  try {
    const stats = await resetTelemetryStats(env);
    return new Response(JSON.stringify({ success: true, stats }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Falha ao resetar métricas' }), { status: 500 });
  }
};
