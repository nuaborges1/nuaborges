/**
 * Armazenamento persistente da Feature Flag de Identidade Verbal Experimental.
 *
 * - Persistido na tabela `public.site_content` do Supabase sob a chave isolada
 *   `system:verbal_identity_experiment`.
 * - Totalmente desacoplado de `published_content` e `private_admin_content`:
 *   publicações do CMS da Nua nunca afetam a flag, e alternar a flag nunca cria
 *   rascunhos nem altera conteúdos do CMS.
 * - Padrão seguro: `original` (`enabled: false`) apenas quando o registro ainda
 *   não existe ou está inválido. Deploys posteriores nunca sobrescrevem uma
 *   configuração já persistida.
 */

import { getSystemKVFromSupabase, setSystemKVInSupabase } from './supabase/content';
import type { SupabaseEnv } from './_supabaseClient';
import {
  DEFAULT_COPY_MODE,
  normalizeVerbalIdentityConfig,
  VERBAL_IDENTITY_STORAGE_KEY,
} from '../../lib/copy/resolver';
import type { CopyMode, VerbalIdentityConfig } from '../../lib/copy/types';

export { VERBAL_IDENTITY_STORAGE_KEY };

const EDGE_CACHE_TTL_MS = 5_000;

let isolateCache: {
  config: VerbalIdentityConfig;
  expiresAt: number;
} | null = null;

export function invalidateVerbalIdentityCache(): void {
  isolateCache = null;
}

export function getDefaultVerbalIdentityConfig(): VerbalIdentityConfig {
  return {
    mode: DEFAULT_COPY_MODE,
    enabled: false,
    updatedAt: null,
    updatedBy: null,
    version: 0,
  };
}

/**
 * Lê a configuração atual da identidade verbal do Supabase.
 * - `bypassCache: true`: sempre consulta o banco (usado em `/api/admin/verbal-identity`
 *   e `/api/site/copy-mode` para consistência imediata).
 * - `bypassCache: false`: usa micro-cache de 5s no isolate do Worker (usado no
 *   middleware HTML para não adicionar latência a cada requisição estática).
 */
export async function readVerbalIdentityConfig(
  env: SupabaseEnv,
  options?: { bypassCache?: boolean }
): Promise<VerbalIdentityConfig> {
  const bypassCache = options?.bypassCache === true;

  if (!bypassCache && isolateCache && isolateCache.expiresAt > Date.now()) {
    return isolateCache.config;
  }

  try {
    const raw = await getSystemKVFromSupabase(env, VERBAL_IDENTITY_STORAGE_KEY);
    const config = normalizeVerbalIdentityConfig(raw);
    isolateCache = {
      config,
      expiresAt: Date.now() + EDGE_CACHE_TTL_MS,
    };
    return config;
  } catch {
    return isolateCache?.config ?? getDefaultVerbalIdentityConfig();
  }
}

export async function saveVerbalIdentityConfig(
  env: SupabaseEnv,
  mode: CopyMode,
  updatedBy: string = 'phdev'
): Promise<{ success: boolean; config: VerbalIdentityConfig; error?: string }> {
  const current = await readVerbalIdentityConfig(env, { bypassCache: true });
  const nowIso = new Date().toISOString();
  const nextConfig: VerbalIdentityConfig = {
    mode,
    enabled: mode === 'nua_autoral_experimental',
    updatedAt: nowIso,
    updatedBy,
    version: (current.version || 0) + 1,
  };

  const saved = await setSystemKVInSupabase(
    env,
    VERBAL_IDENTITY_STORAGE_KEY,
    nextConfig,
    updatedBy
  );

  if (!saved) {
    return {
      success: false,
      config: current,
      error: 'Não foi possível persistir a configuração no Supabase.',
    };
  }

  isolateCache = {
    config: nextConfig,
    expiresAt: Date.now() + EDGE_CACHE_TTL_MS,
  };

  return { success: true, config: nextConfig };
}
