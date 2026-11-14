'use client';

import { useHelpModal } from './HelpModalContext';
import { HelpId } from './types';

export function useContextualHelp() {
  const { openHelp, closeHelp, isOpen, activeHelpId, hasVisited } = useHelpModal();

  return {
    openHelp,
    closeHelp,
    isHelpOpen: isOpen,
    activeHelpId,
    hasVisited,
  };
}
