'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Film,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  Lock,
  Maximize2,
  Play,
  RefreshCw,
  Rows2,
  ShieldCheck,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { getPublicApiUrl } from '@/lib/contentStore';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useModalFocus } from '@/hooks/useModalFocus';

export interface VaultFileItem {
  label: string;
  hasCustomLabel?: boolean;
  url: string;
  previewUrl?: string;
  posterUrl?: string;
  duration?: string;
  video: boolean;
  download?: string;
}

export interface VaultContentViewerProps {
  order: string;
  initialTitle?: string;
  initialCoverUrl?: string | null;
  initialConfirmToken?: string;
  backLabel: string;
  contextBadge?: string;
  metadataSlot?: React.ReactNode;
  onBack: () => void;
  onAuthenticatedByConfirm?: () => void;
}

const STATE_COPY: Record<string, { heading: string; body: string }> = {
  loading: {
    heading: 'Preparando acesso privado',
    body: 'Validando sua sessão e carregando seu conteúdo protegido…',
  },
  confirm: {
    heading: 'Confirme este navegador',
    body: 'Para proteger sua compra, enviamos um link único de confirmação para o e-mail vinculado ao pedido. Basta abrir a mensagem neste mesmo navegador.',
  },
  approve: {
    heading: 'Autorizar visualização neste navegador',
    body: 'Confirme abaixo que foi você quem solicitou acesso aos arquivos neste navegador.',
  },
  sent: {
    heading: 'Confirmação enviada por e-mail',
    body: 'Verifique sua caixa de entrada e spam. Abra o link recebido neste mesmo navegador para liberar a visualização.',
  },
  expired: {
    heading: 'Link de confirmação expirado',
    body: 'Essa confirmação expirou ou já foi utilizada. Solicite um novo link abaixo para continuar.',
  },
  wrongBrowser: {
    heading: 'Abra no navegador original',
    body: 'Este link precisa ser aberto no mesmo navegador onde o acesso foi solicitado. Se você abriu dentro do aplicativo de e-mail, copie o link e abra no navegador.',
  },
  wait: {
    heading: 'Aguarde alguns minutos',
    body: 'Foram solicitadas várias confirmações em sequência. Aguarde cerca de dez minutos antes de tentar novamente.',
  },
  unavailable: {
    heading: 'Conteúdo temporariamente indisponível',
    body: 'Não conseguimos carregar este conteúdo agora. Verifique sua conexão e tente novamente em instantes.',
  },
  missing: {
    heading: 'Conteúdo não identificado',
    body: 'Não foi possível localizar o item selecionado nesta conta.',
  },
  idle: {
    heading: 'Visualização encerrada',
    body: 'Por privacidade, o acesso temporário a esta mídia foi encerrado. Reabra abaixo quando quiser continuar.',
  },
};

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const IDLE_WARNING_MS = 13 * 60 * 1000;
const ACTIVITY_PING_INTERVAL_MS = 60 * 1000;

