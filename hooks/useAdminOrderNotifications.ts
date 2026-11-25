'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { audioNotification } from '@/lib/audioNotification';
import { tabNotification } from '@/lib/tabNotification';
import {
  windowsNotification,
  type BrowserNotificationSupportState,
} from '@/lib/windowsNotification';
import {
  fetchUnifiedOrdersFeed,
  invalidateOrdersFeedCache,
} from '@/lib/services/nua/ordersFeedService';
import { getPublicApiUrl, type AdminPanelProfile } from '@/lib/contentStore';
import type { UnifiedOrderFeedItem } from '@/functions/api/admin/orders-feed';

export interface NotificationSettings {
  alertsEnabled: boolean;
  soundEnabled: boolean;
  windowsNotificationEnabled: boolean;
  tabFlashEnabled: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  alertsEnabled: true,
  soundEnabled: true,
  windowsNotificationEnabled: true,
  tabFlashEnabled: true,
};

const VISIBLE_POLL_INTERVAL_MS = 15_000;
const HIDDEN_POLL_INTERVAL_MS = 45_000;
const CROSS_TAB_CHANNEL = 'nua_admin_order_notifications_v1';

function settingsStorageKey(profile: AdminPanelProfile): string {
  return `nua_admin_notification_settings:${profile}`;
}

function readOrdersStorageKey(profile: AdminPanelProfile): string {
  return `nua_admin_read_order_ids:${profile}`;
}

function dismissedPromptKey(profile: AdminPanelProfile): string {
  return `nua_admin_notif_prompt_dismissed:${profile}`;
}

function announceLockKey(profile: AdminPanelProfile, orderId: string): string {
  return `nua_admin_announced:${profile}:${orderId}`;
}

function claimAnnouncementLock(profile: AdminPanelProfile, orderId: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const key = announceLockKey(profile, orderId);
    const existing = localStorage.getItem(key);
    const now = Date.now();
    if (existing && now - Number(existing) < 5 * 60 * 1000) {
      return false;
    }
    localStorage.setItem(key, String(now));
    return true;
  } catch {
    return true;
  }
}

function loadLocalReadIds(profile: AdminPanelProfile): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw =
      localStorage.getItem(readOrdersStorageKey(profile)) ||
      localStorage.getItem('nua_admin_read_order_ids');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed.map(String));
    }
  } catch { }
  return new Set();
}

function saveLocalReadIds(profile: AdminPanelProfile, ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      readOrdersStorageKey(profile),
      JSON.stringify(Array.from(ids).slice(0, 400))
    );
  } catch { }
}

function loadLocalSettings(profile: AdminPanelProfile): NotificationSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw =
      localStorage.getItem(settingsStorageKey(profile)) ||
      localStorage.getItem('nua_admin_notification_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        alertsEnabled:
          typeof parsed.alertsEnabled === 'boolean'
            ? parsed.alertsEnabled
            : DEFAULT_SETTINGS.alertsEnabled,
        soundEnabled:
          typeof parsed.soundEnabled === 'boolean'
            ? parsed.soundEnabled
            : DEFAULT_SETTINGS.soundEnabled,
        windowsNotificationEnabled:
          typeof parsed.windowsNotificationEnabled === 'boolean'
            ? parsed.windowsNotificationEnabled
            : DEFAULT_SETTINGS.windowsNotificationEnabled,
        tabFlashEnabled:
          typeof parsed.tabFlashEnabled === 'boolean'
            ? parsed.tabFlashEnabled
            : DEFAULT_SETTINGS.tabFlashEnabled,
      };
    }
  } catch { }
  return DEFAULT_SETTINGS;
}

function saveLocalSettings(profile: AdminPanelProfile, settings: NotificationSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(settingsStorageKey(profile), JSON.stringify(settings));
  } catch { }
}

