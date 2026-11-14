'use client';

import React from 'react';
import {
  ShoppingBag,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { usePersonalizadosData } from './personalizados/usePersonalizadosData';
import { PersonalizadosSettingsTab } from './personalizados/PersonalizadosSettingsTab';
import { PersonalizadosOrdersTab } from './personalizados/PersonalizadosOrdersTab';

export interface PersonalizadosEditorProps {
  onOpenOrderDetails?: (orderId: string) => void;
  searchQuery?: string;
}

export function PersonalizadosEditor({
  onOpenOrderDetails,
  searchQuery = '',
}: PersonalizadosEditorProps = {}) {
  const {
    activeTab,
    setActiveTab,
    settings,
    setSettings,
    orders,
    loading,
    savingSettings,
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
    handleAddVideoOption,
    handleRemoveVideoOption,
    filteredOrders,
  } = usePersonalizadosData(searchQuery);

  return (
    <div className="space-y-8 select-none">
      {/* Toast de Feedback Notificações */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-[#09090c] border border-[#f4a7b9]/40 text-white text-xs flex items-center gap-2.5 shadow-2xl backdrop-blur-xl">
          <CheckCircle2 className="w-4 h-4 text-[#f4a7b9] shrink-0" />
          <span className="font-medium tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* Barra de Sub-Navegação em Segmentos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div className="inline-flex items-center p-1 rounded-xl bg-[#171821] border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[#f4a7b9]" />
            <span>Preços &amp; Calculadora</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-zinc-400" />
            <span>Fila de Pedidos</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/[0.08] text-zinc-300">
              {orders.length}
            </span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-[11px] text-zinc-500 font-light">
          <span>Pedidos sob medida, fotos exclusivas e vídeos personalizados</span>
        </div>
      </div>

      {activeTab === 'settings' && (
        <PersonalizadosSettingsTab
          settings={settings}
          setSettings={setSettings}
          savingSettings={savingSettings}
          onSaveSettings={handleSaveSettings}
          onAddVideoOption={handleAddVideoOption}
          onRemoveVideoOption={handleRemoveVideoOption}
          simPhotoCount={simPhotoCount}
          setSimPhotoCount={setSimPhotoCount}
          simVideoId={simVideoId}
          setSimVideoId={setSimVideoId}
          simMentionName={simMentionName}
          setSimMentionName={setSimMentionName}
          simExpress24h={simExpress24h}
          setSimExpress24h={setSimExpress24h}
          simPriceDetails={simPriceDetails}
        />
      )}

      {activeTab === 'orders' && (
        <PersonalizadosOrdersTab
          orders={orders}
          filteredOrders={filteredOrders}
          loading={loading}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          activeVaultOrderId={activeVaultOrderId}
          setActiveVaultOrderId={setActiveVaultOrderId}
          vaultFileName={vaultFileName}
          setVaultFileName={setVaultFileName}
          vaultFileUrl={vaultFileUrl}
          setVaultFileUrl={setVaultFileUrl}
          vaultFileType={vaultFileType}
          setVaultFileType={setVaultFileType}
          onUpdateStatus={handleUpdateStatus}
          onAddVaultFile={handleAddVaultFile}
          onOpenOrderDetails={onOpenOrderDetails}
          showToast={showToast}
        />
      )}
    </div>
  );
}
