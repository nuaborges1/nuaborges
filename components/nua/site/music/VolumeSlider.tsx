'use client';

import React, { useRef } from 'react';
import { useMusicPlayer } from '@/lib/music';

export function VolumeSlider() {
  const { volume, isMuted, setVolume } = useMusicPlayer();
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const effVol = isMuted ? 0 : volume;
  const pct = Math.round(effVol * 100);

  const updateFromCoords = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setVolume(ratio);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    updateFromCoords(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging.current) {
      updateFromCoords(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label="Volume do player"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative flex-1 h-4 flex items-center cursor-pointer group select-none touch-none py-1"
    >
      {/* Trilho base */}
      <div className="relative w-full h-[3px] rounded-full bg-white/10 overflow-hidden">
        {/* Preenchimento rosa */}
        <div
          className="h-full rounded-full bg-[#f4a7b9] transition-[width] duration-75 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Marcador rosa sutil que acompanha o volume */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#f4a7b9] shadow-[0_0_8px_rgba(244,167,185,0.7)] opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-all duration-150 scale-90 group-hover:scale-110 pointer-events-none"
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}

export function VolumeIcon({ muted }: { muted: boolean }) {
  if (muted) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

export function fmt(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${ss.toString().padStart(2, '0')}`;
}
