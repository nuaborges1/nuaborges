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

export async function sendSmtpLocal(env, { to, subject, html }) {
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
    socket.once('close', () => resolve(false));
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

function signLocalMediaUrl(rawPath, profileId, allowDownload, secret) {
  const cleanRaw = String(rawPath || '').trim();
  if (!cleanRaw) return '';
  if (cleanRaw.startsWith('/images/') || !cleanRaw.includes('/private/')) {
    return cleanRaw;
  }
  const clean = cleanRaw.startsWith('http') || cleanRaw.startsWith('/') ? cleanRaw : `/media/${cleanRaw}`;
  const exp = Math.floor(Date.now() / 1000) + 600;
  const dl = allowDownload ? '1' : '0';
  const sep = clean.includes('?') ? '&' : '?';
  const sig = crypto.createHmac('sha256', secret).update(`v1|${clean}|${profileId}|${exp}|${dl}`).digest('hex');
  return `${clean}${sep}exp=${exp}&pid=${encodeURIComponent(profileId)}&dl=${dl}&sig=${sig}`;
}

async function loadBundle(sb, profileId, secret = '') {
  const [entitlements, claimedRefs, remotePrivateContent, remotePubContent] = await Promise.all([
    kvGet(sb, `nua_id:entitlements:${profileId}`).then((v) => v || []),
    kvGet(sb, `nua_id:profile_orders:${profileId}`).then((v) => v || []),
    kvGet(sb, 'private_admin_content'),
    kvGet(sb, 'published_content'),
  ]);

  const localPubContent = readLocalJson('published_content.json', null);
  const localOrders = readLocalJson('local_orders.json', {});
  const localPersonalizados = readLocalJson('local_personalizados.json', {});
  const localAppointments = readLocalJson('local_appointments.json', {});

  const catIdx = new Map();
  // Carrega primeiro local/published e depois sobrepõe com private_admin_content para preservar mídias exclusivas
  for (const src of [localPubContent, remotePubContent, remotePrivateContent]) {
    const prods = src?.avulsos?.items || src?.packs || [];
    for (const it of Array.isArray(prods) ? prods : []) {
      if (it?.slug) catIdx.set(String(it.slug).toLowerCase(), it);
      if (it?.id) catIdx.set(String(it.id).toLowerCase(), it);
      if (it?.id) catIdx.set(String(it.id).replace(/^avulso-/, '').toLowerCase(), it);
    }
  }

  const nowMs = Date.now();
  // Biblioteca exibe exclusivamente Conteúdos & Packs (Personalizados vão para a aba Personalizados!)
  const seenResources = new Set();
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
      const allowDownload = status === 'active' && e.allowDownload === true;
      const mediaPaths = [];
      const authorizedPhotos = [];
      const authorizedVideos = [];
      if (status === 'active' && cat) {
        const photos = Array.isArray(cat.exclusivePhotos) ? cat.exclusivePhotos : [];
        for (let i = 0; i < photos.length; i++) {
          const p = photos[i];
          const pUrl = typeof p === 'string' ? p : p?.url || p?.path || '';
          if (pUrl) {
            mediaPaths.push({ id: `photo_${i + 1}`, label: `Foto ${i + 1}`, path: pUrl, type: 'photo' });
            authorizedPhotos.push(secret ? signLocalMediaUrl(pUrl, profileId, allowDownload, secret) : pUrl);
          }
        }
        const videos = Array.isArray(cat.videos) ? cat.videos : [];
        for (let i = 0; i < videos.length; i++) {
          const v = videos[i];
          const vUrl = typeof v === 'string' ? v : v?.url || v?.path || '';
          if (vUrl) {
            const vidId = v?.id || `video_${i + 1}`;
            const label = v?.title || `Vídeo ${i + 1}`;
            mediaPaths.push({ id: vidId, label, path: vUrl, type: 'video' });
            authorizedVideos.push({
              id: vidId,
              title: label,
              url: secret ? signLocalMediaUrl(vUrl, profileId, allowDownload, secret) : vUrl,
              posterUrl: v?.posterUrl
                ? (secret ? signLocalMediaUrl(v.posterUrl, profileId, false, secret) : v.posterUrl)
                : undefined,
              duration: v?.duration || undefined,
            });
          }
        }
      }
      const normalizedResourceId = cat?.slug || e.resourceId;
      const photosCount = mediaPaths.filter((m) => m.type === 'photo').length;
      const videosCount = mediaPaths.filter((m) => m.type === 'video').length;
      return {
        entitlementId: e.id,
        orderRef: e.orderRef,
        resourceId: normalizedResourceId,
        kind: e.kind,
        title: cat?.title || e.title || e.resourceId,
        coverUrl: cat?.imageUrl || cat?.coverImage || cat?.thumbnail || null,
        purchasedAt: e.grantedAt,
        expiresAt: e.expiresAt || null,
        status,
        revokeReason: e.revokeReason || null,
        allowDownload,
        watchUrl: status === 'active' ? `/assistir/${encodeURIComponent(normalizedResourceId)}` : null,
        photosCount,
        videosCount,
        mediaPaths,
        ...(status === 'active'
          ? { authorizedMedia: { videos: authorizedVideos, exclusivePhotos: authorizedPhotos } }
          : {}),
      };
    })
    .filter((item) => {
      // Evita cartões duplicados na biblioteca quando o mesmo pack é testado várias vezes
      const dedupeKey = `${String(item.resourceId).toLowerCase()}:${item.status}`;
      if (seenResources.has(dedupeKey)) return false;
      seenResources.add(dedupeKey);
      return true;
    });

  const appointments = [];
  const personalizados = [];
  const orders = [];

  for (const ref of claimedRefs) {
    const refunds = (await kvGet(sb, `nua_id:refunds:${ref}`)) || [];
    if (ref.startsWith('book_') || ref.startsWith('apt_')) {
      const localRow = localAppointments[ref] || Object.values(localAppointments).find((a) => a?.id === ref);
      const { data: sbRow } = localRow ? { data: null } : await sb.from('appointments').select('*').eq('id', ref).maybeSingle();
      const row = localRow || sbRow;
      if (!row) continue;
      const fin = normalizeFin(row.payment?.status || row.status);
      const dateIso = row.date_time || row.dateTimeUtc || row.created_at || row.createdAt;
      const br = formatBr(dateIso);
      const opStatus = row.status || 'aguardando_pagamento';
      const isActivePaidCall =
        fin.status === 'paid' && ['confirmada', 'reagendamento_pendente'].includes(opStatus);
      const displayDateBr = row.date && /^\d{4}-\d{2}-\d{2}$/.test(row.date) ? row.date.split('-').reverse().join('/') : br.dateBr;
      const resolvedCallLink = isActivePaidCall
        ? (row.meeting?.url || row.meeting?.joinUrl || row.call_link || null)
        : null;
      const hasPendingCancelReq = row.cancellation?.state === 'requested';
      const opLabelMap = {
        aguardando_pagamento: 'Aguardando pagamento',
        confirmada: 'Confirmada',
        concluida: 'Realizada',
        cancelada: 'Cancelada',
        reagendamento_pendente: hasPendingCancelReq
          ? 'Cancelamento em análise'
          : row.proposal
            ? 'Proposta de novo horário'
            : 'Reagendamento em análise',
        reembolso_pendente: 'Reembolso em processamento',
        nao_compareceu: 'Não compareceu',
      };
      appointments.push({
        id: row.id,
        modalityName: row.modalityName || row.modality_id || 'Chamada VIP',
        durationMinutes: row.durationMinutes || row.duration_minutes || 30,
        dateUtc: dateIso || null,
        displayDateBr,
        displayTimeBr: row.startTime || br.timeBr,
        displayEndTimeBr: row.endTime || null,
        timezoneDisplay: 'America/Sao_Paulo',
        scheduleDate: row.date || '',
        scheduleTime: row.startTime || '',
        scheduleEndTime: row.endTime || null,
        scheduleTimezone: row.timezone || 'America/Sao_Paulo',
        price: Number(row.price ?? row.total_price ?? 0),
        operationalStatus: opStatus,
        financialStatus: fin.status,
        callLink: resolvedCallLink,
        meetingInstructions: isActivePaidCall ? (row.meeting?.instructions || null) : null,
        voucherUrl: row.publicToken ? `/chamadas/reserva?token=${encodeURIComponent(row.publicToken)}` : null,
        pixPayload: opStatus === 'aguardando_pagamento' ? (row.payment?.pixPayload || null) : null,
        proposal: row.proposal || null,
        rescheduleRequest: row.rescheduleRequest || null,
        cancellation: row.cancellation
          ? {
              state: row.cancellation.state,
              reason: row.cancellation.reason,
              details: row.cancellation.details,
              decisionNote: row.cancellation.decisionNote,
              denialNote: row.cancellation.denialNote,
              refundPercent: row.cancellation.refundPercent,
              refundAmount: row.cancellation.refundAmount,
            }
          : null,
        rescheduledFrom: row.rescheduledFrom || null,
        canRequestCancel: ['confirmada', 'aguardando_pagamento'].includes(opStatus) && !hasPendingCancelReq,
        canRequestReschedule: opStatus === 'confirmada' && !row.proposal && !hasPendingCancelReq,
        cancellationReason: row.cancellationReason || null,
        refundStatus:
          refunds[0]?.status ||
          (row.payment?.status === 'refunded' ? 'refunded' : (row.refundStatus || null)),
        refundAmount: typeof row.refundAmount === 'number' ? row.refundAmount : null,
        clientNotes: row.clientNotes || null,
        createdAt: row.created_at || row.createdAt || new Date().toISOString(),
        updatedAt: row.updated_at || row.updatedAt || row.createdAt || new Date().toISOString(),
      });
      const modName = row.modalityName || 'Chamada VIP';
      const dur = row.durationMinutes || row.duration_minutes || 30;
      orders.push({
        id: row.id,
        kind: 'vip',
        kindLabel: 'Chamada VIP',
        title: /\d+\s*min/i.test(modName) ? modName : `${modName} (${dur} min)`,
        amount: Number(row.price ?? row.total_price ?? 0),
        financialStatus: fin.status,
        financialLabel: fin.label,
        operationalStatus: opStatus,
        operationalLabel: opLabelMap[opStatus] || opStatus,
        paymentMethod: row.payment?.method || 'pix',
        paidAt: row.payment?.paidAt || null,
        createdAt: row.created_at || row.createdAt || new Date().toISOString(),
        refunds,
      });
    } else if (ref.startsWith('ped_') || ref.startsWith('pers_')) {
      const localRow = localPersonalizados[ref] || Object.values(localPersonalizados).find((p) => p?.id === ref);
      const { data: sbRow } = localRow ? { data: null } : await sb.from('personalizados_orders').select('*').eq('id', ref).maybeSingle();
      const row = localRow || sbRow;
      if (!row) continue;
      const fin = normalizeFin(row.payment?.status || row.status);
      const opStatus = row.status || 'aguardando_pagamento';
      const photoCount = row.photoCount ?? row.photo_count ?? 0;
      const videoMins = row.videoDurationMinutes ?? row.video_duration_minutes ?? 0;
      const totalPrice = Number(row.totalPrice ?? row.total_price ?? 0);
      const rawVault = row.vaultFiles || row.vault_files || [];
      const normalizedVault =
        fin.status === 'paid' && ['pronto', 'entregue'].includes(opStatus)
          ? (Array.isArray(rawVault) ? rawVault : []).map((f, idx) => {
              const rawPath = f?.url || f?.path || '';
              const fileType = f?.type === 'video' ? 'video' : 'photo';
              return {
                id: f?.id || `vault_${idx + 1}`,
                name: f?.name || `Arquivo ${idx + 1}`,
                type: fileType,
                path: rawPath,
                url: rawPath,
                ...(fileType === 'photo' && rawPath
                  ? { previewUrl: secret ? signLocalMediaUrl(rawPath, profileId, false, secret) : rawPath }
                  : {}),
              };
            })
          : [];
      const persOpLabelMap = {
        aguardando_pagamento: 'Aguardando pagamento',
        em_producao: 'Em produção',
        pronto: 'Pronto para acesso',
        entregue: 'Entregue',
        cancelado: 'Cancelado',
      };
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
        operationalLabel: persOpLabelMap[opStatus] || opStatus,
        paymentMethod: row.payment?.method || 'pix',
        paidAt: row.payment?.paidAt || null,
        createdAt: row.created_at || row.createdAt || new Date().toISOString(),
        refunds,
      });
    } else {
      const localRow = localOrders[ref];
      const { data: sbRow } = localRow ? { data: null } : await sb.from('orders').select('*').eq('id', ref).maybeSingle();
      const row = localRow || sbRow;
      if (!row) continue;
      const packSlug = row.pack_id || row.slug || ref;
      const fin = normalizeFin(row.status);
      const cat = catIdx.get(String(packSlug).toLowerCase());
      const matchedLib = library.find((l) => l.orderRef === (row.id || row.orderId || ref));
      const opStatus = matchedLib ? matchedLib.status : fin.status === 'paid' ? 'liberado' : fin.status;
      orders.push({
        id: row.id || row.orderId || ref,
        kind: 'pack',
        kindLabel: 'Conteúdo & Pack',
        title: cat?.title || row.title || packSlug,
        amount: Number(row.amount ?? row.price ?? 0),
        financialStatus: fin.status,
        financialLabel: fin.label,
        operationalStatus: opStatus,
        operationalLabel:
          opStatus === 'revoked'
            ? 'Acesso revogado'
            : opStatus === 'expired'
              ? 'Acesso expirado'
              : fin.status === 'paid'
                ? 'Disponível na biblioteca'
                : fin.label,
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
  // 2. IDENTIDADE (/api/id/*)
  // =========================================================================
  if (pathname === '/api/id/request-code' && method === 'POST') {
    const email = normEmail(body?.email);
    if (!isValidEmail(email)) {
      return { status: 400, json: { success: false, error: 'Informe um endereço de e-mail válido.' } };
    }
    const intent = body?.intent === 'portal_login' ? 'portal_login' : 'checkout';
    if (intent === 'portal_login') {
      const idx = await kvGet(sb, `nua_id:email:${email}`);
      const profile = idx?.profileId ? await kvGet(sb, `nua_id:profile:${idx.profileId}`) : null;
      let hasAccess = Boolean(profile);
      if (!hasAccess) {
        const localOrders = Object.values(readLocalJson('local_orders.json', {}));
        const localApts = Object.values(readLocalJson('local_appointments.json', {}));
        const localPers = Object.values(readLocalJson('local_personalizados.json', {}));
        hasAccess =
          localOrders.some((o) => normEmail(o?.customerEmail || o?.customer_email) === email) ||
          localApts.some((a) => normEmail(a?.clientEmail || a?.client_email) === email) ||
          localPers.some((p) => normEmail(p?.clientContact || p?.client_contact || p?.clientEmail || p?.client_email) === email);
      }
      if (!hasAccess) {
        const [sbOrd, sbApt, sbPers] = await Promise.all([
          sb.from('orders').select('id').eq('customer_email', email).limit(1),
          sb.from('appointments').select('id').eq('client_instagram', email).limit(1),
          sb.from('personalizados_orders').select('id').eq('client_contact', email).limit(1),
        ]);
        hasAccess = Boolean(sbOrd.data?.length || sbApt.data?.length || sbPers.data?.length);
        if (!hasAccess && [sbOrd, sbApt, sbPers].some(result => result.error)) {
          return { status: 503, json: { success: false, error: 'Não foi possível verificar sua solicitação agora.' } };
        }
      }
      if (!hasAccess || profile?.status === 'suspended') {
        return {
          status: 200,
          json: {
            success: true,
            expiresInMinutes: OTP_TTL_MIN,
            message: 'Se o endereço estiver correto, você receberá um código de 6 dígitos no seu e-mail em instantes.',
          },
        };
      }
    }
    const code = genOtp();
    const salt = crypto.randomUUID();
    const now = new Date();
    const saved = await kvSet(sb, `nua_id:otp:login:${email}`, {
      emailNormalized: email,
      codeHash: sha256Hex(`${salt}:${code}`),
      salt,
      attempts: 0,
      maxAttempts: OTP_MAX_ATTEMPTS,
      purpose: 'login',
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + OTP_TTL_MIN * 60_000).toISOString(),
    });
    if (!saved) return { status: 503, json: { success: false, error: 'Não foi possível gerar o código agora.' } };
    const spacedCode = String(code).split('').join(' ');
    const sent = await sendSmtpLocal(env, {
      to: email,
      subject: 'Seu código de acesso — Nua Borges',
      html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Código de acesso — Nua Borges</title></head><body style="margin:0;padding:0;background-color:#050507;color:#F5EEE9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;"><table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#050507;padding:36px 14px;"><tr><td align="center"><table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:540px;background-color:#0c0d12;border:1px solid #3d1c27;border-radius:18px;overflow:hidden;"><tr><td style="padding:32px 28px 22px;background-color:#171115;border-bottom:1px solid #2e151e;text-align:center;"><div style="font-family:Georgia,serif;font-size:22px;letter-spacing:0.24em;color:#F5EEE9;text-transform:uppercase;">NUA BORGES</div><div style="font-size:10px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#C97A8D;margin-top:6px;">Área Privativa · NUA ID</div></td></tr><tr><td style="padding:30px 28px 26px;text-align:center;"><h1 style="font-family:Georgia,serif;font-size:21px;font-weight:400;color:#F5EEE9;margin:0 0 16px;">Seu código de acesso</h1><p style="font-size:14px;color:#b4b4be;margin:0 0 22px;">Informe o código de 6 dígitos abaixo. Ele expira em <strong style="color:#F5EEE9;">${OTP_TTL_MIN} minutos</strong>.</p><div style="background-color:#171115;border:1px solid #661C30;border-radius:14px;padding:22px 16px;margin:0 0 22px;"><div style="font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:700;letter-spacing:0.22em;color:#F5EEE9;">${spacedCode}</div></div><p style="font-size:12px;color:#8a8a96;margin:0;">Por segurança, nunca compartilhe este código com terceiros.</p></td></tr><tr><td style="padding:18px 28px 24px;background-color:#08090d;border-top:1px solid #1e1f28;text-align:center;"><p style="margin:0;font-size:11px;color:#8a8a96;">E-mail transacional automático da plataforma oficial Nua Borges.</p></td></tr></table></td></tr></table></body></html>`,
    });
    if (!sent) return { status: 503, json: { success: false, error: 'Não foi possível enviar o código agora. Tente novamente.' } };

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
    const hintCookie = `nua_id_hint=1; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL_SEC}`;
    return {
      status: 200,
      setCookies: [setCookie, hintCookie],
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
      setCookies: [
        `${DEV_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
        `nua_id_hint=; Path=/; SameSite=Lax; Max-Age=0`,
      ],
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
      return {
        status: 200,
        setCookies: [
          `${DEV_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
          `nua_id_hint=; Path=/; SameSite=Lax; Max-Age=0`,
        ],
        json: { success: true },
      };
    }
    return { status: 400, json: { success: false, error: 'Confirmação inválida.' } };
  }

  // =========================================================================
  // 3. MINHA NUA (/api/me/*)
  // =========================================================================
  if (pathname === '/api/me/overview' && method === 'GET') {
    const b = await loadBundle(sb, ctx.profile.id, secret);
    const activeLib = b.library.filter((i) => i.status === 'active');
    const upcoming = b.appointments.filter((a) => ['confirmada', 'aguardando_pagamento', 'reagendamento_pendente'].includes(a.operationalStatus));
    const activePers = b.personalizados.filter((p) => ['aguardando_pagamento', 'em_producao', 'pronto'].includes(p.operationalStatus));
    const includeFull = searchParams.get('full') === '1' || searchParams.get('full') === 'true';
    const notices = [];
    if (b.appointments.some((a) => Boolean(a.proposal))) {
      notices.push({
        type: 'warning',
        message: 'Você tem uma proposta de novo horário de Chamada VIP aguardando sua resposta.',
        actionTab: 'appointments',
      });
    }
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
          notices,
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
        ...(includeFull
          ? {
              library: b.library,
              appointments: b.appointments,
              personalizados: b.personalizados,
              orders: b.orders,
            }
          : {}),
      },
    };
  }

  if (pathname === '/api/me/library' && method === 'GET') {
    const b = await loadBundle(sb, ctx.profile.id, secret);
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
    if (!booking) {
      return { status: 404, json: { success: false, error: 'Agendamento não encontrado.' } };
    }
    const nowIso = new Date().toISOString();
    if (!Array.isArray(booking.history)) booking.history = [];
    const addMins = (hhmm, mins) => {
      const [h, m] = String(hhmm || '00:00').split(':').map(Number);
      const tot = (h || 0) * 60 + (m || 0) + (Number(mins) || 30);
      return `${String(Math.floor(tot / 60) % 24).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}`;
    };

    let msg = 'Solicitação registrada.';
    if (action === 'accept_proposal') {
      if (!booking.proposal) {
        return { status: 409, json: { success: false, error: 'Não há proposta de novo horário pendente.' } };
      }
      const prop = booking.proposal;
      booking.rescheduledFrom = { date: booking.date, startTime: booking.startTime };
      booking.date = prop.date;
      booking.startTime = prop.time;
      booking.endTime = addMins(prop.time, booking.durationMinutes || 30);
      booking.proposal = null;
      booking.rescheduleRequest = null;
      booking.status =
        booking.payment?.status === 'approved' || booking.payment?.status === 'manual_confirmed'
          ? 'confirmada'
          : 'aguardando_pagamento';
      booking.history.push({
        at: nowIso,
        action: 'proposta_aceita',
        note: `Cliente aceitou proposta de novo horário via Minha Conta: ${prop.date} às ${prop.time}.`,
        author: 'client',
      });
      msg = `Novo horário confirmado: ${String(prop.date).split('-').reverse().join('/')} às ${prop.time}.`;
    } else if (action === 'decline_proposal') {
      if (!booking.proposal) {
        return { status: 409, json: { success: false, error: 'Não há proposta pendente para recusar.' } };
      }
      const prop = booking.proposal;
      booking.proposal = null;
      booking.rescheduleRequest = null;
      booking.status =
        booking.payment?.status === 'approved' || booking.payment?.status === 'manual_confirmed'
          ? 'confirmada'
          : 'aguardando_pagamento';
      booking.history.push({
        at: nowIso,
        action: 'proposta_recusada',
        note: `Cliente recusou proposta (${prop.date} às ${prop.time}) via Minha Conta. Horário original mantido.`,
        author: 'client',
      });
      msg = 'Proposta recusada. Seu horário original permanece mantido.';
    } else if (action === 'request_reschedule') {
      booking.status = 'reagendamento_pendente';
      booking.rescheduleRequest = {
        note: reason || 'Cliente solicitou reagendamento via Minha Conta.',
        requestedAt: nowIso,
        by: 'client',
      };
      booking.history.push({
        at: nowIso,
        action: 'solicitacao_reagendamento',
        note: reason || 'Cliente solicitou reagendamento via Minha Conta.',
        author: 'client',
      });
      msg = 'Solicitação de reagendamento enviada. A Nua enviará uma proposta de novo horário por aqui.';
    } else if (action === 'request_cancel') {
      const wasPaid =
        booking.payment?.status === 'approved' ||
        booking.payment?.status === 'manual_confirmed' ||
        booking.status === 'confirmada';
      if (wasPaid) {
        booking.status = 'reagendamento_pendente';
        booking.cancellationReason = reason || 'Cancelamento solicitado pelo cliente via Minha Conta';
        booking.cancellation = {
          state: 'requested',
          by: 'client',
          reason: booking.cancellationReason,
          details: reason || '',
          requestedAt: nowIso,
          previousStatus: 'confirmada',
          refundStatus: 'undecided',
        };
        booking.history.push({
          at: nowIso,
          action: 'cancelamento_solicitado',
          note: booking.cancellationReason,
          author: 'client',
        });
        msg = 'Solicitação de cancelamento enviada para análise da Nua Borges. Você acompanhará a decisão e o reembolso aqui.';
      } else {
        booking.status = 'cancelada';
        booking.cancelledBy = 'client';
        booking.cancellationReason = reason || 'Cancelado pelo cliente via Minha Conta';
        if (booking.meeting) booking.meeting.visibleToClient = false;
        booking.history.push({
          at: nowIso,
          action: 'cancelamento_cliente',
          note: booking.cancellationReason,
          author: 'client',
        });
        msg = 'Reserva cancelada com sucesso.';
      }
    } else {
      return { status: 400, json: { success: false, error: 'Ação inválida.' } };
    }
    booking.updatedAt = nowIso;
    localAppointments[appointmentId] = booking;
    writeLocalJson('local_appointments.json', localAppointments);
    return { status: 200, json: { success: true, status: booking.status, message: msg } };
  }

  if (pathname === '/api/me/bind-order' && method === 'POST') {
    const orderId = String(body?.orderId || '').trim();
    const token = String(body?.token || '').trim();
    if (!orderId || !token || token.length < 8) {
      return { status: 400, json: { success: false, error: 'Informe orderId e token válidos.' } };
    }
    const localAppointments = readLocalJson('local_appointments.json', {});
    const localPersonalizados = readLocalJson('local_personalizados.json', {});
    const localOrders = readLocalJson('local_orders.json', {});

    let kind = 'pack';
    let expectedToken = '';
    let isPaid = false;
    let resourceId = orderId;
    let title = orderId;

    if (orderId.startsWith('book_') || orderId.startsWith('apt_')) {
      kind = 'vip';
      const row = localAppointments[orderId];
      if (!row) return { status: 404, json: { success: false, error: 'Reserva não encontrada.' } };
      expectedToken = String(row.publicToken || '');
      isPaid = normalizeFin(row.payment?.status || row.status).status === 'paid';
      resourceId = row.modalityId || row.id;
      title = row.modalityName || 'Chamada VIP';
    } else if (orderId.startsWith('ped_') || orderId.startsWith('pers_')) {
      kind = 'custom';
      const row = localPersonalizados[orderId];
      if (!row) return { status: 404, json: { success: false, error: 'Encomenda não encontrada.' } };
      expectedToken = String(row.publicToken || '');
      isPaid = normalizeFin(row.payment?.status || row.status).status === 'paid';
      resourceId = row.id;
      title = `Personalizado (${row.photoCount || 0} fotos)`;
    } else {
      const row = localOrders[orderId];
      if (!row) return { status: 404, json: { success: false, error: 'Pedido não encontrado.' } };
      expectedToken = String(row.purchaseToken || '');
      isPaid = normalizeFin(row.status).status === 'paid';
      resourceId = row.slug || row.orderId || orderId;
      title = row.title || resourceId;
    }

    if (!expectedToken || !timingSafeStr(expectedToken, token)) {
      return { status: 403, json: { success: false, error: 'Token não corresponde ao pedido.' } };
    }

    const existingClaim = await kvGet(sb, `nua_id:claim:${orderId}`);
    if (existingClaim && existingClaim.profileId !== ctx.profile.id) {
      return { status: 409, json: { success: false, error: 'Este pedido já pertence a outra conta NUA ID.' } };
    }

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
    if (isPaid && kind === 'pack') {
      const ents = (await kvGet(sb, `nua_id:entitlements:${ctx.profile.id}`)) || [];
      if (!ents.some((e) => e.orderRef === orderId)) {
        ents.unshift({
          id: crypto.randomUUID(),
          profileId: ctx.profile.id,
          orderRef: orderId,
          kind: 'pack',
          resourceId,
          title,
          grantedAt: nowIso,
          expiresAt: null,
          allowDownload: false,
        });
        await kvSet(sb, `nua_id:entitlements:${ctx.profile.id}`, ents);
      }
    }
    return { status: 200, json: { success: true, orderRef: orderId, bound: true, alreadyBound: Boolean(existingClaim) } };
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

    if (paid && kind === 'pack') {
      const ents = (await kvGet(sb, `nua_id:entitlements:${ctx.profile.id}`)) || [];
      if (!ents.some((e) => e.orderRef === orderId)) {
        ents.unshift({
          id: crypto.randomUUID(),
          profileId: ctx.profile.id,
          orderRef: orderId,
          kind: 'pack',
          resourceId: slug || orderId,
          title: title || slug || orderId,
          grantedAt: nowIso,
          expiresAt: null,
          allowDownload: false,
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

export async function resolveLocalCustomerProfile(req, env) {
  try {
    const sb = getSb(env);
    if (!sb) return null;
    const ctx = await resolveSession(req, sb, getSecret(env));
    return ctx?.profile || null;
  } catch {
    return null;
  }
}

export function verifyLocalSignedMediaUrl(pathname, searchParams, env) {
  try {
    const exp = Number.parseInt(searchParams.get('exp') || '0', 10);
    const pid = searchParams.get('pid') || '';
    const dl = searchParams.get('dl') === '1' ? '1' : '0';
    const sig = searchParams.get('sig') || '';
    if (!exp || !pid || !sig) return { valid: false, download: false };
    if (Math.floor(Date.now() / 1000) > exp) return { valid: false, download: false };
    const secret = getSecret(env);
    const expected = crypto.createHmac('sha256', secret).update(`v1|${pathname}|${pid}|${exp}|${dl}`).digest('hex');
    return { valid: timingSafeStr(sig, expected), download: dl === '1' };
  } catch {
    return { valid: false, download: false };
  }
}

export async function linkManualOrderByEmail(env, orderId, rawEmail) {
  try {
    const sb = getSb(env);
    const email = normEmail(rawEmail);
    if (!sb || !orderId || !isValidEmail(email)) return false;
    const idx = await kvGet(sb, `nua_id:email:${email}`);
    if (!idx?.profileId) return false;
    const profile = await kvGet(sb, `nua_id:profile:${idx.profileId}`);
    if (!profile || profile.status !== 'active') return false;
    const nowIso = new Date().toISOString();
    await kvSet(sb, `nua_id:claim:${orderId}`, {
      orderRef: orderId,
      profileId: profile.id,
      claimedAt: nowIso,
      method: 'admin_manual_booking',
    });
    const refs = (await kvGet(sb, `nua_id:profile_orders:${profile.id}`)) || [];
    if (!refs.includes(orderId)) {
      refs.unshift(orderId);
      await kvSet(sb, `nua_id:profile_orders:${profile.id}`, refs);
    }
    return true;
  } catch {
    return false;
  }
}

export async function syncLocalPersonalizadoDelivery(env, order) {
  try {
    const sb = getSb(env);
    if (!sb || !order?.id) return false;
    if (!['pronto', 'entregue'].includes(order.status)) return false;
    const claim = await kvGet(sb, `nua_id:claim:${order.id}`);
    if (!claim?.profileId) return false;
    const ents = (await kvGet(sb, `nua_id:entitlements:${claim.profileId}`)) || [];
    if (!ents.some((e) => e.orderRef === order.id)) {
      ents.unshift({
        id: crypto.randomUUID(),
        profileId: claim.profileId,
        orderRef: order.id,
        kind: 'custom',
        resourceId: order.id,
        title: `Personalizado (${order.photoCount || 0} fotos)`,
        grantedAt: new Date().toISOString(),
        expiresAt: null,
        allowDownload: true,
      });
      await kvSet(sb, `nua_id:entitlements:${claim.profileId}`, ents);
    }
    return true;
  } catch {
    return false;
  }
}
