import React from 'react';
import {
  Clock,
  AlertCircle,
  RefreshCw,
  Loader2,
  Check,
  Copy,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { PixIcon } from '../site/Icons';

interface CheckoutPixScreenProps {
  timeLeft: number;
  formatTimer: (seconds: number) => string;
  generationError: string | null;
  onRetry: () => void;
  qrCodeUrl: string;
  pixPayload: string;
  copied: boolean;
  onCopyPix: () => void;
  recoveryEmailInput: string;
  onRecoveryEmailChange: (val: string) => void;
  onQuickRecoverEmail: () => void;
  isRecoveringEmail: boolean;
  recoveryMsg: string | null;
  isLocal: boolean;
  onSimulateApprove: () => void;
  isSimulating: boolean;
}

export function CheckoutPixScreen({
  timeLeft,
  formatTimer,
  generationError,
  onRetry,
  qrCodeUrl,
  pixPayload,
  copied,
  onCopyPix,
  recoveryEmailInput,
  onRecoveryEmailChange,
  onQuickRecoverEmail,
  isRecoveringEmail,
  recoveryMsg,
  isLocal,
  onSimulateApprove,
  isSimulating,
}: CheckoutPixScreenProps) {
  return (
    <div className="space-y-4 py-1">
      {/* Timer e Status */}
      <div className="flex items-center justify-between text-xs bg-black/50 px-4 py-2.5 rounded-xl border border-white/[0.06]">
        <span className="text-zinc-400 flex items-center gap-1.5 font-light">
          <Clock className="w-3.5 h-3.5 text-[#f4a7b9]" /> Expira em:
        </span>
        <span className="font-mono text-[#f4a7b9] font-medium text-sm">
          {formatTimer(timeLeft)}
        </span>
      </div>

      {/* QR Code Container ou Erro */}
      {generationError ? (
        <div className="p-5 rounded-2xl bg-red-950/40 border border-red-500/30 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5" />
          </div>
          <p className="text-xs text-red-200">{generationError}</p>
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-black text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tentar Novamente</span>
          </button>
        </div>
      ) : (
        <div className="bg-white p-4 rounded-2xl flex items-center justify-center max-w-[220px] mx-auto shadow-[0_4px_24px_rgba(255,255,255,0.08)]">
          {qrCodeUrl ? (
            <img
              src={qrCodeUrl}
              alt="QR Code Pix"
              className="w-full h-auto object-contain rounded-lg"
            />
          ) : (
            <div className="w-44 h-44 bg-zinc-200 animate-pulse rounded-lg flex items-center justify-center text-zinc-500 text-xs font-mono">
              <Loader2 className="w-5 h-5 animate-spin mr-1.5 text-zinc-400" />
              <span>Gerando QR Code...</span>
            </div>
          )}
        </div>
      )}

      {/* Pix Copia e Cola */}
      <div>
        <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <PixIcon className="w-3 h-3 text-[#f4a7b9]" /> Pix Copia e Cola
          </span>
          <span className="text-[10px] text-zinc-500 lowercase font-normal">
            clique para copiar
          </span>
        </label>

        <div className="relative">
          <input
            type="text"
            readOnly
            value={pixPayload}
            onClick={onCopyPix}
            className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-zinc-300 text-xs font-mono outline-none truncate pr-28 select-all cursor-pointer focus:border-[#f4a7b9]/50"
          />
          <button
            type="button"
            onClick={onCopyPix}
            className={`absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              copied
                ? 'bg-emerald-500 text-black'
                : 'bg-[#f4a7b9] hover:bg-[#ffb8c9] text-black'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 stroke-[3]" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Instruções passo a passo */}
      <div className="bg-white/[0.02] border border-white/[0.04] p-3.5 rounded-xl space-y-2 text-[11px] text-zinc-400 font-light">
        <div className="flex items-start gap-2.5">
          <span className="w-4 h-4 rounded-full bg-white/10 text-white flex items-center justify-center text-[9px] font-mono shrink-0 mt-0.5">
            1
          </span>
          <span className="flex-1">
            Abra o app do seu banco e escolha a opção <strong>Pix</strong>.
          </span>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="w-4 h-4 rounded-full bg-white/10 text-white flex items-center justify-center text-[9px] font-mono shrink-0 mt-0.5">
            2
          </span>
          <span className="flex-1">
            Escaneie o QR Code acima ou cole o código <strong>Copia e Cola</strong>.
          </span>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="w-4 h-4 rounded-full bg-white/10 text-white flex items-center justify-center text-[9px] font-mono shrink-0 mt-0.5">
            3
          </span>
          <span className="flex-1">
            Após pagar, a liberação ocorre <strong>automaticamente</strong> em poucos segundos.
          </span>
        </div>
      </div>

      {/* Garantia de Discrição */}
      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center gap-2.5 text-[11px] text-zinc-400">
        <ShieldCheck className="w-4 h-4 text-[#f4a7b9] shrink-0" />
        <span>
          <strong>Extrato Discreto:</strong> Cobrança identificada de forma neutra, sem qualquer menção a conteúdo adulto.
        </span>
      </div>

      {/* Painel Exclusivo de Simulação — Estritamente Localhost */}
      {isLocal && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 font-mono text-amber-300 font-semibold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Ambiente Localhost (Desenvolvimento)
            </span>
            <span className="text-[10px] text-zinc-400">Modo Simulado Ativo</span>
          </div>
          <p className="text-[11px] text-amber-200/80 font-light leading-relaxed">
            Em localhost, você pode testar o fluxo completo de compra e desbloqueio sem cobrança bancária real.
          </p>
          <button
            type="button"
            onClick={onSimulateApprove}
            disabled={isSimulating}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.99] text-zinc-950 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_2px_14px_rgba(251,191,36,0.25)]"
          >
            {isSimulating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Simular Pagamento Aprovado (Localhost)</span>
          </button>
        </div>
      )}

      {/* Caixa de Status de Confirmação Automática em Tempo Real */}
      <div className="p-4 rounded-2xl bg-zinc-950/80 border border-[#f4a7b9]/25 shadow-[0_0_24px_rgba(244,167,185,0.08)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-3 h-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f4a7b9] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f4a7b9]" />
            </div>
            <div>
              <p className="text-xs text-white font-medium">Aguardando confirmação bancária...</p>
              <p className="text-[10px] text-zinc-400 font-light">Validação automática em tempo real</p>
            </div>
          </div>
          <Loader2 className="w-4 h-4 text-[#f4a7b9] animate-spin shrink-0" />
        </div>
      </div>
    </div>
  );
}
