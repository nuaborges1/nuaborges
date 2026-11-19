/**
 * Cloudflare Pages Function: /api/mail/send (POST)
 *
 * Envio de mensagens: novo, responder, responder a todos e encaminhar.
 * O endereço remetente é definido EXCLUSIVAMENTE pela conta registrada no
 * servidor — o cliente nunca escolhe credencial nem identidade de envio.
 *
 * A conta profissional usa o endpoint /send da Hostinger Mail API (que cuida
 * de In-Reply-To/References e salva a cópia em Enviados).
 */

import {
  MailError,
  ok,
  readFolder,
  readJsonBody,
  readOptionalString,
  readRecipients,
  readUid,
  rejectIfNotLocal,
  requireAccount,
  runMailHandler,
} from './_common.ts';
import { imapGetMessage, smtpSendEmail } from './_imapTransport.ts';

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/;
const MAX_ATTACHMENTS = 10;
const MAX_ATTACHMENT_CHARS = 7 * 1024 * 1024; // ~5 MB por arquivo em base64
const MAX_TOTAL_CHARS = 10 * 1024 * 1024;

interface IncomingAttachment {
  filename: string;
  content: string;
  contentType: string;
  cid?: string;
}

function readAttachments(value: unknown): IncomingAttachment[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new MailError(400, 'Anexos inválidos.', 'VALIDATION');
  }
  if (value.length > MAX_ATTACHMENTS) {
    throw new MailError(400, 'Quantidade de anexos acima do permitido.', 'VALIDATION');
  }

  let total = 0;
  return value.map((item: any) => {
    if (!item || typeof item !== 'object') {
      throw new MailError(400, 'Anexo inválido.', 'VALIDATION');
    }
    const filename = readOptionalString(item.filename, 'anexo.filename', 180) || 'anexo';
    const contentType = readOptionalString(item.contentType, 'anexo.contentType', 120);
    const content = typeof item.content === 'string' ? item.content.replace(/\s+/g, '') : '';

    if (!content || content.length > MAX_ATTACHMENT_CHARS || !BASE64_RE.test(content)) {
      throw new MailError(400, 'Anexo inválido ou acima do tamanho permitido.', 'VALIDATION');
    }
    if (!/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(contentType)) {
      throw new MailError(400, 'Tipo de anexo não permitido.', 'VALIDATION');
    }
    total += content.length;
    if (total > MAX_TOTAL_CHARS) {
      throw new MailError(413, 'Tamanho total de anexos acima do permitido.', 'PAYLOAD_TOO_LARGE');
    }

    const attachment: IncomingAttachment = { filename, content, contentType };
    const cid = readOptionalString(item.cid, 'anexo.cid', 200);
    if (cid) attachment.cid = cid;
    return attachment;
  });
}

export const onRequestPost = async (context: PagesContext) => {
  const { request, env } = context;

  return runMailHandler(async () => {
    const notLocal = await rejectIfNotLocal(request, env);
    if (notLocal) return notLocal;

    const body = await readJsonBody(request);
    const account = requireAccount(env, body.account);

    const mode = ['new', 'reply', 'replyAll', 'forward'].includes(String(body.mode))
      ? String(body.mode)
      : 'new';

    const ownAddress = account.address.toLowerCase();
    const stripOwn = (list: string[]) => list.filter((email) => email.toLowerCase() !== ownAddress);

    let to = readRecipients(body.to, 'to');
    let cc = readRecipients(body.cc, 'cc');
    const bcc = readRecipients(body.bcc, 'bcc');

    if (mode === 'reply' || mode === 'replyAll') {
      // Nunca responder para a própria caixa.
      to = stripOwn(to);
      cc = stripOwn(cc);
    }

    if (!to.length && !cc.length && !bcc.length) {
      throw new MailError(400, 'Informe ao menos um destinatário.', 'VALIDATION');
    }

    const subject = readOptionalString(body.subject, 'subject', 900);
    const text = readOptionalString(body.text, 'text', 200000);
    const html = readOptionalString(body.html, 'html', 400000);

    if (!text && !html) {
      throw new MailError(400, 'Escreva o conteúdo da mensagem.', 'VALIDATION');
    }

    const attachments = readAttachments(body.attachments);

    const payload: Record<string, any> = { to, subject, text, html };
    if (cc.length) payload.cc = cc;
    if (bcc.length) payload.bcc = bcc;
    if (attachments.length) payload.attachments = attachments;

    const refFolder = body.refFolder !== undefined && body.refFolder !== null && body.refFolder !== ''
      ? readFolder(body.refFolder)
      : undefined;
    if (body.inReplyToUid !== undefined && body.inReplyToUid !== null && body.inReplyToUid !== '') {
      if (!refFolder) throw new MailError(400, 'Pasta da mensagem original ausente.', 'VALIDATION');
      const original = await imapGetMessage(env, refFolder, readUid(body.inReplyToUid), account.provider);
      payload.inReplyToMessageId = original?.message?.messageId || '';
      payload.references = original?.message?.messageId || '';
    }

    await smtpSendEmail(env, payload, account.provider);

    return ok({ account: account.id, mode });
  });
};
