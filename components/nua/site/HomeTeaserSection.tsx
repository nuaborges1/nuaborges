/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Lock, Crown, ArrowRight, ShoppingBag, ShieldCheck } from 'lucide-react';
import { PixIcon } from './Icons';

export function HomeTeaserSection() {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-black relative select-none border-t border-white/[0.04]">
      {/* Luz ambiente discreta */}
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-[#661C30]/[0.04] rounded-full blur-[180px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />

      <div className="max-w-[72rem] mx-auto px-4 sm:px-8 md:px-10 lg:px-12 relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="text-[#90364B] text-[11px] font-semibold tracking-[0.28em] uppercase block mb-2.5">
              EXPERIÊNCIA EXCLUSIVA
            </span>
            <h2 className="font-serif text-[2.2rem] sm:text-4xl lg:text-[2.85rem] text-white tracking-tight leading-[1.08]">
              Curadoria & Acesso
            </h2>
            <p className="text-zinc-400 text-sm font-light mt-3 leading-relaxed">
              Dois caminhos sofisticados para explorar a arte, os ensaios e a intimidade autoral de
              Nua Borges.
            </p>
          </motion.div>
        </div>

        {/* Grid dos dois caminhos (Acervo x Avulsos) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Card 1: Acervo Completo */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="group relative rounded-[28px] sm:rounded-[32px] bg-gradient-to-b from-[#09090c] to-[#050507] border border-[#661C30]/40 hover:border-[#7A293D]/60 p-7 sm:p-9 flex flex-col justify-between min-h-[300px] sm:min-h-[340px] transition-all duration-300 shadow-[0_12px_40px_rgba(67,19,34,0.35)]"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#661C30]/20 border border-[#7A293D]/40 text-[#90364B] text-[10px] font-semibold tracking-wider uppercase">
                  <Crown className="w-3 h-3" />
                  <span>ASSINATURA COMPLETA</span>
                </span>
                <span className="text-[11px] font-mono text-zinc-500 tracking-wider">
                  NOVIDADES SEMANAIS
                </span>
              </div>

              <h3 className="font-serif text-2xl sm:text-3xl text-white group-hover:text-[#90364B] transition-colors duration-200">
                Acervo VIP Sem Censura
              </h3>
              <p className="text-zinc-400 text-[13px] sm:text-[14px] font-light leading-relaxed mt-2.5">
                Acesso irrestrito a todos os ensaios fotográficos em alta resolução, vídeos íntimos
                e produções semanais. Disponível no Privacy (PIX nacional) e OnlyFans (USD).
              </p>

              <div className="flex flex-wrap gap-2 mt-5">
                <span className="text-[11px] text-zinc-300 bg-white/[0.04] border border-white/[0.08] px-3 py-1 rounded-full font-light">
                  Pagamento no PIX
                </span>
                <span className="text-[11px] text-zinc-300 bg-white/[0.04] border border-white/[0.08] px-3 py-1 rounded-full font-light">
                  Acesso Imediato
                </span>
                <span className="text-[11px] text-zinc-300 bg-white/[0.04] border border-white/[0.08] px-3 py-1 rounded-full font-light">
                  Extrato 100% Discreto
                </span>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-white/[0.06]">
              <Link
                href="/acervo"
                className="w-full min-h-[48px] px-6 py-3 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] text-[11px] font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(67,19,34,0.45)] border border-white/10 active:scale-[0.98]"
              >
                <span>Conhecer Planos de Assinatura</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </Link>
            </div>
          </motion.div>

          {/* Card 2: Conteúdos Avulsos */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="group relative rounded-[28px] sm:rounded-[32px] bg-gradient-to-b from-[#09090c] to-[#050507] border border-white/[0.08] hover:border-white/25 p-7 sm:p-9 flex flex-col justify-between min-h-[300px] sm:min-h-[340px] transition-all duration-300 shadow-[0_12px_40px_rgba(0,0,0,0.85)]"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-zinc-300 text-[10px] font-semibold tracking-wider uppercase">
                  <ShoppingBag className="w-3 h-3 text-[#90364B]" />
                  <span>PAGAMENTO ÚNICO (PPV)</span>
                </span>
                <span className="text-[11px] font-mono text-zinc-500 tracking-wider">
                  SEM MENSALIDADE
                </span>
              </div>

              <h3 className="font-serif text-2xl sm:text-3xl text-white group-hover:text-[#90364B] transition-colors duration-200">
                Ensaios & Vídeos Avulsos
              </h3>
              <p className="text-zinc-400 text-[13px] sm:text-[14px] font-light leading-relaxed mt-2.5">
                Prefere adquirir apenas uma obra específica? Escolha e desbloqueie fotos em 4K e
                vídeos exclusivos sem assinar nenhum plano recorrente.
              </p>

              <div className="flex flex-wrap gap-2 mt-5">
                <span className="text-[11px] text-zinc-400 bg-white/[0.03] border border-white/[0.06] px-3 py-1 rounded-full font-light">
                  Acesso Vitalício
                </span>
                <span className="text-[11px] text-zinc-400 bg-white/[0.03] border border-white/[0.06] px-3 py-1 rounded-full font-light">
                  Valores a partir de R$ 29,90
                </span>
                <span className="text-[11px] text-zinc-400 bg-white/[0.03] border border-white/[0.06] px-3 py-1 rounded-full font-light">
                  Checkout Seguro
                </span>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-white/[0.06]">
              <Link
                href="/avulsos"
                className="w-full min-h-[48px] px-6 py-3 rounded-full border border-white/15 hover:border-white/35 text-zinc-200 hover:text-white text-[11px] font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2 hover:bg-white/[0.03] active:scale-[0.98]"
              >
                <span>Explorar Catálogo Avulso</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Faixa sutil de discrição */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20px' }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 p-4 rounded-2xl bg-[#060608] border border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-zinc-400 text-xs font-light"
        >
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <ShieldCheck className="w-4 h-4 text-[#90364B]" /> Cobrança 100% discreta no extrato bancário
            </span>
            <span className="text-zinc-600 hidden sm:inline">•</span>
            <span className="flex items-center gap-1.5">
              <PixIcon className="w-3.5 h-3.5 text-[#90364B]" /> Liberação imediata via PIX
            </span>
          </div>

          <Link
            href="/chamadas"
            className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-[#90364B] transition-colors font-medium text-xs group py-1 sm:py-0"
          >
            <span>Chamadas de Vídeo Privativas</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#90364B] group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
