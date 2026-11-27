/* Vinho maduro / Nua Borges */
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Heart, Crown, ArrowRight } from 'lucide-react';
import { SiteContent } from '@/lib/types';
import { useCopy } from '@/lib/copy';

interface VipBannerProps {
  onOpenVip: () => void;
  customVipData?: SiteContent['vipClub'];
}

function normalizeEmailChannelCopy(text: string): string {
  return text.replace(/direto\s+no\s+whatsapp/gi, 'direto no seu e-mail');
}

export function VipBanner({ onOpenVip, customVipData }: VipBannerProps) {
  const { copy, cms } = useCopy();
  const [bgFailed, setBgFailed] = useState(false);

  if (customVipData && customVipData.active === false) {
    return null;
  }

  const eyebrow = cms(customVipData?.eyebrow, 'vipClub.eyebrow', copy.home.vipBanner.eyebrowFallback);
  const rawTitle = cms(customVipData?.title, 'vipClub.title', copy.home.vipBanner.titleFallback);
  const title = normalizeEmailChannelCopy(rawTitle);
  const rawSubtitle = cms(customVipData?.subtitle, 'vipClub.subtitle', copy.home.vipBanner.subtitleFallback);
  const subtitle = /cadastre-se\b/i.test(rawSubtitle) && !/e-mail/i.test(rawSubtitle)
    ? rawSubtitle.replace(/cadastre-se/i, 'Cadastre seu e-mail')
    : rawSubtitle;
  const buttonText = cms(customVipData?.buttonText, 'vipClub.buttonText', copy.home.vipBanner.buttonFallback);
  const bgUrl =
    'https://shscwlmavashmtvhzfdf.supabase.co/storage/v1/object/public/nuaborges-media/photos/nua-vip-bg.jpg';

  return (
    <section id="vip" className="py-12 sm:py-16 bg-[#020203] relative border-t border-white/[0.04]">
      <div className="max-w-[72rem] mx-auto px-4 sm:px-8 md:px-10 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-[28px] sm:rounded-[36px] overflow-hidden border border-[#661C30]/40 p-7 sm:p-10 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 shadow-[0_20px_60px_rgba(67,19,34,0.35)] bg-gradient-to-br from-[#16090e] via-[#09080c] to-black"
        >
          {/* Imagem de Fundo Escurecida com fallback seguro caso asset externo não carregue */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            {!bgFailed && (
              <Image
                src={bgUrl}
                alt=""
                fill
                sizes="100vw"
                onError={() => setBgFailed(true)}
                className="object-cover object-center brightness-[0.25]"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
          </div>

          <div className="max-w-2xl text-center md:text-left relative z-10">
            <span className="text-[#F5EEE9]/80 text-[10px] sm:text-[11px] font-semibold tracking-[0.28em] uppercase inline-flex items-center gap-1.5 mb-2.5">
              <Crown className="w-3.5 h-3.5 text-[#90364B]" />
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
              type="button"
              onClick={onOpenVip}
              className="w-full md:w-auto min-h-[50px] px-8 py-3.5 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] text-[11px] font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_4px_24px_rgba(67,19,34,0.45)] border border-white/10 active:scale-[0.98]"
            >
              <Heart className="w-4 h-4 fill-[#F5EEE9] text-[#F5EEE9]" />
              <span>{buttonText}</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
