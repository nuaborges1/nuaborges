/**
 * Cloudflare Pages Function: /api/appointments/sync
 *
 * Endpoint para sincronização administrativa de agendamentos no Supabase PostgreSQL.
 */

import { AppointmentBooking } from '../../../lib/appointmentsCanonical';
import {
  verifySessionToken,
  getSessionCookie,
  timingSafeEqualString,
} from '../_authHelper';
import { saveAppointmentToSupabase } from '../_supabaseStore';

interface Env {
  ADMIN_API_SECRET?: string;
  ADMIN_PASSWORD?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  [key: string]: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  // 0. Validação de Autorização Administrativa Estrita (com checagem de role)
  const authHeader = request.headers.get('Authorization');
  const sessionCookie = getSessionCookie(request);
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : sessionCookie;
  const { getAdminSessionSecret } = await import('../_central/secrets');
  const secret = getAdminSessionSecret(env);

  const hasDedicatedApiSecret = Boolean(
    env.ADMIN_API_SECRET &&
      env.ADMIN_API_SECRET.length >= 24 &&
      env.ADMIN_API_SECRET !== env.ADMIN_PASSWORD
  );
  let isAuth = false;
  if (secret && token) {
    const verified = await verifySessionToken(token, secret);
    if (verified === true || (verified && ['dev', 'admin', 'client'].includes((verified as any).role))) {
      isAuth = true;
    } else if (hasDedicatedApiSecret && (await timingSafeEqualString(token, env.ADMIN_API_SECRET!))) {
      isAuth = true;
    }
  }

  if (!isAuth) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Acesso não autorizado. Permissão administrativa necessária para sincronização.',
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body: any = await request.json().catch(() => ({}));
    const incomingBookings: AppointmentBooking[] = Array.isArray(body.bookings)
      ? body.bookings
      : body.booking
      ? [body.booking]
      : [];

    if (incomingBookings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, count: 0, message: 'Nenhuma reserva fornecida.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let syncedCount = 0;

    for (const b of incomingBookings.slice(0, 50)) {
      if (!b || (!b.id && !b.publicToken)) continue;
      const targetId = b.id || `app_${Date.now()}`;
      b.id = targetId;
      b.updatedAt = new Date().toISOString();

      const res = await saveAppointmentToSupabase(env, b);
      if (res.success) {
        syncedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: syncedCount,
        message: `${syncedCount} agendamento(s) sincronizado(s) no Supabase com sucesso.`,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[/api/appointments/sync] Erro:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro interno ao sincronizar agendamentos.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const onRequestGet = async () => {
  return new Response(
    JSON.stringify({
      success: true,
      service: 'Nua Borges Appointments Sync Service (Supabase PostgreSQL)',
      status: 'active',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

export const onRequest = onRequestPost;
