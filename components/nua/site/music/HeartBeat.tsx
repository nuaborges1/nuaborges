/* Vinho maduro / Nua Borges */
'use client';

import React, { useEffect, useRef } from 'react';
import { useMusicPlayer } from '@/lib/music';

export function HeartBeat({ active }: { active: boolean }) {
  const { getFrequencyBars } = useMusicPlayer();
  const heartRef = useRef<HTMLSpanElement>(null);
  const currentScaleRef = useRef(1.0);
  const lastBeatTimeRef = useRef(0);

  useEffect(() => {
    // Quando pausado: não consome CPU de rAF; modo idle sereno (CSS puro)
    if (!active) {
      if (heartRef.current) {
        heartRef.current.style.transform = '';
        heartRef.current.style.filter = '';
        heartRef.current.style.opacity = '';
      }
      return;
    }

    let animId: number;

    const tick = () => {
      const el = heartRef.current;
      if (!el) {
        animId = requestAnimationFrame(tick);
        return;
      }

      // [baixas (graves / kicks), médias, agudas]
      const [bass, mid] = getFrequencyBars();

      // Foco estrito nos PICOS MAIS ALTOS (Grave / Bumbo principal da música):
      const peakEnergy = bass * 0.85 + mid * 0.15;

      const now = performance.now();
      const timeSinceLast = now - lastBeatTimeRef.current;

      // Dispara com clareza nos picos altos (impacto do grave) com cooldown natural (>280ms)
      if (peakEnergy > 0.35 && timeSinceLast > 280) {
        lastBeatTimeRef.current = now;
        const punch = 1.28 + Math.min(0.20, peakEnergy * 0.25);
        currentScaleRef.current = punch;
      } else {
        // Retorno elástico suave à base de repouso (1.0x)
        if (currentScaleRef.current > 1.0) {
          currentScaleRef.current = 1.0 + (currentScaleRef.current - 1.0) * 0.82;
          if (currentScaleRef.current < 1.008) {
            currentScaleRef.current = 1.0;
          }
        }
      }

      const scale = currentScaleRef.current;
      const isPeak = scale > 1.15;

      el.style.transform = `scale(${scale.toFixed(3)})`;
      el.style.opacity = isPeak ? '1' : '0.82';
      el.style.filter = isPeak
        ? `drop-shadow(0 0 ${(Math.min(12, (scale - 1) * 28)).toFixed(1)}px rgba(166,91,108,0.85))`
        : 'drop-shadow(0 0 1px rgba(102,28,48,0.30))';

      if (!document.hidden) {
        animId = requestAnimationFrame(tick);
      }
    };

    const handleVisChange = () => {
      if (!document.hidden && active) {
        cancelAnimationFrame(animId);
        animId = requestAnimationFrame(tick);
      }
    };

    const currentHeart = heartRef.current;
    document.addEventListener('visibilitychange', handleVisChange);
    animId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animId);
      document.removeEventListener('visibilitychange', handleVisChange);
      if (currentHeart) {
        currentHeart.style.transform = '';
        currentHeart.style.filter = '';
        currentHeart.style.opacity = '';
      }
    };
  }, [active, getFrequencyBars]);

  return (
    <span
      aria-hidden="true"
      className="flex items-center justify-center shrink-0"
      style={{ width: '20px', height: '20px' }}
    >
      <span
        ref={heartRef}
        className={!active ? 'animate-nua-heart-idle' : ''}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '14px',
          height: '14px',
          color: '#90364B',
          transformOrigin: 'center center',
          userSelect: 'none',
          willChange: 'transform, opacity, filter',
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ display: 'block' }}
        >
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      </span>
    </span>
  );
}
