/**
 * Serviço Client-Side de Personalizados | Nua Borges
 * 
 * Integração com /api/personalizados/* e suporte offline resiliente.
 */

import {
  PersonalizadoOrder,
  PersonalizadosSettings,
  calculateOrderPrice,
  DEFAULT_PERSONALIZADOS_SETTINGS,
} from '@/lib/personalizadosCanonical';
import {
  getPersonalizadosSettings,
  savePersonalizadosSettings,
  savePersonalizadoOrder,
  getPersonalizadoOrderByToken,
  getPersonalizadoOrderById,
  listPersonalizadosOrders,
} from '@/lib/personalizadosStore';
import { getPublicApiUrl, getStoredSessionToken } from '@/lib/contentStore';
import { isLocalhost } from '@/lib/env';

export interface CreatePersonalizadoInput {
  clientName: string;
  clientContact: string;
  deliveryChannel: 'whatsapp' | 'telegram' | 'vault';
  photoCount: number;
  videoOptionId: string;
  mentionName: boolean;
  express24h: boolean;
  briefing: string;
}

export async function submitPersonalizadoOrder(
  input: CreatePersonalizadoInput,
  settings: PersonalizadosSettings = DEFAULT_PERSONALIZADOS_SETTINGS
): Promise<{ success: boolean; order?: PersonalizadoOrder; error?: string }> {
  const apiUrl = getPublicApiUrl();
  const endpoint = `${apiUrl}/api/personalizados/create`;

  const calculation = calculateOrderPrice(
    input.photoCount,
    input.videoOptionId,
    input.mentionName,
    input.express24h,
    settings
  );

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...input,
        videoDurationMinutes: calculation.selectedVideoOption?.durationMinutes || 0,
        totalPrice: calculation.total,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success && data.order) {
      savePersonalizadoOrder(data.order);
      return { success: true, order: data.order };
    }
    return { success: false, error: data.error || 'Não foi possível gerar o Pix do pedido. Tente novamente.' };
  } catch (err) {
    console.error('[PersonalizadosService] Falha ao criar pedido:', err);
    return { success: false, error: 'Servidor de pagamento inacessível. Tente novamente em instantes.' };
  }
}

export async function verifyPixPersonalizadoPayment(
  orderId: string
): Promise<{ success: boolean; paid: boolean; order?: PersonalizadoOrder; error?: string }> {
  const apiUrl = getPublicApiUrl();
  const endpoint = `${apiUrl}/api/personalizados/status`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      if (data.order) {
        savePersonalizadoOrder(data.order);
      }
      return data;
    }
    return { success: false, paid: false, error: data.error || 'Falha ao consultar pagamento.' };
  } catch {
    return { success: false, paid: false, error: 'Servidor inacessível.' };
  }
}

export async function fetchPersonalizadoOrderByToken(
  token: string
): Promise<{ success: boolean; order?: PersonalizadoOrder; error?: string }> {
  const apiUrl = getPublicApiUrl();
  const endpoint = `${apiUrl}/api/personalizados/status?token=${encodeURIComponent(token)}`;

  try {
    const res = await fetch(endpoint);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.order) {
        savePersonalizadoOrder(data.order);
        return { success: true, order: data.order };
      }
    }
  } catch {}

  const local = getPersonalizadoOrderByToken(token);
  if (local) {
    return { success: true, order: local };
  }

  return { success: false, error: 'Pedido não encontrado.' };
}

export async function fetchPersonalizadosAdmin(): Promise<{
  success: boolean;
  settings: PersonalizadosSettings;
  orders: PersonalizadoOrder[];
}> {
  const apiUrl = getPublicApiUrl();
  const token = getStoredSessionToken();
  const endpoint = `${apiUrl}/api/personalizados/admin`;

  try {
    const res = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return data;
      }
    }
  } catch {}

  return {
    success: true,
    settings: getPersonalizadosSettings(),
    orders: listPersonalizadosOrders(),
  };
}

export async function updatePersonalizadoOrderAdmin(
  orderId: string,
  patch: Partial<PersonalizadoOrder>
): Promise<{ success: boolean; order?: PersonalizadoOrder; error?: string }> {
  const apiUrl = getPublicApiUrl();
  const token = getStoredSessionToken();
  const endpoint = `${apiUrl}/api/personalizados/admin`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ action: 'update_order', orderId, patch }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.order) {
        savePersonalizadoOrder(data.order);
        return { success: true, order: data.order };
      }
      return { success: false, error: data?.error || 'Ação rejeitada pelo servidor.' };
    } else {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.error || `Erro ${res.status}: Falha ao atualizar pedido no servidor.` };
    }
  } catch (err: any) {
    if (!isLocalhost()) {
      return { success: false, error: 'Servidor inacessível. Verifique sua conexão e tente novamente.' };
    }
  }

  if (isLocalhost()) {
    const existing = getPersonalizadoOrderById(orderId);
    if (existing) {
      const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
      savePersonalizadoOrder(updated);
      return { success: true, order: updated };
    }
    return { success: false, error: 'Pedido não encontrado no armazenamento local.' };
  }

  return { success: false, error: 'Falha ao atualizar pedido no banco de dados.' };
}

export async function savePersonalizadosSettingsAdmin(
  settings: PersonalizadosSettings
): Promise<{ success: boolean; error?: string }> {
  const apiUrl = getPublicApiUrl();
  const token = getStoredSessionToken();
  const endpoint = `${apiUrl}/api/personalizados/admin`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ action: 'save_settings', settings }),
    });
    if (res.ok) {
      savePersonalizadosSettings(settings);
      return { success: true };
    } else {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.error || `Erro ${res.status}: Falha ao salvar configurações no servidor.` };
    }
  } catch (err: any) {
    if (!isLocalhost()) {
      return { success: false, error: 'Servidor inacessível. Verifique sua conexão e tente novamente.' };
    }
  }

  if (isLocalhost()) {
    savePersonalizadosSettings(settings);
    return { success: true };
  }

  return { success: false, error: 'Falha ao salvar configurações no banco de dados.' };
}
