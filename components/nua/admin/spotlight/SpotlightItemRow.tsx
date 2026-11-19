/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { SpotlightItem } from './types';

interface SpotlightItemRowProps {
  item: SpotlightItem;
  isSelected: boolean;
  onSelect: () => void;
  onExecute: () => void;
}

export function SpotlightItemRow({
  item,
  isSelected,
  onSelect,
  onExecute,
}: SpotlightItemRowProps) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      data-selected={isSelected}
      onClick={onExecute}
      onMouseEnter={onSelect}
      className={`w-full text-left p-3 rounded-xl flex items-center justify-between gap-3 transition-all cursor-pointer ${
        isSelected
          ? 'bg-white/[0.09] border border-[#843C52]/40 text-white shadow-lg shadow-black/40'
          : 'bg-white/[0.02] hover:bg-white/[0.05] border border-transparent text-zinc-300'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
            isSelected
              ? 'bg-[#843C52] text-white font-semibold'
              : 'bg-white/[0.06] text-zinc-400 border border-white/[0.06]'
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs sm:text-sm font-medium truncate ${
                isSelected ? 'text-white font-semibold' : 'text-zinc-200'
              }`}
            >
              {item.title}
            </span>
            {item.badge && (
              <span
                className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase tracking-wider shrink-0 ${
                  item.badgeVariant === 'success'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : item.badgeVariant === 'warning'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-[#843C52]/20 text-[#843C52] border border-[#843C52]/30'
                }`}
              >
                {item.badge}
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-light">
            {item.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 hidden sm:inline">
          {item.categoryLabel}
        </span>
        <div
          className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
            isSelected ? 'text-[#843C52]' : 'text-zinc-600'
          }`}
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </button>
  );
}