function resolveAssetHref(apiBase: string, rawUrl: string | undefined | null): string {
  if (!rawUrl) return '';
  if (/^https?:\/\//i.test(rawUrl) || rawUrl.startsWith('data:')) return rawUrl;
  return `${apiBase}${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`;
}

export function VaultContentViewer({
  order,
  initialTitle = '',
  initialCoverUrl = null,
  initialConfirmToken = '',
  backLabel,
  contextBadge,
  metadataSlot,
  onBack,
  onAuthenticatedByConfirm,
}: VaultContentViewerProps) {
  const [state, setState] = useState<string>(initialConfirmToken ? 'approve' : 'loading');
  const [files, setFiles] = useState<VaultFileItem[]>([]);
  const [title, setTitle] = useState<string>(initialTitle);
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCoverUrl);
  const [confirmToken, setConfirmToken] = useState<string>(initialConfirmToken);
  const [lastAction, setLastAction] = useState<string>(initialConfirmToken ? 'confirm' : 'open');
  const [unavailableReason, setUnavailableReason] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [closingVisit, setClosingVisit] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Controles contextuais (exibidos somente quando fazem sentido para o conteúdo)
  const [mediaFilter, setMediaFilter] = useState<'all' | 'photo' | 'video'>('all');
  const [photoDensity, setPhotoDensity] = useState<'grid' | 'editorial'>('grid');
  const [activeVideoIdx, setActiveVideoIdx] = useState<number>(0);

  // Carregamento progressivo e recuperação isolada por arquivo
  const [loadedMedia, setLoadedMedia] = useState<Record<string, true>>({});
  const [failedMediaUrls, setFailedMediaUrls] = useState<Record<string, true>>({});
  const [retryVersions, setRetryVersions] = useState<Record<string, number>>({});

  // Lightbox editorial
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [lightboxZoomed, setLightboxZoomed] = useState(false);
  const [lightboxLoaded, setLightboxLoaded] = useState(false);
  const [idleWarning, setIdleWarning] = useState(false);

  const requestControllerRef = useRef<AbortController | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapAtRef = useRef<number>(0);
  const onConfirmedRef = useRef(onAuthenticatedByConfirm);
  useEffect(() => {
    onConfirmedRef.current = onAuthenticatedByConfirm;
  }, [onAuthenticatedByConfirm]);

  useScrollLock(lightboxIdx !== null);
  useModalFocus(lightboxIdx !== null, lightboxRef);

  const run = useCallback(
    async (action: string, targetOrder: string, tokenOverride?: string) => {
      requestControllerRef.current?.abort();
      const controller = new AbortController();
      requestControllerRef.current = controller;

      setLastAction(action);
      setUnavailableReason('');
      setActionError(null);
      setState('loading');

      try {
        const response = await fetch(`${getPublicApiUrl()}/api/me/cofre`, {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            order: targetOrder,
            token: tokenOverride ?? '',
          }),
        });
        if (controller.signal.aborted) return;

        const data = await response.json().catch(() => ({ state: 'unavailable' }));
        if (controller.signal.aborted) return;

        if (data.state === 'ready') {
          if (typeof data.title === 'string' && data.title.trim()) {
            setTitle(data.title.trim());
          }
          if (typeof data.coverUrl === 'string' && data.coverUrl.trim()) {
            setCoverUrl(data.coverUrl.trim());
          }
          setConfirmToken('');
          setFailedMediaUrls({});
          setLoadedMedia({});
          setRetryVersions({});
          setActiveVideoIdx(0);
          setFiles(Array.isArray(data.files) ? data.files : []);
          setState('ready');
          if (action === 'confirm') {
            onConfirmedRef.current?.();
          }
          return;
        }

        if (typeof data.reason === 'string') {
          setUnavailableReason(data.reason);
        }
        setFiles([]);
        setState(STATE_COPY[data.state] ? data.state : 'unavailable');
      } catch (err: any) {
        if (controller.signal.aborted || err?.name === 'AbortError') return;
        setFiles([]);
        setState('unavailable');
      } finally {
        if (requestControllerRef.current === controller) {
          requestControllerRef.current = null;
        }
      }
    },
    []
  );

  // Carrega automaticamente quando o pedido ou o token inicial mudar
  useEffect(() => {
    setTitle(initialTitle);
    setCoverUrl(initialCoverUrl);
    setFiles([]);
    setMediaFilter('all');
    setPhotoDensity('grid');
    setActiveVideoIdx(0);
    setLightboxIdx(null);
    setLightboxZoomed(false);
    setFailedMediaUrls({});
    setLoadedMedia({});
    setRetryVersions({});
    setActionError(null);
    setConfirmToken(initialConfirmToken);

    if (initialConfirmToken) {
      setState('approve');
      setLastAction('confirm');
    } else if (order) {
      void run('open', order);
    } else {
      setState('missing');
    }

    return () => {
      requestControllerRef.current?.abort();
      requestControllerRef.current = null;
    };
  }, [order, initialTitle, initialCoverUrl, initialConfirmToken, run]);

  // Monitoramento real de atividade e expiração por inatividade (15 min)
  useEffect(() => {
    if (state !== 'ready' || !order) {
      setIdleWarning(false);
      return;
    }

    let idleTimer: ReturnType<typeof setTimeout>;
    let warningTimer: ReturnType<typeof setTimeout>;
    let lastPingAt = Date.now();
    let mounted = true;

    const expireLocally = () => {
      if (!mounted) return;
      setIdleWarning(false);
      setFiles([]);
      setLightboxIdx(null);
      setLightboxZoomed(false);
      setState('idle');
    };

    const scheduleIdle = () => {
      clearTimeout(idleTimer);
      clearTimeout(warningTimer);
      setIdleWarning(false);
      warningTimer = setTimeout(() => {
        if (mounted) setIdleWarning(true);
      }, IDLE_WARNING_MS);
      idleTimer = setTimeout(expireLocally, IDLE_TIMEOUT_MS);
    };

    const handleActivity = () => {
      scheduleIdle();
      const now = Date.now();
      if (now - lastPingAt < ACTIVITY_PING_INTERVAL_MS) return;
      lastPingAt = now;
      fetch(`${getPublicApiUrl()}/api/me/cofre`, {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activity', order }),
      })
        .then((r) => r.json().catch(() => null))
        .then((data) => {
          if (mounted && data && data.state !== 'ready') {
            expireLocally();
          }
        })
        .catch(() => {});
    };

    scheduleIdle();
    window.addEventListener('vaultplayback', handleActivity);
    window.addEventListener('pointerdown', handleActivity);
    window.addEventListener('keydown', handleActivity);

    return () => {
      mounted = false;
      clearTimeout(idleTimer);
      clearTimeout(warningTimer);
      window.removeEventListener('vaultplayback', handleActivity);
      window.removeEventListener('pointerdown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, [state, order]);

  const videoFiles = useMemo(() => files.filter((f) => f.video), [files]);
  const photoFiles = useMemo(() => files.filter((f) => !f.video), [files]);
  const hasBothTypes = videoFiles.length > 0 && photoFiles.length > 0;
  const showVideos = mediaFilter === 'all' || mediaFilter === 'video';
  const showPhotos = mediaFilter === 'all' || mediaFilter === 'photo';
  const showDensityToggle = showPhotos && photoFiles.length >= 6;
  const activeVideo = videoFiles[activeVideoIdx] || videoFiles[0] || null;

  const openLightboxAt = useCallback((idx: number) => {
    setLightboxZoomed(false);
    setLightboxLoaded(false);
    setLightboxIdx(idx);
  }, []);

  const navigateLightbox = useCallback(
    (delta: number) => {
      if (photoFiles.length <= 1) return;
      setLightboxZoomed(false);
      setLightboxLoaded(false);
      setLightboxIdx((prev) => {
        if (prev === null) return 0;
        return (prev + delta + photoFiles.length) % photoFiles.length;
      });
    },
    [photoFiles.length]
  );

  // Navegação por teclado para o Lightbox
  useEffect(() => {
    if (lightboxIdx === null || photoFiles.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxZoomed) setLightboxZoomed(false);
        else setLightboxIdx(null);
      } else if (e.key === 'ArrowRight' && photoFiles.length > 1) {
        navigateLightbox(1);
      } else if (e.key === 'ArrowLeft' && photoFiles.length > 1) {
        navigateLightbox(-1);
      } else if (e.key === '+' || e.key === '=') {
        setLightboxZoomed(true);
      } else if (e.key === '-' || e.key === '0') {
        setLightboxZoomed(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIdx, lightboxZoomed, photoFiles.length, navigateLightbox]);

  // Centraliza a miniatura ativa no filmstrip do Lightbox (quando exibido)
  useEffect(() => {
    if (lightboxIdx === null || !filmstripRef.current) return;
    const activeThumb = filmstripRef.current.querySelector<HTMLElement>(`[data-thumb-idx="${lightboxIdx}"]`);
    activeThumb?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [lightboxIdx]);

  // Encerramento real da visita protegida no servidor (AUD-01)
  const handleCloseVisit = async () => {
    if (closingVisit) return;
    setClosingVisit(true);
    setActionError(null);
    try {
      const response = await fetch(`${getPublicApiUrl()}/api/me/cofre`, {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close', order }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.state !== 'idle') {
        setActionError('Não foi possível encerrar a visualização protegida agora. Tente novamente.');
        return;
      }
      setFiles([]);
      setLightboxIdx(null);
      setLightboxZoomed(false);
      setState('idle');
    } catch {
      setActionError('Falha de conexão ao encerrar a visualização protegida. Tente novamente.');
    } finally {
      setClosingVisit(false);
    }
  };

  const retrySingleMedia = (urlKey: string) => {
    setFailedMediaUrls((prev) => {
      const next = { ...prev };
      delete next[urlKey];
      return next;
    });
    setRetryVersions((prev) => ({ ...prev, [urlKey]: (prev[urlKey] || 0) + 1 }));
  };

  const apiBase = getPublicApiUrl();
  const withRetry = (rawUrl: string, key: string) => {
    const resolved = resolveAssetHref(apiBase, rawUrl);
    const v = retryVersions[key];
    if (!v) return resolved;
    return `${resolved}${resolved.includes('?') ? '&' : '?'}r=${v}`;
  };

  const photoGridClass = useMemo(() => {
    const count = photoFiles.length;
    if (count <= 1) return '';
    if (count === 2) return 'mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6';
    if (count === 3) return 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5';
    if (count <= 5) return 'grid grid-cols-2 gap-3 md:grid-cols-3 sm:gap-5';
    return photoDensity === 'editorial'
      ? 'mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6'
      : 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4';
  }, [photoFiles.length, photoDensity]);

  const currentLightboxPhoto = lightboxIdx !== null ? photoFiles[lightboxIdx] || null : null;
  const singlePhoto = photoFiles.length === 1 ? photoFiles[0] : null;
  const showFilmstrip = photoFiles.length >= 4;

  const lightboxNode =
    typeof document !== 'undefined'
      ? createPortal(
          <AnimatePresence>
            {lightboxIdx !== null && currentLightboxPhoto && (
              <motion.div
                key="vault-lightbox"
                role="dialog"
                aria-modal="true"
                aria-label={`Visualização ampliada: ${currentLightboxPhoto.label}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => {
                  setLightboxZoomed(false);
                  setLightboxIdx(null);
                }}
                className="fixed inset-0 z-[100] flex flex-col justify-between bg-black/95 backdrop-blur-xl select-none"
              >
                {/* Barra superior — mesmo estilo do GalleryLightbox com respiro para safe-area */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="z-50 flex items-center justify-between gap-3 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+1rem)] sm:px-6"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {photoFiles.length > 1 && (
                      <span className="shrink-0 rounded-full border border-white/[0.08] bg-zinc-900/90 px-3.5 py-1.5 font-mono text-[11px] tracking-wider text-zinc-300 tabular-nums">
                        {String(lightboxIdx + 1).padStart(2, '0')}&thinsp;/&thinsp;
                        {String(photoFiles.length).padStart(2, '0')}
                      </span>
                    )}
                    {currentLightboxPhoto.hasCustomLabel && (
                      <span className="truncate text-sm text-zinc-300">{currentLightboxPhoto.label}</span>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLightboxZoomed((z) => !z)}
                      aria-label={lightboxZoomed ? 'Reduzir ampliação' : 'Ampliar detalhes'}
                      title={lightboxZoomed ? 'Reduzir ampliação' : 'Ampliar detalhes'}
                      className="flex size-10 items-center justify-center rounded-full border border-white/[0.1] bg-zinc-900/90 text-zinc-200 transition-colors hover:border-white/25 hover:text-white cursor-pointer touch-manipulation"
                    >
                      {lightboxZoomed ? <ZoomOut className="size-4" /> : <ZoomIn className="size-4" />}
                    </button>

                    {currentLightboxPhoto.download && (
                      <a
                        download
                        href={resolveAssetHref(apiBase, currentLightboxPhoto.download)}
                        className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/[0.1] bg-zinc-900/90 px-3.5 text-xs font-medium text-[#F5EEE9] transition-colors hover:border-white/25 hover:bg-zinc-800"
                      >
                        <Download className="size-3.5 text-[#C97A8D]" />
                        <span className="hidden sm:inline">Baixar</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setLightboxZoomed(false);
                        setLightboxIdx(null);
                      }}
                      aria-label="Fechar visualização (Esc)"
                      className="flex size-10 items-center justify-center rounded-full border border-white/[0.1] bg-zinc-900/90 text-zinc-200 transition-colors hover:border-white/25 hover:bg-zinc-800 hover:text-white cursor-pointer touch-manipulation"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Palco central da foto */}
                <div
                  ref={lightboxRef}
                  tabIndex={-1}
                  onClick={(e) => e.stopPropagation()}
                  onTouchStart={(e) => {
                    if (e.touches.length !== 1) return;
                    touchStartRef.current = {
                      x: e.touches[0].clientX,
                      y: e.touches[0].clientY,
                    };
                  }}
                  onTouchEnd={(e) => {
                    const start = touchStartRef.current;
                    touchStartRef.current = null;
                    if (!start || e.changedTouches.length !== 1) return;
                    const diffX = start.x - e.changedTouches[0].clientX;
                    const diffY = start.y - e.changedTouches[0].clientY;

                    if (Math.abs(diffX) < 12 && Math.abs(diffY) < 12) {
                      const now = Date.now();
                      if (now - lastTapAtRef.current < 280) {
                        setLightboxZoomed((z) => !z);
                        lastTapAtRef.current = 0;
                      } else {
                        lastTapAtRef.current = now;
                      }
                      return;
                    }

                    if (lightboxZoomed) return;

                    if (diffY < -70 && Math.abs(diffY) > Math.abs(diffX) * 1.35) {
                      setLightboxIdx(null);
                    } else if (photoFiles.length > 1 && Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY)) {
                      navigateLightbox(diffX > 0 ? 1 : -1);
                    }
                  }}
                  className={`relative flex flex-1 items-center justify-center px-3 py-2 outline-none sm:px-14 ${
                    lightboxZoomed ? 'overflow-auto' : 'overflow-hidden'
                  }`}
                >
                  {photoFiles.length > 1 && !lightboxZoomed && (
                    <button
                      type="button"
                      onClick={() => navigateLightbox(-1)}
                      aria-label="Foto anterior"
                      className="absolute left-2 top-1/2 z-40 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.1] bg-black/65 text-zinc-200 transition-colors hover:border-white/25 hover:bg-zinc-900/90 hover:text-white cursor-pointer touch-manipulation sm:left-5"
                    >
                      <ChevronLeft className="size-5" />
                    </button>
                  )}

                  <div className="relative flex items-center justify-center">
                    {!lightboxLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="size-6 animate-spin text-zinc-500" />
                      </div>
                    )}
                    <img
                      key={`${currentLightboxPhoto.url}-${retryVersions[currentLightboxPhoto.url] || 0}`}
                      src={withRetry(currentLightboxPhoto.url, currentLightboxPhoto.url)}
                      alt={currentLightboxPhoto.label}
                      onLoad={() => setLightboxLoaded(true)}
                      onDoubleClick={() => setLightboxZoomed((z) => !z)}
                      className={`rounded-xl object-contain transition-opacity duration-300 ${
                        lightboxLoaded ? 'opacity-100' : 'opacity-0'
                      } ${
                        lightboxZoomed
                          ? 'max-h-none max-w-none w-[165vw] sm:w-[130vw] cursor-zoom-out'
                          : `${showFilmstrip ? 'max-h-[74dvh]' : 'max-h-[84dvh]'} max-w-[92vw] sm:max-w-[84vw] cursor-zoom-in`
                      }`}
                    />
                  </div>

                  {photoFiles.length > 1 && !lightboxZoomed && (
                    <button
                      type="button"
                      onClick={() => navigateLightbox(1)}
                      aria-label="Próxima foto"
                      className="absolute right-2 top-1/2 z-40 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.1] bg-black/65 text-zinc-200 transition-colors hover:border-white/25 hover:bg-zinc-900/90 hover:text-white cursor-pointer touch-manipulation sm:right-5"
                    >
                      <ChevronRight className="size-5" />
                    </button>
                  )}
                </div>

                {/* Faixa de miniaturas inferior — exibida SOMENTE em coleções maiores (4+ fotos) */}
                {showFilmstrip ? (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="z-50 border-t border-white/[0.06] bg-black/80 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.85rem)] pt-3"
                  >
                    <div
                      ref={filmstripRef}
                      className="no-scrollbar mx-auto flex max-w-4xl items-center gap-2 overflow-x-auto py-0.5"
                    >
                      {photoFiles.map((f, idx) => {
                        const isActive = idx === lightboxIdx;
                        return (
                          <button
                            key={f.url}
                            type="button"
                            data-thumb-idx={idx}
                            onClick={() => openLightboxAt(idx)}
                            aria-label={`Ver ${f.label}`}
                            aria-current={isActive ? 'true' : undefined}
                            className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border transition-all cursor-pointer touch-manipulation sm:h-14 sm:w-14 ${
                              isActive
                                ? 'border-[#C97A8D] opacity-100 ring-1 ring-[#661C30]'
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
        )
      : null;

  const stateCopy = STATE_COPY[state] || STATE_COPY.unavailable;
  const fallbackPoster = coverUrl ? resolveAssetHref(apiBase, coverUrl) : undefined;

  return (
    <section
      aria-label={title ? `Visualização de ${title}` : 'Visualização de conteúdo protegido'}
      onTimeUpdate={(event) => {
        if (event.target instanceof HTMLVideoElement && !event.target.paused) {
          window.dispatchEvent(new Event('vaultplayback'));
        }
      }}
      className="page-enter-fast space-y-6 sm:space-y-8"
    >
      {/* Alertas pontuais */}
      {actionError && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200"
        >
          <AlertCircle className="size-4 shrink-0 text-rose-400" />
          <span>{actionError}</span>
        </div>
      )}

      {idleWarning && state === 'ready' && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-100"
        >
          <span>Por privacidade, esta visualização será encerrada em breve por inatividade.</span>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('vaultplayback'))}
            className="btn-ghost !min-h-[36px] !px-4 !text-[11px]"
          >
            Continuar visualizando
          </button>
        </div>
      )}

      {/* Barra superior do Modo Foco — limpa, horizontal e sem coluna lateral vazia */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-full pr-3 text-sm text-zinc-400 transition-colors hover:text-[#F5EEE9] cursor-pointer touch-manipulation"
          >
            <ArrowLeft aria-hidden className="size-4" />
            <span>{backLabel}</span>
          </button>

          {state === 'ready' && (
            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-1.5 text-xs text-zinc-400 sm:inline-flex">
                <ShieldCheck aria-hidden className="size-3.5 text-[#C97A8D]" />
                <span>Acesso protegido</span>
              </span>
              <button
                type="button"
                disabled={closingVisit}
                onClick={handleCloseVisit}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.02] px-3.5 text-xs text-zinc-300 transition-colors hover:border-white/25 hover:bg-white/[0.06] hover:text-[#F5EEE9] disabled:opacity-45 cursor-pointer touch-manipulation"
              >
                <Lock aria-hidden className="size-3.5 text-[#C97A8D]" />
                <span>{closingVisit ? 'Encerrando…' : 'Encerrar acesso'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Cabeçalho editorial do conteúdo */}
        <header className="space-y-2.5">
          {contextBadge && (
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C97A8D]">{contextBadge}</p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 space-y-2">
              <h1 className="break-words font-serif text-3xl font-normal leading-[1.1] tracking-tight text-[#F5EEE9] sm:text-4xl">
                {title || 'Conteúdo privado'}
              </h1>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-zinc-400">
                {state === 'ready' && videoFiles.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-zinc-300">
                    <Film aria-hidden className="size-3.5 text-[#C97A8D]" />
                    {videoFiles.length} {videoFiles.length === 1 ? 'vídeo' : 'vídeos'}
                  </span>
                )}
                {state === 'ready' && photoFiles.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-zinc-300">
                    <ImageIcon aria-hidden className="size-3.5 text-[#C97A8D]" />
                    {photoFiles.length} {photoFiles.length === 1 ? 'foto' : 'fotos'}
                  </span>
                )}
                {metadataSlot}
              </div>
            </div>

            {/* Controles contextuais: apenas quando realmente úteis */}
            {state === 'ready' && (hasBothTypes || showDensityToggle) && (
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {hasBothTypes && (
                  <div
                    role="group"
                    aria-label="Filtrar mídias"
                    className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-[#08080c] p-1"
                  >
                    {[
                      { id: 'all', label: `Tudo (${files.length})` },
                      { id: 'video', label: `Vídeos (${videoFiles.length})` },
                      { id: 'photo', label: `Fotos (${photoFiles.length})` },
                    ].map((tab) => {
                      const active = mediaFilter === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setMediaFilter(tab.id as 'all' | 'photo' | 'video')}
                          aria-pressed={active}
                          className={`min-h-[34px] rounded-full px-3.5 text-xs transition-colors cursor-pointer touch-manipulation ${
                            active
                              ? 'bg-[#661C30]/45 font-medium text-[#F5EEE9] border border-[#90364B]/50'
                              : 'text-zinc-400 hover:text-zinc-100 border border-transparent'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {showDensityToggle && (
                  <div
                    role="group"
                    aria-label="Formato da galeria"
                    className="hidden sm:inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-[#08080c] p-1"
                  >
                    <button
                      type="button"
                      onClick={() => setPhotoDensity('grid')}
                      aria-pressed={photoDensity === 'grid'}
                      aria-label="Visualização em grade"
                      title="Visualização em grade"
                      className={`inline-flex size-8 items-center justify-center rounded-full transition-colors cursor-pointer ${
                        photoDensity === 'grid'
                          ? 'bg-white/10 text-[#F5EEE9]'
                          : 'text-zinc-500 hover:text-zinc-200'
                      }`}
                    >
                      <LayoutGrid className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoDensity('editorial')}
                      aria-pressed={photoDensity === 'editorial'}
                      aria-label="Visualização editorial ampla"
                      title="Visualização editorial ampla"
                      className={`inline-flex size-8 items-center justify-center rounded-full transition-colors cursor-pointer ${
                        photoDensity === 'editorial'
                          ? 'bg-white/10 text-[#F5EEE9]'
                          : 'text-zinc-500 hover:text-zinc-200'
                      }`}
                    >
                      <Rows2 className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        <div className="section-divider" />
      </div>

      {/* Estados não-prontos (carregamento, confirmação de navegador, inatividade, erro) */}
      {state !== 'ready' && (
        <div className="mx-auto max-w-xl rounded-[24px] border border-white/[0.08] bg-[#08080c] p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[#7A293D]/40 bg-[#431322]/30 text-[#C97A8D]">
              {state === 'loading' ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Lock className="size-5" />
              )}
            </div>
            <div className="space-y-1.5">
              <h2 className="font-serif text-xl font-normal text-[#F5EEE9]">{stateCopy.heading}</h2>
              <p role="status" className="text-sm leading-relaxed text-zinc-400">
                {state === 'loading'
                  ? lastAction === 'request'
                    ? 'Enviando e-mail de confirmação para o endereço vinculado ao pedido…'
                    : lastAction === 'confirm'
                      ? 'Autorizando este navegador com segurança…'
                      : stateCopy.body
                  : state === 'unavailable' && unavailableReason === 'email_dispatch'
                    ? 'Não conseguimos enviar o e-mail de confirmação agora. Aguarde alguns instantes e tente novamente.'
                    : stateCopy.body}
              </p>
            </div>
          </div>

          {['approve', 'confirm', 'sent', 'expired'].includes(state) && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  void run(
                    state === 'approve' ? 'confirm' : 'request',
                    order,
                    state === 'approve' ? confirmToken : ''
                  )
                }
                className="btn-primary !min-h-[46px] !px-6"
              >
                {state === 'approve'
                  ? 'Autorizar este navegador'
                  : state === 'sent'
                    ? 'Reenviar confirmação'
                    : 'Receber confirmação por e-mail'}
              </button>
            </div>
          )}

          {state === 'wrongBrowser' && (
            <div className="flex flex-wrap items-center gap-3">
              {confirmToken && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const link = new URL('/conta', window.location.origin);
                      link.hash = new URLSearchParams({ order, confirm: confirmToken }).toString();
                      await navigator.clipboard.writeText(link.href);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 3000);
                    } catch {}
                  }}
                  className="btn-primary !min-h-[44px] !px-5"
                >
                  {copiedLink ? <Check className="size-4" /> : <Copy className="size-4" />}
                  <span>{copiedLink ? 'Link copiado' : 'Copiar link para o navegador'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => void run('request', order)}
                className="btn-ghost !min-h-[44px] !px-5"
              >
                Solicitar nova confirmação aqui
              </button>
            </div>
          )}

          {state === 'unavailable' && (
            <button
              type="button"
              onClick={() => void run(lastAction || 'open', order, lastAction === 'confirm' ? confirmToken : '')}
              className="btn-primary !min-h-[44px] !px-6"
            >
              <RefreshCw className="size-4" />
              <span>Tentar novamente</span>
            </button>
          )}

          {state === 'idle' && (
            <button
              type="button"
              onClick={() => void run('open', order)}
              className="btn-primary !min-h-[44px] !px-6"
            >
              <span>Reabrir conteúdo</span>
            </button>
          )}
        </div>
      )}

      {/* Conteúdo liberado — layout adaptativo por quantidade e tipo */}
      {state === 'ready' && (
        <div className="space-y-10 sm:space-y-12">
          {files.length === 0 ? (
            <div className="mx-auto max-w-xl rounded-[24px] border border-white/[0.08] bg-[#08080c] p-10 text-center">
              <p className="font-serif text-lg text-[#F5EEE9]">Arquivos em preparação</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Os arquivos deste conteúdo ainda não estão disponíveis. Caso precise de auxílio, fale com o atendimento.
              </p>
            </div>
          ) : (
            <>
              {/* SEÇÃO DE VÍDEOS: 1 vídeo centralizado OU player principal + lista de reprodução */}
              {showVideos && videoFiles.length > 0 && activeVideo && (
                <div className="space-y-4">
                  {hasBothTypes && mediaFilter === 'all' && (
                    <h2 className="font-serif text-xl font-normal text-[#F5EEE9]">
                      {videoFiles.length === 1 ? 'Vídeo' : 'Vídeos'}
                    </h2>
                  )}

                  {videoFiles.length === 1 ? (
                    <div className="mx-auto max-w-4xl space-y-3">
                      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#08080c]">
                        {failedMediaUrls[activeVideo.url] ? (
                          <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-zinc-950 p-8 text-center">
                            <p className="text-sm text-zinc-400">
                              Não foi possível reproduzir este vídeo agora. Sua visualização pode ter expirado.
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => retrySingleMedia(activeVideo.url)}
                                className="btn-ghost !min-h-[38px] !px-4 !text-[11px]"
                              >
                                <RefreshCw className="size-3.5" />
                                Tentar novamente
                              </button>
                              <button
                                type="button"
                                onClick={() => void run('open', order)}
                                className="btn-primary !min-h-[38px] !px-4 !text-[11px]"
                              >
                                Recarregar acesso
                              </button>
                            </div>
                          </div>
                        ) : (
                          <video
                            key={`${activeVideo.url}-${retryVersions[activeVideo.url] || 0}`}
                            controls
                            playsInline
                            preload="metadata"
                            poster={
                              activeVideo.posterUrl
                                ? resolveAssetHref(apiBase, activeVideo.posterUrl)
                                : fallbackPoster
                            }
                            controlsList={activeVideo.download ? undefined : 'nodownload'}
                            onError={() => setFailedMediaUrls((prev) => ({ ...prev, [activeVideo.url]: true }))}
                            className="aspect-video max-h-[74svh] w-full bg-black"
                            src={withRetry(activeVideo.url, activeVideo.url)}
                          />
                        )}
                      </div>

                      {(activeVideo.hasCustomLabel || activeVideo.duration || activeVideo.download) && (
                        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                          <div className="flex min-w-0 items-center gap-2.5 text-sm text-zinc-300">
                            {activeVideo.hasCustomLabel && (
                              <span className="truncate font-medium text-[#F5EEE9]">{activeVideo.label}</span>
                            )}
                            {activeVideo.duration && (
                              <span className="text-xs text-zinc-500 tabular-nums">{activeVideo.duration}</span>
                            )}
                          </div>
                          {activeVideo.download && (
                            <a
                              download
                              href={resolveAssetHref(apiBase, activeVideo.download)}
                              className="btn-ghost !min-h-[38px] !px-4 !text-[11px]"
                            >
                              <Download className="size-3.5 text-[#C97A8D]" />
                              <span>Baixar vídeo</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Múltiplos vídeos: 1 player principal + lista organizada de reprodução */
                    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
                      <div className="min-w-0 space-y-3">
                        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#08080c]">
                          {failedMediaUrls[activeVideo.url] ? (
                            <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-zinc-950 p-8 text-center">
                              <p className="text-sm text-zinc-400">
                                Não foi possível reproduzir este vídeo agora.
                              </p>
                              <div className="flex flex-wrap justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => retrySingleMedia(activeVideo.url)}
                                  className="btn-ghost !min-h-[38px] !px-4 !text-[11px]"
                                >
                                  <RefreshCw className="size-3.5" />
                                  Tentar novamente
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void run('open', order)}
                                  className="btn-primary !min-h-[38px] !px-4 !text-[11px]"
                                >
                                  Recarregar acesso
                                </button>
                              </div>
                            </div>
                          ) : (
                            <video
                              key={`${activeVideo.url}-${retryVersions[activeVideo.url] || 0}`}
                              controls
                              playsInline
                              preload="metadata"
                              poster={
                                activeVideo.posterUrl
                                  ? resolveAssetHref(apiBase, activeVideo.posterUrl)
                                  : fallbackPoster
                              }
                              controlsList={activeVideo.download ? undefined : 'nodownload'}
                              onError={() => setFailedMediaUrls((prev) => ({ ...prev, [activeVideo.url]: true }))}
                              className="aspect-video max-h-[70svh] w-full bg-black"
                              src={withRetry(activeVideo.url, activeVideo.url)}
                            />
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[#F5EEE9]">{activeVideo.label}</p>
                            <p className="text-xs text-zinc-500">
                              Vídeo {activeVideoIdx + 1} de {videoFiles.length}
                              {activeVideo.duration ? ` · ${activeVideo.duration}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {activeVideoIdx < videoFiles.length - 1 && (
                              <button
                                type="button"
                                onClick={() => setActiveVideoIdx((i) => Math.min(videoFiles.length - 1, i + 1))}
                                className="btn-ghost !min-h-[38px] !px-4 !text-[11px]"
                              >
                                <span>Próximo</span>
                                <ChevronRight className="size-3.5" />
                              </button>
                            )}
                            {activeVideo.download && (
                              <a
                                download
                                href={resolveAssetHref(apiBase, activeVideo.download)}
                                className="btn-ghost !min-h-[38px] !px-4 !text-[11px]"
                              >
                                <Download className="size-3.5 text-[#C97A8D]" />
                                <span>Baixar</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Lista de reprodução discreta */}
                      <aside
                        aria-label="Lista de vídeos"
                        className="rounded-2xl border border-white/[0.08] bg-[#08080c] p-3"
                      >
                        <p className="px-2 pb-2.5 text-xs font-medium text-zinc-400">
                          Lista de reprodução · {videoFiles.length} vídeos
                        </p>
                        <div className="space-y-1.5">
                          {videoFiles.map((v, idx) => {
                            const isCurrent = idx === activeVideoIdx;
                            const thumbSrc = v.posterUrl ? resolveAssetHref(apiBase, v.posterUrl) : fallbackPoster;
                            return (
                              <button
                                key={v.url}
                                type="button"
                                onClick={() => setActiveVideoIdx(idx)}
                                aria-current={isCurrent ? 'true' : undefined}
                                className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors cursor-pointer touch-manipulation ${
                                  isCurrent
                                    ? 'border-[#7A293D]/60 bg-[#661C30]/20 text-[#F5EEE9]'
                                    : 'border-transparent bg-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                                }`}
                              >
                                <div className="relative flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-950 border border-white/[0.06]">
                                  {thumbSrc ? (
                                    <img
                                      src={thumbSrc}
                                      alt=""
                                      loading="lazy"
                                      decoding="async"
                                      className="size-full object-cover opacity-75"
                                    />
                                  ) : (
                                    <Film className="size-4 text-zinc-600" />
                                  )}
                                  <span
                                    aria-hidden="true"
                                    className="absolute inset-0 flex items-center justify-center bg-black/35"
                                  >
                                    <Play
                                      className={`size-3.5 ${
                                        isCurrent ? 'text-[#C97A8D] fill-[#C97A8D]' : 'text-white/80'
                                      }`}
                                    />
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-medium">{v.label}</p>
                                  <p className="mt-0.5 text-[11px] text-zinc-500">
                                    {isCurrent ? 'Em reprodução' : v.duration || `Vídeo ${idx + 1}`}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </aside>
                    </div>
                  )}
                </div>
              )}

              {showVideos && showPhotos && hasBothTypes && mediaFilter === 'all' && (
                <div className="section-divider" />
              )}

              {/* SEÇÃO DE FOTOS: 1 foto centralizada na proporção natural OU grade editorial limpa */}
              {showPhotos && photoFiles.length > 0 && (
                <div className="space-y-4">
                  {hasBothTypes && mediaFilter === 'all' && (
                    <h2 className="font-serif text-xl font-normal text-[#F5EEE9]">
                      {photoFiles.length === 1 ? 'Fotografia' : 'Fotografias'}
                    </h2>
                  )}

                  {singlePhoto ? (
                    /* Fotografia única: centralizada, proporção natural preservada, sem cortes nem poluição */
                    <figure className="mx-auto flex max-w-4xl flex-col items-center space-y-4">
                      {failedMediaUrls[singlePhoto.url] ? (
                        <div className="flex min-h-[20rem] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.08] bg-[#08080c] p-8 text-center">
                          <p className="text-sm text-zinc-400">Não foi possível carregar esta fotografia agora.</p>
                          <div className="flex flex-wrap justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => retrySingleMedia(singlePhoto.url)}
                              className="btn-ghost !min-h-[38px] !px-4 !text-[11px]"
                            >
                              <RefreshCw className="size-3.5" />
                              Tentar novamente
                            </button>
                            <button
                              type="button"
                              onClick={() => void run('open', order)}
                              className="btn-primary !min-h-[38px] !px-4 !text-[11px]"
                            >
                              Recarregar acesso
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openLightboxAt(0)}
                          aria-label={`Ampliar ${singlePhoto.label}`}
                          className="group relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-white/[0.02] cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#90364B]"
                        >
                          {!loadedMedia[singlePhoto.url] && (
                            <div className="aspect-[4/5] w-full max-w-lg rounded-2xl bg-white/[0.03]" />
                          )}
                          <img
                            src={withRetry(singlePhoto.url, singlePhoto.url)}
                            alt={singlePhoto.label}
                            loading="eager"
                            decoding="async"
                            onLoad={() => setLoadedMedia((prev) => ({ ...prev, [singlePhoto.url]: true }))}
                            onError={() => setFailedMediaUrls((prev) => ({ ...prev, [singlePhoto.url]: true }))}
                            className={`mx-auto max-h-[78svh] w-auto max-w-full rounded-2xl object-contain transition-opacity duration-300 select-none ${
                              loadedMedia[singlePhoto.url] ? 'opacity-100' : 'absolute inset-0 opacity-0'
                            }`}
                          />
                        </button>
                      )}

                      {/* Ações discretas fora da imagem — acessíveis no mobile e por teclado */}
                      {!failedMediaUrls[singlePhoto.url] && (
                        <figcaption className="flex flex-wrap items-center justify-center gap-3">
                          {singlePhoto.hasCustomLabel && (
                            <span className="text-sm text-zinc-400">{singlePhoto.label}</span>
                          )}
                          <button
                            type="button"
                            onClick={() => openLightboxAt(0)}
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.02] px-4 text-xs text-zinc-300 transition-colors hover:border-white/25 hover:bg-white/[0.06] hover:text-[#F5EEE9] cursor-pointer touch-manipulation"
                          >
                            <Maximize2 className="size-3.5 text-[#C97A8D]" />
                            <span>Visualizar ampliada</span>
                          </button>
                          {singlePhoto.download && (
                            <a
                              download
                              href={resolveAssetHref(apiBase, singlePhoto.download)}
                              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.02] px-4 text-xs text-zinc-300 transition-colors hover:border-white/25 hover:bg-white/[0.06] hover:text-[#F5EEE9]"
                            >
                              <Download className="size-3.5 text-[#C97A8D]" />
                              <span>Baixar original</span>
                            </a>
                          )}
                        </figcaption>
                      )}
                    </figure>
                  ) : (
                    /* Coleção de 2+ fotos: grade editorial limpa e progressiva */
                    <div className={photoGridClass}>
                      {photoFiles.map((f, idx) => {
                        const gridSrc = withRetry(f.previewUrl || f.url, f.url);
                        const isLoaded = Boolean(loadedMedia[f.url]);
                        const isEditorialWide = photoFiles.length === 2 || photoDensity === 'editorial';

                        return (
                          <figure key={f.url} className="group flex flex-col space-y-2">
                            <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#08080c] transition-colors duration-300 group-hover:border-white/[0.16]">
                              {failedMediaUrls[f.url] ? (
                                <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 bg-zinc-950 p-5 text-center">
                                  <p className="text-xs text-zinc-400">Falha ao carregar imagem.</p>
                                  <button
                                    type="button"
                                    onClick={() => retrySingleMedia(f.url)}
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
                                    onClick={() => openLightboxAt(idx)}
                                    aria-label={`Ampliar ${f.label}`}
                                    className={`relative block w-full overflow-hidden bg-white/[0.02] cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#90364B] ${
                                      isEditorialWide ? 'aspect-[4/5]' : 'aspect-[4/5]'
                                    }`}
                                  >
                                    <img
                                      src={gridSrc}
                                      alt={f.label}
                                      loading={idx < 4 ? 'eager' : 'lazy'}
                                      decoding="async"
                                      onLoad={() => setLoadedMedia((prev) => ({ ...prev, [f.url]: true }))}
                                      onError={() => setFailedMediaUrls((prev) => ({ ...prev, [f.url]: true }))}
                                      className={`size-full object-cover object-center transition-all duration-500 select-none motion-safe:group-hover:scale-[1.02] ${
                                        isLoaded ? 'opacity-100' : 'opacity-0'
                                      }`}
                                    />
                                    {/* Affordance sutil apenas no hover/focus do desktop — nunca polui a foto em repouso */}
                                    <span
                                      aria-hidden="true"
                                      className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/75 via-black/25 to-transparent px-3.5 pb-3 pt-8 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
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
                                      className="absolute right-2.5 top-2.5 z-10 inline-flex size-9 items-center justify-center rounded-full border border-white/15 bg-black/65 text-[#F5EEE9] opacity-100 backdrop-blur-sm transition-all hover:border-white/30 hover:bg-black/85 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                                    >
                                      <Download className="size-3.5 text-[#C97A8D]" />
                                    </a>
                                  )}
                                </>
                              )}
                            </div>

                            {f.hasCustomLabel && (
                              <figcaption className="truncate px-1 text-xs text-zinc-400">
                                {f.label}
                              </figcaption>
                            )}
                          </figure>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {lightboxNode}
    </section>
  );
}
