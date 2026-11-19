/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import { CheckCircle2, Clock, FileText, QrCode, RefreshCw } from 'lucide-react';
import {
  FinancialInstallment,
  formatCurrencyBrl,
  formatIsoToBrDateTime,
  getInstallmentStatusInfo,
} from '@/lib/financeCanonical';

interface InstallmentsListProps {
  installments: FinancialInstallment[];
  currentId?: string;
  isLoading: boolean;
  onRefresh: () => void;
  onPay: (inst: FinancialInstallment) => void;
  onOpenReceipt: (inst: FinancialInstallment) => void;
}

export function InstallmentsList({
  installments,
  currentId,
  isLoading,
  onRefresh,
  onPay,
  onOpenReceipt,
}: InstallmentsListProps) {
  return (
    <div className="bg-zinc-950 border border-zinc-800/90 rounded-3xl p-6 sm:p-8 shadow-xl">
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-zinc-800/80">
        <div>
          <h3 className="font-serif text-lg sm:text-xl text-white font-normal">
            Pagamentos
          </h3>
          <p className="text-xs text-zinc-400 font-light mt-0.5">
            Acompanhamento de todas as 10 mensalidades do contrato.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
          title="Atualizar pagamentos"
          aria-label="Atualizar pagamentos"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#843C52]' : ''}`} />
        </button>
      </div>

      {/* Lista das Parcelas */}
      <div className="divide-y divide-zinc-850">
        {installments.map((inst) => {
          const paid = inst.status === 'paid';
          const inProcess = inst.status === 'in_process';
          const instStatus = getInstallmentStatusInfo(inst);

          return (
            <div
              key={inst.id}
              className="py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-900/30 -mx-3 px-3 rounded-2xl transition-colors"
            >
              {/* Referência e Vencimento */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-mono font-bold ${
                    paid
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}
                >
                  {inst.number}
                </div>
                <div>
                  <span className="text-sm font-semibold text-white block">
                    {inst.referenceMonth}
                  </span>
                  <span className="text-[11px] text-zinc-500 block">
                    {paid && inst.paidAt
                      ? `Pago em ${formatIsoToBrDateTime(inst.paidAt)}`
                      : `Vencimento: ${inst.dueDateFormatted}`}
                  </span>
                </div>
              </div>

              {/* Valor, Status e Ação */}
              <div className="flex items-center justify-between sm:justify-end gap-3.5 pl-11 sm:pl-0">
                <span className="font-mono font-medium text-white text-sm">
                  {formatCurrencyBrl(inst.amount)}
                </span>

                {paid ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-[11px] font-semibold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Pago</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => onOpenReceipt(inst)}
                      className="inline-flex items-center gap-1.5 py-1 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-[#843C52] hover:text-white transition-colors cursor-pointer"
                      title="Ver comprovante"
                    >
                      <FileText className="w-3 h-3" />
                      <span>Comprovante</span>
                    </button>
                  </div>
                ) : inProcess ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 text-[11px] font-semibold">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>Processando</span>
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                        instStatus.isOverdue
                          ? 'bg-rose-500/10 border-rose-500/25 text-rose-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      } text-[11px]`}
                    >
                      {instStatus.isOverdue && <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />}
                      <span>{instStatus.isOverdue ? 'Vencida' : 'A vencer'}</span>
                    </span>

                    {/* Se for a próxima a vencer ou vencida, permite pagar direto da linha */}
                    {inst.id === currentId && (
                      <button
                        type="button"
                        onClick={() => onPay(inst)}
                        className="py-1 px-3 rounded-lg bg-[#843C52] hover:bg-[#df8fa1] text-white text-[11px] uppercase tracking-wide transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <QrCode className="w-3 h-3 text-zinc-950" />
                        <span>Pagar</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
