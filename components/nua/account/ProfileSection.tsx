'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { guardNumericKeyDown } from '@/lib/numericInput';
import {
  Check,
  ChevronDown,
  Clock,
  Download,
  Globe,
  Laptop,
  Loader2,
  Lock,
  LogOut,
  MessageCircle,
  Shield,
  Smartphone,
  Trash2,
  User,
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
import { getPublicApiUrl } from '@/lib/contentStore';
import type { ProfileSubTab } from '@/lib/accountRoutes';

interface BrowserDevice {
  id: string;
  label: string;
  expires: number;
}

interface ProfileSectionProps {
  profile: NuaIdProfile;
  activeSubTab?: ProfileSubTab;
  onChangeSubTab?: (sub: ProfileSubTab) => void;
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

export function ProfileSection({
  profile,
  activeSubTab,
  onChangeSubTab,
  onProfileUpdated,
  onLoggedOut,
}: ProfileSectionProps) {
  const [localSubTab, setLocalSubTab] = useState<ProfileSubTab>('dados');
  const subTab = activeSubTab ?? localSubTab;
  const setSubTab = (next: ProfileSubTab) => {
    if (onChangeSubTab) onChangeSubTab(next);
    else setLocalSubTab(next);
  };

  // Dados da conta
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

  // Troca de e-mail inline (expande sob demanda junto ao próprio e-mail)
  const [emailStep, setEmailStep] = useState<'closed' | 'input' | 'codes'>('closed');
  const [newEmail, setNewEmail] = useState('');
  const [currentEmailCode, setCurrentEmailCode] = useState('');
  const [newEmailCode, setNewEmailCode] = useState('');
  const [emailMsg, setEmailMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);

  // Sessões e acessos unificados (conta + mídias do Cofre)
  const [sessions, setSessions] = useState<NuaIdSessionInfo[]>([]);
  const [recentEvents, setRecentEvents] = useState<NuaIdSecurityEvent[]>([]);
  const [vaultDevices, setVaultDevices] = useState<BrowserDevice[]>([]);
  const [securityLoading, setSecurityLoading] = useState(true);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [showSecurityHistory, setShowSecurityHistory] = useState(false);

  // Privacidade / LGPD
  const [showAnon, setShowAnon] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [exportingLgpd, setExportingLgpd] = useState(false);
  const [anonymizing, setAnonymizing] = useState(false);
  const [lgpdMsg, setLgpdMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const isProfileDirty =
    displayName !== (profile.displayName || '') ||
    phoneMasked !== (profile.phoneMasked || '') ||
    marketingOptIn !== Boolean(profile.marketingOptIn);

  const loadSecurityData = useCallback(async () => {
    setSecurityLoading(true);
    setSecurityError(null);
    try {
      const [sessionsRes, vaultRes] = await Promise.all([
        fetchActiveSessions(),
        fetch(`${getPublicApiUrl()}/api/me/cofre`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'devices' }),
        })
          .then((r) => (r.ok ? r.json().catch(() => ({} as { devices?: BrowserDevice[] })) : ({} as { devices?: BrowserDevice[] })))
          .catch(() => ({} as { devices?: BrowserDevice[] })),
      ]);

      if (sessionsRes.ok && sessionsRes.data?.success) {
        setSessions(sessionsRes.data.sessions || []);
        setRecentEvents(sessionsRes.data.recentEvents || []);
      }
      if (Array.isArray(vaultRes?.devices)) {
        setVaultDevices(vaultRes.devices);
      }
    } catch {
      setSecurityError('Não foi possível carregar os dados de segurança agora.');
    } finally {
      setSecurityLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSecurityData();
  }, [loadSecurityData]);

  // Correlaciona sessões e navegadores autorizados no Cofre para evitar exibir "Chrome em Windows" em dois cards distintos
  const { unifiedSessions, standaloneVaultDevices } = useMemo(() => {
    const remainingVault = [...vaultDevices];
    const matched = sessions.map((session) => {
      const idx = remainingVault.findIndex(
        (d) => d.label.trim().toLowerCase() === session.deviceLabel.trim().toLowerCase()
      );
      const vaultDevice = idx >= 0 ? remainingVault.splice(idx, 1)[0] : null;
      return { session, vaultDevice };
    });
    return { unifiedSessions: matched, standaloneVaultDevices: remainingVault };
  }, [sessions, vaultDevices]);

  const handleRevokeVaultDevice = async (deviceId: string) => {
    setRevokingId(`vault:${deviceId}`);
    setSecurityError(null);
    try {
      const response = await fetch(`${getPublicApiUrl()}/api/me/cofre`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke', id: deviceId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(data.devices)) {
        setSecurityError('Não foi possível revogar a autorização de mídia deste navegador.');
        return;
      }
      setVaultDevices(data.devices);
    } catch {
      setSecurityError('Falha de conexão ao revogar navegador autorizado.');
    } finally {
      setRevokingId(null);
    }
  };

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
        setEmailStep('closed');
        setNewEmail('');
        setCurrentEmailCode('');
        setNewEmailCode('');
        setEmailMsg({ tone: 'ok', text: res.data.message || 'E-mail atualizado com sucesso.' });
        void loadSecurityData();
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
      {/* 3 sub-abas organizadas: Dados · Segurança · Privacidade */}
      <div
        role="tablist"
        aria-label="Seções do perfil"
        className="inline-flex flex-wrap items-center gap-1 rounded-full border border-white/[0.08] bg-[#08080c] p-1"
      >
        {[
          { id: 'dados' as const, label: 'Dados', icon: User },
          { id: 'seguranca' as const, label: 'Segurança', icon: Shield },
          { id: 'privacidade' as const, label: 'Privacidade', icon: Lock },
        ].map(({ id, label, icon: Icon }) => {
          const active = subTab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSubTab(id)}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-4 text-xs transition-colors cursor-pointer touch-manipulation ${
                active
                  ? 'border border-[#90364B]/50 bg-[#661C30]/40 font-medium text-[#F5EEE9]'
                  : 'border border-transparent text-zinc-400 hover:text-zinc-100'
              }`}
            >
              <Icon className={`size-3.5 ${active ? 'text-[#90364B]' : 'text-zinc-500'}`} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-ABA 1: DADOS */}
      {subTab === 'dados' && (
        <div className="max-w-2xl space-y-6 rounded-[24px] border border-white/[0.08] bg-[#08080c] p-6 sm:p-7">
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div>
              <label htmlFor="profile-name" className="mb-1.5 block text-xs font-medium text-zinc-300">
                Nome ou apelido de exibição
              </label>
              <input
                id="profile-name"
                type="text"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setProfileMsg(null);
                }}
                placeholder="Como prefere ser chamado(a)"
                className="w-full min-h-[44px] rounded-xl border border-white/[0.1] bg-black/60 px-3.5 py-2.5 text-base sm:text-sm text-[#F5EEE9] placeholder:text-zinc-500 focus:border-[#90364B] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label htmlFor="profile-contact" className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                <MessageCircle className="size-3.5 text-[#90364B]" />
                <span>WhatsApp ou @Telegram preferencial (opcional)</span>
              </label>
              <input
                id="profile-contact"
                type="text"
                maxLength={60}
                value={phoneMasked}
                onChange={(e) => {
                  setPhoneMasked(e.target.value);
                  setProfileMsg(null);
                }}
                placeholder="Ex.: +55 11 99999-9999 ou @seuusuario"
                className="w-full min-h-[44px] rounded-xl border border-white/[0.1] bg-black/60 px-3.5 py-2.5 text-base sm:text-sm text-[#F5EEE9] placeholder:text-zinc-500 focus:border-[#90364B] focus:outline-none transition-colors"
              />
              <p className="mt-1.5 text-xs text-zinc-500">
                Usado apenas para facilitar o atendimento de Chamadas VIP e Personalizados.
              </p>
            </div>

            {/* Toggle Switch editorial customizado em vinho (elimina checkbox branco nativo) */}
            <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/[0.06] bg-black/45 p-4">
              <div className="space-y-0.5">
                <p id="marketing-switch-label" className="text-xs font-medium text-[#F5EEE9]">
                  Novidades e avisos promocionais
                </p>
                <p className="text-xs leading-relaxed text-zinc-400">
                  Opcional e separado das notificações de compra, chamadas e entregas.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={marketingOptIn}
                aria-labelledby="marketing-switch-label"
                onClick={() => {
                  setMarketingOptIn((v) => !v);
                  setProfileMsg(null);
                }}
                className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors cursor-pointer touch-manipulation ${
                  marketingOptIn
                    ? 'border-[#90364B] bg-[#661C30]'
                    : 'border-white/15 bg-white/[0.08]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-block size-4 rounded-full bg-[#F5EEE9] transition-transform duration-200 ${
                    marketingOptIn ? 'translate-x-5.5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {profileMsg && (
              <div
                role="status"
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs ${
                  profileMsg.tone === 'ok'
                    ? 'border-emerald-500/30 bg-emerald-950/25 text-emerald-200'
                    : 'border-red-500/30 bg-red-950/30 text-red-200'
                }`}
              >
                {profileMsg.tone === 'ok' && <Check className="size-3.5 text-emerald-400" />}
                <span>{profileMsg.text}</span>
              </div>
            )}

            {isProfileDirty && (
              <div className="flex items-center gap-3 pt-1">
                <button type="submit" disabled={savingProfile} className="btn-primary !min-h-[42px] !px-6">
                  {savingProfile && <Loader2 className="size-3.5 animate-spin" />}
                  <span>{savingProfile ? 'Salvando…' : 'Salvar alterações'}</span>
                </button>
                <button
                  type="button"
                  disabled={savingProfile}
                  onClick={() => {
                    setDisplayName(profile.displayName || '');
                    setPhoneMasked(profile.phoneMasked || '');
                    setMarketingOptIn(Boolean(profile.marketingOptIn));
                    setProfileMsg(null);
                  }}
                  className="text-xs text-zinc-400 transition-colors hover:text-[#F5EEE9] cursor-pointer"
                >
                  Descartar
                </button>
              </div>
            )}
          </form>

          {/* E-mail único com troca inline sob demanda */}
          <div className="border-t border-white/[0.06] pt-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-400">E-mail de acesso</p>
                <p className="mt-0.5 truncate text-sm text-[#F5EEE9]">{profile.email}</p>
              </div>
              {emailStep === 'closed' && (
                <button
                  type="button"
                  onClick={() => {
                    setEmailStep('input');
                    setEmailMsg(null);
                  }}
                  className="text-xs font-medium text-[#F5EEE9]/80 transition-colors hover:text-[#F5EEE9] cursor-pointer"
                >
                  Alterar e-mail
                </button>
              )}
            </div>

            {emailMsg && (
              <div
                role="status"
                className={`rounded-xl border px-3.5 py-2.5 text-xs ${
                  emailMsg.tone === 'ok'
                    ? 'border-emerald-500/30 bg-emerald-950/25 text-emerald-200'
                    : 'border-red-500/30 bg-red-950/30 text-red-200'
                }`}
              >
                {emailMsg.text}
              </div>
            )}

            {emailStep === 'input' && (
              <form onSubmit={handleRequestEmailChange} className="space-y-3 rounded-2xl border border-white/[0.06] bg-black/45 p-4">
                <p className="text-xs leading-relaxed text-zinc-400">
                  Enviaremos códigos de confirmação para o e-mail atual e para o novo endereço.
                </p>
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="novo@exemplo.com"
                    className="flex-1 min-h-[42px] rounded-xl border border-white/[0.1] bg-[#08080c] px-3.5 py-2 text-base sm:text-sm text-[#F5EEE9] placeholder:text-zinc-500 focus:border-[#90364B] focus:outline-none"
                  />
                  <button type="submit" disabled={emailBusy} className="btn-primary !min-h-[42px] !px-5 !text-[11px]">
                    {emailBusy ? 'Enviando…' : 'Enviar códigos'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailStep('closed');
                      setEmailMsg(null);
                    }}
                    className="inline-flex min-h-[42px] items-center justify-center px-3 text-xs text-zinc-400 hover:text-[#F5EEE9] cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {emailStep === 'codes' && (
              <form onSubmit={handleConfirmEmailChange} className="space-y-3 rounded-2xl border border-white/[0.06] bg-black/45 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-zinc-400">
                      Código para <span className="text-zinc-200">{profile.email}</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      value={currentEmailCode}
                      onKeyDown={(e) => guardNumericKeyDown(e)}
                      onChange={(e) => setCurrentEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6 dígitos"
                      className="w-full min-h-[42px] rounded-xl border border-white/[0.1] bg-[#08080c] px-3.5 py-2 font-mono text-sm text-[#F5EEE9] placeholder:text-zinc-500 focus:border-[#90364B] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-zinc-400">
                      Código para <span className="text-zinc-200">{newEmail.trim()}</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      value={newEmailCode}
                      onKeyDown={(e) => guardNumericKeyDown(e)}
                      onChange={(e) => setNewEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6 dígitos"
                      className="w-full min-h-[42px] rounded-xl border border-white/[0.1] bg-[#08080c] px-3.5 py-2 font-mono text-sm text-[#F5EEE9] placeholder:text-zinc-500 focus:border-[#90364B] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="submit" disabled={emailBusy} className="btn-primary !min-h-[40px] !px-5 !text-[11px]">
                    {emailBusy ? 'Confirmando…' : 'Confirmar troca'}
                  </button>
                  <button
                    type="button"
                    disabled={emailBusy}
                    onClick={handleRequestEmailChange}
                    className="btn-ghost !min-h-[40px] !px-4 !text-[11px]"
                  >
                    Reenviar códigos
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailStep('closed')}
                    className="inline-flex min-h-[40px] items-center px-3 text-xs text-zinc-400 hover:text-[#F5EEE9] cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* SUB-ABA 2: SEGURANÇA (Sessões + Cofre unificados, zero duplicação de Chrome em Windows!) */}
      {subTab === 'seguranca' && (
        <div className="max-w-3xl space-y-5">
          <div className="space-y-4 rounded-[24px] border border-white/[0.08] bg-[#08080c] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl font-normal text-[#F5EEE9]">Sessões e acessos</h2>
                <p className="mt-1 text-xs text-zinc-400">
                  Dispositivos conectados à sua conta e autorizações ativas para visualização de mídias protegidas.
                </p>
              </div>
              {sessions.length > 1 && (
                <button
                  type="button"
                  disabled={revokingId !== null}
                  onClick={async () => {
                    setRevokingId('others');
                    try {
                      await revokeCustomerSessions({ revokeOthers: true });
                      await loadSecurityData();
                    } finally {
                      setRevokingId(null);
                    }
                  }}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-white/[0.1] px-3.5 text-xs text-zinc-300 transition-colors hover:border-red-400/50 hover:bg-red-950/35 hover:text-red-200 disabled:opacity-45 cursor-pointer"
                >
                  <LogOut className="size-3.5" />
                  <span>Encerrar outros</span>
                </button>
              )}
            </div>

            {securityError && (
              <div role="alert" className="rounded-xl border border-red-500/30 bg-red-950/30 px-3.5 py-2.5 text-xs text-red-200">
                {securityError}
              </div>
            )}

            {securityLoading ? (
              <div className="h-20 rounded-xl bg-white/[0.03]" />
            ) : unifiedSessions.length === 0 && standaloneVaultDevices.length === 0 ? (
              <p className="text-xs text-zinc-400">Nenhuma sessão ativa registrada.</p>
            ) : (
              <div className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.06] bg-black/40">
                {unifiedSessions.map(({ session, vaultDevice }) => {
                  const MobileIcon = isMobileDeviceLabel(session.deviceLabel) ? Smartphone : Laptop;
                  return (
                    <div
                      key={session.id}
                      className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <MobileIcon className="mt-0.5 size-4 shrink-0 text-[#90364B]" />
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm text-[#F5EEE9]">{session.deviceLabel}</p>
                            {session.isCurrent && (
                              <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
                                Este dispositivo
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500">
                            Última atividade: {new Date(session.lastSeenAt).toLocaleString('pt-BR')}
                          </p>
                          {vaultDevice && (
                            <p className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                              <Lock className="size-3 text-[#90364B]" />
                              <span>
                                Mídias protegidas autorizadas até{' '}
                                {new Date(vaultDevice.expires).toLocaleDateString('pt-BR')}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {vaultDevice && (
                          <button
                            type="button"
                            disabled={revokingId !== null}
                            onClick={() => void handleRevokeVaultDevice(vaultDevice.id)}
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.02] px-3.5 text-xs text-zinc-300 transition-colors hover:border-red-400/45 hover:text-red-200 disabled:opacity-45 cursor-pointer"
                          >
                            {revokingId === `vault:${vaultDevice.id}` && <Loader2 className="size-3 animate-spin" />}
                            <span>Revogar mídias</span>
                          </button>
                        )}
                        {!session.isCurrent && (
                          <button
                            type="button"
                            disabled={revokingId !== null}
                            onClick={async () => {
                              setRevokingId(session.id);
                              try {
                                await revokeCustomerSessions({ sessionId: session.id });
                                await loadSecurityData();
                              } finally {
                                setRevokingId(null);
                              }
                            }}
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-red-500/25 bg-red-950/20 px-3.5 text-xs text-red-200 transition-colors hover:border-red-400/50 hover:bg-red-950/45 disabled:opacity-45 cursor-pointer"
                          >
                            {revokingId === session.id && <Loader2 className="size-3 animate-spin" />}
                            <span>Encerrar sessão</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {standaloneVaultDevices.map((d) => (
                  <div key={d.id} className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 items-start gap-3">
                      <Globe className="mt-0.5 size-4 shrink-0 text-zinc-500" />
                      <div className="min-w-0 space-y-0.5">
                        <p className="truncate text-sm text-[#F5EEE9]">{d.label}</p>
                        <p className="text-xs text-zinc-500">
                          Acesso a mídias válido até {new Date(d.expires).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={revokingId !== null}
                      onClick={() => void handleRevokeVaultDevice(d.id)}
                      className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full border border-red-500/25 bg-red-950/20 px-3.5 text-xs text-red-200 transition-colors hover:border-red-400/50 hover:bg-red-950/45 disabled:opacity-45 cursor-pointer"
                    >
                      {revokingId === `vault:${d.id}` && <Loader2 className="size-3 animate-spin" />}
                      <span>Revogar</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Atividade recente */}
          {recentEvents.length > 0 && (
            <div className="rounded-[24px] border border-white/[0.08] bg-[#08080c] p-5 sm:p-6">
              <button
                type="button"
                aria-expanded={showSecurityHistory}
                onClick={() => setShowSecurityHistory((v) => !v)}
                className="flex w-full items-center justify-between gap-3 text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="size-4 text-[#90364B]" />
                  <div>
                    <h3 className="font-serif text-lg font-normal text-[#F5EEE9]">Atividade recente</h3>
                    <p className="text-xs text-zinc-500">{recentEvents.slice(0, 8).length} registro(s)</p>
                  </div>
                </div>
                <ChevronDown
                  className={`size-4 text-zinc-400 transition-transform duration-200 ${
                    showSecurityHistory ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {showSecurityHistory && (
                <ol className="mt-4 divide-y divide-white/[0.05] border-t border-white/[0.06] pt-2">
                  {recentEvents.slice(0, 8).map((ev) => (
                    <li
                      key={ev.id}
                      className="flex flex-col justify-between gap-1 py-2.5 text-xs sm:flex-row sm:items-center"
                    >
                      <div className="text-zinc-200">
                        <span>{SECURITY_EVENT_LABELS[ev.action] || ev.action}</span>
                        {ev.deviceLabel && <span className="ml-1.5 text-zinc-500">· {ev.deviceLabel}</span>}
                      </div>
                      <time dateTime={ev.createdAt} className="tabular-nums text-zinc-500">
                        {new Date(ev.createdAt).toLocaleString('pt-BR')}
                      </time>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUB-ABA 3: PRIVACIDADE (LGPD e ações sensíveis claramente separadas) */}
      {subTab === 'privacidade' && (
        <div className="max-w-2xl space-y-6 rounded-[24px] border border-white/[0.08] bg-[#08080c] p-6 sm:p-7">
          <div className="space-y-3">
            <h2 className="font-serif text-xl font-normal text-[#F5EEE9]">Cópia dos seus dados (LGPD)</h2>
            <p className="text-sm leading-relaxed text-zinc-400">
              Baixe um arquivo em formato JSON contendo todos os dados pessoais e registros vinculados à sua conta.
            </p>
            <button
              type="button"
              disabled={exportingLgpd}
              onClick={handleExportLgpd}
              className="btn-ghost !min-h-[42px] !px-5 !text-[11px]"
            >
              {exportingLgpd ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5 text-[#90364B]" />
              )}
              <span>{exportingLgpd ? 'Preparando cópia…' : 'Baixar cópia dos meus dados'}</span>
            </button>
          </div>

          {lgpdMsg && (
            <div
              role="status"
              className={`rounded-xl border px-3.5 py-2.5 text-xs ${
                lgpdMsg.tone === 'ok'
                  ? 'border-emerald-500/30 bg-emerald-950/25 text-emerald-200'
                  : 'border-red-500/30 bg-red-950/30 text-red-200'
              }`}
            >
              {lgpdMsg.text}
            </div>
          )}

          <div className="section-divider" />

          <div className="space-y-3">
            <h3 className="font-serif text-lg font-normal text-[#F5EEE9]">Encerrar conta</h3>
            <p className="text-xs leading-relaxed text-zinc-400">
              Seus dados identificáveis serão anonimizados e todas as sessões serão encerradas imediatamente.
              Registros fiscais e financeiros obrigatórios são mantidos sem dados pessoais pelo prazo legal.
            </p>

            {!showAnon ? (
              <button
                type="button"
                onClick={() => setShowAnon(true)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-red-500/30 bg-red-950/20 px-4 text-xs text-red-200 transition-colors hover:border-red-400/50 hover:bg-red-950/40 cursor-pointer"
              >
                <Trash2 className="size-3.5" />
                <span>Solicitar encerramento e anonimização</span>
              </button>
            ) : (
              <form
                onSubmit={handleAnonymize}
                className="space-y-3 rounded-2xl border border-red-500/30 bg-red-950/20 p-4"
              >
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder='Digite "ENCERRAR CONTA" para confirmar'
                  className="w-full min-h-[42px] rounded-xl border border-red-500/30 bg-black/60 px-3.5 py-2 text-base sm:text-xs text-[#F5EEE9] placeholder:text-zinc-500 focus:border-red-400 focus:outline-none"
                />
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="submit"
                    disabled={anonymizing || confirmText !== 'ENCERRAR CONTA'}
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-red-700 px-5 text-xs font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-40 cursor-pointer"
                  >
                    {anonymizing && <Loader2 className="size-3.5 animate-spin" />}
                    <span>{anonymizing ? 'Anonimizando…' : 'Confirmar anonimização'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAnon(false);
                      setConfirmText('');
                    }}
                    className="text-xs text-zinc-400 hover:text-[#F5EEE9] cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
