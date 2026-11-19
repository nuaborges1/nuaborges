'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Camera, Download } from 'lucide-react';
import { NuaIdPersonalizado, requestSignedMediaUrl } from '@/lib/nuaIdClient';
import { getPublicApiUrl } from '@/lib/contentStore';

interface PersonalizadosSectionProps {
  items: NuaIdPersonalizado[];
  loading: boolean;
}

const PERSONALIZADO_STATUS: Record<NuaIdPersonalizado['operationalStatus'], { label: string; cls: string }> = {
  aguardando_pagamento: { label: 'Aguardando pagamento', cls: 'bg-amber-500/15 text-amber-300' },
  em_producao: { label: 'Em produção', cls: 'bg-[#661C30]/35 text-[#F5EEE9]' },
  pronto: { label: 'Pronto para acesso', cls: 'bg-emerald-500/15 text-emerald-300' },
  entregue: { label: 'Entregue', cls: 'bg-emerald-500/15 text-emerald-300' },
  cancelado: { label: 'Cancelado', cls: 'bg-rose-500/15 text-rose-300' },
};

function formatBrl(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

export function PersonalizadosSection({ items, loading }: PersonalizadosSectionProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOpenFile = async (orderId: string, file: { id: string; path: string }) => {
    setError(null);
    setDownloadingId(file.id);
    try {
      const res = await requestSignedMediaUrl(orderId, file.path, true);
      if (!res.ok || !res.data?.signedUrl) {
        setError(res.data?.error || 'Não foi possível gerar link de acesso temporário.');
        return;
      }
      const signed = res.data.signedUrl;
      const targetUrl =
        signed.startsWith('http') || signed.startsWith('/images/')
          ? signed
          : `${getPublicApiUrl()}${signed}`;
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } catch {
      setError('Falha de conexão ao acessar arquivo.');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((n) => (
          <div key={n} className="h-32 animate-pulse rounded-2xl border border-white/[0.06] bg-[#171115]/70" />
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
          className="inline-flex items-center justify-center rounded-full border border-[#90364B]/45 bg-[#431322]/40 px-4 py-2 text-xs font-medium text-[#F5EEE9] transition-colors hover:bg-[#661C30]"
        >
          Nova solicitação
        </Link>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/35 px-4 py-3 text-xs text-rose-200">
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
        <div className="space-y-3">
          {items.map((item) => {
            const st = PERSONALIZADO_STATUS[item.operationalStatus] || {
              label: item.operationalStatus,
              cls: 'bg-zinc-700/30 text-zinc-300',
            };
            return (
              <article key={item.id} className="rounded-[24px] border border-white/[0.08] bg-[#08080c] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.85)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${st.cls}`}>
                      {st.label}
                    </span>
                    <span className="font-mono text-[11px] text-zinc-500">{item.id}</span>
                  </div>
                  <span className="text-sm font-semibold text-[#F5EEE9]">{formatBrl(item.totalPrice)}</span>
                </div>

                <p className="mt-2.5 text-sm text-zinc-200">
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

                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
                  <span>Canal: {item.deliveryChannel === 'vault' ? 'Cofre digital em Minha NUA' : 'Telegram'}</span>
                  <span>·</span>
                  <span>Pagamento: {item.financialStatus === 'paid' ? 'Pago' : item.financialStatus}</span>
                </div>

                {item.vaultFiles.length > 0 && (
                  <div className="mt-4 border-t border-white/[0.07] pt-3">
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[#A65B6C]">
                      Arquivos entregues
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {item.vaultFiles.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          disabled={downloadingId === f.id}
                          onClick={() => handleOpenFile(item.id, f)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#661C30] px-3.5 py-1.5 text-xs text-[#F5EEE9] transition-colors hover:bg-[#7A293D] disabled:opacity-50"
                        >
                          <Download className="h-3.5 w-3.5" />
                          {f.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
