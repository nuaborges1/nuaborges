'use client';

import React from 'react';
import {
  ArrowLeft,
  Save,
  Trash2,
  ShoppingBag,
  Sliders,
  Eye,
  Lock,
} from 'lucide-react';
import { AvulsoProductItem } from '@/lib/types';

interface PackEditorHeaderProps {
  pack: AvulsoProductItem;
  isNew: boolean;
  activeTab: 'info' | 'previews' | 'vault';
  setActiveTab: (tab: 'info' | 'previews' | 'vault') => void;
  onFieldChange: (field: keyof AvulsoProductItem, value: any) => void;
  onCancel: () => void;
  onSave: (e: React.FormEvent) => void;
  onDeleteRequest?: () => void;
}

export function PackEditorHeader({
  pack,
  isNew,
  activeTab,
  setActiveTab,
  onFieldChange,
  onCancel,
  onSave,
  onDeleteRequest,
}: PackEditorHeaderProps) {
  return (
    <>
      {/* Top Breadcrumb & Return Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/[0.06]">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Conteúdos &amp; Packs</span>
        </button>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {!isNew && onDeleteRequest && (
            <button
              type="button"
              onClick={onDeleteRequest}
              className="h-8 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/25 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir Pack</span>
            </button>
          )}

          <button
            type="button"
            onClick={onSave}
            className="h-8 px-4 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar Pack</span>
          </button>
        </div>
      </div>

      {/* Header da Página Dedicada */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#171821] border border-white/[0.06] shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#f4a7b9]/15 border border-[#f4a7b9]/30 text-[#f4a7b9] text-[10px] font-bold tracking-widest uppercase font-mono mb-1">
              <ShoppingBag className="w-3 h-3" />
              <span>{isNew ? 'Novo Item Digital' : 'Edição de Produto'}</span>
            </div>
            <h1 className="text-sm sm:text-base font-semibold text-white">
              {pack.title || 'Criar Novo Pack Autoral'}
            </h1>
            <p className="text-zinc-400 text-xs font-light mt-0.5">
              Configure fotos de vitrine, fotos exclusivas de entrega e vídeos 4K sob demanda.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer px-3 py-1.5 rounded-lg bg-[#101116] border border-white/10">
              <input
                type="checkbox"
                checked={pack.active !== false}
                onChange={(e) => onFieldChange('active', e.target.checked)}
                className="w-3.5 h-3.5 accent-[#f4a7b9] cursor-pointer"
              />
              <span className="font-medium text-xs">
                {pack.active !== false ? '● Publicado no Site' : '○ Oculto / Rascunho'}
              </span>
            </label>
          </div>
        </div>

        {/* Sub-navegação em Abas no topo da página */}
        <div className="inline-flex items-center p-1 rounded-xl bg-[#101116] border border-white/[0.06] overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'info'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[#f4a7b9]" />
            <span>1. Dados &amp; Precificação</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('previews')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'previews'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-[#f4a7b9]" />
            <span>2. Amostras Gratuitas ({pack.previewImages?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vault')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'vault'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-[#f4a7b9]" />
            <span>
              3. Cofre Protegido ({pack.exclusivePhotos?.length || 0} fotos / {pack.videos?.length || 0} vídeos)
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
