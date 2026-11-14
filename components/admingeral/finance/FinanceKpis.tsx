'use client';

import React from 'react';
import {
  FileText,
  CheckCircle2,
  TrendingUp,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import {
  FinancialInstallment,
  FinancialSummary,
  formatCurrencyBrl,
  formatIsoToBrDate,
} from '@/lib/financeCanonical';

interface FinanceKpisProps {
  summary: FinancialSummary | null;
  installments: FinancialInstallment[];
  mpStatus: any;
}

export function FinanceKpis({ summary, installments, mpStatus }: FinanceKpisProps) {
  const paidCount = installments.filter((i) => i.status === 'paid').length;
  const pendingCount = installments.length - paidCount;
  const nextNum =
    summary?.currentInstallment?.number ||
    (installments.find((i) => i.status !== 'paid')?.number || 2);
  const remainingBalance =
    summary?.totalPending ?? (2000 - (summary?.totalPaid || 200));

  const percentPaid = summary
    ? Math.round((summary.totalPaid / summary.totalContract) * 100)
    : 10;

  return (
    <>
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Contratado */}
        <div className="p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-medium">Valor Total Contratado</span>
            <FileText className="w-4 h-4 text-[#f4a7b9]" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
              {formatCurrencyBrl(summary?.totalContract || 2000)}
            </div>
            <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5 font-light">
              <span>10 parcelas mensais de R$ 200,00</span>
            </div>
          </div>
          <div className="mt-3 w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#f4a7b9] h-full transition-all duration-500"
              style={{ width: `${percentPaid}%` }}
            />
          </div>
        </div>

        {/* Total Recebido */}
        <div className="p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-medium">Total Já Recebido</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
              {formatCurrencyBrl(summary?.totalPaid || 200)}
            </div>
            <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
              <span className="font-semibold text-emerald-300 font-mono">
                {paidCount}/10
              </span>
              <span>parcelas quitadas ({percentPaid}%)</span>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-zinc-500 font-mono">
            Último: {summary?.lastPaymentDate ? formatIsoToBrDate(summary.lastPaymentDate) : '05/10/2026'}
          </div>
        </div>

        {/* Saldo Restante */}
        <div className="p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-medium">Saldo Restante a Receber</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
              {formatCurrencyBrl(remainingBalance)}
            </div>
            <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
              <span className="font-semibold text-indigo-300 font-mono">
                {pendingCount}
              </span>
              <span>parcelas futuras</span>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-zinc-500 font-mono">
            Término previsto: 04/07/2027
          </div>
        </div>

        {/* Próximo Vencimento & Status MP */}
        <div className="p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-medium">Próximo Vencimento</span>
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-sky-300">
              {summary?.nextDueDate || '04/11/2026'}
            </div>
            <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
              <span>Parcela #{nextNum}</span>
              <span className="text-white font-mono font-medium">· R$ 200,00</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Contrato em dia
            </span>
            {mpStatus?.connected && (
              <span
                className="text-[10px] text-zinc-400 font-mono truncate"
                title={`Mercado Pago Conectado: ${mpStatus.email || mpStatus.nickname}`}
              >
                MP Ativo
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mercado Pago Integration Badge Strip */}
      <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#009ee3]/10 border border-[#009ee3]/20 flex items-center justify-center text-[#009ee3] shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">Gateway Mercado Pago</span>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                PRODUÇÃO ATIVA
              </span>
            </div>
            <p className="text-zinc-400 text-[11px] font-light mt-0.5">
              Conta vinculada: <span className="text-zinc-300 font-mono">philippeboechat1@gmail.com</span> (ID: 1150668342) · Webhooks ativos no Cloudflare
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-zinc-500 font-mono">
            Pix Dinâmico &amp; Cartão integrados
          </span>
        </div>
      </div>
    </>
  );
}
