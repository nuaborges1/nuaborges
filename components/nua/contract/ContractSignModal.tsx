'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PenTool,
  X,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  BadgeCheck,
} from 'lucide-react';
import { SignatureCanvas } from './SignatureCanvas';

interface ContractSignModalProps {
  signModalParty: 'contractor' | 'client' | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent, payload: {
    signType: 'drawn' | 'typed';
    drawnDataUrl: string;
    typedSignName: string;
    signPassword: string;
    signAgreed: boolean;
  }) => Promise<void>;
  isSubmitting: boolean;
  signError: string;
  setSignError: (err: string) => void;
}

export function ContractSignModal({
  signModalParty,
  onClose,
  onSubmit,
  isSubmitting,
  signError,
  setSignError,
}: ContractSignModalProps) {
  const [signType, setSignType] = useState<'drawn' | 'typed'>('drawn');
  const [drawnDataUrl, setDrawnDataUrl] = useState('');
  const [typedSignName, setTypedSignName] = useState(
    signModalParty === 'contractor' ? 'João Philippe de Oliveira Boechat' : 'Nayara Borges da Costa'
  );
  const [signPassword, setSignPassword] = useState('');
  const [showSignPassword, setShowSignPassword] = useState(false);
  const [signAgreed, setSignAgreed] = useState(false);

  if (!signModalParty) return null;

  const handleSubmit = (e: React.FormEvent) => {
    onSubmit(e, {
      signType,
      drawnDataUrl,
      typedSignName,
      signPassword,
      signAgreed,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-left my-8"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[#f4a7b9] font-medium text-xs">
              <PenTool className="w-4 h-4" />
              <span>ASSINATURA ELETRÔNICA (LEI 14.063/2020)</span>
            </div>
            <h3 className="text-lg font-serif font-bold text-white">
              {signModalParty === 'contractor'
                ? 'Assinar como Contratado'
                : 'Assinar como Contratante'}
            </h3>
            <p className="text-xs text-zinc-400">
              {signModalParty === 'contractor'
                ? 'João Philippe de Oliveira Boechat (CPF: 053.795.071-07)'
                : 'Nayara Borges da Costa — "Nua Borges" (CPF/Doc: 059.681.011-30)'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Assinatura: Rubrica vs Digitar */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-300 block">Formato da Assinatura:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSignType('drawn')}
                className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  signType === 'drawn'
                    ? 'bg-[#f4a7b9]/15 border-[#f4a7b9] text-[#f4a7b9]'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                Desenhar Rubrica
              </button>
              <button
                type="button"
                onClick={() => setSignType('typed')}
                className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  signType === 'typed'
                    ? 'bg-[#f4a7b9]/15 border-[#f4a7b9] text-[#f4a7b9]'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                Caligrafia com Nome
              </button>
            </div>
          </div>

          {/* Campo de Rubrica ou Texto */}
          {signType === 'drawn' ? (
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 flex items-center justify-between">
                <span>Desenhe abaixo com o dedo ou mouse:</span>
                {drawnDataUrl && (
                  <span className="text-emerald-400 text-[10px] flex items-center gap-1">
                    <Check className="w-3 h-3" /> Rubrica capturada
                  </span>
                )}
              </label>
              <SignatureCanvas
                onSave={(dataUrl) => setDrawnDataUrl(dataUrl)}
                onClear={() => setDrawnDataUrl('')}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs text-zinc-400">Nome completo a registrar:</label>
              <input
                type="text"
                value={typedSignName}
                onChange={(e) => setTypedSignName(e.target.value)}
                placeholder="Nome Completo do Assinante"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:border-[#f4a7b9] focus:outline-none transition-colors"
              />
              {typedSignName.trim() && (
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
                  <span className="text-[10px] text-zinc-500 block mb-1">Prévia da Caligrafia Digital:</span>
                  <span className="font-serif italic text-xl text-[#f4a7b9]">
                    {typedSignName.trim()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Chave de Confirmação / Assinatura */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 flex items-center justify-between">
              <span>Chave de Confirmação (Senha):</span>
              <span className="text-[10px] text-zinc-500">Chave de acesso do contrato</span>
            </label>
            <div className="relative">
              <input
                type={showSignPassword ? 'text' : 'password'}
                value={signPassword}
                onChange={(e) => {
                  setSignPassword(e.target.value);
                  if (signError) setSignError('');
                }}
                placeholder="Digite sua chave de acesso"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:border-[#f4a7b9] focus:outline-none transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSignPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1 rounded-lg cursor-pointer transition-colors"
                aria-label={showSignPassword ? 'Ocultar chave' : 'Exibir chave'}
              >
                {showSignPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Termo de Concordância */}
          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-zinc-300 leading-relaxed">
              <input
                type="checkbox"
                checked={signAgreed}
                onChange={(e) => setSignAgreed(e.target.checked)}
                className="mt-0.5 rounded border-zinc-700 text-[#f4a7b9] focus:ring-[#f4a7b9] cursor-pointer"
              />
              <span>
                Declaro sob as penas da lei que li e concordo integralmente com todas as cláusulas, obrigações, prazos e valores deste <strong>Contrato de Prestação de Serviços de Desenvolvimento Web</strong> e de seu <strong>Anexo I</strong>.
              </span>
            </label>
          </div>

          {/* Mensagem de Erro */}
          {signError && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{signError}</span>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f4a7b9] to-[#e0859a] text-zinc-950 font-semibold text-xs hover:opacity-95 shadow-lg shadow-[#f4a7b9]/25 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Autenticando e Assinando...</span>
                </>
              ) : (
                <>
                  <BadgeCheck className="w-4 h-4" />
                  <span>Confirmar Assinatura Digital</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
