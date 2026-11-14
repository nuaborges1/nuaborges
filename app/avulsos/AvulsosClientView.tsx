'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ShoppingBag,
} from 'lucide-react';
import { Header } from '@/components/nua/site/Header';
import { Footer } from '@/components/nua/site/Footer';
import { ContactModal } from '@/components/nua/site/ContactModal';
import { VipModal } from '@/components/nua/site/VipModal';
import { CheckoutModal } from '@/components/nua/site/CheckoutModal';
import { PixIcon } from '@/components/nua/site/Icons';
import { usePublishedContent } from '@/lib/contentStore';
import { resolveMediaUrl } from '@/lib/media';
import { sanitizeUrl } from '@/lib/security';
import { AvulsoProductItem } from '@/lib/types';

export function AvulsosClientView() {
  const content = usePublishedContent();
  const [contactOpen, setContactOpen] = useState(false);
  const [vipOpen, setVipOpen] = useState(false);
  const [checkoutProduct, setCheckoutProduct] = useState<AvulsoProductItem | null>(null);

  const avulsos = content.avulsos || {
    eyebrow: 'ACERVO SOB DEMANDA',
    title: 'Ensaios & Produções Unitárias',
    subtitle:
      'Escolha e adquira obras e produções unitárias sem necessidade de mensalidade. Acesso vitalício e cobrança 100% discreta.',
    items: [],
  };

  const items = (avulsos.items || []).filter((item) => item.active !== false);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#f4a7b9] selection:text-black flex flex-col">
      {/* Header Fixo */}
      <Header
        onOpenContact={() => setContactOpen(true)}
        activeSection="avulsos"
        customHeaderData={content.header}
      />

      <main className="flex-1 pt-28 sm:pt-36 pb-20 select-none">
        {/* Topo / Header da Página */}
        <section className="relative px-4 sm:px-8 md:px-10 lg:px-12 max-w-[72rem] mx-auto text-center mb-12 sm:mb-16">
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-[#f4a7b9]/[0.03] rounded-full blur-[200px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10"
          >
            <span className="text-[#f4a7b9] text-[11px] font-semibold tracking-[0.28em] uppercase block mb-3 flex items-center justify-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{avulsos.eyebrow || 'ACERVO SOB DEMANDA'}</span>
            </span>
            <h1 className="font-serif text-[2.5rem] sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.05] max-w-3xl mx-auto">
              {avulsos.title || 'Ensaios & Produções Unitárias'}
            </h1>
            <p className="text-zinc-400 text-sm sm:text-base font-light mt-4 max-w-2xl mx-auto leading-relaxed">
              {avulsos.subtitle ||
                'Adquira conteúdos individuais com acesso vitalício e pagamento único via PIX ou cartão de crédito. Sem renovação automática.'}
            </p>
          </motion.div>
        </section>

        {/* Catálogo de Produtos Avulsos */}
        <section className="px-4 sm:px-8 md:px-10 lg:px-12 max-w-[72rem] mx-auto mb-16 sm:mb-24">
          {items.length === 0 ? (
            <div className="text-center py-16 text-zinc-500 text-sm">
              Novos ensaios sob demanda estão em fase de edição. Volte em breve!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {items.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="group relative rounded-[28px] overflow-hidden bg-[#08080a] border border-white/[0.08] hover:border-[#f4a7b9]/40 flex flex-col justify-between transition-colors duration-300 shadow-[0_12px_40px_rgba(0,0,0,0.85)]"
                >
                  {/* Capa */}
                  <div className="relative w-full aspect-[4/3] overflow-hidden bg-zinc-950">
                    <Image
                      src={resolveMediaUrl(item.imageUrl, 'mobile')}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover object-center group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#08080a] via-transparent to-black/35 pointer-events-none" />

                    <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between gap-2 pointer-events-none">
                      {item.badge ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-[#f4a7b9]/30 text-[#f4a7b9] text-[10px] font-semibold tracking-wider uppercase">
                          <Lock className="w-2.5 h-2.5 stroke-[2.5]" />
                          <span>{item.badge}</span>
                        </span>
                      ) : (
                        <div />
                      )}

                      {item.duration && (
                        <span className="px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/10 text-zinc-300 text-[10px] font-mono tracking-wider">
                          {item.duration}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Informações */}
                  <div className="p-6 sm:p-7 flex flex-col flex-1 justify-between">
                    <div>
                      <h2 className="font-serif text-[1.45rem] text-white group-hover:text-[#f4a7b9] transition-colors duration-200 leading-snug">
                        {item.title}
                      </h2>
                      <p className="text-zinc-400 text-[13px] font-light leading-relaxed mt-2.5">
                        {item.description}
                      </p>

                      <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center gap-3 text-[11px] text-zinc-500">
                        <span className="flex items-center gap-1 text-zinc-400">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#f4a7b9]" /> Acesso Vitalício
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-zinc-400">
                          <PixIcon className="w-3 h-3 text-[#f4a7b9]" /> PIX ou Cartão
                        </span>
                      </div>
                    </div>

                    {/* Preço e Botões de Ação Separados */}
                    <div className="mt-6 pt-4 border-t border-white/[0.06] space-y-2.5">
                      <div className="flex items-baseline justify-between mb-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
                            Valor único
                          </span>
                          <span className="font-serif text-2xl text-[#f4a7b9] font-medium tracking-tight">
                            {item.price}
                          </span>
                        </div>
                        <span className="text-[11px] font-light text-zinc-400 bg-white/[0.03] px-2.5 py-1 rounded-full border border-white/[0.06]">
                          Acesso Vitalício
                        </span>
                      </div>

                      {/* 1. Ver Detalhes & Prévia */}
                      <Link
                        href={`/avulsos/${(item.slug || item.id || '').replace(/^\/avulsos\//, '').replace(/^\/+/, '')}`}
                        className="w-full min-h-[44px] px-5 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white text-[11px] font-semibold tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 border border-white/10"
                      >
                        <span>Ver Detalhes &amp; Prévia do Conteúdo</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#f4a7b9]" />
                      </Link>

                      {/* 2. Comprar / Checkout */}
                      <button
                        type="button"
                        onClick={() => setCheckoutProduct(item)}
                        className="w-full min-h-[46px] px-6 py-3 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-black text-[11px] font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_24px_rgba(244,167,185,0.2)] active:scale-[0.98]"
                      >
                        <span>Comprar • {item.price}</span>
                        <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Upsell Banner para quem quer o Acervo Mensal */}
        <section className="px-4 sm:px-8 md:px-10 lg:px-12 max-w-[72rem] mx-auto mb-16 sm:mb-20">
          <div className="p-7 sm:p-10 rounded-[28px] bg-gradient-to-r from-[#0d0d12] via-[#09090c] to-[#0d0d12] border border-[#f4a7b9]/25 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_16px_50px_rgba(0,0,0,0.85)]">
            <div className="text-center md:text-left">
              <span className="text-[#f4a7b9] text-[10px] font-semibold tracking-[0.25em] uppercase block mb-1">
                ACESSO COMPLETO & SEM LIMITES
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl text-white">
                Prefere ter acesso a todos os ensaios sem pagar por item?
              </h3>
              <p className="text-zinc-400 text-xs sm:text-sm font-light mt-1.5 max-w-xl leading-relaxed">
                Assine o Acervo VIP oficial no Privacy (PIX) ou OnlyFans e tenha acesso irrestrito
                a todos os vídeos, fotos e bastidores já produzidos.
              </p>
            </div>

            <Link
              href="/acervo"
              className="w-full md:w-auto min-h-[48px] px-8 py-3 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-black text-xs font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2 shrink-0 shadow-[0_4px_20px_rgba(244,167,185,0.25)]"
            >
              <span>Conhecer Planos de Assinatura</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </Link>
          </div>
        </section>

        {/* Garantia de Discrição */}
        <section className="px-4 sm:px-8 md:px-10 lg:px-12 max-w-3xl mx-auto text-center">
          <div className="p-4 rounded-2xl bg-[#060608] border border-white/[0.05] flex flex-wrap items-center justify-center gap-4 text-zinc-400 text-xs font-light">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <ShieldCheck className="w-4 h-4 text-[#f4a7b9]" /> Cobrança 100% segura e discreta no extrato bancário
            </span>
            <span className="text-zinc-600">•</span>
            <span>Acesso vitalício à obra adquirida</span>
            <span className="text-zinc-600">•</span>
            <span>Liberação instantânea no PIX</span>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer
        customFooterData={content.footer}
        customInstitutionalData={content.institutional}
      />

      {/* Modals */}
      <ContactModal
        isOpen={contactOpen}
        onClose={() => setContactOpen(false)}
        customContactData={content.contact}
      />

      <VipModal
        isOpen={vipOpen}
        onClose={() => setVipOpen(false)}
        customVipData={content.vipClub}
      />

      <CheckoutModal
        isOpen={!!checkoutProduct}
        onClose={() => setCheckoutProduct(null)}
        product={checkoutProduct}
      />
    </div>
  );
}
