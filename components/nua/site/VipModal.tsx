'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, Crown, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { SiteContent } from '@/lib/types';
import { isValidEmail } from '@/lib/security';
import { useScrollLock } from '@/hooks/useScrollLock';

interface VipModalProps {
  isOpen: boolean;
  onClose: () => void;
  customVipData?: SiteContent['vipClub'];
}

export function VipModal({ isOpen, onClose, customVipData }: VipModalProps) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; whatsapp?: string; email?: string }>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setFieldErrors({});
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
    const errors: { name?: string; whatsapp?: string; email?: string } = {};

    if (!name.trim()) {
      errors.name = 'Por favor, informe como prefere ser chamado(a).';
    }

    const cleanPhone = whatsapp.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      errors.whatsapp = 'Informe seu WhatsApp com DDD (ex: 11 99999-9999).';
    }

    if (email.trim() && !isValidEmail(email.trim())) {
      errors.email = 'E-mail informado em formato inválido.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    // Salva lead no LocalStorage para testes e persistência local segura
    try {
      const existing = JSON.parse(localStorage.getItem('nua_vip_leads') || '[]');
      const newLead = {
        id: `lead_${Date.now()}`,
        name: name.trim(),
        whatsapp: cleanPhone,
        email: email.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      existing.unshift(newLead);
      localStorage.setItem('nua_vip_leads', JSON.stringify(existing));
    } catch {
      // Ignora erro de storage local
    }

    // Simula resposta ágil com feedback acolhedor
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  const handleResetAndClose = () => {
    setName('');
    setWhatsapp('');
    setEmail('');
    setSubmitted(false);
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
                <div className="w-16 h-16 rounded-full bg-[#f4a7b9]/15 border border-[#f4a7b9]/30 flex items-center justify-center text-[#f4a7b9] mx-auto mb-5">
                  <Heart className="w-8 h-8 fill-[#f4a7b9]" />
                </div>
                <h3 className="font-serif text-2xl sm:text-3xl text-white mb-2">
                  Bem-vindo(a) à Lista VIP
                </h3>
                <p className="text-zinc-400 text-sm font-light leading-relaxed max-w-sm mx-auto mb-6">
                  Seu cadastro foi confirmado com sucesso. Em breve você receberá prévias de ensaios,
                  avisos e recados íntimos da Nua com discrição absoluta.
                </p>
                <button
                  onClick={handleResetAndClose}
                  className="px-8 py-3 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-black text-xs font-bold tracking-widest uppercase transition-all duration-200 cursor-pointer shadow-[0_4px_20px_rgba(244,167,185,0.25)]"
                >
                  Concluir e Voltar
                </button>
              </div>
            ) : (
              /* Formulário */
              <div>
                <div className="mb-6">
                  <span className="text-[#f4a7b9] text-[10px] font-semibold tracking-[0.28em] uppercase flex items-center gap-1.5 mb-2">
                    <Crown className="w-3.5 h-3.5" />
                    <span>{customVipData?.eyebrow || 'LISTA VIP & PRÉVIAS'}</span>
                  </span>
                  <h3
                    id="vip-modal-title"
                    className="font-serif text-2xl sm:text-3xl text-white tracking-tight"
                  >
                    Entre no Círculo Íntimo
                  </h3>
                  <p className="text-zinc-400 text-[13px] font-light mt-1.5 leading-relaxed">
                    Cadastre-se para receber fotos inéditas em primeira mão, cupons secretos e avisos
                    de novos lançamentos direto no seu celular.
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
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome ou apelido"
                      className="w-full bg-[#050507] border border-white/[0.08] focus:border-[#f4a7b9]/60 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-colors"
                    />
                    {fieldErrors.name && (
                      <span className="text-rose-400 text-[11px] mt-1 block">
                        {fieldErrors.name}
                      </span>
                    )}
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                      WhatsApp (com DDD) *
                    </label>
                    <input
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full bg-[#050507] border border-white/[0.08] focus:border-[#f4a7b9]/60 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-colors"
                    />
                    {fieldErrors.whatsapp && (
                      <span className="text-rose-400 text-[11px] mt-1 block">
                        {fieldErrors.whatsapp}
                      </span>
                    )}
                  </div>

                  {/* E-mail (Opcional) */}
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                      E-mail <span className="text-zinc-600">(opcional)</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seuemail@exemplo.com"
                      className="w-full bg-[#050507] border border-white/[0.08] focus:border-[#f4a7b9]/60 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-colors"
                    />
                    {fieldErrors.email && (
                      <span className="text-rose-400 text-[11px] mt-1 block">
                        {fieldErrors.email}
                      </span>
                    )}
                  </div>

                  {/* Garantia de Discrição */}
                  <div className="pt-2 flex items-center gap-2 text-[11px] text-zinc-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#f4a7b9] shrink-0" />
                    <span>Seus dados são 100% confidenciais. Sem spam. Cancele quando quiser.</span>
                  </div>

                  {/* Botão de Envio */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full min-h-[48px] px-6 py-3 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] disabled:opacity-50 text-black text-[11px] font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_24px_rgba(244,167,185,0.25)]"
                    >
                      <span>{loading ? 'Confirmando...' : 'Entrar na Lista VIP ♡'}</span>
                      {!loading && <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </button>
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
