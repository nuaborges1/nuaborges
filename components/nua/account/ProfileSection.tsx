'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { guardNumericKeyDown } from '@/lib/numericInput';
import {
  ChevronDown,
  Clock,
  Download,
  Laptop,
  Loader2,
  LogOut,
  Mail,
  MessageCircle,
  Shield,
  Smartphone,
  Trash2,
} from 'lucide-react';
import {
  anonymizeCustomerAccount,
  confirmEmailChange,
  exportCustomerData,
  fetchActiveSessions,
  NuaIdProfile,
  NuaIdSecurityEvent,
  NuaIdSessionInfo,
  requestEmailChange,
  revokeCustomerSessions,
  updateCustomerProfile,
} from '@/lib/nuaIdClient';

import { VaultBrowsers } from './VaultBrowsers';

interface ProfileSectionProps {
  profile: NuaIdProfile;
  onProfileUpdated: (profile: NuaIdProfile) => void;
  onLoggedOut: () => void;
}

const SECURITY_EVENT_LABELS: Record<string, string> = {
  login_otp: 'Novo acesso à conta',
  logout: 'Saída da conta',
  profile_update: 'Dados do perfil atualizados',
  email_change_requested: 'Alteração de e-mail solicitada',
  email_changed: 'E-mail alterado com sucesso',
  revoke_session: 'Dispositivo desconectado',
  revoke_other_sessions: 'Outros dispositivos desconectados',
  legacy_order_claimed: 'Compra anterior vinculada',
  order_bound_inline_checkout: 'Pedido vinculado no checkout',
};

function isMobileDeviceLabel(label: string): boolean {
  return /iphone|android|ipad|mobile/i.test(label || '');
}

