/**
 * Cliente Universal IMAP & SMTP sobre TLS — Cloudflare Pages Functions (Edge) & Node.js (Local)
 *
 * Conecta diretamente a imap.hostinger.com:993 / smtp.hostinger.com:465 (Conta Profissional)
 * e imap.mail.yahoo.com:993 / smtp.mail.yahoo.com:465 (Conta Pessoal), usando
 * `cloudflare:sockets` no runtime Cloudflare Workers e `node:tls` em Node.js local.
 */

import { connect } from 'cloudflare:sockets';
import tls from 'node:tls';
import { MailError } from './_common.ts';

const CRLF = '\r\n';

export type MailProvider = 'hostinger' | 'yahoo';

interface ProviderConfig {
  user: string;
  pass: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  label: string;
}

export function resolveProviderConfig(env: any, provider: MailProvider = 'hostinger'): ProviderConfig {
  if (provider === 'hostinger') {
    const user = env?.SMTP_USER || env?.HOSTINGER_EMAIL_USER || env?.HOSTINGER_EMAIL || 'contato@nuaborges.com.br';
    const pass = String(env?.SMTP_PASS || env?.HOSTINGER_EMAIL_PASS || env?.HOSTINGER_EMAIL_PASSWORD || '').trim();
    const imapHost = env?.HOSTINGER_IMAP_HOST || 'imap.hostinger.com';
    const imapPort = Number(env?.HOSTINGER_IMAP_PORT || 993);
    const smtpHost = env?.SMTP_SERVER || env?.HOSTINGER_SMTP_HOST || 'smtp.hostinger.com';
    const smtpPort = Number(env?.SMTP_PORT || env?.HOSTINGER_SMTP_PORT || 465);
    if (!pass) {
      throw new MailError(503, 'Senha da caixa profissional (Hostinger) ausente no ambiente.', 'ACCOUNT_UNAVAILABLE');
    }
    return { user, pass, imapHost, imapPort, smtpHost, smtpPort, label: 'Hostinger Mail' };
  }

  const user = env?.YAHOO_EMAIL || 'nuaborges@yahoo.com';
  const pass = String(env?.YAHOO_APP_PASSWORD || '').replace(/\s+/g, '');
  const imapHost = env?.YAHOO_IMAP_HOST || 'imap.mail.yahoo.com';
  const imapPort = Number(env?.YAHOO_IMAP_PORT || 993);
  const smtpHost = env?.YAHOO_SMTP_HOST || 'smtp.mail.yahoo.com';
  const smtpPort = Number(env?.YAHOO_SMTP_PORT || 465);
  if (!pass) {
    throw new MailError(503, 'Senha de aplicativo do Yahoo ausente no ambiente.', 'ACCOUNT_UNAVAILABLE');
  }
  return { user, pass, imapHost, imapPort, smtpHost, smtpPort, label: 'Yahoo Mail' };
}

interface TlsChannel {
  write: (data: string) => Promise<void>;
  takeUntil: (test: (buf: string) => boolean) => Promise<string>;
  close: () => Promise<void>;
}

