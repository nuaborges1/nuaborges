import React from 'react';
import { Upload, FolderPlus, Zap, CheckCircle2 } from 'lucide-react';

interface LibraryUploadDropzoneProps {
  libraryLength: number;
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
  onOpenCreateAlbum: () => void;
  onFilesSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function LibraryUploadDropzone({
  libraryLength,
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
  onOpenCreateAlbum,
  onFilesSelected,
}: LibraryUploadDropzoneProps) {
  return (
    <>
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

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={onFilesSelected}
        className="hidden"
      />

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`rounded-xl bg-[#171821] border p-4 sm:p-5 transition-all ${
          isDragging
            ? 'border-[#f4a7b9] ring-2 ring-[#f4a7b9]/20 bg-[#1e202c]'
            : 'border-white/[0.06]'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[#f4a7b9] text-[10px] font-semibold tracking-wider uppercase font-mono">
                ACERVO CENTRAL
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#101116] border border-white/[0.06] text-[10px] text-zinc-400 font-mono">
                <Zap className="w-3 h-3 text-[#f4a7b9]" /> Otimização Automática
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#101116] border border-white/[0.06] text-[10px] text-zinc-300 font-mono">
                <span>Armazenamento: {(totalStorageBytes / (1024 * 1024)).toFixed(1)} MB</span>
                {totalSavedPercent > 0 && (
                  <span className="text-emerald-400 font-semibold">(-{totalSavedPercent}%)</span>
                )}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-semibold text-white">
              Biblioteca de Mídia ({libraryLength})
            </h2>
            <p className="text-zinc-400 text-xs font-light mt-0.5 max-w-2xl leading-relaxed">
              Adicione fotos e vídeos uma única vez e reutilize em qualquer área do site.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={onOpenCreateAlbum}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#101116] hover:bg-[#20222d] border border-white/10 text-white text-xs font-medium transition cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5 text-[#f4a7b9]" />
              <span>Criar Álbum</span>
            </button>

            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold text-xs transition cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{uploading ? 'Salvando...' : 'Adicionar Mídias'}</span>
            </button>
          </div>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          className="mt-3 hidden sm:block border border-dashed border-white/10 hover:border-white/20 rounded-lg p-2.5 text-center cursor-pointer transition-colors bg-[#0e0f14]"
        >
          <div className="flex items-center justify-center gap-2 text-zinc-400 text-xs">
            <Upload className="w-3.5 h-3.5 text-[#f4a7b9]" />
            <span>
              Arraste fotos e vídeos aqui ou toque para{' '}
              <strong className="text-white font-medium">escolher arquivos</strong>.
            </span>
          </div>
        </div>

        {uploading && (
          <div className="mt-3 p-3 rounded-lg bg-[#101116] border border-white/10">
            <div className="flex items-center justify-between text-xs text-zinc-300 mb-1.5">
              <span className="truncate max-w-[280px] sm:max-w-md">
                {uploadStatusText || 'Processando e guardando mídia...'}
              </span>
              <span className="font-mono text-[#f4a7b9] font-semibold">{uploadProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#f4a7b9] transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {uploadSuccessCount !== null && (
          <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              {uploadSuccessCount} {uploadSuccessCount === 1 ? 'mídia adicionada' : 'mídias adicionadas'} ao acervo.
            </span>
          </div>
        )}
      </div>
    </>
  );
}
