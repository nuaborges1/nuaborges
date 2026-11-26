import { useState, useEffect, useRef, useMemo } from 'react';
import QRCode from 'qrcode';
import { AvulsoProductItem } from '@/lib/types';
import { getPublicApiUrl } from '@/lib/contentStore';
import { isLocalhost } from '@/lib/env';
import { formatBrlPrice } from '@/lib/formatters';
import { packPurchasePrice, packMediaCounts, isRealTimeDuration } from '@/lib/publicCatalog';
import { useScrollLock } from '@/hooks/useScrollLock';
import { UniversalCheckoutContext, CheckoutDetailItem } from './types';

interface UseCheckoutOrderOptions {
  isOpen: boolean;
  onClose: () => void;
  product?: AvulsoProductItem | null;
  checkoutContext?: UniversalCheckoutContext | null;
  onSuccess?: (result: { orderId: string; purchaseToken?: string }) => void;
  deferPixGeneration?: boolean;
  authenticatedProfile?: { email: string; displayName: string } | null;
}

type CheckoutPix = NonNullable<UniversalCheckoutContext['initialPayment']>;

async function getCheckoutSessionKey(scope: string) {
  try {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(scope));
    return 'nua:checkout:' + Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

export function useCheckoutOrder({
  isOpen,
  product,
  checkoutContext,
  onSuccess,
  deferPixGeneration = false,
  authenticatedProfile = null,
}: UseCheckoutOrderOptions) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const copyReset = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pixPayload, setPixPayload] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    'pending' | 'verifying' | 'approved' | 'rejected' | 'expired'
  >('pending');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [purchaseToken, setPurchaseToken] = useState<string | null>(null);
  const [serverAmount, setServerAmount] = useState<number | null>(null);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [generationError, setGenerationError] = useState<{ message: string; alreadyOwned?: boolean; unavailable?: boolean } | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [buyerEmail, setBuyerEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [recoveryEmailInput, setRecoveryEmailInput] = useState('');
  const [isRecoveringEmail, setIsRecoveringEmail] = useState(false);
  const [recoveryMsg, setRecoveryMsg] = useState<string | null>(null);

  const isLocal = isLocalhost();
  const generated = useRef(new Map<string, Promise<CheckoutPix>>());
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);
  useEffect(() => () => { if (copyReset.current) clearTimeout(copyReset.current); }, []);

  const activeContext: UniversalCheckoutContext | null = useMemo(() => {
    if (checkoutContext) return checkoutContext;
    if (product) {
      const parsedPrice = packPurchasePrice(product);
      if (parsedPrice === null) return null;
      const productSlug = product.slug || product.id?.replace(/^avulso-/, '') || '';

      const details: CheckoutDetailItem[] = [];
      if (isRealTimeDuration(product.duration)) {
        details.push({ label: 'Duração', value: product.duration! });
      }

      // Contagem dinâmica e canônica das mídias associadas ao produto (nunca usa prévias quando houver contagem real)
      const { photos: photoCount, videos: videoCount } = packMediaCounts(product);

      const mediaParts: string[] = [];
      if (photoCount > 0) {
        mediaParts.push(`${photoCount} ${photoCount === 1 ? 'fotografia' : 'fotografias'}`);
      }
      if (videoCount > 0) {
        mediaParts.push(`${videoCount} ${videoCount === 1 ? 'vídeo' : 'vídeos'}`);
      }

      if (mediaParts.length > 0) {
        details.push({ label: 'Arquivos', value: mediaParts.join(' + ') });
      } else if (product.technicalDetails?.mediaCount) {
        details.push({ label: 'Arquivos', value: product.technicalDetails.mediaCount });
      }

      return {
        type: 'avulso',
        id: productSlug,
        title: product.title,
        subtitle: 'Acesso protegido em Minha Conta',
        priceFormatted: `R$ ${formatBrlPrice(parsedPrice)}`,
        numericPrice: parsedPrice,
        badge: product.badge,
        imageUrl: product.imageUrl,
        details,
        accessUrl: `/assistir/${productSlug}`,
        accessButtonText: 'Assistir / Visualizar Obra Agora',
      };
    }
    return null;
  }, [checkoutContext, product]);

  useScrollLock(isOpen && !!activeContext);

  useEffect(() => {
    if (pixPayload && !qrCodeUrl) {
      QRCode.toDataURL(pixPayload, {
        width: 320,
        margin: 1,
        color: { dark: '#09090b', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      })
        .then((url) => setQrCodeUrl(url))
        .catch(() => {});
    }
  }, [pixPayload, qrCodeUrl]);

  useEffect(() => {
    const deadline = Date.parse(expiresAt || '');
    if (!isOpen || !pixPayload || paymentStatus !== 'pending' || !Number.isFinite(deadline)) return;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (!remaining) setPaymentStatus(current => current === 'pending' ? 'expired' : current);
    };
    update();
    const interval = setInterval(update, 1000);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', update);
    };
  }, [isOpen, expiresAt, pixPayload, paymentStatus]);

  const saveAccessLocally = (token: string) => {
    if (!activeContext) return;
    try {
      if (activeContext.type === 'avulso') {
        localStorage.setItem(`nua_access_token_${activeContext.id}`, token);
        localStorage.setItem(`nua_unlocked_${activeContext.id}`, 'true');
      } else if (activeContext.type === 'chamada') {
        localStorage.setItem('nua_saved_booking_token', token);
      } else if (activeContext.type === 'personalizado') {
        localStorage.setItem('nua_saved_personalizado_token', token);
      }
    } catch {}
  };

  const handleCopyPix = async () => {
    if (!pixPayload || paymentStatus !== 'pending' || (expiresAt && Date.parse(expiresAt) <= Date.now())) return;
    if (copyReset.current) clearTimeout(copyReset.current);
    setCopied(false);
    setCopyError(false);

    let ok = false;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(pixPayload);
        ok = true;
      }
    } catch {
      ok = false;
    }

    // Fallback confiável para Safari iOS / WebViews quando Clipboard API restringe foco
    if (!ok) {
      try {
        const ta = document.createElement('textarea');
        ta.value = pixPayload;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, pixPayload.length);
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }

    if (ok) {
      setCopied(true);
      copyReset.current = setTimeout(() => setCopied(false), 3000);
    } else {
      setCopyError(true);
    }
  };

  const handleSaveBuyerEmail = async () => {
    const cleanEmail = (buyerEmail || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setEmailError('Informe um e-mail válido.');
      return;
    }
    if (!orderId) {
      setEmailError('ID do pedido não encontrado.');
      return;
    }

    setIsSavingEmail(true);
    setEmailError(null);
    try {
      const apiUrl = getPublicApiUrl();
      const res = await fetch(`${apiUrl}/api/payments/update-email`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          email: cleanEmail,
          purchaseToken: purchaseToken || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setEmailSubmitted(true);
        saveAccessLocally(purchaseToken || orderId);
      } else {
        throw new Error(data.error || 'Erro ao salvar e-mail.');
      }
    } catch (err: any) {
      setEmailError(err?.message || 'Erro ao salvar e-mail. Tente novamente.');
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleQuickRecoverEmail = async () => {
    const cleanEmail = (recoveryEmailInput || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setRecoveryMsg('Informe um e-mail válido.');
      return;
    }

    setIsRecoveringEmail(true);
    setRecoveryMsg(null);
    try {
      const apiUrl = getPublicApiUrl();
      const res = await fetch(`${apiUrl}/api/payments/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ search: cleanEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setRecoveryMsg('✓ Pedido localizado no banco de dados! E-mail reenviado com sucesso.');
        if (data.orderId) {
          setOrderId(data.orderId);
        }
        setTimeout(() => {
          setPaymentStatus('approved');
        }, 1500);
      } else {
        throw new Error(data.error || 'Nenhum pedido pago localizado com este e-mail.');
      }
    } catch (err: any) {
      setRecoveryMsg(err?.message || 'Erro ao localizar pedido ou enviar e-mail.');
    } finally {
      setIsRecoveringEmail(false);
    }
  };

  const handleSimulateApprove = async () => {
    if (!isLocal || !orderId || isSimulating) return;
    setIsSimulating(true);
    try {
      const apiUrl = getPublicApiUrl();
      const endpoint = `${apiUrl}/api/payments/simulate-approve`;
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success && (data.paid || data.status === 'approved')) {
        setPaymentStatus('approved');
        const tokenToSave = data.purchaseToken || purchaseToken || orderId;
        saveAccessLocally(tokenToSave);
        onSuccess?.({ orderId, purchaseToken: tokenToSave });
      } else {
        throw new Error(data.error || 'Falha ao simular aprovação.');
      }
    } catch (err: any) {
      console.error('[Simulate Approve Error]:', err);
      alert(err?.message || 'Erro ao simular aprovação.');
    } finally {
      setIsSimulating(false);
    }
  };

  const checkoutEmail = (authenticatedProfile?.email || buyerEmail).trim().toLowerCase();
  const checkoutName = authenticatedProfile?.displayName;
  const activeContextKey = activeContext ? `${activeContext.type}:${activeContext.id}:${activeContext.numericPrice}` : '';

  useEffect(() => {
    setServerAmount(null);
  }, [activeContextKey]);

  const displayAmount = serverAmount ?? activeContext?.numericPrice ?? 0;

  useEffect(() => {
    if (!isOpen || !activeContext) {
      setPaymentStatus('pending');
      setTimeLeft(null);
      setExpiresAt(null);
      setOrderId(null);
      setPurchaseToken(null);
      setServerAmount(null);
      setPixPayload('');
      setQrCodeUrl('');
      setGenerationError(null);
      setCopied(false);
      setCopyError(false);
      return;
    }

    if (deferPixGeneration) return;
    let active = true;

    const applyPix = (pix: CheckoutPix) => {
      if (!active) return;
      setOrderId(pix.orderId);
      setPurchaseToken(pix.purchaseToken || null);
      setQrCodeUrl(pix.qrCodeUrl || '');
      setPixPayload(pix.qrCode);
      setExpiresAt(pix.expiresAt || null);
      setServerAmount(typeof pix.amount === 'number' && Number.isFinite(pix.amount) ? pix.amount : null);
      setIsGeneratingPix(false);
    };

    if (activeContext.initialPayment?.qrCode) {
      applyPix(activeContext.initialPayment);
      return;
    }
    if (!checkoutEmail) return;

    const requestKey = [activeContext.type, activeContext.id, checkoutEmail, isLocal].join(':');
    let pending = generated.current.get(requestKey);
    if (!pending) {
      pending = (async () => {
        const sessionKey = activeContext.type === 'avulso' ? await getCheckoutSessionKey(requestKey) : null;
        if (sessionKey) {
          try {
            const previous = JSON.parse(sessionStorage.getItem(sessionKey) || 'null') as CheckoutPix | null;
            if (previous?.orderId && previous.qrCode && Date.parse(previous.expiresAt || '') > Date.now()) return previous;
            sessionStorage.removeItem(sessionKey);
          } catch {}
        }

        const response = await fetch(getPublicApiUrl() + '/api/payments/create-pix', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: activeContext.type, slug: activeContext.id, productId: activeContext.id,
            payerEmail: checkoutEmail, payerName: checkoutName, simulate: isLocal,
            publicToken: activeContext.initialPayment?.purchaseToken,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success || !data.orderId || !data.qrCode) {
          throw new Error(data.error || 'Não foi possível gerar o Pix. Tente novamente.', {
            cause: data.code,
          });
        }
        const pix = {
          orderId: data.orderId, qrCode: data.qrCode, amount: data.amount, expiresAt: data.expiresAt,
          qrCodeUrl: data.qrCodeUrl || data.qrCodeBase64, purchaseToken: data.purchaseToken,
        };
        if (sessionKey) {
          try {
            sessionStorage.setItem(sessionKey, JSON.stringify({
              orderId: pix.orderId, qrCode: pix.qrCode, amount: pix.amount, expiresAt: pix.expiresAt,
            }));
          } catch {}
        }
        return pix;
      })();
      generated.current.set(requestKey, pending);
      pending.then(
        () => { if (activeContext.type === 'avulso') generated.current.delete(requestKey); },
        () => generated.current.delete(requestKey),
      );
    }
    setIsGeneratingPix(true);
    setGenerationError(null);
    pending.then(applyPix).catch((error: Error) => {
      if (!active) return;
      setGenerationError({ message: error.message, alreadyOwned: error.cause === 'PACK_ALREADY_OWNED', unavailable: error.cause === 'PACK_UNAVAILABLE' });
      setIsGeneratingPix(false);
    });
    return () => { active = false; };
  }, [isOpen, activeContext, retryCount, isLocal, deferPixGeneration, checkoutEmail, checkoutName]);

  const isFinal = paymentStatus === 'approved' || paymentStatus === 'rejected';
  useEffect(() => {
    if (!isOpen || !orderId || isFinal) return;
    const controller = new AbortController();
    let busy = false;
    const endpoint = getPublicApiUrl() + '/api/payments/status?orderId=' + encodeURIComponent(orderId);

    const sync = async () => {
      if (busy || document.hidden || controller.signal.aborted) return;
      busy = true;
      try {
        const response = await fetch(endpoint, { credentials: 'include', cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (controller.signal.aborted || !data.success) return;
        if (data.paid || data.status === 'approved') {
          setPaymentStatus('approved');
          const token = data.order?.purchaseToken || purchaseToken || orderId;
          saveAccessLocally(token);
          onSuccessRef.current?.({ orderId, purchaseToken: token });
        } else if (data.status === 'rejected' || data.status === 'cancelled') {
          setPaymentStatus('rejected');
        }
      } catch {} finally {
        busy = false;
      }
    };
    void sync();
    const interval = setInterval(sync, 8000);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('online', sync);
    window.addEventListener('focus', sync);
    window.addEventListener('pageshow', sync);
    return () => {
      controller.abort();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('online', sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener('pageshow', sync);
    };
  }, [isOpen, orderId, isFinal, purchaseToken, activeContext]);

  const retryOrder = () => {
    if (orderId || isGeneratingPix) return;
    setRetryCount((count) => count + 1);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return {
    activeContext,
    copyError,
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
    isGeneratingPix,
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
  };
}
