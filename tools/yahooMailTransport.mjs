import tls from 'node:tls';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOST = 'imap.mail.yahoo.com';
const SMTP_HOST = 'smtp.mail.yahoo.com';
const CRLF = '\r\n';

const LOCAL_PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(LOCAL_PROJECT_ROOT, 'data');
const CONTACTS_FILE = path.join(DATA_DIR, 'local_mail_contacts.json');

// Cache em memória de baixíssima latência (processo local)
const folderCache = new Map(); // provider -> { at, data }
const listCache = new Map(); // key -> { at, data }
const messageCache = new Map(); // key -> { at, data }

const FOLDER_TTL_MS = 12_000;
const LIST_TTL_MS = 10_000;
const MSG_TTL_MS = 5 * 60_000;

export function invalidateProviderCache(provider) {
  folderCache.delete(provider);
  for (const key of listCache.keys()) {
    if (key.startsWith(`${provider}:`)) listCache.delete(key);
  }
}

export function loadMailContacts() {
  try {
    if (fs.existsSync(CONTACTS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf-8'));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [
    {
      id: 'ct_nua_pro',
      name: 'Nua Borges (Profissional)',
      email: 'contato@nuaborges.com.br',
      avatarUrl: '',
      notes: 'Caixa oficial do site Nua Borges',
      source: 'admin',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'ct_nua_yahoo',
      name: 'Nua Borges (Pessoal)',
      email: 'nuaborges@yahoo.com',
      avatarUrl: '',
      notes: 'Caixa pessoal Yahoo Mail',
      source: 'admin',
      updatedAt: new Date().toISOString(),
    },
  ];
}

export function saveMailContacts(contacts) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2), 'utf-8');
  } catch (err) {
    console.error('[MailContacts] Erro ao salvar contatos:', err.message);
  }
  return contacts;
}

function resolveProviderConfig(env, provider = 'yahoo') {
  if (provider === 'hostinger') {
    const user = env.SMTP_USER || env.HOSTINGER_EMAIL_USER || env.HOSTINGER_EMAIL || 'contato@nuaborges.com.br';
    const pass = String(env.SMTP_PASS || env.HOSTINGER_EMAIL_PASS || env.HOSTINGER_EMAIL_PASSWORD || '').trim();
    const imapHost = env.HOSTINGER_IMAP_HOST || 'imap.hostinger.com';
    const imapPort = Number(env.HOSTINGER_IMAP_PORT || 993);
    const smtpHost = env.SMTP_SERVER || env.HOSTINGER_SMTP_HOST || 'smtp.hostinger.com';
    const smtpPort = Number(env.SMTP_PORT || env.HOSTINGER_SMTP_PORT || 465);
    if (!pass) throw Object.assign(new Error('Senha da caixa profissional (Hostinger) ausente no ambiente local.'), { status: 503 });
    return { user, pass, imapHost, imapPort, smtpHost, smtpPort, label: 'Hostinger Mail' };
  }
  const user = env.YAHOO_EMAIL || 'nuaborges@yahoo.com';
  const pass = String(env.YAHOO_APP_PASSWORD || '').replace(/\s+/g, '');
  const imapHost = env.YAHOO_IMAP_HOST || HOST;
  const imapPort = Number(env.YAHOO_IMAP_PORT || 993);
  const smtpHost = env.YAHOO_SMTP_HOST || SMTP_HOST;
  const smtpPort = Number(env.YAHOO_SMTP_PORT || 465);
  if (!pass) throw Object.assign(new Error('Senha de aplicativo do Yahoo ausente no ambiente local.'), { status: 503 });
  return { user, pass, imapHost, imapPort, smtpHost, smtpPort, label: 'Yahoo Mail' };
}

