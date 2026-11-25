/**
 * Sanitização server-side do HTML de mensagens recebidas (módulo E-mails).
 *
 * Objetivo: nenhum conteúdo de terceiros execute código no documento do painel
 * (o token administrativo vive em localStorage — ver dossiê técnico, seção 16).
 *
 * Camadas de defesa:
 *   1. Esta allowlist de tags/atributos (aqui, no servidor).
 *   2. <iframe sandbox> no frontend (sem allow-same-origin).
 *   3. CSP opcional do painel (não implementada nesta etapa).
 *
 * ATENÇÃO — ESPELHO: tools/localMailApi.mjs contém uma cópia desta função para o
 * servidor local de desenvolvimento (Node puro). Alterações aqui devem ser
 * repetidas lá; tests/mailSanitize.test.mjs executa as duas e compara os resultados.
 */

const GLOBAL_ATTRS = ['title', 'dir', 'lang', 'style', 'bgcolor', 'background'];

/** Tags permitidas e seus atributos aceitos. Qualquer outra tag é removida. */
const ALLOWED_ATTRS: Record<string, string[]> = {
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

/**
 * Tags cujo CONTEÚDO também é descartado (podem conter código ou recursos
 * remotos que não devem ser resolvidos).
 */
const DROP_CONTENT_RE =
  /<(script|style|iframe|object|embed|template|noscript|svg|math|applet|link|meta|base|frame|frameset|portal|audio|video|source|track|head|title)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const DROP_OPEN_ONLY_RE =
  /<(script|style|iframe|object|embed|template|noscript|svg|math|applet|link|meta|base|frame|frameset|portal|audio|video|source|track|head|title)\b[^>]*\/?>/gi;

const TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
const ATTR_RE =
  /(?:^|\s)([a-zA-Z_:][a-zA-Z0-9_:.-]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g;

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
const ENUM_ATTRS: Record<string, string[]> = {
  align: ['left', 'center', 'right', 'justify', 'middle', 'top', 'bottom'],
  valign: ['top', 'middle', 'bottom', 'baseline'],
  dir: ['ltr', 'rtl', 'auto'],
  type: ['disc', 'circle', 'square', 'decimal', 'lower-alpha', 'upper-alpha', 'lower-roman', 'upper-roman'],
};

const ALLOWED_SCHEMES = new Set(['http', 'https', 'mailto', 'cid', 'tel', 'ftp']);

const NAMED_ENTITIES: Record<string, string> = {
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

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi, (match, body: string) => {
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

/** Devolve a URL quando segura, ou null quando o esquema não é permitido. */
export function sanitizeUrl(raw: string, blockRemoteImages = false): string | null {
  const decoded = decodeEntities(String(raw));
  // Cópia sem espaços/controles apenas para inspecionar o esquema:
  // bloqueia "java\tscript:", "&#106;avascript:" etc.
  const probe = decoded.replace(/[\u0000-\u0020\u007F]/g, '').toLowerCase();
  const schemeMatch = /^([a-z][a-z0-9+.-]*):/.exec(probe);
  const clean = decoded.replace(/[\u0000-\u001F\u007F]/g, '');

  if (!schemeMatch) {
    // Bloqueia URLs protocol-relative (//tracker.com/pixel) e relativas (/...) em imagens/fundos remotos
    if (blockRemoteImages && (probe.startsWith('//') || probe.startsWith('/'))) {
      return null;
    }
    return clean;
  }

  const scheme = schemeMatch[1];
  if (!ALLOWED_SCHEMES.has(scheme)) return null;
  if (blockRemoteImages && (scheme === 'http' || scheme === 'https')) return null;
  return clean;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeText(value: string): string {
  return value.replace(/</g, '&lt;');
}

function sanitizeInlineStyle(raw: string, blockRemoteImages: boolean): string | null {
  // Remove barras invertidas para neutralizar escapes CSS (\75 rl, \65 xpression)
  const cleaned = raw.replace(/[\u0000-\u001F\u007F\\]/g, '').trim();
  if (!cleaned) return null;
  if (/expression\s*\(|javascript\s*:|vbscript\s*:|-moz-binding|behavior\s*:/i.test(cleaned)) {
    return null;
  }
  if (blockRemoteImages && /url\s*\(/i.test(cleaned)) {
    return cleaned.replace(/url\s*\([^)]*\)/gi, 'none');
  }
  return cleaned.slice(0, 2000);
}

function sanitizeAttributeValue(
  tagName: string,
  attrName: string,
  rawValue: string,
  blockRemoteImages: boolean
): string | null {
  const value = decodeEntities(rawValue).replace(/^["']|["']$/g, '');

  if (attrName === 'href' || attrName === 'src' || attrName === 'cite' || attrName === 'background') {
    const safe = sanitizeUrl(value, (attrName === 'src' || attrName === 'background') && blockRemoteImages);
    return safe;
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

  if (attrName === 'title') {
    return value.slice(0, 200);
  }

  // Rede de segurança: valor longo demais é descartado.
  if (value.length > 500) return null;
  return value;
}

export interface SanitizeOptions {
  /** Bloqueia imagens remotas (pixels de rastreamento) por padrão. */
  blockRemoteImages?: boolean;
}

export function sanitizeEmailHtml(input: unknown, options: SanitizeOptions = {}): string {
  if (typeof input !== 'string' || !input) return '';
  const blockRemoteImages = options.blockRemoteImages !== false;

  let html = input;
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  html = html.replace(/<![^>]*>/g, '');
  html = html.replace(DROP_CONTENT_RE, '');
  html = html.replace(DROP_OPEN_ONLY_RE, '');

  const out: string[] = [];
  const stack: string[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
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

    if (!allowedAttrs) continue; // tag desconhecida/perigosa: removida por completo

    if (isClosing) {
      const idx = stack.lastIndexOf(tagName);
      if (idx === -1) continue;
      while (stack.length > idx) {
        out.push(`</${stack.pop()}>`);
      }
      continue;
    }

    const attrs: string[] = [];
    let forcedTarget = false;
    ATTR_RE.lastIndex = 0;
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = ATTR_RE.exec(attrSource)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      if (!allowedAttrs.includes(attrName)) continue;
      if (attrMatch[2] === undefined) continue; // atributo sem valor: descartado

      const value = sanitizeAttributeValue(tagName, attrName, attrMatch[2], blockRemoteImages);
      if (value === null) continue;
      attrs.push(`${attrName}="${escapeAttribute(value)}"`);
      if (tagName === 'a' && attrName === 'href') forcedTarget = true;
    }

    if (tagName === 'a' && forcedTarget) {
      // Links sempre em nova aba (o sandbox permite apenas popups de gesto do usuário).
      attrs.push('target="_blank"', 'rel="noopener noreferrer"');
    }

    const attrText = attrs.length ? ` ${attrs.join(' ')}` : '';
    out.push(`<${tagName}${attrText}>`);

    if (!VOID_TAGS.has(tagName)) {
      stack.push(tagName);
    }
  }

  if (cursor < html.length) {
    out.push(escapeText(html.slice(cursor)));
  }

  while (stack.length) {
    out.push(`</${stack.pop()}>`);
  }

  return out.join('');
}
