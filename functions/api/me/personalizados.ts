/**
 * Cloudflare Pages Function: GET /api/me/personalizados
 *
 * Lista solicitações de Personalizados vinculadas ao cliente autenticado,
 * preservando rigorosamente os estados reais do módulo.
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

  const bundle = await loadCustomerBundle(context.env, auth.profile.id);
  return new Response(
    JSON.stringify({ success: true, personalizados: bundle.personalizados }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
      },
    }
  );
};
