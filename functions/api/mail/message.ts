/**
 * Cloudflare Pages Function: /api/mail/message (GET)
 *
 * Devolve uma mensagem: metadados + corpo em texto e HTML JÁ SANITIZADO.
 * Imagens remotas ficam bloqueadas por padrão (anti pixel de rastreamento);
 * `images=1` libera o carregamento mediante ação explícita do usuário.
 */

import {
  MailError,
  ok,
  readFolder,
  readUid,
  rejectIfNotLocal,
  requireAccount,
  runMailHandler,
} from './_common.ts';
import { sanitizeEmailHtml } from './_sanitize.ts';
import { imapGetMessage } from './_imapTransport.ts';

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
    const uid = readUid(url.searchParams.get('uid'));
    const allowImages = url.searchParams.get('images') === '1';

    const result = await imapGetMessage(env, folder, uid, account.provider);

    if (!result || !result.message) {
      throw new MailError(404, 'Mensagem não encontrada.', 'MESSAGE_NOT_FOUND');
    }

    return ok({
      message: result.message,
      html: sanitizeEmailHtml(result.html, { blockRemoteImages: !allowImages }),
      text: result.text,
      imagesAllowed: allowImages,
    });
  });
};
