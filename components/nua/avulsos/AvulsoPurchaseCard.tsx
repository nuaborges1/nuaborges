/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  Lock,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Play,
  User,
  Camera,
  Film,
  Clock,
} from 'lucide-react';
import { AvulsoProductItem } from '@/lib/types';
import { getPublicApiUrl } from '@/lib/contentStore';
import { formatBrlPrice } from '@/lib/formatters';
import { packPurchasePrice, isRealTimeDuration } from '@/lib/publicCatalog';
import { fetchCustomerSession, fetchLibrary, NUA_ID_SESSION_EVENT } from '@/lib/nuaIdClient';
import { useCopy } from '@/lib/copy';

interface AvulsoPurchaseCardProps {
  product: AvulsoProductItem;
  onOpenCheckout: () => void;
  hideMobileAction?: boolean;
  photosCount?: number;
  videosCount?: number;
}

export function AvulsoPurchaseCard({
  product,
  onOpenCheckout,
  hideMobileAction,
  photosCount = 0,
  videosCount = 0,
}: AvulsoPurchaseCardProps) {
  const { copy } = useCopy();
  const router = useRouter();
  const actionRef = useRef<HTMLDivElement>(null);
  const [actionAbove, setActionAbove] = useState(false);
  const reference = product.slug || product.id;
  const [availability, setAvailability] = useState<{ reference: string; available: boolean } | null>(null);
  const available = availability?.reference === reference ? availability.available : null;
  const price = available === true ? packPurchasePrice(product) : null;

  useEffect(() => {
    const controller = new AbortController();
    const endpoint = getPublicApiUrl() + '/api/payments/create-pix?' + new URLSearchParams({ slug: reference });
    fetch(endpoint, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => response.ok && (await response.json()).available === true)
      .then((result) => { if (!controller.signal.aborted) setAvailability({ reference, available: result }); })
      .catch(() => { if (!controller.signal.aborted) setAvailability({ reference, available: false }); });
    return () => controller.abort();
  }, [reference]);

  useEffect(() => {
    if (!actionRef.current || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setActionAbove(entry.boundingClientRect.bottom <= (entry.rootBounds?.top ?? 0));
      },
      { rootMargin: '-72px 0px 0px 0px' }
    );
    observer.observe(actionRef.current);
    return () => observer.disconnect();
  }, []);

  const [alreadyOwned, setAlreadyOwned] = useState(false);
  const [ownedWatchUrl, setOwnedWatchUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const checkOwnership = async () => {
      try {
        const sess = await fetchCustomerSession();
        if (!mounted || !sess.ok || !sess.data?.authenticated) {
          if (mounted) {
            setAlreadyOwned(false);
            setOwnedWatchUrl(null);
          }
          return;
        }
        const lib = await fetchLibrary();
        if (!mounted || !lib.ok || !Array.isArray(lib.data?.items)) return;
        const targetSlug = (product.slug || product.id?.replace(/^avulso-/, '') || '').toLowerCase();
        const match = lib.data.items.find(
          (i) => i.status === 'active' && String(i.resourceId || '').toLowerCase() === targetSlug
        );
        setAlreadyOwned(Boolean(match));
        setOwnedWatchUrl(match?.watchUrl || '/conta?tab=biblioteca');
      } catch {}
    };
    checkOwnership();
    window.addEventListener(NUA_ID_SESSION_EVENT, checkOwnership);
    return () => {
      mounted = false;
      window.removeEventListener(NUA_ID_SESSION_EVENT, checkOwnership);
    };
  }, [product.slug, product.id]);

  // Composição estruturada e exata do Pack sem concatenação de texto livre redundante
  const compositionItems = useMemo(() => {
    const items: Array<{ icon: 'photo' | 'video' | 'clock'; label: string }> = [];
    if (photosCount > 0) {
      items.push({
        icon: 'photo',
        label: `${photosCount} ${photosCount === 1 ? 'fotografia' : 'fotografias'}`,
      });
    }
    if (videosCount > 0) {
      items.push({
        icon: 'video',
        label: `${videosCount} ${videosCount === 1 ? 'vídeo autoral' : 'vídeos autorais'}`,
      });
    }
    if (isRealTimeDuration(product.duration)) {
      items.push({ icon: 'clock', label: product.duration!.trim() });
    }
    return items;
  }, [photosCount, videosCount, product.duration]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="min-w-0 space-y-6 lg:col-span-5 lg:col-start-8 lg:row-start-1"
    >
      {/* Região A — Apresentação editorial */}
      <div className="space-y-3">
        <span className="text-[#F5EEE9]/80 text-[11px] font-semibold tracking-[0.26em] uppercase block">
          {product.badge || copy.avulsos.catalogDetails.collectionBadgeFallback}
        </span>
        <h1 className="break-words font-serif text-3xl sm:text-4xl lg:text-[42px] text-[#F5EEE9] tracking-tight leading-[1.1]">
          {product.title}
        </h1>
        {product.description && (
          <p className="text-zinc-300 text-sm sm:text-[15px] font-light leading-relaxed">
            {product.description}
          </p>
        )}

        {compositionItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {compositionItems.map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#08080c] px-3.5 py-1.5 text-xs text-zinc-200 font-light"
              >
                {item.icon === 'photo' ? (
                  <Camera className="w-3.5 h-3.5 text-[#90364B]" />
                ) : item.icon === 'video' ? (
                  <Film className="w-3.5 h-3.5 text-[#90364B]" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-[#90364B]" />
                )}
                <span>{item.label}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Região B — Aquisição */}
      <div
        ref={actionRef}
        className="p-6 sm:p-7 rounded-[28px] bg-[#08080c] border border-white/[0.1] shadow-[0_20px_60px_rgba(0,0,0,0.85)] space-y-5"
      >
        {alreadyOwned ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-950/25 px-4 py-3 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{copy.avulsos.catalogDetails.alreadyOwnedNotice}</span>
            </div>
            <Link
              href={ownedWatchUrl || '/conta?tab=biblioteca'}
              className="w-full min-h-[52px] px-8 py-3.5 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] text-xs font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2.5 shadow-[0_4px_24px_rgba(67,19,34,0.45)] border border-white/10"
            >
              <Play className="w-4 h-4" />
              <span>{copy.avulsos.catalogDetails.viewInLibraryCta}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/conta?tab=biblioteca"
              className="w-full min-h-[42px] px-5 py-2 rounded-full border border-white/12 bg-white/[0.03] hover:bg-white/[0.07] text-zinc-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <User className="w-3.5 h-3.5 text-[#90364B]" />
              <span>{copy.avulsos.catalogDetails.openLibraryCta}</span>
            </Link>
          </div>
        ) : (
          <>
            {price === null ? (
              <p className="text-sm text-zinc-300">
                {available === null
                  ? copy.avulsos.catalogDetails.checkingAvailability
                  : copy.avulsos.catalogDetails.unavailableNow}
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 block">
                      {copy.avulsos.catalogDetails.singlePaymentMeta}
                    </span>
                    <span className="font-serif text-3xl sm:text-4xl text-[#F5EEE9] font-normal tracking-tight block">
                      R$ {formatBrlPrice(price)}
                    </span>
                  </div>
                  <span className="border border-white/[0.08] bg-white/[0.03] px-3 py-1 rounded-full text-[11px] text-zinc-300 font-light">
                    {copy.avulsos.catalogDetails.noRecurrenceBadge}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onOpenCheckout}
                  className="w-full min-h-[52px] px-8 py-3.5 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] text-xs font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_4px_24px_rgba(67,19,34,0.45)] border border-white/10 active:scale-[0.98]"
                >
                  <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{product.buttonText || copy.avulsos.catalogDetails.buyButtonFallback}</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </>
            )}

            <p className="text-xs text-zinc-400 font-light leading-relaxed">
              {copy.avulsos.catalogDetails.pixReleaseNote}
            </p>

            {/* Acesso para quem já adquiriu */}
            <div className="pt-4 border-t border-white/[0.06] space-y-2">
              <Link
                href="/conta?tab=biblioteca"
                className="w-full text-center text-xs text-zinc-300 hover:text-[#F5EEE9] transition-colors py-1 flex items-center justify-center gap-1.5 font-light"
              >
                <User className="w-3.5 h-3.5 text-[#90364B]" />
                <span>{copy.avulsos.catalogDetails.alreadyOwnedLink}</span>
              </Link>
              <button
                type="button"
                onClick={() => router.push('/conta?tab=conta')}
                className="w-full text-center text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors py-0.5 flex items-center justify-center gap-1.5 cursor-pointer font-light"
              >
                <KeyRound className="w-3 h-3 text-zinc-400" />
                <span>{copy.avulsos.catalogDetails.claimPreviousLink}</span>
              </button>
            </div>
          </>
        )}
      </div>

      {actionAbove &&
        (alreadyOwned || price !== null) &&
        createPortal(
          <div
            aria-hidden={hideMobileAction || undefined}
            style={hideMobileAction ? { opacity: 0, pointerEvents: 'none' } : undefined}
            className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#08080c]/95 backdrop-blur-md px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
          >
            <div className="mx-auto flex max-w-md items-center gap-3">
              {alreadyOwned ? (
                <Link
                  tabIndex={hideMobileAction ? -1 : undefined}
                  href={ownedWatchUrl || '/conta?tab=biblioteca'}
                  className="flex min-h-[48px] flex-1 items-center justify-center rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] border border-white/10 px-5 text-xs font-bold uppercase tracking-widest text-[#F5EEE9]"
                >
                  {copy.avulsos.catalogDetails.viewInLibraryCta}
                </Link>
              ) : (
                <>
                  <span className="shrink-0 font-serif text-lg font-medium text-[#F5EEE9]">R$ {formatBrlPrice(price)}</span>
                  <button
                    type="button"
                    tabIndex={hideMobileAction ? -1 : undefined}
                    onClick={onOpenCheckout}
                    className="min-h-[48px] flex-1 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] border border-white/10 px-4 text-xs font-bold uppercase tracking-widest text-[#F5EEE9] cursor-pointer"
                  >
                    {product.buttonText || copy.avulsos.catalogDetails.buyButtonFallback}
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </motion.div>
  );
}
