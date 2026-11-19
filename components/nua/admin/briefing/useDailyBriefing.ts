/**
 * components/nua/admin/briefing/useDailyBriefing.ts
 *
 * Hook de controle do Briefing Diário Matinal.
 * Gerencia a frequência (1 vez por dia via localStorage) e o cálculo
 * instantâneo (<50ms) das métricas operacionais sem requisições adicionais.
 */

import { useState, useEffect, useMemo } from 'react';
import { SiteContent } from '@/lib/types';
import { UnifiedOrderFeedItem } from '@/functions/api/admin/orders-feed';

interface UseDailyBriefingProps {
  orders?: UnifiedOrderFeedItem[];
  content?: SiteContent | null;
  subscriptionStatus?: 'paid' | 'pending' | 'overdue' | 'loading';
}

const STORAGE_KEY = 'nua_daily_briefing_last_seen';

export function useDailyBriefing({
  orders = [],
  content,
  subscriptionStatus = 'paid',
}: UseDailyBriefingProps) {
  const [isOpen, setIsOpen] = useState(false);

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Verifica exibição automática 1x por dia
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const lastSeen = localStorage.getItem(STORAGE_KEY);
      if (lastSeen !== todayStr) {
        // Primeira sessão do dia: abre o briefing suavemente
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, [todayStr]);

  // Listener para abertura manual via Header / Spotlight
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open_daily_briefing', handleOpen);
    return () => window.removeEventListener('open_daily_briefing', handleOpen);
  }, []);

  const handleDismiss = () => {
    setIsOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, todayStr);
    } catch {}
  };

  // Cálculo determinístico e ultra-rápido (<50ms) das métricas
  const metrics = useMemo(() => {
    // 1. Personalizados na fila
    const personalizadosPending = orders.filter((o) => {
      if (o.type !== 'personalizado') return false;
      const st = String(o.status || '').toLowerCase().trim();
      return ['em_producao', 'pronto', 'pendente'].includes(st);
    });

    // 2. Chamadas marcadas para hoje (data agendada da chamada = hoje e não cancelada/ausente)
    const appointmentsToday = orders.filter((o) => {
      const typeStr = String(o.type || '');
      if (typeStr !== 'appointment' && typeStr !== 'chamada') return false;
      const st = String(o.status || '').toLowerCase().trim();
      if (['cancelada', 'nao_compareceu', 'cancelled', 'failed'].includes(st)) return false;
      const scheduledDate = String(o.meta?.date || '').slice(0, 10) || String(o.createdAt || '').slice(0, 10);
      return scheduledDate === todayStr;
    });

    // 3. Vendas recentes (últimas 24h)
    const nowMs = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const recentOrders = orders.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return nowMs - t <= oneDayMs;
    });
    const recentSalesTotal = recentOrders.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    // 4. Mídias não utilizadas da biblioteca
    const libraryPhotos = (content?.library || []).filter((m) => !m.isVideo);
    const galleryUrls = new Set((content?.gallery?.photos || []).map((p) => p.imageUrl));
    const heroUrls = new Set((content?.hero?.photos || []).map((s) => s.imageUrl));
    const unusedCount = libraryPhotos.filter((m) => !galleryUrls.has(m.url) && !heroUrls.has(m.url)).length;

    return {
      appointmentsTodayCount: appointmentsToday.length,
      appointmentsTodayItems: appointmentsToday,
      personalizadosPendingCount: personalizadosPending.length,
      personalizadosItems: personalizadosPending,
      recentSalesTotal,
      isSubscriptionUpToDate: subscriptionStatus === 'paid',
      unusedLibraryPhotosCount: unusedCount,
    };
  }, [orders, content, subscriptionStatus, todayStr]);

  return {
    isOpen,
    setIsOpen,
    handleDismiss,
    todayStr,
    metrics,
  };
}
