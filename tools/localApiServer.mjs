/**
 * Centralized Local API Dev Server — Nua Borges Platform
 *
 * Fornece API HTTP local completa para pagamentos Mercado Pago e agendamentos
 * durante o desenvolvimento local (sem depender de deploy externo ou portas caídas).
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import tls from 'node:tls';
import crypto from 'node:crypto';
import { applyContentOps, snapshotForPrompt } from '../lib/nuaAi/contentOps.mjs';
import { assistantChat } from '../lib/nuaAi/adminAssistant.mjs';
import { createAssistantServices } from '../lib/nuaAi/assistantServices.mjs';

function resolveFullEnv() {
  const env = { ...process.env };
  for (const envFile of ['.dev.vars', '.env.local', '.env']) {
    try {
      const p = path.join(process.cwd(), envFile);
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf-8');
        for (const line of content.split('\n')) {
          const m = line.match(/^([^#=]+)=(.*)$/);
          if (m) {
            const k = m[1].trim();
            const v = m[2].trim();
            if (!env[k]) env[k] = v;
          }
        }
      }
    } catch {}
  }
  return env;
}

function resolveSmtpCredentials() {
  let user = process.env.SMTP_USER || process.env.HOSTINGER_EMAIL_USER || 'contato@nuaborges.com.br';
  let pass = process.env.SMTP_PASS || process.env.HOSTINGER_EMAIL_PASS || '';
  let host = process.env.SMTP_SERVER || 'smtp.hostinger.com';
  let port = parseInt(process.env.SMTP_PORT || '465', 10);

  if (!pass) {
    for (const envFile of ['.dev.vars', '.env.local', '.env']) {
      try {
        const p = path.join(process.cwd(), envFile);
        if (fs.existsSync(p)) {
          const content = fs.readFileSync(p, 'utf-8');
          const passMatch = content.match(/^(?:SMTP_PASS|HOSTINGER_EMAIL_PASS)=(.+)$/m);
          if (passMatch && passMatch[1]) pass = passMatch[1].trim();
          const userMatch = content.match(/^(?:SMTP_USER|HOSTINGER_EMAIL_USER)=(.+)$/m);
          if (userMatch && userMatch[1]) user = userMatch[1].trim();
        }
      } catch {}
    }
  }

  return { host, port, user, pass };
}

function sendHostingerSmtpEmail({ host = 'smtp.hostinger.com', port = 465, user, pass, to, subject, html }) {
  return new Promise((resolve) => {
    if (!user || !pass) {
      console.warn('[Hostinger SMTP] ⚠️ Senha da caixa de e-mail (SMTP_PASS) não encontrada no .dev.vars.');
      return resolve(false);
    }

    const socket = tls.connect({ host, port, rejectUnauthorized: false }, () => {
      let step = 0;
      const send = (cmd) => socket.write(cmd + '\r\n');

      socket.on('data', (data) => {
        const msg = data.toString();
        const code = msg.substring(0, 3);

        if (step === 0 && code === '220') {
          step = 1;
          send('EHLO nuaborges.com.br');
        } else if (step === 1 && code === '250') {
          step = 2;
          const authString = Buffer.from(`\0${user}\0${pass}`).toString('base64');
          send(`AUTH PLAIN ${authString}`);
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
            `From: Nua Borges VIP <${user}>`,
            `To: <${to}>`,
            `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=utf-8',
            '',
            html,
            '.'
          ].join('\r\n');
          send(mime);
        } else if (step === 6 && code === '250') {
          step = 7;
          send('QUIT');
          console.log(`[Hostinger SMTP Success] 📧 E-mail entregue com sucesso via Hostinger para ${to}!`);
          resolve(true);
        } else if (code.startsWith('4') || code.startsWith('5')) {
          console.error('[Hostinger SMTP Error]:', msg.trim());
          socket.end();
          resolve(false);
        }
      });
    });

    socket.on('error', (err) => {
      console.error('[Hostinger Socket Error]:', err.message);
      resolve(false);
    });

    socket.setTimeout(12000, () => {
      socket.end();
      resolve(false);
    });
  });
}

function resolveMpAccessToken() {
  if (process.env.MP_ACCESS_TOKEN && process.env.MP_ACCESS_TOKEN.trim()) {
    return process.env.MP_ACCESS_TOKEN.trim();
  }
  for (const envFile of ['.dev.vars', '.env.local', '.env']) {
    try {
      const p = path.join(process.cwd(), envFile);
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf-8');
        const match = content.match(/^MP_ACCESS_TOKEN=(.+)$/m);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    } catch {}
  }
  return '';
}

const PORT = 3105;
const MP_ACCESS_TOKEN = resolveMpAccessToken();
const IS_TEST_MODE = true; // Em localhost, pagamentos são simulados para testes seguros sem cobrança real

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const ORDERS_FILE = path.join(DATA_DIR, 'local_orders.json');
const APPOINTMENTS_FILE = path.join(DATA_DIR, 'local_appointments.json');
const APPOINTMENTS_CONFIG_FILE = path.join(DATA_DIR, 'local_appointments_config.json');
const FINANCE_FILE = path.join(DATA_DIR, 'local_finance_installments.json');
const PERSONALIZADOS_FILE = path.join(DATA_DIR, 'local_personalizados.json');
const PERSONALIZADOS_SETTINGS_FILE = path.join(DATA_DIR, 'local_personalizados_settings.json');
const REQUESTS_FILE = path.join(DATA_DIR, 'local_requests.json');

function loadJson(file, def = {}) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
  } catch {}
  return def;
}

function saveJson(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[LocalApiServer] Erro ao salvar ${file}:`, err);
  }
}

// ---------------------------------------------------------------------------
// Chamadas por vídeo: configurações canônicas (espelham lib/appointments/types.ts)
// O painel admin consome exatamente este formato; qualquer payload parcial é
// mesclado com os defaults para nunca quebrar a UI.
// ---------------------------------------------------------------------------
const APPOINTMENTS_TIMEZONE = 'America/Sao_Paulo';

const DEFAULT_APPOINTMENT_SETTINGS = {
  timezone: APPOINTMENTS_TIMEZONE,
  bufferMinutes: 15,
  minNoticeHours: 4,
  maxFutureDays: 30,
  autoCancelPendingMinutes: 15,
  weeklyHours: {
    0: { enabled: false, ranges: [] },
    1: { enabled: true, ranges: [{ start: '14:00', end: '21:00' }] },
    2: { enabled: true, ranges: [{ start: '14:00', end: '21:00' }] },
    3: { enabled: true, ranges: [{ start: '14:00', end: '21:00' }] },
    4: { enabled: true, ranges: [{ start: '14:00', end: '21:00' }] },
    5: { enabled: true, ranges: [{ start: '14:00', end: '22:00' }] },
    6: { enabled: true, ranges: [{ start: '15:00', end: '21:00' }] },
  },
  blockedDates: [],
  blockedSlots: [],
  meetingPlatform: 'google_meet',
  customMeetingInstructions:
    'A chamada será realizada em sala privativa segura. O link direto de acesso fica disponível no seu voucher após a confirmação.',
  pixKey: '44521360000109',
  pixReceiverName: 'NB PRODUCOES DIGITAIS',
  pixCity: 'BRASILIA',
};

const DEFAULT_APPOINTMENT_MODALITIES = [
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

/** Mescla configurações recebidas/armazenadas com os defaults canônicos. */
function normalizeAppointmentSettings(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const weeklyHours = {};
  for (let day = 0; day <= 6; day += 1) {
    const incoming = source.weeklyHours?.[day] ?? source.weeklyHours?.[String(day)];
    const fallback = DEFAULT_APPOINTMENT_SETTINGS.weeklyHours[day];
    weeklyHours[day] = {
      enabled: typeof incoming?.enabled === 'boolean' ? incoming.enabled : fallback.enabled,
      ranges: Array.isArray(incoming?.ranges)
        ? incoming.ranges
            .filter((r) => r && typeof r.start === 'string' && typeof r.end === 'string')
            .map((r) => ({ start: r.start, end: r.end }))
        : fallback.ranges.map((r) => ({ ...r })),
    };
  }

  return {
    timezone: source.timezone || DEFAULT_APPOINTMENT_SETTINGS.timezone,
    bufferMinutes: Number.isFinite(Number(source.bufferMinutes))
      ? Number(source.bufferMinutes)
      : DEFAULT_APPOINTMENT_SETTINGS.bufferMinutes,
    minNoticeHours: Number.isFinite(Number(source.minNoticeHours))
      ? Number(source.minNoticeHours)
      : Number.isFinite(Number(source.advanceNoticeHours))
        ? Number(source.advanceNoticeHours)
        : DEFAULT_APPOINTMENT_SETTINGS.minNoticeHours,
    maxFutureDays: Number.isFinite(Number(source.maxFutureDays))
      ? Number(source.maxFutureDays)
      : Number.isFinite(Number(source.maxAdvanceDays))
        ? Number(source.maxAdvanceDays)
        : DEFAULT_APPOINTMENT_SETTINGS.maxFutureDays,
    autoCancelPendingMinutes: Number.isFinite(Number(source.autoCancelPendingMinutes))
      ? Number(source.autoCancelPendingMinutes)
      : DEFAULT_APPOINTMENT_SETTINGS.autoCancelPendingMinutes,
    weeklyHours,
    blockedDates: Array.isArray(source.blockedDates) ? source.blockedDates.filter((d) => typeof d === 'string') : [],
    blockedSlots: Array.isArray(source.blockedSlots) ? source.blockedSlots : [],
    meetingPlatform: ['google_meet', 'jitsi', 'custom'].includes(source.meetingPlatform)
      ? source.meetingPlatform
      : DEFAULT_APPOINTMENT_SETTINGS.meetingPlatform,
    customMeetingInstructions:
      typeof source.customMeetingInstructions === 'string'
        ? source.customMeetingInstructions
        : DEFAULT_APPOINTMENT_SETTINGS.customMeetingInstructions,
    pixKey: typeof source.pixKey === 'string' ? source.pixKey : DEFAULT_APPOINTMENT_SETTINGS.pixKey,
    pixReceiverName:
      typeof source.pixReceiverName === 'string'
        ? source.pixReceiverName
        : DEFAULT_APPOINTMENT_SETTINGS.pixReceiverName,
    pixCity: typeof source.pixCity === 'string' ? source.pixCity : DEFAULT_APPOINTMENT_SETTINGS.pixCity,
  };
}

/**
 * Mescla uma alteração parcial sobre as configurações JÁ GRAVADAS (nunca sobre
 * os defaults). Enviar só a segunda-feira não pode reabrir os outros dias.
 */
function mergeAppointmentSettings(current, patch) {
  const base = normalizeAppointmentSettings(current);
  const incoming = patch && typeof patch === 'object' ? patch : {};
  const merged = { ...base };

  if (typeof incoming.timezone === 'string' && incoming.timezone) merged.timezone = incoming.timezone;

  const numeric = [
    ['bufferMinutes', incoming.bufferMinutes],
    ['minNoticeHours', incoming.minNoticeHours ?? incoming.advanceNoticeHours],
    ['maxFutureDays', incoming.maxFutureDays ?? incoming.maxAdvanceDays],
    ['autoCancelPendingMinutes', incoming.autoCancelPendingMinutes],
  ];
  for (const [field, value] of numeric) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) merged[field] = parsed;
  }

  if (incoming.weeklyHours && typeof incoming.weeklyHours === 'object') {
    const weekly = { ...base.weeklyHours };
    for (let day = 0; day <= 6; day += 1) {
      const dayPatch = incoming.weeklyHours[day] ?? incoming.weeklyHours[String(day)];
      if (!dayPatch || typeof dayPatch !== 'object') continue;
      const previous = weekly[day] || { enabled: false, ranges: [] };
      weekly[day] = {
        enabled: typeof dayPatch.enabled === 'boolean' ? dayPatch.enabled : previous.enabled,
        ranges: Array.isArray(dayPatch.ranges)
          ? dayPatch.ranges
              .filter((r) => r && typeof r.start === 'string' && typeof r.end === 'string')
              .map((r) => ({ start: r.start, end: r.end }))
          : previous.ranges.map((r) => ({ ...r })),
      };
    }
    merged.weeklyHours = weekly;
  }

  if (Array.isArray(incoming.blockedDates)) {
    merged.blockedDates = incoming.blockedDates.filter((d) => typeof d === 'string');
  }
  if (Array.isArray(incoming.blockedSlots)) merged.blockedSlots = incoming.blockedSlots;
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

/** Garante que cada modalidade tenha todos os campos canônicos. */
function normalizeAppointmentModalities(raw) {
  const list = Array.isArray(raw) ? raw : [];
  if (list.length === 0) {
    return DEFAULT_APPOINTMENT_MODALITIES.map((m) => ({ ...m, rules: [...m.rules] }));
  }
  return list.map((m, index) => ({
    id: String(m?.id || `chamada-${index + 1}`),
    name: String(m?.name || 'Chamada'),
    description: String(m?.description || ''),
    durationMinutes: Number.isFinite(Number(m?.durationMinutes)) ? Number(m.durationMinutes) : 30,
    price: Number.isFinite(Number(m?.price)) ? Number(m.price) : 0,
    priceFormatted:
      typeof m?.priceFormatted === 'string' && m.priceFormatted
        ? m.priceFormatted
        : `R$ ${(Number(m?.price) || 0).toFixed(2).replace('.', ',')}`,
    active: m?.active !== false,
    minNoticeHours: Number.isFinite(Number(m?.minNoticeHours))
      ? Number(m.minNoticeHours)
      : DEFAULT_APPOINTMENT_SETTINGS.minNoticeHours,
    rules: Array.isArray(m?.rules) ? m.rules.filter((r) => typeof r === 'string') : [],
    clientInstructions: String(m?.clientInstructions || ''),
    order: Number.isFinite(Number(m?.order)) ? Number(m.order) : index + 1,
  }));
}

// ---------------------------------------------------------------------------
// Disponibilidade pública (espelha lib/appointments/availabilityEngine.ts)
// Usa SEMPRE a configuração persistida — é o que faz a página pública refletir
// imediatamente o que a administradora salva no painel.
// ---------------------------------------------------------------------------
const APPOINTMENTS_TZ = 'America/Sao_Paulo';

function timeToMinutes(time) {
  const [h, m] = String(time || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function getBrasiliaNow(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: APPOINTMENTS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const part = (type) => parts.find((p) => p.type === type)?.value || '0';
  const year = Number(part('year'));
  const month = Number(part('month'));
  const day = Number(part('day'));
  const hour = Number(part('hour'));
  const minute = Number(part('minute'));
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
  return {
    year,
    month,
    day,
    hour,
    minute,
    dayOfWeek,
    dateString: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
}

function computeLocalAvailableSlots(dateStr, modality, settings, bookings, currentDate = new Date()) {
  if (!modality || modality.active === false) return [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))) return [];

  const now = getBrasiliaNow(currentDate);
  if (dateStr < now.dateString) return [];

  const maxDate = new Date(currentDate);
  maxDate.setDate(maxDate.getDate() + (Number(settings.maxFutureDays) || 30));
  if (dateStr > getBrasiliaNow(maxDate).dateString) return [];

  if ((settings.blockedDates || []).includes(dateStr)) return [];

  const [y, m, d] = dateStr.split('-').map(Number);
  const dayOfWeek = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
  const daySchedule = settings.weeklyHours?.[dayOfWeek];
  if (!daySchedule?.enabled || !daySchedule.ranges?.length) return [];

  const duration = Number(modality.durationMinutes) || 30;
  const buffer = Number(settings.bufferMinutes) || 0;
  const minNotice = Math.max(Number(settings.minNoticeHours) || 0, Number(modality.minNoticeHours) || 0);
  const nowIso = currentDate.toISOString();

  const activeBookings = (bookings || []).filter((b) => {
    if (b.date !== dateStr || b.status === 'cancelada') return false;
    if (b.status === 'aguardando_pagamento' && b.expiresAt && b.expiresAt < nowIso) return false;
    return true;
  });
  const dayBlockedSlots = (settings.blockedSlots || []).filter((b) => b.date === dateStr);

  const slots = [];
  for (const range of daySchedule.ranges) {
    const rangeStart = timeToMinutes(range.start);
    const rangeEnd = timeToMinutes(range.end);
    const step = duration <= 30 ? 15 : 30;

    for (let start = rangeStart; start + duration <= rangeEnd; start += step) {
      const end = start + duration;

      if (dateStr === now.dateString && start < now.hour * 60 + now.minute + minNotice * 60) continue;

      const conflict = activeBookings.some(
        (b) =>
          start < timeToMinutes(b.endTime) + buffer &&
          end + buffer > timeToMinutes(b.startTime)
      );
      if (conflict) continue;

      const blocked = dayBlockedSlots.some(
        (b) => start < timeToMinutes(b.end) && end > timeToMinutes(b.start)
      );
      if (blocked) continue;

      slots.push(minutesToTime(start));
    }
  }

  return [...new Set(slots)];
}

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const AUDIT_LOG_FILE = path.join(DATA_DIR, 'admin_audit_log.jsonl');
const MAX_JSON_BODY_BYTES = 1024 * 1024; // 1MB para payloads JSON
const MAX_MEDIA_BYTES = 25 * 1024 * 1024; // mesmo limite do plano local (uploads de vídeo)

// Identificador curto por requisição: permite correlacionar erro no log do servidor
// sem jamais expor stack trace, caminho de arquivo ou detalhe interno ao navegador.
function newRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Allowlist de origens para o servidor local de desenvolvimento.
 * O reflexo cego de `Origin` com `credentials: true` permitiria que qualquer site
 * fizesse chamadas autenticadas ao servidor local — daí a lista fixa abaixo.
 */
function resolveCorsOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return null;
  try {
    const url = new URL(origin);
    const isLoopback =
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' ||
        url.hostname === '127.0.0.1' ||
        url.hostname === '[::1]' ||
        url.hostname.endsWith('.local'));
    return isLoopback ? origin : null;
  } catch {
    return null;
  }
}

// === Validação de mídia (espelha functions/api/_security.ts) ===
// Mantida em sincronia manual com a fonte de verdade usada em produção.

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/ogg',
  'audio/flac',
];

function isValidObjectKey(key) {
  if (!key || typeof key !== 'string') return false;
  if (key.length > 512 || key.length < 5) return false;
  if (key.includes('..') || key.includes('\0') || key.includes('//') || key.startsWith('/') || key.endsWith('/')) {
    return false;
  }
  if (!key.startsWith('media/') && !key.startsWith('audio/')) return false;
  return /^[a-zA-Z0-9_\-\.\/]+$/.test(key);
}

function isExtensionMatchingMime(key, mime) {
  const ext = (key.toLowerCase().split('.').pop() || '') + '';
  const map = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/webp': ['webp'],
    'image/avif': ['avif'],
    'video/mp4': ['mp4', 'm4v', 'mov'],
    'video/quicktime': ['mov', 'mp4', 'm4v'],
    'video/webm': ['webm', 'mkv'],
    'audio/mpeg': ['mp3'],
    'audio/wav': ['wav'],
    'audio/mp4': ['m4a', 'aac', 'mp4'],
    'audio/ogg': ['ogg'],
    'audio/flac': ['flac'],
  };
  const allowed = map[mime];
  if (!allowed) return true;
  return allowed.includes(ext);
}

