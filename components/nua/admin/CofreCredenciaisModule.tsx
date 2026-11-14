'use client';

import React from 'react';
import {
  Lock,
  Plus,
  Search,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { SERVICE_PRESETS } from './vault/types';
import { CredentialCard } from './vault/CredentialCard';
import { CredentialFormModal } from './vault/CredentialFormModal';
import { useVaultCredentials } from './vault/useVaultCredentials';
import { PageHeader, AdminButton } from '@/components/nua/admin';

export type { VaultCredentialItem } from './vault/types';

interface CofreCredenciaisModuleProps {
  searchQuery?: string;
}

export function CofreCredenciaisModule({ searchQuery = '' }: CofreCredenciaisModuleProps = {}) {
  const {
    credentials,
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
    <div className="space-y-6 select-none text-white">
      <PageHeader
        title="Acessos e Senhas"
        subtitle="Guarde com segurança suas senhas de e-mail, hospedagem, redes sociais e serviços integrados em um único lugar protegido."
        helpId="cofre_senhas"
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#f4a7b9]/10 border border-[#f4a7b9]/25 text-[#f4a7b9] text-[10px] font-mono uppercase tracking-wider">
            <Lock className="w-3 h-3" />
            <span>Cofre Criptografado</span>
          </span>
        }
        actions={
          <AdminButton
            variant="primary"
            icon={Plus}
            onClick={() => handleOpenCreateModal()}
          >
            Cadastrar Credencial
          </AdminButton>
        }
      />

      {/* Atalhos Rápidos para Serviços Frequentes */}
      <div className="space-y-2.5">
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
          Adicionar Acesso Rápido por Serviço
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

      {/* Barra de Filtros e Busca (Exibida apenas quando já existem credenciais salvas) */}
      {credentials.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="inline-flex flex-wrap items-center p-1 rounded-xl bg-[#171821] border border-white/[0.06] gap-1">
            {[
              { id: 'todos', label: 'Todas' },
              { id: 'hostinger', label: 'Hostinger' },
              { id: 'yahoo', label: 'Yahoo' },
              { id: 'admin', label: 'Painel Admin' },
              { id: 'mercadopago', label: 'Mercado Pago' },
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
      )}

      {/* Lista de Credenciais */}
      {isLoading ? (
        <div className="p-16 text-center text-zinc-400 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#f4a7b9]" />
          <span>Abrindo cofre de segurança...</span>
        </div>
      ) : filteredCredentials.length === 0 ? (
        <div className="p-10 text-center rounded-2xl bg-[#14151b] border border-white/[0.06] space-y-3">
          <div className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-zinc-500">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-medium text-white block">
              {credentials.length === 0
                ? 'Seu cofre ainda está vazio'
                : 'Nenhuma credencial encontrada para este filtro'}
            </span>
            <span className="text-[11px] text-zinc-400 font-light block mt-1 max-w-md mx-auto">
              {credentials.length === 0
                ? 'Clique em um dos cartões de serviço acima ou no botão abaixo para guardar sua primeira senha com segurança.'
                : 'Tente limpar a busca ou selecionar a aba "Todas".'}
            </span>
          </div>
          {credentials.length === 0 && (
            <button
              type="button"
              onClick={() => handleOpenCreateModal()}
              className="h-8 px-4 rounded-lg bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-medium text-xs transition cursor-pointer inline-flex items-center gap-1.5 mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Cadastrar Primeira Senha</span>
            </button>
          )}
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
