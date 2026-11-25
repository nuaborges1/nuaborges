/* Vinho maduro / Nua Borges */
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  RotateCcw,
  AlertCircle,
  ImageIcon,
  Trash2,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SiteContent } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';

interface HeroTextFormProps {
  hero: SiteContent['hero'];
  onUpdateHero: (
    updater:
      | Partial<SiteContent['hero']>
      | ((prev: SiteContent['hero']) => Partial<SiteContent['hero']>)
  ) => void;
  onOpenResetConfirm: () => void;
  onOpenLogoPicker: () => void;
}

const HERO_CTA_DESTINATIONS = [
  { label: 'Acervo VIP', url: '/acervo' },
  { label: 'Packs Avulsos', url: '/avulsos' },
  { label: 'Personalizados', url: '/personalizados' },
  { label: 'Chamadas VIP', url: '/chamadas' },
  { label: 'Sobre Mim', url: '/sobre' },
];

export function HeroTextForm({
  hero,
  onUpdateHero,
  onOpenResetConfirm,
  onOpenLogoPicker,
}: HeroTextFormProps) {
  const [showDisplayOptions, setShowDisplayOptions] = useState(false);

  return (
    <div id="admin-hero-section" className="rounded-2xl bg-[#14161d] border border-white/[0.06] p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-white/[0.06]">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#c8647d] block mb-0.5">
            Passo 2
          </span>
          <h3 className="text-sm font-semibold text-white tracking-wide">
            Textos e Botão da Capa Principal
          </h3>
          <p className="text-zinc-400 text-xs font-light mt-0.5">
            O que a pessoa lê assim que entra no seu site.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenResetConfirm}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#0e1015] hover:bg-white/[0.06] text-zinc-300 hover:text-white border border-white/[0.08] text-xs font-medium transition cursor-pointer"
            title="Voltar para os textos originais da capa"
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
            <span>Voltar ao original</span>
          </button>
        </div>
      </div>

      {/* Bloco 1: Textos de Boas-Vindas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div data-field="hero.eyebrow">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-zinc-200 block">
              Frase pequena acima do seu nome
            </label>
            {!hero.eyebrow?.trim() && (
              <span className="text-amber-400 text-[10px] flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Preencha este campo
              </span>
            )}
          </div>
          <input
            type="text"
            value={hero.eyebrow}
            onChange={(e) => onUpdateHero({ eyebrow: e.target.value })}
            placeholder="Ex: PLATAFORMA OFICIAL"
            className="w-full h-9 bg-[#0e0f14] border border-white/10 focus:border-[#843C52] rounded-xl px-3 text-xs text-white placeholder:text-zinc-600 outline-none transition"
          />
        </div>

        <div data-field="hero.title">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-zinc-200 block">
              Seu Nome na Capa
            </label>
            {!hero.title?.trim() && (
              <span className="text-rose-400 text-[10px] flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Preencha este campo
              </span>
            )}
          </div>
          <input
            type="text"
            value={hero.title}
            onChange={(e) => onUpdateHero({ title: e.target.value })}
            placeholder="Ex: Nua Borges"
            className="w-full h-9 bg-[#0e0f14] border border-white/10 focus:border-[#843C52] rounded-xl px-3 text-xs text-white placeholder:text-zinc-600 outline-none transition"
          />
        </div>

        <div data-field="hero.tagline" className="md:col-span-2">
          <label className="text-xs font-medium text-zinc-200 block mb-1.5">
            Frase de Impacto (aparece entre aspas)
          </label>
          <input
            type="text"
            value={hero.tagline}
            onChange={(e) => onUpdateHero({ tagline: e.target.value })}
            placeholder="Ex: Onde o corpo é arte e o prazer é livre de culpas."
            className="w-full h-9 bg-[#0e0f14] border border-white/10 focus:border-[#843C52] rounded-xl px-3 text-xs text-white placeholder:text-zinc-600 outline-none transition"
          />
        </div>

        <div data-field="hero.description" className="md:col-span-2">
          <label className="text-xs font-medium text-zinc-200 block mb-1.5">
            Texto curto de apresentação abaixo da frase
          </label>
          <textarea
            rows={2}
            value={hero.description || ''}
            onChange={(e) => onUpdateHero({ description: e.target.value })}
            placeholder="Descreva seu trabalho em uma ou duas frases..."
            className="w-full bg-[#0e0f14] border border-white/10 focus:border-[#843C52] rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 outline-none resize-none leading-relaxed transition"
          />
        </div>
      </div>

      {/* Bloco 2: Botão Principal da Capa */}
      <div className="p-4 rounded-xl bg-[#0e1015] border border-white/[0.06] space-y-3.5">
        <h4 className="text-xs font-semibold text-white">
          Botão Principal da Capa
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div data-field="hero.ctaText">
            <label className="text-xs font-medium text-zinc-300 block mb-1.5">
              O que está escrito no botão
            </label>
            <input
              type="text"
              value={hero.ctaText}
              onChange={(e) => onUpdateHero({ ctaText: e.target.value })}
              placeholder="Ex: Acessar Acervo Exclusivo"
              className="w-full h-9 bg-[#14161d] border border-white/10 focus:border-[#843C52] rounded-xl px-3 text-xs text-white outline-none transition"
            />
          </div>

          <div data-field="hero.ctaUrl">
            <label className="text-xs font-medium text-zinc-300 block mb-1.5">
              Para qual página o botão leva
            </label>
            <div className="flex flex-wrap gap-1.5">
              {HERO_CTA_DESTINATIONS.map((p) => (
                <button
                  key={p.url}
                  type="button"
                  onClick={() => onUpdateHero({ ctaUrl: p.url })}
                  className={`px-2.5 py-1.5 rounded-lg text-xs border transition cursor-pointer ${
                    hero.ctaUrl === p.url
                      ? 'bg-[#843C52]/25 border-[#843C52] text-white font-medium'
                      : 'bg-[#14161d] border-white/[0.08] text-zinc-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-white/[0.06]">
          <label className="text-xs font-medium text-zinc-300 block mb-1.5">
            Frase convidando a descer a página
          </label>
          <input
            type="text"
            value={hero.exploreText ?? 'EXPLORE O MUNDO DA NUA ♥️'}
            onChange={(e) => onUpdateHero({ exploreText: e.target.value })}
            placeholder="Ex: EXPLORE O MUNDO DA NUA ♥️"
            className="w-full h-9 bg-[#14161d] border border-white/10 focus:border-[#843C52] rounded-xl px-3 text-xs text-white outline-none transition"
          />
        </div>
      </div>

      {/* Opções Extras de Visual e Logo (Gaveta Recolhida) */}
      <div className="pt-2 border-t border-white/[0.06]">
        <button
          type="button"
          onClick={() => setShowDisplayOptions((prev) => !prev)}
          className="w-full flex items-center justify-between py-1.5 text-left text-xs text-zinc-300 hover:text-white transition cursor-pointer"
        >
          <span className="inline-flex items-center gap-2 font-medium">
            <Sliders className="w-3.5 h-3.5 text-[#843C52]" />
            <span>Formato da Capa e Imagem de Logo (Opcional)</span>
          </span>
          {showDisplayOptions ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </button>

        {showDisplayOptions && (
          <div className="mt-3 pt-3 border-t border-white/[0.05] space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="block text-xs font-medium text-white">
                  Foto de Fundo em Tela Cheia
                </span>
                <span className="text-zinc-400 text-[11px] font-light block mt-0.5">
                  A foto cobre toda a tela com o seu nome centralizado no meio.
                </span>
              </div>
              <input
                type="checkbox"
                checked={hero.cinematicCoverLayout !== false}
                onChange={() =>
                  onUpdateHero({
                    cinematicCoverLayout: hero.cinematicCoverLayout === false ? true : false,
                  })
                }
                className="accent-[#843C52] w-4 h-4 rounded cursor-pointer"
              />
            </div>

            <div className="pt-3 border-t border-white/[0.05] space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="block text-xs font-medium text-white">
                    Usar Imagem de Logo em vez do Nome Escrito
                  </span>
                  <span className="text-zinc-400 text-[11px] font-light block mt-0.5">
                    Mostra o arquivo da sua logo oficial no centro da capa.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(hero.useLogo)}
                  onChange={() => onUpdateHero({ useLogo: !hero.useLogo })}
                  className="accent-[#843C52] w-4 h-4 rounded cursor-pointer"
                />
              </div>

              {hero.useLogo && (
                <div className="bg-[#101116] border border-white/[0.06] rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center gap-3.5">
                  <div className="relative w-full sm:w-44 h-14 rounded-lg overflow-hidden bg-black/50 border border-white/10 flex items-center justify-center shrink-0">
                    {hero.logoUrl ? (
                      <Image
                        src={resolveMediaUrl(hero.logoUrl, 'thumb')}
                        alt="Sua logo"
                        fill
                        className="object-contain p-2"
                        sizes="180px"
                      />
                    ) : (
                      <span className="text-zinc-500 text-[11px] text-center px-3">
                        Logo padrão ativa
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={onOpenLogoPicker}
                      className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-[#843C52]" />
                      <span>Trocar Imagem da Logo</span>
                    </button>
                    {hero.logoUrl && (
                      <button
                        type="button"
                        onClick={() => onUpdateHero({ logoUrl: undefined, useLogo: false })}
                        className="h-8 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Usar Nome em Texto</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
