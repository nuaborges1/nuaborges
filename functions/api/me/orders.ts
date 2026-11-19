/**
 * Cloudflare Pages Function: GET /api/me/orders
 *
 * Histórico unificado e paginado dos três serviços (Packs, Chamadas VIP, Personalizados),
 * separando claramente situação financeira de situação operacional.
 */

import { requireCustomer } from '../id/_customerGuard';
import { NuaIdEnv } from '../id/_nuaIdStore';
import { loadCustomerBundle } from './_customerData';

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestGet = async (context: PagesContext<NuaIdEnv>) => {
  const auth = await requireCustomer(context.request, context.env);
  if (!auth.ok) return auth.response;

  const url = new URL(context.request.url);
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(
    50,
    Math.max(5, Number.parseInt(url.searchParams.get('pageSize') || '10', 10) || 10)
  );
  const typeFilter = (url.searchParams.get('type') || 'all').toLowerCase();

  const bundle = await loadCustomerBundle(context.env, auth.profile.id);
  const filtered =
    typeFilter === 'all'
      ? bundle.orders
      : bundle.orders.filter((o) => o.kind === typeFilter);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return new Response(
    JSON.stringify({
      success: true,
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
      },
    }
  );
};