export function ProfileSection({ profile, onProfileUpdated, onLoggedOut }: ProfileSectionProps) {
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [phoneMasked, setPhoneMasked] = useState(profile.phoneMasked || '');
  const [marketingOptIn, setMarketingOptIn] = useState(Boolean(profile.marketingOptIn));
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    setDisplayName(profile.displayName || '');
    setPhoneMasked(profile.phoneMasked || '');
    setMarketingOptIn(Boolean(profile.marketingOptIn));
  }, [profile.displayName, profile.phoneMasked, profile.marketingOptIn]);

  // Troca de e-mail dupla
  const [emailStep, setEmailStep] = useState<'idle' | 'codes'>('idle');
  const [newEmail, setNewEmail] = useState('');
  const [currentEmailCode, setCurrentEmailCode] = useState('');
  const [newEmailCode, setNewEmailCode] = useState('');
  const [emailMsg, setEmailMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);

  // Sessões e atividade de segurança
  const [sessions, setSessions] = useState<NuaIdSessionInfo[]>([]);
  const [recentEvents, setRecentEvents] = useState<NuaIdSecurityEvent[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

  // LGPD exportação e anonimização
  const [showAnon, setShowAnon] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [exportingLgpd, setExportingLgpd] = useState(false);
  const [anonymizing, setAnonymizing] = useState(false);
  const [lgpdMsg, setLgpdMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [showSecurityHistory, setShowSecurityHistory] = useState(false);

  const isProfileDirty =
    displayName !== (profile.displayName || '') ||
    phoneMasked !== (profile.phoneMasked || '') ||
    marketingOptIn !== Boolean(profile.marketingOptIn);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetchActiveSessions();
      if (res.ok && res.data?.success) {
        setSessions(res.data.sessions || []);
        setRecentEvents(res.data.recentEvents || []);
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
      const res = await updateCustomerProfile({
        displayName,
        phoneMasked: phoneMasked.trim() || null,
        marketingOptIn,
      });
      if (res.ok && res.data?.profile) {
        onProfileUpdated(res.data.profile);
        setProfileMsg({ tone: 'ok', text: 'Alterações salvas com sucesso.' });
      } else {
        setProfileMsg({ tone: 'err', text: res.data?.error || 'Não foi possível salvar.' });
      }
    } catch {
      setProfileMsg({ tone: 'err', text: 'Erro de conexão ao salvar preferências.' });
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
    } catch {
      setEmailMsg({ tone: 'err', text: 'Erro de conexão ao solicitar troca de e-mail.' });
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
    } catch {
      setEmailMsg({ tone: 'err', text: 'Erro de conexão ao confirmar alteração.' });
    } finally {
      setEmailBusy(false);
    }
  };

  const handleExportLgpd = async () => {
    setLgpdMsg(null);
    setExportingLgpd(true);
    try {
      const res = await exportCustomerData();
      if (res.ok && res.data?.data) {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meus-dados-nuaborges-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setLgpdMsg({ tone: 'ok', text: 'Arquivo com seus dados pessoais baixado.' });
      } else {
        setLgpdMsg({ tone: 'err', text: res.data?.error || 'Não foi possível gerar a cópia dos dados agora.' });
      }
    } catch {
      setLgpdMsg({ tone: 'err', text: 'Falha de conexão ao exportar seus dados.' });
    } finally {
      setExportingLgpd(false);
    }
  };

  const handleAnonymize = async (e: React.FormEvent) => {
    e.preventDefault();
    setLgpdMsg(null);
    setAnonymizing(true);
    try {
      const res = await anonymizeCustomerAccount(confirmText);
      if (res.ok && res.data?.success) {
        onLoggedOut();
      } else {
        setLgpdMsg({ tone: 'err', text: res.data?.error || 'Não foi possível encerrar a conta.' });
      }
    } catch {
      setLgpdMsg({ tone: 'err', text: 'Falha de conexão ao encerrar a conta.' });
    } finally {
      setAnonymizing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl leading-tight tracking-tight sm:text-3xl text-[#F5EEE9]">Meu Perfil e Segurança</h2>
        <p className="mt-1 text-xs text-zinc-400">
          Mantemos apenas os dados estritamente necessários para seus serviços e sua privacidade.
        </p>
      </div>

      {/* Dados básicos e preferências */}
      <form onSubmit={handleSaveProfile} className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#08080c] p-5 sm:p-6">
        <h3 className="font-serif text-base text-[#F5EEE9]">Dados da conta</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-name" className="mb-1.5 block text-xs text-zinc-400">
              Nome ou apelido de exibição
            </label>
            <input
              id="profile-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Como prefere ser chamado(a)"
              className="w-full min-h-[44px] rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-base sm:text-sm text-[#F5EEE9] placeholder:text-zinc-600 focus:border-[#90364B] focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-zinc-400">E-mail atual</label>
            <div className="flex min-h-[44px] items-center rounded-xl border border-white/[0.06] bg-black/55 px-3.5 py-2.5 text-sm text-zinc-300 truncate">
              {profile.email}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="profile-contact" className="mb-1.5 flex items-center gap-1.5 text-xs text-zinc-400">
              <MessageCircle className="h-3.5 w-3.5 text-[#C97A8D]" />
              WhatsApp ou @Telegram preferencial (opcional)
            </label>
            <input
              id="profile-contact"
              type="text"
              maxLength={60}
              value={phoneMasked}
              onChange={(e) => setPhoneMasked(e.target.value)}
              placeholder="Ex.: +55 11 99999-9999 ou @seuusuario"
              className="w-full min-h-[44px] rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-base sm:text-sm text-[#F5EEE9] placeholder:text-zinc-600 focus:border-[#90364B] focus:outline-none transition-colors"
            />
            <p className="mt-1 text-[11px] text-zinc-500">
              Usado apenas para facilitar o atendimento de Chamadas VIP e Personalizados.
            </p>
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.06] bg-black/55 p-3.5 transition-colors hover:border-white/[0.12]">
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

        {profileMsg && (
          <div
            role="status"
            className={`rounded-xl border px-3.5 py-2.5 text-xs ${
              profileMsg.tone === 'ok'
                ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-200'
                : 'border-rose-500/30 bg-rose-950/35 text-rose-200'
            }`}
          >
            {profileMsg.text}
          </div>
        )}

        <button
          type="submit"
          disabled={savingProfile || !isProfileDirty}
          className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full border border-white/10 bg-[#661C30] hover:bg-[#7A293D] hover:border-white/25 hover:shadow-[0_6px_26px_rgba(102,28,48,0.5)] active:scale-[0.985] px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#F5EEE9] shadow-[0_4px_20px_rgba(67,19,34,0.45)] transition-all duration-200 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
        >
          {savingProfile && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {savingProfile ? 'Salvando...' : isProfileDirty ? 'Salvar preferências' : 'Preferências salvas'}
        </button>
      </form>

      {/* Troca de e-mail com confirmação dupla */}
      <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#08080c] p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-[#C97A8D]" />
          <h3 className="font-serif text-base text-[#F5EEE9]">Alterar e-mail</h3>
        </div>
        <p className="text-xs text-zinc-400">
          Exige confirmação nos dois endereços. A troca de e-mail não transfere pedidos de outra conta automaticamente.
        </p>

        {emailMsg && (
          <div
            role="status"
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
              className="flex-1 min-h-[44px] rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-base sm:text-sm text-[#F5EEE9] placeholder:text-zinc-600 focus:border-[#90364B] focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={emailBusy}
              className="min-h-[44px] w-full sm:w-auto rounded-full border border-[#90364B]/50 bg-[#431322]/45 px-5 py-2.5 text-xs font-medium text-[#F5EEE9] transition-colors hover:bg-[#661C30] disabled:opacity-50 touch-manipulation cursor-pointer"
            >
              {emailBusy ? 'Enviando...' : 'Enviar códigos'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirmEmailChange} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] text-zinc-400">
                  Código enviado para <span className="text-zinc-200">{profile.email}</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={currentEmailCode}
                  onKeyDown={(e) => guardNumericKeyDown(e)}
                  onChange={(e) => setCurrentEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6 dígitos (e-mail atual)"
                  className="w-full min-h-[44px] rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 font-mono text-sm text-[#F5EEE9] placeholder:text-zinc-600 focus:border-[#90364B] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-zinc-400">
                  Código enviado para <span className="text-zinc-200">{newEmail.trim()}</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={newEmailCode}
                  onKeyDown={(e) => guardNumericKeyDown(e)}
                  onChange={(e) => setNewEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6 dígitos (novo e-mail)"
                  className="w-full min-h-[44px] rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 font-mono text-sm text-[#F5EEE9] placeholder:text-zinc-600 focus:border-[#90364B] focus:outline-none"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={emailBusy}
                className="min-h-[40px] rounded-full border border-white/10 bg-[#661C30] hover:bg-[#7A293D] hover:border-white/25 px-5 py-2 text-xs font-semibold text-[#F5EEE9] transition-all duration-200 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
              >
                {emailBusy ? 'Confirmando...' : 'Confirmar troca'}
              </button>
              <button
                type="button"
                disabled={emailBusy}
                onClick={handleRequestEmailChange}
                className="min-h-[40px] rounded-full border border-[#90364B]/45 bg-[#431322]/30 px-4 py-2 text-xs text-[#F5EEE9] transition-colors hover:bg-[#661C30]/50 disabled:opacity-45 cursor-pointer"
              >
                Reenviar códigos
              </button>
              <button
                type="button"
                onClick={() => setEmailStep('idle')}
                className="min-h-[40px] rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-400 transition-colors duration-200 hover:border-white/25 hover:bg-white/[0.05] hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Sessões ativas */}
      <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#08080c] p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#C97A8D]" />
              <h3 className="font-serif text-base text-[#F5EEE9]">Dispositivos conectados</h3>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              Sessões atualmente autenticadas na sua conta.
            </p>
          </div>
          {sessions.length > 1 && (
            <button
              type="button"
              disabled={revokingSessionId !== null}
              onClick={async () => {
                setRevokingSessionId('others');
                try {
                  await revokeCustomerSessions({ revokeOthers: true });
                  await loadSessions();
                } finally {
                  setRevokingSessionId(null);
                }
              }}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-xs text-zinc-300 transition-colors duration-200 hover:border-rose-400/50 hover:bg-rose-950/35 hover:text-rose-200 disabled:opacity-45 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Encerrar outros dispositivos
            </button>
          )}
        </div>

        {sessionsLoading ? (
          <div className="h-16 animate-pulse rounded-xl bg-black/55" />
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => {
              const MobileIcon = isMobileDeviceLabel(s.deviceLabel) ? Smartphone : Laptop;
              return (
                <div
                  key={s.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-white/[0.06] bg-black/55 px-4 py-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <MobileIcon className="h-4 w-4 shrink-0 text-zinc-500" />
                    <div>
                      <p className="text-[#F5EEE9]">
                        {s.deviceLabel}{' '}
                        {s.isCurrent && (
                          <span className="ml-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
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
                      disabled={revokingSessionId !== null}
                      onClick={async () => {
                        setRevokingSessionId(s.id);
                        try {
                          await revokeCustomerSessions({ sessionId: s.id });
                          await loadSessions();
                        } finally {
                          setRevokingSessionId(null);
                        }
                      }}
                      className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-full border border-rose-500/25 bg-rose-950/20 px-3.5 py-1.5 text-xs text-rose-200 transition-colors duration-200 hover:border-rose-400/50 hover:bg-rose-950/50 hover:text-rose-100 disabled:opacity-45 cursor-pointer"
                    >
                      {revokingSessionId === s.id && <Loader2 className="h-3 w-3 animate-spin" />}
                      Encerrar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Navegadores autorizados no Cofre */}
      <VaultBrowsers />

      {/* Histórico recente de segurança (colapsável para manter a página enxuta) */}
      {recentEvents.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#08080c] p-5 sm:p-6">
          <button
            type="button"
            aria-expanded={showSecurityHistory}
            onClick={() => setShowSecurityHistory((v) => !v)}
            className="flex w-full items-center justify-between gap-3 text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#C97A8D]" />
              <div>
                <h3 className="font-serif text-base text-[#F5EEE9]">Atividade recente de segurança</h3>
                <p className="text-[11px] text-zinc-500">
                  {recentEvents.slice(0, 8).length} registro(s) recente(s)
                </p>
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${
                showSecurityHistory ? 'rotate-180' : ''
              }`}
            />
          </button>
          {showSecurityHistory && (
            <ol className="mt-4 divide-y divide-white/[0.05] border-t border-white/[0.06] pt-2">
              {recentEvents.slice(0, 8).map((ev) => (
                <li
                  key={ev.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2.5 text-xs"
                >
                  <div className="text-zinc-200">
                    <span>{SECURITY_EVENT_LABELS[ev.action] || ev.action}</span>
                    {ev.deviceLabel && (
                      <span className="ml-1.5 text-[11px] text-zinc-500">· {ev.deviceLabel}</span>
                    )}
                  </div>
                  <time dateTime={ev.createdAt} className="text-[11px] tabular-nums text-zinc-500">
                    {new Date(ev.createdAt).toLocaleString('pt-BR')}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* Privacidade e LGPD */}
      <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#08080c] p-5 sm:p-6">
        <h3 className="font-serif text-base text-[#F5EEE9]">Privacidade e dados pessoais (LGPD)</h3>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            disabled={exportingLgpd}
            onClick={handleExportLgpd}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-white/10 bg-black/55 px-4 py-2 text-xs text-zinc-200 transition-colors hover:border-white/25 hover:text-white disabled:opacity-45 cursor-pointer"
          >
            {exportingLgpd ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {exportingLgpd ? 'Preparando cópia...' : 'Baixar cópia dos meus dados'}
          </button>
          <button
            type="button"
            onClick={() => setShowAnon((v) => !v)}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-950/20 px-4 py-2 text-xs text-rose-200 transition-colors hover:bg-rose-950/40 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Encerrar e anonimizar conta
          </button>
        </div>

        {lgpdMsg && (
          <div
            role="status"
            className={`rounded-xl border px-3.5 py-2.5 text-xs ${
              lgpdMsg.tone === 'ok'
                ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-200'
                : 'border-rose-500/30 bg-rose-950/35 text-rose-200'
            }`}
          >
            {lgpdMsg.text}
          </div>
        )}

        {showAnon && (
          <form onSubmit={handleAnonymize} className="space-y-3 rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4">
            <p className="text-xs leading-relaxed text-rose-100/90">
              Ao encerrar sua conta, seus dados identificáveis serão anonimizados e todas as sessões serão revogadas.
              Registros fiscais e financeiros obrigatórios são retidos sem dados pessoais pelo prazo legal.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='Digite "ENCERRAR CONTA" para confirmar'
              className="w-full min-h-[42px] rounded-xl border border-rose-500/30 bg-black/60 px-3.5 py-2 text-xs text-[#F5EEE9] placeholder:text-zinc-500 focus:border-rose-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={anonymizing || confirmText !== 'ENCERRAR CONTA'}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-rose-700 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-600 disabled:opacity-40 cursor-pointer"
            >
              {anonymizing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {anonymizing ? 'Anonimizando...' : 'Confirmar anonimização'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
