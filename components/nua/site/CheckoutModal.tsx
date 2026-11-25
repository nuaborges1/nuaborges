/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
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
import { OrderPaymentPanel } from '../account/OrderPaymentPanel';
import { NuaIdInlineAuth } from '../checkout/NuaIdInlineAuth';
import { bindOrderToCustomer, fetchCustomerSession, type NuaIdProfile } from '@/lib/nuaIdClient';

export function CheckoutModal({
  isOpen,
  onClose,
  product,
  checkoutContext,
  onSuccess,
}: CheckoutModalProps) {
  const [mounted, setMounted] = useState(false);
  const [nuaProfile, setNuaProfile] = useState<NuaIdProfile | null>(null);
  const [bindingError, setBindingError] = useState<string | null>(null);
  const [bindingComplete, setBindingComplete] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [guestEmailReady, setGuestEmailReady] = useState(false);
  const [guestPromptError, setGuestPromptError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const boundOrderRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSessionChecked(false);
      setNuaProfile(null);
      setBindingError(null);
      setBindingComplete(null);
      setGuestEmailReady(false);
      setGuestPromptError(null);
      boundOrderRef.current = null;
    }
  }, [isOpen]);

  const hasInitialPayment = Boolean(checkoutContext?.initialPayment?.qrCode);
  const emailReady = hasInitialPayment || (sessionChecked && Boolean(nuaProfile || guestEmailReady));
  const waitingForIdentity = !emailReady;

  const {
    activeContext,
    isLocal,
    copied,
    copyError,
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
    emailSubmitted,
    isSavingEmail,
    emailError,
    recoveryEmailInput,
    setRecoveryEmailInput,
    isRecoveringEmail,
    recoveryMsg,
    isSimulating,
    handleCopyPix,
    handleSaveBuyerEmail,
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
    authenticatedProfile: nuaProfile,
  });

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    fetchCustomerSession().then((res) => {
      if (!active) return;
      if (res.ok && res.data?.authenticated && res.data.profile) {
        setNuaProfile(res.data.profile);
        setBuyerEmail(res.data.profile.email);
      } else {
        setNuaProfile(null);
      }
    }).catch(() => {}).finally(() => {
      if (active) setSessionChecked(true);
    });
    return () => { active = false; };
  }, [isOpen, setBuyerEmail]);

  // Se o pedido já existia antes da autenticação (ex.: Personalizado ou Chamada VIP),
  // vincula-o imediatamente à conta NUA ID assim que o cliente estiver autenticado.
  useEffect(() => {
    if (!isOpen || !nuaProfile) return;
    const targetOrderId = checkoutContext?.initialPayment?.orderId || orderId;
    const targetToken = checkoutContext?.initialPayment?.purchaseToken || purchaseToken;
    if (!targetOrderId || !targetToken) return;
    const bindKey = `${nuaProfile.id}:${targetOrderId}`;
    if (boundOrderRef.current === bindKey) return;
    boundOrderRef.current = bindKey;
    bindOrderToCustomer(targetOrderId, targetToken).then(response => {
      if (boundOrderRef.current !== bindKey) return;
      if (response.ok && response.data.success) setBindingComplete(targetOrderId);
      else setBindingError(response.data.error || 'Não foi possível vincular este pedido. Confira o e-mail da compra.');
    }).catch(() => {
      if (boundOrderRef.current === bindKey) setBindingError('Não foi possível vincular este pedido. Tente reabrir o checkout.');
    });
  }, [isOpen, nuaProfile, checkoutContext, orderId, purchaseToken]);

  const showDialog = mounted && isOpen && Boolean(activeContext);
  useEffect(() => {
    if (!showDialog) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    return () => {
      dialog.close();
      opener?.focus({ preventScroll: true });
    };
  }, [showDialog]);

  if (!mounted || !isOpen || !activeContext) return null;

  const isPack = activeContext.type === 'avulso';
  const accessUrl = isPack ? '/cofre?order='+encodeURIComponent(orderId || activeContext.initialPayment?.orderId || '') : activeContext.accessUrl || `/assistir/${activeContext.id}`;
  const accessButtonText = isPack ? 'Abrir Meu Cofre Privativo' : (activeContext.accessButtonText || 'Assistir / Visualizar Obra Agora');
  const canBindExpired = Boolean(orderId && purchaseToken && activeContext.type !== 'chamada');

  return createPortal(
    <AnimatePresence>
      <dialog ref={dialogRef} aria-labelledby="checkout-title" aria-modal="true" onCancel={(event) => {
        event.preventDefault();
        onClose();
      }} className="fixed inset-0 m-0 h-[100dvh] max-h-none w-full max-w-none bg-transparent p-0 text-white backdrop:bg-transparent open:flex items-end sm:items-center justify-center sm:p-4 overscroll-contain">
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
              <div className="w-8 h-8 rounded-full bg-[#661C30]/20 border border-[#7A293D]/40 flex items-center justify-center text-[#C97A8D] shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 id="checkout-title" className="text-sm font-semibold text-white tracking-wide truncate">
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
              autoFocus
              type="button"
              className="w-11 h-11 shrink-0 rounded-full bg-white/[0.05] hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer touch-manipulation"
              aria-label="Fechar checkout"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Conteúdo com Scroll Interno */}
          <div className="p-4 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] min-h-0 overflow-y-auto space-y-4 sm:space-y-5 overscroll-contain" style={{ touchAction: 'pan-y' }}>
            {/* Resumo do Pedido Adaptado ao Contexto */}
            <CheckoutSummaryCard
              activeContext={activeContext}
              displayAmount={displayAmount}
              paymentStatus={paymentStatus}
              buyerEmail={buyerEmail}
              emailError={guestPromptError || emailError}
              onBuyerEmailChange={(v) => {
                setGuestPromptError(null);
                setBuyerEmail(v);
              }}
              hideGuestEmailInput={Boolean(nuaProfile)}
              emailSubmitted={emailSubmitted}
              isSavingEmail={isSavingEmail}
              showSaveEmailButton={Boolean(orderId && !waitingForIdentity && !nuaProfile)}
              onSaveBuyerEmail={handleSaveBuyerEmail}
            />

            {/* Aviso quando conectado com conta NUA ID */}
            {nuaProfile && paymentStatus === 'pending' && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-zinc-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Conectado como <strong className="text-white">{nuaProfile.displayName || nuaProfile.email}</strong>. Seu acesso será vinculado à sua conta.
                </span>
              </div>
            )}

            {/* Confirmação direta do e-mail para geração imediata do Pix */}
            {paymentStatus === 'pending' && waitingForIdentity && (
              <div className="space-y-2.5">
                <button
                  type="button"
                  disabled={!sessionChecked}
                  onClick={() => {
                    const clean = (buyerEmail || '').trim().toLowerCase();
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
                      setGuestPromptError('Informe um e-mail válido para gerar o Pix e receber o acesso à sua compra.');
                      return;
                    }
                    setGuestPromptError(null);
                    setGuestEmailReady(true);
                  }}
                  className="w-full min-h-[48px] rounded-full border border-white/15 bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#54182b] hover:via-[#7A293D] hover:to-[#90364B] hover:border-white/25 text-[#F5EEE9] text-xs font-bold uppercase tracking-[0.14em] transition-all duration-200 shadow-[0_4px_20px_rgba(67,19,34,0.45)] active:scale-[0.985] cursor-pointer flex items-center justify-center gap-2"
                >
                  <PixIcon className="w-4 h-4 fill-current" />
                  <span>{sessionChecked ? "Pagar com Pix Agora" : "Verificando sua conta…"}</span>
                </button>
                <p className="text-center text-[11px] text-zinc-400">
                  Após a confirmação do Pix, enviaremos o acesso para este e-mail.
                </p>
              </div>
            )}

            {/* Estado do Pagamento */}
            {paymentStatus === 'approved' ? (
              <CheckoutApprovedScreen
                activeContext={activeContext}
                displayAmount={displayAmount}
                buyerEmail={nuaProfile?.email || buyerEmail}
                purchaseToken={isPack ? undefined : purchaseToken || orderId || undefined}
                isNuaIdAuthenticated={Boolean(nuaProfile)}
                accessUrl={
                  !isPack && purchaseToken && accessUrl && !accessUrl.includes('token=')
                    ? `${accessUrl}${accessUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(purchaseToken)}`
                    : accessUrl
                }
                accessButtonText={accessButtonText}
                onClose={onClose}
              />
            ) : paymentStatus === 'rejected' || paymentStatus === 'expired' ? (
              <div className="space-y-3">
                {(bindingError || (canBindExpired && nuaProfile && bindingComplete !== orderId)) && (
                  <p role="status" className="text-sm text-zinc-300">{bindingError || 'Localizando este pedido na sua conta…'}</p>
                )}
                {nuaProfile && orderId && activeContext.type !== 'chamada' && (!canBindExpired || bindingComplete === orderId) ? (
                  <OrderPaymentPanel id={orderId} onOrderUpdated={() => {}} />
                ) : (
                  <CheckoutStatusScreens status={paymentStatus}
                    nextHref={activeContext.type === 'chamada' ? activeContext.accessUrl || '/chamadas' : '/conta?tab=conta'}
                    nextLabel={activeContext.type === 'chamada' ? 'Ver reserva e horários' : 'Ir para Minhas Compras'} />
                )}
                {canBindExpired && !nuaProfile && (
                  <NuaIdInlineAuth required initialEmail={buyerEmail} onAuthenticated={(profile) => {
                    if (buyerEmail && profile.email.toLowerCase() !== buyerEmail.trim().toLowerCase()) {
                      setBindingError('Use a conta do e-mail informado neste pedido.');
                      return;
                    }
                    setBindingError(null);
                    setNuaProfile(profile);
                  }} />
                )}
              </div>
            ) : waitingForIdentity ? null : (
              <div className="space-y-4">
                <CheckoutPixScreen
                  timeLeft={timeLeft}
                  formatTimer={formatTimer}
                  generationError={generationError}
                  onRetry={() => retryOrder()}
                  qrCodeUrl={qrCodeUrl}
                  pixPayload={pixPayload}
                  copied={copied}
                  copyError={copyError}
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
                <p className="text-center text-[11px] text-zinc-400">
                  {activeContext.type === 'avulso' ? (
                    <>
                      🔒 Após a confirmação do Pix, o acesso ao seu Cofre será enviado para{' '}
                      <strong className="text-white">{nuaProfile?.email || buyerEmail || 'o e-mail informado'}</strong>.
                    </>
                  ) : activeContext.type === 'chamada' ? (
                    <>
                      🔒 Assim que o Pix for confirmado, seu agendamento será liberado automaticamente com voucher e confirmação por e-mail.
                    </>
                  ) : (
                    <>
                      🔒 Assim que o Pix for confirmado, sua encomenda personalizada entrará em produção imediatamente.
                    </>
                  )}
                </p>
              </div>
            )}

            {/* Aviso legal e links clicáveis (LGPD & CDC) */}
            <p className="pt-2 border-t border-white/[0.06] text-center text-[10px] leading-relaxed text-zinc-400">
              Ao concluir a compra, você declara ser maior de 18 anos e concordar com os{' '}
              <Link href="/termos" target="_blank" className="text-zinc-300 underline underline-offset-2 hover:text-white">
                Termos de Uso
              </Link>{' '}
              e a{' '}
              <Link href="/privacidade" target="_blank" className="text-zinc-300 underline underline-offset-2 hover:text-white">
                Política de Privacidade
              </Link>
              .
            </p>
          </div>
        </motion.div>
      </dialog>
    </AnimatePresence>,
    document.body
  );
}
