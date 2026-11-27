/**
 * Cloudflare Pages Function: GET / POST /api/admin/refund
 *
 * Endpoint unificado e extensível de estorno manual via Mercado Pago.
 * - GET ?orderId=...&modality=... : verifica elegibilidade real e consequências.
 * - POST { action: 'execute' | 'reconcile', orderId, modality?, reason, confirmRefund, paymentId? }
 *
 * Protegido pelo gateway central (`admin_rbac` + `strict_cookie` + rate limit)
 * e verificação adicional do ator autenticado no handler.
 */

import {
  getSessionCookie,
  resolveAdminOperator,
  type SessionPayload,
} from '../_authHelper';
import { parseAndVerifyActiveAdminSession } from '../_central/adminSessions';
import { getAdminSessionSecret, isProductionEnv } from '../_central/secrets';
import { hasAdminCapability } from '../_central/adminCapabilities';
import { requireAdminReauthentication } from '../_central/requireAdminReauthentication';
import type { CentralActor, CentralEnv } from '../_central/types';
import type { NuaIdEnv } from '../id/_nuaIdStore';
import {
  executeManualRefund,
  inspectRefundEligibility,
  type RefundAdminActor,
} from '../payments/_refundEngine';
import { emitProtocolEvent } from '../_central/protocolActivity';

type PagesContext<T = CentralEnv & NuaIdEnv> = {
  request: Request;
  env: T;
  data?: { actor?: CentralActor; localRefund?: boolean; refundActor?: RefundAdminActor | null };
};

const NO_STORE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

async function resolveAdminActor(context: PagesContext): Promise<RefundAdminActor | null> {
  const { request, env, data } = context;

  if (data?.actor) {
    const { role, subject, authMethod } = data.actor;
    const profile = authMethod === 'local_dev' ? 'nua' : resolveAdminOperator({ sub: subject, role });
    return profile ? { profile, subject, role } : null;
  }

  const secret = getAdminSessionSecret(env);
  if (secret) {
    const cookieToken = getSessionCookie(request);
    const authHeader = request.headers.get('Authorization');
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const token = cookieToken || bearer;
    if (token) {
      const payload: SessionPayload | null = await parseAndVerifyActiveAdminSession(
        env,
        token,
        secret,
        ['admin', 'dev', 'client']
      );
      const profile = payload && resolveAdminOperator(payload);
      if (payload && profile) return { profile, subject: payload.sub, role: payload.role };
    }
  }

  try {
    const url = new URL(request.url);
    const isLoopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    const isProd = isProductionEnv(env);
    if (isLoopback && !isProd) {
      return { profile: 'nua', subject: 'local_dev', role: 'dev' };
    }
  } catch {}

  return null;
}

export const onRequestGet = async (context: PagesContext) => {
  const actor = await resolveAdminActor(context);
  if (!actor) {
    return new Response(
      JSON.stringify({ success: false, error: 'Autenticação administrativa obrigatória.' }),
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  if (actor.profile !== 'nua') {
    return Response.json({ success: false, error: 'A consulta de estorno pertence à operação comercial.' }, { status: 403, headers: NO_STORE_HEADERS });
  }

  const url = new URL(context.request.url);
  const orderId = (url.searchParams.get('orderId') || '').trim();
  const modality = url.searchParams.get('modality');

  if (!orderId) {
    return new Response(
      JSON.stringify({ success: false, error: 'Informe o identificador do pedido (orderId).' }),
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const result = await inspectRefundEligibility(context.env, orderId, modality);
  if (!result.found || !result.summary) {
    return new Response(
      JSON.stringify({ success: false, error: result.error || 'Pedido não encontrado.' }),
      { status: 404, headers: NO_STORE_HEADERS }
    );
  }

  return new Response(JSON.stringify({ success: true, summary: result.summary }), {
    status: 200,
    headers: NO_STORE_HEADERS,
  });
};

export const onRequestPost = async (context: PagesContext) => {
  const actor = context.data?.localRefund
    ? context.data.refundActor
    : await resolveAdminActor(context);
  if (!actor) {
    return Response.json({ success: false, error: 'Autentique-se no painel para autorizar o estorno.' }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const body: any = await context.request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return new Response(JSON.stringify({ success: false, error: 'Corpo da requisição inválido.' }), {
      status: 400,
      headers: NO_STORE_HEADERS,
    });
  }

  const orderId = String(body.orderId || '').trim();
  if (!orderId) {
    return new Response(
      JSON.stringify({ success: false, error: 'Informe o identificador do pedido (orderId).' }),
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const action = body.action ?? 'execute';
  if (action !== 'execute' && action !== 'reconcile') {
    return Response.json({ success: false, error: 'Ação de estorno inválida.' }, { status: 400, headers: NO_STORE_HEADERS });
  }
  const capability = action === 'reconcile' ? 'payments.refund.reconcile' : 'payments.refund.manage';
  const allowed = context.data?.actor && !context.data.localRefund
    ? hasAdminCapability(context.data.actor, capability)
    : actor.profile === 'nua' || action === 'reconcile';
  if (!allowed) {
    return Response.json({ success: false, error: 'Seu perfil não pode executar esta operação.' }, { status: 403, headers: NO_STORE_HEADERS });
  }
  if (action === 'execute' && body.confirmRefund === true) {
    if (!Number.isFinite(body.expectedRefundAmount) || body.expectedRefundAmount <= 0) {
      return Response.json({ success: false, error: 'Consulte e confirme o valor da devolução antes de continuar.' }, { status: 400, headers: NO_STORE_HEADERS });
    }
    const denied = await requireAdminReauthentication(context.request, context.env, context.data?.actor, body.confirmationPassword);
    if (denied) return denied;
  }
  const result = await executeManualRefund(context.env, {
    orderId,
    modality: body.modality ? String(body.modality) : null,
    reason: String(body.reason || ''),
    confirmRefund: body.confirmRefund === true,
    requestedPaymentId: body.paymentId ? String(body.paymentId) : null,
    amount: typeof body.amount === 'number' ? body.amount : undefined,
    expectedRefundAmount: typeof body.expectedRefundAmount === 'number' ? body.expectedRefundAmount : undefined,
    reconcileOnly: action === 'reconcile',
    actor,
  });

  if (result.httpStatus < 400) {
    void emitProtocolEvent(context.env as any, context.request, {
      protocol: 'kakuzu',
      category: 'compra',
      actor: actor.profile === 'phdev' ? 'phdev' : 'nua',
      type: 'ORDER_REFUNDED',
      severity: 'warning',
      summary: `${actor.profile === 'phdev' ? 'PHDEV' : 'NUA'} ${action === 'reconcile' ? 'conciliou' : 'executou'} estorno do pedido ${orderId}`,
      entity: { type: 'refund', id: orderId },
      details: {
        orderId,
        action,
        modality: body.modality ? String(body.modality) : undefined,
        amount: typeof body.expectedRefundAmount === 'number' ? body.expectedRefundAmount : undefined,
        status: result.state || 'processed',
      },
    }).catch(() => {});
  }

  return new Response(JSON.stringify(result), {
    status: result.httpStatus,
    headers: NO_STORE_HEADERS,
  });
};

export const onRequestOptions = async () => new Response(null, { status: 204 });
