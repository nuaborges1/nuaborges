/* Vinho maduro / Nua Borges */
'use client';

/**
 * NuaSpotlightModal — Command Center & Busca Inteligente do Painel Administrativo
 * 
 * Implementação da "Opção D" do RFC Spotlight com IA:
 * 1. Navegação semântica e atalhos rápidos de 0ms (local).
 * 2. Respostas operacionais diretas em mini-cards (faturamento, chamadas, pendências).
 * 3. Busca de conteúdos reais e pedidos em feed unificado.
 * 4. Handoff com 1 clique para a Nay.
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Brain } from 'lucide-react';
import { useScrollLock } from '@/hooks/useScrollLock';
import { NuaSpotlightModalProps, SpotlightItem } from './spotlight/types';
import { useSpotlightSearch } from './spotlight/useSpotlightSearch';
import { SpotlightItemRow } from './spotlight/SpotlightItemRow';
import { HelpTriggerButton } from './help/HelpTriggerButton';

export type { SpotlightItem, NuaSpotlightModalProps } from './spotlight/types';

export function NuaSpotlightModal({
  isOpen,
  onClose,
  onNavigate,
  content,
}: NuaSpotlightModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useScrollLock(isOpen);

  const {
    query,
    setQuery,
    selectedIndex,
    setSelectedIndex,
    searchResults,
    executeItem,
    handleKeyDown,
    handleOpenNuaAi,
  } = useSpotlightSearch({
    isOpen,
    onClose,
    onNavigate,
    content,
  });

  // Foco automático no input ao abrir
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Garante scroll automático para o item selecionado
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  return (
    <AnimatePresence>
      {isOpen && (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Busca rápida no painel"
        className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 md:pt-16 select-none overflow-hidden"
      >
        {/* Backdrop com desfoque e escurecimento */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Janela Central do Spotlight */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl bg-[#101116] border border-white/[0.1] rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[calc(100dvh-2rem)] sm:max-h-[82vh]"
          style={{
            boxShadow: '0 24px 70px rgba(0, 0, 0, 0.9), 0 0 36px rgba(132, 60, 82, 0.14)',
          }}
        >
          {/* Barra de Entrada Superior */}
          <div className="h-14 sm:h-16 px-4 sm:px-5 border-b border-white/[0.08] flex items-center gap-3 bg-[#14151b] shrink-0">
            <Search className="w-4 sm:w-5 h-4 sm:h-5 text-zinc-300 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              aria-label="Buscar no painel"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Busque uma tela, pedido, número ou dúvida... (ex: faturei ontem)"
              className="w-full bg-transparent text-sm sm:text-base text-white placeholder-zinc-500 outline-none font-sans font-light"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
                title="Limpar pesquisa"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono text-zinc-400 bg-white/[0.06] border border-white/[0.08] shrink-0">
              ESC
            </span>
          </div>

          {/* Lista de Resultados e Sugestões */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10"
          >
            {searchResults.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-zinc-400">
                  <Search className="w-4 h-4 text-zinc-500" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-zinc-300">
                    Nenhum resultado encontrado para &quot;{query}&quot;
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1 max-w-sm mx-auto">
                    Tente buscar por <em>whatsapp</em>, <em>packs</em>, <em>faturamento</em> ou pergunte diretamente à Nay.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenNuaAi(query)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#843C52]/15 hover:bg-[#843C52]/25 text-[#843C52] border border-[#843C52]/30 text-xs font-medium transition cursor-pointer"
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>Consultar com a Nay</span>
                </button>
              </div>
            ) : (
              searchResults.map((item, idx) => (
                <SpotlightItemRow
                  key={item.id}
                  item={item}
                  isSelected={idx === selectedIndex}
                  onSelect={() => setSelectedIndex(idx)}
                  onExecute={() => executeItem(item)}
                />
              ))
            )}
          </div>

          {/* Rodapé Fixo com Atalhos de Teclado */}
          <div className="h-10 px-4 sm:px-5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-400 bg-[#14151b] shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-mono text-[10px]">
                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-zinc-300 border border-white/[0.08]">
                  ↑↓
                </kbd>
                <span>Navegar</span>
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[10px]">
                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-zinc-300 border border-white/[0.08]">
                  Enter
                </kbd>
                <span>Abrir</span>
              </span>
              <span className="hidden sm:flex items-center gap-1.5 font-mono text-[10px]">
                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-zinc-300 border border-white/[0.08]">
                  Tab
                </kbd>
                <span>Nay</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#843C52]" />
                <span>Busca Rápida</span>
              </div>
              <HelpTriggerButton helpId="spotlight_search" compact />
            </div>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