async function openTlsChannel(host: string, port: number): Promise<TlsChannel> {
  const isNodeTls = typeof tls !== 'undefined' && typeof tls.connect === 'function' && typeof process !== 'undefined' && Boolean(process.versions?.node);

  if (isNodeTls) {
    const socket = tls.connect({ host, port, servername: host });
    socket.setEncoding('latin1');
    socket.setTimeout(25000, () => socket.destroy(new Error(`Tempo limite de conexão com ${host}:${port}.`)));

    let buffer = '';
    const waiters: Array<{ check: () => void }> = [];

    socket.on('data', (chunk: string) => {
      buffer += chunk;
      for (const waiter of [...waiters]) waiter.check();
    });

    const takeUntil = (test: (buf: string) => boolean) =>
      new Promise<string>((resolve, reject) => {
        const onError = (err: Error) => {
          const idx = waiters.indexOf(waiter);
          if (idx >= 0) waiters.splice(idx, 1);
          reject(err);
        };
        const waiter = {
          check() {
            if (!test(buffer)) return;
            const data = buffer;
            buffer = '';
            const idx = waiters.indexOf(waiter);
            if (idx >= 0) waiters.splice(idx, 1);
            socket.removeListener('error', onError);
            resolve(data);
          },
        };
        waiters.push(waiter);
        socket.once('error', onError);
        waiter.check();
      });

    await new Promise<void>((resolve, reject) => {
      socket.once('secureConnect', () => resolve());
      socket.once('error', reject);
    });

    return {
      write: async (data: string) => {
        socket.write(data, 'latin1');
      },
      takeUntil,
      close: async () => {
        if (!socket.destroyed) socket.destroy();
      },
    };
  }

  // Cloudflare Workers Socket API
  const cfSocket = connect(`${host}:${port}`, { secureTransport: 'on' });
  const writer = cfSocket.writable.getWriter();
  const reader = cfSocket.readable.getReader();
  const decoder = new TextDecoder('latin1');
  let buffer = '';

  const encodeLatin1 = (str: string): Uint8Array => {
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i) & 0xff;
    }
    return bytes;
  };

  const takeUntil = async (test: (buf: string) => boolean): Promise<string> => {
    while (!test(buffer)) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) buffer += decoder.decode(value, { stream: true });
    }
    const out = buffer;
    buffer = '';
    return out;
  };

  return {
    write: async (data: string) => {
      await writer.write(encodeLatin1(data));
    },
    takeUntil,
    close: async () => {
      try { await reader.cancel(); } catch {}
      try { writer.releaseLock(); } catch {}
      try { await cfSocket.close(); } catch {}
    },
  };
}

function quote(value: string): string {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export interface ImapFolderItem {
  path: string;
  name: string;
  specialUse: string | null;
  messages?: number;
  unseen?: number;
}

function parseListAndStatus(raw: string): ImapFolderItem[] {
  const folders: ImapFolderItem[] = [];
  const statusMap = new Map<string, { messages: number; unseen: number }>();
  const genericFlags = new Set(['\\hasnochildren', '\\haschildren', '\\marked', '\\unmarked', '\\noselect', '\\noindex']);

  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\* LIST \(([^)]*)\) "([^"]*)" (.+)$/i);
    if (match) {
      let path = match[3].trim();
      if (path.startsWith('"') && path.endsWith('"')) path = path.slice(1, -1).replace(/\\([\\"])/g, '$1');
      const flags = match[1].split(/\s+/).filter(Boolean);
      const specialUse = flags.find((f) => f.startsWith('\\') && !genericFlags.has(f.toLowerCase())) || null;
      folders.push({
        path,
        name: path.split(/[./]/).filter(Boolean).pop() || path,
        specialUse,
      });
      continue;
    }
    const statusMatch = line.match(/^\* STATUS (.+) \(([^)]*)\)$/i);
    if (statusMatch) {
      let path = statusMatch[1].trim();
      if (path.startsWith('"') && path.endsWith('"')) path = path.slice(1, -1).replace(/\\([\\"])/g, '$1');
      const attrs = statusMatch[2];
      const mMsg = attrs.match(/MESSAGES\s+(\d+)/i);
      const mUnseen = attrs.match(/UNSEEN\s+(\d+)/i);
      statusMap.set(path.toLowerCase(), {
        messages: mMsg ? Number(mMsg[1]) : 0,
        unseen: mUnseen ? Number(mUnseen[1]) : 0,
      });
    }
  }

  for (const f of folders) {
    const st = statusMap.get(f.path.toLowerCase());
    if (st) {
      f.messages = st.messages;
      f.unseen = st.unseen;
    }
  }

  return folders;
}

function latin1ToBytes(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i) & 0xff;
  return bytes;
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/\s+/g, '');
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(clean, 'base64'));
  }
  const bin = atob(clean);
  return latin1ToBytes(bin);
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function utf8ToBase64(str: string): string {
  return bytesToBase64(new TextEncoder().encode(str));
}

