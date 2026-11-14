'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Camera, ChevronDown, Image as ImageIcon, Lock, Film } from 'lucide-react';
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
  const [showAdvanced, setShowAdvanced] = useState(false);

  const previewCount = (pack.previewImages || []).length;
  const exclusivePhotosCount = (pack.exclusivePhotos || []).length;
  const videosCount = (pack.videos || []).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Coluna 1 & 2: Informações Essenciais */}
      <div className="lg:col-span-2 space-y-4">
        <div className="p-4 sm:p-5 rounded-xl bg-[#14151c] border border-white/[0.07] shadow-sm space-y-4">
          <h3 className="text-xs font-semibold text-white tracking-wide pb-2 border-b border-white/[0.06]">
            Identificação do Pack
          </h3>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-medium">
              Título do Pack / Conteúdo *
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

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-medium">
              Descrição do Conteúdo
            </label>
            <textarea
              rows={4}
              value={pack.description || ''}
              onChange={(e) => onChangeField('description', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white outline-none focus:border-[#f4a7b9] resize-none leading-relaxed"
              placeholder="Conte o conceito deste ensaio, o clima e o que o cliente encontrará nos arquivos..."
            />
          </div>

          {/* Contagem Automática das Mídias Vinculadas */}
          <div className="p-3.5 rounded-xl bg-[#101116] border border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#f4a7b9] font-semibold block">
                Contagem Automática de Arquivos
              </span>
              <span className="text-[11px] text-zinc-400">
                Calculada automaticamente conforme você adiciona fotos e vídeos nas abas 2 e 3.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-zinc-200">
                <ImageIcon className="w-3.5 h-3.5 text-[#f4a7b9]" />
                <span>{previewCount} amostras</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-zinc-200">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{exclusivePhotosCount} fotos protegidas</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-zinc-200">
                <Film className="w-3.5 h-3.5 text-[#f4a7b9]" />
                <span>{videosCount} vídeos 4K</span>
              </span>
            </div>
          </div>

          {/* Seção Colapsável de Opções Avançadas */}
          <div className="pt-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between py-1.5 text-xs text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <span>Opções Avançadas (Link amigável, botão e checkout externo)</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180 text-[#f4a7b9]' : ''}`}
              />
            </button>

            {showAdvanced && (
              <div className="mt-3 pt-3 border-t border-white/[0.05] grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-medium">
                    Slug / Link Amigável (/avulsos/...)
                  </label>
                  <input
                    type="text"
                    value={pack.slug || ''}
                    onChange={(e) => onChangeField('slug', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white font-mono outline-none focus:border-[#f4a7b9]"
                    placeholder="Gerado automaticamente pelo título"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-medium">
                    Texto do Botão de Compra
                  </label>
                  <input
                    type="text"
                    value={pack.buttonText || ''}
                    onChange={(e) => onChangeField('buttonText', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white outline-none focus:border-[#f4a7b9]"
                    placeholder="Ex: Desbloquear Agora"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-medium">
                    Link de Checkout Externo (Deixe em branco para usar o Checkout Oficial do Site)
                  </label>
                  <input
                    type="text"
                    value={pack.checkoutUrl || ''}
                    onChange={(e) => onChangeField('checkoutUrl', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white font-mono outline-none focus:border-[#f4a7b9]"
                    placeholder="Padrão: Checkout Pix Mercado Pago automático no próprio site"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Coluna 3: Valores e Capa Principal */}
      <div className="space-y-4">
        {/* Card de Preço & Destaque (Único local do Badge) */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#14151c] border border-white/[0.07] shadow-sm space-y-3.5">
          <h3 className="text-xs font-semibold text-white tracking-wide pb-2 border-b border-white/[0.06]">
            Preço &amp; Selo de Destaque
          </h3>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-medium">
              Preço de Venda (R$) *
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
              Selo de Destaque (Opcional)
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
        <div className="p-4 sm:p-5 rounded-xl bg-[#14151c] border border-white/[0.07] shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <span className="text-xs font-semibold text-white">Foto de Capa</span>
            <button
              type="button"
              onClick={onOpenCoverPicker}
              className="text-[11px] text-[#f4a7b9] hover:text-[#f9b8c6] font-medium cursor-pointer"
            >
              Escolher da Biblioteca
            </button>
          </div>

          <div
            onClick={onOpenCoverPicker}
            className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#101116] border border-white/10 hover:border-[#f4a7b9]/40 flex items-center justify-center cursor-pointer transition"
          >
            {pack.imageUrl ? (
              <Image
                src={resolveMediaUrl(pack.imageUrl, 'thumb')}
                alt={pack.title || 'Capa'}
                fill
                className="object-cover"
              />
            ) : (
              <div className="text-center p-4 text-zinc-500">
                <Camera className="w-8 h-8 mx-auto mb-2 opacity-60 text-[#f4a7b9]" />
                <span className="text-xs text-zinc-300 font-medium block">Escolher Foto de Capa</span>
                <span className="text-[11px] text-zinc-500 block mt-0.5">
                  Toque para selecionar da Biblioteca ou enviar nova foto
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
