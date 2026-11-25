/**
 * Helper to execute requests through the REAL Cloudflare Pages central gateway
 * (`functions/api/_central/index.ts`) and a target route handler.
 */

import { runCentralApiGateway } from '@/functions/api/_central';
import type { CentralEnv } from '@/functions/api/_central/types';

export async function invokeThroughGateway(params: {
  request: Request;
  env: CentralEnv & Record<string, any>;
  handler?: (ctx: { request: Request; env: any; data: Record<string, any> }) => Promise<Response>;
}): Promise<Response> {
  const data: Record<string, any> = {};
  const next = async () => {
    if (!params.handler) {
      return Response.json({ ok: true, passedGateway: true, actor: data.actor || null }, { status: 200 });
    }
    return params.handler({ request: params.request, env: params.env, data });
  };
  return runCentralApiGateway({
    request: params.request,
    env: params.env,
    data,
    next,
  });
}
