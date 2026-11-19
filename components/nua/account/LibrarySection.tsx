'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Download, Film, Image as ImageIcon, Lock, Play, X } from 'lucide-react';
import { NuaIdLibraryItem, requestSignedMediaUrl } from '@/lib/nuaIdClient';
import { getPublicApiUrl } from '@/lib/contentStore';

interface LibrarySectionProps {
  items: NuaIdLibraryItem[];
  loading: boolean;
}

function formatDateBr(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function LibrarySection({ items, loading }: LibrarySectionProps) {
  const [viewer, setViewer] = useState<{
    title: string;
    label: string;
    type: 'photo' | 'video';
    url: string;
    expiresAt: string;
  } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const openProtectedMedia = async (
    item: NuaIdLibraryItem,
    media: { id: string; label: string; path: string; type: 'photo' | 'video' },
    download = false
  ) => {
    setErrorMsg(null);
    const key = `${item.entitlementId}:${media.id}:${download ? 'dl' : 'view'}`;
    setBusyKey(key);
    try {
      const res = await requestSignedMediaUrl(item.resourceId, media.path, download);
      if (!res.ok || !res.data?.signedUrl) {
        setErrorMsg(res.data?.error || 'Não foi possível liberar o acesso temporário a esta mídia.');
        return;
      }
      const signed = res.data.signedUrl;
      const fullUrl =
        signed.startsWith('http') || signed.startsWith('/images/')
          ? signed
          : `${getPublicApiUrl()}${signed}`;
      if (download) {
        const a = document.createElement('a');
        a.href = fullUrl;
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        setViewer({
          title: item.title,
          label: media.label,
          type: media.type,
          url: fullUrl,
          expiresAt: res.data.expiresAt || '',
        });
      }
    } catch {
      setErrorMsg('Erro de conexão ao gerar link protegido.');
    } finally {
      setBusyKey(null);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2].map((n) => (
          <div key={n} className="h-44 animate-pulse rounded-2xl border border-white/[0.06] bg-[#171115]/70" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-xl text-[#F5EEE9]">Minha Biblioteca</h2>
        <p className="mt-1 text-xs text-zinc-400">
          Seus conteúdos adquiridos com acesso autenticado e links temporários automáticos.
        </p>
      </div>

      {errorMsg && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/35 px-4 py-3 text-xs text-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-[24px] border border-white/[0.08] bg-[#08080c] px-6 py-12 text-center shadow-[0_16px_50px_rgba(0,0,0,0.85)]">
          <Lock className="mx-auto mb-3 h-7 w-7 text-[#90364B]/80" />
          <p className="font-serif text-base text-[#F5EEE9]">Nenhum conteúdo na sua biblioteca ainda</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-zinc-400">
            Quando você adquirir um conteúdo ou vincular uma compra anterior, ele aparecerá aqui pronto para assistir.
          </p>
          <Link
            href="/avulsos"
            className="mt-5 inline-flex items-center rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] border border-white/10 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#F5EEE9] transition-colors hover:from-[#661C30] hover:to-[#90364B]"
          >
            Explorar Conteúdos &amp; Packs
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => {
            const isActive = item.status === 'active';
            return (
              <article
                key={item.entitlementId}
                className="flex flex-col justify-between overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#08080c] shadow-[0_16px_50px_rgba(0,0,0,0.85)] transition-colors hover:border-[#661C30]/55"
              >
                <div className="flex gap-4 p-4">
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-[#0b090c]">
                    {item.coverUrl ? (
                      <img
                        src={item.coverUrl}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#A65B6C]/60">
                        <Film className="h-6 w-6" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          item.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : item.status === 'expired'
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'bg-rose-500/15 text-rose-300'
                        }`}
                      >
                        {item.status === 'active'
                          ? 'Disponível'
                          : item.status === 'expired'
                            ? 'Expirado'
                            : 'Revogado'}
                      </span>
                    </div>

                    <h3 className="mt-2 truncate font-serif text-base text-[#F5EEE9]">{item.title}</h3>
                    <p className="mt-1 text-[11px] text-zinc-400">
                      Adquirido em {formatDateBr(item.purchasedAt)}
                    </p>
                    {item.expiresAt && (
                      <p className="text-[11px] text-zinc-500">
                        Validade até {formatDateBr(item.expiresAt)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t border-white/[0.06] bg-black/60 px-4 py-3.5">
                  {!isActive ? (
                    <p className="text-xs text-zinc-400">
                      {item.status === 'revoked'
                        ? 'Acesso indisponível após cancelamento, estorno ou contestação.'
                        : 'O período de validade deste acesso terminou.'}
                    </p>
                  ) : item.mediaPaths.length > 0 ? (
                    <div className="space-y-2">
                      {item.mediaPaths.map((m) => (
                        <div key={m.id} className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-zinc-300">
                            {m.type === 'video' ? (
                              <Film className="h-3.5 w-3.5 shrink-0 text-[#A65B6C]" />
                            ) : (
                              <ImageIcon className="h-3.5 w-3.5 shrink-0 text-[#A65B6C]" />
                            )}
                            <span className="truncate">{m.label}</span>
                          </span>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              type="button"
                              disabled={busyKey !== null}
                              onClick={() => openProtectedMedia(item, m, false)}
                              className="inline-flex items-center gap-1 rounded-full bg-[#661C30] px-3 py-1.5 text-[11px] font-medium text-[#F5EEE9] transition-colors hover:bg-[#7A293D] disabled:opacity-50"
                            >
                              <Play className="h-3 w-3" />
                              Assistir
                            </button>
                            {item.allowDownload && (
                              <button
                                type="button"
                                disabled={busyKey !== null}
                                onClick={() => openProtectedMedia(item, m, true)}
                                aria-label={`Baixar ${m.label}`}
                                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-300 transition-colors hover:border-white/25 hover:text-white disabled:opacity-50"
                              >
                                <Download className="h-3 w-3" />
                                Baixar
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : item.watchUrl ? (
                    <Link
                      href={item.watchUrl}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#661C30] px-4 py-2 text-xs font-medium text-[#F5EEE9] transition-colors hover:bg-[#7A293D]"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Abrir conteúdo
                    </Link>
                  ) : (
                    <p className="text-xs text-zinc-400">Conteúdo liberado e em preparação.</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Visualizador Protegido com Link Assinado de TTL Curto */}
      {viewer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={viewer.title}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
        >
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[#7A293D]/40 bg-[#120d11]">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate font-serif text-base text-[#F5EEE9]">{viewer.title}</p>
                <p className="truncate text-[11px] text-zinc-400">
                  {viewer.label} · Acesso temporário protegido
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewer(null)}
                aria-label="Fechar visualizador"
                className="rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex max-h-[75vh] items-center justify-center bg-black p-3">
              {viewer.type === 'video' ? (
                <video
                  src={viewer.url}
                  controls
                  playsInline
                  controlsList="nodownload"
                  className="max-h-[70vh] w-full rounded-lg"
                />
              ) : (
                <img
                  src={viewer.url}
                  alt={viewer.label}
                  className="max-h-[70vh] w-auto rounded-lg object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
