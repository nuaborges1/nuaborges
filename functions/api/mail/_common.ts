/**
 * Contratos comuns do módulo E-mails — Cloudflare Pages Functions.
 *
 * As rotas locais aceitam o processo de desenvolvimento; em produção, exigem
 * uma sessão administrativa assinada e válida.
 *
 * Nenhum segredo é aceito vindos do cliente. Credenciais, endereço remetente e
 * identificadores de caixa vêm exclusivamente do registro de contas abaixo.
 */

import { getSessionCookie, parseAndVerifySessionToken } from '../_authHelper';

export type MailAccountId = 'profissional' | 'pessoal';

export interface MailAccountDef {
  id: MailAccountId;
  label: string;
  address: string;
  provider: 'hostinger' | 'yahoo';
  adapter: 'hostinger-api' | 'imap-smtp';
  /** Motivo exibido ao usuário quando a conta ainda não está disponível. */
  pendingReason?: string;
}

/**
 * Registro FIXO das caixas do módulo. Contas totalmente independentes:
 * sem caixa unificada, sem pasta compartilhada e sem identidade de envio cruzada.
 */
export const MAIL_ACCOUNTS: MailAccountDef[] = [
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
    pendingReason: 'Configure a senha de aplicativo do Yahoo no ambiente.',
  },
];

export function resolveMailAccount(value: unknown): MailAccountDef | null {
  if (typeof value !== 'string') return null;
  const candidate = value.trim().toLowerCase();
  const needle = candidate === 'professional' ? 'profissional' : candidate;
  return MAIL_ACCOUNTS.find((account) => account.id === needle) || null;
}

/** Disponibilidade por conta — sem expor nenhum valor de credencial. */
export function isAccountReady(env: any, account: MailAccountDef): boolean {
  if (account.provider === 'hostinger') {
    return Boolean(env?.SMTP_PASS || env?.HOSTINGER_EMAIL_PASS || env?.HOSTINGER_EMAIL_PASSWORD || env?.HOSTINGER_MAIL_API_KEY);
  }
  return Boolean(env?.YAHOO_EMAIL && env?.YAHOO_APP_PASSWORD);
}

/** Lança 503 amigável quando a conta não está pronta neste ambiente. */
export function assertAccountAvailable(env: any, account: MailAccountDef): void {
  if (!isAccountReady(env, account)) {
    throw new MailError(
      503,
      account.provider === 'hostinger'
        ? 'Caixa profissional não configurada: credenciais da Hostinger ausentes no ambiente.'
        : account.pendingReason || 'Caixa pessoal (Yahoo) não configurada no ambiente.',
      'ACCOUNT_UNAVAILABLE'
    );
  }
}

/** Resolve e valida a conta informada pelo cliente (enum fechado). */
export function requireAccount(env: any, value: unknown): MailAccountDef {
  const account = resolveMailAccount(value);
  if (!account) {
    throw new MailError(400, 'Conta de e-mail inválida.', 'VALIDATION');
  }
  assertAccountAvailable(env, account);
  return account;
}

export class MailError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'MailError';
    this.status = status;
    this.code = code;
  }
}

export function json(
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      ...headers,
    },
  });
}

export function ok(payload: Record<string, unknown>): Response {
  return json(200, { success: true, ...payload });
}

export function fail(status: number, error: string, code?: string): Response {
  return json(status, code ? { success: false, error, code } : { success: false, error });
}

/** Localhost para desenvolvimento; sessão administrativa válida em produção. */
export function isLocalRequest(request: Request): boolean {
  try {
    const host = new URL(request.url).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  } catch {
    return false;
  }
}

