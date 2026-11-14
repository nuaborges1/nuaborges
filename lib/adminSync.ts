/**
 * Sincronização de dados do painel entre IA, abas e componentes.
 *
 * Uma alteração só é anunciada depois de confirmada pelo servidor. Quem
 * escuta (abas do painel, listas, página pública aberta em outra aba) recarrega
 * os dados sozinho — sem exigir F5 da administradora.
 */

export type AdminUpdateScope =
  | 'appointments'
  | 'finance'
  | 'requests'
  | 'personalizados'
  | 'music'
  | 'site'
  | 'media'
  | 'content'
  | 'contracts'
  | 'vault'
  | 'settings';

const SCOPE_EVENTS: Record<AdminUpdateScope, string> = {
  appointments: 'nua-appointments-updated',
  finance: 'nua-finance-updated',
  requests: 'nua-requests-updated',
  personalizados: 'nua-personalizados-updated',
  music: 'nua-music-updated',
  site: 'nua-site-published',
  media: 'nua-media-updated',
  content: 'nua-content-updated',
  contracts: 'nua-contracts-updated',
  vault: 'nua-vault-updated',
  settings: 'nua-settings-updated',
};

const CHANNEL_NAME = 'nua-admin-sync';

type Listener = (detail: Record<string, unknown>) => void;

function getChannel(): BroadcastChannel | null {
  try {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
    return new BroadcastChannel(CHANNEL_NAME);
  } catch {
    return null;
  }
}

/**
 * Anuncia que uma alteração foi gravada e verificada.
 * Dispara evento local (mesma aba) + BroadcastChannel (outras abas).
 */
export function broadcastAdminUpdate(
  scope: AdminUpdateScope,
  detail: Record<string, unknown> = {}
): void {
  if (typeof window === 'undefined') return;

  const payload = { scope, at: new Date().toISOString(), ...detail };

  try {
    window.dispatchEvent(new CustomEvent(SCOPE_EVENTS[scope], { detail: payload }));
    window.dispatchEvent(new CustomEvent('nua-admin-updated', { detail: payload }));
  } catch {
    /* ambientes sem CustomEvent (SSR/testes) */
  }

  rememberAdminUpdate(scope, payload);

  const channel = getChannel();
  if (channel) {
    try {
      channel.postMessage(payload);
    } catch {
      /* canal fechado */
    } finally {
      channel.close();
    }
  }
}

/**
 * Escuta alterações de um escopo (ou de todos, quando omitido).
 * Devolve a função de limpeza para usar no retorno do useEffect.
 */
export function subscribeAdminUpdates(scope: AdminUpdateScope | 'all', listener: Listener): () => void {
  if (typeof window === 'undefined') return () => {};

  const events =
    scope === 'all'
      ? ['nua-admin-updated']
      : [SCOPE_EVENTS[scope], 'nua-admin-updated'];

  const handlers: Array<{ event: string; fn: (event: Event) => void }> = [];
  for (const event of events) {
    const fn = (rawEvent: Event) => {
      const detail = (rawEvent as CustomEvent).detail;
      if (scope !== 'all' && detail?.scope && detail.scope !== scope) return;
      listener(detail || {});
    };
    window.addEventListener(event, fn);
    handlers.push({ event, fn });
  }

  // Outra aba gravou algo: o navegador emite `storage` no localStorage.
  const storageHandler = (event: StorageEvent) => {
    if (event.key !== 'nua:admin-update') return;
    try {
      const detail = event.newValue ? JSON.parse(event.newValue) : {};
      if (scope !== 'all' && detail?.scope && detail.scope !== scope) return;
      listener(detail);
    } catch {
      /* payload inválido */
    }
  };
  window.addEventListener('storage', storageHandler);

  const channel = getChannel();
  if (channel) {
    channel.onmessage = (event) => {
      const detail = event.data || {};
      if (scope !== 'all' && detail?.scope && detail.scope !== scope) return;
      listener(detail);
    };
  }

  return () => {
    for (const { event, fn } of handlers) window.removeEventListener(event, fn);
    window.removeEventListener('storage', storageHandler);
    if (channel) channel.close();
  };
}

/** Persiste o anúncio para abas que ainda não estavam escutando no momento. */
export function rememberAdminUpdate(scope: AdminUpdateScope, detail: Record<string, unknown> = {}): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      'nua:admin-update',
      JSON.stringify({ scope, at: new Date().toISOString(), ...detail })
    );
  } catch {
    /* storage indisponível */
  }
}
