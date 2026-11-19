/* Vinho maduro / Nua Borges */
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
import { PublicBackground } from '@/components/nua/site/PublicBackground';
import { usePublishedContent } from '@/lib/contentStore';
import { resolveMediaUrl } from '@/lib/media';
import { sanitizeUrl } from '@/lib/security';
import { AvulsoProductItem } from '@/lib/types';

export function AvulsosClientView() {
  const content = usePublishedContent();
  const [contactOpen, setContactOpen] = useState(false);
  const [vipOpen, setVipOpen] = useState(false);
  const [checkoutProduct, setCheckoutProduct] = useState<AvulsoProductItem | null>(null);

  const [selectedModality, setSelectedModality] = useState<'all' | 'avulso' | 'pack'>('all');

  const avulsos = content.avulsos || {
    eyebrow: 'ACERVO SOB DEMANDA',
    title: 'Ensaios & Produções Unitárias',
    subtitle:
      'Escolha e adquira obras e produções unitárias sem necessidade de mensalidade. Acesso vitalício e cobrança 100% discreta.',
    items: [],
  };

  // Oculta temporariamente conteúdos avulsos (únicos) do site público, exibindo apenas Packs/Coleções
  const items = (avulsos.items || []).filter((item) => item.active !== false && item.modality !== 'avulso');

  const filteredItems = items;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#661C30] selection:text-white flex flex-col">
      {/* Header Fixo */}
      <Header
        onOpenContact={() => setContactOpen(true)}
        activeSection="avulsos"
        customHeaderData={content.header}
      />

      <main className="flex-1 pt-28 sm:pt-36 pb-20 sm:pb-28 select-none relative">
        {/* Glow de fundo editorial unificado */}
        <PublicBackground />
        {/* Topo / Header da Página Padronizado */}
        <PublicPageHero
          icon={ShoppingBag}
          eyebrow={avulsos.eyebrow || 'ACERVO SOB DEMANDA'}
          title={avulsos.title || 'Ensaios & Obras Unitárias'}
          subtitle={
            avulsos.subtitle ||
            'Adquira conteúdos individuais com acesso vitalício no seu cofre e pagamento único via Pix. Sem cobranças recorrentes.'
          }
        />

        {/* Catálogo de Produtos Avulsos */}
        <section className="px-4 sm:px-8 md:px-10 lg:px-12 max-w-[72rem] mx-auto mb-10 sm:mb-14">
          {items.length === 0 ? (
            <div className="rounded-[28px] bg-[#08080c] border border-white/[0.08] p-12 text-center text-zinc-400 text-xs sm:text-sm font-light shadow-[0_16px_50px_rgba(0,0,0,0.85)]">
              Novos ensaios sob demanda estão em fase de edição. Volte em breve!
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-[28px] bg-[#08080c] border border-white/[0.08] p-12 text-center text-zinc-400 text-xs sm:text-sm font-light shadow-[0_16px_50px_rgba(0,0,0,0.85)]">
              Nenhuma produção encontrada nesta modalidade no momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
              {filteredItems.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  className="group rounded-[28px] overflow-hidden bg-[#08080c] border border-white/[0.08] hover:border-[#661C30]/50 flex flex-col justify-between transition-all duration-500 shadow-[0_16px_50px_rgba(0,0,0,0.85)] hover:shadow-[0_20px_60px_rgba(67,19,34,0.3)]"
                >
                  {/* Capa */}
                  <div className="relative w-full aspect-[16/10] overflow-hidden bg-zinc-950">
                    <Image
                      src={resolveMediaUrl(item.imageUrl, 'mobile')}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover object-center group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#08080c] via-transparent to-black/30 pointer-events-none" />

                    <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between gap-2 pointer-events-none">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-zinc-200 text-[10px] font-mono font-medium tracking-wider">
                        <Lock className="w-2.5 h-2.5 text-[#90364B]" />
                        <span>{item.badge || (item.modality === 'avulso' ? 'Conteúdo Avulso' : 'Pack Coleção')}</span>
                      </span>

                      {item.duration && (
                        <span className="px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/10 text-zinc-400 text-[10px] font-mono">
                          {item.duration}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Informações */}
                  <div className="p-6 sm:p-7 flex flex-col flex-1 justify-between text-left">
                    <div>
                      <h2 className="font-serif text-xl sm:text-2xl text-white group-hover:text-[#90364B] transition-colors duration-300 leading-snug">
                        {item.title}
                      </h2>
                      {item.description && (
                        <p className="text-zinc-400 text-xs sm:text-sm font-light leading-relaxed mt-2.5 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      <div className="mt-4 pt-3.5 border-t border-white/[0.05] flex items-center gap-3 text-xs text-zinc-400 font-light">
                        <span className="flex items-center gap-1.5 text-zinc-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#90364B]" /> Acesso Vitalício
                        </span>
                        <span className="text-zinc-600">&bull;</span>
                        <span className="flex items-center gap-1.5 text-zinc-300">
                          <PixIcon className="w-3.5 h-3.5 text-[#90364B]" /> Pagamento via Pix
                        </span>
                      </div>
                    </div>

                    {/* Ação da Vitrine — Direciona para a página individual sem exibir preços na listagem */}
                    <div className="mt-6 pt-4 border-t border-white/[0.06]">
                      <Link
                        href={`/avulsos/${(item.slug || item.id || '').replace(/^\/avulsos\//, '').replace(/^\/+/, '')}`}
                        className="w-full h-11 px-5 rounded-full bg-white/[0.06] hover:bg-gradient-to-r hover:from-[#431322] hover:via-[#661C30] hover:to-[#7A293D] text-[#F5EEE9] hover:text-white text-xs font-semibold tracking-wider uppercase border border-white/10 hover:border-white/20 hover:shadow-[0_4px_20px_rgba(67,19,34,0.4)] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer group"
                      >
                        <span>Conhecer Obra &amp; Prévia</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Upsell Banner para quem quer o Acervo Mensal */}
        <section className="px-4 sm:px-8 md:px-10 lg:px-12 max-w-[72rem] mx-auto mb-10 sm:mb-14">
          <div className="p-7 sm:p-10 rounded-[28px] bg-gradient-to-r from-[#0d0d12] via-[#09090c] to-[#0d0d12] border border-[#661C30]/40 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_16px_50px_rgba(0,0,0,0.85)]">
            <div className="text-center md:text-left">
              <span className="text-[#90364B] text-[10px] font-semibold tracking-[0.25em] uppercase block mb-1">
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
              className="w-full md:w-auto min-h-[48px] px-8 py-3 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] text-xs font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2 shrink-0 shadow-[0_4px_20px_rgba(67,19,34,0.4)] border border-white/10"
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
              <ShieldCheck className="w-4 h-4 text-[#90364B]" /> Cobrança 100% segura e discreta no extrato bancário
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