function decodeHeader(value = ''): string {
  return value
    .replace(/=\?([^?]+)\?([bq])\?([^?]*)\?=/gi, (_, charset, mode, data) => {
      try {
        const bytes =
          mode.toLowerCase() === 'b'
            ? base64ToBytes(data)
            : latin1ToBytes(
                data
                  .replace(/_/g, ' ')
                  .replace(/=([a-f\d]{2})/gi, (__: string, hex: string) => String.fromCharCode(parseInt(hex, 16)))
              );
        return new TextDecoder(charset, { fatal: false }).decode(bytes);
      } catch {
        return data;
      }
    })
    .replace(/\r?\n[ \t]+/g, ' ')
    .trim();
}

function decodePart(body: string, encoding = ''): string {
  if (/base64/i.test(encoding)) {
    return new TextDecoder('utf-8', { fatal: false }).decode(base64ToBytes(body));
  }
  if (/quoted-printable/i.test(encoding)) {
    const raw = body
      .replace(/=\r?\n/g, '')
      .replace(/=([a-f\d]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    return new TextDecoder('utf-8', { fatal: false }).decode(latin1ToBytes(raw));
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(latin1ToBytes(body));
}

function splitHeaders(raw: string): { headers: Record<string, string>; body: string } {
  const split = raw.search(/\r?\n\r?\n/);
  const headerText = split < 0 ? raw : raw.slice(0, split);
  const body = split < 0 ? '' : raw.slice(split).replace(/^\r?\n\r?\n/, '');
  const headers: Record<string, string> = {};
  for (const line of headerText.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i > 0) {
      const key = line.slice(0, i).toLowerCase();
      headers[key] = `${headers[key] || ''}${headers[key] ? ', ' : ''}${line.slice(i + 1).trim()}`;
    }
  }
  return { headers, body };
}

interface ParsedAttachment {
  filename: string;
  contentType: string;
  size: number;
  content: Uint8Array;
}

function parseMime(raw: string) {
  const { headers, body } = splitHeaders(raw);
  const contentType = headers['content-type'] || 'text/plain';
  const boundary = contentType.match(/boundary\s*=\s*(?:"([^"]+)"|([^;\s]+))/i);
  let text = '';
  let html = '';
  const attachments: ParsedAttachment[] = [];
  if (boundary) {
    const delimiter = `--${boundary[1] || boundary[2]}`;
    for (const chunk of body.split(delimiter).slice(1)) {
      if (chunk.startsWith('--')) break;
      const part = splitHeaders(chunk.replace(/^\r?\n/, '').replace(/\r?\n$/, ''));
      const type = part.headers['content-type'] || 'text/plain';
      const encoding = part.headers['content-transfer-encoding'] || '';
      const disposition = part.headers['content-disposition'] || '';
      const subBoundary = type.match(/boundary\s*=\s*(?:"([^"]+)"|([^;\s]+))/i);
      if (subBoundary) {
        const nested = parseMime(chunk.replace(/^\r?\n/, '').replace(/\r?\n$/, ''));
        if (nested.text) text += nested.text;
        if (nested.html) html += nested.html;
        attachments.push(...nested.attachments);
        continue;
      }
      const decoded = decodePart(part.body.replace(/\r?\n$/, ''), encoding);
      if (/attachment|filename\s*=/i.test(disposition)) {
        const filename = decodeHeader(disposition.match(/filename\*?=(?:UTF-8''|"?)([^;"\r\n]+)/i)?.[1] || 'anexo');
        const content = /base64/i.test(encoding) ? base64ToBytes(part.body) : new TextEncoder().encode(decoded);
        attachments.push({ filename, contentType: type.split(';')[0], size: content.byteLength, content });
      } else if (/text\/html/i.test(type)) html += decoded;
      else if (/text\/plain/i.test(type)) text += decoded;
    }
  } else {
    const decoded = decodePart(body, headers['content-transfer-encoding']);
    if (/text\/html/i.test(contentType)) html = decoded;
    else text = decoded;
  }
  return { headers, text, html, attachments };
}

async function withImap<T>(
  env: any,
  provider: MailProvider,
  callback: (ctx: { command: (cmd: string) => Promise<string>; user: string }) => Promise<T>
): Promise<T> {
  const { user, pass, imapHost, imapPort, label } = resolveProviderConfig(env, provider);
  const channel = await openTlsChannel(imapHost, imapPort);
  try {
    await channel.takeUntil((b) => /\r?\n$/.test(b));
    let tag = 0;
    const command = async (value: string) => {
      const id = `N${String(++tag).padStart(4, '0')}`;
      await channel.write(`${id} ${value}${CRLF}`);
      const result = await channel.takeUntil((b) => new RegExp(`(?:^|\\r?\\n)${id} (?:OK|NO|BAD)\\b`, 'i').test(b));
      if (!new RegExp(`(?:^|\\r?\\n)${id} OK\\b`, 'i').test(result)) {
        throw new MailError(502, `${label} recusou a operação IMAP.`, 'IMAP_COMMAND_FAILED');
      }
      return result;
    };
    await command(`LOGIN ${quote(user)} ${quote(pass)}`);
    const result = await callback({ command, user });
    try { await command('LOGOUT'); } catch {}
    return result;
  } catch (error) {
    if (error instanceof MailError) throw error;
    throw new MailError(502, `Não foi possível conectar à caixa ${label}. Confira as credenciais e tente novamente.`, 'IMAP_CONNECTION_FAILED');
  } finally {
    await channel.close();
  }
}

function extractLiteral(raw: string): string {
  const match = raw.match(/\{(\d+)\}\r?\n/);
  if (!match || match.index === undefined) return '';
  const start = match.index + match[0].length;
  return raw.slice(start, start + Number(match[1]));
}

function htmlToCleanSnippet(input = ''): string {
  if (!input) return '';
  let decoded = input;
  if (/=[0-9A-F]{2}|=\r?\n/i.test(decoded)) {
    try {
      const raw = decoded
        .replace(/=\r?\n/g, '')
        .replace(/=([a-f\d]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
      decoded = new TextDecoder('utf-8', { fatal: false }).decode(latin1ToBytes(raw));
    } catch {}
  }
  return decoded
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<style[\s\S]*$/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/\*\{[^}]*\}/g, ' ')
    .replace(/\*{4,}/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF\u034F\u200C]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

function parseBatchFetchResponse(raw: string, realFolder: string, user: string) {
  const items = new Map<number, any>();
  let cursor = 0;

  while (cursor < raw.length) {
    const fetchMatch = raw.slice(cursor).match(/^\* \d+ FETCH \(/m);
    if (!fetchMatch || fetchMatch.index === undefined) break;

    let pos = cursor + fetchMatch.index + fetchMatch[0].length;
    let headerText = '';
    let bodySnippetRaw = '';
    let metaChunk = '';

    let depth = 1;
    while (pos < raw.length && depth > 0) {
      const litMatch = raw.slice(pos).match(/^\{(\d+)\}\r?\n/);
      if (litMatch) {
        const litLen = Number(litMatch[1]);
        const litStart = pos + litMatch[0].length;
        const litContent = raw.slice(litStart, litStart + litLen);
        const preceding = raw.slice(Math.max(0, pos - 120), pos).toUpperCase();
        if (preceding.includes('HEADER.FIELDS')) {
          headerText = litContent;
        } else {
          bodySnippetRaw = litContent;
        }
        pos = litStart + litLen;
        continue;
      }
      const ch = raw[pos];
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) {
          pos++;
          break;
        }
      }
      metaChunk += ch;
      pos++;
    }

    cursor = pos;

    const uidMatch = metaChunk.match(/\bUID\s+(\d+)/i);
    if (!uidMatch) continue;
    const uid = Number(uidMatch[1]);
    const flagsMatch = metaChunk.match(/\bFLAGS\s+\(([^)]*)\)/i);
    const flags = flagsMatch ? flagsMatch[1] : '';
    const intDateMatch = metaChunk.match(/\bINTERNALDATE\s+"([^"]+)"/i);
    const internalDate = intDateMatch ? intDateMatch[1] : '';

    const { headers } = splitHeaders(headerText + '\r\n\r\n');
    const from = decodeHeader(headers.from || '');
    const to = decodeHeader(headers.to || '');
    const cc = decodeHeader(headers.cc || '');
    const subject = decodeHeader(headers.subject || '(sem assunto)');
    const date = headers.date || internalDate || '';
    const messageId = headers['message-id'] || '';
    const contentType = headers['content-type'] || '';
    const hasAttach = /multipart\/mixed/i.test(contentType);

    const snippet = htmlToCleanSnippet(bodySnippetRaw);

    items.set(uid, {
      uid,
      id: String(uid),
      folder: realFolder,
      from,
      to: to ? [to] : [],
      cc: cc ? [cc] : [],
      subject,
      snippet,
      date,
      read: /\\Seen/i.test(flags),
      starred: /\\Flagged/i.test(flags),
      attachments: hasAttach ? [{ id: '0', filename: 'Anexo', contentType: 'application/octet-stream' }] : [],
      messageId,
      account: user,
    });
  }

  return items;
}

