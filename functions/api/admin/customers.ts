/**
 * Cloudflare Pages Function: GET/POST /api/admin/customers
 *
 * Módulo Admin › Clientes (Central Unificada de Clientes — Com Conta NUA ID + Visitantes).
 *
 * Restrições estritamente aplicadas:
 * - Protegido pela autenticação administrativa em `_middleware.ts` (sessão de cliente recebe 401).
 * - NUNCA expõe senhas, tokens de compra, cookies ou IDs de sessão.
 * - NUNCA permite entrar na conta do cliente nem manipular pagamentos arbitrariamente.
 * - Agrega em lote (sem N+1) perfis NUA ID, pedidos de packs, Chamadas VIP e Personalizados,
 *   unificando clientes com conta e compradores visitantes sem duplicar pessoas.
 * - Registra ações administrativas sensíveis em `audit_logs` + `customer_audit_events`.
 */

import { recordAuditEvent } from '../_auditHelper';
import { getSupabaseClient } from '../_supabaseClient';
import {
  listAppointmentsFromSupabase,
  listPersonalizadosOrdersFromSupabase,
} from '../_supabaseStore';
import {
  CUSTOMER_CRM_PREFIX,
  CustomerCrmMeta,
  CustomerProfile,
  EntitlementRecord,
  getCustomerCrmMeta,
  getNuaIdAdapter,
  getProfileById,
  isEntitlementActive,
  listAllProfiles,
  listCustomerAuditEvents,
  listCustomerSessions,
  normalizeEmail,
  getOrderClaim,
  orderAccessRestrictionKey,
  isOrderAccessRestricted,
  NuaIdEnv,
  OrderClaimRecord,
  PaymentRecord,
  RefundRecord,
  recordCustomerAuditEvent,
  restoreEntitlementsByOrder,
  revokeAllCustomerSessions,
  revokeEntitlementsByOrder,
  saveCustomerCrmMeta,
  saveProfile,
} from '../id/_nuaIdStore';
import { dispatchTransactionalEmail } from '../id/_emailDispatch';
import { renderTransactionalNotificationHtml } from '../id/_emailTemplates';
import {
  formatUtcToSaoPaulo,
  CustomerBundleBatchCache,
  loadCustomerBundle,
  loadCustomerCatalogIndex,
  normalizeFinancialStatus,
} from '../me/_customerData';
import { convertSlotBetweenTimezones, formatDateForDisplay } from '../../../lib/appointmentsCanonical';

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

const GUEST_REVIEW_PREFIX = 'admin:guest_review:';

const ADMIN_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
};

