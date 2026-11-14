/**
 * Serviço Client-Side do Feed Unificado de Pedidos | Nua Borges
 *
 * Busca pedidos recentes de todas as categorias para a Central de Notificações.
 * Suporta fallback local resiliente com listPersonalizadosOrders() e listBookings().
 */

import { getPublicApiUrl, getStoredSessionToken } from '@/lib/contentStore';
import { listPersonalizadosOrders } from '@/lib/personalizadosStore';
import { listBookings } from '@/lib/appointmentsStore';
import { formatCurrencyBrl } from '@/lib/personalizadosCanonical';
import { UnifiedOrderFeedItem } from '@/functions/api/admin/orders-feed';

export async function fetchUnifiedOrdersFeed(): Promise<{
  success: boolean;
  count: number;
  pendingCount: number;
  orders: UnifiedOrderFeedItem[];
}> {
  const apiUrl = getPublicApiUrl();
  const token = getStoredSessionToken();
  const endpoint = `${apiUrl}/api/admin/orders-feed`;

  try {
    const res = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        return data;
      }
    }
  } catch (err) {
    // Falha silenciosa no fetch, prossegue para fallback local
  }

  // Fallback local em memória/localStorage
  const localFeed: UnifiedOrderFeedItem[] = [];

  try {
    const pOrders = listPersonalizadosOrders();
    for (const o of pOrders) {
      const summaryTitle =
        o.photoCount > 0 && o.videoDurationMinutes > 0
          ? `Personalizado (${o.photoCount} fotos + vídeo)`
          : o.photoCount > 0
          ? `Personalizado (${o.photoCount} fotos)`
          : o.videoDurationMinutes > 0
          ? `Vídeo Personalizado (${o.videoDurationMinutes} min)`
          : 'Pedido Personalizado';

      localFeed.push({
        id: o.id,
        type: 'personalizado',
        title: summaryTitle,
        customerName: o.clientName || 'Cliente',
        customerContact: o.clientContact || '',
        amount: o.totalPrice || 0,
        amountFormatted: formatCurrencyBrl(o.totalPrice || 0),
        status: o.status,
        statusLabel:
          o.status === 'aguardando_pagamento'
            ? 'Aguardando Pagamento'
            : o.status === 'em_producao'
            ? 'Pago / Em Produção'
            : o.status === 'pronto'
            ? 'Pronto no Cofre'
            : o.status === 'entregue'
            ? 'Entregue'
            : 'Cancelado',
        createdAt: o.createdAt,
        tab: 'personalizados',
      });
    }

    const bOrders = listBookings();
    for (const b of bOrders) {
      localFeed.push({
        id: b.id,
        type: 'appointment',
        title: `Chamada: ${b.modalityName || 'Vídeo'}`,
        customerName: b.clientName || 'Cliente',
        customerContact: b.clientPhone || b.clientEmail || '',
        amount: b.price || 0,
        amountFormatted: formatCurrencyBrl(b.price || 0),
        status: b.status,
        statusLabel:
          b.status === 'confirmada'
            ? 'Confirmada'
            : b.status === 'aguardando_pagamento'
            ? 'Aguardando Pagamento'
            : b.status === 'concluida'
            ? 'Concluída'
            : 'Cancelada',
        createdAt: b.createdAt,
        tab: 'appointments',
      });
    }
  } catch {}

  localFeed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const pendingCount = localFeed.filter((i) =>
    ['aguardando_pagamento', 'em_producao', 'confirmada'].includes(i.status as string)
  ).length;

  return {
    success: true,
    count: localFeed.length,
    pendingCount,
    orders: localFeed,
  };
}
