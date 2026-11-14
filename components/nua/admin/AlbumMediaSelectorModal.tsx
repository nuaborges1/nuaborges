'use client';

import React, { useMemo } from 'react';
import { LibraryImageItem, MediaAlbum } from '@/lib/types';
import { ImagePickerModal } from './ImagePickerModal';

interface AlbumMediaSelectorModalProps {
  isOpen: boolean;
  album: MediaAlbum | null;
  library: LibraryImageItem[];
  albums?: MediaAlbum[];
  onUploadNew?: (newImage: LibraryImageItem) => void;
  onSave: (updatedMediaIds: string[]) => void;
  onClose: () => void;
}

export function AlbumMediaSelectorModal({
  isOpen,
  album,
  library,
  albums = [],
  onUploadNew,
  onSave,
  onClose,
}: AlbumMediaSelectorModalProps) {
  const initialSelectedUrls = useMemo(() => {
    if (!album) return [];
    return album.mediaIds
      .map((id) => library.find((m) => m.id === id)?.url)
      .filter(Boolean) as string[];
  }, [album, library]);

  if (!isOpen || !album) return null;

  return (
    <ImagePickerModal
      isOpen={isOpen}
      library={library}
      albums={albums}
      initialSelectedUrls={initialSelectedUrls}
      title={`Gerenciar Mídias do Álbum: ${album.name}`}
      subtitle="Escolha quais fotos e vídeos do seu acervo fazem parte deste álbum ou envie novos arquivos."
      backText="Voltar ao Álbum"
      allowedMediaType="all"
      selectionMode="multiple"
      allowEmptySelection
      onSelect={(_, item) => {
        if (item) onSave([item.id]);
      }}
      onSelectMultiple={(urls, items) => {
        const ids =
          items && items.length > 0
            ? items.map((it) => it.id)
            : urls
                .map((u) => library.find((m) => m.url === u)?.id)
                .filter(Boolean) as string[];
        onSave(ids);
      }}
      onUploadNew={onUploadNew}
      onClose={onClose}
    />
  );
}
