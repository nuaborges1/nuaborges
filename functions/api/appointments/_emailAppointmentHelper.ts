/**
 * E-mails Transacionais de Chamadas VIP — Nua Borges
 *
 * Todos os templates utilizam o Design System canônico `wrapEmailLayout` (540px, Dark Luxury)
 * e o transporte SMTP RFC 5321/5322 (`sendSmtpEmailDetailed`).
 */

import { sendSmtpEmailDetailed } from '../_smtpHelper';
import {
  escapeHtml,
  renderEmailDetailsTable,
  renderEmailPrimaryCta,
  sanitizeEmailHref,
  wrapEmailLayout,
} from '../id/_emailTemplates';
import { AppointmentBooking, addMinutesToTime } from '../../../lib/appointmentsCanonical';
import { formatCurrencyBrl, formatDateForDisplay, formatDualTimezone } from '../../../lib/appointments/timeUtils';

export interface EmailResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

const EMAIL_RE = /^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/;

function buildUrls(booking: AppointmentBooking) {
  const voucherUrl = `https://nuaborges.com.br/chamadas/reserva?token=${encodeURIComponent(booking.publicToken)}`;
  const accountUrl = 'https://nuaborges.com.br/conta?tab=chamadas';
  return { voucherUrl, accountUrl };
}

export async function sendAppointmentRescheduledEmail(
  env: any,
  booking: AppointmentBooking,
  previous: { date: string; startTime: string }
): Promise<EmailResult> {
  const recipient = (booking.clientEmail || '').trim();
  if (!EMAIL_RE.test(recipient)) {
    return { success: false, error: 'E-mail do cliente inválido ou ausente.' };
  }

  const { voucherUrl, accountUrl } = buildUrls(booking);
  const scheduleTz = booking.timezone || 'Europe/Dublin';
  const clientTz = booking.clientTimezone || 'America/Sao_Paulo';
  const duration = Number(booking.durationMinutes) || 30;
  const prevEnd = addMinutesToTime(previous.startTime, duration);
  const prevTimes = formatDualTimezone(previous.date, previous.startTime, prevEnd, scheduleTz, clientTz);
  const times = formatDualTimezone(booking.date, booking.startTime, booking.endTime, scheduleTz, clientTz);

  const html = wrapEmailLayout({
    title: 'Horário atualizado',
    preheader: `Seu agendamento foi reagendado para ${formatDateForDisplay(booking.date)}.`,
    heading: 'Novo horário confirmado',
    eyebrow: 'Atualização de Agenda',
    bodyHtml: `
      <p class="nua-body" style="font-size:14.5px;color:#3f3f46;margin:0 0 18px;line-height:1.65;">
        Olá, <strong class="nua-title" style="color:#18181b;">${escapeHtml(booking.clientName)}</strong>. O horário do seu agendamento foi atualizado conforme combinado.
      </p>
      ${renderEmailDetailsTable([
        { label: 'Horário anterior', value: `${formatDateForDisplay(previous.date)} · ${prevTimes.combined}`, highlightColor: '#71717a' },
        { label: 'Novo horário', value: `${formatDateForDisplay(booking.date)} · ${times.combined}`, highlightColor: '#15803d' },
      ])}
      <p class="nua-muted" style="font-size:13px;color:#71717a;margin:0 0 8px;">
        Acesse sua conta ou o voucher abaixo para conferir os dados atualizados e o link de acesso.
      </p>
      ${renderEmailPrimaryCta({
        url: voucherUrl,
        label: 'Abrir Voucher Atualizado',
        secondaryUrl: accountUrl,
        secondaryLabel: 'Acompanhar na Minha Conta',
      })}
    `,
    footerNote: 'Notificação automática de agendamento enviada de forma reservada.',
  });

  const res = await sendSmtpEmailDetailed(env, {
    to: recipient,
    subject: 'Novo horário do seu agendamento',
    html,
  });
  return { success: res.ok, error: res.error, messageId: res.messageId };
}

