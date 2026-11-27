/**
 * Stateful Isolated Supabase + Mercado Pago + Email Fetch Harness
 *
 * Intercepts outbound `fetch` calls to:
 * - `https://qa-isolated.supabase.test/rest/v1/*` (PostgREST tables & RPCs)
 * - `https://api.mercadopago.com/v1/payments*` (Contract-faithful MP Pix + Refunds)
 *
 * Also provides an in-memory `NuaIdStorageAdapter` (`__TEST_NUA_ID_ADAPTER__`) and
 * email capture (`__TEST_EMAIL_SENDER__`) so Cloudflare Pages Functions execute
 * end-to-end without ever touching production infrastructure.
 */

import { DEFAULT_SITE_CONTENT } from '@/lib/defaultContent';
import { DEFAULT_MODALITIES, DEFAULT_SCHEDULE_SETTINGS } from '@/lib/appointmentsCanonical';
import { DEFAULT_PERSONALIZADOS_SETTINGS } from '@/lib/personalizadosCanonical';
import { createMemoryNuaIdStore } from '@/functions/api/id/_nuaIdStore';
import { TEST_SECRETS, createTestPack } from '../factories/domainFactories';

export interface CapturedEmail {
  to: string;
  subject: string;
  html: string;
  meta?: Record<string, any>;
  sentAt: string;
}

export interface MpPaymentFixture {
  id: string;
  status: string;
  status_detail?: string;
  transaction_amount: number;
  currency_id: string;
  external_reference: string;
  payment_method_id: string;
  date_approved?: string | null;
  date_last_updated?: string | null;
  date_of_expiration?: string | null;
  point_of_interaction?: any;
}

export class IsolatedBackendHarness {
  public tables: Record<string, any[]>;
  public kv = new Map<string, any>();
  public emails: CapturedEmail[] = [];
  public mpPayments = new Map<string, MpPaymentFixture>();
  public mpRefunds: Array<{ paymentId: string; id: string; amount?: number; idempotencyKey?: string }> = [];
  public faults: {
    supabaseDown?: boolean;
    atomicRateLimiterUnavailable?: boolean;
    mpCreateDown?: boolean;
    mpGetDown?: boolean;
    emailDown?: boolean;
    mediaStoreDown?: boolean;
  } = {};

  private nextMpId = 900000100;
  private origFetch: typeof globalThis.fetch | null = null;

  constructor() {
    this.tables = this.createInitialTables();
  }

  private createInitialTables(): Record<string, any[]> {
    const defaultPack = createTestPack({
      id: 'avulso-ensaio-qa',
      slug: 'ensaio-qa',
      title: 'Ensaio Exclusivo QA',
      price: 'R$ 89,90',
      numericPrice: 89.9,
    });
    const draftPack = createTestPack({
      id: 'avulso-rascunho-qa',
      slug: 'rascunho-qa',
      title: 'Pack Rascunho Privado',
      price: 'R$ 149,90',
      numericPrice: 149.9,
      active: false,
      isDraft: true,
    });

    const publishedContent = {
      ...DEFAULT_SITE_CONTENT,
      avulsos: {
        ...(DEFAULT_SITE_CONTENT.avulsos || {}),
        active: true,
        items: [defaultPack],
      },
    };
    const privateContent = {
      ...publishedContent,
      avulsos: {
        ...publishedContent.avulsos,
        items: [defaultPack, draftPack],
      },
    };

    return {
      site_content: [
        { key: 'published_content', content: publishedContent, updated_at: new Date().toISOString() },
        { key: 'private_admin_content', content: privateContent, updated_at: new Date().toISOString() },
      ],
      content_backups: [],
      orders: [],
      appointments: [],
      appointments_settings: [
        {
          id: 'default',
          settings: DEFAULT_SCHEDULE_SETTINGS,
          modalities: DEFAULT_MODALITIES,
          updated_at: new Date().toISOString(),
        },
      ],
      personalizados_settings: [
        {
          id: 'default',
          settings: DEFAULT_PERSONALIZADOS_SETTINGS,
          updated_at: new Date().toISOString(),
        },
      ],
      personalizados_orders: [],
      admin_sessions: [],
      audit_logs: [],
      vip_leads: [],
      b2_media_index: [],
      customer_profiles: [],
      customer_sessions: [],
      otp_challenges: [],
      order_claims: [],
      entitlements: [],
      payments: [],
      payment_events: [],
      refunds: [],
      notification_events: [],
      customer_audit_events: [],
      rate_limits: [],
    };
  }