function isEmailLike(value?: string | null): boolean {
  const s = String(value || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function detectContactChannel(contact?: string | null): 'telegram' | 'whatsapp' | 'email' | null {
  const raw = String(contact || '').trim();
  if (!raw) return null;
  if (raw.startsWith('@') || raw.toLowerCase().includes('t.me/')) return 'telegram';
  if (isEmailLike(raw)) return 'email';
  if (/^[+\d().\s-]+$/.test(raw) && raw.replace(/\D/g, '').length >= 8) return 'whatsapp';
  return null;
}

function isNonPackOrderRow(orderId: string, packId: string, knownIds: Set<string>): boolean {
  return (
    knownIds.has(orderId) ||
    orderId.startsWith('app_') ||
    orderId.startsWith('apt_') ||
    orderId.startsWith('book_') ||
    orderId.startsWith('ped_') ||
    orderId.startsWith('pers_') ||
    packId.startsWith('chamada-')
  );
}

interface UnifiedOrderItem {
  id: string;
  kind: 'pack' | 'vip' | 'custom';
  kindLabel: string;
  title: string;
  amount: number;
  financialStatus: string;
  financialLabel: string;
  operationalLabel: string;
  createdAt: string;
  paidAt?: string | null;
  linkSource: 'claimed' | 'guest';
}

interface UnifiedAppointmentItem {
  id: string;
  modalityName: string;
  displayDateBr: string;
  displayTimeBr: string;
  operationalStatus: string;
  financialStatus: string;
  hasMeetingLink: boolean;
  clientPhone: string;
  createdAt: string;
  refundStatus?: string | null;
  history: Array<{
    at: string;
    action: string;
    author: 'client' | 'admin' | 'system' | 'mercadopago_webhook';
  }>;
}

interface UnifiedPersonalizadoItem {
  id: string;
  photoCount: number;
  videoDurationMinutes: number;
  totalPrice: number;
  deliveryChannel: string;
  clientContact: string;
  operationalStatus: string;
  financialStatus: string;
  createdAt: string;
}

interface UnifiedLibraryItem {
  entitlementId: string;
  orderRef: string;
  resourceId: string;
  kind: string;
  title: string;
  purchasedAt: string;
  expiresAt: string | null;
  status: 'active' | 'expired' | 'revoked';
  revokeReason: string | null;
}

interface AggregatedCustomer {
  id: string;
  accountType: 'nua_id' | 'guest';
  profile: CustomerProfile | null;
  displayName: string;
  email: string;
  phone: string;
  contacts: string[];
  status: 'active' | 'suspended' | 'anonymized' | 'guest';
  createdAt: string;
  orders: UnifiedOrderItem[];
  appointments: UnifiedAppointmentItem[];
  personalizados: UnifiedPersonalizadoItem[];
  library: UnifiedLibraryItem[];
  seenOrderIds: Set<string>;
  accessRestrictions?: Record<string, true>;
  reviewReason?: string | null;
  crmNotes?: string;
  crmTags?: string[];
  crmUpdatedAt?: string | null;
}

async function listAllCommerceOrderRows(sb: any): Promise<any[]> {
  const pageSize = 1000;
  const rows: any[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await sb
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`Falha ao carregar pedidos: ${error.message}`);
    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

async function buildUnifiedCustomersIndex(env: NuaIdEnv, guestsOnly = false): Promise<Map<string, AggregatedCustomer>> {
  const adapter = getNuaIdAdapter(env);
  const sb = getSupabaseClient(env as any);
  const fixtures = (env as any).__CUSTOMER_DATA_FIXTURES__;

  const [
    profiles,
    catalog,
    appointments,
    personalizados,
    claimEntries,
    entitlementEntries,
    orderRows,
    profileOrderEntries,
    paymentEntries,
    refundEntries,
    accessRestrictions,
    guestReviews,
    crmMetaEntries,
  ] =
    await Promise.all([
      listAllProfiles(env),
      loadCustomerCatalogIndex(env, { strict: true }),
      fixtures?.appointments
        ? Promise.resolve(Object.values(fixtures.appointments) as any[])
        : listAppointmentsFromSupabase(env as any),
      fixtures?.personalizados
        ? Promise.resolve(Object.values(fixtures.personalizados) as any[])
        : listPersonalizadosOrdersFromSupabase(env as any, { strict: true }),
      adapter ? adapter.kvListByPrefix<OrderClaimRecord>('nua_id:claim:') : Promise.resolve([]),
      adapter && !guestsOnly
        ? adapter.kvListByPrefix<EntitlementRecord[]>('nua_id:entitlements:')
        : Promise.resolve([]),
      fixtures?.orders
        ? Promise.resolve(Object.values(fixtures.orders) as any[])
        : sb
          ? listAllCommerceOrderRows(sb)
          : Promise.resolve([] as any[]),
      adapter ? adapter.kvListByPrefix<string[]>('nua_id:profile_orders:') : Promise.resolve([]),
      adapter ? adapter.kvListByPrefix<PaymentRecord>('nua_id:payment_by_order:') : Promise.resolve([]),
      adapter ? adapter.kvListByPrefix<RefundRecord[]>('nua_id:refunds:') : Promise.resolve([]),
      adapter ? adapter.kvListByPrefix(orderAccessRestrictionKey('')) : Promise.resolve([]),
      adapter ? adapter.kvListByPrefix<{ reason: string }>(GUEST_REVIEW_PREFIX) : Promise.resolve([]),
      adapter ? adapter.kvListByPrefix<CustomerCrmMeta>(CUSTOMER_CRM_PREFIX) : Promise.resolve([]),
    ]);

  const map = new Map<string, AggregatedCustomer>();
  // O agrupamento por contato é administrativo. O vínculo de acesso continua por pedido.
  const orderRefToProfileId = new Map<string, string>();
  const claimedOrderRefsByProfile = new Map<string, string[]>();
  const addProfileOrderRef = (profileId: string, orderRef: string) => {
    const refs = claimedOrderRefsByProfile.get(profileId) || [];
    if (!refs.includes(orderRef)) refs.push(orderRef);
    claimedOrderRefsByProfile.set(profileId, refs);
  };

  // 1. Mapeia claims verificados (orderRef -> profileId)
  for (const entry of claimEntries) {
    const val = entry?.value;
    if (val?.orderRef && val?.profileId) {
      orderRefToProfileId.set(val.orderRef, val.profileId);
      addProfileOrderRef(val.profileId, val.orderRef);
    }
  }

  // O índice reverso acelera a leitura antiga, mas nunca pode sobrescrever o claim principal.
  for (const entry of profileOrderEntries) {
    const profileId = entry.key.replace(/^nua_id:profile_orders:/, '');
    if (!Array.isArray(entry.value)) continue;
    for (const orderRef of entry.value) {
      if (typeof orderRef !== 'string' || !orderRef) continue;
      const owner = orderRefToProfileId.get(orderRef);
      if (owner && owner !== profileId) continue;
      if (!owner) orderRefToProfileId.set(orderRef, profileId);
      addProfileOrderRef(profileId, orderRef);
    }
  }

  const entitlementsByProfile = new Map<string, EntitlementRecord[]>();
  for (const entry of entitlementEntries) {
    const profileId = entry.key.replace(/^nua_id:entitlements:/, '');
    if (Array.isArray(entry.value)) entitlementsByProfile.set(profileId, entry.value);
  }
  const paymentsByOrderRef = new Map<string, PaymentRecord>();
  for (const entry of paymentEntries) {
    paymentsByOrderRef.set(entry.key.replace(/^nua_id:payment_by_order:/, ''), entry.value);
  }
  const refundsByOrderRef = new Map<string, RefundRecord[]>();
  for (const entry of refundEntries) {
    if (Array.isArray(entry.value)) {
      refundsByOrderRef.set(entry.key.replace(/^nua_id:refunds:/, ''), entry.value);
    }
  }
  const ordersById = new Map<string, any>();
  for (const row of orderRows) {
    ordersById.set(row.id, {
      id: row.id,
      purchaseToken: '',
      packId: row.pack_id || '',
      amount: Number(row.amount || 0),
      status: row.status,
      customerEmail: row.customer_email || '',
      customerName: row.customer_name || '',
      paymentMethod: row.payment_method || 'pix',
      paymentId: row.provider_payment_id ?? row.stripe_payment_intent_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
  const batchCache: CustomerBundleBatchCache = {
    claimedOrderRefsByProfile,
    entitlementsByProfile,
    paymentsByOrderRef,
    refundsByOrderRef,
    appointmentsById: new Map(appointments.map((item: any) => [String(item.id), item] as [string, any])),
    personalizadosById: new Map(personalizados.map((item: any) => [String(item.id), item] as [string, any])),
    ordersById,
  };

  // 2. Inicializa perfis em lotes com fontes previamente carregadas, evitando consultas por perfil/pedido.
  const seenGlobalOrderIds = new Set<string>();
  if (guestsOnly) {
    const existingProfiles = new Set(profiles.map(profile => profile.id));
    for (const [orderRef, profileId] of orderRefToProfileId) {
      if (existingProfiles.has(profileId)) seenGlobalOrderIds.add(orderRef);
    }
  }
  const listedProfiles = guestsOnly ? [] : profiles;
  const PROFILE_BATCH_SIZE = 8;
  for (let i = 0; i < listedProfiles.length; i += PROFILE_BATCH_SIZE) {
    const batch = listedProfiles.slice(i, i + PROFILE_BATCH_SIZE);
    await Promise.all(
      batch.map(async (p) => {
        const normEmail = normalizeEmail(p.emailNormalized || p.email || '');
        const bundle = await loadCustomerBundle(env, p.id, catalog, batchCache);
        const seenOrderIds = new Set<string>();
        const orders: UnifiedOrderItem[] = bundle.orders.map((o) => {
          seenOrderIds.add(o.id);
          seenGlobalOrderIds.add(o.id);
          return {
            id: o.id,
            kind: o.kind,
            kindLabel: o.kindLabel,
            title: o.title,
            amount: Number(o.amount || 0),
            financialStatus: o.financialStatus,
            financialLabel: o.financialLabel,
            operationalLabel: o.operationalLabel,
            createdAt: o.createdAt,
            paidAt: o.paidAt || null,
            linkSource: 'claimed',
          };
        });
        const appointmentsList: UnifiedAppointmentItem[] = bundle.appointments.map((apt) => {
          const sourceAppointment = batchCache.appointmentsById.get(String(apt.id));
          seenOrderIds.add(apt.id);
          seenGlobalOrderIds.add(apt.id);
          return {
            id: apt.id,
            modalityName: apt.modalityName,
            displayDateBr: apt.displayDateBr,
            displayTimeBr: apt.displayTimeBr,
            operationalStatus: apt.operationalStatus,
            financialStatus: apt.financialStatus,
            hasMeetingLink: Boolean(apt.callLink),
            clientPhone: '',
            refundStatus: sourceAppointment?.refundStatus || apt.refundStatus,
            createdAt: apt.createdAt,
            history: Array.isArray(sourceAppointment?.history)
              ? sourceAppointment.history
                  .filter((event: any) => event?.at && event?.action)
                  .map((event: any) => ({
                    at: String(event.at),
                    action: String(event.action).slice(0, 100),
                    author: ['client', 'admin', 'system', 'mercadopago_webhook'].includes(event.author)
                      ? event.author
                      : 'system',
                  }))
              : [],
          };
        });
        const personalizadosList: UnifiedPersonalizadoItem[] = bundle.personalizados.map((pe) => {
          seenOrderIds.add(pe.id);
          seenGlobalOrderIds.add(pe.id);
          return {
            id: pe.id,
            photoCount: pe.photoCount,
            videoDurationMinutes: pe.videoDurationMinutes,
            totalPrice: pe.totalPrice,
            deliveryChannel: pe.deliveryChannel,
            clientContact: '',
            operationalStatus: pe.operationalStatus,
            financialStatus: pe.financialStatus,
            createdAt: pe.createdAt,
          };
        });
        const libraryList: UnifiedLibraryItem[] = bundle.library.map((item) => ({
          entitlementId: item.entitlementId,
          orderRef: item.orderRef,
          resourceId: item.resourceId,
          kind: item.kind,
          title: item.title,
          purchasedAt: item.purchasedAt,
          expiresAt: item.expiresAt,
          status: item.status,
          revokeReason: item.revokeReason,
        }));

        const record: AggregatedCustomer = {
          id: p.id,
          accountType: 'nua_id',
          profile: p,
          displayName: p.displayName || (normEmail ? normEmail.split('@')[0] : 'Cliente'),
          email: p.email || normEmail,
          phone: p.phoneMasked || '',
          contacts: p.phoneMasked ? [p.phoneMasked] : [],
          status: p.status,
          createdAt: p.createdAt,
          orders,
          appointments: appointmentsList,
          personalizados: personalizadosList,
          library: libraryList,
          seenOrderIds,
        };
        map.set(p.id, record);
      })
    );
  }

  // 3. Anexa entitlements extras caso não tenham vindo no bundle
  for (const entry of entitlementEntries) {
    const profileId = entry.key.replace(/^nua_id:entitlements:/, '');
    const customer = map.get(profileId);
    if (!customer || !Array.isArray(entry.value)) continue;
    for (const ent of entry.value) {
      if (!ent?.id || customer.library.some((l) => l.entitlementId === ent.id)) continue;
      const pack = catalog.get(ent.resourceId);
      const status: 'active' | 'expired' | 'revoked' = ent.revokedAt
        ? 'revoked'
        : isEntitlementActive(ent)
        ? 'active'
        : 'expired';
      customer.library.push({
        entitlementId: ent.id,
        orderRef: ent.orderRef,
        resourceId: ent.resourceId,
        kind: ent.kind,
        title: pack?.title || ent.resourceId,
        purchasedAt: ent.grantedAt,
        expiresAt: ent.expiresAt || null,
        status,
        revokeReason: ent.revokeReason || null,
      });
    }
  }

  const addContact = (cust: AggregatedCustomer, rawContact?: string | null) => {
    const clean = String(rawContact || '').trim();
    if (!clean) return;
    if (!cust.contacts.includes(clean)) {
      cust.contacts.push(clean);
    }
    if (detectContactChannel(clean) === 'whatsapp' && detectContactChannel(cust.phone) !== 'whatsapp') {
      cust.phone = clean;
    }
    if (isEmailLike(clean) && !cust.email) {
      cust.email = normalizeEmail(clean);
    }
  };

  const guestReviewById = new Map(guestReviews.map(({ key, value }) => [key.slice(GUEST_REVIEW_PREFIX.length), value?.reason]));
  const restrictedOrders = new Set(accessRestrictions.map(({ key }) => key.slice(orderAccessRestrictionKey('').length)));
  const guestIdsByEmail = new Map<string, string>();
  const resolveOrCreateCustomer = async (params: {
    orderRef: string;
    email?: string | null;
    contact?: string | null;
    name?: string | null;
    createdAt?: string | null;
  }): Promise<{ customer: AggregatedCustomer; linkSource: 'claimed' | 'guest' }> => {
    const claimedProfileId = orderRefToProfileId.get(params.orderRef);
    if (claimedProfileId && map.has(claimedProfileId)) {
      const cust = map.get(claimedProfileId)!;
      addContact(cust, params.contact);
      addContact(cust, params.email);
      return { customer: cust, linkSource: 'claimed' };
    }

    const normEmail = isEmailLike(params.email)
      ? normalizeEmail(params.email!)
      : isEmailLike(params.contact)
      ? normalizeEmail(params.contact!)
      : '';

    let guestId = `guest:order:${params.orderRef}`;
    if (normEmail) {
      const existingId = guestIdsByEmail.get(normEmail);
      if (existingId) {
        guestId = existingId;
      } else {
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normEmail));
        guestId = 'guest:email:' + Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
        guestIdsByEmail.set(normEmail, guestId);
      }
    }

    let cust = map.get(guestId);
    if (!cust) {
      cust = {
        id: guestId,
        accountType: 'guest',
        profile: null,
        displayName:
          String(params.name || '').trim() ||
          (normEmail ? normEmail.split('@')[0] : String(params.contact || '').trim() || 'Cliente Visitante'),
        email: normEmail,
        phone: '',
        contacts: [],
        status: 'guest',
        reviewReason: guestReviewById.get(guestId) || null,
        accessRestrictions: {},
        createdAt: params.createdAt || new Date().toISOString(),
        orders: [],
        appointments: [],
        personalizados: [],
        library: [],
        seenOrderIds: new Set(),
      };
      map.set(guestId, cust);
    }
    addContact(cust, params.contact);
    addContact(cust, params.email);
    if (params.createdAt && params.createdAt < cust.createdAt) {
      cust.createdAt = params.createdAt;
    }
    return { customer: cust, linkSource: 'guest' };
  };

  const knownNonPackIds = new Set<string>();

  // 4. Processa Chamadas VIP ainda não vinculadas via claim
  for (const apt of appointments) {
    knownNonPackIds.add(apt.id);
    if (seenGlobalOrderIds.has(apt.id)) {
      const claimedProfId = orderRefToProfileId.get(apt.id);
      if (claimedProfId && map.has(claimedProfId)) {
        addContact(map.get(claimedProfId)!, apt.clientPhone);
      }
      continue;
    }
    seenGlobalOrderIds.add(apt.id);
    const { customer, linkSource } = await resolveOrCreateCustomer({
      orderRef: apt.id,
      email: apt.clientEmail,
      contact: apt.clientPhone,
      name: apt.clientName,
      createdAt: apt.createdAt,
    });

    const payment = paymentsByOrderRef.get(apt.id);
    const fin = normalizeFinancialStatus(payment?.status || apt.payment?.status);
    const tz = apt.timezone || 'Europe/Dublin';
    const utcSlot = convertSlotBetweenTimezones(apt.date, apt.startTime, tz, 'UTC');
    const dateUtc = `${utcSlot.date}T${utcSlot.time}:00.000Z`;
    const sp = formatUtcToSaoPaulo(dateUtc);
    const displayDateBr = sp.dateBr !== '—' ? sp.dateBr : formatDateForDisplay(apt.date);
    const displayTimeBr = sp.timeBr !== '—' ? sp.timeBr : apt.startTime;

    customer.appointments.push({
      id: apt.id,
      modalityName: apt.modalityName || 'Chamada VIP',
      displayDateBr,
      displayTimeBr,
      operationalStatus: apt.status,
      financialStatus: fin.status,
      hasMeetingLink: Boolean(apt.meeting?.url),
      clientPhone: apt.clientPhone || '',
      refundStatus: apt.refundStatus || refundsByOrderRef.get(apt.id)?.[0]?.status,
      createdAt: apt.createdAt,
      history: Array.isArray(apt.history)
        ? apt.history
            .filter((event: any) => event?.at && event?.action)
            .map((event: any) => ({
              at: String(event.at),
              action: String(event.action).slice(0, 100),
              author: ['client', 'admin', 'system', 'mercadopago_webhook'].includes(event.author)
                ? event.author
                : 'system',
            }))
        : [],
    });

    if (!customer.seenOrderIds.has(apt.id)) {
      customer.seenOrderIds.add(apt.id);
      customer.orders.push({
        id: apt.id,
        kind: 'vip',
        kindLabel: 'Chamada VIP',
        title: `${apt.modalityName || 'Chamada VIP'} · ${displayDateBr} ${displayTimeBr}`,
        amount: Number(apt.price || apt.payment?.amount || 0),
        financialStatus: fin.status,
        financialLabel: fin.label,
        operationalLabel: apt.status,
        createdAt: apt.createdAt,
        paidAt: payment?.paidAt || apt.payment?.paidAt || null,
        linkSource,
      });
    }
  }

  // 5. Processa Personalizados ainda não vinculados via claim
  for (const pers of personalizados) {
    knownNonPackIds.add(pers.id);
    if (seenGlobalOrderIds.has(pers.id)) {
      const claimedProfId = orderRefToProfileId.get(pers.id);
      if (claimedProfId && map.has(claimedProfId)) {
        addContact(map.get(claimedProfId)!, pers.clientContact);
      }
      continue;
    }
    seenGlobalOrderIds.add(pers.id);
    const { customer, linkSource } = await resolveOrCreateCustomer({
      orderRef: pers.id,
      email: pers.clientEmail || (isEmailLike(pers.clientContact) ? pers.clientContact : null),
      contact: pers.clientContact,
      name: pers.clientName,
      createdAt: pers.createdAt,
    });

    const payment = paymentsByOrderRef.get(pers.id);
    const fin = normalizeFinancialStatus(payment?.status || pers.payment?.status);
    customer.personalizados.push({
      id: pers.id,
      photoCount: Number(pers.photoCount || 0),
      videoDurationMinutes: Number(pers.videoDurationMinutes || 0),
      totalPrice: Number(pers.totalPrice || 0),
      deliveryChannel: pers.deliveryChannel || 'vault',
      clientContact: pers.clientContact || '',
      operationalStatus: pers.status,
      financialStatus: fin.status,
      createdAt: pers.createdAt,
    });

    if (!customer.seenOrderIds.has(pers.id)) {
      customer.seenOrderIds.add(pers.id);
      customer.orders.push({
        id: pers.id,
        kind: 'custom',
        kindLabel: 'Personalizado',
        title: `Personalizado (${pers.photoCount || 0} fotos${pers.videoDurationMinutes ? ` + ${pers.videoDurationMinutes}m vídeo` : ''})`,
        amount: Number(pers.totalPrice || 0),
        financialStatus: fin.status,
        financialLabel: fin.label,
        operationalLabel: pers.status,
        createdAt: pers.createdAt,
        paidAt: payment?.paidAt || pers.payment?.paidAt || null,
        linkSource,
      });
    }
  }

  // 6. Processa Pedidos Comerciais (Packs Avulsos) deduplicados
  for (const row of orderRows) {
    const orderId = String(row.id || '');
    const packId = String(row.pack_id || '');
    if (!orderId || seenGlobalOrderIds.has(orderId) || isNonPackOrderRow(orderId, packId, knownNonPackIds)) {
      continue;
    }
    seenGlobalOrderIds.add(orderId);

    const { customer, linkSource } = await resolveOrCreateCustomer({
      orderRef: orderId,
      email: row.customer_email,
      name: row.customer_name,
      createdAt: row.created_at,
    });

    if (!customer.seenOrderIds.has(orderId)) {
      customer.seenOrderIds.add(orderId);
      const payment = paymentsByOrderRef.get(orderId);
      const fin = normalizeFinancialStatus(payment?.status || row.status);
      const pack = catalog.get(packId.toLowerCase());
      customer.orders.push({
        id: orderId,
        kind: 'pack',
        kindLabel: 'Pack Avulso',
        title: pack?.title || `Pack (${packId || 'Conteúdo'})`,
        amount: Number(row.amount || 0),
        financialStatus: fin.status,
        financialLabel: fin.label,
        operationalLabel: fin.status === 'paid' ? 'Pago · sem vínculo com conta' : fin.label,
        createdAt: row.created_at || '',
        paidAt: payment?.paidAt || (fin.status === 'paid' ? row.updated_at || null : null),
        linkSource,
      });
    }
  }

  // 7. Ordena coleções internas por data mais recente e anexa metadados CRM
  const crmByCustomerId = new Map(
    crmMetaEntries.map(({ key, value }) => [key.slice(CUSTOMER_CRM_PREFIX.length), value])
  );
  for (const cust of map.values()) {
    const crm = crmByCustomerId.get(cust.id);
    if (crm) {
      cust.crmNotes = typeof crm.notes === 'string' ? crm.notes : '';
      cust.crmTags = Array.isArray(crm.tags) ? crm.tags.filter((t) => typeof t === 'string') : [];
      cust.crmUpdatedAt = crm.updatedAt || null;
    }
    if (cust.accessRestrictions) {
      for (const order of cust.orders) {
        if (restrictedOrders.has(order.id)) {
          cust.accessRestrictions[order.id] = true;
          order.operationalLabel = 'Entrega bloqueada';
        }
      }
    }
    for (const item of cust.library) {
      if (restrictedOrders.has(item.orderRef) && item.status === 'active') item.status = 'revoked';
    }
    cust.orders.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    cust.appointments.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    cust.personalizados.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  return map;
}

async function loadProfileDetailPayload(env: NuaIdEnv, profile: CustomerProfile) {
  const [bundle, auditEvents, sessions, crmMeta] = await Promise.all([
    loadCustomerBundle(env, profile.id, undefined, undefined, { includeAppointmentHistory: true, includeAdministrativeContacts: true }),
    listCustomerAuditEvents(env, profile.id),
    listCustomerSessions(env, profile.id),
    getCustomerCrmMeta(env, profile.id),
  ]);
  const restrictions = await getNuaIdAdapter(env)?.kvListByPrefix(orderAccessRestrictionKey('')) || [];
  const orderIds = new Set(bundle.orders.map(order => order.id));
  const restrictedOrderIds = restrictions.map(({ key }) => key.slice(orderAccessRestrictionKey('').length)).filter(id => orderIds.has(id));
  const accessRestrictions = Object.fromEntries(restrictedOrderIds.map(id => [id, true]));
  const contacts = bundle.administrativeContacts;
  const phone = contacts.find(contact => detectContactChannel(contact) === 'whatsapp') || profile.phoneMasked || '';
  const activeSessionsCount = sessions.length;
  const lastSessionAt = sessions.length > 0
    ? sessions.map((s) => s.lastSeenAt || s.createdAt).sort((a, b) => b.localeCompare(a))[0]
    : null;

  return {
    success: true,
    customer: {
      id: profile.id,
      accountType: 'nua_id',
      displayName: profile.displayName,
      email: profile.email,
      phone,
      contacts,
      accessRestrictions,
      crmNotes: crmMeta?.notes || '',
      crmTags: crmMeta?.tags || [],
      crmUpdatedAt: crmMeta?.updatedAt || null,
      activeSessionsCount,
      lastSessionAt,
      status: profile.status,
      marketingOptIn: profile.marketingOptIn,
      termsAcceptedAt: profile.termsAcceptedAt || null,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      anonymizedAt: profile.anonymizedAt || null,
    },
    orders: bundle.orders.map(({ id, kind, kindLabel, title, amount, financialStatus, financialLabel, operationalLabel, createdAt, paidAt }) => ({
      id, kind, kindLabel, title, amount, financialStatus, financialLabel,
      operationalLabel: accessRestrictions[id] ? 'Entrega bloqueada' : operationalLabel, createdAt, paidAt,
    })),
    library: bundle.library.map((item) => ({
      entitlementId: item.entitlementId,
      orderRef: item.orderRef,
      resourceId: item.resourceId,
      kind: item.kind,
      title: item.title,
      purchasedAt: item.purchasedAt,
      expiresAt: item.expiresAt,
      status: accessRestrictions[item.orderRef] && item.status === 'active' ? 'revoked' : item.status,
      revokeReason: accessRestrictions[item.orderRef] ? 'Entrega bloqueada pela administração' : item.revokeReason,
    })),
    appointments: bundle.appointments.map(({ id, modalityName, displayDateBr, displayTimeBr, operationalStatus, financialStatus, callLink, createdAt, history, refundStatus }) => ({
      id, modalityName, displayDateBr, displayTimeBr, operationalStatus, financialStatus,
      hasMeetingLink: Boolean(callLink), createdAt, history, refundStatus,
    })),
    personalizados: bundle.personalizados.map(({ id, photoCount, videoDurationMinutes, totalPrice, deliveryChannel, operationalStatus, financialStatus, createdAt }) => ({
      id, photoCount, videoDurationMinutes, totalPrice, deliveryChannel, operationalStatus, financialStatus, createdAt,
    })),
    auditEvents: auditEvents.slice(0, 30).map((event) => ({
      id: event.id,
      action: event.action,
      createdAt: event.createdAt,
      details: event.details || {},
    })),
  };
}

export const onRequestGet = async (context: PagesContext<NuaIdEnv>) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const targetId = (url.searchParams.get('id') || '').trim();
  const query = (url.searchParams.get('q') || '').trim().toLowerCase();
  const filter = (url.searchParams.get('filter') || 'all').trim().toLowerCase();
  const sort = (url.searchParams.get('sort') || 'recent').trim().toLowerCase();
  const requestedPage = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get('pageSize') || '20', 10) || 20));

  // Perfil NUA ID é resolvido diretamente; não precisa reconstruir a listagem inteira.
  if (targetId && !targetId.startsWith('guest:')) {
    try {
      const profile = await getProfileById(env, targetId);
      if (!profile) {
        return new Response(
          JSON.stringify({ success: false, error: 'Cliente não encontrado.' }),
          { status: 404, headers: ADMIN_HEADERS }
        );
      }
      const payload = await loadProfileDetailPayload(env, profile);
      return new Response(JSON.stringify(payload), { status: 200, headers: ADMIN_HEADERS });
    } catch (error) {
      console.error('[AdminCustomers] Falha ao consultar a ficha do cliente:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Não foi possível consultar os dados do cliente. Tente novamente.' }),
        { status: 503, headers: ADMIN_HEADERS }
      );
    }
  }

  // 1. Detalhe de um cliente específico (com conta NUA ID ou visitante)
  if (targetId) {
    let customersMap: Map<string, AggregatedCustomer>;
    try {
      customersMap = await buildUnifiedCustomersIndex(env, true);
    } catch (error) {
      console.error('[AdminCustomers] Falha ao montar os dados do cliente:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Não foi possível consultar os dados do cliente. Tente novamente.' }),
        { status: 503, headers: ADMIN_HEADERS }
      );
    }
    const legacyOrderRef = targetId.startsWith('guest:order:') ? targetId.slice('guest:order:'.length) : '';
    const unified = customersMap.get(targetId) || (legacyOrderRef
      ? Array.from(customersMap.values()).find(customer => customer.accountType === 'guest' && customer.seenOrderIds.has(legacyOrderRef))
      : undefined);

    if (!unified) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cliente não encontrado. Atualize a lista para ver os vínculos recentes.' }),
        { status: 404, headers: ADMIN_HEADERS }
      );
    }

    const auditEvents = await listCustomerAuditEvents(env, unified.id);

    return new Response(
      JSON.stringify({
        success: true,
        customer: {
          id: unified.id,
          accountType: unified.accountType,
          displayName: unified.displayName,
          email: unified.email || 'Sem e-mail cadastrado',
          phone: unified.phone || '',
          contacts: unified.contacts,
          reviewReason: unified.reviewReason,
          accessRestrictions: unified.accessRestrictions,
          crmNotes: unified.crmNotes || '',
          crmTags: unified.crmTags || [],
          crmUpdatedAt: unified.crmUpdatedAt || null,
          status: unified.status,
          marketingOptIn: unified.profile?.marketingOptIn ?? false,
          termsAcceptedAt: unified.profile?.termsAcceptedAt || null,
          createdAt: unified.createdAt,
          updatedAt: unified.profile?.updatedAt || unified.createdAt,
          anonymizedAt: unified.profile?.anonymizedAt || null,
        },
        orders: unified.orders,
        library: unified.library,
        appointments: unified.appointments,
        personalizados: unified.personalizados,
        auditEvents: auditEvents.slice(0, 30).map((ev) => ({
          id: ev.id,
          action: ev.action,
          createdAt: ev.createdAt,
          details: ev.details || {},
        })),
      }),
      { status: 200, headers: ADMIN_HEADERS }
    );
  }

  // 2. Listagem unificada em lote (Com Conta NUA ID + Visitantes)
  let customersMap: Map<string, AggregatedCustomer>;
  try {
    customersMap = await buildUnifiedCustomersIndex(env);
  } catch (error) {
    console.error('[AdminCustomers] Falha ao montar a listagem unificada:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Não foi possível carregar todos os dados dos clientes. Tente novamente.' }),
      { status: 503, headers: ADMIN_HEADERS }
    );
  }
  const allRows = Array.from(customersMap.values()).map((c) => {
    const paidOrders = c.orders.filter((o) => o.financialStatus === 'paid');
    const packOrders = c.orders.filter((o) => o.kind === 'pack');
    const totalSpent = paidOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);
    const attentionReasons: string[] = [];
    const pendingReschedules = c.appointments.filter((a) => a.operationalStatus === 'reagendamento_pendente').length;
    const pendingRefunds = c.appointments.filter((a) => a.operationalStatus === 'reembolso_pendente' ||
      ['pending', 'failed', 'manual_required', 'awaiting_finance'].includes(a.refundStatus || '')).length;
    const hasPendingRefund = pendingRefunds > 0;
    const readyCustoms = c.personalizados.filter((pe) => pe.operationalStatus === 'pronto').length;
    const chargebacks = c.orders.filter((o) => o.financialStatus === 'charged_back').length;
    if (c.reviewReason) attentionReasons.push('Contato marcado para revisão');
    if (pendingReschedules) attentionReasons.push(`${pendingReschedules} ${pendingReschedules === 1 ? 'pedido de novo horário' : 'pedidos de novo horário'}`);
    if (pendingRefunds) attentionReasons.push(`${pendingRefunds} ${pendingRefunds === 1 ? 'reembolso' : 'reembolsos'} em análise`);
    if (readyCustoms) attentionReasons.push(`${readyCustoms} ${readyCustoms === 1 ? 'personalizado pronto' : 'personalizados prontos'}`);
    if (chargebacks) attentionReasons.push(`${chargebacks} ${chargebacks === 1 ? 'pagamento contestado' : 'pagamentos contestados'}`);
    const needsAttention = attentionReasons.length > 0;

    return {
      id: c.id,
      accountType: c.accountType,
      displayName: c.displayName,
      email: c.email || '',
      phone: c.phone || '',
      contactChannel: detectContactChannel(c.phone || c.email),
      status: c.status,
      createdAt: c.createdAt,
      counts: {
        orders: packOrders.length,
        paidOrders: paidOrders.length,
        libraryActive: c.library.filter((l) => l.status === 'active').length,
        appointments: c.appointments.length,
        personalizados: c.personalizados.length,
      },
      totalSpent,
      hasPendingRefund,
      needsAttention,
      attentionReasons,
      marketingOptIn: c.profile?.marketingOptIn ?? false,
      crmTags: c.crmTags || [],
      lastOrderAt: c.orders[0]?.createdAt || null,
    };
  });

  // Ordenação selecionável (padrão: atividade mais recente)
  allRows.sort((a, b) => {
    if (sort === 'spent') {
      return b.totalSpent - a.totalSpent || a.id.localeCompare(b.id);
    }
    if (sort === 'orders') {
      const aTotal = a.counts.orders + a.counts.appointments + a.counts.personalizados;
      const bTotal = b.counts.orders + b.counts.appointments + b.counts.personalizados;
      return bTotal - aTotal || b.totalSpent - a.totalSpent || a.id.localeCompare(b.id);
    }
    if (sort === 'created') {
      return (b.createdAt || '').localeCompare(a.createdAt || '') || a.id.localeCompare(b.id);
    }
    const aRef = a.lastOrderAt || a.createdAt || '';
    const bRef = b.lastOrderAt || b.createdAt || '';
    return bRef.localeCompare(aRef) || a.id.localeCompare(b.id);
  });

  // Totais globais reais calculados ANTES de aplicar busca e filtros
  const totals = {
    all: allRows.length,
    withAccount: allRows.filter((r) => r.accountType === 'nua_id').length,
    guests: allRows.filter((r) => r.accountType === 'guest').length,
    active: allRows.filter((r) => r.status === 'active').length,
    attention: allRows.filter((r) => r.needsAttention).length,
    paying: allRows.filter((r) => r.counts.paidOrders > 0).length,
    optIn: allRows.filter((r) => r.status === 'active' && r.marketingOptIn).length,
    empty: allRows.filter(
      (r) =>
        r.counts.orders === 0 &&
        r.counts.libraryActive === 0 &&
        r.counts.appointments === 0 &&
        r.counts.personalizados === 0
    ).length,
  };

  const rows = allRows.filter((row) => {
    if (query) {
      const customer = customersMap.get(row.id)!;
      const fields = [row.displayName, row.email, row.phone, row.id, ...customer.contacts, ...customer.seenOrderIds, ...(row.crmTags || [])];
      const digits = /^[+\d() .-]+$/.test(query) ? query.replace(/\D/g, '') : '';
      if (!fields.some(field => field.toLowerCase().includes(query)) &&
          !(digits.length >= 4 && [row.phone, ...customer.contacts].some(contact => detectContactChannel(contact) === 'whatsapp' && contact.replace(/\D/g, '').includes(digits)))) return false;
    }

    if (filter === 'nua_id' && row.accountType !== 'nua_id') return false;
    if (filter === 'guest' && row.accountType !== 'guest') return false;
    if (filter === 'attention' && !row.needsAttention) return false;
    if (filter === 'refunds' && !row.hasPendingRefund) return false;
    if (filter === 'paying' && row.counts.paidOrders <= 0) return false;
    if (filter === 'optin' && !(row.status === 'active' && row.marketingOptIn)) return false;
    if (filter === 'anonymized' && row.status !== 'anonymized') return false;
    if (
      filter === 'empty' &&
      (row.counts.orders !== 0 || row.counts.libraryActive !== 0 || row.counts.appointments !== 0 || row.counts.personalizados !== 0)
    ) return false;
    if (filter === 'active' && row.status !== 'active') return false;
    if (filter === 'suspended' && row.status !== 'suspended') return false;

    return true;
  });
  const totalFiltered = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const pageStart = (page - 1) * pageSize;
  const pageRows = rows.slice(pageStart, pageStart + pageSize);

  return new Response(
    JSON.stringify({
      success: true,
      customers: pageRows,
      pagination: { page, pageSize, total: totalFiltered, totalPages },
      totals,
    }),
    { status: 200, headers: ADMIN_HEADERS }
  );
};

