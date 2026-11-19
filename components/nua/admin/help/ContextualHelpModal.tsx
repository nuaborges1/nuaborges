/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Target,
  CheckCircle2,
  Sliders,
  GitFork,
  HelpCircle,
  ListChecks,
  Info,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react';
import { HelpItem } from './types';
import { useScrollLock } from '@/hooks/useScrollLock';

interface ContextualHelpModalProps {
  isOpen: boolean;
  item: HelpItem | null;
  onClose: () => void;
}

function FormattedInline({ text }: { text: string }) {
  if (!text) return null;
  // Suporte a markdown **negrito**
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="text-white font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

const SECTION_ICON_MAP = {
  target: Target,
  check: CheckCircle2,
  sliders: Sliders,
  workflow: GitFork,
  help: HelpCircle,
  list: ListChecks,
  info: Info,
  shield: ShieldCheck,
};

export function ContextualHelpModal({
  isOpen,
  item,
  onClose,
}: ContextualHelpModalProps) {
  // Mantemos o scroll suave sem travar de forma agressiva
  useScrollLock(isOpen);

  // Armazena quais seções estão abertas (a primeira abre por padrão)
  const [openSectionIds, setOpenSectionIds] = useState<Record<string, boolean>>({});
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  // Inicializa a primeira seção como aberta ao trocar de item
  useEffect(() => {
    if (isOpen && item) {
      const initial: Record<string, boolean> = {};
      item.sections.forEach((sec, idx) => {
        initial[sec.id] = sec.defaultOpen ?? idx === 0;
      });
      setOpenSectionIds(initial);
    }
  }, [isOpen, item]);

  // Salva o elemento com foco anterior e restaura ao fechar
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement;
      setTimeout(() => {
        modalContainerRef.current?.focus();
      }, 50);
    } else if (previouslyFocusedElementRef.current) {
      previouslyFocusedElementRef.current.focus();
    }
  }, [isOpen]);

  // Fecha com a tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const toggleSection = (sectionId: string) => {
    setOpenSectionIds((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto pointer-events-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
      >
        {/* Fundo suave e transparente — SEM BLUR, permitindo ver a página normalmente */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 cursor-pointer pointer-events-auto"
        />

        {/* Card do Modal — Centralizado na tela com fidelidade absoluta à referência */}
        <motion.div
          ref={modalContainerRef}
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-[475px] my-auto max-h-[88vh] flex flex-col rounded-2xl sm:rounded-[22px] bg-[#18141d] border border-white/[0.12] shadow-[0_25px_70px_rgba(0,0,0,0.9)] text-white overflow-hidden outline-none pointer-events-auto"
          style={{
            background: 'linear-gradient(175deg, #221a26 0%, #17131c 45%, #120f16 100%)',
          }}
        >
          {/* Cabeçalho do Modal */}
          <div className="p-5 sm:p-6 pb-2 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Ícone com círculo rosê idêntico à imagem de referência */}
                <div className="w-8 h-8 rounded-full bg-[#843C52]/15 border border-[#843C52]/50 text-[#843C52] flex items-center justify-center font-bold text-sm shrink-0 select-none">
                  ?
                </div>
                {/* Título sem corte (sem truncate), quebrando a linha naturalmente */}
                <h2
                  id="help-modal-title"
                  className="text-base sm:text-[17px] font-semibold text-white tracking-tight leading-snug break-words"
                >
                  Como funciona: {item.title}
                </h2>
              </div>

              {/* Botão X para fechar */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar ajuda"
                className="w-7 h-7 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] flex items-center justify-center transition cursor-pointer shrink-0 -mr-1 -mt-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Descrição introdutória agradável e legível */}
            <p className="text-xs sm:text-[13px] text-zinc-300 font-normal leading-relaxed mt-3 mb-1">
              {item.subtitle}
            </p>
          </div>

          {/* Corpo com Rolagem e Acordeões Formatados */}
          <div className="px-5 sm:px-6 py-2 overflow-y-auto space-y-2.5 flex-1 custom-scrollbar">
            {item.sections.map((section) => {
              const isOpenSec = Boolean(openSectionIds[section.id]);
              const IconComp = SECTION_ICON_MAP[section.iconName] || Target;

              return (
                <div
                  key={section.id}
                  className="rounded-xl bg-[#221c27] border border-white/[0.07] overflow-hidden transition-colors hover:border-white/[0.14]"
                >
                  {/* Cabeçalho do Acordeão */}
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    aria-expanded={isOpenSec}
                    className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left transition cursor-pointer hover:bg-white/[0.03]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <IconComp className="w-4 h-4 text-[#843C52] shrink-0" />
                      <span className="text-xs sm:text-[13px] font-medium text-white tracking-tight leading-snug">
                        {section.title}
                      </span>
                    </div>

                    <div className="text-zinc-400 shrink-0">
                      {isOpenSec ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {/* Conteúdo Expansível com Tipografia e Espaçamento Aprimorados */}
                  <AnimatePresence initial={false}>
                    {isOpenSec && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-0 text-xs text-zinc-300 font-normal leading-relaxed border-t border-white/[0.04]">
                          {/* Texto corrido explicativo com suporte a negrito */}
                          {section.content && (
                            <p className="mt-2 text-zinc-300 font-light leading-relaxed whitespace-pre-line">
                              <FormattedInline text={section.content} />
                            </p>
                          )}

                          {/* Lista formatada de opções com chaves destacadas */}
                          {section.options && section.options.length > 0 && (
                            <div className="mt-2.5 space-y-2.5 pl-0.5">
                              {section.options.map((opt, i) => (
                                <div key={i} className="text-xs leading-relaxed">
                                  <span className="font-semibold text-white/95">
                                    • {opt.label}:{' '}
                                  </span>
                                  <span className="text-zinc-300 font-light">
                                    <FormattedInline text={opt.description} />
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Passos numerados elegantes */}
                          {section.steps && section.steps.length > 0 && (
                            <ol className="mt-2.5 space-y-2 pl-0.5">
                              {section.steps.map((st, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs leading-relaxed">
                                  <span className="w-4 h-4 rounded-full bg-[#843C52]/20 text-[#843C52] font-semibold text-[10px] flex items-center justify-center shrink-0 mt-0.5 select-none">
                                    {i + 1}
                                  </span>
                                  <span className="text-zinc-300 font-light">
                                    <FormattedInline text={st} />
                                  </span>
                                </li>
                              ))}
                            </ol>
                          )}

                          {/* Itens em bullet tradicionais com ponto rosa */}
                          {section.bullets && section.bullets.length > 0 && (
                            <ul className="mt-2.5 space-y-1.5 pl-0.5">
                              {section.bullets.map((b, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs leading-relaxed">
                                  <span className="text-[#843C52] font-bold select-none shrink-0">•</span>
                                  <span className="text-zinc-300 font-light">
                                    <FormattedInline text={b} />
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}

                          {/* Dúvidas Frequentes (FAQs) com visual de perguntas destacadas */}
                          {section.faqs && section.faqs.length > 0 && (
                            <div className="mt-2.5 space-y-2.5">
                              {section.faqs.map((faq, i) => (
                                <div
                                  key={i}
                                  className="rounded-lg bg-black/30 border border-white/[0.06] p-3 text-xs space-y-1.5 leading-relaxed"
                                >
                                  <p className="font-semibold text-white flex items-start gap-2">
                                    <span className="text-[#843C52] select-none shrink-0 font-bold">?</span>
                                    <span>{faq.question}</span>
                                  </p>
                                  <p className="text-zinc-300 font-light pl-4">
                                    <FormattedInline text={faq.answer} />
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {/* Card de Atenção — Fiel à imagem de referência */}
            {item.warningItems && item.warningItems.length > 0 && (
              <div className="bg-[#2a171d] border border-[#843C52]/30 rounded-xl p-4 my-2.5 text-xs text-zinc-200">
                <div className="flex items-center gap-2 text-[#843C52] font-semibold text-xs tracking-wide">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Atenção</span>
                </div>
                <ul className="mt-2 space-y-1.5 pl-0.5 text-zinc-300">
                  {item.warningItems.map((warn, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed font-light">
                      <span className="text-[#843C52] select-none font-bold shrink-0">•</span>
                      <span>
                        <FormattedInline text={warn} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Rodapé do Modal com Botão Rosa "Entendi" */}
          <div className="p-5 sm:p-6 pt-3 border-t border-white/[0.06] bg-[#18141d] shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full h-11 rounded-xl bg-[#843C52] hover:bg-[#992b4a] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-sm active:scale-[0.99]"
            >
              <Check className="w-4 h-4 text-zinc-950 stroke-[2.5]" />
              <span>Entendi</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
