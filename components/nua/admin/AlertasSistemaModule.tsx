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
  Plus,
  Images,
} from 'lucide-react';
import { useAdminOrderNotifications } from '@/hooks/useAdminOrderNotifications';
import { UnifiedOrderFeedItem } from '@/functions/api/admin/orders-feed';
import { AdminModuleId } from '@/types/admin';
import { PageHeader, StatusBadge } from './ui/AdminPrimitives';

interface AlertasSistemaModuleProps {
  onNavigateToOrder?: (orderId: string, type: 'personalizado' | 'appointment' | 'pack') => void;
  onNavigateToSettings?: () => void;
  onSelectModule?: (id: AdminModuleId, subAction?: string) => void;
}

export function AlertasSistemaModule({
  onNavigateToOrder,
  onNavigateToSettings,
  onSelectModule,
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
    <div className="space-y-5 w-full">
      <PageHeader
        title="Pedidos e Alertas"
        subtitle="Feed operacional de pedidos sob medida, chamadas agendadas e packs vendidos em tempo real."
        badge={
          unreadCount > 0 ? (
            <StatusBadge tone="pink" dot>
              {unreadCount} {unreadCount === 1 ? 'novo' : 'novos'}
            </StatusBadge>
          ) : undefined
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {onNavigateToSettings && (
              <button
                type="button"
                onClick={onNavigateToSettings}
                className="h-9 px-3.5 rounded-xl bg-[#14161d] hover:bg-white/[0.06] border border-white/[0.08] text-zinc-200 hover:text-white text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
                title="Ajustar sons, volume e permissões do Windows nas Configurações"
              >
                <Sliders className="w-3.5 h-3.5 text-[#f4a7b9]" />
                <span>Configurar Alertas</span>
              </button>
            )}

            <button
              type="button"
              onClick={refreshOrders}
              className="h-9 px-3.5 rounded-xl bg-[#14161d] hover:bg-white/[0.06] border border-white/[0.08] text-zinc-200 hover:text-white text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
              title="Sincronizar novos pedidos imediatamente"
            >
              <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
              <span>Atualizar</span>
            </button>
          </div>
        }
      />

      {/* Conteúdo Ativo do Feed */}
      <div className="space-y-4">
        {/* Barra de Filtros e Marcação */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#14161d] border border-white/[0.06]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-zinc-400 mr-1">Filtrar por:</span>
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white/[0.1] text-white font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Todos ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('personalizado')}
              className={`px-3 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 ${
                filterType === 'personalizado'
                  ? 'bg-[#f4a7b9]/15 text-[#f4a7b9] border border-[#f4a7b9]/30 font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Camera className="w-3 h-3" />
              <span>Personalizados</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('appointment')}
              className={`px-3 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 ${
                filterType === 'appointment'
                  ? 'bg-[#f4a7b9]/15 text-[#f4a7b9] border border-[#f4a7b9]/30 font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Video className="w-3 h-3" />
              <span>Chamadas VIP</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('pack')}
              className={`px-3 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 ${
                filterType === 'pack'
                  ? 'bg-[#f4a7b9]/15 text-[#f4a7b9] border border-[#f4a7b9]/30 font-semibold'
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
          <div className="py-12 px-4 text-center rounded-xl bg-[#171821] border border-white/[0.06] space-y-3">
            <Bell className="w-8 h-8 text-zinc-600 mx-auto" />
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">
                Nenhum pedido ou alerta registrado neste filtro
              </h3>
              <p className="text-xs text-zinc-400 font-light max-w-md mx-auto">
                Quando novos pedidos personalizados, chamadas VIP ou vendas de packs forem confirmados, eles aparecerão aqui imediatamente.
              </p>
            </div>
            {onSelectModule && (
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelectModule('conteudos', 'new_pack')}
                  className="adm-btn adm-btn-primary"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Criar Novo Pack</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectModule('chamadas')}
                  className="adm-btn adm-btn-ghost"
                >
                  <Video className="w-3.5 h-3.5 text-[#f4a7b9]" />
                  <span>Ver Fila de Chamadas</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectModule('midias')}
                  className="adm-btn adm-btn-ghost"
                >
                  <Images className="w-3.5 h-3.5 text-[#f4a7b9]" />
                  <span>Subir Fotos na Biblioteca</span>
                </button>
              </div>
            )}
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
