'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  RotateCcw,
  FileText,
  ShieldCheck,
  Check,
  ExternalLink,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  Download,
  X,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  FinancialInstallment,
  FinancialSummary,
  formatCurrencyBrl,
  formatIsoToBrDate,
  formatIsoToBrDateTime,
  getInstallmentStatusInfo,
  calculateFinanceSummary,
  getDefaultInstallments,
} from '@/lib/financeCanonical';
import { ReceiptModal } from '@/components/admin/ReceiptModal';

interface FinanceAdminManagerProps {
  fetchFromApi: (path: string, options?: RequestInit) => Promise<Response>;
  masterKey?: string;
  targetApiUrl?: string;
  onRefreshGlobal?: () => void;
}

export function FinanceAdminManager({
  fetchFromApi,
  masterKey,
  targetApiUrl,
  onRefreshGlobal,
}: FinanceAdminManagerProps) {
  const [installments, setInstallments] = useState<FinancialInstallment[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [mpStatus, setMpStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncingMp, setIsSyncingMp] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Modais
  const [selectedReceipt, setSelectedReceipt] = useState<FinancialInstallment | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);

  const [manualPayModalOpen, setManualPayModalOpen] = useState<boolean>(false);
  const [selectedForManualPay, setSelectedForManualPay] = useState<FinancialInstallment | null>(null);
  const [manualPayMethod, setManualPayMethod] = useState<string>('pix');
  const [manualPayDate, setManualPayDate] = useState<string>('');
  const [manualPayAmount, setManualPayAmount] = useState<number>(200);
  const [manualPayId, setManualPayId] = useState<string>('');
  const [manualPayNotes, setManualPayNotes] = useState<string>('');

  const [revertModalOpen, setRevertModalOpen] = useState<boolean>(false);
  const [selectedForRevert, setSelectedForRevert] = useState<FinancialInstallment | null>(null);
  const [revertReason, setRevertReason] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 1. Carrega dados do endpoint de finanças
  const loadFinanceData = useCallback(async () => {
    setIsLoading(true);
    setSyncFeedback(null);
    try {
      const res = await fetchFromApi('/api/finance/admin');
      if (res.ok) {
        const data = await res.json();
        if (data.installments) {
          setInstallments(data.installments);
          setSummary(data.summary || calculateFinanceSummary(data.installments));
        }
        if (data.mercadopago) {
          setMpStatus(data.mercadopago);
        }
      } else {
        // Fallback local se a rota ainda não respondeu
        const def = getDefaultInstallments();
        setInstallments(def);
        setSummary(calculateFinanceSummary(def));
      }
    } catch (err) {
      console.error('[FinanceAdmin] Erro ao carregar dados:', err);
      const def = getDefaultInstallments();
      setInstallments(def);
      setSummary(calculateFinanceSummary(def));
    } finally {
      setIsLoading(false);
    }
  }, [fetchFromApi]);

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  // 2. Ação: Sincronizar com Mercado Pago
  const handleSyncMercadoPago = async () => {
    setIsSyncingMp(true);
    setSyncFeedback(null);
    try {
      const res = await fetchFromApi('/api/finance/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_mp' }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSyncFeedback({
          type: 'success',
          message: data.message || 'Sincronização concluída com sucesso!',
        });
        if (data.installments) {
          setInstallments(data.installments);
          setSummary(data.summary);
        } else {
          await loadFinanceData();
        }
        if (onRefreshGlobal) onRefreshGlobal();
      } else {
        setSyncFeedback({
          type: 'error',
          message: data.error || 'Falha ao sincronizar com Mercado Pago.',
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err.message || 'Erro de conexão ao sincronizar com MP.',
      });
    } finally {
      setIsSyncingMp(false);
    }
  };

  // 3. Ação: Abrir modal de baixa manual
  const openManualPay = (inst: FinancialInstallment) => {
    setSelectedForManualPay(inst);
    setManualPayAmount(inst.amount);
    // Padrão: agora em ISO no fuso local
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setManualPayDate(localIso);
    setManualPayMethod('pix');
    setManualPayId(`PIX-MANUAL-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-P${inst.number}`);
    setManualPayNotes('Recebido via Pix bancário direto.');
    setManualPayModalOpen(true);
  };

  // 4. Confirmar Baixa Manual
  const confirmManualPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForManualPay) return;

    setIsSubmitting(true);
    try {
      const res = await fetchFromApi('/api/finance/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual_pay',
          installmentNumber: selectedForManualPay.number,
          paidAt: manualPayDate ? new Date(manualPayDate).toISOString() : new Date().toISOString(),
          paidAmount: Number(manualPayAmount) || selectedForManualPay.amount,
          paymentMethod: manualPayMethod,
          paymentId: manualPayId,
          notes: manualPayNotes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSyncFeedback({
          type: 'success',
          message: `Parcela #${selectedForManualPay.number} quitada manualmente com sucesso!`,
        });
        setManualPayModalOpen(false);
        await loadFinanceData();
        if (onRefreshGlobal) onRefreshGlobal();
      } else {
        alert(data.error || 'Erro ao registrar baixa manual.');
      }
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Ação: Abrir modal de reversão
  const openRevertModal = (inst: FinancialInstallment) => {
    setSelectedForRevert(inst);
    setRevertReason('');
    setRevertModalOpen(true);
  };

  // 6. Confirmar Reversão de Quitação
  const confirmRevert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForRevert) return;

    setIsSubmitting(true);
    try {
      const res = await fetchFromApi('/api/finance/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revert',
          installmentNumber: selectedForRevert.number,
          reason: revertReason || 'Reversão solicitada pelo gestor.',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSyncFeedback({
          type: 'info',
          message: `Quitação da Parcela #${selectedForRevert.number} foi revertida.`,
        });
        setRevertModalOpen(false);
        await loadFinanceData();
        if (onRefreshGlobal) onRefreshGlobal();
      } else {
        alert(data.error || 'Erro ao reverter quitação.');
      }
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 7. Visualizar comprovante
  const handleViewReceipt = (inst: FinancialInstallment) => {
    setSelectedReceipt(inst);
    setIsReceiptOpen(true);
  };

  // 8. Exportar extrato completo em JSON
  const handleExportStatement = () => {
    const data = {
      contrato: 'NUA BORGES - Desenvolvimento Web Fullstack',
      totalContrato: 2000,
      resumo: summary,
      mercadopago: mpStatus,
      parcelas: installments,
      geradoEm: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extrato-financeiro-nuaborges-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const paidCount = installments.filter((i) => i.status === 'paid').length;
  const pendingCount = installments.length - paidCount;
  const nextNum =
    summary?.currentInstallment?.number ||
    (installments.find((i) => i.status !== 'paid')?.number || 2);
  const remainingBalance =
    summary?.totalPending ?? (2000 - (summary?.totalPaid || 200));

  const percentPaid = summary
    ? Math.round((summary.totalPaid / summary.totalContract) * 100)
    : 10;

  return (
    <div className="space-y-6 text-zinc-100">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-zinc-900/90 via-zinc-950 to-zinc-900/60 border border-zinc-800/80 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-lg bg-[#f4a7b9]/10 border border-[#f4a7b9]/20 text-[#f4a7b9]">
              <DollarSign className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#f4a7b9] font-medium">
              CONTROLE DE PAGAMENTOS · CONTRATO NUA BORGES
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Gestão Financeira & Conciliação
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
            Acompanhe quitações em tempo real, registre baixas manuais fora do Mercado Pago, emita
            comprovantes oficiais e sincronize as 10 parcelas.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSyncMercadoPago}
            disabled={isSyncingMp}
            className="px-4 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold tracking-wide border border-zinc-700/80 transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
            title="Consulta a API do Mercado Pago para buscar pagamentos aprovados"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#f4a7b9] ${isSyncingMp ? 'animate-spin' : ''}`} />
            <span>{isSyncingMp ? 'Sincronizando MP...' : 'Sincronizar Mercado Pago'}</span>
          </button>

          <button
            onClick={loadFinanceData}
            disabled={isLoading}
            className="p-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-all cursor-pointer"
            title="Atualizar dados do servidor"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportStatement}
            className="px-3.5 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium border border-zinc-800 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Exportar extrato em formato JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Extrato</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {syncFeedback && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between border ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : syncFeedback.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-sky-500/10 border-sky-500/30 text-sky-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {syncFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : syncFeedback.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-sky-400 shrink-0" />
            )}
            <span>{syncFeedback.message}</span>
          </div>
          <button
            onClick={() => setSyncFeedback(null)}
            className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Contratado */}
        <div className="p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-medium">Valor Total Contratado</span>
            <FileText className="w-4 h-4 text-[#f4a7b9]" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
              {formatCurrencyBrl(summary?.totalContract || 2000)}
            </div>
            <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5 font-light">
              <span>10 parcelas mensais de R$ 200,00</span>
            </div>
          </div>
          <div className="mt-3 w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#f4a7b9] h-full transition-all duration-500"
              style={{ width: `${percentPaid}%` }}
            />
          </div>
        </div>

        {/* Total Recebido */}
        <div className="p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-medium">Total Já Recebido</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
              {formatCurrencyBrl(summary?.totalPaid || 200)}
            </div>
            <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
              <span className="font-semibold text-emerald-300 font-mono">
                {paidCount}/10
              </span>
              <span>parcelas quitadas ({percentPaid}%)</span>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-zinc-500 font-mono">
            Último: {summary?.lastPaymentDate ? formatIsoToBrDate(summary.lastPaymentDate) : '05/10/2026'}
          </div>
        </div>

        {/* Saldo Restante */}
        <div className="p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-medium">Saldo Restante a Receber</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
              {formatCurrencyBrl(remainingBalance)}
            </div>
            <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
              <span className="font-semibold text-indigo-300 font-mono">
                {pendingCount}
              </span>
              <span>parcelas futuras</span>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-zinc-500 font-mono">
            Término previsto: 04/07/2027
          </div>
        </div>

        {/* Próximo Vencimento & Status MP */}
        <div className="p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-medium">Próximo Vencimento</span>
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-sky-300">
              {summary?.nextDueDate || '04/11/2026'}
            </div>
            <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
              <span>Parcela #{nextNum}</span>
              <span className="text-white font-mono font-medium">· R$ 200,00</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Contrato em dia
            </span>
            {mpStatus?.connected && (
              <span
                className="text-[10px] text-zinc-400 font-mono truncate"
                title={`Mercado Pago Conectado: ${mpStatus.email || mpStatus.nickname}`}
              >
                MP Ativo
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mercado Pago Integration Badge Strip */}
      <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#009ee3]/10 border border-[#009ee3]/20 flex items-center justify-center text-[#009ee3] shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">Gateway Mercado Pago</span>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                PRODUÇÃO ATIVA
              </span>
            </div>
            <p className="text-zinc-400 text-[11px] font-light mt-0.5">
              Conta vinculada: <span className="text-zinc-300 font-mono">philippeboechat1@gmail.com</span> (ID: 1150668342) · Webhooks ativos no Cloudflare
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-zinc-500 font-mono">
            Pix Dinâmico & Cartão integrados
          </span>
        </div>
      </div>

      {/* Main Table: As 10 Parcelas */}
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
                        ? 'bg-[#f4a7b9]/5 hover:bg-[#f4a7b9]/10'
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
                              onClick={() => handleViewReceipt(inst)}
                              className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Visualizar e Baixar Comprovante em PDF"
                            >
                              <FileText className="w-3.5 h-3.5 text-[#f4a7b9]" />
                              <span>Recibo</span>
                            </button>

                            {/* Reverter Quitação */}
                            <button
                              onClick={() => openRevertModal(inst)}
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
                              onClick={() => openManualPay(inst)}
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

      {/* Modal de Baixa Manual */}
      {manualPayModalOpen && selectedForManualPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
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
                    Parcela #{selectedForManualPay.number} · {selectedForManualPay.referenceMonth}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setManualPayModalOpen(false)}
                className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={confirmManualPay} className="space-y-4">
              {/* Valor */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                  Valor Recebido (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={manualPayAmount}
                  onChange={(e) => setManualPayAmount(Number(e.target.value))}
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
                  value={manualPayDate}
                  onChange={(e) => setManualPayDate(e.target.value)}
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
                  value={manualPayMethod}
                  onChange={(e) => setManualPayMethod(e.target.value)}
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
                  value={manualPayId}
                  onChange={(e) => setManualPayId(e.target.value)}
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
                  value={manualPayNotes}
                  onChange={(e) => setManualPayNotes(e.target.value)}
                  placeholder="Ex: Comprovante verificado no WhatsApp"
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setManualPayModalOpen(false)}
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
      )}

      {/* Modal de Reversão */}
      {revertModalOpen && selectedForRevert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-zinc-950 border border-rose-900/40 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent" />

            <div className="flex items-center gap-3 mb-4">
              <span className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-white">Reverter Quitação</h3>
                <p className="text-xs text-zinc-400">
                  Parcela #{selectedForRevert.number} ({selectedForRevert.referenceMonth})
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
              Você está prestes a reabrir a Parcela #{selectedForRevert.number}. O status voltará a ser
              <strong className="text-amber-300"> Pendente / A vencer</strong> e a cliente voltará a ver
              o botão de pagamento no painel dela.
            </p>

            <form onSubmit={confirmRevert} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                  Motivo da Reversão (opcional)
                </label>
                <input
                  type="text"
                  value={revertReason}
                  onChange={(e) => setRevertReason(e.target.value)}
                  placeholder="Ex: Baixa dada por engano, estorno solicitado"
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRevertModalOpen(false)}
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
      )}

      {/* Modal Oficial de Comprovante de Pagamento */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        installment={selectedReceipt}
      />
    </div>
  );
}
