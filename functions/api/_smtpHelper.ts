/**
 * SMTP Helper Universal — Cloudflare Pages Functions (Edge) & Node.js (Local)
 *
 * Envia e-mails diretamente via SMTP TLS (ex.: Hostinger smtp.hostinger.com:465)
 * em conformidade estrita com RFC 5321 / RFC 5322:
 * - Quebras de linha estritas CRLF (\r\n)
 * - Cabeçalhos obrigatórios Date, Message-ID e MIME-Version
 * - Corpo multipart/alternative (text/plain + text/html) codificado em base64 (76 chars/linha),
 *   eliminando falhas de bare LF, limite de 998 octetos e dot-stuffing.
 */

import type tls from 'node:tls';

export interface SmtpOptions {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SmtpSendResult {
  ok: boolean;
  error?: string;
  messageId?: string;
}

const EMAIL_RE = /^[^\s@\r\n<>]+@[^\s@\r\n<>]+\.[^\s@\r\n<>]+$/;
const SMTP_TIMEOUT_MS = 15_000;

/**
 * Codificação UTF-8 para Base64 compatível com Node.js e Cloudflare Workers.
 */
export function encodeUtf8Base64(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf-8').toString('base64');
  }
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Quebra uma string Base64 em linhas de até 76 caracteres separadas por CRLF (RFC 2045).
 */
export function wrapBase64Lines(base64: string, lineLength = 76): string {
  const chunks: string[] = [];
  for (let i = 0; i < base64.length; i += lineLength) {
    chunks.push(base64.slice(i, i + lineLength));
  }
  return chunks.join('\r\n');
}

/**
 * Deriva versão texto plano legível a partir do HTML para multipart/alternative.
 */
export function htmlToPlainText(html: string): string {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h1|h2|h3|h4|li|tr)>/gi, '\n')
    .replace(/<a\b[^>]*\bhref=["'](https?:\/\/[^"'<>]+)["'][^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function sanitizeHeaderValue(value: string): string {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim();
}

function generateMessageId(domain = 'nuaborges.com.br'): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '')
      : `${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 12)}`;
  return `<${rand}.${Date.now()}@${domain}>`;
}

/**
 * Monta mensagem MIME completa conforme RFC 5321/5322 com CRLF estrito e corpo Base64.
 */
export function buildRfc5322MimeMessage(params: {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  messageId?: string;
  date?: Date;
}): { mime: string; messageId: string } {
  const cleanFrom = sanitizeHeaderValue(params.from);
  const cleanTo = sanitizeHeaderValue(params.to);
  const cleanSubject = sanitizeHeaderValue(params.subject);
  const cleanReplyTo = params.replyTo ? sanitizeHeaderValue(params.replyTo) : '';
  const messageId = params.messageId || generateMessageId();
  const dateHeader = (params.date || new Date()).toUTCString();
  const boundary = `----=_Part_Nua_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

  const plainText = (params.text || htmlToPlainText(params.html) || cleanSubject).replace(/\r?\n/g, '\r\n');
  const htmlBody = String(params.html || '').replace(/\r?\n/g, '\r\n');

  const plainB64 = wrapBase64Lines(encodeUtf8Base64(plainText));
  const htmlB64 = wrapBase64Lines(encodeUtf8Base64(htmlBody));

  const headers = [
    `From: NUA Borges <${cleanFrom}>`,
    `To: <${cleanTo}>`,
    ...(cleanReplyTo && EMAIL_RE.test(cleanReplyTo) ? [`Reply-To: <${cleanReplyTo}>`] : []),
    `Date: ${dateHeader}`,
    `Message-ID: ${messageId}`,
    `Subject: =?UTF-8?B?${encodeUtf8Base64(cleanSubject)}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];

  const mime = [
    ...headers,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    plainB64,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    htmlB64,
    '',
    `--${boundary}--`,
    '.',
  ].join('\r\n');

  return { mime, messageId };
}

function resolveSmtpConfig(env: any, options: SmtpOptions) {
  const host = String(options.host || env?.SMTP_SERVER || env?.SMTP_HOST || 'smtp.hostinger.com').trim();
  const port = Number(options.port || env?.SMTP_PORT || 465) || 465;
  const user = String(
    options.user ||
      env?.SMTP_USER ||
      env?.HOSTINGER_EMAIL_USER ||
      env?.HOSTINGER_MAIL_USER ||
      ''
  ).trim();
  const pass = String(
    options.pass ||
      env?.SMTP_PASS ||
      env?.HOSTINGER_EMAIL_PASS ||
      env?.HOSTINGER_EMAIL_PASSWORD ||
      env?.HOSTINGER_MAIL_PASS ||
      ''
  ).trim();
  return { host, port, user, pass };
}

