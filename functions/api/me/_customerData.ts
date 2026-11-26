/**
 * Agregador Estritamente Isolado por Titular (`profileId`) — NUA ID
 *
 * Invariante 4: O cliente A nunca lê pedidos, conteúdos, chamadas ou personalizados
 * do cliente B. A coincidência de e-mail sozinha NUNCA é usada para puxar pedidos legados;
 * apenas vínculos verificados (`order_claims` / `profile_id` / `entitlements`).
 */

import { convertSlotBetweenTimezones } from '../../../lib/appointments/timeUtils';
import { slugifyAccountItem } from '../../../lib/accountRoutes';
import {
  getAppointmentByIdFromSupabase,
  getOrderFromSupabase,
  getPersonalizadoOrderFromSupabase,
  getSiteContentFromSupabase,
} from '../_supabaseStore';
import {
  EntitlementRecord,
  getPaymentByOrderRef,
  isEntitlementActive,
  listClaimedOrderRefsForProfile,
  listEntitlementsByProfile,
  listRefundsByOrderRef,
  NuaIdEnv,
  PaymentRecord,
  RefundRecord,
} from '../id/_nuaIdStore';

export interface CustomerLibraryItem {
  entitlementId: string;
  orderRef: string;
  resourceId: string;
  slug: string;
  kind: EntitlementRecord['kind'];
  title: string;
  coverUrl: string | null;
  purchasedAt: string;
  expiresAt: string | null;
  status: 'active' | 'expired' | 'revoked';
  revokeReason: string | null;
  allowDownload: boolean;
  watchUrl: string | null;
  photosCount: number;
  videosCount: number;
  mediaPaths: Array<{ id: string; label: string; path: string; type: 'photo' | 'video' }>;
  authorizedMedia?: {
    videos: Array<{ id: string; title: string; url: string; posterUrl?: string; duration?: string }>;
    exclusivePhotos: string[];
  };
}

export interface CustomerAppointmentView {
  id: string;
  modalityName: string;
  durationMinutes: number;
  dateUtc: string | null;
  displayDateBr: string;
  displayTimeBr: string;
  displayEndTimeBr?: string | null;
  timezoneDisplay: 'America/Sao_Paulo';
  scheduleDate: string;
  scheduleTime: string;
  scheduleEndTime?: string | null;
  scheduleTimezone: string;
  price: number;
  operationalStatus: string;
  financialStatus: string;
  callLink: string | null;
  meetingInstructions?: string | null;
  voucherUrl?: string | null;
  pixPayload?: string | null;
  proposal?: { date: string; time: string; note?: string; at?: string } | null;
  rescheduleRequest?: { note?: string; requestedAt?: string } | null;
  cancellation?: {
    state: 'requested' | 'approved' | 'denied';
    reason?: string;
    details?: string;
    decisionNote?: string;
    denialNote?: string;
    refundPercent?: number;
    refundAmount?: number;
  } | null;
  rescheduledFrom?: { date: string; startTime: string } | null;
  canRequestCancel: boolean;
  canRequestReschedule: boolean;
  cancellationReason?: string | null;
  refundStatus?: string | null;
  refundAmount?: number | null;
  clientNotes?: string | null;
  createdAt: string;
  updatedAt?: string;
  history?: Array<{
    at: string;
    action: string;
    author: 'client' | 'admin' | 'system' | 'mercadopago_webhook';
  }>;
}

export interface CustomerPersonalizadoView {
  id: string;
  photoCount: number;
  videoDurationMinutes: number;
  mentionName: boolean;
  express24h: boolean;
  deliveryChannel: 'telegram' | 'vault';
  briefingSummary: string;
  briefingFull?: string;
  totalPrice: number;
  operationalStatus: 'aguardando_pagamento' | 'em_producao' | 'pronto' | 'entregue' | 'cancelado';
  financialStatus: string;
  vaultFiles: Array<{ id: string; name: string; type: 'photo' | 'video'; path: string; previewUrl?: string | null }>;
  createdAt: string;
  updatedAt: string;
}

