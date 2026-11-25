import { getSupabaseClient, type SupabaseEnv } from '../_supabaseClient';
import { packVaultFiles } from '../me/_vault';

function isBlockingOrder(order: any, nowMs: number): boolean {
  if (!order || order.payment_method === 'simulated_local_pix') return false;
  if (order.status === 'paid' || order.status === 'approved') return true;
  if (order.status === 'pending') {
    const expiresMs = typeof order.expires_at === 'string' ? Date.parse(order.expires_at) : NaN;
    return Number.isFinite(expiresMs) && expiresMs > nowMs;
  }
  return false;
}

export async function guardPurchasedPackChanges(env: SupabaseEnv, currentItems: unknown, nextItems: unknown) {
  if (!Array.isArray(currentItems) || currentItems.length === 0) return null;

  const next = new Map((Array.isArray(nextItems) ? nextItems : []).filter(Boolean).map((item) => [item.id || item.slug, item]));
  const affectedRefs = new Set<string>();
  for (const item of currentItems.filter(Boolean)) {
    const updated = next.get(item.id || item.slug);
    if (updated && item.slug === updated.slug) {
      const paths = new Set(packVaultFiles(updated).map((file) => file.path));
      if (packVaultFiles(item).every((file) => paths.has(file.path))) continue;
    }
    const id = typeof item.id === 'string' ? item.id : '';
    for (const ref of [id, item.slug, id.replace(/^avulso-/, '')]) {
      if (typeof ref === 'string' && ref.trim()) affectedRefs.add(ref.trim());
    }
  }
  if (affectedRefs.size === 0) return null;

  const unavailable = () => Response.json({
    success: false,
    error: 'Não conseguimos verificar se há compras vinculadas. Tente salvar novamente em instantes.',
  }, { status: 503 });
  const sb = getSupabaseClient(env);
  if (!sb) return unavailable();

  try {
    const refs = [...affectedRefs];
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const [paidRes, pendingRes] = await Promise.all([
      sb.from('orders')
        .select('id, status, payment_method')
        .in('pack_id', refs)
        .in('status', ['paid', 'approved'])
        .limit(20),
      sb.from('orders')
        .select('id, status, expires_at, payment_method')
        .in('pack_id', refs)
        .eq('status', 'pending')
        .gte('expires_at', nowIso)
        .limit(20),
    ]);
    if (paidRes.error || pendingRes.error) return unavailable();
    const blocking = [...(paidRes.data || []), ...(pendingRes.data || [])].some((order) =>
      isBlockingOrder(order, nowMs)
    );
    if (blocking) {
      return Response.json({
        success: false,
        code: 'PACK_HAS_PURCHASES',
        error: 'Este pack tem pedidos pagos ou Pix em andamento. Você pode retirá-lo da vitrine mantendo o endereço e os arquivos do Cofre.',
      }, { status: 409 });
    }
    return null;
  } catch {
    return unavailable();
  }
}
