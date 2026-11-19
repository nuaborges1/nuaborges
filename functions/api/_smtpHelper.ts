/**
 * SMTP Helper Universal — Cloudflare Pages Functions (Edge) & Node.js (Local)
 *
 * Envia e-mails diretamente via SMTP (Hostinger smtp.hostinger.com:465)
 * utilizando Cloudflare Sockets na borda e o módulo tls do Node.js localmente.
 */

import { connect } from 'cloudflare:sockets';
import tls from 'node:tls';

interface SmtpOptions {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  to: string;
  subject: string;
  html: string;
}

/**
 * Utilitário seguro para codificação UTF-8 Base64 (RFC 2047)
 * Funciona nativamente no Node.js e Cloudflare Workers (V8 Edge Runtime)
 */
function encodeUtf8Base64(str: string): string {
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

export async function sendSmtpEmail(env: any, options: SmtpOptions): Promise<boolean> {
  const host = env.SMTP_SERVER || env.SMTP_HOST || 'smtp.hostinger.com';
  const port = Number(env.SMTP_PORT || 465);
  const user = env.SMTP_USER || env.HOSTINGER_EMAIL_USER;
  const pass = env.SMTP_PASS || env.HOSTINGER_EMAIL_PASS;

  if (!user || !pass) {
    console.warn('[SMTP] ⚠️ Credenciais SMTP (SMTP_USER / SMTP_PASS) não configuradas no ambiente.');
    return false;
  }

  const { to, subject, html } = options;

  try {
    // Detecta se estamos rodando na Cloudflare (onde cloudflare:sockets connect está disponível)
    const isCloudflare = typeof connect === 'function';

    if (isCloudflare) {
      return await sendViaCloudflareSockets({ host, port, user, pass, to, subject, html });
    } else if (typeof tls !== 'undefined' && typeof tls.connect === 'function') {
      return await sendViaNodeTls({ host, port, user, pass, to, subject, html });
    } else {
      return await sendViaCloudflareSockets({ host, port, user, pass, to, subject, html });
    }
  } catch (err) {
    console.error('[SMTP Error]:', err);
    return false;
  }
}

async function sendViaNodeTls(opts: Required<Omit<SmtpOptions, 'host' | 'port'>> & { host: string; port: number }): Promise<boolean> {
  const { host, port, user, pass, to, subject, html } = opts;
  return new Promise((resolve) => {
    const socket = tls.connect({ host, port }, () => {
      let step = 0;
      const send = (cmd: string) => socket.write(cmd + '\r\n');

      socket.on('data', (data) => {
        const msg = data.toString();
        const code = msg.substring(0, 3);

        if (step === 0 && code === '220') {
          step = 1;
          send('EHLO nuaborges.com.br');
        } else if (step === 1 && (code === '250' || msg.includes('250 '))) {
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
          const mime = [
            `From: Nua Borges <${user}>`,
            `To: <${to}>`,
            `Subject: =?UTF-8?B?${encodeUtf8Base64(subject)}?=`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=utf-8',
            '',
            html,
            '.'
          ].join('\r\n');
          send(mime);
        } else if (step === 6 && code === '250') {
          step = 7;
          send('QUIT');
          socket.end();
          resolve(true);
        } else if (code.startsWith('4') || code.startsWith('5')) {
          console.error('[Node SMTP Error]:', msg.trim());
          socket.end();
          resolve(false);
        }
      });
    });

    socket.on('error', (err) => {
      console.error('[Node TLS Socket Error]:', err.message);
      resolve(false);
    });
  });
}

async function sendViaCloudflareSockets(opts: Required<Omit<SmtpOptions, 'host' | 'port'>> & { host: string; port: number }): Promise<boolean> {
  const { host, port, user, pass, to, subject, html } = opts;
  try {
    const socket = connect(`${host}:${port}`, { secureTransport: 'on' });
    const writer = socket.writable.getWriter();
    const reader = socket.readable.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let buffer = '';
    async function readSmtpResponse(): Promise<string> {
      let fullResponse = '';
      while (true) {
        const lineEnd = buffer.indexOf('\r\n');
        if (lineEnd !== -1) {
          const line = buffer.substring(0, lineEnd);
          buffer = buffer.substring(lineEnd + 2);
          fullResponse += line + '\r\n';
          // No protocolo SMTP, a última linha da resposta possui 3 dígitos numéricos seguidos de espaço ' '
          // Linhas intermediárias possuem hífen '-' (ex: 250-smtp.hostinger.com)
          if (line.length >= 4 && line[3] === ' ') {
            return fullResponse;
          }
          continue;
        }

        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
      }
      return fullResponse;
    }

    const sendCmd = async (cmd: string) => {
      await writer.write(encoder.encode(cmd + '\r\n'));
    };

    const greeting = await readSmtpResponse();
    if (!greeting.startsWith('220')) {
      console.error('[SMTP Cloudflare] Erro no Greeting:', greeting.trim());
      await socket.close().catch(() => {});
      return false;
    }

    await sendCmd('EHLO nuaborges.com.br');
    const ehloRes = await readSmtpResponse();
    if (!ehloRes.startsWith('250')) {
      console.error('[SMTP Cloudflare] Erro no EHLO:', ehloRes.trim());
      await socket.close().catch(() => {});
      return false;
    }

    const authString = encodeUtf8Base64(`\0${user}\0${pass}`);
    await sendCmd(`AUTH PLAIN ${authString}`);
    const authRes = await readSmtpResponse();
    if (!authRes.includes('235')) {
      console.error('[SMTP Cloudflare] Falha na autenticação SMTP:', authRes.trim());
      await socket.close().catch(() => {});
      return false;
    }

    await sendCmd(`MAIL FROM:<${user}>`);
    const mailRes = await readSmtpResponse();
    if (!mailRes.startsWith('250')) {
      console.error('[SMTP Cloudflare] Erro no MAIL FROM:', mailRes.trim());
      await socket.close().catch(() => {});
      return false;
    }

    await sendCmd(`RCPT TO:<${to}>`);
    const rcptRes = await readSmtpResponse();
    if (!rcptRes.startsWith('250')) {
      console.error('[SMTP Cloudflare] Erro no RCPT TO:', rcptRes.trim());
      await socket.close().catch(() => {});
      return false;
    }

    await sendCmd('DATA');
    const dataCmdRes = await readSmtpResponse();
    if (!dataCmdRes.startsWith('354')) {
      console.error('[SMTP Cloudflare] Erro no DATA command:', dataCmdRes.trim());
      await socket.close().catch(() => {});
      return false;
    }

    const mime = [
      `From: Nua Borges <${user}>`,
      `To: <${to}>`,
      `Subject: =?UTF-8?B?${encodeUtf8Base64(subject)}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      html,
      '.'
    ].join('\r\n');

    await sendCmd(mime);
    const dataRes = await readSmtpResponse();

    await sendCmd('QUIT').catch(() => {});
    await reader.cancel().catch(() => {});
    writer.releaseLock();
    await socket.close().catch(() => {});

    const success = dataRes.includes('250');
    if (!success) {
      console.error('[SMTP Cloudflare] Erro no aceite da mensagem:', dataRes.trim());
    }
    return success;
  } catch (err) {
    console.error('[Cloudflare Sockets SMTP Error]:', err);
    return false;
  }
}
