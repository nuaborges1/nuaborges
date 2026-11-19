/**
 * Adaptador da Hostinger Mail API (api.mail.hostinger.com) — módulo E-mails.
 *
 * API REST autenticada por Bearer token (hPanel → Agentic Mail → API access).
 * IMPORTANTE: esta API é SEPARADA da API geral da Hostinger (developers.hostinger.com)
 * usada em scripts de DNS — os tokens não são interoperáveis.
 *
 * A conta profissional é a única que usa este adaptador nesta etapa.
 */

import { MailError } from './_common.ts';

const BASE_URL = 'https://api.mail.hostinger.com/api/v1';
const hostingerMailApiKey = (env: any) => env?.HOSTINGER_MAIL_API_KEY;
const HOSTINGER_REQUEST_TIMEOUT_MS = 12_000;

/** Conta profissional registrada no módulo. */
const PROFESSIONAL_ADDRESS = 'contato@nuaborges.com.br';

interface MailboxCache {
  resourceId: string;
  address: string;
  at: number;
}

// Cache por isolate (evita um GET /me a cada requisição).
let mailboxCache: MailboxCache | null = null;
const MAILBOX_TTL_MS = 10 * 60 * 1000;

export class HostingerApiError extends MailError {
  constructor(status: number, message: string, code?: string) {
    super(status, message, code);
    this.name = 'HostingerApiError';
  }
}

function mapStatusToMessage(status: number, upstream: string): string {
  if (status === 401) return 'Token da Hostinger inválido ou revogado.';
  if (status === 403) return 'Token sem permissão para esta caixa de e-mail.';
  if (status === 404) return 'Recurso não encontrado na Hostinger. Verifique a caixa e a rota solicitada.';
  if (status === 422) return 'A Hostinger recusou os dados enviados.';
  if (status === 429) return 'Muitas requisições para a Hostinger. Aguarde alguns segundos.';
  if (status >= 500) return 'A Hostinger está indisponível no momento. Tente novamente.';
  return upstream || 'Não foi possível concluir a operação de e-mail.';
}

