/**
 * Orquestrador Idempotente de Confirmação Financeira e E-mails Pós-Pagamento — Nua Borges
 *
 * Garante que Packs, Chamadas VIP e Personalizados:
 * 1. Sempre sincronizem `payments` e `entitlements` (com `expiresAt: null` para Packs).
 * 2. Sempre disparem exatamente 1 e-mail de confirmação por destinatário, independente de quem
 *    confirmou primeiro (polling `/api/payments/status`, `/api/personalizados/status` ou webhook
 *    `/api/finance/webhook`).
 * 3. Registrem `NotificationEvent` para visibilidade no histórico de clientes do Admin.
 */

import {
  getAppointmentByIdFromSupabase,
  getOrderFromSupabase,
  getPersonalizadoOrderFromSupabase,
  saveAppointmentToSupabase,
} from '../_supabaseStore';
import {
  getNuaIdAdapter,
  getOrderClaim,
  getProfileById,
  getOrCreateProfileByEmail,
  claimOrderForProfile,
  grantEntitlement,
  recordNotificationEvent,
  upsertPaymentRecord,
} from '../id/_nuaIdStore';
import { sendAppointmentConfirmationEmail } from '../appointments/_emailAppointmentHelper';
import {
  sendPersonalizadoClientConfirmationEmail,
  sendPersonalizadoNotificationEmailDetailed,
} from '../personalizados/_emailHelper';
import { notifyVaultDelivery } from '../me/_vaultMail';
import { loadCustomerCatalogIndex } from '../me/_customerData';

const EMAIL_RE = /^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/;

async function hasSentEmailFlag(env: any, flagKey: string): Promise<boolean> {
  try {
    const adapter = getNuaIdAdapter(env);
    if (!adapter) return false;
    const existing = await adapter.kvGet<{ sentAt: string }>(flagKey);
    return Boolean(existing?.sentAt);
  } catch {
    return false;
  }
}

async function markSentEmailFlag(env: any, flagKey: string, meta?: Record<string, any>): Promise<void> {
  try {
    const adapter = getNuaIdAdapter(env);
    if (!adapter) return;
    await adapter.kvSet(flagKey, {
      sentAt: new Date().toISOString(),
      ...(meta || {}),
    });
  } catch {}
}

export async function finalizePaidPackOrder(
  env: any,
  orderId: string,
  paymentInfo?: {
    paymentId?: string;
    amount?: number;
    paymentMethod?: string;
    paidAt?: string;
  }
): Promise<{ emailSent: boolean; error?: string }> {
  const paidOrder = await getOrderFromSupabase(env, orderId);
  let claim = await getOrderClaim(env, orderId).catch(() => null);
  if (!paidOrder || !['paid','approved'].includes(paidOrder.status)) return {emailSent:false,error:'Pedido pendente.'};

  const email = String(paidOrder.customerEmail || (paidOrder as any)?.payerEmail || '').trim().toLowerCase();
  if (!claim?.profileId && email && email.includes('@')) {
    try {
      const profile = await getOrCreateProfileByEmail(env, email, (paidOrder as any)?.customerName || (paidOrder as any)?.payerName);
      if (profile?.id) {
        await claimOrderForProfile(env, orderId, profile.id, 'post_payment_email');
        claim = { orderRef: orderId, profileId: profile.id, claimedAt: new Date().toISOString(), method: 'post_payment_email' };
      }
    } catch (claimErr) {
      console.warn('[OrderFulfillment] Falha ao criar profile pós-pagamento:', claimErr);
    }
  }

  const paidAt = paymentInfo?.paidAt || (paidOrder as any)?.paidAt || new Date().toISOString();
  const amount = Number(paymentInfo?.amount ?? paidOrder?.amount ?? 0);
  const providerPaymentId = String(paymentInfo?.paymentId || paidOrder?.paymentId || orderId);

  // 1. Garante registro financeiro unificado e entitlement na conta NUA ID (sem expiração de 20min!)
  try {
    await upsertPaymentRecord(env, {
      orderRef: orderId,
      provider: 'mercadopago',
      providerPaymentId,
      amountCents: Math.round(amount * 100),
      currency: 'BRL',
      status: 'approved',
      paymentMethod: paymentInfo?.paymentMethod || paidOrder?.paymentMethod || 'mercadopago_pix',
      paidAt,
    });

    if (claim?.profileId) {
      const catalog = await loadCustomerCatalogIndex(env).catch(() => new Map<string, any>());
      const packKey = String(paidOrder?.packId || '').toLowerCase();
      const catItem = packKey ? catalog.get(packKey) : null;
      const resolvedTitle = catItem?.title || catItem?.name || paidOrder?.packId || orderId;
      await grantEntitlement(env, {
        profileId: claim.profileId,
        orderRef: orderId,
        kind: 'pack',
        resourceId: paidOrder?.packId || orderId,
        title: resolvedTitle,
        expiresAt: null,
        allowDownload: false,
      });
    }
  } catch (err) {
    console.warn('[OrderFulfillment] Erro ao sincronizar entitlement/payment do pack:', err);
  }

  return {emailSent: await notifyVaultDelivery(env,orderId)};
}

