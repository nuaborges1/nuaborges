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

const STRIPE_CACHE_STORAGE_KEY = 'nua_stripe_dashboard_cache_v1';
const STRIPE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

interface CachedStripeEntry {
  data: StripeDashboardData;
  timestamp: number;
}

const memoryCache = new Map<string, CachedStripeEntry>();
const inFlightRequests = new Map<string, Promise<StripeDashboardData>>();

function getCacheKey(period: string, modality: string, status: string): string {
  return `${period}:${modality}:${status}`;
}

function readCachedEntry(key: string): StripeDashboardData | null {
  const now = Date.now();
  const mem = memoryCache.get(key);
  if (mem && now - mem.timestamp < STRIPE_CACHE_TTL_MS) {
    return mem.data;
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(STRIPE_CACHE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, CachedStripeEntry>;
        const entry = parsed?.[key];
        if (entry && entry.data && now - entry.timestamp < STRIPE_CACHE_TTL_MS) {
          memoryCache.set(key, entry);
          return entry.data;
        }
      }
    } catch {}
  }

  return null;
}

function writeCachedEntry(key: string, data: StripeDashboardData): void {
  const entry: CachedStripeEntry = { data, timestamp: Date.now() };
  memoryCache.set(key, entry);

  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(STRIPE_CACHE_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, CachedStripeEntry>) : {};
      parsed[key] = entry;
      sessionStorage.setItem(STRIPE_CACHE_STORAGE_KEY, JSON.stringify(parsed));
    } catch {}
  }
}

export function getCachedStripeDashboard(
  period: 'current_month' | '30d' | '90d' | 'all' = 'current_month',
  modality: 'all' | 'packs' | 'personalizados' | 'chamadas' = 'all',
  status: 'all' | 'succeeded' | 'pending' | 'failed' | 'refunded' = 'all'
): StripeDashboardData | null {
  return readCachedEntry(getCacheKey(period, modality, status));
}

export function invalidateStripeDashboardCache(): void {
  memoryCache.clear();
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(STRIPE_CACHE_STORAGE_KEY);
    } catch {}
  }
}

export async function fetchStripeDashboard(
  period: 'current_month' | '30d' | '90d' | 'all' = 'current_month',
  modality: 'all' | 'packs' | 'personalizados' | 'chamadas' = 'all',
  status: 'all' | 'succeeded' | 'pending' | 'failed' | 'refunded' = 'all',
  options?: { force?: boolean }
): Promise<StripeDashboardData> {
  const key = getCacheKey(period, modality, status);

  if (!options?.force) {
    const cached = readCachedEntry(key);
    if (cached) {
      return cached;
    }
  }

  const existingInFlight = inFlightRequests.get(key);
  if (existingInFlight) {
    return existingInFlight;
  }

  const params = new URLSearchParams({
    period,
    modality,
    status,
  });

  const apiUrl = getPublicApiUrl();
  const requestPromise = (async () => {
    try {
      const res = await fetch(`${apiUrl}/api/stripe/dashboard?${params.toString()}`, {
        method: 'GET',
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`Erro ao carregar dados do Stripe: HTTP ${res.status} ${errorText}`);
      }

      const data: StripeDashboardData = await res.json();
      writeCachedEntry(key, data);
      return data;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, requestPromise);
  return requestPromise;
}
