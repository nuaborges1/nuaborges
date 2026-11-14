import {
  AppointmentModality,
  AppointmentScheduleSettings,
  AppointmentBooking,
} from './types';
import {
  getBrasiliaNow,
  timeStringToMinutes,
  minutesToTimeString,
  addMinutesToTime,
} from './timeUtils';

export interface SlotAvailabilityCheck {
  available: boolean;
  reason?: string;
  slots: string[];
}

/**
 * Calcula os horários livres e disponíveis para uma data específica e modalidade,
 * respeitando:
 * 1. Fuso horário de Brasília
 * 2. Horários semanais de atendimento e intervalos configurados
 * 3. Duração da modalidade selecionada + buffer time entre chamadas
 * 4. Antecedência mínima (não permite reservas no passado ou em cima da hora)
 * 5. Datas e horários bloqueados
 * 6. Reservas existentes ativas (descartando reservas não pagas expiradas)
 */
export function computeAvailableSlotsForDate(
  dateStr: string, // "YYYY-MM-DD"
  modality: AppointmentModality,
  settings: AppointmentScheduleSettings,
  existingBookings: AppointmentBooking[],
  currentDate = new Date()
): string[] {
  if (!modality || !modality.active) return [];

  const bNow = getBrasiliaNow(currentDate);

  // 1. Validação de formato da data
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return [];

  // 2. Não permite agendamento no passado (datas anteriores à data de hoje em Brasília)
  if (dateStr < bNow.dateString) return [];

  // 3. Validação do limite máximo de dias futuros
  const maxDate = new Date(currentDate);
  maxDate.setDate(maxDate.getDate() + settings.maxFutureDays);
  const bMax = getBrasiliaNow(maxDate);
  if (dateStr > bMax.dateString) return [];

  // 4. Validação de datas bloqueadas (férias, folgas)
  if (settings.blockedDates && settings.blockedDates.includes(dateStr)) {
    return [];
  }

  // 5. Determina o dia da semana da data solicitada
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetDateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayOfWeek = targetDateObj.getUTCDay();

  const daySchedule = settings.weeklyHours[dayOfWeek];
  if (!daySchedule || !daySchedule.enabled || !daySchedule.ranges || daySchedule.ranges.length === 0) {
    return [];
  }

  const durationMin = modality.durationMinutes;
  const bufferMin = settings.bufferMinutes || 0;
  const minNoticeHours = Math.max(settings.minNoticeHours || 0, modality.minNoticeHours || 0);

  // 6. Filtra reservas existentes válidas no mesmo dia
  const nowIso = currentDate.toISOString();
  const activeBookings = existingBookings.filter((b) => {
    if (b.date !== dateStr) return false;
    if (b.status === 'cancelada') return false;

    // Se estiver aguardando pagamento e já passou de expiresAt, o slot já está liberado!
    if (b.status === 'aguardando_pagamento' && b.expiresAt && b.expiresAt < nowIso) {
      return false;
    }
    return true;
  });

  // Filtra bloqueios manuais de slot para este dia
  const dayBlockedSlots = (settings.blockedSlots || []).filter((b) => b.date === dateStr);

  const availableSlots: string[] = [];

  // 7. Itera pelos intervalos configurados do dia
  for (const range of daySchedule.ranges) {
    const rangeStartMin = timeStringToMinutes(range.start);
    const rangeEndMin = timeStringToMinutes(range.end);

    // Passo do slot: 15 ou 30 minutos
    const stepMin = durationMin <= 30 ? 15 : 30;

    for (let slotStartMin = rangeStartMin; slotStartMin + durationMin <= rangeEndMin; slotStartMin += stepMin) {
      const slotEndMin = slotStartMin + durationMin;
      const slotStartTime = minutesToTimeString(slotStartMin);

      // Validação de antecedência mínima se for para hoje
      if (dateStr === bNow.dateString) {
        const currentMinToday = bNow.hour * 60 + bNow.minute;
        const requiredMinNotice = minNoticeHours * 60;
        if (slotStartMin < currentMinToday + requiredMinNotice) {
          continue; // Muito perto ou já passou
        }
      }

      // Validação de sobreposição com reservas ativas existentes
      // Intervalo da nova reserva + buffer: [slotStartMin, slotEndMin + bufferMin]
      let hasConflict = false;

      for (const booking of activeBookings) {
        const existingStart = timeStringToMinutes(booking.startTime);
        // O slot existente ocupa até endTime + buffer
        const existingEndWithBuffer = timeStringToMinutes(booking.endTime) + bufferMin;

        // Há sobreposição se o novo horário iniciar antes do fim do existente E terminar depois do início do existente
        if (slotStartMin < existingEndWithBuffer && slotEndMin + bufferMin > existingStart) {
          hasConflict = true;
          break;
        }
      }

      if (hasConflict) continue;

      // Validação de sobreposição com slots bloqueados pela Lua
      for (const blocked of dayBlockedSlots) {
        const blockedStart = timeStringToMinutes(blocked.start);
        const blockedEnd = timeStringToMinutes(blocked.end);

        if (slotStartMin < blockedEnd && slotEndMin > blockedStart) {
          hasConflict = true;
          break;
        }
      }

      if (hasConflict) continue;

      availableSlots.push(slotStartTime);
    }
  }

  return availableSlots;
}

/**
 * Valida rigorosamente uma tentativa de reserva no servidor antes de gravar
 */
export function validateBookingAttempt(
  payload: {
    modalityId: string;
    date: string;
    startTime: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    termsAccepted: boolean;
  },
  modalities: AppointmentModality[],
  settings: AppointmentScheduleSettings,
  existingBookings: AppointmentBooking[],
  currentDate = new Date()
): {
  success: boolean;
  error?: string;
  modality?: AppointmentModality;
  endTime?: string;
  expiresAt?: string;
} {
  if (!payload.termsAccepted) {
    return { success: false, error: 'É obrigatório aceitar os termos e condições do agendamento.' };
  }

  const name = (payload.clientName || '').trim();
  if (name.length < 2) {
    return { success: false, error: 'Por favor, informe seu nome completo.' };
  }

  const email = (payload.clientEmail || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Por favor, informe um endereço de e-mail válido.' };
  }

  const phone = (payload.clientPhone || '').replace(/\D/g, '');
  if (phone.length < 10 || phone.length > 13) {
    return { success: false, error: 'Por favor, informe um WhatsApp válido com DDD.' };
  }

  const modality = modalities.find((m) => m.id === payload.modalityId && m.active);
  if (!modality) {
    return { success: false, error: 'Modalidade de chamada inválida ou inativa.' };
  }

  // Verifica se o slot está efetivamente disponível
  const availableSlots = computeAvailableSlotsForDate(
    payload.date,
    modality,
    settings,
    existingBookings,
    currentDate
  );

  if (!availableSlots.includes(payload.startTime)) {
    return {
      success: false,
      error: 'Este horário acabou de ser reservado ou não está mais disponível. Por favor, escolha outro horário.',
    };
  }

  const endTime = addMinutesToTime(payload.startTime, modality.durationMinutes);

  // Calcula tempo de expiração da reserva temporária pendente de pagamento
  const expireMinutes = settings.autoCancelPendingMinutes || 15;
  const expiresAt = new Date(currentDate.getTime() + expireMinutes * 60 * 1000).toISOString();

  return {
    success: true,
    modality,
    endTime,
    expiresAt,
  };
}
