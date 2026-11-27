'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { ContainmentProtocol, ContainmentRecord } from '@/functions/api/_central/containment';
import { getPublicApiUrl } from '@/lib/contentStore';

const protocolInfo = {
  itachi: {
    name: 'ITACHI',
    description: 'Contenção seletiva de módulos',
    scopes: {
      checkout: 'Novas compras',
      vip_booking: 'Novas reservas VIP',
      personalizados: 'Novas encomendas',
      nua_id_login: 'Login da conta de cliente',
      contact: 'Formulário de contato',
      vip_subscribe: 'Lista VIP',
    },
  },
  madara: {
    name: 'MADARA',
    description: 'Bloqueio das operações da aplicação',
    scopes: {},
  },
  kaguya: {
    name: 'KAGUYA',
    description: 'Quarentena dos acessos da aplicação ao componente',
    scopes: {
      mercadopago: 'Mercado Pago',
      b2: 'Mídia protegida e Backblaze B2',
      supabase: 'Supabase',
      cloudflare: 'Cloudflare',
      email: 'E-mail',
    },
  },
} satisfies Record<ContainmentProtocol, { name: string; description: string; scopes: Record<string, string> }>;

interface ControlState {
  containment: ContainmentRecord[] | null;
  emergencyAccessVerified: boolean;
  recovery?: {
    at: string;
    vault?: { needsIntervention: number } | null;
    paidEmail?: { needsIntervention: number } | null;
    refunds?: { needsIntervention: number } | null;
    refundsPaused?: boolean;
  } | null;
}

interface ProtocolControlProps {
  initialProtocol?: ContainmentProtocol;
  onStateUpdated?: () => void;
}

