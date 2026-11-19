/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/nua/site/Header';
import { Footer } from '@/components/nua/site/Footer';
import { PageTransition, Reveal } from '@/components/nua/site/PageTransition';
import { PublicBackground } from '@/components/nua/site/PublicBackground';
import { usePublishedContent, getPublicApiUrl } from '@/lib/contentStore';
import { Mail, Send, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

export default function ContatoPage() {
  const content = usePublishedContent();
  const [renderedAt, setRenderedAt] = useState<number>(Date.now());

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Parceria Comercial / Publicidade');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState(''); // Campo oculto anti-spam

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
          <main className="flex-1 pt-28 pb-20 sm:pt-36 sm:pb-28 relative select-none">
            {/* Glow de fundo editorial unificado */}
            <PublicBackground />
            <div className="max-w-[54rem] mx-auto px-4 sm:px-8">

              {/* Header da Página */}
              <Reveal delay={0}>
                <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
                  <span className="text-[#90364B] text-[11px] font-semibold tracking-[0.28em] uppercase block mb-3 inline-flex items-center justify-center gap-2">
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

              {/* Card Formulario High-End */}
              <Reveal delay={20}>
                <div className="rounded-[32px] p-2 bg-[#090a0f] border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.95)]">
                  <div className="rounded-[26px] bg-[#050507] p-6 sm:p-10 border border-white/[0.03]">

                    {/* Canal direto de e-mail */}
                    <div className="mb-8 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between text-xs text-zinc-300">
                      <div className="flex items-center gap-2.5">
                        <Mail className="w-4 h-4 text-[#90364B]" />
                        <span>E-mail Oficial:</span>
                        <strong className="text-white font-mono">{contactData.officialEmail}</strong>
                      </div>
                      <span className="hidden sm:inline text-zinc-500 font-light">Atendimento Discreto</span>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5 select-none">
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
                        <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                          Seu Nome *
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Digite seu nome completo"
                          className="w-full h-11 rounded-xl bg-[#0d0e14] border border-white/10 px-4 text-xs sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-[#90364B] transition-colors"
                        />
                      </div>

                      {/* E-mail */}
                      <div>
                        <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                          E-mail de Contato *
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="seu.email@exemplo.com"
                          className="w-full h-11 rounded-xl bg-[#0d0e14] border border-white/10 px-4 text-xs sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-[#90364B] transition-colors"
                        />
                      </div>

                      {/* Assunto */}
                      <div>
                        <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                          Assunto da Mensagem *
                        </label>
                        <select
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          className="w-full h-11 rounded-xl bg-[#0d0e14] border border-white/10 px-4 text-xs sm:text-sm text-white outline-none focus:border-[#90364B] transition-colors cursor-pointer"
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
                        <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                          Sua Mensagem *
                        </label>
                        <textarea
                          required
                          rows={5}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Escreva os detalhes da sua proposta ou dúvida..."
                          className="w-full rounded-xl bg-[#0d0e14] border border-white/10 p-4 text-xs sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-[#90364B] transition-colors resize-none"
                        />
                      </div>

                      {/* Feedback Sucesso */}
                      {successMsg && (
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400 text-xs">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>{successMsg}</span>
                        </div>
                      )}

                      {/* Feedback Erro */}
                      {errorMsg && (
                        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-400 text-xs">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{errorMsg}</span>
                        </div>
                      )}

                      {/* Botão Enviar */}
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full min-h-[50px] rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] text-xs font-bold uppercase tracking-widest transition shadow-[0_4px_24px_rgba(67,19,34,0.45)] border border-white/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{submitting ? 'Enviando...' : 'Enviar Mensagem'}</span>
                      </button>
                    </form>

                    <div className="mt-6 pt-4 border-t border-white/[0.04] text-center">
                      <span className="text-[11px] text-zinc-500 font-light inline-flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#90364B]" />
                        Seus dados são confidenciais e protegidos pela política de privacidade.
                      </span>
                    </div>

                  </div>
                </div>
              </Reveal>

            </div>
          </main>

          <Footer
            customFooterData={content.footer}
            customInstitutionalData={content.institutional}
          />
        </div>
      </PageTransition>
    </>
  );
}
