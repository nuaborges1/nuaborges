/* Vinho maduro / Nua Borges */
'use client';

import type { SiteContent } from '@/lib/types';

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
import { EditorialRichText } from '@/lib/editorialRichText';
import { sanitizeUrl } from '@/lib/security';
import { ArrowRight, Heart } from 'lucide-react';

export function SobreClientView({ initialContent }: { initialContent?: Partial<SiteContent> }) {
  const content = usePublishedContent(initialContent);
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

  const tags = Array.isArray(about.tags) ? about.tags.filter(Boolean) : [];

  const articleBody =
    about.body !== undefined && about.body.trim()
      ? about.body
      : [about.paragraph1, about.paragraph2, about.paragraph3]
          .map((p) => (p || '').trim())
          .filter(Boolean)
          .join('\n\n');

  return (
    <>
      <Header
        onOpenContact={() => setContactOpen(true)}
        activeSection="sobre"
        customHeaderData={content.header}
      />

      <PageTransition>
        <div className="min-h-screen w-full overflow-x-clip bg-black text-white selection:bg-[#661C30] selection:text-white flex flex-col">
          <main className="flex-1 pt-28 pb-20 sm:pt-36 sm:pb-28 relative">
            <PublicBackground />

            {/* Container Centralizado Estilo Blog / Artigo Editorial (Medium / Substack) */}
            <article className="max-w-[48rem] mx-auto px-4 sm:px-8 relative z-10">
              {/* 1. Cabeçalho do Post / Artigo */}
              <Reveal delay={0}>
                <header className="space-y-6 pb-8 sm:pb-10 border-b border-white/[0.08]">
                  {/* Etiquetas / Categorias no topo do Post */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[#F5EEE9]/80 text-[11px] font-semibold tracking-[0.28em] uppercase">
                      {about.eyebrow || 'MANIFESTO & BIOGRAFIA'}
                    </span>
                    {tags.length > 0 && (
                      <>
                        <span className="text-zinc-700">•</span>
                        {tags.map((tag, idx) => (
                          <span
                            key={`${tag}-${idx}`}
                            className="px-3 py-0.5 rounded-full bg-[#661C30]/20 border border-[#90364B]/35 text-[11px] text-[#F5EEE9]/90"
                          >
                            {tag}
                          </span>
                        ))}
                      </>
                    )}
                  </div>

                  {/* Título Principal de Blog / Revista */}
                  <h1 className="font-serif text-4xl sm:text-5xl md:text-[3.4rem] text-white tracking-tight leading-[1.1]">
                    <EditorialRichText
                      text={about.headline || 'A coragem de despir a vergonha.'}
                      inline
                    />
                  </h1>

                  {/* Subtítulo / Lead do Artigo */}
                  {about.pullQuote && (
                    <p className="font-serif italic text-xl sm:text-2xl text-zinc-300 font-light leading-relaxed">
                      &ldquo;<EditorialRichText text={about.pullQuote} inline />&rdquo;
                    </p>
                  )}

                  {/* Barra de Autora do Post (Avatar + Nome + Apresentação) */}
                  <div className="flex items-center gap-3.5 pt-2">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border border-[#90364B]/50 bg-zinc-900 shrink-0">
                      <Image
                        src={resolveMediaUrl(about.photoUrl, 'thumb')}
                        alt="Nua Borges"
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Nua Borges</p>
                      <p className="text-xs text-[#F5EEE9]/80 font-light">
                        {about.role || 'Educadora Sexual & Criadora Autoral'}
                      </p>
                    </div>
                  </div>
                </header>
              </Reveal>

              {/* 2. Foto de Capa Editorial do Artigo (Opcional — controlada pelo painel) */}
              {about.showCoverPhoto !== false && about.photoUrl && (
                <Reveal delay={15}>
                  <figure className="my-8 sm:my-10 relative aspect-[4/5] sm:aspect-[16/11] w-full rounded-[28px] overflow-hidden border border-white/10 bg-zinc-950 shadow-[0_24px_70px_rgba(0,0,0,0.95)]">
                    <Image
                      src={resolveMediaUrl(about.photoUrl, 'full')}
                      alt="Nua Borges"
                      fill
                      priority
                      sizes="(max-width: 768px) 100vw, 768px"
                      className="object-cover object-[center_25%]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent pointer-events-none" />
                  </figure>
                </Reveal>
              )}

              {/* 3. Corpo do Artigo / Biografia (Tipografia de Blog com Fotos Inline, Citações e Subtítulos) */}
              <Reveal delay={30}>
                <div className="text-zinc-200 text-base sm:text-[17.5px] font-light leading-[1.85] space-y-6">
                  <EditorialRichText
                    text={articleBody}
                    align={about.textAlign || 'left'}
                  />
                </div>
              </Reveal>

              {/* 4. Encerramento Autoral do Post (Assinatura + Convite) */}
              <Reveal delay={40}>
                <footer className="mt-12 pt-8 border-t border-white/[0.08] space-y-8">
                  {about.signature && (
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-400 mb-1">
                        Com carinho,
                      </span>
                      <span className="font-script text-3xl sm:text-4xl text-[#F5EEE9]">
                        {about.signature}
                      </span>
                    </div>
                  )}

                  <div className="p-6 sm:p-8 rounded-[28px] bg-[#08080c] border border-[#661C30]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div className="space-y-1">
                      <p className="font-serif text-xl sm:text-2xl text-white">
                        Continue explorando meu universo
                      </p>
                      <p className="text-xs sm:text-sm text-zinc-400 font-light">
                        Conheça meus ensaios autorais completos ou fale diretamente comigo.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                      <Link
                        href={sanitizeUrl(about.primaryCtaUrl || '/acervo')}
                        className="min-h-[46px] px-7 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] font-semibold text-xs uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer shadow-[0_6px_28px_rgba(67,19,34,0.45)] border border-white/10"
                      >
                        <Heart className="w-3.5 h-3.5 fill-[#F5EEE9]" />
                        <span>{about.primaryCtaText || 'Conhecer o Acervo VIP'}</span>
                      </Link>

                      {about.showSecondaryCta !== false && (
                        <button
                          type="button"
                          onClick={() => setContactOpen(true)}
                          className="min-h-[46px] px-6 rounded-full bg-white/5 hover:bg-[#661C30]/20 text-[#F5EEE9] font-semibold text-xs uppercase tracking-widest border border-white/10 hover:border-[#7A293D]/50 transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <span>{about.secondaryCtaText || 'Falar Comigo'}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#90364B]" />
                        </button>
                      )}
                    </div>
                  </div>
                </footer>
              </Reveal>
            </article>
          </main>

          <Footer
            customFooterData={content.footer}
            customInstitutionalData={content.institutional}
            customChannelsData={content.channels}
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
