'use client';

import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Shield,
  Scale,
  Heart,
  Info,
  Globe,
  Eye,
  EyeOff,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { SiteContent, InstitutionalLinkItem } from '@/lib/types';
import { ConfirmModal } from './ConfirmModal';

interface InstitutionalEditorProps {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
}

const ICON_OPTIONS: { id: NonNullable<InstitutionalLinkItem['iconName']>; label: string; icon: any }[] = [
  { id: 'scale', label: 'Balança (Jurídico / Termos)', icon: Scale },
  { id: 'shield', label: 'Escudo (Privacidade / LGPD)', icon: Shield },
  { id: 'fileText', label: 'Documento (Regulamento / Artigo)', icon: FileText },
  { id: 'heart', label: 'Coração (Manifesto / Autoral)', icon: Heart },
  { id: 'external', label: 'Externo (Link de Terceiro)', icon: ExternalLink },
  { id: 'info', label: 'Informação (Avisos / FAQ)', icon: Info },
];

export function InstitutionalEditor({ content, onChange }: InstitutionalEditorProps) {
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InstitutionalLinkItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form para novo link
  const [newTitle, setNewTitle] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newIcon, setNewIcon] = useState<NonNullable<InstitutionalLinkItem['iconName']>>('fileText');
  const [newOpenInNewTab, setNewOpenInNewTab] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const institutional = content.institutional || {
    sectionTitle: 'Institucional',
    description: 'Diretrizes legais, proteção de dados e transparência editorial.',
    links: [],
  };

  const links = Array.isArray(institutional.links) ? institutional.links : [];

  const updateInstitutional = (fields: Partial<typeof institutional>) => {
    onChange((prev) => ({
      ...prev,
      institutional: {
        ...prev.institutional,
        ...fields,
      },
    }));
  };

  const showToast = (msg: string) => {
    setNoticeMessage(msg);
    setTimeout(() => setNoticeMessage(null), 3500);
  };

  // Reordenação
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= links.length) return;

    const newLinks = [...links];
    const temp = newLinks[index];
    newLinks[index] = newLinks[targetIndex];
    newLinks[targetIndex] = temp;

    // Atualiza order sequencial
    const normalized = newLinks.map((item, idx) => ({ ...item, order: idx + 1 }));
    updateInstitutional({ links: normalized });
    showToast('✓ Ordem dos links atualizada.');
  };

  // Toggle Ativo / Inativo
  const handleToggleActive = (id: string) => {
    const updated = links.map((l) => (l.id === id ? { ...l, active: !l.active } : l));
    updateInstitutional({ links: updated });
  };

  // Atualizar campo de um link existente
  const handleUpdateLink = (id: string, fields: Partial<InstitutionalLinkItem>) => {
    const updated = links.map((l) => (l.id === id ? { ...l, ...fields } : l));
    updateInstitutional({ links: updated });
  };

  // Adicionar novo link
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const titleTrimmed = newTitle.trim();
    const labelTrimmed = newLabel.trim() || titleTrimmed;
    const urlTrimmed = newUrl.trim();

    if (!titleTrimmed) {
      setFormError('Por favor, informe o nome ou título deste link.');
      return;
    }
    if (!urlTrimmed) {
      setFormError('Por favor, informe o link de destino da página.');
      return;
    }

    const newLinkItem: InstitutionalLinkItem = {
      id: `link-${Date.now()}`,
      name: titleTrimmed,
      label: labelTrimmed,
      description: newDescription.trim() || undefined,
      url: urlTrimmed,
      iconName: newIcon,
      active: true,
      order: links.length + 1,
      openInNewTab: newOpenInNewTab,
    };

    updateInstitutional({ links: [...links, newLinkItem] });

    // Reset form
    setNewTitle('');
    setNewLabel('');
    setNewUrl('');
    setNewDescription('');
    setNewIcon('fileText');
    setNewOpenInNewTab(false);
    setIsAddingNew(false);
    showToast(`✓ Link "${titleTrimmed}" adicionado com sucesso.`);
  };

  // Excluir link
  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    const filtered = links
      .filter((l) => l.id !== itemToDelete.id)
      .map((item, idx) => ({ ...item, order: idx + 1 }));
    updateInstitutional({ links: filtered });
    const name = itemToDelete.name;
    setItemToDelete(null);
    showToast(`✓ Link "${name}" removido.`);
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto">
      {/* Toast Notice */}
      {noticeMessage && (
        <div className="p-3.5 rounded-2xl bg-[#f4a7b9]/15 border border-[#f4a7b9]/30 text-[#f4a7b9] text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#f4a7b9] shrink-0" />
            <span>{noticeMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setNoticeMessage(null)}
            className="text-zinc-400 hover:text-white text-xs ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Card 1: Configurações Gerais da Seção */}
      <div className="bg-[#09090c] border border-zinc-800 rounded-3xl p-5 sm:p-8">
        <div className="mb-6">
          <span className="text-[#f4a7b9] text-[11px] font-semibold tracking-wider uppercase block mb-1">
            RODAPÉ & INSTITUCIONAL
          </span>
          <h2 className="font-serif text-xl sm:text-2xl text-white font-medium">
            Links Institucionais & Transparência
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm font-light mt-1 leading-relaxed">
            Personalize a coluna de documentos, manifestos e termos legais que são exibidos no rodapé do site.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Título da Seção no Rodapé
            </label>
            <input
              type="text"
              value={institutional.sectionTitle}
              onChange={(e) => updateInstitutional({ sectionTitle: e.target.value })}
              placeholder="Ex: Institucional"
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
            />
            <span className="text-zinc-500 text-xs block mt-1.5 font-light">
              Exibido acima dos links no rodapé (ex: &ldquo;Institucional&rdquo;, &ldquo;Legal & Diretrizes&rdquo;).
            </span>
          </div>

          <div>
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Texto Explicativo (Opcional)
            </label>
            <input
              type="text"
              value={institutional.description || ''}
              onChange={(e) => updateInstitutional({ description: e.target.value })}
              placeholder="Ex: Diretrizes legais, proteção de dados e transparência editorial"
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
            />
            <span className="text-zinc-500 text-xs block mt-1.5 font-light">
              Pequena frase sobre os documentos e transparência do site.
            </span>
          </div>
        </div>
      </div>

      {/* Card 2: Lista de Links Institucionais Cadastrados */}
      <div className="bg-[#09090c] border border-zinc-800 rounded-3xl p-5 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-serif text-lg sm:text-xl text-white font-medium flex items-center gap-2">
              <span>Links Cadastrados</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-400 font-normal">
                {links.length} {links.length === 1 ? 'link' : 'links'}
              </span>
            </h3>
            <p className="text-zinc-400 text-xs sm:text-sm font-light mt-0.5">
              Defina quais páginas ou documentos aparecem no rodapé do seu site.
            </p>
          </div>

          {!isAddingNew && (
            <button
              type="button"
              onClick={() => setIsAddingNew(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#f4a7b9] hover:bg-[#efa0b3] active:bg-[#df8fa1] text-zinc-950 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Adicionar Link Institucional</span>
            </button>
          )}
        </div>

        {/* Formulário de Adicionar Novo Link */}
        {isAddingNew && (
          <form
            onSubmit={handleAddSubmit}
            className="mb-8 p-5 sm:p-6 rounded-2xl bg-zinc-950/80 border border-[#f4a7b9]/30 space-y-4 transition-all"
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <span className="font-serif text-base text-white font-medium flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#f4a7b9]" />
                Adicionar Novo Link
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsAddingNew(false);
                  setFormError(null);
                }}
                className="text-zinc-500 hover:text-white p-1 rounded-full cursor-pointer"
                aria-label="Cancelar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1">
                  Nome do Link *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value);
                    if (!newLabel) setNewLabel(e.target.value);
                  }}
                  placeholder="Ex: Termos de Uso"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none focus:border-[#f4a7b9] transition-colors"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1">
                  Texto Exibido no Site *
                </label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Ex: Termos de Uso"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none focus:border-[#f4a7b9] transition-colors"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1">
                  Link da Página *
                </label>
                <input
                  type="text"
                  value={newUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewUrl(val);
                    if (val.startsWith('http')) setNewOpenInNewTab(true);
                  }}
                  placeholder="Ex: /termos ou https://..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white text-sm font-mono outline-none focus:border-[#f4a7b9] transition-colors"
                />
                <span className="text-zinc-500 text-[11px] block mt-1">
                  Páginas do próprio site começam com / (ex: <code className="text-[#f4a7b9]">/termos</code>, <code className="text-[#f4a7b9]">/privacidade</code>). Para links externos, use o link completo.
                </span>
              </div>

              <div>
                <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1">
                  Ícone Ilustrativo
                </label>
                <select
                  value={newIcon}
                  onChange={(e) => setNewIcon(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none focus:border-[#f4a7b9] transition-colors"
                >
                  {ICON_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id} className="bg-zinc-900 text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1">
                  Descrição Curta (Opcional)
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Ex: Condições gerais, direitos autorais e preservação da obra artística"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none focus:border-[#f4a7b9] transition-colors"
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-3 pt-1">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newOpenInNewTab}
                    onChange={(e) => setNewOpenInNewTab(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#f4a7b9]" />
                </label>
                <span className="text-xs text-zinc-300">
                  Abrir link em uma nova aba do navegador (recomendado para links de fora do site)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setIsAddingNew(false);
                  setFormError(null);
                }}
                className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#f4a7b9] hover:bg-[#efa0b3] text-zinc-950 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Salvar Link
              </button>
            </div>
          </form>
        )}

        {/* Estado Vazio */}
        {links.length === 0 && !isAddingNew && (
          <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40">
            <FileText className="w-10 h-10 text-zinc-600 mx-auto mb-3" strokeWidth={1.5} />
            <h4 className="font-serif text-base text-zinc-300 font-medium">Ainda não há links no rodapé</h4>
            <p className="text-zinc-500 text-xs mt-1 max-w-sm mx-auto leading-relaxed">
              Adicione links para as páginas de Termos de Uso, Política de Privacidade e orientações para os visitantes.
            </p>
            <button
              type="button"
              onClick={() => setIsAddingNew(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f4a7b9]/15 hover:bg-[#f4a7b9] text-[#f4a7b9] hover:text-zinc-950 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Primeiro Link</span>
            </button>
          </div>
        )}

        {/* Lista de Cards de Links */}
        <div className="space-y-3.5">
          {links.map((link, index) => {
            const isEditing = editingId === link.id;
            const IconComponent =
              ICON_OPTIONS.find((opt) => opt.id === link.iconName)?.icon || FileText;

            return (
              <div
                key={link.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                  link.active
                    ? 'bg-zinc-950/70 border-white/[0.08] hover:border-white/[0.15]'
                    : 'bg-zinc-950/30 border-white/[0.04] opacity-60'
                }`}
              >
                {!isEditing ? (
                  // Visualização Normal do Card
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Lado Esquerdo: Ícone + Ordem + Textos */}
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                      {/* Badge de Ordem e Reordenação rápida */}
                      <div className="flex flex-col items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMove(index, 'up')}
                          aria-label="Mover para cima"
                          className="p-1 rounded text-zinc-500 hover:text-white disabled:opacity-20 disabled:hover:text-zinc-500 cursor-pointer disabled:cursor-not-allowed transition-colors"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-mono text-zinc-600 font-bold">
                          #{link.order || index + 1}
                        </span>
                        <button
                          type="button"
                          disabled={index === links.length - 1}
                          onClick={() => handleMove(index, 'down')}
                          aria-label="Mover para baixo"
                          className="p-1 rounded text-zinc-500 hover:text-white disabled:opacity-20 disabled:hover:text-zinc-500 cursor-pointer disabled:cursor-not-allowed transition-colors"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Ícone estilizado */}
                      <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 text-[#f4a7b9]">
                        <IconComponent className="w-4.5 h-4.5" strokeWidth={1.75} />
                      </div>

                      {/* Informações do Link */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm sm:text-base font-medium text-white truncate">
                            {link.name}
                          </h4>
                          <span className="text-[11px] font-mono text-[#f4a7b9] px-2 py-0.5 rounded bg-[#f4a7b9]/10 border border-[#f4a7b9]/20 truncate">
                            {link.url}
                          </span>
                          {link.openInNewTab && (
                            <span className="text-[10px] uppercase font-mono text-zinc-500 px-1.5 py-0.5 rounded bg-white/[0.04] shrink-0">
                              Nova aba
                            </span>
                          )}
                          {!link.active && (
                            <span className="text-[10px] uppercase font-mono text-amber-400/90 px-1.5 py-0.5 rounded bg-amber-400/10 shrink-0">
                              Oculto no site
                            </span>
                          )}
                        </div>

                        {link.description && (
                          <p className="text-zinc-400 text-xs font-light mt-0.5 line-clamp-1">
                            {link.description}
                          </p>
                        )}
                        {link.label !== link.name && (
                          <p className="text-zinc-500 text-[11px] font-light mt-0.5">
                            Texto exibido: &ldquo;{link.label}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Lado Direito: Ações */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/80 w-full sm:w-auto justify-between sm:justify-end">
                      {/* Toggle Ativo/Inativo */}
                      <button
                        type="button"
                        onClick={() => handleToggleActive(link.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                          link.active
                            ? 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'text-zinc-400 bg-zinc-900 border border-zinc-800 hover:text-white'
                        }`}
                        title={link.active ? 'Visível no site (toque para ocultar)' : 'Oculto no site (toque para exibir)'}
                      >
                        {link.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span>{link.active ? 'Visível' : 'Oculto'}</span>
                      </button>

                      {/* Botão Editar */}
                      <button
                        type="button"
                        onClick={() => setEditingId(link.id)}
                        className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
                        title="Editar link"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Botão Excluir */}
                      <button
                        type="button"
                        onClick={() => setItemToDelete(link)}
                        className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Remover link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  // Formulário de Edição Inline do Card
                  <div className="space-y-4 pt-1">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#f4a7b9]">
                        Editando: {link.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-zinc-400 hover:text-white text-xs cursor-pointer"
                      >
                        ✕ Cancelar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-zinc-400 text-[10px] font-semibold uppercase mb-1">
                          Nome do Link
                        </label>
                        <input
                          type="text"
                          value={link.name}
                          onChange={(e) => handleUpdateLink(link.id, { name: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#f4a7b9]"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-400 text-[10px] font-semibold uppercase mb-1">
                          Texto Exibido no Site
                        </label>
                        <input
                          type="text"
                          value={link.label}
                          onChange={(e) => handleUpdateLink(link.id, { label: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#f4a7b9]"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-400 text-[10px] font-semibold uppercase mb-1">
                          Link da Página
                        </label>
                        <input
                          type="text"
                          value={link.url}
                          onChange={(e) => handleUpdateLink(link.id, { url: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm font-mono outline-none focus:border-[#f4a7b9]"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-400 text-[10px] font-semibold uppercase mb-1">
                          Ícone
                        </label>
                        <select
                          value={link.iconName || 'fileText'}
                          onChange={(e) => handleUpdateLink(link.id, { iconName: e.target.value as any })}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#f4a7b9]"
                        >
                          {ICON_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-zinc-400 text-[10px] font-semibold uppercase mb-1">
                          Descrição Curta (Opcional)
                        </label>
                        <input
                          type="text"
                          value={link.description || ''}
                          onChange={(e) => handleUpdateLink(link.id, { description: e.target.value })}
                          placeholder="Breve explicação da página"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#f4a7b9]"
                        />
                      </div>

                      <div className="sm:col-span-2 flex items-center gap-3 pt-1">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(link.openInNewTab)}
                            onChange={(e) => handleUpdateLink(link.id, { openInNewTab: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#f4a7b9]" />
                        </label>
                        <span className="text-xs text-zinc-300">
                          Abrir em nova aba (links externos)
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          showToast('✓ Alterações salvas.');
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f4a7b9] text-zinc-950 text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-[#efa0b3]"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Concluir Edição</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmModal
        isOpen={Boolean(itemToDelete)}
        title="Remover Link do Rodapé"
        description={`Deseja remover o link "${itemToDelete?.name}" do rodapé do seu site? Ele deixará de aparecer para os visitantes.`}
        confirmText="Remover Link"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
}
