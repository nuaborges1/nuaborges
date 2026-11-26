'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Loader2, RefreshCw } from 'lucide-react';
import QRCode from 'qrcode';
import { fetchOrderPayment, type NuaIdOrderPayment } from '@/lib/nuaIdClient';

const MESSAGES = {
  paid: 'Pagamento confirmado.',
  confirming: 'Pagamento em confirmação. Acompanhe a atualização por aqui.',
  waiting_expiry: 'O prazo passou. Estamos conferindo a situação da cobrança com o Mercado Pago.',
  expired: 'Este código Pix venceu.',
  closed: 'Esta cobrança foi encerrada. Confira o status do pedido antes de pagar novamente.',
  unavailable: 'O código Pix está indisponível para este pedido.',
  renewed: 'Novo Pix gerado. Carregando o código…',
  renewal_review: 'O Mercado Pago ainda não confirmou a emissão de um novo Pix. Peça ajuda para conferir a cobrança.',
};

export function OrderPaymentPanel({
  id,
  onOrderUpdated,
  onOpenContact,
}: {
  id: string;
  onOrderUpdated: () => void;
  onOpenContact?: () => void;
}) {
  const [payment, setPayment] = useState<NuaIdOrderPayment | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [codeImage, setCodeImage] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const request = useRef<AbortController | null>(null);
  const orderUpdated = useRef(onOrderUpdated);
  useEffect(() => {
    orderUpdated.current = onOrderUpdated;
  }, [onOrderUpdated]);

  const check = useCallback(
    async (renew = false) => {
      if (request.current) return;
      const controller = new AbortController();
      request.current = controller;
      setBusy(true);
      try {
        let response = await fetchOrderPayment(id, controller.signal, renew);
        const renewed = response.data.state === 'renewed';
        if (renewed) response = await fetchOrderPayment(id, controller.signal);
        if (controller.signal.aborted) return;
        if (!response.ok || !response.data.state) {
          setError(
            response.status === 401
              ? 'Entre novamente na sua conta para consultar este Pix.'
              : renew
                ? 'Não foi possível confirmar o novo Pix. Verifique o pagamento para continuar.'
                : 'Não foi possível consultar o Pix. Tente novamente em instantes.'
          );
          setPayment(null);
          return;
        }
        setError('');
        setPayment(response.data);
        if (renewed) orderUpdated.current();
      } catch {
        if (!controller.signal.aborted) {
          setError('Não foi possível consultar o Pix. Tente novamente em instantes.');
          setPayment(null);
        }
      } finally {
        if (request.current === controller) {
          request.current = null;
          setBusy(false);
        }
      }
    },
    [id]
  );

  useEffect(() => {
    void check();
    return () => {
      request.current?.abort();
      request.current = null;
    };
  }, [check]);

  const state = payment?.state;
  useEffect(() => {
    if (state !== 'payable' && state !== 'confirming' && state !== 'waiting_expiry') return;
    const sync = () => {
      if (!document.hidden) void check();
    };
    const timer = window.setInterval(sync, 12000);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('online', sync);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('online', sync);
    };
  }, [check, state]);

  const reportedPaid = useRef(false);
  useEffect(() => {
    if (state === 'paid' && !reportedPaid.current) {
      reportedPaid.current = true;
      onOrderUpdated();
    }
  }, [onOrderUpdated, state]);

  const code = payment?.state === 'payable' ? payment.code : '';
  const expiresAt = payment?.state === 'payable' ? payment.expiresAt : null;
  useEffect(() => {
    setCodeImage('');
    setCopyStatus('');
    if (!code) return;
    let active = true;
    QRCode.toDataURL(code, { width: 224, margin: 2 })
      .then((image) => {
        if (active) setCodeImage(image);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [code]);

  useEffect(() => {
    if (!expiresAt) return;
    setNowMs(Date.now());
    const tick = window.setInterval(() => setNowMs(Date.now()), 1000);
    const delay = Math.max(0, new Date(expiresAt).getTime() - Date.now());
    const timer = window.setTimeout(() => {
      setPayment((current) => (current?.state === 'payable' ? { state: 'waiting_expiry' } : current));
      void check();
    }, Math.min(delay, 2147483647));
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(timer);
    };
  }, [check, expiresAt]);

  const isPayable = Boolean(code && (!expiresAt || Date.parse(expiresAt) > nowMs));
  const remainingSec = expiresAt ? Math.max(0, Math.floor((Date.parse(expiresAt) - nowMs) / 1000)) : null;
  const remainingLabel =
    remainingSec !== null && remainingSec > 0
      ? remainingSec >= 3600
        ? `${Math.floor(remainingSec / 3600)}h ${Math.floor((remainingSec % 3600) / 60)}m`
        : `${String(Math.floor(remainingSec / 60)).padStart(2, '0')}:${String(remainingSec % 60).padStart(2, '0')}`
      : null;
  const nextHref = payment?.state === 'expired' ? payment.nextHref : undefined;

  return (
    <section
      aria-label="Pagamento Pix"
      className="mt-4 rounded-2xl border border-[#7A293D]/40 bg-black/50 p-4 sm:p-5"
    >
      {isPayable ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {codeImage && (
            <img
              src={codeImage}
              alt="QR Code para pagar este pedido"
              width={136}
              height={136}
              className="mx-auto rounded-xl bg-white p-1 sm:mx-0"
            />
          )}
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-serif text-base font-normal text-[#F5EEE9]">Pagar com Pix</h4>
              {remainingLabel && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[11px] text-amber-200 tabular-nums">
                  Expira em {remainingLabel}
                </span>
              )}
            </div>
            <p className="text-xs leading-relaxed text-zinc-400">
              Escaneie o QR Code ou cole o código Pix no aplicativo do seu banco.
            </p>
            {expiresAt && (
              <p className="text-[11px] text-zinc-500">
                Válido até{' '}
                {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
                  new Date(expiresAt)
                )}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <input
                aria-label="Código Pix Copia e Cola"
                readOnly
                value={code}
                onFocus={(event) => event.currentTarget.select()}
                className="min-h-[42px] min-w-32 flex-1 rounded-xl border border-white/[0.1] bg-[#08080c] px-3 py-2 font-mono text-xs text-zinc-200 focus:border-[#90364B] focus:outline-none"
              />
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(code);
                    setCopied(true);
                    setCopyStatus('Código copiado.');
                    window.setTimeout(() => setCopied(false), 2500);
                  } catch {
                    setCopyStatus('Selecione o código para copiar manualmente.');
                  }
                }}
                className="btn-primary !min-h-[42px] !px-4 !text-[11px]"
              >
                {copied ? <Check className="size-3.5 text-emerald-300" /> : <Copy className="size-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar Pix'}</span>
              </button>
            </div>
            {copyStatus && (
              <p role="status" className="sr-only">
                {copyStatus}
              </p>
            )}
          </div>
        </div>
      ) : (
        <p role="status" className="flex items-center gap-2 text-sm text-[#F5EEE9]">
          {state === 'paid' && <Check className="size-4 text-emerald-300" />}
          {!state && busy && <Loader2 className="size-4 animate-spin text-[#90364B]" />}
          <span>
            {error ||
              (state && state !== 'payable'
                ? MESSAGES[state]
                : busy
                  ? 'Consultando o pagamento…'
                  : 'Consultando a validade do Pix…')}
          </span>
        </p>
      )}

      <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {nextHref && payment?.state === 'expired' && (
          <Link href={nextHref} className="font-medium text-[#90364B] underline underline-offset-4 hover:text-[#F5EEE9]">
            {payment.nextLabel}
          </Link>
        )}
        {payment?.state === 'expired' && payment.canRenew && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void check(true)}
            className="btn-primary !min-h-[40px] !px-5 !text-[11px]"
          >
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            <span>{busy ? 'Gerando Pix…' : 'Gerar novo Pix'}</span>
          </button>
        )}
        {payment?.state === 'expired' && payment.canRenew && (
          <p className="text-zinc-400">O novo código mantém o mesmo pedido e valor.</p>
        )}
        {(state === 'unavailable' ||
          state === 'renewal_review' ||
          (payment?.state === 'expired' && !payment.canRenew && !nextHref)) &&
          (onOpenContact ? (
            <button
              type="button"
              onClick={onOpenContact}
              className="font-medium text-[#F5EEE9]/80 underline underline-offset-4 hover:text-[#F5EEE9] cursor-pointer"
            >
              Pedir ajuda com o pedido
            </button>
          ) : (
            <Link
              href="/contato"
              className="font-medium text-[#F5EEE9]/80 underline underline-offset-4 hover:text-[#F5EEE9]"
            >
              Pedir ajuda com o pedido
            </Link>
          ))}
        {(error || isPayable || state === 'confirming' || state === 'waiting_expiry') && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void check()}
            className="inline-flex min-h-[36px] items-center gap-1.5 text-zinc-300 transition-colors hover:text-[#F5EEE9] disabled:opacity-45 cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${busy ? 'animate-spin' : ''}`} />
            <span>{error ? 'Tentar novamente' : 'Verificar pagamento'}</span>
          </button>
        )}
      </div>
    </section>
  );
}
