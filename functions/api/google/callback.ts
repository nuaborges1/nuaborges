import { getAdminSessionSecret } from '../_central/secrets';
import { getSupabaseClient } from '../_supabaseClient';
import { encryptToken, verifyOAuthState } from './_googleCrypto';
import { GoogleEnv } from './_googleMeetService';

function getCookieValue(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function redirectToAdmin(request: Request, status: string, reason?: string): Response {
  const reqUrl = new URL(request.url);
  const target = new URL('/admin', reqUrl.origin);
  target.searchParams.set('tab', 'configuracoes');
  target.searchParams.set('google_meet', status);
  if (reason) target.searchParams.set('reason', reason);

  const headers = new Headers();
  headers.set('Location', target.toString());
  // Limpa cookies temporários de PKCE e nonce
  headers.append('Set-Cookie', 'nua_google_pkce=; HttpOnly; Path=/api/google/callback; Max-Age=0');
  headers.append('Set-Cookie', 'nua_google_nonce=; HttpOnly; Path=/api/google/callback; Max-Age=0');
  return new Response(null, { status: 302, headers });
}

export const onRequestGet = async (context: { request: Request; env: GoogleEnv }) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const errorParam = url.searchParams.get('error');
  if (errorParam) {
    return redirectToAdmin(request, 'error', 'access_denied');
  }

  const code = url.searchParams.get('code') || '';
  const stateToken = url.searchParams.get('state') || '';
  const stateSecret = getAdminSessionSecret(env) || env.GOOGLE_TOKEN_ENCRYPTION_KEY || '';
  const pkceVerifier = getCookieValue(request, 'nua_google_pkce');
  const cookieNonce = getCookieValue(request, 'nua_google_nonce');

  if (!code || !stateToken || !stateSecret || !pkceVerifier || !cookieNonce) {
    return redirectToAdmin(request, 'error', 'invalid_state');
  }

  const statePayload = await verifyOAuthState<{ nonce: string; exp: number }>(
    stateToken,
    stateSecret
  );
  if (
    !statePayload ||
    statePayload.nonce !== cookieNonce ||
    !statePayload.exp ||
    Date.now() > statePayload.exp
  ) {
    return redirectToAdmin(request, 'error', 'expired_state');
  }

  const clientId = env.GOOGLE_CLIENT_ID || '';
  const clientSecret = env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri = env.GOOGLE_REDIRECT_URI || '';
  const encKey = env.GOOGLE_TOKEN_ENCRYPTION_KEY || '';

  if (!clientId || !clientSecret || !redirectUri || !encKey) {
    return redirectToAdmin(request, 'error', 'missing_config');
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code_verifier: pkceVerifier,
      grant_type: 'authorization_code',
    }),
  });

  const tokenData: any = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokenData.access_token) {
    return redirectToAdmin(request, 'error', 'token_exchange_failed');
  }

  // Verifica identidade real da conta conectada via OpenID Connect userinfo
  const userRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const userInfo: any = userRes.ok ? await userRes.json().catch(() => null) : null;
  const connectedEmail = String(userInfo?.email || '').trim().toLowerCase();
  const emailVerified = Boolean(userInfo?.email_verified);

  if (!connectedEmail || !emailVerified) {
    return redirectToAdmin(request, 'error', 'unverified_email');
  }

  const allowedEmail = String(env.GOOGLE_ALLOWED_EMAIL || '').trim().toLowerCase();
  if (allowedEmail && connectedEmail !== allowedEmail) {
    return redirectToAdmin(request, 'error', 'unauthorized_account');
  }

  const supabase = getSupabaseClient(env);
  if (!supabase) {
    return redirectToAdmin(request, 'error', 'db_unavailable');
  }

  const { data: existing } = await supabase
    .from('google_oauth_tokens')
    .select('encrypted_refresh_token')
    .eq('id', 'primary')
    .maybeSingle();

  const encryptedRefresh = tokenData.refresh_token
    ? await encryptToken(tokenData.refresh_token, encKey)
    : existing?.encrypted_refresh_token || '';

  if (!encryptedRefresh) {
    return redirectToAdmin(request, 'error', 'missing_refresh_token');
  }

  const encryptedAccess = await encryptToken(tokenData.access_token, encKey);
  const expiresAt = new Date(
    Date.now() + Number(tokenData.expires_in || 3600) * 1000
  ).toISOString();

  await supabase.from('google_oauth_tokens').upsert({
    id: 'primary',
    email: connectedEmail,
    encrypted_refresh_token: encryptedRefresh,
    encrypted_access_token: encryptedAccess,
    access_token_expires_at: expiresAt,
    scope: String(tokenData.scope || ''),
    status: 'connected',
    last_error: null,
    connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return redirectToAdmin(request, 'connected');
};
