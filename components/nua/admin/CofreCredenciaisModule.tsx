'use client';

import React from 'react';
import {
  Lock,
  Plus,
  Search,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { VaultCredentialItem, SERVICE_PRESETS } from './vault/types';
import { CredentialCard } from './vault/CredentialCard';
import { CredentialFormModal } from './vault/CredentialFormModal';
import { useVaultCredentials } from './vault/useVaultCredentials';

export type { VaultCredentialItem } from './vault/types';

interface CofreCredenciaisModuleProps {
  searchQuery?: string;
}

export function CofreCredenciaisModule({ searchQuery = '' }: CofreCredenciaisModuleProps = {}) {
  const {
    isLoading,
    selectedCategory,
    setSelectedCategory,
    searchTerm,
    setSearchTerm,
    decryptedPasswords,
    visiblePasswords,
    copiedId,
    isFormModalOpen,
    setIsFormModalOpen,
    editingItem,
    itemToDelete,
    setItemToDelete,
    isSubmitting,
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
    handleTogglePassword,
    handleCopyPassword,
    handleCopyUsername,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleGenerateStrongPassword,
    handleSaveCredential,
    handleConfirmDelete,
    filteredCredentials,
  } = useVaultCredentials(searchQuery);

  return (
    <div className="space-y-6 select-none text-white max-w-5xl">
      {/* Banner de Segurança & Cabeçalho Executivo */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#171821] border border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f4a7b9]/10 border border-[#f4a7b9]/25 text-[#f4a7b9] text-[10px] font-mono uppercase tracking-wider mb-2">
            <Lock className="w-3.5 h-3.5" />
            <span>Cofre Criptografado AES-256</span>
          </div>

          <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-wide">
            Cofre de credenciais
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 font-light mt-1 max-w-2xl leading-relaxed">
            Armazenamento ultra seguro de senhas, e-mails e chaves de acesso (Hostinger, Yahoo, Painel Administrativo e serviços integrados). Senhas protegidas sob criptografia ponta a ponta.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenCreateModal()}
          className="h-10 px-4 rounded-xl bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-sm shrink-0 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Credencial</span>
        </button>
      </div>

      {/* Atalhos Rápidos para Serviços Frequentes */}
      <div className="space-y-2.5">
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
          Atalhos de Serviços Pré-Configurados
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {SERVICE_PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleOpenCreateModal(preset.id)}
                className="p-3 rounded-xl bg-[#14151b] hover:bg-[#1a1b24] border border-white/[0.06] hover:border-white/15 transition-all text-left flex flex-col justify-between space-y-2 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${preset.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <Plus className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <span className="text-xs font-medium text-white block group-hover:text-[#f4a7b9] transition-colors">
                    {preset.name}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-light block truncate mt-0.5">
                    {preset.category}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Filtros em Abas */}
        <div className="inline-flex items-center p-1 rounded-xl bg-[#171821] border border-white/[0.06] overflow-x-auto max-w-full">
          {[
            { id: 'todos', label: 'Todas' },
            { id: 'hostinger', label: 'Hostinger' },
            { id: 'yahoo', label: 'Yahoo' },
            { id: 'admin', label: 'Painel Admin' },
            { id: 'stripe', label: 'Stripe' },
            { id: 'cloudflare', label: 'Cloudflare' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-white/[0.12] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Campo de Busca */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por serviço, e-mail ou conta..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#171821] border border-white/[0.08] text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9] transition-colors"
          />
        </div>
      </div>

      {/* Lista de Credenciais */}
      {isLoading ? (
        <div className="p-16 text-center text-zinc-400 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#f4a7b9]" />
          <span>Abrindo cofre de segurança...</span>
        </div>
      ) : filteredCredentials.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#14151b] border border-white/[0.06] space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-zinc-500">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-medium text-white block">
              Nenhuma credencial localizada
            </span>
            <span className="text-[11px] text-zinc-400 font-light block mt-1">
              Cadastre suas senhas da Hostinger, Yahoo e acessos nos botões acima para mantê-las organizadas e seguras.
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleOpenCreateModal()}
            className="h-8 px-4 rounded-lg bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-medium text-xs transition cursor-pointer inline-flex items-center gap-1.5 mt-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar Primeira Senha</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCredentials.map((item) => (
            <CredentialCard
              key={item.id}
              item={item}
              isVisible={!!visiblePasswords[item.id]}
              currentDecrypted={decryptedPasswords[item.id] || ''}
              copiedId={copiedId}
              onTogglePassword={handleTogglePassword}
              onCopyPassword={handleCopyPassword}
              onCopyUsername={handleCopyUsername}
              onEdit={handleOpenEditModal}
              onDelete={setItemToDelete}
            />
          ))}
        </div>
      )}

      {/* Modal de Cadastro / Edição */}
      <CredentialFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleSaveCredential}
        editingItem={editingItem}
        formService={formService}
        setFormService={setFormService}
        formTitle={formTitle}
        setFormTitle={setFormTitle}
        formCategory={formCategory}
        setFormCategory={setFormCategory}
        formUsername={formUsername}
        setFormUsername={setFormUsername}
        formPassword={formPassword}
        setFormPassword={setFormPassword}
        formAccessUrl={formAccessUrl}
        setFormAccessUrl={setFormAccessUrl}
        formError={formError}
        showFormPassword={showFormPassword}
        setShowFormPassword={setShowFormPassword}
        isSubmitting={isSubmitting}
        onGenerateStrongPassword={handleGenerateStrongPassword}
      />

      {/* Modal de Confirmação de Exclusão */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#171821] border border-white/10 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-sm font-semibold text-white">Excluir esta credencial?</h3>
              <p className="text-xs text-zinc-400 font-light">
                Você está prestes a remover o acesso de <strong className="text-white">{itemToDelete.title}</strong>. Esta ação não poderá ser desfeita.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs text-zinc-300 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs transition cursor-pointer"
              >
                {isSubmitting ? 'Removendo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CofreCredenciaisModule;