  public createEnv(overrides: Record<string, any> = {}): Record<string, any> {
    const self = this;
    const memStore = createMemoryNuaIdStore();
    this.kv = memStore._map;

    return {
      ENVIRONMENT: 'production',
      NEXT_PUBLIC_SITE_URL: 'https://nuaborges.com.br',
      SUPABASE_URL: TEST_SECRETS.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: TEST_SECRETS.SUPABASE_SERVICE_ROLE_KEY,
      ADMIN_PASSWORD: TEST_SECRETS.ADMIN_PASSWORD,
      CLIENT_PASSWORD: TEST_SECRETS.CLIENT_PASSWORD,
      CONTRACT_PASSWORD: TEST_SECRETS.CONTRACT_PASSWORD,
      ADMIN_SESSION_SECRET: TEST_SECRETS.ADMIN_SESSION_SECRET,
      ADMIN_API_SECRET: TEST_SECRETS.ADMIN_API_SECRET,
      NUA_ID_SECRET: TEST_SECRETS.NUA_ID_SECRET,
      IP_HASH_SECRET: TEST_SECRETS.IP_HASH_SECRET,
      CRON_SECRET: TEST_SECRETS.CRON_SECRET,
      MP_ACCESS_TOKEN: TEST_SECRETS.MP_ACCESS_TOKEN,
      MP_WEBHOOK_SECRET: TEST_SECRETS.MP_WEBHOOK_SECRET,
      TURNSTILE_SECRET_KEY: 'qa-turnstile-secret-isolated',
      PAYMENT_TEST_MODE: 'true',
      __NUA_ID_TEST_STORE__: memStore,
      __EMAIL_SENDER__: async (msg: { to: string; subject: string; html: string; [key: string]: any }) => {
        if (self.faults.emailDown) {
          return false;
        }
        const { to, subject, html, ...meta } = msg;
        self.emails.push({
          to,
          subject,
          html,
          meta,
          sentAt: new Date().toISOString(),
        });
        return true;
      },
      ...overrides,
    };
  }

