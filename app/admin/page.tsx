/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';
import { AdminOrderNotificationsProvider } from '@/hooks/useAdminOrderNotifications';
import {
  getDraftContent,
  hasUnpublishedChanges,
  fetchPublishedContentFromServer,
  mergePublishedIntoDraft,
} from '@/lib/contentStore';
import { AdminLogin } from '@/components/nua/admin/AdminLogin';
import { AdminSidebar } from '@/components/nua/admin/AdminSidebar';
import { AdminFloatingSaveBar } from '@/components/nua/admin/ui/AdminFloatingSaveBar';
import { AdminShellSkeleton } from '@/components/nua/admin/ui/AdminSkeleton';

const NuaAiChatDrawer = dynamic(
  () => import('@/components/nua/admin/NuaAiChatDrawer').then((m) => m.NuaAiChatDrawer),
  { ssr: false }
);
const NuaSpotlightModal = dynamic(
  () => import('@/components/nua/admin/NuaSpotlightModal').then((m) => m.NuaSpotlightModal),
  { ssr: false }
);
import {
  AdminTab,
  AdminModuleId,
  ModuleBadgeInfo,
  MODULE_METADATA,
} from './components/types';
import { AdminHeader } from './components/AdminHeader';
import { AdminModuleRouter } from './components/AdminModuleRouter';
import { useAdminShell } from './components/useAdminShell';
import { DailyBriefingModal, useDailyBriefing } from '@/components/nua/admin/briefing';

export type { AdminTab, AdminModuleId, ModuleBadgeInfo };

export default function AdminPage() {
  const {
    authenticated,
    setAuthenticated,
    adminProfile,
    nuaPresence,
    refreshAdminSessionInfo,
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
    mailInitialSearch,
    customerInitialSearch,
    subscriptionStatus,
    hasUnpublished,
    setHasUnpublished,
    publishSuccessToast,
    publishError,
    setPublishError,
    isPublishing,
    isLocal,
    notifications,
    orders,
    unreadCount,
    badges,
    showPermissionBanner,
    requestWindowsPermission,
    dismissPermissionBanner,
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

  const {
    isOpen: isBriefingOpen,
    handleDismiss: handleDismissBriefing,
    metrics: briefingMetrics,
  } = useDailyBriefing({
    orders,
    content,
    subscriptionStatus,
  });

  if (authenticated === null || (authenticated === true && (!content || isContentLoading))) {
    return <AdminShellSkeleton activeModule={activeModule} />;
  }

  if (!authenticated) {
    return (
      <AdminLogin
        onSuccess={async () => {
          setAuthenticated(true);
          refreshAdminSessionInfo().catch(() => {});
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
    <AdminOrderNotificationsProvider value={notifications}>
    <div className="admin-shell fixed inset-0 h-dvh w-screen overflow-hidden bg-[#0c0d12] text-white selection:bg-[#843C52] selection:text-white flex flex-col font-sans">
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
          adminProfile={adminProfile}
          onNewContent={() => handleSelectModule('conteudos', 'new_pack')}
          onLogout={handleLogout}
          isMobileOpen={isMobileNavOpen}
          onToggleMobile={() => setIsMobileNavOpen((prev) => !prev)}
          onCloseMobile={() => setIsMobileNavOpen(false)}
        />

        {/* Área de Trabalho Central — Com folga inferior para o dock da Nay e barra de publicação */}
        <main
          id="admin-main-scroll"
          className="flex-1 min-w-0 bg-[#0c0d12] px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-24 overflow-y-auto overflow-x-hidden overscroll-contain"
        >
          <div className="max-w-[1600px] mx-auto w-full">
            {showPermissionBanner && (
              <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-[#14161f] border border-[#843C52]/35 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-[#843C52]/20 border border-[#843C52]/40 flex items-center justify-center text-[#c97a8d] shrink-0">
                    <Bell className="w-3.5 h-3.5" />
                  </span>
                  <p className="text-zinc-300 font-light">
                    Receba avisos imediatos no computador quando chegar um novo pedido, mesmo trabalhando em outra aba.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void requestWindowsPermission()}
                    className="h-7 px-3 rounded-full bg-[#843C52] hover:bg-[#992b4a] text-white font-semibold text-[11px] transition-colors cursor-pointer"
                  >
                    Ativar notificações
                  </button>
                  <button
                    type="button"
                    onClick={dismissPermissionBanner}
                    aria-label="Dispensar aviso de notificações"
                    className="w-7 h-7 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
            <AdminModuleRouter
              activeModule={activeModule}
              adminProfile={adminProfile}
              subAction={subAction}
              mailInitialSearch={mailInitialSearch}
              customerInitialSearch={customerInitialSearch}
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
            className={`fixed top-16 right-4 sm:right-6 z-50 max-w-sm rounded-xl p-3.5 shadow-2xl text-xs flex items-center justify-between gap-3 border ${
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
            className="fixed top-16 right-4 sm:right-6 z-50 max-w-sm bg-[#171821] border border-red-500/40 rounded-xl p-3.5 shadow-2xl text-xs flex items-start justify-between gap-3"
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

      {/* Toast discreto de presença da Nua — exclusivo do perfil PHDEV */}
      <AnimatePresence>
        {adminProfile === 'phdev' && nuaPresence?.online && (
          <motion.div
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            className="fixed bottom-4 left-4 lg:left-[15.75rem] z-40 pointer-events-none rounded-xl bg-[#12141c]/95 backdrop-blur-md border border-emerald-500/25 px-3 py-2 shadow-xl flex items-center gap-2 text-[11px] text-zinc-200"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="font-medium text-white">Nua online</span>
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-300 truncate max-w-[180px]">
              {nuaPresence.moduleLabel || 'Painel'}
            </span>
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

      {/* Assistente Nay — protegido pela sessão administrativa e pela configuração da IA */}
      {content?.adminUi?.aiEnabled !== false && (
        <NuaAiChatDrawer
          activeTab={activeModule}
          tabs={Object.entries(MODULE_METADATA)
            .filter(([id]) => id !== 'seo' && id !== 'beta_ia')
            .map(([id, meta]) => ({
              id,
              label: meta.label,
              description: meta.desc,
            }))}
          content={content}
          library={content?.library || []}
          albums={content?.albums || []}
          onUploadNew={handleUploadNewImage}
          onSelectTab={(tabId) => handleSelectModule(tabId as AdminModuleId)}
        />
      )}

      {/* Modal de Briefing Diário Matinal da Secretária Nay */}
      <DailyBriefingModal
        isOpen={isBriefingOpen}
        onDismiss={handleDismissBriefing}
        metrics={briefingMetrics}
        onNavigateToModule={(mod) => handleSelectModule(mod as AdminModuleId)}
        onOpenAiChat={() => window.dispatchEvent(new CustomEvent('open_nua_ai'))}
      />
    </div>
    </AdminOrderNotificationsProvider>
  );
}
