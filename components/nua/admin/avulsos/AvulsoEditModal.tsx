'use client';

import React from 'react';
import {
  X,
  Sliders,
  Eye,
  Lock,
} from 'lucide-react';
import { AvulsoProductItem } from '@/lib/types';
import { AvulsoGeneralTab } from './AvulsoGeneralTab';
import { AvulsoPreviewsTab } from './AvulsoPreviewsTab';
import { AvulsoVaultTab } from './AvulsoVaultTab';

interface AvulsoEditModalProps {
  editingItemIndex: number | null;
  editingItemData: AvulsoProductItem;
  modalTab: 'general' | 'previews' | 'vault';
  setModalTab: (tab: 'general' | 'previews' | 'vault') => void;
  onClose: () => void;
  onSave: () => void;
  onUpdateFields: (fields: Partial<AvulsoProductItem>) => void;
  getPublicPackUrl: (slug: string) => string;

  // Previews Tab Callbacks
  onSelectCover: () => void;
  onTriggerUploadPreviews: () => void;
  onOpenAcervoPreviews: () => void;
  onPreviewPhoto: (url: string) => void;
  onRemovePreviewPhoto: (index: number) => void;

  // Vault Tab Callbacks
  uploadingState: { isUploading: boolean; progress: number; statusText: string } | null;
  showManualUrlMap: Record<number, boolean>;
  onToggleManualUrl: (index: number) => void;
  onUpdateVideoField: (index: number, field: string, value: string) => void;
  onRemoveVideo: (index: number) => void;
  onAddEmptyVideo: () => void;
  onTriggerNewVideoUpload: () => void;
  onTriggerReplaceVideoUpload: (index: number) => void;
  onOpenAcervoVideo: () => void;
  onOpenAcervoVideoPoster: (videoIndex: number) => void;
  onPreviewVideo: (video: { url: string; title: string; poster?: string }) => void;
  onTriggerUploadVaultPhotos: () => void;
  onOpenAcervoVaultPhotos: () => void;
  onCopyPreviewsToVault: () => void;
  onRemoveExclusivePhoto: (index: number) => void;
}

export function AvulsoEditModal({
  editingItemIndex,
  editingItemData,
  modalTab,
  setModalTab,
  onClose,
  onSave,
  onUpdateFields,
  getPublicPackUrl,
  onSelectCover,
  onTriggerUploadPreviews,
  onOpenAcervoPreviews,
  onPreviewPhoto,
  onRemovePreviewPhoto,
  uploadingState,
  showManualUrlMap,
  onToggleManualUrl,
  onUpdateVideoField,
  onRemoveVideo,
  onAddEmptyVideo,
  onTriggerNewVideoUpload,
  onTriggerReplaceVideoUpload,
  onOpenAcervoVideo,
  onOpenAcervoVideoPoster,
  onPreviewVideo,
  onTriggerUploadVaultPhotos,
  onOpenAcervoVaultPhotos,
  onCopyPreviewsToVault,
  onRemoveExclusivePhoto,
}: AvulsoEditModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#171821] border border-white/[0.08] rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl relative my-auto space-y-4 max-h-[92vh] flex flex-col">
        {/* Header do Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] shrink-0">
          <div className="min-w-0 pr-4">
            <span className="text-[#f4a7b9] text-[10px] font-semibold tracking-wider uppercase font-mono block mb-0.5">
              {editingItemIndex === -1 ? 'NOVO PACK / CONTEÚDO AVULSO' : 'EDITANDO PACK DO CATÁLOGO'}
            </span>
            <h3 className="text-sm sm:text-base font-semibold text-white truncate">
              {editingItemData.title || 'Novo Conteúdo Exclusivo'}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Switch de Ativo/Oculto dentro do Modal */}
            <label className="inline-flex items-center gap-2 cursor-pointer select-none bg-[#0e0f14] px-2.5 py-1 rounded-lg border border-white/10">
              <input
                type="checkbox"
                checked={editingItemData.active !== false}
                onChange={(e) => onUpdateFields({ active: e.target.checked })}
                className="sr-only peer"
              />
              <div className="relative w-8 h-4 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#f4a7b9]" />
              <span className="text-[11px] font-medium text-zinc-300 hidden sm:inline">
                {editingItemData.active !== false ? 'Ativo na Loja' : 'Oculto'}
              </span>
            </label>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
              title="Fechar sem salvar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Abas Internas */}
        <div className="inline-flex items-center p-1 rounded-xl bg-[#101116] border border-white/[0.06] overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setModalTab('general')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition flex items-center gap-1.5 ${
              modalTab === 'general'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>1. Informações & Textos</span>
          </button>

          <button
            type="button"
            onClick={() => setModalTab('previews')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition flex items-center gap-1.5 ${
              modalTab === 'previews'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>2. Capa & Prévias da Vitrine ({editingItemData.previewImages?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setModalTab('vault')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition flex items-center gap-1.5 ${
              modalTab === 'vault'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>
              3. Cofre Protegido: Vídeos ({editingItemData.videos?.length || 0}) & Fotos 4K (
              {(editingItemData.exclusivePhotos && editingItemData.exclusivePhotos.length > 0
                ? editingItemData.exclusivePhotos.length
                : editingItemData.previewImages?.length) || 0}
              )
            </span>
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-6">
          {modalTab === 'general' && (
            <AvulsoGeneralTab
              data={editingItemData}
              onUpdate={onUpdateFields}
              getPublicPackUrl={getPublicPackUrl}
            />
          )}

          {modalTab === 'previews' && (
            <AvulsoPreviewsTab
              data={editingItemData}
              onSelectCover={onSelectCover}
              onTriggerUploadPreviews={onTriggerUploadPreviews}
              onOpenAcervoPreviews={onOpenAcervoPreviews}
              onPreviewPhoto={onPreviewPhoto}
              onRemovePreviewPhoto={onRemovePreviewPhoto}
            />
          )}

          {modalTab === 'vault' && (
            <AvulsoVaultTab
              data={editingItemData}
              uploadingState={uploadingState}
              showManualUrlMap={showManualUrlMap}
              onToggleManualUrl={onToggleManualUrl}
              onUpdateVideoField={onUpdateVideoField}
              onRemoveVideo={onRemoveVideo}
              onAddEmptyVideo={onAddEmptyVideo}
              onTriggerNewVideoUpload={onTriggerNewVideoUpload}
              onTriggerReplaceVideoUpload={onTriggerReplaceVideoUpload}
              onOpenAcervoVideo={onOpenAcervoVideo}
              onOpenAcervoVideoPoster={onOpenAcervoVideoPoster}
              onPreviewVideo={onPreviewVideo}
              onTriggerUploadVaultPhotos={onTriggerUploadVaultPhotos}
              onOpenAcervoVaultPhotos={onOpenAcervoVaultPhotos}
              onCopyPreviewsToVault={onCopyPreviewsToVault}
              onPreviewPhoto={onPreviewPhoto}
              onRemoveExclusivePhoto={onRemoveExclusivePhoto}
            />
          )}
        </div>

        {/* Footer do Modal */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] shrink-0">
          <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline">
            {editingItemData.slug ? getPublicPackUrl(editingItemData.slug) : 'Pack em rascunho'}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] text-xs font-medium transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSave}
              className="h-8 px-4 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold text-xs transition shadow-sm cursor-pointer"
            >
              Salvar Pack
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
