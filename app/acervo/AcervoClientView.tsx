'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Heart,
} from 'lucide-react';
import { Header } from '@/components/nua/site/Header';
import { Footer } from '@/components/nua/site/Footer';
import { ContactModal } from '@/components/nua/site/ContactModal';
import { VipModal } from '@/components/nua/site/VipModal';
import { PublicBackground } from '@/components/nua/site/PublicBackground';
import { OnlyFansIcon, PrivacyIcon, TelegramIcon, PixIcon } from '@/components/nua/site/Icons';
import { usePublishedContent } from '@/lib/contentStore';
import { sanitizeUrl } from '@/lib/security';
import { CANONICAL_FAQS } from '@/lib/faqData';

export function AcervoClientView() {
  const content = usePublishedContent();
  const [contactOpen, setContactOpen] = useState(false);
  const [vipOpen, setVipOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const channels = content.channels;

  const privacyData = channels?.privacy || {
    title: 'Privacy',
    badge: 'PIX & NACIONAL (R$)',
    description:
      'Acesso imediato com pagamento nacional via PIX ou cartão de crédito. Mesmo acervo completo com cobrança discreta.',
    tags: ['Pagamento em PIX', 'Acesso Imediato', 'Extrato Discreto'],
    buttonText: 'ASSINAR VIA PRIVACY (PIX)',
    url: 'https://privacy.com.br/checkout/nuaborges',
    active: true,
  };

  const ofData = channels?.onlyfans || {
    title: 'OnlyFans',
    badge: 'INTERNACIONAL (USD)',
    description:
      'Acesso aos ensaios fotográficos completos em alta resolução, vídeos e produções autorais sem censura. Pagamento internacional em dólar.',
    tags: ['Ensaios Completos', 'Sem Censura', 'Produção Autoral'],
    buttonText: 'ASSINAR VIA ONLYFANS (USD)',
    url: 'https://onlyfans.com/nuaborges',
    active: true,
  };

  const closefansData = channels?.closefans || {
    title: 'Close Fans + Telegram',
    badge: 'CANAL VIP TELEGRAM',
    description:
      'Acesso pelo site e canal secreto VIP no Telegram com prévias, áudios e interação. Aceita PIX e cartões.',
    tags: ['Canal VIP Telegram', 'Áudios & Bastidores', 'PIX & Cartão'],
    buttonText: 'ENTRAR NO CLOSE FANS',
    url: 'https://close.fans/nuaborges',
    active: true,
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#f4a7b9] selection:text-black flex flex-col">
      {/* Header Fixo */}
      <Header
        onOpenContact={() => setContactOpen(true)}
        activeSection="acervo"
        customHeaderData={content.header}
      />

      <main className="flex-1 pt-28 sm:pt-36 pb-20 select-none relative">
        {/* Glow de fundo editorial unificado */}
        <PublicBackground />

        {/* Topo / Hero da Página de Acervo */}
        <section className="relative px-4 sm:px-8 md:px-10 lg:px-12 max-w-[72rem] mx-auto text-center mb-14 sm:mb-20">

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10"
          >
            <span className="text-[#f4a7b9] text-[11px] font-semibold tracking-[0.28em] uppercase block mb-3">
              EXPERIÊNCIA EXCLUSIVA
            </span>
            <h1 className="font-serif text-[2.5rem] sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.05] max-w-3xl mx-auto">
              Escolha como deseja se conectar
            </h1>
            <p className="text-zinc-400 text-sm sm:text-base font-light mt-4 max-w-2xl mx-auto leading-relaxed">
              Acesso a produções completas em alta definição, ensaios fotográficos autorais, vídeos
              sem censura e intimidade autoral sem intermediários.
            </p>
          </motion.div>
        </section>

        {/* Grid das Plataformas */}
        <section className="px-4 sm:px-8 md:px-10 lg:px-12 max-w-[72rem] mx-auto mb-16 sm:mb-24">
          <div
            className={`grid grid-cols-1 ${
              closefansData.active === true
                ? 'md:grid-cols-3'
                : 'md:grid-cols-2 max-w-4xl mx-auto'
            } gap-6 sm:gap-7`}
          >
            {/* 1. Privacy (Destaque Brasil) */}
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-[28px] bg-gradient-to-b from-[#0d0d12] to-[#070709] border border-[#f4a7b9]/40 p-6 sm:p-8 flex flex-col justify-between shadow-[0_16px_50px_rgba(244,167,185,0.08)] group hover:border-[#f4a7b9]/70 transition-all duration-300"
            >
              {/* Badge Topo Flutuante */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#f4a7b9] text-black text-[10px] font-bold tracking-widest uppercase shadow-md whitespace-nowrap">
                Mais Popular no Brasil
              </div>

              <div>
                <div className="flex items-start justify-between mt-2 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-[#f4a7b9]/15 border border-[#f4a7b9]/30 flex items-center justify-center text-[#f4a7b9] shrink-0">
                    <PrivacyIcon className="w-6 h-6" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f4a7b9]/10 border border-[#f4a7b9]/25 text-[#f4a7b9] text-[10px] font-semibold tracking-wider uppercase">
                    <PixIcon className="w-3 h-3 text-[#f4a7b9]" />
                    <span>{privacyData.badge}</span>
                  </span>
                </div>

                <h2 className="font-serif text-2xl text-white group-hover:text-[#f4a7b9] transition-colors duration-200">
                  {privacyData.title}
                </h2>
                <p className="text-zinc-400 text-[13px] font-light leading-relaxed mt-2.5">
                  {privacyData.description}
                </p>

                <div className="flex flex-wrap gap-1.5 mt-5 mb-6">
                  {privacyData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] text-zinc-300 bg-white/[0.04] border border-white/[0.08] px-2.5 py-0.5 rounded-full font-light"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.06]">
                <a
                  href={sanitizeUrl(privacyData.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[46px] px-6 py-3 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-black text-[11px] font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(244,167,185,0.25)] active:scale-[0.98]"
                >
                  <span>{privacyData.buttonText}</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </a>
              </div>
            </motion.div>

            {/* 2. OnlyFans (Internacional) */}
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-[28px] bg-gradient-to-b from-[#09090c] to-[#050507] border border-white/[0.08] hover:border-white/25 p-6 sm:p-8 flex flex-col justify-between shadow-[0_12px_40px_rgba(0,0,0,0.7)] group transition-all duration-300"
            >
              <div>
                <div className="flex items-start justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-300 group-hover:text-white shrink-0 transition-colors duration-200">
                    <OnlyFansIcon className="w-5 h-5" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-[10px] font-semibold tracking-wider uppercase">
                    <Lock className="w-2.5 h-2.5" />
                    <span>{ofData.badge}</span>
                  </span>
                </div>

                <h2 className="font-serif text-2xl text-white group-hover:text-[#f4a7b9] transition-colors duration-200">
                  {ofData.title}
                </h2>
                <p className="text-zinc-400 text-[13px] font-light leading-relaxed mt-2.5">
                  {ofData.description}
                </p>

                <div className="flex flex-wrap gap-1.5 mt-5 mb-6">
                  {ofData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] text-zinc-400 bg-white/[0.03] border border-white/[0.06] px-2.5 py-0.5 rounded-full font-light"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.06]">
                <a
                  href={sanitizeUrl(ofData.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[46px] px-6 py-3 rounded-full border border-white/15 hover:border-white/35 text-zinc-200 hover:text-white text-[11px] font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2 hover:bg-white/[0.03] active:scale-[0.98]"
                >
                  <span>{ofData.buttonText}</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </a>
              </div>
            </motion.div>

            {/* 3. Close Fans + Telegram */}
            {closefansData.active === true && (
              <motion.div
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="relative rounded-[28px] bg-gradient-to-b from-[#09090c] to-[#050507] border border-white/[0.08] hover:border-white/25 p-6 sm:p-8 flex flex-col justify-between shadow-[0_12px_40px_rgba(0,0,0,0.7)] group transition-all duration-300"
              >
                <div>
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-300 group-hover:text-white shrink-0 transition-colors duration-200">
                      <TelegramIcon className="w-5 h-5" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-[10px] font-semibold tracking-wider uppercase">
                      <Lock className="w-2.5 h-2.5" />
                      <span>{closefansData.badge}</span>
                    </span>
                  </div>

                  <h2 className="font-serif text-2xl text-white group-hover:text-[#f4a7b9] transition-colors duration-200">
                    {closefansData.title}
                  </h2>
                  <p className="text-zinc-400 text-[13px] font-light leading-relaxed mt-2.5">
                    {closefansData.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-5 mb-6">
                    {closefansData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] text-zinc-400 bg-white/[0.03] border border-white/[0.06] px-2.5 py-0.5 rounded-full font-light"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.06]">
                  <a
                    href={sanitizeUrl(closefansData.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full min-h-[46px] px-6 py-3 rounded-full border border-white/15 hover:border-white/35 text-zinc-200 hover:text-white text-[11px] font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2 hover:bg-white/[0.03] active:scale-[0.98]"
                  >
                    <span>{closefansData.buttonText}</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </a>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* Faixa de Segurança & Privacidade Absoluta */}
        <section className="px-4 sm:px-8 md:px-10 lg:px-12 max-w-[72rem] mx-auto mb-16 sm:mb-24">
          <div className="rounded-[24px] sm:rounded-[28px] bg-[#07070a] border border-white/[0.06] p-6 sm:p-9 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="w-12 h-12 rounded-2xl bg-[#f4a7b9]/10 border border-[#f4a7b9]/25 flex items-center justify-center text-[#f4a7b9] shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-white font-medium">
                  Privacidade & Sigilo no Extrato Bancário
                </h3>
                <p className="text-zinc-400 text-xs sm:text-sm font-light mt-1 max-w-xl leading-relaxed">
                  Cobrança 100% segura e discreta processada por intermediadores de pagamento
                  certificados. Nenhuma menção a conteúdo adulto ou nome artístico no extrato do seu
                  cartão ou banco.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono tracking-wider shrink-0">
              <span className="flex items-center gap-1.5">
                <PixIcon className="w-3.5 h-3.5 text-[#f4a7b9]" /> PIX
              </span>
              <span>•</span>
              <span>Cartões Nacionais</span>
              <span>•</span>
              <span>Liberação Imediata</span>
            </div>
          </div>
        </section>

        {/* FAQ - Dúvidas Frequentes sobre Assinatura */}
        <section className="px-4 sm:px-8 md:px-10 lg:px-12 max-w-3xl mx-auto mb-16 sm:mb-24">
          <div className="text-center mb-8 sm:mb-10">
            <span className="text-[#f4a7b9] text-[10px] font-semibold tracking-[0.28em] uppercase block mb-2">
              DÚVIDAS FREQUENTES
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl text-white">
              Tudo o que você precisa saber
            </h2>
          </div>

          <div className="space-y-3">
            {CANONICAL_FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-[#08080b] border border-white/[0.06] overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="font-serif text-[15px] sm:text-base text-zinc-100 font-medium">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#f4a7b9] transition-transform duration-300 shrink-0 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div className="px-5 pb-5 pt-1 text-zinc-400 text-xs sm:text-sm font-light leading-relaxed border-t border-white/[0.03]">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* Convite Sutil para a Lista VIP */}
        <section className="px-4 sm:px-8 md:px-10 lg:px-12 max-w-xl mx-auto text-center">
          <div className="p-6 rounded-2xl bg-[#060608] border border-white/[0.05]">
            <Heart className="w-5 h-5 text-[#f4a7b9] mx-auto mb-2" />
            <span className="text-zinc-200 text-sm font-serif block">
              Deseja receber prévias e recados íntimos antes de assinar?
            </span>
            <p className="text-zinc-500 text-xs font-light mt-1 mb-4">
              Faça parte da Lista VIP gratuita da Nua Borges com total discrição.
            </p>
            <button
              onClick={() => setVipOpen(true)}
              className="px-6 py-2.5 rounded-full border border-[#f4a7b9]/40 hover:border-[#f4a7b9] text-[#f4a7b9] hover:bg-[#f4a7b9]/10 text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer"
            >
              Entrar na Lista VIP ♡
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer
        customFooterData={content.footer}
        customInstitutionalData={content.institutional}
      />

      {/* Modals */}
      <ContactModal
        isOpen={contactOpen}
        onClose={() => setContactOpen(false)}
        customContactData={content.contact}
      />

      <VipModal
        isOpen={vipOpen}
        onClose={() => setVipOpen(false)}
        customVipData={content.vipClub}
      />
    </div>
  );
}
