/* Vinho maduro / Nua Borges */
/**
 * components/nua/admin/briefing/BriefingMetricCard.tsx
 *
 * Card compacto de métrica executiva para o Briefing Diário Matinal.
 */

import React from 'react';

interface BriefingMetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  badgeText?: string;
  badgeVariant?: 'pink' | 'emerald' | 'amber' | 'blue';
  description: string;
  onClick?: () => void;
}

const BADGE_STYLES: Record<string, string> = {
  pink: 'bg-[#843C52]/15 text-[#843C52] border-[#843C52]/30',
  emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  blue: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

export function BriefingMetricCard({
  icon,
  title,
  value,
  badgeText,
  badgeVariant = 'pink',
  description,
  onClick,
}: BriefingMetricCardProps) {
  return (
    <div
      onClick={onClick}
      className={`relative p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-[#843C52]/40 hover:bg-white/[0.05] transition-all duration-200 flex flex-col justify-between ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center text-[#843C52]">
            {icon}
          </div>
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{title}</span>
        </div>
        {badgeText && (
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              BADGE_STYLES[badgeVariant] || BADGE_STYLES.pink
            }`}
          >
            {badgeText}
          </span>
        )}
      </div>

      <div className="my-1.5">
        <span className="text-xl sm:text-2xl font-bold text-white tracking-tight">{value}</span>
      </div>

      <p className="text-xs text-zinc-400 line-clamp-1">{description}</p>
    </div>
  );
}
