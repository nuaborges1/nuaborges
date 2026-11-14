'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  PersonalizadosSettings,
  PersonalizadoOrder,
  DEFAULT_PERSONALIZADOS_SETTINGS,
  VideoDurationOption,
  calculateOrderPrice,
  DeliveryChannel,
} from '@/lib/personalizadosCanonical';
import {
  fetchPersonalizadosAdmin,
  getCachedPersonalizadosAdmin,
  updatePersonalizadoOrderAdmin,
  savePersonalizadosSettingsAdmin,
} from '@/lib/services/nua/personalizadosService';
import { broadcastAdminUpdate, subscribeAdminUpdates } from '@/lib/adminSync';

export function usePersonalizadosData(searchQuery: string = '') {
  const [activeTab, setActiveTab] = useState<'orders' | 'settings'>('orders');
  const [settings, setSettings] = useState<PersonalizadosSettings>(
    () => getCachedPersonalizadosAdmin()?.settings || DEFAULT_PERSONALIZADOS_SETTINGS
  );
  const [orders, setOrders] = useState<PersonalizadoOrder[]>(
    () => getCachedPersonalizadosAdmin()?.orders || []
  );
  const [loading, setLoading] = useState<boolean>(() => !getCachedPersonalizadosAdmin());
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Estados para simulação interativa da calculadora em tempo real
  const [simPhotoCount, setSimPhotoCount] = useState<number>(5);
  const [simVideoId, setSimVideoId] = useState<string>('vid_none');
  const [simMentionName, setSimMentionName] = useState<boolean>(false);
  const [simExpress24h, setSimExpress24h] = useState<boolean>(false);
  const [simDeliveryChannel, setSimDeliveryChannel] = useState<DeliveryChannel>('telegram');

  // Estados para adicionar arquivo ao cofre do cliente
  const [activeVaultOrderId, setActiveVaultOrderId] = useState<string | null>(null);
  const [vaultFileName, setVaultFileName] = useState('');
  const [vaultFileUrl, setVaultFileUrl] = useState('');
  const [vaultFileType, setVaultFileType] = useState<'photo' | 'video'>('photo');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async (force = false) => {
    if (!force && getCachedPersonalizadosAdmin()) {
      const cached = getCachedPersonalizadosAdmin()!;
      if (cached.settings) setSettings(cached.settings);
      if (cached.orders) setOrders(cached.orders);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchPersonalizadosAdmin({ force });
      if (data.settings) {
        if (data.settings.deliveryMethods) {
          delete (data.settings.deliveryMethods as any).whatsapp;
        }
        setSettings(data.settings);
        if (data.settings.minPhotos) {
          setSimPhotoCount(data.settings.minPhotos);
        }
      }
      if (data.orders) setOrders(data.orders);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  // A IA (ou outra aba) pode alterar preços/pedidos: recarrega sozinho.
  useEffect(() => {
    let timer: any = null;
    return subscribeAdminUpdates('personalizados', () => {
      clearTimeout(timer);
      timer = setTimeout(() => loadData(true), 400);
    });
  }, []);

  useEffect(() => {
    if (settings.videoOptions && settings.videoOptions.length > 0) {
      const exists = settings.videoOptions.some((v) => v.id === simVideoId);
      if (!exists) {
        setSimVideoId(settings.videoOptions[0].id);
      }
    }
  }, [settings.videoOptions, simVideoId]);

  const simPriceDetails = useMemo(() => {
    return calculateOrderPrice(
      simPhotoCount,
      simVideoId,
      simMentionName,
      simExpress24h,
      settings
    );
  }, [simPhotoCount, simVideoId, simMentionName, simExpress24h, settings]);

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    setSaveSuccess(false);
    try {
      const cleanSettings: PersonalizadosSettings = {
        ...settings,
        deliveryMethods: {
          telegram: Boolean(settings.deliveryMethods?.telegram),
          vault: Boolean(settings.deliveryMethods?.vault),
        },
      };
      await savePersonalizadosSettingsAdmin(cleanSettings);
      // Confirma lendo de volta do servidor antes de anunciar sucesso.
      await loadData(true);
      broadcastAdminUpdate('personalizados', { source: 'panel' });
      setSaveSuccess(true);
      showToast('Configurações salvas com sucesso no site');
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpdateStatus = async (
    orderId: string,
    newStatus: PersonalizadoOrder['status']
  ) => {
    const res = await updatePersonalizadoOrderAdmin(orderId, { status: newStatus });
    if (res.success && res.order) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? res.order! : o)));
      const statusLabels: Record<string, string> = {
        em_producao: 'Em Gravação',
        pronto: 'Pronto para Entrega',
        entregue: 'Entregue com Sucesso',
        aguardando_pagamento: 'Aguardando Pagamento',
      };
      showToast(`Pedido atualizado: ${statusLabels[newStatus] || newStatus}`);
    }
  };

  const handleAddVaultFile = async (orderId: string) => {
    if (!vaultFileUrl.trim() || !vaultFileName.trim()) return;
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const newFile = {
      id: `file_${Date.now()}`,
      name: vaultFileName.trim(),
      url: vaultFileUrl.trim(),
      type: vaultFileType,
      uploadedAt: new Date().toISOString(),
    };

    const updatedFiles = [...(targetOrder.vaultFiles || []), newFile];
    const res = await updatePersonalizadoOrderAdmin(orderId, {
      vaultFiles: updatedFiles,
      status: 'pronto',
    });

    if (res.success && res.order) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? res.order! : o)));
      setVaultFileName('');
      setVaultFileUrl('');
      setActiveVaultOrderId(null);
      showToast('Arquivo anexado ao cofre do cliente com sucesso');
    }
  };

  const handleAddVaultFilesBatch = async (
    orderId: string,
    files: { name: string; url: string; type: 'photo' | 'video' }[]
  ) => {
    if (!files || files.length === 0) return;
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const now = Date.now();
    const newVaultEntries = files.map((f, idx) => ({
      id: `file_${now}_${idx}`,
      name: f.name || (f.type === 'video' ? 'Vídeo Personalizado 4K' : 'Foto Exclusiva 4K'),
      url: f.url,
      type: f.type,
      uploadedAt: new Date().toISOString(),
    }));

    const updatedFiles = [...(targetOrder.vaultFiles || []), ...newVaultEntries];
    const res = await updatePersonalizadoOrderAdmin(orderId, {
      vaultFiles: updatedFiles,
      status: targetOrder.status === 'entregue' ? 'entregue' : 'pronto',
    });

    if (res.success && res.order) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? res.order! : o)));
      showToast(`${files.length} arquivo(s) anexado(s) ao cofre do cliente!`);
    }
  };

  const handleRemoveVaultFile = async (orderId: string, fileId: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const updatedFiles = (targetOrder.vaultFiles || []).filter((f) => f.id !== fileId);
    const res = await updatePersonalizadoOrderAdmin(orderId, {
      vaultFiles: updatedFiles,
    });

    if (res.success && res.order) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? res.order! : o)));
      showToast('Arquivo removido do cofre do pedido.');
    }
  };

  const handleAddVideoOption = () => {
    const newId = `vid_${Date.now()}`;
    const newOption: VideoDurationOption = {
      id: newId,
      label: 'Novo Pacote de Vídeo',
      durationMinutes: 15,
      price: 800,
    };
    setSettings((prev) => ({
      ...prev,
      videoOptions: [...prev.videoOptions, newOption],
    }));
  };

  const handleRemoveVideoOption = (id: string) => {
    if (id === 'vid_none') return;
    setSettings((prev) => ({
      ...prev,
      videoOptions: prev.videoOptions.filter((opt) => opt.id !== id),
    }));
  };

  const filteredOrders = orders.filter((o) => {
    const matchesFilter =
      filterStatus === 'all'
        ? true
        : filterStatus === 'em_producao'
        ? o.status === 'em_producao' || o.status === 'aguardando_pagamento'
        : o.status === filterStatus;

    const effectiveSearch = (searchTerm || searchQuery).toLowerCase().trim();
    const matchesSearch =
      !effectiveSearch ||
      o.clientName.toLowerCase().includes(effectiveSearch) ||
      o.clientContact.toLowerCase().includes(effectiveSearch) ||
      o.id.toLowerCase().includes(effectiveSearch) ||
      (o.briefing || '').toLowerCase().includes(effectiveSearch);

    return matchesFilter && matchesSearch;
  });

  return {
    activeTab,
    setActiveTab,
    settings,
    setSettings,
    orders,
    loading,
    savingSettings,
    saveSuccess,
    filterStatus,
    setFilterStatus,
    searchTerm,
    setSearchTerm,
    toastMessage,
    showToast,
    simPhotoCount,
    setSimPhotoCount,
    simVideoId,
    setSimVideoId,
    simMentionName,
    setSimMentionName,
    simExpress24h,
    setSimExpress24h,
    simDeliveryChannel,
    setSimDeliveryChannel,
    simPriceDetails,
    activeVaultOrderId,
    setActiveVaultOrderId,
    vaultFileName,
    setVaultFileName,
    vaultFileUrl,
    setVaultFileUrl,
    vaultFileType,
    setVaultFileType,
    handleSaveSettings,
    handleUpdateStatus,
    handleAddVaultFile,
    handleAddVaultFilesBatch,
    handleRemoveVaultFile,
    handleAddVideoOption,
    handleRemoveVideoOption,
    filteredOrders,
  };
}
