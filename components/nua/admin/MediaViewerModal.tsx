/* Vinho maduro / Nua Borges */
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
  Film,
  Image as ImageIcon,
  Layers,
} from 'lucide-react';
import { SiteContent, LibraryImageItem } from '@/lib/types';
import { resolveMediaUrl, resolveMediaVariant, isMediaVideo, resolveVideoPlaySource } from '@/lib/media';
import { getMediaUsage, applyMediaToSection, removeMediaFromSection } from '@/lib/mediaUsage';
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
  onAdministrativeChange?: (
    updater: (prev: SiteContent) => SiteContent,
    options?: { summary?: string; feedbackMessage?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
}

export function MediaViewerModal({
  isOpen,
  item,
  content,
  onChangeContent,
  onAdministrativeChange,
  onClose,
}: MediaViewerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showUseMenu, setShowUseMenu] = useState(false);
  const [pendingApplyTarget, setPendingApplyTarget] = useState<
    'hero-first' | 'about' | null
  >(null);
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
    setShowUseMenu(false);
    setPendingApplyTarget(null);
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
  const displayUrl = isVideo ? playableVideoUrl : resolveMediaVariant(item, 'full');
  const usages = getMediaUsage(item, content);
  const aliasSet = new Set<string>(
    [item.url, ...(item.aliasUrls || [])].filter(Boolean)
  );
  const isThisMedia = (url?: string | null) => Boolean(url && aliasSet.has(url));
  const isOnHero = (content.hero?.photos || []).some((photo) => isThisMedia(photo.imageUrl));
  const isHeroFirst = isThisMedia(content.hero?.photos?.[0]?.imageUrl);
  const isAboutPhoto = isThisMedia(content.about?.photoUrl);
  const currentHeroFirst = content.hero?.photos?.[0];
  const galleryMatch = (content.gallery?.photos || []).find((photo) => isThisMedia(photo.imageUrl));

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleToggleFavorite = () => {
    const isFav = !item.favorite;
    if (onAdministrativeChange) {
      onAdministrativeChange((prev) => ({
        ...prev,
        library: prev.library.map((libItem) =>
          libItem.id === item.id ? { ...libItem, favorite: isFav } : libItem
        ),
      }), {
        summary: isFav ? `Mídia "${item.name}" favoritada` : `Mídia "${item.name}" desfavoritada`,
        feedbackMessage: isFav ? 'Marcada como favorita' : 'Removida dos favoritos',
      });
    } else {
      const updatedLibrary = content.library.map((libItem) =>
        libItem.id === item.id ? { ...libItem, favorite: isFav } : libItem
      );
      onChangeContent({ ...content, library: updatedLibrary });
    }
    showNotification(isFav ? 'Marcada como favorita' : 'Removida dos favoritos');
  };

  const handleSaveRename = () => {
    const trimmed = editedName.trim();
    if (!trimmed) {
      setIsEditingName(false);
      return;
    }
    setIsEditingName(false);

    // Renomear foto/vídeo: salva e executa diretamente sem exigir publicação (Cenário A)
    if (onAdministrativeChange) {
      onAdministrativeChange((prev) => ({
        ...prev,
        library: prev.library.map((libItem) =>
          libItem.id === item.id
            ? { ...libItem, name: trimmed, customName: trimmed }
            : libItem
        ),
      }), {
        summary: `Mídia renomeada para "${trimmed}"`,
        feedbackMessage: 'Nome atualizado com sucesso.',
      });
    } else {
      const updatedLibrary = content.library.map((libItem) =>
        libItem.id === item.id
          ? { ...libItem, name: trimmed, customName: trimmed }
          : libItem
      );
      onChangeContent({ ...content, library: updatedLibrary });
    }
    showNotification('Nome atualizado com sucesso');
  };

  const handleApplyToSection = (
    target: 'hero-first' | 'hero-add' | 'about' | 'gallery-add'
  ) => {
    const { updatedContent, message } = applyMediaToSection(item, target, content);
    if (updatedContent === content) {
      setPendingApplyTarget(null);
      setShowUseMenu(false);
      showNotification(message);
      return;
    }
    onChangeContent(updatedContent);
    setPendingApplyTarget(null);
    setShowUseMenu(false);
    showNotification(message);
  };

  const handleRemoveFromSection = (target: 'hero' | 'about' | 'gallery') => {
    const { updatedContent, message } = removeMediaFromSection(item, target, content);
    if (updatedContent !== content) onChangeContent(updatedContent);
    showNotification(message);
  };

  const requestApplyToSection = (
    target: 'hero-first' | 'hero-add' | 'about' | 'gallery-add'
  ) => {
    if ((target === 'hero-first' && currentHeroFirst && !isHeroFirst) ||
        (target === 'about' && content.about?.photoUrl && !isAboutPhoto)) {
      setPendingApplyTarget(target);
      return;
    }
    handleApplyToSection(target);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(displayUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleConfirmDelete = async () => {
    if (usages.length > 0) {
      showNotification('Remova esta mídia dos locais em uso antes de excluí-la do acervo.');
      return;
    }

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

    const nextContent: SiteContent = {
      ...content,
      library: updatedLibrary,
      albums: updatedAlbums,
      hero: updatedHero,
      gallery: updatedGallery,
      about: updatedAbout,
      seo: updatedSeo,
    };

    if (onAdministrativeChange) {
      const result = await onAdministrativeChange(() => nextContent, {
        summary: `Exclusão/desvinculação da mídia "${item.name}"`,
        feedbackMessage: 'Mídia removida com sucesso.',
      });
      if (!result.success) {
        showNotification('Não foi possível salvar a remoção. A mídia continua no acervo.');
        return;
      }
    } else {
      onChangeContent(nextContent);
    }

    const isBundledImage = Array.from(aliasSet).some((url) => url.startsWith('/images/'));
    if (!isBundledImage) {
      const storageDeleted = await deleteStoredMedia(item).catch((err) => {
        console.warn('[MediaViewerModal] Erro ao excluir do armazenamento:', err);
        return false;
      });
      if (!storageDeleted) {
        showNotification('A mídia foi removida da biblioteca, mas pode levar um instante para sair completamente.');
        setShowDeleteConfirm(false);
        onClose();
        return;
      }
    }

    showNotification('Mídia removida do acervo.');
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
                <Film className="w-4 h-4 text-[#843C52] shrink-0" />
              ) : (
                <ImageIcon className="w-4 h-4 text-[#843C52] shrink-0" />
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
              <div className="rounded-xl bg-[#843C52]/10 border border-[#843C52]/25 px-3.5 py-2.5 flex items-start gap-2.5">
                <Layers className="w-4 h-4 text-[#843C52] shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-200 leading-relaxed">
                  <span className="font-semibold text-[#843C52] block">
                    Foto unificada sem cópias repetidas
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Esta imagem reúne {aliasSet.size} usos iguais no site em um único item da biblioteca.
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
                    className="flex-1 bg-[#0e0f14] border border-[#843C52] rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveRename}
                    className="h-8 px-2.5 rounded-lg bg-[#843C52] text-white font-semibold hover:bg-[#992b4a] transition-colors cursor-pointer"
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
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-[#843C52] hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0"
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
                  className="w-full inline-flex items-center justify-between h-9 px-4 rounded-xl bg-[#843C52] hover:bg-[#992b4a] text-white font-semibold text-xs transition-all cursor-pointer shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" />
                  <span>Usar foto no site</span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      showUseMenu ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {showUseMenu && (
                  <div className="mt-2 rounded-xl bg-[#171821] border border-white/[0.08] p-2 shadow-xl space-y-1.5">
                    <p className="px-2 pb-1 text-[11px] text-zinc-400">
                      Escolha onde esta foto deve aparecer. O arquivo continua no acervo.
                    </p>
                    {pendingApplyTarget ? (
                      <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-3" role="alert">
                        <p className="text-xs font-medium text-white">
                          {pendingApplyTarget === 'hero-first'
                            ? 'A foto principal atual da capa será substituída.'
                            : 'O retrato atual da seção Sobre Mim será substituído.'}
                        </p>
                        <div className="mt-3 flex justify-end gap-2">
                          <button type="button" onClick={() => setPendingApplyTarget(null)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/[0.06]">
                            Manter como está
                          </button>
                          <button type="button" onClick={() => handleApplyToSection(pendingApplyTarget)} className="rounded-lg bg-[var(--color-adm-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110">
                            Sim, substituir
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.05] px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-white">Foto principal da capa</p>
                            <p className="mt-0.5 text-[11px] text-zinc-400">
                              {isHeroFirst ? 'Esta foto já aparece primeiro na capa.' : currentHeroFirst ? 'Vai trocar a primeira foto atual da capa.' : 'Define a primeira foto da capa.'}
                            </p>
                          </div>
                          {isHeroFirst ? (
                            <span className="shrink-0 text-[11px] font-medium text-emerald-300">Já está na capa</span>
                          ) : (
                            <button type="button" onClick={() => requestApplyToSection('hero-first')} className="shrink-0 rounded-lg bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-white hover:bg-white/[0.14]">
                              {currentHeroFirst ? 'Trocar' : 'Usar aqui'}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.05] px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-white">Carrossel da capa</p>
                            <p className="mt-0.5 text-[11px] text-zinc-400">
                              {isOnHero ? 'Esta foto já está no carrossel.' : 'Adiciona ao final sem remover as outras fotos.'}
                            </p>
                          </div>
                          {isOnHero ? (
                            <button type="button" onClick={() => handleRemoveFromSection('hero')} className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/[0.06]">
                              Remover da capa
                            </button>
                          ) : (
                            <button type="button" onClick={() => requestApplyToSection('hero-add')} className="shrink-0 rounded-lg bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-white hover:bg-white/[0.14]">Adicionar</button>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.05] px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-white">Retrato do Sobre Mim</p>
                            <p className="mt-0.5 text-[11px] text-zinc-400">
                              {isAboutPhoto ? 'Esta foto já é o retrato da seção.' : content.about?.photoUrl ? 'Vai trocar o retrato atual.' : 'Define o retrato desta seção.'}
                            </p>
                          </div>
                          {isAboutPhoto ? (
                            <button type="button" onClick={() => handleRemoveFromSection('about')} className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/[0.06]">
                              Remover
                            </button>
                          ) : (
                            <button type="button" onClick={() => requestApplyToSection('about')} className="shrink-0 rounded-lg bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-white hover:bg-white/[0.14]">
                              {content.about?.photoUrl ? 'Trocar' : 'Usar aqui'}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.05] px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-white">Vitrine de ensaios</p>
                            <p className="mt-0.5 text-[11px] text-zinc-400">
                              {galleryMatch?.active ? 'Esta foto já está visível na vitrine.' : galleryMatch ? 'Esta foto está cadastrada e pode ser reativada.' : 'Adiciona uma nova imagem à vitrine.'}
                            </p>
                          </div>
                          {galleryMatch?.active ? (
                            <button type="button" onClick={() => handleRemoveFromSection('gallery')} className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/[0.06]">
                              Remover
                            </button>
                          ) : (
                            <button type="button" onClick={() => requestApplyToSection('gallery-add')} className="shrink-0 rounded-lg bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-white hover:bg-white/[0.14]">
                              {galleryMatch ? 'Reativar' : 'Adicionar'}
                            </button>
                          )}
                        </div>
                      </>
                    )}
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
