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
  fetchPublishedContentFromServer,
  mergePublishedIntoDraft,
} from '@/lib/contentStore';
import {
  AdminLogin,
  AdminSidebar,
  NuaAiChatDrawer,
  NuaSpotlightModal,
  AdminFloatingSaveBar,
  AdminShellSkeleton,
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
    isContentLoading,
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
    modifiedSections,
    modifiedModuleIds,
    isEditingSubView,
    subViewWarning,
    handleNavigateToModule,
    handleDiscardDraft,
    handleContentChange,
    handleAdministrativeChange,
    adminNotice,
    setAdminNotice,
    handleUploadNewImage,
    handlePublish,
    handleLogout,
  } = useAdminShell();

  if (authenticated === null || (authenticated === true && (!content || isContentLoading))) {
    return <AdminShellSkeleton activeModule={activeModule} />;
  }

  if (!authenticated) {
    return (
      <AdminLogin
        onSuccess={async () => {
          setAuthenticated(true);
          try {
            const remote = await fetchPublishedContentFromServer(true);
            if (remote) {
              localStorage.setItem('nua_published_content_v1', JSON.stringify(remote));
              const merged = mergePublishedIntoDraft(getDraftContent(), remote);
              setContent(merged);
              setHasUnpublished(hasUnpublishedChanges());
              return;
            }
          } catch {}
          const draft = getDraftContent();
          setContent(draft);
          setHasUnpublished(hasUnpublishedChanges());
        }}
      />
    );
  }

  if (!content) return <AdminShellSkeleton activeModule={activeModule} />;

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
        hasUnpublished={hasUnpublished}
        isPublishing={isPublishing}
        isEditingSubView={isEditingSubView}
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
          modifiedModuleIds={modifiedModuleIds}
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
              onAdministrativeChange={handleAdministrativeChange}
              onUploadNewImage={handleUploadNewImage}
              onSelectModule={handleSelectModule}
            />
          </div>
        </main>
      </div>

      {/* Spotlight Inteligente da Nua (Command Center & Busca com IA) */}
      <NuaSpotlightModal
        isOpen={isSpotlightOpen}
        onClose={() => setIsSpotlightOpen(false)}
        onNavigate={handleSelectModule}
        content={content}
      />

      {/* Toast discreto de feedback para operações administrativas imediatas */}
      <AnimatePresence>
        {adminNotice && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-xl p-3.5 shadow-2xl text-xs flex items-center justify-between gap-3 border ${
              adminNotice.type === 'error'
                ? 'bg-[#171821] border-red-500/40 text-red-200'
                : 'bg-[#12141c]/95 backdrop-blur-md border-emerald-500/30 text-emerald-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {adminNotice.type === 'error' ? (
                <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span className="text-[12px] font-medium text-zinc-200">
                {adminNotice.message}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAdminNotice(null)}
              aria-label="Fechar notificação"
              className="text-zinc-400 hover:text-white transition-colors p-1 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
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

      {/* Barra Flutuante Unificada de Salvamento e Publicação */}
      <AdminFloatingSaveBar
        hasUnpublished={hasUnpublished}
        isPublishing={isPublishing}
        modifiedSections={modifiedSections}
        isEditingSubView={isEditingSubView}
        subViewWarning={subViewWarning}
        onPublish={handlePublish}
        onDiscard={handleDiscardDraft}
        onNavigateToModule={handleNavigateToModule}
        publishSuccess={publishSuccessToast}
        publishError={publishError}
      />

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
