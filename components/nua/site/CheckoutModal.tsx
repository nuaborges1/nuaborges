/* Vinho maduro / Nua Borges */
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
import { NuaIdInlineAuth } from '../checkout/NuaIdInlineAuth';
import { NUA_ID_CHECKOUT_ENABLED } from '@/lib/featureFlags';
import type { NuaIdProfile } from '@/lib/nuaIdClient';

export function CheckoutModal({
  isOpen,
  onClose,
  product,
  checkoutContext,
  onSuccess,
}: CheckoutModalProps) {
  const [mounted, setMounted] = useState(false);
  const [nuaProfile, setNuaProfile] = useState<NuaIdProfile | null>(null);
  const [guestMode, setGuestMode] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setGuestMode(false);
    }
  }, [isOpen]);

  const waitingForIdentity = NUA_ID_CHECKOUT_ENABLED && !nuaProfile && !guestMode;

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
    deferPixGeneration: waitingForIdentity,
  });

  if (!mounted || !isOpen || !activeContext) return null;

  const accessUrl = activeContext.accessUrl || `/assistir/${activeContext.id}`;
  const accessButtonText = activeContext.accessButtonText || 'Assistir / Visualizar Obra Agora';

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overscroll-contain">
        {/* Backdrop escurecido */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Container — Bottom-sheet no mobile, centralizado no desktop */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-[#0e0f14] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92dvh] sm:max-h-[90vh]"
        >
          {/* Header Elegante */}
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.06] flex items-center justify-between gap-2 bg-black/40 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#661C30]/20 border border-[#7A293D]/40 flex items-center justify-center text-[#90364B] shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white tracking-wide truncate">
                  Pagamento Seguro
                </h3>
                <span className="text-[10px] text-zinc-400 font-light flex items-center gap-1 truncate">
                  <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">Criptografia bancária de ponta a ponta</span>
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-10 h-10 sm:w-8 sm:h-8 shrink-0 rounded-full bg-white/[0.05] hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer touch-manipulation"
              aria-label="Fechar checkout"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Conteúdo com Scroll Interno */}
          <div className="p-4 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] overflow-y-auto space-y-4 sm:space-y-5 overscroll-contain" style={{ touchAction: 'pan-y' }}>
            {/* Resumo do Pedido Adaptado ao Contexto */}
            <CheckoutSummaryCard
              activeContext={activeContext}
              displayAmount={displayAmount}
              paymentStatus={paymentStatus}
              buyerEmail={buyerEmail}
              emailError={emailError}
              onBuyerEmailChange={setBuyerEmail}
              hideGuestEmailInput={NUA_ID_CHECKOUT_ENABLED && !guestMode}
            />

            {/* Identificação NUA ID inline sem passo extra (antes do QR Code, com fallback visitante via feature flag) */}
            {paymentStatus === 'pending' && NUA_ID_CHECKOUT_ENABLED && !guestMode && (
              <NuaIdInlineAuth
                initialEmail={buyerEmail}
                onAuthenticated={(prof) => {
                  setNuaProfile(prof);
                  setBuyerEmail(prof.email);
                }}
                onContinueAsGuest={() => setGuestMode(true)}
              />
            )}

            {/* Estado do Pagamento */}
            {paymentStatus === 'approved' ? (
              <CheckoutApprovedScreen
                activeContext={activeContext}
                displayAmount={displayAmount}
                buyerEmail={nuaProfile?.email || buyerEmail}
                purchaseToken={purchaseToken || orderId || undefined}
                isNuaIdAuthenticated={Boolean(nuaProfile)}
                accessUrl={
                  purchaseToken && accessUrl && !accessUrl.includes('token=')
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
            ) : waitingForIdentity ? (
              <p className="text-center text-[11px] text-zinc-500">
                Confirme seu e-mail acima para gerar o Pix vinculado à sua conta NUA ID.
              </p>
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
