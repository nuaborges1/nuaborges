/**
 * Cloudflare Pages Function: POST /api/appointments/pix
 * 
 * Verificação e consulta do Pix de agendamentos no Supabase PostgreSQL.
 * Retorna dados sanitizados para proteger PII do cliente (SEC-11).
 */

import { AppointmentBooking } from '../../../lib/appointmentsCanonical';
import { getMercadoPagoPayment } from '../_mercadopago';
import {
  getAppointmentByIdFromSupabase,
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
    const bookingId = (body.bookingId || body.id || '').trim();

    if (!bookingId) {
      return new Response(
        JSON.stringify({ success: false, error: 'bookingId obrigatório.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let booking: AppointmentBooking | null = await getAppointmentByIdFromSupabase(env, bookingId);

    if (!booking) {
      return new Response(
        JSON.stringify({ success: false, error: 'Reserva não encontrada.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let isPaid = booking.status === 'confirmada';

    // Se ainda não está confirmada, checa o status de pagamento no Mercado Pago
    if (!isPaid && booking.payment?.transactionId) {
      const txId = booking.payment.transactionId;
      try {
        const mpStatus = await getMercadoPagoPayment(env, txId);
        if (mpStatus.success && mpStatus.status === 'approved') {
          booking.status = 'confirmada';
          booking.payment.status = 'approved';
          booking.payment.paidAt = mpStatus.dateApproved || new Date().toISOString();
          booking.payment.amount = mpStatus.amount;
          if (booking.meeting) {
            booking.meeting.visibleToClient = true;
          }
          if (!Array.isArray(booking.history)) {
            booking.history = [];
          }
          booking.history.push({
            at: new Date().toISOString(),
            action: 'pagamento_confirmado',
            note: `Pagamento Pix de R$ ${mpStatus.amount.toFixed(2)} aprovado no Mercado Pago (ID: ${txId}).`,
            author: 'mercadopago_status',
          });
          booking.updatedAt = new Date().toISOString();

          await saveAppointmentToSupabase(env, booking);
          await updateOrderInSupabase(env, bookingId, {
            status: 'paid',
            paid_at: booking.payment.paidAt,
          });
          isPaid = true;
        }
      } catch (mpErr) {
        console.warn(`[Pix Check MP Error for ${bookingId}]:`, mpErr);
      }
    }
    }

    // Retorna resposta sanitizada sem vazar PII completa (SEC-11)
    const sanitizedBooking = {
      id: booking.id,
      publicToken: booking.publicToken,
      modalityName: booking.modalityName,
      durationMinutes: booking.durationMinutes,
      price: booking.price,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
      payment: {
        status: booking.payment?.status,
        amount: booking.payment?.amount,
        pixPayload: isPaid ? undefined : booking.payment?.pixPayload,
        pixQrCode: isPaid ? undefined : booking.payment?.pixQrCode,
      },
      meeting: {
        platform: booking.meeting?.platform,
        url: isPaid ? booking.meeting?.url : undefined,
        instructions: isPaid ? booking.meeting?.instructions : undefined,
      },
    };

    return new Response(
      JSON.stringify({
        success: true,
        paid: isPaid,
        booking: sanitizedBooking,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: 'Erro ao verificar Pix.', details: err?.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
