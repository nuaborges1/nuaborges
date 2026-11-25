/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import {
  Copy,
  Check,
  Pencil,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
} from 'lucide-react';
import { VaultCredentialItem, SERVICE_PRESETS } from './types';

interface CredentialCardProps {
  item: VaultCredentialItem;
  isVisible: boolean;
  currentDecrypted: string;
  copiedId: string | null;
  onTogglePassword: (item: VaultCredentialItem) => void;
  onCopyPassword: (item: VaultCredentialItem) => void;
  onCopyUsername: (item: VaultCredentialItem) => void;
  onEdit: (item: VaultCredentialItem) => void;
  onDelete: (item: VaultCredentialItem) => void;
}

export function CredentialCard({
  item,
  isVisible,
  currentDecrypted,
  copiedId,
  onTogglePassword,
  onCopyPassword,
  onCopyUsername,
  onEdit,
  onDelete,
}: CredentialCardProps) {
  const preset = SERVICE_PRESETS.find((p) => p.id === item.service) || SERVICE_PRESETS[5];
  const Icon = preset.icon;

  return (
    <div className="p-5 rounded-2xl bg-[#14151b] border border-white/[0.07] hover:border-white/15 transition-colors flex flex-col justify-between space-y-4 shadow-md group">
      {/* Cabeçalho do Card */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${preset.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-white tracking-wide truncate">
                {item.title}
              </h3>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 shrink-0">
                {preset.name}
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 font-light block truncate mt-0.5">
              {item.category}
            </span>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="flex items-center gap-1 shrink-0">
          {item.accessUrl && (
            <a
              href={item.accessUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Abrir página de acesso do serviço"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Editar acesso"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Excluir acesso"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dados da Credencial */}
      <div className="space-y-2.5 pt-2 border-t border-white/[0.04]">
        {/* Linha: Usuário / E-mail */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/[0.04]">
          <div className="min-w-0 flex-1 pr-2">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 block">
              Usuário / E-mail
            </span>
            <span className="text-xs font-mono text-zinc-200 block truncate mt-0.5 selection:bg-[#843C52] selection:text-black">
              {item.username}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onCopyUsername(item)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
            title="Copiar usuário"
          >
            {copiedId === `user_${item.id}` ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Linha: Senha Protegida */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/[0.04]">
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 block">
                Senha
              </span>
              {isVisible && (
                <span className="text-[9px] font-mono text-amber-400/90 font-light">
                  (visível por 30s)
                </span>
              )}
            </div>

            <span className="text-xs font-mono text-[#843C52] block truncate mt-0.5 selection:bg-[#843C52] selection:text-black">
              {isVisible ? currentDecrypted : '••••••••••••••••'}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onTogglePassword(item)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              title={isVisible ? 'Ocultar senha' : 'Exibir senha'}
            >
              {isVisible ? (
                <EyeOff className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onCopyPassword(item)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              title="Copiar senha diretamente"
            >
              {copiedId === `pwd_${item.id}` ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Rodapé com Data de Atualização */}
      <div className="flex items-center justify-between text-[10px] text-zinc-400 font-light pt-1">
        <span>Atualizado: {new Date(item.updatedAt).toLocaleDateString('pt-BR')}</span>
        <span className="font-mono text-emerald-400/80">Protegido</span>
      </div>
    </div>
  );
}
