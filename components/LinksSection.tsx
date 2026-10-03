'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Instagram, Mail, Lock } from 'lucide-react';
import { OnlyFansIcon } from './Icons';
import { SiteContent } from '@/lib/types';
import { sanitizeUrl } from '@/lib/security';

interface LinksSectionProps {
  onOpenContact: () => void;
  onOpenExclusive?: () => void;
  customChannelsData?: SiteContent['channels'];
}

export function LinksSection({ onOpenContact, customChannelsData }: LinksSectionProps) {
  const eyebrow = customChannelsData?.eyebrow || 'CANAIS OFICIAIS';
  const title = customChannelsData?.title || 'Presença & Conexão';
  const subtitle =
    customChannelsData?.subtitle ||
    'Acompanhe a pesquisa, os diálogos sobre sexologia e os ensaios autorais exclusivos.';

  const ofData = customChannelsData?.onlyfans || {
    title: 'OnlyFans',
    badge: 'ACERVO EXCLUSIVO',
    description:
      'Acesso aos ensaios fotográficos completos em alta resolução, vídeos e produções autorais sem censura.',
    tags: ['Ensaios Completos', 'Sem Censura', 'Produção Autoral'],
    buttonText: 'ACESSAR ACERVO EXCLUSIVO',
    url: 'https://onlyfans.com/nuaborges',
  };

  const igData = customChannelsData?.instagram || {
    title: 'Instagram',
    handle: '@nuaborges',
    description:
      'Reflexões diárias sobre corpo, relações, liberdade e desmistificação do prazer sem rodeios.',
    tags: ['Educação Sexual', 'Corpo & Tabus', 'Rotina & Bastidores'],
    buttonText: 'ACOMPANHAR NO INSTAGRAM',
    url: 'https://www.instagram.com/nuaborges',
  };

  const contactData = customChannelsData?.contactBanner || {
    title: 'Assessoria, Imprensa & Parcerias Comerciais',
    description: 'Atendimento direto para marcas, entrevistas, colaborações e propostas.',
    buttonText: 'Iniciar Contato Comercial →',
  };

  return (
    <section id="links" className="py-14 sm:py-20 lg:py-24 bg-black relative select-none border-t border-white/[0.04]">
      {/* Luz ambiente discreta */}
      <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-[#f4a7b9]/[0.02] rounded-full blur-[160px] pointer-events-none -translate-y-1/2" />

      <div className="max-w-[72rem] mx-auto px-4 sm:px-8 md:px-10 lg:px-12">

        {/* Section header com animação suave de entrada */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="text-[#f4a7b9] text-[11px] font-semibold tracking-[0.28em] uppercase block mb-2.5">
              {eyebrow}
            </span>
            <h2 className="font-serif text-[2.2rem] sm:text-4xl lg:text-[2.85rem] text-white tracking-tight leading-[1.08]">
              {title}
            </h2>
            <p className="text-zinc-400 text-sm font-light mt-2 max-w-md leading-relaxed">
              {subtitle}
            </p>
          </motion.div>
        </div>

        {/* Platform cards — Estáveis e com hover sóbrio */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-7">
          {/* OnlyFans card */}
          <motion.a
            href={sanitizeUrl(ofData.url)}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="group relative rounded-[24px] sm:rounded-[28px] bg-[#08080a] border border-white/[0.08] hover:border-[#f4a7b9]/35 p-6 sm:p-8 md:p-9 flex flex-col justify-between min-h-[230px] sm:min-h-[260px] transition-colors duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.7)] cursor-pointer"
            aria-label={`Acessar ${ofData.title} oficial`}
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#f4a7b9]/10 border border-[#f4a7b9]/20 flex items-center justify-center text-[#f4a7b9] shrink-0">
                  <OnlyFansIcon className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f4a7b9]/10 border border-[#f4a7b9]/20 text-[#f4a7b9] text-[10px] font-semibold tracking-wider uppercase">
                  <Lock className="w-2.5 h-2.5 stroke-[2.5]" />
                  <span>{ofData.badge}</span>
                </span>
              </div>

              <div className="mt-5 mb-3">
                <h3 className="font-serif text-[1.5rem] text-white group-hover:text-[#f4a7b9] transition-colors duration-200">
                  {ofData.title}
                </h3>
                <p className="text-zinc-400 text-[13px] sm:text-[14px] font-light leading-relaxed mt-1.5">
                  {ofData.description}
                </p>
              </div>

              {/* Editorial tags */}
              <div className="flex flex-wrap gap-2 mb-5">
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

            <div className="flex items-center text-[11px] font-bold tracking-widest uppercase text-[#f4a7b9] gap-2 pt-3 border-t border-white/[0.05]">
              <span>{ofData.buttonText}</span>
              <span>→</span>
            </div>
          </motion.a>

          {/* Instagram card */}
          <motion.a
            href={sanitizeUrl(igData.url)}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="group relative rounded-[24px] sm:rounded-[28px] bg-[#08080a] border border-white/[0.08] hover:border-white/25 p-6 sm:p-8 md:p-9 flex flex-col justify-between min-h-[230px] sm:min-h-[260px] transition-colors duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.7)] cursor-pointer"
            aria-label={`Acessar Instagram ${igData.handle}`}
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-300 group-hover:text-white shrink-0 transition-colors duration-200">
                  <Instagram className="w-5 h-5" strokeWidth={1.7} />
                </div>
                <span className="text-[12px] font-mono text-zinc-400 tracking-wider">
                  {igData.handle}
                </span>
              </div>

              <div className="mt-5 mb-3">
                <h3 className="font-serif text-[1.5rem] text-white group-hover:text-[#f4a7b9] transition-colors duration-200">
                  {igData.title}
                </h3>
                <p className="text-zinc-400 text-[13px] sm:text-[14px] font-light leading-relaxed mt-1.5">
                  {igData.description}
                </p>
              </div>

              {/* Editorial tags */}
              <div className="flex flex-wrap gap-2 mb-5">
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

            <div className="flex items-center text-[11px] font-bold tracking-widest uppercase text-zinc-300 group-hover:text-[#f4a7b9] gap-2 transition-colors duration-200 pt-3 border-t border-white/[0.05]">
              <span>{igData.buttonText}</span>
              <span>→</span>
            </div>
          </motion.a>
        </div>

        {/* Contact strip com hover sutil */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20px' }}
          transition={{ duration: 0.7, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 sm:mt-8 p-5 sm:p-7 rounded-[22px] sm:rounded-[26px] bg-[#070709] border border-white/[0.06] hover:border-white/[0.12] flex flex-col sm:flex-row items-center justify-between gap-5 transition-colors duration-300"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3.5 sm:gap-4 text-center sm:text-left">
            <div className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#f4a7b9] shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <span className="text-zinc-100 text-[15px] font-medium block leading-tight font-serif">
                {contactData.title}
              </span>
              <span className="text-zinc-400 text-[13px] font-light block mt-1">
                {contactData.description}
              </span>
            </div>
          </div>

          <button
            onClick={onOpenContact}
            className="w-full sm:w-auto min-h-[46px] px-7 py-3 rounded-full border border-white/12 hover:border-white/30 text-[11px] font-bold tracking-wider uppercase text-zinc-300 hover:text-white transition-colors duration-200 cursor-pointer whitespace-nowrap touch-manipulation flex items-center justify-center gap-2 hover:bg-white/[0.03]"
          >
            <span>{contactData.buttonText}</span>
          </button>
        </motion.div>
      </div>
    </section>
  );
}
