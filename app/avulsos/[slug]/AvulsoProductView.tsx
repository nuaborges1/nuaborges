/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/nua/site/Header';
import { Footer } from '@/components/nua/site/Footer';
import { ContactModal } from '@/components/nua/site/ContactModal';
import { VipModal } from '@/components/nua/site/VipModal';
import { LazyCheckoutModal } from '@/components/nua/site/LazyCheckoutModal';
import { PublicBackground } from '@/components/nua/site/PublicBackground';
import { AvulsoProductItem } from '@/lib/types';
import { findPublicPack, isPublicPack, packMediaCounts } from '@/lib/publicCatalog';
import { usePublishedContent } from '@/lib/contentStore';
import { AvulsoProductNotFound } from '@/components/nua/avulsos/AvulsoProductNotFound';
import { AvulsoMediaGallery } from '@/components/nua/avulsos/AvulsoMediaGallery';
import { AvulsoPurchaseCard } from '@/components/nua/avulsos/AvulsoPurchaseCard';
import { AvulsoUpsellBanner } from '@/components/nua/avulsos/AvulsoUpsellBanner';
import { useCopy } from '@/lib/copy';

interface AvulsoProductViewProps {
  initialProduct: AvulsoProductItem | null;
  slug: string;
}

const isVideoUrl = (url: string) => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('/videos/') ||
    lower.endsWith('.mp4') ||
    lower.endsWith('.mov') ||
    lower.endsWith('.webm') ||
    lower.includes('video.mp4') ||
    lower.includes('poster.webp')
  );
};

