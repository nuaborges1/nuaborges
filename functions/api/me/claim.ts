/**
 * Cloudflare Pages Function: POST /api/me/claim
 *
 * Vínculo (Claim) Idempotente de Pedidos Legados à conta NUA ID (Seção 11).
 *
 * Regras de segurança inegociáveis:
 * 1. Coincidência de e-mail NUNCA é critério suficiente de titularidade.
 * 2. Exige sessão NUA ID autenticada (e-mail já provado via OTP) + token legado do pedido
 *    (`purchaseToken` para Pack, ou `publicToken` para Chamada VIP / Personalizado).
 * 3. Idempotente: se o mesmo dono reivindicar novamente, retorna 200 sem duplicar nada.
 * 4. Dupla titularidade impossível: se já pertence a outra conta, retorna 409.
 * 5. Pedidos pendentes, cancelados ou reembolsados são vinculados ao histórico, mas NUNCA
 *    concedem direitos de acesso (Invariante 5).
 */

import {
  getAppointmentByIdFromSupabase,
  getOrderByPurchaseToken,
  getOrderFromSupabase,
  getPersonalizadoOrderFromSupabase,
} from '../_supabaseStore';
import { hashClientIp } from '../id/_crypto';
import { getClientIp, getIdSecret, requireCustomer } from '../id/_customerGuard';
import {
  claimOrderForProfile,
  grantEntitlement,
  NuaIdEnv,
  recordCustomerAuditEvent,
} from '../id/_nuaIdStore';
import { checkAndConsumeRateLimit } from '../id/_rateLimiter';
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

  // Rate limit para impedir força bruta em tokens legados
  const rl = await checkAndConsumeRateLimit(env, `claim:${auth.profile.id}`, 10, 900);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Muitas tentativas recentes de vinculação. Aguarde alguns minutos.',
      }),
      { status: 429, headers: PRIVATE_HEADERS }
    );
  }

  const body: any = await request.json().catch(() => ({}));
  const legacyToken = String(body?.token || body?.legacyToken || '').trim();

  if (!/^[A-Za-z0-9_-]{8,128}$/.test(legacyToken)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Informe o código/token de acesso original recebido na compra.',
      }),
      { status: 400, headers: PRIVATE_HEADERS }
    );
  }

  const fixtures = env.__CUSTOMER_DATA_FIXTURES__;

  // 1. Verifica Chamada VIP por publicToken primeiro (chamadas também gravam espelho em orders)
  let orderRef: string | null = null;
  let kind: 'pack' | 'vip' | 'custom' | null = null;
  let resourceId = '';
  let title = '';
  let financialRawStatus = 'pending';
  let expiresAt: string | null = null;
  let allowDownload = false;

  const apt =
    fixtures?.appointmentsByToken?.[legacyToken] ||
    (await getAppointmentByIdFromSupabase(env, legacyToken));
  if (apt && apt.publicToken === legacyToken) {
    orderRef = apt.id;
    kind = 'vip';
    resourceId = apt.modalityId;
    title = apt.modalityName || 'Chamada VIP';
    financialRawStatus = apt.payment?.status || apt.status;
  }

  // 2. Se não for VIP, tenta Personalizado por publicToken
  if (!orderRef) {
    const pers =
      fixtures?.personalizadosByToken?.[legacyToken] ||
      (await getPersonalizadoOrderFromSupabase(env, legacyToken));
    if (pers && pers.publicToken === legacyToken) {
      orderRef = pers.id;
      kind = 'custom';
      resourceId = pers.id;
      title = `Personalizado (${pers.photoCount} fotos)`;
      financialRawStatus = pers.payment?.status || pers.status;
      allowDownload = true;
    }
  }

  // 3. Por fim, tenta localizar Pack pelo purchaseToken (estrito — orderId nunca é aceito!)
  if (!orderRef) {
    const packOrder =
      fixtures?.ordersByToken?.[legacyToken] || (await getOrderByPurchaseToken(env, legacyToken));

    if (packOrder) {
      const idLower = String(packOrder.id || '').toLowerCase();
      if (idLower.startsWith('book_') || idLower.startsWith('apt_') || idLower.startsWith('app_')) {
        orderRef = packOrder.id;
        kind = 'vip';
        resourceId = packOrder.packId;
        title = 'Chamada VIP';
        financialRawStatus = packOrder.status;
      } else if (idLower.startsWith('ped_') || idLower.startsWith('pers_')) {
        orderRef = packOrder.id;
        kind = 'custom';
        resourceId = packOrder.id;
        title = 'Personalizado';
        financialRawStatus = packOrder.status;
        allowDownload = true;
      } else {
        orderRef = packOrder.id;
        kind = 'pack';
        resourceId = packOrder.packId;
        title = packOrder.packId;
        financialRawStatus = packOrder.status;
        // packOrder.expiresAt é a expiração do QR Pix (20 min), não do acesso ao conteúdo.
        expiresAt = null;
        allowDownload = false;
      }
    }
  }

  if (!orderRef || !kind) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Nenhum pedido localizado para o código informado. Confira o token original enviado no seu e-mail.',
      }),
      { status: 404, headers: PRIVATE_HEADERS }
    );
  }

  // 4. Registra o claim de forma idempotente (confirma titularidade por e-mail para todos os tipos)
  if (kind === 'pack') {
    const purchase = fixtures?.orders?.[orderRef] || (await getOrderFromSupabase(env, orderRef));
    if (!purchase?.customerEmail || purchase.customerEmail.trim().toLowerCase() !== auth.profile.emailNormalized) {
      return Response.json({ error: 'Confirme a conta usada na compra.' }, { status: 403, headers: PRIVATE_HEADERS });
    }
  } else if (kind === 'custom') {
    const persOrder =
      fixtures?.personalizados?.[orderRef] ||
      (await getPersonalizadoOrderFromSupabase(env, orderRef).catch(() => null));
    const contact = String(persOrder?.clientContact || '').trim().toLowerCase();
    if (contact.includes('@') && contact !== auth.profile.emailNormalized) {
      return Response.json(
        { error: 'Este pedido personalizado está vinculado a outro endereço de e-mail.' },
        { status: 403, headers: PRIVATE_HEADERS }
      );
    }
  } else {
    const apt = fixtures?.appointments?.[orderRef] || (await getAppointmentByIdFromSupabase(env, orderRef).catch(() => null));
    if (apt?.clientEmail && apt.clientEmail.trim().toLowerCase() !== auth.profile.emailNormalized) {
      return Response.json(
        { error: 'Esta chamada está vinculada a outro endereço de e-mail.' },
        { status: 403, headers: PRIVATE_HEADERS }
      );
    }
  }
  const claimResult = await claimOrderForProfile(env, orderRef, auth.profile.id, 'token_and_otp');
  if (claimResult.conflict) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Este pedido já está vinculado a outra conta.',
      }),
      { status: 409, headers: PRIVATE_HEADERS }
    );
  }

  // 5. Invariante 5: apenas pedidos confirmados (paid) concedem direito de acesso
  const fin = normalizeFinancialStatus(financialRawStatus);
  let entitlementGranted = false;
  if (fin.status === 'paid') {
    await grantEntitlement(env, {
      profileId: auth.profile.id,
      orderRef,
      kind,
      resourceId,
      title,
      expiresAt,
      allowDownload,
    });
    entitlementGranted = true;
  }

  const { getIpHashSecret } = await import('../_central/secrets');
  const secret = getIdSecret(env) || getIpHashSecret(env as any);
  await recordCustomerAuditEvent(env, {
    profileId: auth.profile.id,
    action: 'legacy_order_claimed',
    actorIpHash: await hashClientIp(getClientIp(request), secret),
    details: {
      orderRef,
      kind,
      idempotentReplay: Boolean(claimResult.alreadyClaimedBySame),
      entitlementGranted,
    },
  });

  return new Response(
    JSON.stringify({
      success: true,
      orderRef,
      kind,
      alreadyClaimed: Boolean(claimResult.alreadyClaimedBySame),
      entitlementGranted,
      financialStatus: fin.status,
      message: claimResult.alreadyClaimedBySame
        ? 'Este pedido já estava vinculado à sua conta.'
        : entitlementGranted
          ? 'Pedido vinculado à sua conta e acesso liberado em Minha Conta.'
          : 'Pedido vinculado ao seu histórico. O acesso será liberado apenas após confirmação financeira.',
    }),
    { status: 200, headers: PRIVATE_HEADERS }
  );
};
