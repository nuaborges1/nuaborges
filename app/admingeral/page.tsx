'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield,
  Activity,
  Upload,
  FileEdit,
  Trash2,
  AlertTriangle,
  Bot,
  LogIn,
  RefreshCw,
  Eye,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Globe,
  Database,
  Search,
  Download,
  Filter,
  Layers,
  Image as ImageIcon,
  Key,
  Server,
  ChevronRight,
  Code,
  Copy,
  Check,
  Bell,
  Volume2,
  ArrowRight,
  Laptop,
  Smartphone,
  Zap,
  Brain,
  CreditCard,
} from 'lucide-react';
import RequestsCenter from '@/components/admingeral/RequestsCenter';
import { NuaAiMetricsTab } from '@/components/admingeral/NuaAiMetricsTab';
import { FinanceAdminManager } from '@/components/admingeral/FinanceAdminManager';
import { isLocalhost } from '@/lib/env';
import { calculateFinanceSummary, getDefaultInstallments } from '@/lib/financeCanonical';

// Áudio de Notificação Suave e Harmônico via Web Audio API (3 sinos harmônicos: E5 -> A5 -> E6)
function playNotificationChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const t = ctx.currentTime;
    const notes = [
      { freq: 659.25, time: 0, dur: 0.35, gain: 0.3 },     // E5
      { freq: 880.00, time: 0.12, dur: 0.45, gain: 0.35 },  // A5
      { freq: 1318.51, time: 0.25, dur: 0.7, gain: 0.4 },  // E6
    ];

    notes.forEach(({ freq, time, dur, gain }) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + time);
      g.gain.setValueAtTime(gain, t + time);
      g.gain.exponentialRampToValueAtTime(0.0001, t + time + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t + time);
      osc.stop(t + time + dur);
    });
  } catch (err) {
    console.warn('[Audio] Falha ao reproduzir sino:', err);
  }
}

// Piscar título da aba para chamar atenção imediata
let titleTimer: any = null;
function startFlashingTabTitle(text: string) {
  if (typeof window === 'undefined') return;
  if (titleTimer) clearInterval(titleTimer);
  let toggle = false;
  titleTimer = setInterval(() => {
    toggle = !toggle;
    document.title = toggle
      ? '🚨 NOVA SOLICITAÇÃO! - Central phdev'
      : `🔔 (${text.slice(0, 22)}) - Central phdev`;
  }, 800);
}

function stopFlashingTabTitle() {
  if (typeof window === 'undefined') return;
  if (titleTimer) {
    clearInterval(titleTimer);
    titleTimer = null;
  }
  document.title = 'Central phdev';
}

// Formatador amigável de User-Agent
function parseUserAgentFriendly(ua?: string) {
  if (!ua) return 'Dispositivo não identificado';
  let browser = 'Navegador Web';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Google Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Apple Safari';
  else if (ua.includes('Firefox')) browser = 'Mozilla Firefox';
  else if (ua.includes('Edg')) browser = 'Microsoft Edge';

  let os = 'Dispositivo';
  if (ua.includes('Windows')) os = 'Windows (PC)';
  else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS (Mac)';
  else if (ua.includes('iPhone')) os = 'iPhone (iOS)';
  else if (ua.includes('iPad')) os = 'iPad (iPadOS)';
  else if (ua.includes('Android')) os = 'Android (Smartphone)';
  else if (ua.includes('Linux')) os = 'Linux';

  return `${browser} no ${os}`;
}

import {
  AuditEvent,
  AuditStats,
  MediaItem,
  AdminGeralTabType as TabType,
} from '@/lib/admingeral';

