import { getSupabaseClient, SupabaseEnv } from '../_supabaseClient';
import {
  PersonalizadoOrder,
  PersonalizadosSettings,
  DEFAULT_PERSONALIZADOS_SETTINGS,
} from '../../../lib/personalizadosCanonical';
import { getSiteContentFromSupabase, saveSiteContentToSupabase } from './content';

export async function getPersonalizadosSettingsFromSupabase(
  env: SupabaseEnv
): Promise<PersonalizadosSettings> {
  const sb = getSupabaseClient(env);
  if (!sb) return DEFAULT_PERSONALIZADOS_SETTINGS;

  try {
    const { data, error } = await sb
      .from('personalizados_settings')
      .select('settings')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data?.settings) {
      const content = await getSiteContentFromSupabase(env, 'published_content');
      if (content?.personalizados) {
        return { ...DEFAULT_PERSONALIZADOS_SETTINGS, ...content.personalizados };
      }
      return DEFAULT_PERSONALIZADOS_SETTINGS;
    }

    return { ...DEFAULT_PERSONALIZADOS_SETTINGS, ...data.settings };
  } catch {
    return DEFAULT_PERSONALIZADOS_SETTINGS;
  }
}

export async function savePersonalizadosSettingsToSupabase(
  env: SupabaseEnv,
  settings: PersonalizadosSettings
): Promise<{ success: boolean; error?: string }> {
  const sb = getSupabaseClient(env);
  if (!sb) return { success: false, error: 'Supabase não configurado.' };

  try {
    const nowIso = new Date().toISOString();

    const mergedSettings: PersonalizadosSettings = {
      ...DEFAULT_PERSONALIZADOS_SETTINGS,
      ...settings,
      deliveryMethods: {
        ...DEFAULT_PERSONALIZADOS_SETTINGS.deliveryMethods,
        ...(settings.deliveryMethods || {}),
      },
      videoOptions:
        Array.isArray(settings.videoOptions) && settings.videoOptions.length > 0
          ? settings.videoOptions
          : DEFAULT_PERSONALIZADOS_SETTINGS.videoOptions,
    };

    const { error } = await sb.from('personalizados_settings').upsert({
      id: 1,
      settings: mergedSettings,
      updated_at: nowIso,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    for (const key of ['published_content', 'private_admin_content'] as const) {
      const current = await getSiteContentFromSupabase(env, key);
      if (current) {
        current.personalizados = mergedSettings;
        await saveSiteContentToSupabase(env, key, current, 'Painel de Personalizados');
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao persistir personalizados_settings.' };
  }
}

export function orderToPersonalizadoRow(o: PersonalizadoOrder) {
  return {
    id: o.id,
    public_token: o.publicToken,
    client_name: o.clientName,
    client_contact: o.clientContact,
    delivery_channel: o.deliveryChannel,
    photo_count: o.photoCount,
    video_option_id: o.videoOptionId || 'vid_none',
    video_duration_minutes: o.videoDurationMinutes || 0,
    mention_name: Boolean(o.mentionName),
    express_24h: Boolean(o.express24h),
    briefing: o.briefing || '',
    total_price: Number(o.totalPrice),
    status: o.status,
    payment: o.payment,
    vault_files: Array.isArray(o.vaultFiles) ? o.vaultFiles : [],
    admin_notes: o.adminNotes || '',
    created_at: o.createdAt || new Date().toISOString(),
    updated_at: o.updatedAt || new Date().toISOString(),
  };
}

export function personalizadoRowToOrder(r: any): PersonalizadoOrder {
  return {
    id: r.id,
    publicToken: r.public_token,
    clientName: r.client_name,
    clientContact: r.client_contact,
    deliveryChannel: r.delivery_channel,
    photoCount: r.photo_count,
    videoOptionId: r.video_option_id,
    videoDurationMinutes: r.video_duration_minutes,
    mentionName: r.mention_name,
    express24h: r.express_24h,
    briefing: r.briefing,
    totalPrice: Number(r.total_price),
    status: r.status,
    payment: r.payment || { status: 'pending', method: 'pix', amount: Number(r.total_price) },
    vaultFiles: Array.isArray(r.vault_files) ? r.vault_files : [],
    adminNotes: r.admin_notes || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listPersonalizadosOrdersFromSupabase(
  env: SupabaseEnv,
  options?: { limit?: number; strict?: boolean }
): Promise<PersonalizadoOrder[]> {
  const sb = getSupabaseClient(env);
  if (!sb) {
    if (options?.strict) throw new Error('Supabase não configurado ao listar personalizados.');
    return [];
  }

  try {
    const pageSize = 500;
    const result: PersonalizadoOrder[] = [];
    const maxRows = options?.limit ? Math.max(1, options.limit) : Number.POSITIVE_INFINITY;
    for (let offset = 0; offset < maxRows; offset += pageSize) {
      const take = Math.min(pageSize, maxRows - offset);
      const { data, error } = await sb
        .from('personalizados_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + take - 1);
      if (error) throw new Error(`Erro ao listar personalizados_orders: ${error.message}`);
      const page = data || [];
      result.push(...page.map(personalizadoRowToOrder));
      if (page.length < take) break;
    }
    return result;
  } catch (err) {
    console.error('[SupabaseStore] Falha ao listar personalizados_orders:', err);
    if (options?.strict) throw err;
    return [];
  }
}

const SAFE_PERSONALIZADO_KEY_RE = /^[A-Za-z0-9_-]{4,128}$/;

export async function getPersonalizadoOrderFromSupabase(
  env: SupabaseEnv,
  idOrToken: string
): Promise<PersonalizadoOrder | null> {
  const sb = getSupabaseClient(env);
  const cleanKey = String(idOrToken || '').trim();
  if (!sb || !cleanKey || !SAFE_PERSONALIZADO_KEY_RE.test(cleanKey)) return null;

  try {
    const firstCol = cleanKey.startsWith('tok_') || cleanKey.startsWith('pers_tok_') ? 'public_token' : 'id';
    const secondCol = firstCol === 'public_token' ? 'id' : 'public_token';

    const firstRes = await sb
      .from('personalizados_orders')
      .select('*')
      .eq(firstCol, cleanKey)
      .maybeSingle();
    if (!firstRes.error && firstRes.data) {
      return personalizadoRowToOrder(firstRes.data);
    }

    const secondRes = await sb
      .from('personalizados_orders')
      .select('*')
      .eq(secondCol, cleanKey)
      .maybeSingle();
    if (secondRes.error || !secondRes.data) return null;
    return personalizadoRowToOrder(secondRes.data);
  } catch {
    return null;
  }
}

export async function savePersonalizadoOrderToSupabase(
  env: SupabaseEnv,
  order: PersonalizadoOrder
): Promise<{ success: boolean; error?: string }> {
  const sb = getSupabaseClient(env);
  if (!sb) return { success: false, error: 'Supabase não configurado.' };

  try {
    const row = orderToPersonalizadoRow(order);
    const { error } = await sb.from('personalizados_orders').upsert(row);
    if (error) {
      console.error('[SupabaseStore] Erro ao salvar personalizado order:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao persistir personalizado order.' };
  }
}
