'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Edit2,
  Check,
  Globe,
  ChevronDown,
  ArrowRight,
  Film,
  Image as ImageIcon,
  Layers,
} from 'lucide-react';
import { SiteContent, LibraryImageItem } from '@/lib/types';
import { resolveMediaUrl, isMediaVideo, resolveVideoPlaySource } from '@/lib/media';
import { getMediaUsage, applyMediaToSection } from '@/lib/mediaUsage';
import { deleteStoredMedia } from '@/lib/contentStore';
import { useScrollLock } from '@/hooks/useScrollLock';
import { HelpTriggerButton } from './help/HelpTriggerButton';
import { MediaViewerSidebarDetails } from './viewer/MediaViewerSidebarDetails';
import { MediaViewerActions } from './viewer/MediaViewerActions';

interface MediaViewerModalProps {
  isOpen: boolean;
  item: LibraryImageItem | null;
  content: SiteContent;
  onChangeContent: (updated: SiteContent) => void;
  onClose: () => void;
}

export function MediaViewerModal({
  isOpen,
  item,
  content,
  onChangeContent,
  onClose,
}: MediaViewerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showUseMenu, setShowUseMenu] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setVideoError(false);
    setImageError(false);
    setIsEditingName(false);
    setShowDeleteConfirm(false);
  }, [item?.id]);

  useScrollLock(isOpen && !!item);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !item || !mounted) return null;

  const isVideo = isMediaVideo(item);
  const { videoUrl: playableVideoUrl, posterUrl: playablePosterUrl } =
    resolveVideoPlaySource(item);
  const displayUrl = isVideo ? playableVideoUrl : resolveMediaUrl(item.url, 'full');
  const usages = getMediaUsage(item, content);
  const aliasSet = new Set<string>(
    [item.url, ...(item.aliasUrls || [])].filter(Boolean)
  );

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleToggleFavorite = () => {
    const isFav = !item.favorite;
    const updatedLibrary = content.library.map((libItem) =>
      libItem.id === item.id ? { ...libItem, favorite: isFav } : libItem
    );
    onChangeContent({ ...content, library: updatedLibrary });
    showNotification(isFav ? 'Marcada como favorita' : 'Removida dos favoritos');
  };

  const handleSaveRename = () => {
    const trimmed = editedName.trim();
    if (!trimmed) {
      setIsEditingName(false);
      return;
    }
    const updatedLibrary = content.library.map((libItem) =>
      libItem.id === item.id
        ? { ...libItem, name: trimmed, customName: trimmed }
        : libItem
    );
    onChangeContent({ ...content, library: updatedLibrary });
    setIsEditingName(false);
    showNotification('Nome atualizado com sucesso');
  };

  const handleApplyToSection = (
    target: 'hero-first' | 'hero-add' | 'about' | 'gallery-add'
  ) => {
    const { updatedContent, message } = applyMediaToSection(item, target, content);
    onChangeContent(updatedContent);
    setShowUseMenu(false);
    showNotification(message);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(displayUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleConfirmDelete = () => {
    deleteStoredMedia(item).catch((err) =>
      console.warn('[MediaViewerModal] Erro ao excluir do storage:', err)
    );

    const updatedLibrary = content.library.filter(
      (img) => img.id !== item.id && !aliasSet.has(img.url)
    );

    const updatedAlbums = (content.albums || []).map((album) => ({
      ...album,
      mediaIds: album.mediaIds.filter((id) => id !== item.id),
      coverMediaId: album.coverMediaId === item.id ? undefined : album.coverMediaId,
      coverUrl:
        album.coverUrl && aliasSet.has(album.coverUrl) ? undefined : album.coverUrl,
    }));

    let updatedHero = { ...content.hero };
    if (content.hero.photos.some((p) => aliasSet.has(p.imageUrl))) {
      updatedHero = {
        ...updatedHero,
        photos: updatedHero.photos.filter((p) => !aliasSet.has(p.imageUrl)),
      };
      if (updatedHero.photos.length === 0 && updatedLibrary.length > 0) {
        updatedHero.photos = [
          {
            id: 'hero-auto',
            title: 'Nua Borges',
            session: '01',
            imageUrl: updatedLibrary[0].url,
          },
        ];
      }
    }
    if (updatedHero.logoUrl && aliasSet.has(updatedHero.logoUrl)) {
      updatedHero.logoUrl = undefined;
      updatedHero.useLogo = false;
    }

    let updatedGallery = { ...content.gallery };
    if (content.gallery.photos.some((p) => aliasSet.has(p.imageUrl))) {
      updatedGallery = {
        ...updatedGallery,
        photos: updatedGallery.photos.filter((p) => !aliasSet.has(p.imageUrl)),
      };
    }

    let updatedAbout = { ...content.about };
    if (content.about.photoUrl && aliasSet.has(content.about.photoUrl) && updatedLibrary.length > 0) {
      updatedAbout = {
        ...updatedAbout,
        photoUrl: updatedLibrary[0].url,
      };
    }

    let updatedSeo = { ...content.seo };
    if (updatedSeo.ogImage && aliasSet.has(updatedSeo.ogImage)) {
      updatedSeo.ogImage = updatedLibrary.length > 0 ? updatedLibrary[0].url : '';
    }

    onChangeContent({
      ...content,
      library: updatedLibrary,
      albums: updatedAlbums,
      hero: updatedHero,
      gallery: updatedGallery,
      about: updatedAbout,
      seo: updatedSeo,
    });

    onClose();
  };

  const formattedSize = item.sizeBytes
    ? `${Math.round(item.sizeBytes / 1024)} KB`
    : 'Otimizado';

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[150] flex justify-end bg-black/65 backdrop-blur-[2px] overscroll-contain"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Detalhes da mídia"
      >
        <motion.aside
          initial={{ x: '100%', opacity: 0.6 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0.6 }}
          transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md sm:max-w-[460px] h-full bg-[#13151c] border-l border-white/[0.08] shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.07] bg-[#161821] shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {isVideo ? (
                <Film className="w-4 h-4 text-[#f4a7b9] shrink-0" />
              ) : (
                <ImageIcon className="w-4 h-4 text-[#f4a7b9] shrink-0" />
              )}
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300 truncate">
                Detalhes da Mídia
              </span>
              <HelpTriggerButton helpId="midias_visualizador" compact />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/[0.08]"
              aria-label="Fechar painel de detalhes"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Notification Toast */}
            <AnimatePresence>
              {actionNotice && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2"
                >
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{actionNotice}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Enlarged Media Preview */}
            <div className="relative w-full rounded-xl overflow-hidden bg-black border border-white/[0.08] flex items-center justify-center max-h-[340px]">
              {isVideo ? (
                !videoError && displayUrl ? (
                  <video
                    src={displayUrl}
                    poster={playablePosterUrl || undefined}
                    controls
                    playsInline
                    onError={() => setVideoError(true)}
                    className="w-full max-h-[340px] object-contain"
                  />
                ) : (
                  <div className="py-12 px-4 text-center text-xs text-zinc-400">
                    Prévia de vídeo indisponível neste dispositivo.
                  </div>
                )
              ) : !imageError && displayUrl ? (
                <img
                  src={displayUrl}
                  alt={item.customName || item.name}
                  onError={() => setImageError(true)}
                  className="w-full max-h-[340px] object-contain"
                />
              ) : (
                <div className="py-12 px-4 text-center text-xs text-zinc-400">
                  Imagem indisponível.
                </div>
              )}
            </div>

            {/* Deduplication Consolidation Info (if merged) */}
            {aliasSet.size > 1 && (
              <div className="rounded-xl bg-[#f4a7b9]/10 border border-[#f4a7b9]/25 px-3.5 py-2.5 flex items-start gap-2.5">
                <Layers className="w-4 h-4 text-[#f4a7b9] shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-200 leading-relaxed">
                  <span className="font-semibold text-[#f4a7b9] block">
                    Arquivo consolidado sem duplicação
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Esta imagem unifica {aliasSet.size} referências idênticas do site em um único item da biblioteca.
                  </span>
                </div>
              </div>
            )}

            {/* Title & Inline Rename */}
            <div>
              <span className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider block mb-1">
                Nome da Mídia
              </span>
              {isEditingName ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Nome amigável..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename();
                      if (e.key === 'Escape') setIsEditingName(false);
                    }}
                    className="flex-1 bg-[#0e0f14] border border-[#f4a7b9] rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveRename}
                    className="h-8 px-2.5 rounded-lg bg-[#f4a7b9] text-zinc-950 font-semibold hover:bg-[#ffb8c9] transition-colors cursor-pointer"
                    title="Salvar nome"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    className="h-8 px-2.5 rounded-lg bg-white/[0.06] text-zinc-400 hover:text-white transition-colors cursor-pointer border border-white/10"
                    title="Cancelar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <h2
                    className="text-sm sm:text-base text-white font-medium truncate"
                    title={item.customName || item.name}
                  >
                    {item.customName || item.name}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setEditedName(item.customName || item.name);
                      setIsEditingName(true);
                    }}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-[#f4a7b9] hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0"
                    title="Renomear mídia"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Primary Action: Usar no Site */}
            {!isVideo && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUseMenu(!showUseMenu)}
                  className="w-full inline-flex items-center justify-between h-9 px-4 rounded-xl bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold text-xs transition-all cursor-pointer shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Aplicar em uma seção do site</span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      showUseMenu ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {showUseMenu && (
                  <div className="mt-2 p-1.5 rounded-xl bg-[#171821] border border-white/[0.08] shadow-xl space-y-1">
                    <button
                      type="button"
                      onClick={() => handleApplyToSection('hero-first')}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/[0.06] text-xs text-white flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>Definir como Foto Principal da Capa</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyToSection('hero-add')}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/[0.06] text-xs text-white flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>Adicionar ao Carrossel da Capa</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyToSection('about')}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/[0.06] text-xs text-white flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>Definir como Retrato do Sobre Mim</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyToSection('gallery-add')}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/[0.06] text-xs text-white flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>Adicionar à Galeria de Fotos</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Status "Em Uso no Site" & Technical Details */}
            <MediaViewerSidebarDetails
              item={item}
              usages={usages}
              formattedSize={formattedSize}
            />
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-4 border-t border-white/[0.07] bg-[#161821] shrink-0">
            <MediaViewerActions
              isFavorite={Boolean(item.favorite)}
              copiedLink={copiedLink}
              showDeleteConfirm={showDeleteConfirm}
              usages={usages}
              onToggleFavorite={handleToggleFavorite}
              onCopyLink={handleCopyLink}
              onOpenDeleteConfirm={() => setShowDeleteConfirm(true)}
              onCancelDeleteConfirm={() => setShowDeleteConfirm(false)}
              onConfirmDelete={handleConfirmDelete}
            />
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>,
    document.body
  );
}
