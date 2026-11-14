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

  // Verifica se o modo de teste está liberado para o ambiente atual
  const isTestMode = false;

  const finalAmount = Math.max(0.01, Number(options.amount.toFixed(2)));

  const notificationUrl =
    options.notificationUrl ||
    'https://nuaborges.com.br/api/finance/webhook';

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
