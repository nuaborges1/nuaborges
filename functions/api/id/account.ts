/**
 * Cloudflare Pages Function: POST /api/id/account
 *
 * Direitos LGPD do titular (Art. 18 da Lei nº 13.709/2018):
 * - Exportação completa dos próprios dados pessoais (perfil, pedidos, biblioteca,
 *   chamadas VIP, personalizados, notificações e eventos de segurança).
 * - Anonimização/encerramento da conta:
 *   - Bloqueia (409) se houver Chamada VIP confirmada futura ou Personalizado pago em produção.
 *   - Anonimiza perfil + PII em `orders`, `appointments` e `personalizados_orders` vinculados,
 *     retendo registros fiscais/financeiros sem vínculo identificável, conforme a LGPD.
 */

import { hashClientIp } from './_crypto';
import {
  buildClearCustomerSessionCookies,
  getClientIp,
  getIdSecret,
  requireCustomer,
} from './_customerGuard';
import {
  getNuaIdAdapter,
  listClaimedOrderRefsForProfile,
  listCustomerAuditEvents,
  listNotificationEvents,
  NuaIdEnv,
  recordCustomerAuditEvent,
  revokeAllCustomerSessions,
  saveProfile,
} from './_nuaIdStore';
import { loadCustomerBundle } from '../me/_customerData';
import { getSupabaseClient } from '../_supabaseClient';

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
  const action = String(body?.action || '');

  if (action === 'export_data') {
    const [bundle, orderRefs, auditEvents, notifications] = await Promise.all([
      loadCustomerBundle(env, auth.profile.id),
      listClaimedOrderRefsForProfile(env, auth.profile.id),
      listCustomerAuditEvents(env, auth.profile.id),
      listNotificationEvents(env, { profileId: auth.profile.id, email: auth.profile.email }),
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        exportedAt: new Date().toISOString(),
        legalBasis: 'Art. 18, incisos II e V da Lei nº 13.709/2018 (LGPD)',
        data: {
          profile: {
            id: auth.profile.id,
            email: auth.profile.email,
            displayName: auth.profile.displayName,
            marketingOptIn: auth.profile.marketingOptIn,
            termsAcceptedAt: auth.profile.termsAcceptedAt || null,
            termsVersion: auth.profile.termsVersion || null,
            createdAt: auth.profile.createdAt,
            updatedAt: auth.profile.updatedAt,
          },
          linkedOrderRefs: orderRefs,
          orders: bundle.orders.map((o) => ({
            id: o.id,
            kind: o.kindLabel,
            title: o.title,
            amount: o.amount,
            financialStatus: o.financialLabel,
            operationalStatus: o.operationalLabel,
            paymentMethod: o.paymentMethod,
            paidAt: o.paidAt,
            createdAt: o.createdAt,
          })),
          library: bundle.library.map((e) => ({
            orderRef: e.orderRef,
            kind: e.kind,
            title: e.title,
            status: e.status,
            purchasedAt: e.purchasedAt,
            expiresAt: e.expiresAt || null,
            revokeReason: e.revokeReason || null,
          })),
          appointments: bundle.appointments.map((a) => ({
            id: a.id,
            modalityName: a.modalityName,
            dateBr: a.displayDateBr,
            timeBr: a.displayTimeBr,
            price: a.price,
            operationalStatus: a.operationalStatus,
            financialStatus: a.financialStatus,
            createdAt: a.createdAt,
          })),
          personalizados: bundle.personalizados.map((p) => ({
            id: p.id,
            photoCount: p.photoCount,
            videoDurationMinutes: p.videoDurationMinutes,
            deliveryChannel: p.deliveryChannel,
            totalPrice: p.totalPrice,
            operationalStatus: p.operationalStatus,
            financialStatus: p.financialStatus,
            createdAt: p.createdAt,
          })),
          notifications: notifications.slice(0, 40).map((n) => ({
            kind: n.kind,
            recipientEmail: n.recipientEmail,
            status: n.status,
            createdAt: n.createdAt,
          })),
          recentSecurityEvents: auditEvents.slice(0, 40).map((ev) => ({
            action: ev.action,
            createdAt: ev.createdAt,
          })),
        },
      }),
      { status: 200, headers: PRIVATE_HEADERS }
    );
  }

  if (action === 'anonymize') {
    if (body?.confirmText !== 'ENCERRAR CONTA') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Para confirmar, digite exatamente "ENCERRAR CONTA".',
        }),
        { status: 400, headers: PRIVATE_HEADERS }
      );
    }

    // Verifica obrigações ativas em andamento antes de anonimizar (evita perda de serviço pago)
    const bundle = await loadCustomerBundle(env, auth.profile.id);
    const nowMs = Date.now();
    const activeFutureCalls = bundle.appointments.filter((a) => {
      if (a.financialStatus !== 'paid') return false;
      if (!['confirmada', 'reagendamento_pendente'].includes(a.operationalStatus)) return false;
      const startMs = a.dateUtc ? new Date(a.dateUtc).getTime() : Number.NaN;
      return !Number.isFinite(startMs) || startMs >= nowMs - 60 * 60 * 1000;
    });

    const activeCustomOrders = bundle.personalizados.filter(
      (p) =>
        p.financialStatus === 'paid' &&
        ['em_producao', 'pronto'].includes(p.operationalStatus)
    );

    if (activeFutureCalls.length > 0 || activeCustomOrders.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'Você possui serviços pagos em andamento (Chamada VIP agendada ou Personalizado em produção). Conclua ou solicite o cancelamento desses atendimentos antes de encerrar e anonimizar sua conta.',
        }),
        { status: 409, headers: PRIVATE_HEADERS }
      );
    }

    const oldEmail = auth.profile.emailNormalized;
    const nowIso = new Date().toISOString();
    const anonymizedEmail = `anon_${auth.profile.id.slice(0, 12)}@anonymized.local`;
    const claimedRefs = await listClaimedOrderRefsForProfile(env, auth.profile.id);

    // 1. Anonimiza registros comerciais ligados a este titular mantendo IDs, valores e datas fiscais
    const sb = getSupabaseClient(env as any);
    if (sb) {
      const orderIds = Array.from(new Set([...claimedRefs, ...bundle.orders.map((o) => o.id)]));
      const aptIds = bundle.appointments.map((a) => a.id);
      const persIds = bundle.personalizados.map((p) => p.id);

      if (orderIds.length > 0) {
        await sb
          .from('orders')
          .update({
            customer_email: anonymizedEmail,
            customer_name: 'Titular anonimizado',
            updated_at: nowIso,
          })
          .in('id', orderIds)
          .then(() => {}, () => {});
      }

      if (aptIds.length > 0) {
        const { data: aptRows } = await sb
          .from('appointments')
          .select('id, notes')
          .in('id', aptIds)
          .then((r) => r, () => ({ data: null as any }));
        if (Array.isArray(aptRows)) {
          for (const row of aptRows) {
            let cleanNotes = '';
            try {
              const parsed = row.notes && String(row.notes).startsWith('{') ? JSON.parse(row.notes) : {};
              parsed.clientEmail = anonymizedEmail;
              parsed.clientPhone = '';
              parsed.clientNotes = '';
              cleanNotes = JSON.stringify(parsed);
            } catch {
              cleanNotes = '';
            }
            await sb
              .from('appointments')
              .update({
                client_name: 'Titular anonimizado',
                client_contact: '',
                client_instagram: '',
                notes: cleanNotes,
                updated_at: nowIso,
              })
              .eq('id', row.id)
              .then(() => {}, () => {});
          }
        }
      }

      if (persIds.length > 0) {
        await sb
          .from('personalizados_orders')
          .update({
            client_name: 'Titular anonimizado',
            client_contact: anonymizedEmail,
            briefing: '[Removido por solicitação LGPD]',
            updated_at: nowIso,
          })
          .in('id', persIds)
          .then(() => {}, () => {});
      }
    }

    // 2. Remove índices por e-mail, expurga lista VIP (LGPD Art. 18 — NUA-AUD-018) e anonimiza o perfil NUA ID
    const adapter = getNuaIdAdapter(env);
    if (adapter) {
      await adapter.kvDelete(`nua_id:email:${oldEmail}`);
      await adapter.kvDelete(`nua_id:notif:email:${oldEmail}`);
      try {
        const { getSystemKVFromSupabase, setSystemKVInSupabase } = await import('../_supabaseStore');
        const vipLeads = await getSystemKVFromSupabase(env as any, 'vip_leads_v1').catch(() => null);
        if (Array.isArray(vipLeads)) {
          const filtered = vipLeads.filter(
            (l: any) => !l || String(l.email || '').trim().toLowerCase() !== oldEmail
          );
          if (filtered.length !== vipLeads.length) {
            await setSystemKVInSupabase(env as any, 'vip_leads_v1', filtered, 'lgpd_anonymize').catch(() => {});
          }
        }
      } catch {}
    }

    const anonymized = {
      ...auth.profile,
      email: anonymizedEmail,
      emailNormalized: anonymizedEmail,
      displayName: 'Conta encerrada',
      phoneMasked: null,
      marketingOptIn: false,
      status: 'anonymized' as const,
      anonymizedAt: nowIso,
    };

    await saveProfile(env, anonymized);
    await revokeAllCustomerSessions(env, auth.profile.id);

    const { getIpHashSecret } = await import('../_central/secrets');
    const secret = getIdSecret(env) || getIpHashSecret(env as any);
    await recordCustomerAuditEvent(env, {
      profileId: auth.profile.id,
      action: 'account_anonymized',
      actorIpHash: await hashClientIp(getClientIp(request), secret),
      details: {
        fiscalRecordsPreserved: true,
        ordersAnonymized: bundle.orders.length,
        appointmentsAnonymized: bundle.appointments.length,
        personalizadosAnonymized: bundle.personalizados.length,
      },
    });

    const headers = new Headers(PRIVATE_HEADERS);
    for (const c of buildClearCustomerSessionCookies(request)) {
      headers.append('Set-Cookie', c);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message:
          'Sua conta e os dados pessoais vinculados foram anonimizados e todas as sessões foram encerradas. Registros fiscais obrigatórios permanecem retidos sem identificação pessoal, conforme a LGPD.',
      }),
      { status: 200, headers }
    );
  }

  return new Response(
    JSON.stringify({ success: false, error: 'Ação inválida.' }),
    { status: 400, headers: PRIVATE_HEADERS }
  );
};
