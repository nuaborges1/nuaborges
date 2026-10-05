/**
 * Serviço de Sincronização de Conteúdo — Projeto Nua Borges
 * Responsável pela persistência e busca do conteúdo publicado (Cloudflare KV)
 */

import { SiteContent } from '@/lib/types';
import { getPublicApiUrl, getStoredSessionToken } from '@/lib/contentStore';

export interface PublishOptions {
  baseUpdatedAt?: string;
  force?: boolean;
  editorName?: string;
  summary?: string;
}

export interface PublishResult {
  success: boolean;
  conflict?: boolean;
  sessionExpired?: boolean;
  serverUpdatedAt?: string;
  updatedAt?: string;
  version?: number;
  error?: string;
}

export async function fetchPublishedContentFromServer(): Promise<SiteContent | null> {
  const apiUrl = getPublicApiUrl();
  try {
    const res = await fetch(`${apiUrl}/api/content/sync?_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.content && typeof data.content === 'object') {
        const payload = data.content;
        payload._updatedAt = data.updatedAt;
        payload._version = data.version;
        return payload as SiteContent;
      }
    }
  } catch (err) {
    console.warn('[contentService] Falha ao sincronizar com servidor:', err);
  }
  return null;
}

export async function publishContentToServer(
  content: SiteContent,
  options?: PublishOptions
): Promise<PublishResult> {
  const apiUrl = getPublicApiUrl();
  const token = getStoredSessionToken();

  try {
    const res = await fetch(`${apiUrl}/api/content/sync`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        content,
        summary: options?.summary || 'Publicação de conteúdo via Painel',
        editorName: options?.editorName || 'Painel Administrativo da Nua',
        baseUpdatedAt: options?.baseUpdatedAt || (content as any)._updatedAt,
        force: options?.force,
      }),
    });

    if (res.status === 401) {
      return {
        success: false,
        sessionExpired: true,
        error: 'Sua sessão expirou. Faça login novamente para publicar.',
      };
    }

    if (res.status === 409) {
      const data = await res.json().catch(() => ({}));
      return {
        success: false,
        conflict: true,
        error: data.error || 'Conflito de edição: O conteúdo foi atualizado em outro dispositivo.',
        serverUpdatedAt: data.serverUpdatedAt,
      };
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: false,
        error: data.error || `Erro do servidor (${res.status}). Tente novamente.`,
      };
    }

    const data = await res.json().catch(() => ({}));
    return {
      success: true,
      updatedAt: data.updatedAt,
      version: data.version,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Sem conexão com o servidor. Verifique sua internet.',
    };
  }
}
