'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  Calendar,
  ArrowUpRight,
  Plus,
  Images,
  Globe,
  Bell,
  Video,
  Camera,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Send,
  RefreshCw,
  CreditCard,
  ChevronRight,
} from 'lucide-react';
import { SiteContent } from '@/lib/types';
import { AdminModuleId } from '@/types/admin';
import { fetchCommercialFinanceDashboard, CommercialFinanceData } from '@/lib/services/nua/commercialFinanceService';
import { fetchPersonalizadosAdmin } from '@/lib/services/nua/personalizadosService';
import { fetchAdminAppointments } from '@/lib/services/nua/appointmentsService';
import { PersonalizadoOrder } from '@/lib/personalizadosCanonical';
import { AppointmentBooking } from '@/lib/appointments/types';
import { UnifiedOrderFeedItem } from '@/functions/api/admin/orders-feed';
import { PageHeader, StatusBadge } from './ui/AdminPrimitives';

interface DashboardModuleProps {
  content: SiteContent;
  ordersFeed?: UnifiedOrderFeedItem[];
  unreadCount: number;
  hasUnpublished: boolean;
  isPublishing: boolean;
  subscriptionStatus: 'paid' | 'pending' | 'overdue' | 'loading';
  onPublish: () => void;
  onSelectModule: (id: AdminModuleId, subAction?: string) => void;
}

