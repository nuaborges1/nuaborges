'use client';

import { useEffect } from 'react';
import { lockScroll, unlockScroll } from '@/lib/scrollLock';

/**
 * Hook para travar o scroll do background quando um modal, drawer ou lightbox estiver aberto.
 * Utiliza contagem de referências para que modais aninhados não quebrem o bloqueio.
 */
export function useScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;
    lockScroll();
    return () => {
      unlockScroll();
    };
  }, [isLocked]);
}
