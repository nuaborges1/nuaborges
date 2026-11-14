'use client';

import React, { useState } from 'react';
import {
  Bell,
  Sliders,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  ShoppingBag,
  Camera,
  Video,
} from 'lucide-react';
import { useAdminOrderNotifications } from '@/hooks/useAdminOrderNotifications';
import { UnifiedOrderFeedItem } from '@/functions/api/admin/orders-feed';

interface AlertasSistemaModuleProps {
  onNavigateToOrder?: (orderId: string, type: 'personalizado' | 'appointment' | 'pack') => void;
  onNavigateToSettings?: () => void;
}

export function AlertasSistemaModule({
  onNavigateToOrder,
  onNavigateToSettings,
}: AlertasSistemaModuleProps) {
  const [filterType, setFilterType] = useState<'all' | 'personalizado' | 'appointment' | 'pack'>('all');

  const {
    orders,
    unreadCount,
    readOrderIds,
    markAllAsRead,
    refreshOrders,
  } = useAdminOrderNotifications();

  const filteredOrders = orders.filter((item) => {
    if (filterType === 'all') return true;
    if (filterType === 'pack') return item.meta?.isPack === true;
    if (filterType === 'personalizado') return item.type === 'personalizado' && !item.meta?.isPack;
    if (filterType === 'appointment') return item.type === 'appointment';
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Barra Superior Executiva da Central de Alertas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#171821] border border-white/[0.08]">
            <Bell className="w-5 h-5 text-[#f4a7b9]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">Central de Alertas &amp; Pedidos</h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                  {unreadCount} novos
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 font-light">
              Feed operacional de pedidos sob medida, chamadas agendadas e packs vendidos em tempo real.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {onNavigateToSettings && (
            <button
              type="button"
              onClick={onNavigateToSettings}
              className="h-8 px-3 rounded-lg bg-[#171821] hover:bg-[#20222d] border border-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              title="Ajustar sons, volume e permissões do Windows nas Configurações"
            >
              <Sliders className="w-3.5 h-3.5 text-[#f4a7b9]" />
              <span>Configurar Alertas</span>
            </button>
          )}

          <button
            type="button"
            onClick={refreshOrders}
            className="h-8 px-3 rounded-lg bg-[#171821] hover:bg-[#20222d] border border-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            title="Sincronizar novos pedidos imediatamente"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Conteúdo Ativo do Feed */}
      <div className="space-y-4">
        {/* Barra de Filtros e Marcação */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#171821] border border-white/[0.06]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-zinc-400 mr-1">Filtrar por:</span>
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg text-xs transition cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Todos ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('personalizado')}
              className={`px-3 py-1 rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 ${
                filterType === 'personalizado'
                  ? 'bg-[#f4a7b9]/20 text-[#f4a7b9] font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Camera className="w-3 h-3" />
              <span>Personalizados</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('appointment')}
              className={`px-3 py-1 rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 ${
                filterType === 'appointment'
                  ? 'bg-purple-500/20 text-purple-300 font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Video className="w-3 h-3" />
              <span>Chamadas VIP</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('pack')}
              className={`px-3 py-1 rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 ${
                filterType === 'pack'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <ShoppingBag className="w-3 h-3" />
              <span>Packs Avulsos</span>
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-white/[0.06] transition cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#f4a7b9]" />
              <span>Marcar todas como lidas</span>
            </button>
          )}
        </div>

        {/* Lista de Notificações */}
        {filteredOrders.length === 0 ? (
          <div className="py-16 text-center rounded-xl bg-[#171821] border border-white/[0.06]">
            <Bell className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-white mb-1">Nenhuma notificação no filtro</h3>
            <p className="text-xs text-zinc-500 font-light">
              Quando novos pedidos, encomendas ou agendamentos chegarem, eles aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredOrders.map((item: UnifiedOrderFeedItem) => {
              const itemType = item.meta?.isPack
                ? 'pack'
                : item.type === 'personalizado'
                ? 'personalizado'
                : 'appointment';
              const isUnread = !readOrderIds.has(item.id);

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    !isUnread
                      ? 'bg-[#171821] border-white/[0.04] opacity-80 hover:opacity-100 hover:border-white/[0.08]'
                      : 'bg-[#1b1c28] border-[#f4a7b9]/25 shadow-sm hover:border-[#f4a7b9]/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        itemType === 'personalizado'
                          ? 'bg-[#f4a7b9]/15 text-[#f4a7b9]'
                          : itemType === 'appointment'
                          ? 'bg-purple-500/15 text-purple-300'
                          : 'bg-emerald-500/15 text-emerald-300'
                      }`}
                    >
                      {itemType === 'personalizado' && <Camera className="w-4 h-4" />}
                      {itemType === 'appointment' && <Video className="w-4 h-4" />}
                      {itemType === 'pack' && <ShoppingBag className="w-4 h-4" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white">{item.title}</span>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-[#f4a7b9] shrink-0"></span>
                        )}
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {new Date(item.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400 flex-wrap">
                        <span>
                          Cliente: <strong className="text-zinc-200">{item.customerName}</strong>
                        </span>
                        {item.customerContact && (
                          <span>
                            Contato: <span className="font-mono text-zinc-300">{item.customerContact}</span>
                          </span>
                        )}
                        <span className="text-[#f4a7b9] font-medium font-mono">{item.amountFormatted}</span>
                      </div>
                    </div>
                  </div>

                  {onNavigateToOrder && (
                    <button
                      type="button"
                      onClick={() => onNavigateToOrder(item.id, itemType)}
                      className="h-7 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-zinc-200 border border-white/[0.08] transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                    >
                      <span>Acessar Registro</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
