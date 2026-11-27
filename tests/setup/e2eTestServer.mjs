/**
 * Isolated Stateful QA E2E Server for NUA Borges Playwright Journeys
 *
 * Serves the real compiled Next.js static export (`out/`) on 127.0.0.1 and
 * provides an isolated, deterministic, in-memory backend mirroring the real
 * Cloudflare Pages Functions API contracts (Auth, NUA ID, Packs, Personalizados,
 * Chamadas VIP, Cofre Digital multi-browser trust, Central de Clientes, Admin CMS).
 *
 * Strictly bound to 127.0.0.1 — NEVER connects to production Supabase, B2, SMTP, or Mercado Pago.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT_DIR, 'out');
const PORT = Number(process.env.QA_E2E_PORT || 3199);

const ADMIN_PASS = 'qa-admin-pass-2026';
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/x-component; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
};

function sha256(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex');
}

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }
  return out;
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

function createInitialState() {
  const baseCatalogPath = path.join(ROOT_DIR, 'data', 'published_content.json');
  let baseContent = {
    siteName: 'Nua Borges',
    hero: { title: 'Nua Borges', subtitle: 'Editorial Autoral', photos: [] },
    about: { title: 'Sobre', text: 'Biografia QA' },
    gallery: { title: 'Acervo', photos: [] },
    avulsos: { active: true, items: [] },
    channels: { items: [] },
    contact: { email: 'contato@nuaborges.com.br' },
    seo: { title: 'Nua Borges', description: 'QA' },
    library: [],
    albums: [],
  };
  if (fs.existsSync(baseCatalogPath)) {
    try {
      baseContent = JSON.parse(fs.readFileSync(baseCatalogPath, 'utf8'));
    } catch {}
  }

  const qaPack = {
    id: 'avulso-teste',
    slug: 'teste',
    modality: 'pack',
    title: 'Ensaio Autoral QA',
    subtitle: 'Coleção completa para validação E2E',
    description: 'Pack exclusivo de teste automatizado.',
    price: 'R$ 99,00',
    numericPrice: 99,
    active: true,
    isDraft: false,
    coverImage: '/media/gallery/qa-cover.png',
    previewImages: ['/media/gallery/qa-preview.png'],
    exclusivePhotos: ['/media/private/teste/foto-01.png', '/media/private/teste/foto-02.png'],
    videos: [],
  };

  const existingItems = Array.isArray(baseContent.avulsos?.items) ? baseContent.avulsos.items : [];
  const hasTeste = existingItems.some((i) => i.slug === 'teste');
  const items = hasTeste
    ? existingItems.map((i) =>
        i.slug === 'teste'
          ? {
              ...i,
              active: true,
              isDraft: false,
              numericPrice: qaPack.numericPrice,
              price: qaPack.price,
              exclusivePhotos: i.exclusivePhotos?.length ? i.exclusivePhotos : qaPack.exclusivePhotos,
            }
          : i
      )
    : [qaPack, ...existingItems];

  const publishedContent = {
    ...baseContent,
    avulsos: { ...(baseContent.avulsos || {}), active: true, items },
  };
  const privateContent = structuredClone(publishedContent);

  return {
    publishedContent,
    privateContent,
    adminSessions: new Map(), // token -> { role, revoked }
    profiles: new Map(), // email -> { id, email, emailNormalized, displayName, status, createdAt }
    customerSessions: new Map(), // sessionId -> { id, profileId, deviceLabel, revoked }
    otpChallenges: new Map(), // email -> { code, expiresAt }
    orders: new Map(), // orderId -> order
    orderClaims: new Map(), // orderId -> { orderRef, profileId }
    entitlements: [], // { profileId, orderRef, kind, resourceId, title, status, allowDownload }
    vaultDevices: new Map(), // `${profileId}:${deviceHash}` -> { id, label, expires }
    vaultVisits: new Map(), // visitHash -> { order, device, accountSession, seen }
    vaultChallenges: new Map(), // tokenHash -> { profile, order, email, browserHash, expires }
    personalizados: new Map(),
    personalizadosSettings: {
      enabled: true,
      minPhotos: 1,
      maxPhotos: 30,
      basePhotoPrice: 40,
      pricePerPhoto: 25,
      videoEnabled: true,
      videoOptions: [
        { id: 'vid_none', label: 'Sem vídeo', durationMinutes: 0, price: 0 },
        { id: 'vid_3m', label: 'Vídeo 3 min', durationMinutes: 3, price: 150 },
      ],
      mentionNameFee: 30,
      expressFee: 80,
      minimumOrderPrice: 40,
    },
    appointments: new Map(),
    appointmentsSettings: {
      timezone: 'Europe/Dublin',
      minNoticeHours: 2,
      maxFutureDays: 90,
      maxAdvanceMonths: 3,
      bufferMinutes: 15,
      weeklyHours: {
        0: { enabled: true, ranges: [{ start: '14:00', end: '22:00' }] },
        1: { enabled: true, ranges: [{ start: '14:00', end: '22:00' }] },
        2: { enabled: true, ranges: [{ start: '14:00', end: '22:00' }] },
        3: { enabled: true, ranges: [{ start: '14:00', end: '22:00' }] },
        4: { enabled: true, ranges: [{ start: '14:00', end: '22:00' }] },
        5: { enabled: true, ranges: [{ start: '14:00', end: '22:00' }] },
        6: { enabled: true, ranges: [{ start: '14:00', end: '22:00' }] },
      },
      blockedDates: [],
    },
    modalities: [
      {
        id: 'chamada-vip-15',
        name: 'Chamada VIP 15 min',
        durationMinutes: 15,
        price: 180,
        priceFormatted: 'R$ 180,00',
        active: true,
      },
      {
        id: 'chamada-vip-30',
        name: 'Chamada VIP 30 min',
        durationMinutes: 30,
        price: 320,
        priceFormatted: 'R$ 320,00',
        active: true,
      },
    ],
    emails: [],
    faults: {}, // routePrefix -> statusCode
  };
}

let state = createInitialState();

function sendJson(res, status, data, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(JSON.stringify(data));
}

function getOrCreateProfile(email, displayName) {
  const norm = String(email || '').trim().toLowerCase();
  if (!norm) return null;
  if (!state.profiles.has(norm)) {
    state.profiles.set(norm, {
      id: `prof_${sha256(norm).slice(0, 12)}`,
      email: norm,
      emailNormalized: norm,
      displayName: displayName || norm.split('@')[0],
      status: 'active',
      marketingOptIn: false,
      createdAt: new Date().toISOString(),
    });
  }
  return state.profiles.get(norm);
}

function getCustomerFromRequest(req) {
  const cookies = parseCookies(req);
  const sid = cookies.nua_id_session;
  if (!sid) return null;
  const sess = state.customerSessions.get(sid);
  if (!sess || sess.revoked) return null;
  const profile = [...state.profiles.values()].find((p) => p.id === sess.profileId);
  if (!profile || profile.status !== 'active') return null;
  return { session: sess, profile };
}

function getAdminFromRequest(req) {
  const cookies = parseCookies(req);
  const tok = cookies.nua_admin_session;
  if (!tok) return null;
  const sess = state.adminSessions.get(tok);
  if (!sess || sess.revoked) return null;
  return sess;
}

function resolveVaultContents(profileId, orderId) {
  const claim = state.orderClaims.get(orderId);
  if (!claim || claim.profileId !== profileId) return null;
  const right = state.entitlements.find(
    (e) => e.orderRef === orderId && e.profileId === profileId && e.status === 'active'
  );
  if (!right) return null;

  if (right.kind === 'custom') {
    const pers = state.personalizados.get(orderId);
    if (!pers || pers.payment?.status !== 'approved' || !['pronto', 'entregue'].includes(pers.status)) {
      return null;
    }
    const files = (pers.vaultFiles || []).map((f, idx) => ({
      path: String(f.url || '').replace(/^\/?media\//, ''),
      label: f.title || `Arquivo ${idx + 1}`,
      video: f.type === 'video',
    }));
    return { title: right.title, right, files };
  }

  const order = state.orders.get(orderId);
  if (!order || !['paid', 'approved'].includes(order.status)) return null;
  const pack = (state.publishedContent.avulsos?.items || []).find(
    (p) => p.slug === order.packId || p.id === order.packId
  );
  const files = (pack?.exclusivePhotos || ['/media/private/teste/foto-01.png']).map((u, idx) => ({
    path: String(u).replace(/^\/?media\//, ''),
    label: `Foto ${idx + 1}`,
    video: false,
  }));
  return { title: pack?.title || right.title, right, files };
}

function approveOrderInternal(orderId) {
  // Pack order
  const order = state.orders.get(orderId);
  if (order) {
    order.status = 'paid';
    order.paidAt = new Date().toISOString();
    const profile = getOrCreateProfile(order.customerEmail, order.customerName);
    if (profile) {
      state.orderClaims.set(orderId, { orderRef: orderId, profileId: profile.id });
      const exists = state.entitlements.some((e) => e.orderRef === orderId && e.profileId === profile.id);
      if (!exists) {
        state.entitlements.push({
          profileId: profile.id,
          orderRef: orderId,
          kind: 'pack',
          resourceId: order.packId,
          title: order.itemTitle || order.packId,
          status: 'active',
          allowDownload: false,
        });
      }
      state.emails.push({
        to: profile.email,
        kind: 'vault_delivery',
        subject: 'Sua entrega está disponível',
        url: `http://127.0.0.1:${PORT}/cofre?order=${encodeURIComponent(orderId)}`,
        orderId,
      });
    }
    return { kind: 'pack', order };
  }

  // Personalizado
  const pers = state.personalizados.get(orderId);
  if (pers) {
    pers.payment.status = 'approved';
    pers.payment.paidAt = new Date().toISOString();
    if (pers.status === 'aguardando_pagamento') pers.status = 'em_producao';
    const profile = pers.clientContact?.includes('@') ? getOrCreateProfile(pers.clientContact, pers.clientName) : null;
    if (profile) {
      state.orderClaims.set(orderId, { orderRef: orderId, profileId: profile.id });
    }
    return { kind: 'custom', order: pers };
  }

  // Appointment
  const apt = state.appointments.get(orderId);
  if (apt) {
    apt.status = 'confirmada';
    apt.payment.status = 'approved';
    apt.payment.paidAt = new Date().toISOString();
    apt.meeting.visibleToClient = true;
    apt.meeting.url = 'https://meet.google.com/qa-nua-vip-room';
    const profile = apt.clientEmail ? getOrCreateProfile(apt.clientEmail, apt.clientName) : null;
    if (profile) {
      state.orderClaims.set(orderId, { orderRef: orderId, profileId: profile.id });
    }
    state.emails.push({
      to: apt.clientEmail,
      kind: 'appointment_confirmed',
      subject: 'Chamada VIP confirmada',
      orderId: apt.id,
    });
    return { kind: 'vip', order: apt };
  }
  return null;
}

function sanitizePublic(raw) {
  const copy = structuredClone(raw);
  copy.library = [];
  copy.albums = [];
  if (copy.avulsos?.items) {
    copy.avulsos.items = copy.avulsos.items
      .filter((i) => i && i.active !== false && !i.isDraft && i.modality !== 'avulso')
      .map((i) => ({ ...i, exclusivePhotos: [], videos: [] }));
  }
  return copy;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  const pathname = url.pathname;
  const method = (req.method || 'GET').toUpperCase();

  // QA control plane endpoints (local test only)
  if (pathname === '/__qa__/health') {
    return sendJson(res, 200, { ok: true, port: PORT, isolated: true });
  }
  if (pathname === '/__qa__/reset' && method === 'POST') {
    state = createInitialState();
    return sendJson(res, 200, { ok: true, reset: true });
  }
  if (pathname === '/__qa__/emails') {
    return sendJson(res, 200, { emails: state.emails });
  }
  if (pathname === '/__qa__/fault' && method === 'POST') {
    const body = await readJsonBody(req);
    if (body.clear) {
      state.faults = {};
    } else if (body.prefix) {
      if (body.status) state.faults[body.prefix] = body.status;
      else delete state.faults[body.prefix];
    }
    return sendJson(res, 200, { faults: state.faults });
  }
  if (pathname === '/__qa__/approve-payment' && method === 'POST') {
    const body = await readJsonBody(req);
    const out = approveOrderInternal(body.orderId);
    if (!out) return sendJson(res, 404, { success: false, error: 'Order not found' });
    return sendJson(res, 200, { success: true, ...out });
  }
  if (pathname === '/__qa__/state') {
    return sendJson(res, 200, {
      orders: [...state.orders.values()],
      appointments: [...state.appointments.values()],
      personalizados: [...state.personalizados.values()],
      profiles: [...state.profiles.values()],
      entitlements: state.entitlements,
      emailsCount: state.emails.length,
    });
  }

  // Simulated Fault Injection
  for (const [prefix, statusCode] of Object.entries(state.faults)) {
    if (pathname.startsWith(prefix)) {
      return sendJson(res, Number(statusCode), {
        success: false,
        error: 'Serviço temporariamente indisponível (falha controlada QA).',
      });
    }
  }

  // ---- API ROUTES ----
  if (pathname.startsWith('/api/')) {
    // Auth Admin
    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await readJsonBody(req);
      if (body.password !== ADMIN_PASS) {
        return sendJson(res, 401, { success: false, error: 'Senha incorreta.' });
      }
      const token = `adm_${crypto.randomUUID()}`;
      state.adminSessions.set(token, { role: 'admin', revoked: false });
      return sendJson(
        res,
        200,
        { success: true, role: 'admin', message: 'Entrada realizada com sucesso.' },
        { 'Set-Cookie': `nua_admin_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400` }
      );
    }
    if (pathname === '/api/auth/session' && method === 'GET') {
      const adm = getAdminFromRequest(req);
      if (!adm) return sendJson(res, 401, { authenticated: false });
      return sendJson(res, 200, { authenticated: true, role: adm.role });
    }
    if (pathname === '/api/auth/logout' && method === 'POST') {
      const cookies = parseCookies(req);
      if (cookies.nua_admin_session && state.adminSessions.has(cookies.nua_admin_session)) {
        state.adminSessions.get(cookies.nua_admin_session).revoked = true;
      }
      return sendJson(
        res,
        200,
        { success: true },
        { 'Set-Cookie': 'nua_admin_session=; Path=/; HttpOnly; Max-Age=0' }
      );
    }

    // Content Sync
    if (pathname === '/api/content/sync') {
      if (method === 'GET') {
        const mode = url.searchParams.get('mode');
        if (mode === 'admin') {
          if (!getAdminFromRequest(req)) {
            return sendJson(res, 401, { error: 'Autenticação administrativa necessária.' });
          }
          return sendJson(res, 200, {
            success: true,
            content: state.privateContent,
            publishedContent: state.publishedContent,
            hasUnpublishedChanges: JSON.stringify(state.privateContent) !== JSON.stringify(state.publishedContent),
          });
        }
        return sendJson(res, 200, {
          success: true,
          content: sanitizePublic(state.publishedContent),
        });
      }
      if (method === 'POST') {
        if (!getAdminFromRequest(req)) {
          return sendJson(res, 401, { error: 'Não autorizado.' });
        }
        const body = await readJsonBody(req);
        if (body.content) {
          state.privateContent = structuredClone(body.content);
        }
        if (body.publish === true || body.action === 'publish') {
          state.publishedContent = structuredClone(state.privateContent);
        }
        return sendJson(res, 200, {
          success: true,
          published: Boolean(body.publish === true || body.action === 'publish'),
          content: state.privateContent,
        });
      }
    }

    // NUA ID Auth
    if (pathname === '/api/id/request-code' && method === 'POST') {
      const body = await readJsonBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      if (!email.includes('@')) return sendJson(res, 400, { success: false, error: 'E-mail inválido.' });
      const code = '482910';
      state.otpChallenges.set(email, { code, expiresAt: Date.now() + 600_000 });
      state.emails.push({ to: email, kind: 'access_code', subject: 'Seu código de acesso', code });
      return sendJson(res, 200, { success: true, expiresInMinutes: 10, message: 'Código enviado.' });
    }
    if (pathname === '/api/id/verify-code' && method === 'POST') {
      const body = await readJsonBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const ch = state.otpChallenges.get(email);
      if (!ch || ch.code !== String(body.code || '').trim()) {
        return sendJson(res, 401, { success: false, error: 'Código inválido.' });
      }
      state.otpChallenges.delete(email);
      const profile = getOrCreateProfile(email, body.displayName);
      const sid = `sid_${crypto.randomUUID()}`;
      state.customerSessions.set(sid, { id: sid, profileId: profile.id, deviceLabel: 'Chromium QA', revoked: false });
      return sendJson(
        res,
        200,
        { success: true, authenticated: true, profile },
        {
          'Set-Cookie': [
            `nua_id_session=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
            `nua_id_hint=1; Path=/; SameSite=Lax; Max-Age=2592000`,
          ],
        }
      );
    }
    if (pathname === '/api/id/session' && method === 'GET') {
      const ctx = getCustomerFromRequest(req);
      if (!ctx) return sendJson(res, 200, { authenticated: false, profile: null });
      return sendJson(res, 200, { authenticated: true, profile: ctx.profile });
    }
    if (pathname === '/api/id/logout' && method === 'POST') {
      const cookies = parseCookies(req);
      if (cookies.nua_id_session && state.customerSessions.has(cookies.nua_id_session)) {
        state.customerSessions.get(cookies.nua_id_session).revoked = true;
      }
      return sendJson(
        res,
        200,
        { success: true },
        {
          'Set-Cookie': [
            'nua_id_session=; Path=/; HttpOnly; Max-Age=0',
            'nua_id_hint=; Path=/; Max-Age=0',
          ],
        }
      );
    }

    // Payments
    if (pathname === '/api/payments/create-pix' && (method === 'GET' || method === 'POST')) {
      const body = method === 'POST' ? await readJsonBody(req) : {};
      const slug = String(url.searchParams.get('slug') || body.slug || body.productId || '').trim().toLowerCase();
      const pack = (state.publishedContent.avulsos?.items || []).find(
        (i) => (i.slug || '').toLowerCase() === slug || (i.id || '').toLowerCase() === slug
      );
      if (method === 'GET') {
        return sendJson(res, 200, { available: Boolean(pack && pack.active !== false && pack.isDraft !== true) });
      }
      if (!pack || pack.active === false || pack.isDraft === true) {
        return sendJson(res, 404, { error: 'Conteúdo não encontrado ou indisponível.' });
      }
      const customer = getCustomerFromRequest(req);
      const email = customer?.profile.email || String(body.payerEmail || '').trim().toLowerCase();
      if (!email || !email.includes('@')) {
        return sendJson(res, 400, { error: 'Informe um e-mail válido.' });
      }
      const orderId = `ord_qa_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const purchaseToken = `tok_qa_${crypto.randomBytes(12).toString('hex')}`;
      const price = Number(pack.numericPrice) || 99;
      const qrCode = `00020126580014br.gov.bcb.pix0136qa-${orderId}53039865405${price.toFixed(2)}5802BR6304QA99`;
      const order = {
        id: orderId,
        orderId,
        purchaseToken,
        packId: pack.slug,
        itemSlug: pack.slug,
        itemTitle: pack.title,
        amount: price,
        status: 'pending',
        customerEmail: email,
        customerName: body.payerName || 'Cliente QA',
        paymentId: String(99000000 + state.orders.size + 1),
        qrCode,
        qrCodeBase64: `data:image/png;base64,${TINY_PNG.toString('base64')}`,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 20 * 60_000).toISOString(),
      };
      state.orders.set(orderId, order);
      if (customer) {
        state.orderClaims.set(orderId, { orderRef: orderId, profileId: customer.profile.id });
      }
      return sendJson(res, 201, { success: true, ...order, qrCodeUrl: order.qrCodeBase64 });
    }
    if (pathname === '/api/payments/status') {
      const orderId = url.searchParams.get('orderId') || url.searchParams.get('id') || (method === 'POST' ? (await readJsonBody(req)).orderId : '');
      const order = state.orders.get(orderId);
      if (!order) return sendJson(res, 404, { success: false, error: 'Pedido não encontrado.' });
      const paid = order.status === 'paid' || order.status === 'approved';
      return sendJson(res, 200, {
        success: true,
        paid,
        status: paid ? 'approved' : order.status,
        order: { orderId: order.id, itemSlug: order.packId, amount: order.amount, status: paid ? 'approved' : order.status },
      });
    }
    if (pathname === '/api/payments/simulate-approve' && method === 'POST') {
      const body = await readJsonBody(req);
      const out = approveOrderInternal(body.orderId);
      if (!out) return sendJson(res, 404, { success: false, error: 'Pedido não encontrado.' });
      return sendJson(res, 200, {
        success: true,
        paid: true,
        status: 'approved',
        orderId: body.orderId,
        accessUrl: `/cofre?order=${encodeURIComponent(body.orderId)}`,
      });
    }

    // Cofre Digital (multi-browser trust!)
    if (pathname === '/api/me/cofre' && method === 'POST') {
      const body = await readJsonBody(req);
      const cookies = parseCookies(req);
      const { action, token } = body;
      let orderId = body.order;

      if (action === 'close') {
        if (cookies.nua_vault_visit) state.vaultVisits.delete(sha256(cookies.nua_vault_visit));
        return sendJson(res, 200, { state: 'idle' });
      }

      const account = getCustomerFromRequest(req);
      if (action === 'activity') {
        const vHash = cookies.nua_vault_visit ? sha256(cookies.nua_vault_visit) : '';
        const visit = vHash ? state.vaultVisits.get(vHash) : null;
        return sendJson(res, 200, { state: visit && visit.order === orderId ? 'ready' : 'idle' });
      }
      if (action === 'resume') {
        const vHash = cookies.nua_vault_visit ? sha256(cookies.nua_vault_visit) : '';
        const visit = vHash ? state.vaultVisits.get(vHash) : null;
        if (!visit || !account) return sendJson(res, 200, { state: 'missing' });
        orderId = visit.order;
      }

      const claim = state.orderClaims.get(orderId);
      const owner = claim ? [...state.profiles.values()].find((p) => p.id === claim.profileId) : null;
      const contents = owner ? resolveVaultContents(owner.id, orderId) : null;
      if (!owner || !contents) {
        return sendJson(res, 200, { state: action === 'request' ? 'sent' : 'confirm' });
      }

      let device = null;
      if (account?.profile.id === owner.id && cookies.nua_vault_browser) {
        const dKey = `${owner.id}:${sha256(cookies.nua_vault_browser)}`;
        const d = state.vaultDevices.get(dKey);
        if (d && d.expires > Date.now()) device = d;
      }

      const setCookies = [];
      let sessionId = account?.session.id;

      if (action === 'request') {
        const proof = crypto.randomUUID();
        const browser = crypto.randomUUID();
        state.vaultChallenges.set(sha256(proof), {
          profile: owner.id,
          order: orderId,
          email: owner.email,
          browserHash: sha256(browser),
          expires: Date.now() + 600_000,
        });
        const confirmUrl = `http://127.0.0.1:${PORT}/cofre#order=${encodeURIComponent(orderId)}&confirm=${encodeURIComponent(proof)}`;
        state.emails.push({
          to: owner.email,
          kind: 'vault_browser_confirmation',
          subject: 'Confirme este navegador — Cofre Nua Borges',
          confirmUrl,
          token: proof,
          orderId,
        });
        setCookies.push(`nua_vault_pending=${browser}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);
        return sendJson(res, 200, { state: 'sent' }, { 'Set-Cookie': setCookies });
      }

      if (action === 'confirm') {
        const ch = token ? state.vaultChallenges.get(sha256(token)) : null;
        if (!ch || ch.expires <= Date.now() || ch.profile !== owner.id || ch.order !== orderId) {
          return sendJson(res, 403, { state: 'expired' });
        }
        if (!cookies.nua_vault_pending || sha256(cookies.nua_vault_pending) !== ch.browserHash) {
          return sendJson(res, 403, { state: 'wrongBrowser' });
        }
        state.vaultChallenges.delete(sha256(token));
        if (account?.profile.id !== owner.id) {
          sessionId = `sid_${crypto.randomUUID()}`;
          state.customerSessions.set(sessionId, { id: sessionId, profileId: owner.id, deviceLabel: 'Chromium QA', revoked: false });
          setCookies.push(`nua_id_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
          setCookies.push(`nua_id_hint=1; Path=/; SameSite=Lax; Max-Age=2592000`);
        }
        const rawBrowser = crypto.randomUUID();
        const devHash = sha256(rawBrowser);
        device = { id: devHash, label: 'Chromium QA', expires: Date.now() + 7 * 86400 * 1000 };
        state.vaultDevices.set(`${owner.id}:${devHash}`, device);
        setCookies.push(`nua_vault_browser=${rawBrowser}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
        setCookies.push(`nua_vault_pending=; Path=/; HttpOnly; Max-Age=0`);
      }

      if (!device || !sessionId) {
        return sendJson(res, 200, { state: 'confirm' });
      }

      if (action !== 'resume') {
        const visitToken = crypto.randomUUID();
        state.vaultVisits.set(sha256(visitToken), {
          order: orderId,
          device: device.id,
          accountSession: sessionId,
          seen: Date.now(),
        });
        setCookies.push(`nua_vault_visit=${visitToken}; Path=/; HttpOnly; SameSite=Lax`);
      }

      const files = contents.files.map((f) => ({
        label: f.label,
        video: f.video,
        url: `/media/${f.path}?cofre=1`,
        download: contents.right.allowDownload ? `/media/${f.path}?cofre=1&dl=1` : undefined,
      }));
      return sendJson(
        res,
        200,
        { state: 'ready', files, order: orderId, title: contents.title },
        setCookies.length ? { 'Set-Cookie': setCookies } : {}
      );
    }

    // Customer Portal endpoints (/api/me/*)
    if (pathname === '/api/me/overview' && method === 'GET') {
      const ctx = getCustomerFromRequest(req);
      if (!ctx) return sendJson(res, 401, { error: 'Não autenticado.' });
      const pid = ctx.profile.id;
      const myOrders = [...state.orders.values()]
        .filter((order) => state.orderClaims.get(order.id)?.profileId === pid)
        .map((order) => ({
          id: order.id, kind: 'pack', kindLabel: 'Conteúdo avulso', title: order.itemTitle || order.slug,
          amount: order.amount, createdAt: order.createdAt, paidAt: order.paidAt || null,
          financialStatus: order.status, financialLabel: order.status === 'paid' ? 'Pago' : 'Pagamento pendente',
          operationalStatus: order.status === 'paid' ? 'available' : 'pending',
          operationalLabel: order.status === 'paid' ? 'Disponível' : 'Pendente',
          paymentMethod: 'pix', refunds: [],
        }));
      const myApts = [...state.appointments.values()].filter((a) => state.orderClaims.get(a.id)?.profileId === pid);
      const myPers = [...state.personalizados.values()].filter((p) => state.orderClaims.get(p.id)?.profileId === pid);
      const myLibs = state.entitlements.filter((e) => e.profileId === pid && e.status === 'active');
      const library = myLibs.map((item) => ({
        ...item,
        entitlementId: item.orderRef,
        purchasedAt: state.orders.get(item.orderRef)?.paidAt,
        watchUrl: `/cofre?order=${encodeURIComponent(item.orderRef)}`,
      }));
      return sendJson(res, 200, {
        success: true,
        profile: ctx.profile,
        ...(url.searchParams.get('full') === '1' ? { library, orders: myOrders, appointments: myApts, personalizados: myPers } : {}),
        summary: {
          notices: [],
          counts: { libraryActive: library.length, totalOrders: myOrders.length, appointmentsUpcoming: myApts.length },
        },
        counts: { library: library.length, orders: myOrders.length, appointments: myApts.length, personalizados: myPers.length },
      });
    }
    if (pathname === '/api/me/library' && method === 'GET') {
      const ctx = getCustomerFromRequest(req);
      if (!ctx) return sendJson(res, 401, { error: 'Não autenticado.' });
      const items = state.entitlements.filter((e) => e.profileId === ctx.profile.id && e.status === 'active');
      return sendJson(res, 200, { success: true, items });
    }
    if (pathname === '/api/me/orders' && method === 'GET') {
      const ctx = getCustomerFromRequest(req);
      if (!ctx) return sendJson(res, 401, { error: 'Não autenticado.' });
      const items = [...state.orders.values()].filter((o) => state.orderClaims.get(o.id)?.profileId === ctx.profile.id);
      return sendJson(res, 200, { success: true, items });
    }

    // Personalizados
    if (pathname === '/api/personalizados/create' && method === 'POST') {
      const body = await readJsonBody(req);
      const s = state.personalizadosSettings;
      const photoCount = Number(body.photoCount || 0);
      const vid = s.videoOptions.find((v) => v.id === (body.videoOptionId || 'vid_none')) || s.videoOptions[0];
      const total =
        (photoCount > 0 ? s.basePhotoPrice + Math.max(0, photoCount - 1) * s.pricePerPhoto : 0) +
        (vid?.price || 0) +
        (body.mentionName ? s.mentionNameFee : 0) +
        (body.express24h ? s.expressFee : 0);
      if (!body.clientName || !body.clientContact || total <= 0) {
        return sendJson(res, 400, { success: false, error: 'Dados incompletos.' });
      }
      const id = `ped_qa_${Date.now()}`;
      const publicToken = `tok_ped_${crypto.randomBytes(12).toString('hex')}`;
      const order = {
        id,
        publicToken,
        clientName: body.clientName,
        clientContact: body.clientContact,
        deliveryChannel: body.deliveryChannel || 'vault',
        photoCount,
        videoDurationMinutes: vid?.durationMinutes || 0,
        mentionName: Boolean(body.mentionName),
        express24h: Boolean(body.express24h),
        briefing: body.briefing || '',
        totalPrice: total,
        status: 'aguardando_pagamento',
        payment: {
          status: 'pending',
          method: 'pix',
          amount: total,
          pixPayload: `00020126580014br.gov.bcb.pix0136qa-${id}`,
          pixQrCode: `data:image/png;base64,${TINY_PNG.toString('base64')}`,
        },
        vaultFiles: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.personalizados.set(id, order);
      return sendJson(res, 201, { success: true, order });
    }
    if (pathname === '/api/personalizados/status') {
      const token = url.searchParams.get('token') || url.searchParams.get('id') || '';
      const order = [...state.personalizados.values()].find((p) => p.publicToken === token || p.id === token);
      if (!order) return sendJson(res, 404, { success: false, error: 'Encomenda não encontrada.' });
      return sendJson(res, 200, { success: true, order });
    }
    if (pathname === '/api/personalizados/admin') {
      if (method === 'GET') {
        return sendJson(res, 200, {
          success: true,
          settings: state.personalizadosSettings,
          orders: [...state.personalizados.values()],
        });
      }
      if (method === 'POST') {
        if (!getAdminFromRequest(req)) return sendJson(res, 401, { error: 'Não autorizado.' });
        const body = await readJsonBody(req);
        if (body.action === 'update_order') {
          const order = state.personalizados.get(body.orderId);
          if (!order) return sendJson(res, 404, { success: false, error: 'Pedido não encontrado.' });
          Object.assign(order, body.patch, { updatedAt: new Date().toISOString() });
          if (order.payment?.status === 'approved' && ['pronto', 'entregue'].includes(order.status) && order.vaultFiles?.length) {
            const profile = order.clientContact?.includes('@') ? getOrCreateProfile(order.clientContact, order.clientName) : null;
            if (profile) {
              state.orderClaims.set(order.id, { orderRef: order.id, profileId: profile.id });
              state.entitlements.push({
                profileId: profile.id,
                orderRef: order.id,
                kind: 'custom',
                resourceId: order.id,
                title: `Personalizado (${order.photoCount} fotos)`,
                status: 'active',
                allowDownload: true,
              });
              state.emails.push({
                to: profile.email,
                kind: 'vault_delivery',
                subject: 'Sua entrega está disponível',
                url: `http://127.0.0.1:${PORT}/cofre?order=${encodeURIComponent(order.id)}`,
                orderId: order.id,
              });
            }
          }
          return sendJson(res, 200, { success: true, order });
        }
      }
    }

    // Chamadas VIP
    if (pathname === '/api/appointments/availability' && method === 'GET') {
      const date = url.searchParams.get('date');
      const month = url.searchParams.get('month');
      const modalityId = url.searchParams.get('modalityId');
      if (month && modalityId) {
        const [y, m] = month.split('-').map(Number);
        const days = {};
        const totalDays = new Date(Date.UTC(y, m, 0)).getUTCDate();
        let firstAvailableDate = null;
        for (let d = 1; d <= totalDays; d++) {
          const ds = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          days[ds] = { available: true, count: 4 };
          if (!firstAvailableDate) firstAvailableDate = ds;
        }
        return sendJson(res, 200, { success: true, month, modalityId, timezone: 'Europe/Dublin', days, firstAvailableDate });
      }
      if (date && modalityId) {
        const occupied = new Set(
          [...state.appointments.values()]
            .filter((a) => a.date === date && ['confirmada', 'aguardando_pagamento'].includes(a.status))
            .map((a) => a.startTime)
        );
        const slots = ['14:00', '15:00', '16:00', '17:00'].filter((s) => !occupied.has(s));
        return sendJson(res, 200, { success: true, date, modalityId, slots, timezone: 'Europe/Dublin' });
      }
      return sendJson(res, 200, {
        success: true,
        modalities: state.modalities,
        settings: state.appointmentsSettings,
      });
    }
    if (pathname === '/api/appointments/book' && method === 'POST') {
      const body = await readJsonBody(req);
      const modality = state.modalities.find((m) => m.id === body.modalityId);
      if (!modality) return sendJson(res, 404, { success: false, error: 'Modalidade não encontrada.' });
      const conflict = [...state.appointments.values()].some(
        (a) =>
          a.date === body.date &&
          a.startTime === body.startTime &&
          ['confirmada', 'aguardando_pagamento'].includes(a.status)
      );
      if (conflict) {
        return sendJson(res, 409, { success: false, error: 'Este horário acabou de ser reservado.' });
      }
      const id = `book_qa_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const publicToken = `tok_apt_${crypto.randomBytes(12).toString('hex')}`;
      const booking = {
        id,
        publicToken,
        modalityId: modality.id,
        modalityName: modality.name,
        durationMinutes: modality.durationMinutes,
        price: modality.price,
        date: body.date,
        startTime: body.startTime,
        endTime: body.startTime,
        timezone: 'Europe/Dublin',
        clientTimezone: 'America/Sao_Paulo',
        clientName: body.clientName || 'Cliente QA',
        clientEmail: String(body.clientEmail || '').trim().toLowerCase(),
        clientPhone: body.clientPhone || '+5511999999999',
        status: 'aguardando_pagamento',
        payment: {
          status: 'pending',
          method: 'pix',
          amount: modality.price,
          pixPayload: `00020126580014br.gov.bcb.pix0136qa-${id}`,
          pixQrCode: `data:image/png;base64,${TINY_PNG.toString('base64')}`,
        },
        meeting: { platform: 'google_meet', visibleToClient: false },
        expiresAt: new Date(Date.now() + 20 * 60_000).toISOString(),
        createdAt: new Date().toISOString(),
      };
      state.appointments.set(id, booking);
      return sendJson(res, 201, { success: true, booking });
    }
    if (pathname === '/api/appointments/lookup' || pathname === '/api/appointments/pix') {
      const body = method === 'POST' ? await readJsonBody(req) : {};
      const tok = url.searchParams.get('token') || body.publicToken || body.token || '';
      const apt = [...state.appointments.values()].find((a) => a.publicToken === tok || a.id === tok);
      if (!apt) return sendJson(res, 404, { success: false, error: 'Reserva não encontrada.' });
      return sendJson(res, 200, {
        success: true,
        paid: apt.payment.status === 'approved',
        booking: apt,
      });
    }

    // Admin Customers (Central de Clientes)
    if (pathname === '/api/admin/customers' && method === 'GET') {
      if (!getAdminFromRequest(req)) return sendJson(res, 401, { error: 'Não autorizado.' });
      const customers = [...state.profiles.values()].map((p) => {
        const packs = [...state.orders.values()].filter((o) => o.customerEmail === p.email);
        const apts = [...state.appointments.values()].filter((a) => a.clientEmail === p.email);
        const pers = [...state.personalizados.values()].filter((o) => o.clientContact === p.email);
        return {
          id: p.id,
          email: p.email,
          displayName: p.displayName,
          status: p.status,
          hasAccount: true,
          counts: {
            packs: packs.length,
            appointments: apts.length,
            personalizados: pers.length,
            totalOrders: packs.length + apts.length + pers.length,
          },
          orders: [
            ...packs.map((o) => ({ id: o.id, kind: 'pack', title: o.itemTitle, amount: o.amount, status: o.status })),
            ...apts.map((a) => ({ id: a.id, kind: 'vip', title: a.modalityName, amount: a.price, status: a.status })),
            ...pers.map((o) => ({ id: o.id, kind: 'custom', title: `Personalizado (${o.photoCount} fotos)`, amount: o.totalPrice, status: o.status })),
          ],
        };
      });
      return sendJson(res, 200, { success: true, customers, total: customers.length });
    }

    // Auxiliary non-blocking endpoints
    if (pathname === '/api/admin/orders-feed') {
      if (!getAdminFromRequest(req)) return sendJson(res, 401, { error: 'Não autorizado.' });
      return sendJson(res, 200, { success: true, feed: [] });
    }
    if (pathname === '/api/admin/finance-dashboard') {
      if (!getAdminFromRequest(req)) return sendJson(res, 401, { error: 'Não autorizado.' });
      return sendJson(res, 200, { success: true, summary: { totalGross: 0, totalNet: 0, count: 0 }, transactions: [] });
    }
    if (pathname === '/api/music/list') return sendJson(res, 200, { success: true, tracks: [] });
    if (pathname === '/api/music/config') return sendJson(res, 200, { success: true, enabled: false });
    if (pathname === '/api/media/list') return sendJson(res, 200, { success: true, items: [] });
    if (pathname === '/api/telemetry/track') {
      res.writeHead(204);
      return res.end();
    }
    if (pathname === '/api/contact' && method === 'POST') {
      const body = await readJsonBody(req);
      if (!body.email || !body.message) return sendJson(res, 400, { error: 'Campos obrigatórios.' });
      state.emails.push({ to: 'contato@nuaborges.com.br', kind: 'contact', subject: body.subject || 'Contato', from: body.email });
      return sendJson(res, 200, { success: true });
    }

    return sendJson(res, 404, { success: false, error: 'Endpoint QA não mapeado.' });
  }

  // ---- MEDIA PROXY (Enforces Private Vault Authorization!) ----
  if (pathname.startsWith('/media/')) {
    const subpath = pathname.replace(/^\/media\//, '');
    if (subpath.includes('..')) {
      res.writeHead(400);
      return res.end('Invalid path');
    }
    const isPrivate = subpath.startsWith('private/') || subpath.includes('/private/');
    if (isPrivate) {
      const cookies = parseCookies(req);
      const account = getCustomerFromRequest(req);
      const vHash = cookies.nua_vault_visit ? sha256(cookies.nua_vault_visit) : '';
      const visit = vHash ? state.vaultVisits.get(vHash) : null;
      const dKey = account && cookies.nua_vault_browser ? `${account.profile.id}:${sha256(cookies.nua_vault_browser)}` : '';
      const dev = dKey ? state.vaultDevices.get(dKey) : null;
      const contents = account && visit && dev && dev.id === visit.device ? resolveVaultContents(account.profile.id, visit.order) : null;
      const authorized = Boolean(contents && contents.files.some((f) => f.path === subpath));
      if (!authorized) {
        return sendJson(res, 403, { error: 'Acesso negado à mídia privada.' });
      }
    }
    res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': isPrivate ? 'private, no-store' : 'public, max-age=60' });
    return res.end(TINY_PNG);
  }

  if (/^\/assistir\/[^/.]+\/?$/.test(pathname)) {
    res.writeHead(302, { Location: '/conta?tab=biblioteca' });
    return res.end();
  }

  // ---- STATIC NEXT.JS EXPORT (`out/`) ----
  const cleanPath = decodeURIComponent(pathname).replace(/\/+$/, '') || '/index';
  const candidates = [
    path.join(OUT_DIR, cleanPath),
    path.join(OUT_DIR, `${cleanPath}.html`),
    path.join(OUT_DIR, cleanPath, 'index.html'),
  ];
  // Fallback for dynamic /assistir/:slug, /avulsos/:slug, /avaliacao/:codigo or /admin/:module
  if (/^\/conta\/(?:biblioteca|personalizados|chamadas|pedidos|perfil)(?:\/|$)/.test(pathname) && !path.extname(pathname)) {
    candidates.push(path.join(OUT_DIR, 'conta.html'));
  }
  if (pathname.startsWith('/admin/')) {
    candidates.push(path.join(OUT_DIR, 'admin.html'));
  }
  if (/^\/avulsos\/[^/]+\/?$/.test(pathname)) {
    candidates.push(
      path.join(OUT_DIR, 'avulsos', '__catalogo-em-atualizacao.html'),
      path.join(OUT_DIR, 'avulsos', '__catalogo-em-atualizacao', 'index.html')
    );
  }
  if (/^\/avaliacao\/[^/]+\/?$/.test(pathname)) {
    candidates.push(
      path.join(OUT_DIR, 'avaliacao', '_.html'),
      path.join(OUT_DIR, 'avaliacao', '_', 'index.html')
    );
  }

  for (const file of candidates) {
    if (file.startsWith(OUT_DIR) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      return fs.createReadStream(file).pipe(res);
    }
  }

  const notFound = path.join(OUT_DIR, '404.html');
  if (fs.existsSync(notFound)) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(notFound).pipe(res);
  }
  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[QA E2E Server] Isolated server ready on http://127.0.0.1:${PORT} (serving out/)`);
});
