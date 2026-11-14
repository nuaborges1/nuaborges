'use client';

import React from 'react';
import {
  ShoppingBag,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { SiteContent, LibraryImageItem } from '@/lib/types';
import { usePersonalizadosData } from './personalizados/usePersonalizadosData';
import { PersonalizadosSettingsTab } from './personalizados/PersonalizadosSettingsTab';
import { PersonalizadosOrdersTab } from './personalizados/PersonalizadosOrdersTab';
import { PageHeader, AdminTabs, StatusBadge } from './ui/AdminPrimitives';

export interface PersonalizadosEditorProps {
  onOpenOrderDetails?: (orderId: string) => void;
  searchQuery?: string;
  content?: SiteContent;
  onUploadNew?: (img: LibraryImageItem) => void;
}

export function PersonalizadosEditor({
  onOpenOrderDetails,
  searchQuery = '',
  content,
  onUploadNew,
}: PersonalizadosEditorProps = {}) {
  const {
    activeTab,
    setActiveTab,
    settings,
    setSettings,
    orders,
    activeOrders,
    deliveredOrders,
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
    handleAddVaultFilesBatch,
    handleRemoveVaultFile,
    handleAddVideoOption,
    handleRemoveVideoOption,
    filteredOrders,
    filteredActiveOrders,
    filteredDeliveredOrders,
  } = usePersonalizadosData(searchQuery);

  return (
    <div className="space-y-6 select-none w-full">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-[#09090c] border border-[#f4a7b9]/40 text-white text-xs flex items-center gap-2.5 shadow-2xl backdrop-blur-xl">
          <CheckCircle2 className="w-4 h-4 text-[#f4a7b9] shrink-0" />
          <span className="font-medium tracking-wide">{toastMessage}</span>
        </div>
      )}

      <PageHeader
        title="Personalizados"
        subtitle="Gerencie a fila de encomendas sob medida, envie arquivos no cofre do cliente e ajuste preços e regras da página pública."
        helpId={activeTab === 'orders' ? 'personalizados_pedidos' : 'personalizados_regras'}
      >
        <AdminTabs
          activeId={activeTab}
          onChange={setActiveTab}
          ariaLabel="Abas de Personalizados"
          items={[
            {
              id: 'orders',
              label: 'Fila de Pedidos',
              icon: ShoppingBag,
              badge: activeOrders.length > 0 ? activeOrders.length : undefined,
            },
            {
              id: 'settings',
              label: 'Preços e Regras',
              icon: Sliders,
            },
          ]}
        />
      </PageHeader>

      {activeTab === 'orders' && (
        <PersonalizadosOrdersTab
          orders={activeOrders}
          filteredOrders={filteredActiveOrders}
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
          onAddVaultFilesBatch={handleAddVaultFilesBatch}
          onRemoveVaultFile={handleRemoveVaultFile}
          onOpenOrderDetails={onOpenOrderDetails}
          showToast={showToast}
          content={content}
          onUploadNew={onUploadNew}
        />
      )}

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
    </div>
  );
}
