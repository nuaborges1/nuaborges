/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  CheckCheck,
  Video,
  ShoppingBag,
  ExternalLink,
  Settings,
  X,
  Flame,
  Camera,
  Film,
  Sliders,
  PackageCheck,
} from 'lucide-react';
import { useAdminOrderNotifications } from '@/hooks/useAdminOrderNotifications';
import type { AdminTab } from '@/types/admin';
import { NotificationSettingsModal } from './NotificationSettingsModal';

interface NotificationCenterProps {
  onNavigateTab: (tab: AdminTab, subAction?: string) => void;
}

export function NotificationCenter({ onNavigateTab }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleNavigate = useCallback((tab: AdminTab, subAction?: string) => {
    onNavigateTab(tab, subAction);
    setIsOpen(false);
  }, [onNavigateTab]);

  const {
    orders,
    unreadCount,
    readOrderIds,
    latestNewOrder,
    hasNewAlert,
    settings,
    windowsPermission,
    browserSupportState,
    updateSettings,
    requestWindowsPermission,
    testSound,
    testWindowsNotification,
    testTabFlash,
    markAllAsRead,
    markOrderAsRead,
    dismissAlert,
  } = useAdminOrderNotifications(handleNavigate);

  // Auto-dismiss do Toast flutuante após 10 segundos para não travar na tela
  useEffect(() => {
    if (hasNewAlert && latestNewOrder) {
      const timer = setTimeout(() => {
        dismissAlert(latestNewOrder.id);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [hasNewAlert, latestNewOrder, dismissAlert]);

  // Fecha o dropdown ao clicar fora ou com a tecla ESC
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleOpenOrder = (order: {
    tab?: string;
    type?: string;
    status?: string;
    title?: string;
    meta?: any;
    id?: string;
    customerName?: string;
  }) => {
    if (order.id) {
      markOrderAsRead(order.id);
    }
    const cleanStatus = (order.status || '').toLowerCase().trim();
    const isPack =
      Boolean(order.meta?.isPack) ||
      order.type === 'pack' ||
      order.type === 'avulso' ||
      String(order.title || '').toLowerCase().includes('pack');
    const isAppointment =
      order.type === 'appointment' || order.tab === 'appointments' || order.tab === 'chamadas';
    const isPaidOrFinalized = isAppointment
      ? ['cancelado', 'cancelada', 'concluida', 'concluido', 'concluído', 'nao_compareceu', 'ausente'].includes(
          cleanStatus
        )
      : isPack ||
        order.tab === 'historico' ||
        [
          'paid',
          'approved',
          'pago',
          'pago_liberado',
          'liberado',
          'entregue',
          'cancelado',
          'cancelada',
          'concluida',
          'concluido',
          'concluído',
          'nao_compareceu',
          'ausente',
        ].includes(cleanStatus);

    if (isPaidOrFinalized) {
      handleNavigate('historico');
    } else if (isAppointment) {
      handleNavigate('chamadas', order.id);
    } else {
      handleNavigate('personalizados');
    }
    setIsOpen(false);
    dismissAlert(order.id);
  };

  return (
    <div className="relative select-none" ref={containerRef}>
      {/* Botão do Sino no Header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative inline-flex items-center justify-center h-8 px-2.5 sm:px-3 rounded-full border transition-all duration-200 cursor-pointer shrink-0 ${
          unreadCount > 0 || hasNewAlert
            ? 'bg-rose-950/40 border-rose-600/60 text-rose-300 hover:bg-rose-900/50 shadow-sm'
            : isOpen
            ? 'bg-white/10 text-white border-white/20'
            : 'bg-[#171821] hover:bg-[#20222d] border-white/[0.08] text-zinc-300 hover:text-white'
        }`}
        title="Central de Pedidos e Alertas"
        aria-label="Abrir notificações de pedidos"
      >
        <Bell
          className={`w-3.5 h-3.5 transition-transform ${
            hasNewAlert || unreadCount > 0 ? 'text-rose-400' : 'text-zinc-400'
          }`}
        />

        <span className="hidden sm:inline ml-1.5 text-xs font-medium">
          Alertas
        </span>

        {unreadCount > 0 && (
          <span className="ml-1 sm:ml-1.5 px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono text-[10px] font-bold shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        {/* Indicador de tempo real ativo */}
        {unreadCount === 0 && (
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
        )}
      </button>

      {/* Toast Flutuante em caso de Novo Pedido em Tempo Real */}
      <AnimatePresence>
        {hasNewAlert && latestNewOrder && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="fixed top-18 right-4 sm:right-8 z-50 max-w-sm w-full bg-[#171821] border border-rose-500/40 rounded-xl p-4 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  latestNewOrder.meta?.isPack ||
                  latestNewOrder.type === 'pack' ||
                  latestNewOrder.type === 'avulso'
                    ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                    : latestNewOrder.type === 'appointment'
                    ? 'bg-purple-500/15 border border-purple-500/30 text-purple-400'
                    : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                }`}
              >
                {latestNewOrder.meta?.isPack ||
                latestNewOrder.type === 'pack' ||
                latestNewOrder.type === 'avulso' ? (
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                ) : latestNewOrder.type === 'appointment' ? (
                  <Video className="w-4 h-4 text-purple-400" />
                ) : (
                  <Flame className="w-4 h-4 animate-pulse text-rose-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                      latestNewOrder.meta?.isPack ||
                      latestNewOrder.type === 'pack' ||
                      latestNewOrder.type === 'avulso'
                        ? 'text-amber-300 bg-amber-950/80 border-amber-700/80'
                        : latestNewOrder.type === 'appointment'
                        ? 'text-purple-300 bg-purple-950/80 border-purple-700/80'
                        : 'text-rose-400 bg-rose-950/80 border-rose-800/80'
                    }`}
                  >
                    {latestNewOrder.meta?.isPack ||
                    latestNewOrder.type === 'pack' ||
                    latestNewOrder.type === 'avulso'
                      ? 'Novo Pack Pago!'
                      : latestNewOrder.type === 'appointment'
                      ? 'Nova Chamada!'
                      : 'Novo Pedido!'}
                  </span>
                  <span className="text-[10px] text-zinc-400">Agora</span>
                </div>
                <h4 className="text-xs sm:text-sm font-medium text-white mt-1 truncate">
                  {latestNewOrder.customerName}
                </h4>
                <p className="text-xs text-zinc-300 line-clamp-1">
                  {latestNewOrder.title} •{' '}
                  <span className="text-emerald-400 font-semibold">
                    {latestNewOrder.amountFormatted}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismissAlert(latestNewOrder.id)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                title="Fechar alerta"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3.5 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleOpenOrder(latestNewOrder)}
                className="flex-1 h-8 px-4 rounded-full bg-[#843C52] hover:bg-[#992b4a] text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>Ver Pedido</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => dismissAlert(latestNewOrder.id)}
                className="h-8 px-3.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-xs font-medium transition-colors cursor-pointer border border-white/10"
              >
                Dispensar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flyout Dropdown de Notificações — Redesign Editorial de Luxo */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-[92vw] sm:w-[410px] max-w-[410px] bg-[#171821] border border-white/[0.08] rounded-xl shadow-2xl backdrop-blur-2xl z-50 overflow-hidden text-left"
          >
            {/* Header Limpo & Sofisticado */}
            <div className="p-3 sm:px-4 sm:py-3.5 border-b border-white/[0.06] flex items-center justify-between gap-2 bg-[#14151b]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#843C52]/15 border border-[#843C52]/30 flex items-center justify-center text-[#843C52]">
                  <Bell className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-medium text-white flex items-center gap-2">
                    <span>Pedidos Recentes</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Atualização automática ativa" />
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-light">
                    {orders.length} {orders.length === 1 ? 'pedido registrado' : 'pedidos registrados'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-[11px] text-[#843C52] hover:underline flex items-center gap-1 cursor-pointer font-medium px-2 py-1 rounded-lg hover:bg-white/[0.04] transition-colors"
                    title="Marcar todos os pedidos como lidos"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Lidos</span>
                  </button>
                )}

                {/* Botão de Configurações de Alertas */}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setIsSettingsModalOpen(true);
                  }}
                  className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Configurar alertas, som, aba e Windows"
                  aria-label="Abrir configurações de notificações"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Lista dos Últimos Pedidos (Foco 100% no Conteúdo Comercial) */}
            <div className="max-h-[380px] overflow-y-auto p-2 space-y-1.5">
              {orders.length === 0 ? (
                <div className="py-10 px-6 text-center">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-zinc-500 mx-auto mb-2.5">
                    <ShoppingBag className="w-5 h-5 opacity-60 text-zinc-400" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-medium text-white mb-1">Nenhum pedido recente</h4>
                  <p className="text-xs text-zinc-400 font-light leading-relaxed max-w-xs mx-auto">
                    Quando um admirador solicitar um pack, chamada de vídeo ou ensaio personalizado, o aviso tocará aqui na hora.
                  </p>
                </div>
              ) : (
                orders.slice(0, 15).map((order) => {
                  const isPack =
                    Boolean(order.meta?.isPack) ||
                    order.type === 'pack' ||
                    order.type === 'avulso' ||
                    String(order.title || '').toLowerCase().includes('pack');
                  const isPersonalizado = !isPack && order.type === 'personalizado';
                  const isUnread = !readOrderIds.has(order.id);

                  return (
                    <div
                      key={order.id}
                      onClick={() => handleOpenOrder(order)}
                      className={`p-2.5 sm:p-3 rounded-lg border transition-all flex items-start justify-between gap-3 group cursor-pointer ${
                        isUnread
                          ? 'bg-[#181926] border-[#843C52]/25 hover:border-[#843C52]/40'
                          : 'bg-[#101116] border-white/[0.06] hover:border-white/10 opacity-85 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        {/* Ícone contextualizado */}
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isPack
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                              : isPersonalizado
                              ? 'bg-[#843C52]/15 text-[#843C52] border border-[#843C52]/25'
                              : 'bg-purple-500/15 text-purple-300 border border-purple-500/25'
                          }`}
                        >
                          {isPack ? (
                            <ShoppingBag className="w-3.5 h-3.5" />
                          ) : isPersonalizado ? (
                            <Camera className="w-3.5 h-3.5" />
                          ) : (
                            <Video className="w-3.5 h-3.5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-white truncate max-w-[170px]">
                              {order.customerName}
                            </span>
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-[#843C52] shrink-0" title="Não lido" />
                            )}
                            <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                              {order.amountFormatted}
                            </span>
                          </div>

                          <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                            {order.title}
                          </p>

                          <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400">
                            <span
                              className={`px-1.5 py-0.2 rounded font-medium ${
                                order.status === 'paid' || order.status === 'confirmada' || order.status === 'approved'
                                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              }`}
                            >
                              {order.statusLabel}
                            </span>
                            <span className="font-light">
                              {new Date(order.createdAt).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenOrder(order);
                        }}
                        className="h-7 px-3 rounded-full bg-white/[0.06] hover:bg-[#843C52] border border-white/10 hover:border-transparent text-zinc-300 hover:text-white font-semibold text-[10px] uppercase tracking-wider transition-all shrink-0 cursor-pointer shadow-sm"
                        title="Abrir este pedido no painel de gestão"
                      >
                        Abrir
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Rodapé Elegante com Link Direto para Histórico & Configurações */}
            <div className="p-3 sm:px-4 bg-[#14151b] border-t border-white/[0.06] flex items-center justify-between gap-2 text-[11px] text-zinc-400">
              <button
                type="button"
                onClick={() => handleNavigate('historico')}
                className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-white font-medium hover:underline cursor-pointer"
                title="Acessar o histórico unificado de pedidos"
              >
                <PackageCheck className="w-3.5 h-3.5 text-[#843C52]" />
                <span>Ver Histórico Completo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsSettingsModalOpen(true);
                }}
                className="text-[#843C52] hover:underline font-medium flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Sliders className="w-3 h-3" />
                <span>Configurar alertas</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Dedicado de Configuração de Alertas */}
      <NotificationSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        windowsPermission={windowsPermission}
        browserSupportState={browserSupportState}
        updateSettings={updateSettings}
        requestWindowsPermission={requestWindowsPermission}
        testSound={testSound}
        testWindowsNotification={testWindowsNotification}
        testTabFlash={testTabFlash}
      />
    </div>
  );
}
