'use client';

import React from 'react';
import { MediaViewerModal } from './MediaViewerModal';
import { AlbumCreateModal } from './AlbumCreateModal';
import { AlbumMediaSelectorModal } from './AlbumMediaSelectorModal';
import { ConfirmModal } from './ConfirmModal';
import { LibraryEditorProps } from './library/types';
import { useLibraryManager } from './library/useLibraryManager';
import { LibraryUploadDropzone } from './library/LibraryUploadDropzone';
import { LibraryAlbumHeader } from './library/LibraryAlbumHeader';
import { LibraryAlbumsBar } from './library/LibraryAlbumsBar';
import { LibraryToolbar } from './library/LibraryToolbar';
import { LibraryMediaGrid } from './library/LibraryMediaGrid';

export type { LibraryEditorProps };

export function LibraryEditor({ content, onChange, onUploadNew, onLibraryCountChange }: LibraryEditorProps) {
  const {
    filterType,
    setFilterType,
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
    deleteAlbumConfirm,
    setDeleteAlbumConfirm,
    fileInputRef,
    viewingMedia,
    setViewingMedia,
    albumModalOpen,
    setAlbumModalOpen,
    editingAlbum,
    setEditingAlbum,
    albumMediaSelectorOpen,
    setAlbumMediaSelectorOpen,
    library,
    albums,
    currentAlbum,
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
    handleSaveAlbum,
    handleDeleteAlbum,
    handleConfirmDeleteAlbum,
    handleSetAlbumCover,
    handleRemoveFromAlbum,
    handleMoveMediaInAlbum,
    handleSaveAlbumMediaIds,
  } = useLibraryManager({ content, onChange, onUploadNew });

  React.useEffect(() => {
    onLibraryCountChange?.(library.length);
  }, [library.length, onLibraryCountChange]);

  return (
    <div className="space-y-6">
      {/* Upload Dropzone & Acervo Central Card */}
      <LibraryUploadDropzone
        libraryLength={library.length}
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
        onOpenCreateAlbum={() => {
          setEditingAlbum(null);
          setAlbumModalOpen(true);
        }}
        onFilesSelected={(e) => handleUploadFiles(e.target.files)}
      />

      {/* Inside Album View Header */}
      {currentAlbum ? (
        <LibraryAlbumHeader
          currentAlbum={currentAlbum}
          displayedMediaCount={displayedMedia.length}
          onBack={() => setActiveAlbumId(null)}
          onOpenMediaSelector={() => setAlbumMediaSelectorOpen(true)}
          onEditAlbum={() => {
            setEditingAlbum(currentAlbum);
            setAlbumModalOpen(true);
          }}
          onDeleteAlbum={() => handleDeleteAlbum(currentAlbum.id, currentAlbum.name)}
        />
      ) : (
        /* Albums & Folders Quick Navigation */
        <LibraryAlbumsBar
          library={library}
          albums={albums}
          filterType={filterType}
          totalFavorites={totalFavorites}
          onFilterChange={(type) => setFilterType(type)}
          onSelectAlbum={(albumId) => setActiveAlbumId(albumId)}
          onOpenCreateAlbum={() => {
            setEditingAlbum(null);
            setAlbumModalOpen(true);
          }}
        />
      )}

      {/* Filter & View Toolbar */}
      <LibraryToolbar
        isInsideAlbum={Boolean(currentAlbum)}
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
        onSelectMedia={(item) => setViewingMedia(item)}
        onToggleFavorite={handleToggleFavorite}
        onMoveMediaInAlbum={handleMoveMediaInAlbum}
        onSetAlbumCover={handleSetAlbumCover}
        onRemoveFromAlbum={handleRemoveFromAlbum}
        onOpenUpload={() => fileInputRef.current?.click()}
      />

      {/* Media Viewer Modal */}
      <MediaViewerModal
        isOpen={Boolean(viewingMedia)}
        item={viewingMedia}
        content={content}
        onChangeContent={(updated) => {
          onChange(updated);
          if (viewingMedia) {
            const nextItem = updated.library.find((i) => i.id === viewingMedia.id) || null;
            setViewingMedia(nextItem);
          }
        }}
        onClose={() => setViewingMedia(null)}
      />

      {/* Album Create / Edit Modal */}
      <AlbumCreateModal
        isOpen={albumModalOpen}
        library={library}
        albumToEdit={editingAlbum}
        onSave={handleSaveAlbum}
        onClose={() => {
          setAlbumModalOpen(false);
          setEditingAlbum(null);
        }}
      />

      {/* Album Media Selector Modal */}
      <AlbumMediaSelectorModal
        isOpen={albumMediaSelectorOpen}
        album={currentAlbum}
        library={library}
        onSave={handleSaveAlbumMediaIds}
        onClose={() => setAlbumMediaSelectorOpen(false)}
      />

      {/* Custom Confirmation Modal for Deleting Albums */}
      <ConfirmModal
        isOpen={Boolean(deleteAlbumConfirm)}
        title={deleteAlbumConfirm ? `Excluir o Álbum "${deleteAlbumConfirm.name}"?` : 'Excluir Álbum'}
        description="Deseja excluir este álbum? As fotos continuarão guardadas no seu acervo e não serão apagadas — apenas o agrupamento deste álbum será removido."
        confirmText="Excluir Álbum"
        cancelText="Manter Álbum"
        variant="danger"
        onConfirm={handleConfirmDeleteAlbum}
        onCancel={() => setDeleteAlbumConfirm(null)}
      />
    </div>
  );
}
