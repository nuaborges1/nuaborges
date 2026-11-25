'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
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

const LAST_ORDER_KEY = 'nua_vault_last_order';

const messages: Record<string, string> = {
  loading: 'Abrindo seu Cofre privativo…',
  confirm: 'Para proteger sua compra, confirme este navegador pelo e-mail vinculado ao pedido.',
  approve: 'Confirme que foi você quem pediu acesso ao Cofre neste navegador.',
  sent: 'Confira sua caixa de entrada e a pasta de spam. Abra a mensagem neste mesmo navegador para liberar o acesso.',
  expired: 'Essa confirmação expirou ou já foi utilizada. Você pode solicitar uma nova abaixo.',
  wrongBrowser: 'Abra o link no navegador em que você pediu acesso. Se abriu dentro do app de e-mail, use a opção Abrir no navegador.',
  wait: 'Você já solicitou algumas confirmações recentemente. Aguarde dez minutos para tentar novamente.',
  unavailable: 'Não conseguimos concluir agora. Tente novamente em instantes.',
  missing: 'Abra o botão que enviamos no e-mail da sua compra ou acesse pela sua Biblioteca em Minha Conta.',
  idle: 'Sua sessão no Cofre foi encerrada por inatividade para sua privacidade. Clique abaixo para reabrir.',
};

