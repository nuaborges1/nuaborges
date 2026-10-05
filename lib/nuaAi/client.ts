/**
 * NUA IA — Client-Side SDK para o Painel Administrativo
 */

import { NuaAiChatRequest, NuaAiChatResponse, ConversationMeta, HistoryTurn } from './types';
import { getPublicApiUrl } from '../contentStore';

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
  const res = await fetch(`${baseUrl}/api/nua-ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    throw new Error(`Falha na comunicação com a Nua IA (status ${res.status}).`);
  }

  const data = (await res.json()) as NuaAiChatResponse;
  if (data.conversationId) {
    setStoredActiveConversationId(data.conversationId);
  }
  return data;
}

export async function fetchNuaAiConversations(): Promise<ConversationMeta[]> {
  const baseUrl = getPublicApiUrl();
  try {
    const res = await fetch(`${baseUrl}/api/nua-ai/conversations`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
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
  try {
    const res = await fetch(`${baseUrl}/api/nua-ai/conversations/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
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
  try {
    const res = await fetch(`${baseUrl}/api/nua-ai/telemetry`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[NuaAiClient] Falha ao carregar telemetria:', err);
    return null;
  }
}

export async function fetchNuaAiCandidates() {
  const baseUrl = getPublicApiUrl();
  try {
    const res = await fetch(`${baseUrl}/api/nua-ai/candidates`);
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
  const res = await fetch(`${baseUrl}/api/nua-ai/candidates/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  return res.json();
}

export async function rejectNuaAiCandidate(id: string) {
  const baseUrl = getPublicApiUrl();
  const res = await fetch(`${baseUrl}/api/nua-ai/candidates/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  return res.json();
}

export async function fetchNuaAiKnowledge() {
  const baseUrl = getPublicApiUrl();
  try {
    const res = await fetch(`${baseUrl}/api/nua-ai/knowledge`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[NuaAiClient] Falha ao carregar conhecimento:', err);
    return null;
  }
}

