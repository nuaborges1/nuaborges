'use client';

import React, { useState, type FormEvent } from 'react';
import { CheckCircle2, GitBranch, Package, Wrench } from 'lucide-react';
import type { SiteContent } from '@/lib/types';
import { getPublicApiUrl } from '@/lib/contentStore';
import { SEMANTIC_STATUS_STYLES } from '@/lib/phdev/konohagakure/protocols';
import type { SystemControlSnapshot } from '@/lib/phdev/konohagakure/types';
import { ConfiguracoesModule } from '../../ConfiguracoesModule';

interface TobiramaSectionProps {
  content: SiteContent;
  snapshot: SystemControlSnapshot | null;
  onStateUpdated?: () => void;
}

const RELEASE_GATES = [
  {
    title: 'Export Estático & Fontes Locais',
    detail: 'next build (output: export) com WOFF2 locais em app/fonts/ e zero dependência externa.',
  },
  {
    title: 'Isolamento de Pacotes (prepareDeploys)',
    detail: 'out-site (público, sem assets PHDEV), out-admin (PHDEV + NUA) e out-admingeral (NUA).',
  },
  {
    title: 'Trava Git Remoto, Secret Shield & SHA',
    detail: 'Publicação exige backup Git remoto em dia, varredura de segredos limpa e confirmação de SHA.',
  },
] as const;

export function TobiramaSection({ content, snapshot, onStateUpdated }: TobiramaSectionProps) {
  const maintenance = snapshot?.flags?.maintenanceMode;
  const maintenanceTone =
    maintenance == null ? 'unknown' : maintenance ? 'warning' : 'success';
  const maintenanceBadge = SEMANTIC_STATUS_STYLES[maintenanceTone];

  const [message, setMessage] = useState(snapshot?.flags?.maintenanceMessage || '');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function handleToggleMaintenance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password.trim() || saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      const nextMode = !Boolean(maintenance);
      const response = await fetch(`${getPublicApiUrl()}/api/control/system`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_flags',
          maintenanceMode: nextMode,
          maintenanceMessage: message.trim(),
          confirmationPassword: password,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Falha ao atualizar modo manutenção.');
      }
      setFeedback({
        type: 'ok',
        text: nextMode
          ? 'Modo manutenção ativado com registro em auditoria.'
          : 'Modo manutenção desativado com sucesso.',
      });
      onStateUpdated?.();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Erro ao atualizar flags.',
      });
    } finally {
      setPassword('');
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/[0.08] bg-[#0c0f18]/90 p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-white">
              <Wrench className="w-4 h-4 text-[#38bdf8]" aria-hidden="true" />
              Modo Manutenção
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-mono ${maintenanceBadge.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${maintenanceBadge.dot}`} aria-hidden="true" />
              {maintenance == null ? 'Não verificado' : maintenance ? 'Ativo' : 'Desativado'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            {snapshot?.flags?.maintenanceMessage ||
              'Alteração do modo manutenção exige reautenticação por senha PHDEV.'}
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#0c0f18]/90 p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-white">
              <Package className="w-4 h-4 text-[#38bdf8]" aria-hidden="true" />
              Alvos de Empacotamento
            </span>
            <span className="text-[10.5px] font-mono text-[#38bdf8]">3 pacotes</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            <code className="font-mono text-zinc-300">out-site</code>,{' '}
            <code className="font-mono text-zinc-300">out-admin</code> e{' '}
            <code className="font-mono text-zinc-300">out-admingeral</code> gerados por{' '}
            <code className="font-mono text-zinc-300">tools/prepareDeploys.mjs</code>.
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#0c0f18]/90 p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-white">
              <GitBranch className="w-4 h-4 text-[#38bdf8]" aria-hidden="true" />
              Publicação em Produção
            </span>
            <span className="text-[10.5px] font-mono text-zinc-300">Autorização manual</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Nenhuma alteração vai a produção automaticamente; toda publicação segue o protocolo de release.
          </p>
        </div>
      </div>

      {/* Controle real de Modo Manutenção (TOBIRAMA -> set_flags) */}
      <section className="rounded-2xl border border-[#38bdf8]/24 bg-[#0c0f18]/92 p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">Controle do Modo Manutenção (TOBIRAMA)</h3>
          <span className="text-[10.5px] font-mono text-zinc-500">POST /api/control/system · set_flags</span>
        </div>
        <form onSubmit={handleToggleMaintenance} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <label className="grid gap-1 text-xs text-zinc-300">
            <span>Mensagem exibida em manutenção</span>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex.: Atualização técnica programada..."
              className="h-9 rounded-xl border border-white/14 bg-black/50 px-3 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#38bdf8]/60"
            />
          </label>
          <label className="grid gap-1 text-xs text-zinc-300">
            <span>Senha do PHDEV</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Confirme sua senha PHDEV"
              required
              className="h-9 rounded-xl border border-white/14 bg-black/50 px-3 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#38bdf8]/60"
            />
          </label>
          <button
            type="submit"
            disabled={saving || !password.trim()}
            className={`h-9 rounded-xl px-4 text-xs font-semibold transition-colors disabled:opacity-45 cursor-pointer ${
              maintenance
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-[#38bdf8]/22 hover:bg-[#38bdf8]/34 border border-[#38bdf8]/45 text-sky-100'
            }`}
          >
            {saving ? 'Aplicando…' : maintenance ? 'Desativar manutenção' : 'Ativar manutenção'}
          </button>
        </form>
        {feedback && (
          <p className={`text-xs ${feedback.type === 'err' ? 'text-rose-300' : 'text-emerald-300'}`} role={feedback.type === 'err' ? 'alert' : 'status'}>
            {feedback.text}
          </p>
        )}
      </section>

      {/* Portões obrigatórios de engenharia */}
      <section className="rounded-2xl border border-white/[0.08] bg-[#0c0f18]/90 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">Portões Obrigatórios de Engenharia e Release</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {RELEASE_GATES.map((gate) => (
            <div
              key={gate.title}
              className="rounded-xl border border-white/[0.06] bg-black/35 p-3.5 space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" aria-hidden="true" />
                <span className="text-xs font-semibold text-zinc-100">{gate.title}</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">{gate.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Configurações técnicas reais do PHDEV (sem duplicar ProtocolControl) */}
      <section className="rounded-2xl border border-white/[0.08] bg-[#0c0f18]/90 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">Configurações Técnicas da Plataforma</h3>
          <span className="text-[10.5px] font-mono text-zinc-500">Perfil PHDEV</span>
        </div>
        <ConfiguracoesModule content={content} adminProfile="phdev" hideProtocolControl />
      </section>
    </div>
  );
}
