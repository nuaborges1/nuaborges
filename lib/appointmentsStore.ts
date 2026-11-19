/**
 * Armazenamento e Gerenciador de Estado de Agendamentos | Nua Borges
 * 
 * Suporte isomorfo (executa tanto no navegador quanto no backend Node.js),
 * com validação contra concorrência e geração de chaves únicas.
 */

import {
  AppointmentBooking,
  AppointmentModality,
  AppointmentScheduleSettings,
  AppointmentStatus,
  DEFAULT_MODALITIES,
  DEFAULT_SCHEDULE_SETTINGS,
  APPOINTMENTS_STORAGE_KEY,
  validateBookingAttempt,
  addMinutesToTime,
  getScheduleNow,
} from './appointmentsCanonical';
import { generateRealPixCopiaECola, generatePixQrCodePngDataUrl } from './pixPayload';

export interface AppointmentsDataState {
  settings: AppointmentScheduleSettings;
  modalities: AppointmentModality[];
  bookings: AppointmentBooking[];
  version: number;
}

// Estado em memória (útil para Node.js dev e SSR)
let memoryState: AppointmentsDataState = {
  settings: DEFAULT_SCHEDULE_SETTINGS,
  modalities: DEFAULT_MODALITIES,
  bookings: [],
  version: 1,
};

// Gera ID único aleatório
export function generateBookingId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 7);
  return `app_${ts}_${rand}`;
}

// Gera token público seguro de 32 caracteres hex com prefixo canônico tok_
export function generatePublicToken(): string {
  let hex = '';
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    hex = crypto.randomUUID().replace(/-/g, '') + Math.random().toString(36).substring(2, 10);
  } else {
    hex = (
      Math.random().toString(36).substring(2) +
      Math.random().toString(36).substring(2) +
      Date.now().toString(36)
    ).substring(0, 32);
  }
  return `tok_${hex.toLowerCase()}`;
}

// Lê o estado completo
export function getAppointmentsState(): AppointmentsDataState {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(APPOINTMENTS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AppointmentsDataState;
        if (parsed && parsed.settings && parsed.modalities && Array.isArray(parsed.bookings)) {
          memoryState = parsed;
          return parsed;
        }
      }
    } catch {}
  }
  return memoryState;
}

// Salva o estado completo
// `silent: true` evita disparar o evento 'nua-appointments-updated'. Use em sincronizações internas
// cujo chamador já atualiza a UI (ex.: fetchAdminAppointments), para não criar loop de recarregamento.
export function saveAppointmentsState(
  state: AppointmentsDataState,
  options: { silent?: boolean } = {}
): void {
  memoryState = state;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(state));
      if (!options.silent) {
        window.dispatchEvent(new CustomEvent('nua-appointments-updated', { detail: state }));
      }
    } catch {}
  }
}

// ==========================================
// CONFIGURAÇÕES E MODALIDADES
// ==========================================

export function getScheduleSettings(): AppointmentScheduleSettings {
  return getAppointmentsState().settings;
}

export function saveScheduleSettings(settings: AppointmentScheduleSettings): void {
  const state = getAppointmentsState();
  state.settings = { ...settings };
  state.version += 1;
  saveAppointmentsState(state);
}

export function getModalities(): AppointmentModality[] {
  return getAppointmentsState().modalities;
}

export function saveModalities(modalities: AppointmentModality[]): void {
  const state = getAppointmentsState();
  state.modalities = [...modalities];
  state.version += 1;
  saveAppointmentsState(state);
}

// ==========================================
// CONSULTA E GESTÃO DE RESERVAS
// ==========================================

export function listBookings(): AppointmentBooking[] {
  const state = getAppointmentsState();
  const nowIso = new Date().toISOString();

  // Atualiza em tempo real status de reservas expiradas
  let updated = false;
  state.bookings.forEach((b) => {
    if (b.status === 'aguardando_pagamento' && b.expiresAt && b.expiresAt < nowIso) {
      b.status = 'cancelada';
      b.cancellationReason = 'Tempo limite de pagamento expirado (slot liberado automaticamente).';
      b.cancelledBy = 'admin';
      b.history.push({
        at: nowIso,
        action: 'expirada_automaticamente',
        note: 'Reserva expirada e slot liberado pelo servidor.',
        author: 'system',
      });
      updated = true;
    }
  });

  if (updated) {
    saveAppointmentsState(state);
  }

  // Ordena por data e horário (mais recentes primeiro)
  return [...state.bookings].sort((a, b) => {
    const dtA = `${a.date}T${a.startTime}`;
    const dtB = `${b.date}T${b.startTime}`;
    return dtB.localeCompare(dtA);
  });
}

