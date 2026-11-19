/**
 * Cloudflare Pages Function: POST /api/me/bind-order
 *
 * Vincula à sessão NUA ID autenticada um pedido recém-criado no checkout
 * (ex.: Personalizado ou Chamada VIP criado antes de o cliente validar o OTP inline).
 *
 * Segurança:
 * - Exige sessão autenticada do cliente (`requireCustomer`).
 * - Exige prova de posse via `token` (`purchaseToken` ou `publicToken`) que corresponda ao pedido.
 * - Proteção contra roubo/dupla titularidade (retorna 409 se já vinculado a outra conta).
 * - Direitos de acesso só são liberados se o pedido já estiver financeiramente pago no servidor.
 */

import {
  getAppointmentByIdFromSupabase,
  getOrderFromSupabase,
  getPersonalizadoOrderFromSupabase,
} from '../_supabaseStore';
import { hashClientIp, timingSafeEqualStr } from '../id/_crypto';
import { getClientIp, getIdSecret, requireCustomer } from '../id/_customerGuard';
import {
  claimOrderForProfile,
  getOrderClaim,
  grantEntitlement,
  NuaIdEnv,
  recordCustomerAuditEvent,
} from '../id/_nuaIdStore';
import { normalizeFinancialStatus } from './_customerData';

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

const PRIVATE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
};

export const onRequestPost = async (context: PagesContext<NuaIdEnv>) => {
  const { request, env } = context;
  const auth = await requireCustomer(request, env);
  if (!auth.ok) return auth.response;

  const body: any = await request.json().catch(() => ({}));
  const orderId = String(body?.orderId || '').trim();
  const token = String(body?.token || '').trim();

  if (!orderId || !token || token.length < 8) {
    return new Response(
      JSON.stringify({ success: false, error: 'Informe orderId e token válidos para vincular o pedido.' }),
      { status: 400, headers: PRIVATE_HEADERS }
    );
  }

  let kind: 'pack' | 'vip' | 'custom' = 'pack';
  let expectedToken = '';
  let isPaid = false;
  let resourceId = orderId;
  let title = orderId;
  let expiresAt: string | null = null;

  if (orderId.startsWith('book_') || orderId.startsWith('apt_')) {
    kind = 'vip';
    const booking = await getAppointmentByIdFromSupabase(env, orderId);
    if (!booking) {
      return new Response(
        JSON.stringify({ success: false, error: 'Reserva não encontrada.' }),
        { status: 404, headers: PRIVATE_HEADERS }
      );
    }
    expectedToken = String(booking.publicToken || '');
    isPaid = normalizeFinancialStatus(booking.payment?.status || booking.status).status === 'paid';
    resourceId = booking.modalityId || booking.id;
    title = booking.modalityName || 'Chamada VIP';
  } else if (orderId.startsWith('ped_') || orderId.startsWith('pers_')) {
    kind = 'custom';
    const pers = await getPersonalizadoOrderFromSupabase(env, orderId);
    if (!pers) {
      return new Response(
        JSON.stringify({ success: false, error: 'Pedido personalizado não encontrado.' }),
        { status: 404, headers: PRIVATE_HEADERS }
      );
    }
    expectedToken = String(pers.publicToken || '');
    isPaid = normalizeFinancialStatus(pers.payment?.status || pers.status).status === 'paid';
    resourceId = pers.id;
    title = `Personalizado (${pers.photoCount || 0} fotos)`;
  } else {
    const ord = await getOrderFromSupabase(env, orderId);
    if (!ord) {
      return new Response(
        JSON.stringify({ success: false, error: 'Pedido não encontrado.' }),
        { status: 404, headers: PRIVATE_HEADERS }
      );
    }
    expectedToken = String(ord.purchaseToken || '');
    isPaid = normalizeFinancialStatus(ord.status).status === 'paid';
    resourceId = ord.packId || ord.id;
    title = ord.packId || ord.id;
    expiresAt = ord.expiresAt || null;
  }

  if (!expectedToken || !timingSafeEqualStr(expectedToken, token)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Token de verificação não corresponde ao pedido.' }),
      { status: 403, headers: PRIVATE_HEADERS }
    );
  }

  const existingClaim = await getOrderClaim(env, orderId);
  if (existingClaim && existingClaim.profileId !== auth.profile.id) {
    return new Response(
      JSON.stringify({ success: false, error: 'Este pedido já está vinculado a outra conta NUA ID.' }),
      { status: 409, headers: PRIVATE_HEADERS }
    );
  }

  const claimRes = await claimOrderForProfile(env, orderId, auth.profile.id, 'checkout_authenticated');
  if (!claimRes.ok) {
    return new Response(
      JSON.stringify({ success: false, error: 'Este pedido já está vinculado a outra conta NUA ID.' }),
      { status: 409, headers: PRIVATE_HEADERS }
    );
  }

  if (isPaid && kind === 'pack') {
    await grantEntitlement(env, {
      profileId: auth.profile.id,
      orderRef: orderId,
      kind: 'pack',
      resourceId,
      title,
      expiresAt,
      allowDownload: false,
    });
  }

  const secret = getIdSecret(env) || 'nua-id';
  await recordCustomerAuditEvent(env, {
    profileId: auth.profile.id,
    action: 'order_bound_inline_checkout',
    actorIpHash: await hashClientIp(getClientIp(request), secret),
    details: { orderId, kind, alreadyBound: claimRes.alreadyOwned },
  });

  return new Response(
    JSON.stringify({
      success: true,
      orderRef: orderId,
      bound: true,
      alreadyBound: claimRes.alreadyOwned,
    }),
    { status: 200, headers: PRIVATE_HEADERS }
  );
};
