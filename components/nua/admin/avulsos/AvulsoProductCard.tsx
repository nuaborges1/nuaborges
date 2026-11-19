/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import {
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Film,
  Lock,
  Edit2,
  Copy,
  Trash2,
  Package,
  ExternalLink,
} from 'lucide-react';
import { AvulsoProductItem } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';
import { formatBrlPrice } from '@/lib/formatters';

interface AvulsoProductCardProps {
  item: AvulsoProductItem;
  originalIndex: number;
  totalItems: number;
  onEdit: (index: number) => void;
  onClone: (index: number, e: React.MouseEvent) => void;
  onDelete: (index: number) => void;
  onToggleActive: (index: number) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  getPublicPackUrl: (slug: string) => string;
}

export function AvulsoProductCard({
  item,
  originalIndex,
  totalItems,
  onEdit,
  onClone,
  onDelete,
  onToggleActive,
  onMove,
  getPublicPackUrl,
}: AvulsoProductCardProps) {
  const previewCount = item.previewImages?.length || 0;
  const vaultPhotosCount =
    (item.exclusivePhotos && item.exclusivePhotos.length > 0
      ? item.exclusivePhotos.length
      : item.previewImages?.length) || 0;
  const videoCount = item.videos?.length || 0;

  return (
    <div
      className={`bg-[#14151b] border rounded-xl p-3.5 sm:p-4 transition space-y-3 ${
        item.active !== false
          ? 'border-white/[0.06] hover:border-white/[0.12]'
          : 'border-amber-500/20 bg-[#121318]/70 opacity-80'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          {/* Miniatura da Capa */}
          <div className="relative aspect-[3/4] w-14 sm:w-16 rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">
            {item.imageUrl ? (
              <img
                src={
                  item.imageUrl.startsWith('data:') ||
                  item.imageUrl.startsWith('http') ||
                  item.imageUrl.startsWith('/')
                    ? item.imageUrl
                    : resolveMediaUrl(item.imageUrl, 'mobile')
                }
                alt={item.title || 'Capa do pack'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (
                    item.previewImages &&
                    item.previewImages.length > 0 &&
                    target.src !== item.previewImages[0]
                  ) {
                    target.src = item.previewImages[0];
                  } else {
                    target.src = '/images/nua/gallery/gallery-1.png';
                  }
                }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-600 p-2 text-center">
                <Package className="w-6 h-6 mb-1 text-zinc-500" />
                <span className="text-[9px] uppercase tracking-wider font-mono">Sem Foto</span>
              </div>
            )}
            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-zinc-300">
              #{originalIndex + 1}
            </span>
          </div>

          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white text-sm sm:text-base font-semibold truncate block">
                {item.title}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                item.modality === 'avulso'
                  ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}>
                {item.modality === 'avulso' ? 'Conteúdo Avulso' : 'Pack / Coleção'}
              </span>
              {item.badge && (
                <span className="px-2 py-0.5 rounded-full bg-[#843C52]/15 text-[#843C52] text-[10px] font-semibold uppercase tracking-wider border border-[#843C52]/30">
                  {item.badge}
                </span>
              )}
              {item.active === false && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-semibold uppercase tracking-wider border border-amber-500/30">
                  Oculto
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
              <span className="text-emerald-400 font-bold">R$ {formatBrlPrice(item.price)}</span>
              <span className="text-zinc-600">•</span>
              <span>
                {item.duration && !item.duration.includes('35 Fotos') && !(vaultPhotosCount !== 15 && item.duration.includes('15 Fotos'))
                  ? item.duration
                  : videoCount > 0 && vaultPhotosCount > 0
                  ? `${vaultPhotosCount} Foto${vaultPhotosCount === 1 ? '' : 's'} 4K • ${videoCount} Vídeo${videoCount === 1 ? '' : 's'} UHD`
                  : videoCount > 0
                  ? `${videoCount} Vídeo${videoCount === 1 ? '' : 's'} 4K UHD`
                  : vaultPhotosCount > 0
                  ? `${vaultPhotosCount} Foto${vaultPhotosCount === 1 ? '' : 's'} 4K`
                  : 'Sem mídias anexadas'}
              </span>
            </div>

            <p className="text-zinc-500 text-xs line-clamp-1 font-light max-w-xl">
              {item.description}
            </p>

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="text-[10px] text-zinc-300 bg-[#0e0f14] px-2 py-0.5 rounded-md border border-white/[0.06] flex items-center gap-1">
                <Eye className="w-3 h-3 text-[#843C52]" />
                <span>{previewCount} prévias da vitrine</span>
              </span>
              <span className="text-[10px] text-zinc-300 bg-[#0e0f14] px-2 py-0.5 rounded-md border border-white/[0.06] flex items-center gap-1">
                <Lock className="w-3 h-3 text-zinc-400" />
                <span>{vaultPhotosCount} fotos 4K no cofre</span>
              </span>
              <span className="text-[10px] text-zinc-300 bg-[#0e0f14] px-2 py-0.5 rounded-md border border-white/[0.06] flex items-center gap-1">
                <Film className="w-3 h-3 text-[#843C52]" />
                <span>
                  {videoCount} {videoCount === 1 ? 'vídeo' : 'vídeos'}
                </span>
              </span>
              {item.slug && (
                <span className="text-[10px] text-zinc-500 font-mono hidden lg:inline">
                  /avulsos/{item.slug}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="flex items-center gap-1.5 self-end md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/[0.06] w-full md:w-auto justify-end">
          {/* Botão de Ver no Site */}
          {item.slug && (
            <a
              href={getPublicPackUrl(item.slug)}
              target="_blank"
              rel="noreferrer"
              className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 flex items-center justify-center transition cursor-pointer"
              title="Ver página de venda deste pack no site público"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Mover Posição */}
          <div className="flex items-center rounded-lg bg-[#0e0f14] border border-white/[0.06] p-0.5">
            <button
              type="button"
              onClick={() => onMove(originalIndex, 'up')}
              disabled={originalIndex === 0}
              className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition cursor-pointer"
              title="Mover para cima no catálogo"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onMove(originalIndex, 'down')}
              disabled={originalIndex === totalItems - 1}
              className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition cursor-pointer"
              title="Mover para baixo no catálogo"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>

          {/* Ativar/Ocultar */}
          <button
            type="button"
            onClick={() => onToggleActive(originalIndex)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer border ${
              item.active !== false
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                : 'bg-amber-950/20 text-amber-400 border-amber-900/40 hover:bg-amber-950/40'
            }`}
            title={item.active !== false ? 'Ocultar da vitrine pública' : 'Publicar na vitrine pública'}
          >
            {item.active !== false ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Editar Completo via Modal */}
          <button
            type="button"
            onClick={() => onEdit(originalIndex)}
            className="h-8 px-4 rounded-full bg-[#843C52] hover:bg-[#992b4a] text-white text-xs font-semibold transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Edit2 className="w-3 h-3" />
            <span>Editar Pack</span>
          </button>

          {/* Duplicar Pack */}
          <button
            type="button"
            onClick={(e) => onClone(originalIndex, e)}
            className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition cursor-pointer flex items-center justify-center"
            title="Duplicar este pack (criar cópia)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* Excluir */}
          <button
            type="button"
            onClick={() => onDelete(originalIndex)}
            className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400/80 hover:text-rose-300 transition cursor-pointer flex items-center justify-center"
            title="Excluir pack permanentemente"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
