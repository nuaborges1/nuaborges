/**
 * Cliente Frontend NUA ID — Comunicação Exclusiva com Pages Functions
 *
 * Invariantes:
 * - NUNCA armazena tokens em localStorage ou sessionStorage.
 * - Toda autenticação trafega via cookie HttpOnly (`credentials: 'include'`).
 * - NUNCA comunica diretamente com o serviço de autenticação externo.
 */

import { getPublicApiUrl } from './contentStore';

export const NUA_ID_SESSION_EVENT = 'nua-id:session-changed';

export function emitNuaIdSessionChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NUA_ID_SESSION_EVENT));
  }
}

export interface NuaIdProfile {
  id: string;
  email: string;
  displayName: string;
  marketingOptIn: boolean;
  termsAcceptedAt?: string | null;
  createdAt: string;
}

export interface NuaIdSessionInfo {
  id: string;
  deviceLabel: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface NuaIdLibraryItem {
  entitlementId: string;
  orderRef: string;
  resourceId: string;
  kind: 'pack' | 'avulso' | 'custom' | 'vip';
  title: string;
  coverUrl: string | null;
  purchasedAt: string;
  expiresAt: string | null;
  status: 'active' | 'expired' | 'revoked';
  revokeReason: string | null;
  allowDownload: boolean;
  watchUrl: string | null;
  mediaPaths: Array<{ id: string; label: string; path: string; type: 'photo' | 'video' }>;
}

export interface NuaIdAppointment {
  id: string;
  modalityName: string;
  durationMinutes: number;
  dateUtc: string | null;
  displayDateBr: string;
  displayTimeBr: string;
  timezoneDisplay: 'America/Sao_Paulo';
  scheduleDate: string;
  scheduleTime: string;
  scheduleTimezone: string;
  price: number;
  operationalStatus: string;
  financialStatus: string;
  callLink: string | null;
  meetingInstructions?: string | null;
  voucherUrl?: string | null;
  proposal?: { date: string; time: string; note?: string } | null;
  canRequestCancel: boolean;
  canRequestReschedule: boolean;
  cancellationReason?: string | null;
  refundStatus?: string | null;
  createdAt: string;
}

export interface NuaIdPersonalizado {
  id: string;
  photoCount: number;
  videoDurationMinutes: number;
  mentionName: boolean;
  express24h: boolean;
  deliveryChannel: 'telegram' | 'vault';
  briefingSummary: string;
  totalPrice: number;
  operationalStatus: 'aguardando_pagamento' | 'em_producao' | 'pronto' | 'entregue' | 'cancelado';
  financialStatus: string;
  vaultFiles: Array<{ id: string; name: string; type: 'photo' | 'video'; path: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface NuaIdUnifiedOrder {
  id: string;
  kind: 'pack' | 'vip' | 'custom';
  kindLabel: string;
  title: string;
  amount: number;
  financialStatus: 'paid' | 'pending' | 'failed' | 'cancelled' | 'refunded' | 'charged_back';
  financialLabel: string;
  operationalStatus: string;
  operationalLabel: string;
  paymentMethod: string;
  paidAt: string | null;
  createdAt: string;
  refunds: Array<{
    id: string;
    amountCents: number;
    status: string;
    reason?: string;
    createdAt: string;
  }>;
}

export interface NuaIdOverviewResponse {
  success: boolean;
  profile: { id: string; displayName: string; email: string };
  summary: {
    availableContents: NuaIdLibraryItem[];
    upcomingAppointments: NuaIdAppointment[];
    activePersonalizados: NuaIdPersonalizado[];
    recentOrders: NuaIdUnifiedOrder[];
    notices: Array<{ id: string; tone: 'info' | 'warning'; text: string }>;
    counts: {
      libraryActive: number;
      appointmentsUpcoming: number;
      appointmentsTotal?: number;
      personalizadosActive: number;
      personalizadosDelivered?: number;
      personalizadosTotal?: number;
      totalOrders: number;
    };
  };
}

async function apiFetch<T = any>(path: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; data: T }> {
  const base = getPublicApiUrl();
  const res = await fetch(`${base}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({} as T));
  return { ok: res.ok, status: res.status, data };
}

export async function requestLoginCode(email: string, turnstileToken?: string) {
  return apiFetch<{ success: boolean; message?: string; error?: string; expiresInMinutes?: number }>(
    '/api/id/request-code',
    {
      method: 'POST',
      body: JSON.stringify({ email, turnstileToken }),
    }
  );
}

export async function verifyLoginCode(email: string, code: string, displayName?: string) {
  const res = await apiFetch<{
    success: boolean;
    authenticated?: boolean;
    profile?: NuaIdProfile;
    error?: string;
    attemptsRemaining?: number;
  }>('/api/id/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code, displayName }),
  });
  if (res.ok && res.data?.authenticated) emitNuaIdSessionChanged();
  return res;
}

export async function fetchCustomerSession() {
  return apiFetch<{ authenticated: boolean; sessionId?: string; profile: NuaIdProfile | null }>(
    '/api/id/session',
    { method: 'GET' }
  );
}

export async function logoutCustomer() {
  const res = await apiFetch<{ success: boolean }>('/api/id/logout', { method: 'POST', body: '{}' });
  emitNuaIdSessionChanged();
  return res;
}

export async function bindOrderToCustomer(orderId: string, token?: string) {
  return apiFetch<{
    success: boolean;
    orderRef?: string;
    bound?: boolean;
    alreadyBound?: boolean;
    error?: string;
  }>('/api/me/bind-order', {
    method: 'POST',
    body: JSON.stringify({ orderId, token }),
  });
}

export async function fetchOverview() {
  return apiFetch<NuaIdOverviewResponse>('/api/me/overview', { method: 'GET' });
}

export async function fetchLibrary() {
  return apiFetch<{ success: boolean; items: NuaIdLibraryItem[] }>('/api/me/library', { method: 'GET' });
}

export async function requestSignedMediaUrl(resourceId: string, mediaPath: string, download = false) {
  return apiFetch<{
    success: boolean;
    signedUrl?: string;
    expiresAt?: string;
    ttlSeconds?: number;
    error?: string;
  }>('/api/me/media-url', {
    method: 'POST',
    body: JSON.stringify({ resourceId, mediaPath, download }),
  });
}

export async function fetchAppointments() {
  return apiFetch<{ success: boolean; appointments: NuaIdAppointment[] }>('/api/me/appointments', {
    method: 'GET',
  });
}

export async function requestAppointmentAction(
  appointmentId: string,
  action: 'request_cancel' | 'request_reschedule',
  reason?: string
) {
  return apiFetch<{ success: boolean; status?: string; message?: string; error?: string }>(
    '/api/me/appointments',
    {
      method: 'POST',
      body: JSON.stringify({ appointmentId, action, reason }),
    }
  );
}

export async function fetchPersonalizados() {
  return apiFetch<{ success: boolean; personalizados: NuaIdPersonalizado[] }>(
    '/api/me/personalizados',
    { method: 'GET' }
  );
}

export async function fetchOrders(page = 1, pageSize = 10, type = 'all') {
  const qs = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    type,
  });
  return apiFetch<{
    success: boolean;
    items: NuaIdUnifiedOrder[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }>(`/api/me/orders?${qs.toString()}`, { method: 'GET' });
}

export async function claimLegacyOrder(token: string) {
  return apiFetch<{
    success: boolean;
    orderRef?: string;
    kind?: string;
    alreadyClaimed?: boolean;
    entitlementGranted?: boolean;
    message?: string;
    error?: string;
  }>('/api/me/claim', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function fetchActiveSessions() {
  return apiFetch<{ success: boolean; sessions: NuaIdSessionInfo[] }>('/api/id/sessions', {
    method: 'GET',
  });
}

export async function revokeCustomerSessions(opts: { revokeOthers?: boolean; sessionId?: string }) {
  return apiFetch<{ success: boolean; message?: string; error?: string }>('/api/id/sessions', {
    method: 'POST',
    body: JSON.stringify(opts),
  });
}

export async function updateCustomerProfile(payload: {
  displayName?: string;
  marketingOptIn?: boolean;
}) {
  return apiFetch<{ success: boolean; profile?: NuaIdProfile; error?: string }>('/api/id/profile', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function requestEmailChange(newEmail: string) {
  return apiFetch<{ success: boolean; message?: string; error?: string }>('/api/id/email-change', {
    method: 'POST',
    body: JSON.stringify({ step: 'request', newEmail }),
  });
}

export async function confirmEmailChange(
  newEmail: string,
  currentEmailCode: string,
  newEmailCode: string
) {
  return apiFetch<{ success: boolean; email?: string; message?: string; error?: string }>(
    '/api/id/email-change',
    {
      method: 'POST',
      body: JSON.stringify({ step: 'confirm', newEmail, currentEmailCode, newEmailCode }),
    }
  );
}

export async function exportCustomerData() {
  return apiFetch<{ success: boolean; exportedAt?: string; data?: any; error?: string }>(
    '/api/id/account',
    {
      method: 'POST',
      body: JSON.stringify({ action: 'export_data' }),
    }
  );
}

export async function anonymizeCustomerAccount(confirmText: string) {
  return apiFetch<{ success: boolean; message?: string; error?: string }>('/api/id/account', {
    method: 'POST',
    body: JSON.stringify({ action: 'anonymize', confirmText }),
  });
}
