'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Copy,
  Check,
  CheckCircle2,
  Loader2,
  QrCode,
  CreditCard,
  ExternalLink,
  ShieldCheck,
  Download,
  FileText,
  Lock,
  Zap,
} from 'lucide-react';
import { isLocalhost } from '@/lib/env';
import { getPublicApiUrl } from '@/lib/sessionToken';
import {
  FinancialInstallment,
  formatCurrencyBrl,
  formatIsoToBrDateTime,
} from '@/lib/financeCanonical';
import { downloadReceiptPdf } from '@/lib/generateReceiptPdf';
import {
  generateRealPixCopiaECola,
  generatePixQrCodePngDataUrl,
} from '@/lib/pixPayload';
import {
  requestPixPayment,
  verifyInstallmentPayment,
  createCardCheckoutPreference,
} from '@/lib/services/nua/financeService';
import { useScrollLock } from '@/hooks/useScrollLock';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  installment: FinancialInstallment | null;
  onPaymentConfirmed: (updated: FinancialInstallment) => void;
  onOpenReceipt: (inst: FinancialInstallment) => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  installment,
  onPaymentConfirmed,
  onOpenReceipt,
}: PaymentModalProps) {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [qrCodeImg, setQrCodeImg] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [paidInstallment, setPaidInstallment] = useState<FinancialInstallment | null>(null);
  const [cardPreferenceUrl, setCardPreferenceUrl] = useState<string | null>(null);

  const pollIntervalRef = useRef<any>(null);

  // Gera o Pix quando o modal é aberto
  useEffect(() => {
    if (!isOpen || !installment) {
      setLoading(true);
      setError(null);
      setQrCodeData('');
      setQrCodeImg('');
      setIsPaid(false);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    const activeInstallment = installment;
    let isMounted = true;

    async function initPixPayment() {
      setLoading(true);
      setError(null);

      try {
        // 1. Chama endpoint do Pix via financeService
        let pixResponseData: any = null;
        try {
          const res = await requestPixPayment(activeInstallment.id);
          if (res && !res.error) {
            pixResponseData = res;
          }
        } catch {
          // Silencioso para fallback local
        }

        let pixCode = pixResponseData?.qrCode;
        let qrImg = '';

        if (pixResponseData?.qrCodeBase64) {
          const prefix = pixResponseData.qrCodeBase64.startsWith('data:')
            ? ''
            : 'data:image/png;base64,';
          qrImg = `${prefix}${pixResponseData.qrCodeBase64}`;
        }

        // Se a API não retornou ou estiver offline, gera o código Pix Oficial do Banco Central (EMVCo BR Code)
        if (!pixCode) {
          pixCode = generateRealPixCopiaECola({
            amount: activeInstallment.amount,
            txid: `NUA${activeInstallment.number}`,
          });
        }

        // Gera a imagem oficial do QR Code em PNG de alta resolução
        if (!qrImg) {
          qrImg = await generatePixQrCodePngDataUrl(pixCode);
        }

        if (!isMounted) return;

        setQrCodeData(pixCode);
        setQrCodeImg(qrImg);
        setLoading(false);

        // 3. Inicia polling de verificação ativa a cada 3 segundos
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        const currentInstId = activeInstallment.id;
        pollIntervalRef.current = setInterval(async () => {
          try {
            const verifyData = await verifyInstallmentPayment(currentInstId);
            if (verifyData.status === 'paid' && verifyData.installment) {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              setIsPaid(true);
              setPaidInstallment(verifyData.installment);
              onPaymentConfirmed(verifyData.installment);
            }
          } catch {}
        }, 3000);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Erro ao gerar Pix.');
        setLoading(false);
      }
    }

    initPixPayment();

    return () => {
      isMounted = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isOpen, installment, onPaymentConfirmed]);

  const handleCopyPix = () => {
    if (!qrCodeData) return;
    try {
      navigator.clipboard.writeText(qrCodeData);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {}
  };

  const isLocal = isLocalhost();
  const [isSimulating, setIsSimulating] = useState(false);

  // Simulação de pagamento de parcela restrita a localhost
  const handleSimulatePayment = async () => {
    if (!installment || isSimulating || !isLocal) return;
    setIsSimulating(true);
    try {
      const apiUrl = getPublicApiUrl();
      const res = await fetch(`${apiUrl}/api/finance/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testSimulateApproval: true,
          installmentId: installment.id,
          paymentMethod: 'pix',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.installment) {
        setIsPaid(true);
        setPaidInstallment(data.installment);
        onPaymentConfirmed(data.installment);
      } else {
        throw new Error(data.error || 'Falha ao simular quitação da parcela.');
      }
    } catch (err: any) {
      console.error('[Simulate Error]:', err);
      alert(err.message || 'Erro ao simular quitação.');
    } finally {
      setIsSimulating(false);
    }
  };

  // Suporte opcional a pagamento com cartão de crédito via Checkout Pro
  const handleOpenCardCheckout = async () => {
    if (!installment) return;
    try {
      const data = await createCardCheckoutPreference(installment.id);
      if (data?.init_point) {
        window.open(data.init_point, '_blank');
      }
    } catch {
      alert('Não foi possível iniciar o checkout com cartão no momento.');
    }
  };

  if (!isOpen || !installment || !mounted) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto overscroll-contain">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative w-full max-w-md bg-[#171821] border border-white/[0.08] rounded-xl p-5 sm:p-6 shadow-2xl z-10 max-h-[92vh] overflow-y-auto my-auto text-center"
        >
          {/* Top Line Accent */}
          <div
            className={`absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r ${
              isPaid
                ? 'from-emerald-400 via-teal-300 to-emerald-500'
                : 'from-transparent via-[#f4a7b9] to-transparent'
            }`}
          />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-4 h-4" />
          </button>

          {/* ======================================================== */}
          {/* TELA DE SUCESSO (PAGAMENTO APROVADO)                     */}
          {/* ======================================================== */}
          {isPaid ? (
            <div className="py-2 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-400 block mb-0.5">
                  PAGAMENTO CONFIRMADO
                </span>
                <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                  Mensalidade Liquidada!
                </h2>
                <p className="text-xs text-zinc-400 font-light mt-0.5 max-w-xs mx-auto">
                  {installment.label} ({installment.referenceMonth}) — R$ 200,00 quitado com sucesso.
                </p>
              </div>

              <div className="bg-[#101116] border border-white/[0.06] rounded-lg p-3 text-xs text-left space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Valor</span>
                  <span className="font-mono font-bold text-white">R$ 200,00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Status</span>
                  <span className="text-emerald-400 font-semibold">Aprovado e Quitado</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Forma</span>
                  <span className="text-zinc-300">Pix</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenReceipt(paidInstallment || installment);
                  }}
                  className="w-full h-8 px-4 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold text-xs transition shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Ver Comprovante</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadReceiptPdf(paidInstallment || installment)}
                  className="w-full h-8 px-4 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] text-xs font-medium transition inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#f4a7b9]" />
                  <span>Baixar Comprovante (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full h-7 text-zinc-400 hover:text-white text-xs transition-colors cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* TELA DO PIX (QR CODE + COPIA E COLA)                     */
            /* ======================================================== */
            <div className="space-y-3.5">
              {/* Header Title */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#f4a7b9] block mb-0.5">
                  PAGAMENTO MANUAL VIA PIX
                </span>
                <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                  {installment.label} — {installment.referenceMonth}
                </h2>
                <div className="flex items-center justify-center gap-1.5 mt-0.5">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-white">
                    {formatCurrencyBrl(installment.amount)}
                  </span>
                  <span className="text-zinc-500 text-xs font-light">(duzentos reais)</span>
                </div>
              </div>

              {/* QR Code Container */}
              {loading ? (
                <div className="w-44 h-44 sm:w-48 sm:h-48 mx-auto rounded-xl bg-[#101116] border border-white/[0.08] flex flex-col items-center justify-center text-zinc-400">
                  <Loader2 className="w-7 h-7 animate-spin text-[#f4a7b9] mb-2" />
                  <span className="text-[10px] font-mono">Gerando QR Code Pix...</span>
                </div>
              ) : qrCodeImg ? (
                <div className="relative w-44 h-44 sm:w-48 sm:h-48 mx-auto p-2 bg-white rounded-xl shadow-lg flex items-center justify-center group overflow-hidden">
                  <img
                    src={qrCodeImg}
                    alt="QR Code Pix Nua Borges"
                    className="w-full h-full object-contain rounded-lg select-none"
                  />
                </div>
              ) : (
                <div className="p-3.5 rounded-lg bg-rose-500/10 text-rose-300 text-xs border border-rose-500/20">
                  {error || 'Não foi possível carregar o QR Code.'}
                </div>
              )}

              {/* Instrução */}
              <p className="text-[11px] text-zinc-400 max-w-xs mx-auto leading-relaxed">
                Abra o app do seu banco, escolha <strong>Pix</strong> e aponte a câmera para o QR Code acima, ou use o código Copia e Cola abaixo:
              </p>

              {/* Pix Copia e Cola Input & Button */}
              <div className="space-y-2">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    readOnly
                    value={qrCodeData}
                    className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-[11px] font-mono text-zinc-300 pr-10 outline-none select-all truncate focus:border-[#f4a7b9]"
                    placeholder="Código Pix..."
                  />
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="absolute right-1.5 p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                    title="Copiar código Pix"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopyPix}
                  className={`w-full h-8 px-4 rounded-full font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    copied
                      ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                      : 'bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 shadow-sm'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Código Pix Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Código Pix</span>
                    </>
                  )}
                </button>
              </div>

              {/* Live Detection Radar */}
              <div className="p-2.5 rounded-lg bg-[#101116] border border-white/[0.06] flex items-center justify-center gap-2 text-[11px] text-zinc-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>Aguardando pagamento... O sistema detecta na hora.</span>
              </div>

              {/* Botão de Simulação Exclusivo para Localhost */}
              {isLocal && (
                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  disabled={isSimulating}
                  className="w-full h-8 px-3 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-amber-200 text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSimulating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>Simular Quitação da Parcela (Localhost)</span>
                </button>
              )}

              {/* Opção Alternativa: Cartão via Mercado Pago */}
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
                <span className="text-zinc-500">Prefere pagar com cartão?</span>
                <button
                  type="button"
                  onClick={handleOpenCardCheckout}
                  className="text-[#f4a7b9] hover:underline inline-flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Abrir no Mercado Pago</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