function verifyMagicBytes(bytes) {
  if (!bytes || bytes.length < 12) {
    return { valid: false, error: 'Arquivo muito pequeno ou cabeçalho inválido.' };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { valid: true, detectedMime: 'image/jpeg' };
  }
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return { valid: true, detectedMime: 'image/png' };
  }
  const isRiff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (isRiff && isWebp) return { valid: true, detectedMime: 'image/webp' };
  const isWave = bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45;
  if (isRiff && isWave) return { valid: true, detectedMime: 'audio/wav' };
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return { valid: true, detectedMime: 'video/webm' };
  }

  const maxScan = Math.min(bytes.length - 3, 128);
  let hasFtyp = false;
  let hasMoovOrMdat = false;
  let isQuickTimeBrand = false;
  let isAudioBrand = false;
  for (let i = 0; i < maxScan; i++) {
    const tag = String.fromCharCode(bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3]);
    if (tag === 'ftyp') {
      hasFtyp = true;
      if (i + 7 < bytes.length) {
        const brand = String.fromCharCode(bytes[i + 4], bytes[i + 5], bytes[i + 6], bytes[i + 7]);
        if (brand === 'qt  ' || brand === 'moov') isQuickTimeBrand = true;
        else if (brand === 'M4A ' || brand === 'M4B ' || brand === 'f4v ') isAudioBrand = true;
      }
    } else if (tag === 'moov' || tag === 'mdat' || tag === 'wide' || tag === 'free' || tag === 'skip' || tag === 'qt  ') {
      hasMoovOrMdat = true;
    }
  }
  if (hasFtyp || hasMoovOrMdat) {
    if (isAudioBrand) return { valid: true, detectedMime: 'audio/mp4' };
    if (isQuickTimeBrand) return { valid: true, detectedMime: 'video/quicktime' };
    return { valid: true, detectedMime: 'video/mp4' };
  }

  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return { valid: true, detectedMime: 'audio/mpeg' };
  if (bytes[0] === 0xff && (bytes[1] === 0xfb || bytes[1] === 0xf3 || bytes[1] === 0xf2)) {
    return { valid: true, detectedMime: 'audio/mpeg' };
  }
  if (bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
    return { valid: true, detectedMime: 'audio/ogg' };
  }
  if (bytes[0] === 0x66 && bytes[1] === 0x4c && bytes[2] === 0x61 && bytes[3] === 0x43) {
    return { valid: true, detectedMime: 'audio/flac' };
  }
  return { valid: false, error: 'Assinatura binária (magic bytes) incompatível.' };
}

// === Auditoria local (JSONL lido por GET /api/nua-ai/audit-logs) ===

const SENSITIVE_DETAIL_KEYS = /(password|senha|secret|token|apikey|api_key|authorization|credential|cpf|private)/i;

function sanitizeAuditDetails(value, depth = 0) {
  if (depth > 4) return null;
  if (value === null) return null;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => sanitizeAuditDetails(v, depth + 1));
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_DETAIL_KEYS.test(k)) {
        out[k] = '[REDACTED]';
        continue;
      }
      out[k] = sanitizeAuditDetails(v, depth + 1);
    }
    return out;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.slice(0, 500);
  return null;
}

function appendAuditEvent(event) {
  const now = new Date();
  const record = {
    id: event.id || `aud_${now.getTime()}_${Math.random().toString(36).substring(2, 8)}`,
    timestamp: event.timestamp || now.toISOString(),
    type: String(event.type || 'GENERIC').slice(0, 80),
    severity: event.severity || 'info',
    actor: {
      ip: String(event.actor?.ip || '127.0.0.1').slice(0, 64),
      userAgent: String(event.actor?.userAgent || 'Desconhecido').slice(0, 200),
    },
    summary: String(event.summary || '').slice(0, 500),
    details: sanitizeAuditDetails(event.details || {}),
  };
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(AUDIT_LOG_FILE, `${JSON.stringify(record)}\n`, 'utf-8');
  } catch (err) {
    console.error(`[LocalApiServer][${record.id}] Falha ao gravar evento de auditoria:`, err.message);
  }
  return record;
}

function readAuditEvents(limit = 500) {
  try {
    if (!fs.existsSync(AUDIT_LOG_FILE)) return [];
    const lines = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8').trim().split('\n').filter(Boolean);
    return lines
      .slice(-limit)
      .reverse()
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function clientIpOf(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket.remoteAddress || '127.0.0.1';
}

const EXT_CONTENT_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
};

/**
 * Varre `public/media` e devolve um inventário no mesmo formato do endpoint de
 * produção (`{ items: [{ key, sizeBytes, uploadedAt, contentType, url, isVideo }] }`).
 */
function listLocalMedia(limit) {
  const root = path.join(PUBLIC_DIR, 'media');
  const items = [];

  const walk = (dir, depth) => {
    if (depth > 8 || items.length >= limit) return;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (items.length >= limit) return;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, depth + 1);
        continue;
      }
      if (!entry.isFile()) continue;
      const rel = path.relative(PUBLIC_DIR, full).split(path.sep).join('/');
      let stat;
      try {
        stat = fs.statSync(full);
      } catch {
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase().replace('.', '');
      const isVideo = ['mp4', 'm4v', 'mov', 'webm', 'mkv'].includes(ext);
      items.push({
        key: rel,
        sizeBytes: stat.size,
        uploadedAt: stat.mtime.toISOString(),
        contentType: EXT_CONTENT_TYPES[ext] || (isVideo ? 'video/mp4' : 'application/octet-stream'),
        url: `/${rel}`,
        isVideo,
      });
    }
  };

  walk(root, 0);
  return items.sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)));
}

/** Caminho absoluto seguro dentro de public/ — bloqueia path traversal. */
function resolvePublicPath(key) {
  const target = path.resolve(PUBLIC_DIR, key);
  const root = path.resolve(PUBLIC_DIR) + path.sep;
  return target.startsWith(root) ? target : null;
}

