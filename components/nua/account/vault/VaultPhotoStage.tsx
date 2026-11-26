'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  LayoutGrid,
  Maximize2,
  RefreshCw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { resolveAssetHref, VaultFileItem, VaultMetaItem } from './types';

interface VaultPhotoStageProps {
  photos: VaultFileItem[];
  apiBase: string;
  metaItems?: VaultMetaItem[];
  failedMediaUrls: Record<string, true>;
  retryVersions: Record<string, number>;
  onMarkFailed: (url: string) => void;
  onRetryMedia: (url: string) => void;
  onReloadAccess: () => void;
  onOpenFullscreen: (idx: number) => void;
}

const STAGE_ZOOMS = [1, 1.75, 2.5] as const;

export function VaultPhotoStage({
  photos,
  apiBase,
  metaItems = [],
  failedMediaUrls,
  retryVersions,
  onMarkFailed,
  onRetryMedia,
  onReloadAccess,
  onOpenFullscreen,
}: VaultPhotoStageProps) {
  const isSingle = photos.length === 1;
  const [viewMode, setViewMode] = useState<'stage' | 'gallery'>(() => (photos.length <= 3 ? 'stage' : 'gallery'));
  const [activeIdx, setActiveIdx] = useState(0);
  const [zoomIdx, setZoomIdx] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [loadedMap, setLoadedMap] = useState<Record<string, true>>({});
  const [infoOpen, setInfoOpen] = useState(false);

  const dragOriginRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const safeIdx = activeIdx < photos.length ? activeIdx : 0;
  const current = photos[safeIdx] || photos[0];
  const zoom = STAGE_ZOOMS[zoomIdx];

  const resetZoom = useCallback(() => {
    setZoomIdx(0);
    setPan({ x: 0, y: 0 });
    setDragging(false);
  }, []);

  const stepZoom = useCallback((delta: number) => {
    setZoomIdx((prev) => {
      const next = Math.max(0, Math.min(STAGE_ZOOMS.length - 1, prev + delta));
      if (next === 0) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const goStage = useCallback(
    (delta: number) => {
      if (photos.length <= 1) return;
      resetZoom();
      setActiveIdx((prev) => (prev + delta + photos.length) % photos.length);
    },
    [photos.length, resetZoom]
  );

  // Ajusta modo padrão quando muda o conjunto de fotos
  useEffect(() => {
    setActiveIdx(0);
    resetZoom();
    setViewMode(photos.length <= 3 ? 'stage' : 'gallery');
  }, [photos.length, resetZoom]);

  // Fecha popover de detalhes ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!infoOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) {
        setInfoOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInfoOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [infoOpen]);

  // Prefetch silencioso das fotos vizinhas no Modo Ensaio
  useEffect(() => {
    if (viewMode !== 'stage' || photos.length <= 1) return;
    const neighbors = [
      photos[(safeIdx + 1) % photos.length],
      photos[(safeIdx - 1 + photos.length) % photos.length],
    ];
    for (const item of neighbors) {
      if (!item) continue;
      const img = new window.Image();
      img.decoding = 'async';
      img.src = resolveAssetHref(apiBase, item.url);
    }
  }, [viewMode, safeIdx, photos, apiBase]);

  // Centraliza miniatura ativa na faixa do Modo Ensaio
  useEffect(() => {
    if (viewMode !== 'stage' || !stripRef.current) return;
    const activeEl = stripRef.current.querySelector<HTMLElement>(`[data-stage-thumb="${safeIdx}"]`);
    activeEl?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [viewMode, safeIdx]);

  const withRetry = (rawUrl: string, key: string) => {
    const resolved = resolveAssetHref(apiBase, rawUrl);
    const v = retryVersions[key];
    return v ? `${resolved}${resolved.includes('?') ? '&' : '?'}r=${v}` : resolved;
  };

  if (!current) return null;

  const currentSrc = withRetry(current.url, current.url);
  const isCurrentLoaded = Boolean(loadedMap[current.url]);

  return (
    <div className="space-y-5">
      {/* Alternador contextual Ensaio / Galeria — somente para coleções (2+ fotos) */}
      {!isSingle && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-zinc-400">
            {viewMode === 'stage'
              ? `Foto ${String(safeIdx + 1).padStart(2, '0')} de ${String(photos.length).padStart(2, '0')}`
              : `${photos.length} fotografias`}
          </span>

          <div
            role="group"
            aria-label="Modo de visualização das fotografias"
            className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-[#08080c] p-1"
          >
            <button
              type="button"
              onClick={() => setViewMode('stage')}
              aria-pressed={viewMode === 'stage'}
              className={`inline-flex min-h-[40px] sm:min-h-[34px] items-center gap-1.5 rounded-full px-3.5 text-xs transition-colors cursor-pointer touch-manipulation ${
                viewMode === 'stage'
                  ? 'border border-[#90364B]/50 bg-[#661C30]/40 font-medium text-[#F5EEE9]'
                  : 'border border-transparent text-zinc-400 hover:text-zinc-100'
              }`}
            >
              <BookOpen className="size-3.5" />
              <span>Ensaio</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('gallery')}
              aria-pressed={viewMode === 'gallery'}
              className={`inline-flex min-h-[40px] sm:min-h-[34px] items-center gap-1.5 rounded-full px-3.5 text-xs transition-colors cursor-pointer touch-manipulation ${
                viewMode === 'gallery'
                  ? 'border border-[#90364B]/50 bg-[#661C30]/40 font-medium text-[#F5EEE9]'
                  : 'border border-transparent text-zinc-400 hover:text-zinc-100'
              }`}
            >
              <LayoutGrid className="size-3.5" />
              <span>Galeria</span>
            </button>
          </div>
        </div>
      )}

      {/* MODO PALCO / ENSAIO (sempre usado para 1 foto, e opcional para 2+ fotos) */}
      {(isSingle || viewMode === 'stage') && (
        <div className="mx-auto max-w-5xl space-y-4">
          <div
            onPointerDown={(e) => {
              if (zoom <= 1) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              setDragging(true);
              dragOriginRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
            }}
            onPointerMove={(e) => {
              if (!dragging || !dragOriginRef.current || zoom <= 1) return;
              setPan({
                x: dragOriginRef.current.panX + (e.clientX - dragOriginRef.current.x),
                y: dragOriginRef.current.panY + (e.clientY - dragOriginRef.current.y),
              });
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
              if (!start || e.changedTouches.length !== 1 || zoom > 1 || isSingle) return;
              const diffX = start.x - e.changedTouches[0].clientX;
              const diffY = start.y - e.changedTouches[0].clientY;
              if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY)) {
                goStage(diffX > 0 ? 1 : -1);
              }
            }}
            className={`relative flex min-h-[22rem] items-center justify-center overflow-hidden rounded-[24px] border border-white/[0.07] bg-[#060609] p-2 sm:min-h-[28rem] sm:p-4 ${
              zoom > 1 ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : ''
            }`}
          >
            {failedMediaUrls[current.url] ? (
              <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                <p className="text-sm text-zinc-400">Não foi possível carregar esta fotografia agora.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => onRetryMedia(current.url)}
                    className="btn-ghost !min-h-[38px] !px-4 !text-[11px]"
                  >
                    <RefreshCw className="size-3.5" />
                    <span>Tentar novamente</span>
                  </button>
                  <button
                    type="button"
                    onClick={onReloadAccess}
                    className="btn-primary !min-h-[38px] !px-4 !text-[11px]"
                  >
                    Recarregar acesso
                  </button>
                </div>
              </div>
            ) : (
              <>
                {!isSingle && zoom === 1 && (
                  <button
                    type="button"
                    onClick={() => goStage(-1)}
                    aria-label="Foto anterior"
                    className="absolute left-2.5 sm:left-3 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.12] bg-black/75 text-zinc-200 backdrop-blur-sm transition-colors hover:border-white/25 hover:bg-black hover:text-white cursor-pointer touch-manipulation"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                )}

                {!isCurrentLoaded && (
                  <div className="aspect-[4/5] w-full max-w-md rounded-xl bg-white/[0.025]" />
                )}

                <img
                  key={currentSrc}
                  src={currentSrc}
                  alt={current.label}
                  draggable={false}
                  loading="eager"
                  decoding="async"
                  onLoad={() => setLoadedMap((prev) => ({ ...prev, [current.url]: true }))}
                  onError={() => onMarkFailed(current.url)}
                  onDoubleClick={() => {
                    if (zoomIdx > 0) resetZoom();
                    else stepZoom(1);
                  }}
                  style={{
                    transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                  }}
                  className={`mx-auto max-h-[72svh] w-auto max-w-full rounded-xl object-contain select-none transition-opacity duration-300 ${
                    dragging ? '' : 'transition-transform duration-200 ease-out'
                  } ${isCurrentLoaded ? 'opacity-100' : 'absolute opacity-0'} ${
                    zoom === 1 ? 'cursor-zoom-in' : ''
                  }`}
                />

                {!isSingle && zoom === 1 && (
                  <button
                    type="button"
                    onClick={() => goStage(1)}
                    aria-label="Próxima foto"
                    className="absolute right-2.5 sm:right-3 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.12] bg-black/75 text-zinc-200 backdrop-blur-sm transition-colors hover:border-white/25 hover:bg-black hover:text-white cursor-pointer touch-manipulation"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Dock Flutuante de Estúdio — compacto, equilibrado e contextual */}
          {!failedMediaUrls[current.url] && (
            <div className="flex flex-col items-center gap-2">
              {current.hasCustomLabel && (
                <p className="text-center text-sm text-zinc-400">{current.label}</p>
              )}

              <div className="relative flex flex-wrap items-center justify-center gap-1 rounded-full border border-white/[0.09] bg-[#08080c]/95 px-2 py-1.5 backdrop-blur-md">
                <button
                  type="button"
                  disabled={zoomIdx === 0}
                  onClick={() => stepZoom(-1)}
                  aria-label="Reduzir zoom"
                  title="Reduzir zoom"
                  className="flex size-11 sm:size-9 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-white/[0.07] hover:text-white disabled:opacity-35 cursor-pointer touch-manipulation"
                >
                  <ZoomOut className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={resetZoom}
                  title="Redefinir zoom"
                  className="min-h-[44px] sm:min-h-[36px] min-w-[44px] rounded-full px-1.5 py-1 font-mono text-[11px] text-zinc-300 tabular-nums transition-colors hover:text-white cursor-pointer touch-manipulation"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  disabled={zoomIdx === STAGE_ZOOMS.length - 1}
                  onClick={() => stepZoom(1)}
                  aria-label="Ampliar detalhes"
                  title="Ampliar detalhes"
                  className="flex size-11 sm:size-9 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-white/[0.07] hover:text-white disabled:opacity-35 cursor-pointer touch-manipulation"
                >
                  <ZoomIn className="size-4" />
                </button>

                <span aria-hidden="true" className="mx-1 h-4 w-px bg-white/[0.1]" />

                <button
                  type="button"
                  onClick={() => onOpenFullscreen(safeIdx)}
                  className="inline-flex h-11 sm:h-9 items-center gap-1.5 rounded-full px-3.5 sm:px-3 text-xs text-zinc-200 transition-colors hover:bg-white/[0.07] hover:text-white cursor-pointer touch-manipulation"
                >
                  <Maximize2 className="size-3.5 text-[#90364B]" />
                  <span>Tela cheia</span>
                </button>

                {metaItems.length > 0 && (
                  <div ref={infoRef} className="relative">
                    <button
                      type="button"
                      aria-expanded={infoOpen}
                      onClick={() => setInfoOpen((v) => !v)}
                      aria-label="Detalhes do conteúdo"
                      title="Detalhes"
                      className={`inline-flex h-11 sm:h-9 min-w-[44px] sm:min-w-0 items-center justify-center gap-1.5 rounded-full px-3 text-xs transition-colors cursor-pointer touch-manipulation ${
                        infoOpen
                          ? 'bg-white/[0.1] text-[#F5EEE9]'
                          : 'text-zinc-300 hover:bg-white/[0.07] hover:text-white'
                      }`}
                    >
                      <Info className="size-3.5 text-[#90364B]" />
                      <span className="hidden sm:inline">Detalhes</span>
                    </button>

                    {infoOpen && (
                      <div
                        role="dialog"
                        aria-label="Detalhes do conteúdo"
                        className="absolute bottom-12 right-0 z-30 w-64 rounded-2xl border border-white/[0.1] bg-[#08080c] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.9)]"
                      >
                        <dl className="space-y-2 text-xs">
                          {metaItems.map((m) => (
                            <div key={m.label} className="flex items-center justify-between gap-3">
                              <dt className="text-zinc-500">{m.label}</dt>
                              <dd className="text-right text-zinc-200">{m.value}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    )}
                  </div>
                )}

                {current.download && (
                  <>
                    <span aria-hidden="true" className="mx-1 h-4 w-px bg-white/[0.1]" />
                    <a
                      download
                      href={resolveAssetHref(apiBase, current.download)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs text-zinc-200 transition-colors hover:bg-white/[0.07] hover:text-white"
                    >
                      <Download className="size-3.5 text-[#90364B]" />
                      <span>Baixar</span>
                    </a>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Faixa de miniaturas no Modo Ensaio (3+ fotos) */}
          {photos.length >= 3 && (
            <div
              ref={stripRef}
              className="no-scrollbar mx-auto flex max-w-4xl items-center justify-center gap-2 overflow-x-auto py-1"
            >
              {photos.map((f, idx) => {
                const isActive = idx === safeIdx;
                return (
                  <button
                    key={f.url}
                    type="button"
                    data-stage-thumb={idx}
                    onClick={() => {
                      resetZoom();
                      setActiveIdx(idx);
                    }}
                    aria-label={`Ver ${f.label}`}
                    aria-current={isActive ? 'true' : undefined}
                    className={`relative h-14 w-12 shrink-0 overflow-hidden rounded-lg border transition-all cursor-pointer touch-manipulation ${
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
          )}
        </div>
      )}

      {/* MODO GALERIA (Visão geral de coleções com carregamento progressivo) */}
      {!isSingle && viewMode === 'gallery' && (
        <div
          className={
            photos.length === 2
              ? 'mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6'
              : photos.length <= 5
                ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5'
                : 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4'
          }
        >
          {photos.map((f, idx) => {
            const gridSrc = withRetry(f.previewUrl || f.url, f.url);
            const isLoaded = Boolean(loadedMap[f.url]);
            return (
              <figure key={f.url} className="group flex flex-col space-y-2">
                <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#08080c] transition-colors duration-300 group-hover:border-white/[0.16]">
                  {failedMediaUrls[f.url] ? (
                    <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 bg-zinc-950 p-5 text-center">
                      <p className="text-xs text-zinc-400">Falha ao carregar imagem.</p>
                      <button
                        type="button"
                        onClick={() => onRetryMedia(f.url)}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3.5 text-xs text-[#F5EEE9] hover:bg-white/10 cursor-pointer"
                      >
                        <RefreshCw className="size-3" />
                        <span>Tentar novamente</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenFullscreen(idx)}
                        aria-label={`Abrir ${f.label} em tela cheia`}
                        className="relative block aspect-[4/5] w-full overflow-hidden bg-white/[0.02] cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#90364B]"
                      >
                        <img
                          src={gridSrc}
                          alt={f.label}
                          loading={idx < 4 ? 'eager' : 'lazy'}
                          decoding="async"
                          onLoad={() => setLoadedMap((prev) => ({ ...prev, [f.url]: true }))}
                          onError={() => onMarkFailed(f.url)}
                          className={`size-full object-cover object-center transition-all duration-500 select-none motion-safe:group-hover:scale-[1.02] ${
                            isLoaded ? 'opacity-100' : 'opacity-0'
                          }`}
                        />
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/75 via-black/25 to-transparent px-3 pb-2.5 pt-7 opacity-95 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                        >
                          <span className="font-mono text-[11px] text-zinc-300 tabular-nums">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <span className="inline-flex size-8 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white">
                            <Maximize2 className="size-3.5" />
                          </span>
                        </span>
                      </button>

                      {f.download && (
                        <a
                          download
                          href={resolveAssetHref(apiBase, f.download)}
                          aria-label={`Baixar ${f.label}`}
                          title="Baixar original"
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-2 top-2 z-10 inline-flex size-10 sm:size-9 items-center justify-center rounded-full border border-white/15 bg-black/70 text-[#F5EEE9] opacity-100 backdrop-blur-sm transition-all hover:border-white/30 hover:bg-black/85 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                        >
                          <Download className="size-3.5 text-[#90364B]" />
                        </a>
                      )}
                    </>
                  )}
                </div>

                {f.hasCustomLabel && (
                  <figcaption className="truncate px-1 text-xs text-zinc-400">{f.label}</figcaption>
                )}
              </figure>
            );
          })}
        </div>
      )}
    </div>
  );
}
