/**
 * Cloudflare Pages Functions Middleware: /api/*
 *
 * Orquestrador enxuto que delega 100% do controle central (políticas default-deny,
 * isolamento de host, CORS, CSRF estrito, kill-switches, rate limit atômico,
 * autenticação/RBAC, headers e tratamento seguro de erros) para a pasta modular
 * `functions/api/_central/`.
 */

import { runCentralApiGateway } from './_central';
import type { CentralEnv, PagesMiddlewareContext } from './_central/types';

export const onRequest = async (context: PagesMiddlewareContext<CentralEnv>) => {
  return runCentralApiGateway(context);
};
