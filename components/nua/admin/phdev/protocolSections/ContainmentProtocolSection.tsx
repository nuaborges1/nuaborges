'use client';

import React from 'react';
import { ShieldAlert, Layers, AlertTriangle, ExternalLink } from 'lucide-react';
import type { ContainmentProtocol } from '@/functions/api/_central/containment';
import { SEMANTIC_STATUS_STYLES } from '@/lib/phdev/konohagakure/protocols';
import { formatBrTimestamp } from '@/lib/phdev/konohagakure/verbalIdentity';
import type {
  OperationalBannerViewModel,
  ProtocolPageId,
  SystemControlSnapshot,
} from '@/lib/phdev/konohagakure/types';
import { ProtocolControl } from '../../ProtocolControl';
import { KonohaOperationalBanner } from '../KonohaOperationalBanner';

interface ContainmentProtocolSectionProps {
  protocol: ContainmentProtocol;
  snapshot: SystemControlSnapshot | null;
  banner: OperationalBannerViewModel;
  onStateUpdated: () => void;
  onSelectProtocolPage: (pageId: ProtocolPageId) => void;
}

const SCOPE_DESCRIPTIONS: Record<ContainmentProtocol, { title: string; items: ReadonlyArray<{ key: string; label: string }> }> = {
  itachi: {
    title: 'Módulos Pausáveis pelo ITACHI (Tsukuyomi)',
    items: [
      { key: 'checkout', label: 'Novas compras (Checkout)' },
      { key: 'vip_booking', label: 'Novas reservas de Chamadas VIP' },
      { key: 'personalizados', label: 'Novas encomendas de Personalizados' },
      { key: 'nua_id_login', label: 'Login da conta de cliente (NUA ID)' },
      { key: 'contact', label: 'Formulário público de contato' },
      { key: 'vip_subscribe', label: 'Inscrição na Lista VIP' },
    ],
  },
  madara: {
    title: 'Superfícies Bloqueadas pelo MADARA (Infinite Tsukuyomi)',
    items: [
      { key: 'gateway', label: 'Gateway de APIs públicas (HTTP 503)' },
      { key: 'pages', label: 'Páginas comerciais públicas' },
      { key: 'media', label: 'Entrega de mídia protegida e streams' },
      { key: 'hagoromo', label: 'Acesso emergencial HAGOROMO permanece independente' },
    ],
  },
  kaguya: {
    title: 'Componentes em Quarentena pelo KAGUYA (Amenominaka)',
    items: [
      { key: 'mercadopago', label: 'Mercado Pago (pagamentos e webhooks)' },
      { key: 'b2', label: 'Backblaze B2 e entrega de mídia' },
      { key: 'supabase', label: 'Supabase (consultas aplicacionais)' },
      { key: 'cloudflare', label: 'Cloudflare (integrações aplicacionais)' },
      { key: 'email', label: 'E-mail transacional (SMTP)' },
    ],
  },
};

