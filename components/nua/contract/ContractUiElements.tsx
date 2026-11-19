/* Vinho maduro / Nua Borges */
import React from 'react';

export function Clausula({
  num,
  title,
  children,
  highlight = false,
}: {
  num: string;
  title: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <section
      className={`contract-section space-y-3 print:space-y-1.5 print:mb-4 ${
        highlight
          ? 'p-5 sm:p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/70 print:p-0 print:bg-transparent print:border-none'
          : ''
      }`}
    >
      <h2 className="contract-clause-title font-serif text-base sm:text-lg text-white print:text-black font-medium flex items-start gap-2.5 leading-snug">
        <span className="text-[#90364B] print:text-black font-mono text-sm shrink-0 pt-0.5">
          {num}.
        </span>
        {title}
      </h2>
      <div className="contract-body space-y-2.5 print:space-y-1.5 text-sm leading-relaxed text-zinc-300 print:text-zinc-800">
        {children}
      </div>
    </section>
  );
}

export function ContractList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-none space-y-1.5 print:space-y-1 pl-0">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-zinc-400 print:text-zinc-700 text-xs sm:text-sm">
          <span className="mt-1.5 w-1 h-1 rounded-full bg-[#90364B]/60 print:bg-zinc-600 shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function Nota({
  children,
  variant = 'neutral',
}: {
  children: React.ReactNode;
  variant?: 'neutral' | 'warning' | 'positive';
}) {
  const classes: Record<string, string> = {
    neutral: 'bg-zinc-900/60 border-zinc-800 print:bg-zinc-50 print:border-zinc-300',
    warning: 'bg-amber-950/20 border-amber-500/25 print:bg-amber-50/40 print:border-amber-300',
    positive: 'bg-emerald-950/20 border-emerald-500/25 print:bg-emerald-50/40 print:border-emerald-300',
  };
  return (
    <div className={`contract-nota p-4 rounded-xl border text-xs text-zinc-300 print:text-zinc-800 leading-relaxed ${classes[variant]}`}>
      {children}
    </div>
  );
}
