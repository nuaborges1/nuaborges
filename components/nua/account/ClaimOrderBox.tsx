'use client';

import React, { useState } from 'react';
import { CheckCircle2, KeyRound } from 'lucide-react';
import { claimLegacyOrder } from '@/lib/nuaIdClient';

interface ClaimOrderBoxProps {
  onClaimed: () => void;
}

export function ClaimOrderBox({ onClaimed }: ClaimOrderBoxProps) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    const clean = token.trim();
    if (clean.length < 8) {
      setError('Cole o código/token original enviado no e-mail da sua compra anterior.');
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
      <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-white/[0.07] bg-[#140f13]/80 p-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-[#F5EEE9]">Comprou antes de criar sua conta?</p>
          <p className="text-xs text-zinc-400">
            Vincule compras antigas usando o código de acesso original que você recebeu por e-mail.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#90364B]/45 bg-[#431322]/40 px-4 py-2 text-xs font-medium text-[#F5EEE9] transition-colors hover:bg-[#661C30]"
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
      className="space-y-3 rounded-2xl border border-[#7A293D]/40 bg-[#171115] p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-base text-[#F5EEE9]">Vincular compra anterior</h3>
          <p className="mt-0.5 text-xs text-zinc-400">
            Por segurança, exigimos o token original da compra além da sua conta verificada.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
            setSuccessMsg(null);
          }}
          className="text-xs text-zinc-400 hover:text-[#F5EEE9]"
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
          placeholder="Ex: ptok_... ou tok_..."
          className="flex-1 rounded-xl border border-white/10 bg-[#0b090c] px-3.5 py-2.5 font-mono text-xs text-[#F5EEE9] placeholder:text-zinc-600 focus:border-[#90364B] focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-[#661C30] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#F5EEE9] transition-colors hover:bg-[#7A293D] disabled:opacity-50"
        >
          {loading ? 'Validando...' : 'Vincular'}
        </button>
      </div>
    </form>
  );
}
