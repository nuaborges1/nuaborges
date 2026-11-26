import { verifyAdminRequest } from './_googleAdminAuth';
import { getGoogleTokenRecord, GoogleEnv, isGoogleMeetAutoEnabled } from './_googleMeetService';

export const onRequestGet = async (context: { request: Request; env: GoogleEnv }) => {
  const { request, env } = context;
  const auth = await verifyAdminRequest(request, env);
  if (!auth.ok) {
    return new Response(JSON.stringify({ success: false, error: 'Não autorizado.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const record = await getGoogleTokenRecord(env);
  const connected = Boolean(record && record.status === 'connected');
  const needsAttention = Boolean(record && (record.status === 'expired' || record.status === 'error'));

  return new Response(
    JSON.stringify({
      success: true,
      connected,
      needsAttention,
      status: record?.status || 'disconnected',
      email: record?.email || null,
      connectedAt: record?.connected_at || null,
      autoEnabled: isGoogleMeetAutoEnabled(env),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    }
  );
};
