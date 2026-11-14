'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { HelpId, HelpItem } from './types';
import { HELP_CATALOG } from './helpCatalog';
import { ContextualHelpModal } from './ContextualHelpModal';

const STORAGE_KEY = 'nua_help_views_v1';

interface HelpContextValue {
  activeHelpId: HelpId | null;
  isOpen: boolean;
  openHelp: (id: HelpId) => void;
  closeHelp: () => void;
  hasVisited: (id: HelpId) => boolean;
  markVisited: (id: HelpId) => void;
}

const HelpContext = createContext<HelpContextValue | null>(null);

export function HelpModalProvider({ children }: { children: React.ReactNode }) {
  const [activeHelpId, setActiveHelpId] = useState<HelpId | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [visitedMap, setVisitedMap] = useState<Record<string, boolean>>({});
  const [isClient, setIsClient] = useState(false);

  // Carrega histórico de visitas do localStorage após hidratação
  useEffect(() => {
    setIsClient(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setVisitedMap(JSON.parse(stored));
      }
    } catch {
      // Falha silenciosa caso o storage esteja desabilitado
    }
  }, []);

  const hasVisited = useCallback(
    (id: HelpId): boolean => {
      return Boolean(visitedMap[id]);
    },
    [visitedMap]
  );

  const markVisited = useCallback((id: HelpId) => {
    setVisitedMap((prev) => {
      const next = { ...prev, [id]: true };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const openHelp = useCallback((id: HelpId) => {
    if (HELP_CATALOG[id]) {
      setActiveHelpId(id);
      setIsOpen(true);
    }
  }, []);

  const closeHelp = useCallback(() => {
    if (activeHelpId) {
      markVisited(activeHelpId);
    }
    setIsOpen(false);
    setActiveHelpId(null);
  }, [activeHelpId, markVisited]);

  const activeItem: HelpItem | null = activeHelpId ? HELP_CATALOG[activeHelpId] ?? null : null;

  return (
    <HelpContext.Provider
      value={{
        activeHelpId,
        isOpen,
        openHelp,
        closeHelp,
        hasVisited,
        markVisited,
      }}
    >
      {children}
      {isClient && (
        <ContextualHelpModal
          isOpen={isOpen}
          item={activeItem}
          onClose={closeHelp}
        />
      )}
    </HelpContext.Provider>
  );
}

export function useHelpModal(): HelpContextValue {
  const ctx = useContext(HelpContext);
  if (!ctx) {
    throw new Error('useHelpModal deve ser utilizado dentro de um HelpModalProvider');
  }
  return ctx;
}
