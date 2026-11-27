/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Send, CheckCircle2, Copy, Check } from 'lucide-react';
import { SiteContent } from '@/lib/types';
import { isValidEmail } from '@/lib/security';
import { DEFAULT_CONTACT_EMAIL, SITE_HOST } from '@/lib/site';
import { submitContactMessage } from '@/lib/services/nua/contactService';
import { useScrollLock } from '@/hooks/useScrollLock';
import { TURNSTILE_SITE_KEY, TurnstileWidget } from '@/components/nua/account/TurnstileWidget';
import { useCopy } from '@/lib/copy';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  customContactData?: SiteContent['contact'];
}

export function ContactModal({ isOpen, onClose, customContactData }: ContactModalProps) {
  const { copy, cms } = useCopy();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const rawEmail = customContactData?.officialEmail;
  const officialEmail = rawEmail && isValidEmail(rawEmail)
    ? rawEmail.trim()
    : DEFAULT_CONTACT_EMAIL;
  const modalTitle = cms(customContactData?.modalTitle, 'contact.modalTitle', 'Assessoria & Contato');
  const modalSubtitle = cms(
    customContactData?.modalSubtitle,
    'contact.modalSubtitle',
    'Propostas comerciais, imprensa, palestras e colaborações.'
  );
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
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; message?: string; form?: string }>({});

  useEffect(() => {
    if (subjects.length > 0 && !subjects.includes(subject)) {
      setSubject(subjects[0]);
    }
  }, [subjects, subject]);

  // Honeypot e Time-Trap Anti-Bot
  const [honeypot, setHoneypot] = useState('');
  const [renderedAt, setRenderedAt] = useState<number>(Date.now());
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
  const [turnstileReset, setTurnstileReset] = useState(0);

  useScrollLock(isOpen);

  // Time-trap reset on open
  useEffect(() => {
    if (isOpen) {
      setRenderedAt(Date.now());
      setHoneypot('');
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

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(officialEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { name?: string; email?: string; message?: string } = {};

    if (!name.trim()) {
      errors.name = copy.contato.errors.nameRequired;
    }
    if (!email.trim()) {
      errors.email = copy.contato.errors.emailRequired;
    } else if (!isValidEmail(email.trim())) {
      errors.email = copy.contato.errors.emailInvalid;
    }
    if (!message.trim()) {
      errors.message = copy.contato.errors.messageRequired;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    // 1. Envia para a API com validação de Honeypot e Time-Trap no backend Edge
    let apiSuccess = false;
    let apiErrorMsg = '';
    try {
      const res = await submitContactMessage({
        name: name.trim(),
        email: email.trim(),
        subject,
        message: message.trim(),
        company_website_verify: honeypot,
        renderedAt,
        turnstileToken,
      });
      if (res.success) {
        apiSuccess = true;
      } else {
        apiErrorMsg = res.error || copy.contato.errors.sendFailed;
      }
    } catch {
      apiErrorMsg = copy.contato.errors.networkFailed;
    }

    setLoading(false);
    setTurnstileToken(undefined);
    setTurnstileReset((value) => value + 1);
    if (!apiSuccess) {
      setFieldErrors({
        message: apiErrorMsg || 'Não foi possível entregar sua mensagem. Você pode copiar o e-mail oficial acima.',
      });
      return;
    }

    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    setName('');
    setEmail('');
    setMessage('');
    setFieldErrors({});
    onClose();
  };

  // Garante que o estado seja limpo sempre que o modal for fechado
  useEffect(() => {
    if (!isOpen) {
      setSubmitted(false);
      setFieldErrors({});
    }
  }, [isOpen]);

  const inputClass =
    'w-full min-h-[48px] bg-zinc-900/60 border border-zinc-800/90 rounded-xl px-4 py-3 text-white placeholder-zinc-600 text-base sm:text-sm transition-all duration-200 outline-none focus:border-[#661C30] focus:bg-zinc-900/90 focus:ring-1 focus:ring-[#90364B]/30 appearance-none';

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
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-md p-0 sm:p-6 overscroll-contain"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 -z-10" onClick={handleReset} />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.99 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full sm:max-w-lg bg-[#09090c] border-t sm:border border-zinc-800/80 rounded-t-3xl sm:rounded-3xl p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-8 shadow-2xl text-left max-h-[92dvh] sm:max-h-[90dvh] overflow-y-auto overscroll-contain"
            style={{ touchAction: 'pan-y' }}
          >
            {/* Drag handle — mobile only */}
            <div className="sm:hidden w-10 h-1 rounded-full bg-zinc-700 mx-auto mb-4" />

            {/* Close button */}
            <button
              type="button"
              onClick={handleReset}
              className="absolute top-3.5 sm:top-5 right-3.5 sm:right-5 text-zinc-400 hover:text-white w-11 h-11 rounded-full flex items-center justify-center hover:bg-zinc-800/60 active:bg-zinc-800 transition-all duration-200 cursor-pointer touch-manipulation"
              aria-label={copy.contato.modalCloseAria}
            >
              <X className="w-5 h-5" />
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
                  <div className="w-14 h-14 rounded-full bg-[#661C30]/20 text-[#90364B] flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="font-serif text-2xl text-white">{copy.contato.successTitle}</h3>
                  <p className="text-zinc-400 text-[13px] sm:text-sm mt-3 max-w-[320px] mx-auto leading-relaxed">
                    {copy.contato.successBody}
                  </p>
                  <div className="mt-4 p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-300">
                    <span className="break-all pr-2">{officialEmail}</span>
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className="text-[#90364B] hover:underline text-[11px] font-sans shrink-0 cursor-pointer"
                    >
                      {copied ? `${copy.contato.copiedEmailCta}!` : copy.contato.copyEmailCta}
                    </button>
                  </div>
                  <button
                    onClick={handleReset}
                    className="mt-6 px-7 py-3 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] font-medium text-[11px] uppercase tracking-wider transition-all duration-200 min-h-[44px] cursor-pointer touch-manipulation shadow-[0_4px_20px_rgba(67,19,34,0.4)] border border-white/10"
                  >
                    {copy.contato.modalSuccessDoneCta}
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
                  <div className="flex items-center gap-2.5 mb-1.5 pr-8">
                    <Mail className="w-4 h-4 text-[#90364B] shrink-0" />
                    <h3 className="font-serif text-[1.35rem] sm:text-[1.65rem] text-white">
                      {modalTitle}
                    </h3>
                  </div>
                  <p className="text-zinc-400 text-[13px] mb-4 sm:mb-5 font-light pl-[26px]">
                    {modalSubtitle}
                  </p>

                  {/* Quick direct copy banner — responsivo sem corte mesmo a 320px */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 mb-5">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className="text-[10px] sm:text-[11px] text-zinc-500 uppercase tracking-wider font-semibold shrink-0">
                        {copy.contato.directChannelLabel}
                      </span>
                      <span className="text-xs text-zinc-300 font-mono break-all">{officialEmail}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className="self-end sm:self-auto px-2.5 py-1 rounded-full bg-white/5 hover:bg-[#661C30] hover:text-white text-zinc-300 text-[10px] font-semibold tracking-wider uppercase transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>{copy.contato.copiedEmailCta}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>{copy.contato.copyEmailCta}</span>
                        </>
                      )}
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
                      <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
                        {copy.contato.nameLabel}
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                        }}
                        placeholder={copy.contato.namePlaceholder}
                        className={`${inputClass} ${fieldErrors.name ? 'border-red-400/80 focus:border-red-400' : ''}`}
                        autoComplete="name"
                      />
                      {fieldErrors.name && (
                        <p className="text-[11px] text-[#F5EEE9]/80 mt-1.5 font-light">
                          {fieldErrors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
                        {copy.contato.emailLabel}
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                        }}
                        placeholder={copy.contato.emailPlaceholder}
                        className={`${inputClass} ${fieldErrors.email ? 'border-red-400/80 focus:border-red-400' : ''}`}
                        autoComplete="email"
                      />
                      {fieldErrors.email && (
                        <p className="text-[11px] text-[#F5EEE9]/80 mt-1.5 font-light">
                          {fieldErrors.email}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
                        {copy.contato.subjectLabel}
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
                      <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
                        {copy.contato.messageLabel}
                      </label>
                      <textarea
                        rows={3}
                        value={message}
                        onChange={(e) => {
                          setMessage(e.target.value);
                          if (fieldErrors.message) setFieldErrors((prev) => ({ ...prev, message: undefined }));
                        }}
                        placeholder={copy.contato.messagePlaceholder}
                        className={`${inputClass} resize-none ${fieldErrors.message ? 'border-red-400/80 focus:border-red-400' : ''}`}
                      />
                      {fieldErrors.message && (
                        <p className="text-[11px] text-[#F5EEE9]/80 mt-1.5 font-light">
                          {fieldErrors.message}
                        </p>
                      )}
                    </div>

                    <TurnstileWidget
                      action="contact_modal"
                      resetSignal={turnstileReset}
                      onToken={setTurnstileToken}
                    />

                    <button
                      type="submit"
                      disabled={loading || (Boolean(TURNSTILE_SITE_KEY) && !turnstileToken)}
                      className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] font-medium text-[11px] uppercase tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[48px] touch-manipulation shadow-[0_4px_20px_rgba(67,19,34,0.35)] hover:shadow-[0_6px_28px_rgba(102,28,48,0.5)] border border-white/10"
                    >
                      {loading ? (
                        <span className="opacity-70">{copy.contato.submitting}</span>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>{copy.contato.submitCta}</span>
                        </>
                      )}
                    </button>
                    {TURNSTILE_SITE_KEY && !turnstileToken && (
                      <p className="text-center text-[10px] text-zinc-500">{copy.contato.turnstileHint}</p>
                    )}
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
