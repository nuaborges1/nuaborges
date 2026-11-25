/**
 * Kill-Switch e Modo Manutenção Centralizados (`system:control:flags`).
 *
 * Permite ao superadmin pausar módulos sensíveis (checkout, chamadas VIP,
 * personalizados, login NUA ID) ou ativar modo manutenção via `/api/control/system`
 * sem precisar fazer novo deploy.
 */

import { getSystemKVFromSupabase, setSystemKVInSupabase } from '../_supabaseStore';
import type { CentralEnv, KillSwitchFlags } from './types';

export const SYSTEM_FLAGS_KV_KEY = 'system:control:flags';
const CACHE_TTL_MS = 15_000;

export const DEFAULT_KILL_SWITCH_FLAGS: KillSwitchFlags = {
  maintenanceMode: false,
  maintenanceMessage: 'Plataforma em manutenção rápida. Voltamos em instantes.',
  disabledModules: [],
  updatedAt: null,
};

let cachedFlags: { value: KillSwitchFlags; expiresAt: number } | null = null;

export function invalidateKillSwitchCache(): void {
  cachedFlags = null;
}

export async function getKillSwitchFlags(env: CentralEnv): Promise<KillSwitchFlags> {
  if ((env as any)?.__SYSTEM_FLAGS_OVERRIDE__) {
    return {
      ...DEFAULT_KILL_SWITCH_FLAGS,
      ...(env as any).__SYSTEM_FLAGS_OVERRIDE__,
    };
  }

  const now = Date.now();
  if (cachedFlags && now < cachedFlags.expiresAt) {
    return cachedFlags.value;
  }

  try {
    const raw = (await getSystemKVFromSupabase(env as any, SYSTEM_FLAGS_KV_KEY)) as Partial<KillSwitchFlags> | null;
    const normalized: KillSwitchFlags = {
      maintenanceMode: Boolean(raw?.maintenanceMode),
      maintenanceMessage:
        typeof raw?.maintenanceMessage === 'string' && raw.maintenanceMessage.trim()
          ? raw.maintenanceMessage.trim().slice(0, 240)
          : DEFAULT_KILL_SWITCH_FLAGS.maintenanceMessage,
      disabledModules: Array.isArray(raw?.disabledModules)
        ? raw.disabledModules.map((m) => String(m).trim().toLowerCase()).filter(Boolean)
        : [],
      updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : null,
    };
    cachedFlags = { value: normalized, expiresAt: now + CACHE_TTL_MS };
    return normalized;
  } catch {
    return DEFAULT_KILL_SWITCH_FLAGS;
  }
}

export async function saveKillSwitchFlags(
  env: CentralEnv,
  patch: Partial<KillSwitchFlags>
): Promise<KillSwitchFlags> {
  const current = await getKillSwitchFlags(env);
  const next: KillSwitchFlags = {
    maintenanceMode:
      typeof patch.maintenanceMode === 'boolean' ? patch.maintenanceMode : current.maintenanceMode,
    maintenanceMessage:
      typeof patch.maintenanceMessage === 'string' && patch.maintenanceMessage.trim()
        ? patch.maintenanceMessage.trim().slice(0, 240)
        : current.maintenanceMessage,
    disabledModules: Array.isArray(patch.disabledModules)
      ? Array.from(new Set(patch.disabledModules.map((m) => String(m).trim().toLowerCase()).filter(Boolean)))
      : current.disabledModules,
    updatedAt: new Date().toISOString(),
  };

  await setSystemKVInSupabase(env as any, SYSTEM_FLAGS_KV_KEY, next);
  cachedFlags = { value: next, expiresAt: Date.now() + CACHE_TTL_MS };
  return next;
}
