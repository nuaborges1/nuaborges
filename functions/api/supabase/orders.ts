import { getSupabaseClient, SupabaseEnv } from '../_supabaseClient';

export interface CommercialOrder {
  id: string;
  purchaseToken: string;
  packId: string;
  amount: number;
  status: 'pending' | 'paid' | 'approved' | 'cancelled' | 'refunded';
  customerEmail: string;
  customerName: string;
  paymentId?: string;
  providerPaymentId?: string;
  paymentMethod: string;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function saveOrderToSupabase(
  env: SupabaseEnv,
  order: CommercialOrder
): Promise<{ success: boolean; error?: string }> {
  const sb = getSupabaseClient(env);
  if (!sb) return { success: false, error: 'Supabase não configurado.' };

  try {
    const nowIso = new Date().toISOString();
    const payIdValue = order.paymentId || order.providerPaymentId || '';
    const baseRow = {
      id: order.id,
      purchase_token: order.purchaseToken,
      pack_id: order.packId,
      amount: Number(order.amount),
      status: order.status,
      customer_email: order.customerEmail || '',
      customer_name: order.customerName || '',
      payment_method: order.paymentMethod || 'pix',
      expires_at: order.expiresAt || nowIso,
      created_at: order.createdAt || nowIso,
      updated_at: order.updatedAt || nowIso,
    };
    let { error } = await sb.from('orders').upsert({ ...baseRow, provider_payment_id: payIdValue });
    if (error && (error.code === '42703' || error.code === 'PGRST204' || String(error.message || '').includes('provider_payment_id'))) {
      ({ error } = await sb.from('orders').upsert({ ...baseRow, stripe_payment_intent_id: payIdValue }));
    }

    if (error) {
      console.error('[SupabaseStore] Erro ao salvar order comercial:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao persistir order comercial.' };
  }
}

export async function getOrderFromSupabase(
  env: SupabaseEnv,
  idOrToken: string
): Promise<CommercialOrder | null> {
  const sb = getSupabaseClient(env);
  if (!sb) return null;

  try {
    const cleanStr = (idOrToken || '').trim();
    if (!cleanStr) return null;

    async function findByQuery(candidate: string) {
      // Defesa contra injeção de filtro PostgREST (.or com entrada do usuário).
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(candidate)) return null;
      let query = sb!.from('orders').select('*');
      if (candidate.startsWith('tok_') || candidate.startsWith('ptok_')) {
        query = query.eq('purchase_token', candidate);
      } else if (candidate.startsWith('ord_')) {
        query = query.eq('id', candidate);
      } else {
        query = query.or(`purchase_token.eq.${candidate},id.eq.${candidate}`);
      }
      const { data, error } = await query.maybeSingle();
      if (!error && data) return data;
      return null;
    }

    let data = await findByQuery(cleanStr);

    // Se não encontrou exato, testa permutações comuns causadas por ambiguidade de fontes (1 <-> l, 0 <-> o)
    if (!data && (cleanStr.includes('1') || cleanStr.includes('l') || cleanStr.includes('0') || cleanStr.includes('o'))) {
      const candidates: string[] = [];
      if (cleanStr.includes('1')) candidates.push(cleanStr.replace(/1/g, 'l'));
      if (cleanStr.includes('l')) candidates.push(cleanStr.replace(/l/g, '1'));
      if (cleanStr.includes('0')) candidates.push(cleanStr.replace(/0/g, 'o'));
      if (cleanStr.includes('o')) candidates.push(cleanStr.replace(/o/g, '0'));
      if (cleanStr.includes('1') && cleanStr.includes('o')) candidates.push(cleanStr.replace(/1/g, 'l').replace(/o/g, '0'));
      if (cleanStr.includes('l') && cleanStr.includes('0')) candidates.push(cleanStr.replace(/l/g, '1').replace(/0/g, 'o'));

      for (const cand of candidates) {
        data = await findByQuery(cand);
        if (data) break;
      }
    }

    if (!data) return null;

    return {
      id: data.id,
      purchaseToken: data.purchase_token,
      packId: data.pack_id,
      amount: Number(data.amount),
      status: data.status,
      customerEmail: data.customer_email,
      customerName: data.customer_name,
      paymentId: data.provider_payment_id ?? data.stripe_payment_intent_id,
      providerPaymentId: data.provider_payment_id ?? data.stripe_payment_intent_id,
      paymentMethod: data.payment_method,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch {
    return null;
  }
}

export async function updateOrderStatusInSupabase(
  env: SupabaseEnv,
  orderId: string,
  status: 'paid' | 'approved' | 'cancelled' | 'refunded',
  providerPaymentId?: string
): Promise<{ success: boolean; error?: string }> {
  const sb = getSupabaseClient(env);
  if (!sb) return { success: false, error: 'Supabase não configurado.' };

  try {
    const patch: any = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (providerPaymentId) {
      patch.provider_payment_id = providerPaymentId;
    }

    let { error } = await sb.from('orders').update(patch).eq('id', orderId);
    if (error && providerPaymentId && (error.code === '42703' || error.code === 'PGRST204' || String(error.message || '').includes('provider_payment_id'))) {
      delete patch.provider_payment_id;
      patch.stripe_payment_intent_id = providerPaymentId;
      ({ error } = await sb.from('orders').update(patch).eq('id', orderId));
    }
    if (error) {
      console.error('[SupabaseStore] Erro ao atualizar status de order:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao atualizar status de order.' };
  }
}

export async function updateOrderInSupabase(
  env: SupabaseEnv,
  orderId: string,
  patch: any
): Promise<{ success: boolean; error?: string }> {
  const sb = getSupabaseClient(env);
  if (!sb) return { success: false, error: 'Supabase não configurado.' };

  try {
    const updateObj: any = {
      updated_at: new Date().toISOString(),
    };
    if (patch.status) updateObj.status = patch.status === 'approved' ? 'paid' : patch.status;
    const payIdValue = patch.providerPaymentId || patch.payment_id || patch.paymentId;
    if (payIdValue) {
      updateObj.provider_payment_id = payIdValue;
    }
    if (patch.paymentMethod || patch.payment_method) {
      updateObj.payment_method = patch.paymentMethod || patch.payment_method;
    }
    // Nota: 'paid_at' não existe como coluna na tabela 'orders' do Supabase. Não injetar para evitar erro PGRST204.

    let { error } = await sb.from('orders').update(updateObj).eq('id', orderId);
    if (error && payIdValue && (error.code === '42703' || error.code === 'PGRST204' || String(error.message || '').includes('provider_payment_id'))) {
      delete updateObj.provider_payment_id;
      updateObj.stripe_payment_intent_id = payIdValue;
      ({ error } = await sb.from('orders').update(updateObj).eq('id', orderId));
    }
    if (error) {
      console.error('[SupabaseStore] Erro ao atualizar order:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao atualizar order.' };
  }
}

/**
 * Busca ESTRITA por token de compra (credencial de acesso).
 * Não aceita orderId, não faz permutações de caracteres e valida o formato antes de consultar.
 */
export async function getOrderByPurchaseToken(
  env: SupabaseEnv,
  token: string
): Promise<CommercialOrder | null> {
  const clean = (token || '').trim();
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(clean)) return null;
  const sb = getSupabaseClient(env);
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from('orders')
      .select('id')
      .eq('purchase_token', clean)
      .maybeSingle();
    if (error || !data?.id) return null;
    return await getOrderFromSupabase(env, data.id);
  } catch {
    return null;
  }
}
