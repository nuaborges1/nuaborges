/**
 * Cloudflare Pages Function: /api/admin/orders-feed
 *
 * Feed unificado de pedidos CONFIRMADOS/PAGOS para monitoramento no Admin:
 * - Apenas gera alerta e notificação quando o cliente REALMENTE COMPRA / PAGA.
 * - Ignora QR Codes PIX que foram apenas gerados (aguardando pagamento).
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
  type: 'personalizado' | 'appointment';
  title: string;
  customerName: string;
  customerContact?: string;
  amount: number;
  amountFormatted: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  tab: 'personalizados' | 'appointments';
  meta?: any;
}

const PAID_CONFIRMED_STATUSES = new Set([
  'paid', 'approved', 'em_producao', 'confirmada', 'concluida', 'pronto', 'entregue', 'pago'
]);

export const onRequestGet = async (context: PagesContext<Env>) => {
  const { env } = context;
  const feed: UnifiedOrderFeedItem[] = [];

  try {
    // 1. Encomendas Personalizadas do Supabase
    const persOrders = await listPersonalizadosOrdersFromSupabase(env, { limit: 50 });
    for (const o of persOrders) {
      // Ignora QR Codes apenas gerados que não foram pagos
      if (!PAID_CONFIRMED_STATUSES.has(o.status || '')) {
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
            : 'Pago',
        createdAt: o.createdAt || new Date().toISOString(),
        tab: 'personalizados',
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
      if (!PAID_CONFIRMED_STATUSES.has(b.status || '')) {
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
            : b.status === 'concluida'
            ? 'Concluída'
            : 'Confirmada',
        createdAt: b.createdAt || new Date().toISOString(),
        tab: 'appointments',
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
    // 3. Vendas de Conteúdos & Packs (orders)
    const sb = (await import('../_supabaseClient')).getSupabaseClient(env);
    if (sb) {
      const { data: commercialOrders } = await sb
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (Array.isArray(commercialOrders)) {
        for (const o of commercialOrders) {
          if (!PAID_CONFIRMED_STATUSES.has(o.status || '')) {
            continue;
          }
          feed.push({
            id: o.id,
            type: 'personalizado' as any,
            title: `Pack / Conteúdo: ${o.pack_id || 'Digital'}`,
            customerName: o.customer_name || 'Cliente Digital',
            customerContact: o.customer_email || '',
            amount: Number(o.amount || 0),
            amountFormatted: formatCurrencyBrl(Number(o.amount || 0)),
            status: o.status,
            statusLabel: 'Pago / Liberado',
            createdAt: o.created_at || new Date().toISOString(),
            tab: 'personalizados' as any,
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
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};

export const onRequest = async (context: PagesContext<Env>) => {
  if (context.request.method === 'OPTIONS') {
    return onRequestOptions();
  }
  return onRequestGet(context);
};
