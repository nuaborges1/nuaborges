export const APPOINTMENTS_TIMEZONE = 'America/Sao_Paulo';
export const KV_APPOINTMENTS_SETTINGS_KEY = 'appointments:settings';
export const KV_APPOINTMENTS_MODALITIES_KEY = 'appointments:modalities';
export const KV_APPOINTMENTS_INDEX_KEY = 'appointments:index';
export const APPOINTMENTS_STORAGE_KEY = 'nua_appointments_data';

export type AppointmentStatus =
  | 'aguardando_pagamento'
  | 'confirmada'
  | 'concluida'
  | 'cancelada'
  | 'reagendamento_pendente'
  | 'nao_compareceu'
  | 'reembolso_pendente';

export type PaymentStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'refunded'
  | 'manual_confirmed';

export interface AppointmentModality {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  priceFormatted: string;
  active: boolean;
  minNoticeHours: number;
  rules: string[];
  clientInstructions: string;
  order: number;
}

export interface DayScheduleRange {
  start: string; // "14:00"
  end: string;   // "21:00"
}

export interface WeeklyDaySchedule {
  enabled: boolean;
  ranges: DayScheduleRange[];
}

export interface AppointmentScheduleSettings {
  timezone: string;
  bufferMinutes: number;
  minNoticeHours: number;
  maxFutureDays: number;
  autoCancelPendingMinutes: number;
  weeklyHours: Record<number, WeeklyDaySchedule>; // 0 (Dom) a 6 (Sáb)
  blockedDates: string[]; // ["2026-10-25", ...]
  blockedSlots: Array<{
    date: string; // "2026-10-25"
    start: string; // "15:00"
    end: string; // "17:00"
    reason?: string;
  }>;
  meetingPlatform: 'google_meet' | 'jitsi' | 'custom';
  customMeetingInstructions?: string;
  pixKey?: string;
  pixReceiverName?: string;
  pixCity?: string;
}

export interface AppointmentBooking {
  id: string;
  publicToken: string; // Token secreto para o cliente acessar sua reserva sem ver a de outros
  modalityId: string;
  modalityName: string;
  durationMinutes: number;
  price: number;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientNotes?: string;
  status: AppointmentStatus;
  payment: {
    status: PaymentStatus;
    method: 'pix' | 'manual' | 'free';
    pixPayload?: string;
    pixQrCode?: string;
    amount: number;
    paidAt?: string;
    transactionId?: string;
  };
  meeting: {
    url?: string;
    platform: string;
    instructions?: string;
    visibleToClient: boolean;
  };
  cancellationReason?: string;
  cancelledBy?: 'client' | 'admin';
  rescheduledFrom?: {
    date: string;
    startTime: string;
  };
  history: Array<{
    at: string;
    action: string;
    note?: string;
    author: 'client' | 'admin' | 'system';
  }>;
  expiresAt: string; // ISO Datetime
  createdAt: string; // ISO Datetime
  updatedAt: string; // ISO Datetime
}

export const DEFAULT_MODALITIES: AppointmentModality[] = [
  {
    id: 'chamada-30',
    name: 'Encontro Privativo (30 min)',
    description: 'Conversa intimista, envolvente e exclusiva em vídeo com Nua Borges em tempo real.',
    durationMinutes: 30,
    price: 250,
    priceFormatted: 'R$ 250,00',
    active: true,
    minNoticeHours: 4,
    rules: [
      'Acesso individual e estritamente confidencial',
      'Pontualidade para aproveitamento total do tempo',
      'Respeito mútuo durante toda a chamada',
      'Gravações de áudio ou vídeo são expressamente proibidas',
    ],
    clientInstructions:
      'O link da sala privativa será liberado nesta página assim que a reserva for confirmada.',
    order: 1,
  },
  {
    id: 'chamada-60',
    name: 'Experiência VIP Completa (60 min)',
    description: 'Uma hora inteira de dedicação, intimidade autoral e conexão profunda com Nua Borges.',
    durationMinutes: 60,
    price: 450,
    priceFormatted: 'R$ 450,00',
    active: true,
    minNoticeHours: 6,
    rules: [
      'Ambiente calmo, iluminado e privado',
      'Tolerância máxima de 10 minutos de atraso',
      'Não é permitido compartilhamento do link com terceiros',
      'Termos de confidencialidade bilaterais rigorosos',
    ],
    clientInstructions:
      'Recomendamos entrar 5 minutos antes para testar microfone e câmera. Fique à vontade e relaxe.',
    order: 2,
  },
];

