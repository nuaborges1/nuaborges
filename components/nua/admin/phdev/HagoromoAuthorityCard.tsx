'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { ContainmentProtocol } from '@/functions/api/_central/containment';
import { HAGOROMO_AUTHORITY, SEMANTIC_STATUS_STYLES } from '@/lib/phdev/konohagakure/protocols';
import {
  KONOHA_VERBAL_MESSAGES,
  getActiveContainments,
} from '@/lib/phdev/konohagakure/verbalIdentity';
import type {
  PhdevNavSectionId,
  ProtocolPageId,
  SystemControlSnapshot,
} from '@/lib/phdev/konohagakure/types';

interface HagoromoAuthorityCardProps {
  snapshot: SystemControlSnapshot | null;
  onNavigate: (
    section: PhdevNavSectionId,
    protocol?: ContainmentProtocol,
    protocolPageId?: ProtocolPageId,
  ) => void;
}

/**
 * HAGOROMO — ROOT AUTHORITY (Autoridade Técnica PHDEV Transversal).
 * Faixa horizontal refinada acima do grid P01–P09 com acesso à página dedicada
 * e atalhos diretos para cada contenção independente (ITACHI, MADARA, KAGUYA).
 */
export function HagoromoAuthorityCard({ snapshot, onNavigate }: HagoromoAuthorityCardProps) {
  const emergencyVerified = snapshot?.emergencyAccessVerified === true;
  const activeContainments = getActiveContainments(snapshot);
  const emergencyTone = snapshot == null ? 'unknown' : emergencyVerified ? 'success' : 'warning';
  const emergencyStyle = SEMANTIC_STATUS_STYLES[emergencyTone];

  return (
    <section
      aria-labelledby="hagoromo-root-title"
      data-testid="phdev-hagoromo-authority"
      className="phdev-panel-enter group relative overflow-hidden rounded-2xl border border-[#e3d8be]/26 bg-[#0c0e16]/88 backdrop-blur-md shadow-[0_12px_30px_-18px_rgba(0,0,0,0.88)]"
      style={{ animationDelay: '60ms' }}
    >
      {/* Arte Hagoromo enquadrada à direita preservando rosto, Rinne Sharingan e cajado */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-full sm:w-[56%] bg-cover opacity-90 transition-transform duration-500 ease-out group-hover:scale-[1.02]"
        style={{
          backgroundImage: `url('${HAGOROMO_AUTHORITY.artwork}')`,
          backgroundPosition: HAGOROMO_AUTHORITY.artPosition,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(12,14,22,0.98) 0%, rgba(12,14,22,0.92) 48%, rgba(12,14,22,0.32) 74%, rgba(12,14,22,0.06) 100%)',
        }}
      />

      {/* Brilho dourado sutil no hover */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          boxShadow: 'inset 0 0 0 1px rgba(227, 216, 190, 0.34)',
          background: 'radial-gradient(circle at 12% 30%, rgba(227, 216, 190, 0.09) 0%, transparent 52%)',
        }}
      />

      <div className="relative z-10 px-5 py-3 sm:px-6 sm:py-3.5 pr-5 sm:pr-44 lg:pr-72">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl border border-[#e3d8be]/36 bg-[#161522]/85 flex items-center justify-center shrink-0 shadow-[0_0_20px_-5px_rgba(227,216,190,0.42)]">
              <img
                src={HAGOROMO_AUTHORITY.icon}
                alt=""
                aria-hidden="true"
                className="phdev-sixpaths-orbit w-5 h-5 object-contain"
              />
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="hagoromo-root-title"
                  className="font-sans text-sm font-semibold text-white tracking-tight"
                >
                  {HAGOROMO_AUTHORITY.name}
                </h2>
                <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.16em] text-[#e3d8be]">
                  {HAGOROMO_AUTHORITY.code} AUTHORITY · {HAGOROMO_AUTHORITY.japaneseMark}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 h-5 rounded-full border px-2 text-[10px] font-mono ${emergencyStyle.badge}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${emergencyStyle.dot}`} aria-hidden="true" />
                  {snapshot == null
                    ? 'Acesso emergencial: não verificado'
                    : emergencyVerified
                      ? 'HAGOROMO validado'
                      : 'Pendente de validação externa'}
                </span>
              </div>

              <p className="text-[11.5px] text-zinc-400 truncate">
                {KONOHA_VERBAL_MESSAGES.emergencyAuthorityAuthenticated} · Recuperação independente via consoles externos.
              </p>
            </div>
          </div>

          {/* Ações compactas e chips independentes alinhados */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {(['itachi', 'madara', 'kaguya'] as const).map((proto) => {
              const active = activeContainments.some((c) => c.protocol === proto);
              const unavailable = snapshot?.containment === null;
              return (
                <button
                  key={proto}
                  type="button"
                  onClick={() => onNavigate('protocol', proto, proto)}
                  className={`inline-flex items-center gap-1.5 h-6 rounded-md border px-2 text-[10px] font-mono transition-colors cursor-pointer ${
                    active
                      ? 'bg-red-500/22 border-red-400/55 text-red-100'
                      : unavailable
                        ? 'bg-black/40 border-white/10 text-zinc-400'
                        : 'bg-black/52 border-white/12 text-zinc-300 hover:border-white/30 hover:text-white'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      active ? 'bg-red-400' : unavailable ? 'bg-zinc-500' : 'bg-emerald-400/80'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="uppercase">{proto}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => onNavigate('protocol', undefined, 'hagoromo')}
              data-testid="phdev-open-hagoromo-page"
              className="inline-flex items-center gap-1.5 h-6 rounded-md border border-[#e3d8be]/38 bg-[#1b1826]/92 hover:bg-[#272336] px-2.5 text-[11px] font-medium text-[#f5efe0] transition-colors cursor-pointer"
            >
              <span>Abrir HAGOROMO</span>
              <ArrowRight className="w-3 h-3 text-[#e3d8be]" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
