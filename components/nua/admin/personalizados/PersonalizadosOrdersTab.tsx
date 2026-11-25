/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { SiteContent, LibraryImageItem } from '@/lib/types';
import { PersonalizadoOrder } from '@/lib/personalizadosCanonical';
import { PersonalizadosOrderCard } from './PersonalizadosOrderCard';

interface PersonalizadosOrdersTabProps {
  orders: PersonalizadoOrder[];
  filteredOrders: PersonalizadoOrder[];
  loading: boolean;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  activeVaultOrderId: string | null;
  setActiveVaultOrderId: (id: string | null) => void;
  vaultFileName: string;
  setVaultFileName: (v: string) => void;
  vaultFileUrl: string;
  setVaultFileUrl: (v: string) => void;
  vaultFileType: 'photo' | 'video';
  setVaultFileType: (v: 'photo' | 'video') => void;
  onUpdateStatus: (orderId: string, status: PersonalizadoOrder['status']) => void;
  onAddVaultFile: (orderId: string) => void;
  onAddVaultFilesBatch?: (
    orderId: string,
    files: { name: string; url: string; type: 'photo' | 'video' }[]
  ) => Promise<void>;
  onRemoveVaultFile?: (orderId: string, fileId: string) => Promise<void>;
  onOpenOrderDetails?: (orderId: string) => void;
  showToast: (msg: string) => void;
  content?: SiteContent;
  onUploadNew?: (img: LibraryImageItem) => void;
}

export function PersonalizadosOrdersTab({
  orders,
  filteredOrders,
  loading,
  filterStatus,
  setFilterStatus,
  searchTerm,
  setSearchTerm,
  activeVaultOrderId,
  setActiveVaultOrderId,
  vaultFileName,
  setVaultFileName,
  vaultFileUrl,
  setVaultFileUrl,
  vaultFileType,
  setVaultFileType,
  onUpdateStatus,
  onAddVaultFile,
  onAddVaultFilesBatch,
  onRemoveVaultFile,
  onOpenOrderDetails,
  showToast,
  content,
  onUploadNew,
}: PersonalizadosOrdersTabProps) {
  return (
    <div className="space-y-5">
      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl bg-[#14151c] border border-white/[0.07] shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
              filterStatus === 'all'
                ? 'bg-white/[0.12] text-white font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            Todos Ativos ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('em_producao')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
              filterStatus === 'em_producao'
                ? 'bg-amber-500/20 text-amber-200 font-semibold border border-amber-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            Em Gravação ({orders.filter((o) => o.status === 'em_producao').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('pronto')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
              filterStatus === 'pronto'
                ? 'bg-emerald-500/20 text-emerald-200 font-semibold border border-emerald-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            Prontos ({orders.filter((o) => o.status === 'pronto').length})
          </button>
          {orders.some((o) => o.status === 'aguardando_pagamento') && (
            <button
              type="button"
              onClick={() => setFilterStatus('aguardando_pagamento')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
                filterStatus === 'aguardando_pagamento'
                  ? 'bg-rose-500/20 text-rose-200 font-semibold border border-rose-500/30'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Aguardando ({orders.filter((o) => o.status === 'aguardando_pagamento').length})
            </button>
          )}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente ou código do pedido..."
            className="w-full sm:w-64 pl-8 pr-3 py-1.5 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#843C52]"
          />
        </div>
      </div>

      {/* Lista de Pedidos */}
      {loading ? (
        <div className="p-16 text-center text-zinc-400 text-xs flex items-center justify-center gap-2.5">
          <RefreshCw className="w-4 h-4 animate-spin text-[#843C52]" />
          <span>Carregando encomendas do ateliê...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-[#14151c] border border-white/[0.07] text-zinc-400 text-xs">
          Nenhuma encomenda pendente na fila de produção.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <PersonalizadosOrderCard
              key={order.id}
              order={order}
              activeVaultOrderId={activeVaultOrderId}
              setActiveVaultOrderId={setActiveVaultOrderId}
              vaultFileName={vaultFileName}
              setVaultFileName={setVaultFileName}
              vaultFileUrl={vaultFileUrl}
              setVaultFileUrl={setVaultFileUrl}
              vaultFileType={vaultFileType}
              setVaultFileType={setVaultFileType}
              onUpdateStatus={onUpdateStatus}
              onAddVaultFile={onAddVaultFile}
              onAddVaultFilesBatch={onAddVaultFilesBatch}
              onRemoveVaultFile={onRemoveVaultFile}
              onOpenOrderDetails={onOpenOrderDetails}
              showToast={showToast}
              content={content}
              onUploadNew={onUploadNew}
            />
          ))}
        </div>
      )}
    </div>
  );
}
