'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import {
  HAGOROMO_AUTHORITY,
  OFFICIAL_PROTOCOLS,
  SEMANTIC_STATUS_STYLES,
} from '@/lib/phdev/konohagakure/protocols';
import { deriveProtocolRuntime } from '@/lib/phdev/konohagakure/verbalIdentity';
import type { ProtocolPageId, SystemControlSnapshot } from '@/lib/phdev/konohagakure/types';

interface ProtocolQuickSwitcherProps {
  activePageId: ProtocolPageId;
  snapshot: SystemControlSnapshot | null;
  loading: boolean;
  onBackToOverview: () => void;
  onSelectProtocolPage: (pageId: ProtocolPageId) => void;
}

/**
 * Barra superior compacta e 100% visível (sem corte horizontal) para alternar entre
 * os 9 protocolos oficiais (P01–P09) e HAGOROMO (ROOT AUTHORITY).
 */
export function ProtocolQuickSwitcher({
  activePageId,
  snapshot,
  loading,
  onBackToOverview,
  onSelectProtocolPage,
}: ProtocolQuickSwitcherProps) {
  const hagoromoTone =
    snapshot == null ? 'unknown' : snapshot.emergencyAccessVerified ? 'success' : 'warning';

  return (
    <nav
      aria-label="Navegação entre páginas de protocolos"
      data-testid="phdev-protocol-switcher"
      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/[0.09] bg-[#0b0e15]/88 backdrop-blur-md px-3.5 py-2.5"
    >
      <button
        type="button"
        onClick={onBackToOverview}
        data-testid="phdev-back-to-overview"
        className="inline-flex items-center gap-1.5 h-7.5 rounded-lg border border-white/[0.12] bg-white/[0.06] hover:bg-white/[0.12] px-2.5 text-xs font-medium text-zinc-200 hover:text-white transition-colors cursor-pointer shrink-0"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Protocolos</span>
      </button>

      <div className="flex flex-wrap items-center gap-1.5">
        {OFFICIAL_PROTOCOLS.map((proto) => {
          const runtime = deriveProtocolRuntime(proto.id, snapshot, loading);
          const dotClass = SEMANTIC_STATUS_STYLES[runtime.tone].dot;
          const isCurrent = activePageId === proto.id;

          return (
            <button
              key={proto.id}
              type="button"
              onClick={() => onSelectProtocolPage(proto.id)}
              aria-current={isCurrent ? 'page' : undefined}
              data-testid={`phdev-switch-${proto.id}`}
              title={`${proto.code} — Protocolo ${proto.name}`}
              className={`inline-flex items-center gap-1.5 h-7 rounded-lg border px-2 text-[10.5px] font-mono transition-all cursor-pointer whitespace-nowrap ${
                isCurrent
                  ? 'text-white shadow-sm'
                  : 'border-white/[0.08] bg-black/45 text-zinc-400 hover:text-zinc-100 hover:border-white/[0.22]'
              }`}
              style={
                isCurrent
                  ? {
                      borderColor: proto.accentBorderRgba,
                      backgroundColor: proto.accentSoftRgba,
                    }
                  : undefined
              }
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} aria-hidden="true" />
              <span className="font-semibold" style={isCurrent ? { color: proto.accentHex } : undefined}>
                {proto.name}
              </span>
            </button>
          );
        })}

        <span className="hidden sm:inline-block h-4 w-px bg-white/14 mx-0.5 shrink-0" aria-hidden="true" />

        <button
          type="button"
          onClick={() => onSelectProtocolPage('hagoromo')}
          aria-current={activePageId === 'hagoromo' ? 'page' : undefined}
          data-testid="phdev-switch-hagoromo"
          title="ROOT — HAGOROMO"
          className={`inline-flex items-center gap-1.5 h-7 rounded-lg border px-2.5 text-[10.5px] font-mono transition-all cursor-pointer whitespace-nowrap ${
            activePageId === 'hagoromo'
              ? 'border-[#e3d8be]/55 bg-[#e3d8be]/18 text-[#f8f3e6]'
              : 'border-[#e3d8be]/22 bg-black/45 text-[#e3d8be]/85 hover:text-[#f8f3e6] hover:border-[#e3d8be]/42'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEMANTIC_STATUS_STYLES[hagoromoTone].dot}`}
            aria-hidden="true"
          />
          <span className="font-semibold">{HAGOROMO_AUTHORITY.name}</span>
        </button>
      </div>
    </nav>
  );
}
