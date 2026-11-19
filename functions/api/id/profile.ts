/**
 * Cloudflare Pages Function: GET/POST /api/id/profile
 *
 * Permite ao cliente consultar e atualizar apenas os dados estritamente necessários:
 * nome de exibição e preferência de marketing (separada das notificações transacionais).
 * Nunca aceita alteração de id, email, status ou permissões.
 */

import { hashClientIp } from './_crypto';
import { getClientIp, getIdSecret, requireCustomer } from './_customerGuard';
import {
  NuaIdEnv,
  recordCustomerAuditEvent,
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

export const onRequestGet = async (context: PagesContext<NuaIdEnv>) => {
  const auth = await requireCustomer(context.request, context.env);
  if (!auth.ok) return auth.response;

  return new Response(
    JSON.stringify({
      success: true,
      profile: {
        id: auth.profile.id,
        email: auth.profile.email,
        displayName: auth.profile.displayName,
        marketingOptIn: auth.profile.marketingOptIn,
        termsAcceptedAt: auth.profile.termsAcceptedAt || null,
        termsVersion: auth.profile.termsVersion || null,
        createdAt: auth.profile.createdAt,
      },
    }),
    { status: 200, headers: PRIVATE_HEADERS }
  );
};

export const onRequestPost = async (context: PagesContext<NuaIdEnv>) => {
  const auth = await requireCustomer(context.request, context.env);
  if (!auth.ok) return auth.response;

  const body: any = await context.request.json().catch(() => ({}));
  const updated = { ...auth.profile };
  const changedFields: string[] = [];

  if (typeof body?.displayName === 'string') {
    const clean = body.displayName.replace(/[<>]/g, '').trim().slice(0, 80);
    if (clean.length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: 'Informe um nome com pelo menos 2 caracteres.' }),
        { status: 400, headers: PRIVATE_HEADERS }
      );
    }
    updated.displayName = clean;
    changedFields.push('displayName');
  }

  if (typeof body?.marketingOptIn === 'boolean') {
    updated.marketingOptIn = body.marketingOptIn;
    changedFields.push('marketingOptIn');
  }

  if (body?.acceptTerms === true) {
    updated.termsAcceptedAt = new Date().toISOString();
    updated.termsVersion = '2026-11';
    changedFields.push('termsAcceptedAt');
  }

  if (changedFields.length === 0) {
    return new Response(
      JSON.stringify({ success: false, error: 'Nenhuma alteração válida enviada.' }),
      { status: 400, headers: PRIVATE_HEADERS }
    );
  }

  await saveProfile(context.env, updated);
  const secret = getIdSecret(context.env) || 'nua-id';
  await recordCustomerAuditEvent(context.env, {
    profileId: updated.id,
    action: 'profile_update',
    actorIpHash: await hashClientIp(getClientIp(context.request), secret),
    details: { changedFields },
  });

  return new Response(
    JSON.stringify({
      success: true,
      profile: {
        id: updated.id,
        email: updated.email,
        displayName: updated.displayName,
        marketingOptIn: updated.marketingOptIn,
        termsAcceptedAt: updated.termsAcceptedAt || null,
        createdAt: updated.createdAt,
      },
    }),
    { status: 200, headers: PRIVATE_HEADERS }
  );
};