function findNetworkCauseCode(error: unknown): string | null {
  const pending: any[] = [error];
  const seen = new Set<any>();
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

function sanitizeProviderError(raw: string, token: string): string {
  return raw
    .replaceAll(token, '[credencial ocultada]')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

async function request(
  env: any,
  path: string,
  init: RequestInit = {}
): Promise<any> {
  const token = hostingerMailApiKey(env);
  if (!token) {
    throw new HostingerApiError(
      503,
      'Caixa profissional não configurada (token da Hostinger ausente).',
      'MAIL_TOKEN_MISSING'
    );
  }

  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HOSTINGER_REQUEST_TIMEOUT_MS);
  try {
    response = await fetch(`${BASE_URL}${path}`, {
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
      throw new HostingerApiError(504, 'A Hostinger Mail API excedeu o limite de 12 segundos.', 'MAIL_UPSTREAM_TIMEOUT');
    }
    const causeCode = findNetworkCauseCode(error);
    if (causeCode === 'EACCES' || causeCode === 'EPERM') {
      throw new HostingerApiError(502, `O ambiente bloqueou a conexão de saída com a Hostinger Mail API (${causeCode}).`, 'MAIL_EGRESS_BLOCKED');
    }
    if (causeCode === 'ENOTFOUND' || causeCode === 'EAI_AGAIN') {
      throw new HostingerApiError(502, `Falha ao resolver o endereço da Hostinger Mail API (${causeCode}).`, 'MAIL_DNS_FAILED');
    }
    if (causeCode === 'ECONNREFUSED') {
      throw new HostingerApiError(502, 'A conexão com a Hostinger Mail API foi recusada (ECONNREFUSED).', 'MAIL_CONNECTION_REFUSED');
    }
    if (causeCode === 'ETIMEDOUT' || causeCode === 'UND_ERR_CONNECT_TIMEOUT') {
      throw new HostingerApiError(504, `A conexão com a Hostinger Mail API excedeu o tempo limite (${causeCode}).`, 'MAIL_UPSTREAM_TIMEOUT');
    }
    const safeCause = causeCode || (error instanceof Error ? error.name : 'erro desconhecido');
    throw new HostingerApiError(502, `Falha de conexão com a Hostinger Mail API (${safeCause}).`, 'MAIL_CONNECTION_FAILED');
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 204) return null;

  const raw = await response.text();
  let payload: any = null;
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
    throw new HostingerApiError(
      response.status,
      detail ? `${message} Resposta da Hostinger: ${detail}` : message,
      typeof payload?.code === 'string' ? payload.code : undefined
    );
  }

  return payload;
}

/** Descobre e cacheia o resourceId da caixa profissional (GET /me). */
export async function getProfessionalMailbox(env: any): Promise<{ resourceId: string; address: string }> {
  if (mailboxCache && Date.now() - mailboxCache.at < MAILBOX_TTL_MS) {
    return mailboxCache;
  }

  const me = await request(env, '/me');
  const mailboxes: any[] = Array.isArray(me?.data?.mailboxes) ? me.data.mailboxes : [];
  const box =
    mailboxes.find(
      (item) => String(item?.address || '').toLowerCase() === PROFESSIONAL_ADDRESS
    ) || mailboxes[0];

  if (!box || typeof box.resourceId !== 'string') {
    throw new HostingerApiError(
      404,
      'Nenhuma caixa de e-mail disponível para o token configurado.',
      'MAILBOX_NOT_FOUND'
    );
  }

  mailboxCache = { resourceId: box.resourceId, address: String(box.address || ''), at: Date.now() };
  return mailboxCache;
}

/** Reinicia o cache (usado em testes locais). */
export function resetMailboxCache(): void {
  mailboxCache = null;
}

function encodeFolder(folder: string): string {
  return encodeURIComponent(folder);
}

export async function listFolders(env: any): Promise<{ data: any[]; pagination: any }> {
  const box = await getProfessionalMailbox(env);
  const payload = await request(
    env,
    `/mailboxes/${box.resourceId}/folders?page=1&perPage=100`
  );
  return {
    data: Array.isArray(payload?.data) ? payload.data : [],
    pagination: payload?.pagination || null,
  };
}

export async function listMessages(
  env: any,
  folder: string,
  page: number,
  perPage: number
): Promise<{ data: any[]; pagination: any }> {
  const box = await getProfessionalMailbox(env);
  const payload = await request(
    env,
    `/mailboxes/${box.resourceId}/folders/${encodeFolder(folder)}/messages` +
      `?page=${page}&perPage=${perPage}&sort=-uid`
  );
  return {
    data: Array.isArray(payload?.data) ? payload.data : [],
    pagination: payload?.pagination || null,
  };
}

export async function searchMessages(
  env: any,
  folder: string,
  query: string,
  page: number,
  perPage: number
): Promise<{ data: any[]; pagination: any }> {
  const box = await getProfessionalMailbox(env);
  const payload = await request(
    env,
    `/mailboxes/${box.resourceId}/folders/${encodeFolder(folder)}/messages/search` +
      `?page=${page}&perPage=${perPage}&sort=-uid`,
    {
      method: 'POST',
      body: JSON.stringify({
        subject: query,
        from: query,
        to: query,
        body: query,
      }),
    }
  );
  return {
    data: Array.isArray(payload?.data) ? payload.data : [],
    pagination: payload?.pagination || null,
  };
}

export async function getMessage(env: any, folder: string, uid: number): Promise<any> {
  const box = await getProfessionalMailbox(env);
  const payload = await request(
    env,
    `/mailboxes/${box.resourceId}/folders/${encodeFolder(folder)}/messages/${uid}`
  );
  return payload?.data || null;
}

export async function getMessageText(
  env: any,
  folder: string,
  uid: number
): Promise<{ text: string; html: string }> {
  const box = await getProfessionalMailbox(env);
  const payload = await request(
    env,
    `/mailboxes/${box.resourceId}/folders/${encodeFolder(folder)}/messages/${uid}/text`
  );
  return {
    text: typeof payload?.data?.text === 'string' ? payload.data.text : '',
    html: typeof payload?.data?.html === 'string' ? payload.data.html : '',
  };
}

export interface AttachmentDownload {
  bytes: ArrayBuffer;
  contentType: string;
}

export async function downloadAttachment(
  env: any,
  folder: string,
  uid: number,
  attachmentId: string
): Promise<AttachmentDownload> {
  const box = await getProfessionalMailbox(env);
  const token = hostingerMailApiKey(env);
  if (!token) {
    throw new HostingerApiError(503, 'Caixa profissional não configurada.', 'MAIL_TOKEN_MISSING');
  }

  const url =
    `${BASE_URL}/mailboxes/${box.resourceId}/folders/${encodeFolder(folder)}` +
    `/messages/${uid}/attachments/${encodeURIComponent(attachmentId)}`;

  let response: Response;
  try {
    response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new HostingerApiError(504, 'Falha de conexão com a Hostinger.', 'MAIL_UPSTREAM_TIMEOUT');
  }

  if (!response.ok) {
    const raw = await response.text();
    let payload: any = null;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {}
    const upstream = typeof payload?.error === 'string' ? payload.error : '';
    throw new HostingerApiError(
      response.status,
      mapStatusToMessage(response.status, upstream),
      typeof payload?.code === 'string' ? payload.code : undefined
    );
  }

  return {
    bytes: await response.arrayBuffer(),
    contentType: response.headers.get('Content-Type') || 'application/octet-stream',
  };
}

export interface SendPayload {
  to: string[];
  cc?: string[];
  bcc?: string[];
  displayName?: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
    cid?: string;
  }>;
  inReplyTo?: { uid: number; folder: string };
  forwardOf?: { uid: number; folder: string };
}

/** POST /mailboxes/{id}/send — devolve 204 quando aceita para entrega. */
export async function sendEmail(env: any, payload: SendPayload): Promise<void> {
  const box = await getProfessionalMailbox(env);
  await request(env, `/mailboxes/${box.resourceId}/send`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateFlags(
  env: any,
  folder: string,
  uids: number[],
  addFlags: string[],
  removeFlags: string[]
): Promise<any> {
  const box = await getProfessionalMailbox(env);
  return request(
    env,
    `/mailboxes/${box.resourceId}/folders/${encodeFolder(folder)}/messages/flags`,
    {
      method: 'POST',
      body: JSON.stringify({ uids, addFlags, removeFlags }),
    }
  );
}

export async function moveMessages(
  env: any,
  folder: string,
  uids: number[],
  targetFolder: string
): Promise<any> {
  const box = await getProfessionalMailbox(env);
  return request(
    env,
    `/mailboxes/${box.resourceId}/folders/${encodeFolder(folder)}/messages/move`,
    {
      method: 'POST',
      body: JSON.stringify({ uids, targetFolder }),
    }
  );
}

export async function deleteMessages(
  env: any,
  folder: string,
  uids: number[]
): Promise<any> {
  const box = await getProfessionalMailbox(env);
  return request(
    env,
    `/mailboxes/${box.resourceId}/folders/${encodeFolder(folder)}/messages/delete`,
    {
      method: 'POST',
      body: JSON.stringify({ uids }),
    }
  );
}
