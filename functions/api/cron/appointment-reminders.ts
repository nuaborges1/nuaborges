import { setSystemKVInSupabase } from '../_supabaseStore';
import type { ContainmentRecord } from '../_central/containment';
/**
 * Cloudflare Pages Function: POST /api/cron/appointment-reminders
 *
 * Acionado periodicamente (ex: a cada 15 min) pelo Cloudflare Cron Worker
 * em `workers/reminders-cron`.
 *
 * Regras estritas de sincronização e segurança:
 * 1. Exige cabeçalho `Authorization: Bearer <CRON_SECRET>` comparado em tempo constante.
 * 2. Considera APENAS Chamadas VIP com `status === 'confirmada'` e pagamento aprovado.
 * 3. Dois estágios de lembrete:
 *    - `day_of`: no dia da chamada (horário de Brasília, a partir de 07:00), se faltarem > 75 min.
 *    - `one_hour_before`: entre 15 e 75 minutos antes do horário UTC de início.
 * 4. Deduplicação estrita por chave `reminder:<id>:<date>T<startTime>:<stage>`:
 *    - Se a chamada for reagendada, `date`/`startTime` mudam e o novo horário recebe lembrete.
 *    - Se for cancelada, concluída ou não paga, é ignorada automaticamente.
 */

import { retryConfirmedRefunds } from '../payments/_refundEngine';
import { retryPaidOrderEmails } from '../payments/_orderFulfillment';
import { retryVaultMail } from '../me/_vaultMail';
import { listAppointmentsFromSupabase } from '../_supabaseStore';
import {
  getNuaIdAdapter,
  getProfileByEmail,
  NuaIdEnv,
  recordNotificationEvent,
} from '../id/_nuaIdStore';
import { timingSafeEqual } from '../id/_crypto';
import { renderAppointmentReminderEmailHtml } from '../id/_emailTemplates';
import { dispatchTransactionalEmail } from '../id/_emailDispatch';
import {
  convertSlotBetweenTimezones,
  formatDateForDisplay,
  formatDualTimezone,
} from '../../../lib/appointmentsCanonical';

interface CronEnv extends NuaIdEnv {
  CRON_SECRET?: string;
  SITE_URL?: string;
}

type PagesContext<T = any> = {
  data?: { containments?: ContainmentRecord[] };
  request: Request;
  env: T;
};

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

function getTimezoneParts(date: Date, timeZone: string): { dateKey: string; hour: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
    }).formatToParts(date);
  } catch {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
    }).formatToParts(date);
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '00';
  const hour = Number(get('hour')) % 24;
  return {
    dateKey: `${get('year')}-${get('month')}-${get('day')}`,
    hour,
  };
}

