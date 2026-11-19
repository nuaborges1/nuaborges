/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  CheckCircle2,
  RefreshCw,
  Download,
  X,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  FinancialInstallment,
  FinancialSummary,
  calculateFinanceSummary,
  getDefaultInstallments,
} from '@/lib/financeCanonical';
import { ReceiptModal } from '@/components/nua/admin/ReceiptModal';
import { useScrollLock } from '@/hooks/useScrollLock';
import { FinanceKpis } from './finance/FinanceKpis';
import { InstallmentsTable } from './finance/InstallmentsTable';
import { ManualPayModal } from './finance/ManualPayModal';
import { RevertPayModal } from './finance/RevertPayModal';

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

  useScrollLock(Boolean(manualPayModalOpen || revertModalOpen));

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

  const nextNum =
    summary?.currentInstallment?.number ||
    (installments.find((i) => i.status !== 'paid')?.number || 2);

  return (
    <div className="space-y-6 text-zinc-100">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-zinc-900/90 via-zinc-950 to-zinc-900/60 border border-zinc-800/80 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-lg bg-[#843C52]/10 border border-[#843C52]/20 text-[#843C52]">
              <DollarSign className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#843C52] font-medium">
              CONTROLE DE PAGAMENTOS · CONTRATO NUA BORGES
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Gestão Financeira &amp; Conciliação
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
            <RefreshCw className={`w-3.5 h-3.5 text-[#843C52] ${isSyncingMp ? 'animate-spin' : ''}`} />
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

      {/* KPI Cards & MP Badge */}
      <FinanceKpis
        summary={summary}
        installments={installments}
        mpStatus={mpStatus}
      />

      {/* Main Table: As 10 Parcelas */}
      <InstallmentsTable
        installments={installments}
        nextNum={nextNum}
        onViewReceipt={handleViewReceipt}
        onOpenRevert={openRevertModal}
        onOpenManualPay={openManualPay}
      />

      {/* Modal de Baixa Manual */}
      <ManualPayModal
        isOpen={manualPayModalOpen}
        onClose={() => setManualPayModalOpen(false)}
        installment={selectedForManualPay}
        amount={manualPayAmount}
        setAmount={setManualPayAmount}
        date={manualPayDate}
        setDate={setManualPayDate}
        method={manualPayMethod}
        setMethod={setManualPayMethod}
        id={manualPayId}
        setId={setManualPayId}
        notes={manualPayNotes}
        setNotes={setManualPayNotes}
        onSubmit={confirmManualPay}
        isSubmitting={isSubmitting}
      />

      {/* Modal de Reversão */}
      <RevertPayModal
        isOpen={revertModalOpen}
        onClose={() => setRevertModalOpen(false)}
        installment={selectedForRevert}
        reason={revertReason}
        setReason={setRevertReason}
        onSubmit={confirmRevert}
        isSubmitting={isSubmitting}
      />

      {/* Modal Oficial de Comprovante de Pagamento */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        installment={selectedReceipt}
      />
    </div>
  );
}
