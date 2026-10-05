'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, CheckCircle2, ShieldCheck, FileText, Calendar, CreditCard, Hash } from 'lucide-react';
import { FinancialInstallment, formatCurrencyBrl, formatIsoToBrDateTime } from '@/lib/financeCanonical';
import { downloadReceiptPdf } from '@/lib/generateReceiptPdf';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  installment: FinancialInstallment | null;
}

export function ReceiptModal({ isOpen, onClose, installment }: ReceiptModalProps) {
  if (!isOpen || !installment) return null;

  const handleDownload = () => {
    downloadReceiptPdf(installment);
  };

  const isPaid = installment.status === 'paid';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 overflow-hidden text-left"
        >
          {/* Header Accent Line */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#f4a7b9] to-transparent" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
            aria-label="Fechar comprovante"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Title & Badge */}
          <div className="flex items-center gap-2.5 mb-2">
            <span className="p-2 rounded-xl bg-[#f4a7b9]/10 border border-[#f4a7b9]/20 text-[#f4a7b9]">
              <FileText className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#f4a7b9]">
              NUA BORGES · COMPROVANTE
            </span>
          </div>

          <h2 className="font-serif text-xl sm:text-2xl text-white font-normal mb-1">
            Comprovante de Pagamento
          </h2>
          <p className="text-xs text-zinc-400 font-light mb-6">
            Documento de quitação emitido referente aos serviços contratados.
          </p>

          {/* Status Box */}
          <div
            className={`p-4 rounded-2xl mb-6 border flex items-center justify-between gap-3 ${
              isPaid
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div>
                <span className="text-xs font-bold block">
                  {isPaid ? 'Pagamento Confirmado' : 'Pagamento em Processamento'}
                </span>
                <span className="text-[11px] opacity-80">
                  {isPaid
                    ? `Liquidado em ${formatIsoToBrDateTime(installment.paidAt)}`
                    : `Vencimento: ${installment.dueDateFormatted}`}
                </span>
              </div>
            </div>
            <span className="text-lg font-bold font-mono text-white">
              {formatCurrencyBrl(installment.amount)}
            </span>
          </div>

          {/* Receipt Data Grid */}
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-3.5 text-xs mb-6">
            <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
              <span className="text-zinc-400">Referência</span>
              <span className="font-semibold text-white">
                {installment.label} — {installment.referenceMonth}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
              <span className="text-zinc-400">Vencimento Original</span>
              <span className="font-mono text-zinc-200">{installment.dueDateFormatted}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
              <span className="text-zinc-400">Método de Liquidação</span>
              <span className="font-medium text-zinc-200 uppercase">
                {installment.paymentMethod || 'Mercado Pago (Pix / Cartão)'}
              </span>
            </div>

            {installment.paymentId && (
              <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">ID da Transação (MP)</span>
                <span className="font-mono text-zinc-300 text-[11px]">
                  {installment.paymentId}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
              <span className="text-zinc-400">Contratante (Cliente)</span>
              <span className="text-right text-zinc-200">
                Nayara Borges da Costa (Nua Borges)
              </span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-zinc-400">Contratado (Dev)</span>
              <span className="text-right text-zinc-200">
                João Philippe de Oliveira Boechat
              </span>
            </div>
          </div>

          {/* Authenticity Hash */}
          {installment.receiptHash && (
            <div className="p-3 rounded-xl bg-zinc-900/30 border border-zinc-800/50 mb-6 flex items-start gap-2 text-[10px] text-zinc-500 font-mono break-all">
              <ShieldCheck className="w-3.5 h-3.5 text-[#f4a7b9] shrink-0 mt-0.5" />
              <span>Hash de Autenticidade: {installment.receiptHash}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-full bg-[#f4a7b9] hover:bg-[#df8fa1] text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all shadow-[0_2px_14px_rgba(244,167,185,0.25)] cursor-pointer min-h-[44px]"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Comprovante (PDF)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-3 px-5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium text-xs transition-colors cursor-pointer min-h-[44px]"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
