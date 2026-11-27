'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { SiteContent } from '@/lib/types';
import { deriveProtocolRuntime } from '@/lib/phdev/konohagakure/verbalIdentity';
import type {
  OperationalBannerViewModel,
  ProtocolActivityItem,
  ProtocolPageId,
  ProtocolVisualIdentity,
  SystemControlSnapshot,
} from '@/lib/phdev/konohagakure/types';
import { ProtocolQuickSwitcher } from './ProtocolQuickSwitcher';
import { ProtocolHeroBanner } from './ProtocolHeroBanner';
import { ProtocolActivityTimeline } from './ProtocolActivityTimeline';
import { KakashiSection } from './protocolSections/KakashiSection';
import { MinatoSection } from './protocolSections/MinatoSection';
import { KakuzuSection } from './protocolSections/KakuzuSection';
import { NejiSection } from './protocolSections/NejiSection';
import { TobiramaSection } from './protocolSections/TobiramaSection';
import { NarutoSection } from './protocolSections/NarutoSection';
import { ContainmentProtocolSection } from './protocolSections/ContainmentProtocolSection';

interface ProtocolDetailPageProps {
  protocol: ProtocolVisualIdentity;
  content: SiteContent;
  snapshot: SystemControlSnapshot | null;
  activityEvents?: ProtocolActivityItem[];
  banner: OperationalBannerViewModel;
  loading: boolean;
  loadError: string | null;
  lastCheckedAt: string | null;
  onRefresh: () => void;
  onBackToOverview: () => void;
  onSelectProtocolPage: (pageId: ProtocolPageId) => void;
}

/**
 * Página personalizada para cada um dos 9 protocolos oficiais (P01–P09),
 * combinando Hero exclusivo, competências oficiais, módulos reais e timeline amigável.
 */
export function ProtocolDetailPage({
  protocol,
  content,
  snapshot,
  activityEvents = [],
  banner,
  loading,
  loadError,
  lastCheckedAt,
  onRefresh,
  onBackToOverview,
  onSelectProtocolPage,
}: ProtocolDetailPageProps) {
  const runtime = deriveProtocolRuntime(protocol.id, snapshot, loading);

  return (
    <div
      key={protocol.id}
      data-testid={`phdev-protocol-page-${protocol.id}`}
      className="phdev-page-enter space-y-4"
    >
      <ProtocolQuickSwitcher
        activePageId={protocol.id}
        snapshot={snapshot}
        loading={loading}
        onBackToOverview={onBackToOverview}
        onSelectProtocolPage={onSelectProtocolPage}
      />

      <ProtocolHeroBanner
        code={protocol.code}
        title={`Protocolo ${protocol.name}`}
        subtitle={protocol.responsibility}
        missionStatement={protocol.missionStatement}
        japaneseMark={protocol.japaneseMark}
        artwork={protocol.artwork}
        heroArtPosition={protocol.heroArtPosition}
        icon={protocol.icon}
        accentHex={protocol.accentHex}
        accentSoftRgba={protocol.accentSoftRgba}
        accentBorderRgba={protocol.accentBorderRgba}
        atmosphere={protocol.atmosphere}
        isDojutsu={protocol.isDojutsu}
        usesEmbers={protocol.usesEmbers}
        statusTone={runtime.tone}
        statusLabel={runtime.statusLabel}
        verbalCue={runtime.verbalCue}
        specialMode={
          protocol.specialMode
            ? {
                name: protocol.specialMode.name,
                label: protocol.specialMode.label,
                active: runtime.specialModeActive,
                hint: runtime.specialModeHint,
              }
            : undefined
        }
        lastCheckedAt={lastCheckedAt}
        loading={loading}
        onRefresh={onRefresh}
      />

      {/* Resumo técnico em tempo real + responsabilidades oficiais */}
      <section className="rounded-2xl border border-white/[0.08] bg-[#0c0f18]/88 backdrop-blur-md p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-mono uppercase tracking-[0.16em] text-zinc-400">
            Leitura Atual &amp; Escopo Oficial ({protocol.code} · {protocol.name})
          </h3>
          <span className="text-[11px] text-zinc-300 font-medium">{runtime.detail}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {protocol.officialCapabilities.map((cap) => (
            <div
              key={cap}
              className="flex items-start gap-2 rounded-xl border border-white/[0.06] bg-black/35 px-3 py-2 text-[11.5px] text-zinc-300"
            >
              <CheckCircle2
                className="w-3.5 h-3.5 shrink-0 mt-0.5"
                style={{ color: protocol.accentHex }}
                aria-hidden="true"
              />
              <span>{cap}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Módulos personalizados reais específicos de cada protocolo */}
      {protocol.id === 'kakashi' && <KakashiSection snapshot={snapshot} />}
      {protocol.id === 'minato' && <MinatoSection snapshot={snapshot} onStateUpdated={onRefresh} />}
      {protocol.id === 'kakuzu' && <KakuzuSection snapshot={snapshot} />}
      {protocol.id === 'neji' && <NejiSection snapshot={snapshot} error={loadError} />}
      {protocol.id === 'tobirama' && (
        <TobiramaSection content={content} snapshot={snapshot} onStateUpdated={onRefresh} />
      )}
      {protocol.id === 'naruto' && <NarutoSection snapshot={snapshot} />}
      {(protocol.id === 'itachi' || protocol.id === 'madara' || protocol.id === 'kaguya') && (
        <ContainmentProtocolSection
          protocol={protocol.id}
          snapshot={snapshot}
          banner={banner}
          onStateUpdated={onRefresh}
          onSelectProtocolPage={onSelectProtocolPage}
        />
      )}

      {/* Timeline amigável de operações capturadas para este protocolo */}
      <ProtocolActivityTimeline
        title={
          protocol.id === 'neji'
            ? 'Linha do Tempo Unificada da Plataforma (360°)'
            : `Atividade Operacional — ${protocol.code} ${protocol.name}`
        }
        subtitle={
          protocol.id === 'neji'
            ? 'Todas as operações da NUA, compras, uploads, packs, personalizados, chamadas VIP e ações de segurança.'
            : `Logs detalhados e amigáveis das operações registradas sob o domínio ${protocol.responsibility.toLowerCase()}.`
        }
        events={activityEvents}
        protocolFilter={protocol.id}
        showProtocolBadge={protocol.id === 'neji'}
        accentHex={protocol.accentHex}
      />
    </div>
  );
}
