import { currentVisit, privatePath, vaultMediaPath, vaultContents } from './_vault';
import { NuaIdEnv } from '../id/_nuaIdStore';
import { getIdSecret, requireCustomer } from '../id/_customerGuard';
import { DEFAULT_SIGNED_MEDIA_TTL_SECONDS, signPrivateMediaUrl } from './_mediaSigner';

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

  const visit = await currentVisit(request, env);
  const contents = visit && await vaultContents(env, auth.profile.id, visit.order);
  const path = privatePath(mediaPath) || vaultMediaPath(mediaPath);
  if (!contents || contents.right.resourceId !== resourceId || !path || !contents.files.some(f => f.path === path) || (wantsDownload && !contents.right.allowDownload)) {
    return Response.json({error:'Abra o Cofre pelo e-mail da compra.'},{status:403,headers:PRIVATE_HEADERS});
  }
  const signed = await signPrivateMediaUrl({
    mediaPath: path,
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
