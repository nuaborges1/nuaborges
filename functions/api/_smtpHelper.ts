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

export async function sendSmtpEmail(env: any, options: SmtpOptions): Promise<boolean> {
  const host = env.SMTP_SERVER || env.SMTP_HOST || 'smtp.hostinger.com';
  const port = Number(env.SMTP_PORT || 465);
  const user = env.SMTP_USER || env.HOSTINGER_EMAIL_USER || 'contato@nuaborges.com.br';
  const pass = env.SMTP_PASS || env.HOSTINGER_EMAIL_PASS || 'Nu@borges2000';

  if (!user || !pass) {
    console.warn('[SMTP] ⚠️ Credenciais SMTP (SMTP_USER / SMTP_PASS) não configuradas.');
    return false;
  }

  const { to, subject, html } = options;

  try {
    const isNode = typeof process !== 'undefined' && typeof process.versions?.node === 'string';

    if (isNode && typeof tls !== 'undefined' && typeof tls.connect === 'function') {
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
    const socket = tls.connect({ host, port, rejectUnauthorized: false }, () => {
      let step = 0;
      const send = (cmd: string) => socket.write(cmd + '\r\n');

      socket.on('data', (data) => {
        const msg = data.toString();
        const code = msg.substring(0, 3);

        if (step === 0 && code === '220') {
          step = 1;
          send('EHLO nuaborges.com.br');
        } else if (step === 1 && code === '250') {
          step = 2;
          const authString = Buffer.from(`\0${user}\0${pass}`).toString('base64');
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
            `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
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
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\r\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          fullResponse += line + '\r\n';
          if (line.length >= 4 && line[3] === ' ') {
            return fullResponse;
          }
        }
      }
      return fullResponse;
    }

    const sendCmd = async (cmd: string) => {
      await writer.write(encoder.encode(cmd + '\r\n'));
    };

    const greeting = await readSmtpResponse();
    if (!greeting.startsWith('220')) {
      return false;
    }

    await sendCmd('EHLO nuaborges.com.br');
    await readSmtpResponse();

    const authString = btoa(`\0${user}\0${pass}`);
    await sendCmd(`AUTH PLAIN ${authString}`);
    const authRes = await readSmtpResponse();
    if (!authRes.includes('235')) {
      return false;
    }

    await sendCmd(`MAIL FROM:<${user}>`);
    await readSmtpResponse();

    await sendCmd(`RCPT TO:<${to}>`);
    await readSmtpResponse();

    await sendCmd('DATA');
    await readSmtpResponse();

    const mime = [
      `From: Nua Borges <${user}>`,
      `To: <${to}>`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      html,
      '.'
    ].join('\r\n');

    await sendCmd(mime);
    const dataRes = await readSmtpResponse();

    await sendCmd('QUIT');
    await reader.cancel();
    writer.releaseLock();

    return dataRes.includes('250');
  } catch (err) {
    console.error('[Cloudflare Sockets SMTP Error]:', err);
    return false;
  }
}
