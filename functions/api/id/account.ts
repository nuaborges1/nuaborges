/**
 * Cloudflare Pages Function: POST /api/id/account
 *
 * Direitos LGPD do titular:
 * - Exportação dos próprios dados pessoais (portabilidade/acesso)
 * - Anonimização/encerramento da conta (retém registros fiscais/financeiros sem PII,
 *   bloqueia se houver pedido em aberto ou chamada futura confirmada sem confirmação).
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
  listEntitlementsByProfile,
  NuaIdEnv,
  recordCustomerAuditEvent,
  revokeAllCustomerSessions,
  saveProfile,
} from './_nuaIdStore';

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
    const [entitlements, orderRefs, auditEvents] = await Promise.all([
      listEntitlementsByProfile(env, auth.profile.id),
      listClaimedOrderRefsForProfile(env, auth.profile.id),
      listCustomerAuditEvents(env, auth.profile.id),
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        exportedAt: new Date().toISOString(),
        data: {
          profile: {
            id: auth.profile.id,
            email: auth.profile.email,
            displayName: auth.profile.displayName,
            marketingOptIn: auth.profile.marketingOptIn,
            termsAcceptedAt: auth.profile.termsAcceptedAt,
            createdAt: auth.profile.createdAt,
          },
          linkedOrderRefs: orderRefs,
          entitlements: entitlements.map((e) => ({
            kind: e.kind,
            resourceId: e.resourceId,
            grantedAt: e.grantedAt,
            expiresAt: e.expiresAt || null,
            revokedAt: e.revokedAt || null,
          })),
          recentSecurityEvents: auditEvents.slice(0, 30).map((ev) => ({
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

    const oldEmail = auth.profile.emailNormalized;
    const nowIso = new Date().toISOString();
    const anonymizedEmail = `anon_${auth.profile.id.slice(0, 12)}@anonymized.local`;

    const adapter = getNuaIdAdapter(env);
    if (adapter) {
      await adapter.kvDelete(`nua_id:email:${oldEmail}`);
    }

    const anonymized = {
      ...auth.profile,
      email: anonymizedEmail,
      emailNormalized: anonymizedEmail,
      displayName: 'Conta encerrada',
      marketingOptIn: false,
      status: 'anonymized' as const,
      anonymizedAt: nowIso,
    };

    await saveProfile(env, anonymized);
    await revokeAllCustomerSessions(env, auth.profile.id);

    const secret = getIdSecret(env) || 'nua-id';
    await recordCustomerAuditEvent(env, {
      profileId: auth.profile.id,
      action: 'account_anonymized',
      actorIpHash: await hashClientIp(getClientIp(request), secret),
      details: { fiscalRecordsPreserved: true },
    });

    const headers = new Headers(PRIVATE_HEADERS);
    for (const c of buildClearCustomerSessionCookies(request)) {
      headers.append('Set-Cookie', c);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message:
          'Sua conta foi anonimizada e todas as sessões foram encerradas. Registros fiscais obrigatórios permanecem retidos sem vínculo identificável, conforme a LGPD.',
      }),
      { status: 200, headers }
    );
  }

  return new Response(
    JSON.stringify({ success: false, error: 'Ação inválida.' }),
    { status: 400, headers: PRIVATE_HEADERS }
  );
};