export const DEFAULT_SCHEDULE_SETTINGS: AppointmentScheduleSettings = {
  timezone: APPOINTMENTS_TIMEZONE,
  bufferMinutes: 15, // 15 minutos entre chamadas para descanso e preparação
  minNoticeHours: 4,  // Mínimo de 4 horas de antecedência
  maxFutureDays: 30,  // Agendamento até 30 dias no futuro
  autoCancelPendingMinutes: 15, // Reservas pendentes expiram em 15 min liberando o slot
  weeklyHours: {
    0: { enabled: false, ranges: [] }, // Domingo: Fechado
    1: { enabled: true, ranges: [{ start: '14:00', end: '21:00' }] }, // Segunda
    2: { enabled: true, ranges: [{ start: '14:00', end: '21:00' }] }, // Terça
    3: { enabled: true, ranges: [{ start: '14:00', end: '21:00' }] }, // Quarta
    4: { enabled: true, ranges: [{ start: '14:00', end: '21:00' }] }, // Quinta
    5: { enabled: true, ranges: [{ start: '14:00', end: '22:00' }] }, // Sexta
    6: { enabled: true, ranges: [{ start: '15:00', end: '21:00' }] }, // Sábado
  },
  blockedDates: [],
  blockedSlots: [],
  meetingPlatform: 'google_meet',
  customMeetingInstructions: 'A chamada será realizada em sala privativa segura. O link direto de acesso fica disponível no seu voucher após a confirmação.',
  pixKey: '44521360000109',
  pixReceiverName: 'NB PRODUCOES DIGITAIS',
  pixCity: 'BRASILIA',
};

/**
 * Normaliza configurações vindas de qualquer origem (API, cache local, versões
 * antigas) para o formato canônico. Campos ausentes recebem o default e nunca
 * ficam `undefined` — evitando crashes na UI (ex.: blockedDates.includes).
 */
