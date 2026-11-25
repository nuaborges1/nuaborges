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
  resolveAdminPanelProfile,
  type SessionPayload,
} from '../_authHelper';
import { parseAndVerifyActiveAdminSession } from '../_central/adminSessions';
import { getAdminSessionSecret } from '../_central/secrets';
import { getMercadoPagoAccessToken, getMercadoPagoPayment, listMercadoPagoRefunds, refundMercadoPagoPayment } from '../_mercadopago';
import type { CentralEnv } from '../_central/types';
import type { NuaIdEnv } from '../id/_nuaIdStore';
import {
  executeManualRefund,
  inspectRefundEligibility,
  type RefundAdminActor,
  type RefundGatewayDeps,
} from '../payments/_refundEngine';

type PagesContext<T = CentralEnv & NuaIdEnv> = {
  request: Request;
  env: T;
  data?: { actor?: { role?: string; subject?: string }; localRefund?: boolean; refundActor?: RefundAdminActor | null };
};

const NO_STORE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

function refundGateway(context: PagesContext): RefundGatewayDeps | undefined {
  const token = getMercadoPagoAccessToken(context.env);
  if (!context.data?.localRefund || !token?.startsWith('APP_USR-')) return undefined;
  const gatewayEnv = { ...context.env, ENVIRONMENT: 'production' };
  return {
    getPayment: (_env, paymentId) => getMercadoPagoPayment(gatewayEnv, paymentId),
    listRefunds: (_env, paymentId) => listMercadoPagoRefunds(gatewayEnv, paymentId),
    refundPayment: (_env, ...args) =>
      refundMercadoPagoPayment(gatewayEnv, ...args),
  };
}

async function resolveAdminActor(context: PagesContext): Promise<RefundAdminActor | null> {
  const { request, env, data } = context;

  if (data?.actor?.role) {
    const role = data.actor.role;
    const profile = role === 'dev' || data.actor.subject === 'phdev' ? 'phdev' : 'nua';
    return { profile, subject: data.actor.subject || profile, role };
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
      if (payload) {
        return {
          profile: resolveAdminPanelProfile(payload),
          subject: payload.sub || payload.role,
          role: payload.role,
        };
      }
    }
  }

  try {
    const url = new URL(request.url);
    const isLoopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    const isProd = String(env?.ENVIRONMENT || '').toLowerCase() === 'production';
    if (isLoopback && !isProd) {
      return { profile: 'phdev', subject: 'local_dev', role: 'dev' };
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

  const url = new URL(context.request.url);
  const orderId = (url.searchParams.get('orderId') || '').trim();
  const modality = url.searchParams.get('modality');

  if (!orderId) {
    return new Response(
      JSON.stringify({ success: false, error: 'Informe o identificador do pedido (orderId).' }),
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const result = await inspectRefundEligibility(context.env, orderId, modality, refundGateway(context));
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

  const action = String(body.action || 'execute').trim();
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
  }, refundGateway(context));

  return new Response(JSON.stringify(result), {
    status: result.httpStatus,
    headers: NO_STORE_HEADERS,
  });
};

export const onRequestOptions = async () => new Response(null, { status: 204 });
