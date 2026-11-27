'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { KONOHA_ASSETS, SEMANTIC_STATUS_STYLES } from '@/lib/phdev/konohagakure/protocols';
import { formatBrTimestamp } from '@/lib/phdev/konohagakure/verbalIdentity';
import type { ProtocolAtmosphereVariant, SemanticStatusTone } from '@/lib/phdev/konohagakure/types';

interface ProtocolHeroBannerProps {
  code: string;
  title: string;
  subtitle: string;
  missionStatement: string;
  japaneseMark: string;
  artwork: string;
  heroArtPosition: string;
  icon: string;
  accentHex: string;
  accentSoftRgba: string;
  accentBorderRgba: string;
  atmosphere: ProtocolAtmosphereVariant;
  isDojutsu?: boolean;
  usesEmbers?: boolean;
  statusTone: SemanticStatusTone;
  statusLabel: string;
  verbalCue?: string;
  specialMode?: { name: string; label: string; active: boolean; hint?: string };
  lastCheckedAt: string | null;
  loading: boolean;
  onRefresh: () => void;
}

/**
 * Hero cinematográfico exclusivo para cada página personalizada (P01–P09 e HAGOROMO),
 * com hierarquia limpa, chips alinhados e animações assinatura GPU-only.
 */
export function ProtocolHeroBanner({
  code,
  title,
  subtitle,
  missionStatement,
  japaneseMark,
  artwork,
  heroArtPosition,
  icon,
  accentHex,
  accentSoftRgba,
  accentBorderRgba,
  atmosphere,
  isDojutsu = false,
  usesEmbers = false,
  statusTone,
  statusLabel,
  verbalCue,
  specialMode,
  lastCheckedAt,
  loading,
  onRefresh,
}: ProtocolHeroBannerProps) {
  const semantic = SEMANTIC_STATUS_STYLES[statusTone];
  const isSixPaths = atmosphere === 'sixpaths';
  const isByakugan = atmosphere === 'byakugan';
  const isBaryon = atmosphere === 'baryon';
  const isHiraishin = atmosphere === 'hiraishin';
  const isLightning = atmosphere === 'lightning';
  const isDimensional = atmosphere === 'dimensional' || atmosphere === 'rinnegan';

  return (
    <section
      aria-label={`Cabeçalho do ${title}`}
      data-testid="phdev-protocol-hero"
      className="relative overflow-hidden rounded-2xl border bg-[#0b0d15]/94 backdrop-blur-md shadow-[0_18px_42px_-20px_rgba(0,0,0,0.92)]"
      style={{ borderColor: accentBorderRgba }}
    >
      {/* Arte wide do shinobi à direita */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-full sm:w-[58%] bg-cover bg-no-repeat opacity-92"
        style={{
          backgroundImage: `url('${artwork}')`,
          backgroundPosition: heroArtPosition,
        }}
      />

      {/* Máscara cinematográfica preservando texto 100% legível à esquerda */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(10,12,19,0.99) 0%, rgba(10,12,19,0.96) 48%, rgba(10,12,19,0.44) 74%, rgba(10,12,19,0.06) 100%)',
        }}
      />

      {/* Halo atmosférico assinatura */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -top-16 -left-10 w-[380px] h-[260px] rounded-full blur-3xl ${
          isLightning ? 'phdev-lightning-spark' : 'phdev-hero-aura'
        }`}
        style={{
          background: `radial-gradient(circle, ${accentHex}44 0%, transparent 70%)`,
        }}
      />

      {isHiraishin && (
        <div
          aria-hidden="true"
          className="phdev-hiraishin-flash pointer-events-none absolute inset-y-0 left-0 w-36"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(229,190,98,0.28) 50%, transparent 100%)',
          }}
        />
      )}

      {usesEmbers && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 bg-cover bg-center ${
            isBaryon ? 'opacity-42 phdev-baryon-pulse' : 'opacity-30 phdev-hero-aura'
          }`}
          style={{ backgroundImage: `url('${KONOHA_ASSETS.effects.embers}')` }}
        />
      )}

      {/* Kanji em marca d'água sutil */}
      <span
        aria-hidden="true"
        className="pointer-events-none select-none hidden md:block absolute left-[46%] top-1/2 -translate-y-1/2 font-serif text-[118px] leading-none font-bold opacity-[0.055]"
        style={{ color: accentHex }}
      >
        {japaneseMark}
      </span>

      <div className="relative z-10 px-5 py-5 sm:px-7 sm:py-6 pr-5 sm:pr-48 lg:pr-[38%]">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0 mt-0.5">
            {isByakugan && (
              <>
                <span
                  aria-hidden="true"
                  className="phdev-byakugan-wave pointer-events-none absolute inset-0 rounded-full border border-[#ddd6fe]/60"
                />
                <span
                  aria-hidden="true"
                  className="phdev-byakugan-wave pointer-events-none absolute inset-0 rounded-full border border-[#ddd6fe]/40"
                  style={{ animationDelay: '-1.4s' }}
                />
              </>
            )}
            {isDimensional && (
              <span
                aria-hidden="true"
                className="phdev-dimensional-ring pointer-events-none absolute -inset-1.5 rounded-2xl border border-dashed opacity-55"
                style={{ borderColor: accentHex }}
              />
            )}
            <div
              className="phdev-emblem-pulse relative w-14 h-14 rounded-2xl border bg-black/74 backdrop-blur-sm flex items-center justify-center"
              style={{
                borderColor: accentBorderRgba,
                boxShadow: `0 0 28px -5px ${accentHex}`,
              }}
            >
              <img
                src={icon}
                alt=""
                aria-hidden="true"
                className={`w-8 h-8 object-contain ${
                  isSixPaths
                    ? 'phdev-sixpaths-orbit'
                    : isDojutsu && (specialMode?.active || (isByakugan && loading))
                      ? 'phdev-dojutsu-spin'
                      : ''
                }`}
              />
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center h-5 rounded-md border px-2 text-[10px] font-mono font-bold uppercase tracking-[0.16em]"
                style={{
                  borderColor: accentBorderRgba,
                  backgroundColor: accentSoftRgba,
                  color: accentHex,
                }}
              >
                {code} · {japaneseMark}
              </span>

              <span
                className={`inline-flex items-center gap-1.5 h-5 rounded-full border px-2.5 text-[10px] font-mono font-medium ${semantic.badge}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${semantic.dot}`} aria-hidden="true" />
                <span>{statusLabel}</span>
              </span>

              {specialMode && (
                <span
                  title={specialMode.hint || specialMode.label}
                  className={`inline-flex items-center h-5 rounded-full border px-2.5 text-[9.5px] font-mono uppercase tracking-wider ${
                    specialMode.active
                      ? 'border-amber-400/55 bg-amber-500/20 text-amber-100'
                      : 'border-white/14 bg-black/55 text-zinc-400'
                  }`}
                >
                  {specialMode.name}
                  {specialMode.active ? ' · ATIVO' : ' · EM PRONTIDÃO'}
                </span>
              )}
            </div>

            <div>
              <h2 className="font-sans text-xl sm:text-2xl font-semibold text-white tracking-tight leading-tight">
                {title}
              </h2>
              <p className="text-xs font-medium mt-0.5" style={{ color: accentHex }}>
                {subtitle}
              </p>
            </div>

            <p className="text-xs sm:text-[12.5px] text-zinc-300/90 leading-relaxed max-w-xl">
              {missionStatement}
            </p>

            {/* Barra de chips limpa sem linha divisória solta */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {verbalCue && (
                <span
                  className="inline-flex items-center gap-2 h-7 rounded-lg border border-white/[0.10] bg-black/48 px-3 text-[11.5px] font-medium text-white"
                  data-testid="phdev-protocol-verbal-cue"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: accentHex }}
                    aria-hidden="true"
                  />
                  <span>“{verbalCue}”</span>
                </span>
              )}

              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                className="inline-flex items-center gap-1.5 h-7 rounded-lg border border-white/14 bg-black/52 hover:bg-white/[0.12] px-3 text-[11px] font-medium text-zinc-200 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                <span>
                  {loading
                    ? 'Verificando…'
                    : lastCheckedAt
                      ? `Atualizar · ${formatBrTimestamp(lastCheckedAt)}`
                      : 'Atualizar telemetria'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
