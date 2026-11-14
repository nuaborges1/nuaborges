import { useRef, useCallback, useEffect } from 'react';

interface UseMusicFadesOptions {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  volume: number;
  isMuted: boolean;
}

export function useMusicFades({ audioRef, volume, isMuted }: UseMusicFadesOptions) {
  const fadeTokenRef = useRef(0);
  const fadeTimerRef = useRef<any>(null);
  const currentFadeRef = useRef(1);
  const isFadingRef = useRef(false);

  const applyVolume = useCallback((multiplier = 1) => {
    currentFadeRef.current = multiplier;
    const target = isMuted ? 0 : volume * multiplier;
    if (audioRef.current) {
      // Curva quadrática: sensação humana suave em todo o curso do slider
      const perceptual = Math.pow(Math.max(0, Math.min(1, target)), 2);
      audioRef.current.volume = perceptual;
    }
  }, [audioRef, isMuted, volume]);

  useEffect(() => {
    applyVolume(currentFadeRef.current);
  }, [volume, isMuted, applyVolume]);

  const fadeIn = useCallback((ms = 600) => {
    fadeTokenRef.current++;
    const currentToken = fadeTokenRef.current;
    if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
    isFadingRef.current = false;

    const steps = 8;
    const interval = ms / steps;
    let step = 0;
    applyVolume(0.2);

    fadeTimerRef.current = setInterval(() => {
      if (fadeTokenRef.current !== currentToken) {
        clearInterval(fadeTimerRef.current);
        return;
      }
      step++;
      applyVolume(Math.min(1, 0.2 + (step / steps) * 0.8));
      if (step >= steps) {
        clearInterval(fadeTimerRef.current);
        fadeTimerRef.current = null;
        applyVolume(1);
      }
    }, interval);
  }, [applyVolume]);

  const fadeOut = useCallback((ms = 250): Promise<void> => {
    return new Promise((resolve) => {
      fadeTokenRef.current++;
      const currentToken = fadeTokenRef.current;
      if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
      isFadingRef.current = true;

      const steps = 6;
      const interval = ms / steps;
      let step = steps;

      fadeTimerRef.current = setInterval(() => {
        if (fadeTokenRef.current !== currentToken) {
          clearInterval(fadeTimerRef.current);
          resolve();
          return;
        }
        step--;
        applyVolume(Math.max(0, step / steps));
        if (step <= 0) {
          clearInterval(fadeTimerRef.current);
          fadeTimerRef.current = null;
          isFadingRef.current = false;
          resolve();
        }
      }, interval);
    });
  }, [applyVolume]);

  const cleanupFades = useCallback(() => {
    if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
  }, []);

  return {
    applyVolume,
    fadeIn,
    fadeOut,
    isFadingRef,
    cleanupFades,
  };
}
