'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Loader2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useModalFocus } from '@/hooks/useModalFocus';
import { resolveAssetHref, VaultFileItem } from './types';

interface VaultLightboxProps {
  photos: VaultFileItem[];
  index: number | null;
  apiBase: string;
  retryVersions: Record<string, number>;
  onChangeIndex: (next: number | null) => void;
}

const ZOOM_LEVELS = [1, 2, 3] as const;

export function VaultLightbox({
  photos,
  index,
  apiBase,
  retryVersions,
  onChangeIndex,
}: VaultLightboxProps) {
  const [zoomIdx, setZoomIdx] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pureMode, setPureMode] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const dragOriginRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef<number>(0);

  const isOpen = index !== null && Boolean(photos[index]);
  const zoom = ZOOM_LEVELS[zoomIdx];
  const current = index !== null ? photos[index] || null : null;

  useScrollLock(isOpen);
  useModalFocus(isOpen, stageRef);

  const resetZoom = useCallback(() => {
    setZoomIdx(0);
    setPan({ x: 0, y: 0 });
    setDragging(false);
  }, []);

  const stepZoom = useCallback((delta: number) => {
    setZoomIdx((prev) => {
      const next = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, prev + delta));
      if (next === 0) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const navigate = useCallback(
    (delta: number) => {
      if (index === null || photos.length <= 1) return;
      resetZoom();
      setLoaded(false);
      onChangeIndex((index + delta + photos.length) % photos.length);
    },
    [index, photos.length, onChangeIndex, resetZoom]
  );

  // Reset estado ao abrir/mudar foto
  useEffect(() => {
    resetZoom();
    setLoaded(false);
  }, [index, resetZoom]);

  // Prefetch silencioso das fotos vizinhas (±1) para troca instantânea
  useEffect(() => {
    if (index === null || photos.length <= 1) return;
    const neighbors = [
      photos[(index + 1) % photos.length],
      photos[(index - 1 + photos.length) % photos.length],
    ];
    for (const item of neighbors) {
      if (!item) continue;
      const img = new window.Image();
      img.decoding = 'async';
      img.src = resolveAssetHref(apiBase, item.url);
    }
  }, [index, photos, apiBase]);

  // Centraliza miniatura ativa no filmstrip
  useEffect(() => {
    if (index === null || !filmstripRef.current) return;
    const thumb = filmstripRef.current.querySelector<HTMLElement>(`[data-lb-thumb="${index}"]`);
    thumb?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [index]);

  // Atalhos de teclado
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomIdx > 0) resetZoom();
        else if (pureMode) setPureMode(false);
        else onChangeIndex(null);
      } else if (e.key === 'ArrowRight' && photos.length > 1) {
        navigate(1);
      } else if (e.key === 'ArrowLeft' && photos.length > 1) {
        navigate(-1);
      } else if (e.key === '+' || e.key === '=') {
        stepZoom(1);
      } else if (e.key === '-') {
        stepZoom(-1);
      } else if (e.key === '0') {
        resetZoom();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, zoomIdx, pureMode, photos.length, navigate, resetZoom, stepZoom, onChangeIndex]);

  if (typeof document === 'undefined') return null;

  const showFilmstrip = photos.length >= 4 && !pureMode;
  const fullSrc = current
    ? (() => {
        const base = resolveAssetHref(apiBase, current.url);
        const v = retryVersions[current.url];
        return v ? `${base}${base.includes('?') ? '&' : '?'}r=${v}` : base;
      })()
    : '';

  return createPortal(
    <AnimatePresence>
      {isOpen && current && index !== null && (
        <motion.div
          key="vault-lightbox-pro"
          role="dialog"
          aria-modal="true"
          aria-label={`Visualização em tela cheia: ${current.label}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => {
            if (zoom > 1) return;
            onChangeIndex(null);
          }}
          className="fixed inset-0 z-[100] flex h-[100dvh] flex-col justify-between bg-black/96 backdrop-blur-xl select-none"
        >
          {/* Barra superior */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`z-50 flex items-center justify-between gap-3 px-4 pb-2 pt-[calc(env(safe-area-inset-top,0px)+1rem)] transition-opacity duration-200 sm:px-6 ${
              pureMode ? 'pointer-events-none opacity-0' : 'opacity-100'
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              {photos.length > 1 && (
                <span className="shrink-0 rounded-full border border-white/[0.1] bg-zinc-900/90 px-3.5 py-1.5 font-mono text-[11px] tracking-wider text-zinc-200 tabular-nums">
                  {String(index + 1).padStart(2, '0')}&thinsp;/&thinsp;{String(photos.length).padStart(2, '0')}
                </span>
              )}
              {current.hasCustomLabel && (
                <span className="truncate text-sm text-zinc-300">{current.label}</span>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="flex items-center rounded-full border border-white/[0.1] bg-zinc-900/90 p-0.5">
                <button
                  type="button"
                  disabled={zoomIdx === 0}
                  onClick={() => stepZoom(-1)}
                  aria-label="Reduzir zoom"
                  className="flex size-11 sm:size-9 items-center justify-center rounded-full text-zinc-200 transition-colors hover:bg-white/10 disabled:opacity-35 cursor-pointer touch-manipulation"
                >
                  <ZoomOut className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={resetZoom}
                  className="min-h-[44px] sm:min-h-[36px] min-w-[44px] px-1 text-center font-mono text-[11px] text-zinc-300 tabular-nums cursor-pointer touch-manipulation"
                  title="Redefinir zoom"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  disabled={zoomIdx === ZOOM_LEVELS.length - 1}
                  onClick={() => stepZoom(1)}
                  aria-label="Ampliar zoom"
                  className="flex size-11 sm:size-9 items-center justify-center rounded-full text-zinc-200 transition-colors hover:bg-white/10 disabled:opacity-35 cursor-pointer touch-manipulation"
                >
                  <ZoomIn className="size-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setPureMode(true)}
                aria-label="Ocultar controles"
                title="Ocultar controles"
                className="hidden size-10 items-center justify-center rounded-full border border-white/[0.1] bg-zinc-900/90 text-zinc-200 transition-colors hover:border-white/25 hover:text-white sm:flex cursor-pointer"
              >
                <EyeOff className="size-4" />
              </button>

              {current.download && (
                <a
                  download
                  href={resolveAssetHref(apiBase, current.download)}
                  className="inline-flex h-11 sm:h-10 items-center gap-1.5 rounded-full border border-white/[0.1] bg-zinc-900/90 px-3.5 text-xs font-medium text-[#F5EEE9] transition-colors hover:border-white/25 hover:bg-zinc-800"
                >
                  <Download className="size-3.5 text-[#90364B]" />
                  <span className="hidden sm:inline">Baixar</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => onChangeIndex(null)}
                aria-label="Fechar tela cheia (Esc)"
                className="flex size-11 sm:size-10 items-center justify-center rounded-full border border-white/[0.1] bg-zinc-900/90 text-zinc-200 transition-colors hover:border-white/25 hover:bg-zinc-800 hover:text-white cursor-pointer touch-manipulation"
              >
                <X className="size-5 sm:size-4" />
              </button>
            </div>
          </div>

          {/* Botão discreto para sair do Modo Puro */}
          {pureMode && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPureMode(false);
              }}
              aria-label="Mostrar controles"
              className="fixed right-5 top-[calc(env(safe-area-inset-top,0px)+1rem)] z-50 flex size-10 items-center justify-center rounded-full border border-white/15 bg-black/70 text-zinc-200 backdrop-blur-md transition-colors hover:text-white cursor-pointer"
            >
              <Eye className="size-4" />
            </button>
          )}

          {/* Palco central com Zoom + Pan sem scrollbars */}
          <div
            ref={stageRef}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => {
              if (zoom <= 1) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              setDragging(true);
              dragOriginRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
            }}
            onPointerMove={(e) => {
              if (!dragging || !dragOriginRef.current || zoom <= 1) return;
              const dx = e.clientX - dragOriginRef.current.x;
              const dy = e.clientY - dragOriginRef.current.y;
              setPan({ x: dragOriginRef.current.panX + dx, y: dragOriginRef.current.panY + dy });
            }}
            onPointerUp={() => {
              setDragging(false);
              dragOriginRef.current = null;
            }}
            onTouchStart={(e) => {
              if (e.touches.length !== 1 || zoom > 1) return;
              touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }}
            onTouchEnd={(e) => {
              const start = touchStartRef.current;
              touchStartRef.current = null;
              if (!start || e.changedTouches.length !== 1) return;
              const diffX = start.x - e.changedTouches[0].clientX;
              const diffY = start.y - e.changedTouches[0].clientY;

              if (Math.abs(diffX) < 12 && Math.abs(diffY) < 12) {
                const now = Date.now();
                if (now - lastTapRef.current < 280) {
                  if (zoomIdx > 0) resetZoom();
                  else stepZoom(1);
                  lastTapRef.current = 0;
                } else {
                  lastTapRef.current = now;
                }
                return;
              }
              if (zoom > 1) return;
              if (diffY < -70 && Math.abs(diffY) > Math.abs(diffX) * 1.35) {
                onChangeIndex(null);
              } else if (photos.length > 1 && Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY)) {
                navigate(diffX > 0 ? 1 : -1);
              }
            }}
            className={`relative flex flex-1 items-center justify-center overflow-hidden px-3 py-2 outline-none sm:px-14 ${
              zoom > 1 ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : ''
            }`}
          >
            {photos.length > 1 && zoom === 1 && !pureMode && (
              <button
                type="button"
                onClick={() => navigate(-1)}
                aria-label="Foto anterior"
                className="absolute left-2 top-1/2 z-40 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.1] bg-black/65 text-zinc-200 transition-colors hover:border-white/25 hover:bg-zinc-900/90 hover:text-white cursor-pointer touch-manipulation sm:left-5"
              >
                <ChevronLeft className="size-5" />
              </button>
            )}

            <div className="relative flex items-center justify-center">
              {!loaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-zinc-500" />
                </div>
              )}
              <img
                key={fullSrc}
                src={fullSrc}
                alt={current.label}
                draggable={false}
                onLoad={() => setLoaded(true)}
                onDoubleClick={() => {
                  if (zoomIdx > 0) resetZoom();
                  else stepZoom(1);
                }}
                style={{
                  transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                }}
                className={`rounded-xl object-contain transition-opacity duration-300 ${
                  dragging ? '' : 'transition-transform duration-200 ease-out'
                } ${loaded ? 'opacity-100' : 'opacity-0'} ${
                  showFilmstrip ? 'max-h-[75dvh]' : 'max-h-[86dvh]'
                } max-w-[94vw] sm:max-w-[88vw]`}
              />
            </div>

            {photos.length > 1 && zoom === 1 && !pureMode && (
              <button
                type="button"
                onClick={() => navigate(1)}
                aria-label="Próxima foto"
                className="absolute right-2 top-1/2 z-40 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.1] bg-black/65 text-zinc-200 transition-colors hover:border-white/25 hover:bg-zinc-900/90 hover:text-white cursor-pointer touch-manipulation sm:right-5"
              >
                <ChevronRight className="size-5" />
              </button>
            )}
          </div>

          {/* Filmstrip inferior apenas em coleções de 4+ fotos */}
          {showFilmstrip ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="z-50 border-t border-white/[0.06] bg-black/80 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.85rem)] pt-3"
            >
              <div
                ref={filmstripRef}
                className="no-scrollbar mx-auto flex max-w-4xl items-center gap-2 overflow-x-auto py-0.5"
              >
                {photos.map((f, idx) => {
                  const isActive = idx === index;
                  return (
                    <button
                      key={f.url}
                      type="button"
                      data-lb-thumb={idx}
                      onClick={() => onChangeIndex(idx)}
                      aria-label={`Ver ${f.label}`}
                      aria-current={isActive ? 'true' : undefined}
                      className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border transition-all cursor-pointer touch-manipulation sm:h-14 sm:w-14 ${
                        isActive
                          ? 'border-[#90364B] opacity-100 ring-1 ring-[#661C30]'
                          : 'border-white/10 opacity-45 hover:opacity-80'
                      }`}
                    >
                      <img
                        src={resolveAssetHref(apiBase, f.previewUrl || f.url)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]" />
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
