/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Eye, EyeOff, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

interface ContractAuthLockScreenProps {
  printCSS: string;
  pwd: string;
  setPwd: (val: string) => void;
  error: string;
  setError: (val: string) => void;
  showPwd: boolean;
  setShowPwd: React.Dispatch<React.SetStateAction<boolean>>;
  isLoggingIn: boolean;
  onLogin: (e: React.FormEvent) => void;
}

export function ContractAuthLockScreen({
  printCSS,
  pwd,
  setPwd,
  error,
  setError,
  showPwd,
  setShowPwd,
  isLoggingIn,
  onLogin,
}: ContractAuthLockScreenProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printCSS }} />
      <div className="min-h-[100dvh] bg-black text-white flex items-center justify-center px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] relative overflow-hidden selection:bg-[#661C30] selection:text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-[520px] h-[520px] rounded-full bg-[radial-gradient(circle,rgba(102,28,48,0.12)_0%,transparent_70%)]" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-md bg-[#0b0b0e] border border-zinc-800/90 rounded-3xl p-7 sm:p-9 shadow-2xl"
        >
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-[#90364B] shadow-[0_0_20px_rgba(102,28,48,0.3)] mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <p className="font-serif text-lg tracking-[0.22em] uppercase text-white mb-1">Nua Borges</p>
            <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.2em] bg-[#661C30]/20 text-[#90364B] border border-[#7A293D]/40 mb-3.5">
              Área Jurídica Restrita
            </span>
            <h1 className="font-serif text-2xl text-white font-normal mb-2">Instrumento Contratual</h1>
            <p className="text-zinc-300 text-xs leading-relaxed max-w-sm mx-auto">
              Olá, <strong className="text-white">Lua Borges</strong>! Para sua privacidade e segurança jurídica, o acesso aos termos contratuais e à assinatura digital é protegido.
            </p>
          </div>

          <form onSubmit={onLogin} className="space-y-4">
            <div>
              <label htmlFor="contract-password" className="block text-zinc-400 text-[11px] font-semibold tracking-widest uppercase mb-2">
                Chave de Acesso do Contrato
              </label>
              <div className="relative">
                <input
                  id="contract-password"
                  type={showPwd ? 'text' : 'password'}
                  inputMode="numeric"
                  enterKeyHint="go"
                  value={pwd}
                  onChange={(e) => {
                    setPwd(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Digite a chave enviada pela equipe"
                  autoComplete="current-password"
                  className="w-full min-h-[48px] bg-zinc-900 border border-zinc-800 focus:border-[#90364B] rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none transition-colors pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors rounded-lg cursor-pointer touch-manipulation"
                  aria-label={showPwd ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  key="err"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-500/25 text-red-300 text-xs"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] font-bold text-[11px] uppercase tracking-widest transition-all shadow-[0_4px_20px_rgba(67,19,34,0.45)] border border-white/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando Chave...</span>
                </>
              ) : (
                <>
                  <span>Acessar e Assinar Contrato</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-zinc-800/80 text-center space-y-2">
            <p className="text-zinc-400 text-xs leading-relaxed">
              💡 <strong className="text-zinc-300">Onde acho minha chave?</strong> A chave de 6 dígitos foi enviada diretamente no seu WhatsApp pela equipe técnica.
            </p>
            <p className="text-zinc-500 text-[11px]">
              Se precisar de suporte imediato ou reenvio da chave, converse com o Philippe pelo WhatsApp ou pelo e-mail oficial.
            </p>
          </div>
        </motion.div>
      </div>
    </>
  );
}
