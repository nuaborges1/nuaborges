/**
 * Cloudflare Pages Function: /api/mail/flags (POST)
 *
 * Marca mensagens como lidas/não lidas, respondidas ou favoritas.
 * Ação em lote (1–100 mensagens), alinhada ao endpoint de flags da Hostinger.
 */

import {
  ok,
  readFlagList,
  readFolder,
  readJsonBody,
  readUidList,
  rejectIfNotLocal,
  requireAccount,
  runMailHandler,
  MailError,
} from './_common.ts';
import { imapUpdateFlags } from './_imapTransport.ts';

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
    const addFlags = readFlagList(body.addFlags, 'addFlags');
    const removeFlags = readFlagList(body.removeFlags, 'removeFlags');

    if (!addFlags.length && !removeFlags.length) {
      throw new MailError(400, 'Nenhuma marcação informada.', 'VALIDATION');
    }

    const result = await imapUpdateFlags(env, folder, uids, addFlags, removeFlags, account.provider);

    return ok({ folder, result: result ?? null });
  });
};
