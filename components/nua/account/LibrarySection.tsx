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
import { VaultContentViewer, VaultMetaItem } from './VaultContentViewer';

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
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2].map((n) => (
          <div
            key={n}
            className="aspect-[4/5] rounded-[24px] border border-white/[0.08] bg-[#08080c]"
          />
        ))}
      </div>
    );
  }

  // Modo Estúdio integrado dentro da aba Biblioteca
  if (selectedOrder) {
    const purchaseDate = formatDateBr(selectedItem?.purchasedAt || null);
    const expiryDate = formatDateBr(selectedItem?.expiresAt || null);
    const publicCover =
      selectedItem?.coverUrl && !selectedItem.coverUrl.includes('/private/')
        ? resolveMediaUrl(selectedItem.coverUrl, 'mobile')
        : null;

    const metaItems: VaultMetaItem[] = [];
    if (purchaseDate) metaItems.push({ label: 'Adquirido em', value: `Adquirido em ${purchaseDate}` });
    if (expiryDate) metaItems.push({ label: 'Disponível até', value: `Disponível até ${expiryDate}` });

    return (
      <VaultContentViewer
        order={selectedOrder}
        initialTitle={selectedItem?.title || ''}
        initialCoverUrl={publicCover}
        initialPhotosCount={selectedItem?.photosCount || 0}
        initialVideosCount={selectedItem?.videosCount || 0}
        initialConfirmToken={confirmToken}
        backLabel="Voltar à biblioteca"
        metaItems={metaItems}
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
    <div className="space-y-6">
      {/* Busca, ordenação e filtros — apenas quando fazem sentido real */}
      {showControls && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {items.length >= 4 && (
            <div className="flex flex-1 flex-wrap items-center gap-2.5">
              <div className="relative min-w-[200px] max-w-xs flex-1">
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
                        ? 'border border-[#90364B]/50 bg-[#661C30]/40 font-medium text-[#F5EEE9]'
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
                  className={`min-h-[36px] rounded-full px-3.5 text-xs transition-colors cursor-pointer touch-manipulation ${
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
        <div className="rounded-[24px] border border-white/[0.08] bg-[#08080c] px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-[#7A293D]/40 bg-[#431322]/30 text-[#F5EEE9]">
            <Lock className="size-5" />
          </div>
          <p className="font-serif text-2xl font-normal text-[#F5EEE9]">Sua coleção está pronta para começar</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">
            Os conteúdos que você adquirir ficam reunidos aqui com acesso privado após a confirmação do pagamento.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href="/avulsos" className="btn-primary !min-h-[46px] !px-6">
              <span>Explorar catálogo</span>
              <ArrowRight className="size-4" />
            </Link>
            {onOpenClaimOrder && (
              <button type="button" onClick={onOpenClaimOrder} className="btn-ghost !min-h-[46px] !px-5">
                <KeyRound className="size-3.5 text-[#90364B]" />
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
            className="mt-3 text-sm text-[#F5EEE9]/80 underline underline-offset-4 hover:text-[#F5EEE9] cursor-pointer"
          >
            Limpar filtros
          </button>
        </div>
      ) : isSingleFeatured ? (
        /* Destaque Editorial de Colecionador — composição equilibrada sem metade preta vazia */
        (() => {
          const item = filteredItems[0];
          const isActive = item.status === 'active';
          const photosCount = item.photosCount || 0;
          const videosCount = item.videosCount || 0;
          const purchaseDate = formatDateBr(item.purchasedAt);
          const expiryDate = formatDateBr(item.expiresAt);
          const cover = item.coverUrl ? resolveMediaUrl(item.coverUrl, 'mobile') : '';
          const hasCover = Boolean(cover) && !failedCovers[cover];

          return (
            <article
              onClick={isActive ? () => onSelectOrder(item.orderRef) : undefined}
              className={`group relative mx-auto max-w-4xl overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#08080c] transition-colors duration-300 md:grid md:grid-cols-12 ${
                isActive ? 'cursor-pointer hover:border-[#7A293D]/60' : ''
              }`}
            >
              {/* Fotografia em destaque generoso */}
              <div className="relative aspect-[4/5] overflow-hidden bg-zinc-950 sm:aspect-[16/10] md:col-span-7 md:aspect-auto md:min-h-[26rem]">
                {hasCover ? (
                  <>
                    <img
                      src={cover}
                      alt={item.title}
                      loading="eager"
                      decoding="async"
                      onError={() => setFailedCovers((previous) => ({ ...previous, [cover]: true }))}
                      className={`absolute inset-0 size-full object-cover object-center motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:scale-[1.03] ${
                        isActive ? '' : 'opacity-50 grayscale-[35%]'
                      }`}
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#08080c] via-transparent to-black/15 md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-[#08080c]"
                    />
                  </>
                ) : (
                  <div className="flex size-full items-center justify-center bg-gradient-to-br from-[#171115] via-[#08080c] to-black p-8">
                    <div className="flex size-14 items-center justify-center rounded-2xl border border-[#7A293D]/35 bg-[#431322]/30 text-[#F5EEE9]">
                      {videosCount > 0 ? <Film className="size-6" /> : <ImageIcon className="size-6" />}
                    </div>
                  </div>
                )}

                {!isActive && (
                  <span className="absolute left-5 top-5 rounded-full border border-amber-400/30 bg-black/80 px-3 py-1 text-[11px] font-medium text-amber-200 backdrop-blur-sm">
                    {item.status === 'revoked' ? 'Acesso encerrado' : 'Acesso expirado'}
                  </span>
                )}
              </div>

              {/* Informações editoriais enxutas */}
              <div className="flex flex-col justify-center space-y-5 p-6 sm:p-8 md:col-span-5 md:p-10">
                <div className="space-y-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#F5EEE9]/80">
                    Na sua coleção
                  </p>
                  <h2 className="break-words font-serif text-3xl font-normal leading-[1.12] tracking-tight text-[#F5EEE9] lg:text-4xl">
                    {item.title}
                  </h2>

                  {isActive && (photosCount > 0 || videosCount > 0) && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-300">
                      {photosCount > 0 && (
                        <span className="inline-flex items-center gap-1.5">
                          <ImageIcon aria-hidden className="size-3.5 text-[#90364B]" />
                          {photosCount} {photosCount === 1 ? 'foto' : 'fotos'}
                        </span>
                      )}
                      {videosCount > 0 && (
                        <span className="inline-flex items-center gap-1.5">
                          <Film aria-hidden className="size-3.5 text-[#90364B]" />
                          {videosCount} {videosCount === 1 ? 'vídeo' : 'vídeos'}
                        </span>
                      )}
                    </div>
                  )}

                  {(purchaseDate || expiryDate) && (
                    <p className="text-xs text-zinc-400">
                      {expiryDate && isActive
                        ? `Disponível até ${expiryDate}`
                        : purchaseDate
                          ? `Adquirido em ${purchaseDate}`
                          : null}
                    </p>
                  )}
                </div>

                {isActive ? (
                  <div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectOrder(item.orderRef);
                      }}
                      className="btn-primary !min-h-[46px] !px-6"
                    >
                      <span>Abrir conteúdo</span>
                      <ArrowRight aria-hidden className="size-4" />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs leading-relaxed text-zinc-400">
                    {item.status === 'revoked'
                      ? 'O acesso foi encerrado após cancelamento, estorno ou revisão.'
                      : 'O período de acesso a este conteúdo terminou.'}
                  </p>
                )}
              </div>
            </article>
          );
        })()
      ) : (
        /* Grade Editorial de Colecionador (2+ conteúdos) — cards inteiramente clicáveis */
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                onClick={isActive ? () => onSelectOrder(item.orderRef) : undefined}
                className={`group flex min-w-0 flex-col overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#08080c] transition-colors duration-300 ${
                  isActive ? 'cursor-pointer hover:border-[#7A293D]/60' : ''
                }`}
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-zinc-950">
                  {hasCover ? (
                    <>
                      <img
                        src={cover}
                        alt={item.title}
                        loading="lazy"
                        decoding="async"
                        onError={() => setFailedCovers((previous) => ({ ...previous, [cover]: true }))}
                        className={`absolute inset-0 size-full object-cover object-center motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:scale-[1.03] ${
                          isActive ? '' : 'opacity-50 grayscale-[35%]'
                        }`}
                      />
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#08080c]/80 via-transparent to-black/15"
                      />
                    </>
                  ) : (
                    <div className="flex size-full items-center justify-center bg-gradient-to-br from-[#171115] via-[#08080c] to-black p-6">
                      <div className="flex size-12 items-center justify-center rounded-2xl border border-[#7A293D]/35 bg-[#431322]/30 text-[#F5EEE9]">
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

                <div className="flex flex-1 flex-col justify-between space-y-4 p-5 sm:p-6">
                  <div className="space-y-2">
                    <h2 className="break-words font-serif text-2xl font-normal leading-snug tracking-tight text-[#F5EEE9]">
                      {item.title}
                    </h2>

                    {isActive && (photosCount > 0 || videosCount > 0) && (
                      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-zinc-300">
                        {photosCount > 0 && (
                          <span className="inline-flex items-center gap-1.5">
                            <ImageIcon aria-hidden className="size-3.5 text-[#90364B]" />
                            {photosCount} {photosCount === 1 ? 'foto' : 'fotos'}
                          </span>
                        )}
                        {videosCount > 0 && (
                          <span className="inline-flex items-center gap-1.5">
                            <Film aria-hidden className="size-3.5 text-[#90364B]" />
                            {videosCount} {videosCount === 1 ? 'vídeo' : 'vídeos'}
                          </span>
                        )}
                      </div>
                    )}

                    {(purchaseDate || expiryDate) && (
                      <p className="text-xs text-zinc-500">
                        {expiryDate && isActive
                          ? `Disponível até ${expiryDate}`
                          : purchaseDate
                            ? `Adquirido em ${purchaseDate}`
                            : null}
                      </p>
                    )}
                  </div>

                  {isActive ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectOrder(item.orderRef);
                      }}
                      className="inline-flex min-h-[40px] w-fit items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[#F5EEE9]/80 transition-colors group-hover:text-[#F5EEE9] cursor-pointer"
                    >
                      <span>Abrir conteúdo</span>
                      <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ) : (
                    <p className="text-xs leading-relaxed text-zinc-500">
                      {item.status === 'revoked'
                        ? 'Acesso encerrado após cancelamento ou estorno.'
                        : 'O período de acesso terminou.'}
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