export function AvulsoProductView({ initialProduct, slug }: AvulsoProductViewProps) {
  const content = usePublishedContent();
  const { copy } = useCopy();
  const pathname = usePathname();
  const [contactOpen, setContactOpen] = useState(false);
  const [vipOpen, setVipOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  // Deriva o slug dinamicamente de usePathname() (evita slug travado ao navegar entre packs pós-build)
  const clientSlug = React.useMemo(() => {
    const rawPath = pathname || (typeof window !== 'undefined' ? window.location.pathname : '');
    const match = rawPath.match(/^\/avulsos\/([^/?#]+)/i);
    if (match && match[1]) {
      try {
        return decodeURIComponent(match[1]).trim().toLowerCase();
      } catch {
        return match[1].trim().toLowerCase();
      }
    }
    return null;
  }, [pathname]);

  const [isClientReady, setIsClientReady] = useState(Boolean(initialProduct));

  useEffect(() => {
    if (initialProduct) {
      setIsClientReady(true);
      return;
    }
    setIsClientReady(false);
    // Aguarda sincronização do /api/content/sync (máx. 2.5s em 4G antes de concluir 404)
    if (content._updatedAt) {
      setIsClientReady(true);
      return;
    }
    const timer = setTimeout(() => {
      setIsClientReady(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, [clientSlug, initialProduct, content._updatedAt]);

  const activeSlug = (clientSlug || slug || '').trim().toLowerCase();

  const product = React.useMemo(() => {
    const catalog = content.avulsos;
    if (catalog?.active === false) return null;
    const found = findPublicPack((catalog?.items || []).filter(isPublicPack), activeSlug);
    if (found) return found;
    return !content._updatedAt && initialProduct?.slug === activeSlug ? initialProduct : null;
  }, [content.avulsos, content._updatedAt, activeSlug, initialProduct]);

  const otherActivePacks = React.useMemo(() => {
    const all = content.avulsos?.items || [];
    return all.filter(
      (i) => isPublicPack(i) && i.id !== product?.id
    );
  }, [content, product]);

  const effectiveVideos = React.useMemo(() => {
    if (!product) return [];
    if (product.videos && product.videos.length > 0) {
      return product.videos;
    }
    const legacyVideoUrls = (product.previewImages || []).filter(isVideoUrl);
    if (legacyVideoUrls.length > 0) {
      return legacyVideoUrls.map((url, i) => {
        const isPoster = url.toLowerCase().includes('poster.webp');
        const videoUrl = isPoster ? url.replace('poster.webp', 'video.mp4') : url;
        const posterUrl = isPoster ? url : url.replace(/\.(mp4|mov|webm)$/i, '/poster.webp');
        return {
          id: `leg-vid-${i}`,
          title: `${product.title} (Vídeo ${i + 1})`,
          url: videoUrl,
          posterUrl,
          duration: product.duration || 'Vídeo',
        };
      });
    }

    const isVideoFormat =
      product.technicalDetails?.format?.toLowerCase().includes('vídeo') ||
      product.duration?.toLowerCase().includes('minuto');
    if (isVideoFormat) {
      return [
        {
          id: 'v-default-1',
          title: `${product.title} (Vídeo Principal)`,
          url: '',
          posterUrl: product.imageUrl,
          duration: product.duration || 'Vídeo',
        },
      ];
    }
    return [];
  }, [product]);

  const effectivePhotos = React.useMemo(() => {
    if (!product) return [];
    const raw =
      product.exclusivePhotos && product.exclusivePhotos.length > 0
        ? product.exclusivePhotos
        : product.previewImages || [];
    const safeList = raw.filter((u) => !isVideoUrl(u));
    const declaredCount = Number(product.exclusivePhotosCount || 0);
    if (declaredCount > safeList.length) {
      const placeholderPool = safeList.length > 0 ? safeList : (product.imageUrl ? [product.imageUrl] : []);
      if (placeholderPool.length > 0) {
        return Array.from({ length: declaredCount }, (_, idx) => placeholderPool[idx % placeholderPool.length]);
      }
    }
    return safeList;
  }, [product]);

  const allPreviewImages = React.useMemo(() => {
    if (!product) return [];
    const previews =
      product.previewImages && product.previewImages.length > 0
        ? product.previewImages
        : [product.imageUrl];
    const list = [product.imageUrl, ...previews].filter((u) => Boolean(u) && !isVideoUrl(u));
    return Array.from(new Set(list));
  }, [product]);

  // Inicia previsivelmente pela primeira prévia / capa oficial ao abrir ou trocar de Pack
  useEffect(() => {
    setActivePreviewIndex(0);
  }, [product?.id]);

  // Se o produto não for encontrado ou for avulso desativado temporariamente, exibe tela 404 com recomendações
  if (!product || product.active === false || product.modality === 'avulso') {
    if (!isClientReady) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 select-none">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full border-2 border-[#661C30] border-t-transparent animate-spin mx-auto" />
            <p className="text-zinc-400 text-xs font-mono uppercase tracking-widest">
              {copy.avulsos.catalogDetails.loadingProduction}
            </p>
          </div>
        </div>
      );
    }
    return (
      <AvulsoProductNotFound
        activeSlug={activeSlug}
        otherActivePacks={otherActivePacks}
        content={content}
      />
    );
  }

  const activeImage = allPreviewImages[activePreviewIndex] || product?.imageUrl || '';
  const canonicalCounts = packMediaCounts(product);
  const displayPhotosCount = canonicalCounts.photos || effectivePhotos.length;
  const displayVideosCount = Math.max(canonicalCounts.videos, effectiveVideos.length);
  const longDesc = product.longDescription?.trim() || '';
  const shortDesc = product.description?.trim() || '';
  const hasComplementaryNarrative = Boolean(longDesc && longDesc !== shortDesc);
  const narrativeParagraphs = hasComplementaryNarrative
    ? longDesc.split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#661C30] selection:text-white flex flex-col">
      {/* Header */}
      <Header
        onOpenContact={() => setContactOpen(true)}
        activeSection="avulsos"
        customHeaderData={content.header}
      />

      <main className="flex-1 pt-24 sm:pt-36 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-20 relative">
        {/* Glow de fundo editorial unificado */}
        <PublicBackground />
        <div className="max-w-[72rem] mx-auto px-4 sm:px-8 md:px-10 lg:px-12">
          {/* Breadcrumb */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-4 lg:mb-8"
          >
            <Link
              href="/avulsos"
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-[#F5EEE9] text-xs font-light transition-colors uppercase tracking-wider"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{copy.avulsos.catalogDetails.backToCatalogLabel}</span>
            </Link>
          </motion.div>

          {/* Grid Principal do Produto: Esquerda (Galeria) · Direita (Apresentação e Aquisição) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start lg:items-stretch">
            <AvulsoMediaGallery
              product={product}
              activeImage={activeImage}
              activePreviewIndex={activePreviewIndex}
              setActivePreviewIndex={setActivePreviewIndex}
              allPreviewImages={allPreviewImages}
              effectiveVideos={effectiveVideos}
            />

            <AvulsoPurchaseCard
              product={product}
              onOpenCheckout={() => setCheckoutOpen(true)}
              hideMobileAction={checkoutOpen || contactOpen || vipOpen}
              photosCount={displayPhotosCount}
              videosCount={displayVideosCount}
            />
          </div>

          {/* Região C — Narrativa editorial aberta sobre o fundo (diferente do bloco complementar final) */}
          {narrativeParagraphs.length > 0 && (
            <section
              aria-label={copy.avulsos.catalogDetails.collectionNotesEyebrow}
              className="mt-14 sm:mt-16 pt-10 sm:pt-12 border-t border-white/[0.08]"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
                <div className="lg:col-span-4 space-y-2.5">
                  <span className="text-[#F5EEE9]/80 text-[10px] font-semibold tracking-[0.26em] uppercase block">
                    {copy.avulsos.catalogDetails.collectionNotesEyebrow}
                  </span>
                  <h2 className="font-serif text-2xl sm:text-[28px] text-[#F5EEE9] font-normal tracking-tight">
                    {copy.avulsos.catalogDetails.collectionNotesTitle}
                  </h2>
                  <div className="w-10 h-px bg-[#7A293D]" aria-hidden="true" />
                </div>
                <div className="lg:col-span-8 max-w-[65ch] space-y-4 text-zinc-300 text-sm sm:text-base font-light leading-[1.85]">
                  {narrativeParagraphs.map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </section>
          )}

          <AvulsoUpsellBanner />
        </div>
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
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        product={product}
      />
    </div>
  );
}
