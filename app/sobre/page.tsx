/* Vinho maduro / Nua Borges */
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/nua/site/Header';
import { Footer } from '@/components/nua/site/Footer';
import { ContactModal } from '@/components/nua/site/ContactModal';
import { PageTransition, Reveal } from '@/components/nua/site/PageTransition';
import { PublicBackground } from '@/components/nua/site/PublicBackground';
import { usePublishedContent } from '@/lib/contentStore';
import { resolveMediaUrl } from '@/lib/media';
import { ArrowRight, User, Heart } from 'lucide-react';

export default function SobrePage() {
  const content = usePublishedContent();
  const [contactOpen, setContactOpen] = useState(false);

  const about = content.about || {
    eyebrow: 'MANIFESTO & BIOGRAFIA',
    headline: 'A coragem de despir a vergonha.',
    role: 'Educadora Sexual & Sexóloga em Formação',
    pullQuote: 'A vergonha é a primeira fronteira que nos impõem. Meu trabalho é ajudar a derrubá-la.',
    paragraph1:
      'Meu trabalho nasce do encontro entre a ciência da sexologia e a expressão fotográfica autoral. Acredito na desmistificação do prazer como ferramenta de autoconhecimento e dignidade.',
    paragraph2:
      'Aqui compartilho reflexões profundas sobre corpo, relações e intimidade com acolhimento, verdade e sem nenhum tabu.',
    signature: 'Deixa de vergonha ♡',
    photoUrl: '/images/nua/about/about.jpg',
  };

  return (
    <>
      <Header
        onOpenContact={() => setContactOpen(true)}
        activeSection="sobre"
        customHeaderData={content.header}
      />

      <PageTransition>
        <div className="min-h-screen w-full overflow-x-clip bg-black text-white selection:bg-[#661C30] selection:text-white flex flex-col">
          <main className="flex-1 pt-28 pb-20 sm:pt-36 sm:pb-28 relative select-none">
            {/* Glow de fundo editorial unificado */}
            <PublicBackground />
            <div className="max-w-[72rem] mx-auto px-4 sm:px-8 md:px-10 lg:px-12">

              {/* Header da Página */}
              <Reveal delay={0}>
                <div className="max-w-3xl mb-8 sm:mb-12">
                  <span className="text-[#90364B] text-[11px] font-semibold tracking-[0.28em] uppercase block mb-3 inline-flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-[#90364B]" />
                    <span>{about.eyebrow || 'MANIFESTO & BIOGRAFIA'}</span>
                  </span>
                  <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.08]">
                    {about.headline || 'A coragem de despir a vergonha.'}
                  </h1>
                  <p className="text-[#A65B6C] text-sm sm:text-base font-light mt-3">
                    {about.role || 'Educadora Sexual & Sexóloga em Formação'}
                  </p>
                </div>
              </Reveal>

              {/* Grid Principal: Foto Oficial + Parágrafos */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-14 items-start">

                {/* Lado Esquerdo: Foto Oficial Nua Borges */}
                <Reveal delay={20} className="lg:col-span-5">
                  <div className="relative aspect-[3/4] rounded-[32px] overflow-hidden border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.95)] bg-zinc-950 group">
                    <Image
                      src={resolveMediaUrl(about.photoUrl, 'full')}
                      alt="Nua Borges"
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 40vw"
                      className="object-cover object-center group-hover:scale-[1.03] transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                    <div className="absolute bottom-6 left-6 right-6 text-center">
                      <span className="font-serif italic text-base text-[#90364B] tracking-wider block">
                        {about.signature || 'Deixa de vergonha ♡'}
                      </span>
                    </div>
                  </div>
                </Reveal>

                {/* Lado Direito: Texto Editorial & Filosofia */}
                <Reveal delay={40} className="lg:col-span-7 space-y-6 sm:space-y-8">
                  {about.pullQuote && (
                    <div className="p-6 sm:p-8 rounded-[24px] bg-[#08080c] border border-[#661C30]/35 shadow-lg relative">
                      <span className="text-4xl text-[#90364B]/50 font-serif leading-none block mb-1">“</span>
                      <p className="font-serif text-xl sm:text-2xl text-white italic leading-snug">
                        {about.pullQuote}
                      </p>
                    </div>
                  )}

                  <div className="space-y-4 text-zinc-300 text-sm sm:text-base font-light leading-relaxed">
                    {about.paragraph1 && <p>{about.paragraph1}</p>}
                    {about.paragraph2 && <p>{about.paragraph2}</p>}
                  </div>

                  {/* CTAs de Engajamento */}
                  <div className="pt-6 border-t border-white/[0.08] flex flex-wrap items-center gap-4">
                    <Link
                      href="/acervo"
                      className="min-h-[48px] px-8 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] font-semibold text-xs uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer shadow-[0_6px_28px_rgba(67,19,34,0.45)] border border-white/10"
                    >
                      <Heart className="w-4 h-4 fill-[#F5EEE9]" />
                      <span>Conhecer o Acervo VIP</span>
                    </Link>

                    <button
                      onClick={() => setContactOpen(true)}
                      className="min-h-[48px] px-8 rounded-full bg-white/5 hover:bg-[#661C30]/20 text-[#F5EEE9] font-semibold text-xs uppercase tracking-widest border border-white/10 hover:border-[#7A293D]/50 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Entrar em Contato</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#90364B]" />
                    </button>
                  </div>
                </Reveal>
              </div>

            </div>
          </main>

          <Footer
            customFooterData={content.footer}
            customInstitutionalData={content.institutional}
          />
        </div>
      </PageTransition>

      <ContactModal
        isOpen={contactOpen}
        onClose={() => setContactOpen(false)}
        customContactData={content.contact}
      />
    </>
  );
}
