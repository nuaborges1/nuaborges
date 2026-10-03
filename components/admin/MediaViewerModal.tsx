'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Heart,
  Trash2,
  Edit2,
  Check,
  Film,
  CheckCircle2,
  FolderPlus,
  Globe,
  Calendar,
  Copy,
  AlertTriangle,
  Folder,
  ChevronDown,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { SiteContent, LibraryImageItem, MediaAlbum } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';
import { getMediaUsage, applyMediaToSection } from '@/lib/mediaUsage';
import { deleteStoredMedia } from '@/lib/contentStore';

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

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !item || !mounted) return null;

  const displayUrl = resolveMediaUrl(item.url);
  const usages = getMediaUsage(item, content);
  const albums = content.albums || [];
  const currentAlbums = albums.filter((alb) => alb.mediaIds.includes(item.id));

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Toggle Favorite
  const handleToggleFavorite = () => {
    const isFav = !item.favorite;
    const updatedLibrary = content.library.map((libItem) =>
      libItem.id === item.id ? { ...libItem, favorite: isFav } : libItem
    );
    onChangeContent({ ...content, library: updatedLibrary });
    showNotification(isFav ? 'Marcada como favorita' : 'Removida dos favoritos');
  };

  // Save Renamed
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

  // Add/Remove from Album
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

    // Also update albumIds on the item for fast bidirectional reference
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

  // Apply to Site Section
  const handleApplyToSection = (target: 'hero-first' | 'hero-add' | 'about' | 'gallery-add') => {
    const { updatedContent, message } = applyMediaToSection(item, target, content);
    onChangeContent(updatedContent);
    setShowUseMenu(false);
    showNotification(message);
  };

  // Copy Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(displayUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Safe Delete
  const handleConfirmDelete = () => {
    // 1. Storage cleanup in background
    deleteStoredMedia(item).catch((err) =>
      console.warn('[MediaViewerModal] Erro ao excluir do storage:', err)
    );

    // 2. Remove from library
    const updatedLibrary = content.library.filter((img) => img.id !== item.id);

    // 3. Remove references from all albums
    const updatedAlbums = (content.albums || []).map((album) => ({
      ...album,
      mediaIds: album.mediaIds.filter((id) => id !== item.id),
      coverMediaId: album.coverMediaId === item.id ? undefined : album.coverMediaId,
    }));

    // 4. Clean up if referenced in hero/gallery/about
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

    onChangeContent({
      ...content,
      library: updatedLibrary,
      albums: updatedAlbums,
      hero: updatedHero,
      gallery: updatedGallery,
      about: updatedAbout,
    });

    onClose();
  };

  const formattedSize = item.sizeBytes
    ? `${Math.round(item.sizeBytes / 1024)} KB`
    : 'Otimizado';

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 bg-black/90 backdrop-blur-xl">
        <div className="absolute inset-0 -z-10" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-5xl bg-[#09090c] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row max-h-[94vh]"
        >
          {/* Close Button Mobile/Desktop */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/70 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-zinc-700/60"
            aria-label="Fechar visualizador"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Left: Media Preview (Cinema view) */}
          <div className="relative flex-1 bg-black/90 flex items-center justify-center min-h-[280px] sm:min-h-[420px] lg:min-h-[580px] overflow-hidden p-4">
            {item.isVideo ? (
              <video
                src={displayUrl}
                poster={item.posterUrl ? resolveMediaUrl(item.posterUrl) : undefined}
                controls
                playsInline
                className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
              />
            ) : (
              <div className="relative w-full h-full min-h-[300px] sm:min-h-[460px] flex items-center justify-center">
                <Image
                  src={displayUrl}
                  alt={item.name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 65vw"
                  priority
                />
              </div>
            )}

            {/* Floating Quick Badges */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2">
              {item.isVideo && (
                <span className="px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-[11px] font-mono text-white flex items-center gap-1.5 border border-zinc-800">
                  <Film className="w-3.5 h-3.5 text-[#f4a7b9]" />
                  <span>Vídeo</span>
                </span>
              )}
              <span className="px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-[11px] font-mono text-emerald-400 flex items-center gap-1 border border-zinc-800">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Alta Qualidade</span>
              </span>
            </div>
          </div>

          {/* Right: Info & Actions Sidebar */}
          <div className="w-full lg:w-[360px] border-t lg:border-t-0 lg:border-l border-zinc-800/80 bg-[#0c0c10] p-5 sm:p-7 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-5">
              {/* Notification Toast */}
              <AnimatePresence>
                {actionNotice && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2"
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
                      className="flex-1 bg-zinc-900 border border-[#f4a7b9] rounded-xl px-3 py-2 text-sm text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSaveRename}
                      className="p-2 rounded-xl bg-[#f4a7b9] text-zinc-950 font-bold hover:bg-[#efa0b3] transition-colors cursor-pointer"
                      title="Salvar nome"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Cancelar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-serif text-lg text-white font-medium truncate" title={item.name}>
                      {item.name}
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        setEditedName(item.name);
                        setIsEditingName(true);
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-[#f4a7b9] hover:bg-zinc-900 transition-colors cursor-pointer shrink-0"
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
                  className="w-full inline-flex items-center justify-between px-4 py-3 rounded-2xl bg-[#f4a7b9] hover:bg-[#efa0b3] text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_2px_16px_rgba(244,167,185,0.25)] min-h-[46px]"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <span>Usar no Site</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      showUseMenu ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Submenu for "Usar no Site" */}
                {showUseMenu && (
                  <div className="mt-2 p-2 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-1">
                    <button
                      type="button"
                      onClick={() => handleApplyToSection('hero-first')}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-800 text-xs text-white flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>Definir como Foto Principal da Capa</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyToSection('hero-add')}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-800 text-xs text-white flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>Adicionar ao Carrossel da Capa</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyToSection('about')}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-800 text-xs text-white flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>Definir como Retrato do Sobre Mim</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyToSection('gallery-add')}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-800 text-xs text-white flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>Adicionar à Galeria de Ensaios</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                    </button>
                  </div>
                )}
              </div>

              {/* Status "Em Uso no Site" */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
                <span className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider block mb-1.5">
                  Presença no Site
                </span>
                {usages.length > 0 ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Usada em {usages.length} {usages.length === 1 ? 'local' : 'locais'}</span>
                    </div>
                    <ul className="space-y-1 pl-1">
                      {usages.map((u, i) => (
                        <li key={i} className="text-zinc-300 text-[11px] flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#f4a7b9]" />
                          <span className="font-medium text-white">{u.label}:</span>
                          <span className="text-zinc-400">{u.detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-zinc-500 text-xs font-light">
                    Esta mídia ainda não está sendo exibida publicamente em nenhuma seção.
                  </p>
                )}
              </div>

              {/* Albums Section */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">
                    Álbuns ({currentAlbums.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAlbumMenu(!showAlbumMenu)}
                    className="text-[#f4a7b9] hover:text-[#efa0b3] text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Gerenciar</span>
                  </button>
                </div>

                {currentAlbums.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {currentAlbums.map((alb) => (
                      <span
                        key={alb.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800/90 border border-zinc-700/60 text-white text-[11px]"
                      >
                        <Folder className="w-3 h-3 text-[#f4a7b9]" />
                        <span>{alb.name}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500 text-xs font-light">
                    Não associada a nenhum álbum personalizado.
                  </p>
                )}

                {/* Album Toggle Dropdown */}
                {showAlbumMenu && (
                  <div className="mt-3 pt-3 border-t border-zinc-800 space-y-1">
                    <span className="text-zinc-400 text-[10px] block mb-1">
                      Marque os álbuns para incluir esta foto:
                    </span>
                    {albums.length === 0 ? (
                      <span className="text-zinc-500 text-xs block py-1">Nenhum álbum criado.</span>
                    ) : (
                      albums.map((alb) => {
                        const inAlbum = alb.mediaIds.includes(item.id);
                        return (
                          <button
                            key={alb.id}
                            type="button"
                            onClick={() => handleToggleAlbum(alb.id)}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-zinc-800 text-xs flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <span className={inAlbum ? 'text-[#f4a7b9] font-medium' : 'text-zinc-300'}>
                              {alb.name}
                            </span>
                            {inAlbum ? (
                              <Check className="w-3.5 h-3.5 text-[#f4a7b9]" />
                            ) : (
                              <span className="text-zinc-600 text-[10px]">+ Adicionar</span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Technical Details (Clean & Minimal) */}
              <div className="text-[11px] text-zinc-400 space-y-1.5 pt-1 border-t border-zinc-800/60 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-sans">Formato:</span>
                  <span>{item.isVideo ? 'Vídeo' : 'Foto'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-sans">Tamanho:</span>
                  <span>{formattedSize}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-sans">Adicionada em:</span>
                  <span>{item.uploadedAt || 'Recente'}</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions: Favorite, Copy, Delete */}
            <div className="pt-5 mt-5 border-t border-zinc-800/80 space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleFavorite}
                  className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    item.favorite
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${
                      item.favorite ? 'fill-rose-400 text-rose-400' : 'text-zinc-400'
                    }`}
                  />
                  <span>{item.favorite ? 'Favoritada' : 'Favoritar'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Copiar link"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-900 text-zinc-400 hover:text-rose-400 text-xs font-semibold inline-flex items-center transition-colors cursor-pointer"
                  title="Excluir do acervo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Safe Delete Warning Dialog */}
              <AnimatePresence>
                {showDeleteConfirm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/60 space-y-2 mt-2"
                  >
                    <div className="flex items-start gap-2 text-rose-300 text-xs font-medium">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="block font-semibold">Excluir esta foto do acervo?</span>
                        {usages.length > 0 ? (
                          <p className="text-zinc-300 text-[11px] mt-1 font-light leading-relaxed">
                            Atenção: Esta foto está visível no site em{' '}
                            <strong className="text-rose-300 font-semibold">
                              {usages.map((u) => u.label).join(', ')}
                            </strong>
                            . Se excluir do acervo, ela deixará de aparecer nesses locais.
                          </p>
                        ) : (
                          <p className="text-zinc-300 text-[11px] mt-1 font-light leading-relaxed">
                            Ela será removida do seu acervo de fotos.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDelete}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs text-white font-semibold transition-colors cursor-pointer"
                      >
                        Excluir do Acervo
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
