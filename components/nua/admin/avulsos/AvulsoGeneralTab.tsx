/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import { AvulsoProductItem } from '@/lib/types';
import { formatBrlPrice, parseBrlPrice } from '@/lib/formatters';
import { BrlCurrencyInput } from '../ui/BrlCurrencyInput';

interface AvulsoGeneralTabProps {
  data: AvulsoProductItem;
  onUpdate: (fields: Partial<AvulsoProductItem>) => void;
  getPublicPackUrl: (slug: string) => string;
}

export function AvulsoGeneralTab({
  data,
  onUpdate,
  getPublicPackUrl,
}: AvulsoGeneralTabProps) {
  return (
    <div className="space-y-5">
      {/* Modalidade */}
      <div className="space-y-1.5">
        <label className="block text-zinc-400 text-[10px] font-semibold uppercase tracking-wider">
          Modalidade de Conteúdo
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onUpdate({ modality: 'pack' })}
            className="p-3 rounded-xl border text-left transition cursor-pointer bg-[#843C52]/10 border-[#843C52]"
          >
            <span className="text-xs font-semibold block text-[#843C52]">
              Pack / Coleção (Múltiplas Fotos &amp; Vídeos)
            </span>
            <span className="text-[10px] text-zinc-400 block mt-0.5 font-light">
              Coletânea completa com fotos em alta definição e vídeos
            </span>
          </button>

          <div
            className="p-3 rounded-xl border border-white/5 bg-zinc-950/60 opacity-50 cursor-not-allowed select-none text-left"
            title="A criação de conteúdos avulsos de mídia única está desabilitada temporariamente."
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs font-semibold block text-zinc-500 line-through">
                Conteúdo Avulso (Foto Única)
              </span>
              <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                Desativado
              </span>
            </div>
            <span className="text-[10px] text-zinc-600 block mt-0.5 font-light">
              Recurso suspenso temporariamente nesta versão.
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-zinc-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
            Título da Obra / Pack
          </label>
          <input
            type="text"
            value={data.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Ex: Ensaio I — Luz Natural & Silhueta"
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none focus:border-[#843C52]"
          />
        </div>

        <div>
          <label className="block text-zinc-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
            Preço de Compra Única (R$)
          </label>
          <BrlCurrencyInput
            value={data.price}
            onChange={(formatted, numeric) => {
              onUpdate({ price: formatted, numericPrice: numeric });
            }}
            onBlur={(formatted, numeric) => {
              onUpdate({ price: formatted, numericPrice: numeric });
            }}
            placeholder="29,90"
            className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-900/80 border border-[#843C52]/40 rounded-xl text-white font-mono text-sm font-semibold outline-none focus:border-[#843C52]"
          />
        </div>

        <div>
          <label className="block text-zinc-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
            Selo de Destaque (Badge)
          </label>
          <input
            type="text"
            value={data.badge || ''}
            onChange={(e) => onUpdate({ badge: e.target.value })}
            placeholder="Ex: TOP 1 DO MÊS, LANÇAMENTO, EXCLUSIVO"
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none focus:border-[#843C52]"
          />
        </div>

        <div>
          <label className="block text-zinc-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
            Duração / Resumo nos Cards
          </label>
          <input
            type="text"
            value={data.duration || ''}
            onChange={(e) => onUpdate({ duration: e.target.value })}
            placeholder="Ex: 35 Fotos 4K • 1 Vídeo Making Of"
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none focus:border-[#843C52]"
          />
        </div>

        <div>
          <label className="block text-zinc-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
            Texto do Botão de Compra
          </label>
          <input
            type="text"
            value={data.buttonText || ''}
            onChange={(e) => onUpdate({ buttonText: e.target.value })}
            placeholder="Ex: ADQUIRIR ACESSO IMEDIATO"
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none focus:border-[#843C52]"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-zinc-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
            Slug / Link Amigável da Página
          </label>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-mono text-xs">/avulsos/</span>
            <input
              type="text"
              value={data.slug || ''}
              onChange={(e) => {
                const val = e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '').replace(/^\/+/, '');
                onUpdate({
                  slug: val,
                  checkoutUrl: `/avulsos/${val}`,
                });
              }}
              placeholder="meu-ensaio-exclusivo"
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2 text-white text-xs font-mono outline-none focus:border-[#843C52]"
            />
          </div>
          <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
            Link público: {getPublicPackUrl(data.slug || 'slug-do-pack')}
          </span>
        </div>
      </div>

      {/* Sinopse e Descrição */}
      <div className="space-y-4 pt-3 border-t border-zinc-800/80">
        <div>
          <label className="block text-zinc-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
            Sinopse Curta (Exibida nos cards da vitrine)
          </label>
          <textarea
            rows={2}
            value={data.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Resumo provocante e direto que aparece no card do catálogo..."
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none focus:border-[#843C52] resize-none"
          />
        </div>

        <div>
          <label className="block text-zinc-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
            Apresentação Completa do Ensaio (Página do Produto & Notas Curatoriais)
          </label>
          <textarea
            rows={4}
            value={data.longDescription || ''}
            onChange={(e) => onUpdate({ longDescription: e.target.value })}
            placeholder="Texto envolvente e poético que contextualiza a atmosfera, iluminação e conceito autoral..."
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none focus:border-[#843C52] resize-none leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}
