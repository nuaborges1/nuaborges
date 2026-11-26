'use client';

import React, { useMemo, useState } from 'react';
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

export interface LibraryViewState {
  search: string;
  statusFilter: 'all' | 'active' | 'inactive';
  sortBy: 'recent' | 'alpha';
}

interface LibrarySectionProps {
  items: NuaIdLibraryItem[];
  loading: boolean;
  selectedOrder: string | null;
  confirmToken?: string;
  viewState?: LibraryViewState;
  onViewStateChange?: (next: LibraryViewState) => void;
  onSelectOrder: (order: string | null) => void;
  onClearConfirmToken?: () => void;
  onOpenClaimOrder?: () => void;
}

const DEFAULT_VIEW_STATE: LibraryViewState = {
  search: '',
  statusFilter: 'all',
  sortBy: 'recent',
};

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
  viewState,
  onViewStateChange,
  onSelectOrder,
  onClearConfirmToken,
  onOpenClaimOrder,
}: LibrarySectionProps) {
  const [localState, setLocalState] = useState<LibraryViewState>(DEFAULT_VIEW_STATE);
  const [failedCovers, setFailedCovers] = useState<Record<string, true>>({});

  const currentView = viewState ?? localState;
  const updateView = (patch: Partial<LibraryViewState>) => {
    const next = { ...currentView, ...patch };
    if (onViewStateChange) onViewStateChange(next);
    else setLocalState(next);
  };

  const hasInactive = useMemo(() => items.some((i) => i.status !== 'active'), [items]);

  const filteredItems = useMemo(() => {
    const q = currentView.search.trim().toLowerCase();
    const list = items.filter((item) => {
      if (currentView.statusFilter === 'active' && item.status !== 'active') return false;
      if (currentView.statusFilter === 'inactive' && item.status === 'active') return false;
      if (q && !item.title.toLowerCase().includes(q)) return false;
      return true;
    });

    if (currentView.sortBy === 'alpha') {
      return [...list].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
    }
    return [...list].sort((a, b) => {
      const ta = a.purchasedAt ? new Date(a.purchasedAt).getTime() : 0;
      const tb = b.purchasedAt ? new Date(b.purchasedAt).getTime() : 0;
      return tb - ta;
    });
  }, [items, currentView]);

  const selectedItem = useMemo(
    () => (selectedOrder ? items.find((i) => i.orderRef === selectedOrder) || null : null),
    [items, selectedOrder]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-40 rounded-lg bg-white/[0.04]" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="aspect-[4/5] rounded-[24px] border border-white/[0.08] bg-[#08080c]"
            />
          ))}
        </div>
      </div>
    );
  }

  // Visualização em Modo Foco integrada na aba Biblioteca
  if (selectedOrder) {
    const purchaseDate = formatDateBr(selectedItem?.purchasedAt || null);
    const expiryDate = formatDateBr(selectedItem?.expiresAt || null);
    const publicCover =
      selectedItem?.coverUrl && !selectedItem.coverUrl.includes('/private/')
        ? resolveMediaUrl(selectedItem.coverUrl, 'mobile')
        : null;

    return (
      <VaultContentViewer
        order={selectedOrder}
        initialTitle={selectedItem?.title || ''}
        initialCoverUrl={publicCover}
        initialConfirmToken={confirmToken}
        backLabel="Voltar à biblioteca"
        metadataSlot={
          (purchaseDate || expiryDate) && (
            <>
              {purchaseDate && (
                <>
                  <span aria-hidden className="text-zinc-600">·</span>
                  <span>Adquirido em {purchaseDate}</span>
                </>
              )}
              {expiryDate && (
                <>
                  <span aria-hidden className="text-zinc-600">·</span>
                  <span>Disponível até {expiryDate}</span>
                </>
              )}
            </>
          )
        }
        onBack={() => {
          onClearConfirmToken?.();
          onSelectOrder(null);
        }}
      />
    );
  }

  const isSingleFeatured = filteredItems.length === 1 && items.length === 1;
  const showControls = items.length >= 4 || hasInactive;

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-normal leading-tight tracking-tight text-[#F5EEE9] sm:text-3xl">
            Sua biblioteca
          </h2>
          {items.length > 0 && (
            <p className="mt-1.5 text-sm text-zinc-400">
              {items.length} {items.length === 1 ? 'conteúdo na sua coleção' : 'conteúdos na sua coleção'}
            </p>
          )}
        </div>
        {items.length > 0 && (
          <Link href="/avulsos" className="btn-ghost !min-h-[40px] !px-4">
            <span>Explorar catálogo</span>
            <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        )}
      </header>

      {/* Busca, ordenação e filtros — exibidos apenas conforme a necessidade real */}
      {showControls && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {items.length >= 4 && (
            <div className="flex flex-1 flex-wrap items-center gap-2.5">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="search"
                  value={currentView.search}
                  onChange={(e) => updateView({ search: e.target.value })}
                  placeholder="Buscar na biblioteca…"
                  aria-label="Buscar na biblioteca"
                  className="w-full min-h-[42px] rounded-full border border-white/[0.1] bg-[#08080c] pl-10 pr-4 text-sm text-[#F5EEE9] placeholder:text-zinc-500 focus:border-[#90364B] focus:outline-none transition-colors"
                />
              </div>

              <div
                role="group"
                aria-label="Ordenar biblioteca"
                className="inline-flex items-center rounded-full border border-white/[0.08] bg-[#08080c] p-1"
              >
                {[
                  { id: 'recent' as const, label: 'Recentes' },
                  { id: 'alpha' as const, label: 'A–Z' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateView({ sortBy: opt.id })}
                    aria-pressed={currentView.sortBy === opt.id}
                    className={`min-h-[34px] rounded-full px-3 text-xs transition-colors cursor-pointer touch-manipulation ${
                      currentView.sortBy === opt.id
                        ? 'bg-[#661C30]/40 font-medium text-[#F5EEE9] border border-[#90364B]/50'
                        : 'border border-transparent text-zinc-400 hover:text-zinc-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasInactive && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar disponibilidade">
              {[
                { id: 'all' as const, label: 'Todos' },
                { id: 'active' as const, label: 'Disponíveis' },
                { id: 'inactive' as const, label: 'Encerrados' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => updateView({ statusFilter: f.id })}
                  aria-pressed={currentView.statusFilter === f.id}
                  className={`min-h-[38px] rounded-full px-3.5 text-xs transition-colors cursor-pointer touch-manipulation ${
                    currentView.statusFilter === f.id
                      ? 'border border-[#90364B]/55 bg-[#661C30]/40 font-medium text-[#F5EEE9]'
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
        <div className="rounded-[24px] border border-white/[0.08] bg-[#08080c] px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-[#7A293D]/40 bg-[#431322]/30 text-[#C97A8D]">
            <Lock className="size-5" />
          </div>
          <p className="font-serif text-xl font-normal text-[#F5EEE9]">Sua biblioteca ainda está vazia</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">
            Seus conteúdos adquiridos ficam reunidos aqui com acesso privado após a confirmação do pagamento.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href="/avulsos" className="btn-primary !min-h-[46px] !px-6">
              <span>Explorar catálogo</span>
              <ArrowRight className="size-4" />
            </Link>
            {onOpenClaimOrder && (
              <button
                type="button"
                onClick={onOpenClaimOrder}
                className="btn-ghost !min-h-[46px] !px-5"
              >
                <KeyRound className="size-3.5 text-[#C97A8D]" />
                <span>Vincular compra anterior</span>
              </button>
            )}
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-[24px] border border-white/[0.08] bg-[#08080c] px-6 py-12 text-center">
          <p className="font-serif text-lg font-normal text-[#F5EEE9]">Nenhum conteúdo encontrado neste filtro</p>
          <button
            type="button"
            onClick={() => updateView({ search: '', statusFilter: 'all' })}
            className="mt-3 text-sm text-[#C97A8D] underline underline-offset-4 hover:text-[#F5EEE9] cursor-pointer"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className={isSingleFeatured ? '' : 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3'}>
          {filteredItems.map((item) => {
            const isActive = item.status === 'active';
            const photosCount = item.photosCount || 0;
            const videosCount = item.videosCount || 0;
            const purchaseDate = formatDateBr(item.purchasedAt);
            const expiryDate = formatDateBr(item.expiresAt);
            const cover = item.coverUrl ? resolveMediaUrl(item.coverUrl, 'mobile') : '';
            const hasCover = Boolean(cover) && !failedCovers[cover];

            return (
              <article
                key={item.entitlementId}
                className={`group flex min-w-0 flex-col overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#08080c] transition-colors duration-300 hover:border-[#7A293D]/60 ${
                  isSingleFeatured ? 'md:grid md:grid-cols-12' : ''
                }`}
              >
                {/* Capa editorial — respeita proporção fotográfica vertical */}
                <div
                  className={`relative overflow-hidden bg-zinc-950 ${
                    isSingleFeatured
                      ? 'aspect-[4/5] sm:aspect-[16/10] md:col-span-6 md:order-2 md:aspect-auto md:min-h-[24rem]'
                      : 'aspect-[4/5]'
                  }`}
                >
                  {hasCover ? (
                    <>
                      <img
                        src={cover}
                        alt={item.title}
                        loading={isSingleFeatured ? 'eager' : 'lazy'}
                        decoding="async"
                        onError={() => setFailedCovers((previous) => ({ ...previous, [cover]: true }))}
                        className={`absolute inset-0 size-full object-cover object-center motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:scale-[1.03] ${
                          isActive ? '' : 'opacity-50 grayscale-[35%]'
                        }`}
                      />
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#08080c]/75 via-transparent to-black/20"
                      />
                    </>
                  ) : (
                    <div className="flex size-full flex-col items-center justify-center bg-gradient-to-br from-[#171115] via-[#08080c] to-black p-6">
                      <div className="flex size-12 items-center justify-center rounded-2xl border border-[#7A293D]/35 bg-[#431322]/30 text-[#C97A8D]">
                        {videosCount > 0 ? <Film className="size-5" /> : <ImageIcon className="size-5" />}
                      </div>
                    </div>
                  )}

                  {!isActive && (
                    <span className="absolute left-4 top-4 rounded-full border border-amber-400/30 bg-black/80 px-3 py-1 text-[11px] font-medium text-amber-200 backdrop-blur-sm">
                      {item.status === 'revoked' ? 'Acesso encerrado' : 'Acesso expirado'}
                    </span>
                  )}
                </div>

                {/* Informações objetivas e acesso */}
                <div
                  className={`flex flex-1 flex-col justify-between p-6 ${
                    isSingleFeatured ? 'md:col-span-6 md:justify-center sm:p-8 lg:p-10' : ''
                  }`}
                >
                  <div className="space-y-3">
                    <h3
                      className={`break-words font-serif font-normal leading-snug tracking-tight text-[#F5EEE9] ${
                        isSingleFeatured ? 'text-3xl lg:text-4xl' : 'text-2xl'
                      }`}
                    >
                      {item.title}
                    </h3>

                    {isActive && (photosCount > 0 || videosCount > 0) && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-300">
                        {photosCount > 0 && (
                          <span className="inline-flex items-center gap-1.5">
                            <ImageIcon aria-hidden className="size-3.5 text-[#C97A8D]" />
                            {photosCount} {photosCount === 1 ? 'foto' : 'fotos'}
                          </span>
                        )}
                        {videosCount > 0 && (
                          <span className="inline-flex items-center gap-1.5">
                            <Film aria-hidden className="size-3.5 text-[#C97A8D]" />
                            {videosCount} {videosCount === 1 ? 'vídeo' : 'vídeos'}
                          </span>
                        )}
                      </div>
                    )}

                    {(purchaseDate || expiryDate) && (
                      <p className="text-xs leading-relaxed text-zinc-400">
                        {expiryDate && isActive
                          ? `Disponível até ${expiryDate}`
                          : purchaseDate
                            ? `Adquirido em ${purchaseDate}`
                            : null}
                      </p>
                    )}
                  </div>

                  {isActive ? (
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={() => onSelectOrder(item.orderRef)}
                        className="btn-primary !min-h-[46px] !px-6"
                      >
                        <span>Abrir conteúdo</span>
                        <ArrowRight aria-hidden className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="mt-5 text-xs leading-relaxed text-zinc-400">
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
