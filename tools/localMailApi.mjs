/**
 * Espelho local do módulo E-mails — servidor de API de desenvolvimento.
 *
 * O servidor local (tools/localApiServer.mjs) não executa os Cloudflare Pages
 * Functions, então os endpoints /api/mail/* são reimplementados aqui em Node puro,
 * falando com a MESMA Hostinger Mail API.
 *
 * REGRA DE SINCRONIA: a função de sanitização abaixo é uma cópia de
 * functions/api/mail/_sanitize.ts. Qualquer alteração deve ser repetida nos dois
 * arquivos; tests/mailSanitize.test.mjs executa as duas implementações e compara
 * os resultados para detectar divergência.
 *
 * Nenhum segredo é aceito do cliente e nenhum valor de credencial é retornado.
 */

import {
  yahooDownloadAttachment,
  yahooDeleteMessages,
  yahooGetMessage,
  yahooListFolders,
  yahooListMessages,
  yahooMoveMessages,
  yahooSend,
  yahooUpdateFlags,
  yahooCreateFolder,
  yahooRenameFolder,
  yahooDeleteFolder,
  yahooSaveDraft,
  loadMailContacts,
  saveMailContacts,
} from './yahooMailTransport.mjs';

const BASE_URL = 'https://api.mail.hostinger.com/api/v1';
const PROFESSIONAL_ADDRESS = 'contato@nuaborges.com.br';
const hostingerMailApiKey = (env) => env?.HOSTINGER_MAIL_API_KEY;

export const MAIL_ACCOUNTS = [
  {
    id: 'profissional',
    label: 'Profissional',
    address: 'contato@nuaborges.com.br',
    provider: 'hostinger',
    adapter: 'imap-smtp',
  },
  {
    id: 'pessoal',
    label: 'Pessoal',
    address: 'nuaborges@yahoo.com',
    provider: 'yahoo',
    adapter: 'imap-smtp',
    pendingReason: 'Configure a senha de aplicativo do Yahoo no ambiente local.',
  },
];

class MailError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = 'MailError';
    this.status = status;
    this.code = code;
  }
}

function resolveAccount(value) {
  if (typeof value !== 'string') return null;
  const candidate = value.trim().toLowerCase();
  const needle = candidate === 'professional' ? 'profissional' : candidate;
  return MAIL_ACCOUNTS.find((account) => account.id === needle) || null;
}

function isAccountReady(env, account) {
  if (account.provider === 'hostinger') {
    return Boolean(env?.SMTP_PASS || env?.HOSTINGER_EMAIL_PASS || env?.HOSTINGER_EMAIL_PASSWORD || env?.HOSTINGER_MAIL_API_KEY);
  }
  return Boolean(env?.YAHOO_EMAIL && env?.YAHOO_APP_PASSWORD);
}

function requireAccount(env, value) {
  const account = resolveAccount(value);
  if (!account) throw new MailError(400, 'Conta de e-mail inválida.', 'VALIDATION');
  if (account.provider === 'yahoo') {
    if (!isAccountReady(env, account)) {
      throw new MailError(503, 'Caixa Yahoo não configurada no ambiente local.', 'ACCOUNT_UNAVAILABLE');
    }
    return account;
  }
  if (!isAccountReady(env, account)) {
    throw new MailError(
      503,
      'Caixa profissional não configurada: credenciais da Hostinger ausentes no ambiente.',
      'ACCOUNT_UNAVAILABLE'
    );
  }
  return account;
}

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

function readString(value, field, max = 1000) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new MailError(400, `Campo obrigatório: ${field}.`, 'VALIDATION');
  }
  const trimmed = value.trim();
  if (trimmed.length > max) throw new MailError(400, `Campo muito longo: ${field}.`, 'VALIDATION');
  if (CONTROL_CHARS.test(trimmed)) {
    throw new MailError(400, `Valor inválido no campo ${field}.`, 'VALIDATION');
  }
  return trimmed;
}

function readOptionalString(value, field, max = 1000) {
  if (value === undefined || value === null || value === '') return '';
  return readString(value, field, max);
}

function readFolder(value) {
  const folder = readString(value, 'folder', 200);
  if (!/^[A-Za-z0-9 ._\-/\\[\]]+$/.test(folder)) {
    throw new MailError(400, 'Caminho de pasta inválido.', 'VALIDATION');
  }
  return folder;
}

function readUid(value) {
  const uid = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(uid) || uid < 1) {
    throw new MailError(400, 'Identificador de mensagem inválido.', 'VALIDATION');
  }
  return uid;
}

function readUidList(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
    throw new MailError(400, 'Seleção de mensagens inválida.', 'VALIDATION');
  }
  return value.map((item) => {
    const uid = typeof item === 'number' ? item : Number.parseInt(String(item), 10);
    if (!Number.isInteger(uid) || uid < 1) {
      throw new MailError(400, 'Seleção de mensagens inválida.', 'VALIDATION');
    }
    return uid;
  });
}

const EMAIL_RE = /^[^\s@<>()[\],;:"]+@[^\s@<>()[\],;:"]+\.[A-Za-z]{2,}$/;

function readRecipients(value, field, max = 50) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new MailError(400, `Campo inválido: ${field}.`, 'VALIDATION');
  if (value.length > max) {
    throw new MailError(400, `Quantidade de destinatários em ${field} acima do permitido.`, 'VALIDATION');
  }
  return value.map((item) => {
    if (typeof item !== 'string') {
      throw new MailError(400, `Destinatário inválido em ${field}.`, 'VALIDATION');
    }
    const email = item.trim();
    if (CONTROL_CHARS.test(email) || !EMAIL_RE.test(email) || email.length > 320) {
      throw new MailError(400, `Destinatário inválido em ${field}.`, 'VALIDATION');
    }
    return email;
  });
}