export interface AdminOrderNotificationsContextValue {
  orders: UnifiedOrderFeedItem[];
  unreadCount: number;
  readOrderIds: Set<string>;
  latestNewOrder: UnifiedOrderFeedItem | null;
  hasNewAlert: boolean;
  settings: NotificationSettings;
  windowsPermission: NotificationPermission;
  browserSupportState: BrowserNotificationSupportState;
  showPermissionBanner: boolean;
  isLoading: boolean;
  isOffline: boolean;
  adminProfile: AdminPanelProfile;
  updateSettings: (patch: Partial<NotificationSettings>) => void;
  requestWindowsPermission: () => Promise<NotificationPermission>;
  dismissPermissionBanner: () => void;
  testSound: () => void;
  testWindowsNotification: () => void;
  testTabFlash: () => void;
  markAllAsRead: () => void;
  markOrderAsRead: (orderId: string) => void;
  dismissAlert: (orderId?: string) => void;
  refreshOrders: () => Promise<void>;
}

const AdminOrderNotificationsContext =
  createContext<AdminOrderNotificationsContextValue | null>(null);

interface AdminOrderNotificationsProviderProps {
  children: React.ReactNode;
  value?: AdminOrderNotificationsContextValue;
  enabled?: boolean;
  adminProfile?: AdminPanelProfile;
  onNavigateTab?: (tab: string, subAction?: string) => void;
}

