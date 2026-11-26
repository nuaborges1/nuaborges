/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import {
  FileText,
  Download,
  ShieldCheck,
  QrCode,
} from 'lucide-react';
import {
  FinancialInstallment,
  formatCurrencyBrl,
  formatIsoToBrDateTime,
  getInstallmentStatusInfo,
} from '@/lib/financeCanonical';

interface CurrentInstallmentCardProps {
  current: FinancialInstallment;
  onPay: (inst: FinancialInstallment) => void;
  onOpenReceipt: (inst: FinancialInstallment) => void;
  onDownloadReceipt: (inst: FinancialInstallment) => void;
}

export function CurrentInstallmentCard({
  current,
  onPay,
  onOpenReceipt,
  onDownloadReceipt,
}: CurrentInstallmentCardProps) {
  const isCurrentPaid = current.status === 'paid';
  const currentStatus = getInstallmentStatusInfo(current);

  return (
    <div className="bg-zinc-950 border border-zinc-800/90 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
      {/* Subtle top accent */}
      <div
        className={`absolute top-0 inset-x-0 h-1.5 ${
          isCurrentPaid
            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
            : currentStatus?.isOverdue
            ? 'bg-gradient-to-r from-rose-500 to-red-400'
            : 'bg-gradient-to-r from-emerald-500 via-[#843C52] to-teal-400'
        }`}
      />

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#843C52] block mb-1">
            {isCurrentPaid
              ? 'MENSALIDADE QUITADA'
              : currentStatus?.isOverdue
              ? 'MENSALIDADE VENCIDA'
              : 'PRÓXIMO VENCIMENTO · EM DIA'}
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl text-white font-normal">
            {current.label} — {current.referenceMonth}
          </h2>
          <p className="text-xs text-zinc-400 font-light mt-1">
            Manutenção do site, hospedagem e suporte técnico.
          </p>
        </div>

        {/* Status Badge */}
        <div className="shrink-0">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border ${currentStatus?.badgeBg} ${currentStatus?.badgeBorder} ${currentStatus?.badgeText} text-xs font-semibold`}
          >
            <span className={`w-2 h-2 rounded-full ${currentStatus?.dotColor}`} />
            <span>{currentStatus?.label}</span>
          </div>
        </div>
      </div>

      {/* Valor e Data */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 sm:p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-zinc-500 text-[11px] uppercase tracking-wider block mb-0.5">
            Valor da Parcela
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-bold font-mono text-white tracking-tight">
              {formatCurrencyBrl(current.amount)}
            </span>
            <span className="text-zinc-400 text-xs font-light">(duzentos reais)</span>
          </div>
        </div>

        <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-800/60">
          {isCurrentPaid ? (
            <>
              <span className="text-zinc-500 text-[11px] uppercase tracking-wider block mb-0.5">
                Data de Quitação
              </span>
              <span className="font-mono text-emerald-300 font-semibold text-sm">
                {formatIsoToBrDateTime(current.paidAt)}
              </span>
            </>
          ) : (
            <>
              <span className="text-zinc-500 text-[11px] uppercase tracking-wider block mb-0.5">
                Data de Vencimento
              </span>
              <span className="font-mono text-zinc-200 font-semibold text-sm">
                {current.dueDateFormatted}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Botões de Ação Principais */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {!isCurrentPaid ? (
          <button
            type="button"
            onClick={() => onPay(current)}
            className="flex-1 inline-flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl bg-[#843C52] hover:bg-[#661C30] active:scale-[0.99] text-white text-sm uppercase tracking-wider transition-all shadow-[0_2px_20px_rgba(102,28,48,0.35)] cursor-pointer min-h-[52px]"
          >
            <QrCode className="w-5 h-5 text-zinc-950" />
            <span>
              {currentStatus?.isOverdue
                ? 'Regularizar mensalidade (Pix QR Code)'
                : 'Pagar mensalidade antecipada (Pix QR Code)'}
            </span>
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onOpenReceipt(current)}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 text-white font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer min-h-[48px]"
            >
              <FileText className="w-4 h-4 text-[#843C52]" />
              <span>Ver comprovante</span>
            </button>

            <button
              type="button"
              onClick={() => onDownloadReceipt(current)}
              className="inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-[#843C52]/15 border border-[#843C52]/30 hover:bg-[#843C52]/25 text-[#843C52] font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer min-h-[48px]"
            >
              <Download className="w-4 h-4" />
              <span>Baixar comprovante</span>
            </button>
          </>
        )}
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-zinc-500">
        <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
        <span>Processamento seguro Mercado Pago · Pix, Cartão e Boleto sem cobrança recorrente</span>
      </div>
    </div>
  );
}
