'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';

interface Props {
  labels: readonly string[];
  step: number;
  onChange: (step: number) => void;
  summary?: string;
  canContinue?: boolean;
  hint?: string;
  footer?: boolean;
}

export function MobilePurchaseSteps({ labels, step, onChange, summary, canContinue = true, hint, footer }: Props) {
  if (footer) {
    if (step >= labels.length - 1) return null;
    return (
      <div className="mt-6 space-y-2.5 rounded-2xl border border-white/10 bg-[#08080c] p-4 lg:hidden">
        {summary && <p className="mb-1 text-sm text-zinc-300">Total <strong className="ml-1 font-serif text-base text-[#F5EEE9]">{summary}</strong></p>}
        <button
          type="button"
          disabled={!canContinue}
          onClick={() => onChange(step + 1)}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] enabled:hover:from-[#661C30] enabled:hover:to-[#90364B] border border-white/10 px-6 py-3 text-xs font-bold uppercase tracking-widest text-[#F5EEE9] shadow-[0_4px_20px_rgba(67,19,34,0.4)] transition-all disabled:opacity-45 cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#90364B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080c]"
        >
          Continuar <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
        {!canContinue && hint && <p className="text-xs text-zinc-300 text-center">{hint}</p>}
      </div>
    );
  }

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#08080c] p-4 lg:hidden">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#F5EEE9]/80">Etapa {step + 1} de {labels.length}</p>
        <h2 id="mobile-purchase-step" tabIndex={-1} className="scroll-mt-24 font-serif text-lg font-normal text-[#F5EEE9] mt-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#90364B] rounded">
          {labels[step]}
        </h2>
      </div>
      {summary && <p className="font-serif text-base font-medium text-[#F5EEE9] whitespace-nowrap">{summary}</p>}
      {step > 0 && (
        <button
          type="button"
          onClick={() => onChange(step - 1)}
          className="flex min-h-11 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 text-xs font-medium text-zinc-200 hover:bg-white/[0.08] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#90364B]"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-[#90364B]" aria-hidden="true" /> Voltar
        </button>
      )}
    </div>
  );
}

export function focusMobilePurchaseStep() {
  requestAnimationFrame(() => {
    const heading = document.getElementById('mobile-purchase-step');
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: 'start' });
  });
}