function useAdminOrderNotificationsInternal(params: {
  enabled: boolean;
  adminProfile: AdminPanelProfile;
  onNavigateTab?: (tab: string, subAction?: string) => void;
}): AdminOrderNotificationsContextValue {
  const { enabled, adminProfile, onNavigateTab } = params;

  const [orders, setOrders] = useState<UnifiedOrderFeedItem[]>([]);
  const [readOrderIds, setReadOrderIds] = useState<Set<string>>(() =>
    loadLocalReadIds(adminProfile)
  );
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [latestNewOrder, setLatestNewOrder] = useState<UnifiedOrderFeedItem | null>(null);
  const [hasNewAlert, setHasNewAlert] = useState<boolean>(false);
  const [windowsPermission, setWindowsPermission] = useState<NotificationPermission>('default');
  const [browserSupportState, setBrowserSupportState] =
    useState<BrowserNotificationSupportState>('default');
  const [permissionPromptDismissed, setPermissionPromptDismissed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [settings, setSettings] = useState<NotificationSettings>(() =>
    loadLocalSettings(adminProfile)
  );

  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const readOrderIdsRef = useRef<Set<string>>(readOrderIds);
  const initializedRef = useRef<boolean>(false);
  const isPollingRef = useRef<boolean>(false);
  const onNavigateTabRef = useRef(onNavigateTab);
  const settingsRef = useRef<NotificationSettings>(settings);
  const profileRef = useRef<AdminPanelProfile>(adminProfile);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef<string>(
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `tab_${Math.random().toString(36).slice(2)}`
  );

  useEffect(() => {
    onNavigateTabRef.current = onNavigateTab;
  }, [onNavigateTab]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    readOrderIdsRef.current = readOrderIds;
  }, [readOrderIds]);

  const postCrossTab = useCallback((message: Record<string, unknown>) => {
    try {
      channelRef.current?.postMessage({
        ...message,
        sender: tabIdRef.current,
        profile: profileRef.current,
      });
    } catch { }
  }, []);

  const persistToBackend = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!enabled || typeof window === 'undefined') return;
      try {
        await fetch(`${getPublicApiUrl()}/api/admin/notification-prefs`, {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch { }
    },
    [enabled]
  );

  // Recarrega estado isolado quando o perfil (nua vs phdev) muda ou ao autenticar
  useEffect(() => {
    profileRef.current = adminProfile;
    initializedRef.current = false;
    knownOrderIdsRef.current = new Set();

    const localSettings = loadLocalSettings(adminProfile);
    const localRead = loadLocalReadIds(adminProfile);
    setSettings(localSettings);
    settingsRef.current = localSettings;
    setReadOrderIds(localRead);
    readOrderIdsRef.current = localRead;

    try {
      setPermissionPromptDismissed(
        Boolean(localStorage.getItem(dismissedPromptKey(adminProfile)))
      );
    } catch { }

    if (!enabled || typeof window === 'undefined') return;

    let active = true;
    fetch(`${getPublicApiUrl()}/api/admin/notification-prefs`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.success || !data?.state) return;
        const remoteSettings: NotificationSettings = {
          ...DEFAULT_SETTINGS,
          ...(data.state.settings || {}),
        };
        setSettings(remoteSettings);
        settingsRef.current = remoteSettings;
        saveLocalSettings(adminProfile, remoteSettings);

        const mergedRead = new Set<string>([
          ...Array.from(readOrderIdsRef.current),
          ...(Array.isArray(data.state.acknowledgedOrderIds)
            ? data.state.acknowledgedOrderIds.map(String)
            : []),
        ]);
        setReadOrderIds(mergedRead);
        readOrderIdsRef.current = mergedRead;
        saveLocalReadIds(adminProfile, mergedRead);

        setOrders((curr) => {
          setUnreadCount(curr.filter((o) => !mergedRead.has(o.id)).length);
          return curr;
        });

        if (data.state.permissionPromptDismissedAt) {
          setPermissionPromptDismissed(true);
        }
      })
      .catch(() => { });

    return () => {
      active = false;
    };
  }, [adminProfile, enabled]);

  // Verifica permissão real do navegador e destrava áudio no primeiro gesto
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const refreshBrowserPermission = () => {
      const state = windowsNotification.getSupportState();
      setBrowserSupportState(state);
      setWindowsPermission(windowsNotification.getPermission());
    };

    refreshBrowserPermission();

    const handleFirstGesture = () => {
      audioNotification.unlockAudio();
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
    window.addEventListener('click', handleFirstGesture);
    window.addEventListener('keydown', handleFirstGesture);
    window.addEventListener('focus', refreshBrowserPermission);

    return () => {
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
      window.removeEventListener('focus', refreshBrowserPermission);
    };
  }, []);

  // Sincronização entre abas (BroadcastChannel + storage)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel(CROSS_TAB_CHANNEL);
        channelRef.current = channel;
        channel.onmessage = (event) => {
          const msg = event.data;
          if (!msg || msg.sender === tabIdRef.current || msg.profile !== profileRef.current) {
            return;
          }
          if (msg.type === 'settings' && msg.settings) {
            setSettings(msg.settings);
            settingsRef.current = msg.settings;
            saveLocalSettings(profileRef.current, msg.settings);
          } else if (msg.type === 'read_ids' && Array.isArray(msg.ids)) {
            const nextSet = new Set<string>(msg.ids);
            setReadOrderIds(nextSet);
            readOrderIdsRef.current = nextSet;
            saveLocalReadIds(profileRef.current, nextSet);
            setOrders((curr) => {
              const unread = curr.filter((o) => !nextSet.has(o.id)).length;
              setUnreadCount(unread);
              if (unread === 0) {
                setHasNewAlert(false);
                setLatestNewOrder(null);
                tabNotification.stopFlashing();
              }
              return curr;
            });
          } else if (msg.type === 'orders_snapshot' && Array.isArray(msg.orders)) {
            const incomingOrders = msg.orders as UnifiedOrderFeedItem[];
            incomingOrders.forEach((o) => knownOrderIdsRef.current.add(o.id));
            initializedRef.current = true;
            setOrders(incomingOrders);
            setUnreadCount(
              incomingOrders.filter((o) => !readOrderIdsRef.current.has(o.id)).length
            );
          }
        };
      } catch { }
    }

    return () => {
      try {
        channel?.close();
      } catch { }
      channelRef.current = null;
    };
  }, []);

  const updateSettings = useCallback(
    (patch: Partial<NotificationSettings>) => {
      setSettings((prev) => {
        const updated = { ...prev, ...patch };
        settingsRef.current = updated;
        saveLocalSettings(profileRef.current, updated);
        postCrossTab({ type: 'settings', settings: updated });
        void persistToBackend({ action: 'save_settings', settings: updated });
        return updated;
      });
    },
    [persistToBackend, postCrossTab]
  );

  const dismissPermissionBanner = useCallback(() => {
    setPermissionPromptDismissed(true);
    try {
      localStorage.setItem(dismissedPromptKey(profileRef.current), new Date().toISOString());
    } catch { }
    void persistToBackend({ action: 'dismiss_permission_prompt' });
  }, [persistToBackend]);

  const requestWindowsPermission = useCallback(async () => {
    const perm = await windowsNotification.requestPermission();
    setWindowsPermission(perm);
    setBrowserSupportState(windowsNotification.getSupportState());
    if (perm === 'granted') {
      updateSettings({ windowsNotificationEnabled: true });
      windowsNotification.showTestNotification();
    }
    return perm;
  }, [updateSettings]);

  const testSound = useCallback(() => {
    audioNotification.unlockAudio();
    audioNotification.playTestChime(0.85);
  }, []);

  const testWindowsNotification = useCallback(() => {
    if (windowsNotification.getSupportState() === 'unsupported') return;
    if (windowsNotification.getPermission() !== 'granted') {
      void requestWindowsPermission();
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

  const syncOrders = useCallback(
    async (_isPolling = false, forceRefresh = true) => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;

      try {
        const res = await fetchUnifiedOrdersFeed({ force: forceRefresh });
        if (res.source === 'fallback') {
          setIsOffline(true);
        } else {
          setIsOffline(false);
        }

        if (res.success && Array.isArray(res.orders)) {
          setOrders(res.orders);
          const readIds = readOrderIdsRef.current;
          const unread = res.orders.filter((o) => !readIds.has(o.id));
          setUnreadCount(unread.length);

          if (!initializedRef.current) {
            // Carregamento inicial: registra pedidos existentes sem disparar som/alerta falso
            res.orders.forEach((o) => knownOrderIdsRef.current.add(o.id));
            initializedRef.current = true;
          } else if (res.source !== 'fallback') {
            const incomingNew = res.orders.filter(
              (o) => !knownOrderIdsRef.current.has(o.id)
            );

            if (incomingNew.length > 0) {
              const newest = incomingNew[0];
              incomingNew.forEach((o) => knownOrderIdsRef.current.add(o.id));
              postCrossTab({ type: 'orders_snapshot', orders: res.orders });

              const activeSettings = settingsRef.current;
              const shouldAnnounceGlobally = claimAnnouncementLock(
                profileRef.current,
                newest.id
              );

              if (activeSettings.alertsEnabled) {
                setLatestNewOrder(newest);
                setHasNewAlert(true);
              }

              if (activeSettings.alertsEnabled && shouldAnnounceGlobally) {
                if (activeSettings.soundEnabled) {
                  audioNotification.unlockAudio();
                  audioNotification.playOrderChime(0.9);
                }

                if (activeSettings.tabFlashEnabled) {
                  const alertText = `${newest.customerName} - ${newest.amountFormatted}`;
                  tabNotification.startFlashing(alertText, {
                    isTest: false,
                    durationMs: 40000,
                  });
                }

                if (
                  activeSettings.windowsNotificationEnabled &&
                  windowsNotification.getPermission() === 'granted'
                ) {
                  windowsNotification.show({
                    title: `Novo pedido recebido (${newest.amountFormatted})`,
                    body: `${newest.title} — ${newest.customerName}. Clique para abrir no painel.`,
                    tag: `nua_order_${newest.id}`,
                    onClick: () => {
                      window.focus();
                      tabNotification.stopFlashing();
                      onNavigateTabRef.current?.(newest.tab, newest.id);
                    },
                  });
                }
              }
            }
          }
        }
      } catch {
        setIsOffline(true);
      } finally {
        isPollingRef.current = false;
        setIsLoading(false);
      }
    },
    [postCrossTab]
  );

  // Polling adaptativo (15s visível / 45s oculto) + reconexão + visibilidade
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    void syncOrders(false, true);

    let timer: ReturnType<typeof setTimeout> | null = null;
    let active = true;

    const scheduleNext = () => {
      if (!active) return;
      if (timer) clearTimeout(timer);
      const isHidden = typeof document !== 'undefined' && document.hidden;
      const delay = isHidden ? HIDDEN_POLL_INTERVAL_MS : VISIBLE_POLL_INTERVAL_MS;
      timer = setTimeout(async () => {
        if (!active) return;
        if (typeof navigator === 'undefined' || navigator.onLine !== false) {
          await syncOrders(true, true);
        }
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        invalidateOrdersFeedCache();
        void syncOrders(true, true);
      }
      scheduleNext();
    };

    const handleOnline = () => {
      setIsOffline(false);
      invalidateOrdersFeedCache();
      void syncOrders(true, true);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    const handleLocalOrderEvent = () => {
      invalidateOrdersFeedCache();
      void syncOrders(true, true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('nua-order-created', handleLocalOrderEvent);
    window.addEventListener('nua-appointments-updated', handleLocalOrderEvent);
    window.addEventListener('nua-order-refunded', handleLocalOrderEvent);

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('nua-order-created', handleLocalOrderEvent);
      window.removeEventListener('nua-appointments-updated', handleLocalOrderEvent);
      window.removeEventListener('nua-order-refunded', handleLocalOrderEvent);
    };
  }, [syncOrders, enabled, adminProfile]);

  const markAllAsRead = useCallback(() => {
    const next = new Set<string>(readOrderIdsRef.current);
    const idsToAck = orders.map((o) => o.id);
    idsToAck.forEach((id) => next.add(id));
    readOrderIdsRef.current = next;
    setReadOrderIds(next);
    saveLocalReadIds(profileRef.current, next);
    setUnreadCount(0);
    setHasNewAlert(false);
    setLatestNewOrder(null);
    tabNotification.stopFlashing();
    postCrossTab({ type: 'read_ids', ids: Array.from(next) });
    if (idsToAck.length > 0) {
      void persistToBackend({ action: 'acknowledge', orderIds: idsToAck });
    }
  }, [orders, persistToBackend, postCrossTab]);

  const markOrderAsRead = useCallback(
    (orderId: string) => {
      if (!orderId) return;
      const next = new Set<string>(readOrderIdsRef.current);
      if (!next.has(orderId)) {
        next.add(orderId);
        readOrderIdsRef.current = next;
        setReadOrderIds(next);
        saveLocalReadIds(profileRef.current, next);
        setOrders((curr) => {
          setUnreadCount(curr.filter((o) => !next.has(o.id)).length);
          return curr;
        });
        postCrossTab({ type: 'read_ids', ids: Array.from(next) });
        void persistToBackend({ action: 'acknowledge', orderIds: [orderId] });
      }
      if (latestNewOrder?.id === orderId) {
        setHasNewAlert(false);
        setLatestNewOrder(null);
        tabNotification.stopFlashing();
      }
    },
    [latestNewOrder, persistToBackend, postCrossTab]
  );

  const dismissAlert = useCallback(
    (orderId?: string) => {
      const targetId = orderId || latestNewOrder?.id;
      if (targetId) {
        markOrderAsRead(targetId);
      }
      setHasNewAlert(false);
      setLatestNewOrder(null);
      tabNotification.stopFlashing();
    },
    [latestNewOrder, markOrderAsRead]
  );

  const showPermissionBanner =
    enabled &&
    browserSupportState === 'default' &&
    !permissionPromptDismissed;

  return {
    orders,
    unreadCount,
    readOrderIds,
    latestNewOrder,
    hasNewAlert,
    settings,
    windowsPermission,
    browserSupportState,
    showPermissionBanner,
    isLoading,
    isOffline,
    adminProfile,
    updateSettings,
    requestWindowsPermission,
    dismissPermissionBanner,
    testSound,
    testWindowsNotification,
    testTabFlash,
    markAllAsRead,
    markOrderAsRead,
    dismissAlert,
    refreshOrders: () => syncOrders(false, true),
  };
}

export function AdminOrderNotificationsProvider({
  children,
  value: externalValue,
  enabled = true,
  adminProfile = 'nua',
  onNavigateTab,
}: AdminOrderNotificationsProviderProps) {
  const internalValue = useAdminOrderNotificationsInternal({
    enabled: externalValue ? false : enabled,
    adminProfile,
    onNavigateTab,
  });

  return React.createElement(
    AdminOrderNotificationsContext.Provider,
    { value: externalValue || internalValue },
    children
  );
}

/**
 * Consome o monitoramento global de pedidos do Admin.
 * Quando montado dentro de `AdminOrderNotificationsProvider`, reutiliza a única instância
 * global (zero polling duplicado, zero som duplicado).
 */
export function useAdminOrderNotifications(
  onNavigateTab?: (
    tab: 'personalizados' | 'appointments' | 'chamadas' | 'historico' | 'conteudos' | string,
    subAction?: string
  ) => void,
  options?: { enabled?: boolean; adminProfile?: AdminPanelProfile }
): AdminOrderNotificationsContextValue {
  const ctx = useContext(AdminOrderNotificationsContext);
  const fallback = useAdminOrderNotificationsInternal({
    enabled: ctx ? false : options?.enabled !== false,
    adminProfile: options?.adminProfile || 'nua',
    onNavigateTab: ctx ? undefined : onNavigateTab,
  });

  return ctx || fallback;
}
