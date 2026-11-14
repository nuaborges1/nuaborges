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
} from 'lucide-react';
import { SiteContent, LibraryImageItem, MediaAlbum } from '@/lib/types';
import { resolveMediaUrl, isMediaVideo, resolveVideoPlaySource } from '@/lib/media';
import { getMediaUsage, applyMediaToSection } from '@/lib/mediaUsage';
import { deleteStoredMedia } from '@/lib/contentStore';
import { useScrollLock } from '@/hooks/useScrollLock';
import { MediaViewerPreviewPane } from './viewer/MediaViewerPreviewPane';
import { MediaViewerSidebarDetails } from './viewer/MediaViewerSidebarDetails';
import { MediaViewerAlbumsManager } from './viewer/MediaViewerAlbumsManager';
import { MediaViewerActions } from './viewer/MediaViewerActions';

const EMPTY_ALBUMS: MediaAlbum[] = [];

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
  const [showAlbumMenu, setShowAlbumMenu] = useState(false);
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
  }, [item?.id]);

  useScrollLock(isOpen && !!item);

  // ESC to close
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
  const { videoUrl: playableVideoUrl, posterUrl: playablePosterUrl } = resolveVideoPlaySource(item);
  const displayUrl = isVideo ? playableVideoUrl : resolveMediaUrl(item.url, 'full');
  const usages = getMediaUsage(item, content);
  const albums = content.albums || EMPTY_ALBUMS;
  const currentAlbums = albums.filter((alb) => alb.mediaIds.includes(item.id));

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
      libItem.id === item.id ? { ...libItem, name: trimmed, customName: trimmed } : libItem
    );
    onChangeContent({ ...content, library: updatedLibrary });
    setIsEditingName(false);
    showNotification('Nome atualizado com sucesso');
  };

  const handleToggleAlbum = (albumId: string) => {
    const targetAlbum = albums.find((a) => a.id === albumId);
    if (!targetAlbum) return;

    const isMember = targetAlbum.mediaIds.includes(item.id);
    let updatedMediaIds: string[];

    if (isMember) {
      updatedMediaIds = targetAlbum.mediaIds.filter((id) => id !== item.id);
      showNotification(`Removida do álbum "${targetAlbum.name}"`);
    } else {
      updatedMediaIds = [...targetAlbum.mediaIds, item.id];
      showNotification(`Adicionada ao álbum "${targetAlbum.name}"`);
    }

    const updatedAlbums = albums.map((alb) =>
      alb.id === albumId ? { ...alb, mediaIds: updatedMediaIds } : alb
    );

    const updatedLibrary = content.library.map((libItem) => {
      if (libItem.id === item.id) {
        const existing = libItem.albumIds || [];
        const nextAlbumIds = isMember
          ? existing.filter((id) => id !== albumId)
          : [...existing, albumId];
        return { ...libItem, albumIds: nextAlbumIds };
      }
      return libItem;
    });

    onChangeContent({
      ...content,
      library: updatedLibrary,
      albums: updatedAlbums,
    });
  };

  const handleApplyToSection = (target: 'hero-first' | 'hero-add' | 'about' | 'gallery-add') => {
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

    const updatedLibrary = content.library.filter((img) => img.id !== item.id);

    const updatedAlbums = (content.albums || []).map((album) => ({
      ...album,
      mediaIds: album.mediaIds.filter((id) => id !== item.id),
      coverMediaId: album.coverMediaId === item.id ? undefined : album.coverMediaId,
      coverUrl: album.coverUrl === item.url ? undefined : album.coverUrl,
    }));

    let updatedHero = { ...content.hero };
    if (content.hero.photos.some((p) => p.imageUrl === item.url)) {
      updatedHero = {
        ...updatedHero,
        photos: updatedHero.photos.filter((p) => p.imageUrl !== item.url),
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
    if (updatedHero.logoUrl === item.url) {
      updatedHero.logoUrl = undefined;
      updatedHero.useLogo = false;
    }

    let updatedGallery = { ...content.gallery };
    if (content.gallery.photos.some((p) => p.imageUrl === item.url)) {
      updatedGallery = {
        ...updatedGallery,
        photos: updatedGallery.photos.filter((p) => p.imageUrl !== item.url),
      };
    }

    let updatedAbout = { ...content.about };
    if (content.about.photoUrl === item.url && updatedLibrary.length > 0) {
      updatedAbout = {
        ...updatedAbout,
        photoUrl: updatedLibrary[0].url,
      };
    }

    let updatedSeo = { ...content.seo };
    if (updatedSeo.ogImage === item.url) {
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
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 bg-black/90 backdrop-blur-xl overscroll-contain">
        <div className="absolute inset-0 -z-10" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-5xl bg-[#171821] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl flex flex-col lg:flex-row max-h-[94vh] overscroll-contain"
        >
          {/* Close Button Mobile/Desktop */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-lg bg-black/70 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
            aria-label="Fechar visualizador"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Left: Media Preview */}
          <MediaViewerPreviewPane
            item={item}
            isVideo={isVideo}
            displayUrl={displayUrl}
            playablePosterUrl={playablePosterUrl}
            videoError={videoError}
            setVideoError={setVideoError}
            imageError={imageError}
            setImageError={setImageError}
          />

          {/* Right: Info & Actions Sidebar */}
          <div className="w-full lg:w-[360px] border-t lg:border-t-0 lg:border-l border-white/[0.06] bg-[#14151b] p-4 sm:p-5 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              {/* Notification Toast */}
              <AnimatePresence>
                {actionNotice && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2"
                  >
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{actionNotice}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Title & Rename */}
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
                      title={item.name}
                    >
                      {item.name}
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        setEditedName(item.name);
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
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUseMenu(!showUseMenu)}
                  className="w-full inline-flex items-center justify-between h-8 px-4 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold text-xs transition-all cursor-pointer shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Usar no Site</span>
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
                      <span>Adicionar à Galeria de Ensaios</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                    </button>
                  </div>
                )}
              </div>

              {/* Status "Em Uso no Site" & Technical Details */}
              <MediaViewerSidebarDetails
                item={item}
                usages={usages}
                formattedSize={formattedSize}
              />

              {/* Albums Section */}
              <MediaViewerAlbumsManager
                itemId={item.id}
                albums={albums}
                currentAlbums={currentAlbums}
                showAlbumMenu={showAlbumMenu}
                setShowAlbumMenu={setShowAlbumMenu}
                onToggleAlbum={handleToggleAlbum}
              />
            </div>

            {/* Bottom Actions: Favorite, Copy, Delete */}
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
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
