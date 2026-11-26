import { getSupabaseClient } from '../_supabaseClient';
import { verifyAdminRequest } from './_googleAdminAuth';
import { decryptToken } from './_googleCrypto';
import { getGoogleTokenRecord, GoogleEnv } from './_googleMeetService';

export const onRequestPost = async (context: { request: Request; env: GoogleEnv }) => {
  const { request, env } = context;
  const auth = await verifyAdminRequest(request, env);
  if (!auth.ok) {
    return new Response(JSON.stringify({ success: false, error: 'Não autorizado.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const record = await getGoogleTokenRecord(env);
  const encKey = env.GOOGLE_TOKEN_ENCRYPTION_KEY || '';

  if (record?.encrypted_refresh_token && encKey) {
    try {
      const refreshToken = await decryptToken(record.encrypted_refresh_token, encKey);
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    } catch {
      // Continua para marcar como desconectado no banco mesmo se revogação remota falhar
    }
  }

  const supabase = getSupabaseClient(env);
  if (supabase) {
    await supabase
      .from('google_oauth_tokens')
      .update({
        status: 'revoked',
        encrypted_access_token: null,
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 'primary');
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
