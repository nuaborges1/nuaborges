'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Camera, CheckCircle2, Download, Eye, Film, Image as ImageIcon, X } from 'lucide-react';
import { NuaIdPersonalizado, requestSignedMediaUrl } from '@/lib/nuaIdClient';
import { getPublicApiUrl } from '@/lib/contentStore';

interface PersonalizadosSectionProps {
  items: NuaIdPersonalizado[];
  loading: boolean;
}

const PERSONALIZADO_STATUS: Record<NuaIdPersonalizado['operationalStatus'], { label: string; cls: string; step: number }> = {
  aguardando_pagamento: { label: 'Aguardando pagamento', cls: 'bg-amber-500/15 text-amber-300', step: 1 },
  em_producao: { label: 'Em produção', cls: 'bg-[#661C30]/35 text-[#F5EEE9]', step: 2 },
  pronto: { label: 'Pronto para acesso', cls: 'bg-emerald-500/15 text-emerald-300', step: 3 },
  entregue: { label: 'Entregue', cls: 'bg-emerald-500/15 text-emerald-300', step: 4 },
  cancelado: { label: 'Cancelado', cls: 'bg-rose-500/15 text-rose-300', step: 0 },
};

const STEPS = [
  { step: 1, label: 'Pedido' },
  { step: 2, label: 'Em produção' },
  { step: 3, label: 'Pronto' },
  { step: 4, label: 'Entregue' },
];

