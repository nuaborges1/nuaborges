'use client';

import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          action?: string;
          theme?: 'dark' | 'light' | 'auto';
          size?: 'normal' | 'flexible' | 'compact';
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

interface TurnstileWidgetProps {
  action?: string;
  resetSignal?: number;
  onToken: (token: string | undefined) => void;
}

const SCRIPT_ID = 'cf-turnstile-api-script';

export function TurnstileWidget({ action = 'login', resetSignal = 0, onToken }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const [loadError, setLoadError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || typeof window === 'undefined') return;
    let cancelled = false;
    setLoadError(false);

    const mountWidget = () => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      setLoadError(false);
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        action,
        theme: 'dark',
        size: 'flexible',
        callback: (token) => {
          setLoadError(false);
          onTokenRef.current(token);
        },
        'expired-callback': () => onTokenRef.current(undefined),
        'error-callback': () => {
          onTokenRef.current(undefined);
          setLoadError(true);
        },
      });
    };

    const handleScriptError = () => {
      if (cancelled) return;
      onTokenRef.current(undefined);
      setLoadError(true);
    };

    if (window.turnstile) {
      mountWidget();
    } else {
      let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener('load', mountWidget);
      script.addEventListener('error', handleScriptError);
      return () => {
        cancelled = true;
        script?.removeEventListener('load', mountWidget);
        script?.removeEventListener('error', handleScriptError);
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {}
          widgetIdRef.current = null;
        }
      };
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [action, retryTick]);

  useEffect(() => {
    if (!resetSignal || !widgetIdRef.current || !window.turnstile) return;
    onTokenRef.current(undefined);
    try {
      window.turnstile.reset(widgetIdRef.current);
    } catch {}
  }, [resetSignal]);

  if (!TURNSTILE_SITE_KEY) return null;

  return (
    <div className="w-full space-y-2">
      <div ref={containerRef} className="w-full min-h-[65px] flex justify-center" />
      {loadError && (
        <div className="text-center text-xs text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
          <span>Não foi possível carregar a verificação de segurança. </span>
          <button
            type="button"
            onClick={() => {
              const oldScript = document.getElementById(SCRIPT_ID);
              if (oldScript && !window.turnstile) oldScript.remove();
              setRetryTick((n) => n + 1);
            }}
            className="underline font-semibold text-white hover:text-amber-200 cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}