async function handleReminderSweep(request: Request, env: CronEnv, containment?: ContainmentRecord[]): Promise<Response> {
  const configuredSecret = String(env.CRON_SECRET || '').trim();
  if (!configuredSecret) {
    return new Response(
      JSON.stringify({ success: false, error: 'CRON_SECRET não configurado no servidor.' }),
      { status: 503, headers: JSON_HEADERS }
    );
  }

  const explicitHeader = (request.headers.get('x-cron-secret') || '').trim();
  const authHeader = request.headers.get('Authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const token = explicitHeader || bearerToken;
  if (!token || !timingSafeEqual(token, configuredSecret)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Não autorizado.' }),
      { status: 401, headers: JSON_HEADERS }
    );
  }

  const quarantined = containment?.some((record) => record.protocol === 'kaguya'
    && record.active && record.scopes.includes('mercadopago'));
  const recovery = {
    vault: await retryVaultMail(env).catch(() => null),
    paidEmail: await retryPaidOrderEmails(env).catch(() => null),
    refunds: quarantined ? null : await retryConfirmedRefunds(env).catch(() => null),
    refundsPaused: Boolean(quarantined), at: new Date().toISOString(),
  };
  await setSystemKVInSupabase(env, 'system:recovery:latest', recovery, 'cron');

  const adapter = getNuaIdAdapter(env);
  const siteUrl = (env.SITE_URL || 'https://nuaborges.com.br').replace(/\/$/, '');
  const now = new Date();
  const nowMs = now.getTime();

  let appointments: any[] = [];
  try {
    appointments = await listAppointmentsFromSupabase(env as any);
  } catch (err: any) {
    console.error('[CronReminders] Falha ao consultar agendamentos no Supabase:', err?.message || err);
    return new Response(
      JSON.stringify({ success: false, error: 'Falha ao consultar agendamentos no banco de dados.' }),
      { status: 503, headers: JSON_HEADERS }
    );
  }
  const confirmedPaid = appointments.filter(
    (b) =>
      b.status === 'confirmada' &&
      (b.payment?.status === 'approved' || b.payment?.status === 'manual_confirmed') &&
      Boolean(b.clientEmail && b.clientEmail.includes('@')) &&
      Boolean(b.date && b.startTime)
  );

  let sent = 0;
  let skipped = 0;
  const errors: Array<{ bookingId: string; stage: string; error: string }> = [];

  for (const booking of confirmedPaid) {
    const scheduleTz = booking.timezone || 'Europe/Dublin';
    const utcSlot = convertSlotBetweenTimezones(booking.date, booking.startTime, scheduleTz, 'UTC');
    const startUtc = new Date(`${utcSlot.date}T${utcSlot.time}:00.000Z`);
    if (Number.isNaN(startUtc.getTime())) {
      skipped += 1;
      continue;
    }

    const diffMin = Math.round((startUtc.getTime() - nowMs) / 60000);
    if (diffMin < 15) {
      // Já começou ou já passou
      skipped += 1;
      continue;
    }

    const clientTz = booking.clientTimezone || 'America/Sao_Paulo';
    const nowClient = getTimezoneParts(now, clientTz);
    const callClient = getTimezoneParts(startUtc, clientTz);
    let stage: 'day_of' | 'one_hour_before' | null = null;
    if (diffMin >= 15 && diffMin <= 75) {
      stage = 'one_hour_before';
    } else if (callClient.dateKey === nowClient.dateKey && nowClient.hour >= 7 && diffMin > 75) {
      stage = 'day_of';
    }

    if (!stage) {
      skipped += 1;
      continue;
    }

    const dedupeKey = `reminder:${booking.id}:${booking.date}T${booking.startTime}:${stage}`;
    const kvFlagKey = `nua_id:reminder_sent:${dedupeKey}`;

    // Reserva atômica ANTES do envio para evitar duplicação em execuções paralelas (AUD-052)
    if (adapter) {
      if (typeof adapter.kvCreate === 'function') {
        const reservation = {
          bookingId: booking.id,
          stage,
          slot: booking.date + 'T' + booking.startTime,
          status: 'sending',
          next: Date.now() + 10 * 60_000,
        };
        let reserved = await adapter.kvCreate(kvFlagKey, reservation);
        if (!reserved && adapter.kvLease) {
          const previous = await adapter.kvGet<{ status?: string; next?: number }>(kvFlagKey);
          if (previous?.status === 'sending' && typeof previous.next === 'number' && previous.next <= Date.now()) {
            reserved = await adapter.kvLease(kvFlagKey, previous.next, reservation);
          }
        }
        if (!reserved) {
          skipped += 1;
          continue;
        }
      } else {
        const alreadySent = await adapter.kvGet<{ sentAt: string }>(kvFlagKey);
        if (alreadySent?.sentAt) {
          skipped += 1;
          continue;
        }
      }
    }

    const dual = formatDualTimezone(
      booking.date,
      booking.startTime,
      booking.endTime,
      scheduleTz,
      booking.clientTimezone || 'America/Sao_Paulo'
    );
    const tpl = renderAppointmentReminderEmailHtml({
      clientName: booking.clientName || 'Cliente',
      modalityName: booking.modalityName || 'Chamada VIP',
      dateFormatted: formatDateForDisplay(booking.date),
      dualTimeCombined: dual.combined,
      stage,
      accountUrl: `${siteUrl}/conta?tab=chamadas`,
      voucherUrl: `${siteUrl}/chamadas/reserva?token=${encodeURIComponent(booking.publicToken || booking.id)}`,
      meetingUrl: booking.meeting?.url || null,
    });

    const profile = await getProfileByEmail(env, booking.clientEmail).catch(() => null);
    const dispatchRes = await dispatchTransactionalEmail(env, {
      to: booking.clientEmail,
      subject: tpl.subject,
      html: tpl.html,
      meta: {
        kind: 'appointment_reminder',
        bookingId: booking.id,
        stage,
      },
    });

    await recordNotificationEvent(env, {
      profileId: profile?.id || null,
      recipientEmail: booking.clientEmail,
      kind: 'appointment_reminder',
      status: dispatchRes.sent ? 'sent' : 'failed',
      errorMessage: dispatchRes.error,
    }).catch(() => {});

    if (dispatchRes.sent) {
      if (adapter) {
        await adapter.kvSet(kvFlagKey, {
          sentAt: now.toISOString(),
          bookingId: booking.id,
          stage,
          slot: `${booking.date}T${booking.startTime}`,
          status: 'sent',
        });
      }
      sent += 1;
    } else {
      // Libera a reserva atômica para permitir nova tentativa na próxima execução do cron
      if (adapter) {
        await adapter.kvDelete(kvFlagKey).catch(() => {});
      }
      errors.push({
        bookingId: booking.id,
        stage,
        error: dispatchRes.error || 'Falha ao enviar lembrete.',
      });
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      recovery,
      checked: confirmedPaid.length,
      sent,
      skipped,
      errors,
      timestamp: now.toISOString(),
    }),
    { status: 200, headers: JSON_HEADERS }
  );
}

export const onRequestPost = async (context: PagesContext<CronEnv>) => {
  return handleReminderSweep(context.request, context.env, context.data?.containments);
};
