'use client';

import React, { useState, useEffect, useRef } from 'react';
import { guardNumericKeyDown } from '@/lib/numericInput';
import { ArrowLeft, CheckCircle2, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import {
  fetchCustomerSession,
  NUA_ID_SESSION_EVENT,
  NuaIdProfile,
  requestLoginCode,
  verifyLoginCode,
} from '@/lib/nuaIdClient';
import { GUEST_CHECKOUT_ENABLED, NUA_ID_CHECKOUT_ENABLED } from '@/lib/featureFlags';
import { TURNSTILE_SITE_KEY, TurnstileWidget } from '@/components/nua/account/TurnstileWidget';

interface NuaIdInlineAuthProps {
  onAuthenticated: (profile: NuaIdProfile) => void;
  required?: boolean;
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
  required = false,
  initialEmail = '',
}: NuaIdInlineAuthProps) {
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState<NuaIdProfile | null>(null);
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>(undefined);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [resendCooldown]);

  const onAuthRef = useRef(onAuthenticated);
  useEffect(() => {
    onAuthRef.current = onAuthenticated;
  }, [onAuthenticated]);

  useEffect(() => {
    if (!required && !NUA_ID_CHECKOUT_ENABLED) {
      setChecking(false);
      return;
    }
    let mounted = true;
    const syncSession = () => {
      fetchCustomerSession()
        .then((res) => {
          if (!mounted) return;
          if (res.ok && res.data?.authenticated && res.data.profile) {
            setProfile(res.data.profile);
            onAuthRef.current(res.data.profile);
          } else {
            setProfile(null);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (mounted) setChecking(false);
        });
    };
    syncSession();
    window.addEventListener(NUA_ID_SESSION_EVENT, syncSession);
    return () => {
      mounted = false;
      window.removeEventListener(NUA_ID_SESSION_EVENT, syncSession);
    };
  }, [required]);

  if (!required && !NUA_ID_CHECKOUT_ENABLED) return null;

  if (checking) {
    return (
      <div className="h-14 animate-pulse rounded-2xl border border-white/[0.08] bg-[#08080c]" />
    );
  }

  if (profile) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-950/20 px-4 py-3 text-xs">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <div>
            <p className="font-medium text-[#F5EEE9]">Conectado como {profile.displayName}</p>
            <p className="text-[11px] text-zinc-400">
              {profile.email} · Este pedido ficará salvo na sua Área Privativa.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setError('Conclua a verificação de segurança antes de continuar.');
      return;
    }
    setBusy(true);
    try {
      const res = await requestLoginCode(email.trim(), turnstileToken, 'checkout');
      setTurnstileReset((n) => n + 1);
      if (!res.ok || !res.data?.success) {
        setError(res.data?.error || 'Não foi possível enviar o código.');
        return;
      }
      setStep('code');
      setResendCooldown(60);
      setTimeout(() => codeInputRef.current?.focus(), 60);
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
    <div className="space-y-3 rounded-2xl border border-[#7A293D]/40 bg-[#08080c] p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-[#F5EEE9]">
        <ShieldCheck className="h-4 w-4 text-[#90364B]" />
        <span>Identifique-se com seu e-mail para salvar o acesso na sua Área Privativa</span>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/35 px-3 py-2 text-[11px] text-rose-200">
          {error}
        </div>
      )}

      {step === 'email' ? (
        <form onSubmit={handleSendCode} className="space-y-2.5">
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1 min-w-0">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Seu melhor e-mail"
                className="w-full min-h-[44px] rounded-xl border border-white/10 bg-black/60 py-2.5 pl-9 pr-3 text-base sm:text-xs text-[#F5EEE9] placeholder:text-zinc-600 focus:border-[#90364B] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={busy || (Boolean(TURNSTILE_SITE_KEY) && !turnstileToken)}
              className="w-full sm:w-auto min-h-[44px] shrink-0 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#54182b] hover:via-[#7A293D] hover:to-[#90364B] hover:border-white/25 transition-all duration-200 border border-white/10 px-5 py-2.5 text-xs sm:text-[11px] font-semibold uppercase tracking-wider text-[#F5EEE9] disabled:opacity-45 disabled:cursor-not-allowed touch-manipulation cursor-pointer"
            >
              {busy ? 'Enviando...' : 'Receber código'}
            </button>
          </div>
          <TurnstileWidget action="checkout_otp" resetSignal={turnstileReset} onToken={setTurnstileToken} />
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-2.5">
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1 min-w-0">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={code}
                onKeyDown={(e) => guardNumericKeyDown(e)}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Código de 6 dígitos"
                className="w-full min-h-[44px] rounded-xl border border-white/10 bg-black/60 py-2.5 pl-9 pr-3 font-mono text-base sm:text-xs tracking-[0.25em] text-[#F5EEE9] focus:border-[#90364B] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={busy || code.length < 6}
              className="w-full sm:w-auto min-h-[44px] shrink-0 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#54182b] hover:via-[#7A293D] hover:to-[#90364B] hover:border-white/25 transition-all duration-200 border border-white/10 px-5 py-2.5 text-xs sm:text-[11px] font-semibold uppercase tracking-wider text-[#F5EEE9] disabled:opacity-45 disabled:cursor-not-allowed touch-manipulation cursor-pointer"
            >
              {busy ? 'Validando...' : 'Confirmar'}
            </button>
          </div>
          <TurnstileWidget action="checkout_otp_resend" resetSignal={turnstileReset} onToken={setTurnstileToken} />
          <div className="flex items-center justify-between text-[11px]">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}
              className="inline-flex items-center gap-1 text-zinc-400 transition-colors hover:text-[#F5EEE9] cursor-pointer"
            >
              <ArrowLeft className="h-3 w-3" />
              Trocar e-mail
            </button>
            <button
              type="button"
              disabled={busy || resendCooldown > 0 || (Boolean(TURNSTILE_SITE_KEY) && !turnstileToken)}
              onClick={handleSendCode}
              className="text-[#C97A8D] transition-colors hover:text-[#F5EEE9] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
            >
              {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar código'}
            </button>
          </div>
        </form>
      )}

      {GUEST_CHECKOUT_ENABLED && onContinueAsGuest && (
        <div className="pt-1 text-right">
          <button
            type="button"
            onClick={onContinueAsGuest}
            className="text-[11px] text-zinc-400 underline underline-offset-2 transition-colors duration-200 hover:text-zinc-200 cursor-pointer"
          >
            Continuar como visitante (temporário)
          </button>
        </div>
      )}
    </div>
  );
}