export function ProtocolControl({ initialProtocol = 'itachi', onStateUpdated }: ProtocolControlProps = {}) {
  const [state, setState] = useState<ControlState | null>(null);
  const [selection, setSelection] = useState<ContainmentProtocol>(initialProtocol);
  const [scopes, setScopes] = useState<string[]>([]);
  const [incident, setIncident] = useState('');
  const [evidence, setEvidence] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSelection(initialProtocol);
  }, [initialProtocol]);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(getPublicApiUrl() + '/api/control/system', {
        credentials: 'include',
        cache: 'no-store',
        signal,
      });
      if (!response.ok) throw new Error();
      const result: ControlState = await response.json();
      if (!signal?.aborted) setState(result);
    } catch {
      if (!signal?.aborted) setState(null);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const current = state?.containment?.find((item) => item.protocol === selection);
  const isActive = current?.active === true;
  const allowed = state?.containment != null && (isActive || selection === 'itachi' || state.emergencyAccessVerified);
  const needsScope = !isActive && selection !== 'madara';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowed || saving) return;
    setSaving(true);
    setFeedback('');
    setFailed(false);
    try {
      const response = await fetch(getPublicApiUrl() + '/api/control/system', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_containment',
          confirmationPassword: password,
          containment: {
            protocol: selection,
            active: !isActive,
            incidentId: isActive ? current.incidentId : incident,
            evidence,
            scopes: isActive ? [] : scopes,
            expectedRevision: current?.revision ?? null,
          },
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.containment) throw new Error(result.error || 'Não foi possível gravar a contenção.');
      setState(
        (previous) =>
          previous && {
            ...previous,
            containment: [...(previous.containment || []).filter((row) => row.protocol !== selection), result.containment],
          },
      );
      setFeedback('Estado gravado. Verifique a aplicação do controle na superfície afetada.');
      setEvidence('');
      setScopes([]);
      setIncident('');
      onStateUpdated?.();
    } catch (error) {
      setFailed(true);
      setFeedback(error instanceof Error ? error.message : 'Controle indisponível.');
      await load();
    } finally {
      setPassword('');
      setSaving(false);
    }
  }

  const inputStyle =
    'w-full rounded-xl border border-white/[0.12] bg-black/50 px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-400/55 transition-colors';

  return (
    <section
      className="space-y-5 rounded-2xl border border-white/[0.09] bg-[#0c0f18]/92 backdrop-blur-md p-5 sm:p-6 text-zinc-200 shadow-[0_14px_32px_-20px_rgba(0,0,0,0.9)]"
      aria-labelledby="protocol-control-title"
    >
      {/* Cabeçalho + resumo em pílulas das 3 contenções */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.07]">
        <div>
          <h2 id="protocol-control-title" className="font-sans text-base font-semibold text-white tracking-tight">
            Resposta a incidentes
          </h2>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Acionamento e encerramento auditáveis com evidência obrigatória e reautenticação de senha PHDEV.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ul className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-mono">
            {Object.entries(protocolInfo).map(([id, protocol]) => {
              const record = state?.containment?.find((row) => row.protocol === id);
              const active = record?.active === true;
              const unavailable = state?.containment == null;
              return (
                <li
                  key={id}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
                    active
                      ? 'border-red-400/50 bg-red-500/20 text-red-100'
                      : unavailable
                        ? 'border-white/10 bg-black/40 text-zinc-400'
                        : 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      active ? 'bg-red-400' : unavailable ? 'bg-zinc-500' : 'bg-emerald-400'
                    }`}
                    aria-hidden="true"
                  />
                  <span>
                    {protocol.name} · {unavailable ? 'Estado indisponível' : active ? 'Ativo' : 'Inativo'}
                  </span>
                </li>
              );
            })}
          </ul>

          {state && (
            <a
              href="/monitoramento/"
              className="inline-flex items-center h-7 rounded-lg border border-white/12 bg-black/45 hover:bg-white/[0.09] px-2.5 text-[11px] text-zinc-300 hover:text-white transition-colors"
            >
              Abrir monitoramento
            </a>
          )}
        </div>
      </div>

      {/* Formulário alinhado em 2 colunas */}
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="grid gap-1.5 text-xs font-medium text-zinc-300">
            <span>Protocolo</span>
            <select
              className={inputStyle}
              value={selection}
              disabled={saving}
              onChange={(event) => {
                setSelection(event.target.value as ContainmentProtocol);
                setScopes([]);
                setEvidence('');
                setPassword('');
                setFeedback('');
              }}
            >
              {Object.entries(protocolInfo).map(([id, protocol]) => (
                <option key={id} value={id} className="bg-[#0c0f18] text-white">
                  {protocol.name} — {protocol.description}
                </option>
              ))}
            </select>
          </label>

          {allowed &&
            (isActive ? (
              <div className="rounded-xl border border-red-400/30 bg-red-950/25 px-3.5 py-2.5 flex flex-col justify-center">
                <span className="text-[10px] font-mono uppercase tracking-wider text-red-300/80">
                  Incidente em contenção
                </span>
                <p className="text-xs font-mono font-semibold text-white mt-0.5">
                  Incidente {current.incidentId}
                </p>
              </div>
            ) : (
              <label className="grid gap-1.5 text-xs font-medium text-zinc-300">
                <span>Identificador do incidente</span>
                <input
                  className={inputStyle}
                  placeholder="Ex.: INC-2026-091"
                  value={incident}
                  onChange={(event) => setIncident(event.target.value)}
                  required
                  pattern="[A-Za-z0-9][A-Za-z0-9_\-]{2,63}"
                />
              </label>
            ))}
        </div>

        {state?.containment == null && (
          <p className="rounded-xl border border-white/[0.08] bg-black/35 px-3.5 py-2.5 text-xs text-zinc-400">
            Consulta ao controle indisponível neste ambiente.
          </p>
        )}
        {state?.containment != null && !allowed && (
          <p className="rounded-xl border border-amber-400/30 bg-amber-950/25 px-3.5 py-2.5 text-xs text-amber-200">
            Valide o acesso emergencial do PHDEV antes de ativar este protocolo.
          </p>
        )}

        {allowed && (
          <fieldset disabled={saving} className="space-y-4">
            {needsScope && (
              <fieldset className="space-y-2">
                <legend className="text-xs font-medium text-zinc-300">Componente afetado</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {Object.entries(protocolInfo[selection].scopes).map(([value, label]) => {
                    const checked = scopes.includes(value);
                    return (
                      <label
                        key={value}
                        className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-xs transition-colors cursor-pointer ${
                          checked
                            ? 'border-red-400/50 bg-red-500/15 text-white'
                            : 'border-white/[0.09] bg-black/40 text-zinc-300 hover:border-white/[0.20]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded accent-red-500 cursor-pointer"
                          checked={checked}
                          onChange={(event) => {
                            setScopes(
                              event.target.checked
                                ? [...scopes, value]
                                : scopes.filter((item) => item !== value),
                            );
                          }}
                        />
                        <span className="truncate">{label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <label className="md:col-span-2 grid gap-1.5 text-xs font-medium text-zinc-300">
                <span>
                  {isActive
                    ? 'Evidência de recuperação e motivo do encerramento'
                    : 'Evidência do incidente e motivo da contenção'}
                </span>
                <textarea
                  rows={2}
                  className={inputStyle}
                  placeholder="Descreva evidência verificável (mínimo 12 caracteres)..."
                  value={evidence}
                  onChange={(event) => setEvidence(event.target.value)}
                  required
                  minLength={12}
                  maxLength={500}
                />
              </label>

              <label className="grid gap-1.5 text-xs font-medium text-zinc-300">
                <span>Senha do PHDEV</span>
                <input
                  className={inputStyle}
                  type="password"
                  autoComplete="current-password"
                  placeholder="Confirme sua senha PHDEV"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                className={`inline-flex items-center justify-center h-9 rounded-xl px-5 text-xs font-semibold text-white transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                  isActive
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-950/60'
                    : 'bg-red-600 hover:bg-red-500 shadow-md shadow-red-950/60'
                }`}
                type="submit"
                disabled={saving || (needsScope && scopes.length === 0)}
              >
                {saving ? 'Gravando…' : isActive ? 'Encerrar contenção' : 'Ativar contenção'}
              </button>

              {feedback && (
                <p
                  className={`text-xs ${failed ? 'text-rose-300' : 'text-emerald-300'}`}
                  role={failed ? 'alert' : 'status'}
                >
                  {feedback}
                </p>
              )}
            </div>
          </fieldset>
        )}

        {!allowed && feedback && (
          <p className={`text-xs ${failed ? 'text-rose-300' : 'text-zinc-300'}`} role={failed ? 'alert' : 'status'}>
            {feedback}
          </p>
        )}
      </form>
    </section>
  );
}
