'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { guardNumericKeyDown } from '@/lib/numericInput';
import { ArrowLeft, ChevronDown, HelpCircle, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react';
import { NuaIdProfile, requestLoginCode, verifyLoginCode } from '@/lib/nuaIdClient';
import { TURNSTILE_SITE_KEY, TurnstileWidget } from './TurnstileWidget';

interface NuaIdLoginViewProps {
  onAuthenticated: (profile: NuaIdProfile) => void;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

export function NuaIdLoginView({
  onAuthenticated,
  title = 'Acesse seu acervo',
  subtitle = 'Informe o e-mail usado na sua compra ou reserva. Enviaremos um código temporário de 6 dígitos para confirmar sua identidade.',
  compact = false,
}: NuaIdLoginViewProps) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>(undefined);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const verifyingRef = useRef(false);

  // Pré-preenche e-mail caso o cliente chegue pelo link do e-mail pós-compra (?email=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const qEmail = (params.get('email') || '').trim();
      if (qEmail && qEmail.includes('@')) {
        setEmail(qEmail);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Informe um endereço de e-mail válido.');
      return;
    }
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setError('Conclua a verificação de segurança antes de solicitar o código.');
      return;
    }

    setLoading(true);
    try {
      const res = await requestLoginCode(cleanEmail, turnstileToken, 'portal_login');
      setTurnstileReset((n) => n + 1);
      if (!res.ok || !res.data?.success) {
        setError(res.data?.error || 'Não foi possível enviar o código agora.');
        return;
      }
      setInfo(
        res.data.message ||
          'Se houver uma conta ou pedido vinculado a este e-mail, você receberá um código de 6 dígitos em instantes.'
      );
      setStep('code');
      setResendCooldown(60);
      setTimeout(() => codeInputRef.current?.focus(), 60);
    } catch {
      setError('Falha de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const submitCode = useCallback(
    async (rawCode: string) => {
      if (verifyingRef.current) return;
      setError(null);
      const cleanCode = rawCode.replace(/\D/g, '').slice(0, 6);
      if (cleanCode.length !== 6) {
        setError('Digite os 6 dígitos enviados para o seu e-mail.');
        return;
      }

      verifyingRef.current = true;
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
        verifyingRef.current = false;
        setLoading(false);
      }
    },
    [email, onAuthenticated]
  );

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitCode(code);
  };

  const handleCodeChange = (raw: string) => {
    const clean = raw.replace(/\D/g, '').slice(0, 6);
    setCode(clean);
    if (clean.length === 6 && !loading) {
      void submitCode(clean);
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
        <div className="mx-auto mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#7A293D]/45 bg-[#431322]/30 text-[#C97A8D]">
          {step === 'email' ? <Lock className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
        </div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.26em] text-[#C97A8D]">
          Área Privativa · Acesso Seguro
        </p>
        <h1 className="mt-2 font-serif text-2xl sm:text-[26px] font-normal tracking-tight text-[#F5EEE9]">
          {step === 'email' ? title : 'Informe o código de acesso'}
        </h1>
        <p className="mt-2 text-xs sm:text-sm font-light leading-relaxed text-zinc-400">
          {step === 'email'
            ? subtitle
            : `Confira a caixa de entrada e o spam de ${email.trim()}.`}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-950/35 px-4 py-3 text-xs leading-relaxed text-rose-200"
        >
          {error}
        </div>
      )}

      {info && step === 'code' && (
        <div className="mb-4 rounded-2xl border border-[#7A293D]/40 bg-[#431322]/25 px-4 py-3 text-xs leading-relaxed text-[#F5EEE9]/90">
          {info}
        </div>
      )}

      {step === 'email' ? (
        <form onSubmit={handleRequestCode} className="space-y-4">
          <div>
            <label htmlFor="account-login-email" className="mb-1.5 block text-xs font-medium text-zinc-300">
              E-mail utilizado na compra
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                id="account-login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                className="w-full min-h-[48px] rounded-xl border border-white/10 bg-black/60 py-3 pl-10 pr-4 text-base sm:text-sm text-[#F5EEE9] placeholder:text-zinc-600 focus:border-[#90364B] focus:outline-none focus:ring-2 focus:ring-[#661C30]/40"
              />
            </div>
          </div>

          <TurnstileWidget action="portal_login" resetSignal={turnstileReset} onToken={setTurnstileToken} />

          <button
            type="submit"
            disabled={loading || (Boolean(TURNSTILE_SITE_KEY) && !turnstileToken)}
            className="w-full min-h-[48px] rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#54182b] hover:via-[#7A293D] hover:to-[#90364B] hover:border-white/25 hover:shadow-[0_6px_26px_rgba(102,28,48,0.5)] active:scale-[0.985] border border-white/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#F5EEE9] transition-all duration-200 shadow-[0_4px_20px_rgba(67,19,34,0.4)] disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none touch-manipulation cursor-pointer"
          >
            {loading ? 'Enviando código...' : 'Receber código por e-mail'}
          </button>

          <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-[11px] font-light text-zinc-500">
            <ShieldCheck className="h-3.5 w-3.5 text-[#C97A8D] shrink-0" />
            <span>Acesso exclusivo para clientes com compras ou agendamentos.</span>
          </p>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div>
            <label htmlFor="account-login-otp" className="mb-1.5 block text-xs font-medium text-zinc-300">
              Código de 6 dígitos
            </label>
            <input
              ref={codeInputRef}
              id="account-login-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onKeyDown={(e) => guardNumericKeyDown(e)}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="000000"
              className="w-full rounded-xl border border-white/10 bg-black/60 py-3.5 text-center font-mono text-2xl tracking-[0.45em] text-[#F5EEE9] placeholder:text-zinc-700 focus:border-[#90364B] focus:outline-none focus:ring-2 focus:ring-[#661C30]/40"
            />
            <p className="mt-1.5 text-center text-[11px] text-zinc-500">
              Ao digitar ou colar os 6 dígitos, o acesso é validado automaticamente.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full min-h-[48px] rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#54182b] hover:via-[#7A293D] hover:to-[#90364B] hover:border-white/25 hover:shadow-[0_6px_26px_rgba(102,28,48,0.5)] active:scale-[0.985] border border-white/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#F5EEE9] transition-all duration-200 shadow-[0_4px_20px_rgba(67,19,34,0.4)] disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer"
          >
            {loading ? 'Validando...' : 'Confirmar e entrar'}
          </button>

          <TurnstileWidget action="portal_login_resend" resetSignal={turnstileReset} onToken={setTurnstileToken} />

          <div className="flex items-center justify-between pt-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}
              className="inline-flex items-center gap-1 text-zinc-400 transition-colors duration-200 hover:text-[#F5EEE9] cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Trocar e-mail
            </button>
            <button
              type="button"
              disabled={loading || resendCooldown > 0 || (Boolean(TURNSTILE_SITE_KEY) && !turnstileToken)}
              onClick={handleRequestCode}
              className="text-[#C97A8D] transition-colors duration-200 hover:text-[#F5EEE9] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
            >
              {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar código'}
            </button>
          </div>
        </form>
      )}

      {/* Ajuda contextual discreta */}
      <div className="mt-5 border-t border-white/[0.06] pt-4">
        <button
          type="button"
          onClick={() => setHelpOpen((v) => !v)}
          aria-expanded={helpOpen}
          className="flex w-full items-center justify-between text-left text-[11px] text-zinc-400 transition-colors hover:text-[#F5EEE9] cursor-pointer"
        >
          <span className="inline-flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5 text-[#C97A8D]" />
            Não recebeu o código ou usou outro e-mail?
          </span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${helpOpen ? 'rotate-180' : ''}`} />
        </button>
        {helpOpen && (
          <div className="mt-3 space-y-2 rounded-2xl border border-white/[0.06] bg-black/45 p-3.5 text-[11px] leading-relaxed text-zinc-400">
            <p>• Verifique as pastas de <strong className="text-zinc-200">Spam</strong>, <strong className="text-zinc-200">Promoções</strong> ou <strong className="text-zinc-200">Lixo Eletrônico</strong>.</p>
            <p>• Confirme se digitou o mesmo e-mail utilizado no pagamento Pix ou agendamento.</p>
            <p>
              • Se digitou o e-mail errado na hora da compra,{' '}
              <Link href="/contato" className="text-[#C97A8D] underline underline-offset-2 hover:text-[#F5EEE9]">
                fale com o atendimento
              </Link>{' '}
              informando o comprovante Pix.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