export interface UnifiedCustomerOrderView {
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
  refunds: RefundRecord[];
}

export function formatUtcToSaoPaulo(isoUtc: string | null | undefined): {
  dateBr: string;
  timeBr: string;
} {
  if (!isoUtc) return { dateBr: '—', timeBr: '—' };
  try {
    const dt = new Date(isoUtc);
    if (Number.isNaN(dt.getTime())) return { dateBr: '—', timeBr: '—' };
    const dateBr = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo',
    }).format(dt);
    const timeBr = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    }).format(dt);
    return { dateBr, timeBr };
  } catch {
    return { dateBr: '—', timeBr: '—' };
  }
}

export function normalizeFinancialStatus(raw: string | null | undefined): {
  status: UnifiedCustomerOrderView['financialStatus'];
  label: string;
} {
  const s = String(raw || '').toLowerCase().trim();
  if (['paid', 'approved', 'pago', 'manual_confirmed'].includes(s)) {
    return { status: 'paid', label: 'Pago' };
  }
  if (['refunded', 'reembolsado'].includes(s)) {
    return { status: 'refunded', label: 'Reembolsado' };
  }
  if (['charged_back', 'contestado'].includes(s)) {
    return { status: 'charged_back', label: 'Contestado' };
  }
  if (['cancelled', 'cancelado', 'cancelada'].includes(s)) {
    return { status: 'cancelled', label: 'Cancelado' };
  }
  if (['rejected', 'failed', 'falhou'].includes(s)) {
    return { status: 'failed', label: 'Falhou' };
  }
  return { status: 'pending', label: 'Pendente' };
}

function activeOrderPayment(payment: PaymentRecord | null, activeId?: string) {
  if (activeId && payment && payment.providerPaymentId !== String(activeId) &&
      ['pending', 'cancelled', 'rejected'].includes(payment.status)) return null;
  return payment;
}

function labelOperationalStatus(kind: 'pack' | 'vip' | 'custom', status: string): string {
  const s = String(status || '').toLowerCase();
  if (kind === 'vip') {
    const map: Record<string, string> = {
      aguardando_pagamento: 'Aguardando pagamento',
      confirmada: 'Confirmada',
      concluida: 'Realizada',
      cancelada: 'Cancelada',
      reagendamento_pendente: 'Reagendamento em análise',
      nao_compareceu: 'Não compareceu',
      reembolso_pendente: 'Reembolso em processamento',
    };
    return map[s] || s;
  }
  if (kind === 'custom') {
    const map: Record<string, string> = {
      aguardando_pagamento: 'Aguardando pagamento',
      em_producao: 'Em produção',
      pronto: 'Pronto para acesso',
      entregue: 'Entregue',
      cancelado: 'Cancelado',
    };
    return map[s] || s;
  }
  const map: Record<string, string> = {
    active: 'Disponível no acervo',
    aguardando_liberacao: 'Aguardando liberação do conteúdo',
    liberado: 'Disponível no acervo',
    paid: 'Disponível no acervo',
    expired: 'Acesso expirado',
    revoked: 'Acesso revogado',
    pending: 'Aguardando confirmação',
    cancelled: 'Cancelado',
  };
  return map[s] || s;
}

export async function loadCustomerCatalogIndex(
  env: NuaIdEnv,
  options?: { strict?: boolean }
): Promise<Map<string, any>> {
  const index = new Map<string, any>();
  if (env?.__CUSTOMER_DATA_FIXTURES__?.catalog) {
    for (const item of env.__CUSTOMER_DATA_FIXTURES__.catalog) {
      if (item.slug) index.set(String(item.slug).toLowerCase(), item);
      if (item.id) index.set(String(item.id).toLowerCase(), item);
    }
    return index;
  }
  try {
    // Lê primeiro private_admin_content para preservar mídias do cofre, itens avulsos e packs arquivados
    const privateContent = await getSiteContentFromSupabase(env, 'private_admin_content', options);
    const publishedContent = privateContent
      ? null
      : await getSiteContentFromSupabase(env, 'published_content', options);
    const content = privateContent || publishedContent;
    const products = content?.avulsos?.items || content?.packs || [];
    for (const item of Array.isArray(products) ? products : []) {
      if (item?.slug) index.set(String(item.slug).toLowerCase(), item);
      if (item?.id) {
        const idLower = String(item.id).toLowerCase();
        index.set(idLower, item);
        index.set(idLower.replace(/^avulso-/, ''), item);
      }
    }
  } catch (error) {
    if (options?.strict) throw error;
  }
  return index;
}

