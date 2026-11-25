/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import { ShoppingBag, Camera, Video } from 'lucide-react';
import { CommercialFinanceData } from '@/lib/services/nua/commercialFinanceService';

interface CommercialFinanceModalitiesProps {
  data: CommercialFinanceData | null;
  formatMoney: (val?: number) => string;
}

export function CommercialFinanceModalities({ data, formatMoney }: CommercialFinanceModalitiesProps) {
  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-white tracking-wide">
          Receita Consolidada por Modalidade Comercial
        </h2>
        <span className="text-[11px] text-zinc-500 font-light">
          Classificação obtida a partir dos registros reais dos pedidos
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Modalidade 1: Conteúdos & Packs */}
        <div className="p-5 rounded-xl bg-[#16171d] border border-white/[0.07] space-y-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <ShoppingBag className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white tracking-wide">
                  Conteúdos &amp; Packs
                </h3>
                <span className="text-[10px] text-zinc-400 font-light">
                  Acervo digital e vídeos sob demanda
                </span>
              </div>
            </div>

            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300">
              {data?.modalities?.packs?.count || 0} vendas
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-zinc-400">Receita Bruta:</span>
              <span className="font-serif text-lg font-bold text-white">
                {formatMoney(data?.modalities?.packs?.gross)}
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-zinc-400">
              <span>Taxas Mercado Pago:</span>
              <span className="font-mono text-zinc-300">
                - {formatMoney(data?.modalities?.packs?.fees)}
              </span>
            </div>
            <div className="flex justify-between text-xs pt-2 border-t border-white/[0.06]">
              <span className="text-zinc-300 font-medium">Líquido Estimado:</span>
              <span className="font-serif font-bold text-[#843C52]">
                {formatMoney(data?.modalities?.packs?.net)}
              </span>
            </div>
          </div>
        </div>

        {/* Modalidade 2: Personalizados */}
        <div className="p-5 rounded-xl bg-[#16171d] border border-white/[0.07] space-y-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Camera className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white tracking-wide">
                  Personalizados
                </h3>
                <span className="text-[10px] text-zinc-400 font-light">
                  Produções autorais sob medida
                </span>
              </div>
            </div>

            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300">
              {data?.modalities?.personalizados?.count || 0} pedidos
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-zinc-400">Receita Bruta:</span>
              <span className="font-serif text-lg font-bold text-white">
                {formatMoney(data?.modalities?.personalizados?.gross)}
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-zinc-400">
              <span>Taxas Mercado Pago:</span>
              <span className="font-mono text-zinc-300">
                - {formatMoney(data?.modalities?.personalizados?.fees)}
              </span>
            </div>
            <div className="flex justify-between text-xs pt-2 border-t border-white/[0.06]">
              <span className="text-zinc-300 font-medium">Líquido Estimado:</span>
              <span className="font-serif font-bold text-purple-300">
                {formatMoney(data?.modalities?.personalizados?.net)}
              </span>
            </div>
          </div>
        </div>

        {/* Modalidade 3: Chamadas */}
        <div className="p-5 rounded-xl bg-[#16171d] border border-white/[0.07] space-y-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Video className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white tracking-wide">
                  Chamadas de Vídeo
                </h3>
                <span className="text-[10px] text-zinc-400 font-light">
                  Videochamadas ao vivo privadas
                </span>
              </div>
            </div>

            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300">
              {data?.modalities?.chamadas?.count || 0} chamadas
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-zinc-400">Receita Bruta:</span>
              <span className="font-serif text-lg font-bold text-white">
                {formatMoney(data?.modalities?.chamadas?.gross)}
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-zinc-400">
              <span>Taxas Mercado Pago:</span>
              <span className="font-mono text-zinc-300">
                - {formatMoney(data?.modalities?.chamadas?.fees)}
              </span>
            </div>
            <div className="flex justify-between text-xs pt-2 border-t border-white/[0.06]">
              <span className="text-zinc-300 font-medium">Líquido Estimado:</span>
              <span className="font-serif font-bold text-emerald-300">
                {formatMoney(data?.modalities?.chamadas?.net)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
