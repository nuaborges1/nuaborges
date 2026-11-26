/**
 * Mercado Pago API Engine — Nua Borges Platform
 *
 * Provê integração oficial para pagamentos Pix em tempo real:
 * - Emissão de Pix oficial EMVCo com QR Code base64 e Copia e Cola
 * - Suporte a modo de homologação restrito a ambiente de desenvolvimento local
 * - Consulta de status oficial para prevenção de race conditions
 * - Idempotência estrita via chave estável por transação
 */

import {
  assertMercadoPagoEnvironmentSafety,
  resolveRuntimeEnvironment,
  resolveValidatedMercadoPagoWebhookUrl,
} from './_central/environment';
import { getNuaIdAdapter } from './id/_nuaIdStore';

const verifiedTestUserCache = new Map<string, { accountId: string; verifiedAt: number }>();

export function resetMercadoPagoSandboxCacheForTests(): void {
  verifiedTestUserCache.clear();
}

/**
 * Em staging com credencial `APP_USR-` (Usuário de Teste do Mercado Pago), consulta
 * `GET /users/me` e exige prova real de que a conta é um usuário de teste (`tags` contém
 * `"test_user"`), bloqueando fail-closed qualquer token de conta real produtiva.
 */
export async function verifyMercadoPagoSandboxAccount(
  env: any,
  token: string
): Promise<{ accountId: string; isTestUser: boolean }> {
  const cached = verifiedTestUserCache.get(token);
  if (cached && Date.now() - cached.verifiedAt < 10 * 60_000) {
    return { accountId: cached.accountId, isTestUser: true };
  }

  const res = await fetch('https://api.mercadopago.com/users/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(
      `[ENV_ISOLATION] Falha ao verificar identidade da conta Mercado Pago em /users/me (HTTP ${res.status}); operação bloqueada em staging (fail-closed).`
    );
  }
  const me: any = await res.json().catch(() => null);
  const accountId = String(me?.id || '').trim();
  const tags: string[] = Array.isArray(me?.tags) ? me.tags.map((t: unknown) => String(t).toLowerCase()) : [];
  const isTestUser = tags.includes('test_user');

  if (!accountId || !isTestUser) {
    throw new Error(
      '[ENV_ISOLATION] Token APP_USR- pertence a uma conta REAL de produção no Mercado Pago (tag "test_user" ausente em /users/me). Operação bloqueada em staging!'
    );
  }

  const expectedTestId = String(env?.MP_TEST_USER_ACCOUNT_ID || '').trim();
  if (expectedTestId && accountId !== expectedTestId) {
    throw new Error(
      `[ENV_ISOLATION] Conta Mercado Pago autenticada (${accountId}) difere de MP_TEST_USER_ACCOUNT_ID (${expectedTestId}).`
    );
  }

  const forbiddenProdId = String(env?.MP_FORBIDDEN_PROD_ACCOUNT_ID || '').trim();
  if (forbiddenProdId && accountId === forbiddenProdId) {
    throw new Error(
      '[ENV_ISOLATION] Conta Mercado Pago autenticada corresponde ao ID proibido de produção.'
    );
  }

  verifiedTestUserCache.set(token, { accountId, verifiedAt: Date.now() });
  return { accountId, isTestUser: true };
}

export interface CreatePixOptions {
  amount: number;
  description: string;
  payerEmail?: string;
  payerName?: string;
  externalReference: string;
  /** @deprecated Ignorado em runtime: o destino do webhook é resolvido exclusivamente pelo backend validado. */
  notificationUrl?: string;
  dateOfExpiration?: string;
  idempotencyKey?: string;
}

export interface MercadoPagoPixResult {
  success: boolean;
  id: string | number;
  qrCode: string;
  qrCodeBase64: string;
  amount: number;
  status: string;
  isTestMode: boolean;
  externalReference: string;
  expiresAt?: string;
}

export const PACK_PIX_EXPIRATION_MS = 2 * 60 * 60 * 1000;
export const PERSONALIZADO_PIX_EXPIRATION_MS = 2 * 60 * 60 * 1000;

/**
 * Gera descrição 100% neutra e discreta para cobranças Pix no Mercado Pago,
 * sem expor nome artístico, categoria do serviço ou título do conteúdo.
 */
export function buildDiscreetPaymentDescription(referenceId: string, env?: any): string {
  const rawPrefix = String(env?.MP_DISCREET_DESCRIPTION_PREFIX || 'NB Servicos Digitais')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ._-]/g, '')
    .trim()
    .slice(0, 36);
  const prefix = rawPrefix || 'NB Servicos Digitais';
  const cleanRef = String(referenceId || '')
    .replace(/^(nua_)?(ord|app|apt|book|ped|pers|pack|vip)_/i, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-8)
    .toUpperCase();
  return cleanRef ? `${prefix} - Ref. ${cleanRef}` : prefix;
}

