'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  AlertCircle,
  RefreshCw,
  Search,
  Mail,
  Smartphone,
} from 'lucide-react';
import { AvulsoProductItem } from '@/lib/types';

interface AssistirOtpModalProps {
  product: AvulsoProductItem;
  productSlug: string;
  step: 'request_otp' | 'verify_otp';
  setStep: (step: 'request_otp' | 'verify_otp') => void;
  orderInput: string;
  setOrderInput: (val: string) => void;
  otpInput: string;
  setOtpInput: (val: string) => void;
  maskedEmail: string | null;
  authError: string | null;
  setAuthError: (err: string | null) => void;
  isSubmitting: boolean;
  onRequestOtp: (e: React.FormEvent) => Promise<void>;
  onVerifyOtp: (e: React.FormEvent) => Promise<void>;
}

export function AssistirOtpModal({
  product,
  productSlug,
  step,
  setStep,
  orderInput,
  setOrderInput,
  otpInput,
  setOtpInput,
  maskedEmail,
  authError,
  setAuthError,
  isSubmitting,
  onRequestOtp,
  onVerifyOtp,
}: AssistirOtpModalProps) {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#f4a7b9] selection:text-black flex flex-col select-none">
      <header className="sticky top-0 z-40 bg-black/85 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link
          href="/avulsos"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-xs font-light transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar ao Catálogo</span>
        </Link>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-12 flex flex-col justify-center items-center my-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#09090c] border border-white/[0.12] rounded-[32px] p-6 sm:p-8 w-full shadow-2xl text-center space-y-6"
        >
          <div className="w-16 h-16 rounded-full bg-[#f4a7b9]/15 border border-[#f4a7b9]/30 flex items-center justify-center text-[#f4a7b9] mx-auto">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <span className="text-[#f4a7b9] text-[10px] font-semibold tracking-[0.28em] uppercase block mb-1">
              ACESSO RESTRITO PRIVATIVO
            </span>
            <h2 className="font-serif text-2xl text-white font-medium">{product.title}</h2>
            <p className="text-zinc-400 text-xs font-light mt-2 leading-relaxed">
              Esta produção autoral é de acesso exclusivo para compradores. Informe seu Token de Acesso para liberar a visualização imediata.
            </p>
          </div>

          {/* Aviso de Segurança de Uso Único */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200/90 text-[11px] text-left space-y-1 font-light">
            <div className="flex items-center gap-2 font-semibold text-amber-300">
              <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Token de Acesso Pessoal &amp; Uso Único</span>
            </div>
            <p>
              O token de acesso é <strong>único, pessoal e intransferível</strong>. Ele só pode ser utilizado para desbloquear a sua compra privativa.
            </p>
          </div>

          {/* PASSO 1: Inserir Token de Acesso */}
          {step === 'request_otp' && (
            <form onSubmit={onRequestOtp} className="space-y-4 text-left">
              <div>
                <label className="block text-zinc-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
                  Token de Acesso Adquirido
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={orderInput}
                    onChange={(e) => {
                      setOrderInput(e.target.value);
                      setAuthError(null);
                    }}
                    placeholder="Cole seu Token de Acesso (ex: NUA-...)"
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-mono outline-none focus:border-[#f4a7b9] pr-10"
                  />
                  <Search className="w-4 h-4 text-zinc-500 absolute right-3.5 top-3.5" />
                </div>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[46px] px-6 py-3 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-black text-xs font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_20px_rgba(244,167,185,0.25)] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Desbloquear e Assistir Agora</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* PASSO 2: Validar Código OTP e Autorizar Dispositivo */}
          {step === 'verify_otp' && (
            <form onSubmit={onVerifyOtp} className="space-y-4 text-left">
              <div className="p-3.5 rounded-2xl bg-[#f4a7b9]/10 border border-[#f4a7b9]/25 text-[#f4a7b9] text-xs flex items-start gap-2.5">
                <Mail className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Código enviado por e-mail!</span>
                  <span className="text-zinc-300 text-[11px] font-light">
                    Enviamos o código de 6 dígitos para <strong className="text-white">{maskedEmail}</strong>. Verifique sua caixa de entrada ou spam.
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
                  Código de Liberação (6 Dìgitos)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => {
                    setOtpInput(e.target.value.replace(/[^0-9]/g, ''));
                    setAuthError(null);
                  }}
                  placeholder="123456"
                  className="w-full bg-black/80 border border-[#f4a7b9]/40 rounded-xl px-4 py-3.5 text-center text-white text-xl font-mono tracking-[0.4em] outline-none focus:border-[#f4a7b9]"
                />
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || otpInput.length < 6}
                className="w-full min-h-[46px] px-6 py-3 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-black text-xs font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_20px_rgba(244,167,185,0.25)] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Smartphone className="w-4 h-4" />
                    <span>Autorizar Dispositivo &amp; Acessar</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep('request_otp');
                    setAuthError(null);
                  }}
                  className="text-[11px] text-zinc-400 hover:text-white underline font-light"
                >
                  Usar outro pedido ou reenviar e-mail
                </button>
              </div>
            </form>
          )}

          <div className="pt-4 border-t border-white/[0.06] flex flex-col gap-3">
            <div className="flex flex-col gap-2 pt-1">
              <span className="text-[11px] text-zinc-500 font-light">Ainda não comprou esta produção?</span>
              <Link
                href={`/avulsos/${productSlug}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full border border-white/15 hover:border-white/30 text-zinc-300 hover:text-white text-xs font-semibold uppercase tracking-wider transition-colors"
              >
                <span>Ver Opções de Adquisição</span>
              </Link>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
