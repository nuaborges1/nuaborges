/* Vinho maduro / Nua Borges */
'use client';

import React, { useState } from 'react';
import { Plus, CheckCircle2, FileText } from 'lucide-react';
import { SiteContent, InstitutionalLinkItem } from '@/lib/types';
import { ConfirmModal } from './ConfirmModal';
import { InstitutionalGeneralCard } from './institutional/InstitutionalGeneralCard';
import { InstitutionalAddLinkForm } from './institutional/InstitutionalAddLinkForm';
import { InstitutionalLinkCard } from './institutional/InstitutionalLinkCard';
import { InstitutionalLegalCards } from './institutional/InstitutionalLegalCards';

interface InstitutionalEditorProps {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
}

export function InstitutionalEditor({ content, onChange }: InstitutionalEditorProps) {
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InstitutionalLinkItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

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

    const normalized = newLinks.map((item, idx) => ({ ...item, order: idx + 1 }));
    updateInstitutional({ links: normalized });
    showToast('Ordem dos links atualizada.');
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
  const handleAddSubmit = (newItem: Omit<InstitutionalLinkItem, 'id' | 'order'>) => {
    const newLinkItem: InstitutionalLinkItem = {
      ...newItem,
      id: `link-${Date.now()}`,
      order: links.length + 1,
    };

    updateInstitutional({ links: [...links, newLinkItem] });
    setIsAddingNew(false);
    showToast(`Link "${newItem.name}" adicionado com sucesso.`);
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
    showToast(`Link "${name}" removido.`);
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto">
      {/* Toast Notice */}
      {noticeMessage && (
        <div className="p-3.5 rounded-2xl bg-[#843C52]/15 border border-[#843C52]/30 text-[#843C52] text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#843C52] shrink-0" />
            <span>{noticeMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setNoticeMessage(null)}
            className="text-zinc-400 hover:text-white text-xs ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Card 1: Configurações Gerais da Seção */}
      <InstitutionalGeneralCard
        sectionTitle={institutional.sectionTitle}
        description={institutional.description}
        onUpdate={updateInstitutional}
      />

      {/* Card 2: Lista de Links Institucionais Cadastrados */}
      <div className="rounded-xl bg-[#171821] border border-white/[0.06] p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight flex items-center gap-2">
              <span>Links Cadastrados</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-400 font-normal">
                {links.length} {links.length === 1 ? 'link' : 'links'}
              </span>
            </h3>
            <p className="text-zinc-400 text-xs font-light mt-0.5">
              Defina quais páginas ou documentos aparecem no rodapé do seu site.
            </p>
          </div>

          {!isAddingNew && (
            <button
              type="button"
              onClick={() => setIsAddingNew(true)}
              className="h-8 px-4 rounded-full bg-[#843C52] hover:bg-[#992b4a] text-white font-semibold text-xs transition shadow-sm inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Adicionar Link</span>
            </button>
          )}
        </div>

        {/* Formulário de Adicionar Novo Link */}
        {isAddingNew && (
          <InstitutionalAddLinkForm
            onAdd={handleAddSubmit}
            onCancel={() => setIsAddingNew(false)}
          />
        )}

        {/* Estado Vazio */}
        {links.length === 0 && !isAddingNew && (
          <div className="text-center py-10 px-4 rounded-lg border border-dashed border-white/10 bg-[#101116]">
            <FileText className="w-8 h-8 text-zinc-600 mx-auto mb-2" strokeWidth={1.5} />
            <h4 className="text-xs font-medium text-zinc-300">Ainda não há links no rodapé</h4>
            <p className="text-zinc-500 text-xs mt-0.5 max-w-sm mx-auto leading-relaxed">
              Adicione links para as páginas de Termos de Uso, Política de Privacidade e orientações para os visitantes.
            </p>
            <button
              type="button"
              onClick={() => setIsAddingNew(true)}
              className="mt-3 inline-flex items-center gap-1.5 h-8 px-4 rounded-full bg-[#843C52] hover:bg-[#992b4a] text-white font-semibold text-xs transition shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Primeiro Link</span>
            </button>
          </div>
        )}

        {/* Lista de Cards de Links */}
        <div className="space-y-2.5">
          {links.map((link, index) => (
            <InstitutionalLinkCard
              key={link.id}
              link={link}
              index={index}
              totalLinks={links.length}
              isEditing={editingId === link.id}
              onStartEdit={() => setEditingId(link.id)}
              onCancelEdit={() => setEditingId(null)}
              onFinishEdit={() => {
                setEditingId(null);
                showToast('Alterações salvas.');
              }}
              onMove={handleMove}
              onToggleActive={handleToggleActive}
              onUpdateLink={handleUpdateLink}
              onDeleteRequest={(item) => setItemToDelete(item)}
            />
          ))}
        </div>
      </div>

      {/* Card 3 e 4: Avisos Legais e de Maioridade */}
      <InstitutionalLegalCards
        ageNoticeTitle={institutional.ageNoticeTitle}
        ageNoticeDescription={institutional.ageNoticeDescription}
        termsSummary={institutional.termsSummary}
        privacySummary={institutional.privacySummary}
        onUpdate={updateInstitutional}
      />

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