export async function sendAppointmentProposalEmail(
  env: any,
  booking: AppointmentBooking
): Promise<EmailResult> {
  const recipient = (booking.clientEmail || '').trim();
  if (!EMAIL_RE.test(recipient) || !booking.proposal) {
    return { success: false, error: 'E-mail do cliente ou proposta ausente.' };
  }

  const { voucherUrl, accountUrl } = buildUrls(booking);
  const scheduleTz = booking.timezone || 'Europe/Dublin';
  const clientTz = booking.clientTimezone || 'America/Sao_Paulo';
  const duration = Number(booking.durationMinutes) || 30;
  const propEnd = addMinutesToTime(booking.proposal.time, duration);
  const propTimes = formatDualTimezone(booking.proposal.date, booking.proposal.time, propEnd, scheduleTz, clientTz);
  const currentTimes = formatDualTimezone(booking.date, booking.startTime, booking.endTime, scheduleTz, clientTz);

  const noteBlock = booking.proposal.note
    ? `
      <div class="nua-quote" style="background-color:#f4f4f5;border-left:3px solid #661C30;border-radius:6px;padding:14px 16px;margin:0 0 18px;font-size:13.5px;color:#27272a;font-style:italic;">
        "${escapeHtml(booking.proposal.note)}"
      </div>`
    : '';

  const html = wrapEmailLayout({
    title: 'Sugestão de novo horário',
    preheader: 'Você recebeu uma sugestão de ajuste de horário para o seu agendamento.',
    heading: 'Proposta de novo horário',
    eyebrow: 'Ajuste de Agenda',
    bodyHtml: `
      <p class="nua-body" style="font-size:14.5px;color:#3f3f46;margin:0 0 18px;line-height:1.65;">
        Olá, <strong class="nua-title" style="color:#18181b;">${escapeHtml(booking.clientName)}</strong>. Enviamos uma sugestão de novo horário para o seu atendimento.
      </p>
      ${renderEmailDetailsTable([
        { label: 'Horário atual', value: `${formatDateForDisplay(booking.date)} · ${currentTimes.combined}`, highlightColor: '#71717a' },
        { label: 'Horário sugerido', value: `${formatDateForDisplay(booking.proposal.date)} · ${propTimes.combined}`, highlightColor: '#b45309' },
      ])}
      ${noteBlock}
      <p class="nua-muted" style="font-size:13px;color:#71717a;margin:0 0 8px;">
        Seu horário original continua garantido até a sua resposta. Aceite ou recuse em 1 clique pelo botão abaixo.
      </p>
      ${renderEmailPrimaryCta({
        url: accountUrl,
        label: 'Responder na Minha Conta',
        secondaryUrl: voucherUrl,
        secondaryLabel: 'Responder pelo voucher da reserva',
      })}
    `,
    footerNote: 'Notificação automática de agendamento enviada de forma reservada.',
  });

  const res = await sendSmtpEmailDetailed(env, {
    to: recipient,
    subject: 'Sugestão de novo horário',
    html,
  });
  return { success: res.ok, error: res.error, messageId: res.messageId };
}

export async function sendAppointmentCancellationEmail(
  env: any,
  booking: AppointmentBooking
): Promise<EmailResult> {
  const recipient = (booking.clientEmail || '').trim();
  if (!EMAIL_RE.test(recipient)) {
    return { success: false, error: 'E-mail do cliente ausente.' };
  }

  const { accountUrl } = buildUrls(booking);
  const scheduleTz = booking.timezone || 'Europe/Dublin';
  const clientTz = booking.clientTimezone || 'America/Sao_Paulo';
  const times = formatDualTimezone(booking.date, booking.startTime, booking.endTime, scheduleTz, clientTz);

  const refundMessage =
    booking.refundStatus === 'completed'
      ? `A devolução de ${formatCurrencyBrl(booking.refundAmount || booking.payment.amount)} foi confirmada.`
      : booking.refundStatus === 'manual_required'
      ? 'O pagamento foi registrado manualmente e a devolução está em conferência pela equipe.'
      : booking.refundStatus === 'failed'
      ? 'A devolução ainda não foi concluída.'
      : booking.refundStatus === 'pending'
      ? `A devolução${booking.refundAmount ? ` de ${formatCurrencyBrl(booking.refundAmount)}` : ''} está sendo processada pela equipe.`
      : 'Não há devolução financeira pendente para esta reserva.';

  const html = wrapEmailLayout({
    title: 'Atualização do seu agendamento',
    preheader: 'Seu agendamento foi cancelado. Confira os detalhes e informações de reembolso.',
    heading: 'Agendamento cancelado',
    eyebrow: 'Atualização de Reserva',
    bodyHtml: `
      <p class="nua-body" style="font-size:14.5px;color:#3f3f46;margin:0 0 18px;line-height:1.65;">
        Olá, <strong class="nua-title" style="color:#18181b;">${escapeHtml(booking.clientName)}</strong>. Confirmamos o cancelamento da sua reserva conforme os dados abaixo.
      </p>
      ${renderEmailDetailsTable([
        { label: 'Data original', value: `${formatDateForDisplay(booking.date)} · ${times.combined}` },
        { label: 'Motivo', value: booking.cancellationReason || 'Cancelamento registrado' },
        { label: 'Situação', value: 'Cancelada', highlightColor: '#be123c' },
      ])}
      <div class="nua-surface" style="background-color:#f4f4f5;border:1px solid #e4e4e7;border-radius:10px;padding:14px 16px;margin:0 0 18px;font-size:13px;color:#3f3f46;">
        ${escapeHtml(refundMessage)}
      </div>
      ${renderEmailPrimaryCta({
        url: accountUrl,
        label: 'Acompanhar na Minha Conta',
      })}
    `,
    footerNote: 'Se precisar de ajuda ou desejar escolher uma nova data, basta responder a este e-mail.',
  });

  const res = await sendSmtpEmailDetailed(env, {
    to: recipient,
    subject: 'Atualização do seu agendamento',
    html,
  });
  return { success: res.ok, error: res.error, messageId: res.messageId };
}

