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
  stripePaymentIntentId?: string;
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
    const { error } = await sb.from('orders').upsert({
      id: order.id,
      purchase_token: order.purchaseToken,
      pack_id: order.packId,
      amount: Number(order.amount),
      status: order.status,
      customer_email: order.customerEmail || '',
      customer_name: order.customerName || '',
      stripe_payment_intent_id: order.paymentId || order.stripePaymentIntentId || '',
      payment_method: order.paymentMethod || 'pix',
      expires_at: order.expiresAt || nowIso,
      created_at: order.createdAt || nowIso,
      updated_at: order.updatedAt || nowIso,
    });

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
      paymentId: data.stripe_payment_intent_id,
      stripePaymentIntentId: data.stripe_payment_intent_id,
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
  stripePaymentIntentId?: string
): Promise<{ success: boolean; error?: string }> {
  const sb = getSupabaseClient(env);
  if (!sb) return { success: false, error: 'Supabase não configurado.' };

  try {
    const patch: any = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (stripePaymentIntentId) {
      patch.stripe_payment_intent_id = stripePaymentIntentId;
    }

    const { error } = await sb.from('orders').update(patch).eq('id', orderId);
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
    if (patch.stripePaymentIntentId || patch.payment_id || patch.paymentId) {
      updateObj.stripe_payment_intent_id = patch.stripePaymentIntentId || patch.payment_id || patch.paymentId;
    }
    if (patch.paymentMethod || patch.payment_method) {
      updateObj.payment_method = patch.paymentMethod || patch.payment_method;
    }
    // Nota: 'paid_at' não existe como coluna na tabela 'orders' do Supabase. Não injetar para evitar erro PGRST204.

    const { error } = await sb.from('orders').update(updateObj).eq('id', orderId);
    if (error) {
      console.error('[SupabaseStore] Erro ao atualizar order:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao atualizar order.' };
  }
}
