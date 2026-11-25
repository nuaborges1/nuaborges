'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DollarSign,
  Video,
  Camera,
  ShoppingBag,
  Brain,
} from 'lucide-react';
import { SpotlightItem } from './types';
import { STATIC_ACTIONS } from './catalog';
import { SiteContent } from '@/lib/types';
import { fetchUnifiedOrdersFeed } from '@/lib/services/nua/ordersFeedService';
import { UnifiedOrderFeedItem } from '@/functions/api/admin/orders-feed';
import { AdminModuleId } from '../AdminSidebar';

interface UseSpotlightSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (moduleId: AdminModuleId, subAction?: string) => void;
  content?: SiteContent | null;
}

export function useSpotlightSearch({
  isOpen,
  onClose,
  onNavigate,
  content,
}: UseSpotlightSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [orders, setOrders] = useState<UnifiedOrderFeedItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Carrega feed de pedidos recentes em segundo plano
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setLoadingOrders(true);
    fetchUnifiedOrdersFeed()
      .then((res) => {
        if (isMounted && res.orders) {
          setOrders(res.orders);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoadingOrders(false);
      });
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Handoff para o chat da Nay
  const handleOpenNuaAi = useCallback((customPrompt?: string) => {
    onClose();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('open_nua_ai', {
          detail: { initialPrompt: customPrompt || query },
        })
      );
    }
  }, [onClose, query]);

  const cleanQuery = query.trim().toLowerCase();

  // 1. Respostas Operacionais Diretas (Mini-Cards baseados em dados reais)
  const directMetricCard = useMemo<SpotlightItem | null>(() => {
    if (!cleanQuery) return null;

    // A. Pergunta sobre faturamento / dinheiro
    if (
      cleanQuery.includes('faturei') ||
      cleanQuery.includes('faturamento') ||
      cleanQuery.includes('quanto ganhei') ||
      cleanQuery.includes('quanto entrou') ||
      cleanQuery.includes('vendas de ontem') ||
      cleanQuery.includes('total de vendas')
    ) {
      const paidOrders = orders.filter((o) =>
        [
          'succeeded',
          'paid',
          'approved',
          'pago',
          'pago_liberado',
          'em_producao',
          'pronto',
          'entregue',
          'confirmada',
          'concluida',
        ].includes(String(o.status || '').toLowerCase())
      );
      const totalSum = paidOrders.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSum);

      return {
        id: 'metric_revenue',
        title: `Faturamento em Pedidos Ativos: ${formatted}`,
        subtitle: `${paidOrders.length} transações confirmadas registradas no sistema`,
        category: 'metric',
        categoryLabel: 'RESPOSTA OPERACIONAL',
        icon: DollarSign,
        moduleId: 'financeiro',
        badge: 'CONFIRMADO',
        badgeVariant: 'success',
      };
    }

    // B. Pergunta sobre chamadas de vídeo
    if (
      cleanQuery.includes('chamada') ||
      cleanQuery.includes('call') ||
      cleanQuery.includes('agenda hoje') ||
      cleanQuery.includes('tenho chamada')
    ) {
      const appointments = orders.filter((o) => o.type === 'appointment');
      return {
        id: 'metric_calls',
        title: appointments.length > 0
          ? `${appointments.length} Chamada(s) VIP registrada(s) na agenda`
          : 'Nenhuma chamada VIP agendada para este momento',
        subtitle: 'Acesse a agenda para conferir horários reservados e links de salas',
        category: 'metric',
        categoryLabel: 'AGENDA VIP',
        icon: Video,
        moduleId: 'chamadas',
        badge: appointments.length > 0 ? `${appointments.length} AGENDADAS` : 'LIVRE',
        badgeVariant: appointments.length > 0 ? 'primary' : 'info',
      };
    }

    // C. Pergunta sobre pedidos pendentes
    if (
      cleanQuery.includes('pendente') ||
      cleanQuery.includes('pendencias') ||
      cleanQuery.includes('tem pedido') ||
      cleanQuery.includes('aguardando')
    ) {
      const pendingOrders = orders.filter(
        (o) => o.status === 'aguardando_pagamento' || o.status === 'em_producao' || o.status === 'pending'
      );
      return {
        id: 'metric_pending',
        title: `${pendingOrders.length} pedido(s) sob medida aguardando ação`,
        subtitle: 'Pedidos personalizados em fila ou aguardando produção no cofre',
        category: 'metric',
        categoryLabel: 'FILA OPERACIONAL',
        icon: Camera,
        moduleId: 'personalizados',
        badge: pendingOrders.length > 0 ? 'REQUER ATENÇÃO' : 'ZERADA',
        badgeVariant: pendingOrders.length > 0 ? 'warning' : 'success',
      };
    }

    return null;
  }, [cleanQuery, orders]);

  // 2. Resultados filtrados combinados (Ações + Conteúdos + Pedidos)
  const searchResults = useMemo<SpotlightItem[]>(() => {
    const list: SpotlightItem[] = [];

    // Se houver resposta direta, entra no topo
    if (directMetricCard) {
      list.push(directMetricCard);
    }

    // Ações Rápidas Estáticas
    STATIC_ACTIONS.forEach((act) => {
      if (!cleanQuery) {
        if (['act_novo_pack', 'act_pedidos_fila', 'act_agenda_chamadas', 'act_whatsapp', 'act_financeiro_extrato'].includes(act.id)) {
          list.push({
            id: act.id,
            title: act.title,
            subtitle: act.subtitle,
            category: 'action',
            categoryLabel: 'AÇÃO RÁPIDA',
            icon: act.icon,
            moduleId: act.moduleId,
            subAction: act.subAction,
          });
        }
        return;
      }

      const titleMatch = act.title.toLowerCase().includes(cleanQuery);
      const kwMatch = act.keywords.some((k) => k.toLowerCase().includes(cleanQuery) || cleanQuery.includes(k));

      if (titleMatch || kwMatch) {
        list.push({
          id: act.id,
          title: act.title,
          subtitle: act.subtitle,
          category: 'action',
          categoryLabel: 'AÇÃO RÁPIDA',
          icon: act.icon,
          moduleId: act.moduleId,
          subAction: act.subAction,
        });
      }
    });

    // Conteúdos & Packs Avulsos Reais cadastrados no content
    if (content?.avulsos?.items && content.avulsos.items.length > 0) {
      content.avulsos.items.forEach((item) => {
        if (!cleanQuery) return;
        const titleMatch = (item.title || '').toLowerCase().includes(cleanQuery);
        const descMatch = (item.description || '').toLowerCase().includes(cleanQuery);

        if (titleMatch || descMatch) {
          list.push({
            id: `avulso_${item.id}`,
            title: item.title,
            subtitle: `Conteúdos & Packs • ${item.price || 'Avulso'}`,
            category: 'content',
            categoryLabel: 'PACK AVULSO',
            icon: ShoppingBag,
            moduleId: 'conteudos',
            badge: item.price,
            badgeVariant: 'primary',
          });
        }
      });
    }

    // Álbuns de Mídias Reais cadastrados no content
    if (content?.albums && content.albums.length > 0) {
      content.albums.forEach((album) => {
        if (!cleanQuery) return;
        const titleMatch = (album.name || '').toLowerCase().includes(cleanQuery);
        const descMatch = (album.description || '').toLowerCase().includes(cleanQuery);

        if (titleMatch || descMatch) {
          list.push({
            id: `album_${album.id}`,
            title: album.name,
            subtitle: `Biblioteca de Mídias • Álbum com ${album.mediaIds?.length || 0} mídias`,
            category: 'content',
            categoryLabel: 'ÁLBUM DE MÍDIAS',
            icon: ShoppingBag,
            moduleId: 'midias',
            badge: `${album.mediaIds?.length || 0} mídias`,
            badgeVariant: 'info',
          });
        }
      });
    }

    // Pedidos Reais Encontrados no Feed
    if (cleanQuery && orders.length > 0) {
      orders.forEach((ord) => {
        const custMatch = (ord.customerName || '').toLowerCase().includes(cleanQuery);
        const titleMatch = (ord.title || '').toLowerCase().includes(cleanQuery);
        const idMatch = ord.id.toLowerCase().includes(cleanQuery);

        if (custMatch || titleMatch || idMatch) {
          const isPackOrder =
            ord.type === 'pack' ||
            (ord.type as any) === 'avulso' ||
            Boolean((ord as any).meta?.isPack);
          const isPersOrder = ord.type === 'personalizado';
          list.push({
            id: `order_${ord.id}`,
            title: `${ord.title} — ${ord.customerName}`,
            subtitle: `${ord.statusLabel} • ${ord.amountFormatted} • Pedido #${ord.id.slice(-6)}`,
            category: 'order',
            categoryLabel: isPackOrder
              ? 'CONTEÚDO & PACK'
              : isPersOrder
              ? 'PERSONALIZADO'
              : 'CHAMADA VIP',
            icon: isPackOrder ? ShoppingBag : isPersOrder ? Camera : Video,
            moduleId: isPackOrder ? 'historico' : isPersOrder ? 'personalizados' : 'chamadas',
            subAction: !isPackOrder && !isPersOrder ? ord.id : undefined,
            badge: ord.statusLabel,
            badgeVariant:
              ord.status === 'em_producao' ||
              ord.status === 'succeeded' ||
              ord.status === 'confirmada' ||
              ord.status === 'concluida'
                ? 'success'
                : 'warning',
          });
        }
      });
    }

    // Item de sugestão para Nay se for uma pergunta aberta
    if (
      cleanQuery.length > 3 &&
      (cleanQuery.includes('como') ||
        cleanQuery.includes('ideia') ||
        cleanQuery.includes('roteiro') ||
        cleanQuery.includes('post') ||
        cleanQuery.includes('reels') ||
        cleanQuery.includes('sexologia') ||
        cleanQuery.includes('dúvida') ||
        cleanQuery.includes('ajuda') ||
        list.length === 0)
    ) {
      list.push({
        id: 'ai_handoff_item',
        title: `Perguntar à Nay: "${query}"`,
        subtitle: 'Consultoria estratégica de criação, sexologia e sugestões de conteúdo',
        category: 'ai',
        categoryLabel: 'ASSISTENTE NAY',
        icon: Brain,
        badge: 'CHAT IA',
        badgeVariant: 'primary',
        onExecute: () => handleOpenNuaAi(query),
      });
    }

    return list;
  }, [cleanQuery, directMetricCard, content, orders, query, handleOpenNuaAi]);

  // Ajusta índice selecionado ao mudar busca
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults.length]);

  // Executa item selecionado
  const executeItem = useCallback((item?: SpotlightItem) => {
    const target = item || searchResults[selectedIndex];
    if (!target) return;

    if (target.onExecute) {
      target.onExecute();
      return;
    }

    if (target.moduleId) {
      onNavigate(target.moduleId, target.subAction);
      onClose();
    }
  }, [searchResults, selectedIndex, onNavigate, onClose]);

  // Navegação por teclado (Setas, Enter, Esc, Tab)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < searchResults.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executeItem();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleOpenNuaAi(query);
    }
  };

  return {
    query,
    setQuery,
    selectedIndex,
    setSelectedIndex,
    loadingOrders,
    searchResults,
    executeItem,
    handleKeyDown,
    handleOpenNuaAi,
  };
}
