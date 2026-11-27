/**
 * Cloudflare Pages Function: /api/appointments/admin
 *
 * Endpoints Administrativos para Nua Borges:
 * GET : Retorna configurações, modalidades e lista de agendamentos diretamente do PostgreSQL Supabase.
 * POST: Ações administrativas (confirmar, cancelar, reagendar, link de chamada, salvar horários) persistidas no Supabase.
 */

import {
  DEFAULT_MODALITIES,
  AppointmentBooking,
  AppointmentModality,
  AppointmentStatus,
  validateBookingAttempt,
  addMinutesToTime,
  timeStringToMinutes,
  getScheduleNow,
  validateClientContact,
} from '../../../lib/appointmentsCanonical';
import { validateSettingsPatch } from '../../../lib/appointments/validateSettingsPatch.mjs';
import {
  generateBookingId,
  generatePublicToken,
} from '../../../lib/appointmentsStore';
import {
  getAppointmentsSettingsFromSupabase,
  saveAppointmentsSettingsToSupabase,
  listAppointmentsFromSupabase,
  listAppointmentsForScheduleDateFromSupabase,
  expirePendingAppointmentsFromSupabase,
  getAppointmentByIdFromSupabase,
  saveAppointmentToSupabase,
  reserveAppointmentAtomically,
  rescheduleAppointmentAtomically,
  saveOrderToSupabase,
  updateOrderInSupabase,
} from '../_supabaseStore';
import { recordAuditEvent } from '../_auditHelper';
import { claimOrderForProfile, getProfileByEmail } from '../id/_nuaIdStore';
import {
  sendAppointmentConfirmationEmail,
  sendMeetingLinkUpdatedEmail,
  sendAppointmentCancellationEmail,
  sendAppointmentRescheduledEmail,
  sendAppointmentProposalEmail,
} from './_emailAppointmentHelper';
import { getMercadoPagoPayment } from '../_mercadopago';

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_API_SECRET?: string;
  [key: string]: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

