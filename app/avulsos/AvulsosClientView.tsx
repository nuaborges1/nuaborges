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
import { PublicPageHero } from '@/components/nua/site/PublicPageHero';
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
        {/* Topo / Header da Página Padronizado */}
        <PublicPageHero
          icon={ShoppingBag}
          eyebrow={avulsos.eyebrow || 'Acervo Sob Demanda'}
          title={avulsos.title || 'Ensaios & Produções Unitárias'}
          subtitle={
            avulsos.subtitle ||
            'Adquira conteúdos individuais com acesso vitalício e pagamento único via PIX ou cartão de crédito. Sem renovação automática.'
          }
        />

        {/* Catálogo de Produtos Avulsos */}
        <section className="px-4 sm:px-8 md:px-10 lg:px-12 max-w-[72rem] mx-auto mb-16 sm:mb-24">
          {items.length === 0 ? (
            <div className="rounded-2xl bg-[#14161d] border border-white/[0.06] p-12 text-center text-zinc-400 text-xs font-light">
              Novos ensaios sob demanda estão em fase de edição. Volte em breve!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  className="group rounded-2xl overflow-hidden bg-[#14161d] border border-white/[0.06] hover:border-white/15 flex flex-col justify-between transition-colors duration-200"
                >
                  {/* Capa */}
                  <div className="relative w-full aspect-[16/10] overflow-hidden bg-zinc-950">
                    <Image
                      src={resolveMediaUrl(item.imageUrl, 'mobile')}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover object-center group-hover:scale-[1.02] transition-transform duration-500 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#14161d] via-transparent to-black/30 pointer-events-none" />

                    <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 pointer-events-none">
                      {item.badge ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-zinc-200 text-[10px] font-mono font-medium tracking-wider">
                          <Lock className="w-2.5 h-2.5 text-[#f4a7b9]" />
                          <span>{item.badge}</span>
                        </span>
                      ) : (
                        <div />
                      )}

                      {item.duration && (
                        <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-zinc-400 text-[10px] font-mono">
                          {item.duration}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Informações */}
                  <div className="p-5 flex flex-col flex-1 justify-between text-left">
                    <div>
                      <h2 className="font-serif text-lg text-white group-hover:text-[#f4a7b9] transition-colors duration-200 leading-snug">
                        {item.title}
                      </h2>
                      {item.description && (
                        <p className="text-zinc-400 text-xs font-light leading-relaxed mt-2 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      <div className="mt-3.5 pt-3 border-t border-white/[0.04] flex items-center gap-3 text-[11px] text-zinc-500 font-light">
                        <span className="flex items-center gap-1.5 text-zinc-400">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#f4a7b9]" /> Acesso Vitalício
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5 text-zinc-400">
                          <PixIcon className="w-3 h-3 text-[#f4a7b9]" /> Pagamento via Pix
                        </span>
                      </div>
                    </div>

                    {/* Preço e Botões */}
                    <div className="mt-5 pt-3.5 border-t border-white/[0.06] space-y-2.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
                          Valor Único
                        </span>
                        <span className="font-mono text-xl text-[#f4a7b9] font-bold">
                          {item.price}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {/* 1. Ver Detalhes */}
                        <Link
                          href={`/avulsos/${(item.slug || item.id || '').replace(/^\/avulsos\//, '').replace(/^\/+/, '')}`}
                          className="h-10 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-xs font-medium border border-white/[0.08] transition-colors flex items-center justify-center gap-1.5"
                        >
                          <span>Ver Prévia</span>
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                        </Link>

                        {/* 2. Comprar */}
                        <button
                          type="button"
                          onClick={() => setCheckoutProduct(item)}
                          className="h-10 px-3 rounded-xl bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-[0.98]"
                        >
                          <span>Comprar</span>
                          <Lock className="w-3 h-3 stroke-[2.5]" />
                        </button>
                      </div>
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
