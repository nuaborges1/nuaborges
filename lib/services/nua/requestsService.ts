/**
 * Serviço de Solicitações da Cliente — Projeto Nua Borges
 * Responsável pela abertura de tickets, pedidos de suporte e aprovação de planos
 */

import { getPublicApiUrl, getStoredSessionToken } from '@/lib/contentStore';

export interface ClientRequestItem {
  id: string;
  createdAt: string;
  updatedAt?: string;
  source: 'ia' | 'manual';
  title: string;
  summary: string;
  type: 'feature' | 'improvement' | 'bug' | 'content';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  contractScope: 'garantia' | 'fora_escopo' | 'adicional';
  targetFiles?: string[];
  status: 'pending' | 'review' | 'in_progress' | 'done' | 'dismissed';
  technicalPlan?: string;
  estimatedHours?: number;
  planApprovedByClient?: boolean;
  developerNotes?: string;
  clientFeedback?: string;
  completedAt?: string;
  messages?: Array<{
    id: string;
    role: 'client' | 'developer' | 'assistant';
    senderName: string;
    text: string;
    timestamp: string;
    attachments?: Array<{ type: 'audio' | 'image' | 'video' | 'file'; url: string; name?: string }>;
  }>;
}

export interface ClientRequestsResponse {
  success: boolean;
  requests?: ClientRequestItem[];
  geminiConfigured?: boolean;
  error?: string;
}

export async function fetchClientRequests(): Promise<ClientRequestsResponse> {
  try {
    const apiUrl = getPublicApiUrl();
    const token = getStoredSessionToken();

    const res = await fetch(`${apiUrl}/api/requests`, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        requests: data.requests || [],
        geminiConfigured: data.geminiConfigured,
      };
    }

    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.error || 'Erro ao carregar solicitações.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha de conexão.' };
  }
}

export async function createClientRequest(params: {
  text: string;
  title: string;
  category?: string;
  triage?: {
    title: string;
    summary: string;
    type: string;
    priority: string;
    contractScope: string;
    source: string;
    targetFiles: string[];
  };
}): Promise<{ success: boolean; request?: ClientRequestItem; error?: string }> {
  try {
    const apiUrl = getPublicApiUrl();
    const token = getStoredSessionToken();

    const res = await fetch(`${apiUrl}/api/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        action: 'create',
        ...params,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, request: data.request };
    }

    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.error || 'Falha ao registrar solicitação.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha de conexão.' };
  }
}

export async function approveClientPlan(requestId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const apiUrl = getPublicApiUrl();
    const token = getStoredSessionToken();

    const res = await fetch(`${apiUrl}/api/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        action: 'approve_plan',
        id: requestId,
      }),
    });

    if (res.ok) {
      return { success: true };
    }

    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.error || 'Falha ao aprovar plano.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha de conexão.' };
  }
}

export async function sendClientMessage(requestId: string, text: string): Promise<boolean> {
  try {
    const apiUrl = getPublicApiUrl();
    const token = getStoredSessionToken();

    const res = await fetch(`${apiUrl}/api/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        action: 'message',
        id: requestId,
        text,
        role: 'client',
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