/**
 * Resolve e-mail fallback neutro para o campo obrigatório `payer.email` no Mercado Pago
 * quando o comprador não informou e-mail no momento da emissão do Pix.
 */
export function resolveFallbackPayerEmail(env?: any): string {
  const configured = String(env?.MP_FALLBACK_PAYER_EMAIL || '').trim();
  if (configured && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(configured)) {
    return configured;
  }
  return 'pagamentos@nuaborges.com.br';
}

/**
 * Formata timestamp ISO-8601 no formato exigido pela API de Payments do Mercado Pago:
 * `yyyy-MM-dd'T'HH:mm:ss.SSSZ` com offset numérico explícito (`+00:00`).
 */
export function formatMercadoPagoExpiration(input: Date | string | number): string {
  const ms =
    input instanceof Date
      ? input.getTime()
      : typeof input === 'number'
        ? input
        : Date.parse(input);
  if (!Number.isFinite(ms)) {
    throw new Error('Data de expiração Pix inválida.');
  }
  return new Date(ms).toISOString().replace(/Z$/, '+00:00');
}

export function computePixExpiration(
  ttlMs: number,
  nowMs = Date.now()
): { isoUtc: string; mpDateOfExpiration: string } {
  const targetMs = nowMs + ttlMs;
  const isoUtc = new Date(targetMs).toISOString();
  return {
    isoUtc,
    mpDateOfExpiration: isoUtc.replace(/Z$/, '+00:00'),
  };
}

export function isExpiredPix(status: string, detail?: string, expiresAt?: string): boolean {
  return status === 'expired' || (status === 'cancelled' &&
    (detail === 'expired' || (!detail && Date.parse(expiresAt || '') <= Date.now())));
}

/**
 * Obtém o token de acesso do Mercado Pago de forma segura a partir do ambiente.
 * NUNCA utiliza fallbacks hardcoded em produção.
 */
export function getMercadoPagoAccessToken(env: any): string | null {
  const token =
    env?.MP_ACCESS_TOKEN ||
    (typeof process !== 'undefined' ? process.env?.MP_ACCESS_TOKEN : undefined);

  if (!token || !token.trim()) {
    return null;
  }
  return token.trim();
}

/**
 * Verifica se o modo de teste a R$ 0,01 pode ser ativado.
 * Restrito estritamente a ambiente local de desenvolvimento.
 */
export function isPaymentTestModeAllowed(env: any): boolean {
  const runtimeEnv = resolveRuntimeEnvironment(env);

  // Em produção e staging, simulação local de pagamento (R$ 0,01 / bypass) é ESTRITAMENTE PROIBIDA
  if (runtimeEnv === 'production' || runtimeEnv === 'staging') {
    return false;
  }

  return (
    env?.PAYMENT_TEST_MODE === 'true' ||
    (typeof process !== 'undefined' && process.env?.PAYMENT_TEST_MODE === 'true')
  );
}

export function resolveStatementDescriptor(env?: any): string {
  const raw = String(env?.MP_STATEMENT_DESCRIPTOR || 'NB DIGITAL')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .trim()
    .slice(0, 16);
  return raw || 'NB DIGITAL';
}

/**
 * Cria cobrança Pix dinâmica no Mercado Pago
 */
