'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, ChevronDown } from 'lucide-react';
import { CANONICAL_FAQS, FaqItem } from '@/lib/faqData';

export function HomeFaq({ customFaqs }: { customFaqs?: FaqItem[] } = {}) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const faqs = customFaqs && customFaqs.length > 0 ? customFaqs : CANONICAL_FAQS;

  const toggleIndex = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 sm:py-28 bg-[#020203] relative select-none border-t border-white/[0.05]">
      {/* Luz ambiente rosa blush sutil */}
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-[#f4a7b9]/[0.02] rounded-full blur-[180px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />

      <div className="max-w-[50rem] mx-auto px-4 sm:px-8 relative z-10">
        <div className="text-center mb-12 sm:mb-16">
          <span className="text-[#f4a7b9] text-[11px] font-semibold tracking-[0.28em] uppercase block mb-3 inline-flex items-center justify-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#f4a7b9]" />
            <span>PRIVACIDADE & DISCREÇÃO</span>
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-[2.6rem] text-white tracking-tight">
            Dúvidas frequentes
          </h2>
          <p className="text-zinc-400 text-sm sm:text-[15px] font-light mt-3 max-w-lg mx-auto leading-relaxed">
            Respostas claras sobre sigilo, segurança e formato de entrega.
          </p>
        </div>

        {/* Acordeão Canônico Unificado */}
        <div className="space-y-4">
          {faqs.map((item, idx) => {
            const isOpen = openIndex === idx;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.5, delay: idx * 0.06 }}
                className={`rounded-[22px] p-1.5 transition-all duration-300 ${
                  isOpen
                    ? 'bg-gradient-to-b from-[#f4a7b9]/25 to-white/[0.04] shadow-[0_12px_40px_rgba(0,0,0,0.8)] border border-[#f4a7b9]/30'
                    : 'bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.07] hover:border-white/15'
                }`}
              >
                <div className="rounded-[18px] bg-[#07070a] overflow-hidden border border-white/[0.03]">
                  <button
                    type="button"
                    onClick={() => toggleIndex(idx)}
                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <span className={`font-serif text-base sm:text-lg font-medium transition-colors duration-200 ${isOpen ? 'text-[#f4a7b9]' : 'text-white'}`}>
                      {item.question}
                    </span>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                        isOpen
                          ? 'bg-[#f4a7b9] text-black shadow-[0_0_14px_rgba(244,167,185,0.4)]'
                          : 'bg-white/[0.06] text-zinc-400 group-hover:text-white'
                      }`}
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-300 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 sm:px-6 pb-6 pt-1 border-t border-white/[0.04]">
                          <p className="text-zinc-300 text-xs sm:text-sm font-light leading-relaxed">
                            {item.answer}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
