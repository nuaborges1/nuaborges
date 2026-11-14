'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { FinancialInstallment } from '@/lib/financeCanonical';

interface RevertPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  installment: FinancialInstallment | null;
  reason: string;
  setReason: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export function RevertPayModal({
  isOpen,
  onClose,
  installment,
  reason,
  setReason,
  onSubmit,
  isSubmitting,
}: RevertPayModalProps) {
  if (!isOpen || !installment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overscroll-contain">
      <div className="relative w-full max-w-md bg-zinc-950 border border-rose-900/40 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent" />

        <div className="flex items-center gap-3 mb-4">
          <span className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-white">Reverter Quitação</h3>
            <p className="text-xs text-zinc-400">
              Parcela #{installment.number} ({installment.referenceMonth})
            </p>
          </div>
        </div>

        <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
          Você está prestes a reabrir a Parcela #{installment.number}. O status voltará a ser{' '}
          <strong className="text-amber-300">Pendente / A vencer</strong> e a cliente voltará a ver o
          botão de pagamento no painel dela.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
              Motivo da Reversão (opcional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Baixa dada por engano, estorno solicitado"
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-semibold text-xs tracking-wide shadow-lg shadow-rose-500/20 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Revertendo...' : 'Sim, Reverter Quitação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
