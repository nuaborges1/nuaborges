import { SiteContent, LibraryImageItem, MediaAlbum } from '@/lib/types';

export const EMPTY_LIBRARY: LibraryImageItem[] = [];
export const EMPTY_ALBUMS: MediaAlbum[] = [];

export interface LibraryEditorProps {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
  onAdministrativeChange?: (
    updater: (prev: SiteContent) => SiteContent,
    options?: { summary?: string; feedbackMessage?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  onUploadNew: (img: LibraryImageItem) => void;
  onLibraryCountChange?: (count: number) => void;
}

export type MediaFilterType = 'all' | 'photos' | 'videos' | 'favorites' | 'unassigned' | 'albums';
export type ViewMode = 'grid' | 'list';
export type SortOrder = 'newest' | 'oldest' | 'name';
