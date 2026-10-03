'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Send, CheckCircle2, Copy, Check } from 'lucide-react';
import { SiteContent } from '@/lib/types';
import { isValidEmail } from '@/lib/security';
import { DEFAULT_CONTACT_EMAIL, SITE_HOST } from '@/lib/site';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  customContactData?: SiteContent['contact'];
}

export function ContactModal({ isOpen, onClose, customContactData }: ContactModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const rawEmail = customContactData?.officialEmail;
  const officialEmail = rawEmail && isValidEmail(rawEmail)
    ? rawEmail.trim()
    : DEFAULT_CONTACT_EMAIL;
  const modalTitle = customContactData?.modalTitle || 'Assessoria & Contato';
  const modalSubtitle =
    customContactData?.modalSubtitle ||
    'Propostas comerciais, imprensa, palestras e colaborações.';
  const subjects =
    customContactData?.subjects && customContactData.subjects.length > 0
      ? customContactData.subjects
      : ['Parceria Comercial', 'Imprensa & Entrevistas', 'Palestras & Eventos', 'Outro Assunto'];

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(subjects[0] || 'Parceria Comercial');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Honeypot e Time-Trap Anti-Bot
  const [honeypot, setHoneypot] = useState('');
  const [renderedAt, setRenderedAt] = useState<number>(Date.now());

  // Scroll lock & Time-trap reset on open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setRenderedAt(Date.now());
      setHoneypot('');
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
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

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(officialEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. Envia para a API com validação de Honeypot e Time-Trap no backend Edge
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject,
          message: message.trim(),
          company_website_verify: honeypot,
          renderedAt,
        }),
      });
    } catch (err) {
      console.warn('[Contact] Fallback para mailto:', err);
    }

    // 2. Abre cliente de e-mail como garantia e conclui envio
    const mailtoUrl = `mailto:${officialEmail}?subject=${encodeURIComponent(
      `[${subject}] Proposta Comercial de ${name}`
    )}&body=${encodeURIComponent(
      `Nome: ${name}\nE-mail para resposta: ${email}\nFinalidade: ${subject}\n\nMensagem:\n${message}\n\n---\nEnviado através do site oficial ${SITE_HOST}`
    )}`;

    window.location.href = mailtoUrl;

    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 400);
  };

  const handleReset = () => {
    setSubmitted(false);
    setName('');
    setEmail('');
    setMessage('');
    onClose();
  };

  const inputClass =
    'w-full bg-zinc-900/60 border border-zinc-800/90 rounded-xl px-4 py-3 text-white placeholder-zinc-600 text-[14px] transition-all duration-200 outline-none focus:border-[#f4a7b9] focus:bg-zinc-900/90 focus:ring-1 focus:ring-[#f4a7b9]/20 appearance-none';

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="contact-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`${modalTitle} — Nua Borges`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-md p-0 sm:p-6"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 -z-10" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.99 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full sm:max-w-lg bg-[#09090c] border border-zinc-800/80 rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl text-left max-h-[92svh] sm:max-h-[90vh] overflow-y-auto"
          >
            {/* Drag handle — mobile only */}
            <div className="sm:hidden w-9 h-0.5 rounded-full bg-zinc-700 mx-auto mb-5" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 text-zinc-500 hover:text-white w-9 h-9 rounded-full flex items-center justify-center hover:bg-zinc-800/60 active:bg-zinc-800 transition-all duration-200 cursor-pointer touch-manipulation"
              aria-label="Fechar modal"
            >
              <X className="w-4 h-4" />
            </button>

            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="text-center py-8"
                >
                  <div className="w-14 h-14 rounded-full bg-[#f4a7b9]/10 text-[#f4a7b9] flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="font-serif text-2xl text-white">E-mail Aberto</h3>
                  <p className="text-zinc-400 text-[13px] sm:text-sm mt-3 max-w-[300px] mx-auto leading-relaxed">
                    Sua mensagem foi formatada no seu aplicativo de e-mail para envio à assessoria oficial.
                  </p>
                  <div className="mt-4 p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-300">
                    <span>{officialEmail}</span>
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className="text-[#f4a7b9] hover:underline text-[11px] font-sans"
                    >
                      {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <button
                    onClick={handleReset}
                    className="mt-6 px-7 py-3 rounded-full bg-[#f4a7b9] hover:bg-[#efa0b3] active:bg-[#df8fa1] text-zinc-950 font-bold text-[11px] uppercase tracking-wider transition-all duration-200 min-h-[44px] cursor-pointer touch-manipulation"
                  >
                    Concluir
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <Mail className="w-4 h-4 text-[#f4a7b9] shrink-0" />
                    <h3 className="font-serif text-[1.45rem] sm:text-[1.65rem] text-white">
                      {modalTitle}
                    </h3>
                  </div>
                  <p className="text-zinc-400 text-[13px] mb-5 font-light pl-[26px]">
                    {modalSubtitle}
                  </p>

                  {/* Quick direct copy banner */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 mb-5">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Canal Direto:</span>
                      <span className="text-xs text-zinc-300 font-mono truncate">{officialEmail}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-[#f4a7b9] hover:text-zinc-950 text-zinc-300 text-[10px] font-semibold tracking-wider uppercase transition-all shrink-0 flex items-center gap-1"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Honeypot Anti-Spam: Oculto para humanos, preenchido apenas por bots */}
                    <div
                      aria-hidden="true"
                      style={{
                        opacity: 0,
                        position: 'absolute',
                        top: 0,
                        left: '-9999px',
                        height: 0,
                        width: 0,
                        zIndex: -1,
                        overflow: 'hidden',
                        pointerEvents: 'none',
                      }}
                    >
                      <label htmlFor="company_website_verify">Não preencha este campo de verificação</label>
                      <input
                        id="company_website_verify"
                        name="company_website_verify"
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 text-[11px] font-semibold tracking-wider uppercase mb-2">
                        Seu Nome
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nome ou empresa"
                        className={inputClass}
                        autoComplete="name"
                      />
                    </div>

                    <div>
                      <label className="block text-zinc-500 text-[11px] font-semibold tracking-wider uppercase mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className={inputClass}
                        autoComplete="email"
                      />
                    </div>

                    <div>
                      <label className="block text-zinc-500 text-[11px] font-semibold tracking-wider uppercase mb-2">
                        Assunto
                      </label>
                      <select
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className={inputClass}
                        style={{ backgroundImage: 'none' }}
                      >
                        {subjects.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-zinc-500 text-[11px] font-semibold tracking-wider uppercase mb-2">
                        Mensagem
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Descreva sua proposta ou solicitação..."
                        className={`${inputClass} resize-none`}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-1 inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-[#f4a7b9] hover:bg-[#efa0b3] active:bg-[#df8fa1] text-zinc-950 font-bold text-[11px] uppercase tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[50px] touch-manipulation shadow-[0_4px_20px_rgba(244,167,185,0.18)] hover:shadow-[0_6px_28px_rgba(244,167,185,0.32)]"
                    >
                      {loading ? (
                        <span className="opacity-70">Enviando...</span>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Enviar Mensagem</span>
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