async function resolveRealFolder(command: (cmd: string) => Promise<string>, folder: string): Promise<string> {
  const target = String(folder || 'INBOX').trim();
  const listRaw = await command('LIST "" "*"');
  const folders = parseListAndStatus(listRaw);
  const exact = folders.find((f) => f.path === target);
  if (exact) return exact.path;
  const ci = folders.find((f) => f.path.toLowerCase() === target.toLowerCase());
  if (ci) return ci.path;
  return target;
}

async function selectFolder(command: (cmd: string) => Promise<string>, folder: string): Promise<string> {
  const realFolder = await resolveRealFolder(command, folder);
  await command(`SELECT ${quote(realFolder)}`);
  return realFolder;
}

async function fetchRaw(command: (cmd: string) => Promise<string>, uid: number): Promise<string> {
  const raw = await command(`UID FETCH ${uid} (UID FLAGS INTERNALDATE BODY.PEEK[])`);
  return extractLiteral(raw);
}

export async function imapListFolders(env: any, provider: MailProvider = 'hostinger'): Promise<{ data: ImapFolderItem[]; pagination: null }> {
  const data = await withImap(env, provider, async ({ command }) => {
    try {
      const raw = await command('LIST "" "*" RETURN (STATUS (MESSAGES UNSEEN))');
      return parseListAndStatus(raw);
    } catch {
      const folders = parseListAndStatus(await command('LIST "" "*"'));
      for (const f of folders) {
        try {
          const st = await command(`STATUS ${quote(f.path)} (MESSAGES UNSEEN)`);
          const mMsg = st.match(/MESSAGES\s+(\d+)/i);
          const mUnseen = st.match(/UNSEEN\s+(\d+)/i);
          if (mMsg) f.messages = Number(mMsg[1]);
          if (mUnseen) f.unseen = Number(mUnseen[1]);
        } catch {}
      }
      return folders;
    }
  });
  return { data, pagination: null };
}

