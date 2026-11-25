'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Check,
  ChevronDown,
  ClipboardCheck,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileJson,
  FileSpreadsheet,
  Image as ImageIcon,
  Link2,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Power,
  RefreshCw,
  Search,
  Star,
  X,
} from 'lucide-react';
import { PageHeader, StatusBadge } from './ui/AdminPrimitives';
import { getPublicApiUrl } from '@/lib/sessionToken';
import {
  FEEDBACK_PARTS,
  ISSUE_AREA_OPTIONS,
  type ConsolidatedFeedbackMetrics,
  type FeedbackIssueRecord,
  type FeedbackIssueStatus,
  type FeedbackLinkRecord,
  type FeedbackLinkStatus,
  type FeedbackResponseRecord,
  type FeedbackReviewStatus,
  type FeedbackSettings,
} from '@/lib/prelaunchFeedback';

interface GeneratedFeedbackLink {
  id: string;
  adminCode: string;
  url: string;
  createdAt: string;
}

type ActiveTab = 'overview' | 'links' | 'responses' | 'issues';

const LINK_STATUS_LABEL: Record<FeedbackLinkStatus, string> = {
  available: 'Disponível',
  in_progress: 'Em andamento',
  completed: 'Respondido',
  revoked: 'Revogado',
};

const REVIEW_STATUS_LABEL: Record<FeedbackReviewStatus, string> = {
  new: 'Nova',
  in_review: 'Em análise',
  reviewed: 'Analisada',
};

const ISSUE_STATUS_LABEL: Record<FeedbackIssueStatus, string> = {
  new: 'Novo',
  in_review: 'Em análise',
  resolved: 'Resolvido',
  dismissed: 'Descartado',
};

const REPEAT_LABEL: Record<string, string> = {
  yes: 'Sim',
  no: 'Não',
  not_tried: 'Não tentou novamente',
};

const DEVICE_LABEL: Record<string, string> = {
  celular: 'Celular',
  computador: 'Computador',
  ambos: 'Celular e computador',
};

