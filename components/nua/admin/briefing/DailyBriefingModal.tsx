/* Vinho maduro / Nua Borges */
/**
 * components/nua/admin/briefing/DailyBriefingModal.tsx
 *
 * Modal Executivo de Boas-Vindas da Nua IA: Briefing Matinal.
 * Apresenta o resumo do dia, chamadas VIP, encomendas sob medida,
 * faturamento recente e status da mensalidade com design editorial premium.
 */

import React, { useEffect } from 'react';
import { Sun, Calendar, Package, DollarSign, ShieldCheck, X, ArrowRight, MessageSquare, AlertCircle } from 'lucide-react';
import { BriefingMetricCard } from './BriefingMetricCard';
import { generateBriefingGreeting } from './briefingGreeting';

interface DailyBriefingModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  metrics: {
    appointmentsTodayCount: number;
    personalizadosPendingCount: number;
    recentSalesTotal: number;
    isSubscriptionUpToDate: boolean;
    unusedLibraryPhotosCount: number;
  };
  onNavigateToModule?: (moduleId: string) => void;
  onOpenAiChat?: () => void;
}

export function DailyBriefingModal({
  isOpen,
  onDismiss,
  metrics,
  onNavigateToModule,
  onOpenAiChat,
}: DailyBriefingModalProps) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__NUA_BRIEFING_OPEN__ = isOpen;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      if (typeof window !== 'undefined') {
        (window as any).__NUA_BRIEFING_OPEN__ = false;
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onDismiss]);

  if (!isOpen) return null;

  const { salutation, leadParagraph, proactiveTip } = generateBriefingGreeting(metrics);

  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  const formattedSales = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(metrics.recentSalesTotal);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Resumo do Dia"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-[#12131a] border border-white/[0.12] rounded-3xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col">
        {/* Glow de fundo sutil */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#843C52]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        {/* Header do Modal */}
        <div className="relative px-6 pt-6 pb-4 flex items-center justify-between border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#843C52]/25 border border-[#843C52]/40 flex items-center justify-center text-white shadow-inner">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tracking-wider text-zinc-300 uppercase">
                  Resumo do Dia • Nay
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">{salutation}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-xs text-zinc-400 capitalize">
              {formattedDate}
            </span>
            <button
              onClick={onDismiss}
              aria-label="Fechar resumo do dia"
              className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Corpo do Briefing */}
        <div className="relative px-6 py-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Parágrafo de Lead da IA */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-sm text-zinc-300 leading-relaxed">
            <p
              dangerouslySetInnerHTML={{
                __html: leadParagraph.replace(
                  /\*\*(.*?)\*\*/g,
                  '<strong class="text-white font-semibold">$1</strong>'
                ),
              }}
            />
          </div>

          {/* Grid dos 4 Cards Operacionais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <BriefingMetricCard
              icon={<Calendar className="w-4 h-4" />}
              title="Chamadas VIP Hoje"
              value={metrics.appointmentsTodayCount}
              badgeText={metrics.appointmentsTodayCount > 0 ? 'Na agenda' : 'Livre'}
              badgeVariant={metrics.appointmentsTodayCount > 0 ? 'pink' : 'emerald'}
              description={
                metrics.appointmentsTodayCount > 0
                  ? 'Salas de vídeo prontas para entrar'
                  : 'Nenhuma chamada agendada para hoje'
              }
              onClick={() => {
                onDismiss();
                onNavigateToModule?.('chamadas');
              }}
            />

            <BriefingMetricCard
              icon={<Package className="w-4 h-4" />}
              title="Fila de Personalizados"
              value={metrics.personalizadosPendingCount}
              badgeText={metrics.personalizadosPendingCount > 0 ? 'Produção' : 'Em dia'}
              badgeVariant={metrics.personalizadosPendingCount > 0 ? 'amber' : 'emerald'}
              description={
                metrics.personalizadosPendingCount > 0
                  ? 'Encomendas sob medida aguardando'
                  : 'Todos os personalizados entregues'
              }
              onClick={() => {
                onDismiss();
                onNavigateToModule?.('personalizados');
              }}
            />

            <BriefingMetricCard
              icon={<DollarSign className="w-4 h-4" />}
              title="Vendas das Últimas 24h"
              value={formattedSales}
              badgeText="Comercial"
              badgeVariant="blue"
              description="Packs, personalizados e chamadas"
              onClick={() => {
                onDismiss();
                onNavigateToModule?.('financeiro');
              }}
            />

            <BriefingMetricCard
              icon={
                metrics.isSubscriptionUpToDate ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                )
              }
              title="Mensalidade do Site"
              value={metrics.isSubscriptionUpToDate ? '100% em dia' : 'Pendente'}
              badgeText={metrics.isSubscriptionUpToDate ? 'Regular' : 'Ação requerida'}
              badgeVariant={metrics.isSubscriptionUpToDate ? 'emerald' : 'amber'}
              description="Contrato do desenvolvimento do site"
              onClick={() => {
                onDismiss();
                onNavigateToModule?.('mensalidade');
              }}
            />
          </div>

          {/* Dica da Secretária */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#843C52]/10 to-transparent border border-[#843C52]/25 flex items-start gap-3">
            <span className="text-base select-none">🌸</span>
            <div className="text-xs text-zinc-300 leading-relaxed">
              <span className="font-semibold text-white block mb-0.5">Sugestão da Secretária:</span>
              <p>{proactiveTip}</p>
            </div>
          </div>
        </div>

        {/* Rodapé com Ações Rápidas */}
        <div className="relative px-6 py-4 bg-white/[0.02] border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={() => {
              onDismiss();
              if (onOpenAiChat) {
                onOpenAiChat();
              } else {
                window.dispatchEvent(new CustomEvent('open_nua_ai'));
              }
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-white/[0.08] cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-zinc-300" />
            Conversar com a Nay
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#843C52] hover:bg-[#99455E] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-lg shadow-[#843C52]/20 cursor-pointer"
          >
            Iniciar Meu Dia
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
