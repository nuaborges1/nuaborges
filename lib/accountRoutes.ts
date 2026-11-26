export type AccountTab = 'biblioteca' | 'personalizados' | 'chamadas' | 'conta' | 'perfil';

export const ACCOUNT_TAB_SEGMENTS: Record<AccountTab, string> = {
  biblioteca: 'biblioteca',
  personalizados: 'personalizados',
  chamadas: 'chamadas',
  conta: 'pedidos',
  perfil: 'perfil',
};

const SEGMENT_TO_TAB: Record<string, AccountTab> = {
  biblioteca: 'biblioteca',
  inicio: 'biblioteca',
  personalizados: 'personalizados',
  chamadas: 'chamadas',
  pedidos: 'conta',
  compras: 'conta',
  conta: 'conta',
  perfil: 'perfil',
};

export function slugifyAccountItem(raw: string | null | undefined): string {
  const base = String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return base || 'conteudo';
}

export function resolveTabForOrderId(orderId: string | null | undefined): AccountTab | null {
  if (!orderId) return null;
  const lower = orderId.toLowerCase();
  if (lower.startsWith('ped_') || lower.startsWith('pers_') || lower.startsWith('pedido-')) {
    return 'personalizados';
  }
  if (lower.startsWith('book_') || lower.startsWith('apt_') || lower.startsWith('app_')) {
    return 'chamadas';
  }
  return 'biblioteca';
}

function shortOrderSuffix(orderRef: string): string {
  const clean = orderRef.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return clean.slice(-4) || 'item';
}

export interface SlugLookup {
  orderToSlug: Map<string, string>;
  slugToOrder: Map<string, string>;
}

export function buildLibrarySlugLookup(
  items: Array<{ orderRef: string; slug?: string | null; title?: string | null; resourceId?: string | null }>
): SlugLookup {
  const orderToSlug = new Map<string, string>();
  const slugToOrder = new Map<string, string>();

  const baseCounts = new Map<string, number>();
  const bases = items.map((item) => {
    const rawSlug = item.slug && !/^ord_/i.test(item.slug) ? item.slug : item.title || item.resourceId || item.orderRef;
    const base = slugifyAccountItem(rawSlug);
    baseCounts.set(base, (baseCounts.get(base) || 0) + 1);
    return { item, base };
  });

  for (const { item, base } of bases) {
    let candidate = (baseCounts.get(base) || 0) > 1 ? `${base}-${shortOrderSuffix(item.orderRef)}` : base;
    let counter = 2;
    while (slugToOrder.has(candidate)) {
      candidate = `${base}-${shortOrderSuffix(item.orderRef)}-${counter}`;
      counter += 1;
    }
    orderToSlug.set(item.orderRef, candidate);
    slugToOrder.set(candidate, item.orderRef);
  }

  return { orderToSlug, slugToOrder };
}

export function buildPersonalizadoSlugLookup(items: Array<{ id: string }>): SlugLookup {
  const orderToSlug = new Map<string, string>();
  const slugToOrder = new Map<string, string>();

  for (const item of items) {
    const clean = item.id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const suffix = clean.slice(-6) || clean || 'item';
    let candidate = `pedido-${suffix}`;
    let counter = 2;
    while (slugToOrder.has(candidate)) {
      candidate = `pedido-${suffix}-${counter}`;
      counter += 1;
    }
    orderToSlug.set(item.id, candidate);
    slugToOrder.set(candidate, item.id);
  }

  return { orderToSlug, slugToOrder };
}

export interface ParsedAccountLocation {
  tab: AccountTab;
  /** Either an internal orderRef (legacy URL) or a clean slug (new URL). */
  itemKey: string | null;
  confirmToken: string;
  explicit: boolean;
  isLegacyQuery: boolean;
}

export function parseAccountLocation(pathname: string, search: string, hash: string): ParsedAccountLocation {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);

  const confirmToken = (hashParams.get('confirm') || '').trim();
  const queryTab = (params.get('tab') || '').trim().toLowerCase();
  const queryItem = (params.get('item') || params.get('order') || hashParams.get('order') || '').trim() || null;

  const cleanPath = pathname.replace(/\/+$/, '');
  const match = cleanPath.match(/^\/conta(?:\/([^/]+))?(?:\/([^/]+))?$/i);
  const pathSeg1 = match?.[1] ? decodeURIComponent(match[1]).trim().toLowerCase() : '';
  const pathSeg2 = match?.[2] ? decodeURIComponent(match[2]).trim() : '';

  const tabFromPath = pathSeg1 ? SEGMENT_TO_TAB[pathSeg1] || null : null;
  const tabFromQuery = queryTab ? SEGMENT_TO_TAB[queryTab] || null : null;

  const itemKey = pathSeg2 || queryItem || null;
  const inferredFromItem = !tabFromPath && !tabFromQuery ? resolveTabForOrderId(itemKey) : null;

  const tab: AccountTab = tabFromPath || tabFromQuery || inferredFromItem || 'biblioteca';
  const explicit = Boolean(tabFromPath || tabFromQuery || inferredFromItem);
  const isLegacyQuery = Boolean(params.has('tab') || params.has('item') || params.has('order') || Boolean(confirmToken));

  return {
    tab,
    itemKey,
    confirmToken,
    explicit,
    isLegacyQuery,
  };
}

export function buildAccountPath(tab: AccountTab, itemSlug?: string | null): string {
  const seg = ACCOUNT_TAB_SEGMENTS[tab] || 'biblioteca';
  if (itemSlug && (tab === 'biblioteca' || tab === 'personalizados')) {
    return `/conta/${seg}/${encodeURIComponent(itemSlug)}`;
  }
  return `/conta/${seg}`;
}
