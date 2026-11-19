/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { LibraryImageItem } from '@/lib/types';
import { MediaUsageRecord } from '@/lib/mediaUsage';

interface MediaViewerSidebarDetailsProps {
  item: LibraryImageItem;
  usages: MediaUsageRecord[];
  formattedSize: string;
}

export function MediaViewerSidebarDetails({
  item,
  usages,
  formattedSize,
}: MediaViewerSidebarDetailsProps) {
  return (
    <>
      {/* Status "Em Uso no Site" */}
      <div className="p-3 rounded-lg bg-[#101116] border border-white/[0.06]">
        <span className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider block mb-1.5">
          Presença no Site
        </span>
        {usages.length > 0 ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>
                Usada em {usages.length} {usages.length === 1 ? 'local' : 'locais'}
              </span>
            </div>
            <ul className="space-y-1 pl-1">
              {usages.map((u, i) => (
                <li key={i} className="text-zinc-300 text-[11px] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#843C52]" />
                  <span className="font-medium text-white">{u.label}:</span>
                  <span className="text-zinc-400">{u.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-zinc-500 text-xs font-light">
            Esta mídia ainda não está sendo exibida publicamente em nenhuma seção.
          </p>
        )}
      </div>

      {/* Technical Details */}
      <div className="text-[11px] text-zinc-400 space-y-1.5 pt-1 border-t border-white/[0.06] font-mono">
        <div className="flex items-center justify-between">
          <span className="text-zinc-500 font-sans">Formato:</span>
          <span>{item.isVideo ? 'Vídeo UHD' : 'Fotografia'}</span>
        </div>
        {item.isVideo && (item.duration || item.durationSeconds) && (
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 font-sans">Duração:</span>
            <span className="text-[#843C52] font-semibold">
              {item.duration ||
                `${Math.floor(item.durationSeconds! / 60)}:${String(
                  Math.floor(item.durationSeconds! % 60)
                ).padStart(2, '0')}`}
            </span>
          </div>
        )}
        {item.width && item.height && (
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 font-sans">Resolução:</span>
            <span>
              {item.width} × {item.height}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-zinc-500 font-sans">Tamanho:</span>
          <span>{formattedSize}</span>
        </div>
        {(item.fileHash || item.fingerprint) && (
          <div
            className="flex items-center justify-between"
            title={item.fileHash || item.fingerprint}
          >
            <span className="text-zinc-500 font-sans">Hash Único:</span>
            <span className="truncate max-w-[140px] text-zinc-400">
              {(item.fileHash || item.fingerprint)?.substring(0, 16)}...
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-zinc-500 font-sans">Adicionada em:</span>
          <span>{item.uploadedAt || 'Recente'}</span>
        </div>
      </div>
    </>
  );
}
