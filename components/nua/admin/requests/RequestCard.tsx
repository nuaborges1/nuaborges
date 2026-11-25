/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import {
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { RequestItem, STATUS_CONFIG } from './types';
import { FormattedText } from './FormattedText';

interface RequestCardProps {
  item: RequestItem;
  isOpen: boolean;
  onToggle: () => void;
  replyText: string;
  onReplyTextChange: (val: string) => void;
  onSendReply: () => void;
  isSendingReply: boolean;
}

export function RequestCard({
  item,
  isOpen,
  onToggle,
  replyText,
  onReplyTextChange,
  onSendReply,
  isSendingReply,
}: RequestCardProps) {
  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.new;
  const StatusIcon = cfg.icon;
  const clientReplies = item.messages || [];

  return (
    <div
      className={`rounded-3xl border transition-all overflow-hidden ${
        item.status === 'done'
          ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
          : 'bg-zinc-900/40 border-zinc-800/90 hover:border-zinc-700/80'
      }`}
    >
      {/* Cabeçalho do Card */}
      <div
        onClick={onToggle}
        className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
      >
        <div className="space-y-1.5 flex-1 min-w-0 pr-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.badgeClass}`}
            >
              <StatusIcon className="w-3 h-3" />
              <span>{cfg.label}</span>
            </span>

            {item.category && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800/90 text-zinc-400 border border-zinc-700/70 font-mono">
                {item.category}
              </span>
            )}

            <span className="text-[11px] text-zinc-500 font-mono ml-auto sm:ml-0">
              {new Date(item.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <h4 className="text-sm font-semibold text-white truncate">{item.title}</h4>
          <p className="text-xs text-zinc-400 line-clamp-1">{item.summary}</p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-mono">
            <MessageSquare className="w-3 h-3" />
            {clientReplies.length}
          </span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </div>
      </div>

      {/* Corpo Expansível */}
      {isOpen && (
        <div className="px-5 pb-5 pt-2 border-t border-zinc-800/80 space-y-4 text-xs">
          {/* Descrição do status atual */}
          <div
            className={`p-3.5 rounded-2xl border space-y-1 ${
              item.status === 'done'
                ? 'bg-emerald-950/40 border-emerald-500/30'
                : 'bg-zinc-950/70 border-zinc-800/80'
            }`}
          >
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block">
              Situação Atual do Pedido
            </span>
            <p className="text-zinc-200 text-xs font-medium">{cfg.description}</p>
          </div>

          {/* Pedido inicial / resumo */}
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block">
              O que foi solicitado
            </span>
            <div className="p-3.5 rounded-2xl bg-zinc-950/90 border border-zinc-800 text-zinc-200 leading-relaxed">
              <FormattedText text={item.summary || item.originalText} />
            </div>
          </div>

          {/* Conversa / Mensagens */}
          <div className="space-y-2 pt-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block">
              Histórico de Mensagens ({clientReplies.length})
            </span>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {clientReplies.map((m, mIdx) => (
                <div
                  key={mIdx}
                  className={`p-3 rounded-2xl ${
                    m.role === 'client'
                      ? 'bg-zinc-900 border border-zinc-800 text-zinc-200 ml-4'
                      : 'bg-[#843C52]/15 border border-[#843C52]/30 text-white mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                    <span className="font-semibold text-[#843C52]">
                      {m.role === 'client' ? 'Você (Nua Borges)' : 'Philippe (Desenvolvedor)'}
                    </span>
                    {m.at && (
                      <span>
                        {new Date(m.at).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                  <FormattedText text={m.text} className="text-xs" />
                </div>
              ))}
            </div>

            {/* Campo para responder / adicionar detalhe ao pedido */}
            <div className="pt-2 flex gap-2">
              <input
                type="text"
                placeholder="Adicionar mais um detalhe ou responder ao Philippe..."
                value={replyText}
                onChange={(e) => onReplyTextChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSendReply();
                }}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#843C52]"
              />
              <button
                type="button"
                disabled={isSendingReply || !replyText.trim()}
                onClick={onSendReply}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-[#843C52] hover:text-white text-zinc-950 font-bold font-medium text-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSendingReply ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
