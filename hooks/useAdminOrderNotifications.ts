'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { audioNotification } from '@/lib/audioNotification';
import { tabNotification } from '@/lib/tabNotification';
import { windowsNotification } from '@/lib/windowsNotification';
import { fetchUnifiedOrdersFeed } from '@/lib/services/nua/ordersFeedService';
import { UnifiedOrderFeedItem } from '@/functions/api/admin/orders-feed';

export interface NotificationSettings {
  soundEnabled: boolean;
  windowsNotificationEnabled: boolean;
  tabFlashEnabled: boolean;
}

const SETTINGS_STORAGE_KEY = 'nua_admin_notification_settings';
const READ_ORDERS_STORAGE_KEY = 'nua_admin_read_order_ids';

export function useAdminOrderNotifications(
  onNavigateTab?: (tab: 'personalizados' | 'appointments' | 'historico') => void
) {
  const [orders, setOrders] = useState<UnifiedOrderFeedItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [readOrderIds, setReadOrderIds] = useState<Set<string>>(new Set());
  const [latestNewOrder, setLatestNewOrder] = useState<UnifiedOrderFeedItem | null>(null);
  const [hasNewAlert, setHasNewAlert] = useState<boolean>(false);
  const [windowsPermission, setWindowsPermission] = useState<NotificationPermission>('default');

  const [settings, setSettings] = useState<NotificationSettings>({
    soundEnabled: true,
    windowsNotificationEnabled: true,
    tabFlashEnabled: true,
  });

  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef<boolean>(false);
  const isPollingRef = useRef<boolean>(false);

  // 1. Carrega configurações e permissões salvas
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Destrava áudio na primeira interação do usuário na página
    const handleFirstGesture = () => {
      audioNotification.unlockAudio();
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
    window.addEventListener('click', handleFirstGesture);
    window.addEventListener('keydown', handleFirstGesture);

    // Carrega settings do localStorage
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        setSettings((prev) => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch {}

    // Verifica permissão do Windows
    if (windowsNotification.isSupported()) {
      setWindowsPermission(windowsNotification.getPermission());
    }

    return () => {
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, []);

  // Salva alterações de configurações
  const updateSettings = useCallback((patch: Partial<NotificationSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...patch };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // Solicita permissão para notificações no Windows
  const requestWindowsPermission = useCallback(async () => {
    const perm = await windowsNotification.requestPermission();
    setWindowsPermission(perm);
    if (perm === 'granted') {
      updateSettings({ windowsNotificationEnabled: true });
      windowsNotification.showTestNotification();
    }
    return perm;
  }, [updateSettings]);

  // Testes manuais
  const testSound = useCallback(() => {
    audioNotification.unlockAudio();
    audioNotification.playTestChime(0.85);
  }, []);

  const testWindowsNotification = useCallback(() => {
    if (windowsNotification.getPermission() !== 'granted') {
      requestWindowsPermission();
    } else {
      windowsNotification.showTestNotification();
    }
  }, [requestWindowsPermission]);

  const testTabFlash = useCallback(() => {
    tabNotification.startFlashing('TESTE DE NOVO PEDIDO!', {
      isTest: true,
      durationMs: 8000,
    });
  }, []);

  const onNavigateTabRef = useRef(onNavigateTab);
  const settingsRef = useRef(settings);

  useEffect(() => {
    onNavigateTabRef.current = onNavigateTab;
    settingsRef.current = settings;
  }, [onNavigateTab, settings]);

  // 2. Busca e sincronização do Feed
  const syncOrders = useCallback(async (isPolling = false) => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;

    try {
      const res = await fetchUnifiedOrdersFeed();
      if (res.success && Array.isArray(res.orders)) {
        setOrders(res.orders);

        // Identifica IDs já lidos pelo usuário
        let readIds = new Set<string>();
        try {
          const rawRead = localStorage.getItem(READ_ORDERS_STORAGE_KEY);
          if (rawRead) readIds = new Set(JSON.parse(rawRead));
        } catch {}

        const unread = res.orders.filter((o) => !readIds.has(o.id));
        setReadOrderIds(readIds);
        setUnreadCount(unread.length);

        if (!initializedRef.current) {
          // Na inicialização, marca todos os pedidos atuais como já conhecidos
          // para não disparar som de pedidos antigos
          res.orders.forEach((o) => knownOrderIdsRef.current.add(o.id));
          initializedRef.current = true;
        } else {
          // Em checagens subsequentes, descobre se há pedidos verdadeiramente novos
          const incomingNew = res.orders.filter((o) => !knownOrderIdsRef.current.has(o.id));

          if (incomingNew.length > 0) {
            const newest = incomingNew[0];
            incomingNew.forEach((o) => knownOrderIdsRef.current.add(o.id));

            setLatestNewOrder(newest);
            setHasNewAlert(true);

            // A) Som de Notificação
            if (settingsRef.current.soundEnabled) {
              audioNotification.unlockAudio();
              audioNotification.playOrderChime(0.9);
            }

            // B) Aba piscando em vermelho
            if (settingsRef.current.tabFlashEnabled) {
              const alertText = `${newest.customerName} - ${newest.amountFormatted}`;
              tabNotification.startFlashing(alertText, { isTest: false, durationMs: 40000 });
            }

            // C) Notificação Direta no Windows
            if (
              settingsRef.current.windowsNotificationEnabled &&
              windowsNotification.getPermission() === 'granted'
            ) {
              windowsNotification.show({
                title: `🚨 Novo Pedido Recebido! (${newest.amountFormatted})`,
                body: `${newest.title} de ${newest.customerName}. Clique para abrir o painel.`,
                tag: `nua_order_${newest.id}`,
                onClick: () => {
                  window.focus();
                  tabNotification.stopFlashing();
                  if (onNavigateTabRef.current) {
                    onNavigateTabRef.current(newest.tab);
                  }
                },
              });
            }
          }
        }
      }
    } finally {
      isPollingRef.current = false;
    }
  }, []);

  // Loop de Polling a cada 15 segundos
  useEffect(() => {
    syncOrders(false);

    const interval = setInterval(() => {
      syncOrders(true);
    }, 15000);

    // Também escuta eventos customizados de novo pedido gerado localmente
    const handleLocalOrderEvent = () => {
      syncOrders(true);
    };

    window.addEventListener('nua-order-created', handleLocalOrderEvent);
    window.addEventListener('nua-appointments-updated', handleLocalOrderEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('nua-order-created', handleLocalOrderEvent);
      window.removeEventListener('nua-appointments-updated', handleLocalOrderEvent);
    };
  }, [syncOrders]);

  // Marca todos os pedidos atuais como lidos
  const markAllAsRead = useCallback(() => {
    try {
      const allIds = orders.map((o) => o.id);
      localStorage.setItem(READ_ORDERS_STORAGE_KEY, JSON.stringify(allIds));
      setReadOrderIds(new Set(allIds));
      setUnreadCount(0);
      setHasNewAlert(false);
      setLatestNewOrder(null);
      tabNotification.stopFlashing();
    } catch {}
  }, [orders]);

  // Dispensa o alerta atual
  const dismissAlert = useCallback(() => {
    setHasNewAlert(false);
    tabNotification.stopFlashing();
  }, []);

  return {
    orders,
    unreadCount,
    readOrderIds,
    latestNewOrder,
    hasNewAlert,
    settings,
    windowsPermission,
    updateSettings,
    requestWindowsPermission,
    testSound,
    testWindowsNotification,
    testTabFlash,
    markAllAsRead,
    dismissAlert,
    refreshOrders: () => syncOrders(false),
  };
}
