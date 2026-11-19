/**
 * Agregador Estritamente Isolado por Titular (`profileId`) — NUA ID
 *
 * Invariante 4: O cliente A nunca lê pedidos, conteúdos, chamadas ou personalizados
 * do cliente B. A coincidência de e-mail sozinha NUNCA é usada para puxar pedidos legados;
 * apenas vínculos verificados (`order_claims` / `profile_id` / `entitlements`).
 */

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
  RefundRecord,
} from '../id/_nuaIdStore';

export interface CustomerLibraryItem {
  entitlementId: string;
  orderRef: string;
  resourceId: string;
  kind: EntitlementRecord['kind'];
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

export interface CustomerAppointmentView {
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

export interface CustomerPersonalizadoView {
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
    active: 'Disponível na biblioteca',
    liberado: 'Disponível na biblioteca',
    paid: 'Disponível na biblioteca',
    expired: 'Acesso expirado',
    revoked: 'Acesso revogado',
    pending: 'Aguardando confirmação',
    cancelled: 'Cancelado',
  };
  return map[s] || s;
}

export async function loadCustomerCatalogIndex(env: NuaIdEnv): Promise<Map<string, any>> {
  const index = new Map<string, any>();
  if (env?.__CUSTOMER_DATA_FIXTURES__?.catalog) {
    for (const item of env.__CUSTOMER_DATA_FIXTURES__.catalog) {
      if (item.slug) index.set(String(item.slug).toLowerCase(), item);
      if (item.id) index.set(String(item.id).toLowerCase(), item);
    }
    return index;
  }
  try {
    const content = await getSiteContentFromSupabase(env, 'published_content');
    const products = content?.avulsos?.items || content?.packs || [];
    for (const item of Array.isArray(products) ? products : []) {
      if (item?.slug) index.set(String(item.slug).toLowerCase(), item);
      if (item?.id) {
        const idLower = String(item.id).toLowerCase();
        index.set(idLower, item);
        index.set(idLower.replace(/^avulso-/, ''), item);
      }
    }
  } catch {}
  return index;
}

export async function loadCustomerLibrary(
  env: NuaIdEnv,
  profileId: string
): Promise<CustomerLibraryItem[]> {
  const [entitlements, catalog] = await Promise.all([
    listEntitlementsByProfile(env, profileId),
    loadCustomerCatalogIndex(env),
  ]);

  const nowMs = Date.now();
  return entitlements
    .filter((e) => {
      if (e.kind !== 'pack' && e.kind !== 'avulso') return false;
      const ref = String(e.orderRef || '').toLowerCase();
      if (ref.startsWith('ped_') || ref.startsWith('pers_') || ref.startsWith('book_') || ref.startsWith('apt_')) {
        return false;
      }
      return true;
    })
    .map((ent) => {
      const cat = catalog.get(ent.resourceId.toLowerCase());
      let status: CustomerLibraryItem['status'] = 'active';
      if (ent.revokedAt) status = 'revoked';
      else if (ent.expiresAt && new Date(ent.expiresAt).getTime() <= nowMs) status = 'expired';

      const active = isEntitlementActive(ent, nowMs);
      const rawMedia: Array<{ id: string; label: string; path: string; type: 'photo' | 'video' }> = [];
      if (active && cat) {
        const photos = cat.exclusivePhotos || cat.previewImages || [];
        for (let i = 0; i < (Array.isArray(photos) ? photos.length : 0); i++) {
          const p = photos[i];
          const path = typeof p === 'string' ? p : p?.path || p?.url || '';
          if (path) {
            rawMedia.push({
              id: `photo_${i + 1}`,
              label: `Foto ${i + 1}`,
              path,
              type: 'photo',
            });
          }
        }
        const videos = cat.videos || [];
        for (let i = 0; i < (Array.isArray(videos) ? videos.length : 0); i++) {
          const v = videos[i];
          const path = typeof v === 'string' ? v : v?.url || v?.path || v?.storageKey || '';
          if (path) {
            rawMedia.push({
              id: v?.id || `video_${i + 1}`,
              label: v?.title || `Vídeo ${i + 1}`,
              path,
              type: 'video',
            });
          }
        }
        const files = cat.protectedMedia || cat.privateFiles || cat.files || [];
        for (let i = 0; i < (Array.isArray(files) ? files.length : 0); i++) {
          const f = files[i];
          const path = typeof f === 'string' ? f : f?.path || f?.storageKey || f?.url || '';
          if (path && !rawMedia.some((m) => m.path === path)) {
            rawMedia.push({
              id: f?.id || `media_${i + 1}`,
              label: f?.label || f?.name || `Item ${i + 1}`,
              path,
              type: f?.type === 'video' || /\.(mp4|mov|webm|m3u8)$/i.test(path) ? 'video' : 'photo',
            });
          }
        }
      }

      return {
        entitlementId: ent.id,
        orderRef: ent.orderRef,
        resourceId: ent.resourceId,
        kind: ent.kind,
        title: ent.title || cat?.title || cat?.name || ent.resourceId,
        coverUrl: cat?.imageUrl || cat?.coverImage || cat?.thumbnail || cat?.image || null,
        purchasedAt: ent.grantedAt,
        expiresAt: ent.expiresAt || null,
        status,
        revokeReason: ent.revokeReason || null,
        allowDownload: active && ent.allowDownload === true,
        watchUrl: active ? `/assistir/${encodeURIComponent(cat?.slug || ent.resourceId)}` : null,
        mediaPaths: rawMedia,
      };
    });
}

export async function loadCustomerBundle(env: NuaIdEnv, profileId: string): Promise<{
  library: CustomerLibraryItem[];
  appointments: CustomerAppointmentView[];
  personalizados: CustomerPersonalizadoView[];
  orders: UnifiedCustomerOrderView[];
}> {
  const [library, claimedRefs, catalog] = await Promise.all([
    loadCustomerLibrary(env, profileId),
    listClaimedOrderRefsForProfile(env, profileId),
    loadCustomerCatalogIndex(env),
  ]);

  const appointments: CustomerAppointmentView[] = [];
  const personalizados: CustomerPersonalizadoView[] = [];
  const orders: UnifiedCustomerOrderView[] = [];

  const fixtures = env?.__CUSTOMER_DATA_FIXTURES__;

  for (const ref of claimedRefs) {
    const [paymentRec, refunds] = await Promise.all([
      getPaymentByOrderRef(env, ref),
      listRefundsByOrderRef(env, ref),
    ]);

    // 1. Chamada VIP
    if (ref.startsWith('book_') || ref.startsWith('apt_')) {
      const booking =
        fixtures?.appointments?.[ref] || (await getAppointmentByIdFromSupabase(env, ref));
      if (!booking) continue;

      const fin = normalizeFinancialStatus(paymentRec?.status || booking.payment?.status);
      const isPaidAndConfirmed = fin.status === 'paid' && booking.status === 'confirmada';
      const isoUtc = (booking as any).dateTimeUtc || booking.createdAt;
      const br = formatUtcToSaoPaulo(isoUtc);

      const resolvedCallLink =
        isPaidAndConfirmed
          ? (booking.meeting?.url || (booking.meeting as any)?.joinUrl || (booking as any).call_link || null)
          : null;

      appointments.push({
        id: booking.id,
        modalityName: booking.modalityName || 'Chamada VIP',
        durationMinutes: booking.durationMinutes || 30,
        dateUtc: isoUtc || null,
        displayDateBr: booking.date ? booking.date.split('-').reverse().join('/') : br.dateBr,
        displayTimeBr: booking.startTime || br.timeBr,
        timezoneDisplay: 'America/Sao_Paulo',
        scheduleDate: booking.date || '',
        scheduleTime: booking.startTime || '',
        scheduleTimezone: booking.timezone || 'America/Sao_Paulo',
        price: Number(booking.price || 0),
        operationalStatus: booking.status,
        financialStatus: fin.status,
        callLink: resolvedCallLink,
        meetingInstructions: isPaidAndConfirmed ? (booking.meeting?.instructions || null) : null,
        voucherUrl: booking.publicToken ? `/chamadas/reserva?token=${encodeURIComponent(booking.publicToken)}` : null,
        proposal: booking.proposal || null,
        canRequestCancel: booking.status === 'confirmada' || booking.status === 'aguardando_pagamento',
        canRequestReschedule: booking.status === 'confirmada',
        cancellationReason: booking.cancellationReason || null,
        refundStatus: refunds[0]?.status || (booking.payment?.status === 'refunded' ? 'refunded' : (booking.refundStatus || null)),
        createdAt: booking.createdAt,
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
      continue;
    }

    // 2. Personalizados
    if (ref.startsWith('ped_') || ref.startsWith('pers_')) {
      const pers =
        fixtures?.personalizados?.[ref] || (await getPersonalizadoOrderFromSupabase(env, ref));
      if (!pers) continue;

      const fin = normalizeFinancialStatus(paymentRec?.status || pers.payment?.status);
      const canAccessVault =
        fin.status === 'paid' && (pers.status === 'pronto' || pers.status === 'entregue');

      personalizados.push({
        id: pers.id,
        photoCount: pers.photoCount || 0,
        videoDurationMinutes: pers.videoDurationMinutes || 0,
        mentionName: Boolean(pers.mentionName),
        express24h: Boolean(pers.express24h),
        deliveryChannel: pers.deliveryChannel || 'vault',
        briefingSummary: String(pers.briefing || '').slice(0, 260),
        totalPrice: Number(pers.totalPrice || 0),
        operationalStatus: pers.status,
        financialStatus: fin.status,
        vaultFiles: canAccessVault
          ? (pers.vaultFiles || []).map((f: any) => ({
              id: f.id,
              name: f.name,
              type: f.type === 'video' ? 'video' : 'photo',
              path: f.url || f.path || '',
            }))
          : [],
        createdAt: pers.createdAt,
        updatedAt: pers.updatedAt,
      });

      orders.push({
        id: pers.id,
        kind: 'custom',
        kindLabel: 'Personalizado',
        title: `Personalizado (${pers.photoCount} fotos${pers.videoDurationMinutes ? ` + ${pers.videoDurationMinutes}min vídeo` : ''})`,
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
      continue;
    }

    // 3. Packs & Conteúdos Avulsos
    const ord = fixtures?.orders?.[ref] || (await getOrderFromSupabase(env, ref));
    if (!ord) continue;

    const fin = normalizeFinancialStatus(paymentRec?.status || ord.status);
    const cat = catalog.get(String(ord.packId || '').toLowerCase());
    const matchedLib = library.find((l) => l.orderRef === ord.id);
    const opStatus = matchedLib
      ? matchedLib.status
      : fin.status === 'paid'
        ? 'liberado'
        : fin.status;

    orders.push({
      id: ord.id,
      kind: 'pack',
      kindLabel: 'Conteúdo & Pack',
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
  }

  orders.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return { library, appointments, personalizados, orders };
}
