/**
 * Cloudflare Pages Function: GET /api/audit/feed
 *
 * Endpoint do feed de monitoramento em tempo real para o Painel Admin Geral.
 * Retorna o histórico de uploads, edições, logins e armadilhas de bots.
 */

import { getAuditFeed } from '../_auditHelper';
import { registerAdminIp } from '../_telemetryHelper';

interface Env {
  BUCKET?: any;
  ADMIN_PASSWORD?: string;
  ADMIN_API_SECRET?: string;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestGet = async (context: PagesContext<Env>) => {
  const { request, env } = context;
  const url = new URL(request.url);

  const clientIp =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For') ||
    '';
  if (clientIp) {
    registerAdminIp(clientIp);
  }

  const limitParam = url.searchParams.get('limit');
  const typeParam = url.searchParams.get('type') || undefined;
  const limit = limitParam ? parseInt(limitParam, 10) : 200;

  try {
    const feed = await getAuditFeed(env, { limit, type: typeParam });

    return new Response(JSON.stringify(feed), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[AuditFeed] Erro ao buscar feed:', err);
    return new Response(
      JSON.stringify({ error: 'Falha ao recuperar registros de monitoramento.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
