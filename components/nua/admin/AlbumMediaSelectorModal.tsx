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
      title={`Fotos do álbum: ${album.name}`}
      subtitle="Marque as mídias que farão parte deste álbum."
      backText="Voltar ao Álbum"
      allowedMediaType="all"
      selectionMode="multiple"
      allowEmptySelection
      onSelect={(_, item) => {
        if (item) onSave([item.id]);
      }}
      onSelectMultiple={(urls, items) => {
        const ids = urls
          .map((url) => {
            const selectedItem = items?.find((item) => item.url === url || item.objectKey === url)
              || library.find((item) => item.url === url || item.objectKey === url);
            return selectedItem?.id;
          })
          .filter(Boolean) as string[];
        onSave(Array.from(new Set(ids)));
      }}
      onUploadNew={onUploadNew}
      uploadDestinationLabel={'o álbum ' + album.name}
      confirmActionLabel="Salvar mídias no álbum"
      onClose={onClose}
    />
  );
}
