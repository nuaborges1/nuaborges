import { useEffect } from 'react';

interface UseMusicShortcutsOptions {
  toggle: () => void;
  toggleMute: () => void;
  next: () => void;
  prev: () => void;
  seekTo: (time: number) => void;
  currentTime: number;
  duration: number;
}

export function useMusicShortcuts({
  toggle,
  toggleMute,
  next,
  prev,
  seekTo,
  currentTime,
  duration,
}: UseMusicShortcutsOptions) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Só intercepta teclas se o foco estiver explicitamente dentro do player de música
      const isInsidePlayer = Boolean(
        target?.closest('[data-music-player]') ||
        target?.closest('[aria-label="Player de música"]') ||
        target?.closest('.music-player')
      );

      if (!isInsidePlayer) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        toggle();
      } else if (e.code === 'KeyM') {
        toggleMute();
      } else if (e.code === 'KeyN') {
        next();
      } else if (e.code === 'KeyP') {
        prev();
      } else if (e.code === 'ArrowRight' && (e.ctrlKey || e.altKey)) {
        seekTo(Math.min(duration, currentTime + 10));
      } else if (e.code === 'ArrowLeft' && (e.ctrlKey || e.altKey)) {
        seekTo(Math.max(0, currentTime - 10));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle, toggleMute, next, prev, seekTo, currentTime, duration]);
}
