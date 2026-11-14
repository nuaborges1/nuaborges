'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { SiteContent } from '@/lib/types';

interface InstagramChannelCardProps {
  instagram: SiteContent['channels']['instagram'];
  onChange: (fields: Partial<SiteContent['channels']['instagram']>) => void;
}

export function InstagramChannelCard({
  instagram,
  onChange,
}: InstagramChannelCardProps) {
  const [newTag, setNewTag] = useState('');
  const tags = Array.isArray(instagram.tags) ? instagram.tags : [];

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
          <h4 className="font-semibold text-sm text-white">Instagram</h4>
          <span className="text-[11px] text-zinc-400 font-light">Rede Social Oficial</span>
        </div>
        <span className="text-[11px] text-zinc-300 font-mono bg-white/[0.06] px-2.5 py-0.5 rounded-full border border-white/10">
          {instagram.handle || '@nuaborges'}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1 font-mono">
            Seu @ no Instagram
          </label>
          <input
            type="text"
            value={instagram.handle || ''}
            onChange={(e) => onChange({ handle: e.target.value })}
            placeholder="@nuaborges"
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#f4a7b9] transition-colors"
          />
        </div>

        <div>
          <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1 font-mono">
            Descrição do que você compartilha
          </label>
          <textarea
            rows={2}
            value={instagram.description || ''}
            onChange={(e) => onChange({ description: e.target.value })}
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#f4a7b9] resize-none leading-relaxed transition-colors"
          />
        </div>

        <div>
          <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1 font-mono">
            Temas do seu Perfil ({tags.length})
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
              placeholder="Ex: Educação Sexual"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              className="flex-1 bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#f4a7b9] transition-colors"
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

        <div>
          <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1 font-mono">
            Link do seu Instagram
          </label>
          <input
            type="url"
            value={instagram.url || ''}
            onChange={(e) => onChange({ url: e.target.value })}
            placeholder="https://instagram.com/nuaborges"
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#f4a7b9] font-mono transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
