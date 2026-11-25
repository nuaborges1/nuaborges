/**
 * Commercial Finance Service — Nua Borges Platform
 * Gateway Oficial: Mercado Pago
 *
 * Módulo de conciliação financeira comercial:
 * - Saldo disponível real
 * - Saldo pendente
 * - Receita real consolidada por período
 * - Taxas do Mercado Pago Pix
 * - Reembolsos
 * - Histórico completo de transações com filtros
 */

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

export interface CommercialFinanceData {
  success: boolean;
  gateway?: 'mercadopago';
  gatewayConnected?: boolean;
  gatewayError?: string | null;
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

const FINANCE_CACHE_STORAGE_KEY = 'nua_finance_dashboard_cache_v1';
const FINANCE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

interface CachedFinanceEntry {
  data: CommercialFinanceData;
  timestamp: number;
}

const memoryCache = new Map<string, CachedFinanceEntry>();
const inFlightRequests = new Map<string, Promise<CommercialFinanceData>>();

function buildCacheKey(period: string, modality: string, status: string): string {
  return `${period}:${modality}:${status}`;
}

function readCachedEntry(key: string): CommercialFinanceData | null {
  const now = Date.now();
  const mem = memoryCache.get(key);
  if (mem && now - mem.timestamp < FINANCE_CACHE_TTL_MS) {
    return mem.data;
  }

  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const raw = sessionStorage.getItem(FINANCE_CACHE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, CachedFinanceEntry>;
        const entry = parsed[key];
        if (entry && entry.data && now - entry.timestamp < FINANCE_CACHE_TTL_MS) {
          memoryCache.set(key, entry);
          return entry.data;
        }
      }
    } catch {
      // Ignora erro de parsing em storage
    }
  }

  return null;
}

function writeCachedEntry(key: string, data: CommercialFinanceData): void {
  const entry: CachedFinanceEntry = { data, timestamp: Date.now() };
  memoryCache.set(key, entry);

  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const raw = sessionStorage.getItem(FINANCE_CACHE_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, CachedFinanceEntry>) : {};
      parsed[key] = entry;
      sessionStorage.setItem(FINANCE_CACHE_STORAGE_KEY, JSON.stringify(parsed));
    } catch {
      // Quota ou indisponibilidade
    }
  }
}

export function getCachedCommercialFinanceDashboard(
  period = 'current_month',
  modality = 'all',
  status = 'all'
): CommercialFinanceData | null {
  const key = buildCacheKey(period, modality, status);
  return readCachedEntry(key);
}

export function invalidateCommercialFinanceDashboardCache(): void {
  memoryCache.clear();
  inFlightRequests.clear();
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      sessionStorage.removeItem(FINANCE_CACHE_STORAGE_KEY);
    } catch {}
  }
}

export const invalidateCommercialFinanceCache = invalidateCommercialFinanceDashboardCache;

export async function fetchCommercialFinanceDashboard(
  period = 'current_month',
  modality = 'all',
  status = 'all',
  options: { force?: boolean } = {}
): Promise<CommercialFinanceData> {
  const key = buildCacheKey(period, modality, status);

  if (!options.force) {
    const cached = readCachedEntry(key);
    if (cached) return cached;
  }

  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key)!;
  }

  const params = new URLSearchParams();
  if (period) params.set('period', period);
  if (modality && modality !== 'all') params.set('modality', modality);
  if (status && status !== 'all') params.set('status', status);

  const apiUrl = getPublicApiUrl();
  const requestPromise = (async () => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/finance-dashboard?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`Erro ao carregar dados financeiros: HTTP ${res.status} ${errorText}`);
      }

      const data: CommercialFinanceData = await res.json();
      writeCachedEntry(key, data);
      return data;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, requestPromise);
  return requestPromise;
}
