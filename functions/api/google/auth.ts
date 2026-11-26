import { getAdminSessionSecret } from '../_central/secrets';
import { verifyAdminRequest } from './_googleAdminAuth';
import { generatePkceChallenge, generatePkceVerifier, signOAuthState } from './_googleCrypto';
import { GoogleEnv } from './_googleMeetService';

export const onRequestGet = async (context: { request: Request; env: GoogleEnv }) => {
  const { request, env } = context;
  const auth = await verifyAdminRequest(request, env);
  if (!auth.ok) {
    return new Response(JSON.stringify({ success: false, error: 'Não autorizado.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const clientId = env.GOOGLE_CLIENT_ID;
  const redirectUri = env.GOOGLE_REDIRECT_URI;
  const stateSecret = getAdminSessionSecret(env) || env.GOOGLE_TOKEN_ENCRYPTION_KEY;

  if (!clientId || !redirectUri || !stateSecret) {
    return new Response(
      JSON.stringify({ success: false, error: 'Configuração do Google OAuth incompleta.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const verifier = generatePkceVerifier();
  const challenge = await generatePkceChallenge(verifier);
  const nonce = generatePkceVerifier().slice(0, 16);

  const state = await signOAuthState(
    {
      nonce,
      role: auth.role || 'admin',
      exp: Date.now() + 10 * 60 * 1000, // 10 minutos
    },
    stateSecret
  );

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set(
    'scope',
    [
      'https://www.googleapis.com/auth/meetings.space.created',
      'https://www.googleapis.com/auth/meetings.space.readonly',
      'openid',
      'email',
    ].join(' ')
  );
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', state);
  if (env.GOOGLE_ALLOWED_EMAIL) {
    url.searchParams.set('login_hint', env.GOOGLE_ALLOWED_EMAIL);
  }

  const isHttps = request.url.startsWith('https://');
  const cookieFlags = `HttpOnly; SameSite=Lax; Path=/api/google/callback; Max-Age=600${
    isHttps ? '; Secure' : ''
  }`;

  const headers = new Headers();
  headers.set('Location', url.toString());
  headers.append('Set-Cookie', `nua_google_pkce=${verifier}; ${cookieFlags}`);
  headers.append('Set-Cookie', `nua_google_nonce=${nonce}; ${cookieFlags}`);

  return new Response(null, { status: 302, headers });
};
