'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { HeartOutlineIcon } from '@/components/Icons';
import { verifyAdminPassword, setSessionActive } from '@/lib/contentStore';

interface AdminLoginProps {
  onSuccess: () => void;
}

export function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await verifyAdminPassword(password);
      if (result.success) {
        onSuccess();
      } else {
        setErrorMessage(result.error || 'Senha incorreta. Verifique e tente novamente.');
      }
    } catch {
      setErrorMessage('Não foi possível conectar ao sistema agora. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-5 select-none relative overflow-hidden">
      {/* Subtle ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#f4a7b9]/[0.05] rounded-full blur-[140px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md bg-[#09090c] border border-zinc-800/90 rounded-[32px] p-8 sm:p-10 shadow-2xl text-center"
      >
        {/* Brand */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 mb-2">
            <span className="font-script text-[2.4rem] text-[#f4a7b9] tracking-wide">
              Nua Borges
            </span>
            <HeartOutlineIcon className="w-5 h-5 text-[#f4a7b9] mb-1" />
          </div>
          <span className="text-[11px] font-semibold tracking-[0.28em] uppercase text-zinc-400 block">
            PAINEL DO SEU SITE
          </span>
          <p className="text-zinc-400 text-xs sm:text-sm font-light mt-2 max-w-xs mx-auto">
            Entre com sua senha para atualizar os textos, fotos e links do seu site.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Digite sua senha..."
              className={`w-full bg-zinc-900/70 border rounded-2xl pl-11 pr-11 py-3.5 text-white placeholder-zinc-500 text-base sm:text-sm outline-none transition-all ${
                errorMessage
                  ? 'border-rose-500/70 focus:border-rose-500'
                  : 'border-zinc-800 focus:border-[#f4a7b9]'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-white transition-colors cursor-pointer"
              aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {errorMessage && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-rose-400 text-xs text-left pl-1 font-light"
            >
              {errorMessage}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full mt-2 inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-full bg-[#f4a7b9] hover:bg-[#efa0b3] active:bg-[#df8fa1] text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[50px] shadow-[0_4px_24px_rgba(244,167,185,0.22)]"
          >
            <span>{loading ? 'Entrando...' : 'Entrar no Painel'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Helper Note */}
        <div className="mt-8 pt-6 border-t border-zinc-900 text-center">
          <p className="text-zinc-500 text-xs font-light">
            Espaço exclusivo para você cuidar do seu site com segurança e tranquilidade.
          </p>
          <a
            href="/"
            rel="nofollow"
            className="text-[#f4a7b9]/80 hover:text-[#f4a7b9] text-xs mt-3 inline-block transition-colors"
          >
            ← Voltar para o site
          </a>
        </div>
      </motion.div>
    </div>
  );
}
