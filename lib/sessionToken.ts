/**
 * sessionToken.ts — Gerenciamento isolado de tokens e URLs de API da Nua Borges.
 * 
 * Módulo puro, sem dependências de stores de conteúdo ou componentes React.
 * Elimina acoplamentos e ciclos entre o subsistema de mídia e a store de conteúdo.
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
  const saved = localStorage.getItem('nua_public_api_url');
  if (saved) return saved.replace(/\/$/, '');

  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }

  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:3105';
  }
  return '';
}

export function getStoredSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

export function setStoredSessionToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.TOKEN, token);
}

export function clearStoredSessionToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
}