/**
 * Ações administrativas auditadas (NUNCA manipulação arbitrária de pagamentos).
 * Permitidas: suspender/reativar conta NUA ID, encerrar sessões por segurança, revogar acesso a um pedido.
 */
async function applyCustomerAction(context: PagesContext<NuaIdEnv>) {
  const { request, env } = context;
  const body: any = await request.json().catch(() => ({}));
  const action = String(body?.action || '').trim();
  const profileId = String(body?.profileId || '').trim();
  const reason = String(body?.reason || '').replace(/[<>]/g, '').trim().slice(0, 240);

  if (!profileId || !action) {
    return new Response(
      JSON.stringify({ success: false, error: 'Dados incompletos para realizar esta ação.' }),
      { status: 400, headers: ADMIN_HEADERS }
    );
  }

  // Bloqueio explícito contra manipulação arbitrária de pagamentos
  if (['mark_paid', 'edit_payment', 'impersonate', 'login_as'].includes(action)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Esta ação não é permitida por segurança.',
      }),
      { status: 403, headers: ADMIN_HEADERS }
    );
  }

  // Ação CRM (notas internas e tags) funciona tanto para contas quanto visitantes
  if (action === 'save_crm_meta') {
    const rawNotes = typeof body?.notes === 'string' ? body.notes.replace(/[<>]/g, '').trim().slice(0, 1500) : '';
    const rawTags = Array.isArray(body?.tags)
      ? Array.from(
          new Set(
            body.tags
              .map((t: unknown) => String(t || '').replace(/[<>]/g, '').trim().slice(0, 24))
              .filter(Boolean)
          )
        ).slice(0, 8)
      : [];
    const nowIso = new Date().toISOString();
    const saved = await saveCustomerCrmMeta(env, profileId, {
      notes: rawNotes,
      tags: rawTags as string[],
      updatedAt: nowIso,
    });
    if (!saved) {
      return actionResponse(503, { error: 'Não foi possível salvar as anotações internas.' });
    }
    const auditRecorded = await recordCustomerAuditEvent(env, {
      profileId,
      action: 'admin_save_crm_meta',
      details: { tagsCount: rawTags.length, hasNotes: Boolean(rawNotes) },
    }).catch(() => false);
    return actionResponse(200, { crmNotes: rawNotes, crmTags: rawTags, crmUpdatedAt: nowIso, auditRecorded });
  }

  if (profileId.startsWith('guest:')) {
    const guestActions = ['mark_guest_review', 'clear_guest_review', 'restrict_order_access', 'restore_order_access'];
    if (!guestActions.includes(action)) {
      return actionResponse(400, { error: 'Esta ação exige uma conta cadastrada.' });
    }

    const guest = (await buildUnifiedCustomersIndex(env, true)).get(profileId);
    if (!guest || guest.accountType !== 'guest') {
      return actionResponse(404, { error: 'Ficha de visitante não encontrada. Atualize a lista.' });
    }
    const store = getNuaIdAdapter(env);
    if (!store) return actionResponse(503, { error: 'Não foi possível salvar a alteração.' });

    const isOrderAction = action === 'restrict_order_access' || action === 'restore_order_access';
    const orderRef = String(body?.orderRef || '').trim();
    if (isOrderAction) {
      const order = guest.orders.find(item => item.id === orderRef && item.kind !== 'vip');
      if (!order || await getOrderClaim(env, orderRef)) {
        return actionResponse(409, { error: 'O pedido mudou de ficha ou não tem entrega pelo Cofre. Atualize a lista.' });
      }
    }

    const key = isOrderAction ? orderAccessRestrictionKey(orderRef) : GUEST_REVIEW_PREFIX + guest.id;
    const clearing = action === 'clear_guest_review' || action === 'restore_order_access';
    const existing = await store.kvGet(key, true);
    const saved = clearing ? (!existing || await store.kvDelete(key)) : await store.kvSet(key, { reason: reason || 'Em revisão administrativa', createdAt: new Date().toISOString() });
    if (!saved) return actionResponse(503, { error: 'Não foi possível salvar a alteração.' });

    const auditRecorded = await recordCustomerAuditEvent(env, {
      profileId: guest.id,
      action: `admin_${action}`,
      details: { reason, ...(isOrderAction ? { orderRef } : {}) },
    }).catch(() => false);
    await recordAuditEvent(env, request, {
      type: 'SECURITY_ACTION',
      summary: isOrderAction ? 'Bloqueio de entrega de um pedido alterado no painel' : 'Revisão de um visitante atualizada no painel',
      details: { action, profileId: guest.id, reason, ...(isOrderAction ? { orderRef } : {}) },
    }).catch(() => {});
    return actionResponse(200, { auditRecorded });
  }

  const profile = await getProfileById(env, profileId);
  if (!profile) {
    return new Response(
      JSON.stringify({ success: false, error: 'Cliente não encontrado.' }),
      { status: 404, headers: ADMIN_HEADERS }
    );
  }

  if (action === 'restrict_order_access' || action === 'restore_order_access') {
    const orderRef = String(body?.orderRef || '').trim();
    const claim = orderRef && await getOrderClaim(env, orderRef);
    if (!claim || claim.profileId !== profile.id) {
      return actionResponse(409, { error: 'Este pedido não pertence à conta selecionada.' });
    }
    const store = getNuaIdAdapter(env);
    if (!store) {
      return actionResponse(503, { error: 'Não foi possível atualizar o bloqueio.' });
    }
    if (action === 'restore_order_access') {
      if (await isOrderAccessRestricted(env, orderRef) && !await store.kvDelete(orderAccessRestrictionKey(orderRef))) {
        return actionResponse(503, { error: 'Não foi possível retirar o bloqueio.' });
      }
    } else {
      const saved = await store.kvSet(orderAccessRestrictionKey(orderRef), {
        reason: reason || 'Entrega em revisão administrativa',
        createdAt: new Date().toISOString(),
      });
      if (!saved) {
        return actionResponse(503, { error: 'Não foi possível aplicar o bloqueio.' });
      }
    }
    const auditRecorded = await recordCustomerAuditEvent(env, {
      profileId: profile.id,
      action: `admin_${action}`,
      details: { orderRef, reason },
    }).catch(() => false);
    await recordAuditEvent(env, request, {
      type: 'SECURITY_ACTION' as any,
      summary: action === 'restore_order_access' ? 'Entrega pelo Cofre desbloqueada pelo painel' : 'Entrega pelo Cofre bloqueada pelo painel',
      details: { profileId: profile.id, orderRef, reason },
    }).catch(() => {});
    return actionResponse(200, { auditRecorded });
  }

  if (action === 'restore_entitlement') {
    const orderRef = String(body?.orderRef || '').trim();
    if (!orderRef) {
      return actionResponse(400, { error: 'Selecione o pedido para restaurar o acesso.' });
    }
    const restored = await restoreEntitlementsByOrder(env, orderRef, profile.id);
    const store = getNuaIdAdapter(env);
    let restrictionCleared = false;
    if (store && await isOrderAccessRestricted(env, orderRef)) {
      restrictionCleared = Boolean(await store.kvDelete(orderAccessRestrictionKey(orderRef)));
    }
    if (restored === 0 && !restrictionCleared) {
      return actionResponse(409, { error: 'Este acesso já está ativo ou não pertence a esta conta.' });
    }
    const auditRecorded = await recordCustomerAuditEvent(env, {
      profileId: profile.id,
      action: 'admin_restore_entitlement',
      details: { orderRef, restored, restrictionCleared, reason },
    }).catch(() => false);
    await recordAuditEvent(env, request, {
      type: 'SECURITY_ACTION' as any,
      summary: 'Acesso ao conteúdo restaurado pelo painel',
      details: { profileId: profile.id, orderRef, reason },
    }).catch(() => {});
    return actionResponse(200, { restored, auditRecorded });
  }

  if (action === 'resend_access_email') {
    if (profile.status !== 'active' || !isEmailLike(profile.email)) {
      return actionResponse(409, { error: 'Somente contas ativas com e-mail válido podem receber link de acesso.' });
    }
    const siteUrl = (env.NEXT_PUBLIC_SITE_URL || 'https://nuaborges.com.br').replace(/\/$/, '');
    const mail = renderTransactionalNotificationHtml({
      subject: 'Link de acesso à sua Minha Conta — Nua Borges',
      heading: 'Acesse sua Área Privativa',
      message:
        'A pedido do nosso atendimento, reenviamos o atalho para entrar na sua Minha Conta e consultar suas obras, chamadas VIP e pedidos com segurança.',
      statusLabel: 'Acesso disponível',
      ctaUrl: `${siteUrl}/conta?email=${encodeURIComponent(profile.email)}`,
      ctaLabel: 'Entrar em Minha Conta',
      eyebrow: 'Minha Conta',
    });
    const dispatch = await dispatchTransactionalEmail(env, {
      to: profile.email,
      subject: mail.subject,
      html: mail.html,
    });
    if (!dispatch.sent) {
      return actionResponse(503, { error: 'Não foi possível enviar o e-mail de acesso agora.' });
    }
    const auditRecorded = await recordCustomerAuditEvent(env, {
      profileId: profile.id,
      action: 'admin_resend_access_email',
      details: { reason },
    }).catch(() => false);
    await recordAuditEvent(env, request, {
      type: 'SECURITY_ACTION' as any,
      summary: 'Link de acesso reenviado ao cliente pelo painel',
      details: { profileId: profile.id, reason },
    }).catch(() => {});
    return actionResponse(200, { sent: true, auditRecorded });
  }

  if (action === 'revoke_sessions') {
    const count = await revokeAllCustomerSessions(env, profile.id, undefined, true);
    const auditRecorded = await recordCustomerAuditEvent(env, {
      profileId: profile.id,
      action: 'admin_revoke_all_sessions',
      details: { count, reason },
    }).catch(() => false);
    await recordAuditEvent(env, request, {
      type: 'SECURITY_ACTION' as any,
      summary: `Encerrados ${count} aparelho(s) conectado(s) do cliente`,
      details: { profileId: profile.id, count, reason },
    }).catch(() => {});
    return new Response(
      JSON.stringify({ success: true, revokedCount: count, auditRecorded }),
      { status: 200, headers: ADMIN_HEADERS }
    );
  }

  if (action === 'suspend' || action === 'reactivate') {
    if (profile.status === 'anonymized') {
      return new Response(
        JSON.stringify({ success: false, error: 'Contas anonimizadas não podem ser reativadas.' }),
        { status: 409, headers: ADMIN_HEADERS }
      );
    }
    profile.status = action === 'suspend' ? 'suspended' : 'active';
    if (action === 'suspend') {
      profile.sessionsValidAfter = new Date().toISOString();
      profile.sessionsExemptId = null;
    }
    const saved = await saveProfile(env, profile);
    if (!saved) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não foi possível salvar a alteração da conta.' }),
        { status: 503, headers: ADMIN_HEADERS }
      );
    }
    const sessionsInvalidated = action !== 'suspend' || await revokeAllCustomerSessions(env, profile.id, undefined, true).then(() => true, () => false);
    const auditRecorded = await recordCustomerAuditEvent(env, {
      profileId: profile.id,
      action: `admin_${action}_account`,
      details: { reason, sessionsInvalidated },
    }).catch(() => false);
    await recordAuditEvent(env, request, {
      type: 'SECURITY_ACTION' as any,
      summary: `Conta de cliente ${action === 'suspend' ? 'suspensa' : 'reativada'} pelo painel`,
      details: { profileId: profile.id, reason },
    }).catch(() => {});
    return new Response(
      JSON.stringify({ success: true, status: profile.status, auditRecorded, sessionsInvalidated }),
      { status: 200, headers: ADMIN_HEADERS }
    );
  }

  if (action === 'revoke_entitlement') {
    const orderRef = String(body?.orderRef || '').trim();
    if (!orderRef) {
      return new Response(
        JSON.stringify({ success: false, error: 'Selecione o pedido para retirar o acesso.' }),
        { status: 400, headers: ADMIN_HEADERS }
      );
    }
    const revoked = await revokeEntitlementsByOrder(
      env,
      orderRef,
      reason || 'admin_revoked',
      profile.id
    );
    if (revoked === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Este acesso não pertence a esta conta ou já foi revogado.' }),
        { status: 409, headers: ADMIN_HEADERS }
      );
    }
    const auditRecorded = await recordCustomerAuditEvent(env, {
      profileId: profile.id,
      action: 'admin_revoke_entitlement',
      details: { orderRef, revoked, reason },
    }).catch(() => false);
    await recordAuditEvent(env, request, {
      type: 'SECURITY_ACTION' as any,
      summary: `Acesso ao conteúdo do pedido retirado pelo painel`,
      details: { profileId: profile.id, orderRef, reason },
    }).catch(() => {});
    return new Response(
      JSON.stringify({ success: true, revoked, auditRecorded }),
      { status: 200, headers: ADMIN_HEADERS }
    );
  }

  return new Response(
    JSON.stringify({ success: false, error: 'Ação não reconhecida.' }),
    { status: 400, headers: ADMIN_HEADERS }
  );
}

function actionResponse(status: number, data: Record<string, unknown>) {
  return new Response(JSON.stringify({ success: status < 400, ...data }), { status, headers: ADMIN_HEADERS });
}

export const onRequestPost = async (context: PagesContext<NuaIdEnv>) => {
  try {
    return await applyCustomerAction(context);
  } catch (error) {
    console.error('[AdminCustomers] Falha ao salvar ação:', error);
    return actionResponse(503, { error: 'A ação não pôde ser confirmada. Atualize a ficha e tente novamente.' });
  }
};
