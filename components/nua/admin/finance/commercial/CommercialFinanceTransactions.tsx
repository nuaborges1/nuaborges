/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import {
  RefreshCw,
  Search,
  ShoppingBag,
  Camera,
  Video,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { FinancialTransactionItem } from '@/lib/services/nua/commercialFinanceService';

interface CommercialFinanceTransactionsProps {
  modality: 'all' | 'packs' | 'personalizados' | 'chamadas';
  setModality: (v: 'all' | 'packs' | 'personalizados' | 'chamadas') => void;
  status: 'all' | 'succeeded' | 'pending' | 'failed' | 'refunded';
  setStatus: (v: 'all' | 'succeeded' | 'pending' | 'failed' | 'refunded') => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  loading: boolean;
  filteredTransactions: FinancialTransactionItem[];
  formatMoney: (val?: number) => string;
  onRequestRefund?: (tx: FinancialTransactionItem) => void;
}

export function CommercialFinanceTransactions({
  modality,
  setModality,
  status,
  setStatus,
  searchTerm,
  setSearchTerm,
  loading,
  filteredTransactions,
  formatMoney,
  onRequestRefund,
}: CommercialFinanceTransactionsProps) {
  return (
    <div className="p-4 sm:p-6 rounded-xl bg-[#16171d] border border-white/[0.07] space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-wide">
            Histórico de Transações Comerciais
          </h3>
          <p className="text-[11px] text-zinc-400 font-light mt-0.5">
            Histórico de cada pagamento recebido via Mercado Pago com taxas e recibos oficiais.
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={modality}
            onChange={(e) => setModality(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-black border border-white/10 text-xs text-white outline-none focus:border-[#843C52] cursor-pointer"
          >
            <option value="all">Todas as Modalidades</option>
            <option value="packs">Conteúdos &amp; Packs</option>
            <option value="personalizados">Personalizados</option>
            <option value="chamadas">Chamadas de Vídeo</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-black border border-white/10 text-xs text-white outline-none focus:border-[#843C52] cursor-pointer"
          >
            <option value="all">Todas as Situações</option>
            <option value="succeeded">Confirmados</option>
            <option value="pending">Pendentes</option>
            <option value="refunded">Reembolsados</option>
            <option value="failed">Falhas</option>
          </select>

          <div className="relative flex-1 sm:flex-none">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar cliente ou código..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-black border border-white/10 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#843C52] w-full sm:w-44"
            />
          </div>
        </div>
      </div>

      {/* Lista / Tabela de Transações */}
      {loading ? (
        <div className="p-16 text-center text-zinc-400 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#843C52]" />
          <span>Consultando pagamentos do Mercado Pago...</span>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="p-12 text-center text-zinc-400 text-xs rounded-2xl bg-black/40 border border-white/[0.04]">
          Nenhuma transação comercial localizada com os filtros selecionados.
        </div>
      ) : (
        <>
          {/* Mobile & Tablet Cards (Sem scroll horizontal) */}
          <div className="space-y-3 xl:hidden">
            {filteredTransactions.map((tx) => {
              const dateBr = new Date(tx.createdAt).toLocaleString('pt-BR');
              return (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-xl bg-[#101116] border border-white/[0.06] space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        tx.modality === 'packs'
                          ? 'bg-rose-500/15 text-rose-300 border border-rose-500/25'
                          : tx.modality === 'personalizados'
                          ? 'bg-purple-500/15 text-purple-300 border border-purple-500/25'
                          : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                      }`}
                    >
                      {tx.modality === 'packs' && <ShoppingBag className="w-3 h-3" />}
                      {tx.modality === 'personalizados' && <Camera className="w-3 h-3" />}
                      {tx.modality === 'chamadas' && <Video className="w-3 h-3" />}
                      <span>{tx.modalityLabel}</span>
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        tx.status === 'succeeded'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : tx.status === 'refunded'
                          ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          : tx.status === 'pending'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {tx.statusLabel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-white">
                        {tx.customerName || 'Cliente'}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        {dateBr} • #{tx.orderId ? tx.orderId.slice(-8) : tx.id.slice(-8)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#843C52]">
                        {formatMoney(tx.amountNet)}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        Bruto: {formatMoney(tx.amountGross)}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between gap-2 text-[11px] text-zinc-400">
                    <span>{tx.paymentMethodLabel}</span>
                    <div className="flex items-center gap-3">
                      {tx.status === 'succeeded' && tx.orderId && onRequestRefund && (
                        <button
                          type="button"
                          onClick={() => onRequestRefund(tx)}
                          className="inline-flex items-center gap-1 text-rose-300 hover:text-rose-200 font-medium cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Estornar</span>
                        </button>
                      )}
                      {tx.receiptUrl ? (
                        <a
                          href={tx.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#843C52] hover:underline font-mono"
                        >
                          <span>Ver recibo</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-zinc-600 font-mono">Sem recibo</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table (ativada em xl para evitar aperto em tablets) */}
          <div className="hidden xl:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] text-[10px] text-zinc-400 uppercase tracking-wider font-mono">
                  <th className="py-3 px-3">Data / Hora</th>
                  <th className="py-3 px-3">Código</th>
                  <th className="py-3 px-3">Modalidade</th>
                  <th className="py-3 px-3">Cliente</th>
                  <th className="py-3 px-3">Valor Bruto</th>
                  <th className="py-3 px-3">Taxa Mercado Pago</th>
                  <th className="py-3 px-3">Valor Líquido</th>
                  <th className="py-3 px-3">Método</th>
                  <th className="py-3 px-3">Situação</th>
                  <th className="py-3 px-3 text-right">Ações / Recibo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredTransactions.map((tx) => {
                  const dateBr = new Date(tx.createdAt).toLocaleString('pt-BR');
                  return (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 text-zinc-400 font-mono text-[11px] whitespace-nowrap">
                        {dateBr}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-zinc-300">
                        {tx.orderId ? tx.orderId.slice(-10) : tx.id.slice(-10)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                            tx.modality === 'packs'
                              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/25'
                              : tx.modality === 'personalizados'
                              ? 'bg-purple-500/15 text-purple-300 border border-purple-500/25'
                              : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                          }`}
                        >
                          {tx.modality === 'packs' && <ShoppingBag className="w-3 h-3" />}
                          {tx.modality === 'personalizados' && <Camera className="w-3 h-3" />}
                          {tx.modality === 'chamadas' && <Video className="w-3 h-3" />}
                          <span>{tx.modalityLabel}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-white font-medium max-w-[140px] truncate">
                        {tx.customerName || 'Cliente'}
                      </td>
                      <td className="py-3 px-3 font-serif font-bold text-white whitespace-nowrap">
                        {formatMoney(tx.amountGross)}
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-400 whitespace-nowrap text-[11px]">
                        - {formatMoney(tx.fee)}
                      </td>
                      <td className="py-3 px-3 font-serif font-bold text-[#843C52] whitespace-nowrap">
                        {formatMoney(tx.amountNet)}
                      </td>
                      <td className="py-3 px-3 text-zinc-400 text-[11px] whitespace-nowrap">
                        {tx.paymentMethodLabel}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            tx.status === 'succeeded'
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : tx.status === 'refunded'
                              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                              : tx.status === 'pending'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {tx.statusLabel}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-3">
                          {tx.status === 'succeeded' && tx.orderId && onRequestRefund && (
                            <button
                              type="button"
                              onClick={() => onRequestRefund(tx)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/45 hover:bg-rose-900/55 border border-rose-500/30 text-[11px] text-rose-200 font-medium transition cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Estornar</span>
                            </button>
                          )}
                          {tx.receiptUrl ? (
                            <a
                              href={tx.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-[#843C52] hover:underline font-mono"
                            >
                              <span>Comprovante</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-zinc-600 text-[11px] font-mono">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
