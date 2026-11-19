/**
 * Cloudflare Pages Function: /api/mail/move (POST)
 *
 * Move mensagens entre pastas (inclusive arquivar). Ação em lote (1–100).
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
import { imapMoveMessages } from './_imapTransport.ts';

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
    const targetFolder = readFolder(body.targetFolder);

    const result = await imapMoveMessages(env, folder, uids, targetFolder, account.provider);

    return ok({ folder, targetFolder, result: result ?? null });
  });
};