/**
 * Envia e-mail oficial de confirmação de agendamento de Chamada VIP.
 */
export async function sendAppointmentConfirmationEmail(
  env: any,
  booking: AppointmentBooking
): Promise<EmailResult> {
  const recipient = (booking.clientEmail || '').trim();
  if (!EMAIL_RE.test(recipient)) {
    return { success: false, error: 'E-mail do cliente inválido ou ausente.' };
  }

  const scheduleTz = booking.timezone || 'Europe/Dublin';
  const clientTz = booking.clientTimezone || 'America/Sao_Paulo';
  const times = formatDualTimezone(booking.date, booking.startTime, booking.endTime, scheduleTz, clientTz);
  const dataFormatada = formatDateForDisplay(times.clientDate);
  const { voucherUrl, accountUrl } = buildUrls(booking);
  const safeMeetingUrl = sanitizeEmailHref(booking.meeting?.url);

  const roomBlock = safeMeetingUrl
    ? `
      <div class="nua-surface" style="background-color:#f4f4f5;border:1px solid #e4e4e7;border-radius:10px;padding:16px 18px;margin:0 0 20px;">
        <div class="nua-eyebrow" style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#661C30;font-weight:700;margin-bottom:6px;">
          Sala Privativa Liberada
        </div>
        <p class="nua-body" style="margin:0 0 12px;font-size:13.5px;color:#3f3f46;line-height:1.55;">
          ${escapeHtml(booking.meeting?.instructions || 'Sua sala privativa já está pronta. Entre no horário agendado com câmera e microfone testados.')}
        </p>
        <a class="nua-btn" href="${escapeHtml(safeMeetingUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 20px;border-radius:8px;background-color:#661C30;color:#ffffff;text-decoration:none;font-size:12.5px;font-weight:600;">
          Entrar na Sala Virtual
        </a>
      </div>`
    : `
      <div class="nua-surface" style="background-color:#f4f4f5;border:1px solid #e4e4e7;border-radius:10px;padding:14px 16px;margin:0 0 20px;">
        <div class="nua-muted" style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#71717a;font-weight:700;margin-bottom:4px;">
          Acesso à Sala Privativa
        </div>
        <p class="nua-body" style="margin:0;font-size:13px;color:#3f3f46;line-height:1.55;">
          Sua reserva está confirmada. Assim que o link exclusivo da sala for gerado, ele aparecerá automaticamente no seu voucher e na sua Área Privativa.
        </p>
      </div>`;

  const html = wrapEmailLayout({
    title: 'Agendamento confirmado',
    preheader: `Pagamento confirmado para ${dataFormatada}. Acesse os detalhes na sua conta.`,
    heading: 'Seu agendamento está confirmado',
    eyebrow: 'Confirmação de Agenda',
    bodyHtml: `
      <p class="nua-body" style="font-size:14.5px;color:#3f3f46;margin:0 0 20px;line-height:1.65;">
        Olá, <strong class="nua-title" style="color:#18181b;">${escapeHtml(booking.clientName)}</strong>. Seu pagamento foi confirmado e seu horário está garantido.
      </p>
      ${renderEmailDetailsTable([
        { label: 'Data', value: dataFormatada },
        { label: 'Horários', value: times.combined },
        { label: 'Duração', value: `${booking.durationMinutes} minutos` },
        { label: 'Valor pago', value: formatCurrencyBrl(booking.price) },
        { label: 'Status', value: 'Confirmada', highlightColor: '#15803d' },
      ])}
      ${roomBlock}
      ${renderEmailPrimaryCta({
        url: voucherUrl,
        label: 'Acessar Voucher da Reserva',
        secondaryUrl: accountUrl,
        secondaryLabel: 'Acompanhar na Minha Conta',
      })}
      <div class="nua-quote" style="background-color:#f4f4f5;border-left:3px solid #661C30;border-radius:6px;padding:14px 16px;margin-top:22px;">
        <div class="nua-title" style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#18181b;margin-bottom:6px;">
          Orientações importantes
        </div>
        <ul class="nua-body" style="margin:0;padding-left:18px;font-size:12.5px;color:#3f3f46;line-height:1.65;">
          <li>Acesse alguns minutos antes para testar som e imagem.</li>
          <li>Pontualidade garante o aproveitamento integral da duração contratada.</li>
          <li>Atendimento individual, confidencial e sem permissão de gravação.</li>
        </ul>
      </div>
    `,
    footerNote: 'Guarde este e-mail para acessar sua reserva com discrição em qualquer dispositivo.',
  });

  const res = await sendSmtpEmailDetailed(env, {
    to: recipient,
    subject: 'Confirmação do seu agendamento',
    html,
  });
  return { success: res.ok, error: res.error, messageId: res.messageId };
}

