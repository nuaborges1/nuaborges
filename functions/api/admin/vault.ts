/**
 * Cloudflare Pages Function: /api/admin/vault
 *
 * Cofre de Credenciais Criptografado — Nua Borges Platform
 * 
 * Regras estritas de segurança:
 * - Apenas administradores autenticados têm acesso (verificação via token/cookie de sessão).
 * - Os dados sensíveis (senhas, dados confidenciais) trafegam e são persistidos estritamente
 *   em formato criptografado (AES-GCM 256 bits).
 * - NUNCA expõe senhas em texto puro ou nos logs do Cloudflare.
 */

import { verifySessionToken, getSessionCookie } from '../_authHelper';
import { getSupabaseClient, isSupabaseConfigured } from '../_supabaseClient';

interface Env {
  ADMIN_PASSWORD?: string;
  ADMIN_API_SECRET?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  KV_STORE?: any;
  [key: string]: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export interface StoredVaultCredential {
  id: string;
  service: string;
  category: string;
  title: string;
  username: string;
  accessUrl?: string;
  encryptedPassword: {
    ciphertext: string;
    iv: string;
    salt: string;
  };
  encryptedNotes?: {
    ciphertext: string;
    iv: string;
    salt: string;
  };
  createdAt: string;
  updatedAt: string;
}

const VAULT_KEY = 'vault_credentials';

async function checkAdminAuth(request: Request, env: Env): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  const sessionCookie = getSessionCookie(request);
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : sessionCookie;
  const secret = env.ADMIN_API_SECRET || env.ADMIN_PASSWORD;

  if (!secret) {
    // Se não há secret configurado em ambiente dev/preview, aceita token presente
    return !!token;
  }

  return token ? await verifySessionToken(token, secret) : false;
}

async function loadCredentials(env: Env): Promise<StoredVaultCredential[]> {
  // 1. Supabase se configurado
  if (isSupabaseConfigured(env)) {
    try {
      const sb = getSupabaseClient(env);
      if (sb) {
        const { data, error } = await sb
          .from('site_content')
          .select('content')
          .eq('key', VAULT_KEY)
          .single();

        if (!error && data?.content && Array.isArray(data.content)) {
          return data.content as StoredVaultCredential[];
        }
      }
    } catch {
      // Falha graciosa para tentar KV
    }
  }

  // 2. KV Store se disponível
  if (env.KV_STORE) {
    try {
      const kvData = await env.KV_STORE.get(VAULT_KEY, { type: 'json' });
      if (Array.isArray(kvData)) {
        return kvData;
      }
    } catch {
      // Noop
    }
  }

  return [];
}

async function saveCredentials(env: Env, list: StoredVaultCredential[]): Promise<boolean> {
  let saved = false;

  if (isSupabaseConfigured(env)) {
    try {
      const sb = getSupabaseClient(env);
      if (sb) {
        const { error } = await sb.from('site_content').upsert(
          {
            key: VAULT_KEY,
            content: list,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        );
        if (!error) saved = true;
      }
    } catch (err) {
      console.warn('[Vault] Erro ao salvar no Supabase:', err);
    }
  }

  if (env.KV_STORE) {
    try {
      await env.KV_STORE.put(VAULT_KEY, JSON.stringify(list));
      saved = true;
    } catch (err) {
      console.warn('[Vault] Erro ao salvar no KV:', err);
    }
  }

  return saved;
}

// GET /api/admin/vault — Lista todas as credenciais criptografadas
export const onRequestGet = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  const isAuth = await checkAdminAuth(request, env);
  if (!isAuth) {
    return new Response(
      JSON.stringify({ success: false, error: 'Acesso não autorizado ao cofre.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const credentials = await loadCredentials(env);
  return new Response(
    JSON.stringify({ success: true, credentials }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

// POST /api/admin/vault — Salva ou atualiza uma credencial criptografada
export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  const isAuth = await checkAdminAuth(request, env);
  if (!isAuth) {
    return new Response(
      JSON.stringify({ success: false, error: 'Acesso não autorizado ao cofre.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = (await request.json()) as StoredVaultCredential;
    if (!body || !body.id || !body.service || !body.title || !body.encryptedPassword) {
      return new Response(
        JSON.stringify({ success: false, error: 'Dados da credencial incompletos ou inválidos.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const currentList = await loadCredentials(env);
    const existingIndex = currentList.findIndex((c) => c.id === body.id);

    const now = new Date().toISOString();
    const updatedRecord: StoredVaultCredential = {
      ...body,
      updatedAt: now,
      createdAt: existingIndex >= 0 ? currentList[existingIndex].createdAt : now,
    };

    let nextList: StoredVaultCredential[];
    if (existingIndex >= 0) {
      nextList = [...currentList];
      nextList[existingIndex] = updatedRecord;
    } else {
      nextList = [updatedRecord, ...currentList];
    }

    await saveCredentials(env, nextList);

    return new Response(
      JSON.stringify({ success: true, credential: updatedRecord }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Falha ao processar credencial.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// DELETE /api/admin/vault — Remove uma credencial por ID
export const onRequestDelete = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  const isAuth = await checkAdminAuth(request, env);
  if (!isAuth) {
    return new Response(
      JSON.stringify({ success: false, error: 'Acesso não autorizado ao cofre.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'ID da credencial é obrigatório.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const currentList = await loadCredentials(env);
    const nextList = currentList.filter((c) => c.id !== id);

    await saveCredentials(env, nextList);

    return new Response(
      JSON.stringify({ success: true, deletedId: id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Falha ao excluir credencial.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
