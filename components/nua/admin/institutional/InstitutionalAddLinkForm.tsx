/* Vinho maduro / Nua Borges */
'use client';

import React, { useState } from 'react';
import { Plus, X, AlertTriangle } from 'lucide-react';
import { InstitutionalLinkItem } from '@/lib/types';
import { ICON_OPTIONS } from './types';

interface InstitutionalAddLinkFormProps {
  onAdd: (item: Omit<InstitutionalLinkItem, 'id' | 'order'>) => void;
  onCancel: () => void;
}

export function InstitutionalAddLinkForm({ onAdd, onCancel }: InstitutionalAddLinkFormProps) {
  const [newTitle, setNewTitle] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newIcon, setNewIcon] = useState<NonNullable<InstitutionalLinkItem['iconName']>>('fileText');
  const [newOpenInNewTab, setNewOpenInNewTab] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const titleTrimmed = newTitle.trim();
    const labelTrimmed = newLabel.trim() || titleTrimmed;
    const urlTrimmed = newUrl.trim();

    if (!titleTrimmed) {
      setFormError('Por favor, informe o nome ou título deste link.');
      return;
    }
    if (!urlTrimmed) {
      setFormError('Por favor, informe o link de destino da página.');
      return;
    }

    onAdd({
      name: titleTrimmed,
      label: labelTrimmed,
      description: newDescription.trim() || undefined,
      url: urlTrimmed,
      iconName: newIcon,
      active: true,
      openInNewTab: newOpenInNewTab,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 p-4 rounded-lg bg-[#101116] border border-white/[0.06] space-y-3 transition-all"
    >
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
        <span className="text-xs font-semibold text-white flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-[#843C52]" />
          Adicionar Novo Link
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="text-zinc-500 hover:text-white p-1 rounded-md cursor-pointer"
          aria-label="Cancelar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {formError && (
        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1">
            Nome do Link *
          </label>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => {
              setNewTitle(e.target.value);
              if (!newLabel) setNewLabel(e.target.value);
            }}
            placeholder="Ex: Termos de Uso"
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#843C52] transition-colors"
          />
        </div>

        <div>
          <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1">
            Texto Exibido no Site *
          </label>
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Ex: Termos de Uso"
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#843C52] transition-colors"
          />
        </div>

        <div>
          <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1">
            Link da Página *
          </label>
          <input
            type="text"
            value={newUrl}
            onChange={(e) => {
              const val = e.target.value;
              setNewUrl(val);
              if (val.startsWith('http')) setNewOpenInNewTab(true);
            }}
            placeholder="Ex: /termos ou https://..."
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-[#843C52] transition-colors"
          />
          <span className="text-zinc-500 text-[10px] block mt-1">
            Páginas do próprio site começam com / (ex: <code className="text-[#843C52]">/termos</code>). Para links externos, use o link completo.
          </span>
        </div>

        <div>
          <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1">
            Ícone Ilustrativo
          </label>
          <select
            value={newIcon}
            onChange={(e) => setNewIcon(e.target.value as any)}
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#843C52] transition-colors"
          >
            {ICON_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id} className="bg-[#171821] text-white">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1">
            Descrição Curta (Opcional)
          </label>
          <input
            type="text"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Ex: Condições gerais, direitos autorais e preservação da obra artística"
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#843C52] transition-colors"
          />
        </div>

        <div className="sm:col-span-2 flex items-center gap-3 pt-1">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={newOpenInNewTab}
              onChange={(e) => setNewOpenInNewTab(e.target.checked)}
              className="sr-only peer"
            />
            <div className="relative w-8 h-4.5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#843C52]" />
          </label>
          <span className="text-xs text-zinc-300">
            Abrir link em uma nova aba do navegador (recomendado para links de fora do site)
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
        <button
          type="button"
          onClick={onCancel}
          className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] text-xs font-medium cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="h-8 px-4 rounded-full bg-[#843C52] hover:bg-[#992b4a] text-white font-semibold text-xs transition shadow-sm cursor-pointer"
        >
          Salvar Link
        </button>
      </div>
    </form>
  );
}
