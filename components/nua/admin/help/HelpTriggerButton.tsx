/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import { HelpCircle } from 'lucide-react';
import { HelpId } from './types';
import { useHelpModal } from './HelpModalContext';

export interface HelpTriggerButtonProps {
  helpId: HelpId;
  label?: string;
  compact?: boolean;
  className?: string;
}

export function HelpTriggerButton({
  helpId,
  label = 'Ajuda',
  compact = false,
  className = '',
}: HelpTriggerButtonProps) {
  const { openHelp } = useHelpModal();

  return (
    <button
      type="button"
      onClick={() => openHelp(helpId)}
      aria-label={`Ajuda: ${label}`}
      className={`inline-flex items-center gap-1.5 rounded-xl border border-[#843C52]/45 bg-[#1e1924]/80 text-[#843C52] text-xs font-medium hover:bg-[#843C52]/15 hover:border-[#843C52] hover:text-[#992b4a] transition-all cursor-pointer shadow-xs active:scale-[0.98] shrink-0 ${
        compact ? 'p-1.5' : 'px-3 py-1.5'
      } ${className}`}
    >
      <HelpCircle className="w-3.5 h-3.5 shrink-0 text-[#843C52]" />
      {!compact && <span>{label}</span>}
    </button>
  );
}
