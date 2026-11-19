/**
 * Cloudflare Pages Function: GET /api/me/library
 *
 * Lista conteúdos adquiridos e seus estados reais (active, expired, revoked).
 * Nunca expõe tokens manuais de compra ao cliente.
 */

import { requireCustomer } from '../id/_customerGuard';
import { NuaIdEnv } from '../id/_nuaIdStore';
import { loadCustomerLibrary } from './_customerData';

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestGet = async (context: PagesContext<NuaIdEnv>) => {
  const auth = await requireCustomer(context.request, context.env);
  if (!auth.ok) return auth.response;

  const items = await loadCustomerLibrary(context.env, auth.profile.id);
  return new Response(
    JSON.stringify({ success: true, items }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
      },
    }
  );
};
