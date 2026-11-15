'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, ShieldCheck } from 'lucide-react';
import { PixIcon } from './Icons';
export type CheckoutItemType = 'avulso' | 'chamada' | 'personalizado' | 'vip';
export type {
  CheckoutDetailItem,
  UniversalCheckoutContext,
  CheckoutModalProps,
} from '../checkout/types';
import type {
  UniversalCheckoutContext,
  CheckoutModalProps,
} from '../checkout/types';
import { useCheckoutOrder } from '../checkout/useCheckoutOrder';
import { CheckoutSummaryCard } from '../checkout/CheckoutSummaryCard';
import { CheckoutApprovedScreen } from '../checkout/CheckoutApprovedScreen';
import { CheckoutStatusScreens } from '../checkout/CheckoutStatusScreens';
import { CheckoutPixScreen } from '../checkout/CheckoutPixScreen';

export function CheckoutModal({
  isOpen,
  onClose,
  product,
  checkoutContext,
  onSuccess,
}: CheckoutModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    activeContext,
    isLocal,
    copied,
    pixPayload,
    qrCodeUrl,
    timeLeft,
    formatTimer,
    paymentStatus,
    orderId,
    purchaseToken,
    displayAmount,
    generationError,
    buyerEmail,
    setBuyerEmail,
    emailError,
    recoveryEmailInput,
    setRecoveryEmailInput,
    isRecoveringEmail,
    recoveryMsg,
    isSimulating,
    handleCopyPix,
    handleQuickRecoverEmail,
    handleSimulateApprove,
    retryOrder,
  } = useCheckoutOrder({
    isOpen,
    onClose,
    product,
    checkoutContext,
    onSuccess,
  });

  if (!mounted || !isOpen || !activeContext) return null;

  const accessUrl = activeContext.accessUrl || `/assistir/${activeContext.id}`;
  const accessButtonText = activeContext.accessButtonText || 'Assistir / Visualizar Obra Agora';

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overscroll-contain">
        {/* Backdrop escurecido */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-[#0e0f14] border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh]"
        >
          {/* Header Elegante */}
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#f4a7b9]/10 border border-[#f4a7b9]/30 flex items-center justify-center text-[#f4a7b9]">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white tracking-wide">
                  Pagamento Seguro
                </h3>
                <span className="text-[10px] text-zinc-400 font-light flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Criptografia bancária de ponta a ponta
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Fechar checkout"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Conteúdo com Scroll Interno */}
          <div className="p-6 overflow-y-auto space-y-5 overscroll-contain" style={{ touchAction: 'pan-y' }}>
            {/* Resumo do Pedido Adaptado ao Contexto */}
            <CheckoutSummaryCard
              activeContext={activeContext}
              displayAmount={displayAmount}
              paymentStatus={paymentStatus}
              buyerEmail={buyerEmail}
              emailError={emailError}
              onBuyerEmailChange={setBuyerEmail}
            />

            {/* Estado do Pagamento */}
            {paymentStatus === 'approved' ? (
              <CheckoutApprovedScreen
                activeContext={activeContext}
                displayAmount={displayAmount}
                buyerEmail={buyerEmail}
                purchaseToken={purchaseToken || orderId || undefined}
                accessUrl={
                  purchaseToken
                    ? `${accessUrl}${accessUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(purchaseToken)}`
                    : accessUrl
                }
                accessButtonText={accessButtonText}
                onClose={onClose}
              />
            ) : paymentStatus === 'rejected' || paymentStatus === 'expired' ? (
              <CheckoutStatusScreens
                status={paymentStatus}
                onRetry={() => retryOrder({ resetTime: paymentStatus === 'expired' })}
              />
            ) : (
              <div className="space-y-4">
                <CheckoutPixScreen
                  timeLeft={timeLeft}
                  formatTimer={formatTimer}
                  generationError={generationError}
                  onRetry={() => retryOrder()}
                  qrCodeUrl={qrCodeUrl}
                  pixPayload={pixPayload}
                  copied={copied}
                  onCopyPix={handleCopyPix}
                  recoveryEmailInput={recoveryEmailInput}
                  onRecoveryEmailChange={setRecoveryEmailInput}
                  onQuickRecoverEmail={handleQuickRecoverEmail}
                  isRecoveringEmail={isRecoveringEmail}
                  recoveryMsg={recoveryMsg}
                  isLocal={isLocal}
                  onSimulateApprove={handleSimulateApprove}
                  isSimulating={isSimulating}
                />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
