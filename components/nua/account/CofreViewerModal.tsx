'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Film,
  Image as ImageIcon,
  Lock,
  ShieldCheck,
  X,
} from 'lucide-react';
import { getPublicApiUrl } from '@/lib/contentStore';
import { useScrollLock } from '@/hooks/useScrollLock';

interface FileItem {
  label: string;
  url: string;
  video: boolean;
  download?: string;
}

interface CofreViewerModalProps {
  order: string | null;
  initialTitle?: string;
  onClose: () => void;
}

const messages: Record<string, string> = {
  loading: 'Abrindo seu Cofre privativo…',
  confirm: 'Para proteger sua compra, confirme este navegador pelo e-mail vinculado ao pedido.',
  approve: 'Confirme que foi você quem pediu acesso ao Cofre neste navegador.',
  sent: 'Confira sua caixa de entrada e a pasta de spam. Abra a mensagem neste mesmo navegador para liberar o acesso.',
  expired: 'Essa confirmação expirou ou já foi utilizada. Você pode solicitar uma nova abaixo.',
  wrongBrowser: 'Abra o link no navegador em que você pediu acesso. Se abriu dentro do app de e-mail, use a opção Abrir no navegador.',
  wait: 'Você já solicitou algumas confirmações recentemente. Aguarde dez minutos para tentar novamente.',
  unavailable: 'Não conseguimos concluir agora. Tente novamente em instantes.',
  missing: 'Não foi possível identificar o pedido para abrir no Cofre.',
  idle: 'Sua sessão no Cofre foi encerrada por inatividade para sua privacidade. Clique abaixo para reabrir.',
};

