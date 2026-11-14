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
    let query = sb.from('orders').select('*');
    if (idOrToken.startsWith('tok_')) {
      query = query.eq('purchase_token', idOrToken);
    } else {
      query = query.eq('id', idOrToken);
    }

    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;

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
    if (patch.stripePaymentIntentId) updateObj.stripe_payment_intent_id = patch.stripePaymentIntentId;
    if (patch.paymentMethod) updateObj.payment_method = patch.paymentMethod;

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
