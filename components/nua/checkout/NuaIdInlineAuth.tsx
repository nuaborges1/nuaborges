'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import {
  fetchCustomerSession,
  NuaIdProfile,
  requestLoginCode,
  verifyLoginCode,
} from '@/lib/nuaIdClient';
import { GUEST_CHECKOUT_ENABLED, NUA_ID_CHECKOUT_ENABLED } from '@/lib/featureFlags';

interface NuaIdInlineAuthProps {
  onAuthenticated: (profile: NuaIdProfile) => void;
  onContinueAsGuest?: () => void;
  initialEmail?: string;
}

/**
 * Identificação inline no checkout sem etapa extra:
 * - Se o cliente já está autenticado, reconhece imediatamente sem pedir dados repetidos.
 * - Caso contrário, pede o e-mail e valida o código de 6 dígitos ali mesmo (criando a conta implicitamente).
 * - Preserva "Continuar como visitante" atrás da feature flag `GUEST_CHECKOUT_ENABLED` (Invariante 7).
 */
export function NuaIdInlineAuth({
  onAuthenticated,
  onContinueAsGuest,
  initialEmail = '',
}: NuaIdInlineAuthProps) {
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState<NuaIdProfile | null>(null);
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!NUA_ID_CHECKOUT_ENABLED) {
      setChecking(false);
      return;
    }
    let mounted = true;
    fetchCustomerSession()
      .then((res) => {
        if (!mounted) return;
        if (res.ok && res.data?.authenticated && res.data.profile) {
          setProfile(res.data.profile);
          onAuthenticated(res.data.profile);
        }
      })
      .finally(() => {
        if (mounted) setChecking(false);
      });
    return () => {
      mounted = false;
    };
  }, [onAuthenticated]);

  if (!NUA_ID_CHECKOUT_ENABLED) return null;

  if (checking) {
    return (
      <div className="h-14 animate-pulse rounded-xl border border-white/[0.08] bg-[#171115]/70" />
    );
  }

  if (profile) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-4 py-3 text-xs">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <div>
            <p className="font-medium text-[#F5EEE9]">Conectado como {profile.displayName}</p>
            <p className="text-[11px] text-zinc-400">
              {profile.email} · Este pedido ficará salvo automaticamente em Minha NUA.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await requestLoginCode(email.trim());
      if (!res.ok || !res.data?.success) {
        setError(res.data?.error || 'Não foi possível enviar o código.');
        return;
      }
      setStep('code');
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await verifyLoginCode(email.trim(), code.replace(/\D/g, '').slice(0, 6));
      if (!res.ok || !res.data?.profile) {
        setError(res.data?.error || 'Código inválido ou expirado.');
        return;
      }
      setProfile(res.data.profile);
      onAuthenticated(res.data.profile);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-[#7A293D]/40 bg-[#171115]/85 p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-[#F5EEE9]">
        <ShieldCheck className="h-4 w-4 text-[#A65B6C]" />
        <span>Identifique-se com seu NUA ID para salvar a compra na sua área privativa</span>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-950/35 px-3 py-2 text-[11px] text-rose-200">
          {error}
        </div>
      )}

      {step === 'email' ? (
        <form onSubmit={handleSendCode} className="flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1 min-w-0">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Seu melhor e-mail"
              className="w-full min-h-[44px] rounded-xl border border-white/10 bg-[#0b090c] py-2.5 pl-9 pr-3 text-base sm:text-xs text-[#F5EEE9] placeholder:text-zinc-600 focus:border-[#90364B] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full sm:w-auto min-h-[44px] shrink-0 rounded-full bg-[#661C30] px-5 py-2.5 text-xs sm:text-[11px] font-semibold uppercase tracking-wider text-[#F5EEE9] hover:bg-[#7A293D] disabled:opacity-50 touch-manipulation"
          >
            {busy ? 'Enviando...' : 'Receber código'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1 min-w-0">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Código de 6 dígitos"
              className="w-full min-h-[44px] rounded-xl border border-white/10 bg-[#0b090c] py-2.5 pl-9 pr-3 font-mono text-base sm:text-xs tracking-[0.25em] text-[#F5EEE9] focus:border-[#90364B] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={busy || code.length < 6}
            className="w-full sm:w-auto min-h-[44px] shrink-0 rounded-full bg-[#661C30] px-5 py-2.5 text-xs sm:text-[11px] font-semibold uppercase tracking-wider text-[#F5EEE9] hover:bg-[#7A293D] disabled:opacity-50 touch-manipulation"
          >
            {busy ? 'Validando...' : 'Confirmar'}
          </button>
        </form>
      )}

      {GUEST_CHECKOUT_ENABLED && onContinueAsGuest && (
        <div className="pt-1 text-right">
          <button
            type="button"
            onClick={onContinueAsGuest}
            className="text-[11px] text-zinc-400 underline underline-offset-2 hover:text-zinc-200"
          >
            Continuar como visitante (temporário)
          </button>
        </div>
      )}
    </div>
  );
}
