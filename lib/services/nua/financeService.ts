/**
 * Serviço Financeiro da Cliente — Projeto Nua Borges
 * Responsável pela consulta de parcelas, geração de PIX e checkout
 */

import { FinancialInstallment, FinancialSummary } from '@/lib/financeCanonical';

export interface FinanceInstallmentsResponse {
  success: boolean;
  installments?: FinancialInstallment[];
  summary?: FinancialSummary;
  error?: string;
}

export interface PixPaymentResponse {
  success?: boolean;
  qrCode?: string;
  qrCodeBase64?: string;
  txid?: string;
  installment?: FinancialInstallment;
  error?: string;
}

export interface VerifyPaymentResponse {
  status: 'paid' | 'pending' | 'overdue' | 'unknown';
  installment?: FinancialInstallment;
  error?: string;
}

export interface PreferenceResponse {
  id?: string;
  init_point?: string;
  error?: string;
}

export async function fetchClientInstallments(): Promise<FinanceInstallmentsResponse> {
  try {
    const res = await fetch('/api/finance/installments', {
      headers: {
        'Cache-Control': 'no-cache',
      },
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
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha de conexão.' };
  }
}

export async function requestPixPayment(installmentId: string): Promise<PixPaymentResponse> {
  try {
    const res = await fetch('/api/finance/pix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installmentId }),
    });

    if (res.ok) {
      return await res.json();
    }

    const err = await res.json().catch(() => ({}));
    return { error: err.error || 'Erro ao gerar cobrança PIX.' };
  } catch (err: any) {
    return { error: err?.message || 'Falha de conexão.' };
  }
}

export async function verifyInstallmentPayment(installmentId: string): Promise<VerifyPaymentResponse> {
  try {
    const res = await fetch(`/api/finance/verify?installmentId=${encodeURIComponent(installmentId)}`, {
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (res.ok) {
      return await res.json();
    }

    return { status: 'unknown' };
  } catch {
    return { status: 'unknown' };
  }
}

export async function createCardCheckoutPreference(installmentId: string): Promise<PreferenceResponse> {
  try {
    const res = await fetch('/api/finance/create-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installmentId }),
    });

    return await res.json();
  } catch (err: any) {
    return { error: err?.message || 'Erro ao criar preferência de pagamento.' };
  }
}
