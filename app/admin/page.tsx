'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Home,
  Image as ImageIcon,
  BookOpen,
  Share2,
  Mail,
  FolderOpen,
  Settings,
  CheckCircle2,
  Images,
  MessageSquarePlus,
  AlertTriangle,
  RefreshCw,
  ArrowUpCircle,
  X,
  CreditCard,
} from 'lucide-react';
import { SiteContent, LibraryImageItem } from '@/lib/types';
import {
  getDraftContent,
  saveDraftContent,
  publishContent,
  hasUnpublishedChanges,
  isSessionActive,
  checkServerSession,
  clearSession,
  fetchPublishedContentFromServer,
} from '@/lib/contentStore';
import { isLocalhost } from '@/lib/env';
import { AdminLogin } from '@/components/nua/admin/AdminLogin';
import { AdminHeader } from '@/components/nua/admin/AdminHeader';
import { HeroEditor } from '@/components/nua/admin/HeroEditor';
import { GalleryEditor } from '@/components/nua/admin/GalleryEditor';
import { AboutEditor } from '@/components/nua/admin/AboutEditor';
import { ChannelsEditor } from '@/components/nua/admin/ChannelsEditor';
import { ContactEditor } from '@/components/nua/admin/ContactEditor';
import { LibraryEditor } from '@/components/nua/admin/LibraryEditor';
import { SeoEditor } from '@/components/nua/admin/SeoEditor';
import { ClientRequestsEditor } from '@/components/nua/admin/ClientRequestsEditor';
import { NuaAiChatDrawer } from '@/components/nua/admin/NuaAiChatDrawer';
import { FinanceEditor } from '@/components/nua/admin/FinanceEditor';

