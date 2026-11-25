/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Copy,
  Check,
  Download,
  CheckCircle2,
  Mail,
  Eye,
  EyeOff,
  Trash2,
  Clock,
} from 'lucide-react';
import { SiteContent, VipClubData } from '@/lib/types';
import { getPublicApiUrl, getStoredSessionToken } from '@/lib/contentStore';

interface VipLeadItem {
  id: string;
  name: string;
  email?: string;
  createdAt: string;
  welcomeEmailSent?: boolean;
  welcomeEmailSentAt?: string;
}

interface VipLeadsEditorProps {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
  searchQuery?: string;
}

const DEFAULT_VIP_CLUB: VipClubData = {
  eyebrow: 'LISTA VIP & PRÉVIAS',
  title: 'Receba confissões, prévias e novidades direto no seu e-mail',
  subtitle:
    'Cadastre seu e-mail para receber conteúdos inéditos, avisos de lançamentos e recados íntimos da Nua com total discrição.',
  buttonText: 'ENTRAR NA LISTA VIP ♡',
  active: true,
  welcomeEmailEnabled: true,
};

export function VipLeadsEditor({ content, onChange, searchQuery = '' }: VipLeadsEditorProps) {
  const [leads, setLeads] = useState<VipLeadItem[]>([]);
  const [search, setSearch] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedSingleId, setCopiedSingleId] = useState<string | null>(null);

  const vipClub: VipClubData = {
    ...DEFAULT_VIP_CLUB,
    ...(content.vipClub || {}),
  };

  const isServiceActive = vipClub.active !== false;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = getStoredSessionToken();
        const res = await fetch(`${getPublicApiUrl()}/api/vip/subscribe`, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (active && Array.isArray(data.leads)) {
            setLeads(data.leads);
            return;
          }
        }
      } catch {}
      try {
        const stored = JSON.parse(localStorage.getItem('nua_vip_leads') || '[]');
        if (active && Array.isArray(stored)) setLeads(stored);
      } catch {
        if (active) setLeads([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const toggleVipService = () => {
    const nextActive = !isServiceActive;
    onChange((prev) => ({
      ...prev,
      vipClub: {
        ...DEFAULT_VIP_CLUB,
        ...(prev.vipClub || {}),
        active: nextActive,
        welcomeEmailEnabled: nextActive,
      },
    }));
  };

  // Filtragem dos contatos
  const effectiveQuery = (search || searchQuery || '').trim().toLowerCase();
  const filteredLeads = useMemo(() => {
    if (!effectiveQuery) return leads;
    return leads.filter(
      (lead) =>
        (lead.name || '').toLowerCase().includes(effectiveQuery) ||
        (lead.email || '').toLowerCase().includes(effectiveQuery)
    );
  }, [leads, effectiveQuery]);

  const validEmailsCount = useMemo(
    () => leads.filter((l) => Boolean(l.email?.trim())).length,
    [leads]
  );

  // Copia todos os e-mails
  const handleCopyAllEmails = () => {
    const emails = leads
      .map((l) => (l.email || '').trim())
      .filter(Boolean)
      .join(', ');
    if (!emails) return;
    navigator.clipboard.writeText(emails);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 3000);
  };

  // Copia um único e-mail
  const handleCopySingle = (id: string, email: string) => {
    if (!email) return;
    navigator.clipboard.writeText(email.trim());
    setCopiedSingleId(id);
    setTimeout(() => setCopiedSingleId(null), 2500);
  };

  // Exportar para CSV
  const handleExportCsv = () => {
    if (leads.length === 0) return;
    const header = 'Nome,E-mail,Boas-vindas,Data de Cadastro\n';
    const rows = leads
      .map((l) => {
        const dateStr = l.createdAt ? new Date(l.createdAt).toLocaleDateString('pt-BR') : '';
        const statusStr = l.welcomeEmailSent ? 'Enviado' : 'Pendente';
        return `"${(l.name || '').replace(/"/g, '""')}","${(l.email || '').replace(/"/g, '""')}","${statusStr}","${dateStr}"`;
      })
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `lista-vip-nua-borges-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Remover um lead da lista (persiste no Supabase)
  const handleDeleteLead = async (id: string) => {
    try {
      const token = getStoredSessionToken();
      await fetch(`${getPublicApiUrl()}/api/vip/subscribe?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {}
    const updated = leads.filter((l) => l.id !== id);
    setLeads(updated);
    try {
      localStorage.setItem('nua_vip_leads', JSON.stringify(updated));
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Header, Toggle do Serviço & Ações */}
      <div className="rounded-xl bg-[#171821] border border-white/[0.06] p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[#843C52] text-[10px] font-semibold tracking-[0.2em] uppercase">
                RELACIONAMENTO &amp; FÃS
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-mono ${
                  isServiceActive
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                    : 'bg-white/[0.04] border-white/[0.08] text-zinc-400'
                }`}
              >
                {isServiceActive ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Ativa no Site</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3 h-3 text-zinc-500" />
                    <span>Desativada no Site</span>
                  </>
                )}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
              Lista VIP de E-mails ({leads.length})
            </h2>
            <p className="text-zinc-400 text-xs font-light mt-0.5 max-w-2xl leading-relaxed">
              Quando um fã entra na Lista VIP pelo site, o sistema envia automaticamente um e-mail de boas-vindas e salva o contato aqui.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={toggleVipService}
              className={`h-8 px-3.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer border ${
                isServiceActive
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30'
                  : 'bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 border-white/[0.1]'
              }`}
              title="Ativar ou desativar a Lista VIP no site"
            >
              {isServiceActive ? (
                <>
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Lista VIP Ativa</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Ativar Lista VIP</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyAllEmails}
              disabled={validEmailsCount === 0}
              className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-200 text-xs font-medium transition cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-40"
              title="Copiar todos os e-mails"
            >
              {copiedAll ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copiados!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#843C52]" />
                  <span>Copiar E-mails</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={leads.length === 0}
              className="h-8 px-4 rounded-full bg-[#843C52] hover:bg-[#992b4a] text-white font-semibold text-xs transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              title="Baixar planilha de contatos"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Planilha</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#843C52] transition-colors"
            />
          </div>

          <span className="text-zinc-500 text-[11px] font-mono self-center">
            Exibindo {filteredLeads.length} de {leads.length} contatos
          </span>
        </div>
      </div>

      {/* Leads List */}
      <div className="rounded-xl bg-[#171821] border border-white/[0.06] p-4 sm:p-5 shadow-sm">
        <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#843C52]" />
          <span>Fãs Cadastrados</span>
        </h3>

        {filteredLeads.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-lg border border-dashed border-white/10 bg-[#101116]">
            <Mail className="w-8 h-8 text-zinc-600 mx-auto mb-2" strokeWidth={1.5} />
            <h4 className="text-xs font-medium text-zinc-300">
              {search ? 'Nenhum contato encontrado para esta busca' : 'Ainda não há contatos cadastrados'}
            </h4>
            <p className="text-zinc-500 text-xs mt-0.5 max-w-sm mx-auto leading-relaxed">
              {search
                ? 'Tente buscar por outro nome ou e-mail.'
                : 'Quando os visitantes se cadastrarem na Lista VIP pelo site, os e-mails aparecerão organizados aqui automaticamente.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredLeads.map((lead) => {
              const dateFormatted = lead.createdAt
                ? new Date(lead.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Data não informada';

              return (
                <div
                  key={lead.id}
                  className="rounded-lg bg-[#101116] border border-white/[0.06] p-3.5 flex flex-col justify-between hover:border-white/[0.12] transition-all"
                >
                  <div className="space-y-2 mb-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-xs text-white block truncate" title={lead.name}>
                        {lead.name || 'Fã VIP'}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                        {dateFormatted}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-zinc-300 text-xs truncate" title={lead.email || ''}>
                      <Mail className="w-3.5 h-3.5 text-[#843C52] shrink-0" />
                      <span className="truncate font-mono text-[11px]">{lead.email || 'Sem e-mail'}</span>
                    </div>

                    <div>
                      {lead.welcomeEmailSent ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Boas-vindas enviado</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] text-zinc-400 font-medium">
                          <Clock className="w-3 h-3" />
                          <span>Cadastrado</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] gap-2">
                    {lead.email ? (
                      <button
                        type="button"
                        onClick={() => handleCopySingle(lead.id, lead.email!)}
                        className="h-7 inline-flex items-center gap-1.5 px-2.5 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white text-[11px] transition-colors cursor-pointer"
                        title="Copiar e-mail"
                      >
                        {copiedSingleId === lead.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-300">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar e-mail</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <span />
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteLead(lead.id)}
                      className="p-1.5 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 transition-colors cursor-pointer"
                      title="Excluir contato"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