export async function loadCustomerLibrary(
  env: NuaIdEnv,
  profileId: string,
  preloadedCatalog?: Map<string, any>,
  preloadedEntitlements?: EntitlementRecord[],
  options?: { strict?: boolean }
): Promise<CustomerLibraryItem[]> {
  const [entitlements, catalog] = await Promise.all([
    preloadedEntitlements ?? listEntitlementsByProfile(env, profileId, options?.strict),
    preloadedCatalog ?? loadCustomerCatalogIndex(env, options),
  ]);

  const nowMs = Date.now();
  const filtered = entitlements.filter((e) => {
    if (e.kind !== 'pack' && e.kind !== 'avulso') return false;
    const ref = String(e.orderRef || '').toLowerCase();
    if (
      ref.startsWith('ped_') ||
      ref.startsWith('pers_') ||
      ref.startsWith('book_') ||
      ref.startsWith('apt_') ||
      ref.startsWith('app_')
    ) {
      return false;
    }
    return true;
  });

  return Promise.all(
    filtered.map(async (ent) => {
      const cat = catalog.get(ent.resourceId.toLowerCase());
      let status: CustomerLibraryItem['status'] = 'active';
      if (ent.revokedAt) status = 'revoked';
      else if (ent.expiresAt && new Date(ent.expiresAt).getTime() <= nowMs) status = 'expired';

      const active = isEntitlementActive(ent, nowMs);
      const allowDownload = active && ent.allowDownload === true;
      const extra = cat?.protectedMedia || cat?.privateFiles || cat?.files || [];
      const photosCount = (cat?.exclusivePhotos?.length || 0) + extra.filter((f:any)=>f?.type !== 'video').length;
      const videosCount = (cat?.videos?.length || 0) + extra.filter((f:any)=>f?.type === 'video').length;
      const resolvedTitle = cat?.title || cat?.name || ent.title || ent.resourceId;
      const resolvedSlug = slugifyAccountItem(cat?.slug || resolvedTitle || ent.resourceId);
      return {
        entitlementId: ent.id,
        orderRef: ent.orderRef,
        resourceId: ent.resourceId,
        slug: resolvedSlug,
        kind: ent.kind,
        title: resolvedTitle,
        coverUrl: cat?.imageUrl || cat?.coverImage || cat?.thumbnail || cat?.image || null,
        purchasedAt: ent.grantedAt,
        expiresAt: ent.expiresAt || null,
        status,
        revokeReason: ent.revokeReason || null,
        allowDownload,
        watchUrl: active ? `/conta?tab=biblioteca&item=${encodeURIComponent(ent.orderRef)}` : null,
        photosCount,
        videosCount,
        mediaPaths: [],
      };
    })
  );
}

export interface CustomerBundleBatchCache {
  claimedOrderRefsByProfile: Map<string, string[]>;
  entitlementsByProfile: Map<string, EntitlementRecord[]>;
  paymentsByOrderRef: Map<string, any>;
  refundsByOrderRef: Map<string, RefundRecord[]>;
  appointmentsById: Map<string, any>;
  personalizadosById: Map<string, any>;
  ordersById: Map<string, any>;
}

