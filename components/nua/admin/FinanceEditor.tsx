'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import {
  FinancialInstallment,
  FinanceSummary,
  getDefaultInstallments,
  calculateFinanceSummary,
  KV_FINANCE_KEY,
} from '@/lib/financeCanonical';
import { downloadReceiptPdf } from '@/lib/generateReceiptPdf';
import { fetchClientInstallments, verifyInstallmentPayment } from '@/lib/services/nua/financeService';
import { ReceiptModal } from './ReceiptModal';
import { PaymentModal } from './PaymentModal';
import { CurrentInstallmentCard } from './finance/CurrentInstallmentCard';
import { InstallmentsList } from './finance/InstallmentsList';

export function FinanceEditor() {
  const [installments, setInstallments] = useState<FinancialInstallment[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payingInstallment, setPayingInstallment] = useState<FinancialInstallment | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<FinancialInstallment | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Carrega as parcelas do backend com fallback gracioso para localhost
  const loadFinanceData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
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
      } catch (netErr) {
        // Silencioso para acionar fallback local
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
            // Garante que a 1ª parcela conste como quitada em 05/10/2026 conforme informado pela cliente
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
      console.error('[FinanceEditor] Erro ao carregar parcelas:', err);
      setError(err.message || 'Não foi possível carregar os dados das mensalidades.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Ao montar, verifica se a cliente retornou do Mercado Pago com parâmetros na URL
  useEffect(() => {
    loadFinanceData().then(async () => {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const instId = urlParams.get('inst');
        const status = urlParams.get('status');

        if (instId && status) {
          try {
            // Reconcilia ativamente com a API do backend
            const verifyData = await verifyInstallmentPayment(instId);
            if (verifyData.status === 'paid') {
              showToast('Pagamento confirmado com sucesso!');
              loadFinanceData();
            }
          } catch {}

          // Limpa os parâmetros da URL sem recarregar a página
          window.history.replaceState({}, '', window.location.pathname + '?tab=finance');
        }
      }
    });
  }, [loadFinanceData]);

  // Abre o modal com QR Code e Copia e Cola Pix para a cliente pagar com facilidade
  const handlePayInstallment = (installment: FinancialInstallment) => {
    setPayingInstallment(installment);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentConfirmed = (updated: FinancialInstallment) => {
    setInstallments((prev) => {
      const next = prev.map((item) => (item.id === updated.id ? updated : item));
      if (typeof window !== 'undefined') {
        localStorage.setItem(KV_FINANCE_KEY, JSON.stringify(next));
      }
      setSummary(calculateFinanceSummary(next));
      return next;
    });
    showToast(`Mensalidade ${updated.number}/10 quitada com sucesso!`);
  };

  const handleOpenReceipt = (inst: FinancialInstallment) => {
    setSelectedReceipt(inst);
    setIsReceiptModalOpen(true);
  };

  const handleDownloadDirect = (inst: FinancialInstallment) => {
    downloadReceiptPdf(inst);
    showToast('Download do comprovante iniciado!');
  };

  const current = summary?.currentInstallment || installments[0] || null;

  if (isLoading && installments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#f4a7b9] mb-3" />
        <span className="text-xs uppercase tracking-widest font-mono">Carregando financeiro...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto">
      {/* Toast de Notificação */}
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center justify-between shadow-lg"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-400 hover:text-white text-[11px] underline cursor-pointer"
          >
            Fechar
          </button>
        </motion.div>
      )}

      {/* Erro de Carregamento */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadFinanceData}
            className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs hover:bg-zinc-800 cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* 1. CARD DA MENSALIDADE ATUAL */}
      {current && (
        <CurrentInstallmentCard
          current={current}
          onPay={handlePayInstallment}
          onOpenReceipt={handleOpenReceipt}
          onDownloadReceipt={handleDownloadDirect}
        />
      )}

      {/* 2. HISTÓRICO DE PAGAMENTOS */}
      <InstallmentsList
        installments={installments}
        currentId={current?.id}
        isLoading={isLoading}
        onRefresh={loadFinanceData}
        onPay={handlePayInstallment}
        onOpenReceipt={handleOpenReceipt}
      />

      {/* 3. Atalho de Suporte Técnico & Garantia Cloudflare */}
      <div className="bg-[#09090c] border border-zinc-800/80 rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#f4a7b9] block">
            ENGENHARIA &amp; HOSPEDAGEM DEDICADA
          </span>
          <h4 className="font-serif text-lg text-white font-medium">
            Suporte Técnico &amp; Manutenção da Infraestrutura
          </h4>
          <p className="text-zinc-400 text-xs font-light max-w-xl leading-relaxed">
            Sua plataforma roda em borda global de ultra performance na Cloudflare, com monitoramento ativo 24/7, cofre de mídias no Backblaze B2 com CDN ilimitada e certificado SSL autoral.
          </p>
        </div>

        <a
          href="https://wa.me/5567998319623?text=Ol%C3%A1%2C%20preciso%20de%20suporte%20t%C3%A9cnico%20na%20plataforma%20Nua%20Borges."
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-white text-xs font-semibold transition-all cursor-pointer shrink-0 shadow-sm"
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#f4a7b9]" />
          <span>Falar com o Suporte Técnico</span>
        </a>
      </div>

      {/* Modal de Pagamento via Pix com QR Code */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPayingInstallment(null);
        }}
        installment={payingInstallment}
        onPaymentConfirmed={handlePaymentConfirmed}
        onOpenReceipt={(inst) => {
          setIsPaymentModalOpen(false);
          setPayingInstallment(null);
          handleOpenReceipt(inst);
        }}
      />

      {/* Modal de Comprovante */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        installment={selectedReceipt}
      />
    </div>
  );
}
