/* Vinho maduro / Nua Borges */
'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { ChannelPlatformItem } from '@/lib/types';

interface PlatformChannelCardProps {
  title: string;
  subtitle: string;
  platform: ChannelPlatformItem;
  onChange: (fields: Partial<ChannelPlatformItem>) => void;
  badgePlaceholder?: string;
  urlPlaceholder?: string;
  tagPlaceholder?: string;
}

export function PlatformChannelCard({
  title,
  subtitle,
  platform,
  onChange,
  badgePlaceholder = 'Ex: DESTAQUE',
  urlPlaceholder = 'https://...',
  tagPlaceholder = 'Ex: Nova Tag',
}: PlatformChannelCardProps) {
  const [newTag, setNewTag] = useState('');
  const tags = Array.isArray(platform.tags) ? platform.tags : [];

  const handleAddTag = () => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      onChange({ tags: [...tags, trimmed] });
    }
    setNewTag('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange({ tags: tags.filter((t) => t !== tagToRemove) });
  };

  return (
    <div className="bg-[#171821] border border-white/[0.06] rounded-xl p-5 space-y-3.5">
      <div className="pb-3 border-b border-white/[0.06] flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-sm text-white">{title}</h4>
          <span className="text-[11px] text-zinc-400 font-light">{subtitle}</span>
        </div>
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={platform.active !== false}
            onChange={(e) => onChange({ active: e.target.checked })}
            className="sr-only peer"
          />
          <div className="relative w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#843C52]" />
          <span className="text-[11px] text-zinc-400">
            {platform.active !== false ? 'Ativo' : 'Oculto'}
          </span>
        </label>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1 font-mono">
            Etiqueta de Destaque
          </label>
          <input
            type="text"
            value={platform.badge || ''}
            onChange={(e) => onChange({ badge: e.target.value })}
            placeholder={badgePlaceholder}
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#843C52] transition-colors"
          />
        </div>

        <div>
          <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1 font-mono">
            Descrição
          </label>
          <textarea
            rows={2}
            value={platform.description || ''}
            onChange={(e) => onChange({ description: e.target.value })}
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#843C52] resize-none leading-relaxed transition-colors"
          />
        </div>

        <div>
          <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1 font-mono">
            Destaques e Tags ({tags.length})
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px] items-center">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[11px] text-zinc-200"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder={tagPlaceholder}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              className="flex-1 bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#843C52] transition-colors"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white font-medium transition-colors cursor-pointer shrink-0"
            >
              + Adicionar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <div>
            <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1 font-mono">
              Texto do Botão
            </label>
            <input
              type="text"
              value={platform.buttonText || ''}
              onChange={(e) => onChange({ buttonText: e.target.value })}
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#843C52] transition-colors"
            />
          </div>
          <div>
            <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1 font-mono">
              Link da Plataforma
            </label>
            <input
              type="url"
              value={platform.url || ''}
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder={urlPlaceholder}
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#843C52] font-mono transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
