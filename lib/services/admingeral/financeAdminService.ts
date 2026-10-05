/**
 * Serviço Administrativo Financeiro — Central phdev (Admin Geral)
 * Responsável pelo controle máster de mensalidades, conciliação e baixas manuais
 */

import { FinancialInstallment, FinancialSummary } from '@/lib/financeCanonical';

export interface FinanceAdminData {
  installments: FinancialInstallment[];
  summary?: FinancialSummary;
  mercadopago?: {
    configured: boolean;
    environment: 'sandbox' | 'production' | 'none';
  };
}

export async function fetchFinanceAdminOverview(
  fetchFromApi: (path: string, options?: RequestInit) => Promise<Response>
): Promise<FinanceAdminData | null> {
  try {
    const res = await fetchFromApi('/api/finance/admin');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[financeAdminService] Erro ao carregar dados financeiros:', err);
  }
  return null;
}

export async function syncMercadoPagoAdmin(
  fetchFromApi: (path: string, options?: RequestInit) => Promise<Response>
): Promise<{ success: boolean; installments?: FinancialInstallment[]; summary?: FinancialSummary; message?: string; error?: string }> {
  try {
    const res = await fetchFromApi('/api/finance/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync_mp' }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, installments: data.installments, summary: data.summary, message: data.message };
    }
    return { success: false, error: data.error || 'Falha ao sincronizar com MP.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro de conexão.' };
  }
}

export async function submitManualPayment(
  fetchFromApi: (path: string, options?: RequestInit) => Promise<Response>,
  params: {
    installmentNumber: number;
    paidAt?: string;
    paidAmount: number;
    paymentMethod: string;
    paymentId: string;
    notes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetchFromApi('/api/finance/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'manual_pay',
        ...params,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true };
    }
    return { success: false, error: data.error || 'Falha ao registrar pagamento manual.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro de conexão.' };
  }
}

export async function revertInstallmentPayment(
  fetchFromApi: (path: string, options?: RequestInit) => Promise<Response>,
  installmentNumber: number,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetchFromApi('/api/finance/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'revert',
        installmentNumber,
        reason,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true };
    }
    return { success: false, error: data.error || 'Falha ao reverter quitação.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro de conexão.' };
  }
}
