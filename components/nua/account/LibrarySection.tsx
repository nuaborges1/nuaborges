'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Film,
  Image as ImageIcon,
  KeyRound,
  Layers,
  Lock,
  Play,
  Search,
} from 'lucide-react';
import { NuaIdLibraryItem } from '@/lib/nuaIdClient';
import { resolveMediaUrl } from '@/lib/media';
import { VaultContentViewer } from './VaultContentViewer';

interface LibrarySectionProps {
  items: NuaIdLibraryItem[];
  loading: boolean;
  selectedOrder: string | null;
  confirmToken?: string;
  onSelectOrder: (order: string | null) => void;
  onClearConfirmToken?: () => void;
  onOpenClaimOrder?: () => void;
}

function formatDateBr(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function LibrarySection({
  items,
  loading,
  selectedOrder,
  confirmToken = '',
  onSelectOrder,
  onClearConfirmToken,
  onOpenClaimOrder,
}: LibrarySectionProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter === 'active' && item.status !== 'active') return false;
      if (statusFilter === 'inactive' && item.status === 'active') return false;
      if (q && !item.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, statusFilter, search]);

  const hasInactive = useMemo(() => items.some((i) => i.status !== 'active'), [items]);

  const selectedItem = useMemo(
    () => (selectedOrder ? items.find((i) => i.orderRef === selectedOrder) || null : null),
    [items, selectedOrder]
  );

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2].map((n) => (
          <div
            key={n}
            className="h-80 animate-pulse rounded-[28px] border border-white/[0.08] bg-[#08080c]"
          />
        ))}
      </div>
    );
  }

  // Visualização inline integrada dentro da própria aba Seu Acervo
  if (selectedOrder) {
    return (
      <VaultContentViewer
        order={selectedOrder}
        initialTitle={selectedItem?.title || ''}
        initialConfirmToken={confirmToken}
        backLabel="Voltar ao Acervo"
        contextBadge="Conteúdo do Acervo"
        metadataSlot={
          selectedItem ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-400">
              <span>Adquirido em {formatDateBr(selectedItem.purchasedAt)}</span>
              <span aria-hidden="true">·</span>
              <span>
                {selectedItem.expiresAt
                  ? `Acesso válido até ${formatDateBr(selectedItem.expiresAt)}`
                  : 'Acesso contínuo na sua conta (conforme Termos)'}
              </span>
            </div>
          ) : undefined
        }
        onBack={() => {
          onClearConfirmToken?.();
          onSelectOrder(null);
        }}
      />
    );
  }

  const isSingleFeatured = filteredItems.length === 1 && items.length === 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-normal tracking-tight text-[#F5EEE9]">
            Conteúdos adquiridos
          </h2>
          <p className="mt-1 text-xs sm:text-sm font-light text-zinc-400">
            Sua coleção pessoal de produções liberadas, pronta para assistir e visualizar aqui mesmo.
          </p>
        </div>
        <Link
          href="/avulsos"
          className="inline-flex min-h-[40px] items-center justify-center gap-1.5 self-start sm:self-auto rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-zinc-300 transition-colors hover:border-[#7A293D]/60 hover:text-[#F5EEE9]"
        >
          <span>Explorar catálogo</span>
          <ArrowRight className="h-3.5 w-3.5 text-[#90364B]" />
        </Link>
      </div>

      {/* Busca e filtros quando houver múltiplos itens */}
      {(items.length >= 4 || hasInactive) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {items.length >= 4 && (
            <div className="relative flex-1 max-w-xs">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar no seu acervo..."
                aria-label="Buscar no seu acervo"
                className="w-full min-h-[40px] rounded-full border border-white/10 bg-[#08080c] pl-9 pr-4 text-xs text-[#F5EEE9] placeholder:text-zinc-500 focus:border-[#90364B] focus:outline-none"
              />
            </div>
          )}
          {hasInactive && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar acervo">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'active', label: 'Disponíveis' },
                { id: 'inactive', label: 'Encerrados' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id as 'all' | 'active' | 'inactive')}
                  className={`rounded-full px-3.5 py-1.5 text-xs transition-all cursor-pointer ${
                    statusFilter === f.id
                      ? 'border border-[#90364B]/60 bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] font-medium text-[#F5EEE9]'
                      : 'border border-white/[0.08] bg-[#08080c] text-zinc-400 hover:border-white/20 hover:text-[#F5EEE9]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-[28px] border border-white/[0.08] bg-[#08080c] px-6 py-14 text-center shadow-[0_16px_50px_rgba(0,0,0,0.85)]">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-[#90364B]">
            <Lock className="h-5 w-5" />
          </div>
          <p className="font-serif text-lg text-[#F5EEE9]">Seu acervo ainda está vazio</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs sm:text-sm font-light leading-relaxed text-zinc-400">
            Quando você adquirir uma produção ou vincular uma compra anterior, ela aparecerá aqui pronta para acessar.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/avulsos"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-6 py-2.5 text-xs font-medium tracking-[0.12em] uppercase text-[#F5EEE9] transition-colors hover:border-[#7A293D]/60 hover:bg-[#431322]/30"
            >
              <span>Explorar catálogo</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#C97A8D]" />
            </Link>
            {onOpenClaimOrder && (
              <button
                type="button"
                onClick={onOpenClaimOrder}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#90364B]/45 bg-[#431322]/35 px-5 py-2.5 text-xs font-medium text-[#F5EEE9] transition-colors hover:bg-[#661C30] cursor-pointer"
              >
                <KeyRound className="h-3.5 w-3.5 text-[#C97A8D]" />
                <span>Vincular compra anterior</span>
              </button>
            )}
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-[28px] border border-white/[0.08] bg-[#08080c] px-6 py-10 text-center">
          <p className="font-serif text-base text-[#F5EEE9]">Nenhuma produção encontrada neste filtro</p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
            }}
            className="mt-3 text-xs text-[#C97A8D] underline underline-offset-2 hover:text-[#F5EEE9] cursor-pointer"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div
          className={
            isSingleFeatured
              ? 'grid grid-cols-1'
              : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
          }
        >
          {filteredItems.map((item) => {
            const isActive = item.status === 'active';
            const photosCount = typeof item.photosCount === 'number' ? item.photosCount : 0;
            const videosCount = typeof item.videosCount === 'number' ? item.videosCount : 0;
            const totalFiles = photosCount + videosCount;

            const statusBadge =
              item.status === 'active'
                ? { label: 'Disponível', cls: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' }
                : item.status === 'expired'
                  ? { label: 'Expirado', cls: 'bg-amber-500/15 border-amber-500/30 text-amber-300' }
                  : { label: 'Revogado', cls: 'bg-rose-500/15 border-rose-500/30 text-rose-300' };

            return (
              <article
                key={item.entitlementId}
                className={`group overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#08080c] shadow-[0_16px_50px_rgba(0,0,0,0.85)] transition-all duration-300 hover:border-[#661C30]/55 ${
                  isSingleFeatured ? 'grid grid-cols-1 lg:grid-cols-12' : 'flex flex-col justify-between'
                }`}
              >
                {/* Capa Editorial */}
                <div
                  className={`relative overflow-hidden bg-zinc-950 ${
                    isSingleFeatured
                      ? 'aspect-[16/10] lg:aspect-auto lg:min-h-[290px] lg:col-span-5'
                      : 'aspect-[16/10] w-full'
                  }`}
                >
                  {item.coverUrl ? (
                    <img
                      src={resolveMediaUrl(item.coverUrl, 'mobile')}
                      alt={item.title}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#140b0f] to-black text-[#90364B]/60">
                      <Film className="h-10 w-10" />
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#08080c] via-transparent to-black/35" />

                  <div className="absolute top-4 inset-x-4 flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider backdrop-blur-md ${statusBadge.cls}`}
                    >
                      {statusBadge.label}
                    </span>

                    {totalFiles > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/75 px-2.5 py-1 font-mono text-[10px] text-zinc-300 backdrop-blur-md">
                        <Layers className="h-3 w-3 text-[#90364B]" />
                        <span>
                          {totalFiles} {totalFiles === 1 ? 'arquivo' : 'arquivos'}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Conteúdo e CTA integrado */}
                <div
                  className={`flex flex-1 flex-col justify-between p-6 sm:p-7 text-left ${
                    isSingleFeatured ? 'lg:col-span-7' : ''
                  }`}
                >
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                      Adquirido em {formatDateBr(item.purchasedAt)}
                    </p>
                    <h3 className="mt-2 font-serif text-2xl font-normal tracking-tight text-[#F5EEE9] group-hover:text-white transition-colors">
                      {item.title}
                    </h3>

                    {(photosCount > 0 || videosCount > 0) && isActive && (
                      <div className="mt-3.5 flex flex-wrap items-center gap-2 text-[11px] font-mono text-zinc-300">
                        {photosCount > 0 && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/55 px-3 py-1">
                            <ImageIcon className="h-3 w-3 text-[#90364B]" />
                            <span>
                              {photosCount} {photosCount === 1 ? 'foto' : 'fotos'}
                            </span>
                          </span>
                        )}
                        {videosCount > 0 && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/55 px-3 py-1">
                            <Film className="h-3 w-3 text-[#90364B]" />
                            <span>
                              {videosCount} {videosCount === 1 ? 'vídeo' : 'vídeos'}
                            </span>
                          </span>
                        )}
                      </div>
                    )}

                    <p className="mt-2.5 text-[11px] font-light text-zinc-500">
                      {item.expiresAt
                        ? `Acesso válido até ${formatDateBr(item.expiresAt)}`
                        : isActive
                          ? 'Acesso contínuo na sua conta (conforme Termos)'
                          : ''}
                    </p>
                  </div>

                  <div className="mt-6 pt-5 border-t border-white/[0.06]">
                    {!isActive ? (
                      <p className="text-xs font-light leading-relaxed text-zinc-400">
                        {item.status === 'revoked'
                          ? 'Acesso encerrado após cancelamento, estorno ou revisão administrativa.'
                          : 'O período de validade deste acesso terminou.'}
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectOrder(item.orderRef)}
                        className="w-full inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#54182b] hover:via-[#7A293D] hover:to-[#90364B] hover:border-white/25 hover:shadow-[0_6px_26px_rgba(102,28,48,0.5)] active:scale-[0.985] border border-white/10 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#F5EEE9] transition-all duration-200 shadow-[0_4px_20px_rgba(67,19,34,0.4)] cursor-pointer"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Abrir conteúdo</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
