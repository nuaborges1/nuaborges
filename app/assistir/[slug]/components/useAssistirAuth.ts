'use client';

import React, { useState, useEffect } from 'react';
import { getPublicApiUrl } from '@/lib/contentStore';
import { getDeviceFingerprint } from './helpers';
import { AvulsoProductItem } from '@/lib/types';

interface UseAssistirAuthOptions {
  product: AvulsoProductItem | null;
  productSlug: string;
  tokenFromUrl: string | null;
}

export function useAssistirAuth({ product, productSlug, tokenFromUrl }: UseAssistirAuthOptions) {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [watermarkText, setWatermarkText] = useState('NUA BORGES ♡ | CÓPIA PRIVATIVA AUTORIZADA');
  const [activeToken, setActiveToken] = useState<string | null>(null);

  // Fluxo de Autenticação OTP em 2 Passos
  const [step, setStep] = useState<'request_otp' | 'verify_otp'>('request_otp');
  const [orderInput, setOrderInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);

  // Valida o Token de Sessão / Acesso no Servidor na inicialização
  useEffect(() => {
    if (!product) return;
    let isMounted = true;
    setIsVerifying(true);

    const tokenToValidate =
      tokenFromUrl ||
      (typeof window !== 'undefined'
        ? localStorage.getItem(`nua_session_token_${productSlug}`) ||
          localStorage.getItem(`nua_access_token_${productSlug}`)
        : null);

    if (!tokenToValidate) {
      setIsVerifying(false);
      setIsAuthorized(false);
      return;
    }

    const apiUrl = getPublicApiUrl();
    const fingerprint = getDeviceFingerprint();

    fetch(`${apiUrl}/api/payments/verify-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: tokenToValidate,
        sessionToken: tokenToValidate,
        slug: productSlug,
        deviceFingerprint: fingerprint,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!isMounted) return;

        if (res.ok && data.authorized) {
          setIsAuthorized(true);
          setActiveToken(data.sessionToken || data.purchaseToken || tokenToValidate);
          if (data.watermarkText) setWatermarkText(data.watermarkText);
          try {
            localStorage.setItem(`nua_session_token_${productSlug}`, data.sessionToken || tokenToValidate);
            localStorage.setItem(`nua_access_token_${productSlug}`, data.sessionToken || tokenToValidate);
            localStorage.setItem(`nua_unlocked_${productSlug}`, 'true');
          } catch {}
        } else {
          setIsAuthorized(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsAuthorized(false);
      })
      .finally(() => {
        if (isMounted) setIsVerifying(false);
      });

    return () => {
      isMounted = false;
    };
  }, [tokenFromUrl, productSlug, product]);

  // Proteções Anti-DevTools e Anti-Cópia Avançadas
  useEffect(() => {
    if (!isAuthorized) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P')) ||
        e.key === 'PrintScreen'
      ) {
        e.preventDefault();
        return false;
      }
    };

    const checkDevTools = () => {
      const threshold = 160;
      if (window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold) {
        setIsDevToolsOpen(true);
      } else {
        setIsDevToolsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', checkDevTools);
    const interval = setInterval(checkDevTools, 2500);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', checkDevTools);
      clearInterval(interval);
    };
  }, [isAuthorized]);

  const handleValidateToken = async (inputToken: string) => {
    const clean = inputToken.trim();
    if (!clean) {
      setAuthError('Por favor, informe seu token de acesso.');
      return;
    }

    setIsSubmitting(true);
    setAuthError(null);

    try {
      const apiUrl = getPublicApiUrl();
      const fingerprint = getDeviceFingerprint();

      const res = await fetch(`${apiUrl}/api/payments/verify-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: clean,
          sessionToken: clean,
          slug: productSlug,
          deviceFingerprint: fingerprint,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.authorized) {
        setIsAuthorized(true);
        setActiveToken(data.sessionToken || data.purchaseToken || clean);
        if (data.watermarkText) setWatermarkText(data.watermarkText);
        try {
          localStorage.setItem(`nua_session_token_${productSlug}`, data.sessionToken || clean);
          localStorage.setItem(`nua_access_token_${productSlug}`, data.sessionToken || clean);
          localStorage.setItem(`nua_unlocked_${productSlug}`, 'true');
        } catch {}
      } else {
        setAuthError(data.error || 'Token inválido, expirado ou compra não localizada. Verifique o código informado.');
      }
    } catch {
      setAuthError('Falha ao validar token com o servidor. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = orderInput.trim();
    if (!query) {
      setAuthError('Por favor, informe seu token de acesso.');
      return;
    }

    // Se não for um e-mail com @, valida diretamente como Token de Acesso
    if (!query.includes('@')) {
      await handleValidateToken(query);
      return;
    }

    setIsSubmitting(true);
    setAuthError(null);

    try {
      const apiUrl = getPublicApiUrl();
      const res = await fetch(`${apiUrl}/api/payments/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ search: query, slug: productSlug }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.orderId) {
        setPendingOrderId(data.orderId);
        setMaskedEmail(data.maskedEmail || 'seu e-mail de compra');
        setStep('verify_otp');
        setOtpInput('');
      } else {
        setAuthError(data.error || 'Nenhuma compra aprovada foi localizada com estes dados.');
      }
    } catch {
      setAuthError('Falha de conexão ao enviar código de verificação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpInput.trim();
    if (!code || !pendingOrderId) {
      setAuthError('Digite o código de 6 dígitos recebido por e-mail.');
      return;
    }

    setIsSubmitting(true);
    setAuthError(null);

    try {
      const apiUrl = getPublicApiUrl();
      const fingerprint = getDeviceFingerprint();

      const res = await fetch(`${apiUrl}/api/payments/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: pendingOrderId,
          code,
          deviceFingerprint: fingerprint,
          slug: productSlug,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.authorized && data.sessionToken) {
        setActiveToken(data.sessionToken);
        setIsAuthorized(true);
        if (data.watermarkText) setWatermarkText(data.watermarkText);
        try {
          localStorage.setItem(`nua_session_token_${productSlug}`, data.sessionToken);
          localStorage.setItem(`nua_access_token_${productSlug}`, data.sessionToken);
          localStorage.setItem(`nua_unlocked_${productSlug}`, 'true');
        } catch {}
      } else {
        setAuthError(data.error || 'Código incorreto ou expirado. Verifique e tente novamente.');
      }
    } catch {
      setAuthError('Falha ao validar código de verificação com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isVerifying,
    isAuthorized,
    watermarkText,
    activeToken,
    step,
    setStep,
    orderInput,
    setOrderInput,
    otpInput,
    setOtpInput,
    maskedEmail,
    authError,
    setAuthError,
    isSubmitting,
    isDevToolsOpen,
    setIsDevToolsOpen,
    handleRequestOtp,
    handleVerifyOtp,
  };
}
