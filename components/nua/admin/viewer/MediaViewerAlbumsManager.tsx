/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import { Folder, FolderPlus, Check } from 'lucide-react';
import { MediaAlbum } from '@/lib/types';

interface MediaViewerAlbumsManagerProps {
  itemId: string;
  albums: MediaAlbum[];
  currentAlbums: MediaAlbum[];
  showAlbumMenu: boolean;
  setShowAlbumMenu: (v: boolean) => void;
  onToggleAlbum: (albumId: string) => void;
}

export function MediaViewerAlbumsManager({
  itemId,
  albums,
  currentAlbums,
  showAlbumMenu,
  setShowAlbumMenu,
  onToggleAlbum,
}: MediaViewerAlbumsManagerProps) {
  return (
    <div className="p-3 rounded-lg bg-[#101116] border border-white/[0.06]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">
          Álbuns ({currentAlbums.length})
        </span>
        <button
          type="button"
          onClick={() => setShowAlbumMenu(!showAlbumMenu)}
          className="text-[#843C52] hover:text-[#992b4a] text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>Gerenciar</span>
        </button>
      </div>

      {currentAlbums.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {currentAlbums.map((alb) => (
            <span
              key={alb.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-white text-[11px]"
            >
              <Folder className="w-3 h-3 text-[#843C52]" />
              <span>{alb.name}</span>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-zinc-500 text-xs font-light">
          Não associada a nenhum álbum personalizado.
        </p>
      )}

      {/* Album Toggle Dropdown */}
      {showAlbumMenu && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1">
          <span className="text-zinc-400 text-[10px] block mb-1">
            Marque os álbuns para incluir esta foto:
          </span>
          {albums.length === 0 ? (
            <span className="text-zinc-500 text-xs block py-1">Nenhum álbum criado.</span>
          ) : (
            albums.map((alb) => {
              const inAlbum = alb.mediaIds.includes(itemId);
              return (
                <button
                  key={alb.id}
                  type="button"
                  onClick={() => onToggleAlbum(alb.id)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-xs flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className={inAlbum ? 'text-[#843C52] font-medium' : 'text-zinc-300'}>
                    {alb.name}
                  </span>
                  {inAlbum ? (
                    <Check className="w-3.5 h-3.5 text-[#843C52]" />
                  ) : (
                    <span className="text-zinc-500 text-[10px]">+ Adicionar</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
