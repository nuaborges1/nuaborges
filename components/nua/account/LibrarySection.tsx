'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Film,
  Image as ImageIcon,
  KeyRound,
  Lock,
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
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return '';
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
  const [failedCovers, setFailedCovers] = useState<Record<string, true>>({});

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
        backLabel="Voltar à biblioteca"
        metadataSlot={selectedItem && (
          <div className="space-y-1 text-sm leading-relaxed text-zinc-400">
            {formatDateBr(selectedItem.purchasedAt) && (
              <p>Adquirido em {formatDateBr(selectedItem.purchasedAt)}</p>
            )}
            {selectedItem.expiresAt && <p>Disponível até {formatDateBr(selectedItem.expiresAt)}</p>}
          </div>
        )}
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
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl leading-tight tracking-tight text-[#F5EEE9] sm:text-3xl">Sua biblioteca</h2>
          {items.length > 0 && (
            <p className="mt-2 text-sm text-zinc-400">
              {items.length} {items.length === 1 ? 'conteúdo na coleção' : 'conteúdos na coleção'}
            </p>
          )}
        </div>
        {items.length > 0 && (
          <Link href="/avulsos" className="btn-ghost px-4">
            Explorar catálogo
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        )}
      </header>

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
                  aria-pressed={statusFilter === f.id}
                  className={`min-h-11 rounded-lg px-3.5 py-1.5 text-sm transition-colors cursor-pointer ${
                    statusFilter === f.id
                      ? 'border border-wine-highlight/50 bg-wine-deep font-medium text-[#F5EEE9]'
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
        <div className="rounded-[28px] border border-white/[0.08] bg-[#08080c] px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-[#90364B]">
            <Lock className="h-5 w-5" />
          </div>
          <p className="font-serif text-lg text-[#F5EEE9]">Sua biblioteca ainda está vazia</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs sm:text-sm font-light leading-relaxed text-zinc-400">
            Seus packs aparecem aqui depois da confirmação da compra.
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
        <div className={isSingleFeatured ? '' : 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6'}>
          {filteredItems.map((item) => {
            const isActive = item.status === 'active';
            const photosCount = item.photosCount || 0;
            const videosCount = item.videosCount || 0;
            const purchaseDate = formatDateBr(item.purchasedAt);
            const expiryDate = formatDateBr(item.expiresAt);
            const cover = item.coverUrl && resolveMediaUrl(item.coverUrl, 'mobile');
            const hasCover = cover && !failedCovers[cover];

            return (
              <article
                key={item.entitlementId}
                className={`group flex min-w-0 flex-col overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#08080c] transition-colors hover:border-wine-bordeaux/60 ${
                  isSingleFeatured && hasCover ? 'md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]' : ''
                }`}
              >
                {hasCover && (
                  <div className={`relative overflow-hidden bg-zinc-950 ${
                    isSingleFeatured ? 'aspect-[16/10] md:order-2 md:aspect-auto md:min-h-[20rem]' : 'aspect-[16/10]'
                  }`}>
                    <img
                      src={cover}
                      alt=""
                      loading={isSingleFeatured ? 'eager' : 'lazy'}
                      decoding="async"
                      onError={() => setFailedCovers((previous) => ({ ...previous, [cover]: true }))}
                      className="absolute inset-0 size-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.025]"
                    />
                  </div>
                )}

                <div className={`flex flex-1 flex-col items-start justify-center p-5 ${isSingleFeatured ? 'sm:p-8 lg:p-10' : 'sm:p-6'}`}>
                  {!hasCover && (
                    <div className="mb-4 grid size-11 place-items-center rounded-lg bg-wine-deep/40 text-[#C97A8D]">
                      <Film aria-hidden className="size-5" />
                    </div>
                  )}
                  {!isActive && (
                    <p className="mb-2 text-sm font-medium text-amber-200">
                      {item.status === 'revoked' ? 'Acesso encerrado' : 'Acesso expirado'}
                    </p>
                  )}
                  <h3 className={`w-full break-words font-serif leading-tight tracking-tight text-[#F5EEE9] ${isSingleFeatured ? 'text-3xl lg:text-[2.5rem]' : 'text-2xl'}`}>
                    {item.title}
                  </h3>

                  {isActive && (photosCount > 0 || videosCount > 0) && (
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-300">
                      {photosCount > 0 && (
                        <span className="inline-flex items-center gap-1.5">
                          <ImageIcon aria-hidden className="size-4 text-[#C97A8D]" />
                          {photosCount} {photosCount === 1 ? 'foto' : 'fotos'}
                        </span>
                      )}
                      {videosCount > 0 && (
                        <span className="inline-flex items-center gap-1.5">
                          <Film aria-hidden className="size-4 text-[#C97A8D]" />
                          {videosCount} {videosCount === 1 ? 'vídeo' : 'vídeos'}
                        </span>
                      )}
                    </div>
                  )}

                  {(purchaseDate || expiryDate) && (
                    <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                      {expiryDate && isActive ? `Disponível até ${expiryDate}` : purchaseDate && `Adquirido em ${purchaseDate}`}
                    </p>
                  )}

                  {isActive ? (
                    <button
                      type="button"
                      onClick={() => onSelectOrder(item.orderRef)}
                      className="btn-primary mt-6 px-5 sm:mt-7"
                    >
                      Abrir conteúdo
                      <ArrowRight aria-hidden className="size-4" />
                    </button>
                  ) : (
                    <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                      {item.status === 'revoked'
                        ? 'O acesso foi encerrado após cancelamento, estorno ou revisão.'
                        : 'O período de acesso a este conteúdo terminou.'}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
