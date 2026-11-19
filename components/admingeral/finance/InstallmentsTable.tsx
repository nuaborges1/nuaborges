/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import {
  CheckCircle2,
  Clock,
  RotateCcw,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import {
  FinancialInstallment,
  formatCurrencyBrl,
  formatIsoToBrDate,
  formatIsoToBrDateTime,
  getInstallmentStatusInfo,
} from '@/lib/financeCanonical';

interface InstallmentsTableProps {
  installments: FinancialInstallment[];
  nextNum: number;
  onViewReceipt: (inst: FinancialInstallment) => void;
  onOpenRevert: (inst: FinancialInstallment) => void;
  onOpenManualPay: (inst: FinancialInstallment) => void;
}

export function InstallmentsTable({
  installments,
  nextNum,
  onViewReceipt,
  onOpenRevert,
  onOpenManualPay,
}: InstallmentsTableProps) {
  return (
    <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl">
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold text-white tracking-wide uppercase font-mono">
            Cronograma das 10 Parcelas
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
            10 x R$ 200,00
          </span>
        </div>
        <span className="text-xs text-zinc-400 hidden sm:inline">
          Clique em &quot;Baixa&quot; para registrar pagamentos manuais ou &quot;Recibo&quot; para emitir o comprovante.
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-800/80 bg-zinc-900/40 text-zinc-400 font-mono uppercase tracking-wider text-[11px]">
              <th className="py-3.5 px-4 font-semibold">#</th>
              <th className="py-3.5 px-4 font-semibold">Mês Referência</th>
              <th className="py-3.5 px-4 font-semibold">Vencimento</th>
              <th className="py-3.5 px-4 font-semibold">Valor</th>
              <th className="py-3.5 px-4 font-semibold">Status</th>
              <th className="py-3.5 px-4 font-semibold">Método / Transação</th>
              <th className="py-3.5 px-4 font-semibold">Data Quitação</th>
              <th className="py-3.5 px-4 font-semibold text-right">Ações de Gestão</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-sans">
            {installments.map((inst) => {
              const statusInfo = getInstallmentStatusInfo(inst);
              const isPaid = inst.status === 'paid';
              const isCurrentNext = !isPaid && inst.number === nextNum;

              return (
                <tr
                  key={inst.number}
                  className={`transition-colors ${
                    isCurrentNext
                      ? 'bg-[#843C52]/5 hover:bg-[#843C52]/10'
                      : isPaid
                      ? 'hover:bg-zinc-900/40'
                      : 'hover:bg-zinc-900/30'
                  }`}
                >
                  {/* Parcela Number */}
                  <td className="py-3.5 px-4 font-mono font-bold text-zinc-300">
                    <span className="text-zinc-500 font-normal">#</span>
                    {String(inst.number).padStart(2, '0')}
                  </td>

                  {/* Mês Referência */}
                  <td className="py-3.5 px-4 font-medium text-white">
                    {inst.referenceMonth}
                    {isCurrentNext && (
                      <span className="ml-2 px-1.5 py-0.2 rounded text-[10px] font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        Próxima
                      </span>
                    )}
                  </td>

                  {/* Vencimento */}
                  <td className="py-3.5 px-4 font-mono text-zinc-300">
                    {formatIsoToBrDate(inst.dueDate)}
                  </td>

                  {/* Valor */}
                  <td className="py-3.5 px-4 font-mono font-semibold text-white">
                    {formatCurrencyBrl(inst.amount)}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4">
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Quitada
                      </span>
                    ) : statusInfo.isOverdue ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-400">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        Vencida
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-800 border border-zinc-700 text-zinc-300">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        {statusInfo.label}
                      </span>
                    )}
                  </td>

                  {/* Método / Transação */}
                  <td className="py-3.5 px-4 font-mono text-zinc-400 text-[11px]">
                    {isPaid ? (
                      <div>
                        <span className="text-zinc-200 font-semibold uppercase">
                          {inst.paymentMethod === 'pix'
                            ? 'Pix'
                            : inst.paymentMethod === 'credit_card'
                            ? 'Cartão'
                            : inst.paymentMethod || 'Manual'}
                        </span>
                        {inst.paymentId && (
                          <div className="text-zinc-500 truncate max-w-[140px]" title={inst.paymentId}>
                            ID: {inst.paymentId}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>

                  {/* Data de Quitação */}
                  <td className="py-3.5 px-4 font-mono text-zinc-300 text-[11px]">
                    {inst.paidAt ? formatIsoToBrDateTime(inst.paidAt) : '—'}
                  </td>

                  {/* Ações */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isPaid ? (
                        <>
                          {/* Ver Recibo */}
                          <button
                            onClick={() => onViewReceipt(inst)}
                            className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 transition-colors flex items-center gap-1 cursor-pointer"
                            title="Visualizar e Baixar Comprovante em PDF"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#843C52]" />
                            <span>Recibo</span>
                          </button>

                          {/* Reverter Quitação */}
                          <button
                            onClick={() => onOpenRevert(inst)}
                            className="p-1.5 rounded-xl bg-zinc-900 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition-colors cursor-pointer"
                            title="Reverter quitação (marcar como pendente/a vencer)"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Dar Baixa Manual */}
                          <button
                            onClick={() => onOpenManualPay(inst)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
                            title="Registrar recebimento manual desta parcela"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Dar Baixa</span>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
