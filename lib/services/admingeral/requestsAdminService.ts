/**
 * Serviço Administrativo de Solicitações (Kanban) — Central phdev (Admin Geral)
 * Responsável pelo fluxo completo de triagem, planejamento técnico e status dos chamados
 */

import { ClientRequestItem } from '../nua/requestsService';

export interface AdminRequestsResponse {
  requests: ClientRequestItem[];
  geminiConfigured: boolean;
}

export async function fetchAllAdminRequests(
  fetchFromApi: (path: string, options?: RequestInit) => Promise<Response>
): Promise<AdminRequestsResponse> {
  try {
    const res = await fetchFromApi('/api/requests');
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    return {
      requests: Array.isArray(data.requests) ? data.requests : [],
      geminiConfigured: !!data.geminiConfigured,
    };
  } catch (err: any) {
    console.warn('[requestsAdminService] Erro ao carregar solicitações:', err);
    return { requests: [], geminiConfigured: false };
  }
}

export async function updateAdminRequest(
  fetchFromApi: (path: string, options?: RequestInit) => Promise<Response>,
  payload: {
    action: 'update' | 'delete' | 'append_message';
    id: string;
    status?: string;
    technicalPlan?: string;
    estimatedHours?: number;
    developerNotes?: string;
    role?: string;
    senderName?: string;
    text?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetchFromApi('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return { success: true };
    }

    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.error || 'Falha na operação.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha de conexão.' };
  }
}

export async function deleteAdminRequest(
  fetchFromApi: (path: string, options?: RequestInit) => Promise<Response>,
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  return updateAdminRequest(fetchFromApi, {
    action: 'delete',
    id: requestId,
  });
}
