'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, Crown, Camera, Video } from 'lucide-react';

const EASE = [0.32, 0.72, 0, 1] as const;

interface PathCardProps {
  image: string;
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  text: string;
  links: { href: string; label: string; primary?: boolean }[];
  tall?: boolean;
  delay: number;
}

function PathCard({ image, icon, eyebrow, title, text, links, tall, delay }: PathCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.9, delay, ease: EASE }}
      className={tall ? 'md:row-span-2' : ''}
    >
      <div className="group h-full rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-1.5 transition-colors duration-500 hover:border-[#f4a7b9]/35">
        <div
          className={`relative h-full overflow-hidden rounded-[calc(2rem-0.375rem)] flex items-end ${
            tall ? 'min-h-[460px] md:min-h-[620px]' : 'min-h-[300px]'
          }`}
        >
          <Image
            src={image}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover object-center opacity-55 transition-transform duration-[1200ms] ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/10" />

          <div className="relative p-6 sm:p-8 w-full">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-300">
              {icon}
              {eyebrow}
            </span>
            <h3 className={`mt-4 font-serif text-white tracking-tight leading-[1.06] ${tall ? 'text-3xl sm:text-[2.6rem]' : 'text-2xl sm:text-3xl'}`}>
              {title}
            </h3>
            <p className="mt-3 max-w-md text-sm font-light text-zinc-300/90 leading-relaxed">{text}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              {links.map((link) =>
                link.primary ? (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group/btn inline-flex items-center gap-3 rounded-full bg-[#f4a7b9] pl-5 pr-1.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-black transition-transform duration-300 active:scale-[0.98]"
                  >
                    {link.label}
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/10 transition-transform duration-500 group-hover/btn:translate-x-0.5">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-200 hover:border-white/40 hover:text-white transition-colors"
                  >
                    {link.label}
                    <ArrowRight className="w-3.5 h-3.5 text-[#f4a7b9]" />
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/** Os três caminhos de acesso — sem valores; cada um leva à sua página de venda. */
export function HomePaths() {
  return (
    <section id="caminhos" className="relative bg-[#050506] py-24 sm:py-32 border-t border-white/[0.05] select-none">
      <div className="pointer-events-none absolute bottom-0 left-1/4 w-[30rem] h-[30rem] rounded-full bg-[#f4a7b9]/[0.025] blur-[200px]" />
      <div className="relative max-w-[76rem] mx-auto px-4 sm:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.9, ease: EASE }}
          className="max-w-xl mb-10 sm:mb-14"
        >
          <span className="inline-flex rounded-full border border-white/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-400">
            Como chegar mais perto
          </span>
          <h2 className="mt-4 font-serif text-[2.3rem] sm:text-5xl text-white tracking-tight leading-[1.04]">
            Formas de viver a Nua
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          <PathCard
            tall
            delay={0}
            image="/images/nua/hero/hero-1.jpg"
            icon={<Crown className="w-3 h-3 text-[#f4a7b9]" />}
            eyebrow="Acervo completo"
            title="Tudo, sem censura, todo mês."
            text="Todos os ensaios em alta resolução, vídeos íntimos e novidades toda semana. Uma assinatura, acesso a tudo."
            links={[{ href: '/acervo', label: 'Conhecer o acervo', primary: true }]}
          />
          <PathCard
            delay={0.08}
            image="/images/nua/gallery/gallery-3.png"
            icon={<Camera className="w-3 h-3 text-[#f4a7b9]" />}
            eyebrow="Obras avulsas"
            title="Escolha só o que te desperta."
            text="Ensaios e vídeos individuais, sem mensalidade, com acesso para sempre."
            links={[{ href: '/avulsos', label: 'Ver obras avulsas' }]}
          />
          <PathCard
            delay={0.16}
            image="/images/nua/hero/hero-2.jpg"
            icon={<Video className="w-3 h-3 text-[#f4a7b9]" />}
            eyebrow="Experiências privativas"
            title="Só nós dois."
            text="Uma chamada de vídeo reservada ou uma produção feita sob medida para você, com sigilo total."
            links={[
              { href: '/chamadas', label: 'Chamadas' },
              { href: '/personalizados', label: 'Sob medida' },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
