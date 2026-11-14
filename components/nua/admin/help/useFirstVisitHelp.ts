'use client';

import { useEffect, useRef } from 'react';
import { HelpId } from './types';
import { useHelpModal } from './HelpModalContext';

/**
 * Hook que detecta a primeira visita a uma aba ou sub-aba e abre suavemente
 * a explicação contextual correspondente após a interface estar pintada.
 *
 * @param helpId Identificador estável da tela/aba ativa
 * @param delayMs Tempo de espera antes de abrir (padrão: 600ms)
 */
export function useFirstVisitHelp(helpId?: HelpId, delayMs = 600) {
  const { hasVisited, openHelp, isOpen } = useHelpModal();
  const openedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!helpId || isOpen) return;

    // Se já foi visitado anteriormente ou já abriu nesta sessão de componente, não abre
    if (hasVisited(helpId) || openedForRef.current === helpId) {
      return;
    }

    const timer = setTimeout(() => {
      // Checagem dupla de segurança antes de disparar
      if (!hasVisited(helpId) && !isOpen) {
        openedForRef.current = helpId;
        openHelp(helpId);
      }
    }, delayMs);

    return () => clearTimeout(timer);
  }, [helpId, hasVisited, openHelp, isOpen, delayMs]);
}
