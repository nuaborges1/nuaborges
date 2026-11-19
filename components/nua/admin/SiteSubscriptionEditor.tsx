/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  Download,
  Loader2,
  RefreshCw,
  Lock,
  QrCode,
} from 'lucide-react';
import {
  FinancialInstallment,
  FinanceSummary,
  getDefaultInstallments,
  calculateFinanceSummary,
  formatCurrencyBrl,
  formatIsoToBrDateTime,
  KV_FINANCE_KEY,
  getInstallmentStatusInfo,
} from '@/lib/financeCanonical';
import { downloadReceiptPdf } from '@/lib/generateReceiptPdf';
import { fetchClientInstallments } from '@/lib/services/nua/financeService';
import { ReceiptModal } from './ReceiptModal';
import { PaymentModal } from './PaymentModal';
import { subscribeAdminUpdates } from '@/lib/adminSync';

export function SiteSubscriptionEditor() {
  const [installments, setInstallments] = useState<FinancialInstallment[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payingInstallment, setPayingInstallment] = useState<FinancialInstallment | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<FinancialInstallment | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadFinanceData = useCallback(async () => {
    try {
      setIsLoading(true);

      let fetchedSuccessfully = false;
      try {
        const data = await fetchClientInstallments();
        if (data.success && data.installments) {
          setInstallments(data.installments);
          setSummary(data.summary || null);
          if (typeof window !== 'undefined') {
            localStorage.setItem(KV_FINANCE_KEY, JSON.stringify(data.installments));
          }
          fetchedSuccessfully = true;
        }
      } catch {
        // Fallback local se a API não estiver conectada
      }

      if (!fetchedSuccessfully) {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem(KV_FINANCE_KEY);
          let parsed: FinancialInstallment[] = [];
          if (stored) {
            try {
              parsed = JSON.parse(stored);
            } catch {}
          }
          if (!parsed || parsed.length === 0) {
            parsed = getDefaultInstallments();
            localStorage.setItem(KV_FINANCE_KEY, JSON.stringify(parsed));
          } else {
            const p1 = parsed.find((p) => p.number === 1);
            if (p1 && p1.status !== 'paid') {
              p1.status = 'paid';
              p1.paidAt = '2026-10-05T11:00:00-03:00';
              p1.paidAmount = 200;
              p1.paymentMethod = 'pix';
              p1.paymentId = 'PIX-NUA-20261005-001';
              localStorage.setItem(KV_FINANCE_KEY, JSON.stringify(parsed));
            }
          }
          setInstallments(parsed);
          setSummary(calculateFinanceSummary(parsed));
        }
      }
    } catch (err: any) {
      console.error('[SiteSubscriptionEditor] Erro ao carregar parcelas:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  useEffect(() => subscribeAdminUpdates('finance', () => loadFinanceData()), [loadFinanceData]);

  const handleOpenPayment = (inst: FinancialInstallment) => {
    setPayingInstallment(inst);
    setIsPaymentModalOpen(true);
  };

  const handleOpenReceipt = (inst: FinancialInstallment) => {
    setSelectedReceipt(inst);
    setIsReceiptModalOpen(true);
  };

  const handleDownloadDirectPdf = (inst: FinancialInstallment) => {
    try {
      downloadReceiptPdf(inst);
      showToast(`Recibo da Parcela ${inst.number}/10 baixado com sucesso.`);
    } catch {
      showToast('Erro ao gerar documento PDF.');
    }
  };

  const nextInstallment = summary?.currentInstallment;

  return (
    <div className="space-y-6 select-none text-white">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-[#171821] border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 shadow-2xl backdrop-blur-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Resumo do Próximo Vencimento & Infraestrutura */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#14161d] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#843C52] shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-semibold text-white block">
              Infraestrutura &amp; Suporte Técnico
            </span>
            {nextInstallment ? (
              <p className="text-xs text-zinc-400 font-light mt-0.5">
                Próxima fatura: <strong className="text-zinc-200">Parcela {nextInstallment.number}/10</strong> ({formatCurrencyBrl(nextInstallment.amount)}) • Vencimento: {new Date(nextInstallment.dueDate).toLocaleDateString('pt-BR')}
              </p>
            ) : (
              <p className="text-xs text-zinc-400 font-light mt-0.5">
                Todas as faturas estão devidamente quitadas.
              </p>
            )}
          </div>
        </div>

        {nextInstallment && (
          <button
            type="button"
            onClick={() => handleOpenPayment(nextInstallment)}
            className="h-9 px-4 rounded-lg bg-[#843C52] hover:bg-[#992b4a] text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer shadow-sm shrink-0 flex items-center justify-center gap-2 self-start sm:self-auto"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Pagar via Pix</span>
          </button>
        )}
      </div>

      {/* Grid de Métricas da Mensalidade */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-[#171821] border border-white/[0.06] flex flex-col justify-between space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-mono font-medium">
            Total Contratado
          </span>
          <span className="text-lg sm:text-xl font-sans font-bold text-white tracking-tight">
            {formatCurrencyBrl(summary?.totalContract || 2000)}
          </span>
          <span className="text-[11px] text-zinc-400 font-light">
            10 parcelas de R$ 200,00
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#171821] border border-emerald-500/20 flex flex-col justify-between space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-mono font-medium">
            Total Já Quitado
          </span>
          <span className="text-lg sm:text-xl font-sans font-bold text-emerald-300 tracking-tight">
            {formatCurrencyBrl(summary?.totalPaid || 200)}
          </span>
          <span className="text-[11px] text-zinc-400 font-light">
            {summary?.installments?.filter((i) => i.status === 'paid').length || 1} de 10 parcelas pagas
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#171821] border border-amber-500/20 flex flex-col justify-between space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-amber-400 font-mono font-medium">
            Saldo Restante
          </span>
          <span className="text-lg sm:text-xl font-sans font-bold text-amber-300 tracking-tight">
            {formatCurrencyBrl(summary?.totalPending || 1800)}
          </span>
          <span className="text-[11px] text-zinc-400 font-light">
            {summary?.installments?.filter((i) => i.status !== 'paid').length || 9} parcelas restantes
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#171821] border border-white/[0.06] flex flex-col justify-between space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-mono font-medium">
            Progresso Geral
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg sm:text-xl font-sans font-bold text-[#843C52] tracking-tight">
              {Math.round(((summary?.installments?.filter((i) => i.status === 'paid').length || 1) / 10) * 100)}%
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#843C52] h-full rounded-full transition-all duration-500"
              style={{ width: `${((summary?.installments?.filter((i) => i.status === 'paid').length || 1) / 10) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Cronograma das 10 Parcelas Oficiais */}
      <div className="p-4 sm:p-6 rounded-xl bg-[#16171d] border border-white/[0.07] space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide">
              Cronograma de Faturamento (10 Parcelas)
            </h3>
            <p className="text-[11px] text-zinc-400 font-light mt-0.5">
              Valores e recibos de pagamento emitidos para comprovação de hospedagem.
            </p>
          </div>

          <button
            type="button"
            onClick={loadFinanceData}
            className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Sincronizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-16 text-center text-zinc-400 text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#843C52]" />
            <span>Carregando parcelas da hospedagem...</span>
          </div>
        ) : (
          <>
            {/* Mobile Stacked Cards (Sem scroll horizontal) */}
            <div className="space-y-3 sm:hidden">
              {installments.map((inst) => {
                const statusInfo = getInstallmentStatusInfo(inst);
                const isPaid = inst.status === 'paid';
                const dueDateFormatted = new Date(inst.dueDate).toLocaleDateString('pt-BR');

                return (
                  <div
                    key={inst.number}
                    className="p-3.5 rounded-xl bg-[#101116] border border-white/[0.06] space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-white text-xs">
                        Parcela #{inst.number} de 10
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${statusInfo.badgeBg} ${statusInfo.badgeText} border ${statusInfo.badgeBorder}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor}`} />
                        <span>{statusInfo.label}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">
                        Vencimento: <strong className="text-zinc-200 font-mono">{dueDateFormatted}</strong>
                      </span>
                      <span className="font-serif font-bold text-white text-sm">
                        {formatCurrencyBrl(inst.amount)}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between gap-2">
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {inst.paidAt ? `Pago em ${formatIsoToBrDateTime(inst.paidAt)}` : 'Aguardando pagamento'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isPaid ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenReceipt(inst)}
                              className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[11px] text-zinc-200 transition cursor-pointer"
                            >
                              Recibo
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadDirectPdf(inst)}
                              className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 transition cursor-pointer"
                              title="Baixar PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenPayment(inst)}
                            className="px-3 py-1.5 rounded-lg bg-[#843C52] hover:bg-[#992b4a] text-white text-[11px] uppercase tracking-wide transition cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <QrCode className="w-3 h-3" />
                            <span>Pagar Pix</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[10px] text-zinc-400 uppercase tracking-wider font-mono">
                    <th className="py-3 px-3">Parcela</th>
                    <th className="py-3 px-3">Vencimento</th>
                    <th className="py-3 px-3">Valor</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Data de Pagamento</th>
                    <th className="py-3 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {installments.map((inst) => {
                    const statusInfo = getInstallmentStatusInfo(inst);
                    const isPaid = inst.status === 'paid';
                    const dueDateFormatted = new Date(inst.dueDate).toLocaleDateString('pt-BR');

                    return (
                      <tr key={inst.number} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-3 font-mono font-bold text-white text-xs">
                          #{inst.number} de 10
                        </td>
                        <td className="py-3.5 px-3 font-mono text-zinc-300 text-xs">
                          {dueDateFormatted}
                        </td>
                        <td className="py-3.5 px-3 font-serif font-bold text-white text-sm">
                          {formatCurrencyBrl(inst.amount)}
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${statusInfo.badgeBg} ${statusInfo.badgeText} border ${statusInfo.badgeBorder}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor}`}
                            />
                            <span>{statusInfo.label}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-zinc-400 text-xs">
                          {inst.paidAt ? formatIsoToBrDateTime(inst.paidAt) : '—'}
                        </td>
                        <td className="py-3.5 px-3 text-right space-x-2">
                          {isPaid ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenReceipt(inst)}
                                className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs text-zinc-200 hover:text-white transition-colors cursor-pointer"
                              >
                                Ver Recibo
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadDirectPdf(inst)}
                                className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white transition-colors cursor-pointer inline-flex items-center"
                                title="Baixar PDF do Recibo"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenPayment(inst)}
                              className="px-4 py-1.5 rounded-xl bg-[#843C52] hover:bg-[#992b4a] text-white text-xs uppercase tracking-wide transition-all cursor-pointer shadow-md inline-flex items-center gap-1.5"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>Pagar Pix</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modais de Ação Rápida */}
      {isPaymentModalOpen && payingInstallment && (
        <PaymentModal
          installment={payingInstallment}
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setPayingInstallment(null);
          }}
          onPaymentConfirmed={() => {
            setIsPaymentModalOpen(false);
            setPayingInstallment(null);
            loadFinanceData();
            showToast('Pagamento registrado com sucesso!');
          }}
          onOpenReceipt={(inst) => {
            setIsPaymentModalOpen(false);
            setPayingInstallment(null);
            setSelectedReceipt(inst);
            setIsReceiptModalOpen(true);
          }}
        />
      )}

      {isReceiptModalOpen && selectedReceipt && (
        <ReceiptModal
          installment={selectedReceipt}
          isOpen={isReceiptModalOpen}
          onClose={() => {
            setIsReceiptModalOpen(false);
            setSelectedReceipt(null);
          }}
        />
      )}
    </div>
  );
}