export function CofreViewerModal({ order, initialTitle = '', onClose }: CofreViewerModalProps) {
  const [state, setState] = useState('loading');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [title, setTitle] = useState(initialTitle);
  const [lastAction, setLastAction] = useState<string>('open');
  const [unavailableReason, setUnavailableReason] = useState<string>('');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'photo' | 'video'>('all');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useScrollLock(order !== null);

  const run = useCallback(async (action: string, targetOrder: string) => {
    setLastAction(action);
    setUnavailableReason('');
    setState('loading');
    try {
      const response = await fetch(getPublicApiUrl() + '/api/me/cofre', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, order: targetOrder, token: '' }),
      });
      const data = await response.json().catch(() => ({ state: 'unavailable' }));
      if (data.state === 'ready' && typeof data.title === 'string' && data.title.trim()) {
        setTitle(data.title.trim());
      }
      if (typeof data.reason === 'string') {
        setUnavailableReason(data.reason);
      }
      setFiles(data.files || []);
      setState(data.state === 'ready' || messages[data.state] ? data.state : 'unavailable');
    } catch {
      setState('unavailable');
    }
  }, []);

  useEffect(() => {
    if (!order) return;
    setTitle(initialTitle);
    setFiles([]);
    setMediaFilter('all');
    setLightboxIdx(null);
    void run('open', order);
  }, [order, initialTitle, run]);

  const videoFiles = useMemo(() => files.filter((f) => f.video), [files]);
  const photoFiles = useMemo(() => files.filter((f) => !f.video), [files]);
  const showVideos = mediaFilter === 'all' || mediaFilter === 'video';
  const showPhotos = mediaFilter === 'all' || mediaFilter === 'photo';

  useEffect(() => {
    if (!order) return;
    const onKey = (e: KeyboardEvent) => {
      if (lightboxIdx !== null) {
        if (e.key === 'Escape') setLightboxIdx(null);
        else if (e.key === 'ArrowRight') setLightboxIdx((prev) => (prev === null ? null : (prev + 1) % photoFiles.length));
        else if (e.key === 'ArrowLeft') setLightboxIdx((prev) => (prev === null ? null : (prev - 1 + photoFiles.length) % photoFiles.length));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [order, lightboxIdx, photoFiles.length, onClose]);

  if (!order) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cofre Privativo"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#030305]/95 backdrop-blur-md text-zinc-100"
    >
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
        {/* Barra superior */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-white/10 bg-[#08080c] px-4 py-2 text-xs text-zinc-300 transition-colors hover:border-white/25 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar ao Acervo</span>
          </button>

          <div className="flex items-center gap-2.5">
            {state === 'ready' && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/30 px-3 py-1.5 text-[11px] text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Sessão protegida
              </span>
            )}
            {state === 'ready' && (
              <button
                type="button"
                onClick={async () => {
                  await fetch(getPublicApiUrl() + '/api/me/cofre', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'logout' }),
                  }).catch(() => null);
                  onClose();
                }}
                className="inline-flex min-h-[40px] items-center rounded-full border border-white/10 bg-[#08080c] px-4 py-2 text-xs text-zinc-300 transition-colors hover:border-white/25 hover:text-white cursor-pointer"
              >
                Encerrar Cofre
              </button>
            )}
          </div>
        </div>

        {/* Cabeçalho */}
        <header className="mb-8">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.26em] text-[#C97A8D]">
            Cofre Privativo · Nua Borges
          </p>
          <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[#F5EEE9]">
            {title || 'Seu Cofre'}
          </h2>
          {state === 'ready' && files.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-mono text-zinc-300">
              {videoFiles.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#08080c] px-3 py-1">
                  <Film className="h-3 w-3 text-[#C97A8D]" />
                  {videoFiles.length} {videoFiles.length === 1 ? 'vídeo' : 'vídeos'}
                </span>
              )}
              {photoFiles.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#08080c] px-3 py-1">
                  <ImageIcon className="h-3 w-3 text-[#C97A8D]" />
                  {photoFiles.length} {photoFiles.length === 1 ? 'foto' : 'fotos'}
                </span>
              )}
            </div>
          )}
        </header>

        {/* Estados não-prontos */}
        {state !== 'ready' && (
          <div className="rounded-[28px] border border-white/[0.08] bg-[#08080c] p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)] space-y-5 max-w-xl">
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
                      : messages.loading
                  : state === 'unavailable' && unavailableReason === 'email_dispatch'
                    ? 'Não conseguimos enviar o e-mail de confirmação agora. Aguarde alguns instantes e tente novamente.'
                    : messages[state]}
              </p>
            </div>

            {['approve', 'confirm', 'sent', 'expired'].includes(state) && (
              <button
                type="button"
                className="min-h-[46px] rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#54182b] hover:via-[#7A293D] hover:to-[#90364B] border border-white/15 px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#F5EEE9] transition-all cursor-pointer shadow-[0_4px_20px_rgba(67,19,34,0.45)]"
                onClick={() => run(state === 'approve' ? 'confirm' : 'request', order)}
              >
                {state === 'approve'
                  ? 'Autorizar este navegador'
                  : state === 'sent'
                    ? 'Reenviar e-mail de confirmação'
                    : 'Receber confirmação por e-mail'}
              </button>
            )}

            {state === 'unavailable' && (
              <button
                type="button"
                className="min-h-[44px] rounded-full bg-[#661c30] hover:bg-[#7A293D] px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition-colors cursor-pointer"
                onClick={() => run(lastAction || 'open', order)}
              >
                Tentar novamente
              </button>
            )}

            {state === 'idle' && (
              <button
                type="button"
                className="min-h-[44px] rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition-all cursor-pointer"
                onClick={() => run('open', order)}
              >
                Reabrir Cofre
              </button>
            )}
          </div>
        )}

        {/* Conteúdo liberado */}
        {state === 'ready' && (
          <div className="space-y-8">
            {files.length === 0 ? (
              <div className="rounded-[28px] border border-white/[0.08] bg-[#08080c] p-8 text-center">
                <p className="text-sm text-zinc-400">
                  Os arquivos ainda não estão disponíveis. Consulte o atendimento sobre sua entrega.
                </p>
              </div>
            ) : (
              <>
                {videoFiles.length > 0 && photoFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar mídias do Cofre">
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
                            : 'border border-white/[0.08] bg-[#08080c] text-zinc-400 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}

                {showVideos && videoFiles.length > 0 && (
                  <section className="space-y-4">
                    <h3 className="font-serif text-xl text-[#F5EEE9]">Vídeos</h3>
                    <div className="space-y-5">
                      {videoFiles.map((f) => (
                        <div
                          key={f.url}
                          className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#08080c] p-4 sm:p-5 space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium text-[#F5EEE9]">{f.label}</p>
                            {f.download && (
                              <a
                                download
                                href={getPublicApiUrl() + f.download}
                                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-xs text-zinc-200 hover:bg-white/[0.09]"
                              >
                                <Download className="h-3.5 w-3.5 text-[#C97A8D]" />
                                Baixar vídeo
                              </a>
                            )}
                          </div>
                          <video
                            controls
                            playsInline
                            preload="metadata"
                            controlsList={f.download ? undefined : 'nodownload'}
                            className="aspect-video w-full rounded-xl bg-black"
                            src={getPublicApiUrl() + f.url}
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {showPhotos && photoFiles.length > 0 && (
                  <section className="space-y-4">
                    <h3 className="font-serif text-xl text-[#F5EEE9]">Galeria de Fotos</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {photoFiles.map((f, idx) => (
                        <div
                          key={f.url}
                          className="group overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#08080c]"
                        >
                          <button
                            type="button"
                            onClick={() => setLightboxIdx(idx)}
                            className="block w-full aspect-[4/5] overflow-hidden bg-zinc-950 cursor-pointer"
                            aria-label={`Ampliar ${f.label}`}
                          >
                            <img
                              src={getPublicApiUrl() + f.url}
                              alt={f.label}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                          </button>
                          <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-white/[0.05]">
                            <p className="truncate text-xs text-zinc-300">{f.label}</p>
                            {f.download && (
                              <a
                                download
                                href={getPublicApiUrl() + f.download}
                                className="inline-flex items-center gap-1 text-[11px] text-[#C97A8D] hover:text-white"
                              >
                                <Download className="h-3 w-3" />
                                Baixar
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && photoFiles[lightboxIdx] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Visualização ampliada"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxIdx(null)}
            aria-label="Fechar visualização"
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white hover:bg-white/15 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          {photoFiles.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx((lightboxIdx - 1 + photoFiles.length) % photoFiles.length);
                }}
                aria-label="Foto anterior"
                className="absolute left-3 sm:left-6 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white hover:bg-white/15 cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx((lightboxIdx + 1) % photoFiles.length);
                }}
                aria-label="Próxima foto"
                className="absolute right-3 sm:right-6 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white hover:bg-white/15 cursor-pointer"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <div className="max-h-[88vh] max-w-4xl space-y-2" onClick={(e) => e.stopPropagation()}>
            <p className="font-mono text-xs text-zinc-400">
              {photoFiles[lightboxIdx].label} · {lightboxIdx + 1} / {photoFiles.length}
            </p>
            <img
              src={getPublicApiUrl() + photoFiles[lightboxIdx].url}
              alt={photoFiles[lightboxIdx].label}
              className="max-h-[82vh] w-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
