'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, KeyRound } from 'lucide-react';
import { claimLegacyOrder } from '@/lib/nuaIdClient';
import { useCopy } from '@/lib/copy';

interface ClaimOrderBoxProps {
  onClaimed: () => void;
  defaultOpen?: boolean;
  onOpenContact?: () => void;
}

function extractClaimToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || trimmed.includes('token=')) {
    try {
      const normalized = /^https?:\/\//i.test(trimmed)
        ? trimmed
        : `https://nuaborges.com.br/${trimmed.replace(/^\/+/, '')}`;
      const url = new URL(normalized);
      const fromQuery =
        url.searchParams.get('token') || url.searchParams.get('t') || url.searchParams.get('purchaseToken');
      if (fromQuery) return fromQuery.trim();
      const fromHash = new URLSearchParams(url.hash.replace(/^#/, '')).get('token');
      if (fromHash) return fromHash.trim();
    } catch {}
    const match = trimmed.match(/[?&#](?:token|purchaseToken)=([A-Za-z0-9_-]{8,128})/i);
    if (match?.[1]) return match[1];
  }
  return trimmed;
}

export function ClaimOrderBox({ onClaimed, defaultOpen = false, onOpenContact }: ClaimOrderBoxProps) {
  const { copy } = useCopy();
  const [open, setOpen] = useState(defaultOpen);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    const clean = extractClaimToken(token);
    if (clean.length < 8) {
      setError('Cole o link completo ou o código original enviado no e-mail da sua compra anterior.');
      return;
    }

    setLoading(true);
    try {
      const res = await claimLegacyOrder(clean);
      if (!res.ok || !res.data?.success) {
        setError(res.data?.error || 'Não foi possível vincular este pedido.');
        return;
      }
      setSuccessMsg(res.data.message || 'Pedido vinculado à sua conta.');
      setToken('');
      onClaimed();
    } catch {
      setError('Erro de conexão ao vincular o pedido.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4 text-xs">
        <p className="text-zinc-400">
          Comprou antes de criar sua conta? Vincule usando o código original recebido por e-mail.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-[38px] items-center gap-1.5 font-medium text-[#F5EEE9]/80 transition-colors hover:text-[#F5EEE9] cursor-pointer"
        >
          <KeyRound className="size-3.5" />
          <span>{copy.conta.orders.claimToggleCta}</span>
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-[24px] border border-[#7A293D]/45 bg-[#08080c] p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-serif text-lg font-normal text-[#F5EEE9]">{copy.conta.orders.claimBoxTitle}</h3>
          <p className="text-xs leading-relaxed text-zinc-400">
            {copy.conta.orders.claimBoxSubtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
            setSuccessMsg(null);
          }}
          className="text-xs text-zinc-400 transition-colors hover:text-[#F5EEE9] cursor-pointer"
        >
          Fechar
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-950/30 px-3.5 py-2.5 text-xs text-red-200">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/25 px-3.5 py-2.5 text-xs text-emerald-200">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Cole o link do e-mail ou o código de acesso"
          className="flex-1 min-h-[44px] rounded-xl border border-white/[0.1] bg-black/60 px-3.5 py-2.5 font-mono text-base sm:text-xs text-[#F5EEE9] placeholder:text-zinc-500 focus:border-[#90364B] focus:outline-none transition-colors"
        />
        <button type="submit" disabled={loading} className="btn-primary !min-h-[44px] w-full !px-6 sm:w-auto">
          {loading ? 'Validando…' : 'Vincular'}
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        Perdeu o e-mail ou o código original?{' '}
        {onOpenContact ? (
          <button
            type="button"
            onClick={onOpenContact}
            className="text-[#F5EEE9]/80 underline underline-offset-4 hover:text-[#F5EEE9] cursor-pointer"
          >
            Fale com o suporte
          </button>
        ) : (
          <Link href="/contato" className="text-[#90364B] underline underline-offset-4 hover:text-[#F5EEE9]">
            Fale com o suporte
          </Link>
        )}{' '}
        para recuperar sua compra com verificação de titularidade.
      </p>
    </form>
  );
}