/**
 * Identifica se a execução está ocorrendo no runtime Edge da Cloudflare (Workers/Pages Functions)
 * ou em ambiente Node.js puro (testes automatizados, scripts locais).
 */
export function isCloudflareRuntime(): boolean {
  if (typeof navigator !== 'undefined' && typeof navigator.userAgent === 'string') {
    if (navigator.userAgent.includes('Cloudflare')) return true;
  }
  if (typeof (globalThis as any).WebSocketPair !== 'undefined') return true;
  if (typeof (globalThis as any).caches?.default !== 'undefined') return true;
  return false;
}

export async function sendSmtpEmailDetailed(
  env: any,
  options: SmtpOptions
): Promise<SmtpSendResult> {
  const to = sanitizeHeaderValue(options.to);
  if (!EMAIL_RE.test(to)) {
    return { ok: false, error: `Destinatário de e-mail inválido: ${to || '(vazio)'}` };
  }

  // 1. Prioridade Edge / Cloudflare Pages:
  // Se HOSTINGER_MAIL_API_KEY estiver configurado e estivermos na Cloudflare,
  // utiliza a Hostinger Mail API (HTTPS REST nativo via fetch), imune a bloqueios de socket TCP.
  if (env?.HOSTINGER_MAIL_API_KEY && isCloudflareRuntime()) {
    try {
      const { sendEmail } = await import('./mail/_hostingerClient.ts');
      await sendEmail(env, {
        to: [to],
        displayName: 'NUA Borges',
        subject: options.subject,
        html: options.html,
        text: options.text || htmlToPlainText(options.html),
      });
      return { ok: true, messageId: generateMessageId() };
    } catch (apiErr: any) {
      console.warn('[SMTP Helper] Hostinger Mail API falhou, tentando fallback SMTP:', apiErr?.message);
    }
  }

  const { host, port, user, pass } = resolveSmtpConfig(env, options);

  if (!user || !pass) {
    // Se credenciais SMTP estiverem vazias mas houver chave da API, tenta a API
    if (env?.HOSTINGER_MAIL_API_KEY) {
      try {
        const { sendEmail } = await import('./mail/_hostingerClient.ts');
        await sendEmail(env, {
          to: [to],
          subject: options.subject,
          html: options.html,
          text: options.text || htmlToPlainText(options.html),
        });
        return { ok: true, messageId: generateMessageId() };
      } catch (apiErr: any) {
        return { ok: false, error: `Hostinger Mail API: ${apiErr?.message}` };
      }
    }
    const msg = 'Credenciais SMTP (SMTP_USER / SMTP_PASS) não configuradas no ambiente.';
    console.warn(`[SMTP] ${msg}`);
    return { ok: false, error: msg };
  }

  const { mime, messageId } = buildRfc5322MimeMessage({
    from: user,
    to,
    replyTo: options.replyTo,
    subject: options.subject,
    html: options.html,
    text: options.text || htmlToPlainText(options.html),
  });

  const opts: InternalTransportOpts = { host, port, user, pass, to, mime, messageId };

  try {
    if (isCloudflareRuntime()) {
      return await sendViaCloudflareSockets(opts);
    }
    return await sendViaNodeTls(opts);
  } catch (err: any) {
    // Se a conexão de socket falhar e HOSTINGER_MAIL_API_KEY estiver presente, resgata via Mail API
    if (env?.HOSTINGER_MAIL_API_KEY) {
      try {
        const { sendEmail } = await import('./mail/_hostingerClient.ts');
        await sendEmail(env, {
          to: [to],
          subject: options.subject,
          html: options.html,
          text: options.text || htmlToPlainText(options.html),
        });
        return { ok: true, messageId: generateMessageId() };
      } catch (rescueErr: any) {
        console.error('[SMTP Rescue] Fallback Hostinger Mail API também falhou:', rescueErr?.message);
      }
    }
    const msg = err?.message || 'Erro inesperado no transporte SMTP.';
    console.error('[SMTP Error]:', msg);
    return { ok: false, error: msg };
  }
}