export async function rejectIfNotLocal(request: Request, env: any): Promise<Response | null> {
  if (isLocalRequest(request)) return null;
  const authorization = request.headers.get('Authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : getSessionCookie(request);
  const secret = env?.ADMIN_API_SECRET || env?.ADMIN_PASSWORD;
  if (!token || !secret) return fail(401, 'Autenticação necessária.', 'UNAUTHORIZED');
  const session = await parseAndVerifySessionToken(token, secret);
  if (!session || !['admin', 'dev', 'client'].includes(session.role)) {
    return fail(401, 'Sessão administrativa inválida ou expirada.', 'UNAUTHORIZED');
  }
  return null;
}

/**
 * Envelope único de erro: nenhuma pilha, nenhum corpo de mensagem e nenhuma
 * credencial chegam ao cliente. Erros do provedor são traduzidos em MensError.
 */
export async function runMailHandler(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof MailError) {
      return fail(error.status, error.message, error.code);
    }
    console.error('[mail] erro interno:', error instanceof Error ? error.message : String(error));
    return fail(500, 'Erro interno ao processar a solicitação de e-mail.');
  }
}

/** Lê o corpo JSON com limite de tamanho (anexos em base64 podem ser grandes). */
export async function readJsonBody(request: Request, maxBytes = 12 * 1024 * 1024): Promise<any> {
  const declared = Number(request.headers.get('Content-Length') || '0');
  if (declared > maxBytes) {
    throw new MailError(413, 'Conteúdo acima do tamanho permitido.', 'PAYLOAD_TOO_LARGE');
  }
  const raw = await request.text();
  if (raw.length > maxBytes) {
    throw new MailError(413, 'Conteúdo acima do tamanho permitido.', 'PAYLOAD_TOO_LARGE');
  }
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new MailError(400, 'Corpo da requisição inválido.', 'VALIDATION');
  }
}

/* ---------------------------------- Validação ---------------------------------- */

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

export function readString(value: unknown, field: string, max = 1000): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new MailError(400, `Campo obrigatório: ${field}.`, 'VALIDATION');
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new MailError(400, `Campo muito longo: ${field}.`, 'VALIDATION');
  }
  if (CONTROL_CHARS.test(trimmed)) {
    throw new MailError(400, `Valor inválido no campo ${field}.`, 'VALIDATION');
  }
  return trimmed;
}

export function readOptionalString(value: unknown, field: string, max = 1000): string {
  if (value === undefined || value === null || value === '') return '';
  return readString(value, field, max);
}

/** Caminho de pasta IMAP: sem quebras de linha e sem caracteres de controle. */
export function readFolder(value: unknown): string {
  const folder = readString(value, 'folder', 200);
  if (!/^[A-Za-z0-9 ._\-/\\[\]]+$/.test(folder)) {
    throw new MailError(400, 'Caminho de pasta inválido.', 'VALIDATION');
  }
  return folder;
}

export function readUid(value: unknown): number {
  const uid = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(uid) || uid < 1) {
    throw new MailError(400, 'Identificador de mensagem inválido.', 'VALIDATION');
  }
  return uid;
}

/** Lista de UIDs (1–100), alinhada ao limite dos endpoints em lote da Hostinger. */
export function readUidList(value: unknown): number[] {
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

export function readRecipients(value: unknown, field: string, max = 50): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new MailError(400, `Campo inválido: ${field}.`, 'VALIDATION');
  }
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

export function readFlagList(value: unknown, field: string): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new MailError(400, `Campo inválido: ${field}.`, 'VALIDATION');
  }
  const allowed = new Set(['\\Seen', '\\Flagged', '\\Answered', '\\Deleted', '\\Draft', '$forwarded']);
  return value.map((item) => {
    if (typeof item !== 'string' || !allowed.has(item)) {
      throw new MailError(400, `Flag não permitida em ${field}.`, 'VALIDATION');
    }
    return item;
  });
}

export function readPage(value: unknown): number {
  const page = Number.parseInt(String(value ?? '1'), 10);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

export function readPerPage(value: unknown): number {
  const perPage = Number.parseInt(String(value ?? '25'), 10);
  if (!Number.isInteger(perPage)) return 25;
  return Math.min(Math.max(perPage, 1), 100);
}
