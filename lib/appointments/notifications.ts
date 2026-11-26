import { AppointmentBooking, DEFAULT_APPOINTMENTS_TIMEZONE } from './types';
import { convertSlotBetweenTimezones, formatDualTimezone } from './timeUtils';

/**
 * Gera arquivo padrão .ICS em UTC real para importação em calendários
 * (Google Calendar, Apple, Outlook) sem erro de deslocamento entre Dublin e Brasília.
 */
export function generateIcsCalendar(booking: AppointmentBooking): string {
  const scheduleTz = booking.timezone || DEFAULT_APPOINTMENTS_TIMEZONE;
  const utcStart = convertSlotBetweenTimezones(booking.date, booking.startTime, scheduleTz, 'UTC');
  const utcEnd = convertSlotBetweenTimezones(booking.date, booking.endTime, scheduleTz, 'UTC');

  const [sY, sM, sD] = utcStart.date.split('-');
  const [startH, startM] = utcStart.time.split(':');
  const [eY, eM, eD] = utcEnd.date.split('-');
  const [endH, endM] = utcEnd.time.split(':');

  const dtStart = `${sY}${sM}${sD}T${startH}${startM}00Z`;
  const dtEnd = `${eY}${eM}${eD}T${endH}${endM}00Z`;
  const nowStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const title = 'Compromisso Reservado';
  const description = 'Compromisso online confirmado.\\n\\nConsulte os detalhes e o link de acesso na sua conta ou no voucher da reserva.';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NB Digital//Agenda//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${booking.id}@nbdigital.local`,
    `DTSTAMP:${nowStr}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${booking.meeting?.url || 'Online'}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Utilitários de notificação e mensagens para WhatsApp
 */
export function generateWhatsAppMessage(
  booking: AppointmentBooking,
  type: 'confirmacao' | 'lembrete' | 'link_reuniao' | 'cancelamento'
): string {
  const dataFormatada = booking.date.split('-').reverse().join('/');
  const dual = formatDualTimezone(
    booking.date,
    booking.startTime,
    booking.endTime,
    booking.timezone || DEFAULT_APPOINTMENTS_TIMEZONE,
    booking.clientTimezone || 'America/Sao_Paulo'
  );

  switch (type) {
    case 'confirmacao':
      return encodeURIComponent(
        `Olá, ${booking.clientName}! ♡\n\nSua chamada privativa com Nua Borges foi confirmada com sucesso!\n\nData: ${dataFormatada}\nHorário: ${dual.combined}\nModalidade: ${booking.modalityName}\n\nVocê pode acompanhar seu agendamento e acessar as instruções pelo link seguro do seu voucher:\nhttps://nuaborges.com.br/chamadas/reserva?token=${booking.publicToken}\n\nAté breve!`
      );
    case 'link_reuniao':
      return encodeURIComponent(
        `Olá, ${booking.clientName}! ♡\n\nO link da sua chamada com Nua Borges para hoje (${dual.primary}) está pronto:\n${booking.meeting?.url || 'Acesse o voucher abaixo'}\n\nVoucher: https://nuaborges.com.br/chamadas/reserva?token=${booking.publicToken}\n\nPor favor, acerte sua câmera e entre pontualmente. Te espero!`
      );
    case 'lembrete':
      return encodeURIComponent(
        `Lembrete especial, ${booking.clientName}! ♡\n\nNossa chamada privativa acontece hoje (${dual.primary}).\n\nRecomendamos acessar alguns minutos antes para verificar seu som e imagem.\n\nLink do agendamento: https://nuaborges.com.br/chamadas/reserva?token=${booking.publicToken}`
      );
    case 'cancelamento':
      return encodeURIComponent(
        `Olá, ${booking.clientName}.\n\nInformamos que seu agendamento de ${dataFormatada} (${dual.primary}) precisou ser cancelado.\nMotivo: ${booking.cancellationReason || 'Imprevisto de agenda'}.\n\nCaso tenha realizado pagamento, o reembolso será processado. Entre em contato para reagendar.`
      );
  }
}
