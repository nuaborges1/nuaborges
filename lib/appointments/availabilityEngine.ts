import {
  AppointmentModality,
  AppointmentScheduleSettings,
  AppointmentBooking,
  DEFAULT_APPOINTMENTS_TIMEZONE,
  DEFAULT_SCHEDULE_SETTINGS,
} from './types';
import {
  getScheduleNow,
  getThreeMonthsFutureLimit,
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
 * Validador universal e flexível de contato (WhatsApp ou Telegram)
 * Suporta formatos brasileiros, internacionais (ex: Irlanda +353) e Telegram @handle.
 */
export function validateClientContact(contactStr: string): {
  valid: boolean;
  normalized: string;
  type: 'whatsapp' | 'telegram' | 'outro';
  error?: string;
} {
  const trimmed = (contactStr || '').trim();
  if (!trimmed) {
    return {
      valid: false,
      normalized: '',
      type: 'whatsapp',
      error: 'Por favor, informe seu WhatsApp ou Telegram para contato.',
    };
  }

  // Telegram @handle
  if (trimmed.startsWith('@') || /^[a-zA-Z][a-zA-Z0-9_]{3,31}$/.test(trimmed)) {
    const handle = trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
    return { valid: true, normalized: handle, type: 'telegram' };
  }

  // Telefone / WhatsApp (limpa caracteres não numéricos exceto sinal de +)
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  if (digits.length < 8 || digits.length > 16) {
    return {
      valid: false,
      normalized: trimmed,
      type: 'whatsapp',
      error:
        'Por favor, informe um número de WhatsApp válido com código de área/país ou seu @usuário do Telegram.',
    };
  }

  return {
    valid: true,
    normalized: hasPlus ? `+${digits}` : digits,
    type: 'whatsapp',
  };
}

/**
 * Helpers Canônicos V9 para Disponibilidade Determinística Unificada
 */
export function getMonthsForYear(settings: AppointmentScheduleSettings, year: number): boolean[] {
  if (
    settings.monthAvailability &&
    Array.isArray(settings.monthAvailability[year]) &&
    settings.monthAvailability[year].length === 12
  ) {
    return settings.monthAvailability[year];
  }
  return Array(12).fill(true);
}

export function getExplicitDayOverride(
  settings: AppointmentScheduleSettings,
  dateStr: string
): boolean | null {
  if (
    settings.dayOverrides &&
    Object.prototype.hasOwnProperty.call(settings.dayOverrides, dateStr)
  ) {
    return settings.dayOverrides[dateStr];
  }
  if (settings.blockedDates && settings.blockedDates.includes(dateStr)) {
    return false;
  }
  return null;
}

export function getDayClosureReason(
  settings: AppointmentScheduleSettings,
  dateStr: string,
  todayStr?: string
): 'past' | 'blocked' | 'month' | 'weekday' | null {
  if (todayStr && dateStr < todayStr) return 'past';

  const choice = getExplicitDayOverride(settings, dateStr);
  if (choice === true) return null; // Abertura explícita sobrepõe mês fechado ou dia da semana desativado
  if (choice === false) return 'blocked';

  const [y, m, d] = dateStr.split('-').map(Number);
  const months = getMonthsForYear(settings, y);
  if (!months[m - 1]) return 'month'; // Mês fechado

  const targetDateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayOfWeek = targetDateObj.getUTCDay();
  const weeklyHours = settings.weeklyHours || DEFAULT_SCHEDULE_SETTINGS.weeklyHours;
  const weekly = weeklyHours?.[dayOfWeek] ?? weeklyHours?.[String(dayOfWeek) as any];
  if (!weekly || !weekly.enabled || !weekly.ranges || weekly.ranges.length === 0) {
    return 'weekday';
  }

  return null;
}

export function isDayOpenForBooking(
  settings: AppointmentScheduleSettings,
  dateStr: string,
  todayStr?: string
): boolean {
  return getDayClosureReason(settings, dateStr, todayStr) === null;
}

export function computeAvailableSlotsForDate(
  dateStr: string, // "YYYY-MM-DD"
  modality: AppointmentModality,
  settings: AppointmentScheduleSettings,
  existingBookings: AppointmentBooking[],
  currentDate = new Date(),
  options?: { allowInactiveModality?: boolean }
): string[] {
  if (!modality || (!modality.active && !options?.allowInactiveModality)) return [];

  const timezone = settings.timezone || DEFAULT_APPOINTMENTS_TIMEZONE;
  const scheduleNow = getScheduleNow(timezone, currentDate);

  // 1. Validação de formato da data
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return [];

  // 2. Não permite agendamento no passado (datas anteriores à data de hoje no fuso da agenda)
  if (dateStr < scheduleNow.dateString) return [];

  // 3. Janela móvel configurável a partir de hoje no fuso da agenda.
  const maxCalendarLimit = getThreeMonthsFutureLimit(
    timezone,
    currentDate,
    settings.maxAdvanceMonths ?? 3
  );
  if (dateStr > maxCalendarLimit) return [];

  // 4 & 5. Validação unificada V9: Sobrescrita explícita de dia -> Mês -> Dia da semana
  const closureReason = getDayClosureReason(settings, dateStr);
  if (closureReason !== null) {
    return [];
  }

  const [y, m, d] = dateStr.split('-').map(Number);
  const targetDateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayOfWeek = targetDateObj.getUTCDay();

  // Se o dia foi explicitamente aberto, mas a rotina semanal daquele dia da semana está vazia, busca horário padrão
  const weeklyHours = settings.weeklyHours || DEFAULT_SCHEDULE_SETTINGS.weeklyHours;
  let daySchedule = weeklyHours?.[dayOfWeek] ?? weeklyHours?.[String(dayOfWeek) as any];
  if (!daySchedule || !daySchedule.ranges || daySchedule.ranges.length === 0) {
    daySchedule = { enabled: true, ranges: [{ start: '14:00', end: '20:00' }] };
  }

  const durationMin = Math.max(10, Number(modality.durationMinutes) || 30);
  const bufferMin = Math.max(0, Number(settings.bufferMinutes ?? settings.gapMinutes ?? 0));
  // Fonte única de verdade: settings.minNoticeHours configurado pela Nua na aba Disponibilidade
  const minNoticeHours = Math.max(0, Number(settings.minNoticeHours ?? 0));

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

  // Limite diário de atendimentos (inclui confirmadas, pendentes válidas, propostas e concluídas no dia)
  if (settings.dailyBookingLimit && settings.dailyBookingLimit > 0) {
    const confirmedCount = activeBookings.filter(
      (b) =>
        b.status === 'confirmada' ||
        b.status === 'aguardando_pagamento' ||
        b.status === 'reagendamento_pendente' ||
        b.status === 'concluida'
    ).length;
    if (confirmedCount >= settings.dailyBookingLimit) {
      return [];
    }
  }

  const dayBlockedSlots = (settings.blockedSlots || []).filter((b) => b.date === dateStr);
  const availableSlots: string[] = [];

  const [nowY, nowM, nowD] = scheduleNow.dateString.split('-').map(Number);
  const dayDiffFromToday = Math.round(
    (Date.UTC(y, m - 1, d) - Date.UTC(nowY, nowM - 1, nowD)) / 86400000
  );
  const requiredMinNotice = minNoticeHours * 60;

  // 7. Itera pelos intervalos configurados do dia
  for (const range of daySchedule.ranges) {
    const rangeStartMin = timeStringToMinutes(range.start);
    const rangeEndMin = timeStringToMinutes(range.end);
    if (rangeEndMin <= rangeStartMin) continue;

    // Passo do slot: 15 ou 30 minutos
    const stepMin = durationMin <= 30 ? 15 : 30;

    for (
      let slotStartMin = rangeStartMin;
      slotStartMin + durationMin <= rangeEndMin;
      slotStartMin += stepMin
    ) {
      const slotEndMin = slotStartMin + durationMin;
      const slotStartTime = minutesToTimeString(slotStartMin);

      // Validação contínua de antecedência mínima (funciona inclusive na virada da meia-noite!)
      const minutesFromNow = dayDiffFromToday * 1440 + slotStartMin - scheduleNow.timeMinutes;
      if (minutesFromNow < requiredMinNotice) {
        continue;
      }

      // Validação de sobreposição com reservas ativas existentes
      let hasConflict = false;
      for (const booking of activeBookings) {
        const existingStart = timeStringToMinutes(booking.startTime);
        const existingEndWithBuffer = timeStringToMinutes(booking.endTime) + bufferMin;

        if (slotStartMin < existingEndWithBuffer && slotEndMin + bufferMin > existingStart) {
          hasConflict = true;
          break;
        }
      }
      if (hasConflict) continue;

      // Validação de sobreposição com slots bloqueados pela Nua
      for (const blocked of dayBlockedSlots) {
        const blockedStart = timeStringToMinutes(blocked.start);
        const blockedEnd = timeStringToMinutes(blocked.end);

        if (slotStartMin < blockedEnd && slotEndMin > blockedStart) {
          hasConflict = true;
          break;
        }
      }
      if (hasConflict) continue;

      if (!availableSlots.includes(slotStartTime)) {
        availableSlots.push(slotStartTime);
      }
    }
  }

  return availableSlots;
}

/**
 * Valida rigorosamente uma tentativa de reserva no servidor antes de persistir
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
  currentDate = new Date(),
  options?: {
    allowInactiveModality?: boolean;
    fallbackModality?: AppointmentModality;
  }
): {
  success: boolean;
  error?: string;
  modality?: AppointmentModality;
  endTime?: string;
  expiresAt?: string;
  normalizedContact?: string;
  contactType?: 'whatsapp' | 'telegram' | 'outro';
} {
  if (!payload.termsAccepted) {
    return {
      success: false,
      error: 'É obrigatório aceitar as diretrizes do agendamento para prosseguir.',
    };
  }

  const name = (payload.clientName || '').trim();
  if (name.length < 2) {
    return { success: false, error: 'Por favor, informe seu nome completo ou apelido.' };
  }

  const email = (payload.clientEmail || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Por favor, informe um endereço de e-mail válido.' };
  }

  const contactCheck = validateClientContact(payload.clientPhone);
  if (!contactCheck.valid) {
    return {
      success: false,
      error: contactCheck.error || 'Por favor, informe um contato válido.',
    };
  }

  const modality =
    modalities.find(
      (m) => m.id === payload.modalityId && (m.active || options?.allowInactiveModality)
    ) || options?.fallbackModality;
  if (!modality) {
    return { success: false, error: 'Modalidade de chamada inválida ou inativa.' };
  }

  // Verifica se o slot está efetivamente disponível
  const availableSlots = computeAvailableSlotsForDate(
    payload.date,
    modality,
    settings,
    existingBookings,
    currentDate,
    { allowInactiveModality: options?.allowInactiveModality || Boolean(options?.fallbackModality) }
  );

  if (!availableSlots.includes(payload.startTime)) {
    return {
      success: false,
      error:
        'Este horário acabou de ser reservado ou não está mais disponível na agenda. Por favor, escolha outro horário.',
    };
  }

  const endTime = addMinutesToTime(payload.startTime, modality.durationMinutes);
  const expireMinutes = settings.autoCancelPendingMinutes || 15;
  const expiresAt = new Date(currentDate.getTime() + expireMinutes * 60 * 1000).toISOString();

  return {
    success: true,
    modality,
    endTime,
    expiresAt,
    normalizedContact: contactCheck.normalized,
    contactType: contactCheck.type,
  };
}