function isValidHttpUrl(rawUrl?: string | null): boolean {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return true; // Vazio permitido (para limpar link)
  try {
    const u = new URL(trimmed);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export const onRequestGet = async (context: PagesContext<Env>) => {
  const { env } = context;

  try {
    const { settings, modalities } = await getAppointmentsSettingsFromSupabase(env);
    await expirePendingAppointmentsFromSupabase(env);
    const bookings = await listAppointmentsFromSupabase(env);

    return new Response(
      JSON.stringify({
        success: true,
        settings,
        modalities,
        bookings,
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
    console.error('[Appointments Admin GET Error]:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro ao carregar dados de agendamento.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  try {
    const body = await request.json().catch(() => ({}));
    const { action } = body;
    const nowIso = new Date().toISOString();

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ação não especificada.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'retry_refund') {
      return Response.json({
        success: false,
        error: 'Abra a confirmação do estorno nos detalhes da chamada para consultar o pagamento e confirmar a devolução.',
      }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    }

    // 1. Salvar Configurações de Horários
    if (action === 'updateSettings') {
      const validationError = validateSettingsPatch(body.settings);
      if (validationError) {
        return new Response(JSON.stringify({ success: false, error: validationError }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const res = await saveAppointmentsSettingsToSupabase(env, { settings: body.settings });
      if (!res.success) {
        return new Response(
          JSON.stringify({ success: false, error: res.error || 'Falha ao salvar configurações.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
      const updated = await getAppointmentsSettingsFromSupabase(env);
      return new Response(JSON.stringify({ success: true, settings: updated.settings }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Salvar Modalidades de Chamadas
    if (action === 'updateModalities') {
      if (!Array.isArray(body.modalities)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Lista de modalidades inválida.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      for (const m of body.modalities) {
        if (!m?.name?.trim() || Number(m.durationMinutes) < 10 || Number(m.price) < 1) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Toda modalidade deve ter nome, duração mínima de 10 minutos e valor mínimo de R$ 1,00.',
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      const res = await saveAppointmentsSettingsToSupabase(env, { modalities: body.modalities });
      if (!res.success) {
        return new Response(
          JSON.stringify({ success: false, error: res.error || 'Falha ao salvar modalidades.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ success: true, modalities: body.modalities }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2.1. Criar Chamada VIP Manualmente (Pelo Painel Administrativo)
    if (action === 'createManualBooking') {
      const {
        clientName,
        clientEmail,
        clientPhone,
        clientNotes,
        modalityId,
        date,
        startTime,
        paymentStatus = 'manual_confirmed',
        paymentMethod = 'manual',
        meetingUrl,
      } = body;

      if (!clientName?.trim() || !clientEmail?.trim() || !modalityId || !date || !startTime) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Preencha todos os campos obrigatórios da reserva (Nome, E-mail, Modalidade, Data e Horário).',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !/^\d{2}:\d{2}$/.test(String(startTime))) {
        return new Response(
          JSON.stringify({ success: false, error: 'Data ou horário em formato inválido.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (meetingUrl && !isValidHttpUrl(meetingUrl)) {
        return new Response(
          JSON.stringify({ success: false, error: 'O link da sala deve começar com https:// ou http://.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const { settings, modalities } = await getAppointmentsSettingsFromSupabase(env);
      await expirePendingAppointmentsFromSupabase(env).catch(() => {});

      const mod =
        modalities.find((m) => m.id === modalityId) ||
        DEFAULT_MODALITIES.find((m) => m.id === modalityId);
      if (!mod) {
        return new Response(
          JSON.stringify({ success: false, error: 'Modalidade selecionada não é válida.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const durationMinutes = Number(mod.durationMinutes) || 30;
      const startTotalMin = timeStringToMinutes(startTime);
      const endTotalMin = startTotalMin + durationMinutes;
      if (endTotalMin > 24 * 60 - 1) {
        return new Response(
          JSON.stringify({ success: false, error: 'O horário escolhido ultrapassa o final do dia (23:59).' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      const endTime = addMinutesToTime(startTime, durationMinutes);
      const bufferMin = Number(settings.bufferMinutes || 0);

      // Libera reservas expiradas antes de verificar conflito no horário manual
      await expirePendingAppointmentsFromSupabase(env).catch(() => 0);

      // Verificar conflito com chamadas ativas na mesma data no fuso da agenda
      const existingDateBookings = await listAppointmentsForScheduleDateFromSupabase(
        env,
        date,
        settings.timezone
      );
      const hasConflict = existingDateBookings.some((b) => {
        if (
          b.status !== 'confirmada' &&
          b.status !== 'aguardando_pagamento' &&
          b.status !== 'reagendamento_pendente'
        ) {
          return false;
        }
        const bStart = timeStringToMinutes(b.startTime);
        const bEnd = timeStringToMinutes(b.endTime) + bufferMin;
        return startTotalMin < bEnd && endTotalMin + bufferMin > bStart;
      });

      if (hasConflict) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Já existe outra chamada confirmada ou reservada neste horário (considerando o intervalo de descanso).',
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const id = generateBookingId();
      const publicToken = generatePublicToken();
      const isConfirmed = paymentStatus === 'manual_confirmed' || paymentStatus === 'approved';
      const contactCheck = clientPhone?.trim()
        ? validateClientContact(clientPhone)
        : { valid: true, normalized: '', type: 'whatsapp' as const };

      const newBooking: AppointmentBooking = {
        id,
        publicToken,
        modalityId: mod.id,
        modalityName: mod.name,
        durationMinutes: mod.durationMinutes,
        price: mod.price,
        date,
        startTime,
        endTime,
        timezone: settings.timezone || 'Europe/Dublin',
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim().toLowerCase(),
        clientPhone: contactCheck.normalized || (clientPhone || '').trim(),
        contactType: contactCheck.type,
        clientNotes: clientNotes?.trim() || undefined,
        status: isConfirmed ? 'confirmada' : 'aguardando_pagamento',
        payment: {
          status: paymentStatus,
          method: paymentMethod,
          amount: mod.price,
          paidAt: isConfirmed ? nowIso : undefined,
          transactionId: `MANUAL_ADMIN_${Date.now()}`,
        },
        meeting: {
          url: meetingUrl?.trim() || '',
          platform: settings.meetingPlatform || 'google_meet',
          instructions: settings.customMeetingInstructions,
          visibleToClient: isConfirmed && Boolean(meetingUrl?.trim()),
        },
        history: [
          {
            at: nowIso,
            action: 'criada_manual_admin',
            note: `Agendamento criado manualmente pela administração (${isConfirmed ? 'Confirmado' : 'Aguardando Pagamento'}).`,
            author: 'admin',
          },
        ],
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const atomicRes = await reserveAppointmentAtomically(env, newBooking, bufferMin);
      if (!atomicRes.success) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Não foi possível registrar o agendamento. Tente novamente em instantes.',
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (!atomicRes.reserved) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Este horário acabou de ser ocupado ou excedeu o limite diário configurado na agenda.',
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Espelha na tabela orders para conciliação financeira e histórico unificado do cliente
      await saveOrderToSupabase(env, {
        id: newBooking.id,
        purchaseToken: newBooking.publicToken,
        packId: newBooking.modalityId,
        amount: Number(newBooking.price) || 0,
        status: isConfirmed ? 'paid' : 'pending',
        customerEmail: newBooking.clientEmail,
        customerName: newBooking.clientName,
        paymentId: newBooking.payment.transactionId,
        paymentMethod: paymentMethod || 'manual',
        expiresAt: newBooking.expiresAt,
        createdAt: nowIso,
        updatedAt: nowIso,
      }).catch(() => {});

      // Vincula automaticamente se o cliente já possui uma conta NUA ID ativa
      try {
        const existingProfile = await getProfileByEmail(env as any, newBooking.clientEmail);
        if (existingProfile && existingProfile.status === 'active') {
          await claimOrderForProfile(env as any, newBooking.id, existingProfile.id, 'checkout_authenticated');
        }
      } catch {}

      if (isConfirmed) {
        try {
          const mailRes = await sendAppointmentConfirmationEmail(env, newBooking);
          if (mailRes.success) {
            newBooking.history.push({
              at: new Date().toISOString(),
              action: 'email_confirmacao_enviado',
              note: `E-mail de confirmação enviado para ${newBooking.clientEmail}.`,
              author: 'system',
            });
            await saveAppointmentToSupabase(env, newBooking);
          }
        } catch (e) {
          console.error('[Admin Manual Booking] Erro ao enviar email de confirmacao:', e);
        }
      }

      return new Response(JSON.stringify({ success: true, booking: newBooking }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Para ações que operam sobre uma reserva específica:
    const bookingId = body.bookingId;
    if (!bookingId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Selecione a reserva para continuar.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const booking = await getAppointmentByIdFromSupabase(env, bookingId);
    if (!booking) {
      return new Response(
        JSON.stringify({ success: false, error: 'Reserva não encontrada.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(booking.history)) booking.history = [];
    if (!booking.meeting) {
      booking.meeting = { platform: 'google_meet', visibleToClient: false };
    }
    if (!booking.payment) {
      booking.payment = { status: 'pending', method: 'pix', amount: booking.price || 0 };
    }

    const buildFallbackModality = (b: AppointmentBooking): AppointmentModality => ({
      id: b.modalityId,
      name: b.modalityName || 'Chamada Privativa',
      description: '',
      durationMinutes: Number(b.durationMinutes) || 30,
      price: Number(b.price) || 250,
      priceFormatted: `R$ ${(Number(b.price) || 250).toFixed(2).replace('.', ',')}`,
      active: true,
      minNoticeHours: 0,
      rules: [],
      clientInstructions: '',
      order: 1,
    });

    // 3. Confirmar Pagamento Manualmente
    if (action === 'confirm') {
      booking.status = 'confirmada';
      // Preserva transactionId original do Mercado Pago caso já exista!
      const existingTx = booking.payment?.transactionId;
      const hasRealMpTx =
        existingTx &&
        !String(existingTx).startsWith('ADMIN_') &&
        !String(existingTx).startsWith('MANUAL_ADMIN_');
      if (!hasRealMpTx) {
        booking.payment.status = 'manual_confirmed';
        booking.payment.transactionId = body.transactionId || existingTx || `ADMIN_${Date.now()}`;
      } else if (booking.payment.status !== 'approved') {
        booking.payment.status = 'manual_confirmed';
      }
      booking.payment.paidAt = booking.payment.paidAt || nowIso;
      booking.meeting.visibleToClient = true;
      booking.updatedAt = nowIso;
      booking.history.push({
        at: nowIso,
        action: 'pagamento_confirmado',
        note: 'Pagamento confirmado manualmente pela administração.',
        author: 'admin',
      });

      // 1. Salva no banco ANTES de enviar o e-mail
      const saveRes = await saveAppointmentToSupabase(env, booking);
      if (!saveRes.success) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Não foi possível atualizar a reserva. Tente novamente em instantes.',
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
      await updateOrderInSupabase(env, booking.id, {
        status: 'paid',
        paid_at: booking.payment.paidAt,
      }).catch(() => {});

      // 2. Dispara e-mail oficial após persistência confirmada
      try {
        const mailRes = await sendAppointmentConfirmationEmail(env, booking);
        if (mailRes.success) {
          booking.history.push({
            at: new Date().toISOString(),
            action: 'email_confirmacao_enviado',
            note: `E-mail oficial de confirmação enviado para ${booking.clientEmail}.`,
            author: 'system',
          });
          await saveAppointmentToSupabase(env, booking);
        }
      } catch (err) {
        console.error('[Admin Confirm] Erro ao enviar e-mail:', err);
      }

      return new Response(JSON.stringify({ success: true, booking }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Inserir/Atualizar Link da Chamada de Vídeo
    if (action === 'updateMeeting') {
      const nextUrl = (body.meetingUrl || '').trim();
      if (nextUrl && !isValidHttpUrl(nextUrl)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'O link da sala deve começar com https:// ou http://.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const prevUrl = booking.meeting?.url || '';
      booking.meeting.url = nextUrl;
      if (body.instructions !== undefined) {
        booking.meeting.instructions = (body.instructions || '').trim();
      }
      booking.meeting.visibleToClient = booking.status === 'confirmada' && Boolean(nextUrl);
      booking.updatedAt = nowIso;
      booking.history.push({
        at: nowIso,
        action: 'link_atualizado',
        note: nextUrl
          ? `Link da sala privativa atualizado: ${nextUrl}`
          : 'Link da sala privativa removido pela administração.',
        author: 'admin',
      });

      // 1. Salva no banco ANTES de enviar o e-mail
      const saveRes = await saveAppointmentToSupabase(env, booking);
      if (!saveRes.success) {
        return new Response(JSON.stringify({ success: false, error: saveRes.error }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 2. Se um novo link válido foi adicionado e a chamada está confirmada, notifica o cliente por e-mail
      if (
        booking.meeting.url &&
        booking.meeting.url !== prevUrl &&
        booking.status === 'confirmada' &&
        body.notifyClient !== false
      ) {
        try {
          const mailRes = await sendMeetingLinkUpdatedEmail(env, booking);
          if (mailRes.success) {
            booking.history.push({
              at: new Date().toISOString(),
              action: 'email_sala_enviado',
              note: `Aviso da sala privativa enviado por e-mail para ${booking.clientEmail}.`,
              author: 'system',
            });
            await saveAppointmentToSupabase(env, booking);
          }
        } catch (err) {
          console.error('[Admin Meeting] Erro ao enviar aviso da sala:', err);
        }
      }

      return new Response(JSON.stringify({ success: true, booking }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5. Cancelar Reserva
    if (action === 'cancel') {
      const reason = String(body.reason || '').trim();
      if (reason.length < 3) {
        return new Response(
          JSON.stringify({ success: false, error: 'Informe o motivo do cancelamento.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const requestedRefundPercent =
        body.refundPercent !== undefined && body.refundPercent !== null
          ? Math.max(0, Math.min(100, Number(body.refundPercent)))
          : 100;

      const wasAlreadyCancelled = booking.status === 'cancelada';
      booking.status = 'cancelada';
      booking.proposal = null;
      booking.cancellationReason = reason;
      booking.cancelledBy = 'admin';
      booking.meeting.visibleToClient = false;
      booking.meeting.url = undefined;
      booking.updatedAt = nowIso;

      const txIdStr = String(booking.payment?.transactionId || '');
      const isManualPayment =
        booking.payment?.status === 'manual_confirmed' ||
        txIdStr.startsWith('ADMIN_') ||
        txIdStr.startsWith('MANUAL_ADMIN_');
      const manualRefundRequired =
        isManualPayment || (booking.payment?.status === 'approved' && !booking.payment?.transactionId);

      let gatewayPayment: Awaited<ReturnType<typeof getMercadoPagoPayment>> | null = null;
      if (!isManualPayment && booking.payment?.transactionId && booking.payment.status !== 'refunded') {
        try {
          gatewayPayment = await getMercadoPagoPayment(env, booking.payment.transactionId);
        } catch {
          return new Response(
            JSON.stringify({
              success: false,
              error:
                'Não consegui confirmar o estado do Pix no Mercado Pago. A reserva não foi cancelada; tente novamente.',
            }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      const paidAtGateway = gatewayPayment?.success && gatewayPayment.status === 'approved';
      if (paidAtGateway) {
        const expectedReference = `apt_${booking.id}`;
        if (gatewayPayment?.externalReference && gatewayPayment.externalReference !== expectedReference) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'O pagamento encontrado não corresponde a esta reserva. O cancelamento foi interrompido.',
            }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          );
        }
        booking.payment.status = 'approved';
        booking.payment.amount = gatewayPayment!.amount;
        const baseAmount = Number(gatewayPayment!.amount || booking.price || 0);
        const computedRefundAmount = Math.round(((baseAmount * requestedRefundPercent) / 100) * 100) / 100;
        booking.refundAmount = computedRefundAmount;
        booking.refundStatus =
          booking.refundStatus === 'completed'
            ? 'completed'
            : computedRefundAmount > 0
            ? 'pending'
            : 'not_applicable';
      } else if (gatewayPayment?.success && gatewayPayment.status === 'refunded') {
        booking.payment.status = 'refunded';
        booking.payment.amount = gatewayPayment.amount;
        booking.payment.refundAmount = gatewayPayment.amount;
        booking.refundAmount = gatewayPayment.amount;
        booking.refundStatus = 'completed';
        if (!booking.history.some((h: any) => h.action === 'reembolso_concluido')) {
          booking.history.push({
            at: nowIso,
            action: 'reembolso_concluido',
            note: `Mercado Pago confirmou que o pagamento já estava devolvido (${gatewayPayment.amount.toFixed(2)}).`,
            author: 'admin',
          });
        }
      } else if (manualRefundRequired) {
        const baseAmount = Number(booking.payment?.amount || booking.price || 0);
        const computedRefundAmount = Math.round(((baseAmount * requestedRefundPercent) / 100) * 100) / 100;
        booking.refundAmount = computedRefundAmount;
        booking.refundStatus = computedRefundAmount > 0 ? 'manual_required' : 'not_applicable';
      } else {
        booking.refundStatus = booking.refundStatus || 'not_applicable';
      }

      if (!wasAlreadyCancelled) {
        booking.history.push({
          at: nowIso,
          action: 'cancelada',
          note: `Cancelada pela administração. Motivo: ${reason}`,
          author: 'admin',
        });
      }
      if (paidAtGateway && booking.refundStatus === 'pending') {
        if (!booking.history.some((h: any) => h.action === 'reembolso_pendente')) {
          booking.history.push({
            at: nowIso,
            action: 'reembolso_pendente',
            note: `Pagamento aprovado. Devolução (${requestedRefundPercent}% = R$ ${(booking.refundAmount || 0).toFixed(2)}) aguarda confirmação explícita da administradora.`,
            author: 'admin',
          });
        }
      }

      const saveRes = await saveAppointmentToSupabase(env, booking);
      if (!saveRes.success) {
        return new Response(
          JSON.stringify({
            success: false,
            error: saveRes.error || 'Falha ao salvar estado da reserva/devolução.',
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (booking.payment?.status === 'refunded') {
        await updateOrderInSupabase(env, booking.id, { status: 'refunded' }).catch(() => {});
      } else if (paidAtGateway) {
        await updateOrderInSupabase(env, booking.id, { status: 'paid' }).catch(() => {});
      }
      try {
        const mail = await sendAppointmentCancellationEmail(env, booking);
        if (mail.success) {
          booking.history.push({
            at: new Date().toISOString(),
            action: 'email_cancelamento_enviado',
            note: `Aviso de cancelamento enviado para ${booking.clientEmail}.`,
            author: 'system',
          });
        }
      } catch (mailError) {
        console.warn('[Appointments Cancel] Falha ao notificar cliente:', mailError);
      }
      await saveAppointmentToSupabase(env, booking);
      await recordAuditEvent(env, request, {
        type: 'APPOINTMENT_CANCELLED' as any,
        summary: `Chamada VIP cancelada: ${booking.id}`,
        details: { bookingId: booking.id, refundStatus: booking.refundStatus, refundId: booking.refundId },
      }).catch(() => {});

      return new Response(
        JSON.stringify({ success: true, booking, refundStatus: booking.refundStatus }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 6. Concluir Chamada
    if (action === 'complete') {
      const { settings } = await getAppointmentsSettingsFromSupabase(env);
      const todayScheduleStr = getScheduleNow(settings.timezone).dateString;
      if (booking.date > todayScheduleStr) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Não é possível marcar como concluída uma chamada agendada para uma data futura (${booking.date}).`,
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (booking.status === 'cancelada') {
        return new Response(
          JSON.stringify({ success: false, error: 'Uma chamada cancelada não pode ser concluída.' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }
      booking.status = 'concluida';
      booking.proposal = null;
      booking.updatedAt = nowIso;
      booking.history.push({
        at: nowIso,
        action: 'concluida',
        note: 'Chamada de vídeo finalizada com sucesso.',
        author: 'admin',
      });

      const saveRes = await saveAppointmentToSupabase(env, booking);
      if (!saveRes.success) {
        return new Response(JSON.stringify({ success: false, error: saveRes.error }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, booking }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 7. Marcar Ausência (Não Compareceu)
    if (action === 'absent') {
      const { settings } = await getAppointmentsSettingsFromSupabase(env);
      const todayScheduleStr = getScheduleNow(settings.timezone).dateString;
      if (booking.date > todayScheduleStr) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Não é possível marcar ausência em uma chamada agendada para uma data futura (${booking.date}).`,
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }
      booking.status = 'nao_compareceu';
      booking.proposal = null;
      booking.updatedAt = nowIso;
      booking.history.push({
        at: nowIso,
        action: 'ausente',
        note: 'Cliente não compareceu à chamada no horário agendado.',
        author: 'admin',
      });

      const saveRes = await saveAppointmentToSupabase(env, booking);
      if (!saveRes.success) {
        return new Response(JSON.stringify({ success: false, error: saveRes.error }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, booking }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 8.1. Propor Novo Horário ao Cliente (V9)
    if (action === 'proposeReschedule') {
      const { newDate, newStartTime, note } = body;
      if (!['aguardando_pagamento', 'confirmada', 'reagendamento_pendente'].includes(booking.status)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Este atendimento não pode receber proposta de reagendamento no momento.',
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (!newDate || !newStartTime) {
        return new Response(
          JSON.stringify({ success: false, error: 'Nova data e horário sugeridos são obrigatórios.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const { settings, modalities } = await getAppointmentsSettingsFromSupabase(env);
      await expirePendingAppointmentsFromSupabase(env);
      const allBookings = await listAppointmentsForScheduleDateFromSupabase(env, newDate, settings.timezone);
      const otherBookings = allBookings.filter((b) => b.id !== bookingId);

      const val = validateBookingAttempt(
        {
          modalityId: booking.modalityId,
          date: newDate,
          startTime: newStartTime,
          clientName: booking.clientName,
          clientEmail: booking.clientEmail,
          clientPhone: booking.clientPhone,
          termsAccepted: true,
        },
        modalities,
        settings,
        otherBookings,
        new Date(),
        { allowInactiveModality: true, fallbackModality: buildFallbackModality(booking) }
      );

      if (!val.success) {
        return new Response(
          JSON.stringify({
            success: false,
            error: val.error || 'Horário sugerido indisponível na agenda.',
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }

      booking.proposal = {
        date: newDate,
        time: newStartTime,
        origin: 'nua',
        note: String(note || '').trim(),
        at: nowIso,
      };
      booking.status = 'reagendamento_pendente';
      booking.updatedAt = nowIso;
      booking.history.push({
        at: nowIso,
        action: 'proposta_reagendamento',
        note: `Nua propôs novo horário: ${newDate} às ${newStartTime}.`,
        author: 'admin',
      });

      const saveRes = await saveAppointmentToSupabase(env, booking);
      if (!saveRes.success) {
        return new Response(JSON.stringify({ success: false, error: saveRes.error }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      try {
        const mail = await sendAppointmentProposalEmail(env, booking);
        if (mail.success) {
          booking.history.push({
            at: new Date().toISOString(),
            action: 'email_proposta_enviado',
            note: `Sugestão de novo horário enviada por e-mail para ${booking.clientEmail}.`,
            author: 'system',
          });
          await saveAppointmentToSupabase(env, booking);
        }
      } catch (err) {
        console.warn('[Appointments ProposeReschedule] Falha ao enviar e-mail da proposta:', err);
      }

      return new Response(
        JSON.stringify({
          success: true,
          booking,
          message: 'Proposta registrada e enviada ao cliente.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 8.2. Retirar Proposta de Reagendamento (V9)
    if (action === 'withdrawProposal') {
      if (!booking.proposal) {
        return new Response(
          JSON.stringify({ success: false, error: 'Não há proposta ativa nesta chamada.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      booking.proposal = null;
      if (booking.status === 'reagendamento_pendente' && booking.cancellation?.state !== 'requested') {
        booking.status =
          booking.payment?.status === 'approved' || booking.payment?.status === 'manual_confirmed'
            ? 'confirmada'
            : 'aguardando_pagamento';
      }
      booking.updatedAt = nowIso;
      booking.history.push({
        at: nowIso,
        action: 'proposta_retirada',
        note: 'Proposta de reagendamento retirada pela administração; data original mantida.',
        author: 'admin',
      });

      const saveRes = await saveAppointmentToSupabase(env, booking);
      if (!saveRes.success) {
        return new Response(JSON.stringify({ success: false, error: saveRes.error }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, booking }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 8.3. Responder à Solicitação de Cancelamento do Cliente (V9)
    if (action === 'resolveCancellationRequest') {
      const decision = String(body.decision || '').toLowerCase(); // 'approve' | 'deny'
      const decisionNote = String(body.decisionNote || '').trim();
      const refundPercent = Math.max(0, Math.min(100, Number(body.refundPercent || 0)));

      if (!['approve', 'deny'].includes(decision)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Decisão inválida. Escolha aprovar ou recusar.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const wasPaid =
        booking.payment?.status === 'approved' || booking.payment?.status === 'manual_confirmed';

      if (decision === 'deny') {
        // Nunca restaura para 'reagendamento_pendente' se a proposta já foi limpa!
        booking.status = booking.proposal
          ? 'reagendamento_pendente'
          : wasPaid
          ? 'confirmada'
          : 'aguardando_pagamento';
        booking.cancellation = {
          state: 'denied',
          by: 'client',
          reason: booking.cancellation?.reason || 'Solicitação do cliente',
          details: booking.cancellation?.details,
          requestedAt: booking.cancellation?.requestedAt,
          resolvedAt: nowIso,
          denialNote: decisionNote || 'Solicitação analisada e não aprovada.',
          refundStatus: 'not_applicable',
        };
        booking.history.push({
          at: nowIso,
          action: 'cancelamento_recusado',
          note: `Solicitação de cancelamento recusada. ${decisionNote}`,
          author: 'admin',
        });
      } else {
        booking.status = 'cancelada';
        booking.proposal = null;
        booking.cancelledBy = 'client';
        booking.cancellationReason =
          booking.cancellation?.reason || decisionNote || 'Solicitação do cliente aprovada';
        const bookingAmount = Number(booking.payment?.amount || booking.price || 0);
        const refundAmt = wasPaid ? Math.round(((bookingAmount * refundPercent) / 100) * 100) / 100 : 0;
        const txIdStr = String(booking.payment?.transactionId || '');
        const isManualPayment =
          booking.payment?.status === 'manual_confirmed' ||
          txIdStr.startsWith('ADMIN_') ||
          txIdStr.startsWith('MANUAL_ADMIN_');

        booking.cancellation = {
          state: 'approved',
          by: 'client',
          reason: booking.cancellationReason,
          details: booking.cancellation?.details,
          requestedAt: booking.cancellation?.requestedAt,
          decidedAt: nowIso,
          decisionNote,
          refundPercent: wasPaid ? refundPercent : 0,
          refundAmount: refundAmt,
          refundStatus: refundAmt > 0 ? 'awaiting_finance' : 'not_applicable',
        };
        booking.refundStatus =
          refundAmt > 0 ? (isManualPayment ? 'manual_required' : 'pending') : 'not_applicable';
        booking.refundAmount = refundAmt;
        booking.meeting.visibleToClient = false;
        booking.meeting.url = undefined;

        booking.history.push({
          at: nowIso,
          action: 'cancelamento_aprovado',
          note: `Pedido de cancelamento do cliente aprovado (${wasPaid ? `reembolso ${refundPercent}%` : 'sem pagamento'}). ${decisionNote}`,
          author: 'admin',
        });
      }

      booking.updatedAt = nowIso;
      const saveRes = await saveAppointmentToSupabase(env, booking);
      if (!saveRes.success) {
        return new Response(JSON.stringify({ success: false, error: saveRes.error }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (decision === 'approve') {
        try {
          const mail = await sendAppointmentCancellationEmail(env, booking);
          if (mail.success) {
            booking.history.push({
              at: new Date().toISOString(),
              action: 'email_cancelamento_enviado',
              note: `Aviso de cancelamento enviado para ${booking.clientEmail}.`,
              author: 'system',
            });
            await saveAppointmentToSupabase(env, booking);
          }
        } catch {}
      }

      return new Response(
        JSON.stringify({
          success: true,
          booking,
          message:
            decision === 'deny'
              ? 'Solicitação recusada e reserva mantida.'
              : 'Cancelamento aprovado e registrado.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 8.4. Reagendar Reserva Diretamente
    if (action === 'reschedule') {
      const { newDate, newStartTime } = body;
      if (
        booking.status === 'cancelada' ||
        !['approved', 'manual_confirmed'].includes(booking.payment?.status)
      ) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Só é possível reagendar uma chamada paga que ainda não foi cancelada.',
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (!newDate || !newStartTime) {
        return new Response(
          JSON.stringify({ success: false, error: 'Nova data e horário são obrigatórios.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const { settings, modalities } = await getAppointmentsSettingsFromSupabase(env);
      await expirePendingAppointmentsFromSupabase(env);
      const allBookings = await listAppointmentsForScheduleDateFromSupabase(env, newDate, settings.timezone);
      const otherBookings = allBookings.filter((b) => b.id !== bookingId);

      const val = validateBookingAttempt(
        {
          modalityId: booking.modalityId,
          date: newDate,
          startTime: newStartTime,
          clientName: booking.clientName,
          clientEmail: booking.clientEmail,
          clientPhone: booking.clientPhone,
          termsAccepted: true,
        },
        modalities,
        settings,
        otherBookings,
        new Date(),
        { allowInactiveModality: true, fallbackModality: buildFallbackModality(booking) }
      );

      if (!val.success || !val.endTime) {
        return new Response(
          JSON.stringify({ success: false, error: val.error || 'Novo horário indisponível.' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const previousSlot = { date: booking.date, startTime: booking.startTime };
      booking.rescheduledFrom = previousSlot;
      booking.date = newDate;
      booking.startTime = newStartTime;
      booking.endTime = val.endTime;
      booking.proposal = null;
      booking.status = 'confirmada';
      booking.meeting.url = undefined;
      booking.meeting.visibleToClient = false;
      booking.updatedAt = nowIso;
      booking.history.push({
        at: nowIso,
        action: 'reagendada',
        note: `Horário reagendado de ${booking.rescheduledFrom.date} ${booking.rescheduledFrom.startTime} para ${newDate} ${newStartTime}.`,
        author: 'admin',
      });

      const saveRes = await rescheduleAppointmentAtomically(env, booking, settings.bufferMinutes);
      if (!saveRes.success || !saveRes.rescheduled) {
        return new Response(
          JSON.stringify({
            success: false,
            error: saveRes.error || 'Esse horário acabou de ser reservado. Escolha outro.',
          }),
          { status: saveRes.success ? 409 : 503, headers: { 'Content-Type': 'application/json' } }
        );
      }

      try {
        const mail = await sendAppointmentRescheduledEmail(env, booking, previousSlot);
        if (mail.success) {
          booking.history.push({
            at: new Date().toISOString(),
            action: 'email_reagendamento_enviado',
            note: `Aviso do novo horário enviado para ${booking.clientEmail}.`,
            author: 'system',
          });
          await saveAppointmentToSupabase(env, booking);
        }
      } catch (mailError) {
        console.warn('[Appointments Reschedule] Falha ao notificar cliente:', mailError);
      }

      return new Response(JSON.stringify({ success: true, booking }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 9. Atualizar Status Geral (update_status)
    if (action === 'update_status' || action === 'updateStatus') {
      const rawStatus = String(body.status || '').trim();
      const { settings } = await getAppointmentsSettingsFromSupabase(env);
      const todayScheduleStr = getScheduleNow(settings.timezone).dateString;
      let targetStatus: AppointmentStatus;

      if (rawStatus === 'concluida' || rawStatus === 'complete') {
        if (booking.date > todayScheduleStr) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Não é possível marcar como concluída uma chamada futura (${booking.date}).`,
            }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          );
        }
        targetStatus = 'concluida';
        booking.proposal = null;
      } else if (rawStatus === 'cancelada' || rawStatus === 'cancel') {
        targetStatus = 'cancelada';
        booking.proposal = null;
        booking.meeting.visibleToClient = false;
        booking.meeting.url = undefined;
        if (body.reason) {
          booking.cancellationReason = String(body.reason).trim();
          booking.cancelledBy = 'admin';
        }
      } else if (rawStatus === 'nao_compareceu' || rawStatus === 'no_show' || rawStatus === 'absent') {
        if (booking.date > todayScheduleStr) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Não é possível marcar ausência em uma chamada futura (${booking.date}).`,
            }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          );
        }
        targetStatus = 'nao_compareceu';
        booking.proposal = null;
      } else if (rawStatus === 'aguardando_pagamento' || rawStatus === 'pending') {
        targetStatus = 'aguardando_pagamento';
      } else if (rawStatus === 'confirmada' || rawStatus === 'agendada') {
        targetStatus = 'confirmada';
        booking.proposal = null;
        if (booking.cancellation?.state === 'requested') {
          booking.cancellation = {
            ...booking.cancellation,
            state: 'denied',
            resolvedAt: nowIso,
            denialNote: 'Atendimento restaurado para confirmado pela administração.',
          };
        }
      } else if (rawStatus === 'reagendamento_pendente') {
        targetStatus = 'reagendamento_pendente';
      } else {
        return new Response(
          JSON.stringify({ success: false, error: 'Situação selecionada inválida.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      booking.status = targetStatus;
      booking.updatedAt = nowIso;
      booking.history.push({
        at: nowIso,
        action: 'status_alterado',
        note: 'Situação da chamada atualizada pelo painel.',
        author: 'admin',
      });

      const saveRes = await saveAppointmentToSupabase(env, booking);
      if (!saveRes.success) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Não foi possível atualizar a situação. Tente novamente em instantes.',
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ success: true, booking }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: false, error: 'Ação não reconhecida.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[Appointments Admin POST Error]:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Não foi possível concluir a ação. Tente novamente em instantes.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