export async function sendSmtpEmail(env: any, options: SmtpOptions): Promise<boolean> {
  const res = await sendSmtpEmailDetailed(env, options);
  return res.ok;
}

interface InternalTransportOpts {
  host: string;
  port: number;
  user: string;
  pass: string;
  to: string;
  mime: string;
  messageId: string;
}

async function sendViaNodeTls(opts: InternalTransportOpts): Promise<SmtpSendResult> {
  const { host, port, user, pass, to, mime, messageId } = opts;
  const tls = await import('node:tls');

  return new Promise((resolve) => {
    let settled = false;
    const finish = (res: SmtpSendResult, socket?: tls.TLSSocket) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket?.end();
        socket?.destroy();
      } catch {}
      resolve(res);
    };

    const socket = tls.connect({ host, port, servername: host });
    const timer = setTimeout(() => {
      finish({ ok: false, error: `Timeout SMTP (${SMTP_TIMEOUT_MS}ms) ao conectar em ${host}:${port}.` }, socket);
    }, SMTP_TIMEOUT_MS);

    let step = 0;
    let buffer = '';
    let currentReplyLines: string[] = [];

    const send = (cmd: string) => {
      socket.write(`${cmd}\r\n`);
    };

    const handleReply = (fullReply: string, code: string) => {
      if (code.startsWith('4') || code.startsWith('5')) {
        console.error('[Node SMTP Error]:', fullReply.trim());
        finish({ ok: false, error: `SMTP ${code}: ${fullReply.trim().slice(0, 220)}` }, socket);
        return;
      }

      if (step === 0 && code === '220') {
        step = 1;
        send('EHLO nuaborges.com.br');
      } else if (step === 1 && code === '250') {
        step = 2;
        const authString = encodeUtf8Base64(`\0${user}\0${pass}`);
        send(`AUTH PLAIN ${authString}`);
      } else if (step === 2 && code === '235') {
        step = 3;
        send(`MAIL FROM:<${user}>`);
      } else if (step === 3 && code === '250') {
        step = 4;
        send(`RCPT TO:<${to}>`);
      } else if (step === 4 && code === '250') {
        step = 5;
        send('DATA');
      } else if (step === 5 && code === '354') {
        step = 6;
        send(mime);
      } else if (step === 6 && code === '250') {
        step = 7;
        send('QUIT');
        finish({ ok: true, messageId }, socket);
      }
    };

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf-8');
      while (true) {
        const nlIdx = buffer.indexOf('\n');
        if (nlIdx === -1) break;
        const rawLine = buffer.slice(0, nlIdx).replace(/\r$/, '');
        buffer = buffer.slice(nlIdx + 1);
        if (!rawLine) continue;
        currentReplyLines.push(rawLine);
        // Só conclui a resposta SMTP quando encontra 3 dígitos + espaço (ignora linhas 250- intermediárias)
        if (/^\d{3} /.test(rawLine)) {
          const code = rawLine.slice(0, 3);
          const full = currentReplyLines.join('\r\n');
          currentReplyLines = [];
          handleReply(full, code);
          if (settled) return;
        }
      }
    });

    socket.on('error', (err) => {
      console.error('[Node TLS Socket Error]:', err.message);
      finish({ ok: false, error: `Erro TLS SMTP: ${err.message}` }, socket);
    });

    socket.on('close', () => {
      if (!settled) {
        finish({ ok: false, error: 'Conexão SMTP encerrada inesperadamente pelo servidor.' }, socket);
      }
    });
  });
}

