/**
 * Cloudflare Pages Function: /api/mail/accounts (GET)
 *
 * Lista as contas do módulo E-mails. NUNCA retorna credenciais, tokens,
 * senhas ou identificadores internos de caixa.
 * Nunca retorna segredos; produção exige sessão administrativa válida.
 */

import {
  MAIL_ACCOUNTS,
  isAccountReady,
  ok,
  rejectIfNotLocal,
  runMailHandler,
} from './_common.ts';

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestGet = async (context: PagesContext) => {
  const { request, env } = context;

  return runMailHandler(async () => {
    const notLocal = await rejectIfNotLocal(request, env);
    if (notLocal) return notLocal;

    return ok({
      accounts: MAIL_ACCOUNTS.map((account) => {
        const available = isAccountReady(env, account);
        return {
          id: account.id,
          label: account.label,
          address: account.address,
          provider: account.provider,
          available,
          reason: available
            ? undefined
            : account.pendingReason ||
              'Credencial desta caixa ausente no ambiente atual.',
        };
      }),
    });
  });
};
