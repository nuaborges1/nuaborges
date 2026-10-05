'use client';

import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import {
  Inbox,
  Clock,
  Search,
  CheckCircle2,
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
  PlusCircle,
  Bot,
  Volume2,
  Bell,
  X,
} from 'lucide-react';
import { playAlertSound, flashTabTitle, unlockAudioContext } from '@/lib/audioAlerts';

interface Req {
  id: string;
  createdAt: string;
  updatedAt?: string;
  status: 'new' | 'analyzing' | 'planned' | 'in_progress' | 'review' | 'done' | 'rejected';
  title: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  contractScope?: 'garantia' | 'franquia_suporte' | 'fora_de_escopo_orcamento';
  technicalPlan: string;
  targetFiles?: string[];
  aiAgentPrompt?: string;
  clarifyingQuestions?: string[];
  source: string;
  originalText: string;
  category?: string;
  history: { at: string; event: string; detail: string }[];
  messages: { at: string; role: string; text: string }[];
}

function FormattedText({ text, className = '' }: { text: string; className?: string }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className={`space-y-1.5 leading-relaxed ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }
        const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ');
        const cleanLine = isBullet ? trimmed.replace(/^[-•*]\s*/, '') : trimmed;
        const parts = cleanLine.split(/(\*\*[^*]+\*\*)/g);
        const renderedParts = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={pIdx} className="font-semibold text-white">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-[#f4a7b9] mt-1 text-[10px] shrink-0 leading-none">●</span>
              <span className="flex-1">{renderedParts}</span>
            </div>
          );
        }

        return (
          <p key={idx} className="text-zinc-200">
            {renderedParts}
          </p>
        );
      })}
    </div>
  );
}

const PIPELINE_STAGES = [
  { key: 'new', label: 'Recebida', color: 'sky' },
  { key: 'analyzing', label: 'Em Análise', color: 'purple' },
  { key: 'planned', label: 'Planejada', color: 'indigo' },
  { key: 'in_progress', label: 'Em Dev', color: 'amber' },
  { key: 'done', label: 'Concluída', color: 'emerald' },
];

const STATUS_LABEL: Record<string, string> = {
  new: 'Recebida',
  analyzing: 'Em análise',
  planned: 'Planejada',
  in_progress: 'Em desenvolvimento',
  review: 'Em revisão',
  done: 'Concluída',
  rejected: 'Cancelada',
};

const PRIORITY_CONFIG: Record<
  string,
  { label: string; textClass: string; bgClass: string; borderClass: string }
> = {
  critical: {
    label: 'Crítica',
    textClass: 'text-rose-400',
    bgClass: 'bg-rose-500/15',
    borderClass: 'border-rose-500/30',
  },
  high: {
    label: 'Alta',
    textClass: 'text-amber-400',
    bgClass: 'bg-amber-500/15',
    borderClass: 'border-amber-500/30',
  },
  medium: {
    label: 'Média',
    textClass: 'text-sky-400',
    bgClass: 'bg-sky-500/15',
    borderClass: 'border-sky-500/30',
  },
  low: {
    label: 'Baixa',
    textClass: 'text-zinc-400',
    bgClass: 'bg-zinc-500/10',
    borderClass: 'border-zinc-700/40',
  },
};

function formatRelativeTime(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'agora há pouco';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `há ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `há ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `há ${diffDays} d`;
  } catch {
    return 'recentemente';
  }
}

export default function RequestsCenter({
  fetchFromApi,
  targetRequestId,
  onResetTarget,
}: {
  fetchFromApi: (path: string, options?: RequestInit) => Promise<Response>;
  targetRequestId?: string | null;
  onResetTarget?: () => void;
}) {
  const [items, setItems] = useState<Req[]>([]);
  const [geminiOk, setGeminiOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [newRequestModal, setNewRequestModal] = useState<Req | null>(null);
  const [soundActive, setSoundActive] = useState(false);

  // Referência para detectar novas solicitações da cliente e tocar som
  const prevReqsRef = useRef<Map<string, Req>>(new Map());
  const isInitialLoadRef = useRef(true);

  // Filtros & Busca
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Formulário de simulação / cadastro manual
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualText, setManualText] = useState('');
  const [manualCategory, setManualCategory] = useState('Geral');

  useEffect(() => {
    if (targetRequestId) {
      setOpenId(targetRequestId);
      onResetTarget?.();
    }
  }, [targetRequestId, onResetTarget]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleTestSound = () => {
    unlockAudioContext();
    playAlertSound('new_request');
    setSoundActive(true);
    showToast('🔊 Som de notificação testado! Você ouvirá este alerta quando a cliente enviar novas solicitações.');
    setTimeout(() => setSoundActive(false), 3000);
  };

  const load = useCallback(async () => {
    try {
      const r = await fetchFromApi('/api/requests');
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      const currentList: Req[] = d.requests || [];
      setItems(currentList);
      setGeminiOk(!!d.geminiConfigured);
      setError('');

      if (!isInitialLoadRef.current) {
        // Detecta novas solicitações criadas pela cliente
        const prevMap = prevReqsRef.current;
        for (const req of currentList) {
          if (!prevMap.has(req.id)) {
            // Nova solicitação recebida da cliente!
            playAlertSound('new_request');
            flashTabTitle('🔴 (1) NOVA SOLICITAÇÃO! - Central phdev');
            setNewRequestModal(req);
            break;
          } else {
            // Verifica se a cliente enviou uma mensagem nova na conversa
            const prev = prevMap.get(req.id);
            if (prev && req.messages && prev.messages && req.messages.length > prev.messages.length) {
              const lastMsg = req.messages[req.messages.length - 1];
              if (lastMsg.role === 'client') {
                playAlertSound('new_message');
                showToast(`💬 Nova mensagem da cliente no pedido: "${req.title}"`);
              }
            }
          }
        }
      }

      const newMap = new Map<string, Req>();
      currentList.forEach((req) => newMap.set(req.id, req));
      prevReqsRef.current = newMap;
      isInitialLoadRef.current = false;
    } catch {
      setError('Não foi possível carregar as solicitações.');
    }
  }, [fetchFromApi]);

  // Polling em tempo real a cada 4 segundos
  useEffect(() => {
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [load]);

  const post = async (payload: any) => {
    setBusy(true);
    try {
      const r = await fetchFromApi('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setError(err.error || 'Falha na operação.');
      } else {
        if (payload.action === 'update' && payload.status === 'done') {
          showToast('🎉 Status alterado para: Concluída! O painel da cliente tocará o som de celebração e exibirá o modal comemorativo.');
        } else if (payload.action === 'update' && payload.status) {
          showToast(`Status atualizado para: ${STATUS_LABEL[payload.status] || payload.status}`);
        }
        await load();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCopyPrompt = async (req: Req, e: React.MouseEvent) => {
    e.stopPropagation();
    const promptContent = req.aiAgentPrompt || req.technicalPlan;
    if (!promptContent) return;

    try {
      await navigator.clipboard.writeText(promptContent);
      setCopiedId(req.id);
      showToast('📋 Prompt de engenharia copiado! Cole no Claude Code, Antigravity ou Cursor.');
      setTimeout(() => setCopiedId(null), 3000);
    } catch (err) {
      console.error('Falha ao copiar:', err);
      showToast('⚠️ Erro ao copiar. Selecione e copie manualmente.');
    }
  };

  // Métricas para o Executive HUD
  const metrics = useMemo(() => {
    const total = items.length;
    const novos = items.filter((i) => i.status === 'new').length;
    const emAnalise = items.filter((i) => i.status === 'analyzing').length;
    const emDev = items.filter((i) => i.status === 'in_progress' || i.status === 'planned').length;
    const concluidos = items.filter((i) => i.status === 'done').length;
    const criticos = items.filter((i) => i.priority === 'critical' || i.priority === 'high').length;
    return { total, novos, emAnalise, emDev, concluidos, criticos };
  }, [items]);

  // Lista filtrada
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'in_progress') {
          if (item.status !== 'in_progress' && item.status !== 'planned') return false;
        } else if (statusFilter === 'high_priority') {
          if (item.priority !== 'critical' && item.priority !== 'high') return false;
        } else if (item.status !== statusFilter) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = item.title?.toLowerCase().includes(q);
        const inText = item.originalText?.toLowerCase().includes(q);
        const inSummary = item.summary?.toLowerCase().includes(q);
        const inFiles = item.targetFiles?.some((f) => f.toLowerCase().includes(q));
        if (!inTitle && !inText && !inSummary && !inFiles) return false;
      }
      return true;
    });
  }, [items, statusFilter, searchQuery]);

  const open = items.find((i) => i.id === openId) || null;

  return (
    <div className="space-y-6">
      {/* Toast de Confirmação */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-zinc-950/95 border border-[#f4a7b9]/50 shadow-2xl text-white text-xs flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-[#f4a7b9] shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* MODAL DE ALERTA QUANDO A CLIENTE ENVIA NOVA SOLICITAÇÃO */}
      {newRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-950 border-2 border-rose-500/60 rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-4 shadow-[0_0_50px_rgba(244,63,94,0.35)] relative overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0 animate-bounce">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                    Atenção Philippe • Nova Demanda Recebida!
                  </span>
                  <h3 className="text-base font-semibold text-white">
                    {newRequestModal.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setNewRequestModal(null)}
                className="p-1.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                <span className="font-semibold text-[#f4a7b9]">{newRequestModal.category || 'Geral'}</span>
                <span>•</span>
                <span>Enviado pela Nua Borges agora há pouco</span>
              </div>
              <p className="text-zinc-200 italic line-clamp-3 leading-relaxed">
                "{newRequestModal.originalText}"
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={(e) => {
                  setOpenId(newRequestModal.id);
                  handleCopyPrompt(newRequestModal, e);
                  setNewRequestModal(null);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-[#f4a7b9] hover:bg-[#fabcc9] text-zinc-950 font-bold text-xs transition-all shadow-md inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>Abrir & Copiar Prompt de IA</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpenId(newRequestModal.id);
                  setNewRequestModal(null);
                }}
                className="py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs transition-all cursor-pointer"
              >
                Apenas Ver Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. EXECUTIVE HUD: VISÃO OPERACIONAL E TELEMETRIA DE SOLICITAÇÕES */}
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
              onClick={handleTestSound}
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
              onClick={() => load()}
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

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setShowManualForm(!showManualForm)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors inline-flex items-center gap-1.5 shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#f4a7b9]" />
              <span>{showManualForm ? 'Fechar Simulação' : 'Simular / Nova'}</span>
            </button>
          </div>
        </div>

        {/* Formulário de Simulação / Criação Manual */}
        {showManualForm && (
          <div className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-[#f4a7b9]" />
                <span>Simular Nova Solicitação (Testar Motor Gemini)</span>
              </h4>
              <span className="text-[10px] text-zinc-500 font-mono">POST /api/requests (action: create)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="Categoria (ex: Galeria, Celular, Capa)"
                value={manualCategory}
                onChange={(e) => setManualCategory(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9]"
              />
              <div className="sm:col-span-3 flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: Quero que a galeria de fotos abra mais rápido no celular e mostre zoom..."
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9]"
                />
                <button
                  disabled={busy || manualText.trim().length < 3}
                  onClick={async () => {
                    await post({ action: 'create', text: manualText, category: manualCategory });
                    setManualText('');
                    setShowManualForm(false);
                    showToast('🎉 Solicitação simulada criada e analisada pelo Gemini!');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#f4a7b9] hover:bg-[#fabcc9] text-zinc-950 transition-colors disabled:opacity-50 shrink-0"
                >
                  {busy ? 'Processando...' : 'Analisar e Criar'}
                </button>
              </div>
            </div>

            {/* Exemplos rápidos para preencher com 1 clique */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-zinc-400">
              <span className="text-zinc-500">Exemplos rápidos:</span>
              <button
                type="button"
                onClick={() => {
                  setManualCategory('Galeria');
                  setManualText('Gostaria que as fotos da galeria no celular abrissem com um efeito mais suave e dessem opção de zoom ao tocar.');
                }}
                className="px-2 py-0.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300"
              >
                Galeria no Celular
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualCategory('Capa');
                  setManualText('O botão de agendamento na capa principal precisa ficar mais visível com um destaque dourado elegante.');
                }}
                className="px-2 py-0.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300"
              >
                Botão da Capa
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualCategory('Música');
                  setManualText('O player de música às vezes inicia muito alto. Quero que comece com volume bem baixinho e suave.');
                }}
                className="px-2 py-0.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300"
              >
                Volume da Trilha
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}
      </div>

      {/* 2. LISTA OPERACIONAL DE SOLICITAÇÕES */}
      {filteredItems.length === 0 ? (
        <div className="p-12 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 text-center space-y-3">
          <Inbox className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-semibold text-zinc-300">Nenhuma solicitação encontrada</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto font-light">
            {items.length === 0
              ? 'A cliente ainda não enviou solicitações pelo painel dela. Você pode simular uma solicitação acima.'
              : 'Nenhum resultado corresponde ao filtro atual.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredItems.map((req) => {
            const isOpen = openId === req.id;
            const priorityCfg = PRIORITY_CONFIG[req.priority] || PRIORITY_CONFIG.medium;
            const targetFiles = req.targetFiles || [];
            const isCopied = copiedId === req.id;

            return (
              <div
                key={req.id}
                className={`rounded-3xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? 'bg-zinc-900/90 border-[#f4a7b9]/40 shadow-2xl ring-1 ring-[#f4a7b9]/20'
                    : 'bg-zinc-900/40 hover:bg-zinc-900/70 border-zinc-800/90 hover:border-zinc-700/80'
                }`}
              >
                {/* CABEÇALHO DO CARD (Sempre Visível) */}
                <div
                  onClick={() => setOpenId(isOpen ? null : req.id)}
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
                        onClick={(e) => handleCopyPrompt(req, e)}
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
                                post({ action: 'update', id: req.id, status: stg.key });
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

                {/* DETALHES EXPANDIDOS (Quando Aberto) */}
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

                    {/* 3. SEÇÃO ESTELAR: 🤖 PROMPT DE ENGENHARIA PARA AGENTE DE IA (CLAUDE / ANTIGRAVITY / CURSOR) */}
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

                        {/* Botão de Cópia Primário com Feedback */}
                        <button
                          onClick={(e) => handleCopyPrompt(req, e)}
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

                      {/* Arquivos-Alvo Identificados */}
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
                          onClick={(e) => handleCopyPrompt(req, e)}
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
                        {/* Seletor de Status */}
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                          <span>Status:</span>
                          <select
                            value={req.status}
                            onChange={(e) => post({ action: 'update', id: req.id, status: e.target.value })}
                            className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#f4a7b9]"
                          >
                            {Object.entries(STATUS_LABEL).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Seletor de Prioridade */}
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                          <span>Prioridade:</span>
                          <select
                            value={req.priority}
                            onChange={(e) => post({ action: 'update', id: req.id, priority: e.target.value })}
                            className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#f4a7b9]"
                          >
                            {Object.entries(PRIORITY_CONFIG).map(([k, cfg]) => (
                              <option key={k} value={k}>
                                {cfg.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Botão de Reanálise com Gemini */}
                        <button
                          disabled={busy}
                          onClick={() => {
                            post({ action: 'update', id: req.id, reanalyze: true });
                            showToast('⚡ Reanalisando com Gemini contra a arquitetura atual do código...');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3 h-3 ${busy ? 'animate-spin' : ''}`} />
                          <span>Reanalisar com Gemini</span>
                        </button>
                      </div>

                      {/* Excluir */}
                      <button
                        disabled={busy}
                        onClick={() => {
                          if (confirm('Tem certeza que deseja excluir esta solicitação?')) {
                            post({ action: 'delete', id: req.id });
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

                      {/* Modelos rápidos de resposta */}
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setReplyText((prev) => ({
                              ...prev,
                              [req.id]: 'Olá! Já recebi sua solicitação e comecei o desenvolvimento.',
                            }))
                          }
                          className="px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300"
                        >
                          ⚡ Em andamento
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setReplyText((prev) => ({
                              ...prev,
                              [req.id]: 'Pronto! A alteração já está publicada no ar. Pode conferir no site!',
                            }))
                          }
                          className="px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300"
                        >
                          ✅ Concluída e no ar
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={replyText[req.id] || ''}
                          onChange={(e) =>
                            setReplyText((prev) => ({ ...prev, [req.id]: e.target.value }))
                          }
                          placeholder="Digite uma mensagem ou resposta para a cliente..."
                          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9]"
                        />
                        <button
                          disabled={busy || !(replyText[req.id] || '').trim()}
                          onClick={async () => {
                            await post({
                              action: 'message',
                              id: req.id,
                              text: replyText[req.id],
                              role: 'admin',
                            });
                            setReplyText((prev) => ({ ...prev, [req.id]: '' }));
                            showToast('Mensagem enviada para a cliente com sucesso!');
                          }}
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
          })}
        </div>
      )}
    </div>
  );
}
