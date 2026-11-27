'use client';

import React from 'react';
import { ArrowUpRight, ShieldAlert } from 'lucide-react';
import type { ContainmentProtocol } from '@/functions/api/_central/containment';
import {
  OFFICIAL_PROTOCOLS,
  SEMANTIC_STATUS_STYLES,
} from '@/lib/phdev/konohagakure/protocols';
import {
  deriveProtocolRuntime,
  formatBrTimestamp,
} from '@/lib/phdev/konohagakure/verbalIdentity';
import type {
  OperationalBannerViewModel,
  ProtocolPageId,
  SystemControlSnapshot,
} from '@/lib/phdev/konohagakure/types';
import { ProtocolControl } from '../ProtocolControl';
import { KonohaOperationalBanner } from './KonohaOperationalBanner';

interface PhdevContainmentHubProps {
  selectedProtocol: ContainmentProtocol;
  onSelectProtocol: (protocol: ContainmentProtocol) => void;
  onOpenProtocolPage: (pageId: ProtocolPageId) => void;
  snapshot: SystemControlSnapshot | null;
  banner: OperationalBannerViewModel;
  loading: boolean;
  onStateUpdated: () => void;
}

const CONTAINMENT_IDS: readonly ContainmentProtocol[] = ['itachi', 'madara', 'kaguya'];

/**
 * Central de Contenções Konohagakure Edition:
 * 3 cards cinematográficos interativos (ITACHI, MADARA, KAGUYA) com seleção direta
 * e formulário operacional real integrado abaixo.
 */
export function PhdevContainmentHub({
  selectedProtocol,
  onSelectProtocol,
  onOpenProtocolPage,
  snapshot,
  banner,
  loading,
  onStateUpdated,
}: PhdevContainmentHubProps) {
  const protocols = CONTAINMENT_IDS.map((id) =>
    OFFICIAL_PROTOCOLS.find((item) => item.id === id)!,
  );

  return (
    <div data-testid="phdev-containment-hub" className="phdev-page-enter space-y-4">
      {(banner.kind === 'pain' || banner.kind === 'containment') && (
        <KonohaOperationalBanner banner={banner} />
      )}

      {/* Cabeçalho da Central de Contenções */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-[#f87171]" aria-hidden="true" />
          <h2 className="font-sans text-base font-semibold text-white tracking-tight">
            Central de Contenções Independentes
          </h2>
        </div>
        <span className="text-[11px] text-zinc-400">
          ITACHI, MADARA e KAGUYA coexistem sem interferência · encerrar um preserva os demais
        </span>
      </div>

      {/* 3 Cards Cinematográficos de Seleção (ITACHI / MADARA / KAGUYA) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {protocols.map((proto) => {
          const runtime = deriveProtocolRuntime(proto.id, snapshot, loading);
          const record = snapshot?.containment?.find((item) => item.protocol === proto.id);
          const semantic = SEMANTIC_STATUS_STYLES[runtime.tone];
          const isSelected = selectedProtocol === proto.id;

          return (
            <div
              key={proto.id}
              onClick={() => onSelectProtocol(proto.id as ContainmentProtocol)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectProtocol(proto.id as ContainmentProtocol);
                }
              }}
              className={`group relative overflow-hidden rounded-2xl border bg-[#0b0d14]/94 p-4 text-left transition-all cursor-pointer ${
                isSelected
                  ? '-translate-y-0.5 shadow-xl'
                  : 'border-white/[0.10] hover:border-white/[0.22]'
              }`}
              style={
                isSelected
                  ? {
                      borderColor: proto.accentBorderRgba,
                      boxShadow: `0 0 28px -10px ${proto.accentHex}`,
                    }
                  : undefined
              }
            >
              {/* Arte do personagem à direita */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-cover bg-no-repeat transition-transform duration-400 group-hover:scale-[1.04]"
                style={{
                  backgroundImage: `url('${proto.artwork}')`,
                  backgroundPosition: proto.artPosition,
                }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(10,12,18,0.98) 0%, rgba(10,12,18,0.93) 50%, rgba(10,12,18,0.38) 74%, rgba(10,12,18,0.06) 100%)',
                }}
              />

              <div className="relative z-10 space-y-3 max-w-[74%]">
                <div className="flex items-center gap-2.5">
                  <div
                    className="phdev-emblem-pulse w-9 h-9 rounded-full border bg-black/72 flex items-center justify-center shrink-0"
                    style={{
                      borderColor: proto.accentBorderRgba,
                      boxShadow: `0 0 16px -4px ${proto.accentHex}`,
                    }}
                  >
                    <img
                      src={proto.icon}
                      alt=""
                      aria-hidden="true"
                      className={`w-5 h-5 object-contain ${
                        runtime.specialModeActive ? 'phdev-dojutsu-spin' : 'phdev-dojutsu-hover'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-white">{proto.name}</span>
                      <span
                        className="text-[10px] font-mono font-semibold"
                        style={{ color: proto.accentHex }}
                      >
                        {proto.code}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate">{proto.responsibility}</p>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-300/90 leading-snug line-clamp-2">
                  {record?.active
                    ? `Incidente ${record.incidentId} · ${formatBrTimestamp(record.changedAt) || ''}`
                    : runtime.detail}
                </p>

                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <span
                    className={`inline-flex items-center gap-1.5 h-5 rounded-full border px-2 text-[10px] font-mono ${semantic.badge}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${semantic.dot}`} aria-hidden="true" />
                    <span>{runtime.statusLabel}</span>
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenProtocolPage(proto.id);
                    }}
                    className="inline-flex items-center gap-1 text-[10.5px] font-medium text-zinc-300 hover:text-white cursor-pointer"
                  >
                    <span>Página</span>
                    <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Formulário operacional real integrado */}
      <ProtocolControl initialProtocol={selectedProtocol} onStateUpdated={onStateUpdated} />
    </div>
  );
}
