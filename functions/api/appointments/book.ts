/**
 * Cloudflare Pages Function: POST /api/appointments/book
 * 
 * Criação segura e atômica de agendamento de chamada por vídeo:
 * 1. Validação estrita de horários e fuso horário no PostgreSQL Supabase
 * 2. Preço autoritativo validado no servidor
 * 3. Pré-persistência da reserva para proteção de concorrência
 * 4. Emissão do Pix oficial via Mercado Pago
 * 5. Registro na tabela orders do Supabase para conciliação
 */

import {
  DEFAULT_MODALITIES,
  DEFAULT_SCHEDULE_SETTINGS,
  DEFAULT_APPOINTMENTS_TIMEZONE,
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
  listAppointmentsForScheduleDateFromSupabase,
  saveAppointmentToSupabase,
  reserveAppointmentAtomically,
  saveOrderToSupabase,
  expirePendingAppointmentsFromSupabase,
} from '../_supabaseStore';
import { recordAuditEvent } from '../_auditHelper';
import { resolveCustomerSession } from '../id/_customerGuard';
import { claimOrderForProfile } from '../id/_nuaIdStore';
import { checkAndConsumeRateLimit } from '../id/_rateLimiter';
import { getClientIp, sha256Hex } from '../id/_crypto';
import {
  buildDiscreetPaymentDescription,
  createMercadoPagoPix,
  resolveFallbackPayerEmail,
} from '../_mercadopago';
import { CHAMADAS_PUBLIC_ENABLED } from '../../../lib/featureFlags';

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
  if (!CHAMADAS_PUBLIC_ENABLED) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'O agendamento de chamadas privativas está temporariamente pausado e será liberado em breve.',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { request, env } = context;

  try {
    const body = await request.json().catch(() => ({}));

    // Verificação Cloudflare Turnstile contra DoS de agenda VIP (NUA-AUD-007)
    const { verifyTurnstileToken } = await import('../id/_turnstile');
    const ts = await verifyTurnstileToken(env, body.turnstileToken, getClientIp(request), request.url);
    if (!ts.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: ts.error || 'Verificação de segurança obrigatória para agendar.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit por IP para prevenir DoS de agenda e abuso da API do Mercado Pago (AUD-024)
    try {
      const ipHash = await sha256Hex(getClientIp(request));
      const rl = await checkAndConsumeRateLimit(env as any, `appointments_book_ip:${ipHash}`, 6, 600);
      if (!rl.allowed) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Muitas tentativas de reserva em sequência. Aguarde alguns minutos e tente novamente.',
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } catch {}

    // 1. Carrega dados diretamente do Supabase PostgreSQL
    const { settings, modalities } = await getAppointmentsSettingsFromSupabase(env);
    await expirePendingAppointmentsFromSupabase(env);
    const existingBookings = await listAppointmentsForScheduleDateFromSupabase(
      env,
      String(body.date || ''),
      settings.timezone || DEFAULT_APPOINTMENTS_TIMEZONE
    );

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
    const publicToken = generatePublicToken(); // tok_...
    const externalReference = `apt_${bookingId}`;

    // Preço estritamente autoritativo do servidor (ignora qualquer valor enviado no body)
    const authoritativePrice = Number(modality.price);

    const scheduleTz = settings.timezone || DEFAULT_APPOINTMENTS_TIMEZONE;
    const clientTz = (body.clientTimezone || 'America/Sao_Paulo').trim();
    const clientContact = validation.normalizedContact || (body.clientPhone || '').trim();
    const contactType = validation.contactType || 'whatsapp';

    // 3. Montagem inicial da reserva (aguardando pagamento)
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
      timezone: scheduleTz,
      clientTimezone: clientTz,
      clientName: (body.clientName || '').trim(),
      clientEmail: (body.clientEmail || '').trim().toLowerCase(),
      clientPhone: clientContact,
      contactType,
      clientNotes: (body.clientNotes || '').trim(),
      status: 'aguardando_pagamento',
      payment: {
        status: 'pending',
        method: 'pix',
        amount: authoritativePrice,
      },
      meeting: {
        platform: settings.meetingPlatform || 'google_meet',
        instructions:
          settings.customMeetingInstructions ||
          'O link da sala privativa será liberado no seu voucher assim que o pagamento for confirmado.',
        visibleToClient: false,
      },
      history: [
        {
          at: nowIso,
          action: 'criada',
          note: `Reserva criada pelo cliente. Aguardando pagamento Pix de ${modality.priceFormatted}.`,
          author: 'client',
        },
      ],
      expiresAt: validation.expiresAt,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 4. Salva a reserva preliminar no Supabase ANTES da chamada do gateway para garantir lock e idempotência
    const reservation = await reserveAppointmentAtomically(env, newBooking, settings.bufferMinutes);
    if (!reservation.success || !reservation.reserved) {
      if (!reservation.success) console.error('[Appointments Book] Falha no RPC transacional:', reservation.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: reservation.reserved === false
            ? 'Este horário acabou de ser reservado. Escolha outro horário disponível.'
            : 'Não foi possível confirmar a vaga no banco de dados. Tente novamente em instantes.',
        }),
        { status: reservation.success ? 409 : 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Emissão do Pix Oficial via Mercado Pago
    let pixPayload = '';
    let pixQrCode = '';
    let transactionId = '';
    let finalAmount = authoritativePrice;
    let effectiveExpiresAt = validation.expiresAt;

    try {
      const mpResult = await createMercadoPagoPix(env, {
        amount: authoritativePrice,
        description: buildDiscreetPaymentDescription(bookingId, env),
        payerEmail: newBooking.clientEmail || resolveFallbackPayerEmail(env),
        payerName: newBooking.clientName || 'Cliente',
        externalReference,
        dateOfExpiration: validation.expiresAt,
      });

      pixPayload = mpResult.qrCode;
      pixQrCode = mpResult.qrCodeBase64;
      transactionId = String(mpResult.id);
      finalAmount = mpResult.amount;
      // Garante compatibilidade entre o hold da reserva e o vencimento efetivo do Pix no Mercado Pago:
      // se o gateway retornar vencimento válido dentro da janela operacional VIP (<= 60 min),
      // mantém a reserva até o maior entre o hold e o vencimento efetivo do Pix para nunca liberar
      // o horário enquanto a cobrança ainda puder ser aprovada.
      const mpExpMs = mpResult.expiresAt ? Date.parse(mpResult.expiresAt) : NaN;
      const holdExpMs = Date.parse(validation.expiresAt);
      if (Number.isFinite(mpExpMs) && Number.isFinite(holdExpMs)) {
        const maxAllowedHoldMs = now.getTime() + 60 * 60 * 1000;
        const coordinatedMs = Math.min(Math.max(holdExpMs, mpExpMs), maxAllowedHoldMs);
        effectiveExpiresAt = new Date(coordinatedMs).toISOString();
      }
    } catch (mpErr: any) {
      console.error('[Mercado Pago Book Error]:', mpErr);
      // Falha ou timeout pode ocorrer depois de o gateway ter recebido a cobrança.
      // Mantenha a vaga reservada só até expiresAt para evitar duplicar agendamento.
      newBooking.history.push({ at: new Date().toISOString(), action: 'falha_ao_criar_pix', note: 'Não foi possível confirmar a resposta do Mercado Pago. A vaga ficará reservada até o prazo de pagamento e o suporte poderá localizar a cobrança pela referência externa.', author: 'system' });
      const failedPixSave = await saveAppointmentToSupabase(env, newBooking);
      if (!failedPixSave.success) console.error('[Appointments Book] Não foi possível registrar a falha do Pix:', failedPixSave.error);

      return new Response(
        JSON.stringify({
          success: false,
          error: mpErr?.message || 'Não foi possível gerar o Pix no momento. Por favor, tente novamente.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!pixPayload) {
      newBooking.history.push({ at: new Date().toISOString(), action: 'pix_sem_codigo', note: 'Mercado Pago não retornou o código Pix. A vaga ficará reservada até o prazo de pagamento para permitir conciliação segura.', author: 'system' });
      const missingPixSave = await saveAppointmentToSupabase(env, newBooking);
      if (!missingPixSave.success) console.error('[Appointments Book] Não foi possível registrar o Pix incompleto:', missingPixSave.error);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Gateway Pix não retornou o código de pagamento. Tente novamente em instantes.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 6. Atualiza a reserva com dados reais do Pix
    newBooking.expiresAt = effectiveExpiresAt;
    newBooking.payment.pixPayload = pixPayload;
    newBooking.payment.pixQrCode = pixQrCode;
    newBooking.payment.transactionId = transactionId;
    newBooking.payment.amount = finalAmount;
    const paymentSave = await saveAppointmentToSupabase(env, newBooking);
    if (!paymentSave.success) {
      console.error('[Appointments Book] Cobrança criada, falha ao persistir os dados do Pix:', paymentSave.error);
      return new Response(JSON.stringify({
        success: false,
        error: 'O Mercado Pago recebeu a solicitação, mas não conseguimos concluir o registro com segurança. Não tente pagar novamente; entre em contato para conferirmos o pagamento.',
        bookingToken: publicToken,
      }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }

    // 7. Registra na tabela orders para conciliação financeira universal
    const orderSave = await saveOrderToSupabase(env, {
      id: bookingId,
      purchaseToken: publicToken,
      packId: modality.id,
      amount: authoritativePrice,
      status: 'pending',
      customerEmail: newBooking.clientEmail,
      customerName: newBooking.clientName,
      paymentId: transactionId,
      paymentMethod: 'mercadopago_pix',
      expiresAt: effectiveExpiresAt,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    if (!orderSave.success) {
      console.error('[Appointments Book] Pix e reserva persistidos, falha no registro de conciliação:', orderSave.error);
      return new Response(JSON.stringify({
        success: false,
        error: 'O Pix e a reserva foram registrados, mas a conciliação ainda não foi concluída. Não pague novamente; atualize o voucher ou entre em contato.',
        bookingToken: publicToken,
      }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }

    // 7.1 Vínculo automático com a conta NUA ID autenticada (se houver sessão ativa)
    try {
      const customerCtx = await resolveCustomerSession(request, env as any);
      if (customerCtx?.profile?.id) {
        await claimOrderForProfile(env as any, bookingId, customerCtx.profile.id, 'checkout_authenticated');
      }
    } catch {}

    // 8. Registra evento de auditoria
    recordAuditEvent(env, request, {
      type: 'APPOINTMENT_CREATED' as any,
      summary: `Novo agendamento de chamada: ${modality.name} em ${newBooking.date} às ${newBooking.startTime}`,
      details: {
        bookingId,
        date: newBooking.date,
        startTime: newBooking.startTime,
        clientName: newBooking.clientName,
        transactionId,
      },
    }).catch(() => {});

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
      JSON.stringify({ success: false, error: 'Erro ao processar reserva.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