export async function imapListMessages(
  env: any,
  folder: string,
  page = 1,
  perPage = 25,
  query = '',
  provider: MailProvider = 'hostinger'
) {
  return withImap(env, provider, async ({ command, user }) => {
    const realFolder = await selectFolder(command, folder);
    const criteria = folder === 'unread' ? 'UNSEEN' : folder === 'starred' ? 'FLAGGED' : 'ALL';
    const search = query ? `UID SEARCH OR SUBJECT ${quote(query)} FROM ${quote(query)}` : `UID SEARCH ${criteria}`;
    const response = await command(search);
    const line = response.split(/\r?\n/).find((item) => /^\* SEARCH(?: |$)/i.test(item)) || '';
    const all = line
      .replace(/^\* SEARCH\s*/i, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(Number)
      .filter(Number.isInteger);
    const selected = all
      .slice(Math.max(0, all.length - page * perPage), Math.max(0, all.length - (page - 1) * perPage))
      .reverse();

    if (selected.length === 0) {
      return {
        data: [],
        pagination: { page, perPage, total: 0, totalPages: 1 },
      };
    }

    const previewField = provider === 'hostinger' ? 'PREVIEW' : 'BODY.PEEK[1]<0.3072>';
    const batchRaw = await command(
      `UID FETCH ${selected.join(',')} (UID FLAGS INTERNALDATE RFC822.SIZE BODY.PEEK[HEADER.FIELDS (FROM TO CC SUBJECT DATE MESSAGE-ID CONTENT-TYPE)] ${previewField})`
    );
    const parsedMap = parseBatchFetchResponse(batchRaw, realFolder, user);
    const messages = selected.map((uid) => parsedMap.get(uid)).filter(Boolean);

    return {
      data: messages,
      pagination: {
        page,
        perPage,
        total: all.length,
        totalPages: Math.max(1, Math.ceil(all.length / perPage)),
      },
    };
  });
}

export async function imapGetMessage(env: any, folder: string, uid: number, provider: MailProvider = 'hostinger') {
  return withImap(env, provider, async ({ command }) => {
    const realFolder = await selectFolder(command, folder);
    const raw = await fetchRaw(command, uid);
    if (!raw) return null;
    await command(`UID STORE ${uid} +FLAGS.SILENT (\\Seen)`);
    const parsed = parseMime(raw);
    const from = decodeHeader(parsed.headers.from || '');
    const to = decodeHeader(parsed.headers.to || '');
    return {
      message: {
        uid,
        id: String(uid),
        folder: realFolder,
        from,
        to: to ? [to] : [],
        subject: decodeHeader(parsed.headers.subject || '(sem assunto)'),
        date: parsed.headers.date || '',
        messageId: parsed.headers['message-id'] || '',
        attachments: parsed.attachments.map(({ filename, contentType, size }, i) => ({
          filename,
          contentType,
          size,
          id: String(i),
        })),
      },
      text: parsed.text,
      html: parsed.html,
      raw,
      attachments: parsed.attachments,
    };
  });
}

export async function imapDownloadAttachment(
  env: any,
  folder: string,
  uid: number,
  attachmentId: string,
  provider: MailProvider = 'hostinger'
) {
  const message = await imapGetMessage(env, folder, uid, provider);
  const attachment = message?.attachments?.[Number(attachmentId)];
  if (!attachment) throw new MailError(404, 'Anexo não encontrado.', 'ATTACHMENT_NOT_FOUND');
  return {
    bytes: attachment.content.buffer.slice(
      attachment.content.byteOffset,
      attachment.content.byteOffset + attachment.content.byteLength
    ) as ArrayBuffer,
    filename: attachment.filename,
    contentType: attachment.contentType || 'application/octet-stream',
  };
}

export async function imapUpdateFlags(
  env: any,
  folder: string,
  uids: number[],
  addFlags: string[] = [],
  removeFlags: string[] = [],
  provider: MailProvider = 'hostinger'
) {
  return withImap(env, provider, async ({ command }) => {
    await selectFolder(command, folder);
    const map: Record<string, string> = {
      '\\Seen': '\\Seen',
      '\\Flagged': '\\Flagged',
      '\\Answered': '\\Answered',
      '\\Deleted': '\\Deleted',
      '\\Draft': '\\Draft',
      $forwarded: '$forwarded',
    };
    for (const flag of addFlags) {
      if (map[flag]) await command(`UID STORE ${uids.join(',')} +FLAGS.SILENT (${map[flag]})`);
    }
    for (const flag of removeFlags) {
      if (map[flag]) await command(`UID STORE ${uids.join(',')} -FLAGS.SILENT (${map[flag]})`);
    }
    return { updated: uids.length };
  });
}

export async function imapMoveMessages(
  env: any,
  folder: string,
  uids: number[],
  targetFolder: string,
  provider: MailProvider = 'hostinger'
) {
  return withImap(env, provider, async ({ command }) => {
    await selectFolder(command, folder);
    const realTarget = await resolveRealFolder(command, targetFolder);
    await command(`UID MOVE ${uids.join(',')} ${quote(realTarget)}`);
    return { moved: uids.length };
  });
}

export async function imapDeleteMessages(
  env: any,
  folder: string,
  uids: number[],
  permanent = false,
  provider: MailProvider = 'hostinger'
) {
  return withImap(env, provider, async ({ command }) => {
    const folders = parseListAndStatus(await command('LIST "" "*"'));
    const trash =
      folders.find((f) => String(f.specialUse || '').toLowerCase() === '\\trash') ||
      folders.find((f) => /(^|[./])trash$/i.test(String(f.path || '')));
    const realFolder = await selectFolder(command, folder);
    if (!permanent && trash && trash.path.toLowerCase() !== realFolder.toLowerCase()) {
      await command(`UID MOVE ${uids.join(',')} ${quote(trash.path)}`);
      return { movedToTrash: uids.length, targetFolder: trash.path };
    }
    await command(`UID STORE ${uids.join(',')} +FLAGS.SILENT (\\Deleted)`);
    await command('EXPUNGE');
    return { deleted: uids.length };
  });
}

function mimeHeader(value = ''): string {
  return /[^\x20-\x7e]/.test(value)
    ? `=?UTF-8?B?${utf8ToBase64(value)}?=`
    : value.replace(/[\r\n]/g, ' ');
}

export async function smtpSendEmail(env: any, payload: any, provider: MailProvider = 'hostinger') {
  const { user, pass, smtpHost, smtpPort, label } = resolveProviderConfig(env, provider);
  const channel = await openTlsChannel(smtpHost, smtpPort);

  const readSmtp = async () => {
    const text = await channel.takeUntil((b) => /(?:^|\r?\n)\d{3} [^\r\n]*\r?\n/.test(b));
    const lines = text.trim().split(/\r?\n/);
    const last = lines[lines.length - 1] || '';
    const code = Number(last.match(/^(\d{3})/)?.[1] || 0);
    if (code < 200 || code >= 400) {
      throw new MailError(502, `Servidor SMTP ${label} respondeu ${code}.`, 'SMTP_REJECTED');
    }
    return text;
  };

  const sendCmd = async (cmd: string) => {
    await channel.write(`${cmd}${CRLF}`);
    return readSmtp();
  };

  try {
    await readSmtp();
    await sendCmd('EHLO nuaborges.com.br');
    const auth = utf8ToBase64(`\0${user}\0${pass}`);
    await sendCmd(`AUTH PLAIN ${auth}`);
    await sendCmd(`MAIL FROM:<${user}>`);
    const recipients = [...(payload.to || []), ...(payload.cc || []), ...(payload.bcc || [])];
    for (const recipient of recipients) {
      await sendCmd(`RCPT TO:<${recipient}>`);
    }
    await sendCmd('DATA');

    const boundary = `nua_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const headers = [
      `From: Nua Borges <${user}>`,
      `To: ${(payload.to || []).join(', ')}`,
      payload.cc?.length ? `Cc: ${payload.cc.join(', ')}` : '',
      `Subject: ${mimeHeader(payload.subject || '')}`,
      payload.inReplyToMessageId ? `In-Reply-To: ${payload.inReplyToMessageId}` : '',
      payload.references ? `References: ${payload.references}` : '',
      'MIME-Version: 1.0',
    ].filter(Boolean);

    const html =
      payload.html ||
      `<pre>${String(payload.text || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] || c))}</pre>`;
    const textPart = payload.text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const cleanFilename = (name: string) => mimeHeader(name).replace(/["\\\r\n]/g, '_');

    const attachmentParts = (payload.attachments || []).flatMap((attachment: any) => [
      `--${boundary}`,
      `Content-Type: ${attachment.contentType}; name="${cleanFilename(attachment.filename)}"`,
      `Content-Disposition: attachment; filename="${cleanFilename(attachment.filename)}"`,
      'Content-Transfer-Encoding: base64',
      '',
      attachment.content.match(/.{1,76}/g)?.join(CRLF) || attachment.content,
    ]);

    const body = [
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      utf8ToBase64(textPart),
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      utf8ToBase64(html),
      ...attachmentParts,
      `--${boundary}--`,
    ].join(CRLF);

    const data = `${headers.join(CRLF)}${CRLF}Content-Type: multipart/mixed; boundary="${boundary}"${CRLF}${CRLF}${body}${CRLF}.${CRLF}`.replace(
      /(^|\r\n)\./g,
      '$1..'
    );

    await channel.write(data);
    await readSmtp();
    await sendCmd('QUIT');
    return { sent: true };
  } finally {
    await channel.close();
  }
}
