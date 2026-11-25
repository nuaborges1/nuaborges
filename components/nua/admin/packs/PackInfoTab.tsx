/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import Image from 'next/image';
import { Camera, Image as ImageIcon, Lock, Film, Plus, Minus } from 'lucide-react';
import { AvulsoProductItem } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';
import { formatBrlPrice, parseBrlPrice } from '@/lib/formatters';
import { BrlCurrencyInput } from '../ui/BrlCurrencyInput';

interface PackInfoTabProps {
  pack: AvulsoProductItem;
  onChangeField: (field: keyof AvulsoProductItem, value: any) => void;
  onChangePrice: (val: string) => void;
  onBlurPrice?: () => void;
  onOpenCoverPicker: () => void;
  validationErrors?: {
    title?: string;
    description?: string;
    imageUrl?: string;
  };
}

export function PackInfoTab({
  pack,
  onChangeField,
  onChangePrice,
  onBlurPrice,
  onOpenCoverPicker,
  validationErrors,
}: PackInfoTabProps) {
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
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-medium">
                Título do Pack / Conteúdo *
              </label>
              {validationErrors?.title && (
                <span className="text-[11px] text-rose-400 font-medium">
                  {validationErrors.title}
                </span>
              )}
            </div>
            <input
              type="text"
              required
              value={pack.title || ''}
              onChange={(e) => onChangeField('title', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg bg-[#0e0f14] border text-xs text-white outline-none transition-colors ${
                validationErrors?.title
                  ? 'border-rose-500 bg-rose-500/[0.04] focus:border-rose-400'
                  : 'border-white/10 focus:border-[#843C52]'
              }`}
              placeholder="Ex: Ensaio Hotel Fasano • Madrugada Autoral"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-medium">
                Descrição do Conteúdo *
              </label>
              {validationErrors?.description && (
                <span className="text-[11px] text-rose-400 font-medium">
                  {validationErrors.description}
                </span>
              )}
            </div>
            <textarea
              rows={4}
              required
              value={pack.description || ''}
              onChange={(e) => onChangeField('description', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg bg-[#0e0f14] border text-xs text-white outline-none resize-none leading-relaxed transition-colors ${
                validationErrors?.description
                  ? 'border-rose-500 bg-rose-500/[0.04] focus:border-rose-400'
                  : 'border-white/10 focus:border-[#843C52]'
              }`}
              placeholder="Conte o conceito deste ensaio, o clima e o que o cliente encontrará nos arquivos..."
            />
          </div>

          {/* Contagem Automática das Mídias Vinculadas */}
          <div className="p-3.5 rounded-xl bg-[#101116] border border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#843C52] font-semibold block">
                Contagem Automática de Arquivos
              </span>
              <span className="text-[11px] text-zinc-400">
                Calculada automaticamente conforme você adiciona fotos e vídeos nas abas 2 e 3.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-zinc-200">
                <ImageIcon className="w-3.5 h-3.5 text-[#843C52]" />
                <span>{previewCount} amostras</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-zinc-200">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{exclusivePhotosCount} fotos protegidas</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-zinc-200">
                <Film className="w-3.5 h-3.5 text-[#843C52]" />
                <span>{videosCount} vídeos 4K</span>
              </span>
            </div>
          </div>

          {/* Modalidade de Comercialização: Pack / Coleção Oficial */}
          <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
            <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-medium block">
              Modalidade de Comercialização *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onChangeField('modality', 'pack')}
                className="p-3 rounded-xl border text-left transition cursor-pointer bg-[#843C52]/10 border-[#843C52] shadow-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[#843C52]">
                    Pack / Coleção (Várias Fotos &amp; Vídeos)
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#843C52]" />
                </div>
                <span className="text-[11px] text-zinc-400 block leading-tight font-light">
                  Coletânea com múltiplas fotos em alta definição e vídeos exclusivos
                </span>
              </button>

              <div
                className="p-3 rounded-xl border border-white/5 bg-zinc-950/60 opacity-50 cursor-not-allowed select-none text-left"
                title="A criação de conteúdos avulsos de mídia única está desabilitada temporariamente."
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-zinc-500 line-through">
                    Conteúdo Avulso (Foto Única)
                  </span>
                  <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    Desativado
                  </span>
                </div>
                <span className="text-[11px] text-zinc-600 block leading-tight font-light">
                  Recurso suspenso temporariamente nesta versão.
                </span>
              </div>
            </div>
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
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const curr = parseBrlPrice(pack.price);
                  const next = Math.max(0, curr - 5);
                  onChangePrice(formatBrlPrice(next));
                }}
                className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0 border border-white/10"
                title="Diminuir R$ 5,00"
              >
                <Minus className="w-3 h-3" />
              </button>

              <BrlCurrencyInput
                value={pack.price || ''}
                onChange={(val) => onChangePrice(val)}
                onBlur={() => onBlurPrice?.()}
                placeholder="39,90"
              />

              <button
                type="button"
                onClick={() => {
                  const curr = parseBrlPrice(pack.price);
                  const next = curr + 5;
                  onChangePrice(formatBrlPrice(next));
                }}
                className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0 border border-white/10"
                title="Aumentar R$ 5,00"
              >
                <Plus className="w-3 h-3" />
              </button>
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
              className="w-full px-3 py-2 rounded-lg bg-[#0e0f14] border border-white/10 font-mono text-xs text-zinc-300 outline-none focus:border-[#843C52]"
              placeholder="Ex: LANÇAMENTO, EXCLUSIVO, VIP"
            />
          </div>
        </div>

        {/* Card da Imagem de Capa Principal */}
        <div
          className={`p-4 sm:p-5 rounded-xl bg-[#14151c] border shadow-sm space-y-3 transition-colors ${
            validationErrors?.imageUrl
              ? 'border-rose-500/80 bg-rose-500/[0.03]'
              : 'border-white/[0.07]'
          }`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <div>
              <span className="text-xs font-semibold text-white">Foto de Capa *</span>
              {validationErrors?.imageUrl && (
                <span className="text-[11px] text-rose-400 font-medium block mt-0.5">
                  {validationErrors.imageUrl}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onOpenCoverPicker}
              className="text-[11px] text-[#843C52] hover:text-[#992b4a] font-medium cursor-pointer"
            >
              Escolher foto
            </button>
          </div>

          <div
            onClick={onOpenCoverPicker}
            className={`relative aspect-[3/4] rounded-xl overflow-hidden bg-[#101116] border flex items-center justify-center cursor-pointer transition ${
              validationErrors?.imageUrl
                ? 'border-rose-500/60 hover:border-rose-400'
                : 'border-white/10 hover:border-[#843C52]/40'
            }`}
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
                <Camera
                  className={`w-8 h-8 mx-auto mb-2 ${
                    validationErrors?.imageUrl ? 'text-rose-400' : 'text-[#843C52] opacity-60'
                  }`}
                />
                <span className="text-xs text-zinc-300 font-medium block">
                  Escolher Foto de Capa
                </span>
                <span
                  className={`text-[11px] block mt-0.5 ${
                    validationErrors?.imageUrl ? 'text-rose-400 font-medium' : 'text-zinc-500'
                  }`}
                >
                  {validationErrors?.imageUrl || 'Escolha do acervo ou envie uma foto nova'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
