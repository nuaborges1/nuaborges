import { getPublicApiUrl } from '@/lib/contentStore';

export interface FinancialTransactionItem {
  id: string;
  chargeId?: string;
  orderId?: string;
  modality: 'packs' | 'personalizados' | 'chamadas' | 'outros';
  modalityLabel: string;
  description: string;
  customerName?: string;
  customerEmail?: string;
  amountGross: number | null;
  fee: number | null;
  amountNet: number | null;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded';
  statusLabel: string;
  paymentMethod: string;
  paymentMethodLabel: string;
  createdAt: string | null;
  refundAmount?: number | null;
  receiptUrl?: string | null;
}

export interface CommercialFinanceData {
  success: boolean;
  gateway?: 'mercadopago';
  gatewayConnected?: boolean | null;
  gatewayError?: string | null;
  period: string;
  periodLabel: string;
  balance: {
    available: number | null;
    pending: number | null;
    currency: string;
  };
  summary: {
    totalReceived: number | null;
    totalNet: number | null;
    totalFees: number | null;
    totalRefunds: number | null;
    salesCount: number;
    pendingCount: number;
    pendingOrderAmount: number | null;
    failedCount: number;
  };
  modalities: {
    packs: {
      label: string;
      gross: number | null;
      net: number | null;
      fees: number | null;
      count: number;
    };
    personalizados: {
      label: string;
      gross: number | null;
      net: number | null;
      fees: number | null;
      count: number;
    };
    chamadas: {
      label: string;
      gross: number | null;
      net: number | null;
      fees: number | null;
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

export async function fetchCommercialFinanceDashboard(
  period = 'current_month', modality = 'all', status = 'all', signal?: AbortSignal
): Promise<CommercialFinanceData> {
  const params = new URLSearchParams({ period, modality, status });
  try {
    if (typeof window !== 'undefined') window.sessionStorage.removeItem('nua_finance_dashboard_cache_v1');
  } catch {}
  const res = await fetch(getPublicApiUrl() + '/api/admin/finance-dashboard?' + params, {
    credentials: 'include', cache: 'no-store', signal,
  });
  if (!res.ok) throw new Error('Não foi possível carregar dados financeiros.');
  return res.json();
}
