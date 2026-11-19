/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Video, Camera, ArrowRight, Calendar, ShieldCheck, Clock, Crown, Film, CheckCircle2 } from 'lucide-react';

export function ExperiencesSection() {
  return (
    <section
      id="experiencias"
      className="py-16 sm:py-24 lg:py-28 bg-[#030304] relative select-none border-t border-white/[0.05]"
    >
      {/* Luz ambiente vinho suave difusa */}
      <div className="absolute top-1/2 left-1/2 w-[34rem] h-[34rem] bg-[#661C30]/[0.04] rounded-full blur-[200px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />

      <div className="max-w-[76rem] mx-auto px-4 sm:px-8 md:px-10 lg:px-12 relative z-10">
        {/* Cabeçalho Editorial */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="text-[#90364B] text-[10px] sm:text-[11px] font-semibold tracking-[0.28em] uppercase inline-flex items-center gap-2 mb-2.5">
              <Crown className="w-3.5 h-3.5 text-[#90364B]" />
              <span>EXPERIÊNCIAS PRIVATIVAS</span>
            </span>
            <h2 className="font-serif text-[2.3rem] sm:text-4xl lg:text-[2.95rem] text-white tracking-tight leading-[1.06]">
              Intimidade &amp; Sob Medida
            </h2>
            <p className="text-zinc-400 text-sm sm:text-[15px] font-light mt-3 leading-relaxed max-w-xl mx-auto">
              Momentos dedicados e produções concebidas exclusivamente para você, com sigilo
              absoluto e conexão autêntica.
            </p>
          </motion.div>
        </div>

        {/* Grade 2 Colunas: Chamadas 1-on-1 & Pedidos Personalizados (Double-Bezel Architecture) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Card 1: Chamadas de Vídeo Privativas */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="group relative rounded-[32px] p-2 bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] hover:border-[#661C30]/50 flex flex-col justify-between transition-all duration-500 shadow-[0_16px_50px_rgba(0,0,0,0.85)] overflow-hidden"
          >
            <div className="rounded-[26px] bg-[#070709] overflow-hidden flex flex-col justify-between h-full border border-white/[0.03] relative">
              {/* Imagem de fundo editorial com gradiente */}
              <div className="relative w-full h-44 sm:h-52 overflow-hidden bg-zinc-950">
                <Image
                  src="/images/nua/hero/hero-2.jpg"
                  alt="Chamada de Vídeo Privativa"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover object-top group-hover:scale-[1.04] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] opacity-40"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-[#070709]/60 to-transparent" />

                <div className="absolute top-4 inset-x-4 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-[#661C30]/40 text-[#90364B] text-[10px] font-semibold tracking-wider uppercase">
                    <Video className="w-3 h-3" />
                    <span>SESSÃO AO VIVO 1-ON-1</span>
                  </span>
                  <span className="text-[10px] font-mono text-zinc-300 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 tracking-wider flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-[#90364B]" />
                    <span>15, 30 OU 60 MIN</span>
                  </span>
                </div>
              </div>

              {/* Informações */}
              <div className="p-6 sm:p-8 flex flex-col justify-between flex-1 -mt-6 relative z-10">
                <div>
                  <h3 className="font-serif text-2xl sm:text-3xl text-white group-hover:text-[#90364B] transition-colors duration-200">
                    Chamadas de Vídeo Privativas
                  </h3>
                  <p className="text-zinc-400 text-xs sm:text-[13px] font-light leading-relaxed mt-2.5">
                    Um encontro exclusivo em sala privativa, criptografada e sem gravações. Escolha o
                    horário de sua preferência na agenda e reserve com confirmação imediata no WhatsApp.
                  </p>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="text-[11px] text-zinc-300 bg-white/[0.04] border border-white/[0.08] px-3 py-1 rounded-full font-light flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3 text-[#90364B]" /> Câmera Privada
                    </span>
                    <span className="text-[11px] text-zinc-300 bg-white/[0.04] border border-white/[0.08] px-3 py-1 rounded-full font-light flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-[#90364B]" /> Agenda Flexível
                    </span>
                    <span className="text-[11px] text-zinc-300 bg-white/[0.04] border border-white/[0.08] px-3 py-1 rounded-full font-light">
                      Sem Intermediários
                    </span>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex flex-col text-center sm:text-left">
                    <span className="text-[9px] uppercase font-mono tracking-widest text-zinc-500">
                      INVESTIMENTO
                    </span>
                    <span className="font-serif text-xl text-[#90364B] font-medium tracking-tight">
                      A partir de R$ 150
                    </span>
                  </div>

                  <Link
                    href="/chamadas"
                    className="w-full sm:w-auto min-h-[46px] px-6 py-2.5 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] text-[11px] font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(67,19,34,0.45)] border border-white/10 active:scale-[0.98]"
                  >
                    <span>Agendar Sessão</span>
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                      <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Pedidos Sob Medida / Personalizados */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="group relative rounded-[32px] p-2 bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] hover:border-white/25 flex flex-col justify-between transition-all duration-500 shadow-[0_16px_50px_rgba(0,0,0,0.85)] overflow-hidden"
          >
            <div className="rounded-[26px] bg-[#070709] overflow-hidden flex flex-col justify-between h-full border border-white/[0.03] relative">
              {/* Imagem de fundo editorial com gradiente */}
              <div className="relative w-full h-44 sm:h-52 overflow-hidden bg-zinc-950">
                <Image
                  src="/images/nua/gallery/gallery-4.png"
                  alt="Produção Fotográfica e Audiovisual Sob Medida"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover object-center group-hover:scale-[1.04] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] opacity-40"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-[#070709]/60 to-transparent" />

                <div className="absolute top-4 inset-x-4 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/15 text-zinc-300 text-[10px] font-semibold tracking-wider uppercase">
                    <Camera className="w-3 h-3 text-[#90364B]" />
                    <span>PRODUÇÃO SOB ENCOMENDA</span>
                  </span>
                  <span className="text-[10px] font-mono text-zinc-300 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 tracking-wider flex items-center gap-1">
                    <Film className="w-2.5 h-2.5 text-[#90364B]" />
                    <span>FOTOS + VÍDEO COM SEU NOME</span>
                  </span>
                </div>
              </div>

              {/* Informações */}
              <div className="p-6 sm:p-8 flex flex-col justify-between flex-1 -mt-6 relative z-10">
                <div>
                  <h3 className="font-serif text-2xl sm:text-3xl text-white group-hover:text-[#90364B] transition-colors duration-200">
                    Pedidos Personalizados
                  </h3>
                  <p className="text-zinc-400 text-xs sm:text-[13px] font-light leading-relaxed mt-2.5">
                    Encomende um ensaio fotográfico ou vídeo criado estritamente para você. Escolha o figurino, tema,
                    roteiro ou dedicatória especial com entrega sigilosa direto na sua conta.
                  </p>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="text-[11px] text-zinc-400 bg-white/[0.03] border border-white/[0.06] px-3 py-1 rounded-full font-light">
                      Vídeo Falando seu Nome
                    </span>
                    <span className="text-[11px] text-zinc-400 bg-white/[0.03] border border-white/[0.06] px-3 py-1 rounded-full font-light">
                      Ensaio Temático Exclusivo
                    </span>
                    <span className="text-[11px] text-zinc-400 bg-white/[0.03] border border-white/[0.06] px-3 py-1 rounded-full font-light">
                      Entrega no Cofre / Telegram
                    </span>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex flex-col text-center sm:text-left">
                    <span className="text-[9px] uppercase font-mono tracking-widest text-zinc-500">
                      A PARTIR DE
                    </span>
                    <span className="font-serif text-xl text-zinc-200 font-medium tracking-tight">
                      R$ 75,00
                    </span>
                  </div>

                  <Link
                    href="/personalizados"
                    className="w-full sm:w-auto min-h-[46px] px-6 py-2.5 rounded-full border border-white/15 hover:border-white/35 text-zinc-200 hover:text-white text-[11px] font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2 hover:bg-white/[0.03] active:scale-[0.98]"
                  >
                    <span>Configurar Pedido</span>
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                      <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
