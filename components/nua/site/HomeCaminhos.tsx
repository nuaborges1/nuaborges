'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Crown, Film, Sliders, ArrowRight } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/media';

export interface CaminhoItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  buttonText: string;
  href: string;
  bgUrl: string;
}

const DEFAULT_CAMINHOS: CaminhoItem[] = [
  {
    id: 'acervo',
    title: 'Acervo Completo',
    subtitle: 'Tudo, sem censura, todo mês',
    description: 'Acesso irrestrito e ilimitado a todos os ensaios, vídeos 4K e registros do clube privativo.',
    buttonText: 'Acessar Clube VIP',
    href: '/acervo',
    bgUrl: '/images/nua/gallery/gallery-1.png',
  },
  {
    id: 'avulsos',
    title: 'Obras Avulsas',
    subtitle: 'Escolha só o que te desperta',
    description: 'Adquira produções e ensaios unitários de forma avulsa, sem mensalidade e com acesso vitalício.',
    buttonText: 'Explorar Catálogo',
    href: '/avulsos',
    bgUrl: '/images/nua/gallery/gallery-2.png',
  },
  {
    id: 'experiencias',
    title: 'Experiências Privativas',
    subtitle: 'Atendimento e encomendas sob medida',
    description: 'Agende chamadas privativas 1-on-1 com total sigilo ou solicite fotos e vídeos personalizados.',
    buttonText: 'Solicitar Atendimento',
    href: '/chamadas',
    bgUrl: '/images/nua/gallery/gallery-3.png',
  },
];

interface HomeCaminhosProps {
  customCaminhos?: CaminhoItem[];
}

export function HomeCaminhos({ customCaminhos }: HomeCaminhosProps) {
  const caminhos = customCaminhos && customCaminhos.length > 0 ? customCaminhos : DEFAULT_CAMINHOS;

  const getIcon = (id: string) => {
    if (id === 'acervo') return Crown;
    if (id === 'avulsos') return Film;
    return Sliders;
  };

  return (
    <section id="caminhos" className="py-16 sm:py-24 bg-[#020203] relative select-none border-t border-white/[0.05]">
      <div className="max-w-[76rem] mx-auto px-4 sm:px-8 md:px-10 lg:px-12">
        {/* Cabeçalho */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="text-[#f4a7b9] text-[11px] font-semibold tracking-[0.28em] uppercase block mb-3">
            FORMAS DE VIVER A NUA
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight">
            Três caminhos de acesso
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base font-light mt-3">
            Escolha como deseja se conectar com o universo autoral de Nua Borges.
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
                className="group relative rounded-[28px] overflow-hidden border border-white/10 hover:border-[#f4a7b9]/40 transition-all duration-500 min-h-[380px] flex flex-col justify-between p-6 sm:p-7 shadow-[0_16px_50px_rgba(0,0,0,0.85)] bg-zinc-950"
              >
                {/* Imagem de Fundo Escurecida em Alta Definição */}
                <div className="absolute inset-0 z-0">
                  <Image
                    src={resolveMediaUrl(caminho.bgUrl, 'mobile')}
                    alt={caminho.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover object-center brightness-[0.35] group-hover:scale-105 group-hover:brightness-[0.42] transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
                </div>

                {/* Conteúdo Superior */}
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-2xl bg-black/60 border border-white/15 flex items-center justify-center mb-4 text-[#f4a7b9]">
                    <Icon className="w-5 h-5" />
                  </div>

                  <span className="text-[10px] font-mono text-[#f4a7b9] uppercase tracking-wider block mb-1">
                    {caminho.subtitle}
                  </span>

                  <h3 className="font-serif text-2xl sm:text-3xl text-white group-hover:text-[#f4a7b9] transition-colors leading-snug">
                    {caminho.title}
                  </h3>

                  <p className="text-zinc-300 text-xs sm:text-sm font-light leading-relaxed mt-3 opacity-90">
                    {caminho.description}
                  </p>
                </div>

                {/* Botão Único do Caminho */}
                <div className="relative z-10 pt-6">
                  <Link
                    href={caminho.href}
                    className="w-full min-h-[46px] rounded-full bg-white/10 hover:bg-[#f4a7b9] text-white hover:text-black text-[11px] font-bold tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 border border-white/15 hover:border-[#f4a7b9] cursor-pointer"
                  >
                    <span>{caminho.buttonText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
