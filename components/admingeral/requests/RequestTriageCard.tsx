'use client';

import React from 'react';
import {
  Flame,
  Copy,
  Check,
  RefreshCw,
  Send,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileCode,
  Terminal,
  User,
  CheckCheck,
  Bot,
} from 'lucide-react';
import {
  Req,
  PIPELINE_STAGES,
  STATUS_LABEL,
  PRIORITY_CONFIG,
  formatRelativeTime,
} from './types';
import { FormattedText } from './FormattedText';

interface RequestTriageCardProps {
  req: Req;
  isOpen: boolean;
  onToggle: () => void;
  isCopied: boolean;
  onCopyPrompt: (e: React.MouseEvent) => void;
  busy: boolean;
  onPostAction: (payload: any) => Promise<void>;
  replyText: string;
  onReplyTextChange: (val: string) => void;
  onSendReply: () => void;
  showToast: (msg: string) => void;
}

export function RequestTriageCard({
  req,
  isOpen,
  onToggle,
  isCopied,
  onCopyPrompt,
  busy,
  onPostAction,
  replyText,
  onReplyTextChange,
  onSendReply,
  showToast,
}: RequestTriageCardProps) {
  const priorityCfg = PRIORITY_CONFIG[req.priority] || PRIORITY_CONFIG.medium;
  const targetFiles = req.targetFiles || [];

  return (
    <div
      className={`rounded-3xl border transition-all duration-200 overflow-hidden ${
        isOpen
          ? 'bg-zinc-900/90 border-[#f4a7b9]/40 shadow-2xl ring-1 ring-[#f4a7b9]/20'
          : 'bg-zinc-900/40 hover:bg-zinc-900/70 border-zinc-800/90 hover:border-zinc-700/80'
      }`}
    >
      {/* CABEÇALHO DO CARD */}
      <div
        onClick={onToggle}
        className="p-5 flex flex-col gap-3.5 cursor-pointer select-none"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center flex-wrap gap-2">
            {/* Priority Badge */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${priorityCfg.bgClass} ${priorityCfg.textClass} ${priorityCfg.borderClass}`}
            >
              {req.priority === 'critical' && <Flame className="w-3 h-3 animate-pulse" />}
              {priorityCfg.label}
            </span>

            {/* Category Badge */}
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-800/80 border border-zinc-700/60 text-zinc-300">
              {req.category || 'Geral'}
            </span>

            {/* Source Badge */}
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-zinc-500 bg-zinc-950/60 border border-zinc-800">
              {req.source === 'gemini' ? '⚡ Gemini' : '🔍 Heurística'}
            </span>

            {/* Contract Scope Badge */}
            {req.contractScope && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  req.contractScope === 'garantia'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : req.contractScope === 'fora_de_escopo_orcamento'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                }`}
              >
                {req.contractScope === 'garantia'
                  ? '🛡️ Garantia (Cl. 6.2)'
                  : req.contractScope === 'fora_de_escopo_orcamento'
                  ? '💰 Fora de Escopo (Cl. 7.1)'
                  : '⏱️ Franquia Suporte (Cl. 6.3)'}
              </span>
            )}

            <span className="text-[11px] text-zinc-500 font-light">
              {formatRelativeTime(req.createdAt)}
            </span>
          </div>

          {/* Botão de Atalho Rápido para Copiar Prompt sem precisar abrir */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={onCopyPrompt}
              className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition-all inline-flex items-center gap-1.5 ${
                isCopied
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                  : 'bg-zinc-800 hover:bg-[#f4a7b9] hover:text-zinc-950 text-zinc-200'
              }`}
              title="Copiar prompt de IA gerado para clipboard"
            >
              {isCopied ? (
                <>
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Prompt Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Prompt IA</span>
                </>
              )}
            </button>

            <div className="p-1 rounded-lg text-zinc-400 hover:text-white">
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>

        {/* Título & Resumo Curto */}
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-white tracking-wide">
            {req.title}
          </h3>
          <p className="text-xs text-zinc-400 font-light line-clamp-1 mt-0.5">
            {req.summary || req.originalText}
          </p>
        </div>

        {/* VISUAL PIPELINE STEPPER */}
        <div className="pt-2 border-t border-zinc-800/60">
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
            {PIPELINE_STAGES.map((stg, sIdx) => {
              const currentIdx = PIPELINE_STAGES.findIndex((s) => s.key === req.status);
              const isDone = currentIdx > sIdx || req.status === 'done';
              const isCurrent = req.status === stg.key;

              return (
                <React.Fragment key={stg.key}>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onPostAction({ action: 'update', id: req.id, status: stg.key });
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all cursor-pointer shrink-0 ${
                      isCurrent
                        ? 'bg-[#f4a7b9]/20 text-[#f4a7b9] border border-[#f4a7b9]/40 shadow-sm'
                        : isDone
                        ? 'text-emerald-400 hover:bg-zinc-800/60'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
                    }`}
                    title={`Mudar status para: ${stg.label}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isCurrent
                          ? 'bg-[#f4a7b9] animate-pulse'
                          : isDone
                          ? 'bg-emerald-400'
                          : 'bg-zinc-600'
                      }`}
                    />
                    <span>{stg.label}</span>
                  </div>

                  {sIdx < PIPELINE_STAGES.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 min-w-4 transition-colors ${
                        isDone ? 'bg-emerald-500/40' : 'bg-zinc-800'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* DETALHES EXPANDIDOS */}
      {isOpen && (
        <div
          className="p-5 sm:p-6 bg-zinc-950/90 border-t border-zinc-800/90 space-y-6 animate-in fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. SEÇÃO: O QUE A CLIENTE PEDIU */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
              <User className="w-3.5 h-3.5 text-[#f4a7b9]" />
              <span>Solicitação Original da Cliente</span>
            </div>
            <blockquote className="text-xs sm:text-sm text-zinc-200 font-light italic pl-3 border-l-2 border-[#f4a7b9] leading-relaxed">
              "{req.originalText}"
            </blockquote>
            {req.messages && req.messages.length > 1 && (
              <details className="text-[11px] text-zinc-400 pt-2">
                <summary className="cursor-pointer text-[#f4a7b9] hover:underline font-medium">
                  Ver histórico completo da conversa ({req.messages.length} mensagens)
                </summary>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  {req.messages.map((m, mIdx) => (
                    <div
                      key={mIdx}
                      className={`p-2 rounded-lg ${
                        m.role === 'client'
                          ? 'bg-zinc-900 border border-zinc-800'
                          : 'bg-[#f4a7b9]/10 border border-[#f4a7b9]/20'
                      }`}
                    >
                      <span className="font-semibold text-zinc-300 text-[10px] block">
                        {m.role === 'client' ? 'Cliente' : 'Assistente IA'}:
                      </span>
                      <FormattedText text={m.text} className="text-zinc-200 text-xs mt-0.5" />
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>

          {/* 2. SEÇÃO: RESUMO EXECUTIVO & DIAGNÓSTICO */}
          <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              <span>Resumo Executivo do Diagnóstico</span>
            </div>
            <FormattedText text={req.summary} className="text-xs text-zinc-300 font-light" />
          </div>

          {/* 3. PROMPT DE ENGENHARIA PARA AGENTE DE IA */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950 border border-emerald-500/30 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Terminal className="w-4 h-4" />
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                    Prompt Técnico para Agente de IA (Claude Code / Antigravity / Cursor)
                  </h4>
                </div>
                <p className="text-[11px] text-zinc-400 font-light">
                  Pronto para copiar e colar diretamente no terminal do agente de IA para executar a alteração no código.
                </p>
              </div>

              <button
                onClick={onCopyPrompt}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg inline-flex items-center gap-2 cursor-pointer ${
                  isCopied
                    ? 'bg-emerald-400 text-zinc-950 shadow-emerald-400/30'
                    : 'bg-[#f4a7b9] hover:bg-[#fabcc9] text-zinc-950 shadow-[#f4a7b9]/20'
                }`}
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Prompt Copiado com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Prompt para Agente de IA</span>
                  </>
                )}
              </button>
            </div>

            {/* Arquivos-Alvo */}
            {targetFiles.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-semibold block">
                  Arquivos-Alvo Identificados no Repositório:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {targetFiles.map((file, fIdx) => (
                    <span
                      key={fIdx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-zinc-900 border border-zinc-700/80 text-emerald-300"
                    >
                      <FileCode className="w-3 h-3 text-emerald-400" />
                      <code>{file}</code>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Bloco de Código com o Prompt Formatado */}
            <div className="relative group">
              <pre className="p-4 rounded-xl bg-black/90 border border-zinc-800 text-[11px] sm:text-xs text-zinc-300 font-mono whitespace-pre-wrap max-h-96 overflow-y-auto scrollbar-thin selection:bg-[#f4a7b9]/30">
                {req.aiAgentPrompt || req.technicalPlan}
              </pre>

              <button
                onClick={onCopyPrompt}
                className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-mono border border-zinc-700 opacity-80 hover:opacity-100 transition-opacity flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                <span>Copiar</span>
              </button>
            </div>
          </div>

          {/* 4. AÇÕES DE WORKFLOW & GERENCIAMENTO */}
          <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span>Status:</span>
                <select
                  value={req.status}
                  onChange={(e) => onPostAction({ action: 'update', id: req.id, status: e.target.value })}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#f4a7b9]"
                >
                  {Object.entries(STATUS_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span>Prioridade:</span>
                <select
                  value={req.priority}
                  onChange={(e) => onPostAction({ action: 'update', id: req.id, priority: e.target.value })}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#f4a7b9]"
                >
                  {Object.entries(PRIORITY_CONFIG).map(([k, cfg]) => (
                    <option key={k} value={k}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                disabled={busy}
                onClick={() => {
                  onPostAction({ action: 'update', id: req.id, reanalyze: true });
                  showToast('⚡ Reanalisando com Gemini contra a arquitetura atual do código...');
                }}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${busy ? 'animate-spin' : ''}`} />
                <span>Reanalisar com Gemini</span>
              </button>
            </div>

            <button
              disabled={busy}
              onClick={() => {
                if (confirm('Tem certeza que deseja excluir esta solicitação?')) {
                  onPostAction({ action: 'delete', id: req.id });
                  showToast('🗑 Solicitação excluída.');
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-400 text-xs font-medium transition-colors inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-3 h-3" />
              <span>Excluir</span>
            </button>
          </div>

          {/* 5. RESPOSTA DIRETA PARA A CLIENTE */}
          <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-[#f4a7b9]" />
                <span>Enviar Resposta / Atualização para a Cliente</span>
              </span>
              <span className="text-[10px] text-zinc-500">
                Aparece no card dela em /admin
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onReplyTextChange('Olá! Já recebi sua solicitação e comecei o desenvolvimento.')
                }
                className="px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300"
              >
                ⚡ Em andamento
              </button>
              <button
                type="button"
                onClick={() =>
                  onReplyTextChange('Pronto! A alteração já está publicada no ar. Pode conferir no site!')
                }
                className="px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300"
              >
                ✅ Concluída e no ar
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => onReplyTextChange(e.target.value)}
                placeholder="Digite uma mensagem ou resposta para a cliente..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9]"
              />
              <button
                disabled={busy || !replyText.trim()}
                onClick={onSendReply}
                className="px-4 py-2 rounded-xl bg-[#f4a7b9] hover:bg-[#fabcc9] text-zinc-950 font-bold text-xs transition-colors disabled:opacity-50 shrink-0 inline-flex items-center gap-1.5"
              >
                <Send className="w-3 h-3" />
                <span>Enviar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
