'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  PackageCheck,
  Search,
  RefreshCw,
  Video,
  Camera,
  ShoppingBag,
  ExternalLink,
  CheckCircle2,
  XCircle,
  FileText,
  RotateCcw,
  Clock,
  MessageCircle,
  FolderLock,
  Archive,
  Eye,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { PageHeader } from './ui/AdminPrimitives';
import { AlertasSkeleton } from './ui/AdminSkeleton';
import { fetchAdminAppointments, executeAdminAction } from '@/lib/services/nua/appointmentsService';
import { fetchPersonalizadosAdmin, updatePersonalizadoOrderAdmin } from '@/lib/services/nua/personalizadosService';
import { fetchUnifiedOrdersFeed } from '@/lib/services/nua/ordersFeedService';
import { formatCurrencyBrl } from '@/lib/personalizadosCanonical';
import { resolveMediaUrl } from '@/lib/media';

export interface FinalizedItem {
  id: string;
  displayId: string;
  category: 'chamadas' | 'personalizados' | 'conteudos';
  categoryLabel: string;
  title: string;
  clientName: string;
  clientContact: string;
  date: string;
  timestamp: number;
  amount: number;
  status: 'entregue' | 'cancelado';
  statusLabel: string;
  details?: {
    channel?: string;
    vaultFiles?: Array<{ name: string; url: string; type: string }>;
    meetingUrl?: string;
    briefing?: string;
    notes?: string;
    duration?: string;
  };
}

export interface HistoricoPedidosModuleProps {
  initialSearch?: string;
}