async function sendViaCloudflareSockets(opts: InternalTransportOpts): Promise<SmtpSendResult> {
  const { host, port, user, pass, to, mime, messageId } = opts;
  let socket: {
    readable: ReadableStream<Uint8Array>;
    writable: WritableStream<Uint8Array>;
    close: () => Promise<void>;
    opened?: Promise<any>;
  } | null = null;
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;

  const cleanup = async () => {
    try {
      await reader?.cancel();
    } catch {}
    try {
      reader?.releaseLock();
    } catch {}
    try {
      writer?.releaseLock();
    } catch {}
    try {
      await socket?.close();
    } catch {}
  };

  try {
    const { connect } = await import('cloudflare:sockets');
    socket = connect({ hostname: host, port: Number(port) }, { secureTransport: 'on' });
    if (socket?.opened) {
      await socket.opened;
    }
    writer = socket.writable.getWriter();
    reader = socket.readable.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let buffer = '';
    async function readSmtpResponse(): Promise<{ code: string; raw: string }> {
      let fullResponse = '';
      let lastCode = '';
      const deadline = Date.now() + SMTP_TIMEOUT_MS;

      while (true) {
        const nlIdx = buffer.indexOf('\n');
        if (nlIdx !== -1) {
          const line = buffer.slice(0, nlIdx).replace(/\r$/, '');
          buffer = buffer.slice(nlIdx + 1);
          fullResponse += line + '\r\n';
          if (/^\d{3} /.test(line)) {
            lastCode = line.slice(0, 3);
            return { code: lastCode, raw: fullResponse };
          }
          continue;
        }

        const remaining = deadline - Date.now();
        if (remaining <= 0) {
          throw new Error(`Timeout aguardando resposta SMTP de ${host}:${port}.`);
        }

        let timer: any = null;
        const readResult = await Promise.race([
          reader!.read(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error(`Timeout na leitura SMTP (${SMTP_TIMEOUT_MS}ms).`)), remaining);
          }),
        ]).finally(() => {
          if (timer) clearTimeout(timer);
        });

        if (readResult.done) break;
        buffer += decoder.decode(readResult.value, { stream: true });
      }
      return { code: lastCode || fullResponse.slice(0, 3), raw: fullResponse };
    }

    const sendCmd = async (cmd: string) => {
      await writer!.write(encoder.encode(`${cmd}\r\n`));
    };

    const greeting = await readSmtpResponse();
    if (greeting.code !== '220') {
      const err = `Erro no Greeting SMTP (${greeting.code || 'sem código'}): ${greeting.raw.trim()}`;
      console.error('[SMTP Cloudflare]', err);
      await cleanup();
      return { ok: false, error: err };
    }

    await sendCmd('EHLO nuaborges.com.br');
    const ehloRes = await readSmtpResponse();
    if (ehloRes.code !== '250') {
      const err = `Erro no EHLO SMTP (${ehloRes.code}): ${ehloRes.raw.trim()}`;
      console.error('[SMTP Cloudflare]', err);
      await cleanup();
      return { ok: false, error: err };
    }

    const authString = encodeUtf8Base64(`\0${user}\0${pass}`);
    await sendCmd(`AUTH PLAIN ${authString}`);
    const authRes = await readSmtpResponse();
    if (authRes.code !== '235') {
      const err = `Falha na autenticação SMTP (${authRes.code}): ${authRes.raw.trim()}`;
      console.error('[SMTP Cloudflare]', err);
      await cleanup();
      return { ok: false, error: err };
    }

    await sendCmd(`MAIL FROM:<${user}>`);
    const mailRes = await readSmtpResponse();
    if (mailRes.code !== '250') {
      const err = `Erro no MAIL FROM (${mailRes.code}): ${mailRes.raw.trim()}`;
      console.error('[SMTP Cloudflare]', err);
      await cleanup();
      return { ok: false, error: err };
    }

    await sendCmd(`RCPT TO:<${to}>`);
    const rcptRes = await readSmtpResponse();
    if (rcptRes.code !== '250' && rcptRes.code !== '251') {
      const err = `Erro no RCPT TO (${rcptRes.code}): ${rcptRes.raw.trim()}`;
      console.error('[SMTP Cloudflare]', err);
      await cleanup();
      return { ok: false, error: err };
    }

    await sendCmd('DATA');
    const dataCmdRes = await readSmtpResponse();
    if (dataCmdRes.code !== '354') {
      const err = `Erro no comando DATA (${dataCmdRes.code}): ${dataCmdRes.raw.trim()}`;
      console.error('[SMTP Cloudflare]', err);
      await cleanup();
      return { ok: false, error: err };
    }

    await sendCmd(mime);
    const dataRes = await readSmtpResponse();

    await sendCmd('QUIT').catch(() => {});
    await cleanup();

    if (dataRes.code !== '250') {
      const err = `Servidor SMTP recusou a mensagem (${dataRes.code}): ${dataRes.raw.trim()}`;
      console.error('[SMTP Cloudflare]', err);
      return { ok: false, error: err };
    }

    return { ok: true, messageId };
  } catch (err: any) {
    const msg = err?.message || 'Erro no socket SMTP Cloudflare.';
    console.error('[Cloudflare Sockets SMTP Error]:', msg);
    await cleanup();
    return { ok: false, error: msg };
  }
}
