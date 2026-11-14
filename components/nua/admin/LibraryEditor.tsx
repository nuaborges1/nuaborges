'use client';

import React from 'react';
import { MediaViewerModal } from './MediaViewerModal';
import { ConfirmModal } from './ConfirmModal';
import { LibraryEditorProps } from './library/types';
import { useLibraryManager } from './library/useLibraryManager';
import { LibraryUploadDropzone } from './library/LibraryUploadDropzone';
import { LibraryToolbar } from './library/LibraryToolbar';
import { LibraryMediaGrid } from './library/LibraryMediaGrid';

export type { LibraryEditorProps };

export function LibraryEditor({
  content,
  onChange,
  onUploadNew,
  onLibraryCountChange,
}: LibraryEditorProps) {
  const {
    filterType,
    setFilterType,
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
    fileInputRef,
    viewingMedia,
    setViewingMedia,
    selectedMediaIds,
    toggleSelectMediaId,
    toggleSelectAllDisplayed,
    clearMediaSelection,
    handleBatchFavorite,
    handleConfirmBatchDelete,
    library,
    displayedMedia,
    totalPhotos,
    totalVideos,
    totalFavorites,
    totalStorageBytes,
    totalSavedPercent,
    handleUploadFiles,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleToggleFavorite,
  } = useLibraryManager({ content, onChange, onUploadNew });

  React.useEffect(() => {
    onLibraryCountChange?.(library.length);
  }, [library.length, onLibraryCountChange]);

  return (
    <div className="space-y-5">
      {/* Page Header & Upload Action */}
      <LibraryUploadDropzone
        libraryLength={library.length}
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

      {/* Filter, Search & Batch Actions Toolbar */}
      <LibraryToolbar
        filterType={filterType}
        onFilterChange={setFilterType}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortOrder={sortOrder}
        onSortChange={setSortOrder}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalAll={library.length}
        totalPhotos={totalPhotos}
        totalVideos={totalVideos}
        totalFavorites={totalFavorites}
        selectedMediaIds={selectedMediaIds}
        displayedCount={displayedMedia.length}
        onToggleSelectAllDisplayed={toggleSelectAllDisplayed}
        onClearSelection={clearMediaSelection}
        onBatchFavorite={handleBatchFavorite}
        onOpenBatchDelete={() => setBatchDeleteConfirm(true)}
      />

      {/* Media Grid / List Presentation */}
      <LibraryMediaGrid
        displayedMedia={displayedMedia}
        content={content}
        currentAlbum={null}
        searchTerm={searchTerm}
        viewMode={viewMode}
        hoveredVideoId={hoveredVideoId}
        setHoveredVideoId={setHoveredVideoId}
        selectedMediaIds={selectedMediaIds}
        onToggleSelectMedia={toggleSelectMediaId}
        onSelectMedia={(item) => setViewingMedia(item)}
        onToggleFavorite={handleToggleFavorite}
        onOpenUpload={() => fileInputRef.current?.click()}
      />

      {/* Integrated Lateral Details Panel (SidePanel) */}
      <MediaViewerModal
        isOpen={Boolean(viewingMedia)}
        item={viewingMedia}
        content={content}
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
        description="Os arquivos selecionados serão removidos da Biblioteca de Mídias e das seções em que estiverem vinculados."
        confirmText="Excluir mídias"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={handleConfirmBatchDelete}
        onCancel={() => setBatchDeleteConfirm(false)}
      />
    </div>
  );
}
