/**
 * Cloudflare Pages Function: GET /api/admin/finance-dashboard
 *
 * Dashboard Financeiro Comercial Integrado — Nua Borges Platform
 * Gateway Oficial: Mercado Pago Pix
 *
 * Substitui definitivamente o antigo `/api/stripe/dashboard` (Stripe removida).
 */

import {
  listAppointmentsFromSupabase,
  listPersonalizadosOrdersFromSupabase,
} from '../_supabaseStore';
import { getSupabaseClient } from '../_supabaseClient';

interface Env {
  MP_ACCESS_TOKEN?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  [key: string]: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

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

export const onRequestGet = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  const url = new URL(request.url);
  const periodParam = url.searchParams.get('period') || 'current_month';
  const modalityFilter = url.searchParams.get('modality') || 'all';
  const statusFilter = url.searchParams.get('status') || 'all';

  const now = new Date();
  let periodStartTimestamp = 0;
  let periodLabel = 'Mês Atual';

  if (periodParam === 'current_month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    periodStartTimestamp = Math.floor(startOfMonth.getTime() / 1000);
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];
    periodLabel = `${monthNames[now.getMonth()]} de ${now.getFullYear()}`;
  } else if (periodParam === '30d') {
    periodStartTimestamp = Math.floor((now.getTime() - 30 * 24 * 60 * 60 * 1000) / 1000);
    periodLabel = 'Últimos 30 Dias';
  } else if (periodParam === '90d') {
    periodStartTimestamp = Math.floor((now.getTime() - 90 * 24 * 60 * 60 * 1000) / 1000);
    periodLabel = 'Últimos 90 Dias';
  } else {
    periodStartTimestamp = 0;
    periodLabel = 'Todo o Histórico';
  }

  const sb = getSupabaseClient(env);
  let localOrders: any[] = [];
  let persOrders: any[] = [];
  let appBookings: any[] = [];

  try {
    const [ordersRes, persRes, appRes] = await Promise.all([
      sb
        ? sb.from('orders').select('*').order('created_at', { ascending: false }).limit(2000)
        : Promise.resolve({ data: null }),
      listPersonalizadosOrdersFromSupabase(env, { limit: 1000 }),
      listAppointmentsFromSupabase(env, { limit: 1000 }),
    ]);
    if (ordersRes?.data) localOrders = ordersRes.data;
    persOrders = persRes;
    appBookings = appRes;
  } catch (err: any) {
    console.warn('[FinanceDashboard] Erro ao ler tabelas Supabase:', err);
  }

  const CONFIRMED_PAID_STATUSES = new Set([
    'paid', 'approved', 'manual_confirmed', 'pago', 'pago_liberado', 'liberado',
    'confirmada', 'confirmado', 'concluida', 'concluido', 'concluído',
    'pronto', 'entregue', 'em_producao',
  ]);

  const nonPackOrderIds = new Set<string>();
  persOrders.forEach((p) => { if (p?.id) nonPackOrderIds.add(String(p.id)); });
  appBookings.forEach((a) => {
    if (a?.id) {
      nonPackOrderIds.add(String(a.id));
      nonPackOrderIds.add(`apt_${a.id}`);
    }
  });

  const transactions: FinancialTransactionItem[] = [];

  localOrders.forEach((o) => {
    const orderId = String(o.id || '');
    const packId = String(o.pack_id || '');
    if (
      nonPackOrderIds.has(orderId) ||
      orderId.startsWith('app_') ||
      orderId.startsWith('apt_') ||
      orderId.startsWith('book_') ||
      orderId.startsWith('ped_') ||
      orderId.startsWith('pers_') ||
      packId.startsWith('chamada-')
    ) {
      return;
    }
    const statusClean = String(o.status || '').toLowerCase().trim();
    const isPaid = CONFIRMED_PAID_STATUSES.has(statusClean);
    const isRefunded = statusClean === 'refunded' || statusClean === 'reembolsado' || statusClean === 'charged_back';
    const isFailed = ['cancelled', 'canceled', 'cancelada', 'cancelado', 'rejected', 'failed', 'expired'].includes(statusClean);
    const amountGross = Number(o.amount ?? 0);
    const fee = Math.round(amountGross * 0.0099 * 100) / 100;
    const amountNet = Math.max(0, amountGross - fee);

    transactions.push({
      id: o.id,
      chargeId: o.id,
      orderId: o.id,
      modality: 'packs',
      modalityLabel: 'Conteúdos & Packs',
      description: `Pedido de Conteúdo • #${String(o.id || '').slice(-6).toUpperCase()}`,
      customerName: o.customer_name || 'Cliente VIP',
      customerEmail: o.customer_email || '',
      amountGross,
      fee,
      amountNet,
      currency: 'BRL',
      status: isRefunded ? 'refunded' : isPaid ? 'succeeded' : isFailed ? 'failed' : 'pending',
      statusLabel: isRefunded ? 'Reembolsado' : isPaid ? 'Confirmado' : isFailed ? 'Cancelado' : 'Pendente',
      paymentMethod: o.payment_method || 'mercadopago_pix',
      paymentMethodLabel: 'Pix Instantâneo (Mercado Pago)',
      createdAt: o.created_at || new Date().toISOString(),
      receiptUrl: null,
    });
  });

  persOrders.forEach((p) => {
    const pStatus = String(p.status || '').toLowerCase().trim();
    const pPayStatus = String(p.payment?.status || '').toLowerCase().trim();
    const isRefunded = pPayStatus === 'refunded' || pPayStatus === 'reembolsado';
    const isCancelled = pStatus === 'cancelada' || pStatus === 'cancelado' || pPayStatus === 'rejected';
    const isPaid = !isRefunded && !isCancelled && (CONFIRMED_PAID_STATUSES.has(pStatus) || CONFIRMED_PAID_STATUSES.has(pPayStatus));
    const amountGross = Number(p.payment?.amount ?? p.totalPrice ?? 0);
    const fee = Math.round(amountGross * 0.0099 * 100) / 100;
    const amountNet = Math.max(0, amountGross - fee);

    transactions.push({
      id: p.id,
      chargeId: p.id,
      orderId: p.id,
      modality: 'personalizados',
      modalityLabel: 'Personalizados',
      description: `Produção Personalizada (${p.photoCount || 0} fotos)`,
      customerName: p.clientName || 'Cliente VIP',
      customerEmail: p.clientContact || '',
      amountGross,
      fee,
      amountNet,
      currency: 'BRL',
      status: isRefunded ? 'refunded' : isPaid ? 'succeeded' : isCancelled ? 'failed' : 'pending',
      statusLabel: isRefunded ? 'Reembolsado' : isPaid ? 'Confirmado' : isCancelled ? 'Cancelado' : 'Pendente',
      paymentMethod: p.payment?.method || 'mercadopago_pix',
      paymentMethodLabel: 'Pix Instantâneo (Mercado Pago)',
      createdAt: p.payment?.paidAt || p.createdAt || new Date().toISOString(),
      receiptUrl: null,
    });
  });

  appBookings.forEach((a) => {
    const aStatus = String(a.status || '').toLowerCase().trim();
    const aPayStatus = String(a.payment?.status || '').toLowerCase().trim();
    const aRefundStatus = String(a.refundStatus || '').toLowerCase().trim();
    const isRefunded = aPayStatus === 'refunded' || aRefundStatus === 'completed';
    const isCancelled = aStatus === 'cancelada' || aStatus === 'cancelado' || aPayStatus === 'rejected';
    const hasApprovedPayment = aPayStatus === 'approved' || aPayStatus === 'manual_confirmed';
    const isPaid = !isRefunded && !isCancelled && (hasApprovedPayment || aStatus === 'confirmada' || aStatus === 'concluida');
    const amountGross = Number(a.payment?.amount ?? a.price ?? 0);
    const fee = Math.round(amountGross * 0.0099 * 100) / 100;
    const amountNet = Math.max(0, amountGross - fee);

    transactions.push({
      id: a.id,
      chargeId: a.id,
      orderId: a.id,
      modality: 'chamadas',
      modalityLabel: 'Chamadas de Vídeo',
      description: `Chamada VIP • ${a.modalityName || 'Privativo'}`,
      customerName: a.clientName || 'Cliente VIP',
      customerEmail: a.clientEmail || '',
      amountGross,
      fee,
      amountNet,
      currency: 'BRL',
      status: isRefunded ? 'refunded' : isPaid ? 'succeeded' : isCancelled ? 'failed' : 'pending',
      statusLabel: isRefunded
        ? 'Reembolsado'
        : isPaid
        ? 'Confirmado'
        : isCancelled
        ? aRefundStatus === 'pending'
          ? 'Cancelado (Estorno Pendente)'
          : 'Cancelado'
        : 'Pendente',
      paymentMethod: a.payment?.method || 'mercadopago_pix',
      paymentMethodLabel: 'Pix Instantâneo (Mercado Pago)',
      createdAt: a.payment?.paidAt || a.createdAt || new Date().toISOString(),
      receiptUrl: null,
    });
  });

  transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredForPeriod = transactions.filter((t) => new Date(t.createdAt).getTime() / 1000 >= periodStartTimestamp);

  let totalReceivedPeriod = 0;
  let totalNetPeriod = 0;
  let totalFeesPeriod = 0;
  let totalRefundsPeriod = 0;
  let salesCountPeriod = 0;
  let pendingCountPeriod = 0;
  let failedCountPeriod = 0;

  const modalityMetrics = {
    packs: { gross: 0, net: 0, fees: 0, count: 0 },
    personalizados: { gross: 0, net: 0, fees: 0, count: 0 },
    chamadas: { gross: 0, net: 0, fees: 0, count: 0 },
  };

  filteredForPeriod.forEach((t) => {
    if (t.status === 'succeeded') {
      totalReceivedPeriod += t.amountGross;
      totalNetPeriod += t.amountNet;
      totalFeesPeriod += t.fee;
      salesCountPeriod += 1;
      if (t.modality === 'packs' || t.modality === 'personalizados' || t.modality === 'chamadas') {
        modalityMetrics[t.modality].gross += t.amountGross;
        modalityMetrics[t.modality].net += t.amountNet;
        modalityMetrics[t.modality].fees += t.fee;
        modalityMetrics[t.modality].count += 1;
      }
    } else if (t.status === 'refunded') {
      totalRefundsPeriod += t.amountGross;
    } else if (t.status === 'pending') {
      pendingCountPeriod += 1;
    } else if (t.status === 'failed') {
      failedCountPeriod += 1;
    }
  });

  let displayedTransactions = filteredForPeriod;
  if (modalityFilter !== 'all') displayedTransactions = displayedTransactions.filter((t) => t.modality === modalityFilter);
  if (statusFilter !== 'all') displayedTransactions = displayedTransactions.filter((t) => t.status === statusFilter);

  const timelineMap = new Map<string, { date: string; amount: number; sales: number }>();
  filteredForPeriod.forEach((t) => {
    if (t.status !== 'succeeded') return;
    const dateStr = t.createdAt.slice(0, 10);
    const existing = timelineMap.get(dateStr) || { date: dateStr, amount: 0, sales: 0 };
    existing.amount += t.amountGross;
    existing.sales += 1;
    timelineMap.set(dateStr, existing);
  });

  const timeline = Array.from(timelineMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return new Response(
    JSON.stringify({
      success: true,
      gateway: 'mercadopago',
      gatewayConnected: Boolean((env.MP_ACCESS_TOKEN || '').trim()),
      gatewayError: null,
      period: periodParam,
      periodLabel,
      balance: {
        available: Math.round(totalNetPeriod * 100) / 100,
        pending: 0,
        currency: 'BRL',
        isEstimated: true,
        estimatedFeeRate: 0.0099,
      },
      summary: {
        totalReceived: Math.round(totalReceivedPeriod * 100) / 100,
        totalNet: Math.round(totalNetPeriod * 100) / 100,
        totalFees: Math.round(totalFeesPeriod * 100) / 100,
        totalRefunds: Math.round(totalRefundsPeriod * 100) / 100,
        salesCount: salesCountPeriod,
        pendingCount: pendingCountPeriod,
        failedCount: failedCountPeriod,
      },
      modalities: {
        packs: {
          label: 'Conteúdos & Packs',
          ...modalityMetrics.packs,
          gross: Math.round(modalityMetrics.packs.gross * 100) / 100,
          net: Math.round(modalityMetrics.packs.net * 100) / 100,
          fees: Math.round(modalityMetrics.packs.fees * 100) / 100,
        },
        personalizados: {
          label: 'Personalizados',
          ...modalityMetrics.personalizados,
          gross: Math.round(modalityMetrics.personalizados.gross * 100) / 100,
          net: Math.round(modalityMetrics.personalizados.net * 100) / 100,
          fees: Math.round(modalityMetrics.personalizados.fees * 100) / 100,
        },
        chamadas: {
          label: 'Chamadas de Vídeo',
          ...modalityMetrics.chamadas,
          gross: Math.round(modalityMetrics.chamadas.gross * 100) / 100,
          net: Math.round(modalityMetrics.chamadas.net * 100) / 100,
          fees: Math.round(modalityMetrics.chamadas.fees * 100) / 100,
        },
      },
      timeline,
      transactions: displayedTransactions,
      totalTransactionsCount: displayedTransactions.length,
      updatedAt: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
};
