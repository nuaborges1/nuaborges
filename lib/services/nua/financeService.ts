/**
 * Serviço Financeiro da Cliente (Mensalidade via Pix Estático) — Projeto Nua Borges
 * Desvinculado do Mercado Pago (NUA-AUD-001): gera QR Code Pix direto via DEV_PIX_KEY
 * e consulta o status atualizado da parcela em `/api/finance/installments`.
 */

import { FinancialInstallment, FinancialSummary } from '@/lib/financeCanonical';
import { getPublicApiUrl } from '@/lib/contentStore';

const ADMIN_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-cache',
};

export interface FinanceInstallmentsResponse {
  success: boolean;
  installments?: FinancialInstallment[];
  summary?: FinancialSummary;
  error?: string;
}

export interface PixPaymentResponse {
  success?: boolean;
  mode?: 'static_pix';
  qrCode?: string;
  qrCodeBase64?: string;
  txid?: string;
  recipientName?: string;
  installment?: FinancialInstallment;
  error?: string;
}

export interface VerifyPaymentResponse {
  status: 'paid' | 'pending' | 'overdue' | 'unknown';
  installment?: FinancialInstallment;
  error?: string;
}

export async function fetchClientInstallments(): Promise<FinanceInstallmentsResponse> {
  try {
    const apiUrl = getPublicApiUrl();
    const res = await fetch(`${apiUrl}/api/finance/installments`, {
      credentials: 'include',
      headers: ADMIN_HEADERS,
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        installments: data.installments,
        summary: data.summary,
      };
    }

    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.error || 'Erro ao carregar mensalidades.' };
  } catch {
    return { success: false, error: 'Falha de conexão.' };
  }
}

export async function requestPixPayment(installmentId: string): Promise<PixPaymentResponse> {
  try {
    const apiUrl = getPublicApiUrl();
    const res = await fetch(`${apiUrl}/api/finance/pix`, {
      method: 'POST',
      credentials: 'include',
      headers: { ...ADMIN_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ installmentId }),
    });

    if (res.ok) {
      return await res.json();
    }

    const err = await res.json().catch(() => ({}));
    return { error: err.error || 'Erro ao gerar cobrança PIX.' };
  } catch {
    return { error: 'Falha de conexão.' };
  }
}

export async function verifyInstallmentPayment(installmentId: string): Promise<VerifyPaymentResponse> {
  try {
    const res = await fetchClientInstallments();
    if (res.success && Array.isArray(res.installments)) {
      const found = res.installments.find((i) => i.id === installmentId);
      if (found) {
        return {
          status: (found.status as VerifyPaymentResponse['status']) || 'pending',
          installment: found,
        };
      }
    }
    return { status: 'unknown' };
  } catch {
    return { status: 'unknown' };
  }
}
