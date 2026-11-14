'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Heart, Crown, ArrowRight } from 'lucide-react';
import { SiteContent } from '@/lib/types';

interface VipBannerProps {
  onOpenVip: () => void;
  customVipData?: SiteContent['vipClub'];
}

export function VipBanner({ onOpenVip, customVipData }: VipBannerProps) {
  if (customVipData && customVipData.active === false) {
    return null;
  }

  const eyebrow = customVipData?.eyebrow || 'LISTA VIP & PRÉVIAS';
  const title =
    customVipData?.title || 'Receba confissões, prévias e novidades direto no WhatsApp';
  const subtitle =
    customVipData?.subtitle ||
    'Cadastre-se para receber conteúdos inéditos, avisos de lançamentos e recados íntimos da Nua com total discrição.';
  const buttonText = customVipData?.buttonText || 'ENTRAR NA LISTA VIP ♡';
  const bgUrl =
    'https://shscwlmavashmtvhzfdf.supabase.co/storage/v1/object/public/nuaborges-media/photos/nua-vip-bg.jpg';

  return (
    <section id="vip" className="py-12 sm:py-16 bg-[#020203] relative select-none border-t border-white/[0.04]">
      <div className="max-w-[72rem] mx-auto px-4 sm:px-8 md:px-10 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-[28px] sm:rounded-[36px] overflow-hidden border border-[#f4a7b9]/25 p-7 sm:p-10 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 shadow-[0_20px_60px_rgba(0,0,0,0.9)] bg-zinc-950"
        >
          {/* Imagem de Fundo Escurecida com Vignette */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <Image
              src={bgUrl}
              alt="Nua Borges VIP"
              fill
              sizes="100vw"
              className="object-cover object-center brightness-[0.25]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
          </div>

          <div className="max-w-2xl text-center md:text-left relative z-10">
            <span className="text-[#f4a7b9] text-[10px] sm:text-[11px] font-semibold tracking-[0.28em] uppercase inline-flex items-center gap-1.5 mb-2.5">
              <Crown className="w-3.5 h-3.5 text-[#f4a7b9]" />
              <span>{eyebrow}</span>
            </span>

            <h3 className="font-serif text-[1.8rem] sm:text-3xl lg:text-[2.2rem] text-white tracking-tight leading-snug">
              {title}
            </h3>

            <p className="text-zinc-300 text-sm font-light mt-2 max-w-xl leading-relaxed">
              {subtitle}
            </p>
          </div>

          <div className="relative z-10 shrink-0 w-full md:w-auto">
            <button
              onClick={onOpenVip}
              className="w-full md:w-auto min-h-[50px] px-8 py-3.5 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-black text-[11px] font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_6px_28px_rgba(244,167,185,0.3)] active:scale-[0.98]"
            >
              <Heart className="w-4 h-4 fill-black" />
              <span>{buttonText}</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
