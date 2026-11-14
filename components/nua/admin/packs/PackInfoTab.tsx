'use client';

import React from 'react';
import Image from 'next/image';
import { Camera } from 'lucide-react';
import { AvulsoProductItem } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';

interface PackInfoTabProps {
  pack: AvulsoProductItem;
  onChangeField: (field: keyof AvulsoProductItem, value: any) => void;
  onChangePrice: (val: string) => void;
  onOpenCoverPicker: () => void;
}

export function PackInfoTab({
  pack,
  onChangeField,
  onChangePrice,
  onOpenCoverPicker,
}: PackInfoTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Coluna 1 & 2: Informações de Texto */}
      <div className="lg:col-span-2 p-4 sm:p-5 rounded-xl bg-[#171821] border border-white/[0.06] shadow-sm space-y-4">
        <h3 className="text-xs font-semibold text-white tracking-wide pb-2 border-b border-white/[0.06]">
          Identificação do Produto
        </h3>

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-medium">
            Título do Pack / Conteúdo: *
          </label>
          <input
            type="text"
            required
            value={pack.title || ''}
            onChange={(e) => onChangeField('title', e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white outline-none focus:border-[#f4a7b9] transition-colors"
            placeholder="Ex: Ensaio Hotel Fasano • Madrugada Autoral"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-medium">
              Slug / Link Amigável (/avulsos/...):
            </label>
            <input
              type="text"
              value={pack.slug || ''}
              onChange={(e) => onChangeField('slug', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white font-mono outline-none focus:border-[#f4a7b9]"
              placeholder="ex: ensaio-fasano-madrugada"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-medium">
              Destaque / Badge (Opcional):
            </label>
            <input
              type="text"
              value={pack.badge || ''}
              onChange={(e) => onChangeField('badge', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white outline-none focus:border-[#f4a7b9]"
              placeholder="Ex: LANÇAMENTO, MAIS PEDIDO"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-medium">
            Descrição Sensual e Editorial:
          </label>
          <textarea
            rows={4}
            value={pack.description || ''}
            onChange={(e) => onChangeField('description', e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white outline-none focus:border-[#f4a7b9] resize-none leading-relaxed"
            placeholder="Conte o conceito deste ensaio, o clima e o que o cliente encontrará nos arquivos..."
          />
        </div>
      </div>

      {/* Coluna 3: Valores e Capa Principal */}
      <div className="space-y-4">
        {/* Card de Preço */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#171821] border border-white/[0.06] shadow-sm space-y-3.5">
          <h3 className="text-xs font-semibold text-white tracking-wide pb-2 border-b border-white/[0.06]">
            Precificação
          </h3>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-medium">
              Preço de Venda (R$): *
            </label>
            <div className="relative">
              <span className="text-xs font-mono text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2">
                R$
              </span>
              <input
                type="text"
                required
                value={pack.price || ''}
                onChange={(e) => onChangePrice(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0e0f14] border border-white/10 font-mono text-xs font-bold text-white outline-none focus:border-[#f4a7b9]"
                placeholder="39,90"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-medium">
              Selo / Badge de Destaque:
            </label>
            <input
              type="text"
              value={pack.badge || ''}
              onChange={(e) => onChangeField('badge', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0e0f14] border border-white/10 font-mono text-xs text-zinc-300 outline-none focus:border-[#f4a7b9]"
              placeholder="Ex: LANÇAMENTO, EXCLUSIVO, VIP"
            />
          </div>
        </div>

        {/* Card da Imagem de Capa Principal */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#171821] border border-white/[0.06] shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <span className="text-xs font-semibold text-white">Foto de Capa</span>
            <button
              type="button"
              onClick={onOpenCoverPicker}
              className="text-[11px] text-[#f4a7b9] hover:underline cursor-pointer"
            >
              Escolher do Cofre
            </button>
          </div>

          <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-[#101116] border border-white/10 flex items-center justify-center">
            {pack.imageUrl ? (
              <Image
                src={resolveMediaUrl(pack.imageUrl, 'thumb')}
                alt={pack.title || 'Capa'}
                fill
                className="object-cover"
              />
            ) : (
              <div className="text-center p-4 text-zinc-600">
                <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <span className="text-[11px] block">Nenhuma capa definida</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
