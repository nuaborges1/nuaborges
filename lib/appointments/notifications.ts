import { AppointmentBooking } from './types';

/**
 * Gera arquivo padrão .ICS para importação em calendários (Google Calendar, Apple, Outlook).
 */
export function generateIcsCalendar(booking: AppointmentBooking): string {
  const [y, m, d] = booking.date.split('-');
  const [startH, startM] = booking.startTime.split(':');
  const [endH, endM] = booking.endTime.split(':');

  const dtStart = `${y}${m}${d}T${startH}${startM}00`;
  const dtEnd = `${y}${m}${d}T${endH}${endM}00`;
  const nowStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const title = `Chamada Privativa — Nua Borges (${booking.modalityName})`;
  const description = `Encontro privativo agendado com Nua Borges.\\n\\nModalidade: ${booking.modalityName}\\nCliente: ${booking.clientName}\\nStatus: Confirmada\\n\\nInstruções: ${booking.meeting.instructions || 'Acesse seu voucher de agendamento para abrir a chamada.'}`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nua Borges//Agendamento de Chamadas//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE',
    'TZID:America/Sao_Paulo',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0300',
    'TZOFFSETTO:-0300',
    'TZNAME:BRT',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${booking.id}@nuaborges.com`,
    `DTSTAMP:${nowStr}`,
    `DTSTART;TZID=America/Sao_Paulo:${dtStart}`,
    `DTEND;TZID=America/Sao_Paulo:${dtEnd}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${booking.meeting.url || 'Sala Privativa Online Nua Borges'}`,
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

  switch (type) {
    case 'confirmacao':
      return encodeURIComponent(
        `Olá, ${booking.clientName}! ♡\n\nSua chamada privativa com Nua Borges foi confirmada com sucesso!\n\n📅 Data: ${dataFormatada}\n⏰ Horário: ${booking.startTime} às ${booking.endTime} (Horário de Brasília)\n👑 Modalidade: ${booking.modalityName}\n\nVocê pode acompanhar seu agendamento e acessar as instruções pelo link seguro do seu voucher:\nhttps://nuaborges.com/chamadas/reserva?token=${booking.publicToken}\n\nAté breve!`
      );
    case 'link_reuniao':
      return encodeURIComponent(
        `Olá, ${booking.clientName}! 🌸\n\nO link da sua chamada com Nua Borges para hoje (${booking.startTime}) está pronto:\n${booking.meeting.url || 'Acesse o voucher abaixo'}\n\nVoucher: https://nuaborges.com/chamadas/reserva?token=${booking.publicToken}\n\nPor favor, acerte sua câmera e entre pontualmente. Te espero!`
      );
    case 'lembrete':
      return encodeURIComponent(
        `Lembrete especial, ${booking.clientName}! ♡\n\nNossa chamada privativa acontece hoje às ${booking.startTime}.\n\nRecomendamos acessar alguns minutos antes para verificar seu som e imagem.\n\nLink do agendamento: https://nuaborges.com/chamadas/reserva?token=${booking.publicToken}`
      );
    case 'cancelamento':
      return encodeURIComponent(
        `Olá, ${booking.clientName}.\n\nInformamos que seu agendamento de ${dataFormatada} às ${booking.startTime} precisou ser cancelado.\nMotivo: ${booking.cancellationReason || 'Imprevisto de agenda'}.\n\nCaso tenha realizado pagamento, o reembolso será processado. Entre em contato para reagendar.`
      );
  }
}