export function HistoricoPedidosModule({ initialSearch = '' }: HistoricoPedidosModuleProps = {}) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FinalizedItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'chamadas' | 'personalizados' | 'conteudos'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'entregue' | 'cancelado'>('all');
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedDetailItem, setSelectedDetailItem] = useState<FinalizedItem | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (initialSearch) {
      setSearchTerm(initialSearch);
    }
  }, [initialSearch]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadAllFinalized = async () => {
    setLoading(true);
    try {
      const [appData, persData, feedData] = await Promise.all([
        fetchAdminAppointments().catch(() => null),
        fetchPersonalizadosAdmin().catch(() => null),
        fetchUnifiedOrdersFeed().catch(() => null),
      ]);

      const normalized: FinalizedItem[] = [];

      // 1. Chamadas VIP finalizadas ou canceladas
      if (appData && Array.isArray(appData.bookings)) {
        appData.bookings.forEach((b: any) => {
          if (b.status === 'concluida' || b.status === 'cancelada' || b.status === 'ausente') {
            const isDelivered = b.status === 'concluida';
            const rawTime = b.createdAt
              ? new Date(b.createdAt).getTime()
              : b.date
              ? new Date(`${b.date}T${b.startTime || '12:00'}:00`).getTime()
              : 0;

            normalized.push({
              id: `chamada_${b.id}`,
              displayId: b.id.replace('apt_', '#CH-').slice(0, 8).toUpperCase(),
              category: 'chamadas',
              categoryLabel: 'Chamada VIP',
              title: b.modalityName || 'Encontro em Vídeo',
              clientName: b.clientName || 'Cliente VIP',
              clientContact: b.clientPhone || b.clientEmail || '',
              date: b.date ? `${b.date.split('-').reverse().join('/')} às ${b.startTime || '14:00'}` : '',
              timestamp: rawTime,
              amount: b.price || 0,
              status: isDelivered ? 'entregue' : 'cancelado',
              statusLabel: isDelivered ? 'Realizada com Sucesso' : b.status === 'ausente' ? 'Cliente Ausente' : 'Cancelada',
              details: {
                meetingUrl: b.meetingUrl,
                duration: b.modalityName,
                notes: b.notes,
              },
            });
          }
        });
      }

      // 2. Personalizados entregues ou cancelados
      if (persData && Array.isArray(persData.orders)) {
        persData.orders.forEach((o: any) => {
          if (o.status === 'entregue' || o.status === 'cancelado') {
            const isDelivered = o.status === 'entregue';
            const rawTime = o.updatedAt
              ? new Date(o.updatedAt).getTime()
              : o.createdAt
              ? new Date(o.createdAt).getTime()
              : 0;

            normalized.push({
              id: `personalizado_${o.id}`,
              displayId: o.id.replace('ped_', '#PED-').slice(0, 10).toUpperCase(),
              category: 'personalizados',
              categoryLabel: 'Personalizado',
              title: `${o.photoCount || 0} Fotos ${o.videoOptionId && o.videoOptionId !== 'vid_none' ? '+ Vídeo Exclusivo' : ''}`,
              clientName: o.clientName || 'Fã VIP',
              clientContact: o.clientContact || '',
              date: o.updatedAt ? new Date(o.updatedAt).toLocaleDateString('pt-BR') : o.createdAt ? new Date(o.createdAt).toLocaleDateString('pt-BR') : '',
              timestamp: rawTime,
              amount: o.finalPrice || o.totalAmount || 0,
              status: isDelivered ? 'entregue' : 'cancelado',
              statusLabel: isDelivered ? 'Entregue no Cofre' : 'Cancelado',
              details: {
                channel: o.deliveryChannel === 'vault' ? 'Cofre Digital no Site' : 'Telegram VIP',
                vaultFiles: o.vaultFiles || [],
                briefing: o.briefing,
                notes: o.internalNotes,
              },
            });
          }
        });
      }

      // 3. Conteúdos & Packs
      if (feedData && Array.isArray(feedData.orders)) {
        feedData.orders.forEach((ord: any) => {
          if (ord.type === 'avulso' || ord.meta?.isPack || String(ord.title || '').toLowerCase().includes('pack')) {
            const cleanOrdStatus = String(ord.status || '').toLowerCase().trim();
            const isCompleted = ['paid', 'approved', 'pago', 'pago_liberado', 'liberado', 'completed', 'delivered', 'entregue'].includes(cleanOrdStatus);
            const isCancelled = ['cancelled', 'cancelado', 'cancelada', 'refunded', 'reembolsado'].includes(cleanOrdStatus);
            if (isCompleted || isCancelled) {
              const rawTime = ord.createdAt
                ? new Date(ord.createdAt).getTime()
                : 0;

              normalized.push({
                id: `pack_${ord.id}`,
                displayId: String(ord.id || '').replace('ord_', '#PCK-').slice(0, 10).toUpperCase(),
                category: 'conteudos',
                categoryLabel: 'Conteúdo & Pack',
                title: ord.title || 'Pack de Conteúdo Exclusivo',
                clientName: ord.customerName || ord.payerEmail || 'Cliente Digital',
                clientContact: ord.customerContact || ord.customerPhone || ord.customerEmail || ord.payerEmail || '',
                date: ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('pt-BR') : '',
                timestamp: rawTime,
                amount: ord.amount || ord.price || 0,
                status: isCompleted ? 'entregue' : 'cancelado',
                statusLabel: isCompleted ? 'Pago / Liberado' : 'Cancelado / Reembolsado',
                details: {
                  channel: 'Acesso Digital Imediato (Token de Liberação)',
                  notes: ord.meta?.purchaseToken ? `Token de Acesso: ${ord.meta.purchaseToken}` : ord.description,
                },
              });
            }
          }
        });
      }

      // Ordena estritamente por ordem cronológica decrescente (mais recente primeiro)
      normalized.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      setItems(normalized);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllFinalized();
  }, []);

  // Reabertura de pedido caso tenha sido finalizado por engano
  const handleReopenItem = async (item: FinalizedItem) => {
    if (item.category === 'personalizados') {
      const realId = item.id.replace('personalizado_', '');
      const res = await updatePersonalizadoOrderAdmin(realId, { status: 'pronto' });
      if (res.success) {
        showToast('Pedido reaberto com sucesso e retornado à Fila de Personalizados!');
        loadAllFinalized();
      } else {
        showToast('Não foi possível reabrir o pedido.');
      }
    } else if (item.category === 'chamadas') {
      const realId = item.id.replace('chamada_', '');
      const res = await executeAdminAction('confirm', { bookingId: realId });
      if (res.success) {
        showToast('Agendamento reativado com sucesso e retornado à agenda de Chamadas VIP!');
        loadAllFinalized();
      } else {
        showToast('Não foi possível reabrir o agendamento.');
      }
    }
  };

  // Contagens
  const counts = useMemo(() => {
    return {
      total: items.length,
      chamadas: items.filter((i) => i.category === 'chamadas').length,
      personalizados: items.filter((i) => i.category === 'personalizados').length,
      conteudos: items.filter((i) => i.category === 'conteudos').length,
      delivered: items.filter((i) => i.status === 'entregue').length,
      cancelled: items.filter((i) => i.status === 'cancelado').length,
      totalRevenue: items
        .filter((i) => i.status === 'entregue')
        .reduce((sum, i) => sum + (Number(i.amount) || 0), 0),
    };
  }, [items]);

  // Filtragem
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchName = item.clientName.toLowerCase().includes(term);
        const matchContact = item.clientContact.toLowerCase().includes(term);
        const matchId = item.displayId.toLowerCase().includes(term);
        const matchTitle = item.title.toLowerCase().includes(term);
        if (!matchName && !matchContact && !matchId && !matchTitle) return false;
      }
      return true;
    });
  }, [items, categoryFilter, statusFilter, searchTerm]);

  if (loading && items.length === 0) {
    return <AlertasSkeleton />;
  }

  return (
    <div className="space-y-6 select-none w-full">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-[#09090c] border border-[#f4a7b9]/40 text-white text-xs flex items-center gap-2.5 shadow-2xl backdrop-blur-xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#f4a7b9] shrink-0" />
          <span className="font-medium tracking-wide">{toastMessage}</span>
        </div>
      )}

      <PageHeader
        title="Histórico de Pedidos"
        subtitle="Arquivo centralizado e seguro de todos os atendimentos, encomendas sob medida e packs que foram entregues ou cancelados."
        helpId="alertas_sistema"
        actions={
          <button
            type="button"
            onClick={loadAllFinalized}
            className="h-9 px-3.5 rounded-xl bg-[#14161d] hover:bg-white/[0.06] border border-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
            title="Atualizar lista do histórico"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#f4a7b9]' : 'text-zinc-400'}`} />
            <span>Atualizar</span>
          </button>
        }
      />

      {/* Cartões de Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-[#14151b] border border-white/[0.06] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block mb-0.5">
              Entregues & Concluídos
            </span>
            <span className="text-2xl font-bold text-white tracking-tight">
              {counts.delivered}
            </span>
            <span className="text-[11px] text-zinc-500 block mt-0.5">
              pedidos atendidos com sucesso
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#14151b] border border-white/[0.06] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-0.5">
              Cancelados ou Ausentes
            </span>
            <span className="text-2xl font-bold text-zinc-300 tracking-tight">
              {counts.cancelled}
            </span>
            <span className="text-[11px] text-zinc-500 block mt-0.5">
              pedidos não concretizados
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#14151b] border border-[#f4a7b9]/25 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#f4a7b9] font-semibold block mb-0.5">
              Receita Total Arquivada
            </span>
            <span className="text-2xl font-bold text-[#f4a7b9] tracking-tight">
              {formatCurrencyBrl(counts.totalRevenue)}
            </span>
            <span className="text-[11px] text-zinc-500 block mt-0.5">
              faturamento confirmado
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#f4a7b9]/10 border border-[#f4a7b9]/20 flex items-center justify-center text-[#f4a7b9]">
            <PackageCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#14151b] border border-white/[0.06] shadow-sm space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Filtro por Categoria */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
                categoryFilter === 'all'
                  ? 'bg-white/[0.12] text-white font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Todos ({counts.total})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('chamadas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                categoryFilter === 'chamadas'
                  ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30 font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Video className="w-3 h-3" />
              <span>Chamadas VIP ({counts.chamadas})</span>
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('personalizados')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                categoryFilter === 'personalizados'
                  ? 'bg-pink-500/20 text-pink-200 border border-pink-500/30 font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Camera className="w-3 h-3" />
              <span>Personalizados ({counts.personalizados})</span>
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('conteudos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                categoryFilter === 'conteudos'
                  ? 'bg-sky-500/20 text-sky-200 border border-sky-500/30 font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <ShoppingBag className="w-3 h-3" />
              <span>Conteúdos & Packs ({counts.conteudos})</span>
            </button>
          </div>

          {/* Campo de Busca */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, ID ou canal..."
              className="w-full bg-[#0e0f14] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#f4a7b9] transition"
            />
          </div>
        </div>

        {/* Filtro por Desfecho (Entregue x Cancelado) */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
          <span className="text-[11px] text-zinc-500 font-medium mr-1">Status:</span>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white/[0.1] text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('entregue')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
              statusFilter === 'entregue'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Entregues ({counts.delivered})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('cancelado')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
              statusFilter === 'cancelado'
                ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <XCircle className="w-3 h-3 text-zinc-400" />
            <span>Cancelados ({counts.cancelled})</span>
          </button>
        </div>
      </div>

      {/* Lista de Itens do Histórico */}
      {loading ? (
        <div className="p-16 text-center text-zinc-400 text-xs flex items-center justify-center gap-2.5">
          <RefreshCw className="w-4 h-4 animate-spin text-[#f4a7b9]" />
          <span>Consultando arquivo histórico...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-14 text-center rounded-2xl bg-[#14151b] border border-white/[0.06] text-zinc-400 text-xs flex flex-col items-center justify-center gap-2">
          <Archive className="w-8 h-8 text-zinc-600 mb-1" />
          <span className="text-zinc-300 font-medium">Nenhum registro encontrado no histórico</span>
          <span className="text-[11px] text-zinc-500 max-w-md">
            Quando chamadas, encomendas personalizadas ou packs forem entregues ou cancelados, eles sumirão das telas de atendimento e serão arquivados aqui automaticamente.
          </span>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredItems.map((item) => {
            const isDelivered = item.status === 'entregue';
            const isTelegram = item.clientContact.startsWith('@');
            const isPhone = !isTelegram && item.clientContact.replace(/\D/g, '').length >= 10;
            const cleanPhone = item.clientContact.replace(/\D/g, '');

            return (
              <div
                key={item.id}
                className="p-4 sm:p-5 rounded-2xl bg-[#14151b] border border-white/[0.06] hover:border-white/[0.1] transition-all space-y-3.5 shadow-sm"
              >
                {/* Linha Superior: Categoria, ID, Status e Valor */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-white/[0.05]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                        item.category === 'chamadas'
                          ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                          : item.category === 'personalizados'
                          ? 'bg-pink-500/15 text-pink-300 border-pink-500/30'
                          : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                      }`}
                    >
                      {item.categoryLabel}
                    </span>

                    <span className="text-xs font-mono text-zinc-400 font-medium">
                      {item.displayId}
                    </span>

                    {item.date && (
                      <>
                        <span className="text-zinc-600 text-xs">•</span>
                        <span className="text-xs text-zinc-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          <span>{item.date}</span>
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-lg font-medium inline-flex items-center gap-1.5 ${
                        isDelivered
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700/60'
                      }`}
                    >
                      {isDelivered ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <XCircle className="w-3 h-3 text-zinc-400" />
                      )}
                      <span>{item.statusLabel}</span>
                    </span>

                    <span className="text-sm font-semibold text-white font-mono">
                      {formatCurrencyBrl(item.amount)}
                    </span>
                  </div>
                </div>

                {/* Conteúdo Central */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                  <div className="md:col-span-6 space-y-1">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block">
                      Cliente & Encomenda
                    </span>
                    <h4 className="text-sm font-semibold text-white">{item.clientName}</h4>
                    <p className="text-xs text-zinc-300 font-medium">{item.title}</p>
                    {item.details?.briefing && (
                      <p className="text-xs text-zinc-400 font-light mt-1 bg-[#0e0f14] p-2.5 rounded-lg border border-white/[0.04]">
                        &ldquo;{item.details.briefing}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-6 space-y-2">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block">
                      Canal de Atendimento & Entrega
                    </span>

                    <div className="flex items-center gap-2 flex-wrap">
                      {isTelegram && (
                        <a
                          href={`https://t.me/${item.clientContact.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-7 px-2.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 text-sky-300 text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Telegram {item.clientContact}</span>
                        </a>
                      )}

                      {isPhone && (
                        <a
                          href={`https://wa.me/${cleanPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-7 px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp {item.clientContact}</span>
                        </a>
                      )}

                      {!isTelegram && !isPhone && item.clientContact && (
                        <span className="text-xs text-zinc-300 font-mono">
                          {item.clientContact}
                        </span>
                      )}

                      {item.details?.channel && (
                        <span className="text-xs text-zinc-400 font-light px-2 py-0.5 rounded bg-white/[0.04]">
                          {item.details.channel}
                        </span>
                      )}
                    </div>

                    {/* Arquivos do cofre entregues */}
                    {item.details?.vaultFiles && item.details.vaultFiles.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[10px] font-mono text-zinc-500 block mb-1">
                          Arquivos Protegidos no Cofre ({item.details.vaultFiles.length}):
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.details.vaultFiles.map((vf, idx) => (
                            <a
                              key={idx}
                              href={resolveMediaUrl(vf.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#f4a7b9] hover:underline bg-[#0e0f14] border border-white/[0.06] px-2 py-1 rounded inline-flex items-center gap-1"
                            >
                              <FolderLock className="w-3 h-3" />
                              <span className="truncate max-w-[150px]">{vf.name}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Link da sala de reunião */}
                    {item.details?.meetingUrl && (
                      <div className="pt-1">
                        <a
                          href={item.details.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-purple-300 hover:underline inline-flex items-center gap-1"
                        >
                          <Video className="w-3 h-3" />
                          <span>Link da Sala Registrado</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rodapé do Card: Ações de Detalhes e Reabertura */}
                <div className="pt-2 flex items-center justify-end gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedDetailItem(item)}
                    className="text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer px-3 py-1.5 rounded-lg bg-[#f4a7b9]/15 hover:bg-[#f4a7b9]/25 text-[#f4a7b9] border border-[#f4a7b9]/30"
                    title="Ver detalhes completos do pedido"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver Detalhes</span>
                  </button>

                  {(item.category === 'personalizados' || item.category === 'chamadas') && (
                    <button
                      type="button"
                      onClick={() => handleReopenItem(item)}
                      className="text-xs text-zinc-400 hover:text-white inline-flex items-center gap-1.5 transition cursor-pointer px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06]"
                      title="Devolver este pedido para a fila ativa caso precise de nova edição ou atendimento"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reativar / Devolver à Fila</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Detalhes do Pedido do Histórico */}
      {selectedDetailItem && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedDetailItem(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-[#0e1017] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.95)] max-h-[90vh] overflow-y-auto space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do Modal */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/[0.08]">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span
                    className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                      selectedDetailItem.category === 'chamadas'
                        ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                        : selectedDetailItem.category === 'personalizados'
                        ? 'bg-pink-500/15 text-pink-300 border-pink-500/30'
                        : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                    }`}
                  >
                    {selectedDetailItem.categoryLabel}
                  </span>
                  <span className="text-xs font-mono text-zinc-400 font-semibold">
                    {selectedDetailItem.displayId}
                  </span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-lg font-medium inline-flex items-center gap-1 ${
                      selectedDetailItem.status === 'entregue'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700/60'
                    }`}
                  >
                    {selectedDetailItem.status === 'entregue' ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <XCircle className="w-3 h-3 text-zinc-400" />
                    )}
                    <span>{selectedDetailItem.statusLabel}</span>
                  </span>
                </div>
                <h3 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                  {selectedDetailItem.title}
                </h3>
                {selectedDetailItem.date && (
                  <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-[#f4a7b9]" />
                    <span>Registro em: {selectedDetailItem.date}</span>
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedDetailItem(null)}
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                title="Fechar detalhes"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Seção 1: Cliente e Contato */}
            <div className="p-4 rounded-2xl bg-[#14161f] border border-white/[0.06] space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                Dados do Cliente
              </span>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-base font-semibold text-white">{selectedDetailItem.clientName}</h4>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">{selectedDetailItem.clientContact || 'Sem contato informado'}</p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedDetailItem.clientContact && !selectedDetailItem.clientContact.startsWith('@') && selectedDetailItem.clientContact.replace(/\D/g, '').length >= 10 && (
                    <a
                      href={`https://wa.me/${selectedDetailItem.clientContact.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  )}

                  {selectedDetailItem.clientContact && selectedDetailItem.clientContact.startsWith('@') && (
                    <a
                      href={`https://t.me/${selectedDetailItem.clientContact.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Telegram</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Seção 2: Especificações e Conteúdo */}
            <div className="space-y-3">
              {selectedDetailItem.details?.briefing && (
                <div className="p-4 rounded-2xl bg-[#14161f] border border-white/[0.06] space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                    Briefing / Instruções do Pedido
                  </span>
                  <p className="text-xs text-zinc-200 leading-relaxed font-light whitespace-pre-wrap">
                    {selectedDetailItem.details.briefing}
                  </p>
                </div>
              )}

              {selectedDetailItem.details?.notes && (
                <div className="p-4 rounded-2xl bg-[#14161f] border border-white/[0.06] space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                    Notas Internas da Produção / Atendimento
                  </span>
                  <p className="text-xs text-zinc-300 leading-relaxed font-light whitespace-pre-wrap">
                    {selectedDetailItem.details.notes}
                  </p>
                </div>
              )}

              {/* Arquivos do Cofre Entregues */}
              {selectedDetailItem.details?.vaultFiles && selectedDetailItem.details.vaultFiles.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#14161f] border border-white/[0.06] space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                    Arquivos Entregues no Cofre ({selectedDetailItem.details.vaultFiles.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedDetailItem.details.vaultFiles.map((file, fIdx) => (
                      <a
                        key={fIdx}
                        href={resolveMediaUrl(file.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/[0.08] hover:border-[#f4a7b9]/40 flex items-center justify-between gap-2 text-xs text-zinc-200 transition group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FolderLock className="w-4 h-4 text-[#f4a7b9] shrink-0" />
                          <span className="truncate">{file.name}</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Sala de Reunião para Chamadas VIP */}
              {selectedDetailItem.details?.meetingUrl && (
                <div className="p-4 rounded-2xl bg-[#14161f] border border-white/[0.06] space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-purple-300 font-semibold block">
                    Link da Sala de Atendimento
                  </span>
                  <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-black/40 border border-purple-500/20">
                    <span className="text-xs font-mono text-zinc-300 truncate">
                      {selectedDetailItem.details.meetingUrl}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedDetailItem.details?.meetingUrl || '');
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs text-zinc-200 inline-flex items-center gap-1 transition cursor-pointer"
                      >
                        {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
                      </button>
                      <a
                        href={selectedDetailItem.details.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 text-xs inline-flex items-center gap-1 transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Abrir Sala</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Seção Financeira e Rodapé */}
            <div className="pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                  Valor Total
                </span>
                <span className="font-serif text-2xl text-[#f4a7b9] font-medium font-mono">
                  {formatCurrencyBrl(selectedDetailItem.amount)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {(selectedDetailItem.category === 'personalizados' || selectedDetailItem.category === 'chamadas') && (
                  <button
                    type="button"
                    onClick={() => {
                      const item = selectedDetailItem;
                      setSelectedDetailItem(null);
                      handleReopenItem(item);
                    }}
                    className="h-9 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer border border-white/10"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reativar / Devolver à Fila</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedDetailItem(null)}
                  className="h-9 px-5 rounded-xl bg-[#f4a7b9] hover:bg-[#efa0b3] text-zinc-950 text-xs font-semibold inline-flex items-center justify-center transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