export async function loadCustomerBundle(
  env: NuaIdEnv,
  profileId: string,
  preloadedCatalog?: Map<string, any>,
  batchCache?: CustomerBundleBatchCache,
  options?: { includeAppointmentHistory?: boolean; includeAdministrativeContacts?: boolean; strict?: boolean }
): Promise<{
  library: CustomerLibraryItem[];
  appointments: CustomerAppointmentView[];
  personalizados: CustomerPersonalizadoView[];
  orders: UnifiedCustomerOrderView[];
  administrativeContacts: string[];
}> {
  const catalog = preloadedCatalog ?? (await loadCustomerCatalogIndex(env, options));
  const [library, claimedRefs] = await Promise.all([
    loadCustomerLibrary(
      env,
      profileId,
      catalog,
      batchCache ? batchCache.entitlementsByProfile.get(profileId) || [] : undefined,
      options
    ),
    batchCache
      ? Promise.resolve(batchCache.claimedOrderRefsByProfile.get(profileId) || [])
      : listClaimedOrderRefsForProfile(env, profileId, options?.strict),
  ]);

  const appointments: CustomerAppointmentView[] = [];
  const personalizados: CustomerPersonalizadoView[] = [];
  const orders: UnifiedCustomerOrderView[] = [];

  const administrativeContacts = new Set<string>();
  const fixtures = env?.__CUSTOMER_DATA_FIXTURES__;

  // Processa em lotes paralelos controlados para eliminar N+1 sequencial
  const BATCH_SIZE = 6;
  for (let i = 0; i < claimedRefs.length; i += BATCH_SIZE) {
    const batch = claimedRefs.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (ref) => {
        const [recordedPayment, refunds] = batchCache
          ? [batchCache.paymentsByOrderRef.get(ref) || null, batchCache.refundsByOrderRef.get(ref) || []]
          : await Promise.all([getPaymentByOrderRef(env, ref), listRefundsByOrderRef(env, ref)]);

        // 1. Chamada VIP (inclui prefixo app_ criado em produção por generateBookingId!)
        if (ref.startsWith('book_') || ref.startsWith('apt_') || ref.startsWith('app_')) {
          const paymentRec = recordedPayment;
          const booking =
            fixtures?.appointments?.[ref] || batchCache?.appointmentsById.get(ref) ||
            (batchCache ? null : await getAppointmentByIdFromSupabase(env, ref));
          if (!booking) return;
          if (options?.includeAdministrativeContacts && booking.clientPhone) administrativeContacts.add(booking.clientPhone);

          const fin = normalizeFinancialStatus(paymentRec?.status || booking.payment?.status);
          const isActivePaidCall =
            fin.status === 'paid' && ['confirmada', 'reagendamento_pendente'].includes(booking.status);

          // Converte corretamente do fuso da agenda (ex.: Europe/Dublin) para UTC e America/Sao_Paulo (AUD-027)
          const scheduleTz = booking.timezone || 'Europe/Dublin';
          let isoUtc: string | null = (booking as any).dateTimeUtc || null;
          let displayDateBr = '';
          let displayTimeBr = '';
          let displayEndTimeBr: string | null = null;
          if (booking.date && booking.startTime) {
            const utcStart = convertSlotBetweenTimezones(booking.date, booking.startTime, scheduleTz, 'UTC');
            if (!isoUtc && utcStart?.date && utcStart?.time) {
              isoUtc = `${utcStart.date}T${utcStart.time}:00.000Z`;
            }
            const brStart = convertSlotBetweenTimezones(booking.date, booking.startTime, scheduleTz, 'America/Sao_Paulo');
            if (brStart?.date && brStart?.time) {
              displayDateBr = brStart.date.split('-').reverse().join('/');
              displayTimeBr = brStart.time;
            }
            if (booking.endTime) {
              const brEnd = convertSlotBetweenTimezones(booking.date, booking.endTime, scheduleTz, 'America/Sao_Paulo');
              if (brEnd?.time) displayEndTimeBr = brEnd.time;
            }
          }
          const brFallback = formatUtcToSaoPaulo(isoUtc || booking.createdAt);
          if (!displayDateBr) displayDateBr = brFallback.dateBr;
          if (!displayTimeBr) displayTimeBr = brFallback.timeBr;

          const resolvedCallLink = isActivePaidCall
            ? (booking.meeting?.url || (booking.meeting as any)?.joinUrl || (booking as any).call_link || null)
            : null;
          const hasPendingCancelReq = booking.cancellation?.state === 'requested';

          const rawInstructions = typeof booking.meeting?.instructions === 'string' ? booking.meeting.instructions.trim() : '';
          const isStalePrePaymentNote =
            Boolean(resolvedCallLink) &&
            /ap[oó]s\s+a\s+confirma[cç][aã]o\s+do\s+pagamento|ser[aá]\s+liberado\s+no\s+seu\s+voucher/i.test(rawInstructions);
          const sanitizedInstructions = isActivePaidCall && rawInstructions && !isStalePrePaymentNote ? rawInstructions : null;

          appointments.push({
            id: booking.id,
            modalityName: booking.modalityName || 'Chamada VIP',
            durationMinutes: booking.durationMinutes || 30,
            dateUtc: isoUtc || null,
            displayDateBr,
            displayTimeBr,
            displayEndTimeBr,
            timezoneDisplay: 'America/Sao_Paulo',
            scheduleDate: booking.date || '',
            scheduleTime: booking.startTime || '',
            scheduleEndTime: booking.endTime || null,
            scheduleTimezone: scheduleTz,
            price: Number(booking.price || 0),
            operationalStatus: booking.status,
            financialStatus: fin.status,
            callLink: resolvedCallLink,
            meetingInstructions: sanitizedInstructions,
            voucherUrl: booking.publicToken ? `/chamadas/reserva?token=${encodeURIComponent(booking.publicToken)}` : null,
            pixPayload: booking.status === 'aguardando_pagamento' ? (booking.payment?.pixPayload || null) : null,
            proposal: booking.proposal || null,
            rescheduleRequest: (booking as any).rescheduleRequest || null,
            cancellation: booking.cancellation
              ? {
                  state: booking.cancellation.state,
                  reason: booking.cancellation.reason,
                  details: booking.cancellation.details,
                  decisionNote: booking.cancellation.decisionNote,
                  denialNote: booking.cancellation.denialNote,
                  refundPercent: booking.cancellation.refundPercent,
                  refundAmount: booking.cancellation.refundAmount,
                }
              : null,
            rescheduledFrom: booking.rescheduledFrom || null,
            canRequestCancel:
              ['confirmada', 'aguardando_pagamento'].includes(booking.status) && !hasPendingCancelReq,
            canRequestReschedule:
              booking.status === 'confirmada' && !booking.proposal && !hasPendingCancelReq,
            cancellationReason: booking.cancellationReason || null,
            refundStatus:
              refunds[0]?.status ||
              (booking.payment?.status === 'refunded' ? 'refunded' : (booking.refundStatus || null)),
            refundAmount: typeof booking.refundAmount === 'number' ? booking.refundAmount : null,
            clientNotes: booking.clientNotes || null,
            createdAt: booking.createdAt,
            updatedAt: booking.updatedAt || booking.createdAt,
            ...(options?.includeAppointmentHistory
              ? {
                  history: (Array.isArray(booking.history) ? booking.history : [])
                    .filter((event: any) => event?.at && event?.action)
                    .map((event: any) => ({
                      at: String(event.at),
                      action: String(event.action).slice(0, 100),
                      author: ['client', 'admin', 'system', 'mercadopago_webhook'].includes(event.author)
                        ? event.author
                        : 'system',
                    })),
                }
              : {}),
          });

          const modName = booking.modalityName || 'Chamada VIP';
          const dur = booking.durationMinutes || 30;
          orders.push({
            id: booking.id,
            kind: 'vip',
            kindLabel: 'Chamada VIP',
            title: /\d+\s*min/i.test(modName) ? modName : `${modName} (${dur} min)`,
            amount: Number(booking.price || 0),
            financialStatus: fin.status,
            financialLabel: fin.label,
            operationalStatus: booking.status,
            operationalLabel: labelOperationalStatus('vip', booking.status),
            paymentMethod: paymentRec?.paymentMethod || booking.payment?.method || 'pix',
            paidAt: paymentRec?.paidAt || booking.payment?.paidAt || null,
            createdAt: booking.createdAt,
            refunds,
          });
          return;
        }

        // 2. Personalizados
        if (ref.startsWith('ped_') || ref.startsWith('pers_')) {
          const pers =
            fixtures?.personalizados?.[ref] || batchCache?.personalizadosById.get(ref) ||
            (batchCache ? null : await getPersonalizadoOrderFromSupabase(env, ref));
          if (!pers) return;
          const paymentRec = activeOrderPayment(recordedPayment, pers.payment?.transactionId);
          if (options?.includeAdministrativeContacts && pers.clientContact) administrativeContacts.add(pers.clientContact);

          const fin = normalizeFinancialStatus(paymentRec?.status || pers.payment?.status);
          personalizados.push({
            id: pers.id,
            photoCount: pers.photoCount || 0,
            videoDurationMinutes: pers.videoDurationMinutes || 0,
            mentionName: Boolean(pers.mentionName),
            express24h: Boolean(pers.express24h),
            deliveryChannel: pers.deliveryChannel || 'vault',
            briefingSummary: String(pers.briefing || '').slice(0, 260),
            briefingFull: String(pers.briefing || '').slice(0, 2000),
            totalPrice: Number(pers.totalPrice || 0),
            operationalStatus: pers.status,
            financialStatus: fin.status,
            vaultFiles: [],
            createdAt: pers.createdAt,
            updatedAt: pers.updatedAt,
          });

          orders.push({
            id: pers.id,
            kind: 'custom',
            kindLabel: 'Personalizado',
            title: `Personalizado (${pers.photoCount} ${pers.photoCount === 1 ? 'foto' : 'fotos'}${pers.videoDurationMinutes ? ` + ${pers.videoDurationMinutes}min vídeo` : ''})`,
            amount: Number(pers.totalPrice || 0),
            financialStatus: fin.status,
            financialLabel: fin.label,
            operationalStatus: pers.status,
            operationalLabel: labelOperationalStatus('custom', pers.status),
            paymentMethod: paymentRec?.paymentMethod || pers.payment?.method || 'pix',
            paidAt: paymentRec?.paidAt || pers.payment?.paidAt || null,
            createdAt: pers.createdAt,
            refunds,
          });
          return;
        }

        // 3. Packs & Conteúdos Avulsos
        const ord = fixtures?.orders?.[ref] || batchCache?.ordersById.get(ref) ||
          (batchCache ? null : await getOrderFromSupabase(env, ref));
        if (!ord) return;
        const paymentRec = activeOrderPayment(recordedPayment, ord.paymentId || ord.providerPaymentId);

        const fin = normalizeFinancialStatus(paymentRec?.status || ord.status);
        const cat = catalog.get(String(ord.packId || '').toLowerCase());
        const matchedLib = library.find((l) => l.orderRef === ord.id);
        const opStatus = matchedLib
          ? matchedLib.status
          : fin.status === 'paid'
            ? 'aguardando_liberacao'
            : fin.status;

        orders.push({
          id: ord.id,
          kind: 'pack',
          kindLabel: 'Conteúdo',
          title: cat?.title || cat?.name || ord.packId,
          amount: Number(ord.amount || 0),
          financialStatus: fin.status,
          financialLabel: fin.label,
          operationalStatus: opStatus,
          operationalLabel: labelOperationalStatus('pack', opStatus),
          paymentMethod: paymentRec?.paymentMethod || ord.paymentMethod || 'pix',
          paidAt: paymentRec?.paidAt || (fin.status === 'paid' ? ord.updatedAt || null : null),
          createdAt: ord.createdAt || new Date().toISOString(),
          refunds,
        });
      })
    );
  }

  appointments.sort((a, b) => (b.scheduleDate || b.createdAt || '').localeCompare(a.scheduleDate || a.createdAt || ''));
  personalizados.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  orders.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return { library, appointments, personalizados, orders, administrativeContacts: Array.from(administrativeContacts).sort() };
}
