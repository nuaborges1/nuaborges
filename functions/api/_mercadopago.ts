/**
 * Mercado Pago API Engine — Nua Borges Platform
 *
 * Provê integração oficial para pagamentos Pix em tempo real:
 * - Emissão de Pix oficial EMVCo com QR Code base64 e Copia e Cola
 * - Suporte a modo de homologação restrito a ambiente de desenvolvimento local
 * - Consulta de status oficial para prevenção de race conditions
 * - Idempotência estrita via chave estável por transação
 */

export interface CreatePixOptions {
  amount: number;
  description: string;
  payerEmail?: string;
  payerName?: string;
  externalReference: string;
  notificationUrl?: string;
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
  const envName = (
    env?.ENVIRONMENT ||
    env?.NODE_ENV ||
    (typeof process !== 'undefined' ? process.env?.NODE_ENV : '') ||
    ''
  ).toLowerCase();

  // Em produção, simulação/test mode é ESTRITAMENTE PROIBIDA
  if (envName === 'production') {
    return false;
  }

  return (
    env?.PAYMENT_TEST_MODE === 'true' ||
    (typeof process !== 'undefined' && process.env?.PAYMENT_TEST_MODE === 'true')
  );
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

  const envName = String(env?.ENVIRONMENT || env?.NODE_ENV || (typeof process !== 'undefined' ? process.env?.NODE_ENV : '') || '').toLowerCase();
  const isProductionEnvironment = envName === 'production';
  const isTestMode = isPaymentTestModeAllowed(env);
  // Nunca permita que uma execução local com .env/.dev.vars de produção gere cobrança real.
  if (!isProductionEnvironment && (!isTestMode || !token.startsWith('TEST-'))) {
    throw new Error('Cobranças locais exigem PAYMENT_TEST_MODE=true e credencial de teste TEST- do Mercado Pago.');
  }

  const finalAmount = Math.max(0.01, Number(options.amount.toFixed(2)));

  const notificationUrl = isTestMode
    ? undefined
    : (options.notificationUrl || 'https://nuaborges.com.br/api/finance/webhook');

  // Chave de idempotência ESTÁVEL baseada no externalReference (Impede duplicidade em retries/cliques repetidos)
  const idempotencyKey = `idemp_${options.externalReference.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  const response = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      transaction_amount: finalAmount,
      description: options.description || 'Nua Borges Produções',
      payment_method_id: 'pix',
      payer: {
        email: options.payerEmail || 'contato@nuaborges.com.br',
        first_name: options.payerName || 'Cliente VIP',
      },
      external_reference: options.externalReference,
      notification_url: notificationUrl,
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
  const envName = String(env?.ENVIRONMENT || env?.NODE_ENV || (typeof process !== 'undefined' ? process.env?.NODE_ENV : '') || '').toLowerCase();
  if (envName !== 'production' && (!isPaymentTestModeAllowed(env) || !token.startsWith('TEST-'))) {
    throw new Error('Consultas ao Mercado Pago fora de produção exigem PAYMENT_TEST_MODE=true e credencial de teste TEST-.');
  }

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
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

/** Reembolso total ou parcial idempotente para pagamentos de reservas VIP. */
export async function refundMercadoPagoPayment(
  env: any,
  paymentId: string | number,
  stableReference: string,
  refundAmount?: number
): Promise<{ success: boolean; id?: string; status?: string; amount?: number; error?: string }> {
  const token = getMercadoPagoAccessToken(env);
  if (!token) return { success: false, error: 'Mercado Pago não configurado no servidor.' };
  if (!paymentId) return { success: false, error: 'Pagamento sem identificador do Mercado Pago.' };
  const envName = String(env?.ENVIRONMENT || env?.NODE_ENV || (typeof process !== 'undefined' ? process.env?.NODE_ENV : '') || '').toLowerCase();
  if (envName !== 'production' && (!isPaymentTestModeAllowed(env) || !token.startsWith('TEST-'))) {
    return { success: false, error: 'Devoluções locais exigem PAYMENT_TEST_MODE=true e credencial de teste TEST- do Mercado Pago.' };
  }

  const normalizedAmount =
    typeof refundAmount === 'number' && Number.isFinite(refundAmount) && refundAmount > 0
      ? Math.round(refundAmount * 100) / 100
      : undefined;

  // O SHA-256 determinístico permite repetir com segurança se a resposta de rede se perder.
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`nua-appointment-refund:${stableReference}:${normalizedAmount ?? 'full'}`)
  );
  const bytes = new Uint8Array(digest).slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  const idempotencyKey = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(paymentId))}/refunds`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey,
    },
    body: normalizedAmount ? JSON.stringify({ amount: normalizedAmount }) : '{}',
  });
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { success: false, error: data.message || data.error || `Mercado Pago recusou o reembolso (${response.status}).` };
  }
  return {
    success: true,
    id: data.id ? String(data.id) : undefined,
    status: String(data.status || ''),
    amount: Number(data.amount ?? normalizedAmount) || undefined,
  };
}
