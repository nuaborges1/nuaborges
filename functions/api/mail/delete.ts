/**
 * Cloudflare Pages Function: /api/mail/delete (POST)
 *
 * Exclusão de mensagens (1–100 por vez):
 * - fora da lixeira: move para a lixeira (comportamento de webmail);
 * - dentro da lixeira (ou `permanent: true`): exclusão definitiva.
 */

import {
  ok,
  readFolder,
  readJsonBody,
  readUidList,
  rejectIfNotLocal,
  requireAccount,
  runMailHandler,
} from './_common.ts';
import { imapDeleteMessages } from './_imapTransport.ts';

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestPost = async (context: PagesContext) => {
  const { request, env } = context;

  return runMailHandler(async () => {
    const notLocal = await rejectIfNotLocal(request, env);
    if (notLocal) return notLocal;

    const body = await readJsonBody(request, 256 * 1024);
    const account = requireAccount(env, body.account);
    const folder = readFolder(body.folder);
    const uids = readUidList(body.uids);
    const permanent = body.permanent === true;

    const result: any = await imapDeleteMessages(env, folder, uids, permanent, account.provider);
    if (result?.movedToTrash) {
      return ok({ mode: 'trash', folder, targetFolder: result.targetFolder, result });
    }
    return ok({ mode: 'permanent', folder, result: result ?? null });
  });
};
