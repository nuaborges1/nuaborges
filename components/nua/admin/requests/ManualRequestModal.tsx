'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, RefreshCw, Send } from 'lucide-react';

interface ManualRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  title: string;
  setTitle: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
  text: string;
  setText: (val: string) => void;
  submitting: boolean;
}

export function ManualRequestModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  setTitle,
  category,
  setCategory,
  text,
  setText,
  submitting,
}: ManualRequestModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 overscroll-contain">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-4 shadow-2xl relative"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-full text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <span className="text-[#f4a7b9] text-[10px] font-mono tracking-widest uppercase font-semibold">
                Solicitação ao Desenvolvedor
              </span>
              <h3 className="text-xl font-serif text-white">Nova Solicitação</h3>
              <p className="text-xs text-zinc-400">
                Descreva o que você gostaria de mudar, adicionar ou ajustar no seu site.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-3.5 pt-2">
              <div>
                <label className="block text-zinc-400 text-[11px] font-semibold uppercase tracking-wider mb-1">
                  Título ou Assunto (Opcional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Trocar foto da capa, ajuste no texto de contato..."
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9]"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[11px] font-semibold uppercase tracking-wider mb-1">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#f4a7b9]"
                >
                  <option value="Melhoria Geral">💡 Ideia / Melhoria Geral</option>
                  <option value="Visual & Design">🎨 Visual & Aparência</option>
                  <option value="Ajuste no Celular">📱 Ajuste no Celular</option>
                  <option value="Texto ou Foto">📸 Textos ou Fotos</option>
                  <option value="Problema ou Bug">🐛 Problema ou Dúvida</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 text-[11px] font-semibold uppercase tracking-wider mb-1">
                  O que precisa ser feito? *
                </label>
                <textarea
                  rows={4}
                  required
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Explique com suas palavras os detalhes do que você deseja que seja alterado..."
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9] resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !text.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#f4a7b9] hover:bg-[#fabcc9] text-zinc-950 font-bold text-xs tracking-wide transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar Solicitação</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
