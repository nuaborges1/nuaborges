import type { UnifiedOrderFeedItem } from '@/functions/api/admin/orders-feed';
import type { AdminModuleId, ModuleBadgeInfo } from '@/app/admin/components/types';

function isPackItem(o: UnifiedOrderFeedItem): boolean {
  return (
    Boolean(o.meta?.isPack) ||
    o.type === 'pack' ||
    o.type === 'avulso' ||
    String(o.title || '').toLowerCase().includes('pack')
  );
}

/**
 * Calcula indicadores discretos por módulo da sidebar sem duplicação entre módulos.
 *
 * Regras:
 * - Diferencia: Novo (!readOrderIds.has(id)), Visualizado (readOrderIds.has(id)) e Pendente (ação operacional).
 * - Pendências operacionais permanecem visíveis mesmo depois que a página foi aberta.
 * - Cada pedido contribui para no máximo 1 módulo na sidebar (sem dupla contagem).
 * - Oculta módulos com contagem 0.
 */
export function computeSidebarBadges(
  orders: UnifiedOrderFeedItem[],
  readOrderIds: Set<string>
): Partial<Record<AdminModuleId, ModuleBadgeInfo>> {
  const result: Partial<Record<AdminModuleId, ModuleBadgeInfo>> = {};

  const conteudosIds = new Set<string>();
  const personalizadosIds = new Set<string>();
  const chamadasIds = new Set<string>();
  const historicoIds = new Set<string>();

  for (const order of orders) {
    if (!order?.id) continue;
    const status = String(order.status || '').toLowerCase().trim();
    const isUnread = !readOrderIds.has(order.id);
    const refundStatus = String(order.meta?.refundStatus || '').toLowerCase().trim();

    if (isPackItem(order)) {
      // Packs/Avulsos não têm fila de produção; destacamos compras novas ainda não visualizadas
      if (isUnread && status !== 'refunded' && status !== 'cancelado' && status !== 'cancelada') {
        conteudosIds.add(order.id);
      }
      continue;
    }

    if (order.type === 'personalizado') {
      const isPending = status === 'em_producao' || status === 'pronto';
      if (isPending || (isUnread && status !== 'entregue' && status !== 'cancelado')) {
        personalizadosIds.add(order.id);
      } else if (isUnread) {
        historicoIds.add(order.id);
      }
      continue;
    }

    if (order.type === 'appointment') {
      const isPendingRefund =
        status === 'cancelada' &&
        ['pending', 'failed', 'manual_required'].includes(refundStatus);
      const isPending =
        status === 'confirmada' || status === 'reagendamento_pendente' || isPendingRefund;
      if (isPending) {
        chamadasIds.add(order.id);
      } else if (isUnread) {
        historicoIds.add(order.id);
      }
      continue;
    }

    // Modalidades futuras desconhecidas: contabiliza em Histórico quando não visualizadas
    if (isUnread) {
      historicoIds.add(order.id);
    }
  }

  if (conteudosIds.size > 0) {
    result.conteudos = { count: conteudosIds.size, variant: 'info' };
  }
  if (personalizadosIds.size > 0) {
    result.personalizados = { count: personalizadosIds.size, variant: 'danger' };
  }
  if (chamadasIds.size > 0) {
    result.chamadas = { count: chamadasIds.size, variant: 'danger' };
  }
  if (historicoIds.size > 0) {
    result.historico = { count: historicoIds.size, variant: 'warning' };
  }

  return result;
}
