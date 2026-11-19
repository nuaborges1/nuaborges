'use client';

import React, { useState, useRef } from 'react';
import { ArrowLeft, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react';
import { NuaIdProfile, requestLoginCode, verifyLoginCode } from '@/lib/nuaIdClient';

interface NuaIdLoginViewProps {
  onAuthenticated: (profile: NuaIdProfile) => void;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

export function NuaIdLoginView({
  onAuthenticated,
  title = 'Acesse sua área privativa',
  subtitle = 'Entre sem senha usando apenas seu e-mail. Enviaremos um código temporário de 6 dígitos.',
  compact = false,
}: NuaIdLoginViewProps) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Informe um endereço de e-mail válido.');
      return;
    }

    setLoading(true);
    try {
      const res = await requestLoginCode(cleanEmail);
      if (!res.ok || !res.data?.success) {
        setError(res.data?.error || 'Não foi possível enviar o código agora.');
        return;
      }
      setInfo(
        res.data.message ||
          'Se o endereço estiver correto, você receberá um código de 6 dígitos em instantes.'
      );
      setStep('code');
      setTimeout(() => codeInputRef.current?.focus(), 60);
    } catch {
      setError('Falha de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanCode = code.replace(/\D/g, '').slice(0, 6);
    if (cleanCode.length !== 6) {
      setError('Digite os 6 dígitos enviados para o seu e-mail.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyLoginCode(email.trim(), cleanCode);
      if (!res.ok || !res.data?.success || !res.data.profile) {
        const rem =
          typeof res.data?.attemptsRemaining === 'number'
            ? ` (${res.data.attemptsRemaining} tentativa(s) restante(s))`
            : '';
        setError((res.data?.error || 'Código inválido ou expirado.') + rem);
        return;
      }
      onAuthenticated(res.data.profile);
    } catch {
      setError('Falha de conexão ao validar o código.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={
        compact
          ? 'rounded-[24px] border border-white/[0.08] bg-[#08080c] p-5 sm:p-6'
          : 'mx-auto w-full max-w-md rounded-[28px] border border-white/[0.08] bg-[#08080c] p-6 sm:p-8 shadow-[0_24px_70px_rgba(0,0,0,0.85)]'
      }
    >
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-[#7A293D]/45 bg-[#661C30]/20 text-[#90364B]">
          {step === 'email' ? <Lock className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#90364B]">
          Minha Conta · Acesso Privativo
        </p>
        <h1 className="mt-2 font-serif text-2xl font-normal tracking-wide text-[#F5EEE9]">
          {step === 'email' ? title : 'Informe o código de acesso'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          {step === 'email'
            ? subtitle
            : `Digite os 6 dígitos enviados para ${email.trim()}.`}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-rose-500/30 bg-rose-950/35 px-4 py-3 text-xs leading-relaxed text-rose-200"
        >
          {error}
        </div>
      )}

      {info && step === 'code' && (
        <div className="mb-4 rounded-xl border border-[#90364B]/30 bg-[#431322]/30 px-4 py-3 text-xs leading-relaxed text-[#F5EEE9]/90">
          {info}
        </div>
      )}

      {step === 'email' ? (
        <form onSubmit={handleRequestCode} className="space-y-4">
          <div>
            <label htmlFor="nua-id-email" className="mb-1.5 block text-xs font-medium text-zinc-300">
              Seu e-mail
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                id="nua-id-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                className="w-full min-h-[48px] rounded-xl border border-white/10 bg-[#0b090c] py-3 pl-10 pr-4 text-base sm:text-sm text-[#F5EEE9] placeholder:text-zinc-600 focus:border-[#90364B] focus:outline-none focus:ring-2 focus:ring-[#661C30]/40"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] rounded-full bg-[#661C30] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#F5EEE9] transition-colors hover:bg-[#7A293D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#90364B] disabled:opacity-50 touch-manipulation"
          >
            {loading ? 'Enviando código...' : 'Receber código por e-mail'}
          </button>

          <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-[11px] text-zinc-500">
            <ShieldCheck className="h-3.5 w-3.5 text-[#A65B6C]" />
            Ambiente privado e discreto. Sem senha para decorar.
          </p>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div>
            <label htmlFor="nua-id-otp" className="mb-1.5 block text-xs font-medium text-zinc-300">
              Código de 6 dígitos
            </label>
            <input
              ref={codeInputRef}
              id="nua-id-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full rounded-xl border border-white/10 bg-[#0b090c] py-3.5 text-center font-mono text-2xl tracking-[0.45em] text-[#F5EEE9] placeholder:text-zinc-700 focus:border-[#90364B] focus:outline-none focus:ring-2 focus:ring-[#661C30]/40"
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full rounded-full bg-[#661C30] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#F5EEE9] transition-colors hover:bg-[#7A293D] disabled:opacity-50"
          >
            {loading ? 'Validando...' : 'Confirmar e entrar'}
          </button>

          <div className="flex items-center justify-between pt-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}
              className="inline-flex items-center gap-1 text-zinc-400 transition-colors hover:text-[#F5EEE9]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Trocar e-mail
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleRequestCode}
              className="text-[#A65B6C] transition-colors hover:text-[#F5EEE9] disabled:opacity-50"
            >
              Reenviar código
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
