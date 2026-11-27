/* Vinho maduro / Nua Borges */
'use client';

import type { SiteContent } from '@/lib/types';

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
import { LazyCheckoutModal } from '@/components/nua/site/LazyCheckoutModal';
import { PixIcon } from '@/components/nua/site/Icons';
import { PublicPageHero } from '@/components/nua/site/PublicPageHero';
import { PublicBackground } from '@/components/nua/site/PublicBackground';
import { usePublishedContent } from '@/lib/contentStore';
import { isPublicPack, packMediaCounts } from '@/lib/publicCatalog';
import { resolveMediaUrl } from '@/lib/media';
import { sanitizeUrl } from '@/lib/security';
import { AvulsoProductItem } from '@/lib/types';
import { useCopy } from '@/lib/copy';

export function AvulsosClientView({ initialContent }: { initialContent?: Partial<SiteContent> }) {
  const content = usePublishedContent(initialContent);
  const { copy, cms } = useCopy();
  const [contactOpen, setContactOpen] = useState(false);
  const [vipOpen, setVipOpen] = useState(false);
  const [checkoutProduct, setCheckoutProduct] = useState<AvulsoProductItem | null>(null);

  const [selectedModality, setSelectedModality] = useState<'all' | 'avulso' | 'pack'>('all');

  const avulsos = content.avulsos || {
    eyebrow: 'ACERVO SOB DEMANDA',
    title: 'Ensaios & Produções Unitárias',
    subtitle:
      'Escolha e adquira produções individuais sem mensalidade, com pagamento único via Pix e acesso privado pelo seu Cofre.',
    items: [],
  };

  // Oculta temporariamente conteúdos avulsos (únicos) do site público, exibindo apenas Packs/Coleções
  const items = avulsos.active === false ? [] : (avulsos.items || []).filter(isPublicPack);

  const filteredItems = items;

  const formatMediaBadge = (item: AvulsoProductItem): string | null => {
    const { photos, videos } = packMediaCounts(item);
    const parts: string[] = [];
    if (photos > 0) parts.push(`${photos} foto${photos === 1 ? '' : 's'}`);
    if (videos > 0) parts.push(`${videos} vídeo${videos === 1 ? '' : 's'}`);
    return parts.length > 0 ? parts.join(' · ') : null;
  };

  return (
    <div className="min-h-screen w-full overflow-x-clip bg-black text-white selection:bg-[#661C30] selection:text-white flex flex-col">
      {/* Header Fixo */}
      <Header
        onOpenContact={() => setContactOpen(true)}
        activeSection="avulsos"
        customHeaderData={content.header}
      />

      <main className="flex-1 pt-28 sm:pt-36 pb-20 sm:pb-28 relative">
        {/* Glow de fundo editorial unificado */}
        <PublicBackground />
        {/* Topo / Header da Página Padronizado */}
        <PublicPageHero
          icon={ShoppingBag}
          eyebrow={cms(avulsos.eyebrow, 'avulsos.eyebrow', copy.avulsos.catalogDetails.eyebrowFallback)}
          title={cms(avulsos.title, 'avulsos.title', copy.avulsos.catalogDetails.titleFallback)}
          subtitle={cms(avulsos.subtitle, 'avulsos.subtitle', copy.avulsos.catalogDetails.subtitleFallback)}
        />

        {/* Catálogo de Produtos Avulsos */}
        <section className="px-4 sm:px-8 md:px-10 lg:px-12 max-w-[72rem] mx-auto mb-10 sm:mb-14">
          {items.length === 0 ? (
            <div className="rounded-[28px] bg-[#08080c] border border-white/[0.08] p-12 text-center text-zinc-400 text-xs sm:text-sm font-light shadow-[0_16px_50px_rgba(0,0,0,0.85)]">
              {copy.avulsos.catalogDetails.emptyEditingNotice}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-[28px] bg-[#08080c] border border-white/[0.08] p-12 text-center text-zinc-400 text-xs sm:text-sm font-light shadow-[0_16px_50px_rgba(0,0,0,0.85)]">
              {copy.avulsos.catalogDetails.emptyModalityNotice}
            </div>
          ) : filteredItems.length === 1 ? (
            (() => {
              const item = filteredItems[0];
              const mediaLabel = formatMediaBadge(item);
              const slugPath = (item.slug || item.id || '').replace(/^\/avulsos\//, '').replace(/^\/+/, '');
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="group max-w-4xl mx-auto rounded-[28px] overflow-hidden bg-[#08080c] border border-white/[0.08] hover:border-[#7A293D]/60 grid grid-cols-1 md:grid-cols-12 transition-all duration-500 shadow-[0_20px_60px_rgba(0,0,0,0.9)]"
                >
                  <div className="relative md:col-span-6 aspect-[4/5] md:aspect-auto md:min-h-[400px] overflow-hidden bg-zinc-950">
                    <Image
                      src={resolveMediaUrl(item.imageUrl, 'mobile')}
                      alt={item.title}
                      fill
                      priority
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover object-center group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#08080c]/75 via-transparent to-black/30 pointer-events-none" />
                    <div className="absolute top-4 inset-x-4 flex items-center justify-between gap-2 pointer-events-none">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-zinc-200 text-[10px] font-mono font-medium tracking-wider">
                        <Lock className="w-2.5 h-2.5 text-[#90364B]" />
                        <span>{item.badge || copy.avulsos.catalogDetails.featuredBadgeFallback}</span>
                      </span>
                      {mediaLabel && (
                        <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-zinc-300 text-[10px] font-mono">
                          {mediaLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-6 p-7 sm:p-9 flex flex-col justify-between text-left gap-6">
                    <div className="space-y-4">
                      <span className="text-[#F5EEE9]/80 text-[10px] font-mono font-semibold tracking-[0.24em] uppercase block">
                        {copy.avulsos.catalogDetails.featuredEyebrow}
                      </span>
                      <h2 className="font-serif text-2xl sm:text-3xl text-[#F5EEE9] leading-snug">
                        {item.title}
                      </h2>
                      {item.description && (
                        <p className="text-zinc-300 text-sm font-light leading-relaxed">
                          {item.description}
                        </p>
                      )}
                      <div className="pt-4 border-t border-white/[0.06] flex flex-wrap items-center gap-3 text-xs text-zinc-300 font-light">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#90364B]" /> {copy.avulsos.catalogDetails.accessVaultShort}
                        </span>
                        <span className="text-zinc-600">&bull;</span>
                        <span className="flex items-center gap-1.5">
                          <PixIcon className="w-3.5 h-3.5 text-[#90364B]" /> {copy.avulsos.catalogDetails.pixSingleShort}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/avulsos/${slugPath}`}
                      className="w-full min-h-[50px] px-6 py-3 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] text-xs font-bold tracking-widest uppercase border border-white/10 shadow-[0_4px_24px_rgba(67,19,34,0.45)] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>{copy.avulsos.cardCta}</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                  </div>
                </motion.div>
              );
            })()
          ) : (
            <div
              className={`grid grid-cols-1 ${
                filteredItems.length === 2 ? 'md:grid-cols-2 max-w-4xl mx-auto' : 'sm:grid-cols-2 lg:grid-cols-3'
              } gap-6 sm:gap-7`}
            >
              {filteredItems.map((item, idx) => {
                const mediaLabel = formatMediaBadge(item);
                return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  className="group rounded-[28px] overflow-hidden bg-[#08080c] border border-white/[0.08] hover:border-[#661C30]/50 flex flex-col justify-between transition-all duration-500 shadow-[0_16px_50px_rgba(0,0,0,0.85)] hover:shadow-[0_20px_60px_rgba(67,19,34,0.3)]"
                >
                  {/* Capa em proporção editorial 4:5 harmonizada com a Home */}
                  <div className="relative w-full aspect-[4/5] overflow-hidden bg-zinc-950">
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

                      {mediaLabel && (
                        <span className="px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/10 text-zinc-300 text-[10px] font-mono">
                          {mediaLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Informações */}
                  <div className="p-6 sm:p-7 flex flex-col flex-1 justify-between text-left">
                    <div>
                      <h2 className="font-serif text-xl sm:text-2xl text-[#F5EEE9] group-hover:text-[#F5EEE9] transition-colors duration-300 leading-snug">
                        {item.title}
                      </h2>
                      {item.description && (
                        <p className="text-zinc-400 text-xs sm:text-sm font-light leading-relaxed mt-2.5 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      <div className="mt-4 pt-3.5 border-t border-white/[0.05] flex items-center gap-3 text-xs text-zinc-300 font-light">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#90364B]" /> {copy.avulsos.catalogDetails.accessVaultShort}
                        </span>
                        <span className="text-zinc-600">&bull;</span>
                        <span className="flex items-center gap-1.5">
                          <PixIcon className="w-3.5 h-3.5 text-[#90364B]" /> {copy.avulsos.catalogDetails.pixShort}
                        </span>
                      </div>
                    </div>

                    {/* Ação principal da vitrine */}
                    <div className="mt-6 pt-4 border-t border-white/[0.06]">
                      <Link
                        href={`/avulsos/${(item.slug || item.id || '').replace(/^\/avulsos\//, '').replace(/^\/+/, '')}`}
                        className="w-full min-h-[46px] px-5 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] text-xs font-bold tracking-wider uppercase border border-white/10 hover:shadow-[0_4px_20px_rgba(67,19,34,0.4)] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>{copy.avulsos.cardCta}</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* Upsell Banner secundário para o Acervo VIP */}
        <section className="px-4 sm:px-8 md:px-10 lg:px-12 max-w-[72rem] mx-auto mb-10 sm:mb-14">
          <div className="p-7 sm:p-10 rounded-[28px] bg-[#08080c] border border-white/[0.08] flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_16px_50px_rgba(0,0,0,0.85)]">
            <div className="text-center md:text-left">
              <span className="text-[#F5EEE9]/80 text-[10px] font-semibold tracking-[0.25em] uppercase block mb-1">
                {copy.avulsos.catalogDetails.upsellEyebrow}
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl text-[#F5EEE9]">
                {copy.avulsos.catalogDetails.upsellTitle}
              </h3>
              <p className="text-zinc-400 text-xs sm:text-sm font-light mt-1.5 max-w-xl leading-relaxed">
                {copy.avulsos.catalogDetails.upsellBody}
              </p>
            </div>

            <Link
              href="/acervo"
              className="w-full md:w-auto min-h-[46px] px-7 py-3 rounded-full border border-white/15 bg-white/[0.03] hover:border-[#7A293D]/60 hover:bg-[#431322]/25 text-[#F5EEE9] text-xs font-semibold tracking-wider uppercase transition-all flex items-center justify-center gap-2 shrink-0"
            >
              <span>{copy.avulsos.catalogDetails.upsellCta}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#90364B]" />
            </Link>
          </div>
        </section>

        {/* Garantia de Discrição */}
        <section className="px-4 sm:px-8 md:px-10 lg:px-12 max-w-3xl mx-auto text-center">
          <div className="p-4 rounded-2xl bg-[#08080c] border border-white/[0.07] flex flex-wrap items-center justify-center gap-4 text-zinc-300 text-xs font-light">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#90364B]" /> {copy.avulsos.catalogDetails.bottomTrustPix}
            </span>
            <span className="text-zinc-600">&bull;</span>
            <span>{copy.avulsos.catalogDetails.bottomTrustVault}</span>
            <span className="text-zinc-600">&bull;</span>
            <span>{copy.avulsos.catalogDetails.bottomTrustAuto}</span>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer
        customFooterData={content.footer}
        customInstitutionalData={content.institutional}
        customChannelsData={content.channels}
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

      <LazyCheckoutModal
        isOpen={!!checkoutProduct}
        onClose={() => setCheckoutProduct(null)}
        product={checkoutProduct}
      />
    </div>
  );
}
