import { getPublicApiUrl, getStoredSessionToken } from '@/lib/contentStore';

export type RefundLifecycleState =
  | 'eligible'
  | 'not_eligible'
  | 'requested'
  | 'processing'
  | 'refunded'
  | 'rejected'
  | 'unknown_awaiting_reconciliation';

export interface RefundEligibilitySummary {
  orderId: string;
  modality: string;
  modalityLabel: string;
  title: string;
  customerName: string;
  customerEmail: string;
  amountPaid: number;
  amountPaidFormatted: string;
  refundableAmount: number;
  refundableAmountFormatted: string;
  alreadyRefundedAmount: number;
  state: RefundLifecycleState;
  eligible: boolean;
  canReconcile: boolean;
  reasonIfIneligible?: string;
  stageSummary?: string;
  consequences: string[];
  providerPaymentId: string | null;
  providerStatus?: string;
  lastError?: string | null;
}

export interface RefundExecutionResult {
  success: boolean;
  state: RefundLifecycleState;
  orderId: string;
  modality: string;
  refundId?: string;
  refundAmount?: number;
  emailSent?: boolean;
  reconciled?: boolean;
  message: string;
  error?: string;
  httpStatus: number;
}

function authHeaders(): Record<string, string> {
  const token = getStoredSessionToken();
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchRefundEligibility(
  orderId: string,
  modality?: string
): Promise<{ success: boolean; summary?: RefundEligibilitySummary; error?: string }> {
  const params = new URLSearchParams({ orderId });
  if (modality) params.set('modality', modality);
  const res = await fetch(`${getPublicApiUrl()}/api/admin/refund?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    signal: AbortSignal.timeout(25000),
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) {
    return {
      success: false,
      error: data?.error || 'Não foi possível verificar a elegibilidade do estorno.',
    };
  }
  return { success: true, summary: data.summary };
}

export async function authorizeLocalRefund(password: string): Promise<string | null> {
  const url = new URL(getPublicApiUrl() + '/api/auth/login', window.location.origin);
  if (!['localhost', '127.0.0.1'].includes(url.hostname)) {
    return 'A autorização local exige a API do próprio computador.';
  }
  try {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await response.json().catch(() => null);
    return response.ok && data?.success ? null : data?.error || 'Não foi possível autorizar o estorno.';
  } catch {
    return 'Não foi possível conectar à API local.';
  }
}

export async function executeAdminRefund(params: {
  orderId: string;
  modality?: string;
  reason: string;
  confirmRefund: boolean;
  expectedRefundAmount: number;
  paymentId?: string | null;
}): Promise<RefundExecutionResult> {
  const res = await fetch(`${getPublicApiUrl()}/api/admin/refund`, {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: authHeaders(),
    body: JSON.stringify({
      action: 'execute',
      orderId: params.orderId,
      modality: params.modality,
      reason: params.reason,
      confirmRefund: params.confirmRefund,
      expectedRefundAmount: params.expectedRefundAmount,
      paymentId: params.paymentId || undefined,
    }),
  });
  const data = await res.json().catch(() => null);
  return (
    data || {
      success: false,
      state: 'unknown_awaiting_reconciliation',
      orderId: params.orderId,
      modality: params.modality || 'unknown',
      message: 'Resposta inesperada do servidor.',
      error: 'Não foi possível ler a resposta do estorno. Reconcilie antes de tentar novamente.',
      httpStatus: res.status,
    }
  );
}

export async function reconcileAdminRefund(params: {
  orderId: string;
  modality?: string;
}): Promise<RefundExecutionResult> {
  const res = await fetch(`${getPublicApiUrl()}/api/admin/refund`, {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: authHeaders(),
    body: JSON.stringify({
      action: 'reconcile',
      orderId: params.orderId,
      modality: params.modality,
    }),
  });
  const data = await res.json().catch(() => null);
  return (
    data || {
      success: false,
      state: 'unknown_awaiting_reconciliation',
      orderId: params.orderId,
      modality: params.modality || 'unknown',
      message: 'Falha ao reconciliar.',
      error: 'Não foi possível reconciliar com o Mercado Pago agora.',
      httpStatus: res.status,
    }
  );
}
