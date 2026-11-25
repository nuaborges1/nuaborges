/* Vinho maduro / Nua Borges */
'use client';

import React, { useState } from 'react';
import {
  HelpCircle,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  CheckCircle2,
  Eye,
  EyeOff,
  Heart,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SiteContent, VipClubData } from '@/lib/types';
import { CANONICAL_FAQS } from '@/lib/faqData';
import { RichTextPostEditor } from './ui/RichTextPostEditor';

interface FaqVipEditorProps {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
}

export function FaqVipEditor({ content, onChange }: FaqVipEditorProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const faqs =
    Array.isArray(content.faqs) && content.faqs.length > 0
      ? content.faqs
      : CANONICAL_FAQS.map((f) => ({ ...f, active: true }));

  const vipClub: VipClubData = content.vipClub || {
    eyebrow: 'LISTA VIP & PRÉVIAS',
    title: 'Entre no Círculo Íntimo',
    subtitle:
      'Cadastre-se para receber fotos inéditas em primeira mão, cupons secretos e avisos de novos lançamentos direto no seu celular.',
    buttonText: 'Entrar na Lista VIP ♡',
    active: true,
  };

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const updateFaqs = (nextFaqs: Array<{ question: string; answer: string; active?: boolean }>) => {
    onChange((prev) => ({
      ...prev,
      faqs: nextFaqs,
    }));
  };

  const handleUpdateFaqItem = (
    idx: number,
    patch: Partial<{ question: string; answer: string; active?: boolean }>
  ) => {
    const next = faqs.map((item, i) => (i === idx ? { ...item, ...patch } : item));
    updateFaqs(next);
  };

  const handleAddFaqItem = () => {
    const nextIdx = faqs.length;
    updateFaqs([
      ...faqs,
      {
        question: 'Escreva a nova pergunta aqui...',
        answer: 'Escreva a resposta aqui...',
        active: true,
      },
    ]);
    setExpandedIndex(nextIdx);
  };

  const handleRemoveFaqItem = (idx: number) => {
    if (faqs.length <= 1) {
      notify('Mantenha pelo menos uma pergunta cadastrada.');
      return;
    }
    updateFaqs(faqs.filter((_, i) => i !== idx));
    if (expandedIndex === idx) setExpandedIndex(null);
  };

  const handleMoveFaqItem = (idx: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= faqs.length) return;
    const next = [...faqs];
    const tmp = next[idx];
    next[idx] = next[target];
    next[target] = tmp;
    updateFaqs(next);
    setExpandedIndex(target);
  };

  const handleRestoreDefaults = () => {
    updateFaqs(CANONICAL_FAQS.map((f) => ({ ...f, active: true })));
    setExpandedIndex(0);
    notify('Perguntas originais restauradas.');
  };

  const updateVip = (patch: Partial<VipClubData>) => {
    onChange((prev) => ({
      ...prev,
      vipClub: {
        ...(prev.vipClub || vipClub),
        ...patch,
      },
    }));
  };

  return (
    <div className="space-y-6 w-full">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-[#171821] border border-[#843C52]/40 text-white text-xs flex items-center gap-2 shadow-2xl backdrop-blur-xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#843C52]" />
          <span>{toast}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Coluna Esquerda (8 cols): Perguntas e Respostas da Página Inicial */}
        <div className="xl:col-span-8 rounded-2xl bg-[#14161d] border border-white/[0.06] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-white/[0.06]">
            <div className="flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-[#c8647d] mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Perguntas Frequentes da Página Inicial ({faqs.length})
                </h3>
                <p className="text-zinc-400 text-xs font-light mt-0.5">
                  Clique em qualquer pergunta abaixo para abrir e editar a resposta.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRestoreDefaults}
                className="h-8 px-3 rounded-xl bg-[#0e1015] hover:bg-white/[0.06] border border-white/[0.08] text-xs text-zinc-300 hover:text-white inline-flex items-center gap-1.5 transition cursor-pointer"
                title="Voltar para as perguntas originais"
              >
                <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                <span>Voltar ao original</span>
              </button>
              <button
                type="button"
                onClick={handleAddFaqItem}
                className="h-8 px-3.5 rounded-xl bg-[#843C52] hover:bg-[#992b4a] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Pergunta</span>
              </button>
            </div>
          </div>

          {/* Lista Limpa em Acordeão (abre uma por vez para não poluir a tela) */}
          <div className="space-y-2.5">
            {faqs.map((item, idx) => {
              const isActive = item.active !== false;
              const isExpanded = expandedIndex === idx;

              return (
                <div
                  key={idx}
                  className={`rounded-xl border transition overflow-hidden ${
                    isExpanded
                      ? 'bg-[#0e1015] border-[#843C52]/50'
                      : isActive
                      ? 'bg-[#0e1015] border-white/[0.07] hover:border-white/[0.15]'
                      : 'bg-[#0e1015]/50 border-white/[0.04] opacity-60'
                  }`}
                >
                  {/* Barra da Pergunta */}
                  <div className="flex items-center justify-between gap-2 p-3.5">
                    <button
                      type="button"
                      onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                      className="flex-1 flex items-center gap-2.5 text-left cursor-pointer min-w-0"
                    >
                      <span className="w-6 h-6 rounded-lg bg-[#843C52]/20 border border-[#843C52]/30 text-[#e39ab0] text-[11px] font-semibold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs sm:text-[13px] font-medium text-white truncate">
                        {item.question || 'Pergunta sem título'}
                      </span>
                      {!isActive && (
                        <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 text-[10px] shrink-0">
                          Oculta
                        </span>
                      )}
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveFaqItem(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-25 cursor-pointer"
                        title="Subir posição"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveFaqItem(idx, 'down')}
                        disabled={idx === faqs.length - 1}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-25 cursor-pointer"
                        title="Descer posição"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateFaqItem(idx, { active: !isActive })}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] cursor-pointer"
                        title={isActive ? 'Ocultar pergunta do site' : 'Mostrar pergunta no site'}
                      >
                        {isActive ? (
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-zinc-500" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFaqItem(idx)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                        title="Apagar pergunta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
                        title={isExpanded ? 'Fechar edição' : 'Editar pergunta'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Conteúdo Aberto para Edição */}
                  {isExpanded && (
                    <div className="p-4 pt-3 border-t border-white/[0.06] bg-[#12141c] space-y-3.5">
                      <div>
                        <label className="block text-zinc-200 text-xs font-medium mb-1.5">
                          Pergunta
                        </label>
                        <input
                          type="text"
                          value={item.question}
                          onChange={(e) => handleUpdateFaqItem(idx, { question: e.target.value })}
                          placeholder="Ex: A cobrança no cartão ou Pix é discreta?"
                          className="w-full h-9 bg-[#0e1015] border border-white/[0.08] rounded-xl px-3 text-xs text-white font-medium outline-none focus:border-[#843C52]"
                        />
                      </div>

                      <RichTextPostEditor
                        label="Resposta"
                        value={item.answer}
                        onChange={(val) => handleUpdateFaqItem(idx, { answer: val })}
                        rows={3}
                        compact
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Coluna Direita (4 cols): Convite da Lista VIP */}
        <div className="xl:col-span-4 rounded-2xl bg-[#14161d] border border-white/[0.06] p-5 space-y-4">
          <div className="pb-3.5 border-b border-white/[0.06] flex items-start gap-2.5">
            <Heart className="w-4 h-4 text-[#c8647d] mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-white">Convite da Lista VIP</h3>
              <p className="text-zinc-400 text-xs font-light mt-0.5">
                Janela onde seus visitantes deixam WhatsApp e e-mail para receber novidades.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-zinc-200 text-xs font-medium mb-1.5">
              Frase pequena no topo
            </label>
            <input
              type="text"
              value={vipClub.eyebrow}
              onChange={(e) => updateVip({ eyebrow: e.target.value })}
              placeholder="LISTA VIP & PRÉVIAS"
              className="w-full h-9 bg-[#0e1015] border border-white/[0.08] rounded-xl px-3 text-xs text-white outline-none focus:border-[#843C52]"
            />
          </div>

          <div>
            <label className="block text-zinc-200 text-xs font-medium mb-1.5">
              Título do Convite
            </label>
            <input
              type="text"
              value={vipClub.title}
              onChange={(e) => updateVip({ title: e.target.value })}
              placeholder="Entre no Círculo Íntimo"
              className="w-full h-9 bg-[#0e1015] border border-white/[0.08] rounded-xl px-3 text-xs text-white outline-none focus:border-[#843C52]"
            />
          </div>

          <div>
            <label className="block text-zinc-200 text-xs font-medium mb-1.5">
              Texto Explicativo
            </label>
            <textarea
              rows={3}
              value={vipClub.subtitle}
              onChange={(e) => updateVip({ subtitle: e.target.value })}
              placeholder="Cadastre-se para receber conteúdos inéditos..."
              className="w-full bg-[#0e1015] border border-white/[0.08] rounded-xl p-3 text-xs text-white outline-none focus:border-[#843C52] resize-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-zinc-200 text-xs font-medium mb-1.5">
              Texto do Botão
            </label>
            <input
              type="text"
              value={vipClub.buttonText}
              onChange={(e) => updateVip({ buttonText: e.target.value })}
              placeholder="Entrar na Lista VIP ♡"
              className="w-full h-9 bg-[#0e1015] border border-white/[0.08] rounded-xl px-3 text-xs text-white outline-none focus:border-[#843C52]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
