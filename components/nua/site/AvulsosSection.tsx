/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Film, Camera, ArrowRight, Lock, CheckCircle2, ShieldCheck, Flame, Play } from 'lucide-react';
import { SiteContent, AvulsoProductItem } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';
import { formatBrlPrice } from '@/lib/formatters';
import { PixIcon } from './Icons';
import { CheckoutModal } from './CheckoutModal';

interface AvulsosSectionProps {
  customAvulsosData?: SiteContent['avulsos'];
}

type FilterCategory = 'all' | 'videos' | 'photos';

export function AvulsosSection({ customAvulsosData }: AvulsosSectionProps) {
  const [checkoutProduct, setCheckoutProduct] = useState<AvulsoProductItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');

  const eyebrow = customAvulsosData?.eyebrow || 'LANÇAMENTOS & CONTEÚDOS AVULSOS';
  const title = customAvulsosData?.title || 'Acervo Sob Demanda';
  const subtitle =
    customAvulsosData?.subtitle ||
    'Escolha e adquira obras e produções unitárias sem necessidade de mensalidade. Acesso vitalício imediato via PIX e cobrança 100% discreta.';
  const upsellText =
    customAvulsosData?.upsellText ||
    'Prefere acesso ilimitado a todos os ensaios e vídeos sem pagar por item?';
  const upsellUrl = customAvulsosData?.upsellUrl || '/acervo';

  // Fallback garantido para NUNCA ocultar a vitrine de vendas (apenas Packs/Coleções ativas)
  const rawItems = (customAvulsosData?.items || []).filter((item) => item.active !== false && item.modality !== 'avulso');
  const allItems: AvulsoProductItem[] = rawItems;

  // Filtragem interativa
  const filteredItems = useMemo(() => {
    if (activeFilter === 'videos') {
      return allItems.filter(
        (item) =>
          (item.videos && item.videos.length > 0) ||
          item.duration?.toLowerCase().includes('vídeo') ||
          item.technicalDetails?.format?.toLowerCase().includes('vídeo')
      );
    }
    if (activeFilter === 'photos') {
      return allItems.filter(
        (item) =>
          (!item.videos || item.videos.length === 0) &&
          !item.duration?.toLowerCase().includes('vídeo')
      );
    }
    return allItems;
  }, [allItems, activeFilter]);

  return (
    <section
      id="avulsos"
      className="py-12 sm:py-16 lg:py-20 bg-[#020203] relative select-none border-t border-white/[0.05]"
    >
      {/* Luz ambiente sensual difusa */}
      <div className="absolute top-1/4 left-1/2 w-[34rem] h-[34rem] bg-[#661C30]/[0.04] rounded-full blur-[200px] pointer-events-none -translate-x-1/2" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-[#661C30]/[0.02] rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-[76rem] mx-auto px-4 sm:px-8 md:px-10 lg:px-12 relative z-10">
        {/* Header da Seção */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 sm:mb-14">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl"
          >
            <span className="text-[#90364B] text-[11px] font-semibold tracking-[0.28em] uppercase block mb-3 inline-flex items-center gap-2">
              <Film className="w-3.5 h-3.5" />
              <span>{eyebrow}</span>
            </span>
            <h2 className="font-serif text-[2.4rem] sm:text-4xl lg:text-[3.1rem] text-white tracking-tight leading-[1.06]">
              {title}
            </h2>
            <p className="text-zinc-400 text-sm sm:text-[15px] font-light mt-3 leading-relaxed">
              {subtitle}
            </p>
          </motion.div>

          {/* Abas / Filtros de Categoria */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-1.5 p-1 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md self-start md:self-auto overflow-x-auto max-w-full"
          >
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all duration-200 cursor-pointer whitespace-nowrap ${
                activeFilter === 'all'
                  ? 'bg-gradient-to-r from-[#431322] to-[#661C30] text-[#F5EEE9] font-bold shadow-sm border border-white/10'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Todos ({allItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('videos')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all duration-200 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeFilter === 'videos'
                  ? 'bg-gradient-to-r from-[#431322] to-[#661C30] text-[#F5EEE9] font-bold shadow-sm border border-white/10'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Film className="w-3 h-3" />
              <span>Vídeos 4K</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('photos')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all duration-200 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeFilter === 'photos'
                  ? 'bg-gradient-to-r from-[#431322] to-[#661C30] text-[#F5EEE9] font-bold shadow-sm border border-white/10'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Camera className="w-3 h-3" />
              <span>Ensaios</span>
            </button>
          </motion.div>
        </div>

        {/* Grid de Produtos com Arquitetura Double-Bezel (High-End Visual Design) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, idx) => {
              const hasVideos =
                (item.videos && item.videos.length > 0) ||
                item.technicalDetails?.format?.toLowerCase().includes('vídeo') ||
                item.duration?.toLowerCase().includes('minuto');
              const videoCount = item.videos?.length || (hasVideos ? 1 : 0);
              const photoCount = item.previewImages?.length || (hasVideos ? 16 : 18);

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.6, delay: idx * 0.07, ease: [0.16, 1, 0.3, 1] }}
                  className="group relative rounded-[30px] p-2 bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] hover:border-[#661C30]/50 flex flex-col justify-between transition-all duration-500 shadow-[0_16px_50px_rgba(0,0,0,0.85)]"
                >
                  {/* Inner Core */}
                  <div className="rounded-[24px] bg-[#070709] overflow-hidden flex flex-col justify-between h-full border border-white/[0.03]">
                    {/* Imagem de Capa do Pack */}
                    <div className="relative w-full aspect-[16/11] overflow-hidden bg-zinc-950">
                      <Image
                        src={resolveMediaUrl(item.imageUrl, 'mobile')}
                        alt={item.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover object-center group-hover:scale-[1.04] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
                      />
                      {/* Vignette com gradiente suave */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-transparent to-black/40 pointer-events-none" />

                      {/* Badges superiores flutuantes (Frosted Glass) */}
                      <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 pointer-events-none">
                        {item.badge ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-[#661C30]/40 text-[#90364B] text-[10px] font-semibold tracking-wider uppercase">
                            <Flame className="w-3 h-3 text-[#90364B]" />
                            <span>{item.badge}</span>
                          </span>
                        ) : (
                          <div />
                        )}

                        <div className="flex items-center gap-1.5">
                          {hasVideos ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-[#661C30]/50 text-[#90364B] text-[10px] font-mono font-medium">
                              <Film className="w-2.5 h-2.5" />
                              <span>{videoCount} {videoCount === 1 ? 'Vídeo 4K' : 'Vídeos 4K'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/15 text-zinc-300 text-[10px] font-mono">
                              <Camera className="w-2.5 h-2.5 text-zinc-400" />
                              <span>{photoCount} Fotos 4K</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Tag flutuante inferior: Liberação Imediata no PIX */}
                      <div className="absolute bottom-3 left-3 pointer-events-none">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-zinc-300 text-[10px] font-light">
                          <PixIcon className="w-3 h-3 text-[#90364B]" />
                          <span>Liberação Imediata</span>
                        </span>
                      </div>
                    </div>

                    {/* Conteúdo & Sinopse */}
                    <div className="p-5 sm:p-6 flex flex-col flex-1 justify-between">
                      <div>
                        <h3 className="font-serif text-[1.4rem] sm:text-[1.55rem] text-white group-hover:text-[#90364B] transition-colors duration-200 leading-snug">
                          {item.title}
                        </h3>
                        <p className="text-zinc-400 text-xs sm:text-[13px] font-light leading-relaxed mt-2 line-clamp-2">
                          {item.description}
                        </p>

                        <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-zinc-500 font-light">
                          <span className="flex items-center gap-1 text-zinc-400">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#90364B]" /> Acesso Vitalício
                          </span>
                          <span className="text-zinc-400 font-mono text-[10px]">
                            {item.duration && !item.duration.includes('35 Fotos') && !(photoCount !== 15 && item.duration.includes('15 Fotos'))
                              ? item.duration
                              : videoCount > 0 && photoCount > 0
                              ? `${photoCount} Foto${photoCount === 1 ? '' : 's'} 4K • ${videoCount} Vídeo${videoCount === 1 ? '' : 's'} UHD`
                              : videoCount > 0
                              ? `${videoCount} Vídeo${videoCount === 1 ? '' : 's'} 4K UHD`
                              : `${photoCount} Foto${photoCount === 1 ? '' : 's'} 4K`}
                          </span>
                        </div>
                      </div>

                      {/* Bloco de Preço & Ações Comerciais */}
                      <div className="mt-5 pt-4 border-t border-white/[0.06] space-y-2.5">
                        <div className="flex items-baseline justify-between mb-1">
                          <div className="flex flex-col">
                            <span className="text-[9px] uppercase font-mono tracking-widest text-zinc-500">
                              VALOR ÚNICO
                            </span>
                            <span className="font-serif text-2xl text-[#90364B] font-medium tracking-tight">
                              R$ {formatBrlPrice(item.price)}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.03] px-2.5 py-1 rounded-full border border-white/[0.06]">
                            Sem Mensalidade
                          </span>
                        </div>

                        {/* Botão Primário: Comprar no PIX (Abre Checkout Direto) */}
                        <button
                          type="button"
                          onClick={() => setCheckoutProduct(item)}
                          className="w-full min-h-[46px] rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] text-[11px] font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-between pl-6 pr-2 cursor-pointer shadow-[0_4px_24px_rgba(67,19,34,0.45)] border border-white/10 active:scale-[0.98]"
                        >
                          <span>Comprar no PIX • {item.price}</span>
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                            <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                          </div>
                        </button>

                        {/* Botão Secundário: Ver Detalhes & Prévia */}
                        <Link
                          href={`/avulsos/${item.slug || item.id}`}
                          className="w-full min-h-[40px] px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-[10.5px] font-semibold tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 border border-white/10"
                        >
                          <span>Ver Ficha Técnica &amp; Prévia</span>
                          <ArrowRight className="w-3 h-3 text-[#90364B]" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Faixa de Confiança & Garantias Comerciais */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20px' }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 sm:mt-12 p-4 sm:p-5 rounded-2xl bg-[#060608] border border-white/[0.05] flex flex-wrap items-center justify-around gap-4 text-xs font-light text-zinc-400"
        >
          <div className="flex items-center gap-2 text-zinc-300">
            <PixIcon className="w-4 h-4 text-[#90364B]" />
            <span>Liberação Imediata com QR Code PIX</span>
          </div>
          <div className="hidden sm:block text-zinc-700">•</div>
          <div className="flex items-center gap-2 text-zinc-300">
            <ShieldCheck className="w-4 h-4 text-[#90364B]" />
            <span>Extrato 100% Discreto no seu Banco</span>
          </div>
          <div className="hidden sm:block text-zinc-700">•</div>
          <div className="flex items-center gap-2 text-zinc-300">
            <CheckCircle2 className="w-4 h-4 text-[#90364B]" />
            <span>Acesso Vitalício no Cofre Digital</span>
          </div>
        </motion.div>

        {/* Upsell Box: Assinatura Mensal */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20px' }}
          transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 p-5 sm:p-6 rounded-[24px] bg-gradient-to-r from-[#07070a] to-[#0a0a0f] border border-white/[0.06] hover:border-[#661C30]/40 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors duration-300"
        >
          <div className="text-center sm:text-left">
            <span className="text-zinc-200 text-sm sm:text-[15px] font-serif block">
              {upsellText}
            </span>
            <span className="text-zinc-500 text-xs font-light block mt-0.5">
              Assinaturas mensais no Privacy (PIX) e OnlyFans com acesso irrestrito a todos os ensaios, fotos e vídeos já produzidos.
            </span>
          </div>

          <Link
            href={upsellUrl}
            className="w-full sm:w-auto min-h-[42px] px-6 py-2.5 rounded-full border border-white/12 hover:border-[#661C30]/60 text-[11px] font-bold tracking-wider uppercase text-zinc-300 hover:text-white transition-colors duration-200 cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 hover:bg-[#661C30]/15"
          >
            <span>Conhecer Planos Mensais</span>
            <ArrowRight className="w-3 h-3 text-[#90364B]" />
          </Link>
        </motion.div>
      </div>

      {/* Modal de Checkout Seguro */}
      <CheckoutModal
        isOpen={!!checkoutProduct}
        onClose={() => setCheckoutProduct(null)}
        product={checkoutProduct}
      />
    </section>
  );
}
