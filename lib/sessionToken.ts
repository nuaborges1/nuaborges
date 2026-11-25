/**
 * sessionToken.ts — Gerenciamento seguro de URL de API e limpeza de legado.
 *
 * Endurecido conforme NUA-AUD-003:
 * - Remove completamente a persistência de token administrativo em `localStorage`
 *   (a sessão do painel usa exclusivamente cookie HttpOnly `__Host-Admin-Session`).
 * - Remove o override inseguro via `localStorage['nua_public_api_url']`.
 */

export const STORAGE_KEYS = {
  PUBLISHED: 'nua_published_content_v1',
  DRAFT: 'nua_draft_content_v1',
  SESSION: 'nua_admin_session_v1',
  PASSWORD_HASH: 'nua_admin_pwd_hash_v1',
  TOKEN: 'nua_admin_token',
} as const;

export function getPublicApiUrl(): string {
  if (typeof window === 'undefined') return '';

  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:3105';
  }

  // Em produção, o painel e o site chamam sua própria origem via caminho relativo ('')
  // para preservar cookies HttpOnly SameSite=Lax sem depender de overrides em localStorage.
  if (process.env.NEXT_PUBLIC_API_URL) {
    const configured = process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
    if (configured.startsWith('https://')) {
      return configured;
    }
  }

  return '';
}

/**
 * Mantido apenas por compatibilidade de assinatura — sempre limpa qualquer resquício
 * legado de `nua_admin_token` em `localStorage` e retorna `null`.
 */
export function getStoredSessionToken(): string | null {
  if (typeof window !== 'undefined') {
    try {
      if (localStorage.getItem(STORAGE_KEYS.TOKEN)) {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
      }
      if (localStorage.getItem('nua_public_api_url')) {
        localStorage.removeItem('nua_public_api_url');
      }
    } catch {}
  }
  return null;
}

export function setStoredSessionToken(_token: string): void {
  clearStoredSessionToken();
}

export function clearStoredSessionToken(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.PASSWORD_HASH);
    localStorage.removeItem('nua_public_api_url');
  } catch {}
}
