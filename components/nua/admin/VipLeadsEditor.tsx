/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Copy,
  Check,
  Download,
  MessageCircle,
  Calendar,
  CheckCircle2,
  Mail,
  Phone,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import { SiteContent, VipClubData } from '@/lib/types';

interface VipLeadItem {
  id: string;
  name: string;
  whatsapp: string;
  email?: string;
  createdAt: string;
}

interface VipLeadsEditorProps {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
  searchQuery?: string;
}

export function VipLeadsEditor({ content, onChange, searchQuery = '' }: VipLeadsEditorProps) {
  const [leads, setLeads] = useState<VipLeadItem[]>([]);
  const [search, setSearch] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedSingleId, setCopiedSingleId] = useState<string | null>(null);

  const vipClub: VipClubData = content.vipClub || {
    eyebrow: 'LISTA VIP & PRÉVIAS',
    title: 'Receba confissões, prévias e novidades direto no WhatsApp',
    subtitle:
      'Cadastre-se para receber conteúdos inéditos, avisos de lançamentos e recados íntimos da Nua com total discrição.',
    buttonText: 'ENTRAR NA LISTA VIP ♡',
    active: true,
  };

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('nua_vip_leads') || '[]');
      setLeads(stored);
    } catch {
      setLeads([]);
    }
  }, []);

  const updateVip = (fields: Partial<VipClubData>) => {
    onChange((prev) => ({
      ...prev,
      vipClub: {
        ...(prev.vipClub || vipClub),
        ...fields,
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
        (lead.whatsapp || '').includes(effectiveQuery) ||
        (lead.email || '').toLowerCase().includes(effectiveQuery)
    );
  }, [leads, effectiveQuery]);

  // Copia todos os números formatados para lista de transmissão
  const handleCopyAllPhones = () => {
    if (leads.length === 0) return;
    const phones = leads
      .map((l) => l.whatsapp.replace(/\D/g, ''))
      .filter(Boolean)
      .join(', ');
    navigator.clipboard.writeText(phones);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 3000);
  };

  // Copia um único número
  const handleCopySingle = (id: string, phone: string) => {
    const clean = phone.replace(/\D/g, '');
    navigator.clipboard.writeText(clean);
    setCopiedSingleId(id);
    setTimeout(() => setCopiedSingleId(null), 2500);
  };

  // Exportar para CSV
  const handleExportCsv = () => {
    if (leads.length === 0) return;
    const header = 'Nome,WhatsApp,Email,Data de Cadastro\n';
    const rows = leads
      .map((l) => {
        const dateStr = l.createdAt ? new Date(l.createdAt).toLocaleDateString('pt-BR') : '';
        return `"${l.name || ''}","${l.whatsapp || ''}","${l.email || ''}","${dateStr}"`;
      })
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `contatos-vip-nua-borges-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Remover um lead da lista
  const handleDeleteLead = (id: string) => {
    const updated = leads.filter((l) => l.id !== id);
    setLeads(updated);
    try {
      localStorage.setItem('nua_vip_leads', JSON.stringify(updated));
    } catch {}
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header & Metrics Card */}
      <div className="rounded-xl bg-[#171821] border border-white/[0.06] p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[#843C52] text-[10px] font-semibold tracking-[0.2em] uppercase">
                RELACIONAMENTO & FÃS
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[10px] text-zinc-400 font-mono">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Captação Ativa no Site
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
              Lista VIP de Contatos ({leads.length})
            </h2>
            <p className="text-zinc-400 text-xs font-light mt-0.5 max-w-2xl leading-relaxed">
              Aqui você visualiza todas as pessoas que se cadastraram no formulário VIP do seu site para receber novidades, avisos de novos ensaios e recados íntimos no WhatsApp.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={handleCopyAllPhones}
              disabled={leads.length === 0}
              className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-200 text-xs font-medium transition cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-40"
              title="Copiar números para colar no WhatsApp"
            >
              {copiedAll ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Números Copiados!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#843C52]" />
                  <span>Copiar Todos os Números</span>
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
              <span>Exportar Excel (CSV)</span>
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
              placeholder="Buscar por nome, WhatsApp ou e-mail..."
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
            <Users className="w-8 h-8 text-zinc-600 mx-auto mb-2" strokeWidth={1.5} />
            <h4 className="text-xs font-medium text-zinc-300">
              {search ? 'Nenhum contato encontrado para esta busca' : 'Ainda não há contatos cadastrados'}
            </h4>
            <p className="text-zinc-500 text-xs mt-0.5 max-w-sm mx-auto leading-relaxed">
              {search
                ? 'Tente buscar por outro nome ou número de telefone.'
                : 'Quando os visitantes preencherem o botão "Lista VIP" no site, os dados aparecerão organizados aqui automaticamente.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredLeads.map((lead) => {
              const cleanPhone = (lead.whatsapp || '').replace(/\D/g, '');
              const waLink = cleanPhone ? `https://wa.me/55${cleanPhone}` : undefined;
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
                  className="rounded-lg bg-[#101116] border border-white/[0.06] p-3 flex flex-col justify-between hover:border-white/[0.12] transition-all"
                >
                  <div className="space-y-1.5 mb-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-xs text-white block truncate" title={lead.name}>
                        {lead.name || 'Fã VIP'}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                        {dateFormatted}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2 text-zinc-300 font-mono">
                        <Phone className="w-3.5 h-3.5 text-[#843C52] shrink-0" />
                        <span>{lead.whatsapp || 'Sem número'}</span>
                      </div>

                      {lead.email && (
                        <div className="flex items-center gap-2 text-zinc-400 text-[11px] truncate" title={lead.email}>
                          <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] gap-2">
                    <div className="flex items-center gap-1.5">
                      {waLink && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-7 inline-flex items-center gap-1 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-medium transition-colors"
                          title="Abrir conversa no WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Chamar</span>
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCopySingle(lead.id, lead.whatsapp)}
                        className="p-1 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        title="Copiar telefone"
                      >
                        {copiedSingleId === lead.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteLead(lead.id)}
                      className="p-1 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 transition-colors cursor-pointer"
                      title="Excluir este contato da lista"
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

      {/* VIP Box Customization on Site */}
      <div id="admin-vip-section" data-field="vip.section" className="rounded-xl bg-[#171821] border border-white/[0.06] p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <span className="text-[#843C52] text-[10px] font-semibold tracking-wider uppercase block mb-0.5">
              APRESENTAÇÃO NO SITE PÚBLICO
            </span>
            <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
              Como o Convite VIP Aparece para os Visitantes
            </h3>
            <p className="text-zinc-400 text-xs font-light mt-0.5 leading-relaxed">
              Personalize os textos do botão e da janela de convite da Lista VIP no seu site.
            </p>
          </div>

          <button
            type="button"
            onClick={() => updateVip({ active: vipClub.active === false ? true : false })}
            className={`h-7 inline-flex items-center gap-1.5 px-3 rounded-full text-xs font-medium transition-colors cursor-pointer self-start sm:self-auto ${
              vipClub.active !== false
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-white/[0.06] text-zinc-400 border border-white/[0.08]'
            }`}
          >
            {vipClub.active !== false ? (
              <>
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>Convite Ativo no Site</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-zinc-500" />
                <span>Convite Oculto</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1">
              Pequeno Destaque no Topo
            </label>
            <input
              type="text"
              value={vipClub.eyebrow || ''}
              onChange={(e) => updateVip({ eyebrow: e.target.value })}
              placeholder="Ex: LISTA VIP & PRÉVIAS"
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#843C52] transition-colors"
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1">
              Texto do Botão
            </label>
            <input
              type="text"
              value={vipClub.buttonText || ''}
              onChange={(e) => updateVip({ buttonText: e.target.value })}
              placeholder="Ex: ENTRAR NA LISTA VIP ♡"
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#843C52] transition-colors"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1">
              Título Principal do Convite
            </label>
            <input
              type="text"
              value={vipClub.title || ''}
              onChange={(e) => updateVip({ title: e.target.value })}
              placeholder="Ex: Receba confissões, prévias e novidades direto no WhatsApp"
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#843C52] transition-colors"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1">
              Mensagem Explicativa
            </label>
            <textarea
              rows={2}
              value={vipClub.subtitle || ''}
              onChange={(e) => updateVip({ subtitle: e.target.value })}
              placeholder="Ex: Cadastre-se para receber conteúdos inéditos, avisos de lançamentos e recados íntimos da Nua com total discrição."
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#843C52] transition-colors resize-none leading-relaxed"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