function formatDateBr(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAnswerValue(val: unknown): string {
  if (val === undefined || val === null || val === '') return '—';
  if (Array.isArray(val)) return val.join(', ');
  const map: Record<string, string> = {
    sim: 'Sim',
    nao: 'Não',
    mais_ou_menos: 'Mais ou menos',
    nao_sei: 'Prefiro não responder',
    celular: 'Celular',
    computador: 'Computador',
    ambos: 'Celular e computador',
  };
  return map[String(val)] || String(val);
}

export function PrelaunchFeedbackModule() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Menus suspensos do cabeçalho
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const optionsMenuRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState<FeedbackSettings>({
    collectionActive: true,
    hideFromSidebar: false,
    retentionDays: 90,
    closedAt: null,
    updatedAt: null,
  });
  const [metrics, setMetrics] = useState<ConsolidatedFeedbackMetrics | null>(null);
  const [links, setLinks] = useState<FeedbackLinkRecord[]>([]);
  const [responses, setResponses] = useState<FeedbackResponseRecord[]>([]);
  const [issues, setIssues] = useState<FeedbackIssueRecord[]>([]);

  // Geração de links (códigos completos existem apenas nesta sessão)
  const [customCount, setCustomCount] = useState<string>('5');
  const [generating, setGenerating] = useState(false);
  const [generatedBatch, setGeneratedBatch] = useState<GeneratedFeedbackLink[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filtros — Links
  const [linkStatusFilter, setLinkStatusFilter] = useState<'all' | FeedbackLinkStatus>('all');
  const [linkSearch, setLinkSearch] = useState('');

  // Filtros & detalhe — Respostas
  const [responseStatusFilter, setResponseStatusFilter] = useState<'all' | FeedbackReviewStatus>('all');
  const [responseSearch, setResponseSearch] = useState('');
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  const [responseNotesDraft, setResponseNotesDraft] = useState('');
  const [responseStatusDraft, setResponseStatusDraft] = useState<FeedbackReviewStatus>('new');
  const [savingResponse, setSavingResponse] = useState(false);

  // Filtros & notas — Problemas
  const [issueAreaFilter, setIssueAreaFilter] = useState<string>('all');
  const [issueStatusFilter, setIssueStatusFilter] = useState<'all' | FeedbackIssueStatus>('all');
  const [issueNotesMap, setIssueNotesMap] = useState<Record<string, string>>({});
  const [savingIssueId, setSavingIssueId] = useState<string | null>(null);

  // Modal de visualização de captura privada
  const [previewAttachmentKey, setPreviewAttachmentKey] = useState<string | null>(null);

  const apiUrl = getPublicApiUrl();

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (exportMenuRef.current && !exportMenuRef.current.contains(target)) {
        setExportMenuOpen(false);
      }
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(target)) {
        setOptionsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const flashNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice((prev) => (prev === msg ? null : prev)), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${apiUrl}/api/admin/prelaunch-feedback`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setErrorMsg(data?.error || 'Não foi possível carregar as avaliações do pré-lançamento.');
        return;
      }
      setSettings(data.settings);
      setMetrics(data.metrics);
      setLinks(Array.isArray(data.links) ? data.links : []);
      const nextResponses: FeedbackResponseRecord[] = Array.isArray(data.responses) ? data.responses : [];
      setResponses(nextResponses);
      const nextIssues: FeedbackIssueRecord[] = Array.isArray(data.issues) ? data.issues : [];
      setIssues(nextIssues);

      setIssueNotesMap((prev) => {
        const merged = { ...prev };
        for (const iss of nextIssues) {
          if (merged[iss.id] === undefined) {
            merged[iss.id] = iss.adminNotes || '';
          }
        }
        return merged;
      });

      // Seleciona automaticamente a primeira resposta se nenhuma estiver selecionada
      setSelectedResponseId((prev) => {
        if (prev && nextResponses.some((r) => r.id === prev)) return prev;
        if (nextResponses.length > 0) {
          setResponseNotesDraft(nextResponses[0].adminNotes || '');
          setResponseStatusDraft(nextResponses[0].reviewStatus);
          return nextResponses[0].id;
        }
        return null;
      });

      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(
            'nua_prelaunch_hide_sidebar',
            data.settings?.hideFromSidebar ? '1' : '0'
          );
        }
      } catch {}
    } catch {
      setErrorMsg('Falha ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const postAction = async (body: Record<string, unknown>) => {
    return fetch(`${apiUrl}/api/admin/prelaunch-feedback`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  const handleGenerateLinks = async (count: number) => {
    if (!Number.isInteger(count) || count < 1 || count > 100) {
      setErrorMsg('Informe uma quantidade entre 1 e 100 links.');
      return;
    }
    setGenerating(true);
    setErrorMsg(null);
    try {
      const res = await postAction({ action: 'generate_links', count });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setErrorMsg(data?.error || 'Não foi possível gerar os links.');
        return;
      }
      const created: GeneratedFeedbackLink[] = Array.isArray(data.generated) ? data.generated : [];
      setGeneratedBatch((prev) => [...created, ...prev]);
      flashNotice(`${created.length} link(s) gerado(s) com sucesso.`);
      await loadData();
    } catch {
      setErrorMsg('Falha de conexão ao gerar links.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyText = async (text: string, id: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      flashNotice(message);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2200);
    } catch {
      setErrorMsg('Não foi possível copiar automaticamente. Selecione e copie manualmente.');
    }
  };

  const availableGeneratedLinks = useMemo(() => {
    const statusById = new Map(links.map((l) => [l.id, l.status]));
    return generatedBatch.filter((g) => {
      const st = statusById.get(g.id);
      return !st || st === 'available' || st === 'in_progress';
    });
  }, [generatedBatch, links]);

  const handleRevokeLink = async (linkId: string) => {
    setErrorMsg(null);
    const res = await postAction({ action: 'revoke_link', linkId });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      setErrorMsg(data?.error || 'Não foi possível revogar o link.');
      return;
    }
    flashNotice('Link revogado.');
    await loadData();
  };

  const handleToggleCollection = async () => {
    setOptionsMenuOpen(false);
    const nextActive = !settings.collectionActive;
    const res = await postAction({ action: 'update_settings', collectionActive: nextActive });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      setErrorMsg(data?.error || 'Não foi possível alterar o estado da coleta.');
      return;
    }
    setSettings(data.settings);
    flashNotice(
      nextActive
        ? 'Coleta reativada. Links disponíveis voltaram a funcionar.'
        : 'Coleta encerrada. Todas as respostas recebidas permanecem salvas.'
    );
  };

  const handleToggleSidebarVisibility = async () => {
    setOptionsMenuOpen(false);
    const nextHidden = !settings.hideFromSidebar;
    const res = await postAction({ action: 'update_settings', hideFromSidebar: nextHidden });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      setErrorMsg(data?.error || 'Não foi possível atualizar a visibilidade no menu.');
      return;
    }
    setSettings(data.settings);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('nua_prelaunch_hide_sidebar', nextHidden ? '1' : '0');
      }
      window.dispatchEvent(
        new CustomEvent('nua_prelaunch_sidebar_updated', {
          detail: { hideFromSidebar: nextHidden },
        })
      );
    } catch {}
    flashNotice(nextHidden ? 'Atalho ocultado do menu lateral.' : 'Atalho visível no menu lateral.');
  };

  const handleExport = async (
    format: 'csv' | 'json',
    scope: 'responses' | 'summary' | 'issues' | 'all'
  ) => {
    setExportMenuOpen(false);
    setErrorMsg(null);
    try {
      const res = await postAction({ action: 'export', format, scope });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setErrorMsg(err?.error || 'Não foi possível exportar os dados.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `avaliacoes-pre-lancamento-${scope}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      flashNotice(`Exportação ${format.toUpperCase()} concluída.`);
    } catch {
      setErrorMsg('Erro ao gerar arquivo de exportação.');
    }
  };

  const openResponseDetail = (resp: FeedbackResponseRecord) => {
    setSelectedResponseId(resp.id);
    setResponseNotesDraft(resp.adminNotes || '');
    setResponseStatusDraft(resp.reviewStatus);
    setActiveTab('responses');
  };

  const selectedResponse = useMemo(
    () => responses.find((r) => r.id === selectedResponseId) || null,
    [responses, selectedResponseId]
  );

  const handleSaveResponseReview = async () => {
    if (!selectedResponse) return;
    setSavingResponse(true);
    try {
      const res = await postAction({
        action: 'update_response',
        responseId: selectedResponse.id,
        reviewStatus: responseStatusDraft,
        adminNotes: responseNotesDraft,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setErrorMsg(data?.error || 'Falha ao salvar análise.');
        return;
      }
      flashNotice('Análise e observações salvas.');
      await loadData();
    } finally {
      setSavingResponse(false);
    }
  };

  const handleSaveIssue = async (issueId: string, issueStatus: FeedbackIssueStatus) => {
    setSavingIssueId(issueId);
    try {
      const res = await postAction({
        action: 'update_issue',
        issueId,
        issueStatus,
        adminNotes: issueNotesMap[issueId] || '',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setErrorMsg(data?.error || 'Falha ao atualizar problema.');
        return;
      }
      flashNotice('Problema atualizado.');
      await loadData();
    } finally {
      setSavingIssueId(null);
    }
  };

  const filteredLinks = useMemo(() => {
    const q = linkSearch.trim().toLowerCase();
    return links.filter((l) => {
      if (linkStatusFilter !== 'all' && l.status !== linkStatusFilter) return false;
      if (!q) return true;
      return (
        l.adminCode.toLowerCase().includes(q) ||
        (l.participantName || '').toLowerCase().includes(q)
      );
    });
  }, [links, linkStatusFilter, linkSearch]);

  const filteredResponses = useMemo(() => {
    const q = responseSearch.trim().toLowerCase();
    return responses.filter((r) => {
      if (responseStatusFilter !== 'all' && r.reviewStatus !== responseStatusFilter) return false;
      if (!q) return true;
      return (
        r.participantName.toLowerCase().includes(q) ||
        (r.adminCode || '').toLowerCase().includes(q)
      );
    });
  }, [responses, responseStatusFilter, responseSearch]);

  const filteredIssues = useMemo(() => {
    return issues.filter((i) => {
      if (issueAreaFilter !== 'all' && i.area !== issueAreaFilter) return false;
      if (issueStatusFilter !== 'all' && i.issueStatus !== issueStatusFilter) return false;
      return true;
    });
  }, [issues, issueAreaFilter, issueStatusFilter]);

  const openIssuesCount = useMemo(
    () => issues.filter((i) => i.issueStatus === 'new' || i.issueStatus === 'in_review').length,
    [issues]
  );

  const linkStatusTone = (st: FeedbackLinkStatus) => {
    if (st === 'completed') return 'emerald' as const;
    if (st === 'in_progress') return 'amber' as const;
    if (st === 'revoked') return 'rose' as const;
    return 'default' as const;
  };

  const issueStatusTone = (st: FeedbackIssueStatus) => {
    if (st === 'resolved') return 'emerald' as const;
    if (st === 'in_review') return 'amber' as const;
    if (st === 'dismissed') return 'default' as const;
    return 'rose' as const;
  };

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Avaliações do Pré-lançamento"
        subtitle="Central exclusiva do desenvolvedor para gerar convites, ler respostas e acompanhar correções."
        badge={
          <div className="flex items-center gap-2">
            <StatusBadge tone={settings.collectionActive ? 'emerald' : 'rose'} dot>
              {settings.collectionActive ? 'Coleta ativa' : 'Coleta encerrada'}
            </StatusBadge>
            <span className="px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[10px] font-mono uppercase tracking-wider text-zinc-400">
              PHDEV
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {/* Menu Exportar */}
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setExportMenuOpen((v) => !v);
                  setOptionsMenuOpen(false);
                }}
                className="h-9 px-3.5 rounded-xl bg-[#14161d] hover:bg-white/[0.06] border border-white/[0.08] text-zinc-200 text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-zinc-400" />
                <span>Exportar</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              </button>

              {exportMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-[#161822] border border-white/[0.1] shadow-2xl py-1.5 z-40">
                  <button
                    type="button"
                    onClick={() => handleExport('csv', 'responses')}
                    className="w-full px-3.5 py-2 text-left text-xs text-zinc-200 hover:bg-white/[0.06] flex items-center gap-2.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>CSV Completo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('csv', 'summary')}
                    className="w-full px-3.5 py-2 text-left text-xs text-zinc-200 hover:bg-white/[0.06] flex items-center gap-2.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>CSV Resumo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('csv', 'issues')}
                    className="w-full px-3.5 py-2 text-left text-xs text-zinc-200 hover:bg-white/[0.06] flex items-center gap-2.5 cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>CSV Problemas</span>
                  </button>
                  <div className="my-1 border-t border-white/[0.06]" />
                  <button
                    type="button"
                    onClick={() => handleExport('json', 'all')}
                    className="w-full px-3.5 py-2 text-left text-xs text-zinc-200 hover:bg-white/[0.06] flex items-center gap-2.5 cursor-pointer"
                  >
                    <FileJson className="w-3.5 h-3.5 text-[#c77990] shrink-0" />
                    <span>JSON Consolidado</span>
                  </button>
                </div>
              )}
            </div>

            {/* Menu Opções */}
            <div className="relative" ref={optionsMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setOptionsMenuOpen((v) => !v);
                  setExportMenuOpen(false);
                }}
                aria-label="Opções da coleta"
                className="h-9 px-3 rounded-xl bg-[#14161d] hover:bg-white/[0.06] border border-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Opções</span>
              </button>

              {optionsMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-[#161822] border border-white/[0.1] shadow-2xl py-1.5 z-40">
                  <button
                    type="button"
                    onClick={handleToggleCollection}
                    className="w-full px-3.5 py-2 text-left text-xs text-zinc-200 hover:bg-white/[0.06] flex items-center gap-2.5 cursor-pointer"
                  >
                    <Power
                      className={`w-3.5 h-3.5 shrink-0 ${
                        settings.collectionActive ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    />
                    <span>{settings.collectionActive ? 'Encerrar coleta' : 'Reativar coleta'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleSidebarVisibility}
                    className="w-full px-3.5 py-2 text-left text-xs text-zinc-200 hover:bg-white/[0.06] flex items-center gap-2.5 cursor-pointer"
                  >
                    {settings.hideFromSidebar ? (
                      <Eye className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    )}
                    <span>{settings.hideFromSidebar ? 'Mostrar no menu' : 'Ocultar do menu'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Atualizar */}
            <button
              type="button"
              onClick={loadData}
              aria-label="Atualizar dados"
              title="Atualizar dados"
              className="h-9 w-9 rounded-xl bg-[#14161d] hover:bg-white/[0.06] border border-white/[0.08] text-zinc-300 hover:text-white inline-flex items-center justify-center transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        }
      />

      {/* Avisos discretos */}
      {notice && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-4 py-2.5 text-xs text-emerald-200 flex items-center justify-between gap-2">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-emerald-300 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/25 px-4 py-2.5 text-xs text-rose-200 flex items-center justify-between gap-2">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-rose-300 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Barra de navegação interna limpa */}
      <div className="border-b border-white/[0.07] flex items-center gap-1 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview' as const, label: 'Visão geral', count: null },
          { id: 'links' as const, label: 'Links de avaliação', count: links.length },
          { id: 'responses' as const, label: 'Respostas recebidas', count: responses.length },
          { id: 'issues' as const, label: 'Problemas encontrados', count: issues.length },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-3 text-xs font-medium whitespace-nowrap inline-flex items-center gap-2 transition cursor-pointer ${
                active ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                    active
                      ? 'bg-[#843C52]/30 text-[#efb2c5]'
                      : 'bg-white/[0.05] text-zinc-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
              {active && (
                <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[#9e4762]" />
              )}
            </button>
          );
        })}
      </div>

      {loading && !metrics ? (
        <div className="rounded-2xl bg-[#13141c] border border-white/[0.07] p-12 text-center">
          <Loader2 className="w-5 h-5 animate-spin text-[#c77990] mx-auto" />
          <p className="text-xs text-zinc-500 mt-3">Carregando avaliações...</p>
        </div>
      ) : null}

      {/* ================================================================ */}
      {/* 1. VISÃO GERAL                                                   */}
      {/* ================================================================ */}
      {activeTab === 'overview' && metrics && (
        <div className="space-y-6">
          {/* 4 KPIs principais com respiro */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-[#13141c] border border-white/[0.07] p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Avaliações recebidas</span>
                <ClipboardCheck className="w-4 h-4 text-[#c77990]" />
              </div>
              <div className="mt-3">
                <span className="text-3xl font-semibold text-white tracking-tight">
                  {metrics.responsesReceived}
                </span>
                <p className="text-[11px] text-zinc-500 mt-1">
                  {metrics.responsesPendingReview} aguardando análise
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-[#13141c] border border-white/[0.07] p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Nota geral média</span>
                <Star className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-3">
                <span className="text-3xl font-semibold text-white tracking-tight">
                  {metrics.averageOverallRating ? `${metrics.averageOverallRating.toFixed(1)} / 5` : '—'}
                </span>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Aparência:{' '}
                  <strong className="text-zinc-300 font-medium">
                    {metrics.averageAppearanceRating ? `${metrics.averageAppearanceRating.toFixed(1)} / 5` : '—'}
                  </strong>
                  {' · '}
                  Packs:{' '}
                  <strong className="text-zinc-300 font-medium">
                    {metrics.averagePacksRating ? `${metrics.averagePacksRating.toFixed(1)} / 5` : '—'}
                  </strong>
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-[#13141c] border border-white/[0.07] p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Links disponíveis</span>
                <Link2 className="w-4 h-4 text-sky-400" />
              </div>
              <div className="mt-3">
                <span className="text-3xl font-semibold text-white tracking-tight">
                  {metrics.linksAvailable}
                </span>
                <p className="text-[11px] text-zinc-500 mt-1">
                  {metrics.linksInProgress} em andamento · {metrics.linksGenerated} gerados no total
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-[#13141c] border border-white/[0.07] p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Problemas em aberto</span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-3">
                <span className="text-3xl font-semibold text-white tracking-tight">
                  {openIssuesCount}
                </span>
                <p className="text-[11px] text-zinc-500 mt-1">
                  {metrics.issuesResolved} resolvidos · {metrics.issuesReported} relatados
                </p>
              </div>
            </div>
          </div>

          {/* 2 colunas organizadas: Últimas respostas + Resumo por área */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 rounded-2xl bg-[#13141c] border border-white/[0.07] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Últimas avaliações recebidas</h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Clique em uma avaliação para abrir as respostas completas.
                  </p>
                </div>
                {responses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('responses')}
                    className="text-xs text-[#d98ba3] hover:text-white transition cursor-pointer"
                  >
                    Ver todas
                  </button>
                )}
              </div>

              {responses.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <ClipboardCheck className="w-6 h-6 text-[#c77990]/70 mx-auto" />
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    Nenhuma avaliação enviada ainda. Gere links individuais na aba de links para começar a coletar opiniões.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('links')}
                    className="h-9 px-4 rounded-xl bg-[#843C52] hover:bg-[#992b4a] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Ir para links de avaliação</span>
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.05]">
                  {responses.slice(0, 6).map((resp) => (
                    <button
                      key={resp.id}
                      type="button"
                      onClick={() => openResponseDetail(resp)}
                      className="w-full px-5 py-3.5 text-left hover:bg-white/[0.025] transition flex items-center justify-between gap-4 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white truncate">
                            {resp.participantName}
                          </span>
                          {resp.adminCode && (
                            <span className="text-[10px] font-mono text-zinc-500">
                              {resp.adminCode}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                          {formatDateBr(resp.submittedAt)}
                          {resp.issuesCount > 0 ? ` · ${resp.issuesCount} problema(s)` : ' · Sem problemas'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        {resp.overallRating && (
                          <span className="px-2 py-0.5 rounded-md bg-white/[0.05] text-xs font-medium text-zinc-200">
                            ★ {resp.overallRating}/5
                          </span>
                        )}
                        <StatusBadge
                          tone={
                            resp.reviewStatus === 'reviewed'
                              ? 'emerald'
                              : resp.reviewStatus === 'in_review'
                                ? 'amber'
                                : 'pink'
                          }
                        >
                          {REVIEW_STATUS_LABEL[resp.reviewStatus]}
                        </StatusBadge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-5 space-y-5">
              <div className="rounded-2xl bg-[#13141c] border border-white/[0.07] p-5 space-y-3.5">
                <h3 className="text-sm font-semibold text-white">Áreas mais avaliadas</h3>
                {metrics.topEvaluatedAreas.length === 0 ? (
                  <p className="text-xs text-zinc-500">Sem dados ainda.</p>
                ) : (
                  <div className="space-y-2.5">
                    {metrics.topEvaluatedAreas.slice(0, 6).map((row) => {
                      const max = Math.max(1, metrics.topEvaluatedAreas[0]?.count || 1);
                      const pct = Math.round((row.count / max) * 100);
                      return (
                        <div key={row.area} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-zinc-300">{row.area}</span>
                            <span className="text-zinc-400 font-mono">{row.count}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#9e4762]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-[#13141c] border border-white/[0.07] p-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Onde houve mais dificuldades</h3>
                  {issues.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('issues')}
                      className="text-xs text-amber-300 hover:text-amber-200 transition cursor-pointer"
                    >
                      Ver problemas
                    </button>
                  )}
                </div>
                {metrics.areasWithMostIssues.length === 0 ? (
                  <p className="text-xs text-zinc-500">Nenhum problema relatado até o momento.</p>
                ) : (
                  <div className="space-y-2.5">
                    {metrics.areasWithMostIssues.slice(0, 6).map((row) => {
                      const max = Math.max(1, metrics.areasWithMostIssues[0]?.count || 1);
                      const pct = Math.round((row.count / max) * 100);
                      return (
                        <div key={row.area} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-zinc-300">{row.area}</span>
                            <span className="text-amber-300 font-mono font-semibold">{row.count}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-amber-400/80"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* 2. LINKS DE AVALIAÇÃO                                            */}
      {/* ================================================================ */}
      {activeTab === 'links' && (
        <div className="space-y-5">
          {/* Card 1: Criar novos links */}
          <div className="rounded-2xl bg-[#13141c] border border-white/[0.07] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-white">Gerar novos links de convite</h3>
              <p className="text-xs text-zinc-400">
                Cada link vale para uma única avaliação. Por segurança, o endereço completo só aparece logo após a geração.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {[1, 5, 10, 20].map((qty) => (
                <button
                  key={qty}
                  type="button"
                  disabled={generating}
                  onClick={() => handleGenerateLinks(qty)}
                  className="h-9 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-zinc-200 text-xs font-medium transition cursor-pointer disabled:opacity-50"
                >
                  +{qty} {qty === 1 ? 'link' : 'links'}
                </button>
              ))}

              <div className="h-5 w-px bg-white/[0.08] mx-1 hidden sm:block" />

              <div className="inline-flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={customCount}
                  onChange={(e) => setCustomCount(e.target.value)}
                  aria-label="Quantidade personalizada de links"
                  className="w-16 h-9 rounded-xl bg-[#0c0d12] border border-white/[0.1] px-2.5 text-xs text-white text-center outline-none focus:border-[#843C52]"
                />
                <button
                  type="button"
                  disabled={generating}
                  onClick={() => handleGenerateLinks(Number(customCount))}
                  className="h-9 px-4 rounded-xl bg-[#843C52] hover:bg-[#992b4a] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  {generating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Link2 className="w-3.5 h-3.5" />
                  )}
                  <span>Gerar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Lote recém-gerado pronto para envio */}
          {availableGeneratedLinks.length > 0 && (
            <div className="rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/25 p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-semibold text-emerald-300">
                    Pronto para enviar ({availableGeneratedLinks.length}{' '}
                    {availableGeneratedLinks.length === 1 ? 'link' : 'links'})
                  </h4>
                  <p className="text-[11px] text-emerald-200/70 mt-0.5">
                    Copie os endereços agora — depois que você sair desta página, o código bruto não será exibido novamente.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(
                        availableGeneratedLinks.map((g) => `${g.adminCode}: ${g.url}`).join('\n'),
                        'copy-all',
                        `${availableGeneratedLinks.length} link(s) copiados.`
                      )
                    }
                    className="h-8 px-3.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/35 text-emerald-100 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedId === 'copy-all' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copiar todos os links disponíveis</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGeneratedBatch([])}
                    title="Limpar aviso"
                    className="h-8 w-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white inline-flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                {availableGeneratedLinks.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[#0c0d12]/80 border border-white/[0.06] px-3.5 py-2 text-xs"
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <span className="font-mono text-[#e09ab0] font-semibold shrink-0">
                        {item.adminCode}
                      </span>
                      <span className="text-zinc-300 truncate font-mono text-[11px]">{item.url}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        title="Abrir formulário"
                        className="h-7 w-7 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] text-zinc-300 inline-flex items-center justify-center"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopyText(item.url, item.id, `Link ${item.adminCode} copiado.`)}
                        className="h-7 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] text-zinc-100 text-[11px] font-medium inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>Copiar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Card 2: Lista de todos os links */}
          <div className="rounded-2xl bg-[#13141c] border border-white/[0.07] overflow-hidden">
            <div className="p-4 border-b border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={linkSearch}
                  onChange={(e) => setLinkSearch(e.target.value)}
                  placeholder="Buscar por código (AV-001) ou participante..."
                  className="w-full h-9 bg-[#0c0d12] border border-white/[0.08] rounded-xl pl-8.5 pr-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#843C52]"
                />
              </div>

              <div className="inline-flex flex-wrap gap-1">
                {(
                  [
                    ['all', 'Todos'],
                    ['available', 'Disponível'],
                    ['in_progress', 'Em andamento'],
                    ['completed', 'Respondido'],
                    ['revoked', 'Revogado'],
                  ] as const
                ).map(([st, label]) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setLinkStatusFilter(st)}
                    className={`h-8 px-3 rounded-lg text-xs font-medium transition cursor-pointer ${
                      linkStatusFilter === st
                        ? 'bg-[#843C52]/30 text-white border border-[#843C52]/50'
                        : 'text-zinc-400 hover:text-white border border-transparent'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] text-zinc-500 uppercase tracking-wider">
                    <th className="py-3 px-5 font-medium">Código</th>
                    <th className="py-3 px-4 font-medium">Situação</th>
                    <th className="py-3 px-4 font-medium">Participante</th>
                    <th className="py-3 px-4 font-medium">Criado em</th>
                    <th className="py-3 px-4 font-medium">Concluído em</th>
                    <th className="py-3 px-5 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {filteredLinks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-zinc-500">
                        Nenhum link encontrado para este filtro.
                      </td>
                    </tr>
                  ) : (
                    filteredLinks.map((link) => {
                      const matchedResponse = responses.find(
                        (r) => r.id === link.responseId || r.linkId === link.id
                      );
                      const batchItem = generatedBatch.find((g) => g.id === link.id);
                      return (
                        <tr key={link.id} className="hover:bg-white/[0.02] transition">
                          <td className="py-3.5 px-5 font-mono font-semibold text-white">
                            {link.adminCode}
                          </td>
                          <td className="py-3.5 px-4">
                            <StatusBadge tone={linkStatusTone(link.status)} dot>
                              {LINK_STATUS_LABEL[link.status]}
                            </StatusBadge>
                          </td>
                          <td className="py-3.5 px-4 text-zinc-200">{link.participantName || '—'}</td>
                          <td className="py-3.5 px-4 text-zinc-400">{formatDateBr(link.createdAt)}</td>
                          <td className="py-3.5 px-4 text-zinc-400">{formatDateBr(link.completedAt)}</td>
                          <td className="py-3.5 px-5 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {batchItem && (link.status === 'available' || link.status === 'in_progress') && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopyText(batchItem.url, link.id, `Link ${link.adminCode} copiado.`)
                                  }
                                  className="h-7 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 text-[11px] font-medium cursor-pointer"
                                >
                                  Copiar
                                </button>
                              )}
                              {matchedResponse && (
                                <button
                                  type="button"
                                  onClick={() => openResponseDetail(matchedResponse)}
                                  className="h-7 px-2.5 rounded-lg bg-[#843C52]/25 hover:bg-[#843C52]/40 text-white text-[11px] font-medium cursor-pointer"
                                >
                                  Ver resposta
                                </button>
                              )}
                              {(link.status === 'available' || link.status === 'in_progress') && (
                                <button
                                  type="button"
                                  onClick={() => handleRevokeLink(link.id)}
                                  className="h-7 px-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Ban className="w-3 h-3" />
                                  <span>Revogar</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* 3. RESPOSTAS RECEBIDAS                                           */}
      {/* ================================================================ */}
      {activeTab === 'responses' && (
        <div className="space-y-4">
          {/* Barra de filtro limpa */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={responseSearch}
                onChange={(e) => setResponseSearch(e.target.value)}
                placeholder="Buscar por participante ou código..."
                className="w-full h-9 bg-[#13141c] border border-white/[0.08] rounded-xl pl-8.5 pr-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#843C52]"
              />
            </div>

            <div className="inline-flex flex-wrap gap-1">
              {(
                [
                  ['all', 'Todas'],
                  ['new', 'Novas'],
                  ['in_review', 'Em análise'],
                  ['reviewed', 'Analisadas'],
                ] as const
              ).map(([st, label]) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setResponseStatusFilter(st)}
                  className={`h-8 px-3 rounded-lg text-xs font-medium transition cursor-pointer ${
                    responseStatusFilter === st
                      ? 'bg-[#843C52]/30 text-white border border-[#843C52]/50'
                      : 'text-zinc-400 hover:text-white border border-transparent'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Lista à esquerda */}
            <div className="lg:col-span-4 space-y-2">
              {filteredResponses.length === 0 ? (
                <div className="rounded-2xl bg-[#13141c] border border-white/[0.07] p-8 text-center text-xs text-zinc-500">
                  Nenhuma avaliação encontrada.
                </div>
              ) : (
                filteredResponses.map((resp) => {
                  const isSelected = resp.id === selectedResponse?.id;
                  return (
                    <button
                      key={resp.id}
                      type="button"
                      onClick={() => openResponseDetail(resp)}
                      className={`w-full text-left rounded-2xl p-4 border transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#843C52]/18 border-[#843C52]/55'
                          : 'bg-[#13141c] border-white/[0.07] hover:border-white/[0.16]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-white block truncate">
                            {resp.participantName}
                          </span>
                          <span className="text-[11px] text-zinc-500">
                            {resp.adminCode ? `${resp.adminCode} · ` : ''}
                            {formatDateBr(resp.submittedAt)}
                          </span>
                        </div>
                        <StatusBadge
                          tone={
                            resp.reviewStatus === 'reviewed'
                              ? 'emerald'
                              : resp.reviewStatus === 'in_review'
                                ? 'amber'
                                : 'pink'
                          }
                        >
                          {REVIEW_STATUS_LABEL[resp.reviewStatus]}
                        </StatusBadge>
                      </div>

                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-white/[0.05] text-[11px] text-zinc-200">
                          ★ {resp.overallRating ? `${resp.overallRating}/5` : '—'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white/[0.05] text-[11px] text-zinc-300">
                          {resp.issuesCount} problema(s)
                        </span>
                        {resp.deviceUsed && (
                          <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[11px] text-zinc-400">
                            {DEVICE_LABEL[resp.deviceUsed] || resp.deviceUsed}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Painel de leitura à direita */}
            <div className="lg:col-span-8">
              {!selectedResponse ? (
                <div className="rounded-2xl bg-[#13141c] border border-dashed border-white/[0.1] p-12 text-center text-xs text-zinc-500">
                  Selecione uma avaliação à esquerda para ler todas as respostas, comentários e capturas.
                </div>
              ) : (
                <div className="rounded-2xl bg-[#13141c] border border-white/[0.08] overflow-hidden">
                  {/* Cabeçalho da resposta */}
                  <div className="p-5 border-b border-white/[0.06] space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-lg font-semibold text-white">
                            {selectedResponse.participantName}
                          </h3>
                          {selectedResponse.adminCode && (
                            <span className="px-2 py-0.5 rounded-md bg-white/[0.05] font-mono text-[11px] text-zinc-400">
                              {selectedResponse.adminCode}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">
                          Enviada em {formatDateBr(selectedResponse.submittedAt)}
                          {selectedResponse.deviceUsed
                            ? ` · ${DEVICE_LABEL[selectedResponse.deviceUsed] || selectedResponse.deviceUsed}`
                            : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={responseStatusDraft}
                          onChange={(e) => setResponseStatusDraft(e.target.value as FeedbackReviewStatus)}
                          aria-label="Situação da avaliação"
                          className="h-9 rounded-xl bg-[#0c0d12] border border-white/[0.12] px-3 text-xs text-white outline-none focus:border-[#843C52]"
                        >
                          <option value="new">Nova</option>
                          <option value="in_review">Em análise</option>
                          <option value="reviewed">Analisada</option>
                        </select>
                        <button
                          type="button"
                          disabled={savingResponse}
                          onClick={handleSaveResponseReview}
                          className="h-9 px-4 rounded-xl bg-[#843C52] hover:bg-[#992b4a] text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                        >
                          {savingResponse ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                    </div>

                    {/* Resumo rápido da avaliação */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl bg-[#0c0d12] border border-white/[0.06] px-3.5 py-2.5">
                        <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">
                          Nota geral
                        </span>
                        <span className="text-base font-semibold text-white mt-0.5 block">
                          {selectedResponse.overallRating ? `${selectedResponse.overallRating} / 5` : '—'}
                        </span>
                      </div>
                      <div className="rounded-xl bg-[#0c0d12] border border-white/[0.06] px-3.5 py-2.5">
                        <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">
                          Aparência
                        </span>
                        <span className="text-base font-semibold text-white mt-0.5 block">
                          {selectedResponse.appearanceRating ? `${selectedResponse.appearanceRating} / 5` : '—'}
                        </span>
                      </div>
                      <div className="rounded-xl bg-[#0c0d12] border border-white/[0.06] px-3.5 py-2.5">
                        <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">
                          Problemas
                        </span>
                        <span className="text-base font-semibold text-white mt-0.5 block">
                          {selectedResponse.issuesCount}
                        </span>
                      </div>
                    </div>

                    {/* Observação interna */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Observações internas (visível apenas no PHDEV)</span>
                      </label>
                      <textarea
                        rows={2}
                        value={responseNotesDraft}
                        onChange={(e) => setResponseNotesDraft(e.target.value)}
                        placeholder="Anote ajustes planejados ou contexto interno sobre esta avaliação..."
                        className="w-full rounded-xl bg-[#0c0d12] border border-white/[0.08] focus:border-[#843C52] px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 outline-none resize-y"
                      />
                    </div>
                  </div>

                  {/* Leitura organizada por partes */}
                  <div className="p-5 space-y-4">
                    {FEEDBACK_PARTS.map((part) => {
                      const skipped =
                        part.gateQuestion &&
                        selectedResponse.answers[part.gateQuestion.id] === 'nao';

                      const answeredQuestions =
                        part.part === 7
                          ? []
                          : part.questions.filter((q) => {
                              const val = selectedResponse.answers?.[q.id];
                              const exp = selectedResponse.answers?.[`${q.id}_explain`];
                              return val !== undefined || Boolean(exp);
                            });

                      if (!skipped && part.part !== 7 && answeredQuestions.length === 0) {
                        return null;
                      }

                      return (
                        <div
                          key={part.part}
                          className="rounded-xl bg-[#0c0d12]/80 border border-white/[0.06] p-4 space-y-3"
                        >
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-[#843C52]/25 text-[#efb2c5] text-[10px] font-mono font-semibold">
                              PARTE {part.part}
                            </span>
                            <h4 className="text-xs font-semibold text-zinc-200">{part.title}</h4>
                          </div>

                          {skipped ? (
                            <p className="text-xs text-zinc-500 italic">
                              Participante informou que não visitou esta área.
                            </p>
                          ) : part.part === 7 ? (
                            (selectedResponse.issues || []).length === 0 ? (
                              <p className="text-xs text-zinc-500">Nenhum problema relatado.</p>
                            ) : (
                              <div className="space-y-3">
                                {(selectedResponse.issues || []).map((iss) => (
                                  <div
                                    key={iss.id}
                                    className="rounded-xl bg-[#13141c] border border-white/[0.06] p-3.5 text-xs space-y-2"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-semibold text-white">{iss.area}</span>
                                      <StatusBadge tone={issueStatusTone(iss.issueStatus)}>
                                        {ISSUE_STATUS_LABEL[iss.issueStatus]}
                                      </StatusBadge>
                                    </div>
                                    <p className="text-zinc-300">
                                      <span className="text-zinc-500">Tentou fazer:</span> {iss.whatTrying}
                                    </p>
                                    <p className="text-white">
                                      <span className="text-zinc-500">O que aconteceu:</span> {iss.whatHappened}
                                    </p>
                                    {iss.whatExpected && (
                                      <p className="text-zinc-300">
                                        <span className="text-zinc-500">Esperava:</span> {iss.whatExpected}
                                      </p>
                                    )}
                                    {iss.attachments.length > 0 && (
                                      <div className="flex flex-wrap gap-2 pt-1">
                                        {iss.attachments.map((att) => (
                                          <button
                                            key={att.id || att.key}
                                            type="button"
                                            onClick={() => setPreviewAttachmentKey(att.key)}
                                            className="group relative w-16 h-16 rounded-lg overflow-hidden border border-white/10 hover:border-[#c77990] transition cursor-pointer bg-black/40"
                                            title={`Abrir captura: ${att.name}`}
                                          >
                                            <img
                                              src={`${apiUrl}/api/admin/prelaunch-feedback/attachment?key=${encodeURIComponent(att.key)}`}
                                              alt={att.name}
                                              className="w-full h-full object-cover"
                                            />
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )
                          ) : (
                            <div className="divide-y divide-white/[0.05]">
                              {answeredQuestions.map((q) => {
                                const val = selectedResponse.answers?.[q.id];
                                const exp = selectedResponse.answers?.[`${q.id}_explain`];
                                const isNumericRating =
                                  q.kind === 'rating' && typeof val === 'number';
                                return (
                                  <div
                                    key={q.id}
                                    className="py-2.5 first:pt-0 last:pb-0 flex flex-col gap-1"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <span className="text-xs text-zinc-400 leading-relaxed">
                                        {q.label}
                                      </span>
                                      {isNumericRating ? (
                                        <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-xs font-semibold text-white shrink-0">
                                          {val} / 5
                                        </span>
                                      ) : (
                                        <span className="text-xs text-zinc-100 font-medium text-right shrink-0 max-w-[45%]">
                                          {formatAnswerValue(val)}
                                        </span>
                                      )}
                                    </div>
                                    {exp && (
                                      <p className="text-xs text-zinc-300 border-l-2 border-[#843C52]/60 pl-3 py-0.5 mt-1 leading-relaxed">
                                        {String(exp)}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* 4. PROBLEMAS ENCONTRADOS                                         */}
      {/* ================================================================ */}
      {activeTab === 'issues' && (
        <div className="space-y-4">
          {/* Barra de filtros limpa */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="inline-flex flex-wrap gap-1">
              {(
                [
                  ['all', 'Todos'],
                  ['new', 'Novos'],
                  ['in_review', 'Em análise'],
                  ['resolved', 'Resolvidos'],
                  ['dismissed', 'Descartados'],
                ] as const
              ).map(([st, label]) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setIssueStatusFilter(st)}
                  className={`h-8 px-3 rounded-lg text-xs font-medium transition cursor-pointer ${
                    issueStatusFilter === st
                      ? 'bg-[#843C52]/30 text-white border border-[#843C52]/50'
                      : 'text-zinc-400 hover:text-white border border-transparent'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5">
              <select
                value={issueAreaFilter}
                onChange={(e) => setIssueAreaFilter(e.target.value)}
                aria-label="Filtrar por área"
                className="h-9 rounded-xl bg-[#13141c] border border-white/[0.08] px-3 text-xs text-white outline-none focus:border-[#843C52]"
              >
                <option value="all">Todas as áreas</option>
                {ISSUE_AREA_OPTIONS.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
              <span className="text-xs text-zinc-500 whitespace-nowrap">
                {filteredIssues.length} {filteredIssues.length === 1 ? 'relato' : 'relatos'}
              </span>
            </div>
          </div>

          {filteredIssues.length === 0 ? (
            <div className="rounded-2xl bg-[#13141c] border border-white/[0.07] p-10 text-center text-xs text-zinc-500">
              Nenhum problema encontrado para os filtros selecionados.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIssues.map((iss) => {
                const parentResp = responses.find((r) => r.id === iss.responseId);
                return (
                  <div
                    key={iss.id}
                    className="rounded-2xl bg-[#13141c] border border-white/[0.08] p-5 space-y-4"
                  >
                    {/* Cabeçalho limpo do problema */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-lg bg-[#843C52]/20 border border-[#843C52]/35 text-xs font-semibold text-[#f0b4c6]">
                          {iss.area}
                        </span>
                        {(iss.similarCount || 1) > 1 && (
                          <StatusBadge tone="amber">
                            {iss.similarCount} relatos semelhantes
                          </StatusBadge>
                        )}
                        <span className="text-xs text-zinc-400">
                          {iss.participantName} · {formatDateBr(iss.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {parentResp && (
                          <button
                            type="button"
                            onClick={() => openResponseDetail(parentResp)}
                            className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] text-zinc-300 text-[11px] font-medium cursor-pointer"
                          >
                            Ver avaliação
                          </button>
                        )}
                        <select
                          value={iss.issueStatus}
                          disabled={savingIssueId === iss.id}
                          onChange={(e) =>
                            handleSaveIssue(iss.id, e.target.value as FeedbackIssueStatus)
                          }
                          aria-label="Situação do problema"
                          className="h-8 rounded-lg bg-[#0c0d12] border border-white/[0.12] px-2.5 text-xs text-white outline-none focus:border-[#843C52] cursor-pointer"
                        >
                          <option value="new">Novo</option>
                          <option value="in_review">Em análise</option>
                          <option value="resolved">Resolvido</option>
                          <option value="dismissed">Descartado</option>
                        </select>
                      </div>
                    </div>

                    {/* Detalhes do relato */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl bg-[#0c0d12] border border-white/[0.05] p-3.5 space-y-1">
                        <span className="text-[11px] text-zinc-500 block">O que tentou fazer</span>
                        <p className="text-zinc-200 leading-relaxed">{iss.whatTrying || '—'}</p>
                      </div>
                      <div className="rounded-xl bg-[#0c0d12] border border-white/[0.05] p-3.5 space-y-1">
                        <span className="text-[11px] text-zinc-500 block">O que aconteceu</span>
                        <p className="text-white leading-relaxed">{iss.whatHappened || '—'}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-zinc-400">
                      {iss.whatExpected && (
                        <span>
                          <strong className="text-zinc-300 font-medium">Esperado:</strong>{' '}
                          {iss.whatExpected}
                        </span>
                      )}
                      <span>
                        <strong className="text-zinc-300 font-medium">Repetiu:</strong>{' '}
                        {REPEAT_LABEL[iss.happenedMoreThanOnce] || iss.happenedMoreThanOnce}
                      </span>
                    </div>

                    {/* Capturas anexadas (miniaturas clicáveis) */}
                    {iss.attachments.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2.5">
                        {iss.attachments.map((att) => (
                          <button
                            key={att.id || att.key}
                            type="button"
                            onClick={() => setPreviewAttachmentKey(att.key)}
                            className="group flex items-center gap-2 pr-3 rounded-xl bg-[#0c0d12] hover:bg-white/[0.06] border border-white/[0.08] overflow-hidden transition cursor-pointer"
                          >
                            <img
                              src={`${apiUrl}/api/admin/prelaunch-feedback/attachment?key=${encodeURIComponent(att.key)}`}
                              alt={att.name}
                              className="w-11 h-11 object-cover bg-black/40"
                            />
                            <div className="text-left">
                              <span className="text-[11px] text-zinc-200 block max-w-[160px] truncate">
                                {att.name}
                              </span>
                              <span className="text-[10px] text-zinc-500 inline-flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" /> Ampliar
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Nota interna do problema */}
                    <div className="pt-3 border-t border-white/[0.05] flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={issueNotesMap[iss.id] ?? ''}
                        onChange={(e) =>
                          setIssueNotesMap((prev) => ({ ...prev, [iss.id]: e.target.value }))
                        }
                        placeholder="Registrar correção ou observação técnica..."
                        className="flex-1 h-9 rounded-xl bg-[#0c0d12] border border-white/[0.08] focus:border-[#843C52] px-3.5 text-xs text-white placeholder-zinc-600 outline-none"
                      />
                      <button
                        type="button"
                        disabled={savingIssueId === iss.id}
                        onClick={() => handleSaveIssue(iss.id, iss.issueStatus)}
                        className="h-9 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs text-white font-medium transition cursor-pointer disabled:opacity-50"
                      >
                        {savingIssueId === iss.id ? 'Salvando...' : 'Salvar nota'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal de ampliação de captura privada */}
      {previewAttachmentKey && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewAttachmentKey(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-[#13141c] border border-white/15 rounded-2xl p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewAttachmentKey(null)}
              aria-label="Fechar imagem"
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#843C52] text-white flex items-center justify-center shadow-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={`${apiUrl}/api/admin/prelaunch-feedback/attachment?key=${encodeURIComponent(previewAttachmentKey)}`}
              alt="Captura anexada pelo participante"
              className="max-h-[82vh] max-w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
