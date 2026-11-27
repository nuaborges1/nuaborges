/**
 * Endpoint Exclusivo PHDEV: GET /api/control/activity
 *
 * Fornece feed amigável, sanitizado e classificado por protocolo (P01–P09 + HAGOROMO)
 * com filtros reais (protocolo, ator, categoria, severidade e busca) e contadores agregados.
 */

import { queryAuditFeed } from '../_central/auditLogger';
import { buildProtocolActivityFeed } from '../_central/protocolActivity';
import { safeInternalError } from '../_central/errorHandler';
import { hasAdminCapability } from '../_central/adminCapabilities';
import type { CentralActor, CentralEnv } from '../_central/types';

type PagesContext<T = CentralEnv> = {
  request: Request;
  env: T;
  data?: { actor?: CentralActor };
};

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

export const onRequestGet = async (context: PagesContext) => {
  const { request, env } = context;
  const actor = context.data?.actor;
  if (actor && !hasAdminCapability(actor, 'operations.control')) {
    return Response.json(
      { success: false, error: 'Acesso restrito ao operador PHDEV.' },
      { status: 403, headers: JSON_HEADERS },
    );
  }

  try {
    const url = new URL(request.url);
    const protocol = url.searchParams.get('protocol');
    const actorFilter = url.searchParams.get('actor');
    const category = url.searchParams.get('category');
    const severity = url.searchParams.get('severity');
    const q = url.searchParams.get('q');
    const limit = Number(url.searchParams.get('limit') || 120);

    const { events } = await queryAuditFeed(env, { limit: 250 });
    const feed = buildProtocolActivityFeed(events, {
      protocol,
      actor: actorFilter,
      category,
      severity,
      q,
      limit,
    });

    return new Response(
      JSON.stringify({
        success: true,
        generatedAt: new Date().toISOString(),
        ...feed,
      }),
      { status: 200, headers: JSON_HEADERS },
    );
  } catch (err) {
    return safeInternalError('control/activity:GET', err);
  }
};
