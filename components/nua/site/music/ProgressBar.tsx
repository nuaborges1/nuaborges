/* Vinho maduro / Nua Borges */
'use client';

import React, { useRef } from 'react';
import { useMusicPlayer } from '@/lib/music';

export function ProgressBar() {
  const { currentTime, duration, seekTo } = useMusicPlayer();
  const barRef = useRef<HTMLDivElement>(null);
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!barRef.current || !duration) return;
    const rect = barRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(ratio * duration);
  }

  return (
    <div
      ref={barRef}
      role="slider"
      aria-label="Progresso da música"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      className="relative h-[3px] w-full rounded-full bg-white/10 cursor-pointer group"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') seekTo(Math.min(duration, currentTime + 5));
        if (e.key === 'ArrowLeft') seekTo(Math.max(0, currentTime - 5));
      }}
    >
      <div
        className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-[#661C30] to-[#90364B] transition-[width] duration-100 ease-linear"
        style={{ width: `${pct}%` }}
      />
      {/* Handle visível só no hover */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#90364B] shadow-[0_0_8px_rgba(102,28,48,0.7)] opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}