export function DashboardModule({
  content,
  ordersFeed = [],
  unreadCount,
  hasUnpublished,
  isPublishing,
  subscriptionStatus,
  onPublish,
  onSelectModule,
}: DashboardModuleProps) {
  const [financeData, setFinanceData] = useState<CommercialFinanceData | null>(null);
  const [customOrders, setCustomOrders] = useState<PersonalizadoOrder[]>([]);
  const [appointments, setAppointments] = useState<AppointmentBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOperationalData = useCallback(async () => {
    setLoading(true);
    try {
      const [finRes, persRes, appRes] = await Promise.allSettled([
        fetchCommercialFinanceDashboard('current_month', 'all', 'all'),
        fetchPersonalizadosAdmin(),
        fetchAdminAppointments(),
      ]);

      if (finRes.status === 'fulfilled' && finRes.value) {
        setFinanceData(finRes.value);
      }
      if (persRes.status === 'fulfilled' && persRes.value?.orders) {
        setCustomOrders(persRes.value.orders);
      }
      if (appRes.status === 'fulfilled' && appRes.value?.bookings) {
        setAppointments(appRes.value.bookings);
      }
    } catch {
      // Falha silenciosa: a dashboard mantém estado vazio seguro
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOperationalData();
  }, [loadOperationalData]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  // Pedidos personalizados que precisam de ação da cliente (pagos/em produção ou prontos para entrega)
  const pendingCustomOrders = useMemo(
    () =>
      customOrders.filter((o) =>
        ['em_producao', 'pronto', 'aguardando_pagamento'].includes(o.status)
      ),
    [customOrders]
  );

  const actionableCustomOrders = useMemo(
    () => customOrders.filter((o) => ['em_producao', 'pronto'].includes(o.status)),
    [customOrders]
  );

  // Próximas chamadas VIP (confirmadas ou aguardando confirmação/reagendamento)
  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);

  const upcomingCalls = useMemo(
    () =>
      appointments
        .filter(
          (b) =>
            ['confirmada', 'reagendamento_pendente', 'aguardando_pagamento'].includes(b.status) &&
            b.date >= todayIso
        )
        .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`)),
    [appointments, todayIso]
  );

  const callsNeedingConfirmation = useMemo(
    () =>
      appointments.filter(
        (b) =>
          (b.status === 'confirmada' && !b.meeting?.url) ||
          b.status === 'reagendamento_pendente'
      ),
    [appointments]
  );

  // Indicadores reais do período
  const monthRevenue = financeData?.summary?.totalReceived ?? 0;
  const confirmedSalesCount = financeData?.summary?.salesCount ?? 0;
  const totalPendingOrdersCount =
    actionableCustomOrders.length + callsNeedingConfirmation.length + unreadCount;

  const activePacksCount = useMemo(
    () => (content.avulsos?.items || []).filter((i) => i.active !== false).length,
    [content.avulsos?.items]
  );
  const totalMediaCount = content.library?.length || 0;

  // Itens de Atenção Necessária
  const attentionItems = useMemo(() => {
    const list: {
      id: string;
      title: string;
      subtitle: string;
      badge: string;
      variant: 'danger' | 'warning' | 'accent';
      actionLabel: string;
      onClick: () => void;
    }[] = [];

    if (actionableCustomOrders.length > 0) {
      list.push({
        id: 'pers-pending',
        title: `${actionableCustomOrders.length} ${actionableCustomOrders.length === 1
            ? 'pedido personalizado aguardando entrega'
            : 'pedidos personalizados aguardando entrega'
          }`,
        subtitle: 'Clientes com pagamento confirmado aguardando produção ou envio do arquivo.',
        badge: 'Prioridade',
        variant: 'danger',
        actionLabel: 'Atender fila',
        onClick: () => onSelectModule('personalizados'),
      });
    }

    if (callsNeedingConfirmation.length > 0) {
      list.push({
        id: 'calls-pending',
        title: `${callsNeedingConfirmation.length} ${callsNeedingConfirmation.length === 1
            ? 'chamada VIP precisa de link ou horário'
            : 'chamadas VIP precisam de link ou horário'
          }`,
        subtitle: 'Confirme o link da sala de vídeo ou responda à solicitação de reagendamento.',
        badge: 'Agenda VIP',
        variant: 'warning',
        actionLabel: 'Abrir chamadas',
        onClick: () => onSelectModule('chamadas'),
      });
    }

    if (unreadCount > 0) {
      list.push({
        id: 'unread-alerts',
        title: `${unreadCount} ${unreadCount === 1 ? 'novo alerta não lido' : 'novos alertas não lidos'
          }`,
        subtitle: 'Movimentações recentes registradas na central de pedidos.',
        badge: 'Novo',
        variant: 'accent',
        actionLabel: 'Ver alertas',
        onClick: () => onSelectModule('alertas'),
      });
    }

    if (hasUnpublished) {
      list.push({
        id: 'unpublished-changes',
        title: 'Você tem alterações salvas no rascunho do site',
        subtitle: 'Publique quando quiser colocar as mudanças de textos, fotos ou packs no ar.',
        badge: 'Rascunho',
        variant: 'accent',
        actionLabel: isPublishing ? 'Publicando...' : 'Publicar agora',
        onClick: onPublish,
      });
    }

    if (subscriptionStatus === 'overdue' || subscriptionStatus === 'pending') {
      list.push({
        id: 'subscription-notice',
        title:
          subscriptionStatus === 'overdue'
            ? 'Parcela de manutenção do site vencida'
            : 'Próxima parcela do site disponível',
        subtitle: 'Consulte o cronograma e comprovantes na área de Mensalidade e Contrato.',
        badge: subscriptionStatus === 'overdue' ? 'Vencida' : 'Mensalidade',
        variant: subscriptionStatus === 'overdue' ? 'danger' : 'warning',
        actionLabel: 'Ver mensalidade',
        onClick: () => onSelectModule('mensalidade'),
      });
    }

    return list;
  }, [
    actionableCustomOrders.length,
    callsNeedingConfirmation.length,
    unreadCount,
    hasUnpublished,
    isPublishing,
    subscriptionStatus,
    onSelectModule,
    onPublish,
  ]);

  // Atividade recente combinando feed de pedidos + transações reais do Mercado Pago
  const recentActivity = useMemo(() => {
    const items: {
      id: string;
      title: string;
      customer: string;
      amount: string;
      statusLabel: string;
      dateLabel: string;
      targetModule: AdminModuleId;
    }[] = [];

    if (ordersFeed.length > 0) {
      ordersFeed.slice(0, 5).forEach((o) => {
        items.push({
          id: o.id,
          title: o.title,
          customer: o.customerName || 'Cliente',
          amount: o.amountFormatted,
          statusLabel: o.statusLabel,
          dateLabel: o.createdAt
            ? new Date(o.createdAt).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
            })
            : 'Recente',
          targetModule: o.type === 'appointment' ? 'chamadas' : o.meta?.isPack ? 'conteudos' : 'personalizados',
        });
      });
    } else if (financeData?.transactions && financeData.transactions.length > 0) {
      financeData.transactions.slice(0, 5).forEach((t) => {
        items.push({
          id: t.id,
          title: t.description || t.modalityLabel,
          customer: t.customerName || t.customerEmail || 'Cliente',
          amount: formatCurrency(t.amountGross),
          statusLabel: t.statusLabel,
          dateLabel: t.createdAt
            ? new Date(t.createdAt).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
            })
            : 'Recente',
          targetModule:
            t.modality === 'chamadas'
              ? 'chamadas'
              : t.modality === 'personalizados'
                ? 'personalizados'
                : 'financeiro',
        });
      });
    }

    return items;
  }, [ordersFeed, financeData?.transactions]);

  const formatCallDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}`;
  };

  return (
    <div className="space-y-6 select-none w-full">
      {/* 1. Cabeçalho Operacional Padronizado */}
      <PageHeader
        title="Visão Geral"
        subtitle="Acompanhe suas vendas, pedidos personalizados, próximas chamadas VIP e atalhos para atualizar o site e a biblioteca de mídias."
        helpId="dashboard_geral"
        actions={
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => loadOperationalData()}
              disabled={loading}
              className="adm-btn adm-btn-ghost"
              title="Atualizar indicadores"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#f4a7b9]' : 'text-zinc-400'
                  }`}
              />
              <span>Atualizar</span>
            </button>

            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="adm-btn adm-btn-ghost"
            >
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
              <span>Abrir meu site</span>
            </a>
          </div>
        }
      />

      {/* 2. Indicadores Principais (Exclusivamente Dados Reais) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {/* Receita do mês */}
        <button
          type="button"
          onClick={() => onSelectModule('financeiro')}
          className="adm-card p-4 text-left hover:border-white/15 transition group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Receita no mês</span>
            <div className="w-8 h-8 rounded-lg bg-[#f4a7b9]/10 border border-[#f4a7b9]/20 flex items-center justify-center text-[#f4a7b9]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <span className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              {loading ? '...' : formatCurrency(monthRevenue)}
            </span>
            <span className="text-[11px] text-zinc-400 group-hover:text-[#f4a7b9] inline-flex items-center gap-0.5 transition-colors">
              Financeiro <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">
            {confirmedSalesCount > 0
              ? `${confirmedSalesCount} ${confirmedSalesCount === 1 ? 'venda confirmada' : 'vendas confirmadas'} no período`
              : 'Nenhuma venda registrada neste mês'}
          </p>
        </button>

        {/* Vendas Confirmadas & Catálogo */}
        <button
          type="button"
          onClick={() => onSelectModule('conteudos')}
          className="adm-card p-4 text-left hover:border-white/15 transition group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Packs publicados</span>
            <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-zinc-300">
              <ShoppingBag className="w-4 h-4 text-[#f4a7b9]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <span className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              {activePacksCount}
            </span>
            <span className="text-[11px] text-zinc-400 group-hover:text-[#f4a7b9] inline-flex items-center gap-0.5 transition-colors">
              Ver packs <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">
            {totalMediaCount} {totalMediaCount === 1 ? 'mídia no acervo' : 'mídias na biblioteca'}
          </p>
        </button>

        {/* Pedidos Pendentes */}
        <button
          type="button"
          onClick={() =>
            onSelectModule(actionableCustomOrders.length > 0 ? 'personalizados' : 'alertas')
          }
          className="adm-card p-4 text-left hover:border-white/15 transition group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Pedidos aguardando</span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center border ${totalPendingOrdersCount > 0
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                  : 'bg-white/[0.05] border-white/[0.08] text-zinc-400'
                }`}
            >
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <span className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              {loading ? '...' : pendingCustomOrders.length}
            </span>
            <span className="text-[11px] text-zinc-400 group-hover:text-[#f4a7b9] inline-flex items-center gap-0.5 transition-colors">
              Fila de pedidos <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">
            {actionableCustomOrders.length > 0
              ? `${actionableCustomOrders.length} pagos aguardando produção/entrega`
              : 'Nenhum pedido personalizado pendente'}
          </p>
        </button>

        {/* Próximas Chamadas */}
        <button
          type="button"
          onClick={() => onSelectModule('chamadas')}
          className="adm-card p-4 text-left hover:border-white/15 transition group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Próximas chamadas VIP</span>
            <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[#f4a7b9]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <span className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              {loading ? '...' : upcomingCalls.length}
            </span>
            <span className="text-[11px] text-zinc-400 group-hover:text-[#f4a7b9] inline-flex items-center gap-0.5 transition-colors">
              Ver agenda <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">
            {upcomingCalls[0]
              ? `Próxima: ${formatCallDate(upcomingCalls[0].date)} às ${upcomingCalls[0].startTime}`
              : 'Nenhuma chamada agendada para os próximos dias'}
          </p>
        </button>
      </div>

      {/* 3. Ações Rápidas (5 atalhos diretos exigidos na Fase 3) */}
      <div className="adm-card p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Ações Rápidas
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Acesse diretamente as tarefas mais comuns do seu dia a dia.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          <button
            type="button"
            onClick={() => onSelectModule('conteudos', 'new_pack')}
            className="flex items-center gap-3 p-3 rounded-xl bg-[#f4a7b9]/12 hover:bg-[#f4a7b9]/20 border border-[#f4a7b9]/30 text-left transition cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#f4a7b9] text-zinc-950 flex items-center justify-center shrink-0 shadow-sm">
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-white block truncate">Criar Pack</span>
              <span className="text-[11px] text-zinc-400 block truncate">Novo produto à venda</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectModule('midias', 'upload')}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] text-left transition cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-white/[0.06] text-[#f4a7b9] flex items-center justify-center shrink-0">
              <Images className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-medium text-white block truncate">
                Enviar Fotos/Vídeos
              </span>
              <span className="text-[11px] text-zinc-400 block truncate">
                Biblioteca de Mídias
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectModule('vitrine')}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] text-left transition cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-white/[0.06] text-[#f4a7b9] flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-medium text-white block truncate">Editar Site</span>
              <span className="text-[11px] text-zinc-400 block truncate">
                Capa, galeria e textos
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectModule('personalizados')}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] text-left transition cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-white/[0.06] text-[#f4a7b9] flex items-center justify-center shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-medium text-white block truncate">
                Consultar Pedidos
              </span>
              <span className="text-[11px] text-zinc-400 block truncate">
                Encomendas e alertas
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectModule('chamadas')}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] text-left transition cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-white/[0.06] text-[#f4a7b9] flex items-center justify-center shrink-0">
              <Video className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-medium text-white block truncate">
                Gerenciar Agenda
              </span>
              <span className="text-[11px] text-zinc-400 block truncate">
                Chamadas VIP e folgas
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 4. Grid Principal: Atenção Necessária + Atividade Recente & Próximas Chamadas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Coluna Esquerda (7 cols): O que preciso resolver agora? */}
        <div className="lg:col-span-7 adm-card p-4 sm:p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#f4a7b9]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                  Atenção Necessária
                </h3>
              </div>
              <span className="text-[11px] text-zinc-400">
                {attentionItems.length === 0
                  ? 'Tudo em dia'
                  : `${attentionItems.length} ${attentionItems.length === 1 ? 'item pendente' : 'itens pendentes'
                  }`}
              </span>
            </div>

            {attentionItems.length === 0 ? (
              <div className="py-8 px-4 rounded-xl bg-[#101116] border border-white/[0.04] text-center space-y-2">
                <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
                <p className="text-xs font-medium text-white">
                  Nenhuma pendência operacional no momento
                </p>
                <p className="text-[11px] text-zinc-400 max-w-md mx-auto">
                  Seus pedidos personalizados, chamadas VIP e publicações do site estão em dia. Use os atalhos acima para criar um novo pack ou enviar fotos.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {attentionItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-[#101116] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded-full ${item.variant === 'danger'
                              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                              : item.variant === 'warning'
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-[#f4a7b9]/15 text-[#f4a7b9] border border-[#f4a7b9]/30'
                            }`}
                        >
                          {item.badge}
                        </span>
                        <span className="text-xs font-medium text-white">{item.title}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-light">{item.subtitle}</p>
                    </div>

                    <button
                      type="button"
                      onClick={item.onClick}
                      className="adm-btn adm-btn-ghost self-start sm:self-center shrink-0"
                    >
                      <span>{item.actionLabel}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Próximas Chamadas Agendadas (Resumo Rápido) */}
          <div className="pt-3 border-t border-white/[0.06] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-300">Próximos horários na agenda</span>
              <button
                type="button"
                onClick={() => onSelectModule('chamadas')}
                className="text-[11px] text-[#f4a7b9] hover:underline cursor-pointer"
              >
                Abrir calendário →
              </button>
            </div>

            {upcomingCalls.length === 0 ? (
              <div className="p-3 rounded-lg bg-[#101116]/60 border border-white/[0.04] flex items-center justify-between text-xs text-zinc-400">
                <span>Nenhuma chamada VIP agendada para os próximos dias.</span>
                <button
                  type="button"
                  onClick={() => onSelectModule('chamadas')}
                  className="text-[#f4a7b9] hover:underline text-[11px] shrink-0 ml-2 cursor-pointer"
                >
                  Configurar horários
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingCalls.slice(0, 3).map((call) => (
                  <div
                    key={call.id}
                    className="p-3 rounded-lg bg-[#101116] border border-white/[0.05] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-white block truncate">
                        {call.clientName} • {call.modalityName}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        Dia {formatCallDate(call.date)} das {call.startTime} às {call.endTime}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectModule('chamadas')}
                      className="text-[11px] text-[#f4a7b9] hover:underline shrink-0 cursor-pointer"
                    >
                      Detalhes
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Coluna Direita (5 cols): Atividade Recente */}
        <div className="lg:col-span-5 adm-card p-4 sm:p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#f4a7b9]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                  Atividade Recente
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onSelectModule('alertas')}
                className="text-[11px] text-zinc-400 hover:text-white transition cursor-pointer"
              >
                Ver histórico →
              </button>
            </div>

            {recentActivity.length === 0 ? (
              <div className="py-8 px-4 rounded-xl bg-[#101116] border border-white/[0.04] text-center space-y-2.5">
                <ShoppingBag className="w-7 h-7 text-zinc-500 mx-auto" />
                <p className="text-xs font-medium text-white">
                  Ainda não há movimentações recentes
                </p>
                <p className="text-[11px] text-zinc-400">
                  Assim que novos pedidos de packs, personalizados ou chamadas VIP forem confirmados, eles aparecerão aqui.
                </p>
                <div className="pt-1 flex items-center justify-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => onSelectModule('conteudos')}
                    className="adm-btn adm-btn-ghost"
                  >
                    Gerenciar Packs
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectModule('vitrine')}
                    className="adm-btn adm-btn-ghost"
                  >
                    Editar Meu Site
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => onSelectModule(act.targetModule)}
                    className="w-full p-3 rounded-xl bg-[#101116] hover:bg-[#151720] border border-white/[0.05] flex items-center justify-between gap-3 text-left transition cursor-pointer"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-white block truncate">
                        {act.title}
                      </span>
                      <span className="text-[11px] text-zinc-400 block truncate">
                        {act.customer} • {act.dateLabel}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-semibold text-emerald-400 block">
                        {act.amount}
                      </span>
                      <span className="text-[10px] text-zinc-500 block">{act.statusLabel}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rodapé discreto da coluna: Acesso rápido à Mensalidade e Contrato */}
          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-zinc-400 min-w-0">
              <CreditCard className="w-3.5 h-3.5 text-[#f4a7b9] shrink-0" />
              <span className="truncate">Mensalidade do site e contrato</span>
            </div>
            <button
              type="button"
              onClick={() => onSelectModule('mensalidade')}
              className="text-[11px] text-[#f4a7b9] hover:underline shrink-0 cursor-pointer"
            >
              Consultar →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
