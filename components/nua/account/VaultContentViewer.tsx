'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  Film,
  Image as ImageIcon,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { getPublicApiUrl } from '@/lib/contentStore';
import { resolveAssetHref, VaultFileItem, VaultMetaItem } from './vault/types';
import { VaultVideoPlayer } from './vault/VaultVideoPlayer';
import { VaultPhotoStage } from './vault/VaultPhotoStage';
import { VaultLightbox } from './vault/VaultLightbox';

export type { VaultFileItem, VaultMetaItem };

export interface VaultContentViewerProps {
  order: string;
  initialTitle?: string;
  initialCoverUrl?: string | null;
  initialPhotosCount?: number;
  initialVideosCount?: number;
  initialConfirmToken?: string;
  backLabel: string;
  contextBadge?: string;
  metaItems?: VaultMetaItem[];
  onBack: () => void;
  onAuthenticatedByConfirm?: () => void;
}

const STATE_COPY: Record<string, { heading: string; body: string }> = {
  confirm: {
    heading: 'Confirme este navegador',
    body: 'Para proteger sua compra, enviamos um link único de confirmação para o e-mail vinculado ao pedido. Abra a mensagem neste mesmo navegador para liberar o acesso.',
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
    body: 'Este link precisa ser aberto no mesmo navegador onde o acesso foi solicitado. Se abriu dentro do app de e-mail, copie o link e abra no navegador.',
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

export function VaultContentViewer({
  order,
  initialTitle = '',
  initialCoverUrl = null,
  initialPhotosCount = 0,
  initialVideosCount = 0,
  initialConfirmToken = '',
  backLabel,
  contextBadge,
  metaItems = [],
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

  const [mediaFilter, setMediaFilter] = useState<'all' | 'photo' | 'video'>('all');
  const [failedMediaUrls, setFailedMediaUrls] = useState<Record<string, true>>({});
  const [retryVersions, setRetryVersions] = useState<Record<string, number>>({});
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [idleWarning, setIdleWarning] = useState(false);

  const requestControllerRef = useRef<AbortController | null>(null);
  const onConfirmedRef = useRef(onAuthenticatedByConfirm);
  useEffect(() => {
    onConfirmedRef.current = onAuthenticatedByConfirm;
  }, [onAuthenticatedByConfirm]);

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
          setRetryVersions({});
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

  // Carrega automaticamente quando o pedido ou token mudar
  useEffect(() => {
    setTitle(initialTitle);
    setCoverUrl(initialCoverUrl);
    setFiles([]);
    setMediaFilter('all');
    setLightboxIdx(null);
    setFailedMediaUrls({});
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
      setState('idle');
    } catch {
      setActionError('Falha de conexão ao encerrar a visualização protegida. Tente novamente.');
    } finally {
      setClosingVisit(false);
    }
  };

  const markMediaFailed = useCallback((url: string) => {
    setFailedMediaUrls((prev) => ({ ...prev, [url]: true }));
  }, []);

  const retrySingleMedia = useCallback((url: string) => {
    setFailedMediaUrls((prev) => {
      const next = { ...prev };
      delete next[url];
      return next;
    });
    setRetryVersions((prev) => ({ ...prev, [url]: (prev[url] || 0) + 1 }));
  }, []);

  const reloadAccess = useCallback(() => {
    void run('open', order);
  }, [run, order]);

  const videoFiles = useMemo(() => files.filter((f) => f.video), [files]);
  const photoFiles = useMemo(() => files.filter((f) => !f.video), [files]);
  const hasBothTypes = videoFiles.length > 0 && photoFiles.length > 0;
  const showVideos = mediaFilter === 'all' || mediaFilter === 'video';
  const showPhotos = mediaFilter === 'all' || mediaFilter === 'photo';

  const displayVideosCount = state === 'ready' ? videoFiles.length : initialVideosCount;
  const displayPhotosCount = state === 'ready' ? photoFiles.length : initialPhotosCount;

  const headerMetaSegments = useMemo(() => {
    const parts: React.ReactNode[] = [];
    if (displayVideosCount > 0) {
      parts.push(
        <span key="vid" className="inline-flex items-center gap-1.5 text-zinc-300">
          <Film aria-hidden className="size-3.5 text-[#90364B]" />
          {displayVideosCount} {displayVideosCount === 1 ? 'vídeo' : 'vídeos'}
        </span>
      );
    }
    if (displayPhotosCount > 0) {
      parts.push(
        <span key="pho" className="inline-flex items-center gap-1.5 text-zinc-300">
          <ImageIcon aria-hidden className="size-3.5 text-[#90364B]" />
          {displayPhotosCount} {displayPhotosCount === 1 ? 'foto' : 'fotos'}
        </span>
      );
    }
    for (const item of metaItems) {
      parts.push(
        <span key={item.label} className="text-zinc-400">
          {item.value}
        </span>
      );
    }
    return parts;
  }, [displayVideosCount, displayPhotosCount, metaItems]);

  const dockDetails = useMemo<VaultMetaItem[]>(() => {
    const list: VaultMetaItem[] = [...metaItems];
    list.push({ label: 'Proteção', value: 'Acesso privado' });
    return list;
  }, [metaItems]);

  const apiBase = getPublicApiUrl();
  const fallbackPoster = coverUrl ? resolveAssetHref(apiBase, coverUrl) : undefined;
  const stateCopy = STATE_COPY[state] || STATE_COPY.unavailable;

  return (
    <section
      aria-label={title ? `Visualização de ${title}` : 'Visualização de conteúdo protegido'}
      className="page-enter-fast space-y-6"
    >
      {/* Alertas pontuais */}
      {actionError && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-2xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200"
        >
          <AlertCircle className="size-4 shrink-0 text-red-400" />
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

      {/* Barra única e enxuta do Estúdio — sem ponto órfão nem excesso vertical */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-[40px] items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-[#F5EEE9] cursor-pointer touch-manipulation"
          >
            <ArrowLeft aria-hidden className="size-4" />
            <span>{backLabel}</span>
          </button>

          {state === 'ready' && (
            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-1.5 text-xs text-zinc-400 sm:inline-flex">
                <ShieldCheck aria-hidden className="size-3.5 text-[#90364B]" />
                <span>Acesso protegido</span>
              </span>
              <button
                type="button"
                disabled={closingVisit}
                onClick={handleCloseVisit}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.02] px-3.5 text-xs text-zinc-300 transition-colors hover:border-white/25 hover:bg-white/[0.06] hover:text-[#F5EEE9] disabled:opacity-45 cursor-pointer touch-manipulation"
              >
                <Lock aria-hidden className="size-3.5 text-[#90364B]" />
                <span>{closingVisit ? 'Encerrando…' : 'Encerrar'}</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            {contextBadge && (
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#F5EEE9]/80">{contextBadge}</p>
            )}
            <h1 className="break-words font-serif text-3xl font-normal leading-[1.1] tracking-tight text-[#F5EEE9] sm:text-4xl">
              {title || 'Conteúdo privado'}
            </h1>

            {headerMetaSegments.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
                {headerMetaSegments.map((seg, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <span aria-hidden className="text-zinc-600">
                        ·
                      </span>
                    )}
                    {seg}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          {/* Seletor contextual Tudo / Vídeos / Fotos — exibido SOMENTE em conteúdos mistos */}
          {state === 'ready' && hasBothTypes && (
            <div
              role="group"
              aria-label="Filtrar mídias"
              className="inline-flex shrink-0 items-center gap-1 self-start rounded-full border border-white/[0.08] bg-[#08080c] p-1 sm:self-end"
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
                        ? 'border border-[#90364B]/50 bg-[#661C30]/40 font-medium text-[#F5EEE9]'
                        : 'border border-transparent text-zinc-400 hover:text-zinc-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="section-divider" />
      </header>

      {/* Estado de carregamento calmo no próprio palco — sem flash feio de card de alerta */}
      {state === 'loading' && (
        <div
          role="status"
          aria-live="polite"
          className="mx-auto flex min-h-[24rem] max-w-5xl flex-col items-center justify-center gap-3 rounded-[24px] border border-white/[0.06] bg-[#060609] p-8 text-center"
        >
          <Loader2 className="size-6 animate-spin text-[#90364B]" />
          <p className="text-xs tracking-wide text-zinc-400">
            {lastAction === 'request'
              ? 'Enviando e-mail de confirmação…'
              : lastAction === 'confirm'
                ? 'Autorizando este navegador…'
                : 'Abrindo seu conteúdo…'}
          </p>
        </div>
      )}

      {/* Estados de proteção / exceção */}
      {state !== 'ready' && state !== 'loading' && (
        <div className="mx-auto max-w-xl space-y-6 rounded-[24px] border border-white/[0.08] bg-[#08080c] p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[#7A293D]/40 bg-[#431322]/30 text-[#F5EEE9]">
              <Lock className="size-5" />
            </div>
            <div className="space-y-1.5">
              <h2 className="font-serif text-xl font-normal text-[#F5EEE9]">{stateCopy.heading}</h2>
              <p role="status" className="text-sm leading-relaxed text-zinc-400">
                {state === 'unavailable' && unavailableReason === 'email_dispatch'
                  ? 'Não conseguimos enviar o e-mail de confirmação agora. Aguarde alguns instantes e tente novamente.'
                  : stateCopy.body}
              </p>
            </div>
          </div>

          {['approve', 'confirm', 'sent', 'expired'].includes(state) && (
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

      {/* Conteúdo liberado — Estúdio Privado completo */}
      {state === 'ready' && (
        <div className="space-y-10">
          {files.length === 0 ? (
            <div className="mx-auto max-w-xl rounded-[24px] border border-white/[0.08] bg-[#08080c] p-10 text-center">
              <p className="font-serif text-lg text-[#F5EEE9]">Arquivos em preparação</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Os arquivos deste conteúdo ainda não estão disponíveis. Caso precise de auxílio, fale com o atendimento.
              </p>
            </div>
          ) : (
            <>
              {showVideos && videoFiles.length > 0 && (
                <div className="space-y-4">
                  {hasBothTypes && mediaFilter === 'all' && (
                    <h2 className="font-serif text-xl font-normal text-[#F5EEE9]">
                      {videoFiles.length === 1 ? 'Vídeo' : 'Vídeos'}
                    </h2>
                  )}
                  <VaultVideoPlayer
                    videos={videoFiles}
                    apiBase={apiBase}
                    fallbackPoster={fallbackPoster}
                    failedMediaUrls={failedMediaUrls}
                    retryVersions={retryVersions}
                    onMarkFailed={markMediaFailed}
                    onRetryMedia={retrySingleMedia}
                    onReloadAccess={reloadAccess}
                  />
                </div>
              )}

              {showVideos && showPhotos && hasBothTypes && mediaFilter === 'all' && (
                <div className="section-divider" />
              )}

              {showPhotos && photoFiles.length > 0 && (
                <div className="space-y-4">
                  {hasBothTypes && mediaFilter === 'all' && (
                    <h2 className="font-serif text-xl font-normal text-[#F5EEE9]">
                      {photoFiles.length === 1 ? 'Fotografia' : 'Fotografias'}
                    </h2>
                  )}
                  <VaultPhotoStage
                    photos={photoFiles}
                    apiBase={apiBase}
                    metaItems={dockDetails}
                    failedMediaUrls={failedMediaUrls}
                    retryVersions={retryVersions}
                    onMarkFailed={markMediaFailed}
                    onRetryMedia={retrySingleMedia}
                    onReloadAccess={reloadAccess}
                    onOpenFullscreen={(idx) => setLightboxIdx(idx)}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      <VaultLightbox
        photos={photoFiles}
        index={lightboxIdx}
        apiBase={apiBase}
        retryVersions={retryVersions}
        onChangeIndex={setLightboxIdx}
      />
    </section>
  );
}
