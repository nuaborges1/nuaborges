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
      className={`inline-flex items-center gap-1.5 rounded-xl border border-[#f4a7b9]/45 bg-[#1e1924]/80 text-[#f4a7b9] text-xs font-medium hover:bg-[#f4a7b9]/15 hover:border-[#f4a7b9] hover:text-[#ffb8c9] transition-all cursor-pointer shadow-xs active:scale-[0.98] shrink-0 ${
        compact ? 'p-1.5' : 'px-3 py-1.5'
      } ${className}`}
    >
      <HelpCircle className="w-3.5 h-3.5 shrink-0 text-[#f4a7b9]" />
      {!compact && <span>{label}</span>}
    </button>
  );
}
