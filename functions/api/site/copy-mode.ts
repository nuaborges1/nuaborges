/**
 * Cloudflare Pages Function: GET /api/site/copy-mode
 *
 * Endpoint público e enxuto que retorna apenas o modo ativo da identidade verbal
 * (`original` | `nua_autoral_experimental`).
 *
 * - Zero exposição de dados administrativos, autores ou detalhes internos.
 * - `Cache-Control: no-store` para refletir alternâncias sem depender de limpeza de cache.
 * - Fallback seguro para `original` em caso de indisponibilidade do Supabase.
 */

import { readVerbalIdentityConfig } from '../_verbalIdentityStore';
import type { CentralEnv } from '../_central/types';

type PagesContext<T = CentralEnv> = {
  request: Request;
  env: T;
};

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

export async function onRequestGet(context: PagesContext) {
  const config = await readVerbalIdentityConfig(context.env as any, { bypassCache: true });

  return new Response(
    JSON.stringify({
      mode: config.mode,
      enabled: config.enabled,
      updatedAt: config.updatedAt,
    }),
    {
      status: 200,
      headers: RESPONSE_HEADERS,
    }
  );
}
