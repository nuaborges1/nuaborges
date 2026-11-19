'use client';

import React from 'react';
import { MediaViewerModal } from './MediaViewerModal';
import { ConfirmModal } from './ConfirmModal';
import { LibraryEditorProps } from './library/types';
import { useLibraryManager } from './library/useLibraryManager';
import { LibraryUploadDropzone } from './library/LibraryUploadDropzone';
import { LibraryToolbar } from './library/LibraryToolbar';
import { LibraryAlbumsBar } from './library/LibraryAlbumsBar';
import { LibraryMediaGrid } from './library/LibraryMediaGrid';
import { LibraryAlbumHeader } from './library/LibraryAlbumHeader';
import { LibraryAlbumFormDialog } from './library/LibraryAlbumDialogs';
import { AlbumMediaSelectorModal } from './AlbumMediaSelectorModal';
import { LibrarySkeleton } from './ui/AdminSkeleton';

export type { LibraryEditorProps };

export function LibraryEditor({
  content,
  onChange,
  onAdministrativeChange,
  onUploadNew,
  onLibraryCountChange,
}: LibraryEditorProps) {
  const {
    filterType,
    setFilterType,
    mediaTypeFilter,
    setMediaTypeFilter,
    activeAlbumId,
    setActiveAlbumId,
    searchTerm,
    setSearchTerm,
    viewMode,
    setViewMode,
    sortOrder,
    setSortOrder,
    hoveredVideoId,
    setHoveredVideoId,
    uploading,
    uploadProgress,
    uploadStatusText,
    uploadSuccessCount,
    isDragging,
    libraryNotice,
    batchDeleteConfirm,
    setBatchDeleteConfirm,
    deleteAlbumConfirm,
    setDeleteAlbumConfirm,
    albumModalOpen,
    setAlbumModalOpen,
    editingAlbum,
    setEditingAlbum,
    albumMediaSelectorOpen,
    setAlbumMediaSelectorOpen,
    fileInputRef,
    viewingMedia,
    setViewingMedia,
    selectedMediaIds,
    toggleSelectMediaId,
    toggleSelectAllDisplayed,
    clearMediaSelection,
    handleBatchFavorite,
    handleBatchAddToAlbum,
    handleConfirmBatchDelete,
    library,
    albums,
    currentAlbum,
    displayedMedia,
    totalPhotos,
    totalVideos,
    totalFavorites,
    totalUnassigned,
    totalStorageBytes,
    totalSavedPercent,
    handleUploadFiles,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleToggleFavorite,
    handleSaveAlbum,
    handleDeleteAlbum,
    handleConfirmDeleteAlbum,
    handleSetAlbumCover,
    handleRemoveFromAlbum,
    handleMoveMediaInAlbum,
    handleSaveAlbumMediaIds,
    isLoading,
  } = useLibraryManager({ content, onChange, onAdministrativeChange, onUploadNew });

  React.useEffect(() => {
    onLibraryCountChange?.(library.length);
  }, [library.length, onLibraryCountChange]);

  if (isLoading && library.length === 0) {
    return <LibrarySkeleton />;
  }

  return (
    <div className="space-y-5">
      {/* Page Header & Upload Action */}
      <LibraryUploadDropzone
        libraryLength={library.length}
        activeAlbumName={currentAlbum?.name || null}
        totalPhotos={totalPhotos}
        totalVideos={totalVideos}
        totalStorageBytes={totalStorageBytes}
        totalSavedPercent={totalSavedPercent}
        uploading={uploading}
        uploadProgress={uploadProgress}
        uploadStatusText={uploadStatusText}
        uploadSuccessCount={uploadSuccessCount}
        isDragging={isDragging}
        libraryNotice={libraryNotice}
        fileInputRef={fileInputRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFilesSelected={(e) => handleUploadFiles(e.target.files)}
      />

      <LibraryAlbumsBar library={library} albums={albums} filterType={filterType} activeAlbumId={activeAlbumId} totalAll={library.length} totalFavorites={totalFavorites} totalUnassigned={totalUnassigned} onFilterChange={(type) => { setActiveAlbumId(null); setFilterType(type); setMediaTypeFilter('all'); clearMediaSelection(); }} onSelectAlbum={(id) => { setActiveAlbumId(id); setMediaTypeFilter('all'); clearMediaSelection(); }} onOpenCreateAlbum={() => { setEditingAlbum(null); setAlbumModalOpen(true); }} />

      {currentAlbum && <LibraryAlbumHeader currentAlbum={currentAlbum} displayedMediaCount={displayedMedia.length} onBack={() => { setActiveAlbumId(null); setFilterType('all'); clearMediaSelection(); }} onOpenMediaSelector={() => setAlbumMediaSelectorOpen(true)} onEditAlbum={() => { setEditingAlbum(currentAlbum); setAlbumModalOpen(true); }} onDeleteAlbum={() => handleDeleteAlbum(currentAlbum.id, currentAlbum.name)} />}

      {/* Filter, Search & Batch Actions Toolbar */}
      <LibraryToolbar
        isInsideAlbum={Boolean(currentAlbum)}
        mediaTypeFilter={mediaTypeFilter}
        onMediaTypeFilterChange={setMediaTypeFilter}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortOrder={sortOrder}
        onSortChange={setSortOrder}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalPhotos={totalPhotos}
        totalVideos={totalVideos}
        selectedMediaIds={selectedMediaIds}
        displayedCount={displayedMedia.length}
        onToggleSelectAllDisplayed={toggleSelectAllDisplayed}
        onClearSelection={clearMediaSelection}
        onBatchFavorite={handleBatchFavorite}
        albums={albums}
        onBatchAddToAlbum={handleBatchAddToAlbum}
        onOpenBatchDelete={() => setBatchDeleteConfirm(true)}
      />

      {/* Media Grid / List Presentation */}
      <LibraryMediaGrid
        displayedMedia={displayedMedia}
        content={content}
        currentAlbum={currentAlbum}
        searchTerm={searchTerm}
        viewMode={viewMode}
        hoveredVideoId={hoveredVideoId}
        setHoveredVideoId={setHoveredVideoId}
        selectedMediaIds={selectedMediaIds}
        onToggleSelectMedia={toggleSelectMediaId}
        onSelectMedia={(item) => setViewingMedia(item)}
        onToggleFavorite={handleToggleFavorite}
        onMoveMediaInAlbum={handleMoveMediaInAlbum}
        onSetAlbumCover={handleSetAlbumCover}
        onRemoveFromAlbum={handleRemoveFromAlbum}
        onOpenUpload={() => fileInputRef.current?.click()}
      />

      {/* Integrated Lateral Details Panel (SidePanel) */}
      <MediaViewerModal
        isOpen={Boolean(viewingMedia)}
        item={viewingMedia}
        content={content}
        onAdministrativeChange={onAdministrativeChange}
        onChangeContent={(updated) => {
          onChange(updated);
          if (viewingMedia) {
            const nextItem =
              updated.library.find((i) => i.id === viewingMedia.id) || null;
            setViewingMedia(nextItem);
          }
        }}
        onClose={() => setViewingMedia(null)}
      />

      {/* Confirmation Modal for Batch Deleting Media */}
      <ConfirmModal
        isOpen={batchDeleteConfirm}
        title={`Excluir ${selectedMediaIds.length} ${
          selectedMediaIds.length === 1 ? 'mídia selecionada' : 'mídias selecionadas'
        }?`}
        description="Os arquivos só serão apagados se não estiverem em uso no site. Se algum estiver vinculado, ele será mantido e você verá um aviso."
        confirmText="Excluir mídias"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={handleConfirmBatchDelete}
        onCancel={() => setBatchDeleteConfirm(false)}
      />

      <ConfirmModal
        isOpen={Boolean(deleteAlbumConfirm)}
        title={`Excluir o álbum${deleteAlbumConfirm ? ` “${deleteAlbumConfirm.name}”` : ''}?`}
        description="As fotos continuarão na biblioteca. Esta ação remove apenas o álbum e a organização dele."
        confirmText="Excluir álbum"
        cancelText="Manter álbum"
        variant="warning"
        onConfirm={handleConfirmDeleteAlbum}
        onCancel={() => setDeleteAlbumConfirm(null)}
      />

      <LibraryAlbumFormDialog
        isOpen={albumModalOpen}
        album={editingAlbum}
        onClose={() => { setAlbumModalOpen(false); setEditingAlbum(null); }}
        onSave={async (album) => {
          await handleSaveAlbum(album);
          setActiveAlbumId(album.id);
          setFilterType('albums');
        }}
      />

      <AlbumMediaSelectorModal
        isOpen={albumMediaSelectorOpen}
        album={currentAlbum}
        library={library}
        albums={albums}
        onUploadNew={onUploadNew}
        onClose={() => setAlbumMediaSelectorOpen(false)}
        onSave={handleSaveAlbumMediaIds}
      />
    </div>
  );
}
