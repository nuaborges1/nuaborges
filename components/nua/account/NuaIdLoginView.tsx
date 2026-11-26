'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { guardNumericKeyDown } from '@/lib/numericInput';
import { ArrowLeft, ChevronDown, HelpCircle, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react';
import { NuaIdProfile, requestLoginCode, verifyLoginCode } from '@/lib/nuaIdClient';
import { TURNSTILE_SITE_KEY, TurnstileWidget } from './TurnstileWidget';

interface NuaIdLoginViewProps {
  onAuthenticated: (profile: NuaIdProfile) => void;
  onOpenContact?: () => void;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

export function NuaIdLoginView({
  onAuthenticated,
  onOpenContact,
  title = 'Minha conta',
  subtitle = 'Informe o e-mail usado na sua compra ou reserva. Enviaremos um código temporário de 6 dígitos para confirmar seu acesso.',
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
          setCode('');
          setTimeout(() => codeInputRef.current?.focus(), 40);
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
          : 'page-enter-fast mx-auto w-full max-w-md rounded-[24px] border border-white/[0.08] bg-[#08080c] p-6 sm:p-8'
      }
    >
      <div className="mb-7">
        <div className="mb-4 flex size-11 items-center justify-center rounded-2xl border border-[#7A293D]/40 bg-[#431322]/30 text-[#F5EEE9]">
          {step === 'email' ? <Lock className="size-5" /> : <KeyRound className="size-5" />}
        </div>
        <h1 className="font-serif text-3xl font-normal tracking-tight text-[#F5EEE9] sm:text-4xl">
          {step === 'email' ? title : 'Informe o código'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          {step === 'email' ? subtitle : `Confira a caixa de entrada e o spam de ${email.trim()}.`}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-xs leading-relaxed text-red-200"
        >
          {error}
        </div>
      )}

      {info && step === 'code' && (
        <div className="mb-4 rounded-xl border border-[#7A293D]/40 bg-[#431322]/25 px-4 py-3 text-xs leading-relaxed text-[#F5EEE9]/90">
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
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <input
                id="account-login-email"
                type="email"
                inputMode="email"
                enterKeyHint="send"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                className="w-full min-h-[48px] rounded-xl border border-white/[0.1] bg-black/60 py-3 pl-10 pr-4 text-base sm:text-sm text-[#F5EEE9] placeholder:text-zinc-500 focus:border-[#90364B] focus:outline-none focus:ring-2 focus:ring-[#661C30]/40 transition-colors"
              />
            </div>
          </div>

          <TurnstileWidget action="portal_login" resetSignal={turnstileReset} onToken={setTurnstileToken} />

          <button
            type="submit"
            disabled={loading || (Boolean(TURNSTILE_SITE_KEY) && !turnstileToken)}
            className="btn-primary w-full !px-5"
          >
            {loading ? 'Enviando código…' : 'Receber código por e-mail'}
          </button>

          <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-xs text-zinc-500">
            <ShieldCheck className="size-3.5 shrink-0 text-[#90364B]" />
            <span>Acesso exclusivo para clientes com compras ou reservas.</span>
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
              enterKeyHint="done"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onKeyDown={(e) => guardNumericKeyDown(e)}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="000000"
              className="w-full min-h-[52px] rounded-xl border border-white/[0.1] bg-black/60 py-3.5 text-center font-mono text-2xl tracking-[0.28em] sm:tracking-[0.45em] text-[#F5EEE9] placeholder:text-zinc-700 focus:border-[#90364B] focus:outline-none focus:ring-2 focus:ring-[#661C30]/40 transition-colors"
            />
            <p className="mt-1.5 text-center text-xs text-zinc-500">
              Ao digitar ou colar os 6 dígitos, o acesso é validado automaticamente.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="btn-primary w-full !px-5"
          >
            {loading ? 'Validando…' : 'Confirmar e entrar'}
          </button>

          <TurnstileWidget action="portal_login_resend" resetSignal={turnstileReset} onToken={setTurnstileToken} />

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm [&>button]:min-h-[44px]">
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}
              className="inline-flex items-center gap-1.5 text-zinc-400 transition-colors hover:text-[#F5EEE9] cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>Trocar e-mail</span>
            </button>
            <button
              type="button"
              disabled={loading || resendCooldown > 0 || (Boolean(TURNSTILE_SITE_KEY) && !turnstileToken)}
              onClick={handleRequestCode}
              className="text-[#F5EEE9]/80 transition-colors hover:text-[#F5EEE9] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
            >
              {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar código'}
            </button>
          </div>
        </form>
      )}

      {/* Ajuda contextual discreta */}
      <div className="mt-6 border-t border-white/[0.06] pt-4">
        <button
          type="button"
          onClick={() => setHelpOpen((v) => !v)}
          aria-expanded={helpOpen}
          className="flex w-full items-center justify-between text-left text-xs text-zinc-400 transition-colors hover:text-[#F5EEE9] cursor-pointer"
        >
          <span className="inline-flex items-center gap-1.5">
            <HelpCircle className="size-3.5 text-[#90364B]" />
            <span>Não recebeu o código ou usou outro e-mail?</span>
          </span>
          <ChevronDown className={`size-3.5 transition-transform duration-200 ${helpOpen ? 'rotate-180' : ''}`} />
        </button>
        {helpOpen && (
          <div className="mt-3 space-y-2 rounded-xl border border-white/[0.06] bg-black/45 p-3.5 text-xs leading-relaxed text-zinc-400">
            <p>
              • Verifique as pastas de <strong className="font-medium text-zinc-200">Spam</strong>,{' '}
              <strong className="font-medium text-zinc-200">Promoções</strong> ou{' '}
              <strong className="font-medium text-zinc-200">Lixo Eletrônico</strong>.
            </p>
            <p>• Confirme se digitou o mesmo e-mail utilizado no pagamento Pix ou agendamento.</p>
            <p>
              • Se digitou o e-mail errado na hora da compra,{' '}
              {onOpenContact ? (
                <button
                  type="button"
                  onClick={onOpenContact}
                  className="text-[#F5EEE9]/80 underline underline-offset-4 hover:text-[#F5EEE9] cursor-pointer"
                >
                  fale com o atendimento
                </button>
              ) : (
                <Link href="/contato" className="text-[#90364B] underline underline-offset-4 hover:text-[#F5EEE9]">
                  fale com o atendimento
                </Link>
              )}{' '}
              informando o comprovante Pix.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
