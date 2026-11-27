'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { KONOHA_ASSETS, SEMANTIC_STATUS_STYLES } from '@/lib/phdev/konohagakure/protocols';
import type { ProtocolRuntimeState, ProtocolVisualIdentity } from '@/lib/phdev/konohagakure/types';

interface ProtocolCardProps {
  protocol: ProtocolVisualIdentity;
  runtime: ProtocolRuntimeState;
  activityCount?: number;
  onOpen: (protocol: ProtocolVisualIdentity) => void;
  index?: number;
}

/**
 * Card horizontal compacto e perfeitamente uniforme (`h-[126px]`) dos 9 protocolos oficiais.
 * - Enquadramento individual por personagem (`protocol.artPosition`).
 * - Conteúdo à esquerda (`max-w-[66%]`) para jamais encostar nos rostos.
 * - Microinterações de anime: pulso de chakra no medalhão, despertar Dōjutsu e feixe diagonal no hover.
 */
export function ProtocolCard({
  protocol,
  runtime,
  activityCount = 0,
  onOpen,
  index = 0,
}: ProtocolCardProps) {
  const semantic = SEMANTIC_STATUS_STYLES[runtime.tone];
  const isBaryonCard = protocol.id === 'naruto';
  const summaryLine = runtime.verbalCue ? runtime.verbalCue : runtime.detail;

  return (
    <button
      type="button"
      onClick={() => onOpen(protocol)}
      data-testid={`phdev-protocol-card-${protocol.id}`}
      title={`${protocol.code} — Protocolo ${protocol.name}: abrir página dedicada`}
      className="phdev-panel-enter group relative flex flex-col justify-between overflow-hidden rounded-xl border border-white/[0.10] bg-[#0b0d14]/92 backdrop-blur-sm text-left h-[126px] px-4 py-3.5 transition-all duration-250 hover:-translate-y-0.5 hover:border-white/[0.26] focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer shadow-[0_12px_28px_-16px_rgba(0,0,0,0.92)]"
      style={{
        animationDelay: `${75 + index * 32}ms`,
        ['--proto-accent' as string]: protocol.accentHex,
        ['--proto-border' as string]: protocol.accentBorderRgba,
        ['--proto-soft' as string]: protocol.accentSoftRgba,
      }}
    >
      {/* Arte horizontal do personagem posicionada sob medida à direita */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-cover bg-no-repeat transition-transform duration-450 ease-out group-hover:scale-[1.05] group-hover:translate-x-1"
        style={{
          backgroundImage: `url('${protocol.artwork}')`,
          backgroundPosition: protocol.artPosition,
        }}
      />

      {/* Máscara de contraste calibrada: esquerda legível, rosto direito livre e nítido */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(10,12,18,0.98) 0%, rgba(10,12,18,0.94) 46%, rgba(10,12,18,0.40) 68%, rgba(10,12,18,0.03) 100%)',
        }}
      />

      {/* Aura e borda interna da identidade do personagem no hover */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at 14% 24%, ${protocol.accentSoftRgba} 0%, transparent 58%)`,
          boxShadow: `inset 0 0 0 1px ${protocol.accentBorderRgba}`,
        }}
      />

      {/* Feixe diagonal de chakra no hover */}
      <div
        aria-hidden="true"
        className="phdev-chakra-sweep pointer-events-none absolute inset-y-0 left-0 w-28 opacity-0"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${protocol.accentSoftRgba} 50%, transparent 100%)`,
        }}
      />

      {/* Brasas vivas e aura Bárion seletiva em ITACHI e NARUTO */}
      {protocol.usesEmbers && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 bg-cover bg-center transition-opacity duration-300 ${
            runtime.specialModeActive || (isBaryonCard && runtime.tone === 'recovery')
              ? 'opacity-54 phdev-baryon-pulse'
              : isBaryonCard
                ? 'opacity-26 group-hover:opacity-50 phdev-baryon-pulse'
                : 'opacity-10 group-hover:opacity-40'
          }`}
          style={{ backgroundImage: `url('${KONOHA_ASSETS.effects.embers}')` }}
        />
      )}

      {/* Topo: medalhão + nome + código + responsabilidade */}
      <div className="relative z-10 flex items-center gap-3 max-w-[66%]">
        <div
          className="phdev-emblem-pulse w-9 h-9 rounded-full border bg-black/70 backdrop-blur-sm flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-108"
          style={{
            borderColor: protocol.accentBorderRgba,
            boxShadow: `0 0 18px -3px ${protocol.accentHex}`,
          }}
        >
          <img
            src={protocol.icon}
            alt=""
            aria-hidden="true"
            className={`w-5 h-5 object-contain ${
              protocol.isDojutsu
                ? runtime.specialModeActive
                  ? 'phdev-dojutsu-spin'
                  : 'phdev-dojutsu-hover'
                : ''
            }`}
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-sans text-[13.5px] font-semibold text-white tracking-tight leading-tight truncate">
              Protocolo {protocol.name}
            </h3>
            <span
              className="text-[9.5px] font-mono font-semibold uppercase tracking-wider shrink-0 opacity-90"
              style={{ color: protocol.accentHex }}
            >
              {protocol.code}
            </span>
            {activityCount > 0 && (
              <span
                className="inline-flex items-center h-4 rounded-full border border-white/14 bg-black/65 px-1.5 text-[9px] font-mono text-zinc-200 shrink-0"
                title={`${activityCount} evento(s) registrados neste protocolo`}
              >
                {activityCount}
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400 leading-tight truncate mt-0.5">
            {protocol.responsibility}
          </p>
        </div>
      </div>

      {/* Base: resumo curto (apenas quando há frase verbal/alerta) + status limpo + seta */}
      <div className="relative z-10 flex items-end justify-between gap-2">
        <div className="min-w-0 max-w-[78%] space-y-1.5">
          {runtime.verbalCue && (
            <p className="text-[10.5px] text-zinc-300/88 truncate leading-tight">
              {summaryLine}
            </p>
          )}

          <div className="flex items-center gap-1.5 overflow-hidden">
            <span
              className={`inline-flex items-center gap-1.5 h-5 rounded-full border px-2 text-[10px] font-mono font-medium whitespace-nowrap shrink-0 ${semantic.badge}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${semantic.dot}`} aria-hidden="true" />
              <span>{runtime.statusLabel}</span>
            </span>

            {protocol.specialMode && runtime.specialModeActive && (
              <span
                className="inline-flex items-center h-5 rounded-full border border-amber-400/55 bg-amber-500/22 px-2 text-[9px] font-mono uppercase tracking-wider text-amber-100 whitespace-nowrap truncate"
                title={runtime.specialModeHint || protocol.specialMode.label}
              >
                {protocol.specialMode.name} · ATIVO
              </span>
            )}
          </div>
        </div>

        <span
          aria-hidden="true"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/18 bg-black/74 text-zinc-300 group-hover:text-white group-hover:border-white/42 group-hover:translate-x-0.5 transition-all"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </button>
  );
}
