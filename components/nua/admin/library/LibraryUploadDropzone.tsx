import React from 'react';
import { Upload, CheckCircle2, HardDrive } from 'lucide-react';
import { PageHeader, StatusBadge } from '../ui/AdminPrimitives';

interface LibraryUploadDropzoneProps {
  libraryLength: number;
  activeAlbumName?: string | null;
  totalPhotos: number;
  totalVideos: number;
  totalStorageBytes: number;
  totalSavedPercent: number;
  uploading: boolean;
  uploadProgress: number;
  uploadStatusText: string;
  uploadSuccessCount: number | null;
  isDragging: boolean;
  libraryNotice: { message: string; type: 'info' | 'error' | 'success' } | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFilesSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function LibraryUploadDropzone({
  libraryLength,
  activeAlbumName,
  totalPhotos,
  totalVideos,
  totalStorageBytes,
  totalSavedPercent,
  uploading,
  uploadProgress,
  uploadStatusText,
  uploadSuccessCount,
  isDragging,
  libraryNotice,
  fileInputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onFilesSelected,
}: LibraryUploadDropzoneProps) {
  const storageMb = (totalStorageBytes / (1024 * 1024)).toFixed(1);

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="space-y-4"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={onFilesSelected}
        className="hidden"
      />

      <PageHeader
        title="Biblioteca de Mídias"
        subtitle={activeAlbumName ? `Ao enviar ou arrastar arquivos aqui, eles serão salvos no acervo e adicionados ao álbum “${activeAlbumName}”.` : "Envie fotos e vídeos aqui ou arraste arquivos para esta área. Depois, organize em álbuns ou use nos packs e no site."}
        helpId="midias_acervo"
        actions={
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-xl bg-[var(--color-adm-accent)] hover:bg-[var(--color-adm-accent-hover)] text-zinc-950 font-semibold text-xs transition cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{uploading ? 'Enviando...' : 'Enviar para o acervo'}</span>
          </button>
        }
      />

      {isDragging && (
        <div className="rounded-2xl border-2 border-dashed border-[var(--color-adm-accent)] bg-[var(--color-adm-accent)]/10 p-6 text-center text-xs text-[var(--color-adm-accent)] font-medium">
          Solte aqui para enviar as mídias para o acervo
        </div>
      )}

      {libraryNotice && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            libraryNotice.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              : libraryNotice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-white/[0.04] border-white/10 text-zinc-300'
          }`}
        >
          <span>{libraryNotice.message}</span>
        </div>
      )}

      {uploading && (
        <div className="p-3.5 rounded-xl bg-[#14161d] border border-white/[0.08]">
          <div className="flex items-center justify-between text-xs text-zinc-300 mb-1.5">
            <span className="truncate max-w-[280px] sm:max-w-md">
              {uploadStatusText || 'Otimizando e guardando mídia...'}
            </span>
            <span className="font-mono text-[var(--color-adm-accent)] font-semibold">{uploadProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-adm-accent)] transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {uploadSuccessCount !== null && !uploading && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {uploadSuccessCount}{' '}
            {uploadSuccessCount === 1 ? 'mídia adicionada' : 'mídias adicionadas'} à Biblioteca.
          </span>
        </div>
      )}
    </div>
  );
}
