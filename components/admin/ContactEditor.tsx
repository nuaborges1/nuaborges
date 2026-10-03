'use client';

import React, { useState } from 'react';
import { Mail, Plus, X, Trash2 } from 'lucide-react';
import { SiteContent } from '@/lib/types';

interface ContactEditorProps {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
}

export function ContactEditor({ content, onChange }: ContactEditorProps) {
  const [newSubject, setNewSubject] = useState('');
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const contact = content.contact;

  const updateContact = (fields: Partial<typeof contact>) => {
    onChange((prev) => ({
      ...prev,
      contact: { ...prev.contact, ...fields },
    }));
  };

  const subjects = Array.isArray(contact?.subjects) ? contact.subjects : [];

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSubject.trim();
    if (!trimmed) return;
    if (!subjects.includes(trimmed)) {
      updateContact({ subjects: [...subjects, trimmed] });
    }
    setNewSubject('');
  };

  const handleRemoveSubject = (subjectToRemove: string) => {
    if (subjects.length <= 1) {
      setNoticeMessage('Mantenha pelo menos uma opção de assunto para o formulário funcionar no site.');
      setTimeout(() => setNoticeMessage(null), 3500);
      return;
    }
    updateContact({
      subjects: subjects.filter((s) => s !== subjectToRemove),
    });
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {noticeMessage && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
          <span>{noticeMessage}</span>
          <button
            type="button"
            onClick={() => setNoticeMessage(null)}
            className="text-amber-400 hover:text-white text-xs ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <div className="bg-[#09090c] border border-zinc-800 rounded-3xl p-5 sm:p-8">
        <div className="mb-6">
          <span className="text-[#f4a7b9] text-[11px] font-semibold tracking-wider uppercase block mb-1">
            ATENDIMENTO PROFISSIONAL
          </span>
          <h3 className="font-serif text-xl sm:text-2xl text-white font-medium">Contato & Parcerias</h3>
          <p className="text-zinc-400 text-xs sm:text-sm font-light mt-1 leading-relaxed">
            Defina o e-mail onde você deseja receber as mensagens e os assuntos disponíveis para quem quiser falar com você.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <div className="md:col-span-2">
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Seu E-mail de Recebimento
            </label>
            <input
              type="email"
              value={contact.officialEmail}
              onChange={(e) => updateContact({ officialEmail: e.target.value })}
              placeholder="contato@nuaborges.phstatic.com.br"
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] font-mono transition-colors"
            />
            <span className="text-zinc-500 text-xs block mt-1.5 font-light">
              As mensagens enviadas pelo formulário do site chegam diretamente nesta caixa de entrada.
            </span>
          </div>

          <div>
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Título da Janela de Mensagem
            </label>
            <input
              type="text"
              value={contact.modalTitle}
              onChange={(e) => updateContact({ modalTitle: e.target.value })}
              placeholder="Ex: Contato & Parcerias"
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
            />
            <span className="text-zinc-500 text-xs block mt-1.5 font-light">
              Aparece no topo quando a pessoa clica para entrar em contato.
            </span>
          </div>

          <div>
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Mensagem de Boas-Vindas
            </label>
            <input
              type="text"
              value={contact.modalSubtitle}
              onChange={(e) => updateContact({ modalSubtitle: e.target.value })}
              placeholder="Ex: Envie sua proposta para assessoria ou parcerias comerciais."
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
            />
            <span className="text-zinc-500 text-xs block mt-1.5 font-light">
              Uma frase orientando o que a pessoa pode enviar.
            </span>
          </div>

          {/* Interactive Subject List */}
          <div className="md:col-span-2 pt-3 border-t border-zinc-800/80">
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Opções de Assunto Disponíveis no Formulário ({subjects.length})
            </label>
            <p className="text-zinc-500 text-xs font-light mb-3">
              Estas são as opções que o visitante pode escolher ao enviar uma mensagem para você:
            </p>

            {subjects.length === 0 ? (
              <div className="text-center py-6 px-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 mb-3">
                <p className="text-zinc-400 text-xs font-light">
                  Nenhum assunto cadastrado. Adicione pelo menos uma opção abaixo para os visitantes.
                </p>
              </div>
            ) : (
              <div className="space-y-2 mb-3">
                {subjects.map((subject, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/70 border border-zinc-800"
                  >
                    <span className="text-sm text-white">{subject}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubject(subject)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Remover este assunto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Ex: Consultoria / Palestras"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubject(e);
                  }
                }}
                className="flex-1 bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-base sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9]"
              />
              <button
                type="button"
                onClick={handleAddSubject}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#f4a7b9] hover:bg-[#efa0b3] text-zinc-950 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer min-h-[42px]"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Opção</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