export async function finalizePaidAppointmentNotification(
  env: any,
  bookingId: string,
  paymentInfo?: {
    paymentId?: string;
    amount?: number;
    paymentMethod?: string;
    paidAt?: string;
  }
): Promise<{ emailSent: boolean; error?: string }> {
  const booking = await getAppointmentByIdFromSupabase(env, bookingId);
  if (!booking) return { emailSent: false, error: 'Agendamento não encontrado.' };

  const claim = await getOrderClaim(env, booking.id).catch(() => null);
  const profile = claim?.profileId ? await getProfileById(env, claim.profileId).catch(() => null) : null;

  try {
    await upsertPaymentRecord(env, {
      orderRef: booking.id,
      provider: 'mercadopago',
      providerPaymentId: String(paymentInfo?.paymentId || booking.payment?.transactionId || booking.id),
      amountCents: Math.round(Number(paymentInfo?.amount ?? booking.price ?? 0) * 100),
      currency: 'BRL',
      status: 'approved',
      paymentMethod: paymentInfo?.paymentMethod || booking.payment?.method || 'mercadopago_pix',
      paidAt: paymentInfo?.paidAt || booking.payment?.paidAt || new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[OrderFulfillment] Erro ao gravar PaymentRecord da chamada:', err);
  }

  if (!Array.isArray(booking.history)) booking.history = [];
  const flagKey = `nua_id:email_sent:paid_vip:${booking.id}`;
  const alreadyInHistory = booking.history.some((h: any) => h.action === 'email_confirmacao_enviado');
  if (alreadyInHistory || (await hasSentEmailFlag(env, flagKey))) {
    return { emailSent: true };
  }

  const recipient = String(booking.clientEmail || profile?.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(recipient)) {
    return { emailSent: false, error: 'E-mail do cliente ausente na reserva.' };
  }
  if (!booking.clientEmail) {
    booking.clientEmail = recipient;
  }

  const emailRes = await sendAppointmentConfirmationEmail(env, booking);

  await recordNotificationEvent(env, {
    profileId: profile?.id || null,
    recipientEmail: recipient,
    kind: 'appointment_confirmed',
    status: emailRes.success ? 'sent' : 'failed',
    errorMessage: emailRes.error,
  }).catch(() => {});

  if (emailRes.success) {
    await markSentEmailFlag(env, flagKey, { to: recipient, messageId: emailRes.messageId });
    booking.history.push({
      at: new Date().toISOString(),
      action: 'email_confirmacao_enviado',
      note: `E-mail oficial de confirmação enviado para ${recipient}.`,
      author: 'system',
    });
    await saveAppointmentToSupabase(env, booking).catch(() => {});
  } else {
    console.error(`[OrderFulfillment] Falha ao enviar e-mail da chamada ${booking.id}:`, emailRes.error);
  }

  return { emailSent: emailRes.success, error: emailRes.error };
}

export async function finalizePaidPersonalizadoNotification(
  env: any,
  orderId: string,
  paymentInfo?: {
    paymentId?: string;
    amount?: number;
    paymentMethod?: string;
    paidAt?: string;
  }
): Promise<{ adminSent: boolean; clientSent: boolean; error?: string }> {
  const pers = await getPersonalizadoOrderFromSupabase(env, orderId);
  if (!pers) return { adminSent: false, clientSent: false, error: 'Personalizado não encontrado.' };

  const sbOrder = await getOrderFromSupabase(env, orderId).catch(() => null);
  let claim = await getOrderClaim(env, pers.id).catch(() => null);
  const candidateGuestEmail = String(
    sbOrder?.customerEmail || (pers.clientContact?.includes('@') ? pers.clientContact : '')
  )
    .trim()
    .toLowerCase();
  if (!claim?.profileId && EMAIL_RE.test(candidateGuestEmail)) {
    try {
      const guestProfile = await getOrCreateProfileByEmail(env, candidateGuestEmail, pers.clientName);
      if (guestProfile?.id) {
        await claimOrderForProfile(env, pers.id, guestProfile.id, 'post_payment_email');
        claim = {
          orderRef: pers.id,
          profileId: guestProfile.id,
          claimedAt: new Date().toISOString(),
          method: 'post_payment_email',
        };
      }
    } catch (claimErr) {
      console.warn('[OrderFulfillment] Falha ao vincular convidado de personalizado:', claimErr);
    }
  }
  const profile = claim?.profileId ? await getProfileById(env, claim.profileId).catch(() => null) : null;

  try {
    await upsertPaymentRecord(env, {
      orderRef: pers.id,
      provider: 'mercadopago',
      providerPaymentId: String(paymentInfo?.paymentId || pers.payment?.transactionId || pers.id),
      amountCents: Math.round(Number(paymentInfo?.amount ?? pers.totalPrice ?? 0) * 100),
      currency: 'BRL',
      status: 'approved',
      paymentMethod: paymentInfo?.paymentMethod || pers.payment?.method || 'mercadopago_pix',
      paidAt: paymentInfo?.paidAt || pers.payment?.paidAt || new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[OrderFulfillment] Erro ao gravar PaymentRecord do personalizado:', err);
  }

  // 1. E-mail para a administração (idempotente)
  const adminFlagKey = `nua_id:email_sent:paid_pers_admin:${pers.id}`;
  let adminSent = await hasSentEmailFlag(env, adminFlagKey);
  let lastError: string | undefined;

  if (!adminSent) {
    const adminRes = await sendPersonalizadoNotificationEmailDetailed(env, pers);
    adminSent = adminRes.ok;
    if (adminRes.ok) {
      await markSentEmailFlag(env, adminFlagKey, { to: 'contato@nuaborges.com.br', messageId: adminRes.messageId });
    } else {
      lastError = adminRes.error;
      console.error(`[OrderFulfillment] Falha ao notificar admin do personalizado ${pers.id}:`, adminRes.error);
    }
  }

  // 2. E-mail de confirmação para o cliente (se houver e-mail no pedido, conta NUA ID ou contato)
  const clientEmail = String(
    sbOrder?.customerEmail ||
      profile?.email ||
      (pers.clientContact?.includes('@') ? pers.clientContact : '')
  )
    .trim()
    .toLowerCase();

  const clientFlagKey = `nua_id:email_sent:paid_pers_client:${pers.id}`;
  let clientSent = await hasSentEmailFlag(env, clientFlagKey);

  if (!clientSent && EMAIL_RE.test(clientEmail)) {
    const clientRes = await sendPersonalizadoClientConfirmationEmail(env, pers, clientEmail);
    clientSent = clientRes.ok;
    await recordNotificationEvent(env, {
      profileId: profile?.id || null,
      recipientEmail: clientEmail,
      kind: 'personalizado_confirmed',
      status: clientRes.ok ? 'sent' : 'failed',
      errorMessage: clientRes.error,
    }).catch(() => {});

    if (clientRes.ok) {
      await markSentEmailFlag(env, clientFlagKey, { to: clientEmail, messageId: clientRes.messageId });
    } else {
      lastError = lastError || clientRes.error;
      console.error(`[OrderFulfillment] Falha ao notificar cliente do personalizado ${pers.id}:`, clientRes.error);
    }
  }

  return { adminSent, clientSent, error: lastError };
}

type PaidOrderEmailJob = { kind: 'vip' | 'custom'; orderId: string; next: number; attempts: number };
const paidMailPrefix = 'nua_id:paid_mail:';

async function runPaidOrderEmail(env: any, key: string, job: PaidOrderEmailJob) {
  const store = getNuaIdAdapter(env);
  if (!store?.kvLease || job.next > Date.now()) return;
  if (!(await store.kvLease(key, job.next, { ...job, next: Date.now() + 600_000 }))) return;
  try {
    let complete: boolean;
    if (job.kind === 'vip') {
      const booking = await getAppointmentByIdFromSupabase(env, job.orderId);
      if (booking?.payment?.status === 'refunded' || booking?.status === 'cancelada') {
        await store.kvDelete(key);
        return;
      }
      complete = booking?.status === 'confirmada' && booking.payment?.status === 'approved'
        && (await finalizePaidAppointmentNotification(env, job.orderId)).emailSent;
    } else {
      const order = await getPersonalizadoOrderFromSupabase(env, job.orderId);
      if (order?.payment?.status === 'refunded' || order?.status === 'cancelado') {
        await store.kvDelete(key);
        return;
      }
      const result = order?.payment?.status === 'approved'
        ? await finalizePaidPersonalizadoNotification(env, job.orderId)
        : null;
      complete = Boolean(result?.adminSent && result.clientSent);
    }
    if (complete) {
      await store.kvDelete(key);
      return;
    }
  } catch {
    console.error('[PaidOrderEmail] Falha na tentativa de confirmação.');
  }
  const attempts = job.attempts + 1;
  const minutes = Math.min(1440, 2 ** Math.min(attempts, 11));
  await store.kvSet(key, { ...job, attempts, next: Date.now() + minutes * 60_000 });
}

export async function queuePaidOrderEmail(env: any, kind: PaidOrderEmailJob['kind'], orderId: string) {
  const store = getNuaIdAdapter(env);
  if (!store?.kvCreate) throw new Error('Fila de confirmação indisponível.');
  const key = paidMailPrefix + kind + ':' + orderId;
  const initial = { kind, orderId, next: 0, attempts: 0 };
  const job = await store.kvCreate(key, initial) ? initial : await store.kvGet<PaidOrderEmailJob>(key);
  if (!job) throw new Error('Falha ao registrar confirmação de pagamento.');
  await runPaidOrderEmail(env, key, job);
}

export async function retryPaidOrderEmails(env: any) {
  const jobs = await getNuaIdAdapter(env)?.kvListByPrefix<PaidOrderEmailJob>(paidMailPrefix) || [];
  for (const { key, value } of jobs.filter(({ value }) => value.next <= Date.now()).slice(0, 10)) {
    await runPaidOrderEmail(env, key, value).catch(() => console.error('[PaidOrderEmail] Falha ao atualizar a fila.'));
  }
}