  public installFetchInterceptor(): void {
    if (this.origFetch) return;
    this.origFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (urlStr.startsWith(TEST_SECRETS.SUPABASE_URL)) {
        return this.handleSupabaseFetch(urlStr, init);
      }
      if (urlStr.startsWith('https://api.mercadopago.com/')) {
        return this.handleMercadoPagoFetch(urlStr, init);
      }
      if (urlStr.startsWith('https://challenges.cloudflare.com/turnstile/')) {
        return Response.json({ success: true });
      }
      // Fail-closed: never allow accidental real network calls during isolated tests!
      throw new Error(`[QA Isolation Guard] Blocked unexpected external network request to: ${urlStr}`);
    }) as typeof fetch;
  }

  public restoreFetch(): void {
    if (this.origFetch) {
      globalThis.fetch = this.origFetch;
      this.origFetch = null;
    }
  }

  private async handleMercadoPagoFetch(urlStr: string, init?: RequestInit): Promise<Response> {
    const url = new URL(urlStr);
    const method = (init?.method || 'GET').toUpperCase();

    // POST /v1/payments (Create Pix)
    if (url.pathname === '/v1/payments' && method === 'POST') {
      if (this.faults.mpCreateDown) {
        return Response.json({ message: 'Simulated MP create outage' }, { status: 503 });
      }
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      const id = String(++this.nextMpId);
      const qrCode = `00020126580014br.gov.bcb.pix0136qa-${id}5204000053039865405${Number(body.transaction_amount || 0).toFixed(2)}5802BR6304QA01`;
      const expiresAt = body.date_of_expiration || new Date(Date.now() + 20 * 60_000).toISOString();
      const fixture: MpPaymentFixture = {
        id,
        status: 'pending',
        status_detail: 'pending_waiting_transfer',
        transaction_amount: Number(body.transaction_amount || 0),
        currency_id: 'BRL',
        external_reference: String(body.external_reference || ''),
        payment_method_id: 'pix',
        date_of_expiration: expiresAt,
        date_last_updated: new Date().toISOString(),
        point_of_interaction: {
          transaction_data: {
            qr_code: qrCode,
            qr_code_base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          },
        },
      };
      this.mpPayments.set(id, fixture);
      return Response.json(fixture, { status: 201 });
    }

    // POST /v1/payments/:id/refunds
    const refundMatch = url.pathname.match(/^\/v1\/payments\/([^/]+)\/refunds$/);
    if (refundMatch && method === 'POST') {
      const paymentId = decodeURIComponent(refundMatch[1]);
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      const idempotencyKey =
        init?.headers instanceof Headers
          ? init.headers.get('X-Idempotency-Key') || undefined
          : (init?.headers as any)?.['X-Idempotency-Key'];
      const existing = idempotencyKey
        ? this.mpRefunds.find((r) => r.idempotencyKey === idempotencyKey)
        : undefined;
      if (existing) {
        return Response.json({ id: existing.id, status: 'approved', amount: existing.amount }, { status: 201 });
      }
      const refId = `ref_${Date.now()}_${this.mpRefunds.length + 1}`;
      this.mpRefunds.push({ paymentId, id: refId, amount: body.amount, idempotencyKey });
      const p = this.mpPayments.get(paymentId);
      if (p) p.status = 'refunded';
      return Response.json({ id: refId, status: 'approved', amount: body.amount }, { status: 201 });
    }

    // GET/PUT /v1/payments/:id
    const payMatch = url.pathname.match(/^\/v1\/payments\/([^/]+)$/);
    if (payMatch) {
      const paymentId = decodeURIComponent(payMatch[1]);
      if (method === 'GET') {
        if (this.faults.mpGetDown) {
          return Response.json({ message: 'Simulated MP get outage' }, { status: 503 });
        }
        const p = this.mpPayments.get(paymentId);
        if (!p) return Response.json({ message: 'Payment not found' }, { status: 404 });
        return Response.json(p, { status: 200 });
      }
      if (method === 'PUT') {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        const p = this.mpPayments.get(paymentId);
        if (!p) return Response.json({ message: 'Payment not found' }, { status: 404 });
        if (body.status) p.status = body.status;
        p.date_last_updated = new Date().toISOString();
        return Response.json(p, { status: 200 });
      }
    }

    if (url.pathname === '/users/me') {
      return Response.json({ id: 123456, nickname: 'NUA_QA', email: 'qa@example.test', site_id: 'MLB', country_id: 'BR' });
    }

    return Response.json({ message: 'Unhandled MP endpoint' }, { status: 404 });
  }

  private async handleSupabaseFetch(urlStr: string, init?: RequestInit): Promise<Response> {
    if (this.faults.supabaseDown) {
      return Response.json({ message: 'Simulated Supabase outage', code: '503' }, { status: 503 });
    }

    const url = new URL(urlStr);
    const method = (init?.method || 'GET').toUpperCase();
    const headers = new Headers(init?.headers || {});
    const accept = headers.get('Accept') || '';
    const prefer = headers.get('Prefer') || '';

    // RPC calls
    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      const rpcName = url.pathname.replace('/rest/v1/rpc/', '');
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      return this.handleRpc(rpcName, body);
    }

    const tableMatch = url.pathname.match(/^\/rest\/v1\/([a-zA-Z0-9_]+)$/);
    if (!tableMatch) {
      return Response.json({ message: 'Unknown Supabase path' }, { status: 404 });
    }
    const tableName = tableMatch[1];
    if (!this.tables[tableName]) {
      this.tables[tableName] = [];
    }
    const rows = this.tables[tableName];

    const matchesFilters = (row: any) => {
      for (const [k, v] of url.searchParams.entries()) {
        if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(k)) continue;
        const [column, field] = k.split('->>');
        const actual = field ? row[column]?.[field] : row[k];
        if (v.startsWith('eq.')) {
          const target = v.slice(3);
          if (String(actual) !== target) return false;
        } else if (v.startsWith('neq.')) {
          const target = v.slice(4);
          if (String(actual) === target) return false;
        } else if (v.startsWith('ilike.')) {
          const pat = v.slice(6).replace(/%/g, '.*');
          if (!new RegExp(`^${pat}$`, 'i').test(String(actual || ''))) return false;
        } else if (v.startsWith('is.')) {
          const target = v.slice(3);
          if (target === 'null' && row[k] !== null && row[k] !== undefined) return false;
        } else if (v.startsWith('not.is.')) {
          const target = v.slice(7);
          if (target === 'null' && (row[k] === null || row[k] === undefined)) return false;
        } else if (v.startsWith('in.(') && v.endsWith(')')) {
          const list = v.slice(4, -1).split(',').map((s) => s.replace(/^"|"$/g, ''));
          if (!list.includes(String(actual))) return false;
        } else if (v.startsWith('gte.')) {
          if (String(actual || '') < v.slice(4)) return false;
        } else if (v.startsWith('lte.')) {
          if (String(actual || '') > v.slice(4)) return false;
        }
      }
      return true;
    };

    const respondRows = (list: any[], status = 200) => {
      if (accept.includes('application/vnd.pgrst.object+json')) {
        if (list.length === 0) {
          return Response.json(
            { code: 'PGRST116', details: 'The result contains 0 rows', message: 'JSON object requested, multiple (or no) rows returned' },
            { status: 406 }
          );
        }
        return Response.json(structuredClone(list[0]), { status });
      }
      return Response.json(structuredClone(list), { status });
    };

    if (method === 'GET') {
      let filtered = rows.filter(matchesFilters);
      const orderParam = url.searchParams.get('order');
      if (orderParam) {
        const [col, dir] = orderParam.split('.');
        filtered = [...filtered].sort((a, b) => {
          const av = a[col] ?? '';
          const bv = b[col] ?? '';
          const cmp = String(av).localeCompare(String(bv));
          return dir === 'desc' ? -cmp : cmp;
        });
      }
      const limit = Number(url.searchParams.get('limit') || 0);
      const offset = Number(url.searchParams.get('offset') || 0);
      filtered = limit > 0 ? filtered.slice(offset, offset + limit) : filtered.slice(offset);
      return respondRows(filtered, 200);
    }

    if (method === 'POST') {
      const payload = init?.body ? JSON.parse(String(init.body)) : {};
      const incoming = Array.isArray(payload) ? payload : [payload];
      const onConflict = url.searchParams.get('on_conflict') || '';
      const isUpsert = prefer.includes('resolution=merge-duplicates');
      const conflictCols = onConflict ? onConflict.split(',').map((s) => s.trim()) : ['id', 'key', 'jti'];
      const inserted: any[] = [];

      for (const item of incoming) {
        const existingIdx = rows.findIndex((r) =>
          conflictCols.some((c) => item[c] !== undefined && r[c] !== undefined && r[c] === item[c])
        );
        if (existingIdx >= 0) {
          if (isUpsert) {
            rows[existingIdx] = { ...rows[existingIdx], ...structuredClone(item) };
            inserted.push(rows[existingIdx]);
          } else {
            return Response.json({ code: '23505', message: 'duplicate key value violates unique constraint' }, { status: 409 });
          }
        } else {
          const rec = structuredClone(item);
          if (!rec.id && tableName !== 'site_content' && tableName !== 'admin_sessions') {
            rec.id = `${tableName}_${Date.now()}_${rows.length + 1}`;
          }
          rows.push(rec);
          inserted.push(rec);
        }
      }
      return respondRows(inserted, 201);
    }

    if (method === 'PATCH') {
      const patch = init?.body ? JSON.parse(String(init.body)) : {};
      const updated: any[] = [];
      for (let i = 0; i < rows.length; i++) {
        if (matchesFilters(rows[i])) {
          rows[i] = { ...rows[i], ...structuredClone(patch) };
          updated.push(rows[i]);
        }
      }
      return respondRows(updated, 200);
    }

    if (method === 'DELETE') {
      const deleted: any[] = [];
      for (let i = rows.length - 1; i >= 0; i--) {
        if (matchesFilters(rows[i])) {
          deleted.push(rows[i]);
          rows.splice(i, 1);
        }
      }
      return respondRows(deleted, 200);
    }

    return Response.json({ message: 'Unsupported method' }, { status: 405 });
  }

  private handleRpc(rpcName: string, body: any): Response {
    if (rpcName === 'expire_pending_appointments' || rpcName === 'expire_vip_appointments') {
      const nowIso = new Date().toISOString();
      let count = 0;
      for (const row of this.tables.appointments) {
        const exp = row.expires_at || row.raw_data?.expiresAt;
        if (row.status === 'aguardando_pagamento' && exp && exp <= nowIso) {
          row.status = 'cancelada';
          if (row.raw_data) row.raw_data.status = 'cancelada';
          count += 1;
        }
      }
      return Response.json(count, { status: 200 });
    }

    if (rpcName === 'reserve_appointment_atomically' || rpcName === 'reserve_vip_appointment') {
      const rowIn = body.p_booking || body.p_raw_data || {};
      let meta: any = {};
      try {
        meta = typeof rowIn.notes === 'string' && rowIn.notes.startsWith('{') ? JSON.parse(rowIn.notes) : rowIn;
      } catch {
        meta = rowIn;
      }
      const bookingDate = meta.date || rowIn.date || '';
      const bookingStart = meta.startTime || rowIn.start_time || '';
      const bookingEnd = meta.endTime || rowIn.end_time || '';
      const bufferMin = Number(body.p_buffer_minutes || 0);
      const startMin = this.toMinutes(bookingStart);
      const endMin = this.toMinutes(bookingEnd);

      // Atomic conflict check against existing active appointments on same date
      const conflict = this.tables.appointments.some((row) => {
        let oMeta: any = {};
        try {
          oMeta = typeof row.notes === 'string' && row.notes.startsWith('{') ? JSON.parse(row.notes) : row.raw_data || row;
        } catch {
          oMeta = row.raw_data || row;
        }
        if (row.id === rowIn.id) return false;
        if (!['confirmada', 'aguardando_pagamento', 'reagendamento_pendente'].includes(row.status)) return false;
        const oDate = oMeta.date || row.date || '';
        if (oDate !== bookingDate) return false;
        const oExp = row.expires_at || oMeta.expiresAt;
        if (row.status === 'aguardando_pagamento' && oExp && oExp <= new Date().toISOString()) {
          return false;
        }
        const oStart = this.toMinutes(oMeta.startTime || row.start_time);
        const oEnd = this.toMinutes(oMeta.endTime || row.end_time) + bufferMin;
        return startMin < oEnd && endMin + bufferMin > oStart;
      });

      if (conflict) {
        return Response.json(rpcName === 'reserve_vip_appointment' ? false : { reserved: false, reason: 'slot_conflict' }, {
          status: 200,
        });
      }

      this.tables.appointments.push(structuredClone(rowIn));
      return Response.json(rpcName === 'reserve_vip_appointment' ? true : { reserved: true }, { status: 200 });
    }

    if (rpcName === 'increment_rate_limit_atomic') {
      const key = String(body.p_bucket_key);
      if (this.faults.atomicRateLimiterUnavailable) {
        return Response.json({ code: 'PGRST202' }, { status: 404 });
      }
      const table = this.tables.rate_limits;
      const now = Date.now();
      let entry = table.find((row) => row.key === key);
      if (!entry) {
        entry = { key, hits: 0, until: now + body.p_window_seconds * 1000 };
        table.push(entry);
      } else if (entry.until <= now) {
        entry.hits = 0;
        entry.until = now + body.p_window_seconds * 1000;
      }
      const allowed = entry.hits < body.p_max_requests;
      if (allowed) entry.hits++;
      return Response.json({ allowed, remaining: Math.max(body.p_max_requests - entry.hits, 0),
        retry_after_seconds: allowed ? 0 : Math.ceil((entry.until - now) / 1000) });
    }

    if (rpcName === 'check_rate_limit') {
      const key = String(body.p_key || '');
      const maxReq = Number(body.p_max_requests || 10);
      const windowSec = Number(body.p_window_seconds || 60);
      const now = Date.now();
      let entry = this.tables.rate_limits.find((r) => r.key === key);
      if (!entry || now >= entry.resetAt) {
        entry = { key, count: 0, resetAt: now + windowSec * 1000 };
        this.tables.rate_limits = this.tables.rate_limits.filter((r) => r.key !== key);
        this.tables.rate_limits.push(entry);
      }
      entry.count += 1;
      const allowed = entry.count <= maxReq;
      return Response.json(
        { allowed, remaining: Math.max(0, maxReq - entry.count), retry_after_seconds: Math.ceil((entry.resetAt - now) / 1000) },
        { status: 200 }
      );
    }

    return Response.json({ message: `Unknown RPC ${rpcName}` }, { status: 404 });
  }

  private toMinutes(t: string): number {
    const [h, m] = String(t || '00:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }
}