function openTls(host, port) {
  const socket = tls.connect({ host, port, servername: host });
  socket.setEncoding('latin1');
  socket.setTimeout(25000, () => socket.destroy(new Error(`Tempo limite de conexão com ${host}.`)));
  let buffer = '';
  const waiters = [];
  socket.on('data', (chunk) => {
    buffer += chunk;
    for (const waiter of [...waiters]) waiter.check();
  });
  const takeUntil = (test) => new Promise((resolve, reject) => {
    const onError = (err) => {
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
  const connected = new Promise((resolve, reject) => {
    socket.once('secureConnect', resolve);
    socket.once('error', reject);
  });
  return { socket, connected, takeUntil };
}

function quote(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function parseListAndStatus(raw) {
  const folders = [];
  const statusMap = new Map();
  const genericFlags = new Set(['\\hasnochildren', '\\haschildren', '\\marked', '\\unmarked', '\\noselect', '\\noindex']);

  for (const line of raw.split(/\r?\n/)) {
    const listMatch = line.match(/^\* LIST \(([^)]*)\) "([^"]*)" (.+)$/i);
    if (listMatch) {
      let path = listMatch[3].trim();
      const delimiter = listMatch[2] || '/';
      if (path.startsWith('"') && path.endsWith('"')) path = path.slice(1, -1).replace(/\\([\\"])/g, '$1');
      const flags = listMatch[1].split(/\s+/).filter(Boolean);
      const specialUse = flags.find((f) => f.startsWith('\\') && !genericFlags.has(f.toLowerCase())) || null;
      folders.push({ path, name: path.split(/[./]/).filter(Boolean).pop() || path, specialUse, delimiter });
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

function decodeHeader(value = '') {
  if (!value) return '';
  let str = value;
  if (/=\?[^?]+\?[bq]\?[^?]*\?=/i.test(str)) {
    str = str.replace(/=\?([^?]+)\?([bq])\?([^?]*)\?=/gi, (_, charset, mode, data) => {
      try {
        const bytes = mode.toLowerCase() === 'b'
          ? Buffer.from(data, 'base64')
          : Buffer.from(data.replace(/_/g, ' ').replace(/=([a-f\d]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))), 'latin1');
        return new TextDecoder(charset, { fatal: false }).decode(bytes);
      } catch { return data; }
    });
  } else {
    try {
      const buf = Buffer.from(str, 'latin1');
      const utf = buf.toString('utf8');
      if (!utf.includes('\uFFFD') && utf !== str) str = utf;
    } catch {}
  }
  return str.replace(/\r?\n[ \t]+/g, ' ').trim();
}

function decodePart(body, encoding = '', charset = 'utf-8') {
  let bytes;
  if (/base64/i.test(encoding)) {
    bytes = Buffer.from(body.replace(/\s/g, ''), 'base64');
  } else if (/quoted-printable/i.test(encoding)) {
    bytes = Buffer.from(body.replace(/=\r?\n/g, '').replace(/=([a-f\d]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))), 'latin1');
  } else {
    bytes = Buffer.from(body, 'latin1');
  }
  try {
    return new TextDecoder(charset || 'utf-8', { fatal: false }).decode(bytes);
  } catch {
    return bytes.toString('utf8');
  }
}

function splitHeaders(raw) {
  const split = raw.search(/\r?\n\r?\n/);
  const headerText = split < 0 ? raw : raw.slice(0, split);
  const body = split < 0 ? '' : raw.slice(split).replace(/^\r?\n\r?\n/, '');
  const headers = {};
  for (const line of headerText.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i > 0) {
      const key = line.slice(0, i).toLowerCase().trim();
      headers[key] = `${headers[key] || ''}${headers[key] ? ', ' : ''}${line.slice(i + 1).trim()}`;
    }
  }
  return { headers, body };
}

function extractCharset(contentType = '') {
  const m = contentType.match(/charset\s*=\s*(?:"([^"]+)"|([^;\s]+))/i);
  return (m?.[1] || m?.[2] || 'utf-8').trim();
}

function parseMime(raw) {
  const { headers, body } = splitHeaders(raw);
  const contentType = headers['content-type'] || 'text/plain';
  const boundary = contentType.match(/boundary\s*=\s*(?:"([^"]+)"|([^;\s]+))/i);
  let text = '';
  let html = '';
  const attachments = [];
  if (boundary) {
    const delimiter = `--${boundary[1] || boundary[2]}`;
    for (const chunk of body.split(delimiter).slice(1)) {
      if (chunk.startsWith('--')) break;
      const cleaned = chunk.replace(/^\r?\n/, '').replace(/\r?\n$/, '');
      const part = splitHeaders(cleaned);
      const type = part.headers['content-type'] || 'text/plain';
      const encoding = part.headers['content-transfer-encoding'] || '';
      const disposition = part.headers['content-disposition'] || '';
      const rawCid = (part.headers['content-id'] || part.headers['x-attachment-id'] || '').replace(/^<|>$/g, '').trim();
      const subBoundary = type.match(/boundary\s*=\s*(?:"([^"]+)"|([^;\s]+))/i);
      if (subBoundary) {
        const nested = parseMime(cleaned);
        if (nested.text) text += (text ? '\n' : '') + nested.text;
        if (nested.html) html += nested.html;
        attachments.push(...nested.attachments);
        continue;
      }
      const charset = extractCharset(type);
      const decoded = decodePart(part.body.replace(/\r?\n$/, ''), encoding, charset);
      const isAttachmentOrBinary =
        /attachment|inline|filename\s*=/i.test(disposition) ||
        /name\s*=/i.test(type) ||
        (!/^text\/(plain|html)/i.test(type) && Boolean(rawCid));

      if (isAttachmentOrBinary && !/^text\/(plain|html)/i.test(type)) {
        const fnameMatch =
          disposition.match(/filename\*?=(?:UTF-8''|"?)([^;"\r\n]+)/i) ||
          type.match(/name\*?=(?:UTF-8''|"?)([^;"\r\n]+)/i);
        const filename = decodeHeader(fnameMatch?.[1] || 'anexo');
        const content = /base64/i.test(encoding)
          ? Buffer.from(part.body.replace(/\s/g, ''), 'base64')
          : Buffer.from(decoded, 'utf8');
        attachments.push({
          filename,
          contentType: type.split(';')[0].trim().toLowerCase(),
          size: content.byteLength,
          content,
          cid: rawCid || undefined,
          inline: /inline/i.test(disposition) || Boolean(rawCid),
        });
      } else if (/text\/html/i.test(type)) {
        html += decoded;
      } else if (/text\/plain/i.test(type)) {
        text += decoded;
      }
    }
  } else {
    const charset = extractCharset(contentType);
    const decoded = decodePart(body, headers['content-transfer-encoding'], charset);
    if (/text\/html/i.test(contentType)) html = decoded;
    else text = decoded;
  }
  return { headers, text, html, attachments };
}

function htmlToCleanSnippet(input = '') {
  if (!input) return '';
  let decoded = input;
  if (/=[0-9A-F]{2}|=\r?\n/i.test(decoded)) {
    try {
      const bytes = Buffer.from(decoded.replace(/=\r?\n/g, '').replace(/=([a-f\d]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))), 'latin1');
      decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    } catch {}
  } else {
    try {
      const buf = Buffer.from(decoded, 'latin1');
      const utf = buf.toString('utf8');
      if (!utf.includes('\uFFFD') && utf !== decoded) decoded = utf;
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

async function withImap(env, callback, provider = 'yahoo') {
  const { user, pass, imapHost, imapPort, label } = resolveProviderConfig(env, provider);
  const client = openTls(imapHost, imapPort);
  try {
    await client.connected;
    await client.takeUntil((b) => /\r?\n$/.test(b));
    let tag = 0;
    const command = async (value) => {
      const id = `N${String(++tag).padStart(4, '0')}`;
      client.socket.write(`${id} ${value}${CRLF}`, 'latin1');
      const result = await client.takeUntil((b) => new RegExp(`(?:^|\\r?\\n)${id} (?:OK|NO|BAD)\\b`, 'i').test(b));
      if (!new RegExp(`(?:^|\\r?\\n)${id} OK\\b`, 'i').test(result)) {
        throw Object.assign(new Error(`${label} recusou a operação IMAP.`), { status: 502 });
      }
      return result;
    };
    const appendLiteral = async (folderPath, flagsStr, mime) => {
      const id = `N${String(++tag).padStart(4, '0')}`;
      const byteLen = Buffer.byteLength(mime, 'latin1');
      client.socket.write(`${id} APPEND ${quote(folderPath)} (${flagsStr}) {${byteLen}}${CRLF}`, 'latin1');
      const step1 = await client.takeUntil((b) => /(?:^|\r?\n)\+/.test(b) || new RegExp(`(?:^|\\r?\\n)${id} (?:OK|NO|BAD)\\b`, 'i').test(b));
      if (new RegExp(`(?:^|\\r?\\n)${id} (?:NO|BAD)\\b`, 'i').test(step1)) {
        throw Object.assign(new Error(`${label} recusou o salvamento IMAP.`), { status: 502 });
      }
      client.socket.write(`${mime}${CRLF}`, 'latin1');
      const step2 = await client.takeUntil((b) => new RegExp(`(?:^|\\r?\\n)${id} (?:OK|NO|BAD)\\b`, 'i').test(b));
      if (!new RegExp(`(?:^|\\r?\\n)${id} OK\\b`, 'i').test(step2)) {
        throw Object.assign(new Error(`${label} recusou a gravação IMAP.`), { status: 502 });
      }
      return step2;
    };
    await command(`LOGIN ${quote(user)} ${quote(pass)}`);
    const result = await callback({ command, appendLiteral, user });
    try { await command('LOGOUT'); } catch {}
    return result;
  } catch (error) {
    client.socket.destroy();
    if (error?.status) throw error;
    throw Object.assign(new Error(`Não foi possível conectar à caixa ${label}. Confira as credenciais e tente novamente.`), { status: 502 });
  } finally {
    if (!client.socket.destroyed) client.socket.end();
  }
}

function extractLiteral(raw) {
  const match = raw.match(/\{(\d+)\}\r?\n/);
  if (!match) return '';
  const start = match.index + match[0].length;
  return raw.slice(start, start + Number(match[1]));
}

async function getCachedFolders(command, env, provider) {
  const cached = folderCache.get(provider);
  if (cached && Date.now() - cached.at < FOLDER_TTL_MS) {
    return cached.data;
  }
  let folders;
  try {
    const raw = await command('LIST "" "*" RETURN (STATUS (MESSAGES UNSEEN))');
    folders = parseListAndStatus(raw);
  } catch {
    const raw = await command('LIST "" "*"');
    folders = parseListAndStatus(raw);
    for (const f of folders) {
      try {
        const st = await command(`STATUS ${quote(f.path)} (MESSAGES UNSEEN)`);
        const mMsg = st.match(/MESSAGES\s+(\d+)/i);
        const mUnseen = st.match(/UNSEEN\s+(\d+)/i);
        if (mMsg) f.messages = Number(mMsg[1]);
        if (mUnseen) f.unseen = Number(mUnseen[1]);
      } catch {}
    }
  }
  folderCache.set(provider, { at: Date.now(), data: folders });
  return folders;
}

async function resolveRealFolder(command, env, provider, folder) {
  const target = String(folder || 'INBOX').trim();
  const cached = folderCache.get(provider)?.data;
  const folders = cached || await getCachedFolders(command, env, provider);
  const exact = folders.find((f) => f.path === target);
  if (exact) return exact.path;
  const ci = folders.find((f) => f.path.toLowerCase() === target.toLowerCase());
  if (ci) return ci.path;
  return target;
}

async function selectFolder(command, env, provider, folder) {
  const realFolder = await resolveRealFolder(command, env, provider, folder);
  await command(`SELECT ${quote(realFolder)}`);
  return realFolder;
}

async function fetchRaw(command, uid) {
  const raw = await command(`UID FETCH ${uid} (UID FLAGS INTERNALDATE BODY.PEEK[])`);
  return extractLiteral(raw);
}

/**
 * Faz o parse de uma resposta UID FETCH em lote contendo múltiplos registros
 * com literais `{N}\r\n...` para HEADER.FIELDS e BODY[1]<0> / PREVIEW.
 */
function parseBatchFetchResponse(raw, realFolder, user, provider = 'yahoo') {
  const items = new Map();
  let cursor = 0;
  const accountId = provider === 'hostinger' ? 'profissional' : 'pessoal';

  while (cursor < raw.length) {
    const fetchMatch = raw.slice(cursor).match(/^\* \d+ FETCH \(/m);
    if (!fetchMatch || fetchMatch.index === undefined) break;

    let pos = cursor + fetchMatch.index + fetchMatch[0].length;
    let headerText = '';
    let bodySnippetRaw = '';
    let metaChunk = '';

    let depth = 1;
    let inQuote = false;
    while (pos < raw.length && depth > 0) {
      if (!inQuote) {
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
      }
      const ch = raw[pos];
      if (inQuote) {
        if (ch === '\\') {
          metaChunk += ch + (raw[pos + 1] || '');
          pos += 2;
          continue;
        }
        if (ch === '"') inQuote = false;
      } else {
        if (ch === '"') inQuote = true;
        else if (ch === '(') depth++;
        else if (ch === ')') {
          depth--;
          if (depth === 0) {
            pos++;
            break;
          }
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
    const sizeMatch = metaChunk.match(/\bRFC822\.SIZE\s+(\d+)/i);
    const size = sizeMatch ? Number(sizeMatch[1]) : 0;

    const { headers } = splitHeaders(headerText + '\r\n\r\n');
    const from = decodeHeader(headers.from || '');
    const to = decodeHeader(headers.to || '');
    const cc = decodeHeader(headers.cc || '');
    const subject = decodeHeader(headers.subject || '(sem assunto)');
    const date = headers.date || internalDate || '';
    const messageId = headers['message-id'] || '';
    const inReplyTo = headers['in-reply-to'] || '';
    const references = headers['references'] || '';
    const contentType = headers['content-type'] || '';
    const hasAttach = /multipart\/(mixed|related)/i.test(contentType);

    const snippet = htmlToCleanSnippet(bodySnippetRaw);

    items.set(uid, {
      uid,
      id: `${accountId}:${realFolder}:${uid}`,
      folder: realFolder,
      from,
      to: to ? [to] : [],
      cc: cc ? [cc] : [],
      subject,
      snippet,
      date,
      size,
      read: /\\Seen/i.test(flags),
      starred: /\\Flagged/i.test(flags),
      answered: /\\Answered/i.test(flags),
      attachments: hasAttach ? [{ id: '0', filename: 'Anexo', contentType: 'application/octet-stream' }] : [],
      messageId,
      inReplyTo,
      references,
      account: user,
      accountId,
    });
  }

  return items;
}

export async function yahooAccounts(env) {
  const ready = Boolean(env.YAHOO_EMAIL && env.YAHOO_APP_PASSWORD);
  return [{ id: 'pessoal', label: 'Pessoal', address: env.YAHOO_EMAIL || 'nuaborges@yahoo.com', provider: 'yahoo', available: ready, reason: ready ? undefined : 'Configure a senha de aplicativo do Yahoo no ambiente local.' }];
}

export async function yahooListFolders(env, provider = 'yahoo') {
  const cached = folderCache.get(provider);
  if (cached && Date.now() - cached.at < FOLDER_TTL_MS) {
    return cached.data;
  }
  return withImap(env, async ({ command }) => getCachedFolders(command, env, provider), provider);
}

export async function yahooCreateFolder(env, name, provider = 'yahoo') {
  invalidateProviderCache(provider);
  return withImap(env, async ({ command }) => {
    const folders = await getCachedFolders(command, env, provider);
    const clean = String(name || '').trim().replace(/["\\]/g, '');
    if (!clean) throw Object.assign(new Error('Nome de pasta inválido.'), { status: 400 });
    const targetPath = provider === 'hostinger' && !clean.toUpperCase().startsWith('INBOX.') ? `INBOX.${clean}` : clean;
    if (folders.some((f) => f.path.toLowerCase() === targetPath.toLowerCase())) {
      throw Object.assign(new Error('Já existe uma pasta com este nome.'), { status: 400 });
    }
    await command(`CREATE ${quote(targetPath)}`);
    invalidateProviderCache(provider);
    return { path: targetPath, name: clean };
  }, provider);
}

export async function yahooRenameFolder(env, oldPath, newName, provider = 'yahoo') {
  invalidateProviderCache(provider);
  return withImap(env, async ({ command }) => {
    const realOld = await resolveRealFolder(command, env, provider, oldPath);
    const clean = String(newName || '').trim().replace(/["\\]/g, '');
    if (!clean) throw Object.assign(new Error('Novo nome de pasta inválido.'), { status: 400 });
    const newPath = provider === 'hostinger' && !clean.toUpperCase().startsWith('INBOX.') ? `INBOX.${clean}` : clean;
    await command(`RENAME ${quote(realOld)} ${quote(newPath)}`);
    invalidateProviderCache(provider);
    return { oldPath: realOld, path: newPath, name: clean };
  }, provider);
}

export async function yahooDeleteFolder(env, folderPath, provider = 'yahoo') {
  invalidateProviderCache(provider);
  return withImap(env, async ({ command }) => {
    const realPath = await resolveRealFolder(command, env, provider, folderPath);
    await command(`DELETE ${quote(realPath)}`);
    invalidateProviderCache(provider);
    return { deleted: realPath };
  }, provider);
}

export async function yahooSaveDraft(env, payload, provider = 'yahoo') {
  invalidateProviderCache(provider);
  return withImap(env, async ({ command, appendLiteral, user }) => {
    const folders = await getCachedFolders(command, env, provider);
    const draftsFolder =
      folders.find((f) => String(f.specialUse || '').toLowerCase() === '\\drafts') ||
      folders.find((f) => /draft/i.test(f.path)) ||
      { path: provider === 'hostinger' ? 'INBOX.Drafts' : 'Draft' };

    if (payload.replaceUid && Number.isInteger(Number(payload.replaceUid))) {
      try {
        await command(`SELECT ${quote(draftsFolder.path)}`);
        await command(`UID STORE ${Number(payload.replaceUid)} +FLAGS.SILENT (\\Deleted)`);
        await command('EXPUNGE');
      } catch {}
    }

    const boundary = `nua_draft_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const headers = [
      `From: Nua Borges <${user}>`,
      payload.to?.length ? `To: ${payload.to.join(', ')}` : '',
      payload.cc?.length ? `Cc: ${payload.cc.join(', ')}` : '',
      `Subject: ${mimeHeader(payload.subject || '(Rascunho sem assunto)')}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <draft_${Date.now()}_${Math.random().toString(16).slice(2)}@nuaborges.com.br>`,
      'MIME-Version: 1.0',
    ].filter(Boolean);

    const html = payload.html || `<div dir="ltr">${String(payload.text || '').replace(/\n/g, '<br>')}</div>`;
    const textPart = payload.text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const cleanFilename = (name) => mimeHeader(name).replace(/["\\\r\n]/g, '_');

    const attachmentParts = (payload.attachments || []).flatMap((attachment) => [
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
      Buffer.from(textPart, 'utf8').toString('base64'),
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(html, 'utf8').toString('base64'),
      ...attachmentParts,
      `--${boundary}--`,
    ].join(CRLF);

    const mime = `${headers.join(CRLF)}${CRLF}Content-Type: multipart/mixed; boundary="${boundary}"${CRLF}${CRLF}${body}${CRLF}`;
    await appendLiteral(draftsFolder.path, '\\Draft \\Seen', mime);
    invalidateProviderCache(provider);
    return { saved: true, folder: draftsFolder.path };
  }, provider);
}

function isSpamOrTrashFolder(f) {
  const su = String(f.specialUse || '').toLowerCase();
  if (su === '\\trash' || su === '\\junk') return true;
  return /(^|[./])(trash|junk|bulk|spam)$/i.test(String(f.path || ''));
}

export async function yahooListMessages(env, folder, page = 1, perPage = 25, query = '', provider = 'yahoo') {
  const cacheKey = `${provider}:${String(folder).toLowerCase()}:${page}:${perPage}:${query}`;
  const cached = listCache.get(cacheKey);
  if (cached && Date.now() - cached.at < LIST_TTL_MS) {
    return cached.data;
  }

  return withImap(env, async ({ command, user }) => {
    const folders = await getCachedFolders(command, env, provider);
    const previewField = provider === 'hostinger' ? 'PREVIEW' : 'BODY.PEEK[1]<0.3072>';
    const normFolder = String(folder || 'INBOX').toLowerCase();

    // Suporte a visões virtuais ("all", "unread", "starred") em uma única sessão IMAP
    if (normFolder === 'all' || normFolder === '__all__' || normFolder === 'unread' || normFolder === '__unread__' || normFolder === 'starred' || normFolder === '__starred__') {
      const candidateFolders = folders.filter((f) => {
        if (isSpamOrTrashFolder(f)) return false;
        if ((normFolder === 'unread' || normFolder === '__unread__') && typeof f.unseen === 'number') {
          return f.unseen > 0;
        }
        if (typeof f.messages === 'number') return f.messages > 0;
        return true;
      });

      const criteria =
        normFolder === 'unread' || normFolder === '__unread__'
          ? 'UNSEEN'
          : normFolder === 'starred' || normFolder === '__starred__'
          ? 'FLAGGED'
          : 'ALL';

      const combined = [];
      for (const f of candidateFolders) {
        try {
          const realFolder = await selectFolder(command, env, provider, f.path);
          const searchCmd = query
            ? `UID SEARCH ${criteria === 'ALL' ? '' : criteria + ' '}OR SUBJECT ${quote(query)} FROM ${quote(query)}`
            : `UID SEARCH ${criteria}`;
          const response = await command(searchCmd);
          const line = response.split(/\r?\n/).find((item) => /^\* SEARCH(?: |$)/i.test(item)) || '';
          const uids = line.replace(/^\* SEARCH\s*/i, '').trim().split(/\s+/).filter(Boolean).map(Number).filter(Number.isInteger);
          const recentUids = uids.slice(-perPage).reverse();
          if (recentUids.length === 0) continue;

          const batchRaw = await command(
            `UID FETCH ${recentUids.join(',')} (UID FLAGS INTERNALDATE RFC822.SIZE BODY.PEEK[HEADER.FIELDS (FROM TO CC SUBJECT DATE MESSAGE-ID IN-REPLY-TO REFERENCES CONTENT-TYPE)] ${previewField})`
          );
          const parsedMap = parseBatchFetchResponse(batchRaw, realFolder, user, provider);
          for (const uid of recentUids) {
            const item = parsedMap.get(uid);
            if (item) combined.push(item);
          }
        } catch {}
      }

      combined.sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
      const total = combined.length;
      const sliced = combined.slice((page - 1) * perPage, page * perPage);
      const out = {
        data: sliced,
        pagination: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
      };
      listCache.set(cacheKey, { at: Date.now(), data: out });
      return out;
    }

    const realFolder = await selectFolder(command, env, provider, folder);
    const search = query
      ? `UID SEARCH OR SUBJECT ${quote(query)} FROM ${quote(query)}`
      : 'UID SEARCH ALL';
    const response = await command(search);
    const line = response.split(/\r?\n/).find((item) => /^\* SEARCH(?: |$)/i.test(item)) || '';
    const all = line.replace(/^\* SEARCH\s*/i, '').trim().split(/\s+/).filter(Boolean).map(Number).filter(Number.isInteger);
    const selected = all.slice(Math.max(0, all.length - page * perPage), Math.max(0, all.length - (page - 1) * perPage)).reverse();

    if (selected.length === 0) {
      const emptyResult = { data: [], pagination: { page, perPage, total: 0, totalPages: 1 } };
      listCache.set(cacheKey, { at: Date.now(), data: emptyResult });
      return emptyResult;
    }

    const batchRaw = await command(
      `UID FETCH ${selected.join(',')} (UID FLAGS INTERNALDATE RFC822.SIZE BODY.PEEK[HEADER.FIELDS (FROM TO CC SUBJECT DATE MESSAGE-ID IN-REPLY-TO REFERENCES CONTENT-TYPE)] ${previewField})`
    );
    const parsedMap = parseBatchFetchResponse(batchRaw, realFolder, user, provider);
    const messages = selected.map((uid) => parsedMap.get(uid)).filter(Boolean);

    const out = {
      data: messages,
      pagination: { page, perPage, total: all.length, totalPages: Math.max(1, Math.ceil(all.length / perPage)) },
    };
    listCache.set(cacheKey, { at: Date.now(), data: out });
    return out;
  }, provider);
}

export async function yahooGetMessage(env, folder, uid, provider = 'yahoo') {
  const cacheKey = `${provider}:${String(folder).toLowerCase()}:${uid}`;
  const cached = messageCache.get(cacheKey);
  if (cached && Date.now() - cached.at < MSG_TTL_MS) {
    withImap(env, async ({ command }) => {
      await selectFolder(command, env, provider, folder);
      await command(`UID STORE ${uid} +FLAGS.SILENT (\\Seen)`);
    }, provider).catch(() => {});
    return cached.data;
  }

  return withImap(env, async ({ command, user }) => {
    const realFolder = await selectFolder(command, env, provider, folder);
    const raw = await fetchRaw(command, uid);
    if (!raw) return null;
    await command(`UID STORE ${uid} +FLAGS.SILENT (\\Seen)`);
    const parsed = parseMime(raw);
    const from = decodeHeader(parsed.headers.from || '');
    const to = decodeHeader(parsed.headers.to || '');
    const cc = decodeHeader(parsed.headers.cc || '');
    const accountId = provider === 'hostinger' ? 'profissional' : 'pessoal';
    const result = {
      message: {
        uid,
        id: `${accountId}:${realFolder}:${uid}`,
        folder: realFolder,
        from,
        to: to ? [to] : [],
        cc: cc ? [cc] : [],
        subject: decodeHeader(parsed.headers.subject || '(sem assunto)'),
        date: parsed.headers.date || '',
        messageId: parsed.headers['message-id'] || '',
        inReplyTo: parsed.headers['in-reply-to'] || '',
        references: parsed.headers['references'] || '',
        account: user,
        accountId,
        attachments: parsed.attachments.map(({ filename, contentType, size, cid, inline }, i) => ({
          filename,
          contentType,
          size,
          id: String(i),
          cid,
          inline,
        })),
      },
      text: parsed.text,
      html: parsed.html,
      raw,
      attachments: parsed.attachments,
    };
    messageCache.set(cacheKey, { at: Date.now(), data: result });
    return result;
  }, provider);
}

export async function yahooDownloadAttachment(env, folder, uid, attachmentIdOrCid, provider = 'yahoo', byCid = false) {
  const message = await yahooGetMessage(env, folder, uid, provider);
  const list = message?.attachments || [];
  let attachment = null;
  if (byCid) {
    const cleanTarget = String(attachmentIdOrCid || '').replace(/^<|>$/g, '').trim().toLowerCase();
    attachment = list.find((item) => String(item.cid || '').toLowerCase() === cleanTarget);
  }
  if (!attachment) {
    attachment = list[Number(attachmentIdOrCid)];
  }
  if (!attachment) throw Object.assign(new Error('Anexo não encontrado.'), { status: 404 });
  return { bytes: attachment.content, filename: attachment.filename, contentType: attachment.contentType || 'application/octet-stream' };
}

export async function yahooUpdateFlags(env, folder, uids, addFlags = [], removeFlags = [], provider = 'yahoo') {
  invalidateProviderCache(provider);
  return withImap(env, async ({ command }) => {
    await selectFolder(command, env, provider, folder);
    const map = { '\\Seen': '\\Seen', '\\Flagged': '\\Flagged', '\\Answered': '\\Answered', '\\Deleted': '\\Deleted', '\\Draft': '\\Draft', '$forwarded': '$forwarded' };
    for (const flag of addFlags) if (map[flag]) await command(`UID STORE ${uids.join(',')} +FLAGS.SILENT (${map[flag]})`);
    for (const flag of removeFlags) if (map[flag]) await command(`UID STORE ${uids.join(',')} -FLAGS.SILENT (${map[flag]})`);
    return { updated: uids.length };
  }, provider);
}

export async function yahooMoveMessages(env, folder, uids, targetFolder, provider = 'yahoo') {
  invalidateProviderCache(provider);
  return withImap(env, async ({ command }) => {
    await selectFolder(command, env, provider, folder);
    const realTarget = await resolveRealFolder(command, env, provider, targetFolder);
    await command(`UID MOVE ${uids.join(',')} ${quote(realTarget)}`);
    return { moved: uids.length };
  }, provider);
}

export async function yahooDeleteMessages(env, folder, uids, permanent = false, provider = 'yahoo') {
  invalidateProviderCache(provider);
  return withImap(env, async ({ command }) => {
    const folders = await getCachedFolders(command, env, provider);
    const trash =
      folders.find((f) => String(f.specialUse || '').toLowerCase() === '\\trash') ||
      folders.find((f) => /(^|[./])trash$/i.test(String(f.path || '')));
    const realFolder = await selectFolder(command, env, provider, folder);
    if (!permanent && trash && trash.path.toLowerCase() !== realFolder.toLowerCase()) {
      await command(`UID MOVE ${uids.join(',')} ${quote(trash.path)}`);
      return { movedToTrash: uids.length, targetFolder: trash.path };
    }
    await command(`UID STORE ${uids.join(',')} +FLAGS.SILENT (\\Deleted)`);
    await command('EXPUNGE');
    return { deleted: uids.length };
  }, provider);
}

function mimeHeader(value = '') {
  return /[^\x20-\x7e]/.test(value) ? `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=` : value.replace(/[\r\n]/g, ' ');
}

function sendSmtpCommand(socket, response, command) {
  socket.write(`${command}${CRLF}`);
  return response();
}

export async function yahooSend(env, payload, provider = 'yahoo') {
  invalidateProviderCache(provider);
  const { user, pass, smtpHost, smtpPort, label } = resolveProviderConfig(env, provider);
  const socket = tls.connect({ host: smtpHost, port: smtpPort, servername: smtpHost });
  socket.setEncoding('utf8');
  let buffer = '';
  const waiters = [];
  socket.on('data', (chunk) => { buffer += chunk; for (const w of [...waiters]) w(); });
  const response = () => new Promise((resolve, reject) => {
    const check = () => {
      const match = buffer.match(/(?:^|\r?\n)(\d{3} [^\r\n]*\r?\n)/);
      if (!match) return;
      const end = match.index + (match[0].startsWith('\r') ? 2 : 0);
      const text = buffer.slice(0, end + match[1].length);
      buffer = buffer.slice(end + match[1].length);
      const code = Number(text.match(/^(\d{3})/)?.[1] || 0);
      waiters.splice(waiters.indexOf(check), 1);
      code >= 200 && code < 400 ? resolve(text) : reject(new Error(`Servidor SMTP ${label} respondeu ${code}.`));
    };
    waiters.push(check); socket.once('error', reject); check();
  });
  try {
    await new Promise((resolve, reject) => { socket.once('secureConnect', resolve); socket.once('error', reject); });
    await response();
    await sendSmtpCommand(socket, response, 'EHLO nuaborges.com.br');
    const auth = Buffer.from(`\0${user}\0${pass}`).toString('base64');
    await sendSmtpCommand(socket, response, `AUTH PLAIN ${auth}`);
    await sendSmtpCommand(socket, response, `MAIL FROM:<${user}>`);
    const recipients = [...(payload.to || []), ...(payload.cc || []), ...(payload.bcc || [])];
    for (const recipient of recipients) await sendSmtpCommand(socket, response, `RCPT TO:<${recipient}>`);
    await sendSmtpCommand(socket, response, 'DATA');
    const boundary = `nua_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const generatedMsgId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@nuaborges.com.br>`;
    const headers = [
      `From: Nua Borges <${user}>`,
      `To: ${(payload.to || []).join(', ')}`,
      payload.cc?.length ? `Cc: ${payload.cc.join(', ')}` : '',
      `Subject: ${mimeHeader(payload.subject || '')}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: ${generatedMsgId}`,
      payload.inReplyToMessageId ? `In-Reply-To: ${payload.inReplyToMessageId}` : '',
      payload.references ? `References: ${payload.references}` : '',
      'MIME-Version: 1.0',
    ].filter(Boolean);
    const html = payload.html || `<div dir="ltr">${String(payload.text || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])).replace(/\n/g, '<br>')}</div>`;
    const textPart = payload.text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const cleanFilename = (name) => mimeHeader(name).replace(/["\\\r\n]/g, '_');
    const attachmentParts = (payload.attachments || []).flatMap((attachment) => [
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
      Buffer.from(textPart, 'utf8').toString('base64'),
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(html, 'utf8').toString('base64'),
      ...attachmentParts,
      `--${boundary}--`,
    ].join(CRLF);
    const rawMimeForSent = `${headers.join(CRLF)}${CRLF}Content-Type: multipart/mixed; boundary="${boundary}"${CRLF}${CRLF}${body}${CRLF}`;
    const data = `${rawMimeForSent}.${CRLF}`.replace(/(^|\r\n)\./g, '$1..');
    socket.write(data);
    await response();
    await sendSmtpCommand(socket, response, 'QUIT');

    // Em background: salva cópia na pasta Enviadas via IMAP APPEND se for Hostinger (o Yahoo SMTP já salva automaticamente em Sent)
    if (provider === 'hostinger') {
      withImap(env, async ({ command, appendLiteral }) => {
        const folders = await getCachedFolders(command, env, provider);
        const sentFolder =
          folders.find((f) => String(f.specialUse || '').toLowerCase() === '\\sent') ||
          folders.find((f) => /sent/i.test(f.path));
        if (sentFolder) {
          await appendLiteral(sentFolder.path, '\\Seen', rawMimeForSent);
          invalidateProviderCache(provider);
        }
      }, provider).catch(() => {});
    }

    return { sent: true, messageId: generatedMsgId };
  } catch (error) {
    socket.destroy();
    throw Object.assign(new Error(error?.message || `Falha ao enviar e-mail por ${label}.`), { status: 502 });
  } finally {
    if (!socket.destroyed) socket.end();
  }
}
