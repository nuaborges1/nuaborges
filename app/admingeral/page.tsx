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
} from 'lucide-react';

interface AuditEvent {
  id: string;
  timestamp: string;
  type: string;
  severity: 'info' | 'warning' | 'critical' | 'alert';
  actor: {
    ip: string;
    country?: string;
    city?: string;
    userAgent?: string;
  };
  summary: string;
  details?: Record<string, any>;
}

interface AuditStats {
  totalEvents: number;
  totalUploads: number;
  totalEdits: number;
  totalHoneypotTraps: number;
  totalLogins: number;
  lastActivity: string | null;
}

interface MediaItem {
  key: string;
  sizeBytes: number;
  uploadedAt: string;
  contentType: string;
  url: string;
  isVideo: boolean;
}

type TabType = 'stream' | 'telemetry' | 'media' | 'content' | 'honeypots' | 'settings';

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

  // Estados de Interface
  const [activeTab, setActiveTab] = useState<TabType>('stream');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(8);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 1. Inicializa credenciais do localStorage com fallback automático
  useEffect(() => {
    if (typeof window === 'undefined') return;
    document.cookie = 'nua_admin_bypass=1; path=/; max-age=31536000; SameSite=Lax';

    const savedTarget = localStorage.getItem('nua_master_target_api');
    const savedKey = localStorage.getItem('nua_master_secret_key');

    const defaultUrl = savedTarget || window.location.origin;
    setTargetApiUrl(defaultUrl);
    setMasterKey(savedKey || 'nuaborges2026');
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
                  <span>ADMIN GERAL & MONITORAMENTO</span>
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

      {/* Modal de Detalhes do Evento (JSON Inspector) */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                {getEventIcon(selectedEvent.type)}
                <div>
                  <h3 className="text-sm font-semibold text-white">Inspeção Detalhada do Evento</h3>
                  <p className="text-[11px] text-zinc-400 font-mono">ID: {selectedEvent.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1 pr-1 text-xs">
              <div className="p-3 bg-zinc-900/60 rounded-xl space-y-1.5">
                <p>
                  <strong className="text-zinc-400">Tipo:</strong>{' '}
                  <span className="font-mono text-[#f4a7b9]">{selectedEvent.type}</span>
                </p>
                <p>
                  <strong className="text-zinc-400">Data/Hora:</strong>{' '}
                  <span className="font-mono">{formatDate(selectedEvent.timestamp)}</span>
                </p>
                <p>
                  <strong className="text-zinc-400">Resumo:</strong> {selectedEvent.summary}
                </p>
                <p>
                  <strong className="text-zinc-400">IP de Origem:</strong>{' '}
                  <span className="font-mono text-zinc-200">{selectedEvent.actor.ip}</span>{' '}
                  {selectedEvent.actor.country && `(${selectedEvent.actor.country})`}
                </p>
                {selectedEvent.actor.userAgent && (
                  <p className="break-all">
                    <strong className="text-zinc-400">User-Agent:</strong>{' '}
                    <span className="text-zinc-400 text-[11px] font-mono">
                      {selectedEvent.actor.userAgent}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Payload JSON Completo
                </h4>
                <pre className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-[11px] font-mono text-zinc-300 overflow-x-auto">
                  {JSON.stringify(selectedEvent, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
