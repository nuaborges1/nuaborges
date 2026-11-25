export const DEFAULT_APPOINTMENTS_TIMEZONE = 'Europe/Dublin';
export const APPOINTMENTS_TIMEZONE = 'Europe/Dublin'; // Padrão da agenda da Nua Borges (República da Irlanda)
export const KV_APPOINTMENTS_SETTINGS_KEY = 'appointments:settings';
export const KV_APPOINTMENTS_MODALITIES_KEY = 'appointments:modalities';
export const KV_APPOINTMENTS_INDEX_KEY = 'appointments:index';
export const APPOINTMENTS_STORAGE_KEY = 'nua_appointments_data';

export interface SupportedTimezoneOption {
  value: string;
  label: string;
  shortLabel: string;
  city: string;
}

export const SUPPORTED_TIMEZONES: SupportedTimezoneOption[] = [
  { value: 'Europe/Dublin', label: 'Irlanda (Dublin — GMT/IST)', shortLabel: 'Irlanda', city: 'Dublin' },
  { value: 'America/Sao_Paulo', label: 'Brasil (Brasília — BRT)', shortLabel: 'Brasília', city: 'Brasília' },
  { value: 'Europe/Lisbon', label: 'Portugal (Lisboa — WET/WEST)', shortLabel: 'Portugal', city: 'Lisboa' },
  { value: 'Europe/London', label: 'Reino Unido (Londres — GMT/BST)', shortLabel: 'Londres', city: 'Londres' },
  { value: 'America/New_York', label: 'Estados Unidos (Nova York — EST/EDT)', shortLabel: 'Nova York', city: 'Nova York' },
  { value: 'UTC', label: 'Tempo Universal Coordenado (UTC)', shortLabel: 'UTC', city: 'UTC' },
];

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
  slug?: string;
  displayOrder?: number;
  cancellationPolicy?: string;
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
  timezone: string; // Fuso horário IANA da agenda da Nua (ex: "Europe/Dublin", "America/Sao_Paulo")
  bufferMinutes: number;
  minNoticeHours: number;
  maxFutureDays: number;
  maxAdvanceMonths?: number; // Janela móvel em meses de calendário
  dailyBookingLimit?: number | null; // Limite opcional de atendimentos diários (desativado por padrão; null/0 limpa o limite)
  autoCancelPendingMinutes: number;
  weeklyHours: Record<number, WeeklyDaySchedule>; // 0 (Dom) a 6 (Sáb)
  blockedDates: string[]; // ["2026-10-25", ...]
  monthAvailability?: Record<number, boolean[]>; // Ano -> 12 booleanos (true=aberto, false=fechado)
  dayOverrides?: Record<string, boolean>; // 'YYYY-MM-DD' -> true (aberto explicitamente) ou false (fechado explicitamente)
  gapMinutes?: number; // Alias sincronizado com bufferMinutes
  advanceDays?: number; // Alias sincronizado com maxFutureDays
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
  publicToken: string; // Token secreto para o cliente acessar seu voucher (prefixo tok_)
  modalityId: string;
  modalityName: string;
  durationMinutes: number;
  price: number;
  date: string; // "YYYY-MM-DD" no fuso da agenda
  startTime: string; // "HH:mm" no fuso da agenda
  endTime: string; // "HH:mm" no fuso da agenda
  timezone?: string; // Fuso da agenda no momento do agendamento (padrão Europe/Dublin)
  clientTimezone?: string; // Fuso detectado do cliente (ex: America/Sao_Paulo)
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  contactType?: 'whatsapp' | 'telegram' | 'outro';
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
    refundId?: string;
    refundAmount?: number;
  };
  refundStatus?:
    | 'not_applicable'
    | 'not_required'
    | 'pending'
    | 'completed'
    | 'refunded'
    | 'failed'
    | 'manual_required';
  refundId?: string;
  refundAmount?: number;
  refundError?: string;
  refundedAt?: string;
  meeting: {
    url?: string;
    platform: string;
    instructions?: string;
    visibleToClient: boolean;
  };
  proposal?: {
    date: string;
    time: string;
    origin: 'nua' | 'client';
    note?: string;
    at: string;
  } | null;
  cancellation?: {
    state: 'requested' | 'approved' | 'denied';
    by: 'client' | 'nua' | 'admin';
    reason: string;
    details?: string;
    requestedAt?: string;
    decidedAt?: string;
    resolvedAt?: string;
    previousStatus?: AppointmentStatus;
    denialNote?: string;
    decisionNote?: string;
    refundPercent?: number;
    refundAmount?: number;
    refundStatus?: 'awaiting_finance' | 'refunded' | 'failed' | 'not_applicable' | 'undecided';
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
    author: 'client' | 'admin' | 'system' | 'mercadopago_webhook';
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
  timezone: DEFAULT_APPOINTMENTS_TIMEZONE, // Europe/Dublin (Irlanda)
  bufferMinutes: 15, // 15 minutos entre chamadas para descanso e preparação
  minNoticeHours: 4, // Mínimo de 4 horas de antecedência
  maxFutureDays: 90, // Agendamento até 90 dias / 3 meses no futuro
  maxAdvanceMonths: 3, // Janela móvel de 3 meses de calendário
  gapMinutes: 15,
  advanceDays: 90,
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
  customMeetingInstructions:
    'A chamada será realizada em sala privativa segura. O link direto de acesso fica disponível no seu voucher após a confirmação.',
  pixKey: '',
  pixReceiverName: 'NUA BORGES',
  pixCity: 'BRASILIA',
};

function parseValidNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '' || typeof value === 'boolean') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Normaliza configurações vindas de qualquer origem (API, cache local, versões
 * antigas) para o formato canônico.
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

  const toNumber = (value: unknown, fallback: number, min = 0) => {
    const parsed = parseValidNumber(value);
    return parsed !== null ? Math.max(min, parsed) : fallback;
  };

  let monthAvailability: Record<number, boolean[]> | undefined = undefined;
  if (source.monthAvailability && typeof source.monthAvailability === 'object') {
    monthAvailability = {};
    for (const [k, v] of Object.entries(source.monthAvailability)) {
      const y = Number(k);
      if (Number.isFinite(y) && Array.isArray(v) && v.length === 12) {
        monthAvailability[y] = v.map((b: any) => Boolean(b));
      }
    }
  }

  let dayOverrides: Record<string, boolean> | undefined = undefined;
  if (source.dayOverrides && typeof source.dayOverrides === 'object') {
    dayOverrides = {};
    for (const [k, v] of Object.entries(source.dayOverrides)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(k) && typeof v === 'boolean') {
        dayOverrides[k] = v;
      }
    }
  }

  const resolvedBuffer = toNumber(
    source.bufferMinutes ?? source.gapMinutes,
    DEFAULT_SCHEDULE_SETTINGS.bufferMinutes,
    0
  );
  const resolvedFutureDays = toNumber(
    source.advanceDays ?? source.maxFutureDays ?? source.maxAdvanceDays,
    DEFAULT_SCHEDULE_SETTINGS.maxFutureDays,
    1
  );
  const resolvedAdvanceMonths = toNumber(
    source.maxAdvanceMonths,
    Math.max(1, Math.min(12, Math.round(resolvedFutureDays / 30))),
    1
  );

  const parsedLimit = parseValidNumber(source.dailyBookingLimit);

  return {
    timezone:
      typeof source.timezone === 'string' && source.timezone
        ? source.timezone
        : DEFAULT_SCHEDULE_SETTINGS.timezone,
    bufferMinutes: resolvedBuffer,
    gapMinutes: resolvedBuffer,
    minNoticeHours: toNumber(
      source.minNoticeHours ?? source.advanceNoticeHours,
      DEFAULT_SCHEDULE_SETTINGS.minNoticeHours,
      0
    ),
    maxFutureDays: resolvedFutureDays,
    advanceDays: resolvedFutureDays,
    maxAdvanceMonths: resolvedAdvanceMonths,
    dailyBookingLimit: parsedLimit !== null && parsedLimit > 0 ? Math.floor(parsedLimit) : undefined,
    autoCancelPendingMinutes: toNumber(
      source.autoCancelPendingMinutes,
      DEFAULT_SCHEDULE_SETTINGS.autoCancelPendingMinutes,
      5
    ),
    weeklyHours,
    blockedDates: Array.isArray(source.blockedDates)
      ? source.blockedDates.filter((d: unknown) => typeof d === 'string')
      : [],
    blockedSlots: Array.isArray(source.blockedSlots) ? source.blockedSlots : [],
    monthAvailability,
    dayOverrides,
    meetingPlatform: ['google_meet', 'jitsi', 'custom'].includes(source.meetingPlatform)
      ? source.meetingPlatform
      : DEFAULT_SCHEDULE_SETTINGS.meetingPlatform,
    customMeetingInstructions:
      typeof source.customMeetingInstructions === 'string'
        ? source.customMeetingInstructions
        : DEFAULT_SCHEDULE_SETTINGS.customMeetingInstructions,
    pixKey: typeof source.pixKey === 'string' ? source.pixKey : DEFAULT_SCHEDULE_SETTINGS.pixKey,
    pixReceiverName:
      typeof source.pixReceiverName === 'string'
        ? source.pixReceiverName
        : DEFAULT_SCHEDULE_SETTINGS.pixReceiverName,
    pixCity: typeof source.pixCity === 'string' ? source.pixCity : DEFAULT_SCHEDULE_SETTINGS.pixCity,
  };
}

