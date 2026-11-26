/* Vinho maduro / Nua Borges */
'use client';

import type { SiteContent } from '@/lib/types';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/nua/site/Header';
import { Footer } from '@/components/nua/site/Footer';
import { PageTransition, Reveal } from '@/components/nua/site/PageTransition';
import { PublicBackground } from '@/components/nua/site/PublicBackground';
import { usePublishedContent, getPublicApiUrl } from '@/lib/contentStore';
import { TURNSTILE_SITE_KEY, TurnstileWidget } from '@/components/nua/account/TurnstileWidget';
import { Mail, Send, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

export function ContatoClientView({ initialContent }: { initialContent?: Partial<SiteContent> }) {
  const content = usePublishedContent(initialContent);
  const [renderedAt, setRenderedAt] = useState<number>(Date.now());

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Parceria Comercial / Publicidade');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState(''); // Campo oculto anti-spam
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
  const [turnstileReset, setTurnstileReset] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setRenderedAt(Date.now());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const apiUrl = getPublicApiUrl();
      const res = await fetch(`${apiUrl}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject,
          message: message.trim(),
          company_website_verify: honeypot,
          renderedAt,
          turnstileToken,
        }),
      });

      const data = await res.json() as any;

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao enviar mensagem.');
      }

      setSuccessMsg('Mensagem enviada com sucesso! Em breve entraremos em contato.');
      setName('');
      setEmail('');
      setMessage('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro ao enviar sua mensagem. Tente novamente.');
    } finally {
      setSubmitting(false);
      setTurnstileToken(undefined);
      setTurnstileReset((value) => value + 1);
    }
  };

  const contactData = content.contact || {
    modalTitle: 'Assessoria & Contato',
    modalSubtitle: 'Propostas comerciais, imprensa, palestras e colaborações.',
    officialEmail: 'contato@nuaborges.com.br',
    subjects: [
      'Parceria Comercial / Publicidade',
      'Imprensa / Entrevista',
      'Dúvidas & Acesso Exclusivo',
      'Outro Assunto',
    ],
  };

  return (
    <>
      <Header
        onOpenContact={() => {}}
        activeSection="contato"
        customHeaderData={content.header}
      />

      <PageTransition>
        <div className="min-h-screen w-full overflow-x-clip bg-black text-white selection:bg-[#661C30] selection:text-white flex flex-col">
          <main className="flex-1 pt-28 pb-20 sm:pt-36 sm:pb-28 relative">
            {/* Glow de fundo editorial unificado */}
            <PublicBackground />
            <div className="max-w-[54rem] mx-auto px-4 sm:px-8">

              {/* Header da Página */}
              <Reveal delay={0}>
                <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
                  <span className="text-[#F5EEE9]/80 text-[11px] font-semibold tracking-[0.28em] uppercase mb-3 inline-flex items-center justify-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#90364B]" />
                    <span>ASSESSORIA &amp; ATENDIMENTO</span>
                  </span>
                  <h1 className="font-serif text-4xl sm:text-5xl text-white tracking-tight">
                    {contactData.modalTitle || 'Entre em Contato'}
                  </h1>
                  <p className="text-zinc-400 text-sm sm:text-base font-light mt-3 leading-relaxed">
                    {contactData.modalSubtitle || 'Propostas comerciais, imprensa, palestras e colaborações.'}
                  </p>
                </div>
              </Reveal>

              {/* Card Único Alinhado à Gramática Editorial */}
              <Reveal delay={20}>
                <div className="rounded-[28px] bg-[#08080c] border border-white/[0.08] p-6 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.95)]">
                    {/* Canal direto de e-mail */}
                    <div className="mb-8 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-300">
                      <div className="flex items-center gap-2.5">
                        <Mail className="w-4 h-4 text-[#90364B]" />
                        <span>E-mail Oficial:</span>
                        <strong className="text-white font-mono">{contactData.officialEmail}</strong>
                      </div>
                      <span className="text-zinc-400 font-light">Atendimento Discreto</span>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                      {/* Campo Oculto Honeypot Anti-Spam */}
                      <input
                        type="text"
                        name="company_website_verify"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                        className="hidden"
                        tabIndex={-1}
                        autoComplete="off"
                      />

                      {/* Nome */}
                      <div>
                        <label htmlFor="contato-name" className="text-xs text-zinc-300 font-medium block mb-1.5">
                          Seu Nome *
                        </label>
                        <input
                          id="contato-name"
                          type="text"
                          autoComplete="name"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Digite seu nome completo"
                          className="w-full min-h-[48px] rounded-xl bg-black/60 border border-white/10 px-4 text-base sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-[#90364B] focus:ring-1 focus:ring-[#90364B]/40 transition-colors"
                        />
                      </div>

                      {/* E-mail */}
                      <div>
                        <label htmlFor="contato-email" className="text-xs text-zinc-300 font-medium block mb-1.5">
                          E-mail de Contato *
                        </label>
                        <input
                          id="contato-email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="seu.email@exemplo.com"
                          className="w-full min-h-[48px] rounded-xl bg-black/60 border border-white/10 px-4 text-base sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-[#90364B] focus:ring-1 focus:ring-[#90364B]/40 transition-colors"
                        />
                      </div>

                      {/* Assunto */}
                      <div>
                        <label htmlFor="contato-subject" className="text-xs text-zinc-300 font-medium block mb-1.5">
                          Assunto da Mensagem *
                        </label>
                        <select
                          id="contato-subject"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          className="w-full min-h-[48px] rounded-xl bg-black/60 border border-white/10 px-4 text-base sm:text-sm text-white outline-none focus:border-[#90364B] focus:ring-1 focus:ring-[#90364B]/40 transition-colors cursor-pointer"
                        >
                          {(contactData.subjects || []).map((sub, idx) => (
                            <option key={idx} value={sub} className="bg-zinc-900 text-white">
                              {sub}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Mensagem */}
                      <div>
                        <label htmlFor="contato-message" className="text-xs text-zinc-300 font-medium block mb-1.5">
                          Sua Mensagem *
                        </label>
                        <textarea
                          id="contato-message"
                          required
                          rows={5}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Escreva os detalhes da sua proposta ou dúvida..."
                          className="w-full rounded-xl bg-black/60 border border-white/10 p-4 text-base sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-[#90364B] focus:ring-1 focus:ring-[#90364B]/40 transition-colors resize-none"
                        />
                      </div>

                      {/* Feedback Sucesso */}
                      {successMsg && (
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 text-xs">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>{successMsg}</span>
                        </div>
                      )}

                      {/* Feedback Erro */}
                      {errorMsg && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-300 text-xs">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{errorMsg}</span>
                        </div>
                      )}

                      <TurnstileWidget
                        action="contact_page"
                        resetSignal={turnstileReset}
                        onToken={setTurnstileToken}
                      />

                      {/* Botão Enviar */}
                      <button
                        type="submit"
                        disabled={submitting || (Boolean(TURNSTILE_SITE_KEY) && !turnstileToken)}
                        className="w-full min-h-[50px] rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] text-xs font-bold uppercase tracking-widest transition shadow-[0_4px_24px_rgba(67,19,34,0.45)] border border-white/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{submitting ? 'Enviando...' : 'Enviar Mensagem'}</span>
                      </button>
                      {TURNSTILE_SITE_KEY && !turnstileToken && (
                        <p className="text-center text-[11px] text-zinc-400">Conclua a verificação de segurança para enviar.</p>
                      )}
                    </form>

                    <div className="mt-6 pt-4 border-t border-white/[0.06] text-center">
                      <span className="text-[11px] text-zinc-400 font-light inline-flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#90364B]" />
                        Seus dados são confidenciais e protegidos pela política de privacidade.
                      </span>
                    </div>
                </div>
              </Reveal>

            </div>
          </main>

          <Footer
            customFooterData={content.footer}
            customInstitutionalData={content.institutional}
            customChannelsData={content.channels}
          />
        </div>
      </PageTransition>
    </>
  );
}
