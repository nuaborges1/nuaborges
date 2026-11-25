/**
 * NUA IA — Client-Side SDK para o Painel Administrativo
 */

import { NuaAiChatRequest, NuaAiChatResponse, ConversationMeta, HistoryTurn } from './types';
import { getPublicApiUrl, getStoredSessionToken } from '../contentStore';

const ACTIVE_CONV_STORAGE_KEY = 'nua_ai_active_conv_id';

export function getStoredActiveConversationId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_CONV_STORAGE_KEY);
}

export function setStoredActiveConversationId(id: string | null): void {
  if (typeof window === 'undefined') return;
  if (id) {
    localStorage.setItem(ACTIVE_CONV_STORAGE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_CONV_STORAGE_KEY);
  }
}

export async function sendNuaAiMessage(request: NuaAiChatRequest): Promise<NuaAiChatResponse> {
  const baseUrl = getPublicApiUrl();
  const token = getStoredSessionToken();
  const res = await fetch(`${baseUrl}/api/nua-ai/chat`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(request),
  });

  const raw = await res.text().catch(() => '');
  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    // O servidor agora devolve a causa real em `error.friendly`.
    const friendly =
      data?.error?.friendly ||
      data?.reply ||
      data?.error ||
      `Falha na comunicação com a Nay (status ${res.status}).`;
    throw new Error(typeof friendly === 'string' ? friendly : 'Não foi possível falar com a Nay agora.');
  }

  if (!data || typeof data.reply !== 'string') {
    throw new Error('A Nay respondeu em um formato inesperado. Nada foi alterado.');
  }

  if (data.conversationId) {
    setStoredActiveConversationId(data.conversationId);
  }
  return data as NuaAiChatResponse;
}

export async function fetchNuaAiConversations(): Promise<ConversationMeta[]> {
  const baseUrl = getPublicApiUrl();
  const token = getStoredSessionToken();
  try {
    const res = await fetch(`${baseUrl}/api/nua-ai/conversations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.conversations || [];
  } catch (err) {
    console.warn('[NuaAiClient] Falha ao carregar conversas anteriores:', err);
    return [];
  }
}

export async function fetchConversationTurns(id: string): Promise<HistoryTurn[]> {
  const baseUrl = getPublicApiUrl();
  const token = getStoredSessionToken();
  try {
    const res = await fetch(`${baseUrl}/api/nua-ai/conversations/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.turns || [];
  } catch (err) {
    console.warn('[NuaAiClient] Falha ao carregar mensagens da conversa:', err);
    return [];
  }
}

export async function fetchNuaAiTelemetry() {
  const baseUrl = getPublicApiUrl();
  const token = getStoredSessionToken();
  try {
    const res = await fetch(`${baseUrl}/api/nua-ai/telemetry`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[NuaAiClient] Falha ao carregar telemetria:', err);
    return null;
  }
}

export async function fetchNuaAiCandidates() {
  const baseUrl = getPublicApiUrl();
  const token = getStoredSessionToken();
  try {
    const res = await fetch(`${baseUrl}/api/nua-ai/candidates`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.candidates || [];
  } catch (err) {
    console.warn('[NuaAiClient] Falha ao carregar candidatos:', err);
    return [];
  }
}

export async function approveNuaAiCandidate(id: string) {
  const baseUrl = getPublicApiUrl();
  const token = getStoredSessionToken();
  const res = await fetch(`${baseUrl}/api/nua-ai/candidates/approve`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ id }),
  });
  return res.json();
}

export async function rejectNuaAiCandidate(id: string) {
  const baseUrl = getPublicApiUrl();
  const token = getStoredSessionToken();
  const res = await fetch(`${baseUrl}/api/nua-ai/candidates/reject`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ id }),
  });
  return res.json();
}

export async function fetchNuaAiKnowledge() {
  const baseUrl = getPublicApiUrl();
  const token = getStoredSessionToken();
  try {
    const res = await fetch(`${baseUrl}/api/nua-ai/knowledge`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[NuaAiClient] Falha ao carregar conhecimento:', err);
    return null;
  }
}
