import { SiteContent, LibraryImageItem, MediaAlbum } from '@/lib/types';

export const EMPTY_LIBRARY: LibraryImageItem[] = [];
export const EMPTY_ALBUMS: MediaAlbum[] = [];

export interface LibraryEditorProps {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
  onUploadNew: (img: LibraryImageItem) => void;
  onLibraryCountChange?: (count: number) => void;
}

export type MediaFilterType = 'all' | 'photos' | 'videos' | 'favorites' | 'albums';
export type ViewMode = 'grid' | 'list';
export type SortOrder = 'newest' | 'oldest' | 'name';
