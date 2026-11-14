/**
 * Cloudflare Pages Function: POST /api/appointments/book
 * 
 * Criação segura de agendamento de chamada por vídeo:
 * 1. Validação estrita de horários no PostgreSQL Supabase (conflitos, antecedência, limites)
 * 2. Preço autoritativo validado no servidor
 * 3. Geração do Pix oficial Copia e Cola / QR Code para o valor da modalidade
 * 4. Persistência transacional nas tabelas appointments e orders do Supabase
 */

import {
  DEFAULT_MODALITIES,
  DEFAULT_SCHEDULE_SETTINGS,
  AppointmentBooking,
  AppointmentModality,
  AppointmentScheduleSettings,
  validateBookingAttempt,
} from '../../../lib/appointmentsCanonical';
import {
  generateBookingId,
  generatePublicToken,
} from '../../../lib/appointmentsStore';
import {
  getAppointmentsSettingsFromSupabase,
  listAppointmentsFromSupabase,
  saveAppointmentToSupabase,
  saveOrderToSupabase,
} from '../_supabaseStore';
import { recordAuditEvent } from '../_auditHelper';
import { createMercadoPagoPix } from '../_mercadopago';

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  MP_ACCESS_TOKEN?: string;
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

    // 1. Carrega dados diretamente do Supabase PostgreSQL
    const { settings, modalities } = await getAppointmentsSettingsFromSupabase(env);
    const existingBookings = await listAppointmentsFromSupabase(env, { limit: 100 });

    const now = new Date();
    const nowIso = now.toISOString();

    // 2. Validação atômica da reserva pelo motor canônico contra reservas do Supabase
    const validation = validateBookingAttempt(
      body,
      modalities,
      settings,
      existingBookings,
      now
    );

    if (!validation.success || !validation.modality || !validation.endTime || !validation.expiresAt) {
      return new Response(
        JSON.stringify({
          success: false,
          error: validation.error || 'Horário indisponível. Por favor, escolha outro horário.',
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const modality = validation.modality;
    const bookingId = generateBookingId();
    const publicToken = generatePublicToken();
    const externalReference = `apt_${bookingId}`;

    // Preço estritamente autoritativo do servidor (ignora qualquer valor enviado no body)
    const authoritativePrice = Number(modality.price);

    // 3. Emissão do Pix Oficial via Mercado Pago
    let pixPayload = '';
    let pixQrCode = '';
    let transactionId = '';
    let finalAmount = authoritativePrice;

    try {
      const mpResult = await createMercadoPagoPix(env, {
        amount: authoritativePrice,
        description: `Chamada ${modality.name} — REF: ${bookingId}`,
        payerEmail: body.clientEmail || 'contato@nuaborges.com.br',
        payerName: body.clientName || 'Cliente VIP',
        externalReference,
        notificationUrl: 'https://nuaborges.com.br/api/finance/webhook',
      });

      pixPayload = mpResult.qrCode;
      pixQrCode = mpResult.qrCodeBase64;
      transactionId = String(mpResult.id);
      finalAmount = mpResult.amount;
    } catch (mpErr: any) {
      console.error('[Mercado Pago Book Error]:', mpErr);
      return new Response(
        JSON.stringify({
          success: false,
          error: mpErr?.message || 'Não foi possível gerar o Pix agora. Tente novamente em instantes.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!pixPayload) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Gateway Pix não retornou o código de pagamento. Tente novamente em instantes.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Montagem da reserva canônica
    const newBooking: AppointmentBooking = {
      id: bookingId,
      publicToken,
      modalityId: modality.id,
      modalityName: modality.name,
      durationMinutes: modality.durationMinutes,
      price: authoritativePrice,
      date: body.date,
      startTime: body.startTime,
      endTime: validation.endTime,
      clientName: (body.clientName || '').trim(),
      clientEmail: (body.clientEmail || '').trim().toLowerCase(),
      clientPhone: (body.clientPhone || '').replace(/\D/g, ''),
      clientNotes: (body.clientNotes || '').trim(),
      status: 'aguardando_pagamento',
      payment: {
        status: 'pending',
        method: 'pix',
        amount: finalAmount,
        pixPayload,
        pixQrCode,
        transactionId,
      },
      meeting: {
        platform: settings.meetingPlatform || 'google_meet',
        instructions:
          settings.customMeetingInstructions ||
          'O link da sala privativa será liberado no seu voucher após a confirmação do pagamento.',
        visibleToClient: false,
      },
      history: [
        {
          at: nowIso,
          action: 'criada',
          note: `Reserva iniciada pelo cliente. Aguardando pagamento Pix de ${modality.priceFormatted}.`,
          author: 'client',
        },
      ],
      expiresAt: validation.expiresAt,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 5. Salva na tabela appointments do Supabase PostgreSQL
    const saveRes = await saveAppointmentToSupabase(env, newBooking);
    if (!saveRes.success) {
      console.error('[Appointments Book] Erro ao persistir no Supabase:', saveRes.error);
      return new Response(
        JSON.stringify({ success: false, error: 'Falha ao registrar reserva no banco de dados.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 6. Também registra na tabela orders do Supabase para conciliação financeira
    await saveOrderToSupabase(env, {
      id: bookingId,
      purchaseToken: publicToken,
      packId: modality.id,
      amount: authoritativePrice,
      status: 'pending',
      customerEmail: newBooking.clientEmail,
      customerName: newBooking.clientName,
      paymentId: transactionId,
      paymentMethod: 'mercadopago_pix',
      expiresAt: validation.expiresAt,
      createdAt: nowIso,
      updatedAt: nowIso,
    }).catch((oErr: any) => console.warn('[Appointments Book] Aviso ao registrar order:', oErr));

    // 7. Registra evento de auditoria
    recordAuditEvent(env, request, {
      type: 'CONTACT_MESSAGE_RECEIVED' as any,
      summary: `Novo agendamento de chamada: ${modality.name} em ${newBooking.date} às ${newBooking.startTime}`,
      details: {
        bookingId,
        date: newBooking.date,
        startTime: newBooking.startTime,
        clientName: newBooking.clientName,
      },
    }).catch(() => { });

    return new Response(
      JSON.stringify({
        success: true,
        booking: newBooking,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('[Appointments Book Exception]:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro ao processar reserva.', details: err?.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