function formatBrl(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function resolveFileUrl(raw: string): string {
  if (!raw) return '';
  if (raw.startsWith('http') || raw.startsWith('/images/')) return raw;
  return `${getPublicApiUrl()}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

export function PersonalizadosSection({ items, loading }: PersonalizadosSectionProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{
    orderId: string;
    name: string;
    type: 'photo' | 'video';
    url: string;
  } | null>(null);

  const handleOpenFile = async (
    orderId: string,
    file: { id: string; name: string; type: 'photo' | 'video'; path: string; url?: string },
    download: boolean
  ) => {
    setError(null);
    const targetPath = file.path || file.url || '';
    if (!targetPath) {
      setError('Arquivo indisponível no momento.');
      return;
    }

    const key = `${orderId}:${file.id}:${download ? 'dl' : 'view'}`;
    setBusyId(key);
    try {
      const res = await requestSignedMediaUrl(orderId, targetPath, download);
      if (!res.ok || !res.data?.signedUrl) {
        setError(res.data?.error || 'Não foi possível gerar link de acesso temporário.');
        return;
      }
      const targetUrl = resolveFileUrl(res.data.signedUrl);
      if (download) {
        const a = document.createElement('a');
        a.href = targetUrl;
        a.download = file.name || 'personalizado';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        setViewer({
          orderId,
          name: file.name,
          type: file.type,
          url: targetUrl,
        });
      }
    } catch {
      setError('Falha de conexão ao acessar arquivo.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((n) => (
          <div key={n} className="h-36 animate-pulse rounded-[24px] border border-white/[0.06] bg-[#08080c]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-xl text-[#F5EEE9]">Meus Personalizados</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Acompanhe o andamento da produção e acesse suas entregas autorizadas.
          </p>
        </div>
        <Link
          href="/personalizados"
          className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-[#7A293D]/50 bg-[#431322]/40 px-4 py-2 text-xs font-medium text-[#F5EEE9] transition-colors hover:bg-[#661C30]"
        >
          Nova solicitação
        </Link>
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-950/35 px-4 py-3 text-xs text-rose-200">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-[24px] border border-white/[0.08] bg-[#08080c] px-6 py-12 text-center shadow-[0_16px_50px_rgba(0,0,0,0.85)]">
          <Camera className="mx-auto mb-3 h-7 w-7 text-[#90364B]/80" />
          <p className="font-serif text-base text-[#F5EEE9]">Nenhuma solicitação personalizada ainda</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs text-zinc-400">
            Quando você encomendar uma produção sob medida, o acompanhamento e a entrega aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const st = PERSONALIZADO_STATUS[item.operationalStatus] || {
              label: item.operationalStatus,
              cls: 'bg-zinc-700/30 text-zinc-300',
              step: 1,
            };
            const isDelivered = item.operationalStatus === 'pronto' || item.operationalStatus === 'entregue';
            return (
              <article
                key={item.id}
                className="rounded-[24px] border border-white/[0.08] bg-[#08080c] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.85)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${st.cls}`}>
                      {st.label}
                    </span>
                    <span className="font-mono text-[11px] text-zinc-500 break-all">{item.id}</span>
                  </div>
                  <span className="text-sm font-semibold text-[#F5EEE9]">{formatBrl(item.totalPrice)}</span>
                </div>

                <p className="mt-3 text-sm font-medium text-zinc-100">
                  {item.photoCount} foto(s)
                  {item.videoDurationMinutes > 0 ? ` · Vídeo de ${item.videoDurationMinutes} min` : ''}
                  {item.mentionName ? ' · Com menção de nome' : ''}
                  {item.express24h ? ' · Entrega expressa' : ''}
                </p>

                {item.briefingSummary && (
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    {item.briefingSummary}
                  </p>
                )}

                {/* Linha de progresso dos estados reais */}
                {item.operationalStatus !== 'cancelado' && (
                  <div className="mt-4 grid grid-cols-4 gap-1.5">
                    {STEPS.map((s) => {
                      const done = st.step >= s.step;
                      return (
                        <div key={s.step} className="space-y-1">
                          <div
                            className={`h-1 rounded-full ${
                              done ? 'bg-gradient-to-r from-[#661C30] to-[#90364B]' : 'bg-white/10'
                            }`}
                          />
                          <p className={`text-[10px] ${done ? 'text-zinc-200 font-medium' : 'text-zinc-500'}`}>
                            {s.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
                  <span>Canal: {item.deliveryChannel === 'vault' ? 'Cofre digital em Minha Conta' : 'Telegram'}</span>
                  <span>·</span>
                  <span>
                    Pagamento:{' '}
                    <strong className="text-zinc-300">
                      {item.financialStatus === 'paid' ? 'Pago' : item.financialStatus}
                    </strong>
                  </span>
                </div>

                {/* Galeria de Entrega Autorizada */}
                {isDelivered && item.vaultFiles.length > 0 ? (
                  <div className="mt-5 border-t border-white/[0.07] pt-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-medium text-emerald-300">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>Entrega liberada ({item.vaultFiles.length} arquivo(s))</span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {item.vaultFiles.map((f: any) => {
                        const rawSrc = f.path || f.url || '';
                        const previewSrc = f.type === 'photo' && rawSrc ? resolveFileUrl(rawSrc) : null;
                        return (
                          <div
                            key={f.id}
                            className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/70"
                          >
                            <div className="relative aspect-[4/3] w-full bg-zinc-950 flex items-center justify-center overflow-hidden">
                              {previewSrc ? (
                                <img
                                  src={previewSrc}
                                  alt={f.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex flex-col items-center gap-1.5 text-zinc-500">
                                  {f.type === 'video' ? (
                                    <Film className="h-6 w-6 text-[#90364B]" />
                                  ) : (
                                    <ImageIcon className="h-6 w-6 text-[#90364B]" />
                                  )}
                                  <span className="text-[10px] uppercase tracking-wider">{f.type}</span>
                                </div>
                              )}
                            </div>

                            <div className="p-3 space-y-2.5">
                              <p className="truncate text-xs font-medium text-[#F5EEE9]">{f.name}</p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={busyId !== null}
                                  onClick={() => handleOpenFile(item.id, f, false)}
                                  className="flex-1 inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] border border-white/10 px-3 py-1.5 text-[11px] font-medium text-[#F5EEE9] hover:from-[#661C30] hover:to-[#90364B] disabled:opacity-50 cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Visualizar
                                </button>
                                <button
                                  type="button"
                                  disabled={busyId !== null}
                                  onClick={() => handleOpenFile(item.id, f, true)}
                                  aria-label={`Baixar ${f.name}`}
                                  className="inline-flex min-h-[36px] items-center justify-center gap-1 rounded-full border border-white/12 px-3 py-1.5 text-[11px] text-zinc-300 hover:border-white/25 hover:text-white disabled:opacity-50 cursor-pointer"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  Baixar
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : item.operationalStatus === 'em_producao' ? (
                  <p className="mt-4 border-t border-white/[0.07] pt-3 text-xs text-zinc-400">
                    Pagamento confirmado. Sua produção está em andamento e os arquivos aparecerão aqui assim que forem liberados.
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {/* Visualizador Inline de Mídia Entregue */}
      {viewer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={viewer.name}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 sm:p-4 backdrop-blur-md"
        >
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#08080c]">
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] px-4 py-3">
              <p className="truncate font-serif text-sm sm:text-base text-[#F5EEE9]">{viewer.name}</p>
              <button
                type="button"
                onClick={() => setViewer(null)}
                aria-label="Fechar visualizador"
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex max-h-[78dvh] items-center justify-center bg-black p-3">
              {viewer.type === 'video' ? (
                <video
                  src={viewer.url}
                  controls
                  playsInline
                  className="max-h-[72dvh] w-full rounded-lg"
                />
              ) : (
                <img
                  src={viewer.url}
                  alt={viewer.name}
                  className="max-h-[72dvh] w-auto rounded-lg object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
