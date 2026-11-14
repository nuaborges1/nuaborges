import React from 'react';
import { ArrowLeft, Plus, Edit2, Trash2 } from 'lucide-react';
import { MediaAlbum } from '@/lib/types';

interface LibraryAlbumHeaderProps {
  currentAlbum: MediaAlbum;
  displayedMediaCount: number;
  onBack: () => void;
  onOpenMediaSelector: () => void;
  onEditAlbum: () => void;
  onDeleteAlbum: () => void;
}

export function LibraryAlbumHeader({
  currentAlbum,
  displayedMediaCount,
  onBack,
  onOpenMediaSelector,
  onEditAlbum,
  onDeleteAlbum,
}: LibraryAlbumHeaderProps) {
  return (
    <div className="rounded-xl bg-[#171821] border border-white/[0.06] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="w-8 h-8 rounded-lg bg-[#101116] hover:bg-[#20222d] text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer border border-white/10"
          title="Voltar para todas as mídias"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#f4a7b9] font-semibold">
              ÁLBUM
            </span>
            <span className="text-zinc-500 text-xs">• {displayedMediaCount} mídias</span>
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-white">
            {currentAlbum.name}
          </h3>
          {currentAlbum.description && (
            <p className="text-zinc-400 text-xs font-light mt-0.5 max-w-xl">
              {currentAlbum.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 self-end md:self-center">
        <button
          type="button"
          onClick={onOpenMediaSelector}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f4a7b9]/15 hover:bg-[#f4a7b9]/25 text-[#f4a7b9] text-xs font-semibold transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Adicionar do Acervo</span>
        </button>
        <button
          type="button"
          onClick={onEditAlbum}
          className="p-1.5 rounded-lg bg-[#101116] hover:bg-[#20222d] text-zinc-400 hover:text-white transition cursor-pointer border border-white/10"
          title="Editar dados do álbum"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onDeleteAlbum}
          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer border border-rose-500/20"
          title="Excluir álbum"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
