'use client';

import React from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { FinancialInstallment } from '@/lib/financeCanonical';

interface ManualPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  installment: FinancialInstallment | null;
  amount: number;
  setAmount: (v: number) => void;
  date: string;
  setDate: (v: string) => void;
  method: string;
  setMethod: (v: string) => void;
  id: string;
  setId: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export function ManualPayModal({
  isOpen,
  onClose,
  installment,
  amount,
  setAmount,
  date,
  setDate,
  method,
  setMethod,
  id,
  setId,
  notes,
  setNotes,
  onSubmit,
  isSubmitting,
}: ManualPayModalProps) {
  if (!isOpen || !installment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overscroll-contain">
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-white">Dar Baixa Manual</h3>
              <p className="text-xs text-zinc-400">
                Parcela #{installment.number} · {installment.referenceMonth}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Valor */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
              Valor Recebido (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {/* Data e Hora */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
              Data e Hora do Pagamento
            </label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {/* Método */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
              Canal / Forma de Recebimento
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="pix">Pix Direto no Banco (Nubank / Itaú / Inter)</option>
              <option value="bank_transfer">Transferência Bancária (TED / DOC)</option>
              <option value="credit_card">Cartão de Crédito</option>
              <option value="mercadopago">Mercado Pago (Confirmado manualmente)</option>
              <option value="cash">Dinheiro em mãos</option>
              <option value="other">Outro método</option>
            </select>
          </div>

          {/* Identificador / ID Transação */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
              Código / Comprovante (opcional)
            </label>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="Ex: E2E Pix ou Código de Autorização"
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
              Observações Internas
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Comprovante verificado no WhatsApp"
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
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
              className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs tracking-wide shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Gravando...' : 'Confirmar Quitação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
