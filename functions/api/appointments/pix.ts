/**
 * Cloudflare Pages Function: POST /api/appointments/pix
 * 
 * Verificação e consulta do Pix de agendamentos no Supabase PostgreSQL.
 * Retorna dados sanitizados para proteger PII do cliente (SEC-11).
 */

import { AppointmentBooking } from '../../../lib/appointmentsCanonical';
import { getMercadoPagoPayment } from '../_mercadopago';
import { getStripePaymentIntent } from '../_stripe';
import {
  getAppointmentByIdFromSupabase,
  saveAppointmentToSupabase,
  updateOrderInSupabase,
} from '../_supabaseStore';

interface Env {
  STRIPE_SECRET_KEY?: string;
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

    // Se ainda não está confirmada, checa o status de pagamento
    if (!isPaid && booking.payment?.transactionId) {
      const txId = booking.payment.transactionId;

      // 1. Consulta oficial Stripe se for stripe_pix ou ID iniciar com 'pi_'
      if (booking.payment.method === 'stripe_pix' || txId.startsWith('pi_')) {
        try {
          const stripeStatus = await getStripePaymentIntent(env, txId);
          if (stripeStatus.success && stripeStatus.isPaid) {
            booking.status = 'confirmada';
            booking.payment.status = 'approved';
            booking.payment.paidAt = new Date().toISOString();
            booking.payment.amount = stripeStatus.amount;
            if (!Array.isArray(booking.history)) {
              booking.history = [];
            }
            booking.history.push({
              at: new Date().toISOString(),
              action: 'pagamento_confirmado',
              note: `Pagamento Pix de R$ ${stripeStatus.amount.toFixed(2)} aprovado via Stripe (ID: ${txId}).`,
              author: 'system',
            });
            booking.updatedAt = new Date().toISOString();

            await saveAppointmentToSupabase(env, booking);
            await updateOrderInSupabase(env, bookingId, {
              status: 'paid',
              paid_at: booking.payment.paidAt,
            });
            isPaid = true;
          }
        } catch (stripeErr) {
          console.warn(`[Pix Check Contingency Stripe Error for ${bookingId}]:`, stripeErr);
        }
      } else {
        // 2. Consulta de contingência para agendamentos legados via Mercado Pago
        try {
          const mpStatus = await getMercadoPagoPayment(env, txId);
          if (mpStatus.success && mpStatus.status === 'approved') {
            booking.status = 'confirmada';
            booking.payment.status = 'approved';
            booking.payment.paidAt = mpStatus.dateApproved || new Date().toISOString();
            booking.payment.amount = mpStatus.amount;
            if (!Array.isArray(booking.history)) {
              booking.history = [];
            }
            booking.history.push({
              at: new Date().toISOString(),
              action: 'pagamento_confirmado',
              note: `Pagamento Pix de R$ ${mpStatus.amount.toFixed(2)} aprovado no Mercado Pago (ID: ${txId}).`,
              author: 'system',
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
          console.warn(`[Pix Check Contingency Legacy MP Error for ${bookingId}]:`, mpErr);
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