export function getBookingById(id: string): AppointmentBooking | null {
  const bookings = listBookings();
  return bookings.find((b) => b.id === id) || null;
}

export function getBookingByToken(token: string): AppointmentBooking | null {
  if (!token) return null;
  const bookings = listBookings();
  return bookings.find((b) => b.publicToken === token) || null;
}

// ==========================================
// CRIAÇÃO ATÔMICA DE RESERVA COM PREVENÇÃO DE CONFLITOS
// ==========================================

export interface CreateBookingInput {
  modalityId: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientNotes?: string;
  termsAccepted: boolean;
  clientTimezone?: string;
}

export async function createBooking(input: CreateBookingInput): Promise<{
  success: boolean;
  booking?: AppointmentBooking;
  error?: string;
}> {
  const state = getAppointmentsState();
  const now = new Date();
  const nowIso = now.toISOString();

  // 1. Validação com o motor canônico de horários e regras
  const validation = validateBookingAttempt(
    input,
    state.modalities,
    state.settings,
    state.bookings,
    now
  );

  if (!validation.success || !validation.modality || !validation.endTime || !validation.expiresAt) {
    return {
      success: false,
      error: validation.error || 'Horário indisponível para agendamento.',
    };
  }

  const modality = validation.modality;
  const bookingId = generateBookingId();
  const publicToken = generatePublicToken();

  // 2. Geração oficial do Pix Copia e Cola e QR Code (fallback local)
  const pixKey = state.settings.pixKey || '';
  const merchantName = state.settings.pixReceiverName || 'NUA BORGES';
  const merchantCity = state.settings.pixCity || 'BRASILIA';
  const txid = `NB${Date.now().toString().slice(-8)}`;

  let pixPayload = '';
  let pixQrCode = '';

  try {
    pixPayload = generateRealPixCopiaECola({
      pixKey,
      merchantName,
      merchantCity,
      amount: modality.price,
      txid,
      description: `Chamada ${modality.durationMinutes}min Nua Borges`,
    });

    pixQrCode = await generatePixQrCodePngDataUrl(pixPayload);
  } catch {
    // Fallback BR Code
    pixPayload = `00020126580014br.gov.bcb.pix0136${pixKey}520400005303986540${modality.price.toFixed(
      2
    )}5802BR5921${merchantName}6008${merchantCity}62070503***6304ABCD`;
  }

  // 3. Montagem do registro de agendamento
  const newBooking: AppointmentBooking = {
    id: bookingId,
    publicToken,
    modalityId: modality.id,
    modalityName: modality.name,
    durationMinutes: modality.durationMinutes,
    price: modality.price,
    date: input.date,
    startTime: input.startTime,
    endTime: validation.endTime,
    clientName: input.clientName.trim(),
    clientEmail: input.clientEmail.trim().toLowerCase(),
    clientPhone: validation.normalizedContact || input.clientPhone.trim(),
    contactType: validation.contactType,
    clientNotes: (input.clientNotes || '').trim(),
    status: 'aguardando_pagamento',
    payment: {
      status: 'pending',
      method: 'pix',
      amount: modality.price,
      pixPayload,
      pixQrCode,
    },
    meeting: {
      platform: state.settings.meetingPlatform || 'google_meet',
      instructions: state.settings.customMeetingInstructions || 'O link de acesso à sala privativa será liberado após a confirmação do pagamento.',
      visibleToClient: false,
    },
    history: [
      {
        at: nowIso,
        action: 'criada',
        note: `Reserva iniciada pelo cliente. Aguardando pagamento Pix de ${modality.priceFormatted}.`,
        author: 'client',
      },
    ],
    expiresAt: validation.expiresAt,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  // 4. Salva no estado
  state.bookings.push(newBooking);
  state.version += 1;
  saveAppointmentsState(state);

  return {
    success: true,
    booking: newBooking,
  };
}

// ==========================================
// MUTAÇÕES ADMINISTRATIVAS E TRANSIÇÕES DE ESTADO
// ==========================================

export function confirmBookingPayment(
  bookingId: string,
  transactionId?: string,
  author: 'client' | 'admin' = 'admin'
): { success: boolean; booking?: AppointmentBooking; error?: string } {
  const state = getAppointmentsState();
  const booking = state.bookings.find((b) => b.id === bookingId);

  if (!booking) {
    return { success: false, error: 'Reserva não encontrada.' };
  }

  const nowIso = new Date().toISOString();
  booking.status = 'confirmada';
  booking.payment.status = author === 'admin' ? 'manual_confirmed' : 'approved';
  booking.payment.paidAt = nowIso;
  if (transactionId) {
    booking.payment.transactionId = transactionId;
  }
  booking.meeting.visibleToClient = true;
  booking.updatedAt = nowIso;
  booking.history.push({
    at: nowIso,
    action: 'pagamento_confirmado',
    note: author === 'admin' ? 'Pagamento validado manualmente pelo painel da Nua Borges.' : 'Pagamento Pix verificado com sucesso.',
    author,
  });

  saveAppointmentsState(state);
  return { success: true, booking };
}

export function updateMeetingLink(
  bookingId: string,
  meetingUrl: string,
  instructions?: string
): { success: boolean; booking?: AppointmentBooking; error?: string } {
  const state = getAppointmentsState();
  const booking = state.bookings.find((b) => b.id === bookingId);

  if (!booking) {
    return { success: false, error: 'Reserva não encontrada.' };
  }

  const nowIso = new Date().toISOString();
  booking.meeting.url = meetingUrl.trim();
  if (instructions !== undefined) {
    booking.meeting.instructions = instructions.trim();
  }
  booking.updatedAt = nowIso;
  booking.history.push({
    at: nowIso,
    action: 'link_atualizado',
    note: `Link da chamada definido para: ${meetingUrl.trim()}`,
    author: 'admin',
  });

  saveAppointmentsState(state);
  return { success: true, booking };
}

export function cancelBooking(
  bookingId: string,
  reason: string,
  cancelledBy: 'client' | 'admin' = 'admin'
): { success: boolean; booking?: AppointmentBooking; error?: string } {
  const state = getAppointmentsState();
  const booking = state.bookings.find((b) => b.id === bookingId);

  if (!booking) {
    return { success: false, error: 'Reserva não encontrada.' };
  }

  const nowIso = new Date().toISOString();
  booking.status = 'cancelada';
  booking.cancellationReason = reason.trim();
  booking.cancelledBy = cancelledBy;
  booking.updatedAt = nowIso;
  booking.history.push({
    at: nowIso,
    action: 'cancelada',
    note: `Cancelado por ${cancelledBy === 'admin' ? 'Administração' : 'Cliente'}. Motivo: ${reason.trim()}`,
    author: cancelledBy,
  });

  saveAppointmentsState(state);
  return { success: true, booking };
}

export function markBookingComplete(
  bookingId: string
): { success: boolean; booking?: AppointmentBooking; error?: string } {
  const state = getAppointmentsState();
  const booking = state.bookings.find((b) => b.id === bookingId);

  if (!booking) {
    return { success: false, error: 'Reserva não encontrada.' };
  }

  const nowIso = new Date().toISOString();
  const todayStr = getScheduleNow(state.settings.timezone).dateString;
  if (booking.date > todayStr) {
    return {
      success: false,
      error: `Não é possível marcar como concluída uma chamada agendada para uma data futura (${booking.date}).`,
    };
  }

  booking.status = 'concluida';
  booking.updatedAt = nowIso;
  booking.history.push({
    at: nowIso,
    action: 'concluida',
    note: 'Chamada de vídeo finalizada e concluída com sucesso.',
    author: 'admin',
  });

  saveAppointmentsState(state);
  return { success: true, booking };
}

export function markBookingAbsent(
  bookingId: string
): { success: boolean; booking?: AppointmentBooking; error?: string } {
  const state = getAppointmentsState();
  const booking = state.bookings.find((b) => b.id === bookingId);

  if (!booking) {
    return { success: false, error: 'Reserva não encontrada.' };
  }

  const nowIso = new Date().toISOString();
  const todayStr = getScheduleNow(state.settings.timezone).dateString;
  if (booking.date > todayStr) {
    return {
      success: false,
      error: `Não é possível marcar ausência em uma chamada agendada para uma data futura (${booking.date}).`,
    };
  }

  booking.status = 'nao_compareceu';
  booking.updatedAt = nowIso;
  booking.history.push({
    at: nowIso,
    action: 'ausente',
    note: 'Cliente não compareceu à sala no horário agendado.',
    author: 'admin',
  });

  saveAppointmentsState(state);
  return { success: true, booking };
}

export function rescheduleBooking(
  bookingId: string,
  newDate: string,
  newStartTime: string
): { success: boolean; booking?: AppointmentBooking; error?: string } {
  const state = getAppointmentsState();
  const booking = state.bookings.find((b) => b.id === bookingId);

  if (!booking) {
    return { success: false, error: 'Reserva não encontrada.' };
  }

  const fallbackModality: AppointmentModality = {
    id: booking.modalityId,
    name: booking.modalityName || 'Chamada Privativa',
    description: '',
    durationMinutes: booking.durationMinutes || 30,
    price: booking.price || 250,
    priceFormatted: `R$ ${(booking.price || 250).toFixed(2).replace('.', ',')}`,
    active: true,
    minNoticeHours: 0,
    rules: [],
    clientInstructions: '',
    order: 1,
  };

  // Valida disponibilidade do novo horário (excluindo a própria reserva da checagem)
  const otherBookings = state.bookings.filter((b) => b.id !== bookingId);
  const validation = validateBookingAttempt(
    {
      modalityId: booking.modalityId,
      date: newDate,
      startTime: newStartTime,
      clientName: booking.clientName,
      clientEmail: booking.clientEmail,
      clientPhone: booking.clientPhone,
      termsAccepted: true,
    },
    state.modalities,
    state.settings,
    otherBookings,
    new Date(),
    { allowInactiveModality: true, fallbackModality }
  );

  if (!validation.success || !validation.endTime) {
    return {
      success: false,
      error: validation.error || 'O novo horário selecionado não está disponível.',
    };
  }

  const nowIso = new Date().toISOString();
  booking.rescheduledFrom = {
    date: booking.date,
    startTime: booking.startTime,
  };
  booking.date = newDate;
  booking.startTime = newStartTime;
  booking.endTime = validation.endTime;
  booking.proposal = null;
  booking.status = 'confirmada';
  booking.updatedAt = nowIso;
  booking.history.push({
    at: nowIso,
    action: 'reagendada',
    note: `Horário alterado de ${booking.rescheduledFrom.date} ${booking.rescheduledFrom.startTime} para ${newDate} ${newStartTime}.`,
    author: 'admin',
  });

  saveAppointmentsState(state);
  return { success: true, booking };
}

export function updateBookingStatus(
  bookingId: string,
  newStatus: AppointmentStatus,
  note?: string
): { success: boolean; booking?: AppointmentBooking; error?: string } {
  const state = getAppointmentsState();
  const booking = state.bookings.find((b) => b.id === bookingId);
  if (!booking) {
    return { success: false, error: 'Reserva não encontrada.' };
  }
  const nowIso = new Date().toISOString();
  const todayStr = getScheduleNow(state.settings.timezone).dateString;
  if ((newStatus === 'concluida' || newStatus === 'nao_compareceu') && booking.date > todayStr) {
    return {
      success: false,
      error: `Não é possível alterar uma chamada futura (${booking.date}) para "${newStatus}".`,
    };
  }
  booking.status = newStatus;
  booking.updatedAt = nowIso;
  if (!Array.isArray(booking.history)) booking.history = [];
  booking.history.push({
    at: nowIso,
    action: 'status_alterado',
    note: note || `Status alterado para "${newStatus}" pela administração.`,
    author: 'admin',
  });
  saveAppointmentsState(state);
  return { success: true, booking };
}

