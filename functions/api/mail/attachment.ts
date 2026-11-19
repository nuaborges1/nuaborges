/**
 * Cloudflare Pages Function: /api/mail/attachment (GET)
 *
 * Download autenticado de anexo: o backend busca no provedor e transmite os
 * bytes diretamente. Nenhum arquivo é publicado em URL acessível sem sessão.
 */

import { MailError, readFolder, readUid, rejectIfNotLocal, requireAccount, runMailHandler } from './_common.ts';
import { imapDownloadAttachment } from './_imapTransport.ts';

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

const SAFE_CONTENT_TYPE = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i;

/** Remove separadores de caminho, aspas e caracteres de controle do nome. */
function safeFilename(raw: unknown): string {
  let name = typeof raw === 'string' ? raw : '';
  name = name.replace(/[\u0000-\u001F\u007F]/g, '');
  name = name.replace(/[\\/]+/g, '_').replace(/["']/g, '');
  name = name.split(/[\\/]/).pop() || '';
  name = name.trim().slice(0, 180);
  return name || 'anexo';
}

export const onRequestGet = async (context: PagesContext) => {
  const { request, env } = context;

  return runMailHandler(async () => {
    const notLocal = await rejectIfNotLocal(request, env);
    if (notLocal) return notLocal;

    const url = new URL(request.url);
    const account = requireAccount(env, url.searchParams.get('account'));
    const folder = readFolder(url.searchParams.get('folder'));
    const uid = readUid(url.searchParams.get('uid'));
    const attachmentId = url.searchParams.get('id');
    if (!attachmentId || attachmentId.length > 300) {
      throw new MailError(400, 'Identificador de anexo inválido.', 'VALIDATION');
    }

    const filename = safeFilename(url.searchParams.get('name'));
    const download = await imapDownloadAttachment(env, folder, uid, attachmentId, account.provider);

    let contentType = (download.contentType || '').split(';')[0].trim();
    if (!SAFE_CONTENT_TYPE.test(contentType)) contentType = 'application/octet-stream';
    // Nunca renderizar HTML/SVG recebidos como documento.
    if (contentType === 'text/html' || contentType === 'image/svg+xml') {
      contentType = 'application/octet-stream';
    }

    const asciiName = filename.replace(/[^\x20-\x7E]/g, '_');
    const encodedName = encodeURIComponent(filename);

    return new Response(download.bytes, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition':
          `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    });
  });
};
