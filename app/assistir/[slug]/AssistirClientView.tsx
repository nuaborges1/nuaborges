/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Lock,
  CheckCircle2,
  Film,
  Download,
  Loader2,
  Archive,
} from 'lucide-react';
import { AvulsoProductItem, AvulsoVideoItem } from '@/lib/types';
import { usePublishedContent } from '@/lib/contentStore';
import { resolveMediaUrl } from '@/lib/media';
import { downloadAllAsZip } from '@/lib/downloads';
import { isVideoUrl } from './components/helpers';
import { useAssistirAuth } from './components/useAssistirAuth';
import { AssistirOtpModal } from './components/AssistirOtpModal';
import { AssistirVideoSection } from './components/AssistirVideoSection';
import { AssistirGallerySection } from './components/AssistirGallerySection';
import { CheckoutModal } from '@/components/nua/site/CheckoutModal';

interface AssistirClientViewProps {
  product: AvulsoProductItem | null;
  slug: string;
}

export function AssistirClientView({ product: initialProduct, slug }: AssistirClientViewProps) {
  const content = usePublishedContent();
  const searchParams = useSearchParams();
  const tokenFromUrl =
    searchParams.get('token') ||
    searchParams.get('purchaseToken') ||
    searchParams.get('sessionToken');

  const [activeVideoIndex, setActiveVideoIndex] = useState<number | null>(null);
  const [lightboxPhotoIndex, setLightboxPhotoIndex] = useState<number | null>(null);
  const [clientSlug, setClientSlug] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [isClientReady, setIsClientReady] = useState(false);

  // Estado de download completo em ZIP
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [zipStatus, setZipStatus] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const match = path.match(/^\/assistir\/([^/?#]+)/i);
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

  const product = useMemo(() => {
    const items = content.avulsos?.items || [];
    const clean = activeSlug;
    const found = items.find((item) => {
      const itemSlug = (item.slug || '').trim().toLowerCase();
      const itemId = (item.id || '').trim().toLowerCase();
      const cleanId = itemId.replace(/^avulso-/, '');
      return clean === itemSlug || clean === itemId || clean === cleanId;
    });

    if (found) return found;

    if (initialProduct) {
      const initSlug = (initialProduct.slug || '').trim().toLowerCase();
      const initId = (initialProduct.id || '').trim().toLowerCase();
      const initCleanId = initId.replace(/^avulso-/, '');
      if (clean && (clean === initSlug || clean === initId || clean === initCleanId)) {
        return initialProduct;
      }
    }

    return null;
  }, [content, activeSlug, initialProduct]);

  useEffect(() => {
    if (product?.title && typeof document !== 'undefined') {
      document.title = `Assistir ${product.title} | Nua Borges`;
    }
  }, [product?.title]);

  const productSlug = product?.slug || slug;

  const {
    isVerifying,
    isAuthorized,
    authorizedMedia,
    watermarkText,
    step,
    setStep,
    orderInput,
    setOrderInput,
    otpInput,
    setOtpInput,
    maskedEmail,
    authError,
    setAuthError,
    isSubmitting,
    isDevToolsOpen,
    setIsDevToolsOpen,
    handleValidateToken,
    handleRequestOtp,
    handleVerifyOtp,
  } = useAssistirAuth({
    product,
    productSlug,
    tokenFromUrl,
  });

  const videosList: AvulsoVideoItem[] = useMemo(() => {
    if (authorizedMedia?.videos && authorizedMedia.videos.length > 0) {
      return authorizedMedia.videos;
    }
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
          title: `${product.title} (Vídeo Principal 4K)`,
          url: product.imageUrl?.toLowerCase().includes('poster.webp')
            ? product.imageUrl.replace('poster.webp', 'video.mp4')
            : product.imageUrl?.endsWith('.mp4')
            ? product.imageUrl
            : '',
          posterUrl: product.imageUrl,
          duration: product.duration || 'Vídeo 4K',
        },
      ];
    }
    return [];
  }, [product, authorizedMedia]);

  const photosList: string[] = useMemo(() => {
    if (authorizedMedia?.exclusivePhotos && authorizedMedia.exclusivePhotos.length > 0) {
      return authorizedMedia.exclusivePhotos;
    }
    if (!product) return [];
    const raw =
      product.exclusivePhotos && product.exclusivePhotos.length > 0
        ? product.exclusivePhotos
        : product.previewImages || [];
    const cleanPhotos = raw.filter((u) => !isVideoUrl(u));
    if (cleanPhotos.length > 0) {
      return cleanPhotos;
    }
    if (product.imageUrl && !isVideoUrl(product.imageUrl)) {
      return [product.imageUrl];
    }
    return [];
  }, [product, authorizedMedia]);

  if (!product || product.active === false) {
    if (!isClientReady) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 select-none">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full border-2 border-[#661C30] border-t-transparent animate-spin mx-auto" />
            <p className="text-zinc-400 text-xs font-mono uppercase tracking-widest">
              Carregando produção privativa...
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="max-w-md space-y-5">
          <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto text-[#90364B] shadow-[0_0_30px_rgba(102,28,48,0.3)]">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl text-white font-normal">Conteúdo Indisponível</h1>
          <p className="text-zinc-400 text-xs sm:text-sm font-light leading-relaxed">
            Este conteúdo exclusivo não foi localizado no acervo oficial ou sua exibição está desativada no momento.
          </p>
          <div className="pt-2">
            <Link
              href="/avulsos"
              className="inline-flex items-center justify-center px-7 py-3 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] text-xs font-bold uppercase tracking-wider transition-all shadow-[0_4px_24px_rgba(67,19,34,0.45)] border border-white/10"
            >
              Explorar Acervo de Avulsos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 select-none">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-2 border-[#661C30] border-t-transparent animate-spin mx-auto" />
          <p className="text-zinc-400 text-xs font-mono uppercase tracking-widest">
            Verificando credencial e autorização de dispositivo...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <>
        <AssistirOtpModal
          product={product}
          productSlug={productSlug}
          step={step}
          setStep={setStep}
          orderInput={orderInput}
          setOrderInput={setOrderInput}
          otpInput={otpInput}
          setOtpInput={setOtpInput}
          maskedEmail={maskedEmail}
          authError={authError}
          setAuthError={setAuthError}
          isSubmitting={isSubmitting}
          onRequestOtp={handleRequestOtp}
          onVerifyOtp={handleVerifyOtp}
          onOpenCheckout={() => setCheckoutOpen(true)}
        />
        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          product={product}
          onSuccess={({ purchaseToken }) => {
            if (purchaseToken) {
              handleValidateToken(purchaseToken);
              setCheckoutOpen(false);
            }
          }}
        />
      </>
    );
  }

  return (
    <div
      className="min-h-screen bg-black text-white selection:bg-[#661C30] selection:text-white flex flex-col select-none"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
    >
      {isDevToolsOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 text-center select-none">
          <div className="max-w-md space-y-4">
            <Lock className="w-10 h-10 text-[#90364B] mx-auto animate-pulse" />
            <h3 className="font-serif text-xl text-white">Modo de Proteção Ativado</h3>
            <p className="text-zinc-400 text-xs font-light leading-relaxed">
              Ferramentas de inspeção detectadas. Para preservar os direitos autorais da obra, a exibição foi temporariamente pausada.
            </p>
            <button
              onClick={() => setIsDevToolsOpen(false)}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] font-bold text-xs uppercase tracking-wider cursor-pointer shadow-[0_4px_20px_rgba(67,19,34,0.45)] border border-white/10"
            >
              Continuar Assistindo
            </button>
          </div>
        </div>
      )}

      {/* Top Bar Minimalista */}
      <header className="sticky top-0 z-40 bg-black/85 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link
          href="/avulsos"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-xs font-light transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar ao Catálogo</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-mono tracking-wider uppercase">
            <CheckCircle2 className="w-3 h-3" />
            <span>Sessão &amp; Dispositivo Autorizado</span>
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-[72rem] mx-auto w-full px-4 sm:px-8 md:px-10 py-8 sm:py-12 space-y-10 select-none">
        {/* Título, Ficha Técnica e Badges */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3.5 py-1 rounded-full bg-[#661C30]/20 border border-[#7A293D]/40 text-[#90364B] text-[10px] font-bold uppercase tracking-wider">
              {product.badge || 'PRODUÇÃO EXCLUSIVA'}
            </span>
            <span className="text-zinc-400 text-xs font-mono bg-white/[0.04] border border-white/[0.08] px-3 py-1 rounded-full">
              {photosList.length > 0 && `${photosList.length} Foto(s) 4K`}
              {photosList.length > 0 && videosList.length > 0 && ' • '}
              {videosList.length > 0 && `${videosList.length} Vídeo(s) UHD`}
              {photosList.length === 0 && videosList.length === 0 && 'Conteúdo Digital'}
            </span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl text-white font-medium tracking-tight">
            {product.title}
          </h1>

          <p className="text-zinc-300 text-sm sm:text-base font-light max-w-3xl leading-relaxed">
            {product.description}
          </p>

          {product.longDescription && (
            <p className="text-zinc-400 text-xs sm:text-sm font-light max-w-3xl leading-relaxed pt-1 border-t border-white/[0.05]">
              {product.longDescription}
            </p>
          )}
        </div>

        {/* SEÇÃO 1: VÍDEOS DA PRODUÇÃO */}
        <AssistirVideoSection
          product={product}
          videosList={videosList}
          activeVideoIndex={activeVideoIndex}
          setActiveVideoIndex={setActiveVideoIndex}
          watermarkText={watermarkText}
        />

        {/* SEÇÃO 2: GALERIA FOTOGRÁFICA */}
        <AssistirGallerySection
          product={product}
          photosList={photosList}
          lightboxPhotoIndex={lightboxPhotoIndex}
          setLightboxPhotoIndex={setLightboxPhotoIndex}
          watermarkText={watermarkText}
        />

        {/* SEÇÃO 3: CENTRAL DE DOWNLOADS DO SITE (ZIP COMPLETO) */}
        <div className="p-6 sm:p-8 rounded-[28px] bg-[#09090c] border border-white/[0.08] shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="w-12 h-12 rounded-2xl bg-[#661C30]/20 border border-[#7A293D]/40 flex items-center justify-center text-[#90364B] shrink-0">
                <Archive className="w-6 h-6" />
              </span>
              <div>
                <h4 className="text-base text-white font-medium">Download do Acervo Completo em ZIP</h4>
                <p className="text-zinc-400 text-xs font-light mt-0.5">
                  Baixe todos os arquivos adquiridos ({photosList.length} fotos 4K e {videosList.length} vídeos UHD) compactados em um único arquivo diretamente no seu dispositivo.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isZipping || (photosList.length === 0 && videosList.length === 0)}
              onClick={async () => {
                if (isZipping || !product) return;
                setIsZipping(true);
                setZipProgress(0);
                setZipStatus('Iniciando empacotamento...');

                try {
                  const fullPhotos = photosList.map((p) => resolveMediaUrl(p, 'full'));
                  const fullVideos = videosList.map((v) => ({
                    title: v.title,
                    url: v.url,
                  }));

                  await downloadAllAsZip({
                    packTitle: product.title,
                    photos: fullPhotos,
                    videos: fullVideos,
                    onProgress: (percent, text) => {
                      setZipProgress(percent);
                      setZipStatus(text);
                    },
                  });
                } catch {
                  setZipStatus('Falha ao gerar arquivo ZIP.');
                } finally {
                  setTimeout(() => {
                    setIsZipping(false);
                    setZipStatus(null);
                  }, 4000);
                }
              }}
              className="w-full sm:w-auto min-h-[46px] px-7 py-3 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-[0_4px_24px_rgba(67,19,34,0.45)] border border-white/10 disabled:opacity-50"
            >
              {isZipping ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Compactando ({zipProgress}%)</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Baixar Tudo em ZIP</span>
                </>
              )}
            </button>
          </div>

          {/* Barra de Progresso do ZIP */}
          {isZipping && (
            <div className="pt-2 space-y-1.5">
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#661C30] to-[#90364B] transition-all duration-300"
                  style={{ width: `${zipProgress}%` }}
                />
              </div>
              <p className="text-[11px] font-mono text-zinc-400 text-right">{zipStatus}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AssistirClientView;
