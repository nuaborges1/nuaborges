/**
 * Local Dev Bridge para NUA ID (/api/id/*, /api/me/*, /api/admin/customers)
 *
 * Espelha integralmente as Pages Functions oficiais (mesmos prefixos `nua_id:*` no Supabase,
 * mesmo formato HMAC de cookie HttpOnly, mesmo assinador de mídia de TTL curto e mesma
 * sanitização do módulo Admin › Clientes) para funcionar nativamente com `npm run dev`.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import tls from 'node:tls';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const LOCAL_DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');

function readLocalJson(filename, fallback) {
  try {
    const p = path.join(LOCAL_DATA_DIR, filename);
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  } catch {}
  return fallback;
}

function writeLocalJson(filename, data) {
  try {
    const p = path.join(LOCAL_DATA_DIR, filename);
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  } catch {}
}

const DEV_COOKIE = 'nua_id_session';
const PROD_COOKIE = '__Host-nua_id_session';
const SESSION_TTL_SEC = 60 * 60 * 24 * 30;
const OTP_TTL_MIN = 10;
const OTP_MAX_ATTEMPTS = 5;

function normEmail(e) {
  return String(e || '').trim().toLowerCase();
}

function isValidEmail(e) {
  const c = normEmail(e);
  return c.length >= 5 && c.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function timingSafeStr(a, b) {
  const ab = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function hmacSign(value, secret) {
  return b64url(crypto.createHmac('sha256', secret).update(value).digest());
}

function sha256Hex(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function genOtp() {
  return String(100000 + crypto.randomInt(0, 900000));
}

function genSessionId() {
  return `sess_${crypto.randomBytes(16).toString('hex')}`;
}

function getSecret(env) {
  return (env.NUA_ID_SECRET || env.ADMIN_API_SECRET || 'local-dev-nua-id-secret').trim();
}

function getSb(env) {
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function kvGet(sb, key) {
  if (!sb) return null;
  const { data, error } = await sb.from('site_content').select('content').eq('key', key).maybeSingle();
  return error || !data ? null : data.content;
}

async function kvSet(sb, key, value) {
  if (!sb) return false;
  const { error } = await sb.from('site_content').upsert({
    key,
    content: value,
    version: 1,
    updated_at: new Date().toISOString(),
    updated_by: 'NUA_ID',
  });
  return !error;
}

async function kvDel(sb, key) {
  if (!sb) return false;
  const { error } = await sb.from('site_content').delete().eq('key', key);
  return !error;
}

async function kvListPrefix(sb, prefix) {
  if (!sb) return [];
  const { data, error } = await sb.from('site_content').select('key, content').like('key', `${prefix}%`).limit(500);
  if (error || !data) return [];
  return data.map((r) => ({ key: r.key, value: r.content }));
}

async function sendSmtpLocal(env, { to, subject, html }) {
  const host = env.SMTP_SERVER || 'smtp.hostinger.com';
  const port = Number(env.SMTP_PORT || 465);
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS;
  if (!user || !pass) return false;

  return new Promise((resolve) => {
    const socket = tls.connect({ host, port }, () => {
      let step = 0;
      const send = (cmd) => socket.write(cmd + '\r\n');
      socket.on('data', (chunk) => {
        const msg = chunk.toString();
        const code = msg.slice(0, 3);
        if (step === 0 && code === '220') {
          step = 1;
          send('EHLO nuaborges.com.br');
        } else if (step === 1 && (code === '250' || msg.includes('250 '))) {
          step = 2;
          send(`AUTH PLAIN ${Buffer.from(`\0${user}\0${pass}`).toString('base64')}`);
        } else if (step === 2 && code === '235') {
          step = 3;
          send(`MAIL FROM:<${user}>`);
        } else if (step === 3 && code === '250') {
          step = 4;
          send(`RCPT TO:<${to}>`);
        } else if (step === 4 && code === '250') {
          step = 5;
          send('DATA');
        } else if (step === 5 && code === '354') {
          step = 6;
          const mime = [
            `From: Nua Borges <${user}>`,
            `To: <${to}>`,
            `Subject: =?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            '',
            html,
            '.',
          ].join('\r\n');
          send(mime);
        } else if (step === 6 && code === '250') {
          step = 7;
          send('QUIT');
          socket.end();
          resolve(true);
        } else if (code.startsWith('4') || code.startsWith('5')) {
          socket.destroy();
          resolve(false);
        }
      });
    });
    socket.on('error', () => resolve(false));
    socket.setTimeout(10000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function parseSessionCookie(req, secret) {
  const raw = req.headers.cookie || '';
  let token = null;
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if ((k === PROD_COOKIE || k === DEV_COOKIE) && v) {
      token = decodeURIComponent(v);
      if (k === PROD_COOKIE) break;
    }
  }
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [sid, sig] = parts;
  if (!timingSafeStr(sig, hmacSign(sid, secret))) return null;
  return sid;
}

async function resolveSession(req, sb, secret) {
  const sid = parseSessionCookie(req, secret);
  if (!sid) return null;
  const session = await kvGet(sb, `nua_id:session:${sid}`);
  if (!session || session.isRevoked || new Date(session.expiresAt).getTime() <= Date.now()) return null;
  const profile = await kvGet(sb, `nua_id:profile:${session.profileId}`);
  if (!profile || profile.status !== 'active') return null;
  return { session, profile };
}

function normalizeFin(raw) {
  const s = String(raw || '').toLowerCase();
  if (['paid', 'approved', 'pago', 'manual_confirmed'].includes(s)) return { status: 'paid', label: 'Pago' };
  if (['refunded', 'reembolsado'].includes(s)) return { status: 'refunded', label: 'Reembolsado' };
  if (['charged_back', 'contestado'].includes(s)) return { status: 'charged_back', label: 'Contestado' };
  if (['cancelled', 'cancelado', 'cancelada'].includes(s)) return { status: 'cancelled', label: 'Cancelado' };
  if (['rejected', 'failed', 'falhou'].includes(s)) return { status: 'failed', label: 'Falhou' };
  return { status: 'pending', label: 'Pendente' };
}

function formatBr(iso) {
  if (!iso) return { dateBr: '—', timeBr: '—' };
  try {
    const d = new Date(iso);
    return {
      dateBr: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(d),
      timeBr: new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(d),
    };
  } catch {
    return { dateBr: '—', timeBr: '—' };
  }
}

async function loadBundle(sb, profileId) {
  const [entitlements, claimedRefs, remotePubContent] = await Promise.all([
    kvGet(sb, `nua_id:entitlements:${profileId}`).then((v) => v || []),
    kvGet(sb, `nua_id:profile_orders:${profileId}`).then((v) => v || []),
    kvGet(sb, 'published_content'),
  ]);

  const localPubContent = readLocalJson('published_content.json', null);
  const localOrders = readLocalJson('local_orders.json', {});
  const localPersonalizados = readLocalJson('local_personalizados.json', {});
  const localAppointments = readLocalJson('local_appointments.json', {});

  const catIdx = new Map();
  for (const src of [remotePubContent, localPubContent]) {
    const prods = src?.avulsos?.items || src?.packs || [];
    for (const it of Array.isArray(prods) ? prods : []) {
      if (it?.slug) catIdx.set(String(it.slug).toLowerCase(), it);
      if (it?.id) catIdx.set(String(it.id).toLowerCase(), it);
      if (it?.id) catIdx.set(String(it.id).replace(/^avulso-/, '').toLowerCase(), it);
    }
  }

  const nowMs = Date.now();
  // Biblioteca exibe exclusivamente Conteúdos & Packs (Personalizados vão para a aba Personalizados!)
  const library = entitlements
    .filter((e) => {
      if (e.kind === 'custom' || e.kind === 'vip') return false;
      const ref = String(e.orderRef || '').toLowerCase();
      if (ref.startsWith('ped_') || ref.startsWith('pers_') || ref.startsWith('book_') || ref.startsWith('apt_')) return false;
      return true;
    })
    .map((e) => {
      const cat = catIdx.get(String(e.resourceId || '').toLowerCase());
      const status = e.revokedAt ? 'revoked' : e.expiresAt && new Date(e.expiresAt).getTime() <= nowMs ? 'expired' : 'active';
      const mediaPaths = [];
      if (status === 'active' && cat) {
        const photos = cat.exclusivePhotos || cat.previewImages || [];
        for (let i = 0; i < (Array.isArray(photos) ? photos.length : 0); i++) {
          const p = photos[i];
          const pUrl = typeof p === 'string' ? p : p?.url || p?.path || '';
          if (pUrl) mediaPaths.push({ id: `photo_${i + 1}`, label: `Foto ${i + 1}`, path: pUrl, type: 'photo' });
        }
        const videos = cat.videos || [];
        for (let i = 0; i < (Array.isArray(videos) ? videos.length : 0); i++) {
          const v = videos[i];
          const vUrl = typeof v === 'string' ? v : v?.url || v?.path || '';
          if (vUrl) mediaPaths.push({ id: v?.id || `video_${i + 1}`, label: v?.title || `Vídeo ${i + 1}`, path: vUrl, type: 'video' });
        }
      }
      return {
        entitlementId: e.id,
        orderRef: e.orderRef,
        resourceId: cat?.slug || e.resourceId,
        kind: e.kind,
        title: cat?.title || e.title || e.resourceId,
        coverUrl: cat?.imageUrl || cat?.coverImage || cat?.thumbnail || null,
        purchasedAt: e.grantedAt,
        expiresAt: e.expiresAt || null,
        status,
        revokeReason: e.revokeReason || null,
        allowDownload: status === 'active' && e.allowDownload === true,
        watchUrl: status === 'active' ? `/assistir/${encodeURIComponent(cat?.slug || e.resourceId)}` : null,
        mediaPaths,
      };
    });

  const appointments = [];
  const personalizados = [];
  const orders = [];

  for (const ref of claimedRefs) {
    const refunds = (await kvGet(sb, `nua_id:refunds:${ref}`)) || [];
    if (ref.startsWith('book_') || ref.startsWith('apt_')) {
      const { data: sbRow } = await sb.from('appointments').select('*').eq('id', ref).maybeSingle();
      const localRow = localAppointments[ref] || Object.values(localAppointments).find((a) => a?.id === ref);
      const row = sbRow || localRow;
      if (!row) continue;
      const fin = normalizeFin(row.payment?.status || row.status);
      const dateIso = row.date_time || row.dateTimeUtc || row.created_at || row.createdAt;
      const br = formatBr(dateIso);
      const opStatus = row.status || 'aguardando_pagamento';
      appointments.push({
        id: row.id,
        modalityName: row.modalityName || row.modality_id || 'Chamada VIP',
        durationMinutes: row.durationMinutes || row.duration_minutes || 30,
        dateUtc: dateIso || null,
        displayDateBr: row.date || br.dateBr,
        displayTimeBr: row.startTime || br.timeBr,
        timezoneDisplay: 'America/Sao_Paulo',
        scheduleDate: row.date || '',
        scheduleTime: row.startTime || '',
        scheduleTimezone: row.timezone || 'Europe/Dublin',
        price: Number(row.price ?? row.total_price ?? 0),
        operationalStatus: opStatus,
        financialStatus: fin.status,
        callLink: fin.status === 'paid' && opStatus === 'confirmada' ? (row.call_link || row.meeting?.joinUrl || null) : null,
        canRequestCancel: ['confirmada', 'aguardando_pagamento'].includes(opStatus),
        canRequestReschedule: opStatus === 'confirmada',
        cancellationReason: row.cancellationReason || null,
        refundStatus: refunds[0]?.status || null,
        createdAt: row.created_at || row.createdAt || new Date().toISOString(),
      });
      orders.push({
        id: row.id,
        kind: 'vip',
        kindLabel: 'Chamada VIP',
        title: `${row.modalityName || 'Chamada VIP'} (${row.durationMinutes || row.duration_minutes || 30} min)`,
        amount: Number(row.price ?? row.total_price ?? 0),
        financialStatus: fin.status,
        financialLabel: fin.label,
        operationalStatus: opStatus,
        operationalLabel: opStatus === 'confirmada' ? 'Confirmada' : opStatus === 'cancelada' ? 'Cancelada' : opStatus,
        paymentMethod: row.payment?.method || 'pix',
        paidAt: row.payment?.paidAt || null,
        createdAt: row.created_at || row.createdAt || new Date().toISOString(),
        refunds,
      });
    } else if (ref.startsWith('ped_') || ref.startsWith('pers_')) {
      const { data: sbRow } = await sb.from('personalizados_orders').select('*').eq('id', ref).maybeSingle();
      const localRow = localPersonalizados[ref] || Object.values(localPersonalizados).find((p) => p?.id === ref);
      const row = sbRow || localRow;
      if (!row) continue;
      const fin = normalizeFin(row.payment?.status || row.status);
      const opStatus = row.status || 'aguardando_pagamento';
      const photoCount = row.photoCount ?? row.photo_count ?? 0;
      const videoMins = row.videoDurationMinutes ?? row.video_duration_minutes ?? 0;
      const totalPrice = Number(row.totalPrice ?? row.total_price ?? 0);
      const rawVault = row.vaultFiles || row.vault_files || [];
      const normalizedVault =
        fin.status === 'paid' && ['pronto', 'entregue'].includes(opStatus)
          ? (Array.isArray(rawVault) ? rawVault : []).map((f, idx) => ({
              id: f?.id || `vault_${idx + 1}`,
              name: f?.name || `Arquivo ${idx + 1}`,
              type: f?.type === 'video' ? 'video' : 'photo',
              path: f?.url || f?.path || '',
              url: f?.url || f?.path || '',
            }))
          : [];
      personalizados.push({
        id: row.id,
        photoCount,
        videoDurationMinutes: videoMins,
        mentionName: Boolean(row.mentionName ?? row.mention_name),
        express24h: Boolean(row.express24h ?? row.express_24h),
        deliveryChannel: row.deliveryChannel || row.delivery_channel || 'vault',
        briefingSummary: String(row.briefing || '').slice(0, 260),
        totalPrice,
        operationalStatus: opStatus,
        financialStatus: fin.status,
        vaultFiles: normalizedVault,
        createdAt: row.created_at || row.createdAt || new Date().toISOString(),
        updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
      });
      orders.push({
        id: row.id,
        kind: 'custom',
        kindLabel: 'Personalizado',
        title: `Personalizado (${photoCount} fotos${videoMins ? ` + ${videoMins}min vídeo` : ''})`,
        amount: totalPrice,
        financialStatus: fin.status,
        financialLabel: fin.label,
        operationalStatus: opStatus,
        operationalLabel:
          opStatus === 'em_producao' ? 'Em produção' : opStatus === 'pronto' ? 'Pronto para acesso' : opStatus === 'entregue' ? 'Entregue' : opStatus,
        paymentMethod: 'pix',
        paidAt: row.payment?.paidAt || null,
        createdAt: row.created_at || row.createdAt || new Date().toISOString(),
        refunds,
      });
    } else {
      const { data: sbRow } = await sb.from('orders').select('*').eq('id', ref).maybeSingle();
      const localRow = localOrders[ref];
      const row = sbRow || localRow;
      if (!row) continue;
      const packSlug = row.pack_id || row.slug || ref;
      const fin = normalizeFin(row.status);
      const cat = catIdx.get(String(packSlug).toLowerCase());
      orders.push({
        id: row.id || row.orderId || ref,
        kind: 'pack',
        kindLabel: 'Conteúdo & Pack',
        title: cat?.title || row.title || packSlug,
        amount: Number(row.amount ?? row.price ?? 0),
        financialStatus: fin.status,
        financialLabel: fin.label,
        operationalStatus: fin.status === 'paid' ? 'liberado' : fin.status,
        operationalLabel: fin.status === 'paid' ? 'Disponível na biblioteca' : fin.label,
        paymentMethod: row.payment_method || row.paymentMethod || 'pix',
        paidAt: fin.status === 'paid' ? (row.updated_at || row.paidAt || null) : null,
        createdAt: row.created_at || row.createdAt || new Date().toISOString(),
        refunds,
      });
    }
  }

  orders.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return { library, appointments, personalizados, orders };
}

export async function handleNuaIdLocalRequest({ pathname, method, searchParams, body, req, env }) {
  const sb = getSb(env);
  if (!sb) {
    return { status: 503, json: { success: false, error: 'Supabase não configurado no .dev.vars.' } };
  }
  const secret = getSecret(env);

  // =========================================================================
  // 1. ADMIN › CLIENTES (/api/admin/customers)
  // =========================================================================
  if (pathname === '/api/admin/customers') {
    if (method === 'GET') {
      const profileId = (searchParams.get('id') || '').trim();
      const q = (searchParams.get('q') || '').trim().toLowerCase();
      const filter = (searchParams.get('filter') || 'all').trim().toLowerCase();

      if (profileId) {
        const profile = await kvGet(sb, `nua_id:profile:${profileId}`);
        if (!profile) return { status: 404, json: { success: false, error: 'Cliente não encontrado.' } };
        const [bundle, auditEvents] = await Promise.all([
          loadBundle(sb, profile.id),
          kvGet(sb, `nua_id:audit:${profile.id}`).then((v) => v || []),
        ]);
        return {
          status: 200,
          json: {
            success: true,
            customer: {
              id: profile.id,
              displayName: profile.displayName,
              email: profile.email,
              status: profile.status,
              marketingOptIn: profile.marketingOptIn,
              termsAcceptedAt: profile.termsAcceptedAt || null,
              createdAt: profile.createdAt,
              updatedAt: profile.updatedAt,
              anonymizedAt: profile.anonymizedAt || null,
            },
            orders: bundle.orders,
            library: bundle.library.map(({ mediaPaths, ...safe }) => safe),
            appointments: bundle.appointments.map((a) => ({ ...a, callLink: null })),
            personalizados: bundle.personalizados.map((p) => ({ ...p, vaultFiles: [] })),
            auditEvents: auditEvents.slice(0, 30),
          },
        };
      }

      const entries = await kvListPrefix(sb, 'nua_id:profile:');
      const allProfiles = entries.map((e) => e.value).filter((p) => p && p.id);
      const rows = [];
      for (const p of allProfiles) {
        const bundle = await loadBundle(sb, p.id);
        const totalSpent = bundle.orders.filter((o) => o.financialStatus === 'paid').reduce((s, o) => s + Number(o.amount || 0), 0);
        const hasPendingRefund =
          bundle.appointments.some((a) => a.operationalStatus === 'reembolso_pendente') ||
          bundle.orders.some((o) => ['refunded', 'charged_back'].includes(o.financialStatus));
        const needsAttention =
          bundle.appointments.some((a) => ['reagendamento_pendente', 'reembolso_pendente'].includes(a.operationalStatus)) ||
          bundle.personalizados.some((pe) => pe.operationalStatus === 'em_producao') ||
          bundle.orders.some((o) => o.financialStatus === 'charged_back');

        const row = {
          id: p.id,
          displayName: p.displayName,
          email: p.email,
          status: p.status,
          createdAt: p.createdAt,
          counts: {
            orders: bundle.orders.length,
            paidOrders: bundle.orders.filter((o) => o.financialStatus === 'paid').length,
            libraryActive: bundle.library.filter((l) => l.status === 'active').length,
            appointments: bundle.appointments.length,
            personalizados: bundle.personalizados.length,
          },
          totalSpent,
          hasPendingRefund,
          needsAttention,
          lastOrderAt: bundle.orders[0]?.createdAt || null,
        };
        if (q && !`${row.displayName} ${row.email} ${row.id}`.toLowerCase().includes(q)) continue;
        if (filter === 'attention' && !row.needsAttention) continue;
        if (filter === 'refunds' && !row.hasPendingRefund) continue;
        if (filter === 'active' && row.status !== 'active') continue;
        if (filter === 'suspended' && row.status !== 'suspended') continue;
        rows.push(row);
      }

      return {
        status: 200,
        json: {
          success: true,
          customers: rows,
          totals: {
            all: allProfiles.length,
            active: allProfiles.filter((p) => p.status === 'active').length,
            attention: rows.filter((r) => r.needsAttention).length,
          },
        },
      };
    }

    if (method === 'POST') {
      const { profileId, action, reason = '', orderRef } = body || {};
      if (['mark_paid', 'edit_payment', 'impersonate', 'login_as'].includes(action)) {
        return { status: 403, json: { success: false, error: 'Operação proibida pelas políticas do NUA ID.' } };
      }
      const profile = await kvGet(sb, `nua_id:profile:${profileId}`);
      if (!profile) return { status: 404, json: { success: false, error: 'Cliente não encontrado.' } };

      const audit = (await kvGet(sb, `nua_id:audit:${profile.id}`)) || [];
      const pushAudit = async (act, details) => {
        audit.unshift({ id: crypto.randomUUID(), action: act, details, createdAt: new Date().toISOString() });
        await kvSet(sb, `nua_id:audit:${profile.id}`, audit.slice(0, 100));
      };

      if (action === 'revoke_sessions') {
        const ids = (await kvGet(sb, `nua_id:user_sessions:${profile.id}`)) || [];
        let count = 0;
        for (const id of ids) {
          const s = await kvGet(sb, `nua_id:session:${id}`);
          if (s && !s.isRevoked) {
            s.isRevoked = true;
            await kvSet(sb, `nua_id:session:${id}`, s);
            count++;
          }
        }
        await pushAudit('admin_revoke_all_sessions', { count, reason });
        return { status: 200, json: { success: true, revokedCount: count } };
      }

      if (action === 'suspend' || action === 'reactivate') {
        if (profile.status === 'anonymized') {
          return { status: 409, json: { success: false, error: 'Contas anonimizadas não podem ser reativadas.' } };
        }
        profile.status = action === 'suspend' ? 'suspended' : 'active';
        profile.updatedAt = new Date().toISOString();
        await kvSet(sb, `nua_id:profile:${profile.id}`, profile);
        await pushAudit(`admin_${action}_account`, { reason });
        return { status: 200, json: { success: true, status: profile.status } };
      }

      if (action === 'revoke_entitlement' && orderRef) {
        const list = (await kvGet(sb, `nua_id:entitlements:${profile.id}`)) || [];
        let revoked = 0;
        const nowIso = new Date().toISOString();
        const next = list.map((e) => {
          if (e.orderRef === orderRef && !e.revokedAt) {
            revoked++;
            return { ...e, revokedAt: nowIso, revokeReason: reason || 'admin_revoked' };
          }
          return e;
        });
        await kvSet(sb, `nua_id:entitlements:${profile.id}`, next);
        await pushAudit('admin_revoke_entitlement', { orderRef, revoked, reason });
        return { status: 200, json: { success: true, revoked } };
      }

      return { status: 400, json: { success: false, error: 'Ação inválida.' } };
    }
  }

  // =========================================================================
  // 2. IDENTIDADE (/api/id/*)
  // =========================================================================
  if (pathname === '/api/id/request-code' && method === 'POST') {
    const email = normEmail(body?.email);
    if (!isValidEmail(email)) {
      return { status: 400, json: { success: false, error: 'Informe um endereço de e-mail válido.' } };
    }
    const code = genOtp();
    const salt = crypto.randomUUID();
    const now = new Date();
    await kvSet(sb, `nua_id:otp:login:${email}`, {
      emailNormalized: email,
      codeHash: sha256Hex(`${salt}:${code}`),
      salt,
      attempts: 0,
      maxAttempts: OTP_MAX_ATTEMPTS,
      purpose: 'login',
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + OTP_TTL_MIN * 60_000).toISOString(),
    });
    console.log(`[NUA ID LocalDev] Código OTP para ${email}: ${code}`);
    await sendSmtpLocal(env, {
      to: email,
      subject: 'Seu código de acesso — Nua Borges',
      html: `<div style="background:#050507;color:#F5EEE9;padding:32px;font-family:sans-serif;text-align:center"><h2 style="font-family:Georgia,serif">NUA BORGES</h2><p>Seu código de acesso temporário (válido por ${OTP_TTL_MIN} min):</p><div style="font-size:30px;letter-spacing:8px;font-weight:bold;padding:16px;background:#171115;border-radius:12px;margin:16px auto;max-width:260px">${code}</div></div>`,
    }).catch(() => {});

    return {
      status: 200,
      json: {
        success: true,
        expiresInMinutes: OTP_TTL_MIN,
        message: 'Se o endereço estiver correto, você receberá um código de 6 dígitos no seu e-mail em instantes.',
      },
    };
  }

  if (pathname === '/api/id/verify-code' && method === 'POST') {
    const email = normEmail(body?.email);
    const code = String(body?.code || '').replace(/\D/g, '');
    if (!isValidEmail(email) || code.length !== 6) {
      return { status: 400, json: { success: false, error: 'Informe o e-mail e o código de 6 dígitos.' } };
    }
    const ch = await kvGet(sb, `nua_id:otp:login:${email}`);
    if (!ch || Date.now() > new Date(ch.expiresAt).getTime()) {
      await kvDel(sb, `nua_id:otp:login:${email}`);
      return { status: 401, json: { success: false, error: 'Código inválido ou expirado.' } };
    }
    if (!timingSafeStr(sha256Hex(`${ch.salt}:${code}`), ch.codeHash)) {
      ch.attempts = (ch.attempts || 0) + 1;
      if (ch.attempts >= (ch.maxAttempts || 5)) {
        await kvDel(sb, `nua_id:otp:login:${email}`);
        return { status: 429, json: { success: false, error: 'Código invalidado por excesso de tentativas.' } };
      }
      await kvSet(sb, `nua_id:otp:login:${email}`, ch);
      return {
        status: 401,
        json: { success: false, error: 'Código incorreto.', attemptsRemaining: (ch.maxAttempts || 5) - ch.attempts },
      };
    }
    await kvDel(sb, `nua_id:otp:login:${email}`);

    // Obtém ou cria perfil (alinhado com Supabase Auth)
    const idx = await kvGet(sb, `nua_id:email:${email}`);
    let profile = idx?.profileId ? await kvGet(sb, `nua_id:profile:${idx.profileId}`) : null;
    if (!profile) {
      let uid = crypto.randomUUID();
      try {
        const { data, error } = await sb.auth.admin.createUser({ email, email_confirm: true });
        if (!error && data?.user?.id) uid = data.user.id;
      } catch {}
      const nowIso = new Date().toISOString();
      profile = {
        id: uid,
        email,
        emailNormalized: email,
        displayName: (body?.displayName || email.split('@')[0] || 'Cliente').slice(0, 80),
        marketingOptIn: false,
        termsAcceptedAt: nowIso,
        termsVersion: '2026-11',
        status: 'active',
        anonymizedAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await kvSet(sb, `nua_id:profile:${uid}`, profile);
      await kvSet(sb, `nua_id:email:${email}`, { profileId: uid, updatedAt: nowIso });
    }
    if (profile.status !== 'active') {
      return { status: 403, json: { success: false, error: 'Esta conta não está disponível para acesso.' } };
    }

    const sessionId = genSessionId();
    const now = new Date();
    const session = {
      id: sessionId,
      profileId: profile.id,
      deviceLabel: 'Navegador Local',
      userAgent: String(req.headers['user-agent'] || '').slice(0, 200),
      ipHash: sha256Hex(`${secret}:127.0.0.1`).slice(0, 16),
      isRevoked: false,
      createdAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + SESSION_TTL_SEC * 1000).toISOString(),
    };
    await kvSet(sb, `nua_id:session:${sessionId}`, session);
    const prevIds = (await kvGet(sb, `nua_id:user_sessions:${profile.id}`)) || [];
    await kvSet(sb, `nua_id:user_sessions:${profile.id}`, [sessionId, ...prevIds].slice(0, 20));

    const signed = `${sessionId}.${hmacSign(sessionId, secret)}`;
    const setCookie = `${DEV_COOKIE}=${encodeURIComponent(signed)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SEC}`;
    return {
      status: 200,
      setCookies: [setCookie],
      json: {
        success: true,
        authenticated: true,
        profile: {
          id: profile.id,
          email: profile.email,
          displayName: profile.displayName,
          marketingOptIn: profile.marketingOptIn,
          createdAt: profile.createdAt,
        },
      },
    };
  }

  if (pathname === '/api/id/session' && method === 'GET') {
    const ctx = await resolveSession(req, sb, secret);
    if (!ctx) return { status: 200, json: { authenticated: false, profile: null } };
    return {
      status: 200,
      json: {
        authenticated: true,
        sessionId: ctx.session.id,
        profile: {
          id: ctx.profile.id,
          email: ctx.profile.email,
          displayName: ctx.profile.displayName,
          marketingOptIn: ctx.profile.marketingOptIn,
          termsAcceptedAt: ctx.profile.termsAcceptedAt || null,
          createdAt: ctx.profile.createdAt,
        },
      },
    };
  }

  if (pathname === '/api/id/logout' && method === 'POST') {
    const ctx = await resolveSession(req, sb, secret);
    if (ctx) {
      ctx.session.isRevoked = true;
      await kvSet(sb, `nua_id:session:${ctx.session.id}`, ctx.session);
    }
    return {
      status: 200,
      setCookies: [`${DEV_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`],
      json: { success: true, authenticated: false },
    };
  }

  // Rotas autenticadas do cliente (/api/id/* e /api/me/*)
  const ctx = await resolveSession(req, sb, secret);
  if (!ctx) {
    return { status: 401, json: { success: false, authenticated: false, error: 'Sessão expirada ou não autenticada.' } };
  }

  if (pathname === '/api/id/sessions') {
    const ids = (await kvGet(sb, `nua_id:user_sessions:${ctx.profile.id}`)) || [];
    if (method === 'GET') {
      const active = [];
      for (const id of ids) {
        const s = await kvGet(sb, `nua_id:session:${id}`);
        if (s && !s.isRevoked && new Date(s.expiresAt).getTime() > Date.now()) {
          active.push({ id: s.id, deviceLabel: s.deviceLabel, createdAt: s.createdAt, lastSeenAt: s.lastSeenAt, expiresAt: s.expiresAt, isCurrent: s.id === ctx.session.id });
        }
      }
      return { status: 200, json: { success: true, sessions: active } };
    }
    if (method === 'POST') {
      if (body?.revokeOthers) {
        for (const id of ids) {
          if (id === ctx.session.id) continue;
          const s = await kvGet(sb, `nua_id:session:${id}`);
          if (s && s.profileId === ctx.profile.id) {
            s.isRevoked = true;
            await kvSet(sb, `nua_id:session:${id}`, s);
          }
        }
        return { status: 200, json: { success: true, message: 'Outras sessões encerradas.' } };
      }
      if (body?.sessionId) {
        const s = await kvGet(sb, `nua_id:session:${body.sessionId}`);
        if (!s || s.profileId !== ctx.profile.id) return { status: 404, json: { success: false, error: 'Sessão não encontrada.' } };
        s.isRevoked = true;
        await kvSet(sb, `nua_id:session:${s.id}`, s);
        return { status: 200, json: { success: true } };
      }
    }
  }

  if (pathname === '/api/id/profile' && method === 'POST') {
    const updated = { ...ctx.profile };
    if (typeof body?.displayName === 'string' && body.displayName.trim().length >= 2) {
      updated.displayName = body.displayName.replace(/[<>]/g, '').trim().slice(0, 80);
    }
    if (typeof body?.marketingOptIn === 'boolean') {
      updated.marketingOptIn = body.marketingOptIn;
    }
    updated.updatedAt = new Date().toISOString();
    await kvSet(sb, `nua_id:profile:${updated.id}`, updated);
    return { status: 200, json: { success: true, profile: updated } };
  }

  if (pathname === '/api/id/account' && method === 'POST') {
    if (body?.action === 'export_data') {
      const bundle = await loadBundle(sb, ctx.profile.id);
      return { status: 200, json: { success: true, exportedAt: new Date().toISOString(), data: { profile: ctx.profile, orders: bundle.orders } } };
    }
    if (body?.action === 'anonymize' && body?.confirmText === 'ENCERRAR CONTA') {
      await kvDel(sb, `nua_id:email:${ctx.profile.emailNormalized}`);
      const anon = { ...ctx.profile, email: `anon_${ctx.profile.id.slice(0, 12)}@anonymized.local`, emailNormalized: `anon_${ctx.profile.id.slice(0, 12)}@anonymized.local`, displayName: 'Conta encerrada', status: 'anonymized', anonymizedAt: new Date().toISOString() };
      await kvSet(sb, `nua_id:profile:${anon.id}`, anon);
      ctx.session.isRevoked = true;
      await kvSet(sb, `nua_id:session:${ctx.session.id}`, ctx.session);
      return { status: 200, setCookies: [`${DEV_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`], json: { success: true } };
    }
    return { status: 400, json: { success: false, error: 'Confirmação inválida.' } };
  }

  // =========================================================================
  // 3. MINHA NUA (/api/me/*)
  // =========================================================================
  if (pathname === '/api/me/overview' && method === 'GET') {
    const b = await loadBundle(sb, ctx.profile.id);
    const activeLib = b.library.filter((i) => i.status === 'active');
    const upcoming = b.appointments.filter((a) => ['confirmada', 'aguardando_pagamento', 'reagendamento_pendente'].includes(a.operationalStatus));
    const activePers = b.personalizados.filter((p) => ['aguardando_pagamento', 'em_producao', 'pronto'].includes(p.operationalStatus));
    return {
      status: 200,
      json: {
        success: true,
        profile: { id: ctx.profile.id, displayName: ctx.profile.displayName, email: ctx.profile.email },
        summary: {
          availableContents: activeLib.slice(0, 4),
          upcomingAppointments: upcoming.slice(0, 3),
          activePersonalizados: activePers.slice(0, 3),
          recentOrders: b.orders.slice(0, 5),
          notices: [],
          counts: {
            libraryActive: activeLib.length,
            appointmentsUpcoming: upcoming.length,
            appointmentsTotal: b.appointments.length,
            personalizadosActive: activePers.length,
            personalizadosDelivered: b.personalizados.filter((p) => ['pronto', 'entregue'].includes(p.operationalStatus)).length,
            personalizadosTotal: b.personalizados.length,
            totalOrders: b.orders.length,
          },
        },
      },
    };
  }

  if (pathname === '/api/me/library' && method === 'GET') {
    const b = await loadBundle(sb, ctx.profile.id);
    return { status: 200, json: { success: true, items: b.library } };
  }

  if (pathname === '/api/me/media-url' && method === 'POST') {
    const resourceId = String(body?.resourceId || '').trim().toLowerCase();
    const mediaPath = String(body?.mediaPath || '').trim();
    const wantsDownload = body?.download === true;
    const b = await loadBundle(sb, ctx.profile.id);
    const libMatch = b.library.find(
      (i) => i.status === 'active' && (i.resourceId.toLowerCase() === resourceId || i.orderRef.toLowerCase() === resourceId)
    );
    const persMatch = b.personalizados.find(
      (p) => p.id.toLowerCase() === resourceId && p.financialStatus === 'paid' && ['pronto', 'entregue'].includes(p.operationalStatus)
    );
    if (!libMatch && !persMatch) {
      return { status: 403, json: { success: false, error: 'Acesso não autorizado ou expirado.' } };
    }
    if (wantsDownload && libMatch && !libMatch.allowDownload) {
      return { status: 403, json: { success: false, error: 'Download não autorizado para este conteúdo.' } };
    }
    if (!mediaPath || mediaPath.includes('..')) {
      return { status: 400, json: { success: false, error: 'Caminho de mídia inválido.' } };
    }
    const exp = Math.floor(Date.now() / 1000) + 300;
    const dl = wantsDownload ? '1' : '0';
    // Para arquivos locais /images/... ou /media/..., devolve URL direta ou assinada
    const clean = mediaPath.startsWith('http') || mediaPath.startsWith('/') ? mediaPath : `/media/${mediaPath}`;
    const sep = clean.includes('?') ? '&' : '?';
    const sig = crypto.createHmac('sha256', secret).update(`v1|${clean}|${ctx.profile.id}|${exp}|${dl}`).digest('hex');
    const signedUrl = clean.startsWith('/images/')
      ? clean
      : `${clean}${sep}exp=${exp}&pid=${encodeURIComponent(ctx.profile.id)}&dl=${dl}&sig=${sig}`;
    return {
      status: 200,
      json: {
        success: true,
        signedUrl,
        expiresAt: new Date(exp * 1000).toISOString(),
        ttlSeconds: 300,
        downloadAuthorized: wantsDownload,
      },
    };
  }

  if (pathname === '/api/me/appointments' && method === 'GET') {
    const b = await loadBundle(sb, ctx.profile.id);
    return { status: 200, json: { success: true, appointments: b.appointments } };
  }

  if (pathname === '/api/me/appointments' && method === 'POST') {
    const { appointmentId, action, reason = '' } = body || {};
    const claim = await kvGet(sb, `nua_id:claim:${appointmentId}`);
    if (!claim || claim.profileId !== ctx.profile.id) {
      return { status: 404, json: { success: false, error: 'Agendamento não encontrado para esta conta.' } };
    }
    const localAppointments = readLocalJson('local_appointments.json', {});
    const booking = localAppointments[appointmentId];
    if (booking) {
      if (action === 'request_reschedule') {
        booking.status = 'reagendamento_pendente';
      } else {
        booking.status = booking.payment?.status === 'approved' ? 'reembolso_pendente' : 'cancelada';
        booking.cancellationReason = reason || 'Cancelado pelo cliente via Minha Conta';
      }
      booking.updatedAt = new Date().toISOString();
      localAppointments[appointmentId] = booking;
      writeLocalJson('local_appointments.json', localAppointments);
      return { status: 200, json: { success: true, status: booking.status, message: 'Solicitação registrada.' } };
    }
    return { status: 404, json: { success: false, error: 'Agendamento não encontrado.' } };
  }

  if (pathname === '/api/me/personalizados' && method === 'GET') {
    const b = await loadBundle(sb, ctx.profile.id);
    return { status: 200, json: { success: true, personalizados: b.personalizados } };
  }

  if (pathname === '/api/me/orders' && method === 'GET') {
    const b = await loadBundle(sb, ctx.profile.id);
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.min(50, Math.max(5, Number.parseInt(searchParams.get('pageSize') || '10', 10) || 10));
    const type = (searchParams.get('type') || 'all').toLowerCase();
    const filtered = type === 'all' ? b.orders : b.orders.filter((o) => o.kind === type);
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return {
      status: 200,
      json: {
        success: true,
        items: filtered.slice((page - 1) * pageSize, page * pageSize),
        pagination: { page, pageSize, total, totalPages },
      },
    };
  }

  if (pathname === '/api/me/claim' && method === 'POST') {
    const legacyToken = String(body?.token || '').trim();
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(legacyToken)) {
      return { status: 400, json: { success: false, error: 'Informe o token original recebido na compra.' } };
    }
    const { data: ord } = await sb.from('orders').select('*').eq('purchase_token', legacyToken).maybeSingle();
    if (!ord) {
      return { status: 404, json: { success: false, error: 'Nenhum pedido localizado para o token informado.' } };
    }
    const existingClaim = await kvGet(sb, `nua_id:claim:${ord.id}`);
    if (existingClaim && existingClaim.profileId !== ctx.profile.id) {
      return { status: 409, json: { success: false, error: 'Este pedido já está vinculado a outra conta NUA ID.' } };
    }
    if (!existingClaim) {
      await kvSet(sb, `nua_id:claim:${ord.id}`, { orderRef: ord.id, profileId: ctx.profile.id, claimedAt: new Date().toISOString(), method: 'token_and_otp' });
      const refs = (await kvGet(sb, `nua_id:profile_orders:${ctx.profile.id}`)) || [];
      if (!refs.includes(ord.id)) {
        refs.unshift(ord.id);
        await kvSet(sb, `nua_id:profile_orders:${ctx.profile.id}`, refs);
      }
    }
    const fin = normalizeFin(ord.status);
    let entitlementGranted = false;
    if (fin.status === 'paid') {
      const ents = (await kvGet(sb, `nua_id:entitlements:${ctx.profile.id}`)) || [];
      if (!ents.some((e) => e.orderRef === ord.id)) {
        ents.unshift({ id: crypto.randomUUID(), profileId: ctx.profile.id, orderRef: ord.id, kind: 'pack', resourceId: ord.pack_id, title: ord.pack_id, grantedAt: new Date().toISOString(), expiresAt: ord.expires_at || null, allowDownload: false });
        await kvSet(sb, `nua_id:entitlements:${ctx.profile.id}`, ents);
      }
      entitlementGranted = true;
    }
    return {
      status: 200,
      json: {
        success: true,
        orderRef: ord.id,
        alreadyClaimed: Boolean(existingClaim),
        entitlementGranted,
        message: entitlementGranted ? 'Pedido vinculado e liberado na sua Biblioteca.' : 'Pedido vinculado ao histórico (aguardando pagamento).',
      },
    };
  }

  return { status: 404, json: { success: false, error: `Rota NUA ID não encontrada: ${pathname}` } };
}

/**
 * Vincula automaticamente um pedido local aprovado (via simulate-approve ou create-pix)
 * à sessão NUA ID ativa do navegador, concedendo o entitlement na Biblioteca.
 */
