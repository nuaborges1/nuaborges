import { useState, useEffect, useRef, useMemo } from 'react';
import QRCode from 'qrcode';
import { AvulsoProductItem } from '@/lib/types';
import { getPublicApiUrl } from '@/lib/contentStore';
import { isLocalhost } from '@/lib/env';
import { useScrollLock } from '@/hooks/useScrollLock';
import { UniversalCheckoutContext, CheckoutDetailItem } from './types';

interface UseCheckoutOrderOptions {
  isOpen: boolean;
  onClose: () => void;
  product?: AvulsoProductItem | null;
  checkoutContext?: UniversalCheckoutContext | null;
  onSuccess?: (result: { orderId: string; purchaseToken?: string }) => void;
}

export function useCheckoutOrder({
  isOpen,
  onClose,
  product,
  checkoutContext,
  onSuccess,
}: UseCheckoutOrderOptions) {
  const [copied, setCopied] = useState(false);
  const [pixPayload, setPixPayload] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [paymentStatus, setPaymentStatus] = useState<
    'pending' | 'verifying' | 'approved' | 'rejected' | 'expired'
  >('pending');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [purchaseToken, setPurchaseToken] = useState<string | null>(null);
  const [displayAmount, setDisplayAmount] = useState<number>(29.9);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
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
  const pixCreatedForRef = useRef<string | null>(null);

  const activeContext: UniversalCheckoutContext | null = useMemo(() => {
    if (checkoutContext) return checkoutContext;
    if (product) {
      const clean = (product.price || '').replace(/[^\d,.]/g, '').replace(',', '.');
      const num = parseFloat(clean);
      const parsedPrice = isNaN(num) || num <= 0 ? 29.9 : num;
      const productSlug = product.slug || product.id?.replace(/^avulso-/, '') || '';

      const details: CheckoutDetailItem[] = [];
      if (product.duration) {
        details.push({ label: 'Duração', value: product.duration });
      }

      // Contagem dinâmica e precisa das mídias associadas ao produto
      const photoCount =
        product.exclusivePhotos && product.exclusivePhotos.length > 0
          ? product.exclusivePhotos.length
          : product.previewImages?.length || 0;
      const videoCount = product.videos?.length || 0;

      const mediaParts: string[] = [];
      if (photoCount > 0) {
        mediaParts.push(`${photoCount} Foto${photoCount !== 1 ? 's' : ''} 4K`);
      }
      if (videoCount > 0) {
        mediaParts.push(`${videoCount} Vídeo${videoCount !== 1 ? 's' : ''} UHD`);
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
        subtitle: 'Acesso vitalício sem renovação',
        priceFormatted: product.price || `R$ ${parsedPrice.toFixed(2).replace('.', ',')}`,
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
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

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
    if (!isOpen || paymentStatus !== 'pending') return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setPaymentStatus('expired');
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, paymentStatus]);

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

  const handleCopyPix = () => {
    if (!pixPayload) return;
    navigator.clipboard?.writeText(pixPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, email: cleanEmail }),
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

  // Inicialização do pagamento Pix
  useEffect(() => {
    if (!isOpen || !activeContext) {
      pixCreatedForRef.current = null;
      setPaymentStatus('pending');
      setTimeLeft(15 * 60);
      setOrderId(null);
      setPurchaseToken(null);
      setPixPayload('');
      setQrCodeUrl('');
      setGenerationError(null);
      return;
    }

    const currentKey = `${activeContext.type}_${activeContext.id}_${retryCount}`;
    if (pixCreatedForRef.current === currentKey) {
      return;
    }
    pixCreatedForRef.current = currentKey;

    let isMounted = true;
    setDisplayAmount(activeContext.numericPrice);

    if (activeContext.initialPayment?.qrCode) {
      const init = activeContext.initialPayment;
      setOrderId(init.orderId);
      if (init.purchaseToken) setPurchaseToken(init.purchaseToken);
      setPixPayload(init.qrCode);
      if (init.qrCodeUrl) setQrCodeUrl(init.qrCodeUrl);
      if (init.amount) setDisplayAmount(init.amount);
      setIsGeneratingPix(false);
      setGenerationError(null);
      return;
    }

    setIsGeneratingPix(true);
    setGenerationError(null);

    const apiUrl = getPublicApiUrl();
    const endpoint = `${apiUrl}/api/payments/create-pix`;

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: activeContext.type,
        slug: activeContext.id,
        productId: activeContext.id,
        price: activeContext.numericPrice,
        title: activeContext.title,
        payerEmail: buyerEmail || undefined,
        simulate: isLocal,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          throw new Error(data.error || `Erro de comunicação HTTP ${res.status}`);
        }
        return data;
      })
      .then((data: any) => {
        if (!isMounted) return;

        if (data.success && data.qrCode) {
          setOrderId(data.orderId);
          if (data.purchaseToken) setPurchaseToken(data.purchaseToken);
          setPixPayload(data.qrCode);
          setQrCodeUrl(data.qrCodeUrl || data.qrCodeBase64 || '');
          if (data.amount) setDisplayAmount(data.amount);
        } else {
          throw new Error(data.error || 'Não foi possível gerar a chave Pix oficial.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('[Checkout Pix]', err);
        setGenerationError(
          err?.message || 'Não foi possível gerar o Pix agora. Tente novamente em instantes.'
        );
      })
      .finally(() => {
        if (isMounted) setIsGeneratingPix(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeContext, retryCount, isLocal]);

  // Polling automático no servidor para detectar aprovação do Pix em tempo real
  useEffect(() => {
    if (!isOpen || !orderId || paymentStatus === 'approved' || paymentStatus === 'rejected') return;

    const apiUrl = getPublicApiUrl();
    const endpoint = `${apiUrl}/api/payments/status?orderId=${encodeURIComponent(orderId)}`;

    const pollInterval = setInterval(() => {
      fetch(endpoint)
        .then((r) => r.json())
        .then((data: any) => {
          if (data.success && (data.paid || data.status === 'approved')) {
            setPaymentStatus('approved');
            const tokenToSave = data.order?.purchaseToken || purchaseToken || orderId;
            saveAccessLocally(tokenToSave);
            onSuccess?.({ orderId, purchaseToken: tokenToSave });
            clearInterval(pollInterval);
          } else if (data.status === 'rejected' || data.status === 'cancelled') {
            setPaymentStatus('rejected');
            clearInterval(pollInterval);
          }
        })
        .catch(() => {});
    }, 2800);

    return () => clearInterval(pollInterval);
  }, [isOpen, orderId, paymentStatus, purchaseToken, onSuccess]);

  const retryOrder = (options?: { resetTime?: boolean }) => {
    setPaymentStatus('pending');
    if (options?.resetTime) {
      setTimeLeft(15 * 60);
    }
    setRetryCount((c) => c + 1);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return {
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
    isGeneratingPix,
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
    handleSaveBuyerEmail,
    handleQuickRecoverEmail,
    handleSimulateApprove,
    retryOrder,
  };
}