type AdminTab =
  | 'hero'
  | 'gallery'
  | 'about'
  | 'channels'
  | 'contact'
  | 'library'
  | 'seo'
  | 'requests'
  | 'finance';

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('hero');
  const [hasUnpublished, setHasUnpublished] = useState(false);
  const [publishSuccessToast, setPublishSuccessToast] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictServerDate, setConflictServerDate] = useState<string | null>(null);
  const [isLocal, setIsLocal] = useState(false);

  const tabsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLocal(isLocalhost());
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('tab') === 'finance') {
        setActiveTab('finance');
      }
    }
  }, []);

  useEffect(() => {
    if (!tabsContainerRef.current) return;
    const activeEl = tabsContainerRef.current.querySelector<HTMLElement>('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeTab, content]);

  useEffect(() => {
    let mounted = true;

    if (isLocalhost()) {
      setAuthenticated(true);
      const draft = getDraftContent();
      setContent(draft);
      setHasUnpublished(hasUnpublishedChanges());
      // Tenta buscar atualizações do servidor se houver
      fetchPublishedContentFromServer().then((remote) => {
        if (remote && mounted) {
          localStorage.setItem('nua_published_content_v1', JSON.stringify(remote));
        }
      }).catch(() => {});
      return () => {
        mounted = false;
      };
    }

    checkServerSession().then(async (isAuth) => {
      if (!mounted) return;
      setAuthenticated(isAuth);
      if (isAuth) {
        try {
          const remote = await fetchPublishedContentFromServer();
          if (remote && mounted) {
            localStorage.setItem('nua_published_content_v1', JSON.stringify(remote));
            if (!hasUnpublishedChanges()) {
              localStorage.setItem('nua_draft_content_v1', JSON.stringify(remote));
            }
          }
        } catch {}
        if (!mounted) return;
        const draft = getDraftContent();
        setContent(draft);
        setHasUnpublished(hasUnpublishedChanges());
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleContentChange = (
    updated: SiteContent | ((prev: SiteContent) => SiteContent)
  ) => {
    setContent((prev) => {
      if (!prev) return prev;
      const next = typeof updated === 'function' ? updated(prev) : updated;
      saveDraftContent(next);
      return next;
    });
    setHasUnpublished(true);
  };

  const handleUploadNewImage = (img: LibraryImageItem) => {
    handleContentChange((prev) => {
      const existing = (prev.library || []).filter((i) => i.id !== img.id);
      return {
        ...prev,
        library: [img, ...existing],
      };
    });
  };

  const handlePublish = async (force: boolean | unknown = false) => {
    const isForce = force === true;
    if (!content || isPublishing) return;
    setIsPublishing(true);
    setPublishError(null);
    const result = await publishContent(content, { force: isForce });
    setIsPublishing(false);

    if (result.success) {
      setConflictModalOpen(false);
      setHasUnpublished(false);
      setPublishSuccessToast(true);
      setTimeout(() => setPublishSuccessToast(false), 3500);
      return;
    }

    if (result.conflict) {
      setConflictServerDate(result.serverUpdatedAt || null);
      setConflictModalOpen(true);
      return;
    }

    setPublishError(result.error || 'Não foi possível publicar. Tente novamente.');
    setTimeout(() => setPublishError(null), 7000);
    if (result.sessionExpired) {
      setAuthenticated(false);
    }
  };

  const handleReloadRemote = async () => {
    setIsPublishing(true);
    try {
      const remote = await fetchPublishedContentFromServer(true);
      if (remote) {
        localStorage.setItem('nua_published_content_v1', JSON.stringify(remote));
        localStorage.setItem('nua_draft_content_v1', JSON.stringify(remote));
        setContent(remote);
        setHasUnpublished(false);
        setConflictModalOpen(false);
        setPublishSuccessToast(true);
        setTimeout(() => setPublishSuccessToast(false), 3500);
      }
    } catch {}
    setIsPublishing(false);
  };

  const handleLogout = () => {
    clearSession();
    setAuthenticated(false);
  };

  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-zinc-400 text-sm">
        Abrindo seu painel...
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

  const tabs = [
    { id: 'hero' as AdminTab, label: 'Início & Capa', icon: Home },
    { id: 'library' as AdminTab, label: 'Biblioteca de Mídia', icon: Images },
    { id: 'gallery' as AdminTab, label: 'Galeria do Site', icon: ImageIcon },
    { id: 'about' as AdminTab, label: 'Sobre Mim', icon: BookOpen },
    { id: 'channels' as AdminTab, label: 'Redes & OnlyFans', icon: Share2 },
    { id: 'contact' as AdminTab, label: 'Contato', icon: Mail },
    { id: 'requests' as AdminTab, label: 'Meus Pedidos', icon: MessageSquarePlus },
    { id: 'finance' as AdminTab, label: 'Financeiro', icon: CreditCard },
    { id: 'seo' as AdminTab, label: 'Ajustes', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#f4a7b9] selection:text-black flex flex-col">
      {/* Admin Header */}
      <AdminHeader
        hasUnpublished={hasUnpublished}
        onPublish={() => handlePublish()}
        onLogout={handleLogout}
        isPublishing={isPublishing}
      />

      {/* Main Container */}
      <div className="max-w-[80rem] mx-auto px-4 sm:px-8 py-6 sm:py-8 w-full flex-1">
        {/* Welcome Greeting */}
        <div className="mb-6 sm:mb-8">
          <span className="text-[#f4a7b9] text-[11px] font-semibold tracking-[0.25em] uppercase block mb-1">
            PAINEL DO SEU SITE
          </span>
          <h1 className="font-serif text-2xl sm:text-4xl text-white font-normal">
            Olá, Nua Borges
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm font-light mt-1.5 max-w-2xl leading-relaxed">
            Aqui você atualiza o conteúdo do seu site com facilidade e autonomia. Escolha uma seção abaixo para editar textos, fotos e links. Suas mudanças são salvas em tempo real como rascunho.
          </p>
        </div>

        {/* Tab Navigation — Barra contínua elegante, sem corte de aba e responsiva */}
        <div
          ref={tabsContainerRef}
          className="flex items-center sm:flex-wrap gap-1.5 sm:gap-2 pb-3 mb-6 sm:mb-8 border-b border-zinc-800/80 overflow-x-auto sm:overflow-visible scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 select-none scroll-smooth"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-active={isActive ? 'true' : 'false'}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold tracking-wide whitespace-nowrap transition-all cursor-pointer min-h-[38px] shrink-0 ${
                  isActive
                    ? 'bg-[#f4a7b9] text-zinc-950 shadow-[0_2px_12px_rgba(244,167,185,0.25)]'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
          {/* Espaçador invisível para garantir respiro no fim do scroll em telas mobile */}
          <div className="w-4 shrink-0 sm:hidden" aria-hidden="true" />
        </div>

        {/* Tab Content */}
        <div className="pb-28 sm:pb-16">
          {activeTab === 'hero' && (
            <HeroEditor
              content={content}
              onChange={handleContentChange}
              onUploadNew={handleUploadNewImage}
            />
          )}

          {activeTab === 'gallery' && (
            <GalleryEditor
              content={content}
              onChange={handleContentChange}
              onUploadNew={handleUploadNewImage}
            />
          )}

          {activeTab === 'about' && (
            <AboutEditor
              content={content}
              onChange={handleContentChange}
              onUploadNew={handleUploadNewImage}
            />
          )}

          {activeTab === 'channels' && (
            <ChannelsEditor
              content={content}
              onChange={handleContentChange}
            />
          )}

          {activeTab === 'contact' && (
            <ContactEditor
              content={content}
              onChange={handleContentChange}
            />
          )}

          {activeTab === 'library' && (
            <LibraryEditor
              content={content}
              onChange={handleContentChange}
              onUploadNew={handleUploadNewImage}
            />
          )}

          {activeTab === 'seo' && (
            <SeoEditor
              content={content}
              onChange={handleContentChange}
              onUploadNew={handleUploadNewImage}
            />
          )}

          {activeTab === 'requests' && <ClientRequestsEditor />}

          {activeTab === 'finance' && <FinanceEditor />}
        </div>
      </div>

      {/* Mobile Sticky Bottom Publishing Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-[#09090c]/95 backdrop-blur-xl border-t border-zinc-800/90 p-3 sm:hidden shadow-2xl">
        <div className="flex flex-col gap-1.5">
          {hasUnpublished && (
            <span className="text-[10px] text-amber-300 text-center font-medium">
              ● Rascunho salvo no aparelho — toque para colocar no ar
            </span>
          )}
          <button
            type="button"
            onClick={() => handlePublish()}
            disabled={isPublishing}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-[#f4a7b9] active:bg-[#df8fa1] text-zinc-950 font-bold text-xs uppercase tracking-wider min-h-[44px] shadow-[0_2px_16px_rgba(244,167,185,0.3)] disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isPublishing ? 'Publicando...' : 'Publicar no Site'}</span>
          </button>
        </div>
      </div>

      {/* Floating Success Toast */}
      <AnimatePresence>
        {publishSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 bg-[#09090c] border border-emerald-500/40 rounded-2xl p-4 shadow-2xl flex items-center gap-3 text-emerald-400"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-semibold text-sm text-white block">
                ✓ Alterações publicadas no site!
              </span>
              <span className="text-zinc-400 text-xs font-light block">
                Seu site já está atualizado no ar para todos os visitantes.
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
            className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 max-w-sm bg-[#09090c] border border-red-500/40 rounded-2xl p-4 shadow-2xl"
          >
            <span className="font-semibold text-sm text-red-300 block">
              Não foi publicado
            </span>
            <span className="text-zinc-400 text-xs font-light block mt-0.5">{publishError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conflict Resolution Modal */}
      <AnimatePresence>
        {conflictModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0e0e13] border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.8)] relative text-left"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-serif text-xl text-white font-normal">
                    Conflito de Edição Detectado
                  </h3>
                  <p className="text-zinc-400 text-xs sm:text-sm mt-1 leading-relaxed">
                    Outro dispositivo ou navegador publicou alterações no site recentemente
                    {conflictServerDate ? ` (${new Date(conflictServerDate).toLocaleString('pt-BR')})` : ''}.
                  </p>
                </div>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 my-5 text-xs text-zinc-300 space-y-2">
                <p className="font-medium text-amber-200/90">
                  Como você deseja prosseguir?
                </p>
                <p className="text-zinc-400 leading-relaxed">
                  Para proteger os dados e não sobrescrever mudanças acidentalmente, você pode carregar o que está no servidor ou forçar a publicação do seu rascunho atual.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleReloadRemote}
                  disabled={isPublishing}
                  className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs sm:text-sm transition-all border border-zinc-700 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Carregar Versão Mais Recente do Servidor (Recomendado)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePublish(true)}
                  disabled={isPublishing}
                  className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium text-xs sm:text-sm transition-all border border-amber-500/40 cursor-pointer disabled:opacity-50"
                >
                  <ArrowUpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Sobrescrever com Meu Rascunho Atual (Forçar)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConflictModalOpen(false)}
                  disabled={isPublishing}
                  className="w-full text-center py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  Cancelar e continuar editando
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assistente Nua IA (Fixo no canto inferior direito, ativo exclusivamente em localhost por enquanto) */}
      {isLocal && <NuaAiChatDrawer />}
    </div>
  );
}
