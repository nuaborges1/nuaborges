'use client';

import React, { useState, useEffect } from 'react';
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
import { AdminLogin } from '@/components/admin/AdminLogin';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { HeroEditor } from '@/components/admin/HeroEditor';
import { GalleryEditor } from '@/components/admin/GalleryEditor';
import { AboutEditor } from '@/components/admin/AboutEditor';
import { ChannelsEditor } from '@/components/admin/ChannelsEditor';
import { ContactEditor } from '@/components/admin/ContactEditor';
import { LibraryEditor } from '@/components/admin/LibraryEditor';
import { SeoEditor } from '@/components/admin/SeoEditor';

type AdminTab =
  | 'hero'
  | 'gallery'
  | 'about'
  | 'channels'
  | 'contact'
  | 'library'
  | 'seo';

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('hero');
  const [hasUnpublished, setHasUnpublished] = useState(false);
  const [publishSuccessToast, setPublishSuccessToast] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (typeof document !== 'undefined') {
      document.cookie = 'nua_admin_bypass=1; path=/; max-age=31536000; SameSite=Lax';
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

  const handlePublish = () => {
    if (!content) return;
    setIsPublishing(true);
    publishContent(content);
    setHasUnpublished(false);
    setIsPublishing(false);
    setPublishSuccessToast(true);
    setTimeout(() => setPublishSuccessToast(false), 3500);
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
    { id: 'seo' as AdminTab, label: 'Ajustes', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#f4a7b9] selection:text-black flex flex-col">
      {/* Admin Header */}
      <AdminHeader
        hasUnpublished={hasUnpublished}
        onPublish={handlePublish}
        onLogout={handleLogout}
        isPublishing={isPublishing}
      />

      {/* Main Container */}
      <div className="max-w-[76rem] mx-auto px-4 sm:px-8 py-6 sm:py-8 w-full flex-1">
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

        {/* Tab Navigation — Quebra suave no desktop, scroll fluido no touch */}
        <div className="flex items-center sm:flex-wrap gap-2 pb-3 mb-6 sm:mb-8 border-b border-zinc-800/80 overflow-x-auto sm:overflow-visible scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-full text-xs font-semibold tracking-wide whitespace-nowrap transition-all cursor-pointer min-h-[44px] shrink-0 ${
                  isActive
                    ? 'bg-[#f4a7b9] text-zinc-950 shadow-[0_2px_12px_rgba(244,167,185,0.25)]'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
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
        </div>
      </div>

      {/* Mobile Sticky Bottom Publishing Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-[#09090c]/95 backdrop-blur-xl border-t border-zinc-800/90 p-3 sm:hidden shadow-2xl">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-full bg-[#f4a7b9] active:bg-[#df8fa1] text-zinc-950 font-bold text-xs uppercase tracking-wider min-h-[46px] shadow-[0_2px_16px_rgba(244,167,185,0.3)] disabled:opacity-50 cursor-pointer"
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
    </div>
  );
}
