/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Crown, Film, Sliders, ArrowRight } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/media';
import { CHAMADAS_PUBLIC_ENABLED } from '@/lib/featureFlags';
import { useCopy } from '@/lib/copy';

export interface CaminhoItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  buttonText: string;
  href: string;
  secondaryButtonText?: string;
  secondaryHref?: string;
  bgUrl: string;
}

interface HomeCaminhosProps {
  customCaminhos?: CaminhoItem[];
}

export function HomeCaminhos({ customCaminhos }: HomeCaminhosProps) {
  const { copy } = useCopy();

  const resolvedDefaultCaminhos: CaminhoItem[] = copy.home.caminhos.items.map((item) => {
    const bgUrl =
      item.id === 'acervo'
        ? '/images/nua/gallery/gallery-1.png'
        : item.id === 'avulsos'
        ? '/images/nua/gallery/gallery-2.png'
        : '/images/nua/gallery/gallery-3.png';

    if (item.id === 'experiencias') {
      return {
        id: item.id,
        title: item.title,
        subtitle: CHAMADAS_PUBLIC_ENABLED
          ? item.subtitle
          : item.subtitleComingSoon || item.subtitle,
        description: CHAMADAS_PUBLIC_ENABLED
          ? item.description
          : item.descriptionComingSoon || item.description,
        buttonText: CHAMADAS_PUBLIC_ENABLED
          ? item.buttonText
          : item.buttonTextComingSoon || item.buttonText,
        href: CHAMADAS_PUBLIC_ENABLED ? '/chamadas' : '/personalizados',
        secondaryButtonText: CHAMADAS_PUBLIC_ENABLED
          ? undefined
          : item.secondaryButtonTextComingSoon,
        secondaryHref: CHAMADAS_PUBLIC_ENABLED ? undefined : '/chamadas',
        bgUrl,
      };
    }

    return {
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      description: item.description,
      buttonText: item.buttonText,
      href: item.id === 'acervo' ? '/acervo' : '/avulsos',
      bgUrl,
    };
  });

  const caminhos =
    customCaminhos && customCaminhos.length > 0 ? customCaminhos : resolvedDefaultCaminhos;

  const getIcon = (id: string) => {
    if (id === 'acervo') return Crown;
    if (id === 'avulsos') return Film;
    return Sliders;
  };

  return (
    <section id="caminhos" className="py-12 sm:py-16 lg:py-20 bg-black relative overflow-x-clip border-t border-white/[0.05]">
      <div className="max-w-[72rem] mx-auto px-4 sm:px-8 md:px-10 lg:px-12">
        {/* Cabeçalho */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <span className="text-[#F5EEE9]/80 text-[11px] font-semibold tracking-[0.28em] uppercase block mb-3">
            {copy.home.caminhos.eyebrow}
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight">
            {copy.home.caminhos.title}
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base font-light mt-3">
            {copy.home.caminhos.subtitle}
          </p>
        </div>

        {/* Grid de 3 Colunas com Imagem de Fundo Escurecida */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-7">
          {caminhos.map((caminho, idx) => {
            const Icon = getIcon(caminho.id);

            return (
              <motion.div
                key={caminho.id || idx}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.6, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="group relative rounded-[28px] overflow-hidden border border-white/10 hover:border-[#702638]/65 transition-[border-color,box-shadow] duration-300 min-h-[380px] flex flex-col justify-between p-6 sm:p-7 shadow-[0_16px_50px_rgba(0,0,0,0.85)] bg-zinc-950"
              >
                {/* Imagem de Fundo Escurecida em Alta Definição */}
                <div className="absolute inset-0 z-0">
                  <Image
                    src={resolveMediaUrl(caminho.bgUrl, 'mobile')}
                    alt={caminho.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover object-center brightness-[0.35] motion-safe:[@media(hover:hover)]:group-hover:scale-[1.03] [@media(hover:hover)]:group-hover:brightness-[0.42] transition-[transform,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
                </div>

                {/* Conteúdo Superior */}
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-2xl bg-black/60 border border-white/15 flex items-center justify-center mb-4 text-[#F5EEE9]/80">
                    <Icon className="w-5 h-5" />
                  </div>

                  <span className="text-[10px] font-mono text-[#F5EEE9]/80 uppercase tracking-wider block mb-1">
                    {caminho.subtitle}
                  </span>

                  <h3 className="font-serif text-2xl sm:text-3xl text-white group-hover:text-[#F5EEE9] transition-colors leading-snug">
                    {caminho.title}
                  </h3>

                  <p className="text-zinc-300 text-xs sm:text-sm font-light leading-relaxed mt-3 opacity-90">
                    {caminho.description}
                  </p>
                </div>

                {/* Ações do Caminho */}
                <div className="relative z-10 pt-6 space-y-2.5">
                  <Link
                    href={caminho.href}
                    className="w-full min-h-[46px] rounded-full bg-white/10 hover:bg-gradient-to-r hover:from-[#431322] hover:via-[#661C30] hover:to-[#7A293D] text-[#F5EEE9] hover:text-white text-[11px] font-bold tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 border border-white/15 hover:border-white/20 hover:shadow-[0_4px_20px_rgba(67,19,34,0.4)] cursor-pointer"
                  >
                    <span>{caminho.buttonText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  {caminho.secondaryHref && caminho.secondaryButtonText && (
                    <Link
                      href={caminho.secondaryHref}
                      className="w-full py-1.5 text-center text-[11px] font-light text-zinc-400 hover:text-[#F5EEE9] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>{caminho.secondaryButtonText}</span>
                      <ArrowRight className="w-3 h-3 text-[#90364B]" />
                    </Link>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