export default function MasterAdminPage() {
  // Configurações de Conexão com o Backend
  const [targetApiUrl, setTargetApiUrl] = useState<string>('');
  const [masterKey, setMasterKey] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [connectionLatency, setConnectionLatency] = useState<number | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);

  // Dados do Monitoramento
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [siteContent, setSiteContent] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [requestsList, setRequestsList] = useState<any[]>([]);
  const [newRequestsCount, setNewRequestsCount] = useState<number>(0);
  const [financeSummary, setFinanceSummary] = useState<any>(null);
  const [targetRequestId, setTargetRequestId] = useState<string | null>(null);
  const [newRequestAlert, setNewRequestAlert] = useState<{
    id: string;
    title: string;
    category?: string;
    summary?: string;
    priority?: string;
    type?: string;
    technicalPlan?: string;
  } | null>(null);

  const knownRequestIdsRef = React.useRef<Set<string>>(new Set());
  const initializedRequestsRef = React.useRef<boolean>(false);

  // Estados de Interface
  const [activeTab, setActiveTab] = useState<TabType>('stream');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(8);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Limpa o piscar de título ao focar na janela
  useEffect(() => {
    const handleFocus = () => {
      stopFlashingTabTitle();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      stopFlashingTabTitle();
    };
  }, []);

  // 1. Inicializa credenciais do localStorage ou sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedTarget =
      localStorage.getItem('nua_master_target_api') ||
      sessionStorage.getItem('nua_master_target_api');
    const savedKey =
      sessionStorage.getItem('nua_master_secret_key') ||
      localStorage.getItem('nua_master_secret_key');

    const defaultUrl =
      savedTarget ||
      (window.location.hostname.includes('admingeral') || window.location.hostname.includes('phdev.store')
        ? 'https://nuaborges.pages.dev'
        : window.location.origin);
    setTargetApiUrl(defaultUrl);
    setMasterKey(savedKey || '');
    document.title = 'Central phdev';
  }, []);

  // 2. Função de requisição autenticada ao Target API
  const fetchFromApi = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const baseUrl = targetApiUrl.replace(/\/$/, '');
      const fullUrl = `${baseUrl}${path}`;

      const headers = new Headers(options.headers || {});
      headers.set('Accept', 'application/json');

      if (masterKey.trim()) {
        headers.set('Authorization', `Bearer ${masterKey.trim()}`);
        headers.set('X-Master-Key', masterKey.trim());
      }

      return fetch(fullUrl, {
        ...options,
        headers,
        credentials: 'omit',
      });
    },
    [targetApiUrl, masterKey]
  );

  // 3. Testa conexão e busca dados
  const loadData = useCallback(async () => {
    if (!targetApiUrl) return;
    setIsLoading(true);
    const start = performance.now();

    try {
      // 3.1 Busca Feed de Auditoria
      const feedRes = await fetchFromApi('/api/audit/feed');
      const latency = Math.round(performance.now() - start);
      setConnectionLatency(latency);

      if (feedRes.ok) {
        const feedData = await feedRes.json();
        setEvents(feedData.events || []);
        setStats(feedData.stats || null);
        setIsConnected(true);
      } else if (feedRes.status === 401 || feedRes.status === 403) {
        setIsConnected(false);
      } else {
        setIsConnected(false);
      }

      // 3.2 Busca Mídias do R2
      try {
        const mediaRes = await fetchFromApi('/api/media/list?limit=60');
        if (mediaRes.ok) {
          const mediaData = await mediaRes.json();
          setMediaList(mediaData.objects || []);
        }
      } catch {
        // Silencioso se storage não configurado
      }

      // 3.3 Busca Conteúdo Sincronizado do Servidor
      try {
        const contentRes = await fetchFromApi('/api/content/sync');
        if (contentRes.ok) {
          const cData = await contentRes.json();
          if (cData && !cData.exists) {
            setSiteContent(null);
          } else {
            setSiteContent(cData);
          }
        }
      } catch {
        // Silencioso
      }

      // 3.4 Busca Telemetria e Estatísticas de Acessos
      try {
        const telRes = await fetchFromApi('/api/telemetry/stats');
        if (telRes.ok) {
          const tData = await telRes.json();
          setTelemetry(tData);
        }
      } catch {
        // Silencioso
      }

      // 3.5 Busca Solicitações para telemetria, contagem de pendências e detecção de novidades
      try {
        const reqRes = await fetchFromApi('/api/requests');
        if (reqRes.ok) {
          const reqData = await reqRes.json();
          const currentList: any[] = reqData.requests || [];
          setRequestsList(currentList);

          const newItems = currentList.filter((r) => r.status === 'new');
          setNewRequestsCount(newItems.length);

          if (initializedRequestsRef.current) {
            const newlyArrived = currentList.filter(
              (r) => !knownRequestIdsRef.current.has(r.id) && r.status === 'new'
            );
            if (newlyArrived.length > 0) {
              const latest = newlyArrived[0];
              playNotificationChime();
              startFlashingTabTitle(latest.title || 'Nova Solicitação');
              setNewRequestAlert({
                id: latest.id,
                title: latest.title,
                category: latest.category,
                summary: latest.summary || latest.originalText,
                priority: latest.priority,
                type: latest.type,
                technicalPlan: latest.technicalPlan,
              });
            }
          }

          currentList.forEach((r) => knownRequestIdsRef.current.add(r.id));
          initializedRequestsRef.current = true;
        }
      } catch {
        // Silencioso
      }

      // 3.6 Busca Resumo Financeiro da Nua Borges
      try {
        const finRes = await fetchFromApi('/api/finance/installments');
        if (finRes.ok) {
          const finData = await finRes.json();
          setFinanceSummary(finData.summary || null);
        } else {
          setFinanceSummary(calculateFinanceSummary(getDefaultInstallments()));
        }
      } catch {
        setFinanceSummary(calculateFinanceSummary(getDefaultInstallments()));
      }
    } catch (err) {
      console.error('[MasterAdmin] Erro na requisição:', err);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFromApi, targetApiUrl]);

  // Salva credenciais e testa conexão
  const handleSaveConnection = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nua_master_target_api', targetApiUrl.trim());
      localStorage.setItem('nua_master_secret_key', masterKey.trim());
    }
    loadData();
  };

  // Carrega ao montar ou ao alterar credenciais
  useEffect(() => {
    if (targetApiUrl) {
      loadData();
    }
  }, [targetApiUrl, loadData]);

  // Auto-refresh a cada X segundos
  useEffect(() => {
    if (!autoRefresh || !isConnected) return;
    const interval = setInterval(() => {
      loadData();
    }, refreshIntervalSec * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, isConnected, refreshIntervalSec, loadData]);

  // Formata data e hora amigável
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getRelativeTime = (isoString: string) => {
    try {
      const now = Date.now();
      const diffSec = Math.floor((now - new Date(isoString).getTime()) / 1000);
      if (diffSec < 10) return 'Agora mesmo';
      if (diffSec < 60) return `Há ${diffSec}s`;
      if (diffSec < 3600) return `Há ${Math.floor(diffSec / 60)}m`;
      if (diffSec < 86400) return `Há ${Math.floor(diffSec / 3600)}h`;
      return `Há ${Math.floor(diffSec / 86400)}d`;
    } catch {
      return '';
    }
  };

  // Formata tamanho em KB ou MB
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    if (bytes < k) return `${bytes} B`;
    if (bytes < k * k) return `${(bytes / k).toFixed(1)} KB`;
    return `${(bytes / (k * k)).toFixed(2)} MB`;
  };

  // Eventos Filtrados
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // Filtro por categoria
      if (filterType === 'UPLOADS' && ev.type !== 'MEDIA_UPLOAD') return false;
      if (filterType === 'EDITS' && ev.type !== 'CONTENT_PUBLISH' && ev.type !== 'CONTENT_DRAFT_SAVE')
        return false;
      if (filterType === 'LOGINS' && !ev.type.includes('LOGIN')) return false;
      if (filterType === 'HONEYPOT' && !ev.type.startsWith('HONEYPOT_')) return false;
      if (filterType === 'CONTACT' && ev.type !== 'CONTACT_MESSAGE_RECEIVED') return false;

      // Filtro por busca de texto
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const inSummary = ev.summary.toLowerCase().includes(query);
        const inIp = ev.actor.ip.toLowerCase().includes(query);
        const inType = ev.type.toLowerCase().includes(query);
        return inSummary || inIp || inType;
      }

      return true;
    });
  }, [events, filterType, searchQuery]);

  // Honeypots Filtrados
  const honeypotEvents = useMemo(() => {
    return events.filter((ev) => ev.type.startsWith('HONEYPOT_'));
  }, [events]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `auditoria-nuaborges-${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Renderizador de Ícone por Tipo de Evento
  const getEventIcon = (type: string) => {
    if (type === 'MEDIA_UPLOAD') return <Upload className="w-4 h-4 text-emerald-400" />;
    if (type === 'MEDIA_DELETE') return <Trash2 className="w-4 h-4 text-rose-400" />;
    if (type === 'CONTENT_PUBLISH') return <FileEdit className="w-4 h-4 text-sky-400" />;
    if (type === 'CONTENT_DRAFT_SAVE') return <Layers className="w-4 h-4 text-indigo-400" />;
    if (type === 'ADMIN_LOGIN_SUCCESS') return <LogIn className="w-4 h-4 text-emerald-400" />;
    if (type === 'ADMIN_LOGIN_FAIL') return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    if (type.startsWith('HONEYPOT_')) return <Bot className="w-4 h-4 text-rose-500" />;
    return <Activity className="w-4 h-4 text-zinc-400" />;
  };

  const getEventBadge = (type: string) => {
    if (type === 'MEDIA_UPLOAD')
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
          Upload
        </span>
      );
    if (type === 'MEDIA_DELETE')
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-300">
          Exclusão
        </span>
      );
    if (type === 'CONTENT_PUBLISH')
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 border border-sky-500/20 text-sky-300">
          Publicação
        </span>
      );
    if (type === 'CONTENT_DRAFT_SAVE')
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
          Rascunho
        </span>
      );
    if (type === 'ADMIN_LOGIN_SUCCESS')
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
          Login OK
        </span>
      );
    if (type === 'ADMIN_LOGIN_FAIL')
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-300">
          Falha Login
        </span>
      );
    if (type === 'HONEYPOT_BOT_TRAP')
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-1">
          <Bot className="w-2.5 h-2.5" /> Bot Scanner
        </span>
      );
    if (type === 'HONEYPOT_FORM_SPAM')
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-1">
          <Bot className="w-2.5 h-2.5" /> Spam Form
        </span>
      );
    if (type === 'HONEYPOT_TIME_TRAP')
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" /> Time-Trap
        </span>
      );
    if (type === 'HONEYPOT_SCRAPER_TRAP')
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center gap-1">
          <Bot className="w-2.5 h-2.5" /> Scraper
        </span>
      );
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-300">
        {type}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col font-sans selection:bg-[#f4a7b9] selection:text-zinc-950">
      {/* Top Bar / Global Status */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#f4a7b9] to-indigo-500 flex items-center justify-center shadow-lg shadow-[#f4a7b9]/10">
                <Shield className="w-4 h-4 text-zinc-950" />
              </div>
              <div>
                <h1 className="text-sm font-semibold tracking-wide flex items-center gap-2">
                  <span>Central phdev</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-[#f4a7b9] font-mono">
                    v2.5 Security
                  </span>
                </h1>
                <p className="text-[11px] text-zinc-400 font-mono truncate max-w-xs sm:max-w-md">
                  Target: {targetApiUrl || 'Não conectado'}
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                  isConnected === true
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : isConnected === false
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected === true
                      ? 'bg-emerald-400 animate-pulse'
                      : isConnected === false
                      ? 'bg-rose-400'
                      : 'bg-zinc-500'
                  }`}
                />
                <span>
                  {isConnected === true
                    ? `Online (${connectionLatency}ms)`
                    : isLocalhost()
                    ? 'Online (Localhost phdev)'
                    : isConnected === false
                    ? 'Desconectado / Não autorizado'
                    : 'Verificando...'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => loadData()}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-medium text-zinc-300 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#f4a7b9]' : ''}`} />
              <span>Atualizar</span>
            </button>

            <button
              onClick={handleExportJson}
              disabled={events.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-medium text-zinc-300 hover:text-white transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar JSON</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 w-full flex-1 space-y-6">
        {/* Nua Borges — Status Financeiro Executivo */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-[#f4a7b9]/10 border border-[#f4a7b9]/20 text-[#f4a7b9]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold text-sm">Nua Borges — Financeiro:</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {financeSummary?.isUpToDate !== false ? '🟢 Em dia' : '🔴 Parcela pendente'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Acompanhamento das mensalidades do contrato de desenvolvimento web.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <div>
              <span className="text-zinc-500 block text-[10px] uppercase font-mono tracking-wider">Último pagamento</span>
              <span className="text-emerald-300 font-mono font-semibold text-sm">
                {financeSummary?.lastPaymentDate ? 'R$ 200,00' : 'Aguardando 1º pagamento'}
              </span>
            </div>

            <div className="border-l border-zinc-800 pl-6 flex items-center gap-4">
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase font-mono tracking-wider">Próxima mensalidade</span>
                <span className="text-white font-mono font-semibold text-sm">
                  R$ 200,00
                  {financeSummary?.nextDueDate && (
                    <span className="text-zinc-400 text-xs font-normal ml-1 font-sans">
                      ({financeSummary.nextDueDate})
                    </span>
                  )}
                </span>
              </div>
              <button
                onClick={() => setActiveTab('finance')}
                className="px-3 py-1.5 rounded-xl bg-[#f4a7b9]/15 hover:bg-[#f4a7b9]/25 text-[#f4a7b9] font-medium text-xs border border-[#f4a7b9]/30 transition-all flex items-center gap-1.5 cursor-pointer ml-2"
              >
                <span>Gerenciar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span className="font-medium">Total de Acessos</span>
              <Eye className="w-4 h-4 text-sky-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-white">
                {telemetry?.totalPageviews || 0}
              </span>
              <span className="text-[11px] text-zinc-500">pageviews</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span className="font-medium">Visitantes Únicos</span>
              <Globe className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-white">
                {telemetry?.uniqueVisitorsToday || 0}
              </span>
              <span className="text-[11px] text-zinc-500">hoje</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span className="font-medium">Uploads no R2</span>
              <Upload className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-white">
                {stats?.totalUploads ?? mediaList.length}
              </span>
              <span className="text-[11px] text-zinc-500">arquivos</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span className="font-medium">Edições / Pontos</span>
              <FileEdit className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-white">
                {stats?.totalEdits ?? 0}
              </span>
              <span className="text-[11px] text-zinc-500">registros</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col justify-between col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span className="font-medium">Honeypots (Bots)</span>
              <Bot className="w-4 h-4 text-rose-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-rose-400">
                {stats?.totalHoneypotTraps ?? honeypotEvents.length}
              </span>
              <span className="text-[11px] text-zinc-500">barrados</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('stream')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 ${
              activeTab === 'stream'
                ? 'bg-[#f4a7b9] text-zinc-950 shadow-md shadow-[#f4a7b9]/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Linha do Tempo (Auditoria) ({filteredEvents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('telemetry')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 ${
              activeTab === 'telemetry'
                ? 'bg-[#f4a7b9] text-zinc-950 shadow-md shadow-[#f4a7b9]/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Acessos & Visitantes</span>
          </button>

          <button
            onClick={() => setActiveTab('media')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 ${
              activeTab === 'media'
                ? 'bg-[#f4a7b9] text-zinc-950 shadow-md shadow-[#f4a7b9]/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Monitor de Mídias ({mediaList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 ${
              activeTab === 'content'
                ? 'bg-[#f4a7b9] text-zinc-950 shadow-md shadow-[#f4a7b9]/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <FileEdit className="w-3.5 h-3.5" />
            <span>Conteúdo Publicado</span>
          </button>

          <button
            onClick={() => setActiveTab('honeypots')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 ${
              activeTab === 'honeypots'
                ? 'bg-[#f4a7b9] text-zinc-950 shadow-md shadow-[#f4a7b9]/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Radar de Honeypots ({honeypotEvents.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('requests');
              stopFlashingTabTitle();
            }}
            className={`relative px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 ${
              activeTab === 'requests'
                ? 'bg-[#f4a7b9] text-zinc-950 shadow-md shadow-[#f4a7b9]/20'
                : newRequestsCount > 0
                ? 'bg-rose-500/15 border border-rose-500/50 text-rose-200 hover:bg-rose-500/25'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Central de Solicitações</span>
            {newRequestsCount > 0 && (
              <span className="flex items-center gap-1.5 ml-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500/30 text-rose-300 font-mono text-[10px] font-bold">
                  {newRequestsCount}
                </span>
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('nua-ai')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 ${
              activeTab === 'nua-ai'
                ? 'bg-[#f4a7b9] text-zinc-950 shadow-md shadow-[#f4a7b9]/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Nua IA (Métricas & 5 Camadas)</span>
          </button>

          <button
            onClick={() => setActiveTab('finance')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 ${
              activeTab === 'finance'
                ? 'bg-[#f4a7b9] text-zinc-950 shadow-md shadow-[#f4a7b9]/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Financeiro (10x R$ 200)</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-[#f4a7b9] text-zinc-950 shadow-md shadow-[#f4a7b9]/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Configurar Conexão API</span>
          </button>
        </div>

        {activeTab === 'finance' && (
          <FinanceAdminManager
            fetchFromApi={fetchFromApi}
            masterKey={masterKey}
            targetApiUrl={targetApiUrl}
            onRefreshGlobal={loadData}
          />
        )}

        {activeTab === 'nua-ai' && (
          <NuaAiMetricsTab />
        )}

        {activeTab === 'requests' && (
          <RequestsCenter
            fetchFromApi={fetchFromApi}
            targetRequestId={targetRequestId}
            onResetTarget={() => setTargetRequestId(null)}
          />
        )}

        {/* TAB 1: AUDITORIA EM TEMPO REAL */}
        {activeTab === 'stream' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider pl-1">
                  Filtro:
                </span>
                {['ALL', 'UPLOADS', 'EDITS', 'LOGINS', 'HONEYPOT', 'CONTACT'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterType(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      filterType === cat
                        ? 'bg-zinc-800 text-white border border-zinc-700'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    {cat === 'ALL'
                      ? 'Todos'
                      : cat === 'UPLOADS'
                      ? 'Uploads'
                      : cat === 'EDITS'
                      ? 'Edições'
                      : cat === 'LOGINS'
                      ? 'Logins'
                      : cat === 'HONEYPOT'
                      ? 'Honeypots'
                      : 'Contato'}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar por IP, arquivo, texto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#f4a7b9]"
                />
              </div>
            </div>

            {/* Activity Stream List */}
            {filteredEvents.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-zinc-800/60 bg-zinc-900/20">
                <Activity className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-zinc-400">Nenhum evento registrado ainda</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Qualquer upload, edição no painel administrativo ou bot pego nas armadilhas aparecerá aqui
                  automaticamente.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className="p-3.5 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700/80 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="mt-0.5 p-2 rounded-xl bg-zinc-950 border border-zinc-800 shrink-0">
                        {getEventIcon(ev.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {getEventBadge(ev.type)}
                          <span className="text-[11px] font-mono text-zinc-400">
                            {formatDate(ev.timestamp)}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            • {getRelativeTime(ev.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-200 font-medium leading-relaxed break-words">
                          {ev.summary}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-1 font-mono">
                          <span>IP: {ev.actor.ip}</span>
                          {ev.actor.country && <span>País: {ev.actor.country}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-medium text-zinc-300 group-hover:text-white transition-all flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspecionar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MONITOR DE MÍDIAS (UPLOADS) */}
        {activeTab === 'media' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl">
              <div>
                <h3 className="text-sm font-semibold text-white">Mídias Armazenadas no Cloudflare R2</h3>
                <p className="text-xs text-zinc-400 font-light mt-0.5">
                  Arquivos enviados através do painel admin. Você pode conferir se fotos e vídeos estão corretos.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-zinc-800 text-xs font-mono text-zinc-300">
                {mediaList.length} itens encontrados
              </span>
            </div>

            {mediaList.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-zinc-800/60 bg-zinc-900/20">
                <ImageIcon className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-zinc-400">Nenhuma mídia encontrada no bucket</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Assim que o cliente fizer upload de fotos ou vídeos no painel admin, eles serão listados aqui.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {mediaList.map((item) => (
                  <div
                    key={item.key}
                    className="group bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-all flex flex-col"
                  >
                    {/* Visual Preview */}
                    <div className="aspect-[4/3] bg-zinc-950 relative overflow-hidden flex items-center justify-center">
                      {item.isVideo ? (
                        <video
                          src={item.url}
                          className="w-full h-full object-cover"
                          preload="metadata"
                          controls={false}
                        />
                      ) : (
                        <img
                          src={item.url}
                          alt={item.key}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}
                      <div className="absolute top-2 right-2 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/70 backdrop-blur-md text-white border border-white/10 font-mono">
                          {formatBytes(item.sizeBytes)}
                        </span>
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="p-3.5 flex flex-col justify-between flex-1 gap-3">
                      <div>
                        <p className="text-xs font-mono text-zinc-200 truncate font-semibold" title={item.key}>
                          {item.key.replace('media/', '')}
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                          {formatDate(item.uploadedAt)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                        <button
                          type="button"
                          onClick={() => handleCopy(item.url, item.key)}
                          className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                        >
                          {copiedKey === item.key ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copiar Link</span>
                            </>
                          )}
                        </button>

                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-[#f4a7b9] hover:underline flex items-center gap-1"
                        >
                          <span>Abrir</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MONITOR DE CONTEÚDO (EDITADO PELO CLIENTE) */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Conteúdo Oficial Sincronizado</h3>
                <p className="text-xs text-zinc-400 font-light mt-0.5">
                  Versão ativa persistida no Cloudflare R2 (`content/published.json`). Permite verificar se o
                  cliente fez alguma alteração indevida de textos ou links.
                </p>
              </div>
              <button
                onClick={() => loadData()}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition-all flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Atualizar Conteúdo</span>
              </button>
            </div>

            {siteContent ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Seção Hero */}
                <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-3">
                  <h4 className="text-xs font-semibold text-[#f4a7b9] uppercase tracking-wider">
                    Hero (Capa Inicial)
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <p className="text-zinc-400">
                      <strong className="text-zinc-200">Tagline:</strong> {siteContent.hero?.tagline || '-'}
                    </p>
                    <p className="text-zinc-400">
                      <strong className="text-zinc-200">Título:</strong> {siteContent.hero?.title || '-'}
                    </p>
                    <p className="text-zinc-400">
                      <strong className="text-zinc-200">Eyebrow:</strong> {siteContent.hero?.eyebrow || '-'}
                    </p>
                    <p className="text-zinc-400">
                      <strong className="text-zinc-200">Fotos no Carrossel:</strong>{' '}
                      {siteContent.hero?.photos?.length || 0} fotos ativas
                    </p>
                  </div>
                </div>

                {/* Seção Sobre Mim */}
                <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-3">
                  <h4 className="text-xs font-semibold text-[#f4a7b9] uppercase tracking-wider">Sobre Mim</h4>
                  <div className="space-y-1.5 text-xs">
                    <p className="text-zinc-400">
                      <strong className="text-zinc-200">Manchete:</strong> {siteContent.about?.headline || '-'}
                    </p>
                    <p className="text-zinc-400">
                      <strong className="text-zinc-200">Bio:</strong>{' '}
                      <span className="italic line-clamp-3">"{siteContent.about?.paragraph1 || '-'}"</span>
                    </p>
                    <p className="text-zinc-400">
                      <strong className="text-zinc-200">Foto de Perfil:</strong>{' '}
                      <span className="font-mono text-[11px] truncate block text-zinc-300">
                        {siteContent.about?.photoUrl || '-'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Seção Canais e Redes */}
                <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-3">
                  <h4 className="text-xs font-semibold text-[#f4a7b9] uppercase tracking-wider">
                    Canais / Redes Sociais
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <p className="text-zinc-400">
                      <strong className="text-zinc-200">OnlyFans:</strong>{' '}
                      <span className="font-mono text-[11px] text-zinc-300">
                        {siteContent.channels?.onlyfans?.url || '-'}
                      </span>
                    </p>
                    <p className="text-zinc-400">
                      <strong className="text-zinc-200">Instagram:</strong>{' '}
                      <span className="font-mono text-[11px] text-zinc-300">
                        {siteContent.channels?.instagram?.url || '-'}
                      </span>
                    </p>
                    <p className="text-zinc-400">
                      <strong className="text-zinc-200">Tags OnlyFans:</strong>{' '}
                      {(siteContent.channels?.onlyfans?.tags || []).join(', ') || '-'}
                    </p>
                  </div>
                </div>

                {/* Seção Contato & Assessoria */}
                <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-3">
                  <h4 className="text-xs font-semibold text-[#f4a7b9] uppercase tracking-wider">
                    Contato & Assessoria
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <p className="text-zinc-400">
                      <strong className="text-zinc-200">E-mail Oficial:</strong>{' '}
                      <span className="font-mono text-zinc-300">{siteContent.contact?.officialEmail || '-'}</span>
                    </p>
                    <p className="text-zinc-400">
                      <strong className="text-zinc-200">Assuntos Aceitos:</strong>{' '}
                      {(siteContent.contact?.subjects || []).join(' • ') || '-'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center rounded-2xl border border-zinc-800/60 bg-zinc-900/20">
                <Database className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-zinc-400">Nenhum conteúdo publicado no R2 ainda</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  O site está utilizando o conteúdo padrão de fábrica. Quando o cliente fizer qualquer alteração no
                  admin e clicar em "Publicar", o snapshot completo aparecerá aqui.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: RADAR DE HONEYPOTS & BOTS */}
        {activeTab === 'honeypots' && (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Bot className="w-4 h-4 text-rose-500" />
                <span>Armadilhas Digitais Ativas (Honeypot Radar)</span>
              </h3>
              <p className="text-xs text-zinc-400 font-light mt-1 max-w-2xl leading-relaxed">
                Todos os robôs e scanners que tentaram vasculhar pastas inexistentes (como WordPress ou .env), raspar
                conteúdo via links invisíveis ou enviar spam pelo formulário de contato são capturados e listados
                abaixo em tempo real.
              </p>
            </div>

            {honeypotEvents.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-zinc-800/60 bg-zinc-900/20">
                <Shield className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-zinc-300">Nenhum bot capturado no momento</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  As armadilhas estão armadas na borda (Edge). Qualquer tentativa automatizada será registrada aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {honeypotEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className="p-4 rounded-2xl bg-zinc-900/40 border border-rose-500/20 hover:border-rose-500/40 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {getEventBadge(ev.type)}
                          <span className="text-[11px] font-mono text-zinc-400">
                            {formatDate(ev.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-200 font-medium">{ev.summary}</p>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 mt-1 font-mono">
                          <span>IP Atacante: {ev.actor.ip}</span>
                          {ev.actor.country && <span>País: {ev.actor.country}</span>}
                          {ev.details?.probedPath && (
                            <span className="text-amber-400">Rota Tentada: {ev.details.probedPath}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-medium self-end sm:self-center"
                    >
                      Ver Detalhes
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CONFIGURAÇÕES DE CONEXÃO */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="p-5 sm:p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl space-y-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#f4a7b9]" />
                  <span>Conexão com a Instância Oficial do Site</span>
                </h3>
                <p className="text-xs text-zinc-400 font-light mt-1">
                  Configure o endpoint do site que este painel mestre irá monitorar. Pode ser o domínio de
                  produção ou localhost para desenvolvimento local.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    URL Base da API (Target API)
                  </label>
                  <input
                    type="text"
                    value={targetApiUrl}
                    onChange={(e) => setTargetApiUrl(e.target.value)}
                    placeholder="https://nuaborges.phstatic.com.br"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white outline-none focus:border-[#f4a7b9]"
                  />
                  <span className="text-[11px] text-zinc-500 mt-1 block">
                    Ex: <code>https://nuaborges.phstatic.com.br</code> ou <code>http://localhost:3000</code>
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    Chave Mestra de Auditoria (ADMIN_API_SECRET ou Senha)
                  </label>
                  <input
                    type="password"
                    value={masterKey}
                    onChange={(e) => setMasterKey(e.target.value)}
                    placeholder="Insira o segredo configurado nas variáveis do Cloudflare"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white outline-none focus:border-[#f4a7b9]"
                  />
                  <span className="text-[11px] text-zinc-500 mt-1 block">
                    Utilizada no header <code>Authorization: Bearer &lt;chave&gt;</code> para autorização cross-domain.
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autorefresh-check"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="rounded accent-[#f4a7b9]"
                    />
                    <label htmlFor="autorefresh-check" className="text-xs text-zinc-300">
                      Atualização automática (a cada {refreshIntervalSec} segundos)
                    </label>
                  </div>

                  <button
                    onClick={handleSaveConnection}
                    className="px-5 py-2.5 rounded-xl bg-[#f4a7b9] hover:bg-[#efa0b3] text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    Salvar e Conectar
                  </button>
                </div>
              </div>
            </div>

            {/* Guia de Hospedagem Independente no admingeral.phstatic.com.br */}
            <div className="p-5 sm:p-6 bg-zinc-950 border border-zinc-800/80 rounded-3xl space-y-3">
              <h4 className="text-xs font-semibold text-[#f4a7b9] uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>Como Rodar no Domínio Independente: admingeral.phstatic.com.br</span>
              </h4>
              <p className="text-xs text-zinc-400 font-light leading-relaxed">
                Este painel foi arquitetado para ser 100% desacoplado. Para colocá-lo no ar no seu subdomínio:
              </p>
              <ol className="text-xs text-zinc-300 space-y-2 list-decimal list-inside font-light">
                <li>
                  No Cloudflare Pages, crie um novo projeto (ex: <code>admingeral</code>).
                </li>
                <li>
                  Adicione o domínio personalizado <code>admingeral.phstatic.com.br</code>.
                </li>
                <li>
                  Use o pacote standalone disponível no arquivo{' '}
                  <code className="text-[#f4a7b9]">admingeral-standalone/index.html</code> deste projeto (ou faça deploy
                  desta mesma rota).
                </li>
                <li>
                  O backend de <code>nuaborges.phstatic.com.br</code> já está pré-configurado com CORS permissivo para
                  o seu domínio de monitoramento!
                </li>
              </ol>
            </div>
          </div>
        )}
      </main>

      {/* Modal de Detalhes do Evento (Humanizado e Rico em Detalhes - Sem JSON Cru) */}
      {selectedEvent && (() => {
        const isRequestEvent = selectedEvent.type === 'REQUEST_CREATED' || !!selectedEvent.details?.id;
        const matchingReq = isRequestEvent
          ? requestsList.find((r) => r.id === selectedEvent.details?.id)
          : null;

        return (
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setSelectedEvent(null)}
          >
            <div
              className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header do Modal */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-[#f4a7b9]">
                    {getEventIcon(selectedEvent.type)}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      {isRequestEvent ? 'Solicitação de Desenvolvimento Registrada' : 'Detalhes do Registro Operacional'}
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      ID: {selectedEvent.id} · {formatDate(selectedEvent.timestamp)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Conteúdo Humanizado */}
              <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs scrollbar-thin">
                {/* BLOCO SE FOR SOLICITAÇÃO DA CLIENTE */}
                {isRequestEvent ? (
                  <div className="space-y-4">
                    {/* Cartão de Destaque da Solicitação */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-zinc-900/90 via-zinc-900/60 to-[#f4a7b9]/10 border border-[#f4a7b9]/30 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#f4a7b9] font-bold">
                            Demanda Cadastrada pela Cliente
                          </span>
                          <h4 className="text-base font-medium text-white leading-snug">
                            {matchingReq?.title || selectedEvent.summary.replace('Nova solicitação: ', '')}
                          </h4>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#f4a7b9]/20 text-[#f4a7b9] border border-[#f4a7b9]/40 shrink-0">
                          {matchingReq?.status ? `Status: ${matchingReq.status}` : 'Nova'}
                        </span>
                      </div>

                      {/* Badges de Metadados */}
                      <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                        <span className="px-2.5 py-1 rounded-full bg-zinc-950/80 border border-zinc-800 text-zinc-300">
                          📂 Categoria: <strong>{matchingReq?.category || 'Geral'}</strong>
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-zinc-950/80 border border-zinc-800 text-zinc-300">
                          ⚡ Prioridade: <strong>{matchingReq?.priority || selectedEvent.details?.priority || 'medium'}</strong>
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-zinc-950/80 border border-zinc-800 text-zinc-300">
                          🏷️ Tipo: <strong>{matchingReq?.type || selectedEvent.details?.type || 'feature'}</strong>
                        </span>
                      </div>

                      {/* Resumo da Cliente */}
                      <div className="pt-2 border-t border-zinc-800/80 space-y-1">
                        <span className="text-[11px] font-semibold text-zinc-400">Resumo da Solicitação:</span>
                        <p className="text-zinc-200 leading-relaxed font-light">
                          {matchingReq?.summary || selectedEvent.summary}
                        </p>
                      </div>

                      {/* Plano Técnico Gerado por IA */}
                      {matchingReq?.technicalPlan && (
                        <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
                          <span className="text-[11px] font-semibold text-[#f4a7b9] flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5" />
                            <span>Plano Técnico de Execução (IA):</span>
                          </span>
                          <div className="p-3 rounded-xl bg-zinc-950/90 border border-zinc-800 text-[11px] font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
                            {matchingReq.technicalPlan}
                          </div>
                        </div>
                      )}

                      {/* Botão de Ação Direta */}
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEvent(null);
                            setTargetRequestId(matchingReq?.id || selectedEvent.details?.id);
                            setActiveTab('requests');
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#f4a7b9] hover:bg-[#fabcc9] text-zinc-950 font-bold text-xs tracking-wide transition-all shadow-md shadow-[#f4a7b9]/25 cursor-pointer"
                        >
                          <span>Abrir na Central de Solicitações e Responder</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* BLOCO PARA OUTROS EVENTOS DE AUDITORIA */
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                        Resumo da Operação
                      </span>
                      <p className="text-sm text-white font-medium">{selectedEvent.summary}</p>
                    </div>

                    {/* Detalhes Estruturados em Grid */}
                    {selectedEvent.details && Object.keys(selectedEvent.details).length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                          Parâmetros da Operação
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {Object.entries(selectedEvent.details).map(([key, val]) => (
                            <div key={key} className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                              <span className="text-[10px] text-zinc-500 font-mono uppercase">{key}</span>
                              <p className="text-xs text-zinc-200 font-mono mt-0.5 break-all">
                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* BLOCO DE ORIGEM & DISPOSITIVO */}
                <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-2 text-xs">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
                    Origem & Dispositivo
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div className="flex items-center gap-2 text-zinc-300">
                      <Globe className="w-3.5 h-3.5 text-zinc-500" />
                      <span>IP: <strong className="font-mono text-white">{selectedEvent.actor.ip}</strong> {selectedEvent.actor.country ? `(${selectedEvent.actor.country})` : ''}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-300">
                      <Laptop className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{parseUserAgentFriendly(selectedEvent.actor.userAgent)}</span>
                    </div>
                  </div>
                </div>

                {/* DADOS BRUTOS (OPCIONAL/COLAPSADO NO RODAPÉ - ZERO JSON NA CARA) */}
                <details className="pt-2 text-zinc-500">
                  <summary className="cursor-pointer text-[11px] text-zinc-500 hover:text-zinc-400">
                    Visualizar dados técnicos de diagnóstico
                  </summary>
                  <pre className="mt-2 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-[10px] font-mono text-zinc-400 overflow-x-auto">
                    {JSON.stringify(selectedEvent, null, 2)}
                  </pre>
                </details>
              </div>

              {/* Rodapé do Modal */}
              <div className="pt-3 border-t border-zinc-800 flex justify-end">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-all cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Alert de Nova Solicitação */}
      {newRequestAlert && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-zinc-950 border-2 border-rose-500/80 rounded-3xl p-6 sm:p-7 space-y-5 shadow-[0_0_60px_rgba(244,63,94,0.35)] relative overflow-hidden">
            {/* Efeito luminoso de topo */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-[#f4a7b9] to-indigo-500 animate-pulse" />

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <Bell className="w-6 h-6 animate-bounce" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                  </span>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400 font-bold">
                    Nova Solicitação Recebida
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white leading-snug">
                  {newRequestAlert.title}
                </h3>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2 text-xs">
              <div className="flex flex-wrap gap-2 text-[11px]">
                {newRequestAlert.category && (
                  <span className="px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">
                    📂 {newRequestAlert.category}
                  </span>
                )}
                {newRequestAlert.priority && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold uppercase">
                    Prioridade: {newRequestAlert.priority}
                  </span>
                )}
                {newRequestAlert.type && (
                  <span className="px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                    Tipo: {newRequestAlert.type}
                  </span>
                )}
              </div>
              <p className="text-zinc-300 font-light leading-relaxed pt-1">
                {newRequestAlert.summary}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  stopFlashingTabTitle();
                  setNewRequestAlert(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold transition-all cursor-pointer"
              >
                Dispensar
              </button>
              <button
                type="button"
                onClick={() => {
                  stopFlashingTabTitle();
                  setTargetRequestId(newRequestAlert.id);
                  setActiveTab('requests');
                  setNewRequestAlert(null);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold transition-all shadow-[0_0_20px_rgba(244,63,94,0.4)] cursor-pointer"
              >
                <span>Abrir Solicitação Agora</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