export async function createMercadoPagoPix(
  env: any,
  options: CreatePixOptions
): Promise<MercadoPagoPixResult> {
  const token = getMercadoPagoAccessToken(env);

  if (!token) {
    throw new Error('Mercado Pago não configurado no servidor (MP_ACCESS_TOKEN ausente).');
  }

  const safety = assertMercadoPagoEnvironmentSafety(env, token, {
    requireWebhookSecretInStaging: true,
  });
  if (safety.requiresLiveTestUserCheck) {
    await verifyMercadoPagoSandboxAccount(env, token);
  }
  const runtimeEnv = safety.runtimeEnv;
  const isTestMode = runtimeEnv === 'staging' || isPaymentTestModeAllowed(env);

  const finalAmount = Math.max(0.01, Number(options.amount.toFixed(2)));

  // URL de webhook determinada EXCLUSIVAMENTE por configuração validada no backend
  // (nunca usa URL enviada pelo cliente HTTP e nunca faz fallback para produção em staging).
  const notificationUrl = resolveValidatedMercadoPagoWebhookUrl(env);

  // Chave de idempotência ESTÁVEL baseada no externalReference (Impede duplicidade em retries/cliques repetidos)
  const idempotencyKey = options.idempotencyKey || `idemp_${options.externalReference.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const formattedExpiration = options.dateOfExpiration
    ? formatMercadoPagoExpiration(options.dateOfExpiration)
    : undefined;

  const rawDesc = String(options.description || '').trim();
  const safeDescription =
    !rawDesc || /nua\s*borges|chamada|encomenda|personalizad|adulto|\bvip\b/i.test(rawDesc)
      ? buildDiscreetPaymentDescription(options.externalReference, env)
      : rawDesc;

  const response = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      transaction_amount: finalAmount,
      description: safeDescription,
      statement_descriptor: resolveStatementDescriptor(env),
      payment_method_id: 'pix',
      payer: {
        email: options.payerEmail || resolveFallbackPayerEmail(env),
        first_name: options.payerName || 'Cliente',
      },
      external_reference: options.externalReference,
      notification_url: notificationUrl,
      ...(formattedExpiration ? { date_of_expiration: formattedExpiration } : {}),
    }),
  });

  const data: any = await response.json();

  if (response.ok && data.point_of_interaction?.transaction_data) {
    const td = data.point_of_interaction.transaction_data;
    const base64Img = td.qr_code_base64
      ? (td.qr_code_base64.startsWith('data:')
        ? td.qr_code_base64
        : `data:image/png;base64,${td.qr_code_base64}`)
      : '';

    return {
      success: true,
      id: data.id,
      qrCode: td.qr_code,
      qrCodeBase64: base64Img,
      amount: finalAmount,
      status: data.status || 'pending',
      isTestMode,
      externalReference: options.externalReference,
      expiresAt: data.date_of_expiration,
    };
  }

  const errorMsg =
    data.message ||
    data.cause?.[0]?.description ||
    'Erro ao gerar Pix no Mercado Pago';
  throw new Error(errorMsg);
}

/**
 * Consulta oficial direta de pagamento no Mercado Pago
 */
export async function getMercadoPagoPayment(
  env: any,
  paymentId: string | number
): Promise<{
  success: boolean;
  status: string;
  statusDetail?: string;
  amount: number;
  externalReference?: string;
  paymentMethod?: string;
  dateApproved?: string;
  raw?: any;
}> {
  const token = getMercadoPagoAccessToken(env);

  if (!token) {
    throw new Error('Mercado Pago não configurado no servidor.');
  }
  const safety = assertMercadoPagoEnvironmentSafety(env, token);
  if (safety.requiresLiveTestUserCheck) {
    await verifyMercadoPagoSandboxAccount(env, token);
  }

  const cleanPaymentId = String(paymentId || '').trim();
  if (!/^\d{1,32}$/.test(cleanPaymentId)) {
    throw new Error('Identificador de pagamento do Mercado Pago inválido.');
  }

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(cleanPaymentId)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const data: any = await response.json().catch(() => ({}));
    throw new Error(data.message || `Erro ao consultar pagamento (${response.status})`);
  }

  const data: any = await response.json();

  return {
    success: true,
    status: data.status,
    statusDetail: data.status_detail,
    amount: Number(data.transaction_amount || 0),
    externalReference: data.external_reference,
    paymentMethod: data.payment_method_id,
    dateApproved: data.date_approved,
    raw: data,
  };
}

export async function cancelExpiredMercadoPagoPix(env: any, paymentId: string): Promise<boolean> {
  const token = getMercadoPagoAccessToken(env);
  if (!token || !/^\d{1,32}$/.test(paymentId)) {
    return false;
  }
  try {
    const safety = assertMercadoPagoEnvironmentSafety(env, token);
    if (safety.requiresLiveTestUserCheck) {
      await verifyMercadoPagoSandboxAccount(env, token);
    }
  } catch {
    return false;
  }
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'cancelled' }),
  });
  const result = await response.json().catch(() => null);
  return response.ok && result?.status === 'cancelled' && String(result.id) === paymentId;
}

export interface MercadoPagoRefund {
  id: string;
  amount: number;
  status: string;
}

export async function listMercadoPagoRefunds(env: any, paymentId: string): Promise<MercadoPagoRefund[]> {
  const token = getMercadoPagoAccessToken(env);
  if (!token || !/^\d{1,32}$/.test(paymentId)) throw new Error('Pagamento sem configuração válida no Mercado Pago.');
  const safety = assertMercadoPagoEnvironmentSafety(env, token);
  if (safety.requiresLiveTestUserCheck) await verifyMercadoPagoSandboxAccount(env, token);

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error('Não foi possível consultar as devoluções no Mercado Pago.');
  const payload: unknown = await response.json();
  const rows = Array.isArray(payload) ? payload : payload && typeof payload === 'object' && 'payment_id' in payload ? [payload] : null;
  if (!rows || rows.some((row) => !row || String(row.payment_id) !== paymentId || !row.id || typeof row.status !== 'string' || !Number.isFinite(Number(row.amount)) || Number(row.amount) <= 0)) {
    throw new Error('O Mercado Pago retornou uma lista de devoluções inválida.');
  }
  return rows.map((row) => ({ id: String(row.id), amount: Number(row.amount), status: row.status.toLowerCase() }));
}

/** Reembolso total ou parcial idempotente via Mercado Pago Payments API. */
export async function refundMercadoPagoPayment(
  env: any,
  paymentId: string | number,
  stableReference: string,
  refundAmount?: number,
  options?: { scope?: string; timeoutMs?: number }
): Promise<{
  success: boolean;
  id?: string;
  status?: string;
  amount?: number;
  error?: string;
  inconclusive?: boolean;
  httpStatus?: number;
}> {
  const token = getMercadoPagoAccessToken(env);
  if (!token) return { success: false, error: 'Mercado Pago não configurado no servidor.' };
  const cleanPaymentId = String(paymentId || '').trim();
  if (!/^\d{1,32}$/.test(cleanPaymentId)) {
    return { success: false, error: 'Pagamento sem identificador válido do Mercado Pago.' };
  }
  try {
    const safety = assertMercadoPagoEnvironmentSafety(env, token);
    if (safety.requiresLiveTestUserCheck) {
      await verifyMercadoPagoSandboxAccount(env, token);
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Credencial incompatível com o ambiente.' };
  }

  const store = getNuaIdAdapter(env);
  if (!store?.kvCreate || !store.kvLease) {
    return { success: false, httpStatus: 503, error: 'Armazenamento de estorno indisponível.' };
  }
  const lockKey = 'nua_id:refund_gateway_lock:' + cleanPaymentId;
  const now = Date.now();
  const lease = { next: now + 90_000 };
  let acquired = await store.kvCreate(lockKey, lease);
  if (!acquired) {
    const current = await store.kvGet<{ next: number }>(lockKey);
    if (current && current.next <= now) acquired = await store.kvLease(lockKey, current.next, lease);
  }
  if (!acquired) {
    return { success: false, inconclusive: true, httpStatus: 409, error: 'Já existe uma devolução em processamento para este pagamento.' };
  }
  try {
    const normalizedAmount =
      typeof refundAmount === 'number' && Number.isFinite(refundAmount) && refundAmount > 0
        ? Math.round(refundAmount * 100) / 100
        : undefined;

    const keyScope = (options?.scope || 'nua-appointment-refund').trim();
    // O SHA-256 determinístico permite repetir com segurança se a resposta de rede se perder.
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`${keyScope}:${stableReference}:${normalizedAmount ?? 'full'}`)
    );
    const bytes = new Uint8Array(digest).slice(0, 16);
    bytes[6] = (bytes[6] & 0x0f) | 0x50;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
    const idempotencyKey = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;

    const timeoutMs = Math.max(3000, Math.min(options?.timeoutMs ?? 15000, 30000));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(
        `https://api.mercadopago.com/v1/payments/${encodeURIComponent(cleanPaymentId)}/refunds`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': idempotencyKey,
          },
          body: normalizedAmount ? JSON.stringify({ amount: normalizedAmount }) : '{}',
        }
      );
    } catch (err: any) {
      const isTimeout = controller.signal.aborted || err?.name === 'AbortError';
      return {
        success: false,
        inconclusive: true,
        error: isTimeout
          ? 'Tempo limite excedido ao aguardar resposta do Mercado Pago. Reconcilie o pagamento antes de tentar novamente.'
          : 'Falha de comunicação com o Mercado Pago. O resultado é inconclusivo — reconcilie o pagamento antes de tentar novamente.',
      };
    } finally {
      clearTimeout(timer);
    }

    const data: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      const inconclusive = response.status >= 500 || response.status === 408;
      return {
        success: false,
        inconclusive,
        httpStatus: response.status,
        error:
          data.message ||
          data.cause?.[0]?.description ||
          data.error ||
          `Mercado Pago recusou o reembolso (${response.status}).`,
      };
    }
    return {
      success: true,
      id: data.id ? String(data.id) : undefined,
      status: String(data.status || ''),
      amount: Number(data.amount ?? normalizedAmount) || undefined,
      httpStatus: response.status,
    };
  } finally {
    await store.kvLease(lockKey, lease.next, { next: 0 }).catch(() => {});
  }
}
