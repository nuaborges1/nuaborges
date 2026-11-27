'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { ContainmentProtocol } from '@/functions/api/_central/containment';
import { KONOHA_ASSETS, SEMANTIC_STATUS_STYLES } from '@/lib/phdev/konohagakure/protocols';
import type {
  OperationalBannerViewModel,
  PhdevNavSectionId,
  ProtocolPageId,
} from '@/lib/phdev/konohagakure/types';

interface KonohaOperationalBannerProps {
  banner: OperationalBannerViewModel;
  onNavigate?: (
    section: PhdevNavSectionId,
    protocol?: ContainmentProtocol,
    protocolPageId?: ProtocolPageId,
  ) => void;
}

/**
 * Painel hero de estado operacional derivado exclusivamente de `/api/control/system`.
 * Metadados organizados em grid estruturado (zero texto corrido quebrado ou botão solto).
 */
export function KonohaOperationalBanner({ banner, onNavigate }: KonohaOperationalBannerProps) {
  const isPain = banner.kind === 'pain';
  const isPeace = banner.kind === 'peace';
  const isContainment = banner.kind === 'containment';
  const isRecovery = banner.kind === 'recovery';
  const semantic = SEMANTIC_STATUS_STYLES[banner.tone];

  const containerStyle = isPain
    ? 'border-[#e03e4b]/70 bg-[#17060b]/94 shadow-[0_0_40px_-10px_rgba(220,38,38,0.58)]'
    : isPeace
      ? 'border-emerald-400/24 bg-[#0b1017]/90 shadow-[0_14px_34px_-18px_rgba(0,0,0,0.88)]'
      : isContainment
        ? 'border-orange-400/45 bg-[#160f0d]/92'
        : isRecovery
          ? 'border-amber-400/40 bg-[#14100c]/92'
          : 'border-white/[0.12] bg-[#0c1018]/90 shadow-[0_14px_34px_-18px_rgba(0,0,0,0.88)]';

  const emblemSrc = isPain
    ? KONOHA_ASSETS.icons.akatsukiCloud
    : isPeace
      ? KONOHA_ASSETS.icons.konohaEmblem
      : isContainment
        ? '/phdev/konohagakure/icons/mangekyou-itachi.svg'
        : isRecovery
          ? '/phdev/konohagakure/icons/uzumaki.svg'
          : KONOHA_ASSETS.icons.byakugan;

  const gridColsClass =
    banner.details.length <= 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : banner.details.length <= 4
        ? 'grid-cols-2 lg:grid-cols-4'
        : 'grid-cols-2 sm:grid-cols-3';

  return (
    <section
      aria-label="Estado operacional da infraestrutura"
      data-testid="phdev-operational-banner"
      data-banner-kind={banner.kind}
      className={`phdev-panel-enter relative overflow-hidden rounded-2xl border backdrop-blur-md transition-colors ${containerStyle}`}
    >
      {isPain && (
        <div
          aria-hidden="true"
          className="phdev-pain-pulse pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            boxShadow: 'inset 0 0 0 1px rgba(248,113,113,0.48), inset 0 0 42px -12px rgba(220,38,38,0.45)',
          }}
        />
      )}

      {/* Arte temática enquadrada à direita */}
      {isPain ? (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-[260px] sm:w-[380px] max-w-[46%] bg-no-repeat bg-cover opacity-90"
            style={{
              backgroundImage: `url('${KONOHA_ASSETS.banners.pain}')`,
              backgroundPosition: 'right 22%',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, rgba(23,6,11,0.99) 0%, rgba(26,7,13,0.95) 54%, rgba(26,7,13,0.36) 78%, rgba(16,5,9,0.08) 100%)',
            }}
          />
        </>
      ) : (
        <>
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 right-0 w-full sm:w-[54%] bg-cover bg-center ${
              isPeace ? 'opacity-72' : 'opacity-50'
            }`}
            style={{
              backgroundImage: `url('${KONOHA_ASSETS.banners.peace}')`,
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: isPeace
                ? 'linear-gradient(90deg, rgba(11,16,23,0.99) 0%, rgba(11,16,23,0.93) 50%, rgba(11,16,23,0.32) 78%, rgba(11,16,23,0.10) 100%)'
                : 'linear-gradient(90deg, rgba(12,16,24,0.99) 0%, rgba(12,16,24,0.94) 52%, rgba(12,16,24,0.42) 78%, rgba(12,16,24,0.16) 100%)',
            }}
          />
        </>
      )}

      <div className="relative z-10 px-5 py-4 sm:px-6 sm:py-5 pr-5 sm:pr-44 lg:pr-[34%]">
        <div className="flex items-start gap-4">
          <div className="shrink-0 mt-0.5">
            {isPain ? (
              <div className="w-14 h-11 flex items-center justify-center drop-shadow-[0_0_18px_rgba(239,68,68,0.65)]">
                <img src={emblemSrc} alt="" aria-hidden="true" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-11 h-11 rounded-xl border border-white/[0.12] bg-black/55 backdrop-blur-sm flex items-center justify-center shadow-[0_0_18px_-6px_rgba(225,59,71,0.38)]">
                <img
                  src={emblemSrc}
                  alt=""
                  aria-hidden="true"
                  className={`w-6 h-6 object-contain ${isContainment ? 'phdev-dojutsu-spin' : ''}`}
                />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            {/* Cabeçalho do banner com badge + CTA perfeitamente alinhados */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 h-5 rounded-full border px-2 text-[10px] font-mono font-semibold uppercase tracking-wider ${semantic.badge}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${semantic.dot}`} aria-hidden="true" />
                    {semantic.labelPrefix}
                  </span>
                  {isPain && (
                    <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-red-300/90">
                      Contenção crítica ativa
                    </span>
                  )}
                </div>

                <h2
                  className={`font-sans font-semibold tracking-tight leading-snug ${
                    isPain ? 'text-lg sm:text-[21px] text-white' : 'text-base sm:text-[19px] text-white'
                  }`}
                >
                  {banner.headline}
                </h2>

                <p className="text-xs text-zinc-300/90 max-w-2xl leading-relaxed">
                  {banner.technicalSummary}
                </p>
              </div>

              {banner.recommendedAction && onNavigate && (
                <button
                  type="button"
                  onClick={() =>
                    onNavigate(
                      banner.recommendedAction!.section,
                      banner.recommendedAction!.protocol,
                      banner.recommendedAction!.protocolPageId,
                    )
                  }
                  className={`inline-flex items-center gap-1.5 h-8 rounded-xl px-3.5 text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                    isPain
                      ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/70'
                      : 'bg-white/[0.10] hover:bg-white/[0.18] text-white border border-white/[0.16]'
                  }`}
                >
                  <span>{banner.recommendedAction.label}</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Grid estruturado de informações do estado (alinhado e sem truncamento feio) */}
            {banner.details.length > 0 && (
              <dl className={`grid ${gridColsClass} gap-2`}>
                {banner.details.map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-xl border px-3 py-2 ${
                      isPain
                        ? 'border-red-400/18 bg-black/42'
                        : 'border-white/[0.07] bg-black/38'
                    }`}
                  >
                    <dt className="font-mono uppercase tracking-[0.12em] text-[9.5px] text-zinc-400 leading-tight">
                      {item.label}
                    </dt>
                    <dd
                      className="text-[11.5px] font-medium text-zinc-100 mt-0.5 leading-snug break-words"
                      title={item.value}
                    >
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
