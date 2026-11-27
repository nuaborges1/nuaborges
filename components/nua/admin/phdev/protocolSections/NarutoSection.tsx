'use client';

import React from 'react';
import { Flame, Inbox, MailCheck, RotateCcw, Clock } from 'lucide-react';
import { SEMANTIC_STATUS_STYLES } from '@/lib/phdev/konohagakure/protocols';
import { formatBrTimestamp, getRecoveryPendingCount } from '@/lib/phdev/konohagakure/verbalIdentity';
import type { SystemControlSnapshot } from '@/lib/phdev/konohagakure/types';

interface NarutoSectionProps {
  snapshot: SystemControlSnapshot | null;
}

export function NarutoSection({ snapshot }: NarutoSectionProps) {
  const recovery = snapshot?.recovery;
  const totalPending = getRecoveryPendingCount(snapshot);

  const queues = [
    {
      id: 'vault',
      label: 'Liberação do Cofre',
      icon: Inbox,
      count: recovery?.vault?.needsIntervention,
      detail: 'Pedidos pagos aguardando entrega ou reprocessamento automático de acesso ao Cofre.',
      paused: false,
    },
    {
      id: 'paidEmail',
      label: 'Confirmações por E-mail',
      icon: MailCheck,
      count: recovery?.paidEmail?.needsIntervention,
      detail: 'Disparos transacionais pós-pagamento pendentes de reenvio seguro via SMTP.',
      paused: false,
    },
    {
      id: 'refunds',
      label: 'Reconciliação de Estornos',
      icon: RotateCcw,
      count: recovery?.refunds?.needsIntervention,
      detail: 'Estornos pendentes de confirmação final com o gateway financeiro comercial.',
      paused: Boolean(recovery?.refundsPaused),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Resumo da última execução + Baryon Mode honesto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/[0.08] bg-[#0c0f18]/90 p-4 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-white">
              <Clock className="w-4 h-4 text-[#fb7a2c]" aria-hidden="true" />
              Última Rodada de Recuperação
            </span>
            <p className="text-sm font-mono font-semibold text-zinc-100">
              {recovery?.at ? formatBrTimestamp(recovery.at) : 'Sem execução registrada'}
            </p>
            <p className="text-[11px] text-zinc-400">
              Fonte: <code className="font-mono text-zinc-300">system:recovery:latest</code> · {totalPending} pendência(s) acima do limite automático.
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-mono shrink-0 ${
              SEMANTIC_STATUS_STYLES[!recovery ? 'unknown' : totalPending > 0 ? 'recovery' : 'success'].badge
            }`}
          >
            {!recovery ? 'Aguardando cron' : totalPending > 0 ? 'Em recuperação' : 'Estável'}
          </span>
        </div>

        <div className="rounded-xl border border-[#fb7a2c]/28 bg-[#140e0b]/90 p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg border border-[#fb7a2c]/35 bg-[#fb7a2c]/12 flex items-center justify-center shrink-0">
            <Flame className="w-4 h-4 text-[#fb7a2c]" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-white">Baryon Mode</span>
              <span className="rounded-full border border-white/15 bg-black/50 px-2 py-0.5 text-[9.5px] font-mono uppercase text-zinc-300">
                Inativo · Requer homologação própria
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              O modo de recuperação prioritária só será ativável quando o fluxo correspondente de servidor estiver homologado e auditado. Nunca é simulado na interface.
            </p>
          </div>
        </div>
      </div>

      {/* As 3 filas reais de recuperação */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {queues.map((queue) => {
          const Icon = queue.icon;
          const tone = !recovery
            ? 'unknown'
            : queue.paused
              ? 'containment'
              : Number(queue.count || 0) > 0
                ? 'recovery'
                : 'success';
          const badge = SEMANTIC_STATUS_STYLES[tone];

          return (
            <div
              key={queue.id}
              className="rounded-2xl border border-white/[0.08] bg-[#0c0f18]/90 p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="w-8 h-8 rounded-lg border border-[#fb7a2c]/28 bg-[#fb7a2c]/10 flex items-center justify-center text-[#fb7a2c]">
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-mono ${badge.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />
                  {queue.paused ? 'Em quarentena' : !recovery ? 'Sem registro' : Number(queue.count || 0) > 0 ? 'Intervenção' : 'Estável'}
                </span>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-white">{queue.label}</h3>
                <p className="font-mono text-2xl font-bold text-white mt-1">
                  {queue.paused ? 'Pausada' : queue.count ?? '—'}
                </p>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{queue.detail}</p>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