export function ContainmentProtocolSection({
  protocol,
  snapshot,
  banner,
  onStateUpdated,
  onSelectProtocolPage,
}: ContainmentProtocolSectionProps) {
  const record = snapshot?.containment?.find((item) => item.protocol === protocol);
  const isActive = record?.active === true;
  const requiresHagoromo = protocol === 'madara' || protocol === 'kaguya';
  const emergencyVerified = snapshot?.emergencyAccessVerified === true;
  const scopeMeta = SCOPE_DESCRIPTIONS[protocol];

  const siblingProtocols = (['itachi', 'madara', 'kaguya'] as const).filter((p) => p !== protocol);

  return (
    <div className="space-y-4">
      {/* Banner PAIN contextual quando incidente crítico estiver ativo */}
      {banner.kind === 'pain' && (protocol === 'madara' || protocol === 'kaguya') && (
        <KonohaOperationalBanner banner={banner} />
      )}

      {/* Aviso de trava HAGOROMO para MADARA e KAGUYA */}
      {requiresHagoromo && snapshot != null && !emergencyVerified && !isActive && (
        <div className="rounded-2xl border border-amber-400/35 bg-amber-950/25 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-xs space-y-0.5">
              <p className="font-semibold text-amber-100">Trava HAGOROMO ativa neste ambiente</p>
              <p className="text-amber-200/80">
                O acionamento de {protocol.toUpperCase()} exige validação prévia de{' '}
                <code className="font-mono">NUA_EMERGENCY_ACCESS_VERIFIED</code> para garantir recuperação fora do painel.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectProtocolPage('hagoromo')}
            className="inline-flex items-center gap-1.5 h-8 rounded-lg border border-[#e3d8be]/35 bg-black/50 hover:bg-black/75 px-3 text-xs font-medium text-[#f5efe0] cursor-pointer"
          >
            <span>Abrir HAGOROMO</span>
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Registro ativo atual + Mapa de escopos + Coexistência independente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.08] bg-[#0c0f18]/90 p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-zinc-300" aria-hidden="true" />
              {scopeMeta.title}
            </h3>
            <span className="text-[10.5px] font-mono text-zinc-500 uppercase">
              {isActive ? 'Ativo' : 'Prontidão'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {scopeMeta.items.map((item) => {
              const isPausedScope = isActive && record?.scopes?.includes(item.key);
              return (
                <div
                  key={item.key}
                  className={`rounded-xl border px-3 py-2.5 text-xs flex items-center justify-between gap-2 ${
                    isPausedScope
                      ? 'border-red-400/45 bg-red-950/35 text-red-100'
                      : 'border-white/[0.07] bg-black/35 text-zinc-300'
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  <span className="font-mono text-[10px] uppercase shrink-0 text-zinc-400">
                    {isPausedScope ? 'Isolado' : item.key}
                  </span>
                </div>
              );
            })}
          </div>

          {record && (
            <div className="pt-3 border-t border-white/[0.07] grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div>
                <span className="text-zinc-500 font-mono uppercase block text-[10px]">Incidente</span>
                <span className="text-zinc-200 font-mono">{record.incidentId || '—'}</span>
              </div>
              <div>
                <span className="text-zinc-500 font-mono uppercase block text-[10px]">Atualizado em</span>
                <span className="text-zinc-200">{formatBrTimestamp(record.changedAt) || '—'}</span>
              </div>
              <div>
                <span className="text-zinc-500 font-mono uppercase block text-[10px]">Revisão</span>
                <span className="text-zinc-200 font-mono truncate block">{record.revision || '—'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Independência entre ITACHI, MADARA e KAGUYA */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0f18]/90 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-zinc-300" aria-hidden="true" />
            Independência de Contenção
          </h3>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            ITACHI, MADARA e KAGUYA coexistem de forma independente. Encerrar{' '}
            <strong className="text-zinc-200">{protocol.toUpperCase()}</strong> preserva os demais protocolos ativos.
          </p>

          <div className="space-y-2 pt-1">
            {siblingProtocols.map((sibling) => {
              const sibRecord = snapshot?.containment?.find((r) => r.protocol === sibling);
              const sibActive = sibRecord?.active === true;
              const badge = SEMANTIC_STATUS_STYLES[
                snapshot?.containment == null ? 'unknown' : sibActive ? 'critical' : 'success'
              ];
              return (
                <button
                  key={sibling}
                  type="button"
                  onClick={() => onSelectProtocolPage(sibling)}
                  className="w-full rounded-xl border border-white/[0.08] bg-black/40 hover:bg-white/[0.06] px-3 py-2 flex items-center justify-between text-xs transition-colors cursor-pointer"
                >
                  <span className="font-mono font-semibold text-zinc-100 uppercase">{sibling}</span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-mono ${badge.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />
                    {snapshot?.containment == null ? 'Indisponível' : sibActive ? 'Ativo' : 'Inativo'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Controle real de ativação / encerramento protegido por senha PHDEV */}
      <ProtocolControl initialProtocol={protocol} onStateUpdated={onStateUpdated} />
    </div>
  );
}
