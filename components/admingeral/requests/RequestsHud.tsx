'use client';

import React from 'react';
import { Terminal, Volume2, RefreshCw, Search } from 'lucide-react';

interface RequestsHudProps {
  metrics: {
    total: number;
    novos: number;
    emAnalise: number;
    emDev: number;
    concluidos: number;
    criticos: number;
  };
  geminiOk: boolean;
  busy: boolean;
  soundActive: boolean;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onTestSound: () => void;
  onReload: () => void;
  error?: string;
}

export function RequestsHud({
  metrics,
  geminiOk,
  busy,
  soundActive,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  onTestSound,
  onReload,
  error,
}: RequestsHudProps) {
  return (
    <div className="p-6 rounded-3xl bg-gradient-to-b from-zinc-900/90 via-zinc-900/60 to-zinc-950/90 border border-zinc-800 shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#f4a7b9]/10 border border-[#f4a7b9]/30 text-[#f4a7b9]">
              <Terminal className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-white tracking-wide">
              Central de Operações de Solicitações (Nua Borges)
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-light">
            Recebimento das demandas da cliente com mapeamento real do repositório e geração de prompts técnicos para Agentes de IA.
          </p>
        </div>

        {/* Engine Status Badge & Audio Test */}
        <div className="flex items-center flex-wrap gap-2 self-start sm:self-auto">
          <button
            onClick={onTestSound}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium border transition-colors cursor-pointer ${
              soundActive
                ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Testar alerta sonoro de nova solicitação"
          >
            <Volume2 className="w-3.5 h-3.5 text-[#f4a7b9]" />
            <span>Som Alerta (Testar)</span>
          </button>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium border ${
              geminiOk
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                geminiOk ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            {geminiOk ? 'Gemini 3.5 Flash Operacional' : 'Modo Heurístico (Sem API Key)'}
          </span>

          <button
            onClick={onReload}
            disabled={busy}
            className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            title="Recarregar solicitações"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-zinc-800/80 border-[#f4a7b9]/50 shadow-md'
              : 'bg-zinc-950/60 border-zinc-800/80 hover:bg-zinc-900/60'
          }`}
        >
          <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Total</span>
          <div className="text-xl font-bold text-white mt-0.5">{metrics.total}</div>
        </div>

        <div
          onClick={() => setStatusFilter('new')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'new'
              ? 'bg-sky-950/40 border-sky-500/50 shadow-md'
              : 'bg-zinc-950/60 border-zinc-800/80 hover:bg-zinc-900/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-sky-400 font-medium">Novas</span>
            {metrics.novos > 0 && (
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            )}
          </div>
          <div className="text-xl font-bold text-sky-300 mt-0.5">{metrics.novos}</div>
        </div>

        <div
          onClick={() => setStatusFilter('analyzing')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'analyzing'
              ? 'bg-purple-950/40 border-purple-500/50 shadow-md'
              : 'bg-zinc-950/60 border-zinc-800/80 hover:bg-zinc-900/60'
          }`}
        >
          <span className="text-[11px] uppercase tracking-wider text-purple-400 font-medium">Em Análise</span>
          <div className="text-xl font-bold text-purple-300 mt-0.5">{metrics.emAnalise}</div>
        </div>

        <div
          onClick={() => setStatusFilter('in_progress')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'in_progress'
              ? 'bg-amber-950/40 border-amber-500/50 shadow-md'
              : 'bg-zinc-950/60 border-zinc-800/80 hover:bg-zinc-900/60'
          }`}
        >
          <span className="text-[11px] uppercase tracking-wider text-amber-400 font-medium">Em Dev</span>
          <div className="text-xl font-bold text-amber-300 mt-0.5">{metrics.emDev}</div>
        </div>

        <div
          onClick={() => setStatusFilter('done')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'done'
              ? 'bg-emerald-950/40 border-emerald-500/50 shadow-md'
              : 'bg-zinc-950/60 border-zinc-800/80 hover:bg-zinc-900/60'
          }`}
        >
          <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-medium">Concluídas</span>
          <div className="text-xl font-bold text-emerald-300 mt-0.5">{metrics.concluidos}</div>
        </div>
      </div>

      {/* Barra de Filtros Rápidos & Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, texto do pedido ou arquivo (ex: GallerySection)..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#f4a7b9] transition-colors"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-xs">
          {error}
        </div>
      )}
    </div>
  );
}
