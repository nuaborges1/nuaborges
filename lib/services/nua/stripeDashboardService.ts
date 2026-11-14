/**
 * Stripe Dashboard Service — Nua Borges Platform
 *
 * Consome a API canônica /api/stripe/dashboard para alimentação
 * do Módulo 7 (Financeiro) no Admin V2:
 * - Saldo disponível real para saque
 * - Saldo pendente
 * - Receita real consolidada por período
 * - Taxas cobradas pela Stripe
 * - Reembolsos reais
 * - Histórico completo de transações com filtros
 */

export interface FinancialTransactionItem {
  id: string;
  chargeId?: string;
  orderId?: string;
  modality: 'packs' | 'personalizados' | 'chamadas' | 'outros';
  modalityLabel: string;
  description: string;
  customerName?: string;
  customerEmail?: string;
  amountGross: number;
  fee: number;
  amountNet: number;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded';
  statusLabel: string;
  paymentMethod: string;
  paymentMethodLabel: string;
  createdAt: string;
  receiptUrl?: string | null;
}

export interface StripeDashboardData {
  success: boolean;
  stripeConnected: boolean;
  stripeError?: string | null;
  period: string;
  periodLabel: string;
  balance: {
    available: number;
    pending: number;
    currency: string;
  };
  summary: {
    totalReceived: number;
    totalNet: number;
    totalFees: number;
    totalRefunds: number;
    salesCount: number;
    pendingCount: number;
    failedCount: number;
  };
  modalities: {
    packs: {
      label: string;
      gross: number;
      net: number;
      fees: number;
      count: number;
    };
    personalizados: {
      label: string;
      gross: number;
      net: number;
      fees: number;
      count: number;
    };
    chamadas: {
      label: string;
      gross: number;
      net: number;
      fees: number;
      count: number;
    };
  };
  timeline: Array<{
    date: string;
    amount: number;
    sales: number;
  }>;
  transactions: FinancialTransactionItem[];
  totalTransactionsCount: number;
  updatedAt: string;
}

import { getPublicApiUrl } from '@/lib/contentStore';

export async function fetchStripeDashboard(
  period: 'current_month' | '30d' | '90d' | 'all' = 'current_month',
  modality: 'all' | 'packs' | 'personalizados' | 'chamadas' = 'all',
  status: 'all' | 'succeeded' | 'pending' | 'failed' | 'refunded' = 'all'
): Promise<StripeDashboardData> {
  const params = new URLSearchParams({
    period,
    modality,
    status,
  });

  const apiUrl = getPublicApiUrl();
  const res = await fetch(`${apiUrl}/api/stripe/dashboard?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Cache-Control': 'no-cache',
    },
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Erro ao carregar dados do Stripe: HTTP ${res.status} ${errorText}`);
  }

  return res.json();
}