function readFlagList(value, field) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new MailError(400, `Campo inválido: ${field}.`, 'VALIDATION');
  const allowed = new Set(['\\Seen', '\\Flagged', '\\Answered', '\\Deleted', '\\Draft', '$forwarded']);
  return value.map((item) => {
    if (typeof item !== 'string' || !allowed.has(item)) {
      throw new MailError(400, `Flag não permitida em ${field}.`, 'VALIDATION');
    }
    return item;
  });
}

function readPage(value) {
  const page = Number.parseInt(String(value ?? '1'), 10);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

function readPerPage(value) {
  const perPage = Number.parseInt(String(value ?? '25'), 10);
  if (!Number.isInteger(perPage)) return 25;
  return Math.min(Math.max(perPage, 1), 100);
}

/* -------------------------------------------------------------------------- */
/* Sanitização (espelho de functions/api/mail/_sanitize.ts)                    */
/* -------------------------------------------------------------------------- */

const GLOBAL_ATTRS = ['title', 'dir', 'lang', 'style', 'bgcolor', 'background'];

const ALLOWED_ATTRS = {
  a: ['href', ...GLOBAL_ATTRS],
  img: ['src', 'alt', 'width', 'height', 'border', ...GLOBAL_ATTRS],
  p: ['align', ...GLOBAL_ATTRS],
  div: ['align', ...GLOBAL_ATTRS],
  span: GLOBAL_ATTRS,
  b: GLOBAL_ATTRS,
  strong: GLOBAL_ATTRS,
  i: GLOBAL_ATTRS,
  em: GLOBAL_ATTRS,
  u: GLOBAL_ATTRS,
  s: GLOBAL_ATTRS,
  strike: GLOBAL_ATTRS,
  del: GLOBAL_ATTRS,
  ins: GLOBAL_ATTRS,
  mark: GLOBAL_ATTRS,
  small: GLOBAL_ATTRS,
  sub: GLOBAL_ATTRS,
  sup: GLOBAL_ATTRS,
  blockquote: ['cite', ...GLOBAL_ATTRS],
  pre: GLOBAL_ATTRS,
  code: GLOBAL_ATTRS,
  kbd: GLOBAL_ATTRS,
  samp: GLOBAL_ATTRS,
  var: GLOBAL_ATTRS,
  abbr: GLOBAL_ATTRS,
  cite: GLOBAL_ATTRS,
  q: ['cite', ...GLOBAL_ATTRS],
  time: GLOBAL_ATTRS,
  h1: ['align', ...GLOBAL_ATTRS],
  h2: ['align', ...GLOBAL_ATTRS],
  h3: ['align', ...GLOBAL_ATTRS],
  h4: ['align', ...GLOBAL_ATTRS],
  h5: ['align', ...GLOBAL_ATTRS],
  h6: ['align', ...GLOBAL_ATTRS],
  ul: ['type', ...GLOBAL_ATTRS],
  ol: ['type', 'start', ...GLOBAL_ATTRS],
  li: ['value', ...GLOBAL_ATTRS],
  dl: GLOBAL_ATTRS,
  dt: GLOBAL_ATTRS,
  dd: GLOBAL_ATTRS,
  hr: ['width', 'size', 'align', 'color', ...GLOBAL_ATTRS],
  br: GLOBAL_ATTRS,
  font: ['color', 'face', 'size', ...GLOBAL_ATTRS],
  center: GLOBAL_ATTRS,
  table: ['border', 'cellpadding', 'cellspacing', 'width', 'height', 'align', 'role', ...GLOBAL_ATTRS],
  thead: GLOBAL_ATTRS,
  tbody: GLOBAL_ATTRS,
  tfoot: GLOBAL_ATTRS,
  tr: ['align', 'valign', 'height', ...GLOBAL_ATTRS],
  td: ['colspan', 'rowspan', 'width', 'height', 'align', 'valign', ...GLOBAL_ATTRS],
  th: ['colspan', 'rowspan', 'width', 'height', 'align', 'valign', ...GLOBAL_ATTRS],
  caption: ['align', ...GLOBAL_ATTRS],
  colgroup: ['span', ...GLOBAL_ATTRS],
  col: ['span', 'width', ...GLOBAL_ATTRS],
  section: GLOBAL_ATTRS,
  article: GLOBAL_ATTRS,
  header: GLOBAL_ATTRS,
  footer: GLOBAL_ATTRS,
  main: GLOBAL_ATTRS,
};

const VOID_TAGS = new Set(['br', 'hr', 'img']);

const DROP_CONTENT_RE =
  /<(script|style|iframe|object|embed|template|noscript|svg|math|applet|link|meta|base|frame|frameset|portal|audio|video|source|track|head|title)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const DROP_OPEN_ONLY_RE =
  /<(script|style|iframe|object|embed|template|noscript|svg|math|applet|link|meta|base|frame|frameset|portal|audio|video|source|track|head|title)\b[^>]*\/?>/gi;

const TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
const ATTR_RE = /(?:^|\s)([a-zA-Z_:][a-zA-Z0-9_:.-]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g;

const NUMERIC_ATTRS = new Set([
  'width',
  'height',
  'colspan',
  'rowspan',
  'border',
  'cellpadding',
  'cellspacing',
  'size',
  'start',
  'value',
  'span',
]);

const ENUM_ATTRS = {
  align: ['left', 'center', 'right', 'justify', 'middle', 'top', 'bottom'],
  valign: ['top', 'middle', 'bottom', 'baseline'],
  dir: ['ltr', 'rtl', 'auto'],
  type: ['disc', 'circle', 'square', 'decimal', 'lower-alpha', 'upper-alpha', 'lower-roman', 'upper-roman'],
};

const ALLOWED_SCHEMES = new Set(['http', 'https', 'mailto', 'cid', 'tel', 'ftp']);

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  tab: '\t',
  newline: '\n',
  colon: ':',
  sol: '/',
  lpar: '(',
  rpar: ')',
  excl: '!',
  num: '#',
  semi: ';',
};

function decodeEntities(value) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi, (match, body) => {
    const lower = body.toLowerCase();
    if (lower[0] === '#') {
      const isHex = lower[1] === 'x';
      const code = Number.parseInt(isHex ? lower.slice(2) : lower.slice(1), isHex ? 16 : 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    const mapped = NAMED_ENTITIES[lower];
    return mapped === undefined ? match : mapped;
  });
}

export function sanitizeUrl(raw, blockRemoteImages = false) {
  const decoded = decodeEntities(String(raw));
  const probe = decoded.replace(/[\u0000-\u0020\u007F]/g, '').toLowerCase();
  const schemeMatch = /^([a-z][a-z0-9+.-]*):/.exec(probe);
  const clean = decoded.replace(/[\u0000-\u001F\u007F]/g, '');

  if (!schemeMatch) return clean;

  const scheme = schemeMatch[1];
  if (!ALLOWED_SCHEMES.has(scheme)) return null;
  if (blockRemoteImages && (scheme === 'http' || scheme === 'https')) return null;
  return clean;
}

function escapeAttribute(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeText(value) {
  return value.replace(/</g, '&lt;');
}

function sanitizeInlineStyle(raw, blockRemoteImages) {
  const cleaned = raw.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (!cleaned) return null;
  if (/expression\s*\(|javascript\s*:|vbscript\s*:|-moz-binding|behavior\s*:/i.test(cleaned)) {
    return null;
  }
  if (blockRemoteImages && /url\s*\(/i.test(cleaned)) {
    return cleaned.replace(/url\s*\([^)]*\)/gi, 'none');
  }
  return cleaned.slice(0, 2000);
}

function sanitizeAttributeValue(attrName, rawValue, blockRemoteImages) {
  const value = decodeEntities(rawValue).replace(/^["']|["']$/g, '');

  if (attrName === 'href' || attrName === 'src' || attrName === 'cite' || attrName === 'background') {
    return sanitizeUrl(value, (attrName === 'src' || attrName === 'background') && blockRemoteImages);
  }
  if (attrName === 'style') {
    return sanitizeInlineStyle(value, blockRemoteImages);
  }
  if (NUMERIC_ATTRS.has(attrName)) {
    return /^[0-9]{1,4}(?:px|%)?$/i.test(value.trim()) ? value.trim() : null;
  }
  const enumValues = ENUM_ATTRS[attrName];
  if (enumValues) {
    const lower = value.toLowerCase();
    return enumValues.includes(lower) ? lower : null;
  }
  if (attrName === 'face' || attrName === 'color' || attrName === 'bgcolor') {
    return /^[a-z0-9 ,#()-]{0,60}$/i.test(value) ? value : null;
  }
  if (attrName === 'role') {
    return value === 'presentation' || value === 'none' ? value : null;
  }
  if (attrName === 'dir' || attrName === 'lang') {
    return /^[a-z-]{1,20}$/i.test(value) ? value.toLowerCase() : null;
  }
  if (attrName === 'title') return value.slice(0, 200);
  if (value.length > 500) return null;
  return value;
}

export function sanitizeEmailHtml(input, options = {}) {
  if (typeof input !== 'string' || !input) return '';
  const blockRemoteImages = options.blockRemoteImages !== false;

  let html = input;
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  html = html.replace(/<![^>]*>/g, '');
  html = html.replace(DROP_CONTENT_RE, '');
  html = html.replace(DROP_OPEN_ONLY_RE, '');

  const out = [];
  const stack = [];
  let cursor = 0;
  let match;
  TAG_RE.lastIndex = 0;

  while ((match = TAG_RE.exec(html)) !== null) {
    if (match.index > cursor) {
      out.push(escapeText(html.slice(cursor, match.index)));
    }
    cursor = match.index + match[0].length;

    const rawTag = match[0];
    const tagName = match[1].toLowerCase();
    const attrSource = match[2] || '';
    const isClosing = rawTag.startsWith('</');
    const allowedAttrs = ALLOWED_ATTRS[tagName];

    if (!allowedAttrs) continue;

    if (isClosing) {
      const idx = stack.lastIndexOf(tagName);
      if (idx === -1) continue;
      while (stack.length > idx) {
        out.push(`</${stack.pop()}>`);
      }
      continue;
    }

    const attrs = [];
    let forcedTarget = false;
    ATTR_RE.lastIndex = 0;
    let attrMatch;
    while ((attrMatch = ATTR_RE.exec(attrSource)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      if (!allowedAttrs.includes(attrName)) continue;
      if (attrMatch[2] === undefined) continue;

      const value = sanitizeAttributeValue(attrName, attrMatch[2], blockRemoteImages);
      if (value === null) continue;
      attrs.push(`${attrName}="${escapeAttribute(value)}"`);
      if (tagName === 'a' && attrName === 'href') forcedTarget = true;
    }

    if (tagName === 'a' && forcedTarget) {
      attrs.push('target="_blank"', 'rel="noopener noreferrer"');
    }

    const attrText = attrs.length ? ` ${attrs.join(' ')}` : '';
    out.push(`<${tagName}${attrText}>`);

    if (!VOID_TAGS.has(tagName)) stack.push(tagName);
  }

  if (cursor < html.length) out.push(escapeText(html.slice(cursor)));

  while (stack.length) out.push(`</${stack.pop()}>`);

  return out.join('');
}

/* -------------------------------------------------------------------------- */
/* Cliente Hostinger Mail API                                                  */
/* -------------------------------------------------------------------------- */

let mailboxCache = null;
const MAILBOX_TTL_MS = 10 * 60 * 1000;

function mapStatusToMessage(status, upstream) {
  if (status === 401) return 'Token da Hostinger inválido ou revogado.';
  if (status === 403) return 'Token sem permissão para esta caixa de e-mail.';
  if (status === 404) return 'Recurso não encontrado na Hostinger. Verifique a caixa e a rota solicitada.';
  if (status === 422) return 'A Hostinger recusou os dados enviados.';
  if (status === 429) return 'Muitas requisições para a Hostinger. Aguarde alguns segundos.';
  if (status >= 500) return 'A Hostinger está indisponível no momento. Tente novamente.';
  return upstream || 'Não foi possível concluir a operação de e-mail.';
}

function findNetworkCauseCode(error) {
  const pending = [error];
  const seen = new Set();
  while (pending.length) {
    const current = pending.shift();
    if (!current || typeof current !== 'object' || seen.has(current)) continue;
    seen.add(current);
    if (typeof current.code === 'string' && /^[A-Z0-9_]+$/.test(current.code)) return current.code;
    if (current.cause) pending.push(current.cause);
    if (Array.isArray(current.errors)) pending.push(...current.errors);
  }
  return null;
}

function sanitizeProviderError(raw, token) {
  return raw
    .split(token).join('[credencial ocultada]')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

async function hf(env, apiPath, init = {}) {
  const token = hostingerMailApiKey(env);
  if (!token) {
    throw new MailError(503, 'Caixa profissional não configurada (token da Hostinger ausente).', 'MAIL_TOKEN_MISSING');
  }

  let response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    response = await fetch(`${BASE_URL}${apiPath}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
  } catch (error) {
    if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
      throw new MailError(504, 'A Hostinger Mail API excedeu o limite de 12 segundos.', 'MAIL_UPSTREAM_TIMEOUT');
    }
    const causeCode = findNetworkCauseCode(error);
    if (causeCode === 'EACCES' || causeCode === 'EPERM') {
      throw new MailError(502, `O ambiente bloqueou a conexão de saída com a Hostinger Mail API (${causeCode}).`, 'MAIL_EGRESS_BLOCKED');
    }
    if (causeCode === 'ENOTFOUND' || causeCode === 'EAI_AGAIN') {
      throw new MailError(502, `Falha ao resolver o endereço da Hostinger Mail API (${causeCode}).`, 'MAIL_DNS_FAILED');
    }
    if (causeCode === 'ECONNREFUSED') {
      throw new MailError(502, 'A conexão com a Hostinger Mail API foi recusada (ECONNREFUSED).', 'MAIL_CONNECTION_REFUSED');
    }
    if (causeCode === 'ETIMEDOUT' || causeCode === 'UND_ERR_CONNECT_TIMEOUT') {
      throw new MailError(504, `A conexão com a Hostinger Mail API excedeu o tempo limite (${causeCode}).`, 'MAIL_UPSTREAM_TIMEOUT');
    }
    const safeCause = causeCode || (error instanceof Error ? error.name : 'erro desconhecido');
    throw new MailError(502, `Falha de conexão com a Hostinger Mail API (${safeCause}).`, 'MAIL_CONNECTION_FAILED');
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 204) return null;

  const raw = await response.text();
  let payload = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const upstream = typeof payload?.error === 'string' ? payload.error : '';
    const message = mapStatusToMessage(response.status, upstream);
    const detail = upstream ? sanitizeProviderError(upstream, token) : '';
    throw new MailError(
      response.status,
      detail ? `${message} Resposta da Hostinger: ${detail}` : message,
      typeof payload?.code === 'string' ? payload.code : undefined
    );
  }

  return payload;
}

async function getMailbox(env) {
  if (mailboxCache && Date.now() - mailboxCache.at < MAILBOX_TTL_MS) return mailboxCache;

  const me = await hf(env, '/me');
  const mailboxes = Array.isArray(me?.data?.mailboxes) ? me.data.mailboxes : [];
  const box =
    mailboxes.find((item) => String(item?.address || '').toLowerCase() === PROFESSIONAL_ADDRESS) ||
    mailboxes[0];

  if (!box || typeof box.resourceId !== 'string') {
    throw new MailError(404, 'Nenhuma caixa de e-mail disponível para o token configurado.', 'MAILBOX_NOT_FOUND');
  }

  mailboxCache = { resourceId: box.resourceId, address: String(box.address || ''), at: Date.now() };
  return mailboxCache;
}

const enc = (folder) => encodeURIComponent(folder);

/* -------------------------------------------------------------------------- */
/* Roteador                                                                    */
/* -------------------------------------------------------------------------- */

const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/;
const MAX_ATTACHMENTS = 10;
const MAX_ATTACHMENT_CHARS = 7 * 1024 * 1024;
const MAX_TOTAL_CHARS = 10 * 1024 * 1024;
const SAFE_CONTENT_TYPE = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i;

function safeFilename(raw) {
  let name = typeof raw === 'string' ? raw : '';
  name = name.replace(/[\u0000-\u001F\u007F]/g, '');
  name = name.replace(/[\\/]+/g, '_').replace(/["']/g, '');
  name = name.split(/[\\/]/).pop() || '';
  name = name.trim().slice(0, 180);
  return name || 'anexo';
}

function readAttachments(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new MailError(400, 'Anexos inválidos.', 'VALIDATION');
  if (value.length > MAX_ATTACHMENTS) {
    throw new MailError(400, 'Quantidade de anexos acima do permitido.', 'VALIDATION');
  }

  let total = 0;
  return value.map((item) => {
    if (!item || typeof item !== 'object') throw new MailError(400, 'Anexo inválido.', 'VALIDATION');
    const filename = readOptionalString(item.filename, 'anexo.filename', 180) || 'anexo';
    const contentType = readOptionalString(item.contentType, 'anexo.contentType', 120);
    const content = typeof item.content === 'string' ? item.content.replace(/\s+/g, '') : '';

    if (!content || content.length > MAX_ATTACHMENT_CHARS || !BASE64_RE.test(content)) {
      throw new MailError(400, 'Anexo inválido ou acima do tamanho permitido.', 'VALIDATION');
    }
    if (!SAFE_CONTENT_TYPE.test(contentType)) {
      throw new MailError(400, 'Tipo de anexo não permitido.', 'VALIDATION');
    }
    total += content.length;
    if (total > MAX_TOTAL_CHARS) {
      throw new MailError(413, 'Tamanho total de anexos acima do permitido.', 'PAYLOAD_TOO_LARGE');
    }

    const attachment = { filename, content, contentType };
    const cid = readOptionalString(item.cid, 'anexo.cid', 200);
    if (cid) attachment.cid = cid;
    return attachment;
  });
}

async function resolveTrashFolder(env) {
  try {
    const box = await getMailbox(env);
    const payload = await hf(env, `/mailboxes/${box.resourceId}/folders?page=1&perPage=100`);
    const data = Array.isArray(payload?.data) ? payload.data : [];
    const trash =
      data.find((folder) => String(folder?.specialUse || '').toLowerCase() === '\\trash') ||
      data.find((folder) => /(^|\.)trash$/i.test(String(folder?.path || '')));
    return trash?.path ? String(trash.path) : null;
  } catch {
    return null;
  }
}

/**
 * Atende uma requisição /api/mail/* no servidor local.
 * @returns {Promise<{status:number, json?:any, binary?:{bytes:Buffer, contentType:string, disposition:string}}>}
 */
export async function handleMailRequest({ pathname, method, searchParams, body, env }) {
  try {
    if (pathname === '/api/mail/accounts' && method === 'GET') {
      return {
        status: 200,
        json: {
          success: true,
          accounts: MAIL_ACCOUNTS.map((account) => {
            const available = isAccountReady(env, account);
            return {
              id: account.id,
              label: account.label,
              address: account.address,
              provider: account.provider,
              available,
              reason: available
                ? undefined
                : account.pendingReason || 'Credencial desta caixa ausente no ambiente atual.',
            };
          }),
        },
      };
    }

    if (pathname === '/api/mail/folders' && method === 'GET') {
      const reqAccount = (searchParams.get('account') || searchParams.get('count') || '').trim().toLowerCase();
      if (reqAccount === 'unificada') {
        const [proFolders, pesFolders] = await Promise.all([
          isAccountReady(env, MAIL_ACCOUNTS[0]) ? yahooListFolders(env, 'hostinger').catch(() => []) : [],
          isAccountReady(env, MAIL_ACCOUNTS[1]) ? yahooListFolders(env, 'yahoo').catch(() => []) : [],
        ]);
        const taggedPro = proFolders.map((f) => ({ ...f, accountId: 'profissional' }));
        const taggedPes = pesFolders.map((f) => ({ ...f, accountId: 'pessoal' }));
        return {
          status: 200,
          json: {
            success: true,
            account: 'unificada',
            folders: [...taggedPro, ...taggedPes],
            byAccount: { profissional: taggedPro, pessoal: taggedPes },
            pagination: null,
          },
        };
      }
      const account = requireAccount(env, reqAccount);
      if (account.adapter === 'imap-smtp') {
        const list = await yahooListFolders(env, account.provider);
        return {
          status: 200,
          json: {
            success: true,
            account: account.id,
            folders: list.map((f) => ({ ...f, accountId: account.id })),
            pagination: null,
          },
        };
      }
      const box = await getMailbox(env);
      const payload = await hf(env, `/mailboxes/${box.resourceId}/folders?page=1&perPage=100`);
      return {
        status: 200,
        json: {
          success: true,
          account: account.id,
          folders: Array.isArray(payload?.data) ? payload.data : [],
          pagination: payload?.pagination || null,
        },
      };
    }

    if (pathname === '/api/mail/folders' && method === 'POST') {
      const account = requireAccount(env, body?.account);
      const action = readString(body?.action, 'action', 30);
      if (action === 'create') {
        const name = readString(body?.name, 'name', 120);
        const created = await yahooCreateFolder(env, name, account.provider);
        return { status: 200, json: { success: true, account: account.id, folder: created } };
      }
      if (action === 'rename') {
        const oldPath = readFolder(body?.path);
        const newName = readString(body?.newName, 'newName', 120);
        const renamed = await yahooRenameFolder(env, oldPath, newName, account.provider);
        return { status: 200, json: { success: true, account: account.id, folder: renamed } };
      }
      if (action === 'delete') {
        const folderPath = readFolder(body?.path);
        const deleted = await yahooDeleteFolder(env, folderPath, account.provider);
        return { status: 200, json: { success: true, account: account.id, result: deleted } };
      }
      throw new MailError(400, 'Ação de pasta inválida.', 'VALIDATION');
    }

    if (pathname === '/api/mail/messages' && method === 'GET') {
      const reqAccount = (searchParams.get('account') || '').trim().toLowerCase();
      const folder = readFolder(searchParams.get('folder'));
      const page = readPage(searchParams.get('page'));
      const perPage = readPerPage(searchParams.get('perPage'));
      const query = (searchParams.get('q') || '').trim();
      const filterUnread = searchParams.get('unread');
      const filterStarred = searchParams.get('starred');
      const filterAttach = searchParams.get('hasAttachment');
      const filterFrom = (searchParams.get('from') || '').trim().toLowerCase();
      const filterTo = (searchParams.get('to') || '').trim().toLowerCase();
      const filterSubject = (searchParams.get('subject') || '').trim().toLowerCase();
      const filterDateFrom = searchParams.get('dateFrom') ? Date.parse(searchParams.get('dateFrom')) : null;
      const filterDateTo = searchParams.get('dateTo') ? Date.parse(searchParams.get('dateTo')) + 86_399_999 : null;
      const sortOrder = searchParams.get('sort') === 'oldest' ? 'oldest' : 'newest';

      const applyFilters = (items) => {
        let filtered = items.filter((msg) => {
          if (filterUnread === '1' && msg.read) return false;
          if (filterUnread === '0' && !msg.read) return false;
          if (filterStarred === '1' && !msg.starred) return false;
          if (filterAttach === '1' && (!Array.isArray(msg.attachments) || msg.attachments.length === 0)) return false;
          if (filterFrom && !String(msg.from || '').toLowerCase().includes(filterFrom)) return false;
          if (filterTo && !String((msg.to || []).join(' ')).toLowerCase().includes(filterTo)) return false;
          if (filterSubject && !String(msg.subject || '').toLowerCase().includes(filterSubject)) return false;
          if (filterDateFrom && Number.isFinite(filterDateFrom)) {
            const ts = Date.parse(msg.date) || 0;
            if (ts < filterDateFrom) return false;
          }
          if (filterDateTo && Number.isFinite(filterDateTo)) {
            const ts = Date.parse(msg.date) || 0;
            if (ts > filterDateTo) return false;
          }
          return true;
        });
        filtered.sort((a, b) => {
          const da = Date.parse(a.date) || 0;
          const db = Date.parse(b.date) || 0;
          return sortOrder === 'oldest' ? da - db : db - da;
        });
        return filtered;
      };

      const mapUnifiedFolder = (virtualOrRole, provider) => {
        const lower = virtualOrRole.toLowerCase();
        if (['all', '__all__', 'unread', '__unread__', 'starred', '__starred__'].includes(lower)) return lower;
        if (lower === 'inbox') return provider === 'hostinger' ? 'INBOX' : 'Inbox';
        if (lower === 'sent' || lower === 'inbox.sent') return provider === 'hostinger' ? 'INBOX.Sent' : 'Sent';
        if (lower === 'drafts' || lower === 'draft' || lower === 'inbox.drafts') return provider === 'hostinger' ? 'INBOX.Drafts' : 'Draft';
        if (lower === 'spam' || lower === 'bulk' || lower === 'junk' || lower === 'inbox.junk') return provider === 'hostinger' ? 'INBOX.Junk' : 'Bulk';
        if (lower === 'trash' || lower === 'inbox.trash') return provider === 'hostinger' ? 'INBOX.Trash' : 'Trash';
        if (lower === 'archive' || lower === 'inbox.archive') return provider === 'hostinger' ? 'INBOX.Archive' : 'Archive';
        return virtualOrRole;
      };

      if (reqAccount === 'unificada') {
        const [proRes, pesRes] = await Promise.all([
          isAccountReady(env, MAIL_ACCOUNTS[0])
            ? yahooListMessages(env, mapUnifiedFolder(folder, 'hostinger'), 1, Math.max(perPage, 40), query, 'hostinger').catch(() => ({ data: [], pagination: { total: 0 } }))
            : { data: [], pagination: { total: 0 } },
          isAccountReady(env, MAIL_ACCOUNTS[1])
            ? yahooListMessages(env, mapUnifiedFolder(folder, 'yahoo'), 1, Math.max(perPage, 40), query, 'yahoo').catch(() => ({ data: [], pagination: { total: 0 } }))
            : { data: [], pagination: { total: 0 } },
        ]);
        const merged = applyFilters([...(proRes.data || []), ...(pesRes.data || [])]);
        const total = merged.length;
        const paged = merged.slice((page - 1) * perPage, page * perPage);
        return {
          status: 200,
          json: {
            success: true,
            account: 'unificada',
            folder,
            messages: paged,
            pagination: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
            query,
          },
        };
      }

      const account = requireAccount(env, reqAccount);
      if (account.adapter === 'imap-smtp') {
        const result = await yahooListMessages(env, folder, page, perPage, query, account.provider);
        const filtered = applyFilters(result.data || []);
        return {
          status: 200,
          json: {
            success: true,
            account: account.id,
            folder,
            messages: filtered,
            pagination: result.pagination,
            query,
          },
        };
      }
      const box = await getMailbox(env);

      const payload = query
        ? await hf(
            env,
            `/mailboxes/${box.resourceId}/folders/${enc(folder)}/messages/search?page=${page}&perPage=${perPage}&sort=-uid`,
            {
              method: 'POST',
              body: JSON.stringify({
                subject: readString(query, 'q', 256),
                from: query,
                to: query,
                body: query,
              }),
            }
          )
        : await hf(
            env,
            `/mailboxes/${box.resourceId}/folders/${enc(folder)}/messages?page=${page}&perPage=${perPage}&sort=-uid`
          );

      return {
        status: 200,
        json: {
          success: true,
          account: account.id,
          folder,
          messages: Array.isArray(payload?.data) ? payload.data : [],
          pagination: payload?.pagination || null,
          query,
        },
      };
    }

    if (pathname === '/api/mail/message' && method === 'GET') {
      const account = requireAccount(env, searchParams.get('account'));
      const folder = readFolder(searchParams.get('folder'));
      const uid = readUid(searchParams.get('uid'));
      const allowImages = searchParams.get('images') === '1';
      if (account.adapter === 'imap-smtp') {
        const result = await yahooGetMessage(env, folder, uid, account.provider);
        if (!result) throw new MailError(404, 'Mensagem não encontrada.', 'MESSAGE_NOT_FOUND');
        let sanitizedHtml = sanitizeEmailHtml(result.html, { blockRemoteImages: !allowImages });
        // Resolve referências cid: para nossa rota local de anexo inline
        sanitizedHtml = sanitizedHtml.replace(
          /\bsrc="cid:([^"]+)"/gi,
          (_, cidVal) =>
            `src="/api/mail/attachment?account=${encodeURIComponent(account.id)}&folder=${encodeURIComponent(result.message.folder)}&uid=${uid}&cid=${encodeURIComponent(cidVal)}&inline=1"`
        );
        return {
          status: 200,
          json: {
            success: true,
            message: result.message,
            html: sanitizedHtml,
            text: result.text,
            imagesAllowed: allowImages,
          },
        };
      }
      const box = await getMailbox(env);
      const base = `/mailboxes/${box.resourceId}/folders/${enc(folder)}/messages/${uid}`;

      const [meta, textPayload] = await Promise.all([
        hf(env, base),
        hf(env, `${base}/text`),
      ]);

      const message = meta?.data || null;
      if (!message) throw new MailError(404, 'Mensagem não encontrada.', 'MESSAGE_NOT_FOUND');

      return {
        status: 200,
        json: {
          success: true,
          message,
          html: sanitizeEmailHtml(textPayload?.data?.html, { blockRemoteImages: !allowImages }),
          text: typeof textPayload?.data?.text === 'string' ? textPayload.data.text : '',
          imagesAllowed: allowImages,
        },
      };
    }

    if (pathname === '/api/mail/attachment' && method === 'GET') {
      const account = requireAccount(env, searchParams.get('account'));
      const folder = readFolder(searchParams.get('folder'));
      const uid = readUid(searchParams.get('uid'));
      const attachmentId = searchParams.get('id');
      const cidParam = searchParams.get('cid');
      const isInline = searchParams.get('inline') === '1';
      const lookupKey = cidParam || attachmentId;
      if (!lookupKey || lookupKey.length > 300) {
        throw new MailError(400, 'Identificador de anexo inválido.', 'VALIDATION');
      }
      const filename = safeFilename(searchParams.get('name'));
      if (account.adapter === 'imap-smtp') {
        const downloaded = await yahooDownloadAttachment(env, folder, uid, lookupKey, account.provider, Boolean(cidParam));
        let contentType = String(downloaded.contentType || '').split(';')[0].trim().toLowerCase();
        if (!SAFE_CONTENT_TYPE.test(contentType) || ['text/html', 'image/svg+xml'].includes(contentType)) {
          contentType = 'application/octet-stream';
        }
        const safeName = safeFilename(downloaded.filename || filename);
        const canDisplayInline = isInline && /^image\/(png|jpeg|jpg|gif|webp)$/i.test(contentType);
        const dispType = canDisplayInline ? 'inline' : 'attachment';
        return {
          status: 200,
          binary: {
            bytes: downloaded.bytes,
            contentType,
            disposition: `${dispType}; filename="${safeName.replace(/[^\x20-\x7E]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
          },
        };
      }
      const box = await getMailbox(env);
      const token = hostingerMailApiKey(env);

      const response = await fetch(
        `${BASE_URL}/mailboxes/${box.resourceId}/folders/${enc(folder)}/messages/${uid}/attachments/${encodeURIComponent(lookupKey)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        const raw = await response.text();
        let payload = null;
        try {
          payload = raw ? JSON.parse(raw) : null;
        } catch {}
        const upstream = typeof payload?.error === 'string' ? payload.error : '';
        throw new MailError(
          response.status,
          mapStatusToMessage(response.status, upstream),
          typeof payload?.code === 'string' ? payload.code : undefined
        );
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      let contentType = (response.headers.get('Content-Type') || '').split(';')[0].trim();
      if (!SAFE_CONTENT_TYPE.test(contentType)) contentType = 'application/octet-stream';
      if (contentType === 'text/html' || contentType === 'image/svg+xml') {
        contentType = 'application/octet-stream';
      }

      const asciiName = filename.replace(/[^\x20-\x7E]/g, '_');
      const encodedName = encodeURIComponent(filename);
      return {
        status: 200,
        binary: {
          bytes,
          contentType,
          disposition: `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
        },
      };
    }

    if (pathname === '/api/mail/send' && method === 'POST') {
      const account = requireAccount(env, body?.account);
      const mode = ['new', 'reply', 'replyAll', 'forward'].includes(String(body.mode))
        ? String(body.mode)
        : 'new';

      const ownAddress = account.address.toLowerCase();
      const stripOwn = (list) => list.filter((email) => email.toLowerCase() !== ownAddress);

      let to = readRecipients(body.to, 'to');
      let cc = readRecipients(body.cc, 'cc');
      const bcc = readRecipients(body.bcc, 'bcc');

      if (mode === 'reply' || mode === 'replyAll') {
        to = stripOwn(to);
        cc = stripOwn(cc);
      }
      if (!to.length && !cc.length && !bcc.length) {
        throw new MailError(400, 'Informe ao menos um destinatário.', 'VALIDATION');
      }

      const subject = readOptionalString(body.subject, 'subject', 900);
      const text = readOptionalString(body.text, 'text', 200000);
      const html = readOptionalString(body.html, 'html', 400000);
      if (!text && !html) throw new MailError(400, 'Escreva o conteúdo da mensagem.', 'VALIDATION');

      const attachments = readAttachments(body.attachments);
      const payload = { to, subject, text, html };
      if (cc.length) payload.cc = cc;
      if (bcc.length) payload.bcc = bcc;
      if (attachments.length) payload.attachments = attachments;

      const refFolder = body.refFolder !== undefined && body.refFolder !== null && body.refFolder !== ''
        ? readFolder(body.refFolder)
        : undefined;

      if (body.inReplyToUid !== undefined && body.inReplyToUid !== null && body.inReplyToUid !== '') {
        if (!refFolder) throw new MailError(400, 'Pasta da mensagem original ausente.', 'VALIDATION');
        payload.inReplyTo = { uid: readUid(body.inReplyToUid), folder: refFolder };
      } else if (body.forwardOfUid !== undefined && body.forwardOfUid !== null && body.forwardOfUid !== '') {
        if (!refFolder) throw new MailError(400, 'Pasta da mensagem original ausente.', 'VALIDATION');
        payload.forwardOf = { uid: readUid(body.forwardOfUid), folder: refFolder };
      }

      if (account.adapter === 'imap-smtp') {
        if (body.inReplyToUid !== undefined && body.inReplyToUid !== null && body.inReplyToUid !== '') {
          const original = await yahooGetMessage(env, readFolder(body.refFolder), readUid(body.inReplyToUid), account.provider);
          payload.inReplyToMessageId = original?.message?.messageId || '';
          payload.references = original?.message?.messageId || '';
        }
        await yahooSend(env, payload, account.provider);
      } else {
        const box = await getMailbox(env);
        await hf(env, `/mailboxes/${box.resourceId}/send`, { method: 'POST', body: JSON.stringify(payload) });
      }

      return { status: 200, json: { success: true, account: account.id, mode } };
    }

    if (pathname === '/api/mail/flags' && method === 'POST') {
      const account = requireAccount(env, body?.account);
      const folder = readFolder(body.folder);
      const uids = readUidList(body.uids);
      const addFlags = readFlagList(body.addFlags, 'addFlags');
      const removeFlags = readFlagList(body.removeFlags, 'removeFlags');
      if (!addFlags.length && !removeFlags.length) {
        throw new MailError(400, 'Nenhuma marcação informada.', 'VALIDATION');
      }

      if (account.adapter === 'imap-smtp') {
        const result = await yahooUpdateFlags(env, folder, uids, addFlags, removeFlags, account.provider);
        return { status: 200, json: { success: true, folder, result } };
      }

      const box = await getMailbox(env);
      const result = await hf(
        env,
        `/mailboxes/${box.resourceId}/folders/${enc(folder)}/messages/flags`,
        { method: 'POST', body: JSON.stringify({ uids, addFlags, removeFlags }) }
      );
      return { status: 200, json: { success: true, folder, result: result ?? null } };
    }

    if (pathname === '/api/mail/move' && method === 'POST') {
      const account = requireAccount(env, body?.account);
      const folder = readFolder(body.folder);
      const uids = readUidList(body.uids);
      const targetFolder = readFolder(body.targetFolder);

      if (account.adapter === 'imap-smtp') {
        const result = await yahooMoveMessages(env, folder, uids, targetFolder, account.provider);
        return { status: 200, json: { success: true, folder, targetFolder, result } };
      }

      const box = await getMailbox(env);
      const result = await hf(
        env,
        `/mailboxes/${box.resourceId}/folders/${enc(folder)}/messages/move`,
        { method: 'POST', body: JSON.stringify({ uids, targetFolder }) }
      );
      return {
        status: 200,
        json: { success: true, folder, targetFolder, result: result ?? null },
      };
    }

    if (pathname === '/api/mail/delete' && method === 'POST') {
      const account = requireAccount(env, body?.account);
      const folder = readFolder(body.folder);
      const uids = readUidList(body.uids);
      const permanent = body.permanent === true;
      if (account.adapter === 'imap-smtp') {
        const result = await yahooDeleteMessages(env, folder, uids, permanent, account.provider);
        return { status: 200, json: { success: true, mode: result?.movedToTrash ? 'trash' : 'permanent', folder, ...(result?.targetFolder ? { targetFolder: result.targetFolder } : {}), result } };
      }
      const box = await getMailbox(env);

      if (!permanent) {
        const trashFolder = await resolveTrashFolder(env);
        const isInTrash = trashFolder !== null && trashFolder.toLowerCase() === folder.toLowerCase();
        if (trashFolder && !isInTrash) {
          const result = await hf(
            env,
            `/mailboxes/${box.resourceId}/folders/${enc(folder)}/messages/move`,
            { method: 'POST', body: JSON.stringify({ uids, targetFolder: trashFolder }) }
          );
          return {
            status: 200,
            json: { success: true, mode: 'trash', folder, targetFolder: trashFolder, result: result ?? null },
          };
        }
      }

      const result = await hf(
        env,
        `/mailboxes/${box.resourceId}/folders/${enc(folder)}/messages/delete`,
        { method: 'POST', body: JSON.stringify({ uids }) }
      );
      return { status: 200, json: { success: true, mode: 'permanent', folder, result: result ?? null } };
    }

    if (pathname === '/api/mail/draft' && method === 'POST') {
      const account = requireAccount(env, body?.account);
      const to = readRecipients(body?.to, 'to');
      const cc = readRecipients(body?.cc, 'cc');
      const subject = readOptionalString(body?.subject, 'subject', 900);
      const text = readOptionalString(body?.text, 'text', 200000);
      const html = readOptionalString(body?.html, 'html', 400000);
      const attachments = readAttachments(body?.attachments);
      const replaceUid = body?.replaceUid ? readUid(body.replaceUid) : undefined;
      const result = await yahooSaveDraft(
        env,
        { to, cc, subject, text, html, attachments, replaceUid },
        account.provider
      );
      return { status: 200, json: { success: true, account: account.id, ...result } };
    }

    if (pathname === '/api/mail/contacts' && method === 'GET') {
      return { status: 200, json: { success: true, contacts: loadMailContacts() } };
    }

    if (pathname === '/api/mail/contacts' && method === 'POST') {
      const action = readString(body?.action || 'save', 'action', 30);
      const current = loadMailContacts();
      if (action === 'delete') {
        const id = readString(body?.id, 'id', 120);
        const next = current.filter((c) => c.id !== id);
        saveMailContacts(next);
        return { status: 200, json: { success: true, contacts: next } };
      }
      const email = readString(body?.email, 'email', 320).toLowerCase();
      if (!EMAIL_RE.test(email)) throw new MailError(400, 'Endereço de e-mail inválido.', 'VALIDATION');
      const name = readOptionalString(body?.name, 'name', 160) || email.split('@')[0];
      const avatarUrl = readOptionalString(body?.avatarUrl, 'avatarUrl', 1000);
      const notes = readOptionalString(body?.notes, 'notes', 500);
      const id = readOptionalString(body?.id, 'id', 120) || `ct_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const existingIdx = current.findIndex((c) => c.id === id || String(c.email || '').toLowerCase() === email);
      const record = {
        id: existingIdx >= 0 ? current[existingIdx].id : id,
        name,
        email,
        avatarUrl,
        notes,
        source: 'admin',
        updatedAt: new Date().toISOString(),
      };
      if (existingIdx >= 0) {
        current[existingIdx] = record;
      } else {
        current.unshift(record);
      }
      saveMailContacts(current);
      return { status: 200, json: { success: true, contact: record, contacts: current } };
    }

    return { status: 404, json: { success: false, error: `Rota não encontrada: ${pathname}` } };
  } catch (error) {
    if (error instanceof MailError) {
      return {
        status: error.status,
        json: { success: false, error: error.message, ...(error.code ? { code: error.code } : {}) },
      };
    }
    console.error('[LocalMailApi] erro:', error instanceof Error ? error.message : error);
    return {
      status: Number.isInteger(error?.status) ? error.status : 500,
      json: { success: false, error: error instanceof Error ? error.message : 'Erro interno ao processar a solicitação de e-mail.' },
    };
  }
}
