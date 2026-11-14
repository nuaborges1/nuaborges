/**
 * Store Local e Persistência Resiliente de Personalizados | Nua Borges
 */

import {
  DEFAULT_PERSONALIZADOS_SETTINGS,
  PersonalizadoOrder,
  PersonalizadosSettings,
  PERSONALIZADOS_STORAGE_KEY,
} from './personalizadosCanonical';

export interface PersonalizadosState {
  settings: PersonalizadosSettings;
  orders: Record<string, PersonalizadoOrder>;
}

function getDefaultState(): PersonalizadosState {
  return {
    settings: { ...DEFAULT_PERSONALIZADOS_SETTINGS },
    orders: {},
  };
}

export function getPersonalizadosState(): PersonalizadosState {
  if (typeof window === 'undefined') {
    return getDefaultState();
  }

  try {
    const raw = localStorage.getItem(PERSONALIZADOS_STORAGE_KEY);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw);
    return {
      settings: parsed.settings ? { ...DEFAULT_PERSONALIZADOS_SETTINGS, ...parsed.settings } : DEFAULT_PERSONALIZADOS_SETTINGS,
      orders: parsed.orders || {},
    };
  } catch {
    return getDefaultState();
  }
}

export function savePersonalizadosState(state: PersonalizadosState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PERSONALIZADOS_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function getPersonalizadosSettings(): PersonalizadosSettings {
  return getPersonalizadosState().settings;
}

export function savePersonalizadosSettings(settings: PersonalizadosSettings): void {
  const state = getPersonalizadosState();
  state.settings = settings;
  savePersonalizadosState(state);
}

export function listPersonalizadosOrders(): PersonalizadoOrder[] {
  const state = getPersonalizadosState();
  return Object.values(state.orders).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getPersonalizadoOrderByToken(publicToken: string): PersonalizadoOrder | null {
  const state = getPersonalizadosState();
  return Object.values(state.orders).find((o) => o.publicToken === publicToken) || null;
}

export function getPersonalizadoOrderById(id: string): PersonalizadoOrder | null {
  const state = getPersonalizadosState();
  return state.orders[id] || null;
}

export function savePersonalizadoOrder(order: PersonalizadoOrder): void {
  const state = getPersonalizadosState();
  state.orders[order.id] = order;
  savePersonalizadosState(state);
}
