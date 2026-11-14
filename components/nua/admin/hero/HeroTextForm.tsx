'use client';

import React from 'react';
import Image from 'next/image';
import { RotateCcw, CheckCircle2, AlertCircle, Info, ImageIcon, Trash2 } from 'lucide-react';
import { SiteContent } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';

interface HeroTextFormProps {
  hero: SiteContent['hero'];
  onUpdateHero: (updater: Partial<SiteContent['hero']> | ((prev: SiteContent['hero']) => Partial<SiteContent['hero']>)) => void;
  onOpenResetConfirm: () => void;
  onOpenLogoPicker: () => void;
}

export function HeroTextForm({
  hero,
  onUpdateHero,
  onOpenResetConfirm,
  onOpenLogoPicker,
}: HeroTextFormProps) {
  return (
    <div className="rounded-xl bg-[#171821] border border-white/[0.06] p-4 sm:p-5 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[#f4a7b9] text-[10px] font-mono font-semibold tracking-wider uppercase">
              TELA DE ENTRADA
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
              <CheckCircle2 className="w-3 h-3" />
              Rascunho Ativo
            </span>
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-white tracking-wide">Capa do Site (Hero)</h3>
          <p className="text-zinc-400 text-xs font-light mt-0.5">
            Primeiro impacto visual ao carregar sua plataforma. Ajuste seu nome, frase de impacto, botão de ação e imagens.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenResetConfirm}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/10 text-xs font-medium transition cursor-pointer"
            title="Restaurar textos e fotos padrão da capa"
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
            <span>Restaurar Padrão Editorial</span>
          </button>
        </div>
      </div>

      {/* Dimension & Quality Guidance Alert */}
      <div className="p-3.5 rounded-lg bg-[#101116] border border-white/[0.06] text-xs text-zinc-400 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#f4a7b9] shrink-0 mt-0.5" />
        <div className="leading-relaxed text-[11px]">
          <span className="text-zinc-200 font-medium block mb-0.5">Dimensões & Formatos Recomendados para a Capa</span>
          <span>
            Dimensões ideais: <strong className="text-zinc-200">1920 × 1080 px</strong> (Paisagem/Desktop) ou <strong className="text-zinc-200">1080 × 1920 px</strong> (Retrato/Mobile). Formatos aceitos: WebP, JPG, PNG de até 15MB. Otimização automática sem perda visual.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-medium text-zinc-400 block">
              Texto de Destaque no Topo *
            </label>
            {!hero.eyebrow?.trim() && (
              <span className="text-amber-400 text-[10px] flex items-center gap-1 font-mono">
                <AlertCircle className="w-3 h-3" /> Obrigatório
              </span>
            )}
          </div>
          <input
            type="text"
            value={hero.eyebrow}
            onChange={(e) => onUpdateHero({ eyebrow: e.target.value })}
            placeholder="Ex: PLATAFORMA OFICIAL"
            className={`w-full bg-[#0e0f14] border rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none transition ${
              !hero.eyebrow?.trim()
                ? 'border-amber-500/60 focus:border-amber-400'
                : 'border-white/10 focus:border-[#f4a7b9]/60'
            }`}
          />
          <span className="text-zinc-500 text-[10px] block mt-1">Palavra ou frase curta acima do seu nome.</span>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-medium text-zinc-400 block">
              Seu Nome ou Título Principal *
            </label>
            {!hero.title?.trim() && (
              <span className="text-rose-400 text-[10px] flex items-center gap-1 font-mono">
                <AlertCircle className="w-3 h-3" /> Obrigatório
              </span>
            )}
          </div>
          <input
            type="text"
            value={hero.title}
            onChange={(e) => onUpdateHero({ title: e.target.value })}
            placeholder="Ex: Nua Borges"
            className={`w-full bg-[#0e0f14] border rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none transition ${
              !hero.title?.trim()
                ? 'border-rose-500/60 focus:border-rose-400'
                : 'border-white/10 focus:border-[#f4a7b9]/60'
            }`}
          />
          <span className="text-zinc-500 text-[10px] block mt-1">Aparece em destaque no centro da capa.</span>
        </div>

        <div className="md:col-span-2">
          <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">
            Frase de Boas-Vindas
          </label>
          <input
            type="text"
            value={hero.tagline}
            onChange={(e) => onUpdateHero({ tagline: e.target.value })}
            placeholder="Ex: Onde o corpo é arte e o prazer é livre de culpas."
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#f4a7b9]/60 transition"
          />
          <span className="text-zinc-500 text-[10px] block mt-1">Uma frase marcante que define você e seu trabalho.</span>
        </div>

        <div className="md:col-span-2">
          <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">
            Breve Apresentação
          </label>
          <textarea
            rows={2}
            value={hero.description}
            onChange={(e) => onUpdateHero({ description: e.target.value })}
            placeholder="Descreva seu trabalho e proposta em uma ou duas frases diretas..."
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#f4a7b9]/60 transition resize-none leading-relaxed"
          />
          <span className="text-zinc-500 text-[10px] block mt-1">Aparece logo abaixo da frase principal da capa.</span>
        </div>

        <div>
          <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">
            Texto do Botão Principal
          </label>
          <input
            type="text"
            value={hero.ctaText}
            onChange={(e) => onUpdateHero({ ctaText: e.target.value })}
            placeholder="Ex: Acessar Acervo Exclusivo"
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#f4a7b9]/60 transition"
          />
          <span className="text-zinc-500 text-[10px] block mt-1">Texto exibido dentro do botão de ação.</span>
        </div>

        <div>
          <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">
            Link do Botão Principal
          </label>
          <input
            type="text"
            value={hero.ctaUrl}
            onChange={(e) => onUpdateHero({ ctaUrl: e.target.value })}
            placeholder="/acervo"
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#f4a7b9]/60 transition"
          />
          <span className="text-zinc-500 text-[10px] block mt-1">Destino ao clicar no botão (ex: /acervo ou link externo).</span>
        </div>

        {/* Texto de Convite para o Rodapé */}
        <div className="md:col-span-2">
          <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">
            Texto de Convite do Rodapé da Capa (Scroll)
          </label>
          <input
            type="text"
            value={hero.exploreText ?? 'EXPLORE O MUNDO DA NUA ♥️'}
            onChange={(e) => onUpdateHero({ exploreText: e.target.value })}
            placeholder="Ex: EXPLORE O MUNDO DA NUA ♥️"
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#f4a7b9]/60 transition"
          />
          <span className="text-zinc-500 text-[10px] block mt-1">
            Frase acima da seta no final da capa convidando o visitante para a galeria.
          </span>
        </div>

        {/* Toggle: Capa em Tela Cheia */}
        <div className="md:col-span-2 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-4">
          <div>
            <span className="block text-xs font-medium text-white flex items-center gap-2">
              <span>Foto de Fundo em Tela Cheia</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#f4a7b9]/15 text-[#f4a7b9] border border-[#f4a7b9]/25">
                Recomendado
              </span>
            </span>
            <span className="text-zinc-400 text-[11px] font-light block mt-0.5 max-w-xl">
              A foto de fundo cobre toda a tela com o seu nome centralizado.
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              onUpdateHero({
                cinematicCoverLayout: hero.cinematicCoverLayout === false ? true : false,
              })
            }
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              hero.cinematicCoverLayout !== false ? 'bg-[#f4a7b9]' : 'bg-white/10'
            }`}
            aria-label="Alternar capa tela cheia"
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-zinc-950 shadow ring-0 transition duration-200 ease-in-out ${
                hero.cinematicCoverLayout !== false ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Toggle: Preenchimento Total da Foto */}
        <div className="md:col-span-2 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-4">
          <div>
            <span className="block text-xs font-medium text-white">
              Preencher Toda a Altura da Tela
            </span>
            <span className="text-zinc-400 text-[11px] font-light block mt-0.5 max-w-xl">
              Ajusta a foto lateral para preencher toda a altura quando a capa dividida estiver ativa.
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              onUpdateHero({
                fullVerticalPhoto: hero.fullVerticalPhoto === false ? true : false,
              })
            }
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              hero.fullVerticalPhoto !== false ? 'bg-[#f4a7b9]' : 'bg-white/10'
            }`}
            aria-label="Alternar foto inteira"
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-zinc-950 shadow ring-0 transition duration-200 ease-in-out ${
                hero.fullVerticalPhoto !== false ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Logo vs Texto */}
        <div className="md:col-span-2 pt-3 border-t border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="block text-xs font-medium text-white">
                Exibir Imagem de Logo no lugar do Nome em Texto
              </span>
              <span className="text-zinc-400 text-[11px] font-light block mt-0.5 max-w-xl">
                Quando ativado, exibe uma imagem com a sua logo oficial no lugar do nome digitado.
              </span>
            </div>
            <button
              type="button"
              onClick={() => onUpdateHero({ useLogo: !hero.useLogo })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                hero.useLogo ? 'bg-[#f4a7b9]' : 'bg-white/10'
              }`}
              aria-label="Alternar logo ou texto"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-zinc-950 shadow ring-0 transition duration-200 ease-in-out ${
                  hero.useLogo ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Preview + selecionar logo */}
          <div className="bg-[#101116] border border-white/[0.06] rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center gap-3.5">
            <div className="relative w-full sm:w-48 h-16 rounded-lg overflow-hidden bg-black/50 border border-white/10 flex items-center justify-center shrink-0">
              {hero.logoUrl ? (
                <Image
                  src={resolveMediaUrl(hero.logoUrl, 'thumb')}
                  alt="Prévia da logo"
                  fill
                  className="object-contain p-2"
                  sizes="192px"
                />
              ) : (
                <span className="text-zinc-500 text-[11px] text-center px-3">Nenhuma logo selecionada</span>
              )}
            </div>

            <div className="flex flex-col gap-2 w-full">
              <p className="text-zinc-400 text-[11px]">
                Recomendado: imagem com fundo transparente (formato PNG). Fica excelente em tons de branco ou rosê.
              </p>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={onOpenLogoPicker}
                  className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-[#f4a7b9]" />
                  <span>{hero.logoUrl ? 'Trocar Imagem' : 'Selecionar Imagem'}</span>
                </button>
                {hero.logoUrl && (
                  <button
                    type="button"
                    onClick={() => onUpdateHero({ logoUrl: undefined, useLogo: false })}
                    className="h-8 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
