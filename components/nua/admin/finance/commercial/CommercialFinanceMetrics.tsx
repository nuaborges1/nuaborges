/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import {
  Wallet,
  Clock,
  ArrowUpRight,
  CreditCard,
  ArrowDownRight,
  ShoppingBag,
} from 'lucide-react';
import { CommercialFinanceData } from '@/lib/services/nua/commercialFinanceService';

interface CommercialFinanceMetricsProps {
  data: CommercialFinanceData | null;
  formatMoney: (val?: number | null) => string;
}

export function CommercialFinanceMetrics({ data, formatMoney }: CommercialFinanceMetricsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {/* Card 1: Saldo Disponível para Saque */}
      <div className="p-4 rounded-xl bg-[#14161d] border border-white/[0.06] flex flex-col justify-between space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-mono font-medium">
            Saldo no Mercado Pago
          </span>
          <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Wallet className="w-3 h-3" />
          </div>
        </div>
        <div>
          <span className="text-xl font-sans font-bold text-white tracking-tight block">
            {formatMoney(data?.balance?.available)}
          </span>
          <span className="text-[10px] text-zinc-400 font-light block mt-0.5">
            Disponível para saque quando confirmado pelo Mercado Pago
          </span>
        </div>
      </div>

      {/* Card 2: Saldo Pendente */}
      <div className="p-4 rounded-xl bg-[#14161d] border border-white/[0.06] flex flex-col justify-between space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-amber-400 font-mono font-medium">
            Pedidos aguardando pagamento
          </span>
          <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Clock className="w-3 h-3" />
          </div>
        </div>
        <div>
          <span className="text-xl font-sans font-bold text-white tracking-tight block">
            {formatMoney(data?.summary?.pendingOrderAmount)}
          </span>
          <span className="text-[10px] text-zinc-400 font-light block mt-0.5">
            {data ? data.summary.pendingCount + ' pedido(s) pendente(s)' : 'Aguardando dados'}
          </span>
        </div>
      </div>

      {/* Card 3: Total Recebido no Período */}
      <div className="p-4 rounded-xl bg-[#14161d] border border-[#843C52]/40 flex flex-col justify-between space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-zinc-300 font-mono font-medium">
            Receita Bruta ({data?.periodLabel || 'Período'})
          </span>
          <div className="w-6 h-6 rounded-md bg-[#843C52]/30 flex items-center justify-center text-white">
            <ArrowUpRight className="w-3 h-3" />
          </div>
        </div>
        <div>
          <span className="text-xl font-sans font-bold text-white tracking-tight block">
            {formatMoney(data?.summary?.totalReceived)}
          </span>
          <span className="text-[10px] text-zinc-400 font-light block mt-0.5">
            Vendas confirmadas antes das taxas e devoluções
          </span>
        </div>
      </div>

      {/* Card 4: Taxas Mercado Pago Efetivas */}
      <div className="p-4 rounded-xl bg-[#171821] border border-white/[0.06] flex flex-col justify-between space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-mono font-medium">
            Taxas Mercado Pago
          </span>
          <div className="w-6 h-6 rounded-md bg-white/[0.06] flex items-center justify-center text-zinc-400">
            <CreditCard className="w-3 h-3" />
          </div>
        </div>
        <div>
          <span className="text-xl font-sans font-bold text-zinc-300 tracking-tight block">
            {formatMoney(data?.summary?.totalFees)}
          </span>
          <span className="text-[10px] text-zinc-400 font-light block mt-0.5">
            Taxas informadas pelo Mercado Pago
          </span>
        </div>
      </div>

      {/* Card 5: Reembolsos */}
      <div className="p-4 rounded-xl bg-[#171821] border border-white/[0.06] flex flex-col justify-between space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-mono font-medium">
            Reembolsos
          </span>
          <div className="w-6 h-6 rounded-md bg-white/[0.06] flex items-center justify-center text-zinc-400">
            <ArrowDownRight className="w-3 h-3" />
          </div>
        </div>
        <div>
          <span className="text-xl font-sans font-bold text-zinc-300 tracking-tight block">
            {formatMoney(data?.summary?.totalRefunds)}
          </span>
          <span className="text-[10px] text-zinc-400 font-light block mt-0.5">
            Devoluções confirmadas
          </span>
        </div>
      </div>

      {/* Card 6: Quantidade de Vendas */}
      <div className="p-4 rounded-xl bg-[#171821] border border-white/[0.06] flex flex-col justify-between space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-mono font-medium">
            Vendas Pagas
          </span>
          <div className="w-6 h-6 rounded-md bg-white/[0.06] flex items-center justify-center text-zinc-400">
            <ShoppingBag className="w-3 h-3" />
          </div>
        </div>
        <div>
          <span className="text-xl font-sans font-bold text-white tracking-tight block">
            {data?.summary?.salesCount ?? '—'}
          </span>
          <span className="text-[10px] text-zinc-400 font-light block mt-0.5">
            Transações concluídas
          </span>
        </div>
      </div>
    </div>
  );
}
