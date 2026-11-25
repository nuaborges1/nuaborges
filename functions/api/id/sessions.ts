/**
 * Cloudflare Pages Function: GET/POST /api/id/sessions
 *
 * Lista sessões ativas do cliente autenticado e permite encerrar sessões em outros dispositivos
 * (com proteção estrita contra IDOR: o cliente só revoga as próprias sessões).
 */

import { hashClientIp } from './_crypto';
import { getClientIp, getIdSecret, requireCustomer } from './_customerGuard';
import {
  listCustomerAuditEvents,
  listCustomerSessions,
  NuaIdEnv,
  recordCustomerAuditEvent,
  revokeAllCustomerSessions,
  revokeCustomerSession,
} from './_nuaIdStore';

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

const PRIVATE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
};

export const onRequestGet = async (context: PagesContext<NuaIdEnv>) => {
  const auth = await requireCustomer(context.request, context.env);
  if (!auth.ok) return auth.response;

  const [sessions, auditEvents] = await Promise.all([
    listCustomerSessions(context.env, auth.profile.id),
    listCustomerAuditEvents(context.env, auth.profile.id),
  ]);

  const CUSTOMER_VISIBLE_EVENTS = new Set([
    'login_otp',
    'logout',
    'profile_update',
    'email_change_requested',
    'email_changed',
    'revoke_session',
    'revoke_other_sessions',
    'legacy_order_claimed',
    'order_bound_inline_checkout',
  ]);

  return new Response(
    JSON.stringify({
      success: true,
      sessions: sessions.map((s) => ({
        id: s.id,
        deviceLabel: s.deviceLabel,
        createdAt: s.createdAt,
        lastSeenAt: s.lastSeenAt,
        expiresAt: s.expiresAt,
        isCurrent: s.id === auth.session.id,
      })),
      recentEvents: auditEvents
        .filter((ev) => CUSTOMER_VISIBLE_EVENTS.has(ev.action))
        .slice(0, 12)
        .map((ev) => ({
          id: ev.id,
          action: ev.action,
          createdAt: ev.createdAt,
          deviceLabel: typeof ev.details?.deviceLabel === 'string' ? ev.details.deviceLabel : undefined,
        })),
    }),
    { status: 200, headers: PRIVATE_HEADERS }
  );
};

export const onRequestPost = async (context: PagesContext<NuaIdEnv>) => {
  const auth = await requireCustomer(context.request, context.env);
  if (!auth.ok) return auth.response;

  const body: any = await context.request.json().catch(() => ({}));
  const { getIpHashSecret } = await import('../_central/secrets');
  const secret = getIdSecret(context.env) || getIpHashSecret(context.env as any);
  const ipHash = await hashClientIp(getClientIp(context.request), secret);

  if (body?.revokeOthers === true) {
    const count = await revokeAllCustomerSessions(context.env, auth.profile.id, auth.session.id);
    await recordCustomerAuditEvent(context.env, {
      profileId: auth.profile.id,
      action: 'revoke_other_sessions',
      actorIpHash: ipHash,
      details: { count },
    });
    return new Response(
      JSON.stringify({
        success: true,
        revokedCount: count,
        message: 'Sessões em outros dispositivos encerradas.',
      }),
      { status: 200, headers: PRIVATE_HEADERS }
    );
  }

  const targetSessionId = String(body?.sessionId || '').trim();
  if (!targetSessionId) {
    return new Response(
      JSON.stringify({ success: false, error: 'Informe sessionId ou revokeOthers.' }),
      { status: 400, headers: PRIVATE_HEADERS }
    );
  }

  // Proteção IDOR: passa auth.profile.id como expectedProfileId
  const revoked = await revokeCustomerSession(context.env, targetSessionId, auth.profile.id);
  if (!revoked) {
    return new Response(
      JSON.stringify({ success: false, error: 'Sessão não encontrada para esta conta.' }),
      { status: 404, headers: PRIVATE_HEADERS }
    );
  }

  await recordCustomerAuditEvent(context.env, {
    profileId: auth.profile.id,
    action: 'revoke_session',
    actorIpHash: ipHash,
  });

  return new Response(
    JSON.stringify({ success: true, message: 'Sessão encerrada com sucesso.' }),
    { status: 200, headers: PRIVATE_HEADERS }
  );
};