export function normalizeScheduleSettings(
  raw?: Partial<AppointmentScheduleSettings> | null
): AppointmentScheduleSettings {
  const source: any = raw && typeof raw === 'object' ? raw : {};

  const weeklyHours: Record<number, WeeklyDaySchedule> = {};
  for (let day = 0; day <= 6; day += 1) {
    const incoming = source.weeklyHours?.[day] ?? source.weeklyHours?.[String(day)];
    const fallback = DEFAULT_SCHEDULE_SETTINGS.weeklyHours[day];
    weeklyHours[day] = {
      enabled: typeof incoming?.enabled === 'boolean' ? incoming.enabled : fallback.enabled,
      ranges: Array.isArray(incoming?.ranges)
        ? incoming.ranges
            .filter((r: any) => r && typeof r.start === 'string' && typeof r.end === 'string')
            .map((r: DayScheduleRange) => ({ start: r.start, end: r.end }))
        : fallback.ranges.map((r) => ({ ...r })),
    };
  }

  const toNumber = (value: unknown, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  return {
    timezone: typeof source.timezone === 'string' && source.timezone ? source.timezone : DEFAULT_SCHEDULE_SETTINGS.timezone,
    bufferMinutes: toNumber(source.bufferMinutes, DEFAULT_SCHEDULE_SETTINGS.bufferMinutes),
    minNoticeHours: toNumber(
      source.minNoticeHours ?? source.advanceNoticeHours,
      DEFAULT_SCHEDULE_SETTINGS.minNoticeHours
    ),
    maxFutureDays: toNumber(
      source.maxFutureDays ?? source.maxAdvanceDays,
      DEFAULT_SCHEDULE_SETTINGS.maxFutureDays
    ),
    autoCancelPendingMinutes: toNumber(
      source.autoCancelPendingMinutes,
      DEFAULT_SCHEDULE_SETTINGS.autoCancelPendingMinutes
    ),
    weeklyHours,
    blockedDates: Array.isArray(source.blockedDates)
      ? source.blockedDates.filter((d: unknown) => typeof d === 'string')
      : [],
    blockedSlots: Array.isArray(source.blockedSlots) ? source.blockedSlots : [],
    meetingPlatform: ['google_meet', 'jitsi', 'custom'].includes(source.meetingPlatform)
      ? source.meetingPlatform
      : DEFAULT_SCHEDULE_SETTINGS.meetingPlatform,
    customMeetingInstructions:
      typeof source.customMeetingInstructions === 'string'
        ? source.customMeetingInstructions
        : DEFAULT_SCHEDULE_SETTINGS.customMeetingInstructions,
    pixKey: typeof source.pixKey === 'string' ? source.pixKey : DEFAULT_SCHEDULE_SETTINGS.pixKey,
    pixReceiverName:
      typeof source.pixReceiverName === 'string' ? source.pixReceiverName : DEFAULT_SCHEDULE_SETTINGS.pixReceiverName,
    pixCity: typeof source.pixCity === 'string' ? source.pixCity : DEFAULT_SCHEDULE_SETTINGS.pixCity,
  };
}

/**
 * Aplica uma alteração PARCIAL sobre as configurações atuais.
 *
 * Regra de ouro: o ponto de partida é sempre o que já está gravado — nunca os
 * defaults. Assim, enviar apenas `{ weeklyHours: { 1: ... } }` altera somente a
 * segunda-feira e mantém os outros dias exatamente como estavam. Sem isso, um
 * payload parcial reabria dias fechados (os defaults são "aberto").
 */
export function mergeScheduleSettings(
  current: Partial<AppointmentScheduleSettings> | null | undefined,
  patch: Partial<AppointmentScheduleSettings> | null | undefined
): AppointmentScheduleSettings {
  const base = normalizeScheduleSettings(current);
  const incoming: any = patch && typeof patch === 'object' ? patch : {};
  const merged: AppointmentScheduleSettings = { ...base };

  if (typeof incoming.timezone === 'string' && incoming.timezone) merged.timezone = incoming.timezone;

  const numericFields: Array<[keyof AppointmentScheduleSettings, unknown]> = [
    ['bufferMinutes', incoming.bufferMinutes],
    ['minNoticeHours', incoming.minNoticeHours ?? incoming.advanceNoticeHours],
    ['maxFutureDays', incoming.maxFutureDays ?? incoming.maxAdvanceDays],
    ['autoCancelPendingMinutes', incoming.autoCancelPendingMinutes],
  ];
  for (const [field, value] of numericFields) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      (merged as any)[field] = parsed;
    }
  }

  if (incoming.weeklyHours && typeof incoming.weeklyHours === 'object') {
    const weekly = { ...base.weeklyHours };
    for (let day = 0; day <= 6; day += 1) {
      const dayPatch = incoming.weeklyHours[day] ?? incoming.weeklyHours[String(day)];
      if (!dayPatch || typeof dayPatch !== 'object') continue;
      const previous = weekly[day] || { enabled: false, ranges: [] };
      weekly[day] = {
        enabled:
          typeof dayPatch.enabled === 'boolean' ? dayPatch.enabled : previous.enabled,
        ranges: Array.isArray(dayPatch.ranges)
          ? dayPatch.ranges
              .filter((r: any) => r && typeof r.start === 'string' && typeof r.end === 'string')
              .map((r: any) => ({ start: r.start, end: r.end }))
          : previous.ranges.map((r) => ({ ...r })),
      };
    }
    merged.weeklyHours = weekly;
  }

  if (Array.isArray(incoming.blockedDates)) {
    merged.blockedDates = incoming.blockedDates.filter((d: unknown) => typeof d === 'string');
  }
  if (Array.isArray(incoming.blockedSlots)) {
    merged.blockedSlots = incoming.blockedSlots;
  }
  if (['google_meet', 'jitsi', 'custom'].includes(incoming.meetingPlatform)) {
    merged.meetingPlatform = incoming.meetingPlatform;
  }
  if (typeof incoming.customMeetingInstructions === 'string') {
    merged.customMeetingInstructions = incoming.customMeetingInstructions;
  }
  if (typeof incoming.pixKey === 'string') merged.pixKey = incoming.pixKey;
  if (typeof incoming.pixReceiverName === 'string') merged.pixReceiverName = incoming.pixReceiverName;
  if (typeof incoming.pixCity === 'string') merged.pixCity = incoming.pixCity;

  return merged;
}
