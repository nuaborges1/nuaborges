/* Vinho maduro / Nua Borges */
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  authorizeLocalRefund,
  executeAdminRefund,
  fetchRefundEligibility,
  reconcileAdminRefund,
  type RefundEligibilitySummary,
} from '@/lib/services/nua/refundService';
import { isLocalhost } from '@/lib/env';
import { useScrollLock } from '@/hooks/useScrollLock';

interface ManualRefundModalProps {
  isOpen: boolean;
  orderId: string | null;
  modality?: string;
  onClose: () => void;
  onRefundCompleted?: (orderId: string) => void;
}

export function ManualRefundModal({
  isOpen,
  orderId,
  modality,
  onClose,
  onRefundCompleted,
}: ManualRefundModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<RefundEligibilitySummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useScrollLock(isOpen);

  const loadEligibility = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setLoadError(null);
    const res = await fetchRefundEligibility(orderId, modality).catch(() => ({
      success: false as const,
      summary: undefined,
      error: 'Não foi possível consultar o pedido. Verifique a conexão e tente novamente.',
    }));
    setLoading(false);
    if (res.success && res.summary) {
      setSummary(res.summary);
    } else {
      setSummary(null);
      setLoadError(res.error || 'Não foi possível consultar este pedido.');
    }
  }, [orderId, modality]);

  useEffect(() => {
    if (isOpen && orderId) {
      setReason('');
      setAdminPassword('');
      setConfirmed(false);
      setFeedback(null);
      void loadEligibility();
    }
  }, [isOpen, orderId, loadEligibility]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, submitting, onClose]);

  const authorize = async () => {
    if (!isLocalhost()) return true;
    const error = await authorizeLocalRefund(adminPassword);
    if (!error) return true;
    setFeedback({ tone: 'error', text: error });
    setSubmitting(false);
    return false;
  };

  const handleConnectionFailure = () => {
    setSubmitting(false);
    setFeedback({ tone: 'warning', text: 'A conexão caiu antes de confirmar o resultado. Reconcilie a devolução antes de tentar de novo.' });
  };

  const handleExecuteRefund = async () => {
    if (!summary || !orderId || submitting) return;
    if (!confirmed || reason.trim().length < 3 || !adminPassword.trim()) return;
    setSubmitting(true);
    setFeedback(null);

    const password = adminPassword;
    if (!(await authorize())) {
      setAdminPassword('');
      return;
    }
    setAdminPassword('');
    const res = await executeAdminRefund({
      confirmationPassword: password,
      orderId,
      modality: summary.modality,
      reason: reason.trim(),
      confirmRefund: true,
      expectedRefundAmount: summary.refundableAmount,
      paymentId: summary.providerPaymentId,
    }).catch(() => null);
    if (!res) {
      handleConnectionFailure();
      await loadEligibility();
      return;
    }

    setSubmitting(false);

    if (res.success && res.state === 'refunded') {
      setFeedback({ tone: 'success', text: res.message });
      window.dispatchEvent(
        new CustomEvent('nua-order-refunded', { detail: { orderId, modality: summary.modality } })
      );
      onRefundCompleted?.(orderId);
      await loadEligibility();
    } else if (res.state === 'processing' || res.state === 'unknown_awaiting_reconciliation') {
      setFeedback({ tone: 'warning', text: res.error || res.message });
      await loadEligibility();
    } else {
      setFeedback({ tone: 'error', text: res.error || res.message });
    }
  };

  const handleReconcile = async () => {
    if (!orderId || submitting) return;
    setSubmitting(true);
    setFeedback(null);
    const authorized = await authorize();
    setAdminPassword('');
    if (!authorized) return;
    const res = await reconcileAdminRefund({ orderId, modality: summary?.modality || modality }).catch(() => null);
    if (!res) {
      handleConnectionFailure();
      return;
    }
    setSubmitting(false);
    if (res.state === 'refunded') {
      setFeedback({ tone: 'success', text: res.message });
      window.dispatchEvent(new CustomEvent('nua-order-refunded', { detail: { orderId } }));
      onRefundCompleted?.(orderId);
    } else {
      setFeedback({
        tone: res.success ? 'warning' : 'error',
        text: res.error || res.message,
      });
    }
    await loadEligibility();
  };

  if (!mounted || !isOpen || !orderId) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-refund-title"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={() => !submitting && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-[#14151c] border border-white/10 shadow-2xl overflow-hidden text-left"
      >
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between gap-3 bg-[#101116]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center justify-center shrink-0">
              <RotateCcw className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-400 block">
                Estorno Mercado Pago
              </span>
              <h2 id="manual-refund-title" className="text-sm font-semibold text-white">
                Estornar pagamento
              </h2>
            </div>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {feedback && (
            <div
            role="status"
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                feedback.tone === 'success'
                  ? 'bg-emerald-950/35 border-emerald-500/35 text-emerald-200'
                  : feedback.tone === 'warning'
                    ? 'bg-amber-950/35 border-amber-500/35 text-amber-200'
                    : 'bg-rose-950/35 border-rose-500/35 text-rose-200'
              }`}
            >
              {feedback.tone === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {loading ? (
            <div className="py-10 flex flex-col items-center justify-center gap-2 text-xs text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin text-[#843C52]" />
              <span>Consultando situação real no Mercado Pago…</span>
            </div>
          ) : loadError ? (
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-200 space-y-3">
              <p>{loadError}</p>
              <button
                type="button"
                onClick={loadEligibility}
                className="h-8 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Tentar novamente
              </button>
            </div>
          ) : summary ? (
            <>
              {/* Resumo do Pedido */}
              <div className="p-4 rounded-xl bg-[#0e0f15] border border-white/[0.06] space-y-2 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-400">Cliente</span>
                  <span className="text-white font-medium text-right">{summary.customerName}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-400">Produto / Serviço</span>
                  <span className="text-zinc-200 text-right">
                    {summary.title} ({summary.modalityLabel})
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-400">Pedido</span>
                  <span className="font-mono text-zinc-300">{summary.orderId}</span>
                </div>
                <div className="flex justify-between gap-2 pt-1.5 border-t border-white/[0.06]">
                  <span className="text-zinc-400">Valor pago</span>
                  <span className="font-mono text-zinc-200">{summary.amountPaidFormatted}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-400">{summary.eligible ? 'Valor a devolver' : 'Estorno disponível'}</span>
                  <span className="font-mono text-base font-semibold text-rose-300">
                    {summary.eligible ? summary.refundableAmountFormatted : '—'}
                  </span>
                </div>
              </div>

              {summary.stageSummary && (
                <div className="p-3 rounded-xl bg-amber-950/25 border border-amber-500/25 text-xs text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <span>{summary.stageSummary}</span>
                </div>
              )}

              {(summary.eligible || (isLocalhost() && summary.canReconcile)) && (
                <div className="space-y-1.5">
                  <label htmlFor="refund-admin-password" className="block text-xs text-zinc-200">
                    Confirme a senha do painel
                  </label>
                  <input
                    id="refund-admin-password"
                    type="password"
                    autoComplete="current-password"
                    maxLength={512}
                    value={adminPassword}
                    onChange={(event) => setAdminPassword(event.target.value)}
                    className="adm-input w-full"
                  />
                </div>
              )}

              {summary.eligible ? (
                <>
                  <div className="p-3.5 rounded-xl bg-white/[0.025] border border-white/[0.07] space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                      Consequências desta operação
                    </span>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-zinc-300">
                      {summary.consequences.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="refund-reason-input"
                      className="text-xs font-medium text-zinc-200 block"
                    >
                      Motivo do estorno *
                    </label>
                    <textarea
                      id="refund-reason-input"
                      rows={2}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Ex.: Solicitação do cliente / Cancelamento combinado"
                      className="w-full rounded-xl bg-[#0c0d12] border border-white/10 focus:border-[#843C52] focus:outline-none px-3 py-2 text-xs text-white placeholder:text-zinc-500"
                    />
                  </div>

                  <label className="flex items-start gap-2.5 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="mt-0.5 accent-[#843C52]"
                    />
                    <span>
                      Confirmo que desejo solicitar o estorno real de{' '}
                      <strong className="text-white">{summary.refundableAmountFormatted}</strong> via
                      Mercado Pago e aplicar as consequências acima.
                    </span>
                  </label>
                </>
              ) : (
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-zinc-300 space-y-2">
                  <p className="font-medium text-white">
                    {summary.state === 'refunded'
                      ? 'Estorno já confirmado'
                      : summary.canReconcile
                        ? 'Aguardando reconciliação com o Mercado Pago'
                        : 'Estorno indisponível para este pedido'}
                  </p>
                  {summary.reasonIfIneligible && (
                    <p className="text-zinc-400">{summary.reasonIfIneligible}</p>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

        <div className="px-5 py-3.5 border-t border-white/[0.08] bg-[#101116] flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="h-9 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-xs font-medium cursor-pointer disabled:opacity-50"
          >
            Fechar
          </button>

          {summary?.canReconcile && (
            <button
              type="button"
              disabled={submitting || (isLocalhost() && !adminPassword.trim())}
              onClick={handleReconcile}
              className="h-9 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>Reconciliar com Mercado Pago</span>
            </button>
          )}

          {summary?.eligible && (
            <button
              type="button"
              disabled={submitting || !confirmed || reason.trim().length < 3 || !adminPassword.trim()}
              onClick={handleExecuteRefund}
              className="h-9 px-4 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              <span>{submitting ? 'Solicitando estorno…' : 'Confirmar estorno'}</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
