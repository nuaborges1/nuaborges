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
const ACTIVITY_PING_INTERVAL_MS = 60 * 1000;

export function VaultContentViewer({
  order,
  initialTitle = '',
  initialConfirmToken = '',
  backLabel,
  contextBadge = 'Conteúdo Protegido',
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

  const requestControllerRef = useRef<AbortController | null>(null);
  const onConfirmedRef = useRef(onAuthenticatedByConfirm);
  useEffect(() => {
    onConfirmedRef.current = onAuthenticatedByConfirm;
  }, [onAuthenticatedByConfirm]);

  useScrollLock(lightboxIdx !== null);

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
    if (state !== 'ready' || !order) return;

    let idleTimer: ReturnType<typeof setTimeout>;
    let lastPingAt = Date.now();
    let mounted = true;

    const expireLocally = () => {
      if (!mounted) return;
      setFiles([]);
      setLightboxIdx(null);
      setState('idle');
    };

    const scheduleIdle = () => {
      clearTimeout(idleTimer);
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

  const photoGridClass =
    photoFiles.length === 1
      ? 'mx-auto max-w-xl'
      : photoFiles.length === 2
        ? 'grid grid-cols-1 sm:grid-cols-2 gap-5'
        : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4';

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
              onClick={(e) => e.stopPropagation()}
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
      className="space-y-6"
    >
      {/* Barra superior integrada ao fluxo da aba */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/[0.08] bg-[#08080c] px-4 py-3.5 sm:px-6 shadow-[0_12px_40px_rgba(0,0,0,0.65)]">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-zinc-200 transition-colors duration-200 hover:border-[#7A293D]/60 hover:bg-white/[0.06] hover:text-white cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-[#C97A8D]" />
          <span>{backLabel}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {state === 'ready' && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/30 px-3 py-1.5 text-[11px] text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Acesso protegido ativo</span>
            </span>
          )}
          {state === 'ready' && (
            <button
              type="button"
              disabled={closingVisit}
              onClick={handleCloseVisit}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-zinc-300 transition-colors duration-200 hover:border-rose-400/40 hover:bg-rose-950/35 hover:text-rose-100 disabled:opacity-45 cursor-pointer"
            >
              <Lock className="h-3 w-3" />
              <span>{closingVisit ? 'Encerrando…' : 'Bloquear acesso'}</span>
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-950/35 px-4 py-3 text-xs text-rose-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Cabeçalho editorial do item aberto */}
      <div className="rounded-[28px] border border-white/[0.08] bg-[#08080c] p-5 sm:p-7 shadow-[0_16px_50px_rgba(0,0,0,0.85)] space-y-5">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end border-b border-white/[0.06] pb-5">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-[#C97A8D]">
              {contextBadge}
            </p>
            <h2 className="mt-1.5 break-words font-serif text-2xl sm:text-3xl font-normal tracking-tight text-[#F5EEE9]">
              {title || 'Conteúdo privado'}
            </h2>
          </div>

          {state === 'ready' && files.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-zinc-300 shrink-0">
              {videoFiles.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/55 px-3 py-1">
                  <Film className="h-3 w-3 text-[#C97A8D]" />
                  {videoFiles.length} {videoFiles.length === 1 ? 'vídeo' : 'vídeos'}
                </span>
              )}
              {photoFiles.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/55 px-3 py-1">
                  <ImageIcon className="h-3 w-3 text-[#C97A8D]" />
                  {photoFiles.length} {photoFiles.length === 1 ? 'foto' : 'fotos'}
                </span>
              )}
            </div>
          )}
        </header>

        {metadataSlot}

        {/* Estados não-prontos (loading, confirmação de navegador, erro, inatividade) */}
        {state !== 'ready' && (
          <div className="rounded-2xl border border-white/[0.07] bg-black/45 p-5 sm:p-6 space-y-5 max-w-2xl">
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
                className="min-h-[44px] rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#54182b] hover:via-[#7A293D] hover:to-[#90364B] border border-white/15 px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#F5EEE9] transition-all cursor-pointer shadow-[0_4px_20px_rgba(67,19,34,0.45)]"
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
                    className="inline-flex min-h-[42px] items-center gap-1.5 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] px-5 py-2 text-xs font-semibold text-[#F5EEE9] transition-all cursor-pointer"
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
                className="inline-flex min-h-[42px] items-center gap-2 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] px-5 py-2 text-xs font-semibold uppercase tracking-wider text-[#F5EEE9] transition-all cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Tentar novamente</span>
              </button>
            )}

            {state === 'idle' && (
              <button
                type="button"
                onClick={() => void run('open', order)}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#F5EEE9] transition-all cursor-pointer"
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
              <div className="rounded-2xl border border-white/[0.07] bg-black/45 p-8 text-center">
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
                        className={`rounded-full px-4 py-1.5 text-xs transition-all cursor-pointer ${
                          mediaFilter === tab.id
                            ? 'border border-[#90364B]/60 bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] font-semibold text-[#F5EEE9]'
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
                    <h3 className="font-serif text-lg text-[#F5EEE9]">
                      {videoFiles.length === 1 ? 'Vídeo' : 'Vídeos'}
                    </h3>
                    <div className={videoFiles.length === 1 ? 'mx-auto max-w-4xl' : 'space-y-5'}>
                      {videoFiles.map((f) => (
                        <div
                          key={f.url}
                          className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-black/55 p-4 sm:p-5 space-y-3"
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
                              className="aspect-video w-full rounded-xl bg-black"
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
                    <h3 className="font-serif text-lg text-[#F5EEE9]">
                      {photoFiles.length === 1 ? 'Foto' : 'Galeria de Fotos'}
                    </h3>
                    <div className={photoGridClass}>
                      {photoFiles.map((f, idx) => (
                        <div
                          key={f.url}
                          className="group overflow-hidden rounded-[22px] border border-white/[0.08] bg-black/55"
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
                              className={`relative block w-full overflow-hidden bg-zinc-950 cursor-pointer ${
                                photoFiles.length === 1 ? 'max-h-[68vh]' : 'aspect-[4/5]'
                              }`}
                              aria-label={`Ampliar ${f.label}`}
                            >
                              <img
                                src={`${apiBase}${f.url}`}
                                alt={f.label}
                                loading={idx < 3 ? 'eager' : 'lazy'}
                                decoding="async"
                                onError={() => setFailedMediaUrls((prev) => ({ ...prev, [f.url]: true }))}
                                className={
                                  photoFiles.length === 1
                                    ? 'mx-auto max-h-[68vh] w-full object-contain transition-transform duration-500 group-hover:scale-[1.01] select-none'
                                    : 'h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] select-none'
                                }
                              />
                              <span
                                aria-hidden="true"
                                className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/70 px-2.5 py-1 text-[10px] text-zinc-200 opacity-0 backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100"
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

      {lightboxNode}
    </section>
  );
}
