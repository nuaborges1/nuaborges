/**
 * Cloudflare Pages Function: POST /api/me/media-url
 *
 * Emite URL assinada temporária (TTL 5 min) para mídia privada após validar:
 * 1. Sessão NUA ID autenticada (requireCustomer)
 * 2. Direito de acesso (entitlement) ativo, não revogado e não expirado do próprio cliente
 * 3. Permissão de download (se download=true)
 * 4. Pertencimento estrito do arquivo ao recurso autorizado
 */

import { getIdSecret, requireCustomer } from '../id/_customerGuard';
import {
  isEntitlementActive,
  listEntitlementsByProfile,
  NuaIdEnv,
} from '../id/_nuaIdStore';
import {
  DEFAULT_SIGNED_MEDIA_TTL_SECONDS,
  mediaPathMatchesResource,
  signPrivateMediaUrl,
} from './_mediaSigner';

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

  const secret = getIdSecret(env);
  if (!secret) {
    return new Response(
      JSON.stringify({ success: false, error: 'Assinatura de mídia indisponível.' }),
      { status: 503, headers: PRIVATE_HEADERS }
    );
  }

  const body: any = await request.json().catch(() => ({}));
  const resourceId = String(body?.resourceId || '').trim();
  const mediaPath = String(body?.mediaPath || '').trim();
  const wantsDownload = body?.download === true;

  if (!resourceId || !mediaPath) {
    return new Response(
      JSON.stringify({ success: false, error: 'Informe resourceId e mediaPath.' }),
      { status: 400, headers: PRIVATE_HEADERS }
    );
  }

  const entitlements = await listEntitlementsByProfile(env, auth.profile.id);
  const matching = entitlements.find(
    (e) =>
      e.resourceId.toLowerCase() === resourceId.toLowerCase() &&
      isEntitlementActive(e)
  );

  if (!matching) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Você não possui acesso ativo para este conteúdo (ou o acesso expirou/foi revogado).',
      }),
      { status: 403, headers: PRIVATE_HEADERS }
    );
  }

  if (wantsDownload && matching.allowDownload !== true) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Download não autorizado para este conteúdo. Disponível apenas para visualização.',
      }),
      { status: 403, headers: PRIVATE_HEADERS }
    );
  }

  if (!mediaPathMatchesResource(mediaPath, matching.resourceId) && !mediaPathMatchesResource(mediaPath, matching.orderRef)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Arquivo não pertence ao conteúdo autorizado.',
      }),
      { status: 403, headers: PRIVATE_HEADERS }
    );
  }

  const signed = await signPrivateMediaUrl({
    mediaPath,
    profileId: auth.profile.id,
    allowDownload: wantsDownload,
    secret,
    ttlSeconds: DEFAULT_SIGNED_MEDIA_TTL_SECONDS,
  });

  if (!signed) {
    return new Response(
      JSON.stringify({ success: false, error: 'Caminho de mídia inválido.' }),
      { status: 400, headers: PRIVATE_HEADERS }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      signedUrl: signed.signedUrl,
      expiresAt: signed.expiresAt,
      ttlSeconds: signed.ttlSeconds,
      downloadAuthorized: wantsDownload,
    }),
    { status: 200, headers: PRIVATE_HEADERS }
  );
};
