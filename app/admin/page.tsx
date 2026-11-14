'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
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

  const configuredMeta = content.adminUi?.modules.find((module) => module.id === activeModule);
  const currentMeta = configuredMeta || MODULE_METADATA[activeModule] || MODULE_METADATA.conteudos;

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

      {/* Corpo Principal (Sidebar + Mesa de Trabalho Elevada) */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar Vertical Persistente */}
        <AdminSidebar
          activeModule={activeModule}
          content={content}
          onSelectModule={handleSelectModule}
          badges={badges}
          onNewContent={() => handleSelectModule('conteudos')}
          onLogout={handleLogout}
          isMobileOpen={isMobileNavOpen}
          onToggleMobile={() => setIsMobileNavOpen((prev) => !prev)}
          onCloseMobile={() => setIsMobileNavOpen(false)}
        />

        {/* Mesa de Trabalho Central no estilo Yahoo Mail Card Panel */}
        <main className="flex-1 min-w-0 bg-[#0c0d12] p-3 sm:p-4 lg:p-5 overflow-y-auto">
          <div className="w-full rounded-2xl bg-[#14151b] border border-white/[0.06] shadow-xl flex flex-col min-h-full overflow-hidden">
            {/* Barra de Título / Breadcrumb da Mesa de Trabalho */}
            <div className="min-h-11 px-5 py-2.5 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 bg-[#171821] shrink-0">
              <div className="flex items-center gap-2 text-xs min-w-0">
                <span className="font-mono uppercase tracking-wider text-[10px] text-zinc-500">
                  {currentMeta.group}
                </span>
                <ChevronRight className="w-3 h-3 text-zinc-600" />
                <h1 className="font-medium text-white tracking-wide text-sm sm:text-base truncate">
                  {currentMeta.label}
                </h1>
              </div>

              <span className="text-[11px] text-zinc-400 font-light sm:text-right">
                {('desc' in currentMeta ? currentMeta.desc : currentMeta.description)}
              </span>
            </div>

            {/* Conteúdo Dinâmico do Módulo */}
            <div className="p-4 sm:p-6 lg:p-7 flex-1">
              <AdminModuleRouter
                activeModule={activeModule}
                content={content}
                searchQuery={searchQuery}
                onContentChange={handleContentChange}
                onUploadNewImage={handleUploadNewImage}
                onSelectModule={handleSelectModule}
              />
            </div>
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
            className="fixed bottom-6 right-6 z-50 max-w-sm bg-[#171821] border border-red-500/40 rounded-xl p-3.5 shadow-2xl text-xs"
          >
            <span className="font-semibold text-red-300 block">
              Não foi possível publicar
            </span>
            <span className="text-zinc-400 text-[11px] font-light block mt-0.5">{publishError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assistente Nua IA — protegido pela sessão administrativa e pela configuração da IA */}
      {content?.adminUi?.aiEnabled !== false && (
        <NuaAiChatDrawer
          activeTab={activeModule}
          tabs={Object.entries(MODULE_METADATA)
            .filter(([id]) => id !== 'seo')
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
