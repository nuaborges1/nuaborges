import { APPOINTMENTS_TIMEZONE } from './types';

export function formatCurrencyBrl(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val);
}

/**
 * Converte data e hora para os minutos totais do dia (ex: "14:30" -> 870)
 */
export function timeStringToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Converte minutos totais do dia para string "HH:mm" (ex: 870 -> "14:30")
 */
export function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Retorna a data e hora atual no Fuso Horário de Brasília (America/Sao_Paulo)
 */
export function getBrasiliaNow(date = new Date()): {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
  hour: number;
  minute: number;
  dateString: string; // "YYYY-MM-DD"
  timeString: string; // "HH:mm"
} {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: APPOINTMENTS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '0';

  const year = parseInt(getPart('year'), 10);
  const month = parseInt(getPart('month'), 10);
  const day = parseInt(getPart('day'), 10);
  const hour = parseInt(getPart('hour'), 10);
  const minute = parseInt(getPart('minute'), 10);

  // Calcula dia da semana no fuso de Brasília
  const brasiliaDateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayOfWeek = brasiliaDateObj.getUTCDay();

  const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  return { year, month, day, dayOfWeek, hour, minute, dateString, timeString };
}

/**
 * Adiciona minutos a uma string "HH:mm"
 */
export function addMinutesToTime(time: string, minutes: number): string {
  const total = timeStringToMinutes(time) + minutes;
  return minutesToTimeString(total);
}
