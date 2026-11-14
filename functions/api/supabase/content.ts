import { getSupabaseClient, SupabaseEnv } from '../_supabaseClient';

export async function getSiteContentFromSupabase(
  env: SupabaseEnv,
  key: 'published_content' | 'private_admin_content'
): Promise<any | null> {
  const sb = getSupabaseClient(env);
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('site_content')
      .select('content, version, updated_at')
      .eq('key', key)
      .maybeSingle();

    if (error) {
      console.error(`[SupabaseStore] Erro ao ler site_content (${key}):`, error);
      return null;
    }
    return data?.content || null;
  } catch (err) {
    console.error(`[SupabaseStore] Falha de conexão ao ler site_content (${key}):`, err);
    return null;
  }
}

export async function saveSiteContentToSupabase(
  env: SupabaseEnv,
  key: 'published_content' | 'private_admin_content',
  content: any,
  updatedBy: string = 'Painel Oficial do Cliente'
): Promise<{ success: boolean; version?: number; error?: string }> {
  const sb = getSupabaseClient(env);
  if (!sb) return { success: false, error: 'Supabase não configurado.' };

  try {
    const nowIso = new Date().toISOString();

    const { data: current } = await sb
      .from('site_content')
      .select('version')
      .eq('key', key)
      .maybeSingle();

    const nextVersion = (current?.version || 0) + 1;

    const { error: upsertErr } = await sb.from('site_content').upsert({
      key,
      content,
      version: nextVersion,
      updated_at: nowIso,
      updated_by: updatedBy,
    });

    if (upsertErr) {
      return { success: false, error: upsertErr.message };
    }

    if (key === 'published_content') {
      try {
        await sb.from('content_backups').insert({
          content_key: key,
          snapshot: content,
          created_at: nowIso,
        });
      } catch (bErr: any) {
        console.warn('[SupabaseStore] Falha ao registrar content_backups:', bErr);
      }
    }

    return { success: true, version: nextVersion };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro inesperado ao salvar site_content.' };
  }
}

export async function getSystemKVFromSupabase(
  env: SupabaseEnv,
  key: string
): Promise<any | null> {
  const sb = getSupabaseClient(env);
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('site_content')
      .select('content')
      .eq('key', key)
      .maybeSingle();

    if (error || !data) return null;
    return data.content;
  } catch {
    return null;
  }
}

export async function setSystemKVInSupabase(
  env: SupabaseEnv,
  key: string,
  value: any,
  updatedBy: string = 'System'
): Promise<boolean> {
  const sb = getSupabaseClient(env);
  if (!sb) return false;

  try {
    const nowIso = new Date().toISOString();
    const { error } = await sb.from('site_content').upsert({
      key,
      content: value,
      updated_at: nowIso,
      updated_by: updatedBy,
      version: 1,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function deleteSystemKVFromSupabase(
  env: SupabaseEnv,
  key: string
): Promise<boolean> {
  const sb = getSupabaseClient(env);
  if (!sb) return false;

  try {
    const { error } = await sb.from('site_content').delete().eq('key', key);
    return !error;
  } catch {
    return false;
  }
}