/**
 * Aplica uma alteração PARCIAL sobre as configurações atuais.
 */
export type AppointmentSchedulePatch = Omit<Partial<AppointmentScheduleSettings>, 'weeklyHours'> & {
  weeklyHours?: Record<number, Partial<WeeklyDaySchedule>>;
};

export function mergeScheduleSettings(
  current: Partial<AppointmentScheduleSettings> | null | undefined,
  patch: AppointmentSchedulePatch | null | undefined
): AppointmentScheduleSettings {
  const base = normalizeScheduleSettings(current);
  const incoming: any = patch && typeof patch === 'object' ? patch : {};
  const merged: AppointmentScheduleSettings = { ...base };

  if (typeof incoming.timezone === 'string' && incoming.timezone) merged.timezone = incoming.timezone;

  // Buffer / Gap sincronizados
  const incomingBuffer = parseValidNumber(incoming.bufferMinutes ?? incoming.gapMinutes);
  if (incomingBuffer !== null && incomingBuffer >= 0) {
    merged.bufferMinutes = incomingBuffer;
    merged.gapMinutes = incomingBuffer;
  }

  // Antecedência mínima
  const incomingNotice = parseValidNumber(incoming.minNoticeHours ?? incoming.advanceNoticeHours);
  if (incomingNotice !== null && incomingNotice >= 0) {
    merged.minNoticeHours = incomingNotice;
  }

  // Horizonte futuro sincronizado (advanceDays / maxFutureDays / maxAdvanceMonths)
  const incomingDays = parseValidNumber(incoming.advanceDays ?? incoming.maxFutureDays ?? incoming.maxAdvanceDays);
  const incomingMonths = parseValidNumber(incoming.maxAdvanceMonths);
  if (incomingDays !== null && incomingDays > 0) {
    merged.maxFutureDays = incomingDays;
    merged.advanceDays = incomingDays;
    merged.maxAdvanceMonths =
      incomingMonths !== null && incomingMonths > 0
        ? incomingMonths
        : Math.max(1, Math.min(12, Math.round(incomingDays / 30)));
  } else if (incomingMonths !== null && incomingMonths > 0) {
    merged.maxAdvanceMonths = incomingMonths;
    merged.maxFutureDays = incomingMonths * 30;
    merged.advanceDays = incomingMonths * 30;
  }

  // Limite diário (permite desativar enviando null, 0, "" ou undefined explícito na chave)
  if ('dailyBookingLimit' in incoming) {
    if (
      incoming.dailyBookingLimit === null ||
      incoming.dailyBookingLimit === undefined ||
      incoming.dailyBookingLimit === '' ||
      incoming.dailyBookingLimit === 0
    ) {
      merged.dailyBookingLimit = undefined;
    } else {
      const lim = parseValidNumber(incoming.dailyBookingLimit);
      merged.dailyBookingLimit = lim !== null && lim > 0 ? Math.floor(lim) : undefined;
    }
  }

  const incomingAutoCancel = parseValidNumber(incoming.autoCancelPendingMinutes);
  if (incomingAutoCancel !== null && incomingAutoCancel >= 5) {
    merged.autoCancelPendingMinutes = incomingAutoCancel;
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

  if (incoming.monthAvailability && typeof incoming.monthAvailability === 'object') {
    const nextMonths = { ...(base.monthAvailability || {}) };
    for (const [k, v] of Object.entries(incoming.monthAvailability)) {
      const y = Number(k);
      if (Number.isFinite(y) && Array.isArray(v) && v.length === 12) {
        nextMonths[y] = v.map((b) => Boolean(b));
      }
    }
    merged.monthAvailability = nextMonths;
  } else if (base.monthAvailability) {
    merged.monthAvailability = { ...base.monthAvailability };
  }

  if (incoming.dayOverrides && typeof incoming.dayOverrides === 'object') {
    const nextOverrides: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(incoming.dayOverrides)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(k) && typeof v === 'boolean') {
        nextOverrides[k] = v;
      }
    }
    merged.dayOverrides = nextOverrides;
  } else if (base.dayOverrides) {
    merged.dayOverrides = { ...base.dayOverrides };
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