/**
 * Envia notificação por e-mail quando o link da sala virtual é disponibilizado ou atualizado.
 */
export async function sendMeetingLinkUpdatedEmail(
  env: any,
  booking: AppointmentBooking
): Promise<EmailResult> {
  const recipient = (booking.clientEmail || '').trim();
  const safeMeetingUrl = sanitizeEmailHref(booking.meeting?.url);
  if (!EMAIL_RE.test(recipient) || !safeMeetingUrl) {
    return { success: false, error: 'Link da sala ou e-mail inválido.' };
  }

  const scheduleTz = booking.timezone || 'Europe/Dublin';
  const clientTz = booking.clientTimezone || 'America/Sao_Paulo';
  const times = formatDualTimezone(booking.date, booking.startTime, booking.endTime, scheduleTz, clientTz);
  const dataFormatada = formatDateForDisplay(times.clientDate);
  const { voucherUrl, accountUrl } = buildUrls(booking);

  const html = wrapEmailLayout({
    title: 'Link de acesso liberado',
    preheader: `O link de acesso para o seu agendamento de ${dataFormatada} já está disponível.`,
    heading: 'Seu link de acesso está pronto',
    eyebrow: 'Acesso Liberado',
    bodyHtml: `
      <p class="nua-body" style="font-size:14.5px;color:#3f3f46;margin:0 0 18px;line-height:1.65;">
        Olá, <strong class="nua-title" style="color:#18181b;">${escapeHtml(booking.clientName)}</strong>. O link exclusivo do seu agendamento já foi liberado.
      </p>
      ${renderEmailDetailsTable([
        { label: 'Data', value: dataFormatada },
        { label: 'Horário', value: times.combined },
      ])}
      <div class="nua-surface" style="background-color:#f4f4f5;border:1px solid #e4e4e7;border-radius:10px;padding:14px 16px;margin:0 0 18px;">
        <p class="nua-body" style="margin:0;font-size:13px;color:#3f3f46;line-height:1.55;">
          ${escapeHtml(booking.meeting?.instructions || 'Por favor, teste sua câmera e microfone alguns minutos antes do horário marcado.')}
        </p>
      </div>
      ${renderEmailPrimaryCta({
        url: safeMeetingUrl,
        label: 'Entrar na Sala Virtual',
        secondaryUrl: voucherUrl || accountUrl,
        secondaryLabel: 'Visualizar voucher e instruções completas',
      })}
    `,
    footerNote: 'Link individual e intransferível enviado automaticamente de forma reservada.',
  });

  const res = await sendSmtpEmailDetailed(env, {
    to: recipient,
    subject: 'Link de acesso do seu agendamento',
    html,
  });
  return { success: res.ok, error: res.error, messageId: res.messageId };
}
