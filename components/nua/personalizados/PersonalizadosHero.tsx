'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Camera } from 'lucide-react';

interface PersonalizadosHeroProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}

export function PersonalizadosHero({ eyebrow, title, subtitle }: PersonalizadosHeroProps) {
  return (
    <section className="px-4 sm:px-8 md:px-10 lg:px-12 max-w-[72rem] mx-auto mb-12 sm:mb-16 text-center">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {eyebrow && (
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#f4a7b9]/10 border border-[#f4a7b9]/25 text-[#f4a7b9] text-[11px] font-semibold tracking-[0.25em] uppercase mb-4">
            <Camera className="w-3 h-3 text-[#f4a7b9]" />
            <span>{eyebrow}</span>
          </span>
        )}
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-white tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-zinc-400 text-sm sm:text-base font-light max-w-2xl mx-auto mt-4 leading-relaxed">
            {subtitle}
          </p>
        )}
      </motion.div>
    </section>
  );
}
