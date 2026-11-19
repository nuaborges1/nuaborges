import { DEFAULT_APPOINTMENTS_TIMEZONE, SUPPORTED_TIMEZONES } from './types';

/**
 * Formata um valor monetário em Reais (BRL).
 * Protegido contra NaN e valores nulos ou indefinidos.
 */
export function formatCurrencyBrl(val?: number | null): string {
  const numeric = typeof val === 'number' && !isNaN(val) ? val : 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numeric);
}

/**
 * Converte data e hora para os minutos totais do dia (ex: "14:30" -> 870)
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Converte minutos totais do dia para string "HH:mm" (ex: 870 -> "14:30")
 */
export function minutesToTimeString(minutes: number): string {
  const safeMinutes = Math.max(0, Math.min(minutes, 24 * 60 - 1));
  const h = Math.floor(safeMinutes / 60);
  const m = safeMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Adiciona minutos a uma string "HH:mm"
 */
export function addMinutesToTime(time: string, minutes: number): string {
  const total = timeStringToMinutes(time) + minutes;
  return minutesToTimeString(total);
}

/**
 * Formata uma data no formato "YYYY-MM-DD" para "DD/MM/AAAA" sem risco de
 * deslocamento de fuso (evita new Date("YYYY-MM-DD") interpretado como UTC).
 */
export function formatDateForDisplay(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Retorna o rótulo amigável em português para um identificador de fuso IANA.
 */
export function getTimezoneLabel(tz: string): string {
  const found = SUPPORTED_TIMEZONES.find((item) => item.value === tz);
  if (found) return found.label;
  if (tz === 'Europe/Dublin') return 'Irlanda (Dublin)';
  if (tz === 'America/Sao_Paulo') return 'Brasil (Brasília)';
  return tz;
}

export function getTimezoneShortLabel(tz: string): string {
  const found = SUPPORTED_TIMEZONES.find((item) => item.value === tz);
  if (found) return found.shortLabel;
  if (tz.includes('Dublin')) return 'Irlanda';
  if (tz.includes('Sao_Paulo')) return 'Brasília';
  return tz;
}

/**
 * Retorna os detalhes de tempo atual no fuso horário especificado (padrão Europe/Dublin).
 * Suporta qualquer identificador IANA válido via Intl.DateTimeFormat nativo.
 * Usa hourCycle: 'h23' e normaliza 24 -> 0 para nunca emitir "24:xx" à meia-noite.
 */
export function getScheduleNow(timezone = DEFAULT_APPOINTMENTS_TIMEZONE, date = new Date()): {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
  hour: number;
  minute: number;
  timeMinutes: number;
  dateString: string; // "YYYY-MM-DD"
  timeString: string; // "HH:mm"
} {
  const validTz = timezone || DEFAULT_APPOINTMENTS_TIMEZONE;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: validTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '0';

  const year = parseInt(getPart('year'), 10);
  const month = parseInt(getPart('month'), 10);
  const day = parseInt(getPart('day'), 10);
  const rawHour = parseInt(getPart('hour'), 10);
  const hour = rawHour === 24 ? 0 : rawHour;
  const minute = parseInt(getPart('minute'), 10);

  // Determina o dia da semana no fuso alvo
  const targetDateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayOfWeek = targetDateObj.getUTCDay();

  const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const timeMinutes = hour * 60 + minute;

  return { year, month, day, dayOfWeek, hour, minute, timeMinutes, dateString, timeString };
}

/**
 * Compatibilidade com chamadas legadas de Brasília.
 */
export function getBrasiliaNow(date = new Date()) {
  return getScheduleNow('America/Sao_Paulo', date);
}

/**
 * Calcula a data limite para a janela móvel de meses de calendário a partir de hoje
 * no fuso da agenda. Em fins de mês, ajusta para o último dia válido do mês de destino.
 */
export function getThreeMonthsFutureLimit(
  timezone = DEFAULT_APPOINTMENTS_TIMEZONE,
  baseDate = new Date(),
  months = 3
): string {
  const now = getScheduleNow(timezone, baseDate);
  let targetYear = now.year;
  const safeMonths = Number.isFinite(months) ? Math.max(1, Math.min(24, Math.floor(months))) : 3;
  let targetMonth = now.month + safeMonths;

  if (targetMonth > 12) {
    targetYear += Math.floor((targetMonth - 1) / 12);
    targetMonth = ((targetMonth - 1) % 12) + 1;
  }

  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const targetDay = Math.min(now.day, daysInTargetMonth);

  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
}

/**
 * Converte data e hora de um fuso IANA de origem para outro fuso IANA de destino.
 * Utiliza o instante UTC absoluto para evitar qualquer discrepância de horário de verão.
 */
export function convertSlotBetweenTimezones(
  date: string,
  time: string,
  fromTimezone: string,
  toTimezone: string
): { date: string; time: string } {
  if (!date || !time || fromTimezone === toTimezone) {
    return { date, time };
  }

  try {
    const [y, m, d] = date.split('-').map(Number);
    const [h, min] = time.split(':').map(Number);
    if (![y, m, d, h, min].every(Number.isFinite) || h < 0 || h > 23 || min < 0 || min > 59) {
      return { date, time };
    }

    const targetLocalMillis = Date.UTC(y, m - 1, d, h, min, 0);
    let utcMillis = Date.UTC(y, m - 1, d, h, min, 0);
    for (let i = 0; i < 5; i++) {
      const local = getScheduleNow(fromTimezone, new Date(utcMillis));
      const representedLocalMillis = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, 0);
      const delta = targetLocalMillis - representedLocalMillis;
      if (delta === 0) break;
      utcMillis += delta;
    }

    const resolvedSource = getScheduleNow(fromTimezone, new Date(utcMillis));
    if (resolvedSource.dateString !== date || resolvedSource.timeString !== time) {
      return { date, time };
    }

    const inTarget = getScheduleNow(toTimezone, new Date(utcMillis));
    return {
      date: inTarget.dateString,
      time: inTarget.timeString,
    };
  } catch {
    return { date, time };
  }
}

/**
 * Formata os horários nos dois fusos (Agenda da Nua e Cliente).
 * Inclui indicação explícita de dia caso a conversão cruze a meia-noite.
 */
export function formatDualTimezone(
  date: string,
  startTime: string,
  endTime: string,
  scheduleTz = DEFAULT_APPOINTMENTS_TIMEZONE,
  clientTz = 'America/Sao_Paulo'
): {
  primary: string;
  secondary: string;
  combined: string;
  clientDate: string;
} {
  const scheduleShort = getTimezoneShortLabel(scheduleTz);
  const clientShort = getTimezoneShortLabel(clientTz);

  if (scheduleTz === clientTz) {
    const text = `${startTime} às ${endTime} (${scheduleShort})`;
    return { primary: text, secondary: text, combined: text, clientDate: date };
  }

  const clientStart = convertSlotBetweenTimezones(date, startTime, scheduleTz, clientTz);
  const clientEnd = convertSlotBetweenTimezones(date, endTime, scheduleTz, clientTz);

  const dayShiftSuffix =
    clientStart.date && clientStart.date !== date
      ? ` de ${formatDateForDisplay(clientStart.date).slice(0, 5)}`
      : '';

  const clientText = `${clientStart.time} às ${clientEnd.time}${dayShiftSuffix} (${clientShort})`;
  const scheduleText = `${startTime} às ${endTime} (${scheduleShort})`;

  return {
    primary: clientText,
    secondary: scheduleText,
    combined: `${clientText} · ${scheduleText}`,
    clientDate: clientStart.date || date,
  };
}
