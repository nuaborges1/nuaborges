'use client';

import React from 'react';
import { CommercialFinanceData } from '@/lib/services/nua/commercialFinanceService';

interface CommercialFinanceTimelineProps {
  data: CommercialFinanceData | null;
  maxTimelineAmount: number;
  formatMoney: (val?: number) => string;
}

export function CommercialFinanceTimeline({
  data,
  maxTimelineAmount,
  formatMoney,
}: CommercialFinanceTimelineProps) {
  return (
    <div className="p-5 sm:p-6 rounded-xl bg-[#16171d] border border-white/[0.07] space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-wide">
            Evolução dos Recebimentos no Período
          </h3>
          <p className="text-[11px] text-zinc-400 font-light mt-0.5">
            Valores diários recebidos via Mercado Pago. Gráfico gerado apenas quando há lançamentos reais.
          </p>
        </div>
        <span className="text-xs font-mono text-zinc-500">
          {data?.timeline?.length || 0} dia(s) com movimentação
        </span>
      </div>

      {data?.timeline && data.timeline.length > 0 ? (
        <div className="space-y-3 pt-3">
          <div className="h-44 w-full flex items-end gap-2 sm:gap-3 px-2 pt-6 overflow-x-auto">
            {data.timeline.map((day) => {
              const heightPercent = Math.max(8, Math.round((day.amount / maxTimelineAmount) * 100));
              return (
                <div
                  key={day.date}
                  className="flex-1 min-w-[36px] max-w-[60px] h-full flex flex-col items-center justify-end group cursor-pointer"
                >
                  <span className="opacity-0 group-hover:opacity-100 text-[10px] font-mono text-[#f4a7b9] font-bold mb-1 transition-opacity">
                    {formatMoney(day.amount)}
                  </span>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full rounded-t-lg bg-gradient-to-t from-[#f4a7b9]/40 to-[#f4a7b9] hover:brightness-125 transition-all shadow-[0_0_12px_rgba(244,167,185,0.2)]"
                  />
                  <span className="text-[10px] font-mono text-zinc-500 mt-2 truncate w-full text-center">
                    {day.date.slice(8, 10)}/{day.date.slice(5, 7)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-zinc-400 text-xs">
          Nenhuma movimentação financeira confirmada registrada para este período específico.
        </div>
      )}
    </div>
  );
}
