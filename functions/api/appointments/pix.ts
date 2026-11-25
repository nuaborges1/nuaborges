/**
 * Cloudflare Pages Function: POST /api/appointments/pix
 *
 * Verificação e consulta do Pix de agendamentos no Supabase PostgreSQL.
 * Retorna dados sanitizados para proteger PII do cliente (SEC-11).
 */

import { AppointmentBooking, timeStringToMinutes } from '../../../lib/appointmentsCanonical';
import { getMercadoPagoPayment } from '../_mercadopago';
import { queuePaidOrderEmail } from '../payments/_orderFulfillment';
import {
  getAppointmentByIdFromSupabase,
  getAppointmentsSettingsFromSupabase,
  listAppointmentsForScheduleDateFromSupabase,
  expirePendingAppointmentsFromSupabase,
  saveAppointmentToSupabase,
  updateOrderInSupabase,
} from '../_supabaseStore';

interface Env {
  MP_ACCESS_TOKEN?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  [key: string]: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  try {
    const body = await request.json().catch(() => ({}));
    const publicToken = String(body.publicToken || body.token || '').trim();

    if (!publicToken.startsWith('tok_') || publicToken.length < 20) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token privado do voucher obrigatório.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await expirePendingAppointmentsFromSupabase(env).catch(() => {});
    const booking: AppointmentBooking | null = await getAppointmentByIdFromSupabase(env, publicToken);

    if (!booking || booking.publicToken !== publicToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Reserva não encontrada.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(booking.history)) booking.history = [];

    const isAlreadySettled =
      ['confirmada', 'concluida', 'nao_compareceu', 'reagendamento_pendente'].includes(booking.status) &&
      (booking.payment?.status === 'approved' || booking.payment?.status === 'manual_confirmed');
    let isPaid = isAlreadySettled;

    // Só consulta o Mercado Pago se a reserva ainda estiver aguardando pagamento ou cancelada com pagamento pendente
    if (!isPaid && booking.payment?.transactionId && ['aguardando_pagamento', 'cancelada'].includes(booking.status)) {
      const txId = booking.payment.transactionId;
      try {
        const mpStatus = await getMercadoPagoPayment(env, txId);
        const expectedAmount = Number(booking.price || booking.payment?.amount || 0);
        const amountValid = Number(mpStatus.amount || 0) + 0.01 >= expectedAmount;
        const currencyValid = String(mpStatus.raw?.currency_id || 'BRL').toUpperCase() === 'BRL';
        const extRef = String(mpStatus.externalReference || '').trim();
        const refValid = !extRef || extRef === `apt_${booking.id}` || extRef === booking.id;

        if (mpStatus.success && mpStatus.status === 'approved' && amountValid && currencyValid && refValid) {
          // Verifica se o horário foi ocupado por outra pessoa caso a reserva tivesse expirado
          let hasSlotConflict = false;
          if (booking.status === 'cancelada') {
            hasSlotConflict = true;
          } else {
            try {
              const { settings } = await getAppointmentsSettingsFromSupabase(env);
              const bufferMin = Number(settings.bufferMinutes || 0);
              const sameDayBookings = await listAppointmentsForScheduleDateFromSupabase(
                env,
                booking.date,
                booking.timezone || settings.timezone
              );
              const myStart = timeStringToMinutes(booking.startTime);
              const myEnd = timeStringToMinutes(booking.endTime);
              hasSlotConflict = sameDayBookings.some((other) => {
                if (other.id === booking.id || other.status === 'cancelada') return false;
                const oStart = timeStringToMinutes(other.startTime);
                const oEnd = timeStringToMinutes(other.endTime) + bufferMin;
                return myStart < oEnd && myEnd + bufferMin > oStart;
              });
            } catch (conflictErr) {
              console.error('[Pix Polling] Falha ao checar conflito de agenda (fail-closed):', conflictErr);
              return new Response(
                JSON.stringify({
                  success: false,
                  error: 'Não foi possível validar a disponibilidade do horário no momento. Tente novamente.',
                }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
              );
            }
          }

          if (booking.status === 'cancelada' || hasSlotConflict) {
            const alreadyRefunded = booking.refundStatus === 'completed' || booking.payment.status === 'refunded';
            booking.status = 'cancelada';
            booking.payment.status = alreadyRefunded ? 'refunded' : 'approved';
            booking.payment.amount = mpStatus.amount;
            booking.payment.paidAt = mpStatus.dateApproved || new Date().toISOString();
            booking.refundStatus = alreadyRefunded ? 'completed' : 'pending';
            if (!booking.history.some((h: any) => h.action === 'pagamento_tardio_apos_cancelamento')) {
              booking.history.push({
                at: new Date().toISOString(),
                action: 'pagamento_tardio_apos_cancelamento',
                note: 'O Pix foi aprovado depois da expiração/cancelamento. A reserva permaneceu cancelada e a devolução fica disponível para confirmação no painel.',
                author: 'system',
              });
            }
            booking.updatedAt = new Date().toISOString();
            const pendingSave = await saveAppointmentToSupabase(env, booking);
            if (!pendingSave.success) {
              throw new Error('Não foi possível salvar o pagamento aprovado após o cancelamento.');
            }
            await updateOrderInSupabase(env, booking.id, {
              status: alreadyRefunded ? 'refunded' : 'paid',
              paid_at: booking.payment.paidAt,
            });
          } else {
            booking.status = 'confirmada';
            booking.payment.status = 'approved';
            booking.payment.paidAt = mpStatus.dateApproved || new Date().toISOString();
            booking.payment.amount = mpStatus.amount;
            if (booking.meeting) {
              booking.meeting.visibleToClient = true;
            }
            booking.history.push({
              at: new Date().toISOString(),
              action: 'pagamento_confirmado',
              note: `Pagamento Pix de R$ ${mpStatus.amount.toFixed(2)} aprovado no Mercado Pago (ID: ${txId}).`,
              author: 'mercadopago_webhook',
            });
            booking.updatedAt = new Date().toISOString();

            // 1. Persiste no banco ANTES de enviar e-mail
            const confirmedSave = await saveAppointmentToSupabase(env, booking);
            if (confirmedSave.success) {
              await updateOrderInSupabase(env, booking.id, {
                status: 'paid',
                paid_at: booking.payment.paidAt,
              });
              isPaid = true;

              // 2. Disparo idempotente unificado de e-mail + registro financeiro (sem duplicidade com webhook)
              try {
                await queuePaidOrderEmail(env, 'vip', booking.id);
              } catch (err) {
                console.error('[Pix Polling] Erro ao finalizar notificação de confirmação:', err);
              }
            }
          }
        }
      } catch (mpErr) {
        console.warn(`[Pix Check MP Error for ${booking.id}]:`, mpErr);
      }
    }

    // Retorna resposta sanitizada mantendo campos de exibição do voucher
    const sanitizedBooking = {
      id: booking.id,
      publicToken: booking.publicToken,
      modalityName: booking.modalityName,
      durationMinutes: booking.durationMinutes,
      price: booking.price,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      timezone: booking.timezone,
      clientTimezone: booking.clientTimezone,
      clientName: booking.clientName,
      status: booking.status,
      payment: {
        status: booking.payment?.status,
        amount: booking.payment?.amount,
        pixPayload: booking.status === 'aguardando_pagamento' ? booking.payment?.pixPayload : undefined,
        pixQrCode: booking.status === 'aguardando_pagamento' ? booking.payment?.pixQrCode : undefined,
      },
      meeting: {
        platform: booking.meeting?.platform,
        url: isPaid && booking.status === 'confirmada' ? booking.meeting?.url : undefined,
        instructions: isPaid && booking.status === 'confirmada' ? booking.meeting?.instructions : undefined,
      },
      refundStatus: booking.refundStatus,
    };

    return new Response(
      JSON.stringify({
        success: true,
        paid: isPaid && booking.status === 'confirmada',
        booking: sanitizedBooking,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Erro ao verificar Pix.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
