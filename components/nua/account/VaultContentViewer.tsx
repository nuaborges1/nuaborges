'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  Lock,
  Maximize2,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { getPublicApiUrl } from '@/lib/contentStore';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useModalFocus } from '@/hooks/useModalFocus';

export interface VaultFileItem {
  label: string;
  url: string;
  video: boolean;
  download?: string;
}

export interface VaultContentViewerProps {
  order: string;
  initialTitle?: string;
  initialConfirmToken?: string;
  backLabel: string;
  contextBadge?: string;
  metadataSlot?: React.ReactNode;
  onBack: () => void;
  onAuthenticatedByConfirm?: () => void;
}

const MESSAGES: Record<string, string> = {
  loading: 'Carregando seu conteúdo protegido…',
  confirm: 'Para proteger sua compra, confirme este navegador pelo e-mail vinculado ao pedido.',
  approve: 'Confirme que foi você quem solicitou acesso aos arquivos neste navegador.',
  sent: 'Enviamos um link de confirmação para o seu e-mail. Abra a mensagem neste mesmo navegador para liberar a visualização.',
  expired: 'Essa confirmação expirou ou já foi utilizada. Você pode solicitar uma nova abaixo.',
  wrongBrowser: 'Abra o link no mesmo navegador em que você pediu acesso. Se abriu dentro do app de e-mail, use a opção "Abrir no navegador".',
  wait: 'Você já solicitou algumas confirmações recentemente. Aguarde cerca de dez minutos para tentar novamente.',
  unavailable: 'Não conseguimos carregar este conteúdo agora. Tente novamente em instantes.',
  missing: 'Não foi possível identificar o pedido selecionado.',
  idle: 'Sua visualização protegida foi encerrada por inatividade ou por sua solicitação. Reabra abaixo quando quiser continuar.',
};

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const IDLE_WARNING_MS = 13 * 60 * 1000;
const ACTIVITY_PING_INTERVAL_MS = 60 * 1000;

