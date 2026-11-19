'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Download, Laptop, LogOut, Mail, Shield, Trash2 } from 'lucide-react';
import {
  anonymizeCustomerAccount,
  confirmEmailChange,
  exportCustomerData,
  fetchActiveSessions,
  NuaIdProfile,
  NuaIdSessionInfo,
  requestEmailChange,
  revokeCustomerSessions,
  updateCustomerProfile,
} from '@/lib/nuaIdClient';

interface ProfileSectionProps {
  profile: NuaIdProfile;
  onProfileUpdated: (profile: NuaIdProfile) => void;
  onLoggedOut: () => void;
}

export function ProfileSection({ profile, onProfileUpdated, onLoggedOut }: ProfileSectionProps) {
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [marketingOptIn, setMarketingOptIn] = useState(Boolean(profile.marketingOptIn));
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Troca de e-mail dupla
  const [emailStep, setEmailStep] = useState<'idle' | 'codes'>('idle');
  const [newEmail, setNewEmail] = useState('');
  const [currentEmailCode, setCurrentEmailCode] = useState('');
  const [newEmailCode, setNewEmailCode] = useState('');
  const [emailMsg, setEmailMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);

  // Sessões
  const [sessions, setSessions] = useState<NuaIdSessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // LGPD anonimização
  const [showAnon, setShowAnon] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [lgpdMsg, setLgpdMsg] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetchActiveSessions();
      if (res.ok && res.data?.success) {
        setSessions(res.data.sessions || []);
      }
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await updateCustomerProfile({ displayName, marketingOptIn });
      if (res.ok && res.data?.profile) {
        onProfileUpdated(res.data.profile);
        setProfileMsg('Alterações salvas com sucesso.');
      } else {
        setProfileMsg(res.data?.error || 'Não foi possível salvar.');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailBusy(true);
    setEmailMsg(null);
    try {
      const res = await requestEmailChange(newEmail);
      if (res.ok && res.data?.success) {
        setEmailStep('codes');
        setEmailMsg({ tone: 'ok', text: res.data.message || 'Códigos enviados para os dois e-mails.' });
      } else {
        setEmailMsg({ tone: 'err', text: res.data?.error || 'Não foi possível iniciar a troca.' });
      }
    } finally {
      setEmailBusy(false);
    }
  };

  const handleConfirmEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailBusy(true);
    setEmailMsg(null);
    try {
      const res = await confirmEmailChange(newEmail, currentEmailCode, newEmailCode);
      if (res.ok && res.data?.success) {
        onProfileUpdated({ ...profile, email: res.data.email || newEmail });
        setEmailStep('idle');
        setNewEmail('');
        setCurrentEmailCode('');
        setNewEmailCode('');
        setEmailMsg({ tone: 'ok', text: res.data.message || 'E-mail atualizado.' });
        loadSessions();
      } else {
        setEmailMsg({ tone: 'err', text: res.data?.error || 'Códigos inválidos.' });
      }
    } finally {
      setEmailBusy(false);
    }
  };

  const handleExportLgpd = async () => {
    setLgpdMsg(null);
    const res = await exportCustomerData();
    if (res.ok && res.data?.data) {
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meus-dados-nua-id-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setLgpdMsg('Arquivo com seus dados pessoais baixado.');
    }
  };

  const handleAnonymize = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await anonymizeCustomerAccount(confirmText);
    if (res.ok && res.data?.success) {
      onLoggedOut();
    } else {
      setLgpdMsg(res.data?.error || 'Não foi possível encerrar a conta.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl text-[#F5EEE9]">Meu Perfil e Segurança</h2>
        <p className="mt-1 text-xs text-zinc-400">
          Mantemos apenas os dados estritamente necessários para seus serviços.
        </p>
      </div>

      {/* Dados básicos e preferências */}
      <form onSubmit={handleSaveProfile} className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#151014] p-5">
        <h3 className="font-serif text-base text-[#F5EEE9]">Dados da conta</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-name" className="mb-1.5 block text-xs text-zinc-400">
              Nome de exibição
            </label>
            <input
              id="profile-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0b090c] px-3.5 py-2.5 text-sm text-[#F5EEE9] focus:border-[#90364B] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-zinc-400">E-mail atual</label>
            <div className="rounded-xl border border-white/[0.06] bg-[#0b090c]/60 px-3.5 py-2.5 text-sm text-zinc-300">
              {profile.email}
            </div>
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.06] bg-[#100c10] p-3.5">
          <input
            type="checkbox"
            checked={marketingOptIn}
            onChange={(e) => setMarketingOptIn(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#661C30]"
          />
          <span className="text-xs leading-relaxed text-zinc-300">
            <strong className="block text-[#F5EEE9]">Novidades e avisos promocionais (opcional)</strong>
            Separado das notificações transacionais obrigatórias (códigos de acesso, confirmações de pagamento, chamadas e entregas).
          </span>
        </label>

        {profileMsg && <p className="text-xs text-[#F5EEE9]/90">{profileMsg}</p>}

        <button
          type="submit"
          disabled={savingProfile}
          className="rounded-full bg-[#661C30] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#F5EEE9] transition-colors hover:bg-[#7A293D] disabled:opacity-50"
        >
          {savingProfile ? 'Salvando...' : 'Salvar preferências'}
        </button>
      </form>

      {/* Troca de e-mail com confirmação dupla */}
      <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#151014] p-5">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-[#A65B6C]" />
          <h3 className="font-serif text-base text-[#F5EEE9]">Alterar e-mail</h3>
        </div>
        <p className="text-xs text-zinc-400">
          Exige confirmação nos dois endereços. A troca de e-mail não transfere pedidos de outra conta automaticamente.
        </p>

        {emailMsg && (
          <div
            className={`rounded-xl border px-3.5 py-2.5 text-xs ${
              emailMsg.tone === 'ok'
                ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-200'
                : 'border-rose-500/30 bg-rose-950/35 text-rose-200'
            }`}
          >
            {emailMsg.text}
          </div>
        )}

        {emailStep === 'idle' ? (
          <form onSubmit={handleRequestEmailChange} className="flex flex-col gap-2.5 sm:flex-row">
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="novo@exemplo.com"
              className="flex-1 rounded-xl border border-white/10 bg-[#0b090c] px-3.5 py-2.5 text-sm text-[#F5EEE9] focus:border-[#90364B] focus:outline-none"
            />
            <button
              type="submit"
              disabled={emailBusy}
              className="rounded-full border border-[#90364B]/50 bg-[#431322]/45 px-5 py-2.5 text-xs font-medium text-[#F5EEE9] hover:bg-[#661C30] disabled:opacity-50"
            >
              {emailBusy ? 'Enviando...' : 'Enviar códigos'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirmEmailChange} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={currentEmailCode}
                onChange={(e) => setCurrentEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Código do e-mail atual"
                className="rounded-xl border border-white/10 bg-[#0b090c] px-3.5 py-2.5 font-mono text-sm text-[#F5EEE9]"
              />
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={newEmailCode}
                onChange={(e) => setNewEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Código do novo e-mail"
                className="rounded-xl border border-white/10 bg-[#0b090c] px-3.5 py-2.5 font-mono text-sm text-[#F5EEE9]"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={emailBusy}
                className="rounded-full bg-[#661C30] px-5 py-2 text-xs font-semibold text-[#F5EEE9] hover:bg-[#7A293D]"
              >
                Confirmar troca
              </button>
              <button
                type="button"
                onClick={() => setEmailStep('idle')}
                className="rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Sessões ativas */}
      <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#151014] p-5">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#A65B6C]" />
            <h3 className="font-serif text-base text-[#F5EEE9]">Sessões ativas</h3>
          </div>
          {sessions.length > 1 && (
            <button
              type="button"
              onClick={async () => {
                await revokeCustomerSessions({ revokeOthers: true });
                loadSessions();
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-xs text-zinc-300 hover:border-rose-400/40 hover:text-rose-200"
            >
              <LogOut className="h-3.5 w-3.5" />
              Encerrar outros dispositivos
            </button>
          )}
        </div>

        {sessionsLoading ? (
          <div className="h-16 animate-pulse rounded-xl bg-[#100c10]" />
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-[#100c10] px-4 py-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <Laptop className="h-4 w-4 text-zinc-500" />
                  <div>
                    <p className="text-[#F5EEE9]">
                      {s.deviceLabel}{' '}
                      {s.isCurrent && (
                        <span className="ml-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
                          Este dispositivo
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Última atividade: {new Date(s.lastSeenAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                {!s.isCurrent && (
                  <button
                    type="button"
                    onClick={async () => {
                      await revokeCustomerSessions({ sessionId: s.id });
                      loadSessions();
                    }}
                    className="text-rose-300 hover:text-rose-200"
                  >
                    Encerrar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Privacidade e LGPD */}
      <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#151014] p-5">
        <h3 className="font-serif text-base text-[#F5EEE9]">Privacidade e dados pessoais (LGPD)</h3>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handleExportLgpd}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-200 hover:border-white/25 hover:text-white"
          >
            <Download className="h-3.5 w-3.5" />
            Baixar cópia dos meus dados
          </button>
          <button
            type="button"
            onClick={() => setShowAnon((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-950/20 px-4 py-2 text-xs text-rose-200 hover:bg-rose-950/40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Encerrar e anonimizar conta
          </button>
        </div>

        {lgpdMsg && <p className="text-xs text-zinc-300">{lgpdMsg}</p>}

        {showAnon && (
          <form onSubmit={handleAnonymize} className="space-y-3 rounded-xl border border-rose-500/30 bg-rose-950/20 p-4">
            <p className="text-xs leading-relaxed text-rose-100/90">
              Ao encerrar sua conta, seus dados identificáveis serão anonimizados e todas as sessões serão revogadas.
              Registros fiscais e financeiros obrigatórios são retidos sem dados pessoais pelo prazo legal.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='Digite "ENCERRAR CONTA" para confirmar'
              className="w-full rounded-xl border border-rose-500/30 bg-[#0b090c] px-3.5 py-2 text-xs text-[#F5EEE9]"
            />
            <button
              type="submit"
              disabled={confirmText !== 'ENCERRAR CONTA'}
              className="rounded-full bg-rose-700 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-40"
            >
              Confirmar anonimização
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