export default function CofrePage() {
  const initialized = useRef(false);
  const [state, setState] = useState('loading');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [title, setTitle] = useState('');
  const [entry, setEntry] = useState({ order: '', token: '' });
  const [lastAction, setLastAction] = useState<string>('open');
  const [unavailableReason, setUnavailableReason] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<'all' | 'photo' | 'video'>('all');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useScrollLock(lightboxIdx !== null);

  const run = useCallback(async (action: string, params: { order: string; token: string }) => {
    setLastAction(action);
    setUnavailableReason('');
    setState('loading');
    try {
      const response = await fetch(getPublicApiUrl() + '/api/me/cofre', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params }),
      });
      const data = await response.json().catch(() => ({ state: 'unavailable' }));
      if (data.state === 'ready') {
        const activeOrder = data.order || params.order;
        setEntry({ order: activeOrder, token: '' });
        if (typeof data.title === 'string' && data.title.trim()) {
          setTitle(data.title.trim());
        }
        try {
          if (activeOrder) sessionStorage.setItem(LAST_ORDER_KEY, activeOrder);
        } catch {}
        window.history.replaceState(null, '', '/cofre');
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
    if (initialized.current) return;
    initialized.current = true;
    const url = new URL(window.location.href);
    const fragment = new URLSearchParams(url.hash.slice(1));
    let rememberedOrder = '';
    try {
      rememberedOrder = sessionStorage.getItem(LAST_ORDER_KEY) || '';
    } catch {}
    const order = fragment.get('order') || url.searchParams.get('order') || rememberedOrder;
    const token = fragment.get('confirm') || '';
    const params = { order, token };
    setEntry(params);
    if (params.order) {
      try {
        sessionStorage.setItem(LAST_ORDER_KEY, params.order);
      } catch {}
    }
    if (params.token) {
      window.history.replaceState(null, '', '?order=' + encodeURIComponent(params.order));
      setState('approve');
    } else if (params.order) {
      void run('open', params);
    } else {
      void run('resume', params);
    }
  }, [run]);

  useEffect(() => {
    if (state !== 'ready') return;
    let timer: ReturnType<typeof setTimeout>;
    const expire = () => {
      setFiles([]);
      setLightboxIdx(null);
      setState('idle');
    };
    let lastCheck = Date.now();
    const active = () => {
      clearTimeout(timer);
      timer = setTimeout(expire, 15 * 60000);
      if (Date.now() - lastCheck < 60000) return;
      lastCheck = Date.now();
      fetch(getPublicApiUrl() + '/api/me/cofre', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activity', order: entry.order }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.state !== 'ready') expire();
        })
        .catch(() => {});
    };
    active();
    window.addEventListener('vaultplayback', active);
    window.addEventListener('pointerdown', active);
    window.addEventListener('keydown', active);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('vaultplayback', active);
      window.removeEventListener('pointerdown', active);
      window.removeEventListener('keydown', active);
    };
  }, [state, entry.order]);

  const photoFiles = useMemo(() => files.filter((f) => !f.video), [files]);
  const videoFiles = useMemo(() => files.filter((f) => f.video), [files]);

  useEffect(() => {
    if (lightboxIdx === null || photoFiles.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIdx(null);
      else if (e.key === 'ArrowRight') setLightboxIdx((i) => (i === null ? 0 : (i + 1) % photoFiles.length));
      else if (e.key === 'ArrowLeft') setLightboxIdx((i) => (i === null ? 0 : (i - 1 + photoFiles.length) % photoFiles.length));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIdx, photoFiles.length]);

  const handleCloseVault = async () => {
    try {
      await fetch(getPublicApiUrl() + '/api/me/cofre', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close' }),
      });
      sessionStorage.removeItem(LAST_ORDER_KEY);
    } catch {}
    setFiles([]);
    setLightboxIdx(null);
    setState('idle');
  };

  const showVideos = mediaFilter === 'all' || mediaFilter === 'video';
  const showPhotos = mediaFilter === 'all' || mediaFilter === 'photo';

  return (
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-[#661C30] selection:text-white">
      <main
        onTimeUpdate={(event) => {
          if (event.target instanceof HTMLVideoElement && !event.target.paused) {
            window.dispatchEvent(new Event('vaultplayback'));
          }
        }}
        className="mx-auto min-h-screen max-w-4xl px-4 sm:px-8 py-10 sm:py-14"
      >
        {/* Barra superior editorial */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <Link
            href="/conta?tab=biblioteca"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-zinc-300 hover:border-[#7A293D]/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Minha Conta</span>
          </Link>

          <div className="flex items-center gap-2.5">
            {state === 'ready' && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-950/25 px-3 py-1.5 text-[11px] text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Sessão protegida
              </span>
            )}
            {state === 'ready' && (
              <button
                type="button"
                onClick={handleCloseVault}
                className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs text-zinc-300 hover:border-rose-400/40 hover:bg-rose-950/35 hover:text-rose-100 transition-colors cursor-pointer"
              >
                Encerrar Cofre
              </button>
            )}
          </div>
        </div>

        {/* Cabeçalho da obra / estado */}
        <header className="mb-8">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.26em] text-[#C97A8D]">
            Cofre Privativo · Nua Borges
          </p>
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[#F5EEE9]">
            {state === 'ready' && title ? title : 'Seu Cofre'}
          </h1>
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

        {/* Estados não-prontos em card editorial */}
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
                onClick={() => run(state === 'approve' ? 'confirm' : 'request', entry)}
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
                <button
                  type="button"
                  className="min-h-[44px] rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] px-5 py-2.5 text-xs font-semibold text-white transition-all cursor-pointer"
                  onClick={async () => {
                    try {
                      const link = new URL('/cofre', window.location.origin);
                      link.hash = new URLSearchParams({ order: entry.order, confirm: entry.token }).toString();
                      await navigator.clipboard.writeText(link.href);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 3000);
                    } catch {}
                  }}
                >
                  {copiedLink ? 'Link copiado! Cole no Safari ou Chrome' : 'Copiar link para abrir no navegador'}
                </button>
                {entry.order && (
                  <button
                    type="button"
                    className="min-h-[44px] rounded-full border border-white/20 hover:bg-white/10 px-5 py-2.5 text-xs text-zinc-200 transition-colors cursor-pointer"
                    onClick={() => run('request', entry)}
                  >
                    Pedir nova confirmação neste navegador
                  </button>
                )}
              </div>
            )}

            {state === 'unavailable' && (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="min-h-[44px] rounded-full bg-[#661c30] hover:bg-[#7A293D] px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition-colors cursor-pointer"
                  onClick={() => run(lastAction || (entry.order ? 'open' : 'resume'), entry)}
                >
                  Tentar novamente
                </button>
                <Link
                  href="/conta?tab=biblioteca"
                  className="inline-flex min-h-[44px] items-center rounded-full border border-white/20 hover:bg-white/10 px-5 py-2.5 text-xs text-zinc-200 transition-colors"
                >
                  Abrir pela Minha Conta
                </Link>
              </div>
            )}

            {state === 'idle' && entry.order && (
              <button
                type="button"
                className="min-h-[44px] rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition-all cursor-pointer"
                onClick={() => run('open', entry)}
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

                {/* Vídeos */}
                {showVideos && videoFiles.length > 0 && (
                  <section className="space-y-4">
                    <h2 className="font-serif text-xl text-[#F5EEE9]">Vídeos</h2>
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

                {/* Galeria de fotos com Lightbox */}
                {showPhotos && photoFiles.length > 0 && (
                  <section className="space-y-4">
                    <h2 className="font-serif text-xl text-[#F5EEE9]">Galeria de Fotos</h2>
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
                              alt={f.label}
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] select-none"
                              src={getPublicApiUrl() + f.url}
                            />
                          </button>
                          <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs">
                            <span className="truncate text-zinc-300">{f.label}</span>
                            {f.download && (
                              <a
                                download
                                href={getPublicApiUrl() + f.download}
                                aria-label={`Baixar ${f.label}`}
                                className="inline-flex shrink-0 items-center gap-1 text-[#C97A8D] hover:text-white"
                              >
                                <Download className="h-3.5 w-3.5" />
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
      </main>

      {/* Lightbox tela cheia para fotos */}
      {lightboxIdx !== null && photoFiles[lightboxIdx] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={photoFiles[lightboxIdx].label}
          onClick={() => setLightboxIdx(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[92dvh] w-full max-w-5xl flex-col items-center"
          >
            <div className="mb-3 flex w-full items-center justify-between gap-3 text-xs text-zinc-300">
              <span className="truncate font-mono">
                {photoFiles[lightboxIdx].label} · {lightboxIdx + 1} / {photoFiles.length}
              </span>
              <div className="flex items-center gap-2">
                {photoFiles[lightboxIdx].download && (
                  <a
                    download
                    href={getPublicApiUrl() + photoFiles[lightboxIdx].download}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 text-xs text-white hover:bg-white/15"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Baixar
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setLightboxIdx(null)}
                  aria-label="Fechar visualização"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white hover:bg-white/15 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative flex w-full items-center justify-center">
              <img
                src={getPublicApiUrl() + photoFiles[lightboxIdx].url}
                alt={photoFiles[lightboxIdx].label}
                className="max-h-[82dvh] w-auto rounded-xl object-contain select-none"
              />
              {photoFiles.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxIdx((i) => (i === null ? 0 : (i - 1 + photoFiles.length) % photoFiles.length))
                    }
                    aria-label="Foto anterior"
                    className="absolute left-2 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/75 text-white hover:bg-black cursor-pointer"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxIdx((i) => (i === null ? 0 : (i + 1) % photoFiles.length))
                    }
                    aria-label="Próxima foto"
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/75 text-white hover:bg-black cursor-pointer"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
