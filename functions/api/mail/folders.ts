/**
 * Cloudflare Pages Function: /api/mail/folders (GET)
 *
 * Lista as pastas reais da conta selecionada (contadores de mensagens e
 * não lidos vêm do provedor). Contas independentes: a conta é validada no
 * servidor e nenhuma credencial é aceita do cliente.
 */

import {
  ok,
  rejectIfNotLocal,
  requireAccount,
  runMailHandler,
} from './_common.ts';
import { imapListFolders } from './_imapTransport.ts';

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestGet = async (context: PagesContext) => {
  const { request, env } = context;

  return runMailHandler(async () => {
    const notLocal = await rejectIfNotLocal(request, env);
    if (notLocal) return notLocal;

    const url = new URL(request.url);
    const accountValue = url.searchParams.get('account') || url.searchParams.get('count');
    const account = requireAccount(env, accountValue);

    const folders = await imapListFolders(env, account.provider);

    return ok({
      account: account.id,
      folders: folders.data,
      pagination: folders.pagination,
    });
  });
};