export function VaultContentViewer({
  order,
  initialTitle = '',
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
  const [confirmToken, setConfirmToken] = useState<string>(initialConfirmToken);
  const [lastAction, setLastAction] = useState<string>(initialConfirmToken ? 'confirm' : 'open');
  const [unavailableReason, setUnavailableReason] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [closingVisit, setClosingVisit] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<'all' | 'photo' | 'video'>('all');
  const [failedMediaUrls, setFailedMediaUrls] = useState<Record<string, true>>({});
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [idleWarning, setIdleWarning] = useState(false);

  const requestControllerRef = useRef<AbortController | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number | null>(null);
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
          setConfirmToken('');
          setFailedMediaUrls({});
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
        setState(MESSAGES[data.state] ? data.state : 'unavailable');
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
    setFiles([]);
    setMediaFilter('all');
    setLightboxIdx(null);
    setFailedMediaUrls({});
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
  }, [order, initialTitle, initialConfirmToken, run]);

  // Monitoramento real de atividade e expiração de inatividade (15 min) — sem polling cego
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

  const videoFiles = useMemo(() => files.filter((f) => f.video), [files]);
  const photoFiles = useMemo(() => files.filter((f) => !f.video), [files]);
  const showVideos = mediaFilter === 'all' || mediaFilter === 'video';
  const showPhotos = mediaFilter === 'all' || mediaFilter === 'photo';

  // Navegação por teclado exclusivamente para o Lightbox de ampliação de foto
  useEffect(() => {
    if (lightboxIdx === null || photoFiles.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIdx(null);
      } else if (e.key === 'ArrowRight') {
        setLightboxIdx((prev) => (prev === null ? 0 : (prev + 1) % photoFiles.length));
      } else if (e.key === 'ArrowLeft') {
        setLightboxIdx((prev) => (prev === null ? 0 : (prev - 1 + photoFiles.length) % photoFiles.length));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIdx, photoFiles.length]);

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
        setActionError('Não foi possível encerrar a visita protegida no servidor. Tente novamente.');
        return;
      }
      setFiles([]);
      setLightboxIdx(null);
      setState('idle');
    } catch {
      setActionError('Falha de conexão ao encerrar a visita protegida. Tente novamente.');
    } finally {
      setClosingVisit(false);
    }
  };

  const apiBase = getPublicApiUrl();

  const photoGridClass = photoFiles.length > 1 ? 'grid grid-cols-2 gap-3 sm:gap-4' : '';

  const lightboxNode =
    lightboxIdx !== null && photoFiles[lightboxIdx] && typeof document !== 'undefined'
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Visualização ampliada: ${photoFiles[lightboxIdx].label}`}
            onClick={() => setLightboxIdx(null)}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md"
          >
            <div
              ref={lightboxRef}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => {
                touchStartXRef.current = e.touches[0]?.clientX ?? null;
              }}
              onTouchEnd={(e) => {
                const startX = touchStartXRef.current;
                touchStartXRef.current = null;
                if (startX === null || photoFiles.length <= 1) return;
                const endX = e.changedTouches[0]?.clientX ?? startX;
                const delta = endX - startX;
                if (Math.abs(delta) < 40) return;
                setLightboxIdx((i) => {
                  if (i === null) return 0;
                  return delta < 0 ? (i + 1) % photoFiles.length : (i - 1 + photoFiles.length) % photoFiles.length;
                });
              }}
              className="relative flex max-h-[92dvh] w-full max-w-5xl flex-col items-center"
            >
              <div className="mb-3 flex w-full items-center justify-between gap-3 text-xs text-zinc-300">
                <span className="truncate font-mono">
                  {photoFiles[lightboxIdx].label} · {lightboxIdx + 1} / {photoFiles.length}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {photoFiles[lightboxIdx].download && (
                    <a
                      download
                      href={`${apiBase}${photoFiles[lightboxIdx].download}`}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 text-xs text-white transition-colors hover:bg-white/15"
                    >
                      <Download className="h-3.5 w-3.5 text-[#C97A8D]" />
                      <span>Baixar</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setLightboxIdx(null)}
                    aria-label="Fechar ampliação"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white transition-colors hover:bg-white/15 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="relative flex w-full items-center justify-center">
                <img
                  src={`${apiBase}${photoFiles[lightboxIdx].url}`}
                  alt={photoFiles[lightboxIdx].label}
                  className="max-h-[82dvh] w-auto rounded-2xl object-contain select-none"
                />
                {photoFiles.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxIdx((i) => (i === null ? 0 : (i - 1 + photoFiles.length) % photoFiles.length))
                      }
                      aria-label="Foto anterior"
                      className="absolute left-2 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/75 text-white transition-colors hover:bg-black cursor-pointer"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxIdx((i) => (i === null ? 0 : (i + 1) % photoFiles.length))
                      }
                      aria-label="Próxima foto"
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/75 text-white transition-colors hover:bg-black cursor-pointer"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <section
      aria-label={title ? `Visualização de ${title}` : 'Visualização de conteúdo protegido'}
      onTimeUpdate={(event) => {
        if (event.target instanceof HTMLVideoElement && !event.target.paused) {
          window.dispatchEvent(new Event('vaultplayback'));
        }
      }}
      className="space-y-4"
    >
      {actionError && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-950/35 px-4 py-3 text-xs text-rose-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{actionError}</span>
        </div>
      )}

      {idleWarning && state === 'ready' && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-950/25 px-4 py-2.5 text-xs text-amber-100"
        >
          <span>Sua visualização protegida será encerrada em breve por inatividade.</span>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('vaultplayback'))}
            className="min-h-[32px] rounded-full border border-amber-400/40 bg-amber-500/15 px-3.5 text-[11px] font-semibold text-amber-100 hover:bg-amber-500/25 cursor-pointer"
          >
            Continuar assistindo
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg pr-3 text-sm font-semibold text-zinc-300 transition-colors hover:text-white"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {backLabel}
      </button>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-8">
        <header className="min-w-0 border-b border-white/[0.08] pb-4 lg:border-b-0 lg:py-4">
          {contextBadge && <p className="mb-2 text-xs font-semibold text-[#C97A8D]">{contextBadge}</p>}
          <h2 className="break-words font-serif text-3xl leading-tight tracking-tight text-[#F5EEE9] sm:text-4xl">
            {title || 'Conteúdo privado'}
          </h2>

          {state === 'ready' && files.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-zinc-300">
              {videoFiles.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Film aria-hidden className="size-4 text-[#C97A8D]" />
                  {videoFiles.length} {videoFiles.length === 1 ? 'vídeo' : 'vídeos'}
                </span>
              )}
              {photoFiles.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <ImageIcon aria-hidden className="size-4 text-[#C97A8D]" />
                  {photoFiles.length} {photoFiles.length === 1 ? 'foto' : 'fotos'}
                </span>
              )}
            </div>
          )}

          {metadataSlot && <div className="mt-3">{metadataSlot}</div>}

          {state === 'ready' && (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 lg:mt-6 lg:flex-col lg:items-start">
              <span className="inline-flex items-center gap-2 text-sm text-zinc-400">
                <ShieldCheck aria-hidden className="size-4 text-[#C97A8D]" />
                Acesso protegido
              </span>
              <button
                type="button"
                disabled={closingVisit}
                onClick={handleCloseVisit}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50 lg:-ml-2"
              >
                <Lock aria-hidden className="size-4" />
                {closingVisit ? 'Encerrando…' : 'Encerrar acesso'}
              </button>
            </div>
          )}
        </header>

        <div className="min-w-0">
          {/* Estados não-prontos (loading, confirmação de navegador, erro, inatividade) */}
          {state !== 'ready' && (
            <div className="max-w-2xl space-y-5 rounded-2xl border border-white/[0.08] bg-[#08080c] p-5 sm:p-7">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#7A293D]/45 bg-[#431322]/30 text-[#C97A8D]">
                  <Lock className="h-4 w-4" />
                </div>
                <p role="status" className="text-sm leading-relaxed text-zinc-200 pt-1">
                  {state === 'loading'
                    ? lastAction === 'request'
                      ? 'Enviando e-mail de confirmação…'
                      : lastAction === 'confirm'
                        ? 'Autorizando este navegador…'
                        : MESSAGES.loading
                    : state === 'unavailable' && unavailableReason === 'email_dispatch'
                      ? 'Não conseguimos enviar o e-mail de confirmação agora. Aguarde alguns instantes e tente novamente.'
                      : MESSAGES[state]}
                </p>
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
                  className="btn-primary min-h-11 px-5"
                >
                  {state === 'approve'
                    ? 'Autorizar este navegador'
                    : state === 'sent'
                      ? 'Reenviar e-mail de confirmação'
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
                      className="inline-flex min-h-[42px] items-center gap-1.5 rounded-full bg-wine hover:bg-wine-bordeaux px-5 py-2 text-xs font-semibold text-[#F5EEE9] transition-all cursor-pointer"
                    >
                      {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedLink ? 'Link copiado!' : 'Copiar link para abrir no navegador'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void run('request', order)}
                    className="inline-flex min-h-[42px] items-center rounded-full border border-white/15 bg-white/[0.04] px-5 py-2 text-xs text-zinc-200 transition-colors hover:bg-white/10 cursor-pointer"
                  >
                    Pedir nova confirmação neste navegador
                  </button>
                </div>
              )}

              {state === 'unavailable' && (
                <button
                  type="button"
                  onClick={() => void run(lastAction || 'open', order, lastAction === 'confirm' ? confirmToken : '')}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-full bg-wine hover:bg-wine-bordeaux px-5 py-2 text-xs font-semibold uppercase tracking-wider text-[#F5EEE9] transition-all cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Tentar novamente</span>
                </button>
              )}

              {state === 'idle' && (
                <button
                  type="button"
                  onClick={() => void run('open', order)}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-full bg-wine hover:bg-wine-bordeaux px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#F5EEE9] transition-all cursor-pointer"
                >
                  <span>Reabrir conteúdo</span>
                </button>
              )}
            </div>
          )}

          {/* Conteúdo liberado */}
          {state === 'ready' && (
            <div className="space-y-8">
              {files.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.08] bg-[#08080c] p-8 text-center">
                  <p className="text-sm text-zinc-400">
                    Os arquivos ainda não estão disponíveis. Em caso de dúvida, fale com o atendimento.
                  </p>
                </div>
              ) : (
                <>
                  {videoFiles.length > 0 && photoFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar arquivos">
                      {[
                        { id: 'all', label: `Tudo (${files.length})` },
                        { id: 'video', label: `Vídeos (${videoFiles.length})` },
                        { id: 'photo', label: `Fotos (${photoFiles.length})` },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setMediaFilter(tab.id as 'all' | 'photo' | 'video')}
                          aria-pressed={mediaFilter === tab.id}
                          className={`min-h-11 rounded-lg px-4 py-1.5 text-sm transition-colors cursor-pointer ${
                            mediaFilter === tab.id
                              ? 'border border-[#90364B]/60 bg-wine hover:bg-wine-bordeaux font-semibold text-[#F5EEE9]'
                              : 'border border-white/[0.08] bg-black/45 text-zinc-400 hover:border-white/20 hover:text-white'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Vídeos */}
                  {showVideos && videoFiles.length > 0 && (
                    <div className="space-y-4">
                      {videoFiles.length > 1 && (
                        <h3 className="font-serif text-lg text-[#F5EEE9]">Vídeos</h3>
                      )}
                      <div className={videoFiles.length === 1 ? 'mx-auto max-w-4xl' : 'space-y-5'}>
                        {videoFiles.map((f) => (
                          <div
                            key={f.url}
                            className="space-y-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#08080c] p-3 sm:p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-medium text-[#F5EEE9]">{f.label}</p>
                              {f.download && (
                                <a
                                  download
                                  href={`${apiBase}${f.download}`}
                                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-xs text-zinc-200 transition-colors hover:bg-white/[0.1]"
                                >
                                  <Download className="h-3.5 w-3.5 text-[#C97A8D]" />
                                  <span>Baixar vídeo</span>
                                </a>
                              )}
                            </div>
                            {failedMediaUrls[f.url] ? (
                              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-white/[0.08] bg-zinc-950 p-8 text-center">
                                <p className="text-xs text-zinc-400">
                                  Não foi possível carregar este vídeo. Sua sessão de visualização pode ter expirado.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => void run('open', order)}
                                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.05] px-4 py-1.5 text-xs text-[#F5EEE9] hover:bg-white/10 cursor-pointer"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                  <span>Recarregar acesso</span>
                                </button>
                              </div>
                            ) : (
                              <video
                                controls
                                playsInline
                                preload="metadata"
                                controlsList={f.download ? undefined : 'nodownload'}
                                onError={() => setFailedMediaUrls((prev) => ({ ...prev, [f.url]: true }))}
                                className="aspect-video max-h-[64svh] w-full rounded-xl bg-black"
                                src={`${apiBase}${f.url}`}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Galeria de Fotos */}
                  {showPhotos && photoFiles.length > 0 && (
                    <div className="space-y-4">
                      {videoFiles.length > 0 && mediaFilter === 'all' && (
                        <h3 className="font-serif text-lg text-[#F5EEE9]">Fotos</h3>
                      )}
                      <div className={photoGridClass}>
                        {photoFiles.map((f, idx) => (
                          <div
                            key={f.url}
                            className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-[#08080c]"
                          >
                            {failedMediaUrls[f.url] ? (
                              <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 bg-zinc-950 p-6 text-center">
                                <p className="text-xs text-zinc-400">Falha ao carregar imagem.</p>
                                <button
                                  type="button"
                                  onClick={() => void run('open', order)}
                                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.05] px-3.5 py-1.5 text-xs text-[#F5EEE9] hover:bg-white/10 cursor-pointer"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                  <span>Recarregar</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setLightboxIdx(idx)}
                                className={`relative block w-full overflow-hidden bg-black cursor-zoom-in ${photoFiles.length === 1 ? '' : 'aspect-[4/5]'}`}
                                aria-label={`Ampliar ${f.label}`}
                              >
                                <img
                                  src={`${apiBase}${f.url}`}
                                  alt={f.label}
                                  loading={idx < 3 ? 'eager' : 'lazy'}
                                  decoding="async"
                                  onError={() => setFailedMediaUrls((prev) => ({ ...prev, [f.url]: true }))}
                                  className={photoFiles.length === 1 ? 'mx-auto block max-h-[72svh] w-auto max-w-full object-contain select-none' : 'h-full w-full object-cover select-none'}
                                />
                                <span
                                  aria-hidden="true"
                                  className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-lg border border-white/15 bg-black/75 px-2 py-1.5 text-xs font-semibold text-zinc-100 backdrop-blur-sm"
                                >
                                  <Maximize2 className="h-3 w-3" />
                                  Ampliar
                                </span>
                              </button>
                            )}

                            <div className="flex items-center justify-between gap-2 border-t border-white/[0.05] px-4 py-3">
                              <p className="truncate text-xs text-zinc-300">{f.label}</p>
                              {f.download && (
                                <a
                                  download
                                  href={`${apiBase}${f.download}`}
                                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-[#C97A8D] transition-colors hover:border-white/25 hover:text-white"
                                >
                                  <Download className="h-3 w-3" />
                                  <span>Baixar</span>
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {lightboxNode}
    </section>
  );
}
