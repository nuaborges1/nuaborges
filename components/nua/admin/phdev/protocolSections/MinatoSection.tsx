'use client';

import React, { useState, type FormEvent } from 'react';
import { KeyRound, ShieldCheck, Users, UserCheck, LogOut } from 'lucide-react';
import { getPublicApiUrl } from '@/lib/contentStore';
import { SEMANTIC_STATUS_STYLES } from '@/lib/phdev/konohagakure/protocols';
import { formatBrTimestamp } from '@/lib/phdev/konohagakure/verbalIdentity';
import type { SystemControlSnapshot } from '@/lib/phdev/konohagakure/types';

interface MinatoSectionProps {
  snapshot: SystemControlSnapshot | null;
  onStateUpdated?: () => void;
}

const SEPARATION_MATRIX = [
  {
    surface: 'Catálogo, mídia, pedidos, CRM, agendamentos VIP e finanças comerciais',
    nua: 'Permitido',
    phdev: 'Auditoria / suporte',
  },
  {
    surface: 'Estornos e ações financeiras sensíveis',
    nua: 'Com confirmação de senha',
    phdev: 'Com confirmação de senha',
  },
  {
    surface: 'Protocolos de contenção (ITACHI, MADARA, KAGUYA) e revogação global',
    nua: 'Bloqueado no servidor',
    phdev: 'Exclusivo + senha PHDEV',
  },
  {
    surface: 'Configuração de infraestrutura, mensalidade PHDEV e diagnóstico /api/control/system',
    nua: 'Bloqueado no servidor',
    phdev: 'Exclusivo PHDEV',
  },
] as const;

export function MinatoSection({ snapshot, onStateUpdated }: MinatoSectionProps) {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const supabaseConnected = snapshot?.integrations?.supabase?.connected;
  const authEvents = (snapshot?.recentAudit || []).filter((ev) =>
    /AUTH|LOGIN|LOGOUT|SESSION|FORBIDDEN|UNAUTHORIZED|DENIED|REAUTH|SECURITY_ACTION/i.test(
      `${ev.type || ''} ${ev.summary || ''}`,
    ),
  );

  async function handleRevokeSessions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password.trim() || submitting) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch(`${getPublicApiUrl()}/api/control/system`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revoke_admin_sessions',
          confirmationPassword: password,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Não foi possível revogar sessões administrativas.');
      }
      setFeedback({
        type: 'ok',
        text: result.message || 'Sessões administrativas revogadas com sucesso.',
      });
      onStateUpdated?.();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Falha na revogação global.',
      });
    } finally {
      setPassword('');
      setSubmitting(false);
    }
  }

  const sessionTone =
    supabaseConnected == null ? 'unknown' : supabaseConnected ? 'success' : 'danger';
  const sessionBadge = SEMANTIC_STATUS_STYLES[sessionTone];

  return (
    <div className="space-y-4">
      {/* KPIs reais de sessão e autorização */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/[0.08] bg-[#0c0f18]/90 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-white">
              <KeyRound className="w-4 h-4 text-[#e5be62]" aria-hidden="true" />
              Persistência admin_sessions
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-mono ${sessionBadge.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sessionBadge.dot}`} aria-hidden="true" />
              {supabaseConnected == null
                ? 'Não verificado'
                : supabaseConnected
                  ? 'Operacional'
                  : 'Indisponível'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Login, verificação de sessão, logout e revogação consultam o registro persistido. Sem persistência, nenhum cookie é emitido.
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#0c0f18]/90 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-white">
              <ShieldCheck className="w-4 h-4 text-[#e5be62]" aria-hidden="true" />
              Reautenticação Crítica
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/12 px-2 py-0.5 text-[10px] font-mono text-sky-200">
              Obrigatória
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Estornos, modo manutenção, contenção e revogação global exigem confirmação explícita da senha do operador autorizado.
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#0c0f18]/90 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-white">
              <UserCheck className="w-4 h-4 text-[#e5be62]" aria-hidden="true" />
              Políticas no Gateway
            </span>
            <span className="text-xs font-mono font-semibold text-[#e5be62]">
              {snapshot?.registeredPolicies != null ? `${snapshot.registeredPolicies} rotas` : 'Não verificado'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Autorização aplicada no servidor por identidade e operação, inclusive para chamadas diretas à API e escopos de serviço/cron.
          </p>
        </div>
      </div>

      {/* Matriz visual de separação NUA × PHDEV */}
      <section className="rounded-2xl border border-white/[0.08] bg-[#0c0f18]/90 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#e5be62]" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-white">Matriz de Separação NUA × PHDEV</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] text-[10px] font-mono uppercase text-zinc-400">
                <th className="py-2 pr-4">Domínio / Operação</th>
                <th className="py-2 pr-4">NUA (Comercial)</th>
                <th className="py-2">PHDEV (Técnico)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {SEPARATION_MATRIX.map((row) => (
                <tr key={row.surface}>
                  <td className="py-2.5 pr-4 text-zinc-200">{row.surface}</td>
                  <td className="py-2.5 pr-4 font-mono text-[11px] text-zinc-300">{row.nua}</td>
                  <td className="py-2.5 font-mono text-[11px] text-[#e5be62]">{row.phdev}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Ação operacional real MINATO: Revogação Global de Sessões */}
      <section className="rounded-2xl border border-[#e5be62]/26 bg-[#0c0f18]/92 p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <LogOut className="w-4 h-4 text-[#e5be62]" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-white">
              Revogação Global de Sessões Administrativas (Kill-Switch MINATO)
            </h3>
          </div>
          <span className="text-[10.5px] font-mono text-zinc-500">POST /api/control/system</span>
        </div>
        <p className="text-xs text-zinc-400">
          Encerra imediatamente todas as sessões administrativas ativas em <code className="font-mono text-zinc-300">admin_sessions</code>. Exige confirmação da senha PHDEV.
        </p>
        <form onSubmit={handleRevokeSessions} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Confirme sua senha PHDEV..."
            required
            className="flex-1 sm:max-w-xs h-9 rounded-xl border border-white/14 bg-black/50 px-3.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#e5be62]/60"
          />
          <button
            type="submit"
            disabled={submitting || !password.trim()}
            className="inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-[#e5be62]/20 hover:bg-[#e5be62]/32 border border-[#e5be62]/45 px-4 text-xs font-semibold text-[#fef3c7] transition-colors disabled:opacity-45 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{submitting ? 'Revogando…' : 'Revogar sessões ativas'}</span>
          </button>
        </form>
        {feedback && (
          <p className={`text-xs ${feedback.type === 'err' ? 'text-rose-300' : 'text-emerald-300'}`} role={feedback.type === 'err' ? 'alert' : 'status'}>
            {feedback.text}
          </p>
        )}
      </section>

      {/* Eventos de autenticação / autorização */}
      <section className="rounded-2xl border border-white/[0.08] bg-[#0c0f18]/90 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">
          Eventos Recentes de Sessão e Permissão ({authEvents.length})
        </h3>
        {authEvents.length === 0 ? (
          <p className="text-xs text-zinc-400">
            {snapshot
              ? 'Nenhum evento recente de autenticação ou negação retornado na janela atual.'
              : 'Aguardando resposta autenticada de /api/control/system.'}
          </p>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {authEvents.map((ev, idx) => (
              <div key={ev.id || idx} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <span className="font-mono text-[11px] text-[#e5be62] mr-2">{ev.type || 'AUTH'}</span>
                  <span className="text-zinc-200">{ev.summary || 'Evento de sessão'}</span>
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
