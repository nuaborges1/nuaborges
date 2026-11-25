/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, Crown, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { SiteContent } from '@/lib/types';
import { isValidEmail } from '@/lib/security';
import { useScrollLock } from '@/hooks/useScrollLock';
import { TURNSTILE_SITE_KEY, TurnstileWidget } from '@/components/nua/account/TurnstileWidget';

interface VipModalProps {
  isOpen: boolean;
  onClose: () => void;
  customVipData?: SiteContent['vipClub'];
}

export function VipModal({ isOpen, onClose, customVipData }: VipModalProps) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [welcomeEmailSent, setWelcomeEmailSent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string }>({});
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
  const [turnstileReset, setTurnstileReset] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setFieldErrors({});
      setTurnstileToken(undefined);
      setTurnstileReset((value) => value + 1);
    }
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { name?: string; email?: string } = {};

    if (!name.trim() || name.trim().length < 2) {
      errors.name = 'Por favor, informe como prefere ser chamado(a).';
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      errors.email = 'Informe seu e-mail para entrar na Lista VIP.';
    } else if (!isValidEmail(cleanEmail)) {
      errors.email = 'E-mail informado em formato inválido.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const { getPublicApiUrl } = await import('@/lib/contentStore');
      const res = await fetch(`${getPublicApiUrl()}/api/vip/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: cleanEmail,
          turnstileToken,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setTurnstileToken(undefined);
      setTurnstileReset((value) => value + 1);
      if (!res.ok || !data.success) {
        setFieldErrors({ email: data.error || 'Não foi possível confirmar seu cadastro agora. Tente novamente.' });
        setLoading(false);
        return;
      }
      setWelcomeEmailSent(Boolean(data.welcomeEmailSent));
      setLoading(false);
      setSubmitted(true);
    } catch {
      setTurnstileToken(undefined);
      setTurnstileReset((value) => value + 1);
      setFieldErrors({ email: 'Erro de conexão com o servidor. Tente novamente em instantes.' });
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setName('');
    setEmail('');
    setSubmitted(false);
    setWelcomeEmailSent(false);
    onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none overscroll-contain">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="vip-modal-title"
            className="relative w-full max-w-lg bg-[#0a0a0d] border border-white/[0.12] rounded-[28px] sm:rounded-[32px] p-6 sm:p-9 shadow-[0_24px_80px_rgba(0,0,0,0.95)] z-10 overflow-hidden overscroll-contain"
          >
            {/* Fechar botão */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] hover:border-white/20 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>

            {submitted ? (
              /* Sucesso */
              <div className="text-center py-6 sm:py-8">
                <div className="w-16 h-16 rounded-full bg-[#661C30]/25 border border-[#7A293D]/40 flex items-center justify-center text-[#90364B] mx-auto mb-5">
                  <Heart className="w-8 h-8 fill-[#90364B]" />
                </div>
                <h3 className="font-serif text-2xl sm:text-3xl text-white mb-2">
                  Bem-vindo(a) à Lista VIP
                </h3>
                <p className="text-zinc-400 text-sm font-light leading-relaxed max-w-sm mx-auto mb-6">
                  {welcomeEmailSent
                    ? 'Seu cadastro foi confirmado e acabamos de enviar um e-mail de boas-vindas para você com discrição absoluta.'
                    : 'Seu cadastro foi confirmado com sucesso. Em breve você receberá prévias de ensaios, avisos e recados íntimos da Nua no seu e-mail.'}
                </p>
                <button
                  onClick={handleResetAndClose}
                  className="px-8 py-3 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] text-xs font-bold tracking-widest uppercase transition-all duration-200 cursor-pointer shadow-[0_4px_20px_rgba(67,19,34,0.4)] border border-white/10"
                >
                  Concluir e Voltar
                </button>
              </div>
            ) : (
              /* Formulário */
              <div>
                <div className="mb-6">
                  <span className="text-[#C97A8D] text-[10px] font-semibold tracking-[0.28em] uppercase flex items-center gap-1.5 mb-2">
                    <Crown className="w-3.5 h-3.5" />
                    <span>{customVipData?.eyebrow || 'LISTA VIP & PRÉVIAS'}</span>
                  </span>
                  <h3
                    id="vip-modal-title"
                    className="font-serif text-2xl sm:text-3xl text-white tracking-tight"
                  >
                    {(customVipData?.title || 'Entre no Círculo Íntimo').replace(/direto\s+no\s+whatsapp/gi, 'direto no seu e-mail')}
                  </h3>
                  <p className="text-zinc-400 text-[13px] font-light mt-1.5 leading-relaxed">
                    {(customVipData?.subtitle ||
                      'Cadastre seu e-mail para receber fotos inéditas em primeira mão, convites reservados e avisos de novos lançamentos com total discrição.')
                      .replace(/cadastre-se/i, 'Cadastre seu e-mail')}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Nome */}
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                      Como podemos te chamar? *
                    </label>
                    <input
                      type="text"
                      autoComplete="nickname"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome ou apelido"
                      className="w-full bg-[#050507] border border-white/[0.08] focus:border-[#90364B]/70 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-colors"
                    />
                    {fieldErrors.name && (
                      <span className="text-rose-400 text-[11px] mt-1 block">
                        {fieldErrors.name}
                      </span>
                    )}
                  </div>

                  {/* E-mail (Obrigatório) */}
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                      Seu melhor e-mail *
                    </label>
                    <input
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seuemail@exemplo.com"
                      className="w-full bg-[#050507] border border-white/[0.08] focus:border-[#90364B]/70 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-colors"
                    />
                    {fieldErrors.email && (
                      <span className="text-rose-400 text-[11px] mt-1 block">
                        {fieldErrors.email}
                      </span>
                    )}
                  </div>

                  {/* Garantia de Discrição */}
                  <div className="pt-2 flex items-center gap-2 text-[11px] text-zinc-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#90364B] shrink-0" />
                    <span>Seus dados são 100% confidenciais. Sem spam. Cancele quando quiser.</span>
                  </div>

                  <TurnstileWidget
                    action="vip_subscribe"
                    resetSignal={turnstileReset}
                    onToken={setTurnstileToken}
                  />

                  {/* Botão de Envio */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading || (Boolean(TURNSTILE_SITE_KEY) && !turnstileToken)}
                      className="w-full min-h-[48px] px-6 py-3 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] disabled:opacity-50 text-[#F5EEE9] text-[11px] font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_24px_rgba(67,19,34,0.4)] border border-white/10"
                    >
                      <span>{loading ? 'Confirmando...' : customVipData?.buttonText || 'Entrar na Lista VIP ♡'}</span>
                      {!loading && <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </button>
                    {TURNSTILE_SITE_KEY && !turnstileToken && (
                      <p className="mt-2 text-center text-[10px] text-zinc-500">Conclua a verificação de segurança para confirmar.</p>
                    )}
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
