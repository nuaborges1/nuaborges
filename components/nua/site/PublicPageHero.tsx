'use client';

import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

export interface PublicPageHeroProps {
  eyebrow?: React.ReactNode;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
}

/**
 * PublicPageHero — Cabeçalho unificado e padronizado para as páginas públicas:
 * Personalizados (/personalizados), Chamadas (/chamadas) e Avulsos (/avulsos).
 * 
 * Garante medidas, tipografia, alinhamento e espaçamentos 100% idênticos,
 * eliminando qualquer oscilação ou deslocamento visual na troca entre páginas.
 */
export function PublicPageHero({
  eyebrow,
  icon: Icon,
  title,
  subtitle,
  className = '',
}: PublicPageHeroProps) {
  return (
    <section className={`px-4 sm:px-8 md:px-10 lg:px-12 max-w-[72rem] mx-auto mb-10 sm:mb-14 text-center select-none ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-3xl mx-auto"
      >
        {eyebrow && (
          <div className="flex justify-center mb-3.5">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[#f4a7b9] text-[10px] sm:text-[11px] font-mono font-medium tracking-[0.2em] uppercase">
              {Icon && <Icon className="w-3 h-3 text-[#f4a7b9] shrink-0" />}
              <span>{eyebrow}</span>
            </span>
          </div>
        )}

        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-white tracking-tight leading-[1.1] font-normal">
          {title}
        </h1>

        {subtitle && (
          <p className="text-zinc-400 text-sm sm:text-base font-light max-w-2xl mx-auto mt-3.5 leading-relaxed">
            {subtitle}
          </p>
        )}
      </motion.div>
    </section>
  );
}
