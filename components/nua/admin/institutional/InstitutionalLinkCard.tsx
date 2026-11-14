'use client';

import React from 'react';
import {
  FileText,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Check,
} from 'lucide-react';
import { InstitutionalLinkItem } from '@/lib/types';
import { ICON_OPTIONS } from './types';

interface InstitutionalLinkCardProps {
  link: InstitutionalLinkItem;
  index: number;
  totalLinks: number;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onFinishEdit: () => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onToggleActive: (id: string) => void;
  onUpdateLink: (id: string, fields: Partial<InstitutionalLinkItem>) => void;
  onDeleteRequest: (link: InstitutionalLinkItem) => void;
}

export function InstitutionalLinkCard({
  link,
  index,
  totalLinks,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onFinishEdit,
  onMove,
  onToggleActive,
  onUpdateLink,
  onDeleteRequest,
}: InstitutionalLinkCardProps) {
  const IconComponent =
    ICON_OPTIONS.find((opt) => opt.id === link.iconName)?.icon || FileText;

  return (
    <div
      className={`p-3 sm:p-3.5 rounded-lg border transition-all duration-200 ${
        link.active
          ? 'bg-[#101116] border-white/[0.06] hover:border-white/[0.12]'
          : 'bg-[#101116]/40 border-white/[0.03] opacity-60'
      }`}
    >
      {!isEditing ? (
        // Visualização Normal do Card
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Lado Esquerdo: Ícone + Ordem + Textos */}
          <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
            {/* Badge de Ordem e Reordenação rápida */}
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onMove(index, 'up')}
                aria-label="Mover para cima"
                className="p-1 rounded text-zinc-500 hover:text-white disabled:opacity-20 disabled:hover:text-zinc-500 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono text-zinc-600 font-bold">
                #{link.order || index + 1}
              </span>
              <button
                type="button"
                disabled={index === totalLinks - 1}
                onClick={() => onMove(index, 'down')}
                aria-label="Mover para baixo"
                className="p-1 rounded text-zinc-500 hover:text-white disabled:opacity-20 disabled:hover:text-zinc-500 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Ícone estilizado */}
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 text-[#f4a7b9]">
              <IconComponent className="w-4.5 h-4.5" strokeWidth={1.75} />
            </div>

            {/* Informações do Link */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm sm:text-base font-medium text-white truncate">
                  {link.name}
                </h4>
                <span className="text-[11px] font-mono text-[#f4a7b9] px-2 py-0.5 rounded bg-[#f4a7b9]/10 border border-[#f4a7b9]/20 truncate">
                  {link.url}
                </span>
                {link.openInNewTab && (
                  <span className="text-[10px] uppercase font-mono text-zinc-500 px-1.5 py-0.5 rounded bg-white/[0.04] shrink-0">
                    Nova aba
                  </span>
                )}
                {!link.active && (
                  <span className="text-[10px] uppercase font-mono text-amber-400/90 px-1.5 py-0.5 rounded bg-amber-400/10 shrink-0">
                    Oculto no site
                  </span>
                )}
              </div>

              {link.description && (
                <p className="text-zinc-400 text-xs font-light mt-0.5 line-clamp-1">
                  {link.description}
                </p>
              )}
              {link.label !== link.name && (
                <p className="text-zinc-500 text-[11px] font-light mt-0.5">
                  Texto exibido: &ldquo;{link.label}&rdquo;
                </p>
              )}
            </div>
          </div>

          {/* Lado Direito: Ações */}
          <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.06] w-full sm:w-auto justify-between sm:justify-end">
            <button
              type="button"
              onClick={() => onToggleActive(link.id)}
              className={`h-7 inline-flex items-center gap-1.5 px-2.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                link.active
                  ? 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20'
                  : 'text-zinc-400 bg-white/[0.06] border border-white/[0.08] hover:text-white'
              }`}
              title={link.active ? 'Visível no site (toque para ocultar)' : 'Oculto no site (toque para exibir)'}
            >
              {link.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{link.active ? 'Visível' : 'Oculto'}</span>
            </button>

            <button
              type="button"
              onClick={onStartEdit}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Editar link"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onDeleteRequest(link)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Remover link"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        // Formulário de Edição Inline do Card
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#f4a7b9]">
              Editando: {link.name}
            </span>
            <button
              type="button"
              onClick={onCancelEdit}
              className="h-7 px-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] text-xs cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 text-[10px] font-semibold uppercase mb-1">
                Nome do Link
              </label>
              <input
                type="text"
                value={link.name}
                onChange={(e) => onUpdateLink(link.id, { name: e.target.value })}
                className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#f4a7b9]"
              />
            </div>

            <div>
              <label className="block text-zinc-400 text-[10px] font-semibold uppercase mb-1">
                Texto Exibido no Site
              </label>
              <input
                type="text"
                value={link.label}
                onChange={(e) => onUpdateLink(link.id, { label: e.target.value })}
                className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#f4a7b9]"
              />
            </div>

            <div>
              <label className="block text-zinc-400 text-[10px] font-semibold uppercase mb-1">
                Link da Página
              </label>
              <input
                type="text"
                value={link.url}
                onChange={(e) => onUpdateLink(link.id, { url: e.target.value })}
                className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-[#f4a7b9]"
              />
            </div>

            <div>
              <label className="block text-zinc-400 text-[10px] font-semibold uppercase mb-1">
                Ícone
              </label>
              <select
                value={link.iconName || 'fileText'}
                onChange={(e) => onUpdateLink(link.id, { iconName: e.target.value as any })}
                className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#f4a7b9]"
              >
                {ICON_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id} className="bg-[#171821] text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-zinc-400 text-[10px] font-semibold uppercase mb-1">
                Descrição Curta (Opcional)
              </label>
              <input
                type="text"
                value={link.description || ''}
                onChange={(e) => onUpdateLink(link.id, { description: e.target.value })}
                placeholder="Breve explicação da página"
                className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#f4a7b9]"
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-3 pt-1">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(link.openInNewTab)}
                  onChange={(e) => onUpdateLink(link.id, { openInNewTab: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="relative w-8 h-4.5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#f4a7b9]" />
              </label>
              <span className="text-xs text-zinc-300">
                Abrir em nova aba (links externos)
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onFinishEdit}
              className="h-8 px-4 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold text-xs transition shadow-sm cursor-pointer inline-flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Concluir Edição</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
