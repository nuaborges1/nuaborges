/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import {
  ArrowLeft,
  Save,
  Trash2,
  Sliders,
  Eye,
  Lock,
} from 'lucide-react';
import { packVaultFiles } from '@/lib/media/vaultPath';
import { AvulsoProductItem } from '@/lib/types';
import { PageHeader, AdminTabs, StatusBadge } from '../ui/AdminPrimitives';

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
  const isPublished = pack.active !== false;
  const vaultCount = packVaultFiles(pack).length;

  const currentHelpId =
    activeTab === 'info'
      ? 'pack_editor_info'
      : activeTab === 'previews'
      ? 'pack_editor_previews'
      : 'pack_editor_vault';

  return (
    <PageHeader
      backAction={
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para Conteúdos &amp; Packs</span>
        </button>
      }
      title={pack.title || (isNew ? 'Novo Pack Autoral' : 'Editar Pack')}
      subtitle={vaultCount === 0
        ? 'Compra indisponível. Adicione pelo menos um arquivo privado na aba Cofre.'
        : 'Defina o que aparece na página do pack e quais arquivos a cliente recebe depois da compra.'}
      helpId={currentHelpId}
      actions={
        <div className="flex items-center gap-2.5 flex-wrap">
          <label
            title="Ativa ou pausa a exibição deste pack na vitrine pública"
            className="inline-flex items-center gap-2 h-9 px-3 rounded-xl bg-[#14161d] border border-white/[0.08] text-xs text-zinc-300 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => onFieldChange('active', e.target.checked)}
              className="w-3.5 h-3.5 accent-[#843C52] cursor-pointer"
            />
            <span>Visível na vitrine pública (Ativo)</span>
          </label>

          {!isNew && onDeleteRequest && (
            <button
              type="button"
              onClick={onDeleteRequest}
              className="h-9 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir</span>
            </button>
          )}

          <button
            type="button"
            onClick={onSave}
            className="h-9 px-4 rounded-xl bg-[#843C52] hover:bg-[#992b4a] text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar Pack</span>
          </button>
        </div>
      }
    >
      <AdminTabs
        activeId={activeTab}
        onChange={setActiveTab}
        ariaLabel="Abas de edição do pack"
        items={[
          {
            id: 'info',
            label: 'Informações do conteúdo',
            icon: Sliders,
          },
          {
            id: 'previews',
            label: 'Amostras gratuitas',
            icon: Eye,
            badge: pack.previewImages?.length || 0,
          },
          {
            id: 'vault',
            label: 'Conteúdo protegido',
            icon: Lock,
            badge: vaultCount,
          },
        ]}
      />
    </PageHeader>
  );
}
