/**
 * Cloudflare Pages Function: /api/admin/orders-feed
 *
 * Feed unificado de pedidos CONFIRMADOS/PAGOS para monitoramento no Admin:
 * - Apenas gera alerta e notificação quando o cliente REALMENTE COMPRA / PAGA.
 * - Ignora QR Codes PIX que foram apenas gerados (aguardando pagamento) ou que expiraram sem pagamento.
 * - Deduplica a tabela `orders` contra `appointments` e `personalizados_orders`.
 */

import { formatCurrencyBrl } from '../../../lib/personalizadosCanonical';
import {
  listAppointmentsFromSupabase,
  listPersonalizadosOrdersFromSupabase,
} from '../_supabaseStore';

interface Env {
  ADMIN_TOKEN?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  [key: string]: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export interface UnifiedOrderFeedItem {
  id: string;
  type: 'personalizado' | 'appointment' | 'pack' | 'avulso';
  title: string;
  customerName: string;
  customerContact?: string;
  amount: number;
  amountFormatted: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  tab: 'personalizados' | 'appointments' | 'chamadas' | 'historico' | 'conteudos';
  meta?: any;
}

const PAID_CONFIRMED_STATUSES = new Set([
  'paid',
  'approved',
  'em_producao',
  'confirmada',
  'reagendamento_pendente',
  'concluida',
  'pronto',
  'entregue',
  'pago',
  'pago_liberado',
  'liberado',
  'nao_compareceu',
  'cancelada',
]);

export const onRequestGet = async (context: PagesContext<Env>) => {
  const { env } = context;
  const feed: UnifiedOrderFeedItem[] = [];
  const seenNonPackIds = new Set<string>();

  try {
    // 1. Encomendas Personalizadas do Supabase
    const persOrders = await listPersonalizadosOrdersFromSupabase(env, { limit: 50 });
    for (const o of persOrders) {
      if (o.id) seenNonPackIds.add(o.id);
      // Ignora QR Codes apenas gerados que não foram pagos
      if (!PAID_CONFIRMED_STATUSES.has(o.status || '')) {
        continue;
      }
      if (
        o.status === 'cancelado' &&
        o.payment?.status !== 'approved' &&
        String(o.payment?.status || '') !== 'refunded'
      ) {
        continue;
      }

      const photoCount = o.photoCount || 0;
      const videoDuration = o.videoDurationMinutes || 0;
      const summaryTitle =
        photoCount > 0 && videoDuration > 0
          ? `Personalizado (${photoCount} fotos + vídeo)`
          : photoCount > 0
          ? `Personalizado (${photoCount} fotos)`
          : videoDuration > 0
          ? `Vídeo Personalizado (${videoDuration} min)`
          : 'Pedido Personalizado';

      const customerName = o.clientName || 'Cliente';
      const customerContact = o.clientContact || '';
      const amount = o.totalPrice || 0;

      feed.push({
        id: o.id,
        type: 'personalizado',
        title: summaryTitle,
        customerName,
        customerContact,
        amount,
        amountFormatted: formatCurrencyBrl(amount),
        status: o.status || 'em_producao',
        statusLabel:
          o.status === 'em_producao'
            ? 'Pago / Em Produção'
            : o.status === 'pronto'
            ? 'Pronto'
            : o.status === 'entregue'
            ? 'Entregue'
            : o.status === 'cancelado'
            ? 'Cancelado'
            : 'Pago',
        createdAt: o.createdAt || new Date().toISOString(),
        tab: ['entregue', 'cancelada', 'cancelado'].includes(o.status || '')
          ? 'historico'
          : 'personalizados',
        meta: {
          publicToken: o.publicToken,
          notes: o.briefing,
        },
      });
    }
  } catch (e) {
    console.warn('[OrdersFeed] Erro ao ler personalizados do Supabase:', e);
  }

  try {
    // 2. Chamadas de Vídeo / Agendamentos do Supabase
    const appBookings = await listAppointmentsFromSupabase(env, { limit: 50 });
    for (const b of appBookings) {
      if (b.id) seenNonPackIds.add(b.id);
      if (!PAID_CONFIRMED_STATUSES.has(b.status || '')) {
        continue;
      }
      // Ignora reservas que expiraram ou foram canceladas sem nunca terem sido pagas
      const wasActuallyPaid =
        b.payment?.status === 'approved' ||
        b.payment?.status === 'manual_confirmed' ||
        b.payment?.status === 'refunded';
      if (
        (b.status === 'cancelada' || b.status === 'reagendamento_pendente') &&
        !wasActuallyPaid &&
        b.cancellation?.state !== 'requested'
      ) {
        continue;
      }

      feed.push({
        id: b.id,
        type: 'appointment',
        title: `Chamada: ${b.modalityName || 'Vídeo'}`,
        customerName: b.clientName || 'Cliente',
        customerContact: b.clientPhone || b.clientEmail || '',
        amount: b.price || 0,
        amountFormatted: formatCurrencyBrl(b.price || 0),
        status: b.status || 'confirmada',
        statusLabel:
          b.status === 'confirmada'
            ? 'Confirmada'
            : b.status === 'reagendamento_pendente'
            ? b.cancellation?.state === 'requested'
              ? 'Cancelamento Solicitado'
              : 'Reagendamento Pendente'
            : b.status === 'concluida'
            ? 'Concluída'
            : b.status === 'nao_compareceu'
            ? 'Não Compareceu'
            : b.status === 'cancelada'
            ? b.payment?.status === 'refunded'
              ? 'Cancelada (Reembolsada)'
              : 'Cancelada'
            : 'Confirmada',
        createdAt: b.createdAt || new Date().toISOString(),
        tab: ['concluida', 'cancelada', 'nao_compareceu', 'ausente'].includes(b.status || '')
          ? 'historico'
          : 'chamadas',
        meta: {
          date: b.date,
          time: b.startTime,
          publicToken: b.publicToken,
        },
      });
    }
  } catch (e) {
    console.warn('[OrdersFeed] Erro ao ler agendamentos do Supabase:', e);
  }

  try {
    // 3. Vendas de Conteúdos & Packs (orders) — deduplicadas contra Chamadas e Personalizados
    const sb = (await import('../_supabaseClient')).getSupabaseClient(env);
    if (sb) {
      const { data: commercialOrders } = await sb
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (Array.isArray(commercialOrders)) {
        for (const o of commercialOrders) {
          const orderId = String(o.id || '');
          const packId = String(o.pack_id || '');
          // Evita duplicar Chamadas VIP ou Personalizados que também gravam na tabela orders
          if (
            seenNonPackIds.has(orderId) ||
            orderId.startsWith('app_') ||
            orderId.startsWith('apt_') ||
            orderId.startsWith('ped_') ||
            orderId.startsWith('pers_') ||
            packId.startsWith('chamada-')
          ) {
            continue;
          }
          if (!PAID_CONFIRMED_STATUSES.has(o.status || '') || o.status === 'cancelada') {
            continue;
          }
          feed.push({
            id: o.id,
            type: 'pack',
            title: `Pack / Conteúdo: ${o.pack_id || 'Digital'}`,
            customerName: o.customer_name || 'Cliente Digital',
            customerContact: o.customer_email || '',
            amount: Number(o.amount || 0),
            amountFormatted: formatCurrencyBrl(Number(o.amount || 0)),
            status: o.status,
            statusLabel: 'Pago / Liberado',
            createdAt: o.created_at || new Date().toISOString(),
            tab: 'historico',
            meta: {
              packId: o.pack_id,
              purchaseToken: o.purchase_token,
              isPack: true,
            },
          });
        }
      }
    }
  } catch (e) {
    console.warn('[OrdersFeed] Erro ao ler orders do Supabase:', e);
  }

  // Ordena feed por data mais recente
  feed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return new Response(
    JSON.stringify({
      success: true,
      count: feed.length,
      pendingCount: feed.length,
      orders: feed,
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

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
  });
};

export const onRequest = async (context: PagesContext<Env>) => {
  if (context.request.method === 'OPTIONS') {
    return onRequestOptions();
  }
  return onRequestGet(context);
};