export async function linkLocalOrderToCustomerSession({ req, env, orderId, slug, title, amount, kind = 'pack', paid = false }) {
  try {
    const sb = getSb(env);
    if (!sb || !orderId) return false;
    const secret = getSecret(env);
    const ctx = await resolveSession(req, sb, secret);
    if (!ctx) return false;

    const nowIso = new Date().toISOString();
    await kvSet(sb, `nua_id:claim:${orderId}`, {
      orderRef: orderId,
      profileId: ctx.profile.id,
      claimedAt: nowIso,
      method: 'checkout_authenticated',
    });

    const refs = (await kvGet(sb, `nua_id:profile_orders:${ctx.profile.id}`)) || [];
    if (!refs.includes(orderId)) {
      refs.unshift(orderId);
      await kvSet(sb, `nua_id:profile_orders:${ctx.profile.id}`, refs);
    }

    // Garante registro do pedido na tabela orders do Supabase se ainda não existir (ou atualiza status)
    if (kind === 'pack') {
      await sb.from('orders').upsert({
        id: orderId,
        purchase_token: `ptok_${crypto.randomBytes(16).toString('hex')}`,
        pack_id: slug || orderId,
        amount: Number(amount || 0),
        status: paid ? 'paid' : 'pending',
        customer_email: ctx.profile.email,
        customer_name: ctx.profile.displayName,
        payment_method: 'pix',
        created_at: nowIso,
        updated_at: nowIso,
      });
    }

    if (paid) {
      const ents = (await kvGet(sb, `nua_id:entitlements:${ctx.profile.id}`)) || [];
      if (!ents.some((e) => e.orderRef === orderId)) {
        ents.unshift({
          id: crypto.randomUUID(),
          profileId: ctx.profile.id,
          orderRef: orderId,
          kind,
          resourceId: slug || orderId,
          title: title || slug || orderId,
          grantedAt: nowIso,
          expiresAt: null,
          allowDownload: kind === 'custom',
        });
        await kvSet(sb, `nua_id:entitlements:${ctx.profile.id}`, ents);
      }
    }
    return true;
  } catch (err) {
    console.warn('[NUA ID LocalDev] Falha ao vincular pedido à conta:', err?.message);
    return false;
  }
}
