/* Vinho maduro / Nua Borges */
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
    <div className="min-h-screen bg-[#0c0d12] flex items-center justify-center p-5 select-none relative overflow-hidden">
      {/* Subtle ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#843C52]/[0.05] rounded-full blur-[140px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md bg-[#171821] border border-white/[0.08] rounded-2xl p-7 sm:p-8 shadow-2xl text-center"
      >
        {/* Brand */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 mb-1.5">
            <span className="font-script text-[2.2rem] text-[#843C52] tracking-wide">
              Nua Borges
            </span>
            <HeartOutlineIcon className="w-5 h-5 text-[#843C52] mb-1" />
          </div>
          <span className="text-[10px] font-semibold tracking-[0.28em] uppercase text-zinc-400 block">
            PAINEL DO SEU SITE
          </span>
          <p className="text-zinc-400 text-xs font-light mt-1.5 max-w-xs mx-auto">
            Entre com sua senha para atualizar os textos, fotos e links do seu site.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
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
              className={`w-full bg-[#0e0f14] border rounded-lg pl-10 pr-10 py-2.5 text-white placeholder-zinc-500 text-xs outline-none transition-all ${
                errorMessage
                  ? 'border-rose-500/70 focus:border-rose-500'
                  : 'border-white/10 focus:border-[#843C52]'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-white transition-colors cursor-pointer"
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
            className="w-full mt-2 inline-flex items-center justify-center gap-2 h-10 px-6 rounded-full bg-[#843C52] hover:bg-[#992b4a] active:bg-[#661C30] text-white font-semibold text-xs uppercase tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
          >
            <span>{loading ? 'Entrando...' : 'Entrar no Painel'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Helper Note */}
        <div className="mt-6 pt-5 border-t border-white/[0.06] text-center">
          <p className="text-zinc-500 text-xs font-light">
            Espaço exclusivo para você cuidar do seu site com segurança e tranquilidade.
          </p>
          <Link
            href="/"
            rel="nofollow"
            className="text-[#843C52]/80 hover:text-[#843C52] text-xs mt-2.5 inline-block transition-colors"
          >
            ← Voltar para o site
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
