'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';

interface HeroTitleProps {
  useLogo: boolean;
  logoUrl?: string;
  title: string;
  isCinematic?: boolean;
}

export function HeroTitle({ useLogo, logoUrl, title, isCinematic = false }: HeroTitleProps) {
  if (useLogo && logoUrl) {
    const isWebp = logoUrl.toLowerCase().endsWith('.webp');
    return (
      <>
        {/*
          Preload restrito à logo que REALMENTE vai ser renderizada abaixo.
          Antes o preload vivia no layout global e era disparado em todas as
          páginas (inclusive admin), gerando aviso de recurso pré-carregado e
          não utilizado após a hidratação.
        */}
        <link
          rel="preload"
          href={logoUrl}
          as="image"
          {...(isWebp ? { type: 'image/webp' } : {})}
        />
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className={`relative w-full my-0 select-none ${
            isCinematic
              ? 'max-w-[340px] xs:max-w-[400px] sm:max-w-[520px] md:max-w-[620px] lg:max-w-[720px]'
              : 'max-w-[340px] sm:max-w-[460px] lg:max-w-[540px]'
          }`}
        >
          <h1 className="sr-only">{title}</h1>
          {/*
            width/height = dimensões intrínsecas reais do arquivo (1600x686).
            Declarar 720x240/540x180 fazia o browser renderizar uma altura
            diferente (a final vem de w-full + h-auto + max-height), acionando
            o aviso "width or height modified, but not the other" do next/image.
            O tamanho visual continua 100% controlado pelo CSS abaixo.
          */}
          <Image
            src={logoUrl}
            alt={title}
            width={1600}
            height={686}
            priority
            fetchPriority="high"
            referrerPolicy="no-referrer"
            className="w-full h-auto object-contain drop-shadow-[0_8px_48px_rgba(0,0,0,0.9)]"
            style={{ maxHeight: isCinematic ? '240px' : '200px' }}
          />
        </motion.div>
      </>
    );
  }

  return (
    <motion.h1
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.75, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      className={`font-serif italic font-normal leading-[1.14] sm:leading-[1.16] select-none my-0 inline-flex items-center drop-shadow-[0_8px_40px_rgba(0,0,0,0.85)] ${
        isCinematic
          ? 'text-[2.75rem] xs:text-[3.2rem] sm:text-[4.6rem] md:text-[5.8rem] lg:text-[6.8rem] justify-center overflow-visible'
          : 'text-[2.75rem] xs:text-[3.2rem] sm:text-[4.2rem] md:text-[5rem] lg:text-[5.6rem] xl:text-[6.4rem] gap-1.5 sm:gap-2 flex-wrap overflow-visible'
      }`}
    >
      <span
        className={`text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-[#fce4ec] py-2.5 sm:py-4 inline-block ${
          isCinematic ? 'whitespace-nowrap px-2 sm:px-3' : 'px-1 sm:px-2'
        }`}
      >
        {title}
      </span>
      <span className="inline-flex items-center ml-1 sm:ml-2 shrink-0 pr-3 sm:pr-4 translate-y-[-2px] sm:translate-y-[-4px]">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#f4a7b9"
          strokeWidth="1.7"
          className="w-5 h-5 xs:w-6 xs:h-6 sm:w-8 sm:h-8 lg:w-9 lg:h-9 inline-block drop-shadow-[0_0_8px_rgba(244,167,185,0.5)]"
          style={{ overflow: 'visible' }}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
          />
        </svg>
      </span>
    </motion.h1>
  );
}
