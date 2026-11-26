'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, KeyRound } from 'lucide-react';
import { claimLegacyOrder } from '@/lib/nuaIdClient';

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
      const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://nuaborges.com.br/${trimmed.replace(/^\/+/, '')}`;
      const url = new URL(normalized);
      const fromQuery = url.searchParams.get('token') || url.searchParams.get('t') || url.searchParams.get('purchaseToken');
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
      <div className="flex flex-col items-start justify-between gap-3 rounded-[28px] border border-white/[0.08] bg-[#08080c] p-5 sm:flex-row sm:items-center shadow-[0_16px_50px_rgba(0,0,0,0.85)]">
        <div>
          <p className="text-sm font-medium text-[#F5EEE9]">Comprou antes de criar sua conta?</p>
          <p className="text-xs text-zinc-400">
            Vincule compras antigas usando o código de acesso original que você recebeu por e-mail.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-[42px] w-full sm:w-auto shrink-0 items-center justify-center gap-1.5 rounded-full border border-[#90364B]/45 bg-[#431322]/40 px-5 py-2 text-xs font-medium text-[#F5EEE9] transition-colors hover:bg-[#661C30] touch-manipulation cursor-pointer"
        >
          <KeyRound className="h-3.5 w-3.5" />
          Vincular compra anterior
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-[28px] border border-[#661C30]/50 bg-[#08080c] p-5 sm:p-6 shadow-[0_16px_50px_rgba(0,0,0,0.85)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-base text-[#F5EEE9]">Vincular compra anterior</h3>
          <p className="mt-0.5 text-xs text-zinc-400">
            Você pode colar o link completo recebido no e-mail da compra ou apenas o código de acesso.
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
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/35 px-3.5 py-2.5 text-xs text-rose-200">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3.5 py-2.5 text-xs text-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Cole o link do e-mail ou o código de acesso"
          className="flex-1 min-h-[44px] rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 font-mono text-base sm:text-xs text-[#F5EEE9] placeholder:text-zinc-600 focus:border-[#90364B] focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={loading}
          className="min-h-[44px] w-full sm:w-auto rounded-full border border-white/10 bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#54182b] hover:via-[#7A293D] hover:to-[#90364B] hover:border-white/25 hover:shadow-[0_6px_26px_rgba(102,28,48,0.5)] active:scale-[0.985] px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#F5EEE9] shadow-[0_4px_20px_rgba(67,19,34,0.45)] transition-all duration-200 disabled:opacity-45 disabled:cursor-not-allowed touch-manipulation cursor-pointer"
        >
          {loading ? 'Validando...' : 'Vincular'}
        </button>
      </div>
      <p className="text-[11px] text-zinc-500">
        Perdeu o e-mail ou o código original?{' '}
        {onOpenContact ? (
          <button
            type="button"
            onClick={onOpenContact}
            className="text-[#C97A8D] underline underline-offset-2 hover:text-[#F5EEE9] cursor-pointer"
          >
            Fale com o suporte
          </button>
        ) : (
          <Link href="/contato" className="text-[#C97A8D] underline underline-offset-2 hover:text-[#F5EEE9]">
            Fale com o suporte
          </Link>
        )}{' '}
        para recuperar sua compra com verificação de titularidade.
      </p>
    </form>
  );
}
