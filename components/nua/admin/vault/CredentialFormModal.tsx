'use client';

import React from 'react';
import { KeyRound, X, AlertCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { VaultCredentialItem, SERVICE_PRESETS } from './types';

interface CredentialFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  editingItem: VaultCredentialItem | null;
  formService: string;
  setFormService: (val: string) => void;
  formTitle: string;
  setFormTitle: (val: string) => void;
  formCategory: string;
  setFormCategory: (val: string) => void;
  formUsername: string;
  setFormUsername: (val: string) => void;
  formPassword: string;
  setFormPassword: (val: string) => void;
  formAccessUrl: string;
  setFormAccessUrl: (val: string) => void;
  formError: string | null;
  showFormPassword: boolean;
  setShowFormPassword: React.Dispatch<React.SetStateAction<boolean>>;
  isSubmitting: boolean;
  onGenerateStrongPassword: () => void;
}

export function CredentialFormModal({
  isOpen,
  onClose,
  onSubmit,
  editingItem,
  formService,
  setFormService,
  formTitle,
  setFormTitle,
  formCategory,
  setFormCategory,
  formUsername,
  setFormUsername,
  formPassword,
  setFormPassword,
  formAccessUrl,
  setFormAccessUrl,
  formError,
  showFormPassword,
  setShowFormPassword,
  isSubmitting,
  onGenerateStrongPassword,
}: CredentialFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-[#171821] border border-white/10 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#f4a7b9]/15 border border-[#f4a7b9]/25 flex items-center justify-center text-[#f4a7b9]">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {editingItem ? 'Editar Credencial' : 'Cadastrar Nova Credencial'}
              </h3>
              <span className="text-[10px] text-zinc-400 font-light block">
                Criptografia local com chave AES-GCM
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={onSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Serviço */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-300 font-medium">Serviço / Plataforma</label>
            <select
              value={formService}
              onChange={(e) => {
                const s = e.target.value;
                setFormService(s);
                const preset = SERVICE_PRESETS.find((p) => p.id === s);
                if (preset && !editingItem) {
                  setFormCategory(preset.category);
                  setFormTitle(preset.defaultTitle);
                  setFormAccessUrl(preset.defaultUrl);
                }
              }}
              className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white outline-none focus:border-[#f4a7b9]"
            >
              <option value="hostinger">Hostinger (Hospedagem & E-mail Titan)</option>
              <option value="yahoo">Yahoo Mail (E-mail)</option>
              <option value="admin">Painel Administrativo Nua Borges</option>
              <option value="mercadopago">Mercado Pago (Pagamentos)</option>
              <option value="cloudflare">Cloudflare (DNS & Segurança)</option>
              <option value="outros">Outro Serviço / Conta</option>
            </select>
          </div>

          {/* Título / Descrição */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-300 font-medium">Nome / Identificação da Conta</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Ex: E-mail da Hostinger, Yahoo Mail, Acesso Admin..."
              className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9]"
              required
            />
          </div>

          {/* Usuário / E-mail */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-300 font-medium">E-mail ou Usuário de Acesso</label>
            <input
              type="text"
              value={formUsername}
              onChange={(e) => setFormUsername(e.target.value)}
              placeholder="Ex: contato@nuaborges.com.br"
              className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9]"
              required
            />
          </div>

          {/* Senha + Gerador de Senha */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-zinc-300 font-medium">Senha</label>
              <button
                type="button"
                onClick={onGenerateStrongPassword}
                className="text-[10px] font-mono text-[#f4a7b9] hover:underline cursor-pointer"
              >
                + Gerar Senha Forte
              </button>
            </div>

            <div className="relative">
              <input
                type={showFormPassword ? 'text' : 'password'}
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="Digite ou gere a senha..."
                className="w-full pl-3 pr-10 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9] font-mono"
                required
              />
              <button
                type="button"
                onClick={() => setShowFormPassword((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                {showFormPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* URL de Acesso (Opcional) */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-300 font-medium">
              URL de Acesso <span className="text-zinc-500 font-light">(opcional)</span>
            </label>
            <input
              type="text"
              value={formAccessUrl}
              onChange={(e) => setFormAccessUrl(e.target.value)}
              placeholder="https://mail.hostinger.com"
              className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9]"
            />
          </div>

          {/* Botões de Ação */}
          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs text-zinc-300 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold text-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Criptografando...</span>
                </>
              ) : (
                <span>{editingItem ? 'Salvar Alterações' : 'Salvar no Cofre'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
