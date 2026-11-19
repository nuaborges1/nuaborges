/**
 * Cloudflare Pages Function: /api/mail/messages (GET)
 *
 * Lista metadados das mensagens de uma pasta (paginação) e, quando o
 * parâmetro `q` está presente, pesquisa no provedor.
 * Nenhum corpo de mensagem é retornado aqui — apenas cabeçalhos e metadados.
 */

import {
  ok,
  readFolder,
  readPage,
  readPerPage,
  readString,
  rejectIfNotLocal,
  requireAccount,
  runMailHandler,
} from './_common.ts';
import { imapListMessages } from './_imapTransport.ts';

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
    const account = requireAccount(env, url.searchParams.get('account'));
    const folder = readFolder(url.searchParams.get('folder'));
    const page = readPage(url.searchParams.get('page'));
    const perPage = readPerPage(url.searchParams.get('perPage'));
    const query = (url.searchParams.get('q') || '').trim();
    const safeQuery = query ? readString(query, 'q', 256) : '';

    const result = await imapListMessages(env, folder, page, perPage, safeQuery, account.provider);

    return ok({
      account: account.id,
      folder,
      messages: result.data,
      pagination: result.pagination,
      query,
    });
  });
};
