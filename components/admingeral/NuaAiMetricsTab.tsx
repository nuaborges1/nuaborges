'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Brain,
  BookOpen,
  ShieldCheck,
  Activity,
  Check,
  X,
  Clock,
  DollarSign,
  Layers,
  Search,
  RefreshCw,
  FileText,
  Award,
  Zap,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import {
  fetchNuaAiTelemetry,
  fetchNuaAiCandidates,
  approveNuaAiCandidate,
  rejectNuaAiCandidate,
  fetchNuaAiKnowledge,
} from '@/lib/nuaAi/client';
import { AiTelemetryMetrics } from '@/lib/nuaAi/telemetry';
import { CandidateItem } from '@/lib/nuaAi/candidatesStore';
import { KnowledgeBase } from '@/lib/nuaAi/knowledgeStore';

export function NuaAiMetricsTab() {
  const [telemetry, setTelemetry] = useState<AiTelemetryMetrics | null>(null);
  const [candidates, setCandidates] = useState<CandidateItem[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeBase | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [activeSubView, setActiveSubView] = useState<'metrics' | 'candidates' | 'knowledge'>('metrics');

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [telemData, candData, kbData] = await Promise.all([
        fetchNuaAiTelemetry(),
        fetchNuaAiCandidates(),
        fetchNuaAiKnowledge(),
      ]);

      if (telemData) setTelemetry(telemData);
      if (candData) setCandidates(candData);
      if (kbData) setKnowledge(kbData);
    } catch (err) {
      console.warn('[NuaAiMetricsTab] Erro ao carregar dados:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleApprove = async (id: string) => {
    setActionInProgress(id);
    try {
      await approveNuaAiCandidate(id);
      await loadAllData();
    } catch (err) {
      console.error('Erro ao aprovar candidato:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionInProgress(id);
    try {
      await rejectNuaAiCandidate(id);
      await loadAllData();
    } catch (err) {
      console.error('Erro ao rejeitar candidato:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const pendingCandidates = candidates.filter((c) => c.status === 'pending_review');
  const resolvedCandidates = candidates.filter((c) => c.status !== 'pending_review');

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-zinc-950 via-[#141217] to-zinc-950 border border-[#f4a7b9]/25 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#f4a7b9]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#f4a7b9]/20 to-[#f4a7b9]/5 border border-[#f4a7b9]/30 flex items-center justify-center text-[#f4a7b9] shadow-lg shadow-[#f4a7b9]/10">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white tracking-wide font-serif">
                  Nua IA — Motor Cognitivo & 5 Camadas
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  Online (Localhost phdev)
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 font-light">
                Monitoramento de telemetria, consumo de tokens, base científica curada e aprendizado supervisionado da assistente.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={loadAllData}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#f4a7b9]' : ''}`} />
              <span>Atualizar Métricas</span>
            </button>
          </div>
        </div>

        {/* 5 Camadas Diagram */}
        <div className="mt-6 pt-5 border-t border-zinc-800/60 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-mono tracking-wider mb-1">
              <Clock className="w-3 h-3 text-sky-400" />
              <span>1. History</span>
            </div>
            <p className="text-xs font-semibold text-white">JSONL Auditado</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Imutável com fuso SP</p>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-mono tracking-wider mb-1">
              <Sparkles className="w-3 h-3 text-[#f4a7b9]" />
              <span>2. Memory</span>
            </div>
            <p className="text-xs font-semibold text-white">Fatos da Nua</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Preferências e rotina</p>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-mono tracking-wider mb-1">
              <ShieldCheck className="w-3 h-3 text-amber-400" />
              <span>3. Knowledge</span>
            </div>
            <p className="text-xs font-semibold text-white">Marca & Admin</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Cores, abas e portal</p>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-mono tracking-wider mb-1">
              <Activity className="w-3 h-3 text-indigo-400" />
              <span>4. Contexto</span>
            </div>
            <p className="text-xs font-semibold text-white">Turnos Ativos</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Últimos turnos + resumo</p>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-mono tracking-wider mb-1">
              <BookOpen className="w-3 h-3 text-emerald-400" />
              <span>5. Scientific KB</span>
            </div>
            <p className="text-xs font-semibold text-white">Sexologia Oficial</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">OMS, MS, Basson</p>
          </div>
        </div>
      </div>

      {/* Navegação entre Sub-Abas */}
      <div className="flex items-center gap-2 p-1.5 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setActiveSubView('metrics')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-2 ${
            activeSubView === 'metrics'
              ? 'bg-[#f4a7b9] text-zinc-950 font-semibold shadow-md shadow-[#f4a7b9]/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Métricas de Desempenho & Consumo</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubView('candidates')}
          className={`relative px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-2 ${
            activeSubView === 'candidates'
              ? 'bg-[#f4a7b9] text-zinc-950 font-semibold shadow-md shadow-[#f4a7b9]/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Aprendizado Controlado (Candidatos)</span>
          {pendingCandidates.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono text-[10px] font-bold">
              {pendingCandidates.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubView('knowledge')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-2 ${
            activeSubView === 'knowledge'
              ? 'bg-[#f4a7b9] text-zinc-950 font-semibold shadow-md shadow-[#f4a7b9]/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Base de Conhecimento Ativa</span>
        </button>
      </div>

      {/* VIEW 1: MÉTRICAS */}
      {activeSubView === 'metrics' && (
        <div className="space-y-6">
          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
              <span className="text-[11px] font-medium text-zinc-400 block mb-1">Total de Mensagens</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-white">
                  {telemetry?.totalMessages || 0}
                </span>
                <span className="text-[11px] text-zinc-500">mensagens</span>
              </div>
              <span className="text-[10px] text-zinc-500 mt-2 block font-mono">
                {telemetry?.modelCalls || 0} chamadas de IA
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
              <span className="text-[11px] font-medium text-zinc-400 block mb-1">Economia Local (Zero Custo)</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-emerald-400">
                  {telemetry?.localResponseRate || 0}%
                </span>
                <span className="text-[11px] text-emerald-500/80 font-mono">
                  ({telemetry?.localResponses || 0} locais)
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 mt-2 block">
                Respostas canônicas instantâneas (&lt; 2ms)
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
              <span className="text-[11px] font-medium text-zinc-400 block mb-1">Custo Estimado (Gemini)</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-white">
                  ${(telemetry?.estimatedCostUsd || 0).toFixed(4)}
                </span>
                <span className="text-[11px] text-zinc-500">USD</span>
              </div>
              <span className="text-[10px] text-zinc-500 mt-2 block font-mono">
                {(telemetry?.tokensInput || 0) + (telemetry?.tokensOutput || 0)} tokens totais
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
              <span className="text-[11px] font-medium text-zinc-400 block mb-1">Citações Científicas Oficiais</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-[#f4a7b9]">
                  {telemetry?.responsesWithCitation || 0}
                </span>
                <span className="text-[11px] text-zinc-500">respostas</span>
              </div>
              <span className="text-[10px] text-zinc-500 mt-2 block font-mono">
                {telemetry?.kbHits || 0} hits no Scientific KB
              </span>
            </div>
          </div>

          {/* Eventos Recentes de Telemetria */}
          <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
            <h3 className="text-sm font-semibold text-white mb-3">Eventos Recentes de Interação</h3>
            {(!telemetry?.recentEvents || telemetry.recentEvents.length === 0) ? (
              <div className="text-center py-8 text-xs text-zinc-500">
                Nenhuma interação recente registrada ainda. Converse com a Nua IA no painel para visualizar o log.
              </div>
            ) : (
              <div className="space-y-2">
                {telemetry.recentEvents.map((evt, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/70 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          evt.type === 'local_response' ? 'bg-emerald-400' : 'bg-sky-400'
                        }`}
                      />
                      <span className="text-zinc-200 font-mono">{evt.detail}</span>
                    </div>

                    <div className="flex items-center gap-4 text-zinc-500 font-mono text-[11px]">
                      {evt.tokens ? <span>{evt.tokens} tok</span> : null}
                      {evt.latencyMs ? <span>{evt.latencyMs}ms</span> : null}
                      <span>{new Date(evt.timestamp).toLocaleTimeString('pt-BR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: APRENDIZADO CONTROLADO (CANDIDATOS) */}
      {activeSubView === 'candidates' && (
        <div className="space-y-6">
          {/* Candidatos Pendentes de Revisão */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>Candidatos Aguardando Aprovação</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/20 font-mono">
                    {pendingCandidates.length} pendentes
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 font-light mt-0.5">
                  Novos fatos sugeridos pela IA durante conversas com a Nua. Só entram na memória se aprovados aqui.
                </p>
              </div>
            </div>

            {pendingCandidates.length === 0 ? (
              <div className="p-10 text-center rounded-2xl border border-zinc-800/60 bg-zinc-900/20">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <h4 className="text-sm font-medium text-zinc-300">Nenhum candidato pendente de revisão</h4>
                <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                  Quando a Nua expressar uma decisão explícita no chat (ex: "decidi focar em...", "a partir de agora..."), um novo candidato aparecerá aqui para aprovação em 1 clique.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingCandidates.map((cand) => (
                  <div
                    key={cand.id}
                    className="p-4 rounded-2xl bg-zinc-900/60 border border-[#f4a7b9]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-[#f4a7b9] font-mono uppercase">
                          Destino: {cand.target}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {new Date(cand.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-100 font-medium leading-relaxed">
                        "{cand.proposedContent}"
                      </p>
                      <p className="text-xs text-zinc-400 italic">
                        Motivo: {cand.reason}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleApprove(cand.id)}
                        disabled={actionInProgress === cand.id}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Aprovar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReject(cand.id)}
                        disabled={actionInProgress === cand.id}
                        className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-rose-950/60 hover:text-rose-400 text-zinc-400 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Rejeitar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Histórico de Decisões */}
          {resolvedCandidates.length > 0 && (
            <div className="p-5 rounded-2xl bg-zinc-900/30 border border-zinc-800/80 space-y-3">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Histórico de Candidatos Resolvidos ({resolvedCandidates.length})
              </h4>
              <div className="space-y-2">
                {resolvedCandidates.slice(0, 10).map((cand) => (
                  <div
                    key={cand.id}
                    className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/60 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                          cand.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        {cand.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                      </span>
                      <span className="text-zinc-300 truncate max-w-md">{cand.proposedContent}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {new Date(cand.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: BASE DE CONHECIMENTO ATIVA */}
      {activeSubView === 'knowledge' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
            <h3 className="text-sm font-semibold text-white">Fatos Consolidados da Nua Borges ({knowledge?.items?.length || 0})</h3>
            <p className="text-xs text-zinc-400 font-light mt-0.5">
              Itens da Camada 3 (Knowledge) fornecidos como verdade estável para a Nua IA.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {knowledge?.items?.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-[#f4a7b9] font-mono uppercase">
                      {item.category}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      v{item.version} • {new Date(item.updatedAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-white mb-1">{item.title}</h4>
                  <p className="text-xs text-zinc-300 leading-relaxed font-light">{item.content}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                  <span>Origem: {item.origin}</span>
                  <span className="text-emerald-400">Confiança: {(item.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
