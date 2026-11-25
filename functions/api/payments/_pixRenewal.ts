import { isExpiredPix } from '../_mercadopago';
import { getNuaIdAdapter, NuaIdEnv } from '../id/_nuaIdStore';

export function pixRenewalKey(orderId: string, paymentId: string) {
  return `nua_id:pix_renewal:${orderId}:${paymentId}`;
}

export async function isReplaceablePixCancellation(env: NuaIdEnv, orderId: string, paymentId: string, payment: any) {
  if (payment.payment_method_id !== 'pix') return false;
  if (isExpiredPix(payment.status, payment.status_detail, payment.date_of_expiration)) return true;
  if (payment.status !== 'cancelled' || payment.status_detail !== 'by_collector') return false;
  return Boolean(await getNuaIdAdapter(env)?.kvGet(pixRenewalKey(orderId, paymentId), true));
}
