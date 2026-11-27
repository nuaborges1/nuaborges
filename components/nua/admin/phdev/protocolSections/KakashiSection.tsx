'use client';

import React from 'react';
import { Shield, Lock, Globe, FileWarning } from 'lucide-react';
import { SEMANTIC_STATUS_STYLES } from '@/lib/phdev/konohagakure/protocols';
import { formatBrTimestamp } from '@/lib/phdev/konohagakure/verbalIdentity';
import type { SystemControlSnapshot } from '@/lib/phdev/konohagakure/types';

interface KakashiSectionProps {
  snapshot: SystemControlSnapshot | null;
}

export function KakashiSection({ snapshot }: KakashiSectionProps) {
  const turnstileConfigured = snapshot?.integrations?.turnstile?.configured;
  const policies = snapshot?.registeredPolicies;
  const blocked = snapshot?.auditStats?.blocked;
  const securityEvents = (snapshot?.recentAudit || []).filter((ev) =>
    /BLOCK|RATE|CSRF|ORIGIN|TURNSTILE|SECURITY|WAF|DENIED/i.test(
      `${ev.type || ''} ${ev.summary || ''}`,
    ),
  );

  const defenses = [
    {
      label: 'Cloudflare Turnstile',
      detail: 'Verificação humana nos formulários públicos e acessos sensíveis.',
      tone:
        turnstileConfigured == null
          ? ('unknown' as const)
          : turnstileConfigured
            ? ('success' as const)
            : ('warning' as const),
      value:
        turnstileConfigured == null
          ? 'Não verificado'
          : turnstileConfigured
            ? 'Configurado'
            : 'Ausente',
      icon: Shield,
    },
    {
      label: 'Políticas do Gateway',
      detail: 'Matriz explícita por rota no Cloudflare Pages Functions.',
      tone: policies && policies > 0 ? ('success' as const) : ('unknown' as const),
      value: policies != null ? `${policies} ativas` : 'Não verificado',
      icon: Globe,
    },
    {
      label: 'Bloqueios Registrados',
      detail: 'Tentativas rejeitadas contabilizadas na telemetria de auditoria.',
      tone:
        blocked == null
          ? ('unknown' as const)
          : Number(blocked) > 0
            ? ('warning' as const)
            : ('info' as const),
      value: blocked != null ? String(blocked) : 'Não verificado',
      icon: FileWarning,
    },
    {
      label: 'CSRF, Origin & Secret Shield',
      detail: 'Validação de origem, headers de segurança e bloqueio de vazamento de segredos.',
      tone: 'info' as const,
      value: 'Aplicado no código',
      icon: Lock,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {defenses.map((item) => {
          const Icon = item.icon;
          const badge = SEMANTIC_STATUS_STYLES[item.tone];
          return (
            <div
              key={item.label}
              className="rounded-xl border border-white/[0.08] bg-[#0c0f18]/90 p-4 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="w-8 h-8 rounded-lg border border-[#60a5fa]/30 bg-[#60a5fa]/10 flex items-center justify-center text-[#60a5fa]">
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-mono ${badge.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />
                  {item.value}
                </span>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white">{item.label}</h3>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{item.detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      <section className="rounded-2xl border border-white/[0.08] bg-[#0c0f18]/90 p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">
            Eventos de Defesa Ativa e Bloqueio ({securityEvents.length})
          </h3>
          <span className="text-[11px] font-mono text-zinc-500">Fonte: recentAudit</span>
        </div>

        {securityEvents.length === 0 ? (
          <p className="text-xs text-zinc-400">
            {snapshot
              ? 'Nenhum evento de bloqueio ou alerta de borda retornado na janela recente de auditoria.'
              : 'Telemetria indisponível neste ambiente. Atualize quando /api/control/system estiver acessível.'}
          </p>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {securityEvents.map((ev, idx) => (
              <div key={ev.id || idx} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <span className="font-mono text-[11px] text-[#60a5fa] mr-2">{ev.type || 'SECURITY'}</span>
                  <span className="text-zinc-200">{ev.summary || 'Evento registrado'}</span>
                </div>
                <span className="font-mono text-[10.5px] text-zinc-500">
                  {formatBrTimestamp(ev.createdAt || ev.timestamp) || '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
