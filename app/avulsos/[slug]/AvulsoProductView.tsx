/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/nua/site/Header';
import { Footer } from '@/components/nua/site/Footer';
import { ContactModal } from '@/components/nua/site/ContactModal';
import { VipModal } from '@/components/nua/site/VipModal';
import { CheckoutModal } from '@/components/nua/site/CheckoutModal';
import { PublicBackground } from '@/components/nua/site/PublicBackground';
import { AvulsoProductItem } from '@/lib/types';
import { toSlug } from '@/lib/seo';
import { usePublishedContent } from '@/lib/contentStore';
import { AvulsoProductNotFound } from '@/components/nua/avulsos/AvulsoProductNotFound';
import { AvulsoMediaGallery } from '@/components/nua/avulsos/AvulsoMediaGallery';
import { AvulsoPurchaseCard } from '@/components/nua/avulsos/AvulsoPurchaseCard';
import { AvulsoUpsellBanner } from '@/components/nua/avulsos/AvulsoUpsellBanner';

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
  const [contactOpen, setContactOpen] = useState(false);
  const [vipOpen, setVipOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  // Obtém o slug real da URL no navegador de forma resiliente
  const [clientSlug, setClientSlug] = useState<string | null>(null);
  const [isClientReady, setIsClientReady] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const match = path.match(/^\/avulsos\/([^/?#]+)/i);
      if (match && match[1]) {
        setClientSlug(decodeURIComponent(match[1]).trim().toLowerCase());
      }
    }
    const timer = setTimeout(() => {
      setIsClientReady(true);
    }, 450);
    return () => clearTimeout(timer);
  }, []);

  const activeSlug = (clientSlug || slug || '').trim().toLowerCase();

  // Busca o produto mais recente do contentStore de forma resiliente
  const product = React.useMemo(() => {
    const items = content.avulsos?.items || [];
    const clean = activeSlug;
    const noHyphenClean = clean.replace(/-/g, '');

    const found = items.find((item) => {
      const itemSlug = (item.slug || '').trim().toLowerCase();
      const itemId = (item.id || '').trim().toLowerCase();
      const cleanId = itemId.replace(/^avulso-/, '');
      const checkoutSlug = (item.checkoutUrl || '').replace(/^\/avulsos\//, '').trim().toLowerCase();
      const titleSlug = item.title ? toSlug(item.title).toLowerCase() : '';
      const noHyphenSlug = itemSlug.replace(/-/g, '');
      const noHyphenTitle = titleSlug.replace(/-/g, '');

      return (
        clean === itemSlug ||
        clean === itemId ||
        clean === cleanId ||
        clean === checkoutSlug ||
        (titleSlug && clean === titleSlug) ||
        (noHyphenClean && noHyphenClean === noHyphenSlug) ||
        (noHyphenClean && noHyphenClean === noHyphenTitle)
      );
    });

    if (found) return found;

    if (initialProduct) {
      const initSlug = (initialProduct.slug || '').trim().toLowerCase();
      const initId = (initialProduct.id || '').trim().toLowerCase();
      const initCleanId = initId.replace(/^avulso-/, '');
      const initTitleSlug = initialProduct.title ? toSlug(initialProduct.title).toLowerCase() : '';
      const noHyphenInitSlug = initSlug.replace(/-/g, '');
      const noHyphenInitTitle = initTitleSlug.replace(/-/g, '');

      if (
        clean &&
        (clean === initSlug ||
          clean === initId ||
          clean === initCleanId ||
          clean === initTitleSlug ||
          noHyphenClean === noHyphenInitSlug ||
          noHyphenClean === noHyphenInitTitle)
      ) {
        return initialProduct;
      }
    }

    return null;
  }, [content, activeSlug, initialProduct]);

  // Sincroniza dinamicamente o título do documento no navegador
  useEffect(() => {
    if (product?.title && typeof document !== 'undefined') {
      document.title = `${product.title} | Nua Borges`;
    }
  }, [product?.title]);

  const otherActivePacks = React.useMemo(() => {
    const all = content.avulsos?.items || [];
    return all.filter((i) => i.active !== false && (!product || i.id !== product.id));
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
          duration: product.duration || 'Vídeo 4K',
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
          title: `${product.title} (Vídeo Principal UHD)`,
          url: '',
          posterUrl: product.imageUrl,
          duration: product.duration || 'Vídeo UHD',
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
    return raw.filter((u) => !isVideoUrl(u));
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

  // Seleciona aleatoriamente uma miniatura de prévia antes da compra
  useEffect(() => {
    if (allPreviewImages.length > 0) {
      const randomIdx = Math.floor(Math.random() * allPreviewImages.length);
      setActivePreviewIndex(randomIdx);
    }
  }, [allPreviewImages.length]);

  // Se o produto não for encontrado ou for avulso desativado temporariamente, exibe tela 404 com recomendações
  if (!product || product.active === false || product.modality === 'avulso') {
    if (!isClientReady) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 select-none">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full border-2 border-[#661C30] border-t-transparent animate-spin mx-auto" />
            <p className="text-zinc-400 text-xs font-mono uppercase tracking-widest">
              Carregando produção exclusiva...
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

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#661C30] selection:text-white flex flex-col">
      {/* Header */}
      <Header
        onOpenContact={() => setContactOpen(true)}
        activeSection="avulsos"
        customHeaderData={content.header}
      />

      <main className="flex-1 pt-28 sm:pt-36 pb-20 select-none relative">
        {/* Glow de fundo editorial unificado */}
        <PublicBackground />
        <div className="max-w-[72rem] mx-auto px-4 sm:px-8 md:px-10 lg:px-12">
          {/* Breadcrumb */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8"
          >
            <Link
              href="/avulsos"
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-[#90364B] text-xs font-light transition-colors uppercase tracking-wider"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Catálogo de Packs</span>
            </Link>
          </motion.div>

          {/* Grid Principal do Produto */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            <AvulsoMediaGallery
              product={product}
              activeImage={activeImage}
              activePreviewIndex={activePreviewIndex}
              setActivePreviewIndex={setActivePreviewIndex}
              allPreviewImages={allPreviewImages}
              effectiveVideos={effectiveVideos}
              effectivePhotos={effectivePhotos}
            />

            <AvulsoPurchaseCard
              product={product}
              onOpenCheckout={() => setCheckoutOpen(true)}
            />
          </div>

          <AvulsoUpsellBanner />
        </div>
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
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        product={product}
      />
    </div>
  );
}