/** Lê o corpo binário com limite de tamanho; retorna null quando excede. */
function readBinaryBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let overflow = false;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        overflow = true;
        chunks.length = 0;
        return;
      }
      chunks.push(chunk);
    });
    // Em caso de estouro apenas descartamos o payload (mantendo o consumo do stream
    // para que o cliente receba a resposta 413 em vez de uma quebra de conexão).
    req.on('end', () => resolve(overflow ? null : Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Mídia remota (B2/S3) — somente para desenvolvimento local
//
// Em produção as rotas /media/* e /audio/* são atendidas pelas Cloudflare Pages
// Functions (functions/media/[[path]].ts e functions/audio/[[path]].ts). Em dev os
// arquivos publicados não existem em public/, então o servidor local baixa o
// objeto do bucket (credenciais ficam apenas no processo do servidor) e o
// cacheia em disco para as próximas requisições serem servidas pelo Next.
// ---------------------------------------------------------------------------

const AUDIO_EXT_CONTENT_TYPES = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
  webm: 'audio/webm',
};

/** Teto de memória para objetos remotos lidos de uma vez (dev). */
const MAX_REMOTE_MEDIA_BYTES = 200 * 1024 * 1024;

let s3ModulePromise = null;
let remoteMediaClientPromise = null;
let remoteMediaClientSignature = null;

function loadS3Module() {
  if (!s3ModulePromise) {
    s3ModulePromise = import('@aws-sdk/client-s3');
  }
  return s3ModulePromise;
}

/**
 * Monta o cliente S3/B2 sob demanda a partir de .dev.vars / .env.local.
 * Retorna null quando o armazenamento remoto não está configurado.
 * As credenciais nunca saem deste processo.
 */
async function getRemoteMediaClient(env) {
  const accessKeyId = env.B2_APPLICATION_KEY_ID || env.S3_ACCESS_KEY_ID || '';
  const secretAccessKey = env.B2_APPLICATION_KEY || env.S3_SECRET_ACCESS_KEY || '';
  const endpoint = env.B2_ENDPOINT || env.S3_ENDPOINT || '';
  const region = env.B2_REGION || env.S3_REGION || 'us-east-005';
  const bucket = env.B2_BUCKET_NAME || env.S3_BUCKET_NAME || env.S3_BUCKET || '';

  if (!accessKeyId || !secretAccessKey || !endpoint || !bucket) return null;

  const signature = `${endpoint}|${bucket}|${accessKeyId}`;
  if (remoteMediaClientPromise && remoteMediaClientSignature === signature) {
    return remoteMediaClientPromise;
  }

  remoteMediaClientSignature = signature;
  remoteMediaClientPromise = loadS3Module()
    .then(({ S3Client }) =>
      new S3Client({
        region,
        endpoint,
        forcePathStyle: true,
        credentials: { accessKeyId, secretAccessKey },
      }),
    )
    .catch((err) => {
      console.error('[LocalApiServer] Falha ao carregar cliente S3:', err.message);
      remoteMediaClientPromise = null;
      remoteMediaClientSignature = null;
      return null;
    });

  return remoteMediaClientPromise;
}

/** Content-Type seguro derivado da extensão (fallback: MIME informado pelo bucket). */
function resolveMediaContentType(key, remoteMime) {
  const ext = String(key.split('.').pop() || '').toLowerCase();
  const byExt = EXT_CONTENT_TYPES[ext] || AUDIO_EXT_CONTENT_TYPES[ext];
  if (byExt) return byExt;
  const mime = String(remoteMime || '').split(';')[0].trim().toLowerCase();
  return ALLOWED_MIME_TYPES.includes(mime) ? mime : null;
}

/** Baixa um objeto do bucket. Devolve null quando o storage remoto não está configurado. */
async function fetchRemoteMedia(key, env) {
  const client = await getRemoteMediaClient(env);
  if (!client) return null;
  const { GetObjectCommand } = await loadS3Module();
  const bucket = env.B2_BUCKET_NAME || env.S3_BUCKET_NAME || env.S3_BUCKET || '';
  const out = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = Buffer.from(await out.Body.transformToByteArray());
  return { bytes, contentType: String(out.ContentType || '') };
}

/** Envia bytes com cabeçalhos equivalentes aos de produção (cache público + nosniff). */
function sendMediaBytes(req, res, bytes, contentType, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Content-Length': String(bytes.byteLength),
    'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
    'X-Content-Type-Options': 'nosniff',
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  res.end(bytes);
}

// ---------------------------------------------------------------------------
// Autenticação local (espelha functions/api/auth/*)
// - Comparação em tempo constante das senhas
// - Rate limiting por IP (5 tentativas / 15 min)
// - Sessões opacas em memória (só existe este processo)
// ---------------------------------------------------------------------------

const AUTH_RATE_LIMIT_MAX_ATTEMPTS = 5;
const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const authRateLimits = new Map();
const adminSessions = new Map();

function timingSafeEqualString(a, b) {
  const left = crypto.createHash('sha256').update(String(a ?? ''), 'utf8').digest();
  const right = crypto.createHash('sha256').update(String(b ?? ''), 'utf8').digest();
  return crypto.timingSafeEqual(left, right);
}

/** Devolve false quando o IP excedeu as tentativas; registra a primeira no window. */
function registerAuthAttempt(ip) {
  const now = Date.now();
  const record = authRateLimits.get(ip);
  if (!record || now > record.resetAt) {
    authRateLimits.set(ip, { count: 1, resetAt: now + AUTH_RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (record.count >= AUTH_RATE_LIMIT_MAX_ATTEMPTS) return false;
  record.count += 1;
  return true;
}

function clearAuthAttempts(ip) {
  authRateLimits.delete(ip);
}

/** Extrai o token de sessão administrativa (cookie, Bearer ou query). */
function readAdminToken(req, parsedUrl) {
  const cookie = String(req.headers.cookie || '');
  const match = /(?:^|;\s*)nua_admin_session=([A-Za-z0-9_-]+)/.exec(cookie);
  if (match) return match[1];
  const authHeader = String(req.headers.authorization || '');
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7).trim();
  return parsedUrl.searchParams.get('token') || '';
}

/** Cria uma sessão administrativa válida por 24h. */
function createAdminSession(role, sub) {
  const token = `adm_${crypto.randomBytes(24).toString('hex')}`;
  adminSessions.set(token, {
    role,
    sub,
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });
  return token;
}

/** Extrai o ID de vídeo do YouTube (espelha extractYouTubeId de oembed.ts). */
function extractYouTubeId(urlStr) {
  const match = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/.exec(urlStr);
  return match ? match[1] : null;
}

// Mapas em memória sincronizados com arquivo
let ordersStore = loadJson(ORDERS_FILE, {});
let appointmentsStore = loadJson(APPOINTMENTS_FILE, {});
let appointmentsConfigStore = loadJson(APPOINTMENTS_CONFIG_FILE, {});
if (!appointmentsConfigStore || typeof appointmentsConfigStore !== 'object') {
  appointmentsConfigStore = {};
}
let personalizadosStore = loadJson(PERSONALIZADOS_FILE, {});
let personalizadosSettingsStore = loadJson(PERSONALIZADOS_SETTINGS_FILE, null);
let otpStore = {};
let deviceStore = {};
let sessionStore = {};

function maskEmail(email) {
  if (!email || !email.includes('@')) return 'e***l@dominio.com';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user[0]}${user[1]}***${user[user.length - 1]}@${domain}`;
}

/**
 * Resolve a chave da API do Gemini a partir do ambiente ou dos arquivos .dev.vars / .env.local
 */
function resolveLocalGeminiApiKey() {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    return process.env.GEMINI_API_KEY.trim();
  }
  for (const envFile of ['.dev.vars', '.env.local']) {
    try {
      const p = path.join(process.cwd(), envFile);
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf-8');
        const match = content.match(/^GEMINI_API_KEY=(.+)$/m);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    } catch {}
  }
  return '';
}

const CANDIDATE_GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash-lite',
];

/**
 * Executa chamada real à API do Google Gemini com suporte a Tools (Function Calling)
 */
async function callGeminiApi({ systemInstruction, message, conversationHistory = [], tools = [] }) {
  const apiKey = resolveLocalGeminiApiKey();
  if (!apiKey) return null;

  const contents = [];
  if (Array.isArray(conversationHistory)) {
    for (const turn of conversationHistory.slice(-6)) {
      if (turn.role && turn.content) {
        contents.push({
          role: turn.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(turn.content) }],
        });
      }
    }
  }
  contents.push({
    role: 'user',
    parts: [{ text: message }],
  });

  const bodyPayload = {
    systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
    contents,
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 2048,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  };

  if (Array.isArray(tools) && tools.length > 0) {
    bodyPayload.tools = [{ functionDeclarations: tools }];
  }

  for (const model of CANDIDATE_GEMINI_MODELS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const candidate = data.candidates?.[0];
        const parts = candidate?.content?.parts || [];

        // Verifica se o modelo executou uma Tool Call
        const functionCallPart = parts.find((p) => p.functionCall);
        if (functionCallPart && functionCallPart.functionCall) {
          return {
            functionCall: functionCallPart.functionCall,
            modelUsed: model,
          };
        }

        const textPart = parts.find((p) => typeof p.text === 'string' && !p.thought);
        if (textPart && textPart.text) {
          return {
            text: textPart.text.trim(),
            modelUsed: model,
          };
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        console.warn(`[LocalApiServer] Gemini model ${model} retornou status ${res.status}:`, errData?.error?.message || res.statusText);
      }
    } catch (err) {
      console.warn(`[LocalApiServer] Falha de rede/timeout ao chamar ${model}:`, err.message);
    }
  }

  return null;
}

/**
 * Cria Pix oficial no Mercado Pago
 */
async function callMercadoPagoCreatePix({ amount, description, payerEmail, payerName, externalReference }) {
  const finalAmount = IS_TEST_MODE ? 0.01 : Math.max(0.01, Number(Number(amount).toFixed(2)));
  const idempotencyKey = `${externalReference}_${Date.now().toString(16)}`;

  console.log(`[Mercado Pago Local] Gerando Pix: R$ ${finalAmount} (${description}) — TestMode: ${IS_TEST_MODE}`);

  const res = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      transaction_amount: finalAmount,
      description: description || 'Nua Borges Produções',
      payment_method_id: 'pix',
      payer: {
        email: payerEmail || 'contato@nuaborges.com.br',
        first_name: payerName || 'Cliente VIP',
      },
      external_reference: externalReference,
      notification_url: 'https://nuaborges.com.br/api/finance/webhook',
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('[Mercado Pago Local Error]:', data);
    throw new Error(data.message || `Erro Mercado Pago HTTP ${res.status}`);
  }

  const td = data.point_of_interaction?.transaction_data;
  if (!td?.qr_code) {
    throw new Error('Mercado Pago não retornou dados de Pix (QR Code ausente).');
  }

  const base64 = td.qr_code_base64
    ? (td.qr_code_base64.startsWith('data:') ? td.qr_code_base64 : `data:image/png;base64,${td.qr_code_base64}`)
    : '';

  return {
    id: data.id,
    qrCode: td.qr_code,
    qrCodeBase64: base64,
    amount: finalAmount,
    status: data.status || 'pending',
    isTestMode: IS_TEST_MODE,
  };
}

/**
 * Consulta status de pagamento no Mercado Pago
 */
async function callMercadoPagoGetPayment(paymentId) {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
    },
  });

  if (!res.ok) return { success: false, status: 'unknown' };
  const data = await res.json();
  return {
    success: true,
    status: data.status,
    amount: data.transaction_amount,
    dateApproved: data.date_approved,
  };
}

/**
 * O servidor local de desenvolvimento persiste em arquivos JSON dentro de `data/`.
 * Ele deliberadamente NÃO sincroniza com o Supabase de produção: alterações feitas
 * em ambiente local nunca devem escrever no banco de dados real. Os trechos que
 * usam `supabaseClient` permanecem protegidos por `if (supabaseClient)` e viram
 * no-op aqui.
 */
const supabaseClient = null;

// ---------------------------------------------------------------------------
// Financeiro local (espelha functions/api/finance/admin.ts)
// ---------------------------------------------------------------------------
const DEFAULT_FINANCE_INSTALLMENTS = [
  {
    id: 'parcela-1',
    number: 1,
    label: '1ª Parcela',
    referenceMonth: 'Outubro/2026',
    amount: 200,
    dueDate: '2026-10-04',
    dueDateFormatted: '04/10/2026',
    status: 'paid',
    paymentId: 'PIX-NUA-20261005-001',
    paymentMethod: 'pix',
    paidAt: '2026-10-05T11:00:00-03:00',
    paidAmount: 200,
    receiptHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  },
  {
    id: 'parcela-2',
    number: 2,
    label: '2ª Parcela',
    referenceMonth: 'Novembro/2026',
    amount: 200,
    dueDate: '2026-11-04',
    dueDateFormatted: '04/11/2026',
    status: 'pending',
  },
  { id: 'parcela-3', number: 3, label: '3ª Parcela', referenceMonth: 'Dezembro/2026', amount: 200, dueDate: '2026-12-04', dueDateFormatted: '04/12/2026', status: 'pending' },
  { id: 'parcela-4', number: 4, label: '4ª Parcela', referenceMonth: 'Janeiro/2027', amount: 200, dueDate: '2027-01-04', dueDateFormatted: '04/01/2027', status: 'pending' },
  { id: 'parcela-5', number: 5, label: '5ª Parcela', referenceMonth: 'Fevereiro/2027', amount: 200, dueDate: '2027-02-04', dueDateFormatted: '04/02/2027', status: 'pending' },
  { id: 'parcela-6', number: 6, label: '6ª Parcela', referenceMonth: 'Março/2027', amount: 200, dueDate: '2027-03-04', dueDateFormatted: '04/03/2027', status: 'pending' },
  { id: 'parcela-7', number: 7, label: '7ª Parcela', referenceMonth: 'Abril/2027', amount: 200, dueDate: '2027-04-04', dueDateFormatted: '04/04/2027', status: 'pending' },
  { id: 'parcela-8', number: 8, label: '8ª Parcela', referenceMonth: 'Maio/2027', amount: 200, dueDate: '2027-05-04', dueDateFormatted: '04/05/2027', status: 'pending' },
  { id: 'parcela-9', number: 9, label: '9ª Parcela', referenceMonth: 'Junho/2027', amount: 200, dueDate: '2027-06-04', dueDateFormatted: '04/06/2027', status: 'pending' },
  { id: 'parcela-10', number: 10, label: '10ª Parcela', referenceMonth: 'Julho/2027', amount: 200, dueDate: '2027-07-04', dueDateFormatted: '04/07/2027', status: 'pending' },
];

function loadLocalFinanceInstallments() {
  let installments = loadJson(FINANCE_FILE, null);
  if (!Array.isArray(installments) || installments.length !== 10) {
    installments = DEFAULT_FINANCE_INSTALLMENTS.map((item) => ({ ...item }));
    saveJson(FINANCE_FILE, installments);
  }
  return installments;
}

function buildLocalFinanceSummary(installments) {
  const totalPaid = installments.reduce((sum, inst) => (inst.status === 'paid' ? sum + Number(inst.amount || 0) : sum), 0);
  const totalPending = installments.reduce((sum, inst) => (inst.status !== 'paid' ? sum + Number(inst.amount || 0) : sum), 0);
  const currentInstallment = installments.find((i) => i.status !== 'paid') || installments[installments.length - 1];
  return {
    installments,
    currentInstallment,
    totalPaid,
    totalPending,
    totalContract: totalPaid + totalPending,
    isUpToDate: totalPending === 0,
    nextDueDate: currentInstallment?.dueDateFormatted,
  };
}

/**
 * Executa uma proposta sensível já aprovada pela administradora.
 * Espelha functions/api/nua-ai/approve-action.ts reutilizando os endpoints
 * reais do painel — nunca altera dados por conta própria.
 */
async function executeApprovedProposal(proposal, services) {
  const { actionType, payload = {} } = proposal;

  switch (actionType) {
    case 'delete_media': {
      const del = await services.api('/api/media/delete', {
        method: 'POST',
        body: { keys: [payload.objectKey] },
      });
      if (!del.ok) throw new Error(del.data?.error || 'Não consegui excluir o arquivo da biblioteca.');

      const content = payload.content;
      if (content && Array.isArray(content.library)) {
        content.library = content.library.filter((m) => m.id !== payload.mediaId);
      }
      return { message: 'Mídia excluída da biblioteca.', content };
    }

    case 'publish_site': {
      const pub = await services.api('/api/content/sync', {
        method: 'POST',
        body: { content: payload.content },
      });
      if (!pub.ok) throw new Error(pub.data?.error || 'Não consegui publicar o site.');
      return {
        message: 'Site publicado com sucesso.',
        version: pub.data?._version ?? pub.data?.version ?? null,
        updatedAt: pub.data?._updatedAt ?? pub.data?.updatedAt ?? null,
      };
    }

    case 'reschedule_appointment': {
      const res = await services.api('/api/appointments/admin', {
        method: 'POST',
        body: {
          action: 'reschedule',
          bookingId: payload.bookingId,
          newDate: payload.date,
          newStartTime: payload.startTime,
          reason: payload.reason,
        },
      });
      if (!res.ok) throw new Error(res.data?.error || 'Não consegui reagendar a chamada.');
      return { message: 'Chamada reagendada.' };
    }

    case 'cancel_appointment': {
      const res = await services.api('/api/appointments/admin', {
        method: 'POST',
        body: { action: 'cancel', bookingId: payload.bookingId, reason: payload.reason },
      });
      if (!res.ok) throw new Error(res.data?.error || 'Não consegui cancelar a chamada.');
      return { message: 'Chamada cancelada.' };
    }

    case 'update_appointment_settings': {
      if (payload.settings) {
        const res = await services.api('/api/appointments/admin', {
          method: 'POST',
          body: { action: 'updateSettings', settings: payload.settings },
        });
        if (!res.ok) throw new Error(res.data?.error || 'Não consegui salvar os horários.');
      }
      if (Array.isArray(payload.modalities)) {
        const res = await services.api('/api/appointments/admin', {
          method: 'POST',
          body: { action: 'updateModalities', modalities: payload.modalities },
        });
        if (!res.ok) throw new Error(res.data?.error || 'Não consegui salvar as modalidades.');
      }
      return { message: 'Horários e modalidades das chamadas VIP atualizados.' };
    }

    case 'mark_finance_paid': {
      const res = await services.api('/api/finance/admin', {
        method: 'POST',
        body: {
          action: 'manual_pay',
          installmentNumber: payload.installmentNumber,
          paidAmount: payload.paidAmount,
          paymentMethod: payload.paymentMethod || 'manual',
        },
      });
      if (!res.ok) throw new Error(res.data?.error || 'Não consegui dar baixa na parcela.');
      return { message: 'Parcela baixada com sucesso.' };
    }

    case 'revert_finance_payment': {
      const res = await services.api('/api/finance/admin', {
        method: 'POST',
        body: { action: 'revert', installmentNumber: payload.installmentNumber },
      });
      if (!res.ok) throw new Error(res.data?.error || 'Não consegui reverter a quitação.');
      return { message: 'Quitação revertida.' };
    }

    case 'update_request_status': {
      const res = await services.api('/api/requests', {
        method: 'POST',
        body: { action: 'update', id: payload.requestId, status: payload.status },
      });
      if (!res.ok) throw new Error(res.data?.error || 'Não consegui atualizar a solicitação.');
      return { message: 'Solicitação atualizada.' };
    }

    case 'update_personalizado_settings': {
      const res = await services.api('/api/personalizados/admin', {
        method: 'POST',
        body: { action: 'save_settings', settings: payload.settings },
      });
      if (!res.ok) throw new Error(res.data?.error || 'Não consegui salvar as configurações.');
      return { message: 'Preços da calculadora atualizados.' };
    }

    case 'remove_music_track': {
      const res = await services.api('/api/music/update', {
        method: 'DELETE',
        body: { id: payload.trackId, deleteFile: false },
      });
      if (!res.ok) throw new Error(res.data?.error || 'Não consegui remover a faixa.');
      return { message: 'Faixa removida da biblioteca musical.' };
    }

    default:
      throw new Error('Não consegui aplicar essa alteração por aqui. Tente novamente pelo painel.');
  }
}

export function startLocalApiServer(port = PORT) {
  const server = http.createServer(async (req, res) => {
    const requestId = newRequestId();
    // Porta real (testes usam porta efêmera): chamadas internas precisam voltar para cá.
    const selfOrigin = `http://127.0.0.1:${server.address()?.port || port}`;

    // CORS: apenas origens de loopback (localhost/127.0.0.1) são aceitas.
    // Refletir qualquer Origin com credentials: true exporia a API local a qualquer site.
    const corsOrigin = resolveCorsOrigin(req);
    res.setHeader('X-Request-Id', requestId);
    if (corsOrigin) {
      res.setHeader('Access-Control-Allow-Origin', corsOrigin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Idempotency-Key, X-Requested-With, Cache-Control, Pragma, If-Modified-Since, Range, X-Master-Key, X-Object-Key, X-Mime-Type, X-Track-Title, X-Track-Artist');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // Helper para ler body JSON (limite de tamanho para evitar esgotamento de memória)
    const readJsonBody = async () => {
      return new Promise((resolve) => {
        let raw = '';
        let overflow = false;
        req.setEncoding('utf8');
        req.on('data', (chunk) => {
          if (overflow) return;
          raw += chunk;
          if (raw.length > MAX_JSON_BODY_BYTES) {
            overflow = true;
            raw = '';
          }
        });
        req.on('end', () => {
          if (overflow) return resolve({});
          try {
            resolve(JSON.parse(raw));
          } catch {
            resolve({});
          }
        });
        req.on('error', () => resolve({}));
      });
    };

    const sendJson = (status, obj) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(obj));
    };

    try {
      // 1. POST /api/payments/create-pix (Avulsos ou VIP)
      if (pathname === '/api/payments/create-pix' && req.method === 'POST') {
        const body = await readJsonBody();
        const { type = 'avulso', slug, productId, payerEmail, payerName } = body;
        const targetSlug = (slug || productId || '').trim();

        if (type === 'avulso' && !targetSlug) {
          return sendJson(400, {
            error: 'Identificador do produto avulso não informado.',
          });
        }

        // 1.1 Consulta o catálogo publicado de conteúdos para obter preço e título autênticos no servidor
        let targetTitle = 'Conteúdo Autoral Nua Borges';
        let authoritativePrice = 29.9;

        const publishedContentFile = path.join(DATA_DIR, 'published_content.json');
        let siteContent = null;
        if (fs.existsSync(publishedContentFile)) {
          try {
            siteContent = JSON.parse(fs.readFileSync(publishedContentFile, 'utf-8'));
          } catch {}
        }

        const avulsosItems = Array.isArray(siteContent?.avulsos?.items) ? siteContent.avulsos.items : [];

        if (type === 'avulso') {
          const cleanSlug = targetSlug.toLowerCase();
          const found = avulsosItems.find((item) => {
            const itemSlugStr = (item.slug || '').trim().toLowerCase();
            const itemId = (item.id || '').trim().toLowerCase();
            const cleanId = itemId.replace(/^avulso-/, '');
            return cleanSlug === itemSlugStr || cleanSlug === itemId || cleanSlug === cleanId;
          });

          if (found) {
            targetTitle = found.title;
            authoritativePrice =
              found.numericPrice ||
              parseFloat(String(found.price || '29.9').replace(/[^\d,.]/g, '').replace(',', '.')) ||
              29.9;
          } else {
            targetTitle = body.title || 'Ensaio Autoral Nua Borges';
            authoritativePrice = Number(body.price) || 29.9;
          }
        } else if (type === 'chamada' || type === 'appointment') {
          targetTitle = 'Chamada por Vídeo com Lua Borges';
          authoritativePrice = 150.0;
        } else if (type === 'personalizado') {
          targetTitle = 'Produção Personalizada Sob Medida';
          authoritativePrice = 120.0;
        } else if (type === 'vip') {
          targetTitle = 'Assinatura Clube VIP Nua Borges';
          authoritativePrice = 49.9;
        }

        // Preço canônico validado no servidor a partir do catálogo publicado

        const orderId = `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        const purchaseToken = `ptok_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
        const externalReference = `nua_${type}_${targetSlug}_${orderId}`;

        let pixQrCode = '';
        let pixQrCodeUrl = '';
        let mpPaymentId = undefined;

        if (IS_TEST_MODE && !body.forceRealPayment) {
          // Geração simulada em localhost sem custo financeiro
          const simulatedPixKey = `00020126580014br.gov.bcb.pix0136nua-simulado-${targetSlug}-${orderId}5204000053039865405${authoritativePrice.toFixed(2)}5802BR5910NUA BORGES6009SAO PAULO62070503***6304ABCD`;
          pixQrCode = simulatedPixKey;
          pixQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(simulatedPixKey)}`;
          console.log(`[LocalApiServer] 🧪 Ordem SIMULADA criada em localhost: ${orderId} (R$ ${authoritativePrice.toFixed(2)})`);
        } else if (MP_ACCESS_TOKEN) {
          try {
            const mpRes = await callMercadoPagoCreatePix({
              amount: authoritativePrice,
              description: `${targetTitle} — Nua Borges`,
              payerEmail,
              payerName,
              externalReference,
            });
            mpPaymentId = mpRes.id;
            pixQrCode = mpRes.qrCode;
            pixQrCodeUrl = mpRes.qrCodeBase64;
          } catch (mpErr) {
            console.warn('[LocalApiServer] Falha Mercado Pago Pix real, fallback para simulado:', mpErr.message);
            const simulatedPixKey = `00020126580014br.gov.bcb.pix0136nua-simulado-${targetSlug}-${orderId}5204000053039865405${authoritativePrice.toFixed(2)}5802BR5910NUA BORGES6009SAO PAULO62070503***6304ABCD`;
            pixQrCode = simulatedPixKey;
            pixQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(simulatedPixKey)}`;
          }
        } else {
          const simulatedPixKey = `00020126580014br.gov.bcb.pix0136nua-simulado-${targetSlug}-${orderId}5204000053039865405${authoritativePrice.toFixed(2)}5802BR5910NUA BORGES6009SAO PAULO62070503***6304ABCD`;
          pixQrCode = simulatedPixKey;
          pixQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(simulatedPixKey)}`;
        }

        const orderRecord = {
          orderId,
          purchaseToken,
          type,
          slug: targetSlug,
          title: targetTitle,
          price: authoritativePrice,
          amount: authoritativePrice,
          isTestMode: IS_TEST_MODE,
          status: 'pending',
          mpPaymentId,
          paymentMethod: IS_TEST_MODE ? 'simulated_local_pix' : 'mercadopago_pix',
          externalReference,
          createdAt: new Date().toISOString(),
        };

        ordersStore[orderId] = orderRecord;
        saveJson(ORDERS_FILE, ordersStore);

        console.log(`[LocalApiServer] Ordem registrada em localhost (R$ ${authoritativePrice}): ${orderId}`);

        return sendJson(200, {
          success: true,
          orderId,
          purchaseToken,
          accessUrl: `/assistir/${targetSlug}?token=${purchaseToken}`,
          paymentId: mpPaymentId || `sim_${orderId}`,
          mpPaymentId,
          qrCode: pixQrCode,
          qrCodeUrl: pixQrCodeUrl,
          qrCodeBase64: pixQrCodeUrl,
          amount: authoritativePrice,
          isTestMode: IS_TEST_MODE,
        });
      }

      // 1.5. POST /api/payments/simulate-approve (Simulação de aprovação universal para localhost)
      if (pathname === '/api/payments/simulate-approve' && req.method === 'POST') {
        const body = await readJsonBody();
        const targetOrderId = (body.orderId || '').trim();

        if (!targetOrderId) {
          return sendJson(400, { success: false, error: 'orderId obrigatório para simulação.' });
        }

        const nowIso = new Date().toISOString();
        let simulatedItemTitle = 'Item Simulado';
        let simulatedAmount = 29.9;
        let returnToken = `ptok_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
        let accessUrl = '/';

        // A) Se for Agendamento de Chamada (book_ / apt_)
        if (appointmentsStore[targetOrderId] || targetOrderId.startsWith('book_') || targetOrderId.startsWith('apt_')) {
          const booking = appointmentsStore[targetOrderId] || Object.values(appointmentsStore).find((b) => b.id === targetOrderId || b.publicToken === targetOrderId);
          if (booking) {
            booking.status = 'confirmada';
            if (!booking.payment) booking.payment = {};
            booking.payment.status = 'approved';
            booking.payment.paidAt = nowIso;
            booking.meeting.visibleToClient = true;
            if (!Array.isArray(booking.history)) booking.history = [];
            booking.history.push({
              at: nowIso,
              action: 'pagamento_confirmado',
              note: `Pagamento simulado em localhost aprovado com sucesso.`,
              author: 'simulador_localhost',
            });
            booking.updatedAt = nowIso;
            appointmentsStore[booking.id] = booking;
            saveJson(APPOINTMENTS_FILE, appointmentsStore);

            simulatedItemTitle = `Chamada VIP ${booking.modalityName}`;
            simulatedAmount = booking.price || 1500;
            returnToken = booking.publicToken;
            accessUrl = `/chamadas/reserva?token=${booking.publicToken}`;
            console.log(`⚡ [LocalApiServer] 📅 Agendamento ${booking.id} (${booking.clientName}) CONFIRMADO via simulação local!`);
          }
        }

        // B) Se for Encomenda Personalizada (ped_)
        if (personalizadosStore[targetOrderId] || targetOrderId.startsWith('ped_')) {
          const pers = personalizadosStore[targetOrderId] || Object.values(personalizadosStore).find((p) => p.id === targetOrderId || p.publicToken === targetOrderId);
          if (pers) {
            pers.status = 'em_producao';
            if (!pers.payment) pers.payment = {};
            pers.payment.status = 'approved';
            pers.payment.paidAt = nowIso;
            pers.updatedAt = nowIso;
            personalizadosStore[pers.id] = pers;
            saveJson(PERSONALIZADOS_FILE, personalizadosStore);

            simulatedItemTitle = `Encomenda Personalizada (${pers.photoCount} fotos)`;
            simulatedAmount = pers.totalPrice || 100;
            returnToken = pers.publicToken;
            accessUrl = `/personalizados/pedido?token=${pers.publicToken}`;
            console.log(`⚡ [LocalApiServer] 🎨 Encomenda ${pers.id} (${pers.clientName}) movida para EM PRODUÇÃO via simulação local!`);
          }
        }

        // C) Atualiza ou cria na ordersStore (Packs e registro central)
        let order = ordersStore[targetOrderId];
        if (order) {
          order.status = 'approved';
          order.paidAt = nowIso;
          order.paidAmount = order.amount || simulatedAmount;
          order.paymentMethod = 'simulated_local';
          if (!order.purchaseToken) {
            order.purchaseToken = returnToken;
          }
          ordersStore[targetOrderId] = order;
          simulatedItemTitle = order.title || simulatedItemTitle;
          simulatedAmount = order.amount || simulatedAmount;
          accessUrl = `/assistir/${order.slug}?token=${order.purchaseToken}`;
        } else {
          ordersStore[targetOrderId] = {
            orderId: targetOrderId,
            purchaseToken: returnToken,
            type: targetOrderId.startsWith('book_') ? 'chamada' : targetOrderId.startsWith('ped_') ? 'personalizado' : 'avulso',
            slug: targetOrderId,
            title: simulatedItemTitle,
            price: simulatedAmount,
            amount: simulatedAmount,
            status: 'approved',
            paidAt: nowIso,
            paidAmount: simulatedAmount,
            paymentMethod: 'simulated_local',
            isTestMode: true,
            createdAt: nowIso,
          };
        }
        saveJson(ORDERS_FILE, ordersStore);

        console.log(`⚡ [LocalApiServer] Pagamento da ordem ${targetOrderId} (${simulatedItemTitle}) APROVADO via simulação local!`);

        return sendJson(200, {
          success: true,
          paid: true,
          status: 'approved',
          orderId: targetOrderId,
          purchaseToken: returnToken,
          accessUrl,
          amount: simulatedAmount,
          isTestMode: true,
        });
      }

      // 2. GET / POST /api/payments/status
      if (pathname === '/api/payments/status' && (req.method === 'GET' || req.method === 'POST')) {
        const body = req.method === 'POST' ? await readJsonBody() : {};
        let orderId = parsedUrl.searchParams.get('orderId') || body.orderId;
        const isSimulate = parsedUrl.searchParams.get('simulate') === 'true' || body.simulate === true;

        if (!orderId || !ordersStore[orderId]) {
          return sendJson(404, { success: false, error: 'Ordem não encontrada.' });
        }

        const order = ordersStore[orderId];

        // Se a ordem não tiver token ainda por ser legada, gera um
        if (!order.purchaseToken) {
          order.purchaseToken = `ptok_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
          ordersStore[orderId] = order;
          saveJson(ORDERS_FILE, ordersStore);
        }

        let isPaid = order.status === 'approved';

        // 0. Simulação de aprovação em localhost (apenas se IS_TEST_MODE for true)
        if (!isPaid && IS_TEST_MODE && isSimulate) {
          order.status = 'approved';
          order.paidAt = new Date().toISOString();
          order.paidAmount = order.amount;
          order.paymentMethod = 'simulated_local';
          ordersStore[orderId] = order;
          saveJson(ORDERS_FILE, ordersStore);
          isPaid = true;
          console.log(`⚡ [LocalApiServer] Ordem ${orderId} aprovada via simulação de teste local.`);
        }

        // 1. Consulta no Mercado Pago (se houver id de transação)
        if (!isPaid && order.mpPaymentId) {
          try {
            const mpCheck = await callMercadoPagoGetPayment(order.mpPaymentId);
            if (mpCheck.success && mpCheck.status === 'approved') {
              order.status = 'approved';
              order.paidAt = mpCheck.dateApproved || new Date().toISOString();
              ordersStore[orderId] = order;
              saveJson(ORDERS_FILE, ordersStore);
              isPaid = true;
              console.log(`🎉 [LocalApiServer] Pagamento da ordem ${orderId} APROVADO pelo Mercado Pago!`);
            } else if (mpCheck.success && (mpCheck.status === 'rejected' || mpCheck.status === 'cancelled')) {
              order.status = mpCheck.status;
              ordersStore[orderId] = order;
              saveJson(ORDERS_FILE, ordersStore);
            }
          } catch (err) {
            console.warn('[LocalApiServer] Erro ao consultar MP status:', err);
          }
        }

        return sendJson(200, {
          success: true,
          paid: isPaid,
          status: order.status,
          orderId: order.orderId,
          purchaseToken: order.purchaseToken,
          accessUrl: `/assistir/${order.slug}?token=${order.purchaseToken}`,
          amount: order.amount,
          isTestMode: order.isTestMode,
          productSlug: order.slug,
        });
      }

      // 2.2. POST /api/payments/send-otp (Gera e envia código OTP por e-mail)
      if (pathname === '/api/payments/send-otp' && (req.method === 'GET' || req.method === 'POST')) {
        let query = parsedUrl.searchParams.get('search') || parsedUrl.searchParams.get('orderId');
        if (req.method === 'POST') {
          const body = await readJsonBody();
          query = query || body.search || body.orderId || body.email;
        }

        const cleanQuery = (query || '').trim().toLowerCase();
        if (!cleanQuery) {
          return sendJson(400, { success: false, error: 'Informe o número do pedido ou e-mail.' });
        }

        const found = Object.values(ordersStore).find(
          (o) =>
            (o.orderId.toLowerCase() === cleanQuery ||
             (o.purchaseToken && o.purchaseToken.toLowerCase() === cleanQuery) ||
             (o.externalReference && o.externalReference.toLowerCase().includes(cleanQuery)) ||
             (o.payerEmail && o.payerEmail.toLowerCase() === cleanQuery)) &&
            (o.status === 'approved' || o.isTestMode)
        );

        if (!found) {
          return sendJson(404, {
            success: false,
            error: 'Nenhuma compra aprovada foi localizada com os dados informados.',
          });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const payerEmail = found.payerEmail || found.clientEmail || 'contato@nuaborges.com.br';

        otpStore[found.orderId] = {
          code: otpCode,
          orderId: found.orderId,
          payerEmail,
          createdAt: Date.now(),
          expiresAt: Date.now() + 10 * 60 * 1000,
        };

        console.log(`[LOCAL API] 🔑 OTP de Acesso Nua Borges [${found.orderId}]: ${otpCode} (Enviado para ${payerEmail})`);

        const smtpCreds = resolveSmtpCredentials();
        if (smtpCreds.user && smtpCreds.pass) {
          const shortOrderId = found.orderId.slice(-6).toUpperCase();
          const itemTitle = found.title || found.itemTitle || 'Ensaio Autoral VIP';
          const emailSubject = `🔑 Seu Código de Acesso (${otpCode}) — Nua Borges`;
          const emailHtml = `
            <div style="background-color: #000000; color: #ffffff; padding: 40px 20px; font-family: 'Georgia', serif; text-align: center;">
              <div style="max-width: 500px; margin: 0 auto; background-color: #09090c; border: 1px solid rgba(244,167,185,0.3); border-radius: 24px; padding: 36px 24px;">
                <h2 style="color: #ffffff; font-size: 22px; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 4px;">Nua Borges</h2>
                <p style="color: #f4a7b9; font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase; margin-bottom: 24px;">Sala VIP &amp; Acesso Privativo</p>
                <p style="color: #a1a1aa; font-size: 13px; line-height: 1.6;">
                  Recebemos uma solicitação de acesso para a produção autoral<br>
                  <strong style="color: #ffffff;">${itemTitle}</strong> (Pedido #${shortOrderId}).
                </p>
                <div style="background: #000; border: 1px dashed rgba(244, 167, 185, 0.5); border-radius: 16px; padding: 20px; margin: 24px 0;">
                  <span style="font-size: 10px; color: #a1a1aa; letter-spacing: 0.2em; text-transform: uppercase; display: block; margin-bottom: 6px;">Seu Código de Desbloqueio</span>
                  <span style="font-family: monospace; font-size: 34px; font-weight: bold; letter-spacing: 0.35em; color: #f4a7b9;">${otpCode}</span>
                </div>
                <p style="color: #71717a; font-size: 11px; line-height: 1.5;">🔒 Este código expira em 10 minutos. Nunca compartilhe este código com terceiros.</p>
              </div>
            </div>
          `;

          sendHostingerSmtpEmail({
            host: smtpCreds.host,
            port: smtpCreds.port,
            user: smtpCreds.user,
            pass: smtpCreds.pass,
            to: payerEmail,
            subject: emailSubject,
            html: emailHtml,
          }).catch((err) => console.error('[LocalApiServer] Erro no envio SMTP Hostinger:', err));
        }

        return sendJson(200, {
          success: true,
          sent: true,
          orderId: found.orderId,
          itemTitle: found.title || found.itemTitle || 'Ensaio Autoral VIP',
          maskedEmail: maskEmail(payerEmail),
          expiresInSeconds: 600,
        });
      }

      // 2.3. POST /api/payments/verify-otp (Valida código OTP e aplica trava de dispositivos)
      if (pathname === '/api/payments/verify-otp' && req.method === 'POST') {
        const body = await readJsonBody();
        const orderId = (body.orderId || '').trim();
        const inputCode = (body.code || '').trim();
        const fingerprint = (body.deviceFingerprint || 'fp_local_dev').trim();

        if (!orderId || !inputCode) {
          return sendJson(400, { success: false, authorized: false, error: 'Informe o número do pedido e o código OTP.' });
        }

        const otpData = otpStore[orderId];
        if (!otpData) {
          return sendJson(403, { success: false, authorized: false, error: 'Código expirado ou não solicitado. Solicite um novo código.' });
        }

        if (Date.now() > otpData.expiresAt) {
          delete otpStore[orderId];
          return sendJson(403, { success: false, authorized: false, error: 'O código de verificação expirou.' });
        }

        if (otpData.code !== inputCode) {
          return sendJson(403, { success: false, authorized: false, error: 'Código de verificação incorreto.' });
        }

        // Trava de Dispositivos (Máximo 2)
        if (!deviceStore[orderId]) deviceStore[orderId] = [];
        if (!deviceStore[orderId].includes(fingerprint)) {
          if (deviceStore[orderId].length >= 2) {
            return sendJson(403, {
              success: false,
              authorized: false,
              error: 'Limite de 2 dispositivos autorizados atingido para esta compra. Suporte: contato@nuaborges.com.br.',
            });
          }
          deviceStore[orderId].push(fingerprint);
        }

        const sessionToken = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
        const foundOrder = ordersStore[orderId] || Object.values(ordersStore).find((o) => o.orderId === orderId);
        const payerEmail = otpData.payerEmail;
        const shortOrderId = orderId.slice(-6).toUpperCase();

        sessionStore[sessionToken] = {
          sessionToken,
          orderId,
          fingerprint,
          payerEmail,
          slug: foundOrder?.slug || body.slug || '',
          createdAt: Date.now(),
        };

        delete otpStore[orderId];

        return sendJson(200, {
          success: true,
          authorized: true,
          sessionToken,
          orderId,
          slug: foundOrder?.slug || body.slug,
          itemTitle: foundOrder?.title || 'Ensaio Autoral VIP',
          watermarkText: `NUA BORGES ♡ | CÓPIA PRIVATIVA AUTORIZADA | COMPRADOR: ${maskEmail(payerEmail)} | COMPRA #${shortOrderId}`,
        });
      }

      // 2.4. POST /api/payments/verify-access (Valida a sessão/token de acesso da compra)
      if (pathname === '/api/payments/verify-access' && (req.method === 'GET' || req.method === 'POST')) {
        let token = parsedUrl.searchParams.get('token') || parsedUrl.searchParams.get('sessionToken') || parsedUrl.searchParams.get('purchaseToken');
        let slug = parsedUrl.searchParams.get('slug');

        if (req.method === 'POST') {
          const body = await readJsonBody();
          token = token || body.sessionToken || body.token || body.purchaseToken;
          slug = slug || body.slug;
        }

        if (!token) {
          return sendJson(400, { success: false, authorized: false, error: 'Token de acesso não fornecido.' });
        }

        const cleanToken = token.trim();
        const activeSession = sessionStore[cleanToken];

        const foundOrder = Object.values(ordersStore).find(
          (o) =>
            (o.purchaseToken === cleanToken || o.orderId === cleanToken || (activeSession && o.orderId === activeSession.orderId)) &&
            (o.status === 'approved' || o.isTestMode)
        );

        if (!foundOrder) {
          return sendJson(403, {
            success: false,
            authorized: false,
            error: 'Sessão de acesso inválida ou compra não aprovada.',
          });
        }

        const payerEmail = activeSession?.payerEmail || foundOrder.payerEmail || 'contato@nuaborges.com.br';
        const shortOrderId = foundOrder.orderId.slice(-6).toUpperCase();

        return sendJson(200, {
          success: true,
          authorized: true,
          orderId: foundOrder.orderId,
          purchaseToken: cleanToken,
          sessionToken: activeSession?.sessionToken || cleanToken,
          slug: foundOrder.slug,
          itemTitle: foundOrder.title,
          paidAt: foundOrder.paidAt || foundOrder.createdAt,
          watermarkText: `NUA BORGES ♡ | CÓPIA PRIVATIVA AUTORIZADA | COMPRADOR: ${maskEmail(payerEmail)} | COMPRA #${shortOrderId}`,
        });
      }

      // 2.5. POST /api/payments/recover-access (Recuperação de acesso via OTP)
      if (pathname === '/api/payments/recover-access' && req.method === 'POST') {
        const body = await readJsonBody();
        const query = (body.search || body.orderId || body.email || '').trim().toLowerCase();

        if (!query) {
          return sendJson(400, { success: false, error: 'Informe o número do pedido ou e-mail.' });
        }

        const found = Object.values(ordersStore).find(
          (o) =>
            (o.orderId.toLowerCase() === query ||
             (o.purchaseToken && o.purchaseToken.toLowerCase() === query) ||
             (o.externalReference && o.externalReference.toLowerCase().includes(query)) ||
             (o.payerEmail && o.payerEmail.toLowerCase() === query)) &&
            (o.status === 'approved' || o.isTestMode)
        );

        if (!found) {
          return sendJson(404, {
            success: false,
            error: 'Nenhuma compra aprovada foi localizada com os dados informados.',
          });
        }

        const payerEmail = found.payerEmail || 'contato@nuaborges.com.br';

        return sendJson(200, {
          success: true,
          found: true,
          requireOtp: true,
          orderId: found.orderId,
          slug: found.slug,
          itemTitle: found.title,
          maskedEmail: maskEmail(payerEmail),
        });
      }

      // 2.5. GET / POST /api/content/sync (Sincronização de CMS local)
      if (pathname === '/api/content/sync') {
        const publishedContentFile = path.join(DATA_DIR, 'published_content.json');

        if (req.method === 'GET') {
          if (fs.existsSync(publishedContentFile)) {
            try {
              const raw = fs.readFileSync(publishedContentFile, 'utf-8');
              const parsed = JSON.parse(raw);
              return sendJson(200, { exists: true, content: parsed });
            } catch {}
          }
          return sendJson(200, { exists: false, content: null });
        }

        if (req.method === 'POST') {
          const body = await readJsonBody();
          if (body && body.content) {
            saveJson(publishedContentFile, body.content);
            console.log('💾 [LocalApiServer] Conteúdo do site publicado e salvo localmente em data/published_content.json!');
            return sendJson(200, {
              success: true,
              updatedAt: new Date().toISOString(),
              version: Date.now(),
            });
          }
          return sendJson(400, { success: false, error: 'Conteúdo inválido.' });
        }
      }

      // 3. POST /api/appointments/book (Agendamento de Chamadas)
      if (pathname === '/api/appointments/book' && req.method === 'POST') {
        const body = await readJsonBody();
        const bookingId = `book_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        const publicToken = `tkn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        const externalReference = `nua_call_${bookingId}_${Date.now()}`;

        const price = Number(body.price) || 1500;
        const modalityName = body.modalityName || (body.modalityId === 'chamada-express' ? 'Chamada Express (15 min)' : 'Encontro Privativo (30 min)');
        const duration = body.modalityId === 'chamada-express' ? 15 : body.modalityId === 'encontro-profundo' ? 60 : 30;

        let pixPayload = '';
        let pixQrCode = '';
        let transactionId = `sim_${bookingId}`;
        let paymentMethod = 'simulated_local_pix';
        let finalAmount = price;

        if (IS_TEST_MODE && !body.forceRealPayment) {
          const simulatedPixKey = `00020126580014br.gov.bcb.pix0136nua-simulado-call-${bookingId}5204000053039865405${price.toFixed(2)}5802BR5910NUA BORGES6009SAO PAULO62070503***6304ABCD`;
          pixPayload = simulatedPixKey;
          pixQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(simulatedPixKey)}`;
          console.log(`[LocalApiServer] 🧪 Chamada VIP SIMULADA criada em localhost: ${bookingId} (R$ ${price.toFixed(2)})`);
        } else if (MP_ACCESS_TOKEN) {
          try {
            const mpRes = await callMercadoPagoCreatePix({
              amount: price,
              description: `Chamada ${duration}min — ${body.clientName || 'Cliente'}`,
              payerEmail: body.clientEmail || 'contato@nuaborges.com.br',
              payerName: body.clientName || 'Cliente VIP',
              externalReference,
            });
            transactionId = String(mpRes.id);
            pixPayload = mpRes.qrCode;
            pixQrCode = mpRes.qrCodeBase64;
            finalAmount = mpRes.amount;
            paymentMethod = 'mercadopago_pix';
          } catch (mpErr) {
            console.warn('[LocalApiServer] Falha Mercado Pago Chamada, fallback para simulado:', mpErr.message);
            const simulatedPixKey = `00020126580014br.gov.bcb.pix0136nua-simulado-call-${bookingId}5204000053039865405${price.toFixed(2)}5802BR5910NUA BORGES6009SAO PAULO62070503***6304ABCD`;
            pixPayload = simulatedPixKey;
            pixQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(simulatedPixKey)}`;
          }
        } else {
          const simulatedPixKey = `00020126580014br.gov.bcb.pix0136nua-simulado-call-${bookingId}5204000053039865405${price.toFixed(2)}5802BR5910NUA BORGES6009SAO PAULO62070503***6304ABCD`;
          pixPayload = simulatedPixKey;
          pixQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(simulatedPixKey)}`;
        }

        const newBooking = {
          id: bookingId,
          publicToken,
          modalityId: body.modalityId || 'encontro-privativo',
          modalityName,
          durationMinutes: duration,
          price,
          date: body.date,
          startTime: body.startTime,
          clientName: body.clientName || '',
          clientEmail: body.clientEmail || '',
          clientPhone: body.clientPhone || '',
          clientNotes: body.clientNotes || '',
          status: 'aguardando_pagamento',
          payment: {
            status: 'pending',
            method: paymentMethod,
            amount: finalAmount,
            pixPayload,
            pixQrCode,
            transactionId,
          },
          meeting: {
            platform: 'google_meet',
            instructions: 'Link privativo liberado após confirmação do Pix.',
            visibleToClient: false,
          },
          history: [
            {
              at: new Date().toISOString(),
              action: 'criada',
              note: `Reserva criada aguardando Pix de R$ ${finalAmount.toFixed(2)} (ID: ${transactionId}).`,
              author: 'system',
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        appointmentsStore[bookingId] = newBooking;
        saveJson(APPOINTMENTS_FILE, appointmentsStore);

        // Registra também na ordersStore para integração universal com o CheckoutModal
        ordersStore[bookingId] = {
          orderId: bookingId,
          purchaseToken: publicToken,
          type: 'chamada',
          slug: bookingId,
          title: modalityName,
          price,
          amount: finalAmount,
          isTestMode: IS_TEST_MODE,
          status: 'pending',
          mpPaymentId: transactionId,
          paymentMethod,
          externalReference,
          qrCode: pixPayload,
          qrCodeUrl: pixQrCode,
          createdAt: new Date().toISOString(),
        };
        saveJson(ORDERS_FILE, ordersStore);

        console.log(`[LocalApiServer] Reserva criada: ${bookingId} (Token: ${publicToken})`);

        return sendJson(200, {
          success: true,
          booking: newBooking,
        });
      }

      // 4. POST /api/appointments/pix (Verificação de Chamada)
      if (pathname === '/api/appointments/pix' && req.method === 'POST') {
        const body = await readJsonBody();
        const { bookingId } = body;
        const booking = appointmentsStore[bookingId];

        if (!booking) {
          return sendJson(404, { success: false, error: 'Reserva não encontrada.' });
        }

        let isPaid = booking.status === 'confirmada';

        if (!isPaid) {
          if (booking.payment?.transactionId) {
            const txId = booking.payment.transactionId;
            // Consulta no Mercado Pago
            try {
              const mpCheck = await callMercadoPagoGetPayment(txId);
              if (mpCheck.success && mpCheck.status === 'approved') {
                booking.status = 'confirmada';
                booking.payment.status = 'approved';
                booking.payment.paidAt = mpCheck.dateApproved || new Date().toISOString();
                booking.meeting.visibleToClient = true;
                booking.history.push({
                  at: new Date().toISOString(),
                  action: 'pagamento_confirmado',
                  note: `Pix de R$ ${mpCheck.amount?.toFixed(2)} aprovado no Mercado Pago (ID: ${txId}).`,
                  author: 'system',
                });
                booking.updatedAt = new Date().toISOString();
                appointmentsStore[bookingId] = booking;
                saveJson(APPOINTMENTS_FILE, appointmentsStore);
                isPaid = true;
                console.log(`🎉 [LocalApiServer] Chamada ${bookingId} CONFIRMADA pelo Mercado Pago!`);
              }
            } catch (err) {
              console.warn('[LocalApiServer] Erro ao consultar status da chamada no MP:', err);
            }
          }
        }

        return sendJson(200, {
          success: true,
          paid: isPaid,
          booking,
        });
      }

      // 4.1. POST /api/appointments/sync (Sincronização de Reservas)
      if (pathname === '/api/appointments/sync' && req.method === 'POST') {
        const body = await readJsonBody();
        const incomingBookings = Array.isArray(body.bookings)
          ? body.bookings
          : body.booking
          ? [body.booking]
          : [];

        let count = 0;
        incomingBookings.forEach((b) => {
          if (b && (b.id || b.publicToken)) {
            const key = b.id || Object.keys(appointmentsStore).find((k) => appointmentsStore[k].publicToken === b.publicToken);
            const targetId = key || b.id || `app_${Date.now()}`;
            appointmentsStore[targetId] = {
              ...(appointmentsStore[targetId] || {}),
              ...b,
              id: targetId,
              updatedAt: new Date().toISOString(),
            };
            count++;
          }
        });

        if (count > 0) {
          saveJson(APPOINTMENTS_FILE, appointmentsStore);
          console.log(`✅ [LocalApiServer] ${count} agendamento(s) sincronizado(s) e salvos em ${APPOINTMENTS_FILE}`);
        }

        return sendJson(200, { success: true, count });
      }

      // 5. GET /api/appointments/lookup (Consulta por token público)
      if (pathname === '/api/appointments/lookup' && req.method === 'GET') {
        const token = parsedUrl.searchParams.get('token');
        const booking = Object.values(appointmentsStore).find((b) => b.publicToken === token);
        if (!booking) {
          return sendJson(404, { success: false, error: 'Reserva não encontrada.' });
        }
        return sendJson(200, { success: true, booking });
      }

      // 5b. GET & POST /api/appointments/admin (Painel de Gestão de Chamadas)
      if (pathname === '/api/appointments/admin') {
        if (req.method === 'GET') {
          const bookings = Object.values(appointmentsStore).sort((a, b) =>
            `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`)
          );
          return sendJson(200, {
            success: true,
            settings: normalizeAppointmentSettings(appointmentsConfigStore.settings),
            modalities: normalizeAppointmentModalities(appointmentsConfigStore.modalities),
            bookings,
          });
        }

        if (req.method === 'POST') {
          const body = await readJsonBody();
          const { action, bookingId } = body;
          const nowIso = new Date().toISOString();

          if (action === 'updateSettings') {
            // Mescla com o que está gravado: payload parcial não pode reabrir
            // dias fechados nem apagar regras não relacionadas.
            const merged = mergeAppointmentSettings(appointmentsConfigStore.settings, body.settings ?? body);
            const invalidRange = Object.values(merged.weeklyHours).some((day) =>
              (day.ranges || []).some((range) => range.start >= range.end)
            );
            if (invalidRange) {
              return sendJson(400, {
                success: false,
                error: 'O horário de término precisa ser depois do horário de início.',
              });
            }

            appointmentsConfigStore.settings = merged;
            saveJson(APPOINTMENTS_CONFIG_FILE, appointmentsConfigStore);
            return sendJson(200, {
              success: true,
              settings: normalizeAppointmentSettings(appointmentsConfigStore.settings),
              modalities: normalizeAppointmentModalities(appointmentsConfigStore.modalities),
            });
          }

          if (action === 'updateModalities') {
            appointmentsConfigStore.modalities = normalizeAppointmentModalities(body.modalities ?? body);
            saveJson(APPOINTMENTS_CONFIG_FILE, appointmentsConfigStore);
            return sendJson(200, {
              success: true,
              settings: normalizeAppointmentSettings(appointmentsConfigStore.settings),
              modalities: appointmentsConfigStore.modalities,
            });
          }

          if (!bookingId || !appointmentsStore[bookingId]) {
            return sendJson(404, { success: false, error: 'Reserva não encontrada.' });
          }

          const booking = appointmentsStore[bookingId];

          if (action === 'confirm') {
            booking.status = 'confirmada';
            booking.payment.status = 'approved';
            booking.payment.paidAt = nowIso;
            booking.meeting.visibleToClient = true;
            booking.updatedAt = nowIso;
          } else if (action === 'updateMeeting') {
            booking.meeting.url = (body.meetingUrl || '').trim();
            if (body.instructions) booking.meeting.instructions = body.instructions.trim();
            booking.meeting.visibleToClient = true;
            booking.updatedAt = nowIso;
          } else if (action === 'cancel') {
            booking.status = 'cancelada';
            booking.cancellationReason = body.reason || 'Cancelado no admin';
            booking.updatedAt = nowIso;
          } else if (action === 'complete') {
            booking.status = 'concluida';
            booking.updatedAt = nowIso;
          } else if (action === 'absent') {
            booking.status = 'nao_compareceu';
            booking.updatedAt = nowIso;
          } else if (action === 'reschedule') {
            if (body.newDate) booking.date = body.newDate;
            if (body.newStartTime) booking.startTime = body.newStartTime;
            booking.updatedAt = nowIso;
          }

          appointmentsStore[bookingId] = booking;
          saveJson(APPOINTMENTS_FILE, appointmentsStore);

          return sendJson(200, { success: true, booking });
        }
      }

      // 5b. GET /api/appointments/availability (página pública de chamadas)
      if (pathname === '/api/appointments/availability' && req.method === 'GET') {
        const date = parsedUrl.searchParams.get('date') || '';
        const modalityId = parsedUrl.searchParams.get('modalityId') || '';
        const settings = normalizeAppointmentSettings(appointmentsConfigStore.settings);
        const modalities = normalizeAppointmentModalities(appointmentsConfigStore.modalities);
        const modality = modalities.find((m) => m.id === modalityId && m.active !== false);

        if (!modality) {
          return sendJson(200, {
            success: false,
            date,
            slots: [],
            error: 'Modalidade não encontrada.',
          });
        }

        const slots = computeLocalAvailableSlots(
          date,
          modality,
          settings,
          Object.values(appointmentsStore)
        );

        return sendJson(200, { success: true, date, slots, modality });
      }

      // 5b. GET /api/admin/orders-feed (Feed Unificado de Pedidos para Central de Notificações)
      if (pathname === '/api/admin/orders-feed' && req.method === 'GET') {
        const feed = [];

        // 1. Encomendas Personalizadas
        try {
          const persFile = path.join(DATA_DIR, 'personalizados_orders.json');
          if (fs.existsSync(persFile)) {
            const persData = JSON.parse(fs.readFileSync(persFile, 'utf-8'));
            const pOrders = Array.isArray(persData) ? persData : Object.values(persData);
            for (const o of pOrders) {
              const photoCount = o.photoCount || 0;
              const videoDuration = o.videoDurationMinutes || 0;
              const summaryTitle =
                photoCount > 0 && videoDuration > 0
                  ? `Personalizado (${photoCount} fotos + vídeo)`
                  : photoCount > 0
                  ? `Personalizado (${photoCount} fotos)`
                  : videoDuration > 0
                  ? `Vídeo Personalizado (${videoDuration} min)`
                  : 'Pedido Personalizado';

              const customerName = o.clientName || 'Cliente';
              const customerContact = o.clientContact || '';
              const amount = o.totalPrice || 0;

              feed.push({
                id: o.id || `ped_${Date.now()}`,
                type: 'personalizado',
                title: summaryTitle,
                customerName,
                customerContact,
                amount,
                amountFormatted: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount),
                status: o.status || 'aguardando_pagamento',
                statusLabel:
                  o.status === 'aguardando_pagamento'
                    ? 'Aguardando Pagamento'
                    : o.status === 'em_producao'
                    ? 'Pago / Em Produção'
                    : o.status === 'pronto'
                    ? 'Pronto'
                    : o.status === 'entregue'
                    ? 'Entregue'
                    : 'Cancelado',
                createdAt: o.createdAt || new Date().toISOString(),
                tab: 'personalizados',
              });
            }
          }
        } catch (e) {
          console.warn('[LocalApiServer] Erro ao ler pedidos personalizados:', e);
        }

        // 2. Chamadas de Vídeo / Agendamentos
        try {
          if (appointmentsStore) {
            const bOrders = Object.values(appointmentsStore);
            for (const b of bOrders) {
              const amount = b.price || 0;
              feed.push({
                id: b.id,
                type: 'appointment',
                title: `Chamada: ${b.modalityName || 'Vídeo'}`,
                customerName: b.clientName || 'Cliente',
                customerContact: b.clientPhone || b.clientEmail || '',
                amount,
                amountFormatted: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount),
                status: b.status || 'aguardando_pagamento',
                statusLabel:
                  b.status === 'confirmada'
                    ? 'Confirmada'
                    : b.status === 'aguardando_pagamento'
                    ? 'Aguardando Pagamento'
                    : b.status === 'concluida'
                    ? 'Concluída'
                    : 'Cancelada',
                createdAt: b.createdAt || new Date().toISOString(),
                tab: 'appointments',
              });
            }
          }
        } catch (e) {
          console.warn('[LocalApiServer] Erro ao ler agendamentos:', e);
        }

        // Ordena por data decrescente
        feed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const pendingCount = feed.filter((i) =>
          ['aguardando_pagamento', 'em_producao', 'confirmada', 'pending', 'paid'].includes(i.status)
        ).length;

        return sendJson(200, {
          success: true,
          count: feed.length,
          pendingCount,
          orders: feed,
          updatedAt: new Date().toISOString(),
        });
      }

      // 5c. Endpoints de Personalizados (Ateliê Sob Medida)
      if (pathname === '/api/personalizados/create' && req.method === 'POST') {
        const body = await readJsonBody();
        const clientName = (body.clientName || '').trim();
        const clientContact = (body.clientContact || '').trim();
        const deliveryChannel = body.deliveryChannel || 'whatsapp';
        const photoCount = Math.max(0, Number(body.photoCount) || 0);
        const videoOptionId = body.videoOptionId || 'vid_none';
        const videoDurationMinutes = Number(body.videoDurationMinutes) || 0;
        const mentionName = Boolean(body.mentionName);
        const express24h = Boolean(body.express24h);
        const briefing = (body.briefing || '').trim();
        const totalPrice = Number(body.totalPrice) || 100;

        const orderId = `ped_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const publicToken = `tok_ped_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 6)}`;
        const nowIso = new Date().toISOString();
        const shortId = orderId.replace('ped_', '').slice(-6).toUpperCase();

        let pixPayload = '';
        let pixQrCode = '';
        let transactionId = `sim_${orderId}`;
        let paymentMethod = 'simulated_local_pix';
        let finalAmount = totalPrice;

        if (IS_TEST_MODE && !body.forceRealPayment) {
          const simulatedPixKey = `00020126580014br.gov.bcb.pix0136nua-simulado-pers-${orderId}5204000053039865405${totalPrice.toFixed(2)}5802BR5910NUA BORGES6009SAO PAULO62070503***6304ABCD`;
          pixPayload = simulatedPixKey;
          pixQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(simulatedPixKey)}`;
          console.log(`[LocalApiServer] 🧪 Encomenda Personalizada SIMULADA criada em localhost: ${orderId} (R$ ${totalPrice.toFixed(2)})`);
        } else if (MP_ACCESS_TOKEN) {
          try {
            const mpRes = await callMercadoPagoCreatePix({
              amount: totalPrice,
              description: `Nua Borges — Personalizado #${shortId} (${photoCount} fotos)`,
              payerEmail: clientContact.includes('@') ? clientContact : 'contato@nuaborges.com.br',
              payerName: clientName,
              externalReference: `nua_pers_${orderId}`,
            });
            transactionId = String(mpRes.id);
            pixPayload = mpRes.qrCode;
            pixQrCode = mpRes.qrCodeBase64;
            finalAmount = mpRes.amount;
            paymentMethod = 'mercadopago_pix';
          } catch (mpErr) {
            console.warn('[LocalApiServer] Falha Mercado Pago Personalizado, fallback para simulado:', mpErr.message);
            const simulatedPixKey = `00020126580014br.gov.bcb.pix0136nua-simulado-pers-${orderId}5204000053039865405${totalPrice.toFixed(2)}5802BR5910NUA BORGES6009SAO PAULO62070503***6304ABCD`;
            pixPayload = simulatedPixKey;
            pixQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(simulatedPixKey)}`;
          }
        } else {
          const simulatedPixKey = `00020126580014br.gov.bcb.pix0136nua-simulado-pers-${orderId}5204000053039865405${totalPrice.toFixed(2)}5802BR5910NUA BORGES6009SAO PAULO62070503***6304ABCD`;
          pixPayload = simulatedPixKey;
          pixQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(simulatedPixKey)}`;
        }

        const order = {
          id: orderId,
          publicToken,
          createdAt: nowIso,
          updatedAt: nowIso,
          clientName,
          clientContact,
          deliveryChannel,
          photoCount,
          videoOptionId,
          videoDurationMinutes,
          mentionName,
          express24h,
          briefing,
          totalPrice,
          status: 'aguardando_pagamento',
          payment: {
            status: 'pending',
            method: paymentMethod,
            amount: finalAmount,
            pixPayload,
            pixQrCode,
            transactionId,
          },
        };

        personalizadosStore[orderId] = order;
        saveJson(PERSONALIZADOS_FILE, personalizadosStore);

        // Registra também na ordersStore para integração universal com o CheckoutModal
        ordersStore[orderId] = {
          orderId,
          purchaseToken: publicToken,
          type: 'personalizado',
          slug: orderId,
          title: `Encomenda Personalizada (${photoCount} fotos)`,
          price: totalPrice,
          amount: finalAmount,
          isTestMode: IS_TEST_MODE,
          status: 'pending',
          mpPaymentId: transactionId,
          paymentMethod,
          externalReference: `nua_pers_${orderId}`,
          qrCode: pixPayload,
          qrCodeUrl: pixQrCode,
          createdAt: nowIso,
        };
        saveJson(ORDERS_FILE, ordersStore);

        console.log(`[LOCAL API] 🛍️ Pedido Personalizado registrado [${orderId}]: R$ ${finalAmount} (${clientName})`);
        return sendJson(201, { success: true, order });
      }

      if (pathname === '/api/personalizados/status') {
        if (req.method === 'GET') {
          const token = parsedUrl.searchParams.get('token');
          const orderId = parsedUrl.searchParams.get('orderId');
          const order = Object.values(personalizadosStore).find(
            (o) => (token && o.publicToken === token) || (orderId && o.id === orderId)
          );
          if (!order) return sendJson(404, { success: false, error: 'Pedido não localizado.' });
          return sendJson(200, { success: true, order });
        }

        if (req.method === 'POST') {
          const body = await readJsonBody();
          const { orderId } = body;
          const order = personalizadosStore[orderId];
          if (!order) return sendJson(404, { success: false, error: 'Pedido não encontrado.' });

          let isPaid = order.payment.status === 'approved';
          if (!isPaid && order.payment?.transactionId) {
            const txId = order.payment.transactionId;
            try {
              const mpCheck = await callMercadoPagoGetPayment(txId);
              if (mpCheck.success && mpCheck.status === 'approved') {
                isPaid = true;
                order.payment.amount = mpCheck.amount || order.payment.amount;
              }
            } catch (err) {
              console.warn('[LocalApiServer] Erro ao consultar MP status do personalizado:', err);
            }
          }

          if (isPaid && order.payment.status !== 'approved') {
            const nowIso = new Date().toISOString();
            order.payment.status = 'approved';
            order.payment.paidAt = nowIso;
            order.status = 'em_producao';
            order.updatedAt = nowIso;

            personalizadosStore[orderId] = order;
            saveJson(PERSONALIZADOS_FILE, personalizadosStore);

            console.log(`🎉 [LOCAL API] Pedido Personalizado [${orderId}] PAGO via Mercado Pago! Disparando SMTP para contato@nuaborges.com.br...`);

            // Disparo via Hostinger SMTP
            const smtpCreds = resolveSmtpCredentials();
            if (smtpCreds.user && smtpCreds.pass) {
              const shortId = order.id.replace('ped_', '').slice(-6).toUpperCase();
              const subject = `[Novo Personalizado] #PED-${shortId} — R$ ${order.totalPrice.toFixed(2)} (${order.clientName})`;
              const emailHtml = `
                <div style="background-color: #050507; color: #ffffff; padding: 40px 20px; font-family: -apple-system, sans-serif;">
                  <div style="max-width: 580px; margin: 0 auto; background-color: #0d0d12; border: 1px solid rgba(244,167,185,0.3); border-radius: 24px; padding: 32px 24px;">
                    <h2 style="color: #ffffff; font-size: 20px; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 4px;">Nua Borges ♡</h2>
                    <p style="color: #f4a7b9; font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase; margin-bottom: 24px;">Novo Pedido de Personalizado Confirmado (Pix)</p>
                    <table width="100%" cellpadding="6" style="font-size: 13px; color: #d4d4d8; background: #07070a; border-radius: 12px; margin-bottom: 20px;">
                      <tr><td style="color: #a1a1aa;">Cliente:</td><td><strong>${order.clientName}</strong></td></tr>
                      <tr><td style="color: #a1a1aa;">Contato:</td><td><strong>${order.clientContact} (${order.deliveryChannel.toUpperCase()})</strong></td></tr>
                      <tr><td style="color: #a1a1aa;">Fotos:</td><td>${order.photoCount} Fotos</td></tr>
                      <tr><td style="color: #a1a1aa;">Vídeo:</td><td>${order.videoDurationMinutes > 0 ? `${order.videoDurationMinutes} Minuto(s)` : 'Apenas fotos'}</td></tr>
                      <tr><td style="color: #a1a1aa;">Falar Nome:</td><td>${order.mentionName ? 'Sim' : 'Não'}</td></tr>
                      <tr><td style="color: #a1a1aa;">Express 24h:</td><td>${order.express24h ? 'Sim' : 'Não'}</td></tr>
                      <tr><td style="color: #a1a1aa;">Valor Total:</td><td><strong style="color: #f4a7b9; font-size: 16px;">R$ ${order.totalPrice.toFixed(2)}</strong></td></tr>
                    </table>
                    <p style="color: #a1a1aa; font-size: 12px; margin-bottom: 6px;">Briefing do Cliente:</p>
                    <div style="background: #000; border-left: 3px solid #f4a7b9; padding: 12px 16px; font-style: italic; color: #fff; margin-bottom: 20px;">
                      "${order.briefing || 'Sem observações adicionais.'}"
                    </div>
                  </div>
                </div>
              `;

              sendHostingerSmtpEmail({
                host: smtpCreds.host,
                port: smtpCreds.port,
                user: smtpCreds.user,
                pass: smtpCreds.pass,
                to: 'contato@nuaborges.com.br',
                subject,
                html: emailHtml,
              }).catch((err) => console.error('[LocalApiServer] Erro no envio SMTP Hostinger para Nua:', err));
            }

            return sendJson(200, { success: true, paid: true, order });
          }

          return sendJson(200, { success: true, paid: order.payment.status === 'approved', order });
        }
      }

      if (pathname === '/api/personalizados/admin') {
        if (req.method === 'GET') {
          const orders = Object.values(personalizadosStore).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          return sendJson(200, {
            success: true,
            settings: personalizadosSettingsStore,
            orders,
          });
        }

        if (req.method === 'POST') {
          const body = await readJsonBody();
          const { action, orderId, patch, settings } = body;

          if (action === 'save_settings' && settings) {
            personalizadosSettingsStore = settings;
            saveJson(PERSONALIZADOS_SETTINGS_FILE, settings);
            return sendJson(200, { success: true, settings });
          }

          if (action === 'update_order' && orderId && patch) {
            const order = personalizadosStore[orderId];
            if (!order) return sendJson(404, { success: false, error: 'Pedido não encontrado.' });
            Object.assign(order, patch, { updatedAt: new Date().toISOString() });
            personalizadosStore[orderId] = order;
            saveJson(PERSONALIZADOS_FILE, personalizadosStore);
            return sendJson(200, { success: true, order });
          }
        }
      }

      // 5c. Central de Solicitações (/api/requests) — espelha a Pages Function
      if (pathname === '/api/requests') {
        const readRequests = () => {
          const data = loadJson(REQUESTS_FILE, []);
          return Array.isArray(data) ? data : [];
        };
        const writeRequests = (list) => saveJson(REQUESTS_FILE, list);

        if (req.method === 'GET') {
          return sendJson(200, { requests: readRequests(), geminiConfigured: false });
        }

        if (req.method === 'POST') {
          const body = await readJsonBody();
          const action = String(body?.action || 'create');
          const nowIso = new Date().toISOString();
          const list = readRequests();

          if (action === 'create') {
            const text = String(body?.text || '').trim().slice(0, 5000);
            if (text.length < 3) {
              return sendJson(400, { success: false, error: 'Descreva a solicitação.' });
            }

            const triage = body?.triage && typeof body.triage === 'object' ? body.triage : {};
            const request = {
              id: `req_${crypto.randomUUID()}`,
              createdAt: nowIso,
              updatedAt: nowIso,
              source: triage.source === 'ia' || body?.source === 'ia' ? 'ia' : 'manual',
              title: String(triage.title || body?.title || text.slice(0, 60)).slice(0, 120),
              summary: String(triage.summary || text).slice(0, 2000),
              category: String(body?.category || 'Geral').slice(0, 100),
              type: ['bug', 'feature', 'improvement', 'content', 'visual', 'technical', 'out_of_scope'].includes(
                String(triage.type)
              )
                ? triage.type
                : 'improvement',
              priority: ['low', 'medium', 'high', 'critical', 'urgent'].includes(String(triage.priority))
                ? triage.priority
                : 'medium',
              contractScope: ['garantia', 'franquia_suporte', 'homologacao_ajuste', 'fora_de_escopo', 'adicional'].includes(
                String(triage.contractScope)
              )
                ? triage.contractScope
                : 'franquia_suporte',
              targetFiles: Array.isArray(triage.targetFiles)
                ? triage.targetFiles.filter((f) => typeof f === 'string').slice(0, 20)
                : [],
              status: 'new',
              messages: [
                {
                  id: crypto.randomUUID(),
                  role: body?.role === 'admin' ? 'developer' : 'client',
                  senderName: body?.role === 'admin' ? 'Administração' : 'Nua Borges',
                  text,
                  timestamp: nowIso,
                },
              ],
            };

            list.unshift(request);
            writeRequests(list);
            return sendJson(200, { success: true, request });
          }

          const id = String(body?.id || '');
          const index = list.findIndex((item) => String(item.id) === id);
          if (index < 0) {
            return sendJson(404, { success: false, error: 'Solicitação não encontrada.' });
          }

          const item = list[index];

          if (action === 'update') {
            const allowedStatuses = [
              'new',
              'pending',
              'analyzing',
              'planned',
              'in_progress',
              'review',
              'done',
              'rejected',
              'dismissed',
            ];
            if (body?.status) {
              if (!allowedStatuses.includes(String(body.status))) {
                return sendJson(400, { success: false, error: 'Andamento inválido.' });
              }
              item.status = body.status;
              if (body.status === 'done') item.completedAt = nowIso;
            }
            if (body?.patch && typeof body.patch === 'object') {
              const patch = body.patch;
              if (typeof patch.developerNotes === 'string') item.developerNotes = patch.developerNotes.slice(0, 4000);
              if (typeof patch.technicalPlan === 'string') item.technicalPlan = patch.technicalPlan.slice(0, 4000);
              if (typeof patch.estimatedHours === 'number') item.estimatedHours = patch.estimatedHours;
            }
          } else if (action === 'message') {
            const text = String(body?.text || '').trim().slice(0, 3000);
            if (!text) return sendJson(400, { success: false, error: 'Mensagem vazia.' });
            item.messages = Array.isArray(item.messages) ? item.messages : [];
            item.messages.push({
              id: crypto.randomUUID(),
              role: body?.role === 'admin' ? 'developer' : 'client',
              senderName: body?.role === 'admin' ? 'Administração' : 'Nua Borges',
              text,
              timestamp: nowIso,
            });
          } else if (action === 'approve_plan') {
            item.planApprovedByClient = true;
          } else if (action === 'delete') {
            list.splice(index, 1);
            writeRequests(list);
            return sendJson(200, { success: true, deletedId: id });
          } else {
            return sendJson(400, { success: false, error: 'Não reconheci essa ação.' });
          }

          item.updatedAt = nowIso;
          list[index] = item;
          writeRequests(list);
          return sendJson(200, { success: true, request: item });
        }
      }

      // 6. Webhook Oficial do Mercado Pago (Universal: Packs, Chamadas, Personalizados e Mensalidades)
      if ((pathname === '/api/finance/webhook' || pathname === '/api/webhooks/mercadopago') && req.method === 'POST') {
        const body = await readJsonBody();
        const paymentId = body?.data?.id || body?.id || parsedUrl.searchParams.get('id') || parsedUrl.searchParams.get('data.id');

        console.log(`[Mercado Pago Webhook] Notificação recebida (Payment ID: ${paymentId})`);

        if (paymentId && MP_ACCESS_TOKEN) {
          try {
            const mpPayment = await callMercadoPagoGetPayment(paymentId);
            const externalRef = mpPayment.externalReference || '';
            const status = mpPayment.status;
            const paidAmount = Number(mpPayment.amount || 0);
            const nowIso = mpPayment.dateApproved || new Date().toISOString();

            console.log(`[Mercado Pago Webhook] Pagamento ${paymentId}: Status='${status}', Ref='${externalRef}', Valor=R$ ${paidAmount}`);

            if (status === 'approved') {
              // A) Conteúdos e Packs Avulsos
              if (externalRef.startsWith('nua_avulso_') || externalRef.startsWith('nua_pack_') || externalRef.startsWith('ord_') || externalRef.includes('ord_')) {
                const orderIdMatch = externalRef.match(/(ord_[a-zA-Z0-9_-]+)/);
                const targetOrderId = orderIdMatch ? orderIdMatch[1] : externalRef;
                if (ordersStore[targetOrderId]) {
                  ordersStore[targetOrderId].status = 'approved';
                  ordersStore[targetOrderId].paidAt = nowIso;
                  ordersStore[targetOrderId].paidAmount = paidAmount;
                  ordersStore[targetOrderId].paymentMethod = 'mercadopago_pix';
                  saveJson(ORDERS_FILE, ordersStore);
                  console.log(`💰 [Mercado Pago Webhook] Venda de Pack APROVADA: ${targetOrderId}`);
                }
              }

              // B) Chamadas VIP
              if (externalRef.startsWith('nua_call_') || externalRef.startsWith('apt_') || externalRef.includes('book_')) {
                const bookMatch = externalRef.match(/(book_[a-zA-Z0-9_-]+)/);
                const targetBookingId = bookMatch ? bookMatch[1] : externalRef.replace(/^apt_/, '');
                if (appointmentsStore[targetBookingId]) {
                  const b = appointmentsStore[targetBookingId];
                  b.status = 'confirmada';
                  if (!b.payment) b.payment = {};
                  b.payment.status = 'approved';
                  b.payment.paidAt = nowIso;
                  b.meeting.visibleToClient = true;
                  appointmentsStore[targetBookingId] = b;
                  saveJson(APPOINTMENTS_FILE, appointmentsStore);
                  console.log(`📅 [Mercado Pago Webhook] Chamada VIP CONFIRMADA: ${targetBookingId}`);
                }
                if (ordersStore[targetBookingId]) {
                  ordersStore[targetBookingId].status = 'approved';
                  ordersStore[targetBookingId].paidAt = nowIso;
                  saveJson(ORDERS_FILE, ordersStore);
                }
              }

              // C) Encomendas Personalizadas
              if (externalRef.startsWith('nua_pers_') || externalRef.startsWith('ped_') || externalRef.includes('ped_')) {
                const pedMatch = externalRef.match(/(ped_[a-zA-Z0-9_-]+)/);
                const targetOrderId = pedMatch ? pedMatch[1] : externalRef;
                if (personalizadosStore[targetOrderId]) {
                  const p = personalizadosStore[targetOrderId];
                  p.status = 'em_producao';
                  if (!p.payment) p.payment = {};
                  p.payment.status = 'approved';
                  p.payment.paidAt = nowIso;
                  personalizadosStore[targetOrderId] = p;
                  saveJson(PERSONALIZADOS_FILE, personalizadosStore);
                  console.log(`🎨 [Mercado Pago Webhook] Encomenda Personalizada em PRODUÇÃO: ${targetOrderId}`);
                }
                if (ordersStore[targetOrderId]) {
                  ordersStore[targetOrderId].status = 'approved';
                  ordersStore[targetOrderId].paidAt = nowIso;
                  saveJson(ORDERS_FILE, ordersStore);
                }
              }
            }
          } catch (mpErr) {
            console.error('[Mercado Pago Webhook Error]:', mpErr.message);
          }
        }

        return sendJson(200, {
          success: true,
          received: true,
          paymentId,
        });
      }

      // 7. Endpoints da Nua IA Assistente (Sincronizado com AdminAssistant & Local File / Supabase Adapter)
      if (pathname === '/api/nua-ai/chat' && req.method === 'POST') {
        const body = await readJsonBody();
        try {
          const env = resolveFullEnv();
          const services = createAssistantServices(env, fetch, { origin: selfOrigin });
          const result = await assistantChat({ ...body, actorRole: body?.actorRole || 'dev' }, services);
          return sendJson(200, result);
        } catch (err) {
          console.error('[LocalApiServer] Nua IA Error:', err);
          const friendly =
            'Não consegui concluir sua solicitação agora. Nada foi alterado — tente novamente em instantes.';
          return sendJson(200, {
            ok: false,
            reply: friendly,
            conversationId: body?.conversationId || `conv_${Date.now()}`,
            actionExecuted: null,
            proposal: null,
            proposals: [],
            error: { code: 'CHAT_FAILED', friendly },
            sourcesUsed: { memory: false, history: false, knowledge: false },
            modelUsed: 'offline-fallback',
            source: 'system_error'
          });
        }
      }

      if (pathname === '/api/nua-ai/conversations' && req.method === 'GET') {
        try {
          const env = resolveFullEnv();
          const services = createAssistantServices(env);
          const conversations = await services.listConversations();
          return sendJson(200, { conversations });
        } catch (err) {
          return sendJson(503, { error: 'Não foi possível carregar as conversas.' });
        }
      }

      if (pathname.startsWith('/api/nua-ai/conversations/') && (req.method === 'GET' || req.method === 'DELETE')) {
        const convId = decodeURIComponent(pathname.replace('/api/nua-ai/conversations/', ''));
        const env = resolveFullEnv();
        const services = createAssistantServices(env);

        if (req.method === 'DELETE') {
          await services.delete(`nua_ai_conversation:${convId}`);
          return sendJson(200, { success: true, id: convId });
        }

        const record = await services.read(`nua_ai_conversation:${convId}`);
        if (!record) {
          return sendJson(200, { id: convId, title: 'Nova conversa', turns: [], summary: '' });
        }
        return sendJson(200, {
          id: record.id || convId,
          title: record.title || 'Conversa sem título',
          turns: record.turns || [],
          summary: record.summary || '',
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        });
      }

      // Endpoint para aprovação explícita humana de ações sensíveis com Nonce
      if (pathname === '/api/nua-ai/approve-action' && req.method === 'POST') {
        const body = await readJsonBody();
        const proposalId = String(body?.proposalId || '');
        const nonce = String(body?.nonce || '');

        if (!proposalId || !nonce) {
          return sendJson(400, {
            success: false,
            error: 'Não consegui identificar este pedido. Peça a ação novamente à Nua IA.',
          });
        }

        let services;
        try {
          const env = resolveFullEnv();
          services = createAssistantServices(env, fetch, { origin: selfOrigin });
        } catch {
          return sendJson(503, {
            success: false,
            error: 'A integração do painel está indisponível no momento. Tente novamente em instantes.',
          });
        }

        const key = `nua_ai_proposal:${proposalId}`;
        const proposal = await services.read(key).catch(() => null);

        if (!proposal) {
          return sendJson(404, {
            success: false,
            error: 'Este pedido não está mais disponível. Peça a ação novamente à Nua IA.',
          });
        }
        if (proposal.usedAt) {
          return sendJson(409, { success: false, error: 'Este pedido já foi aplicado.' });
        }
        if (Number(proposal.expiresAt) < Date.now()) {
          await services.delete(key).catch(() => {});
          return sendJson(410, {
            success: false,
            error: 'Este pedido expirou. Peça a ação novamente à Nua IA.',
          });
        }
        if (proposal.nonce !== nonce) {
          return sendJson(403, {
            success: false,
            error: 'Não foi possível confirmar este pedido. Peça a ação novamente à Nua IA.',
          });
        }

        // Marca como usada ANTES de executar (anti-replay).
        await services.write(key, { ...proposal, usedAt: new Date().toISOString() }).catch(() => {});

        try {
          const result = await executeApprovedProposal(proposal, services);

          const audit = (await services.read('nua_ai_audit:index').catch(() => [])) || [];
          await services
            .write('nua_ai_audit:index', [
              {
                at: new Date().toISOString(),
                actor: 'dev',
                tool: proposal.actionType,
                args: proposal.proposedChanges,
                ok: true,
                summary: result.message,
                approvedBy: 'human',
                proposalId,
              },
              ...(Array.isArray(audit) ? audit : []),
            ].slice(0, 200))
            .catch(() => {});

          return sendJson(200, { success: true, ...result });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Não consegui aplicar a alteração. Nada foi modificado.';
          // Libera nova tentativa: nada foi aplicado.
          await services.write(key, { ...proposal, usedAt: null, lastError: message }).catch(() => {});
          return sendJson(200, { success: false, error: message });
        }
      }

      // Consulta de rascunhos de packs criados pela IA ou pelo painel
      if (pathname === '/api/nua-ai/drafts' && req.method === 'GET') {
        const draftOpsFile = path.join(DATA_DIR, 'draft_products.json');
        const draftProducts = loadJson(draftOpsFile, []);
        return sendJson(200, { success: true, drafts: draftProducts });
      }

      // Consulta protegida aos logs de auditoria
      if (pathname === '/api/nua-ai/audit-logs' && req.method === 'GET') {
        const auditFile = path.join(DATA_DIR, 'admin_audit_log.jsonl');
        if (!fs.existsSync(auditFile)) {
          return sendJson(200, { logs: [] });
        }
        const lines = fs.readFileSync(auditFile, 'utf-8').trim().split('\n').filter(Boolean);
        const logs = lines.slice(-50).map((l) => {
          try { return JSON.parse(l); } catch { return null; }
        }).filter(Boolean);
        return sendJson(200, { logs });
      }

      // 7.4. Cofre de Credenciais Protegido (/api/admin/vault)
      if (pathname === '/api/admin/vault') {
        const vaultFile = path.join(DATA_DIR, 'local_vault_credentials.json');
        const list = loadJson(vaultFile, []);

        if (req.method === 'GET') {
          return sendJson(200, { success: true, credentials: list });
        }

        if (req.method === 'POST') {
          const body = await readJsonBody();
          if (!body || !body.id || !body.service || !body.title || !body.encryptedPassword) {
            return sendJson(400, { success: false, error: 'Dados da credencial incompletos.' });
          }

          const existingIndex = list.findIndex((c) => c.id === body.id);
          const now = new Date().toISOString();
          const record = {
            ...body,
            updatedAt: now,
            createdAt: existingIndex >= 0 ? list[existingIndex].createdAt : now,
          };

          if (existingIndex >= 0) {
            list[existingIndex] = record;
          } else {
            list.unshift(record);
          }

          saveJson(vaultFile, list);
          return sendJson(200, { success: true, credential: record });
        }

        if (req.method === 'DELETE') {
          const id = parsedUrl.searchParams.get('id');
          if (!id) {
            return sendJson(400, { success: false, error: 'ID da credencial é obrigatório.' });
          }

          const filtered = list.filter((c) => c.id !== id);
          saveJson(vaultFile, filtered);
          return sendJson(200, { success: true, deletedId: id });
        }
      }

      // 7.5. Dashboard Financeiro Comercial (Mercado Pago)
      if ((pathname === '/api/stripe/dashboard' || pathname === '/api/finance/dashboard') && req.method === 'GET') {
        const periodParam = parsedUrl.searchParams.get('period') || 'current_month';
        const modalityFilter = parsedUrl.searchParams.get('modality') || 'all';
        const statusFilter = parsedUrl.searchParams.get('status') || 'all';

        const stripeConnected = true;

        const now = new Date();
        let periodStartTimestamp = 0;
        let periodLabel = 'Mês Atual';

        if (periodParam === 'current_month') {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          periodStartTimestamp = Math.floor(startOfMonth.getTime() / 1000);
          const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
          periodLabel = `${monthNames[now.getMonth()]} de ${now.getFullYear()}`;
        } else if (periodParam === '30d') {
          periodStartTimestamp = Math.floor((now.getTime() - 30 * 24 * 60 * 60 * 1000) / 1000);
          periodLabel = 'Últimos 30 Dias';
        } else if (periodParam === '90d') {
          periodStartTimestamp = Math.floor((now.getTime() - 90 * 24 * 60 * 60 * 1000) / 1000);
          periodLabel = 'Últimos 90 Dias';
        } else {
          periodStartTimestamp = 0;
          periodLabel = 'Todo o Histórico';
        }

        const transactions = [];

        // Consolidação com pedidos de Packs, Chamadas e Personalizados do banco local
        Object.values(ordersStore).forEach((ord) => {
          if (!ord || transactions.some((t) => t.orderId === ord.orderId)) return;
          const isPaid = ord.status === 'approved' || ord.status === 'paid';
          const amountGross = Number(ord.paidAmount || ord.amount || ord.price || 0);
          const fee = Math.round(amountGross * 0.0099 * 100) / 100;
          const amountNet = Math.max(0, amountGross - fee);
          let mod = 'packs';
          let modLabel = 'Conteúdos & Packs';
          if (ord.type === 'personalizado') {
            mod = 'personalizados';
            modLabel = 'Personalizados';
          } else if (ord.type === 'chamada') {
            mod = 'chamadas';
            modLabel = 'Chamadas de Vídeo';
          }

          transactions.push({
            id: ord.orderId,
            chargeId: ord.orderId,
            orderId: ord.orderId,
            modality: mod,
            modalityLabel: modLabel,
            description: ord.title || `Venda Comercial • ${modLabel}`,
            customerName: ord.payerName || 'Cliente VIP',
            customerEmail: ord.payerEmail || '',
            amountGross,
            fee,
            amountNet,
            currency: 'BRL',
            status: isPaid ? 'succeeded' : 'pending',
            statusLabel: isPaid ? 'Confirmado' : 'Pendente',
            paymentMethod: ord.paymentMethod || 'pix',
            paymentMethodLabel: 'Pix Instantâneo (Mercado Pago)',
            createdAt: ord.paidAt || ord.createdAt || new Date().toISOString(),
            receiptUrl: null,
          });
        });

        // Inclui agendamentos de chamadas
        Object.values(appointmentsStore).forEach((apt) => {
          if (!apt || transactions.some((t) => t.orderId === apt.id || t.id === apt.id)) return;
          const isPaid = apt.status === 'confirmada' || apt.payment?.status === 'approved';
          const amountGross = Number(apt.payment?.amount || apt.price || 1500);
          const fee = Math.round(amountGross * 0.0099 * 100) / 100;
          const amountNet = Math.max(0, amountGross - fee);

          transactions.push({
            id: apt.id,
            chargeId: apt.id,
            orderId: apt.id,
            modality: 'chamadas',
            modalityLabel: 'Chamadas de Vídeo',
            description: `Chamada VIP • ${apt.modalityName || 'Privativo'}`,
            customerName: apt.clientName || 'Cliente VIP',
            customerEmail: apt.clientEmail || '',
            amountGross,
            fee,
            amountNet,
            currency: 'BRL',
            status: isPaid ? 'succeeded' : 'pending',
            statusLabel: isPaid ? 'Confirmado' : 'Pendente',
            paymentMethod: apt.payment?.method || 'pix',
            paymentMethodLabel: 'Pix Instantâneo (Mercado Pago)',
            createdAt: apt.payment?.paidAt || apt.createdAt || new Date().toISOString(),
            receiptUrl: null,
          });
        });

        // Inclui encomendas personalizadas
        Object.values(personalizadosStore).forEach((ped) => {
          if (!ped || transactions.some((t) => t.orderId === ped.id || t.id === ped.id)) return;
          const isPaid = ['em_producao', 'pronto', 'entregue'].includes(ped.status) || ped.payment?.status === 'approved';
          const amountGross = Number(ped.payment?.amount || ped.totalPrice || 100);
          const fee = Math.round(amountGross * 0.0099 * 100) / 100;
          const amountNet = Math.max(0, amountGross - fee);

          transactions.push({
            id: ped.id,
            chargeId: ped.id,
            orderId: ped.id,
            modality: 'personalizados',
            modalityLabel: 'Personalizados',
            description: `Produção Personalizada (${ped.photoCount || 0} fotos)`,
            customerName: ped.clientName || 'Cliente VIP',
            customerEmail: ped.clientContact || '',
            amountGross,
            fee,
            amountNet,
            currency: 'BRL',
            status: isPaid ? 'succeeded' : 'pending',
            statusLabel: isPaid ? 'Confirmado' : 'Pendente',
            paymentMethod: ped.payment?.method || 'pix',
            paymentMethodLabel: 'Pix Instantâneo (Mercado Pago)',
            createdAt: ped.payment?.paidAt || ped.createdAt || new Date().toISOString(),
            receiptUrl: null,
          });
        });

        // Mercado Pago conectado com sucesso

        transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const filtered = transactions.filter((t) => {
          const tTime = new Date(t.createdAt).getTime() / 1000;
          return tTime >= periodStartTimestamp;
        });

        let totalReceived = 0;
        let totalNet = 0;
        let totalFees = 0;
        let totalRefunds = 0;
        let salesCount = 0;
        let pendingCount = 0;
        let failedCount = 0;

        const modalities = {
          packs: { label: 'Conteúdos & Packs', gross: 0, net: 0, fees: 0, count: 0 },
          personalizados: { label: 'Personalizados', gross: 0, net: 0, fees: 0, count: 0 },
          chamadas: { label: 'Chamadas de Vídeo', gross: 0, net: 0, fees: 0, count: 0 },
        };

        filtered.forEach((t) => {
          if (t.status === 'succeeded') {
            totalReceived += t.amountGross;
            totalNet += t.amountNet;
            totalFees += t.fee;
            salesCount += 1;
            if (modalities[t.modality]) {
              modalities[t.modality].gross += t.amountGross;
              modalities[t.modality].net += t.amountNet;
              modalities[t.modality].fees += t.fee;
              modalities[t.modality].count += 1;
            }
          } else if (t.status === 'refunded') {
            totalRefunds += t.amountGross;
          } else if (t.status === 'pending') {
            pendingCount += 1;
          } else if (t.status === 'failed') {
            failedCount += 1;
          }
        });

        let displayed = filtered;
        if (modalityFilter !== 'all') displayed = displayed.filter((t) => t.modality === modalityFilter);
        if (statusFilter !== 'all') displayed = displayed.filter((t) => t.status === statusFilter);

        const available = Math.round(totalNet * 100) / 100;
        const pending = Math.round(pendingCount > 0 ? totalReceived * 0.1 : 0);

        return sendJson(200, {
          success: true,
          stripeConnected,
          period: periodParam,
          periodLabel,
          balance: { available, pending, currency: 'BRL' },
          summary: {
            totalReceived: Math.round(totalReceived * 100) / 100,
            totalNet: Math.round(totalNet * 100) / 100,
            totalFees: Math.round(totalFees * 100) / 100,
            totalRefunds: Math.round(totalRefunds * 100) / 100,
            salesCount,
            pendingCount,
            failedCount,
          },
          modalities,
          timeline: [],
          transactions: displayed,
          totalTransactionsCount: displayed.length,
          updatedAt: new Date().toISOString(),
        });
      }

      // 9. Assinaturas e Status do Contrato (/api/contract/sign)
      if (pathname === '/api/contract/sign') {
        const localContractFile = path.join(DATA_DIR, 'local_contract_signatures.json');

        const readLocalContract = () => {
          if (fs.existsSync(localContractFile)) {
            try {
              return JSON.parse(fs.readFileSync(localContractFile, 'utf-8'));
            } catch {}
          }
          return { contractor: null, client: null };
        };

        let state = readLocalContract();
        if (supabaseClient) {
          try {
            const { data } = await supabaseClient
              .from('site_content')
              .select('content')
              .eq('key', 'contract_signatures_v1_2')
              .maybeSingle();
            if (data?.content) {
              state = data.content;
              fs.writeFileSync(localContractFile, JSON.stringify(state, null, 2), 'utf-8');
            }
          } catch {}
        }

        const parties = {
          contractor: {
            name: 'João Philippe de Oliveira Boechat',
            role: 'CONTRATADO — Desenvolvedor Web',
            nationality: 'brasileiro',
            maritalStatus: 'solteiro',
            profession: 'desenvolvedor web',
            address: 'Ceilândia, Brasília/DF',
            email: 'contato@nuaborges.com',
            cpf: '[PROTEGIDO SOB AUTENTICAÇÃO]',
          },
          client: {
            name: 'Nayara Borges da Costa',
            artisticName: 'Nua Borges',
            role: 'CONTRATANTE — "Nua Borges"',
            nationality: 'brasileira',
            maritalStatus: 'casada',
            address: 'República da Irlanda',
            email: 'nua@nuaborges.com',
            cpf: '[PROTEGIDO SOB AUTENTICAÇÃO]',
          },
        };

        if (req.method === 'GET') {
          return sendJson(200, {
            ...state,
            parties,
            isFullySigned: Boolean(state.contractor && state.client),
          });
        }

        if (req.method === 'POST') {
          return sendJson(200, {
            success: true,
            message: 'O contrato já se encontra plenamente assinado e fixado de forma imutável.',
            signatures: state,
            parties,
          });
        }
      }

      // 9.1. Parcelas e Resumo do Contrato (/api/finance/installments)
      if (pathname === '/api/finance/installments' && req.method === 'GET') {
        const installments = loadLocalFinanceInstallments();
        const summary = buildLocalFinanceSummary(installments);
        return sendJson(200, {
          success: true,
          installments,
          summary: {
            ...summary,
            lastPaymentDate: installments.find((i) => i.paidAt)?.paidAt || null,
          },
        });
      }

      // 9.1.1. Gestão financeira do painel (/api/finance/admin)
      if (pathname === '/api/finance/admin') {
        const installments = loadLocalFinanceInstallments();

        if (req.method === 'GET') {
          return sendJson(200, {
            success: true,
            installments,
            summary: buildLocalFinanceSummary(installments),
            mercadopago: {
              configured: false,
              connected: false,
              message: 'Mercado Pago não é consultado no ambiente local.',
            },
          });
        }

        if (req.method === 'POST') {
          const body = await readJsonBody();
          const number = Number(body?.installmentNumber);
          if (!number || number < 1 || number > 10) {
            return sendJson(400, { success: false, error: 'Informe uma parcela entre 1 e 10.' });
          }

          const installment = installments.find((item) => item.number === number);
          if (!installment) {
            return sendJson(404, { success: false, error: 'Parcela não encontrada.' });
          }

          const nowIso = new Date().toISOString();

          if (body?.action === 'manual_pay') {
            installment.status = 'paid';
            installment.paidAt = body.paidAt || nowIso;
            installment.paidAmount = Number(body.paidAmount) || installment.amount;
            installment.paymentMethod = body.paymentMethod || 'manual';
            installment.paymentId =
              String(body.paymentId || '').trim() ||
              `MANUAL-${nowIso.slice(0, 10).replace(/-/g, '')}-P${number}`;
            installment.receiptHash = `local-${number}-${Date.now()}`;
            installment.updatedAt = nowIso;
            saveJson(FINANCE_FILE, installments);
            return sendJson(200, {
              success: true,
              message: `Parcela ${number} quitada.`,
              installment,
              installments,
              summary: buildLocalFinanceSummary(installments),
            });
          }

          if (body?.action === 'revert') {
            installment.status = 'pending';
            delete installment.paidAt;
            delete installment.paidAmount;
            delete installment.paymentMethod;
            delete installment.paymentId;
            delete installment.receiptHash;
            installment.updatedAt = nowIso;
            saveJson(FINANCE_FILE, installments);
            return sendJson(200, {
              success: true,
              message: `Parcela ${number} voltou para pendente.`,
              installment,
              installments,
              summary: buildLocalFinanceSummary(installments),
            });
          }

          return sendJson(400, { success: false, error: 'Não reconheci essa ação financeira.' });
        }
      }

      // 9.2. Biblioteca Musical e Configurações de Player (/api/music/*)
      if (pathname === '/api/music/list') {
        const musicFile = path.join(DATA_DIR, 'local_music_library.json');
        const defaultLib = {
          tracks: [],
          config: { enabled: true, autoplay: false, playlistTitle: 'Sensual Lounge', backgroundVideoEnabled: true },
        };
        const lib = loadJson(musicFile, defaultLib);
        return sendJson(200, lib);
      }

      if (pathname === '/api/music/config' && req.method === 'PUT') {
        const body = await readJsonBody();
        const musicFile = path.join(DATA_DIR, 'local_music_library.json');
        const lib = loadJson(musicFile, { tracks: [], config: { enabled: true, autoplay: false, playlistTitle: 'Sensual Lounge' } });
        lib.config = { ...lib.config, ...body };
        saveJson(musicFile, lib);
        return sendJson(200, { success: true, config: lib.config });
      }

      if (pathname === '/api/music/update' && (req.method === 'PUT' || req.method === 'DELETE')) {
        const body = await readJsonBody();
        const musicFile = path.join(DATA_DIR, 'local_music_library.json');
        const lib = loadJson(musicFile, { tracks: [], config: { enabled: true, autoplay: false, playlistTitle: 'Sensual Lounge' } });

        if (req.method === 'DELETE') {
          lib.tracks = lib.tracks.filter((t) => t.id !== body.id);
        } else {
          lib.tracks = lib.tracks.map((t) => (t.id === body.id ? { ...t, ...body, updatedAt: new Date().toISOString() } : t));
        }

        saveJson(musicFile, lib);
        return sendJson(200, { success: true });
      }

      // 9.3 Metadados OEmbed (/api/music/oembed) — espelha functions/api/music/oembed.ts
      if (pathname === '/api/music/oembed' && (req.method === 'GET' || req.method === 'POST')) {
        let targetUrl = '';
        if (req.method === 'GET') {
          targetUrl = String(parsedUrl.searchParams.get('url') || '');
        } else {
          const body = await readJsonBody();
          targetUrl = String(body?.url || '');
        }
        targetUrl = targetUrl.trim();

        if (!targetUrl) {
          return sendJson(400, { error: 'Parâmetro url é obrigatório.' });
        }
        if (!/^https?:\/\//i.test(targetUrl)) {
          return sendJson(400, { error: 'URL inválida. Use um link http(s) do provedor de música.' });
        }

        // A URL do usuário vai APENAS como parâmetro de query para o provedor
        // (nunca como destino da requisição) — sem risco de SSRF.
        const fetchJson = async (providerUrl) => {
          const res = await fetch(providerUrl, { signal: AbortSignal.timeout(8000) });
          if (!res.ok) return null;
          return res.json();
        };

        try {
          // A. YouTube
          const ytId = extractYouTubeId(targetUrl);
          if (ytId || targetUrl.includes('youtube.com') || targetUrl.includes('youtu.be')) {
            const data = await fetchJson(
              `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`,
            );
            if (data) {
              const videoId = ytId || null;
              return sendJson(200, {
                success: true,
                provider: 'youtube',
                type: 'youtube_video',
                title: data.title || 'Vídeo do YouTube',
                artist: data.author_name || 'YouTube',
                coverUrl: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : data.thumbnail_url || null,
                youtubeVideoId: videoId,
                url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : targetUrl,
                externalUrl: targetUrl,
              });
            }
          }

          // B. Spotify
          if (targetUrl.includes('spotify.com')) {
            const data = await fetchJson(`https://open.spotify.com/oembed?url=${encodeURIComponent(targetUrl)}`);
            if (data) {
              const rawTitle = data.title || 'Faixa do Spotify';
              const parts = rawTitle.includes(' - ') ? rawTitle.split(' - ') : [rawTitle, 'Spotify Artist'];
              return sendJson(200, {
                success: true,
                provider: 'spotify',
                type: 'spotify_track',
                title: parts[0],
                artist: parts.slice(1).join(' - ') || 'Spotify Artist',
                coverUrl: data.thumbnail_url || null,
                url: targetUrl,
                externalUrl: targetUrl,
              });
            }
          }

          // C. SoundCloud
          if (targetUrl.includes('soundcloud.com')) {
            const data = await fetchJson(
              `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(targetUrl)}`,
            );
            if (data) {
              return sendJson(200, {
                success: true,
                provider: 'soundcloud',
                type: 'external_audio',
                title: data.title || 'Faixa do SoundCloud',
                artist: data.author_name || 'SoundCloud',
                coverUrl: data.thumbnail_url || null,
                url: targetUrl,
                externalUrl: targetUrl,
              });
            }
          }

          // D. Fallback genérico (mesmo contrato da produção)
          return sendJson(200, {
            success: true,
            provider: 'generic',
            type: 'external_audio',
            title: 'Mídia Externa',
            artist: 'Nua Borges',
            coverUrl: null,
            url: targetUrl,
            externalUrl: targetUrl,
          });
        } catch (err) {
          console.error(`[LocalApiServer][${requestId}] OEmbed falhou:`, err.message);
          return sendJson(502, { error: 'Falha ao buscar metadados da URL fornecida.' });
        }
      }

      // 9.4 Upload de música (/api/music/upload) — espelha functions/api/music/upload.ts
      if (pathname === '/api/music/upload' && req.method === 'POST') {
        const musicFile = path.join(DATA_DIR, 'local_music_library.json');
        const defaultLib = {
          tracks: [],
          config: { enabled: true, autoplay: false, playlistTitle: 'Sensual Lounge' },
        };
        const contentTypeHeader = String(req.headers['content-type'] || '').toLowerCase();

        // A. Faixa externa (JSON: Spotify, YouTube, SoundCloud…)
        if (contentTypeHeader.includes('application/json')) {
          const body = await readJsonBody();
          const { title, artist, url, type, externalUrl, youtubeVideoId, coverUrl, order } = body || {};

          if (!title || (!url && !externalUrl)) {
            return sendJson(400, { error: 'Título e URL de mídia são obrigatórios.' });
          }

          const lib = loadJson(musicFile, defaultLib);
          const trackOrder = parseInt(order || '999', 10);
          const newTrack = {
            id: `track-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            title: String(title).substring(0, 200),
            artist: String(artist || 'Nua Borges').substring(0, 200),
            url: url || externalUrl,
            externalUrl: externalUrl || url,
            type: type || 'external_audio',
            youtubeVideoId: youtubeVideoId || null,
            coverUrl: coverUrl || null,
            active: true,
            order: isNaN(trackOrder) ? lib.tracks.length + 1 : trackOrder,
            addedAt: new Date().toISOString(),
          };

          lib.tracks.push(newTrack);
          lib.tracks.sort((a, b) => (a.order || 999) - (b.order || 999));
          saveJson(musicFile, lib);

          appendAuditEvent({
            type: 'MUSIC_UPLOAD',
            severity: 'info',
            actor: { ip: clientIpOf(req), userAgent: String(req.headers['user-agent'] || 'Desconhecido') },
            summary: `Nova faixa externa registrada: "${newTrack.title}" (${newTrack.type})`,
            details: { id: newTrack.id, title: newTrack.title, artist: newTrack.artist, type: newTrack.type },
          });

          return sendJson(200, { success: true, track: newTrack });
        }

        // B. Arquivo de áudio binário
        const MAX_AUDIO_BYTES = 60 * 1024 * 1024;
        const AUDIO_MIME_TYPES = [
          'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
          'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/ogg', 'audio/flac', 'audio/aac',
        ];

        const key = String(req.headers['x-object-key'] || '');
        const rawMime = String(req.headers['x-mime-type'] || '').toLowerCase().trim();
        const trackTitle = String(req.headers['x-track-title'] || 'Sem título');
        const trackArtist = String(req.headers['x-track-artist'] || 'Nua Borges');
        const trackOrder = parseInt(String(req.headers['x-track-order'] || '999'), 10);
        const coverUrlHeader = String(req.headers['x-track-cover'] || '');

        if (!key || !isValidObjectKey(key) || !key.startsWith('audio/')) {
          return sendJson(400, {
            error: 'Chave de objeto inválida. Use o formato: audio/nome-do-arquivo.mp3',
          });
        }
        if (!AUDIO_MIME_TYPES.includes(rawMime) && !/\.(mp3|wav|m4a|ogg|flac|aac)$/i.test(key)) {
          return sendJson(400, {
            error: 'Somente arquivos de áudio são aceitos (MP3, WAV, M4A, OGG, FLAC).',
          });
        }

        const bodyBytes = await readBinaryBody(req, MAX_AUDIO_BYTES);
        if (bodyBytes === null) {
          return sendJson(413, { error: `O arquivo excede o limite de ${Math.round(MAX_AUDIO_BYTES / (1024 * 1024))}MB.` });
        }
        if (!bodyBytes || bodyBytes.byteLength === 0) {
          return sendJson(400, { error: 'Arquivo vazio.' });
        }

        const magic = verifyMagicBytes(new Uint8Array(bodyBytes.subarray(0, 32)));
        if (!magic.valid) {
          return sendJson(400, {
            error: 'Arquivo inválido ou corrompido. Verifique se é um arquivo de áudio válido.',
          });
        }

        const target = resolvePublicPath(key);
        if (!target) {
          return sendJson(400, { error: 'Caminho de destino inválido.' });
        }
        try {
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, bodyBytes);
        } catch (err) {
          console.error(`[LocalApiServer][${requestId}] Falha ao gravar áudio local:`, err.message);
          return sendJson(500, { error: 'Falha interna ao armazenar o áudio.', requestId });
        }

        const verifiedMime = magic.detectedMime || rawMime || 'audio/mpeg';
        const audioUrl = `/${key}`;
        const lib = loadJson(musicFile, defaultLib);
        const newTrack = {
          id: `track-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: trackTitle.substring(0, 200),
          artist: trackArtist.substring(0, 200),
          url: audioUrl,
          objectKey: key,
          type: 'audio_file',
          coverUrl: coverUrlHeader || null,
          active: true,
          order: isNaN(trackOrder) ? lib.tracks.length + 1 : trackOrder,
          addedAt: new Date().toISOString(),
          sizeBytes: bodyBytes.byteLength,
          mimeType: verifiedMime,
          duration: null,
        };
        lib.tracks.push(newTrack);
        lib.tracks.sort((a, b) => (a.order || 999) - (b.order || 999));
        saveJson(musicFile, lib);

        appendAuditEvent({
          type: 'MUSIC_UPLOAD',
          severity: 'info',
          actor: { ip: clientIpOf(req), userAgent: String(req.headers['user-agent'] || 'Desconhecido') },
          summary: `Nova música adicionada: "${newTrack.title}" (${Math.round(bodyBytes.byteLength / 1024)} KB)`,
          details: { key, url: audioUrl, title: newTrack.title, artist: newTrack.artist, sizeBytes: bodyBytes.byteLength },
        });

        return sendJson(200, { success: true, track: newTrack });
      }

      // 10. Status do Servidor Local
      if (pathname === '/api/status' || pathname === '/api/nua-ai/status') {
        return sendJson(200, {
          status: 'ok',
          service: 'Nua Borges Central Local API',
          mercadoPago: {
            configured: !!MP_ACCESS_TOKEN,
            testMode: IS_TEST_MODE,
          },
          port,
        });
      }

      // 11. Auditoria de eventos (/api/audit/event) — espelha functions/api/audit/event.ts
      if (pathname === '/api/audit/event' && req.method === 'POST') {
        const body = await readJsonBody();
        const type = String(body?.type || '').trim().slice(0, 80);
        const summary = String(body?.summary || '').trim().slice(0, 500);
        const severity = ['info', 'warning', 'critical', 'alert'].includes(body?.severity)
          ? body.severity
          : 'info';

        if (!type || !summary) {
          return sendJson(400, { success: false, error: 'Campos "type" e "summary" são obrigatórios.' });
        }

        const event = appendAuditEvent({
          timestamp: new Date().toISOString(),
          type,
          severity,
          actor: {
            ip: clientIpOf(req),
            userAgent: String(req.headers['user-agent'] || 'Desconhecido'),
          },
          summary,
          details: body?.details,
        });
        return sendJson(200, { success: true, event });
      }

      // 11.1 Feed de auditoria (/api/audit/feed) — espelha functions/api/audit/feed.ts
      if (pathname === '/api/audit/feed' && req.method === 'GET') {
        const events = readAuditEvents(500);
        const stats = {
          totalEvents: events.length,
          totalUploads: events.filter((e) => e.type === 'MEDIA_UPLOAD').length,
          totalEdits: events.filter((e) => e.type === 'CONTENT_DRAFT_SAVE' || e.type === 'CONTENT_PUBLISH').length,
          totalHoneypotTraps: events.filter((e) => String(e.type || '').startsWith('HONEYPOT_')).length,
          totalLogins: events.filter((e) => String(e.type || '').startsWith('ADMIN_LOGIN')).length,
          lastActivity: events[0]?.timestamp || null,
        };
        return sendJson(200, { events, stats });
      }

      // 12. Presign de upload (/api/media/presign) — espelha functions/api/media/presign.ts
      if (pathname === '/api/media/presign' && req.method === 'POST') {
        const body = await readJsonBody();
        const key = String(body?.key || '');
        const mimeType = String(body?.mimeType || '').toLowerCase().trim();

        if (!isValidObjectKey(key)) {
          return sendJson(400, { success: false, error: 'Chave de objeto inválida ou fora do diretório permitido.' });
        }
        if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
          return sendJson(400, { success: false, error: 'Tipo de arquivo não permitido.' });
        }

        // O servidor local não emite URL assinada (sem credencial B2 no dev).
        // Resposta 200 com uploadUrl vazio informa ao cliente para usar /api/media/upload,
        // evitando o ciclo 501/404 que antes gerava ruído no console.
        return sendJson(200, { uploadUrl: '', fallback: 'multipart', reason: 'presign-unavailable' });
      }

      // 12.1 Upload direto (/api/media/upload) — espelha functions/api/media/upload.ts
      if (pathname === '/api/media/upload' && req.method === 'POST') {
        const key = String(req.headers['x-object-key'] || '');
        const rawMime = String(req.headers['x-mime-type'] || req.headers['content-type'] || '')
          .toLowerCase()
          .trim()
          .split(';')[0]
          .trim();

        if (!isValidObjectKey(key)) {
          return sendJson(400, { success: false, error: 'Chave de objeto inválida ou fora do diretório permitido.' });
        }

        const bodyBytes = await readBinaryBody(req, MAX_MEDIA_BYTES);
        if (bodyBytes === null) {
          return sendJson(413, {
            success: false,
            error: `O arquivo excede o limite máximo permitido de ${Math.round(MAX_MEDIA_BYTES / (1024 * 1024))}MB.`,
          });
        }
        if (!bodyBytes || bodyBytes.byteLength === 0) {
          return sendJson(400, { success: false, error: 'Corpo da requisição vazio.' });
        }

        const magic = verifyMagicBytes(new Uint8Array(bodyBytes.subarray(0, 32)));
        if (!magic.valid) {
          return sendJson(400, {
            success: false,
            error: 'Assinatura binária do arquivo inválida. Apenas imagens e vídeos autênticos são aceitos.',
          });
        }
        if (magic.detectedMime && !isExtensionMatchingMime(key, magic.detectedMime)) {
          return sendJson(400, {
            success: false,
            error: 'A extensão informada no nome do arquivo não corresponde ao tipo MIME real do binário.',
          });
        }

        const target = resolvePublicPath(key);
        if (!target) {
          return sendJson(400, { success: false, error: 'Caminho de destino inválido.' });
        }

        try {
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, bodyBytes);
        } catch (err) {
          console.error(`[LocalApiServer][${requestId}] Falha ao gravar mídia local:`, err.message);
          return sendJson(500, { success: false, error: 'Falha interna ao armazenar mídia.', requestId });
        }

        const verifiedMime = magic.detectedMime || rawMime || 'application/octet-stream';
        const isVideo = verifiedMime.startsWith('video/');

        appendAuditEvent({
          type: 'MEDIA_UPLOAD',
          severity: 'info',
          actor: { ip: clientIpOf(req), userAgent: String(req.headers['user-agent'] || 'Desconhecido') },
          summary: `Upload de mídia: ${key} (${Math.round(bodyBytes.byteLength / 1024)} KB)`,
          details: { key, url: `/${key}`, sizeBytes: bodyBytes.byteLength, mimeType: verifiedMime, isVideo },
        });

        return sendJson(200, {
          success: true,
          key,
          url: `/${key}`,
          sizeBytes: bodyBytes.byteLength,
        });
      }

      // 12.2 Exclusão de mídia (/api/media/delete) — espelha functions/api/media/delete.ts
      if (pathname === '/api/media/delete' && req.method === 'POST') {
        const body = await readJsonBody();
        const rawKeys = Array.isArray(body?.keys) ? body.keys : body?.key ? [body.key] : [];
        const keys = rawKeys.map(String).filter((k) => isValidObjectKey(k)).slice(0, 100);

        if (keys.length === 0) {
          return sendJson(400, { success: false, error: 'Nenhuma chave de mídia válida informada.' });
        }

        const deleted = [];
        for (const key of keys) {
          const target = resolvePublicPath(key);
          if (!target) continue;
          try {
            if (fs.existsSync(target)) {
              fs.unlinkSync(target);
              deleted.push(key);
            }
          } catch (err) {
            console.error(`[LocalApiServer][${requestId}] Falha ao remover mídia:`, err.message);
          }
        }

        appendAuditEvent({
          type: 'MEDIA_DELETE',
          severity: 'warning',
          actor: { ip: clientIpOf(req), userAgent: String(req.headers['user-agent'] || 'Desconhecido') },
          summary: `Exclusão de mídia: ${deleted.join(', ') || '(nenhum arquivo local)'}`,
          details: { keys: deleted, requested: keys.length },
        });

        return sendJson(200, { success: true, deleted });
      }

      // 12.3 Listagem de mídia (/api/media/list)
      if (pathname === '/api/media/list' && req.method === 'GET') {
        const limit = Math.min(Math.max(parseInt(parsedUrl.searchParams.get('limit') || '60', 10) || 60, 1), 300);
        const items = listLocalMedia(limit);
        return sendJson(200, { items, total: items.length });
      }

      // 13. Telemetria de escuta (/api/telemetry/track) — descartável, sem efeito colateral
      if (pathname === '/api/telemetry/track' && req.method === 'POST') {
        await readJsonBody();
        res.writeHead(204);
        res.end();
        return;
      }

      // 14. Login administrativo (/api/auth/login) — espelha functions/api/auth/login.ts
      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const body = await readJsonBody();
        const password = String(body?.password || '').trim();
        const clientIp = clientIpOf(req);

        if (!registerAuthAttempt(clientIp)) {
          res.setHeader('Retry-After', '900');
          return sendJson(429, {
            error: 'Muitas tentativas de login. Aguarde 15 minutos antes de tentar novamente.',
          });
        }
        if (!password) {
          return sendJson(400, { error: 'Senha é obrigatória.' });
        }

        // Credenciais vêm apenas do ambiente local (.dev.vars / .env.local).
        // Nenhuma senha é aceita por padrão hardcoded neste arquivo.
        const env = resolveFullEnv();
        const adminPassword = env.ADMIN_PASSWORD || '';
        const clientPassword = env.CLIENT_PASSWORD || env.PORTAL_PASSWORD || '';
        const adminSecret = env.ADMIN_API_SECRET || '';

        if (!adminPassword && !clientPassword && !adminSecret) {
          return sendJson(503, {
            error: 'Servidor local sem credenciais administrativas configuradas (.dev.vars / .env.local).',
          });
        }

        // Papel por credencial (mesma semântica da produção)
        let matchedRole = null;
        if (adminPassword && timingSafeEqualString(password, adminPassword)) {
          matchedRole = clientPassword ? 'dev' : 'admin';
        } else if (adminSecret && timingSafeEqualString(password, adminSecret)) {
          matchedRole = 'admin';
        } else if (clientPassword && timingSafeEqualString(password, clientPassword)) {
          matchedRole = 'client';
        }

        if (!matchedRole) {
          appendAuditEvent({
            type: 'ADMIN_LOGIN_FAIL',
            severity: 'warning',
            actor: { ip: clientIp, userAgent: String(req.headers['user-agent'] || 'Desconhecido') },
            summary: `Tentativa de login falha no painel administrativo a partir de ${clientIp}`,
            details: { clientIp },
          });
          return sendJson(401, { error: 'Senha incorreta. Verifique e tente novamente.' });
        }

        clearAuthAttempts(clientIp);
        const token = createAdminSession(matchedRole, matchedRole);

        appendAuditEvent({
          type: 'ADMIN_LOGIN_SUCCESS',
          severity: 'info',
          actor: { ip: clientIp, userAgent: String(req.headers['user-agent'] || 'Desconhecido') },
          summary: `Login autenticado com sucesso [Perfil: ${matchedRole}] (${clientIp})`,
          details: { clientIp, role: matchedRole },
        });

        res.setHeader(
          'Set-Cookie',
          `nua_admin_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 60 * 60}`,
        );
        return sendJson(200, {
          success: true,
          token,
          role: matchedRole,
          message: 'Login efetuado com sucesso.',
        });
      }

      // 15. Sessão administrativa (/api/auth/session) — espelha functions/api/auth/session.ts
      if (pathname === '/api/auth/session' && req.method === 'GET') {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        const token = readAdminToken(req, parsedUrl);
        const session = token ? adminSessions.get(token) : null;

        if (session && session.expiresAt > Date.now()) {
          return sendJson(200, { authenticated: true, role: session.role, sub: session.sub });
        }
        if (session) adminSessions.delete(token);

        // Dispensa local idêntica à da produção (hostname localhost/127.0.0.1
        // em desenvolvimento) — o cliente também dispensa em isLocalhost().
        const host = String(req.headers.host || '').split(':')[0].replace(/^\[|\]$/g, '');
        if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
          return sendJson(200, { authenticated: true, role: 'dev', sub: 'local_dev' });
        }
        return sendJson(200, { authenticated: false });
      }

      // 16. Logout (/api/auth/logout)
      if (pathname === '/api/auth/logout' && req.method === 'POST') {
        const token = readAdminToken(req, parsedUrl);
        if (token) adminSessions.delete(token);
        res.setHeader('Set-Cookie', 'nua_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
        return sendJson(200, { success: true });
      }

      // 17. Acesso ao contrato (/api/auth/contract) — espelha functions/api/auth/contract.ts
      if (pathname === '/api/auth/contract' && req.method === 'POST') {
        const body = await readJsonBody();
        const password = String(body?.password || '').trim();
        const clientIp = clientIpOf(req);

        if (!registerAuthAttempt(clientIp)) {
          res.setHeader('Retry-After', '900');
          return sendJson(429, {
            error: 'Muitas tentativas de acesso. Aguarde 15 minutos antes de tentar novamente.',
          });
        }
        if (!password) {
          return sendJson(400, { error: 'Chave de acesso é obrigatória.' });
        }

        const env = resolveFullEnv();
        const expectedContract = env.CONTRACT_PASSWORD || '';
        const expectedAdmin = env.ADMIN_PASSWORD || '';
        const secret = env.ADMIN_API_SECRET || env.ADMIN_PASSWORD || '';

        if (!expectedContract && !expectedAdmin) {
          return sendJson(503, { error: 'Servidor sem chave de contrato configurada.' });
        }

        let isValid = expectedContract ? timingSafeEqualString(password, expectedContract) : false;
        if (!isValid && expectedAdmin) isValid = timingSafeEqualString(password, expectedAdmin);

        if (!isValid) {
          return sendJson(401, { error: 'Chave de acesso inválida. Verifique e tente novamente.' });
        }
        if (!secret) {
          return sendJson(503, { error: 'Servidor sem segredo de emissão de token configurado.' });
        }

        clearAuthAttempts(clientIp);
        const role = expectedAdmin && timingSafeEqualString(password, expectedAdmin) ? 'contract_dev' : 'contract_client';
        const token = createAdminSession(role, role);
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        return sendJson(200, {
          success: true,
          token,
          role,
          message: 'Acesso autorizado ao documento contratual.',
        });
      }

      // 13.1 Mídia pública em dev (/media/* e /audio/*) — espelha as Pages Functions
      // functions/media/[[path]].ts e functions/audio/[[path]].ts, que não existem
      // no servidor local. Arquivos já presentes em public/ são resolvidos pelo Next
      // antes do rewrite; aqui só entram os objetos que vivem apenas no bucket.
      if (
        (pathname.startsWith('/media/') || pathname.startsWith('/audio/')) &&
        (req.method === 'GET' || req.method === 'HEAD')
      ) {
        const isAudioRoute = pathname.startsWith('/audio/');
        let decoded;
        try {
          decoded = decodeURIComponent(pathname);
        } catch {
          return sendJson(400, { success: false, error: 'Caminho de mídia inválido.', requestId });
        }

        // Espelha a normalização da produção: remove prefixos duplicados da rota.
        const rest = decoded
          .replace(/^\/(media|audio)\//, '')
          .replace(/^(media|audio)\//, '');
        const key = isAudioRoute ? `audio/${rest}` : `media/${rest}`;

        if (!isValidObjectKey(key)) {
          return sendJson(400, { success: false, error: 'Chave de mídia inválida.', requestId });
        }
        // Mídias privadas exigem comprovação de compra/administração em produção;
        // nenhum cliente as solicita, então em dev falhamos fechado.
        if (key.includes('/private/')) {
          return sendJson(403, { success: false, error: 'Mídia privada não autorizada.', requestId });
        }

        const localPath = resolvePublicPath(key);
        if (localPath && fs.existsSync(localPath)) {
          try {
            const bytes = fs.readFileSync(localPath);
            const type = resolveMediaContentType(key, '') || 'application/octet-stream';
            return sendMediaBytes(req, res, bytes, type);
          } catch (err) {
            console.error(`[LocalApiServer][${requestId}] Falha ao ler mídia local ${key}:`, err.message);
          }
        }

        const env = resolveFullEnv();
        let fetched = null;
        try {
          fetched = await fetchRemoteMedia(key, env);
        } catch (err) {
          const status = err?.$metadata?.httpStatusCode;
          const notFound = err?.name === 'NoSuchKey' || err?.name === 'NotFound' || status === 404;
          if (notFound) {
            return sendJson(404, {
              success: false,
              error: 'Mídia não encontrada no armazenamento remoto.',
              requestId,
            });
          }
          console.error(`[LocalApiServer][${requestId}] Falha ao baixar mídia remota ${key}:`, err.message);
          return sendJson(502, {
            success: false,
            error: 'Falha ao obter a mídia do armazenamento remoto.',
            requestId,
          });
        }

        if (!fetched) {
          return sendJson(503, {
            success: false,
            error: 'Armazenamento remoto de mídia não configurado para desenvolvimento local.',
            requestId,
          });
        }
        if (fetched.bytes.byteLength > MAX_REMOTE_MEDIA_BYTES) {
          return sendJson(413, { success: false, error: 'Mídia remota excede o limite de leitura.', requestId });
        }

        const contentType = resolveMediaContentType(key, fetched.contentType);
        if (!contentType) {
          return sendJson(415, { success: false, error: 'Tipo de mídia não permitido.', requestId });
        }

        // Cache em disco (best-effort, escrita atômica) para as próximas requisições
        // serem servidas estaticamente pelo próprio Next.
        if (localPath) {
          try {
            fs.mkdirSync(path.dirname(localPath), { recursive: true });
            const tmpPath = `${localPath}.part`;
            fs.writeFileSync(tmpPath, fetched.bytes);
            fs.renameSync(tmpPath, localPath);
          } catch (err) {
            console.warn(`[LocalApiServer][${requestId}] Não foi possível cachear ${key} localmente:`, err.message);
          }
        }

        return sendMediaBytes(req, res, fetched.bytes, contentType);
      }

      // Rota padrão 404
      return sendJson(404, {
        success: false,
        error: `Rota não encontrada: ${pathname}`,
        requestId,
      });
    } catch (err) {
      // Log completo apenas no terminal do servidor. Ao cliente devolvemos somente
      // um identificador — nunca mensagem interna, stack trace ou caminho de arquivo.
      console.error(`[LocalApiServer][${requestId}] Erro em ${req.method} ${pathname}:`, err);
      if (!res.headersSent) {
        return sendJson(500, {
          success: false,
          error: 'Erro interno no servidor local de desenvolvimento.',
          requestId,
        });
      }
      try {
        res.end();
      } catch {}
    }
  });

  return new Promise((resolve, reject) => {
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[LocalApiServer] Porta ${port} já em uso. Servidor já está rodando.`);
        resolve(server);
      } else {
        reject(err);
      }
    });

    // Loopback only: a API local expõe cofre, pagamentos e conteúdo de admin.
    // Escutar em 0.0.0.0 deixaria essas rotas acessíveis para outros dispositivos da rede.
    server.listen(port, '127.0.0.1', () => {
      console.log(`🚀 [LocalApiServer] Nua Borges API Central ativa em http://127.0.0.1:${port}!`);
      console.log(`💳 Mercado Pago TestMode: ${IS_TEST_MODE ? 'ATIVO (R$ 0,01)' : 'DESATIVADO (Preço Real)'}`);
      resolve(server);
    });
  });
}

// Execução direta via terminal: node tools/localApiServer.mjs
if (process.argv[1] && process.argv[1].endsWith('localApiServer.mjs')) {
  startLocalApiServer(PORT).catch((err) => {
    console.error('Falha ao iniciar servidor local:', err);
    process.exit(1);
  });
}
