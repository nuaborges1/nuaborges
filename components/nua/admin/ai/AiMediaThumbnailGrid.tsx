import React, { useState } from 'react';
import { Play, ZoomIn, X, Film, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface AiMediaThumbnailItem {
  url: string;
  alt?: string;
  title?: string;
  isVideo?: boolean;
}

interface AiMediaThumbnailGridProps {
  items: AiMediaThumbnailItem[];
}

export function isVideoUrl(url: string, alt: string = ''): boolean {
  const lowerUrl = (url || '').toLowerCase();
  const lowerAlt = (alt || '').toLowerCase();
  return (
    lowerAlt.includes('vídeo') ||
    lowerAlt.includes('video') ||
    lowerAlt.includes('clipe') ||
    lowerUrl.endsWith('.mp4') ||
    lowerUrl.endsWith('.webm') ||
    lowerUrl.endsWith('.mov') ||
    lowerUrl.endsWith('.mkv') ||
    lowerUrl.endsWith('.avi') ||
    lowerUrl.includes('/video/') ||
    lowerUrl.includes('video=true')
  );
}

export function AiMediaThumbnailGrid({ items }: AiMediaThumbnailGridProps) {
  const [selectedItem, setSelectedItem] = useState<AiMediaThumbnailItem | null>(null);

  if (!items || items.length === 0) return null;

  const count = items.length;
  // Layout responsivo proporcional à quantidade de mídias
  const gridClasses =
    count === 1
      ? 'grid-cols-1 max-w-[240px]'
      : count === 2
      ? 'grid-cols-2 max-w-[340px]'
      : count === 3
      ? 'grid-cols-3'
      : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';

  return (
    <div className="my-2.5 space-y-1.5">
      <div className={`grid ${gridClasses} gap-2`}>
        {items.map((item, index) => {
          const isVid = Boolean(item.isVideo || isVideoUrl(item.url, item.alt));
          const displayName = item.title || item.alt || (isVid ? `Vídeo ${index + 1}` : `Foto ${index + 1}`);

          return (
            <motion.div
              key={`${item.url}-${index}`}
              initial={{ opacity: 0, y: 8, filter: 'blur(3px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.35, delay: index * 0.045, ease: [0.19, 1, 0.22, 1] }}
              onClick={() => setSelectedItem({ ...item, isVideo: isVid })}
              className="group relative rounded-xl overflow-hidden bg-[#0d0e14] border border-white/10 hover:border-[#e5b894]/60 shadow-sm transition-all duration-200 cursor-pointer aspect-[3/4] flex flex-col justify-end"
            >
              {isVid ? (
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-[#e5b894]/20 border border-[#e5b894]/40 flex items-center justify-center text-[#e5b894] group-hover:scale-110 group-hover:bg-[#e5b894] group-hover:text-zinc-950 transition-all duration-200 shadow-lg">
                    <Play className="w-4 h-4 ml-0.5 fill-current" />
                  </div>
                  <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[9px] font-mono text-[#e5b894] flex items-center gap-1 border border-white/10">
                    <Film className="w-2.5 h-2.5" />
                    VÍDEO
                  </span>
                </div>
              ) : (
                <>
                  <img
                    src={item.url}
                    alt={displayName}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      // Fallback elegante caso a imagem falhe ao carregar
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.parentElement) {
                        const fb = e.currentTarget.parentElement.querySelector('.img-fallback');
                        if (fb) (fb as HTMLElement).style.display = 'flex';
                      }
                    }}
                  />
                  <div className="img-fallback hidden absolute inset-0 bg-zinc-900 items-center justify-center text-zinc-500">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                </>
              )}

              {/* Overlay com gradiente escuro e título */}
              <div className="relative z-10 p-2 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                <p className="text-[10px] font-medium text-white line-clamp-1 group-hover:text-[#e5b894] transition-colors">
                  {displayName}
                </p>
              </div>

              {/* Botão sutil de lupa no hover */}
              <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm p-1 rounded-md text-white border border-white/10">
                <ZoomIn className="w-3 h-3 text-[#e5b894]" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Lightbox / Modal de Prévia Ampliada */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedItem(null)}
            className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl max-h-[85vh] w-full rounded-2xl bg-[#14161f] border border-white/10 shadow-2xl overflow-hidden flex flex-col cursor-default"
            >
              {/* Top bar do Lightbox */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0e0f14]/80">
                <div className="flex items-center gap-2">
                  {selectedItem.isVideo ? (
                    <Film className="w-4 h-4 text-[#e5b894]" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-[#e5b894]" />
                  )}
                  <span className="text-xs font-semibold text-white truncate max-w-sm">
                    {selectedItem.title || selectedItem.alt || 'Prévia da Mídia'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="w-7 h-7 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Visualizador de Imagem ou Vídeo */}
              <div className="flex-1 flex items-center justify-center p-2 bg-black min-h-[300px] max-h-[70vh] overflow-hidden">
                {selectedItem.isVideo ? (
                  <video
                    src={selectedItem.url}
                    controls
                    autoPlay
                    playsInline
                    className="max-w-full max-h-[65vh] rounded-lg"
                  />
                ) : (
                  <img
                    src={selectedItem.url}
                    alt={selectedItem.alt || 'Foto em tamanho real'}
                    className="max-w-full max-h-[65vh] object-contain rounded-lg"
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
