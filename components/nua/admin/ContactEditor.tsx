'use client';

import React, { useState } from 'react';
import { Mail, Plus, X, Trash2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { SiteContent } from '@/lib/types';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

interface ContactEditorProps {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
}

export function ContactEditor({ content, onChange }: ContactEditorProps) {
  const [newSubject, setNewSubject] = useState('');
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const contact = content.contact;

  const showToast = (msg: string) => {
    setNoticeMessage(msg);
    setTimeout(() => setNoticeMessage(null), 3500);
  };

  const updateContact = (fields: Partial<typeof contact>) => {
    onChange((prev) => ({
      ...prev,
      contact: { ...prev.contact, ...fields },
    }));
    showToast('✓ Alterações de contato gravadas no rascunho.');
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
    <div className="space-y-5">
      {noticeMessage && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-center justify-between">
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

      <div className="rounded-xl bg-[#171821] border border-white/[0.06] p-4 sm:p-5 shadow-sm space-y-4">
        <div>
          <span className="text-[#f4a7b9] text-[10px] font-semibold tracking-wider uppercase font-mono block mb-1">
            ATENDIMENTO PROFISSIONAL
          </span>
          <h3 className="text-sm sm:text-base font-semibold text-white">Contato &amp; Parcerias</h3>
          <p className="text-zinc-400 text-xs font-light mt-0.5 leading-relaxed">
            Defina o e-mail onde você deseja receber as mensagens e os assuntos disponíveis para quem quiser falar com você.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="contact-email-input" className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase font-mono">
                Seu E-mail de Recebimento Oficial *
              </label>
              {contact.officialEmail && (
                isValidEmail(contact.officialEmail) ? (
                  <span className="text-emerald-400 text-[11px] flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" /> E-mail válido
                  </span>
                ) : (
                  <span className="text-amber-400 text-[11px] flex items-center gap-1 font-mono">
                    <AlertCircle className="w-3.5 h-3.5" /> Formato de e-mail inválido
                  </span>
                )
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                id="contact-email-input"
                type="email"
                value={contact.officialEmail}
                onChange={(e) => updateContact({ officialEmail: e.target.value })}
                placeholder="seuemail@exemplo.com"
                className={`flex-1 bg-[#0e0f14] border rounded-lg px-3 py-2 text-white text-xs sm:text-sm outline-none font-mono transition-colors ${
                  contact.officialEmail && !isValidEmail(contact.officialEmail)
                    ? 'border-amber-500/60 focus:border-amber-400'
                    : 'border-white/10 focus:border-[#f4a7b9]'
                }`}
              />
              <div className="h-9 px-3 rounded-lg bg-[#101116] border border-white/[0.08] text-xs font-mono flex items-center gap-2 shrink-0">
                {isValidEmail(contact.officialEmail) ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-emerald-400 font-medium">Ativo &amp; Monitorado</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-amber-400 font-medium">Aguardando e-mail</span>
                  </>
                )}
              </div>
            </div>
            <span className="text-zinc-500 text-[10px] block mt-1.5 font-light">
              As mensagens enviadas pelo formulário do site chegam diretamente nesta caixa de entrada.
            </span>
          </div>

          {/* Honeypot Security Card */}
          <div className="md:col-span-2 p-3 rounded-lg bg-[#101116] border border-white/[0.06] text-xs text-zinc-400 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed text-[11px]">
              <span className="text-white font-medium block mb-0.5">Proteção Ativa Anti-Spam no Formulário</span>
              <span>
                Seu formulário possui proteção com <strong>Honeypot invisível</strong> e <strong>Time-Trap de 2.5s</strong>. 
                Bots de spam que tentarem preencher o formulário são descartados silenciosamente pelo servidor sem incomodar sua caixa postal.
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="contact-title-input" className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase font-mono mb-1.5">
              Título da Janela de Mensagem
            </label>
            <input
              id="contact-title-input"
              type="text"
              value={contact.modalTitle}
              onChange={(e) => updateContact({ modalTitle: e.target.value })}
              placeholder="Ex: Contato & Parcerias"
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
            />
            <span className="text-zinc-500 text-[10px] block mt-1.5 font-light">
              Aparece no topo quando a pessoa clica para entrar em contato.
            </span>
          </div>

          <div>
            <label htmlFor="contact-subtitle-input" className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase font-mono mb-1.5">
              Mensagem de Boas-Vindas
            </label>
            <input
              id="contact-subtitle-input"
              type="text"
              value={contact.modalSubtitle}
              onChange={(e) => updateContact({ modalSubtitle: e.target.value })}
              placeholder="Ex: Envie sua proposta para assessoria ou parcerias comerciais."
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
            />
            <span className="text-zinc-500 text-[10px] block mt-1.5 font-light">
              Uma frase orientando o que a pessoa pode enviar.
            </span>
          </div>

          {/* Interactive Subject List */}
          <div className="md:col-span-2 pt-3 border-t border-white/[0.06]">
            <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase font-mono mb-1.5">
              Opções de Assunto Disponíveis no Formulário ({subjects.length})
            </label>
            <p className="text-zinc-500 text-xs font-light mb-3">
              Estas são as opções que o visitante pode escolher ao enviar uma mensagem para você:
            </p>

            {subjects.length === 0 ? (
              <div className="text-center py-6 px-4 rounded-xl border border-dashed border-white/10 bg-[#101116] mb-3">
                <p className="text-zinc-400 text-xs font-light">
                  Nenhum assunto cadastrado. Adicione pelo menos uma opção abaixo para os visitantes.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 mb-3">
                {subjects.map((subject, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#101116] border border-white/[0.06]"
                  >
                    <span className="text-xs text-white">{subject}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubject(subject)}
                      className="p-1 rounded-md text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Remover este assunto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
                className="flex-1 bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-xs sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9]"
              />
              <button
                type="button"
                onClick={handleAddSubject}
                className="h-8 px-3.5 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Opção</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
