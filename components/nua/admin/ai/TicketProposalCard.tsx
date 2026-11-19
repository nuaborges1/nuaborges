/* Vinho maduro / Nua Borges */
import React from 'react';
import { Check, RefreshCw, Send } from 'lucide-react';
import { ParsedTicketProposal } from './types';

interface TicketProposalCardProps {
  msgId: string;
  ticket: ParsedTicketProposal;
  isSent: boolean;
  isSending: boolean;
  onConfirmSend: (msgId: string, ticket: ParsedTicketProposal) => void;
  onAdjustDetails: () => void;
}

export function TicketProposalCard({
  msgId,
  ticket,
  isSent,
  isSending,
  onConfirmSend,
  onAdjustDetails,
}: TicketProposalCardProps) {
  return (
    <div className="mt-3 p-3.5 rounded-xl bg-[#171821] border border-[#843C52]/30 shadow-md space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${isSent ? 'bg-emerald-400' : 'bg-[#843C52] animate-pulse'
              }`}
          />
          <span className="text-[10px] font-semibold text-white uppercase tracking-wider">
            {isSent ? 'Pedido Encaminhado ao Dev' : 'Pronto para Envio ao Philippe'}
          </span>
        </div>
        <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#843C52]/15 text-[#843C52] font-medium border border-[#843C52]/25 font-mono">
          {ticket.type}
        </span>
      </div>

      <div className="text-xs text-zinc-300 leading-relaxed space-y-1 bg-[#0e0f14] p-2.5 rounded-lg border border-white/[0.06]">
        <p className="font-semibold text-white truncate">{ticket.title}</p>
        <p className="text-zinc-400 text-[10px]">Área: {ticket.section}</p>
      </div>

      <p className="text-[11px] text-zinc-300 font-light leading-snug">
        {isSent
          ? 'O Philippe já recebeu este pedido na Central dele! Você pode acompanhar o progresso na aba Meus Pedidos.'
          : 'Deseja que eu envie este pedido diretamente para a Central de Atendimento do Philippe agora?'}
      </p>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          disabled={isSending || isSent}
          onClick={() => onConfirmSend(msgId, ticket)}
          className={`h-8 px-4 rounded-full font-semibold text-xs transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer ${isSent
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
              : 'bg-[#843C52] hover:bg-[#992b4a] text-white'
            }`}
        >
          {isSent ? (
            <>
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Enviado com Sucesso</span>
            </>
          ) : isSending ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Enviando para o Philippe...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Confirmar e Enviar para o Philippe</span>
            </>
          )}
        </button>

        {!isSent && (
          <button
            type="button"
            onClick={onAdjustDetails}
            className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] text-xs font-medium transition cursor-pointer"
          >
            Ajustar detalhes
          </button>
        )}
      </div>
    </div>
  );
}
