'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';
import {
  getDraftContent,
  hasUnpublishedChanges,
} from '@/lib/contentStore';
import {
  AdminLogin,
  AdminSidebar,
  PreviewModal,
  NuaAiChatDrawer,
  NuaSpotlightModal,
} from '@/components/nua/admin';
import {
  AdminTab,
  AdminModuleId,
  ModuleBadgeInfo,
  MODULE_METADATA,
} from './components/types';
import { AdminHeader } from './components/AdminHeader';
import { AdminModuleRouter } from './components/AdminModuleRouter';
import { useAdminShell } from './components/useAdminShell';

export type { AdminTab, AdminModuleId, ModuleBadgeInfo };

export default function AdminPage() {
  const {
    authenticated,
    setAuthenticated,
    content,
    setContent,
    activeModule,
    subAction,
    handleSelectModule,
    isMobileNavOpen,
    setIsMobileNavOpen,
    isSpotlightOpen,
    setIsSpotlightOpen,
    searchQuery,
    isPreviewOpen,
    setIsPreviewOpen,
    subscriptionStatus,
    hasUnpublished,
    setHasUnpublished,
    publishSuccessToast,
    publishError,
    setPublishError,
    isPublishing,
    isLocal,
    orders,
    unreadCount,
    badges,
    handleContentChange,
    handleUploadNewImage,
    handlePublish,
    handleLogout,
  } = useAdminShell();

  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-[#0c0d12] flex items-center justify-center text-zinc-400 text-sm">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-[#f4a7b9] animate-spin" />
          <span>Iniciando Painel NUA Borges...</span>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <AdminLogin
        onSuccess={() => {
          setAuthenticated(true);
          const draft = getDraftContent();
          setContent(draft);
          setHasUnpublished(hasUnpublishedChanges());
        }}
      />
    );
  }

  if (!content) return null;

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-[#0c0d12] text-white selection:bg-[#f4a7b9] selection:text-black flex flex-col font-sans">
      {/* Barra de Navegação Superior Global */}
      <AdminHeader
        isMobileNavOpen={isMobileNavOpen}
        onToggleMobileNav={() => setIsMobileNavOpen((prev) => !prev)}
        onOpenSpotlight={() => setIsSpotlightOpen(true)}
        activeModule={activeModule}
        onSelectModule={handleSelectModule}
        subscriptionStatus={subscriptionStatus}
        unreadCount={unreadCount}
        onOpenPreview={() => setIsPreviewOpen(true)}
        hasUnpublished={hasUnpublished}
        isPublishing={isPublishing}
        onPublish={handlePublish}
      />

      {/* Corpo Principal (Sidebar + Área de Trabalho Limpa) */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar Vertical Persistente */}
        <AdminSidebar
          activeModule={activeModule}
          content={content}
          onSelectModule={handleSelectModule}
          badges={badges}
          subscriptionStatus={subscriptionStatus}
          isLocal={isLocal}
          onNewContent={() => handleSelectModule('conteudos', 'new_pack')}
          onLogout={handleLogout}
          isMobileOpen={isMobileNavOpen}
          onToggleMobile={() => setIsMobileNavOpen((prev) => !prev)}
          onCloseMobile={() => setIsMobileNavOpen(false)}
        />

        {/* Área de Trabalho Central — Sem container redundante nem cabeçalho duplicado */}
        <main className="flex-1 min-w-0 bg-[#0c0d12] px-4 sm:px-6 lg:px-8 py-5 sm:py-6 overflow-y-auto overflow-x-hidden">
          <div className="max-w-[1600px] mx-auto w-full">
            <AdminModuleRouter
              activeModule={activeModule}
              subAction={subAction}
              content={content}
              searchQuery={searchQuery}
              ordersFeed={orders}
              unreadCount={unreadCount}
              hasUnpublished={hasUnpublished}
              isPublishing={isPublishing}
              subscriptionStatus={subscriptionStatus}
              onPublish={handlePublish}
              onContentChange={handleContentChange}
              onUploadNewImage={handleUploadNewImage}
              onSelectModule={handleSelectModule}
            />
          </div>
        </main>
      </div>

      {/* Modal de Prévia em Tempo Real */}
      {content && (
        <PreviewModal
          isOpen={isPreviewOpen}
          content={content}
          onPublish={() => {
            setIsPreviewOpen(false);
            handlePublish();
          }}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}

      {/* Spotlight Inteligente da Nua (Command Center & Busca com IA) */}
      <NuaSpotlightModal
        isOpen={isSpotlightOpen}
        onClose={() => setIsSpotlightOpen(false)}
        onNavigate={handleSelectModule}
        content={content}
      />

      {/* Floating Success Toast */}
      <AnimatePresence>
        {publishSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-[#171821] border border-emerald-500/40 rounded-xl p-3.5 shadow-2xl flex items-center gap-3 text-emerald-400 text-xs"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="font-medium text-white block">
                Alterações publicadas com sucesso
              </span>
              <span className="text-zinc-400 text-[11px] font-light block">
                O site público já está atualizado.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Error Toast */}
      <AnimatePresence>
        {publishError && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm bg-[#171821] border border-red-500/40 rounded-xl p-3.5 shadow-2xl text-xs flex items-start justify-between gap-3"
          >
            <div>
              <span className="font-semibold text-red-300 block">
                Não foi possível publicar
              </span>
              <span className="text-zinc-400 text-[11px] font-light block mt-0.5">{publishError}</span>
            </div>
            <button
              type="button"
              onClick={() => setPublishError(null)}
              aria-label="Fechar alerta"
              className="text-zinc-400 hover:text-white transition-colors p-1 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assistente Nua IA — protegido pela sessão administrativa e pela configuração da IA */}
      {content?.adminUi?.aiEnabled !== false && (
        <NuaAiChatDrawer
          activeTab={activeModule}
          tabs={Object.entries(MODULE_METADATA)
            .filter(([id]) => id !== 'seo' && id !== 'cofre')
            .map(([id, meta]) => ({
              id,
              label: meta.label,
              description: meta.desc,
            }))}
          library={content?.library || []}
          albums={content?.albums || []}
          onUploadNew={handleUploadNewImage}
          onSelectTab={(tabId) => handleSelectModule(tabId as AdminModuleId)}
        />
      )}
    </div>
  );
}
