'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Instagram, ArrowRight } from 'lucide-react';

export function CtaBanner() {
  return (
    <section className="py-8 sm:py-12 bg-black relative select-none" aria-label="Redes sociais">
      <div className="max-w-[72rem] mx-auto px-5 sm:px-8 md:px-10 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-2xl sm:rounded-[20px] border border-zinc-800/60 bg-[#070709] overflow-hidden"
        >
          {/* Subtle ambient pink glow */}
          <div className="absolute right-0 top-0 w-48 h-48 bg-[#f4a7b9]/[0.04] rounded-full blur-[80px] pointer-events-none" />

          <div className="relative z-10 px-6 py-5 md:px-10 md:py-6 flex flex-col sm:flex-row items-center justify-between gap-5">
            {/* Text */}
            <div className="text-center sm:text-left flex-1">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="text-[#f4a7b9] text-[10px]"
                  aria-hidden
                >
                  ♥
                </motion.span>
                <span className="text-white font-medium text-sm tracking-wide">Me acompanhe nas redes</span>
              </div>
              <p className="text-zinc-500 text-[12px] sm:text-[13px] font-light leading-relaxed">
                Bastidores, ensaios, novidades e muito mais.
              </p>
            </div>

            {/* Instagram button */}
            <a
              href="https://www.instagram.com/nuaborges"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-zinc-700/80 hover:border-[#f4a7b9]/50 bg-transparent text-zinc-400 hover:text-[#f4a7b9] transition-all duration-200 text-[12px] sm:text-[13px] font-medium tracking-wide cursor-pointer whitespace-nowrap touch-manipulation min-h-[42px] flex-shrink-0"
              aria-label="Seguir @nuaborges no Instagram"
            >
              <Instagram className="w-3.5 h-3.5" strokeWidth={1.7} />
              <span>Seguir @nuaborges</span>
              <ArrowRight className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5 opacity-0 group-hover:opacity-100 -ml-1" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
