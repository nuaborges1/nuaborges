/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, CheckCircle2, ShieldCheck, FileText, Calendar, CreditCard, Hash } from 'lucide-react';
import { FinancialInstallment, formatCurrencyBrl, formatIsoToBrDateTime } from '@/lib/financeCanonical';
import { downloadReceiptPdf } from '@/lib/generateReceiptPdf';
import { useScrollLock } from '@/hooks/useScrollLock';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  installment: FinancialInstallment | null;
}

export function ReceiptModal({ isOpen, onClose, installment }: ReceiptModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useScrollLock(isOpen && !!installment);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !installment || !mounted) return null;

  const handleDownload = () => {
    downloadReceiptPdf(installment);
  };

  const isPaid = installment.status === 'paid';

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto overscroll-contain">
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
          className="relative w-full max-w-lg bg-[#171821] border border-white/[0.08] rounded-xl p-5 sm:p-6 shadow-2xl z-10 overflow-hidden text-left"
        >
          {/* Header Accent Line */}
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#843C52] to-transparent" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Fechar comprovante"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Title & Badge */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-lg bg-[#843C52]/10 border border-[#843C52]/20 text-[#843C52]">
              <FileText className="w-3.5 h-3.5" />
            </span>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#843C52]">
              NUA BORGES · COMPROVANTE
            </span>
          </div>

          <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight mb-0.5">
            Comprovante de Pagamento
          </h2>
          <p className="text-xs text-zinc-400 font-light mb-4">
            Documento de quitação emitido referente aos serviços contratados.
          </p>

          {/* Status Box */}
          <div
            className={`p-3.5 rounded-lg mb-4 border flex items-center justify-between gap-3 ${
              isPaid
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
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
            <span className="text-base font-bold font-mono text-white">
              {formatCurrencyBrl(installment.amount)}
            </span>
          </div>

          {/* Receipt Data Grid */}
          <div className="bg-[#101116] border border-white/[0.06] rounded-lg p-3.5 sm:p-4 space-y-2.5 text-xs mb-4">
            <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
              <span className="text-zinc-400">Referência</span>
              <span className="font-semibold text-white">
                {installment.label} — {installment.referenceMonth}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
              <span className="text-zinc-400">Vencimento Original</span>
              <span className="font-mono text-zinc-200">{installment.dueDateFormatted}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
              <span className="text-zinc-400">Método de Liquidação</span>
              <span className="font-medium text-zinc-200 uppercase">
                {installment.paymentMethod || 'Mercado Pago (Pix / Cartão)'}
              </span>
            </div>

            {installment.paymentId && (
              <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
                <span className="text-zinc-400">ID da Transação (MP)</span>
                <span className="font-mono text-zinc-300 text-[11px]">
                  {installment.paymentId}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
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
            <div className="p-2.5 rounded-lg bg-[#101116] border border-white/[0.06] mb-5 flex items-start gap-2 text-[10px] text-zinc-500 font-mono break-all">
              <ShieldCheck className="w-3.5 h-3.5 text-[#843C52] shrink-0 mt-0.5" />
              <span>Hash de Autenticidade: {installment.receiptHash}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 h-8 px-4 rounded-full bg-[#843C52] hover:bg-[#992b4a] text-white font-semibold text-xs transition shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Comprovante (PDF)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] text-xs font-medium transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
