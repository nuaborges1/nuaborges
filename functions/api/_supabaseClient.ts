/**
 * Supabase Client Helper — Cloudflare Pages Functions
 *
 * Cria conexão sob demanda para persistência em PostgreSQL.
 * Funciona de forma transparente no Edge (Cloudflare Pages Functions).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  [key: string]: any;
}

let cachedClient: SupabaseClient | null = null;
let lastUrl: string | undefined;
let lastKey: string | undefined;

export function getSupabaseClient(env: SupabaseEnv): SupabaseClient | null {
  const url = env.SUPABASE_URL || (typeof process !== 'undefined' ? process.env?.SUPABASE_URL : undefined);
  const key =
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_SECRET_KEY ||
    (typeof process !== 'undefined' ? process.env?.SUPABASE_SERVICE_ROLE_KEY || process.env?.SUPABASE_SECRET_KEY : undefined);

  if (!url || !key) {
    if (env.SUPABASE_ANON_KEY || (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY)) {
      console.warn('[SupabaseClient] Bloqueado: Operações de backend exigem SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_SECRET_KEY (fallback anon rejeitado por segurança).');
    }
    return null;
  }

  if (cachedClient && lastUrl === url && lastKey === key) {
    return cachedClient;
  }

  cachedClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  lastUrl = url;
  lastKey = key;

  return cachedClient;
}

export function isSupabaseConfigured(env: SupabaseEnv): boolean {
  return Boolean(
    (env.SUPABASE_URL || (typeof process !== 'undefined' && process.env?.SUPABASE_URL)) &&
    (env.SUPABASE_SERVICE_ROLE_KEY ||
      env.SUPABASE_SECRET_KEY ||
      (typeof process !== 'undefined' && (process.env?.SUPABASE_SERVICE_ROLE_KEY || process.env?.SUPABASE_SECRET_KEY)))
  );
}
