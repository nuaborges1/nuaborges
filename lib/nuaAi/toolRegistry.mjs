/**
 * NUA IA — Registro ÚNICO de ferramentas (declaração + validação + permissão + execução).
 *
 * Regras de ouro deste arquivo:
 * 1. Toda ferramenta declarada ao modelo TEM executor real. Nada de ferramenta fantasma.
 * 2. Nenhuma ferramenta aceita SQL, caminho de arquivo, chave de storage ou URL arbitrária.
 * 3. Mídia só é anexada se existir na biblioteca real do rascunho.
 * 4. Alvo ambíguo NUNCA cai silenciosamente no primeiro item: a ferramenta falha e explica.
 * 5. Ação sensível nunca executa direto: gera proposta com nonce para confirmação humana.
 *
 * Este módulo é JavaScript puro (.mjs) porque é importado tanto pelo servidor local
 * (tools/localApiServer.mjs) quanto pela Pages Function (functions/api/nua-ai/chat.ts).
 */

import { applyContentOps } from './contentOps.mjs';

export const MAX_TOOL_CALLS_PER_TURN = 4;
export const MAX_PACK_MEDIA = 20;
export const PROPOSAL_TTL_MS = 10 * 60 * 1000;

export const FIELD_MAP = {
  hero: ['eyebrow', 'title', 'tagline', 'description', 'ctaText', 'ctaUrl', 'exploreText'],
  about: ['eyebrow', 'headline', 'role', 'pullQuote', 'paragraph1', 'paragraph2', 'signature'],
  gallery: ['eyebrow', 'title', 'subtitle'],
  contact: ['modalTitle', 'modalSubtitle', 'officialEmail'],
  footer: ['brandName', 'role', 'concept', 'copyrightText', 'signOff'],
  seo: ['title', 'description', 'keywords', 'canonicalUrl', 'ogImage'],
  header: ['brandName', 'brandMonogram', 'onlyFansText', 'onlyFansUrl'],
  institutional: ['sectionTitle', 'description', 'ageNoticeTitle', 'ageNoticeDescription', 'termsSummary', 'privacySummary'],
  vipClub: ['eyebrow', 'title', 'subtitle', 'buttonText'],
  avulsos: ['eyebrow', 'title', 'subtitle', 'upsellText', 'upsellUrl'],
  channels: ['eyebrow', 'title', 'subtitle'],
  'channels.onlyfans': ['title', 'description', 'badge', 'buttonText', 'url'],
  'channels.privacy': ['title', 'description', 'badge', 'buttonText', 'url'],
  'channels.closefans': ['title', 'description', 'badge', 'buttonText', 'url'],
  'channels.instagram': ['title', 'handle', 'description', 'buttonText', 'url'],
  'channels.contactBanner': ['title', 'description', 'buttonText'],
};

const PACK_EDITABLE = [
  'title',
  'description',
  'longDescription',
  'badge',
  'buttonText',
  'price',
  'numericPrice',
  'active',
  'duration',
  'imageUrl',
  'checkoutUrl',
];

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const clone = (value) => JSON.parse(JSON.stringify(value));

export function cleanText(value, max = 4000) {
  if (typeof value !== 'string' || value.length > max) throw new Error('Texto inválido ou muito longo.');
  if (/<\/?[a-z][^>]*>/i.test(value)) throw new Error('Use texto simples, sem HTML.');
  return value;
}

export function validUrl(value) {
  if (typeof value !== 'string') return false;
  if (/^\/media\/[a-zA-Z0-9_./-]+$/.test(value) && !value.includes('..')) return true;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function fmtBrl(value) {
  return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
}

/** Data amigável (AAAA-MM-DD → DD/MM/AAAA). */
function fmtDateBr(value) {
  const text = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const [year, month, day] = text.split('-');
  return `${day}/${month}/${year}`;
}

const REQUEST_STATUS_LABELS = {
  new: 'Nova',
  analyzing: 'Em análise',
  planned: 'Planejada',
  in_progress: 'Em andamento',
  review: 'Em revisão',
  done: 'Concluída',
  cancelled: 'Cancelada',
};

const WEEKDAY_LABELS = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

function formatWeeklyHoursSummary(weeklyHours) {
  const parts = [];
  for (let day = 0; day <= 6; day += 1) {
    const schedule = weeklyHours?.[day] ?? weeklyHours?.[String(day)];
    if (!schedule?.enabled || !Array.isArray(schedule.ranges) || schedule.ranges.length === 0) continue;
    const hours = schedule.ranges
      .filter((range) => range?.start && range?.end)
      .map((range) => `${range.start} às ${range.end}`)
      .join(' e ');
    if (hours) parts.push(`${WEEKDAY_LABELS[day]}: ${hours}`);
  }
  return parts;
}

/** Mescla alterações parciais de agenda sobre a configuração atual. */
function mergeAppointmentSettingsPatch(base, patch) {
  const current = base && typeof base === 'object' ? base : {};
  const incoming = patch && typeof patch === 'object' ? patch : {};
  const merged = { ...current, ...incoming };

  if (incoming.weeklyHours && typeof incoming.weeklyHours === 'object') {
    const weekly = { ...(current.weeklyHours || {}) };
    for (let day = 0; day <= 6; day += 1) {
      const dayPatch = incoming.weeklyHours[day] ?? incoming.weeklyHours[String(day)];
      if (!dayPatch || typeof dayPatch !== 'object') continue;
      const previous = weekly[day] ?? weekly[String(day)] ?? { enabled: false, ranges: [] };
      weekly[day] = {
        enabled: typeof dayPatch.enabled === 'boolean' ? dayPatch.enabled : previous.enabled,
        ranges: Array.isArray(dayPatch.ranges)
          ? dayPatch.ranges
              .filter((range) => range && typeof range.start === 'string' && typeof range.end === 'string')
              .map((range) => ({ start: range.start, end: range.end }))
          : previous.ranges,
      };
      delete weekly[String(day)];
    }
    merged.weeklyHours = weekly;
  }

  return merged;
}

function parseMoney(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d,.]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
    const parsed = Number.parseFloat(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function money(value, fallback = 0) {
  const numeric = Math.max(0, parseMoney(value, fallback));
  return { numericPrice: numeric, price: fmtBrl(numeric) };
}

function norm(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function slugify(title, id) {
  const base = norm(title)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base || 'pack'}-${String(id).slice(-8)}`;
}

function trimValue(value, maxString = 700, maxItems = 40) {
  if (typeof value === 'string') return value.length > maxString ? `${value.slice(0, maxString)}…` : value;
  if (Array.isArray(value)) return value.slice(0, maxItems).map((v) => trimValue(v, maxString, maxItems));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, trimValue(v, maxString, maxItems)]));
  }
  return value;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function getLibrary(content) {
  return Array.isArray(content?.library) ? content.library : [];
}

function packMediaStats(pack) {
  const photos = Array.isArray(pack?.exclusivePhotos) ? pack.exclusivePhotos.length : 0;
  const videos = Array.isArray(pack?.videos) ? pack.videos.length : 0;
  return { photos, videos };
}

function packSummary(pack) {
  const { photos, videos } = packMediaStats(pack);
  return {
    id: pack.id,
    title: pack.title,
    price: pack.price,
    numericPrice: pack.numericPrice,
    active: Boolean(pack.active),
    badge: pack.badge || '',
    photos,
    videos,
    imageUrl: pack.imageUrl || '',
    description: (pack.description || '').slice(0, 180),
  };
}

function computeDuration(photos, videos) {
  if (videos > 0 && photos > 0) return `${photos} Foto${photos === 1 ? '' : 's'} 4K • ${videos} Vídeo${videos === 1 ? '' : 's'} UHD`;
  if (videos > 0) return `${videos} Vídeo${videos === 1 ? '' : 's'} 4K UHD`;
  if (photos > 0) return `${photos} Foto${photos === 1 ? '' : 's'} 4K`;
  return 'Sem mídias anexadas';
}

// ---------------------------------------------------------------------------
// Resolução de mídia (a peça que faltava)
// ---------------------------------------------------------------------------

function asRef(ref) {
  if (typeof ref === 'string') return { raw: ref.trim() };
  if (ref && typeof ref === 'object') {
    return {
      raw: String(ref.id || ref.url || ref.name || '').trim(),
      id: ref.id ? String(ref.id) : undefined,
      url: ref.url ? String(ref.url) : undefined,
      name: ref.name ? String(ref.name) : undefined,
      objectKey: ref.objectKey ? String(ref.objectKey) : undefined,
      isVideo: ref.isVideo,
    };
  }
  return { raw: '' };
}

function mediaMatches(media, ref) {
  if (!media) return false;
  if (ref.id && String(media.id) === ref.id) return true;
  if (ref.url && (media.url === ref.url || media.objectKey === ref.url)) return true;
  if (ref.objectKey && media.objectKey === ref.objectKey) return true;
  if (ref.name && norm(media.name) === norm(ref.name)) return true;
  // Referência "crua" (string solta): pode ser id, url, objectKey ou nome exato.
  if (!ref.id && !ref.url && !ref.objectKey && !ref.name && ref.raw) {
    return (
      String(media.id) === ref.raw ||
      media.url === ref.raw ||
      media.objectKey === ref.raw ||
      norm(media.name) === norm(ref.raw)
    );
  }
  return false;
}

/**
 * Resolve UMA referência (id, url, objectKey ou nome) contra a biblioteca real.
 * @returns {{status:'ok',item:any}|{status:'missing'}|{status:'ambiguous',candidates:any[]}}
 */
export function resolveOne(content, refInput) {
  const library = getLibrary(content);
  const ref = asRef(refInput);
  if (!ref.raw && !ref.id && !ref.url && !ref.name) return { status: 'missing' };

  // 1. Correspondência exata (id / url / objectKey / nome)
  const exact = library.filter((m) => mediaMatches(m, ref));
  if (exact.length === 1) return { status: 'ok', item: exact[0] };
  if (exact.length > 1) {
    // Mesmo nome em arquivos diferentes: desempata por data (mais recente).
    const sorted = [...exact].sort((a, b) => String(b.uploadedAt || '').localeCompare(String(a.uploadedAt || '')));
    return { status: 'ambiguous', candidates: sorted };
  }

  // 2. URL com query string / CDN: compara apenas o caminho final
  if (ref.url || /^https?:\/\//i.test(ref.raw) || ref.raw.startsWith('/media/')) {
    const rawPath = (() => {
      try {
        return new URL(ref.url || ref.raw).pathname;
      } catch {
        return String(ref.url || ref.raw).split('?')[0];
      }
    })();
    const byPath = library.filter((m) => {
      try {
        return new URL(m.url, 'https://x').pathname === rawPath;
      } catch {
        return false;
      }
    });
    if (byPath.length === 1) return { status: 'ok', item: byPath[0] };
    if (byPath.length > 1) return { status: 'ambiguous', candidates: byPath };
  }

  // 3. Busca por nome aproximado (contém), sem inventar arquivo
  const needle = norm(ref.name || ref.raw);
  if (needle.length >= 3) {
    const loose = library.filter((m) => norm(m.name).includes(needle) || needle.includes(norm(m.name)));
    if (loose.length === 1) return { status: 'ok', item: loose[0] };
    if (loose.length > 1) return { status: 'ambiguous', candidates: loose };
  }

  return { status: 'missing' };
}

/**
 * Resolve várias referências. Falha de forma explícita quando algo não existe
 * ou é ambíguo — jamais ignora em silêncio.
 */
export function resolveMany(content, refs) {
  const items = [];
  const seen = new Set();
  const missing = [];
  const ambiguous = [];

  for (const ref of refs || []) {
    const res = resolveOne(content, ref);
    if (res.status === 'ok') {
      if (!seen.has(res.item.id)) {
        seen.add(res.item.id);
        items.push(res.item);
      }
    } else if (res.status === 'ambiguous') {
      ambiguous.push({ ref: asRef(ref).raw, candidates: res.candidates.slice(0, 5).map(packSummaryLike) });
    } else {
      missing.push(asRef(ref).raw);
    }
  }

  return { items, missing, ambiguous };
}

function packSummaryLike(m) {
  return { id: m.id, name: m.name, url: m.url, isVideo: Boolean(m.isVideo), uploadedAt: m.uploadedAt };
}

function mediaRefsFromArgs(args) {
  const refs = [];
  for (const key of ['mediaIds', 'mediaUrls', 'mediaNames', 'mediaItems', 'references']) {
    const value = args?.[key];
    if (Array.isArray(value)) refs.push(...value);
    else if (typeof value === 'string' && value.trim()) refs.push(value);
  }
  return refs;
}

function requireMedia(content, args, { min = 1, max = MAX_PACK_MEDIA } = {}) {
  const refs = mediaRefsFromArgs(args);
  if (!refs.length) {
    throw new Error(
      'Nenhuma mídia foi indicada. Use list_media para encontrar as fotos na biblioteca ou peça para a usuária anexar.'
    );
  }
  const resolved = resolveMany(content, refs);
  if (resolved.missing.length) {
    throw new Error(
      `Não encontrei na biblioteca: ${resolved.missing.join(', ')}. Use list_media para ver os nomes reais — não invente arquivos.`
    );
  }
  if (resolved.ambiguous.length) {
    const detail = resolved.ambiguous
      .map((a) => `"${a.ref}" (${a.candidates.map((c) => `${c.name} — ${c.id}`).join(' | ')})`)
      .join('; ');
    throw new Error(`Referência ambígua: ${detail}. Pergunte qual usar.`);
  }
  if (resolved.items.length < min) throw new Error('Selecione ao menos uma mídia válida da biblioteca.');
  if (resolved.items.length > max) throw new Error(`Máximo de ${max} mídias por vez.`);
  return resolved.items;
}

// ---------------------------------------------------------------------------
// Alvos de conteúdo (pack / seção)
// ---------------------------------------------------------------------------

function listPacks(content) {
  return Array.isArray(content?.avulsos?.items) ? content.avulsos.items : [];
}

function findPack(content, { id, title }) {
  const packs = listPacks(content);
  if (!packs.length) return { status: 'missing' };

  if (id) {
    const byId = packs.filter((p) => String(p.id) === String(id));
    if (byId.length === 1) return { status: 'ok', pack: byId[0] };
    if (byId.length > 1) return { status: 'ambiguous', candidates: byId };
    return { status: 'missing' };
  }

  if (title) {
    const exact = packs.filter((p) => norm(p.title) === norm(title));
    if (exact.length === 1) return { status: 'ok', pack: exact[0] };
    if (exact.length > 1) return { status: 'ambiguous', candidates: exact };
    const loose = packs.filter((p) => norm(p.title).includes(norm(title)) || norm(title).includes(norm(p.title)));
    if (loose.length === 1) return { status: 'ok', pack: loose[0] };
    if (loose.length > 1) return { status: 'ambiguous', candidates: loose };
    return { status: 'missing' };
  }

  return { status: 'missing' };
}

function resolvePackTarget(ctx, args) {
  const direct = findPack(ctx.content, { id: args.id, title: args.title || args.packTitle });
  if (direct.status === 'ok') return direct.pack;

  if (direct.status === 'ambiguous') {
    const names = direct.candidates.map((p) => `"${p.title}" (${p.id})`).join(' | ');
    throw new Error(`Mais de um pack corresponde: ${names}. Qual deles?`);
  }

  // "último pack" = último pack citado no contexto da conversa
  const lastId =
    ctx.lastContext?.entityType === 'pack'
      ? ctx.lastContext?.entityId || ctx.lastContext?.packId
      : ctx.lastContext?.packId;
  if (lastId && !args.id && !args.title && !args.packTitle) {
    const last = findPack(ctx.content, { id: lastId });
    if (last.status === 'ok') return last.pack;
  }

  const packs = listPacks(ctx.content);
  if (packs.length === 1 && !args.id && !args.title) return packs[0];

  if (packs.length > 1) {
    const recent = packs
      .slice(-5)
      .reverse()
      .map((p) => `"${p.title}" (${p.id})`)
      .join(' | ');
    throw new Error(
      `Não sei qual pack você quer. Packs recentes: ${recent}. Diga o título ou o id — não vou adivinhar.`
    );
  }

  throw new Error('Nenhum pack encontrado no acervo.');
}

function sectionAt(content, path) {
  if (!Object.hasOwn(FIELD_MAP, path)) throw new Error('Seção não autorizada.');
  const segments = path.split('.');
  let target = content;
  for (const part of segments) {
    if (!target[part] || typeof target[part] !== 'object') {
      if (part === 'avulsos') {
        target[part] = { title: 'Conteúdos e packs', subtitle: '', items: [] };
      } else if (part === 'vipClub') {
        target[part] = { eyebrow: '', title: '', subtitle: '', buttonText: '', active: true };
      } else {
        throw new Error('Esta seção ainda não está configurada no site.');
      }
    }
    target = target[part];
  }
  return target;
}

function collectUsedUrls(content) {
  const usage = new Map();
  const add = (url, where) => {
    if (!url) return;
    if (!usage.has(url)) usage.set(url, []);
    usage.get(url).push(where);
  };
  for (const slide of content?.hero?.photos || []) add(slide.imageUrl, 'capa');
  for (const photo of content?.gallery?.photos || []) add(photo.imageUrl, 'galeria');
  for (const pack of listPacks(content)) {
    add(pack.imageUrl, `pack:${pack.title}`);
    for (const url of pack.exclusivePhotos || []) add(url, `pack:${pack.title}`);
    for (const url of pack.previewImages || []) add(url, `pack:${pack.title}`);
    for (const video of pack.videos || []) add(video.url, `pack:${pack.title}`);
  }
  add(content?.about?.photoUrl, 'sobre');
  add(content?.seo?.ogImage, 'seo');
  add(content?.hero?.logoUrl, 'logo');
  return usage;
}

function proposal(ctx, { actionType, targetId, summary, proposedChanges, payload }) {
  return {
    proposalId: `prop_${crypto.randomUUID()}`,
    nonce: crypto.randomUUID(),
    actionType,
    targetId,
    summary,
    proposedChanges,
    expiresAt: Date.now() + PROPOSAL_TTL_MS,
    payload,
    conversationId: ctx.conversationId,
    createdAt: new Date().toISOString(),
    actorRole: ctx.role,
  };
}

// ---------------------------------------------------------------------------
// Integrações operacionais (reutilizam os endpoints reais do painel)
// ---------------------------------------------------------------------------

async function apiCall(ctx, path, options = {}) {
  if (typeof ctx.services.api !== 'function') {
    throw new Error('Integração interna indisponível neste ambiente.');
  }
  const res = await ctx.services.api(path, options);
  if (!res || res.ok !== true) {
    const message =
      res?.data?.error ||
      res?.data?.details ||
      'Não consegui concluir essa ação agora. Tente novamente em instantes.';
    throw new Error(message);
  }
  return res.data || {};
}

function withinDateRange(item, { from, to }) {
  const raw = item?.createdAt || item?.created_at || item?.dateTime || item?.date_time || item?.date;
  if (!raw) return true;
  const day = String(raw).slice(0, 10);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

function timeToMinutes(value) {
  const [h, m] = String(value || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToTime(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Definições
// ---------------------------------------------------------------------------

const DEFS = {};

function define(name, def) {
  DEFS[name] = { roles: ['dev', 'admin'], risk: 'low', ...def };
}

const S = (description) => ({ type: 'STRING', description });
const N = (description) => ({ type: 'NUMBER', description });
const B = (description) => ({ type: 'BOOLEAN', description });
const A = (items, description) => ({ type: 'ARRAY', items, description });
const O = (properties, description) => ({ type: 'OBJECT', properties, description });

const mediaRefProps = {
  mediaIds: A(S('IDs exatos de mídias da biblioteca'), 'IDs das mídias na biblioteca.'),
  mediaUrls: A(S('URLs exatas de mídias da biblioteca'), 'URLs das mídias na biblioteca.'),
  mediaNames: A(S('Nomes das mídias'), 'Nomes (parciais ou completos) para localizar mídias na biblioteca.'),
};

// ===== Visão geral =====

define('get_admin_overview', {
  description: 'Retorna o panorama real do painel: módulos, contagem de packs, mídias, pedidos e pendências. Use antes de responder perguntas amplas.',
  parameters: {},
  run: async (args, ctx) => {
    const packs = listPacks(ctx.content);
    const library = getLibrary(ctx.content);
    const overview = ctx.overview || {};
    return {
      summary: 'Panorama carregado.',
      data: {
        modules: {
          conteudos: 'Conteúdos & Packs',
          personalizados: 'Pedidos personalizados',
          chamadas: 'Chamadas VIP',
          vitrine: 'Editar meu site',
          conexoes: 'Redes e contato',
          financeiro: 'Financeiro',
          contratos: 'Contratos',
          cofre: 'Acessos e senhas',
          configuracoes: 'Configurações',
          alertas: 'Alertas',
        },
        activeTab: ctx.activeTab || null,
        counts: {
          packs: packs.length,
          packsActive: packs.filter((p) => p.active).length,
          photos: library.filter((m) => !m.isVideo).length,
          videos: library.filter((m) => m.isVideo).length,
          albums: Array.isArray(ctx.content.albums) ? ctx.content.albums.length : 0,
          galleryPhotos: (ctx.content.gallery?.photos || []).length,
          heroSlides: (ctx.content.hero?.photos || []).length,
          orders: (overview.orders || []).length,
          personalizados: (overview.personalizados || []).length,
          appointments: (overview.appointments || []).length,
          requests: (overview.requests || []).length,
        },
        finance: overview.finance || null,
        publishedAt: ctx.published?._updatedAt || null,
        draftRevision: ctx.draftRevision || null,
      },
    };
  },
});

define('get_site_section', {
  description: 'Lê o conteúdo real de uma seção do site ou do painel administrativo (hero, about, gallery, seo, channels, footer, institutional, vipClub, avulsos, adminUi).',
  parameters: { section: S('Seção: hero, about, gallery, seo, channels, footer, institutional, vipClub, avulsos, header, contact ou adminUi') },
  required: ['section'],
  run: async (args, ctx) => {
    const section = String(args.section || '').replace(/^content\./, '');
    if (!section || section === 'library') throw new Error('Use list_media para a biblioteca.');
    if (!Object.prototype.hasOwnProperty.call(ctx.content, section)) {
      throw new Error(`A seção "${section}" não existe no conteúdo atual.`);
    }
    return {
      summary: `Seção ${section} carregada.`,
      data: trimValue(ctx.content[section]),
    };
  },
});

// ===== Packs =====

define('list_packs', {
  description: 'Lista os packs reais do acervo com preço, status e quantidade de fotos/vídeos.',
  parameters: {
    status: S('all (padrão), active ou draft'),
    query: S('Busca por título'),
    limit: N('Máximo de itens (padrão 30)'),
    offset: N('Deslocamento para paginação'),
  },
  run: async (args, ctx) => {
    const status = String(args.status || 'all');
    const query = norm(args.query || '');
    let items = listPacks(ctx.content);
    if (status === 'active') items = items.filter((p) => p.active);
    if (status === 'draft') items = items.filter((p) => !p.active);
    if (query) items = items.filter((p) => norm(p.title).includes(query));
    const limit = Math.min(Math.max(Number(args.limit) || 30, 1), 100);
    const offset = Math.max(Number(args.offset) || 0, 0);
    const page = items.slice(offset, offset + limit);
    return {
      summary: `${items.length} pack(s) encontrado(s).`,
      data: { total: items.length, offset, items: page.map(packSummary) },
    };
  },
});

define('get_pack', {
  description: 'Retorna todos os dados de um pack específico (por id ou título) com as mídias resolvidas.',
  parameters: { id: S('ID do pack'), title: S('Título do pack') },
  run: async (args, ctx) => {
    const pack = resolvePackTarget(ctx, args);
    const photos = pack.exclusivePhotos || [];
    const videos = pack.videos || [];
    return {
      summary: `Pack "${pack.title}" carregado.`,
      data: {
        ...pack,
        photos,
        videoItems: videos,
        stats: { photos: photos.length, videos: videos.length },
      },
    };
  },
});

define('create_pack', {
  description:
    'CRIA um pack real no acervo com as mídias indicadas da biblioteca. Sempre informe mediaIds/mediaUrls/mediaNames. Se a usuária anexou fotos no chat, use os ids/urls de uiContext.attachedMediaItems.',
  parameters: {
    title: S('Título autoral do pack'),
    description: S('Descrição do pack'),
    price: { type: 'STRING', description: 'Preço em reais (ex: 49.90 ou "R$ 49,90")' },
    longDescription: S('Descrição detalhada (opcional)'),
    badge: S('Selo: NOVO, LANÇAMENTO, EXCLUSIVO...'),
    active: B('Deixar visível no site imediatamente? Padrão: false (rascunho)'),
    ...mediaRefProps,
  },
  required: ['title', 'description', 'price'],
  run: async (args, ctx) => {
    const next = clone(ctx.content);
    const title = cleanText(args.title, 120).trim();
    const description = cleanText(args.description, 2000).trim();
    if (!title || !description) throw new Error('Informe título e descrição válidos para o pack.');

    const media = requireMedia(next, args);
    const photos = media.filter((m) => !m.isVideo).map((m) => m.url);
    const videos = media
      .filter((m) => m.isVideo)
      .map((m) => ({ id: m.id, title: m.name, url: m.url, duration: m.duration || '', posterUrl: m.posterUrl || '' }));

    const { numericPrice, price } = money(args.price);
    const id = `pack_${crypto.randomUUID()}`;
    const pack = {
      id,
      slug: slugify(title, id),
      title,
      description,
      longDescription: cleanText(args.longDescription || description, 4000),
      price,
      numericPrice,
      imageUrl: photos[0] || '',
      previewImages: photos.slice(0, 3),
      exclusivePhotos: photos,
      videos,
      badge: cleanText(args.badge || 'NOVO', 40),
      duration: computeDuration(photos.length, videos.length),
      technicalDetails: {
        format: 'Fotos em alta resolução + vídeos quando houver',
        mediaCount: `${photos.length} foto(s) e ${videos.length} vídeo(s)`,
      },
      checkoutUrl: '',
      active: args.active === true,
    };

    next.avulsos = {
      title: 'Conteúdos e packs',
      subtitle: '',
      ...(next.avulsos || {}),
      items: [...listPacks(next), pack],
    };

    return {
      content: next,
      summary: `Pack **${title}** criado em rascunho por **${price}**, com ${photos.length} foto(s) e ${videos.length} vídeo(s).`,
      action: { type: 'create_pack', packId: id, title },
      data: packSummary(pack),
      lastContext: { entityType: 'pack', entityId: id, entityTitle: title },
    };
  },
});

define('update_pack', {
  description: 'Edita campos de um pack existente. Informe id ou título. Nunca altera campos não listados.',
  parameters: {
    id: S('ID do pack'),
    title: S('Título atual do pack (se não souber o id)'),
    fields: O(
      {
        title: S('Novo título'),
        description: S('Nova descrição'),
        longDescription: S('Nova descrição longa'),
        badge: S('Novo selo'),
        buttonText: S('Texto do botão'),
        price: { type: 'STRING', description: 'Novo preço' },
        active: B('Ativar/desativar'),
        duration: S('Texto de duração'),
        imageUrl: S('URL da capa'),
        checkoutUrl: S('URL de checkout'),
      },
      'Campos a alterar'
    ),
  },
  required: ['fields'],
  run: async (args, ctx) => {
    const next = clone(ctx.content);
    const target = resolvePackTarget({ ...ctx, content: next }, args);
    const pack = listPacks(next).find((p) => p.id === target.id);
    if (!pack) throw new Error('Pack não encontrado no rascunho atual.');

    const fields = args.fields && typeof args.fields === 'object' ? args.fields : {};
    if (!Object.keys(fields).length) throw new Error('Informe ao menos um campo para alterar.');

    const changes = [];
    for (const [field, value] of Object.entries(fields)) {
      if (field === 'id') continue;
      if (!PACK_EDITABLE.includes(field)) continue;
      const before = field === 'price' ? pack.price : pack[field];
      if (field === 'price') {
        const parsed = money(value, pack.numericPrice || 0);
        pack.numericPrice = parsed.numericPrice;
        pack.price = parsed.price;
      } else if (field === 'active') {
        pack.active = value === true || value === 'true';
      } else if (typeof value === 'string') {
        pack[field] = cleanText(value, field === 'longDescription' ? 4000 : 1000);
      } else {
        pack[field] = value;
      }
      const after = field === 'price' ? pack.price : pack[field];
      if (JSON.stringify(before) !== JSON.stringify(after)) changes.push({ field, before, after });
    }

    if (!changes.length) throw new Error('Nenhum campo válido foi alterado. Nada foi gravado.');

    return {
      content: next,
      summary: `Pack **${pack.title}** atualizado: ${changes.map((c) => `${c.field} → ${c.after}`).join(', ')}.`,
      data: { pack: packSummary(pack), changes },
      lastContext: { entityType: 'pack', entityId: pack.id, entityTitle: pack.title },
    };
  },
});

define('attach_media', {
  description: 'Anexa mídias da biblioteca a um pack, à capa (hero), à galeria ou à foto do Sobre.',
  parameters: {
    target: S('pack, hero, gallery ou about'),
    id: S('ID do pack (quando target=pack)'),
    title: S('Título do pack (quando target=pack)'),
    ...mediaRefProps,
  },
  required: ['target'],
  run: async (args, ctx) => {
    const next = clone(ctx.content);
    const target = String(args.target || '').toLowerCase();
    const media = requireMedia(next, args);
    const photos = media.filter((m) => !m.isVideo).map((m) => m.url);
    const videos = media.filter((m) => m.isVideo);

    if (target === 'pack') {
      const found = resolvePackTarget({ ...ctx, content: next }, args);
      const pack = listPacks(next).find((p) => p.id === found.id);
      if (!pack) throw new Error('Pack não encontrado.');

      const existing = new Set([...(pack.exclusivePhotos || []), ...(pack.videos || []).map((v) => v.url)]);
      const newPhotos = photos.filter((url) => !existing.has(url));
      if ((pack.exclusivePhotos || []).length + newPhotos.length > MAX_PACK_MEDIA) {
        throw new Error(`O pack chegaria a mais de ${MAX_PACK_MEDIA} fotos. Remova algumas antes.`);
      }
      pack.exclusivePhotos = [...new Set([...(pack.exclusivePhotos || []), ...newPhotos])];
      if (!pack.imageUrl && pack.exclusivePhotos[0]) pack.imageUrl = pack.exclusivePhotos[0];
      if (!pack.previewImages?.length) pack.previewImages = pack.exclusivePhotos.slice(0, 3);
      pack.videos = [
        ...(pack.videos || []),
        ...videos
          .filter((v) => !(pack.videos || []).some((x) => x.url === v.url))
          .map((v) => ({ id: v.id, title: v.name, url: v.url, duration: v.duration || '', posterUrl: v.posterUrl || '' })),
      ];
      pack.duration = computeDuration((pack.exclusivePhotos || []).length, (pack.videos || []).length);
      pack.technicalDetails = {
        ...(pack.technicalDetails || {}),
        mediaCount: `${pack.exclusivePhotos.length} foto(s) e ${pack.videos.length} vídeo(s)`,
      };

      return {
        content: next,
        summary: `${media.length} mídia(s) anexada(s) ao pack **${pack.title}** (agora ${pack.exclusivePhotos.length} foto(s) e ${pack.videos.length} vídeo(s)).`,
        data: { pack: packSummary(pack) },
        lastContext: { entityType: 'pack', entityId: pack.id, entityTitle: pack.title },
      };
    }

    if (target === 'about') {
      const photo = photos[0];
      if (!photo) throw new Error('A foto do Sobre precisa ser uma imagem.');
      next.about = { ...(next.about || {}), photoUrl: photo };
      return { content: next, summary: 'Foto do Sobre atualizada.' };
    }

    if (target === 'gallery') {
      if (videos.length) throw new Error('A galeria pública aceita apenas fotos. Para vídeos use um pack ou a capa.');
      next.gallery = next.gallery || { eyebrow: '', title: '', subtitle: '', photos: [] };
      const current = next.gallery.photos || [];
      const added = photos
        .filter((url) => !current.some((p) => p.imageUrl === url))
        .map((url) => {
          const m = media.find((x) => x.url === url);
          return { id: `photo_${crypto.randomUUID()}`, title: m?.name || '', caption: '', imageUrl: url, active: true };
        });
      next.gallery.photos = [...current, ...added];
      return { content: next, summary: `${added.length} foto(s) adicionada(s) à galeria (total: ${next.gallery.photos.length}).` };
    }

    if (target === 'hero') {
      next.hero = next.hero || { photos: [] };
      const current = next.hero.photos || [];
      const added = media
        .filter((m) => !current.some((p) => p.imageUrl === m.url))
        .map((m) => ({ id: `slide_${crypto.randomUUID()}`, title: m.name || '', session: '', imageUrl: m.url }));
      next.hero.photos = [...current, ...added];
      return { content: next, summary: `${added.length} slide(s) adicionado(s) à capa (total: ${next.hero.photos.length}).` };
    }

    throw new Error('Destino inválido: use pack, hero, gallery ou about.');
  },
});

define('remove_media', {
  description: 'Remove uma mídia de um pack, da capa, da galeria ou do Sobre. O arquivo permanece na biblioteca.',
  parameters: {
    target: S('pack, hero, gallery ou about'),
    id: S('ID do pack (quando target=pack)'),
    title: S('Título do pack (quando target=pack)'),
    mediaId: S('ID da mídia na biblioteca'),
    url: S('URL exata da mídia'),
  },
  required: ['target'],
  run: async (args, ctx) => {
    const next = clone(ctx.content);
    const target = String(args.target || '').toLowerCase();
    const resolved = resolveOne(next, args.mediaId || args.url || '');
    if (resolved.status !== 'ok') throw new Error('Não localizei essa mídia na biblioteca. Use list_media para conferir.');
    const mediaUrl = resolved.item.url;
    const before = JSON.stringify(next);

    if (target === 'pack') {
      const found = resolvePackTarget({ ...ctx, content: next }, args);
      const pack = listPacks(next).find((p) => p.id === found.id);
      if (!pack) throw new Error('Pack não encontrado.');
      pack.exclusivePhotos = (pack.exclusivePhotos || []).filter((url) => url !== mediaUrl);
      pack.previewImages = (pack.previewImages || []).filter((url) => url !== mediaUrl);
      pack.videos = (pack.videos || []).filter((v) => v.url !== mediaUrl);
      if (pack.imageUrl === mediaUrl) pack.imageUrl = pack.exclusivePhotos[0] || pack.previewImages[0] || '';
      pack.duration = computeDuration((pack.exclusivePhotos || []).length, (pack.videos || []).length);
      pack.technicalDetails = {
        ...(pack.technicalDetails || {}),
        mediaCount: `${(pack.exclusivePhotos || []).length} foto(s) e ${(pack.videos || []).length} vídeo(s)`,
      };
    } else if (target === 'about') {
      if (next.about?.photoUrl !== mediaUrl) throw new Error('Essa foto não está no Sobre.');
      next.about.photoUrl = '';
    } else if (target === 'gallery' || target === 'hero') {
      next[target].photos = (next[target].photos || []).filter((p) => p.imageUrl !== mediaUrl);
    } else {
      throw new Error('Destino inválido.');
    }

    if (JSON.stringify(next) === before) throw new Error('Essa mídia não está no destino informado. Nada foi alterado.');
    return {
      content: next,
      summary: 'Mídia retirada do rascunho. O arquivo continua na biblioteca e o site público não foi alterado.',
    };
  },
});

define('set_pack_active', {
  description: 'Ativa ou desativa um pack no acervo.',
  parameters: { id: S('ID do pack'), title: S('Título do pack'), active: B('true para ativar, false para desativar') },
  required: ['active'],
  run: async (args, ctx) => {
    const next = clone(ctx.content);
    const found = resolvePackTarget({ ...ctx, content: next }, args);
    const pack = listPacks(next).find((p) => p.id === found.id);
    pack.active = args.active === true || args.active === 'true';
    return {
      content: next,
      summary: `Pack **${pack.title}** ${pack.active ? 'ativado' : 'desativado'} no rascunho. Publique para refletir no site.`,
      lastContext: { entityType: 'pack', entityId: pack.id, entityTitle: pack.title },
    };
  },
});

define('reorder_packs', {
  description: 'Reordena os packs na ordem exata dos ids informados.',
  parameters: { ids: A(S('ID do pack'), 'IDs na nova ordem') },
  required: ['ids'],
  run: async (args, ctx) => {
    const next = clone(ctx.content);
    const packs = listPacks(next);
    const ids = (args.ids || []).map(String);
    if (ids.length !== packs.length) throw new Error(`Informe os ${packs.length} ids na nova ordem.`);
    const map = new Map(packs.map((p) => [String(p.id), p]));
    const ordered = ids.map((id) => map.get(id));
    if (ordered.some((p) => !p)) throw new Error('Um dos ids não existe no acervo.');
    next.avulsos.items = ordered;
    return { content: next, summary: `Packs reordenados: ${ordered.map((p) => p.title).join(' → ')}.` };
  },
});

// ===== Textos =====

define('edit_text', {
  description: 'Altera textos de uma seção do site no rascunho (hero, about, gallery, seo, contact, footer, channels, institutional, vipClub, avulsos).',
  parameters: {
    section: S('Seção do site'),
    fields: O({}, 'Pares campo → novo valor (texto simples, sem HTML)'),
  },
  required: ['section', 'fields'],
  run: async (args, ctx) => {
    const next = clone(ctx.content);
    const section = String(args.section || '');
    const fields = args.fields || {};
    const target = sectionAt(next, section);
    if (!fields || Array.isArray(fields) || !Object.keys(fields).length) throw new Error('Informe os campos que deseja alterar.');

    const changes = [];
    for (let [field, value] of Object.entries(fields)) {
      if (section === 'contact') {
        if (field === 'email') field = 'officialEmail';
        if (field === 'title') field = 'modalTitle';
        if (field === 'subtitle') field = 'modalSubtitle';
      } else if (section === 'hero') {
        if (field === 'subtitle') field = 'tagline';
      } else if (section === 'about') {
        if (field === 'bio' || field === 'text1') field = 'paragraph1';
        if (field === 'text2') field = 'paragraph2';
      }

      if (!FIELD_MAP[section].includes(field)) throw new Error(`Campo não permitido em ${section}: ${field}.`);
      if (typeof value !== 'string') value = String(value ?? '');
      cleanText(value, 6000);
      if (field === 'officialEmail' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('E-mail inválido.');
      if (['url', 'ctaUrl', 'canonicalUrl', 'ogImage', 'onlyFansUrl', 'upsellUrl'].includes(field) && !validUrl(value)) {
        throw new Error('Link inválido: use HTTPS ou /media/...');
      }
      const before = target[field];
      target[field] = value;
      if (before !== value) changes.push({ field, before, after: value });
    }

    if (!changes.length) throw new Error('Os valores enviados são iguais aos atuais. Nada foi alterado.');
    return {
      content: next,
      summary: `Texto atualizado em ${section}: ${changes.map((c) => c.field).join(', ')}.`,
      data: { changes },
    };
  },
});

define('edit_site_content', {
  description:
    'Aplica operações estruturais no rascunho (set/append/remove) em qualquer caminho real. Use para casos que edit_text não cobre, como reordenar listas ou alterar flags.',
  parameters: {
    summary: S('Resumo curto da alteração'),
    ops: A(
      O(
        {
          action: S('set, append ou remove'),
          path: S('Caminho real, ex: hero.title, avulsos.items[id=pack_123].price, gallery.photos[0].caption'),
          value: { description: 'Novo valor (set/append): texto, número, booleano, objeto ou lista' },
        },
        'Operações'
      ),
      'Lista de operações atômicas'
    ),
  },
  required: ['ops'],
  run: async (args, ctx) => {
    const res = applyContentOps(clone(ctx.content), args.ops || []);
    if (!res.ok) throw new Error(`Falha ao editar: ${res.errors.join('; ')}`);
    return {
      content: res.content,
      summary: args.summary || 'Rascunho atualizado.',
      data: { changes: res.changes },
    };
  },
});

define('edit_admin_ui', {
  description: 'Edita a interface administrativa persistida: textos, módulos, abas, subabas, botões e ações. Use caminhos como adminUi.texts.shell.loading, adminUi.modules[id=conteudos].label ou adminUi.modules[id=chamadas].tabs[0].label. Remover só funciona em listas e ações destrutivas exigem confirmação.',
  parameters: {
    summary: S('Resumo curto da alteração'),
    ops: A(
      O({
        action: S('set, append ou remove'),
        path: S('Caminho em adminUi, por exemplo adminUi.modules[id=vitrine].label ou adminUi.texts.shell.loading'),
        value: { description: 'Novo valor' },
      }, 'Operações de interface'),
      'Lista de operações atômicas sobre a interface administrativa'
    ),
  },
  required: ['ops'],
  risk: 'low',
  run: async (args, ctx) => {
    const ops = (args.ops || []).map((op) => ({ ...op, path: String(op.path || '') }));
    if (ops.some((op) => !op.path.startsWith('adminUi.'))) {
      throw new Error('A ferramenta de interface só pode editar caminhos iniciados por adminUi.');
    }
    if (ops.some((op) => op.action === 'remove')) {
      const prop = proposal(ctx, {
        actionType: 'edit_admin_ui',
        targetId: 'adminUi',
        summary: args.summary || 'Remover itens da interface administrativa?',
        proposedChanges: { ops },
        payload: { content: clone(ctx.content), ops },
      });
      await ctx.services.write(`nua_ai_proposal:${prop.proposalId}`, prop);
      return {
        summary: 'Remoção preparada. Confirme no cartão abaixo.',
        proposal: {
          proposalId: prop.proposalId,
          nonce: prop.nonce,
          actionType: prop.actionType,
          targetId: prop.targetId,
          summary: prop.summary,
          proposedChanges: prop.proposedChanges,
        },
      };
    }
    const res = applyContentOps(clone(ctx.content), ops);
    if (!res.ok) throw new Error(`Falha ao editar a interface: ${res.errors.join('; ')}`);
    return {
      content: res.content,
      summary: args.summary || 'Interface administrativa atualizada no rascunho.',
      data: { changes: res.changes },
    };
  },
});

// ===== Mídia =====

define('list_media', {
  description:
    'Lista e busca mídias reais da biblioteca. Use SEMPRE que precisar de fotos/vídeos existentes antes de criar ou anexar a packs, capa ou galeria.',
  parameters: {
    query: S('Busca por nome'),
    type: S('photo, video ou all'),
    albumId: S('Filtrar por álbum'),
    favorite: B('Somente favoritas'),
    onlyUnused: B('Somente mídias sem uso no site'),
    limit: N('Máximo (padrão 40)'),
    offset: N('Deslocamento'),
  },
  run: async (args, ctx) => {
    const library = getLibrary(ctx.content);
    const usage = collectUsedUrls(ctx.content);
    const query = norm(args.query || '');
    const type = String(args.type || 'all');

    let items = library.filter((m) => {
      if (type === 'photo' && m.isVideo) return false;
      if (type === 'video' && !m.isVideo) return false;
      if (args.albumId && !(m.albumIds || []).includes(args.albumId)) return false;
      if (args.favorite === true && !m.favorite) return false;
      if (args.onlyUnused === true && usage.has(m.url)) return false;
      if (query && !norm(m.name).includes(query)) return false;
      return true;
    });

    const total = items.length;
    const limit = Math.min(Math.max(Number(args.limit) || 40, 1), 200);
    const offset = Math.max(Number(args.offset) || 0, 0);
    items = items.slice(offset, offset + limit);

    return {
      summary: `${total} mídia(s) na biblioteca para este filtro.`,
      data: {
        total,
        offset,
        items: items.map((m) => ({
          id: m.id,
          name: m.name,
          url: m.url,
          objectKey: m.objectKey || null,
          isVideo: Boolean(m.isVideo),
          uploadedAt: m.uploadedAt,
          favorite: Boolean(m.favorite),
          albums: m.albumIds || [],
          usedIn: usage.get(m.url) || [],
        })),
      },
    };
  },
});

define('get_media', {
  description: 'Retorna metadados de uma mídia e todos os lugares onde ela é usada.',
  parameters: { id: S('ID da mídia'), url: S('URL da mídia') },
  run: async (args, ctx) => {
    const resolved = resolveOne(ctx.content, args.id || args.url || '');
    if (resolved.status === 'ambiguous') {
      throw new Error(`Mais de uma mídia corresponde: ${resolved.candidates.map((c) => `${c.name} (${c.id})`).join(' | ')}.`);
    }
    if (resolved.status !== 'ok') throw new Error('Mídia não encontrada na biblioteca.');
    const usage = collectUsedUrls(ctx.content);
    return {
      summary: `Mídia "${resolved.item.name}" localizada.`,
      data: { ...resolved.item, usedIn: usage.get(resolved.item.url) || [] },
    };
  },
});

define('resolve_media', {
  description:
    'Resolve referências vagas ("a foto da praia", nomes parciais) para mídias reais da biblioteca. Retorna correspondência única ou candidatos para perguntar.',
  parameters: { references: A(S('Referência'), 'Nomes, ids ou URLs a resolver') },
  required: ['references'],
  run: async (args, ctx) => {
    const results = (args.references || []).map((ref) => {
      const res = resolveOne(ctx.content, ref);
      if (res.status === 'ok') return { ref: asRef(ref).raw, status: 'ok', media: packSummaryLike(res.item) };
      if (res.status === 'ambiguous') {
        return { ref: asRef(ref).raw, status: 'ambiguous', candidates: res.candidates.slice(0, 8).map(packSummaryLike) };
      }
      return { ref: asRef(ref).raw, status: 'missing' };
    });
    return {
      summary: results.every((r) => r.status === 'ok') ? 'Todas as referências resolvidas.' : 'Algumas referências precisam de confirmação.',
      data: { results },
    };
  },
});

define('list_albums', {
  description: 'Lista os álbuns da biblioteca com a contagem de mídias.',
  parameters: {},
  run: async (args, ctx) => {
    const albums = Array.isArray(ctx.content.albums) ? ctx.content.albums : [];
    return {
      summary: `${albums.length} álbum(ns).`,
      data: albums.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description || '',
        count: (a.mediaIds || []).length,
        coverUrl: a.coverUrl || '',
      })),
    };
  },
});

define('find_unused_media', {
  description: 'Lista mídias da biblioteca que não estão em uso no site, na capa, na galeria ou em packs.',
  parameters: { limit: N('Máximo (padrão 50)') },
  run: async (args, ctx) => {
    const usage = collectUsedUrls(ctx.content);
    const unused = getLibrary(ctx.content).filter((m) => !usage.has(m.url));
    const limit = Math.min(Math.max(Number(args.limit) || 50, 1), 200);
    return {
      summary: `${unused.length} mídia(s) sem uso.`,
      data: { total: unused.length, items: unused.slice(0, limit).map(packSummaryLike) },
    };
  },
});

define('register_uploaded_media', {
  description: 'Registra na biblioteca as mídias que a usuária acabou de anexar no chat (já enviadas ao Backblaze).',
  parameters: {
    items: A(
      O(
        { id: S('ID (se existir)'), name: S('Nome'), url: S('URL'), objectKey: S('Chave no storage'), isVideo: B('É vídeo?') },
        'Mídias anexadas'
      ),
      'Mídias enviadas no chat'
    ),
  },
  required: ['items'],
  run: async (args, ctx) => {
    const next = clone(ctx.content);
    next.library = getLibrary(next);
    const added = [];
    for (const item of args.items || []) {
      const url = String(item?.url || '').trim();
      if (!validUrl(url)) continue;
      if (next.library.some((m) => m.url === url || (item.objectKey && m.objectKey === item.objectKey))) continue;
      const media = {
        id: item.id || `media_${crypto.randomUUID()}`,
        name: cleanText(item.name || 'Mídia enviada', 160),
        url,
        objectKey: item.objectKey || undefined,
        uploadedAt: new Date().toISOString(),
        isVideo: Boolean(item.isVideo),
        usedIn: [],
      };
      next.library.unshift(media);
      added.push(media);
    }
    if (!added.length) throw new Error('Nenhuma mídia nova para registrar (já estavam na biblioteca).');
    return {
      content: next,
      summary: `${added.length} mídia(s) registrada(s) na biblioteca.`,
      data: { added: added.map(packSummaryLike) },
    };
  },
});

define('rename_media', {
  description: 'Renomeia uma mídia da biblioteca.',
  parameters: { id: S('ID da mídia'), url: S('URL da mídia'), name: S('Novo nome') },
  required: ['name'],
  run: async (args, ctx) => {
    const next = clone(ctx.content);
    const resolved = resolveOne(next, args.id || args.url || '');
    if (resolved.status !== 'ok') throw new Error('Mídia não encontrada.');
    const media = next.library.find((m) => m.id === resolved.item.id);
    const before = media.name;
    media.name = cleanText(args.name, 160);
    return { content: next, summary: `Mídia renomeada: "${before}" → "${media.name}".` };
  },
});

define('toggle_favorite_media', {
  description: 'Marca ou desmarca uma mídia como favorita.',
  parameters: { id: S('ID da mídia'), url: S('URL da mídia'), favorite: B('true/false') },
  required: ['favorite'],
  run: async (args, ctx) => {
    const next = clone(ctx.content);
    const resolved = resolveOne(next, args.id || args.url || '');
    if (resolved.status !== 'ok') throw new Error('Mídia não encontrada.');
    const media = next.library.find((m) => m.id === resolved.item.id);
    media.favorite = args.favorite === true || args.favorite === 'true';
    return { content: next, summary: `"${media.name}" ${media.favorite ? 'marcada como favorita' : 'desmarcada'}.` };
  },
});

define('create_album', {
  description: 'Cria um álbum na biblioteca, opcionalmente já com mídias.',
  parameters: { name: S('Nome do álbum'), description: S('Descrição'), ...mediaRefProps },
  required: ['name'],
  run: async (args, ctx) => {
    const next = clone(ctx.content);
    next.albums = Array.isArray(next.albums) ? next.albums : [];
    const name = cleanText(args.name, 80);
    if (next.albums.some((a) => norm(a.name) === norm(name))) throw new Error('Já existe um álbum com esse nome.');
    const media = mediaRefsFromArgs(args).length ? requireMedia(next, args) : [];
    const album = {
      id: `album_${crypto.randomUUID()}`,
      name,
      description: cleanText(args.description || '', 300),
      mediaIds: media.map((m) => m.id),
      coverMediaId: media[0]?.id,
      coverUrl: media[0]?.url,
      createdAt: new Date().toISOString(),
    };
    next.albums.push(album);
    for (const m of media) {
      const item = next.library.find((x) => x.id === m.id);
      item.albumIds = [...new Set([...(item.albumIds || []), album.id])];
    }
    return { content: next, summary: `Álbum **${name}** criado com ${media.length} mídia(s).` };
  },
});

define('add_to_album', {
  description: 'Adiciona mídias a um álbum existente.',
  parameters: { albumId: S('ID do álbum'), albumName: S('Nome do álbum'), ...mediaRefProps },
  run: async (args, ctx) => {
    const next = clone(ctx.content);
    const albums = Array.isArray(next.albums) ? next.albums : [];
    const album = args.albumId
      ? albums.find((a) => a.id === args.albumId)
      : albums.find((a) => norm(a.name) === norm(args.albumName || ''));
    if (!album) throw new Error('Álbum não encontrado.');
    const media = requireMedia(next, args);
    album.mediaIds = [...new Set([...(album.mediaIds || []), ...media.map((m) => m.id)])];
    for (const m of media) {
      const item = next.library.find((x) => x.id === m.id);
      item.albumIds = [...new Set([...(item.albumIds || []), album.id])];
    }
    return { content: next, summary: `${media.length} mídia(s) adicionada(s) ao álbum **${album.name}**.` };
  },
});

define('delete_media', {
  description:
    'Prepara a EXCLUSÃO PERMANENTE de uma mídia do storage e da biblioteca. Nunca executa direto: gera um cartão de confirmação para a usuária.',
  parameters: { id: S('ID da mídia'), url: S('URL da mídia') },
  risk: 'sensitive',
  run: async (args, ctx) => {
    const resolved = resolveOne(ctx.content, args.id || args.url || '');
    if (resolved.status !== 'ok') throw new Error('Mídia não encontrada na biblioteca.');
    const media = resolved.item;
    if (!media.objectKey) throw new Error('Esta mídia não tem chave no storage, então não pode ser excluída pelo servidor.');
    const usage = collectUsedUrls(ctx.content).get(media.url) || [];

    const prop = proposal(ctx, {
      actionType: 'delete_media',
      targetId: media.id,
      summary: `Excluir permanentemente "${media.name}" da biblioteca e do armazenamento${usage.length ? `? Ela está em uso em: ${usage.join(', ')}` : '?'}`,
      proposedChanges: { name: media.name, url: media.url, objectKey: media.objectKey, usedIn: usage },
      payload: { mediaId: media.id, objectKey: media.objectKey, url: media.url, content: ctx.content },
    });
    await ctx.services.write(`nua_ai_proposal:${prop.proposalId}`, prop);

    return {
      summary:
        'Exclusão preparada. Nada foi apagado ainda — confirme no cartão abaixo. ' +
        (usage.length ? `Atenção: a mídia está em uso em ${usage.join(', ')}.` : 'A mídia não está em uso no site.'),
      proposal: {
        proposalId: prop.proposalId,
        nonce: prop.nonce,
        actionType: prop.actionType,
        targetId: prop.targetId,
        summary: prop.summary,
        proposedChanges: prop.proposedChanges,
      },
    };
  },
});

// ===== Publicação =====

define('get_publish_status', {
  description: 'Compara o rascunho atual com o conteúdo publicado e mostra o que mudou.',
  parameters: {},
  run: async (args, ctx) => {
    const published = ctx.published || {};
    const draftPacks = listPacks(ctx.content);
    const publishedPacks = listPacks(published);
    const draftIds = new Set(draftPacks.map((p) => p.id));
    const publishedIds = new Set(publishedPacks.map((p) => p.id));
    return {
      summary: 'Status de publicação carregado.',
      data: {
        publishedVersion: published._version || 0,
        publishedAt: published._updatedAt || null,
        draftUpdatedAt: ctx.draftUpdatedAt || null,
        packs: {
          draft: draftPacks.length,
          published: publishedPacks.length,
          newPacks: draftPacks.filter((p) => !publishedIds.has(p.id)).map((p) => p.title),
          removedPacks: publishedPacks.filter((p) => !draftIds.has(p.id)).map((p) => p.title),
        },
        library: {
          draft: getLibrary(ctx.content).length,
          published: getLibrary(published).length,
        },
        heroSlides: { draft: (ctx.content.hero?.photos || []).length, published: (published.hero?.photos || []).length },
        galleryPhotos: { draft: (ctx.content.gallery?.photos || []).length, published: (published.gallery?.photos || []).length },
      },
    };
  },
});

define('publish_site', {
  description:
    'Publica o rascunho atual no site. Ação sensível: gera cartão de confirmação e só executa após a usuária clicar.',
  parameters: { summary: S('Resumo do que será publicado') },
  risk: 'sensitive',
  run: async (args, ctx) => {
    const detail = String(args.summary || '').trim().replace(/[.?!\s]+$/, '');
    const prop = proposal(ctx, {
      actionType: 'publish_site',
      targetId: 'site_content',
      summary: `Publicar o site com as alterações atuais${detail ? `: ${detail}` : ''}?`,
      proposedChanges: {
        packs: listPacks(ctx.content).length,
        photos: getLibrary(ctx.content).length,
        heroSlides: (ctx.content.hero?.photos || []).length,
        galleryPhotos: (ctx.content.gallery?.photos || []).length,
      },
      payload: { content: ctx.content },
    });
    await ctx.services.write(`nua_ai_proposal:${prop.proposalId}`, prop);
    return {
      summary: 'Publicação preparada. Confirme no cartão abaixo — nada foi publicado ainda.',
      proposal: {
        proposalId: prop.proposalId,
        nonce: prop.nonce,
        actionType: prop.actionType,
        targetId: prop.targetId,
        summary: prop.summary,
        proposedChanges: prop.proposedChanges,
      },
    };
  },
});

// ===== Pedidos comerciais =====

define('list_orders', {
  description: 'Lista os pedidos comerciais (venda de packs) com status, valor e cliente.',
  parameters: {
    status: S('paid, pending, approved ou all'),
    from: S('Data inicial YYYY-MM-DD'),
    to: S('Data final YYYY-MM-DD'),
    limit: N('Máximo (padrão 30)'),
  },
  run: async (args, ctx) => {
    if (typeof ctx.services.db?.select !== 'function') throw new Error('Consulta de pedidos indisponível.');
    const rows = await ctx.services.db.select('orders', {
      select: 'id,status,amount,customer_email,customer_name,created_at',
      order: 'created_at.desc',
      limit: Math.min(Math.max(Number(args.limit) || 30, 1), 200),
      eq: args.status && args.status !== 'all' ? { status: args.status } : undefined,
    });
    const items = (rows || [])
      .map((o) => ({
        id: o.id,
        client: o.customer_name || o.customer_email || 'Cliente',
        amount: Number(o.amount || 0),
        amountFormatted: fmtBrl(o.amount),
        status: o.status,
        createdAt: o.created_at,
      }))
      .filter((o) => withinDateRange(o, args));
    return {
      summary: `${items.length} pedido(s) comercial(is).`,
      data: { total: items.length, totalAmount: items.reduce((s, o) => s + o.amount, 0), items },
    };
  },
});

define('get_order', {
  description: 'Detalhe de um pedido comercial pelo id.',
  parameters: { id: S('ID do pedido') },
  required: ['id'],
  run: async (args, ctx) => {
    const rows = await ctx.services.db.select('orders', { eq: { id: String(args.id) }, limit: 1 });
    if (!rows?.length) throw new Error('Pedido não encontrado.');
    return { summary: 'Pedido carregado.', data: rows[0] };
  },
});

// ===== Personalizados =====

define('list_personalizados', {
  description: 'Lista os pedidos personalizados reais com cliente, valor, status e prazo.',
  parameters: {
    status: S('aguardando_pagamento, em_producao, pronto, entregue, cancelado ou all'),
    query: S('Busca por nome do cliente'),
    from: S('Data inicial YYYY-MM-DD'),
    to: S('Data final YYYY-MM-DD'),
  },
  run: async (args, ctx) => {
    const data = await apiCall(ctx, '/api/personalizados/admin');
    let orders = Array.isArray(data.orders) ? data.orders : [];
    if (args.status && args.status !== 'all') orders = orders.filter((o) => o.status === args.status);
    if (args.query) orders = orders.filter((o) => norm(o.clientName).includes(norm(args.query)));
    orders = orders.filter((o) => withinDateRange(o, args));
    return {
      summary: `${orders.length} pedido(s) personalizado(s).`,
      data: {
        total: orders.length,
        totalValue: orders.reduce((s, o) => s + Number(o.totalPrice || 0), 0),
        items: orders.map((o) => ({
          id: o.id,
          client: o.clientName,
          status: o.status,
          price: fmtBrl(o.totalPrice),
          photos: o.photoCount,
          videoMinutes: o.videoDurationMinutes,
          channel: o.deliveryChannel,
          createdAt: o.createdAt,
        })),
      },
    };
  },
});

define('get_personalizado', {
  description: 'Detalhe completo de um pedido personalizado (briefing, fotos, vídeo, pagamento, notas).',
  parameters: { id: S('ID do pedido') },
  required: ['id'],
  run: async (args, ctx) => {
    const data = await apiCall(ctx, '/api/personalizados/admin');
    const order = (data.orders || []).find((o) => String(o.id) === String(args.id) || String(o.publicToken) === String(args.id));
    if (!order) throw new Error('Pedido personalizado não encontrado.');
    return { summary: `Pedido de ${order.clientName} carregado.`, data: order };
  },
});

define('update_personalizado_status', {
  description: 'Atualiza o status de um pedido personalizado (em_producao, pronto, entregue, cancelado).',
  parameters: {
    id: S('ID do pedido'),
    status: S('Novo status'),
    note: S('Observação interna'),
  },
  required: ['id', 'status'],
  run: async (args, ctx) => {
    const allowed = ['aguardando_pagamento', 'em_producao', 'pronto', 'entregue', 'cancelado'];
    if (!allowed.includes(args.status)) throw new Error(`Status inválido. Use: ${allowed.join(', ')}.`);
    const data = await apiCall(ctx, '/api/personalizados/admin', {
      method: 'POST',
      body: { action: 'update_order', orderId: args.id, patch: { status: args.status, adminNotes: args.note } },
    });
    const order = data.order || data;
    return {
      summary: `Pedido de **${order.clientName || args.id}** atualizado para **${args.status}**.`,
      data: { id: order.id, status: order.status },
      lastContext: { entityType: 'personalizado', entityId: order.id, entityTitle: order.clientName },
    };
  },
});

define('update_personalizado_notes', {
  description: 'Salva observações internas em um pedido personalizado.',
  parameters: { id: S('ID do pedido'), notes: S('Anotações internas') },
  required: ['id', 'notes'],
  run: async (args, ctx) => {
    await apiCall(ctx, '/api/personalizados/admin', {
      method: 'POST',
      body: { action: 'update_order', orderId: args.id, patch: { adminNotes: cleanText(args.notes, 3000) } },
    });
    return { summary: 'Notas internas salvas.' };
  },
});

define('update_personalizado_settings', {
  description: 'Altera preços/regras da calculadora de personalizados. Sensível: exige confirmação.',
  parameters: { settings: O({}, 'Configurações completas (pricePerPhoto, minPhotos, maxPhotos, videoOptions, express24hPrice...)') },
  required: ['settings'],
  risk: 'sensitive',
  run: async (args, ctx) => {
    const data = await apiCall(ctx, '/api/personalizados/admin');
    const merged = { ...(data.settings || {}), ...(args.settings || {}) };
    const prop = proposal(ctx, {
      actionType: 'update_personalizado_settings',
      targetId: 'personalizados_settings',
      summary: 'Alterar os preços/regras da calculadora de pedidos personalizados?',
      proposedChanges: args.settings,
      payload: { settings: merged },
    });
    await ctx.services.write(`nua_ai_proposal:${prop.proposalId}`, prop);
    return {
      summary: 'Alteração de preços preparada. Confirme no cartão abaixo.',
      proposal: {
        proposalId: prop.proposalId,
        nonce: prop.nonce,
        actionType: prop.actionType,
        targetId: prop.targetId,
        summary: prop.summary,
        proposedChanges: prop.proposedChanges,
      },
    };
  },
});

// ===== Chamadas VIP =====

define('list_appointments', {
  description: 'Lista as chamadas VIP agendadas com cliente, data, status e link.',
  parameters: {
    status: S('aguardando_pagamento, confirmada, concluida, cancelada, nao_compareceu ou all'),
    query: S('Busca por nome do cliente'),
    from: S('Data inicial YYYY-MM-DD'),
    to: S('Data final YYYY-MM-DD'),
  },
  run: async (args, ctx) => {
    const data = await apiCall(ctx, '/api/appointments/admin');
    let bookings = Array.isArray(data.bookings) ? data.bookings : [];
    if (args.status && args.status !== 'all') bookings = bookings.filter((b) => b.status === args.status);
    if (args.query) bookings = bookings.filter((b) => norm(b.clientName).includes(norm(args.query)));
    bookings = bookings.filter((b) => withinDateRange(b, args));
    return {
      summary: `${bookings.length} chamada(s).`,
      data: {
        total: bookings.length,
        items: bookings.map((b) => ({
          id: b.id,
          client: b.clientName,
          status: b.status,
          date: b.date,
          startTime: b.startTime,
          modality: b.modalityName,
          price: fmtBrl(b.price),
          paymentStatus: b.payment?.status,
          meetingUrl: b.meeting?.url || null,
        })),
      },
    };
  },
});

define('get_appointment', {
  description: 'Detalhe completo de uma chamada VIP.',
  parameters: { id: S('ID do agendamento') },
  required: ['id'],
  run: async (args, ctx) => {
    const data = await apiCall(ctx, '/api/appointments/admin');
    const booking = (data.bookings || []).find((b) => String(b.id) === String(args.id) || String(b.publicToken) === String(args.id));
    if (!booking) throw new Error('Agendamento não encontrado.');
    return { summary: `Chamada de ${booking.clientName} carregada.`, data: booking };
  },
});

define('get_availability', {
  description: 'Calcula os horários livres de uma data para uma modalidade.',
  parameters: { date: S('Data YYYY-MM-DD'), modalityId: S('chamada-30 ou chamada-60') },
  required: ['date'],
  run: async (args, ctx) => {
    const data = await apiCall(ctx, '/api/appointments/admin');
    const settings = data.settings || {};
    const modalities = data.modalities || [];
    const modality =
      modalities.find((m) => m.id === args.modalityId) || modalities.find((m) => m.active) || { durationMinutes: 30, id: 'chamada-30' };
    const bookings = data.bookings || [];
    const date = String(args.date);

    if ((settings.blockedDates || []).includes(date)) {
      return { summary: `A data ${date} está bloqueada.`, data: { date, slots: [], blocked: true } };
    }

    const weekday = new Date(`${date}T12:00:00-03:00`).getDay();
    const day = (settings.weeklyHours || {})[weekday];
    if (!day?.enabled) return { summary: `Sem atendimento em ${date}.`, data: { date, slots: [] } };

    const duration = Number(modality.durationMinutes) || 30;
    const buffer = Number(settings.bufferMinutes) || 0;
    const now = Date.now();
    const slots = [];

    for (const range of day.ranges || []) {
      for (let t = timeToMinutes(range.start); t + duration <= timeToMinutes(range.end); t += duration + buffer) {
        const start = minutesToTime(t);
        const end = minutesToTime(t + duration);
        const startAt = new Date(`${date}T${start}:00-03:00`).getTime();
        if (startAt < now + (Number(settings.minNoticeHours) || 0) * 3600 * 1000) continue;
        const blocked = (settings.blockedSlots || []).some(
          (b) => b.date === date && timeToMinutes(b.start) < t + duration && timeToMinutes(b.end) > t
        );
        if (blocked) continue;
        const taken = bookings.some(
          (b) =>
            b.date === date &&
            !['cancelada', 'nao_compareceu'].includes(b.status) &&
            timeToMinutes(b.startTime) < t + duration &&
            timeToMinutes(b.endTime || b.startTime) > t
        );
        if (!taken) slots.push({ start, end });
      }
    }

    return {
      summary: `${slots.length} horário(s) livre(s) em ${date}.`,
      data: { date, modality: modality.name, durationMinutes: duration, slots },
    };
  },
});

define('confirm_appointment', {
  description: 'Confirma o pagamento de uma chamada VIP e libera o agendamento.',
  parameters: { id: S('ID do agendamento'), transactionId: S('ID da transação (opcional)') },
  required: ['id'],
  run: async (args, ctx) => {
    const data = await apiCall(ctx, '/api/appointments/admin', {
      method: 'POST',
      body: { action: 'confirm', bookingId: args.id, transactionId: args.transactionId },
    });
    return {
      summary: 'Chamada confirmada.',
      data,
      lastContext: { entityType: 'appointment', entityId: args.id },
    };
  },
});

define('set_appointment_link', {
  description: 'Define o link da sala da chamada VIP e as instruções para a cliente.',
  parameters: { id: S('ID do agendamento'), meetingUrl: S('Link HTTPS da sala'), instructions: S('Instruções') },
  required: ['id', 'meetingUrl'],
  run: async (args, ctx) => {
    if (!validUrl(args.meetingUrl)) throw new Error('Link inválido: use HTTPS.');
    const data = await apiCall(ctx, '/api/appointments/admin', {
      method: 'POST',
      body: { action: 'updateMeeting', bookingId: args.id, meetingUrl: args.meetingUrl, instructions: args.instructions },
    });
    return { summary: 'Link da sala salvo.', data, lastContext: { entityType: 'appointment', entityId: args.id } };
  },
});

define('reschedule_appointment', {
  description: 'Reagenda uma chamada para nova data/horário. Sensível: exige confirmação.',
  parameters: { id: S('ID do agendamento'), date: S('Nova data YYYY-MM-DD'), startTime: S('Novo horário HH:mm'), reason: S('Motivo') },
  required: ['id', 'date', 'startTime'],
  risk: 'sensitive',
  run: async (args, ctx) => {
    const prop = proposal(ctx, {
      actionType: 'reschedule_appointment',
      targetId: args.id,
      summary: `Reagendar esta chamada para ${fmtDateBr(args.date)} às ${args.startTime}?`,
      proposedChanges: { date: args.date, startTime: args.startTime, reason: args.reason },
      payload: { bookingId: args.id, date: args.date, startTime: args.startTime, reason: args.reason },
    });
    await ctx.services.write(`nua_ai_proposal:${prop.proposalId}`, prop);
    return {
      summary: 'Reagendamento preparado. Confirme no cartão abaixo.',
      proposal: {
        proposalId: prop.proposalId,
        nonce: prop.nonce,
        actionType: prop.actionType,
        targetId: prop.targetId,
        summary: prop.summary,
        proposedChanges: prop.proposedChanges,
      },
    };
  },
});

define('cancel_appointment', {
  description: 'Cancela uma chamada VIP. Sensível: exige confirmação.',
  parameters: { id: S('ID do agendamento'), reason: S('Motivo do cancelamento') },
  required: ['id'],
  risk: 'sensitive',
  run: async (args, ctx) => {
    const prop = proposal(ctx, {
      actionType: 'cancel_appointment',
      targetId: args.id,
      summary: `Cancelar esta chamada${args.reason ? ` — motivo: ${args.reason}` : ''}?`,
      proposedChanges: { reason: args.reason },
      payload: { bookingId: args.id, reason: args.reason || 'Cancelada pela administradora' },
    });
    await ctx.services.write(`nua_ai_proposal:${prop.proposalId}`, prop);
    return {
      summary: 'Cancelamento preparado. Confirme no cartão abaixo.',
      proposal: {
        proposalId: prop.proposalId,
        nonce: prop.nonce,
        actionType: prop.actionType,
        targetId: prop.targetId,
        summary: prop.summary,
        proposedChanges: prop.proposedChanges,
      },
    };
  },
});

define('complete_appointment', {
  description: 'Marca uma chamada como concluída.',
  parameters: { id: S('ID do agendamento') },
  required: ['id'],
  run: async (args, ctx) => {
    await apiCall(ctx, '/api/appointments/admin', { method: 'POST', body: { action: 'complete', bookingId: args.id } });
    return { summary: 'Chamada marcada como concluída.', lastContext: { entityType: 'appointment', entityId: args.id } };
  },
});

define('mark_absent', {
  description: 'Marca que a cliente não compareceu à chamada.',
  parameters: { id: S('ID do agendamento') },
  required: ['id'],
  run: async (args, ctx) => {
    await apiCall(ctx, '/api/appointments/admin', { method: 'POST', body: { action: 'absent', bookingId: args.id } });
    return { summary: 'Ausência registrada.', lastContext: { entityType: 'appointment', entityId: args.id } };
  },
});

define('update_appointment_settings', {
  description:
    'Altera horários, regras ou modalidades das chamadas. Envie SOMENTE o que deve mudar: um dia em weeklyHours, uma regra, uma data bloqueada. O que não for enviado permanece como está. Sensível: exige confirmação.',
  parameters: {
    settings: O({}, 'Alterações parciais de agenda (weeklyHours, bufferMinutes, minNoticeHours, blockedDates...)'),
    modalities: A(O({}, 'Modalidade'), 'Lista completa de modalidades (opcional)'),
  },
  risk: 'sensitive',
  run: async (args, ctx) => {
    const current = await apiCall(ctx, '/api/appointments/admin');
    const mergedSettings = mergeAppointmentSettingsPatch(current.settings || {}, args.settings || {});

    const invalidRange = Object.values(mergedSettings.weeklyHours || {}).some((day) =>
      (day?.ranges || []).some((range) => timeToMinutes(range.start) >= timeToMinutes(range.end))
    );
    if (invalidRange) {
      throw new Error('O horário de término precisa ser depois do horário de início.');
    }

    const openDays = formatWeeklyHoursSummary(mergedSettings.weeklyHours);
    const summary = openDays.length
      ? `Atualizar a agenda das chamadas VIP? Ficará assim: ${openDays.join('; ')}.`
      : 'Atualizar a agenda das chamadas VIP?';

    const prop = proposal(ctx, {
      actionType: 'update_appointment_settings',
      targetId: 'appointments_settings',
      summary,
      proposedChanges: {
        settings: mergedSettings,
        ...(Array.isArray(args.modalities) ? { modalities: args.modalities } : {}),
      },
      payload: {
        settings: mergedSettings,
        ...(Array.isArray(args.modalities) ? { modalities: args.modalities } : {}),
      },
    });
    await ctx.services.write(`nua_ai_proposal:${prop.proposalId}`, prop);
    return {
      summary: 'Alteração de agenda preparada. Confirme no cartão abaixo.',
      proposal: {
        proposalId: prop.proposalId,
        nonce: prop.nonce,
        actionType: prop.actionType,
        targetId: prop.targetId,
        summary: prop.summary,
        proposedChanges: prop.proposedChanges,
      },
    };
  },
});

define('set_appointment_hours', {
  description:
    'Define EXATAMENTE quais dias da semana têm atendimento e em qual janela de horário; todos os outros dias são desativados. Use quando a cliente disser algo como "só atendo segunda das 9 às 18". Sensível: exige confirmação.',
  parameters: {
    days: A(N('Dias da semana com atendimento: 0=domingo, 1=segunda, 2=terça, 3=quarta, 4=quinta, 5=sexta, 6=sábado'), 'Dias que terão atendimento'),
    start: S('Horário de início no formato HH:mm (ex.: 09:00)'),
    end: S('Horário de término no formato HH:mm (ex.: 18:00)'),
  },
  required: ['days', 'start', 'end'],
  risk: 'sensitive',
  run: async (args, ctx) => {
    const days = (Array.isArray(args.days) ? args.days : [])
      .map((day) => Number(day))
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
    if (days.length === 0) {
      throw new Error('Informe pelo menos um dia de atendimento.');
    }

    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timePattern.test(String(args.start || '')) || !timePattern.test(String(args.end || ''))) {
      throw new Error('Informe os horários no formato HH:mm.');
    }
    if (timeToMinutes(args.start) >= timeToMinutes(args.end)) {
      throw new Error('O horário de término precisa ser depois do horário de início.');
    }

    const current = await apiCall(ctx, '/api/appointments/admin');
    const weeklyHours = {};
    for (let day = 0; day <= 6; day += 1) {
      weeklyHours[day] = days.includes(day)
        ? { enabled: true, ranges: [{ start: args.start, end: args.end }] }
        : { enabled: false, ranges: [] };
    }

    const mergedSettings = { ...(current.settings || {}), weeklyHours };
    const dayLabels = days.map((day) => WEEKDAY_LABELS[day]).join(', ');

    const prop = proposal(ctx, {
      actionType: 'update_appointment_settings',
      targetId: 'appointments_settings',
      summary: `Deixar o atendimento das chamadas VIP somente em ${dayLabels}, das ${args.start} às ${args.end}? Os outros dias ficam fechados.`,
      proposedChanges: { settings: mergedSettings },
      payload: { settings: mergedSettings },
    });
    await ctx.services.write(`nua_ai_proposal:${prop.proposalId}`, prop);
    return {
      summary: 'Novo horário preparado. Confirme no cartão abaixo.',
      proposal: {
        proposalId: prop.proposalId,
        nonce: prop.nonce,
        actionType: prop.actionType,
        targetId: prop.targetId,
        summary: prop.summary,
        proposedChanges: prop.proposedChanges,
      },
    };
  },
});

// ===== Financeiro =====

define('get_finance_summary', {
  description: 'Retorna o financeiro real: parcelas, valores pagos/pendentes, próxima parcela e status do Mercado Pago.',
  parameters: {},
  run: async (args, ctx) => {
    const data = await apiCall(ctx, '/api/finance/admin');
    return {
      summary: 'Financeiro carregado.',
      data: { summary: data.summary, installments: data.installments, mercadopago: data.mercadopago },
    };
  },
});

define('mark_finance_paid', {
  description: 'Dá baixa manual em uma parcela. Sensível: exige confirmação.',
  parameters: { installmentId: S('Parcela (ex: parcela-1 ou 1)'), paidAmount: N('Valor pago'), method: S('pix, transferencia...') },
  required: ['installmentId'],
  risk: 'sensitive',
  run: async (args, ctx) => {
    const number = Number(String(args.installmentId || '').replace(/[^\d]/g, ''));
    if (!number || number < 1 || number > 10) throw new Error('Parcela inválida: informe de 1 a 10.');
    const prop = proposal(ctx, {
      actionType: 'mark_finance_paid',
      targetId: `parcela-${number}`,
      summary: `Dar baixa manual na parcela ${number}${args.paidAmount ? ` no valor de ${fmtBrl(args.paidAmount)}` : ''}?`,
      proposedChanges: { installmentNumber: number, paidAmount: args.paidAmount, method: args.method || 'manual' },
      payload: { installmentNumber: number, paidAmount: args.paidAmount, paymentMethod: args.method || 'manual' },
    });
    await ctx.services.write(`nua_ai_proposal:${prop.proposalId}`, prop);
    return {
      summary: 'Baixa preparada. Confirme no cartão abaixo.',
      proposal: {
        proposalId: prop.proposalId,
        nonce: prop.nonce,
        actionType: prop.actionType,
        targetId: prop.targetId,
        summary: prop.summary,
        proposedChanges: prop.proposedChanges,
      },
    };
  },
});

define('revert_finance_payment', {
  description: 'Reverte a quitação de uma parcela. Sensível: exige confirmação.',
  parameters: { installmentId: S('Parcela (ex: parcela-1 ou 1)') },
  required: ['installmentId'],
  risk: 'sensitive',
  run: async (args, ctx) => {
    const number = Number(String(args.installmentId || '').replace(/[^\d]/g, ''));
    if (!number || number < 1 || number > 10) throw new Error('Parcela inválida: informe de 1 a 10.');
    const prop = proposal(ctx, {
      actionType: 'revert_finance_payment',
      targetId: `parcela-${number}`,
      summary: `Reverter a quitação da parcela ${number}?`,
      proposedChanges: { installmentNumber: number },
      payload: { installmentNumber: number },
    });
    await ctx.services.write(`nua_ai_proposal:${prop.proposalId}`, prop);
    return {
      summary: 'Reversão preparada. Confirme no cartão abaixo.',
      proposal: {
        proposalId: prop.proposalId,
        nonce: prop.nonce,
        actionType: prop.actionType,
        targetId: prop.targetId,
        summary: prop.summary,
        proposedChanges: prop.proposedChanges,
      },
    };
  },
});

// ===== Solicitações =====

define('list_requests', {
  description: 'Lista as solicitações enviadas ao Philippe.',
  parameters: { status: S('new, analyzing, planned, in_progress, review, done...'), limit: N('Máximo') },
  run: async (args, ctx) => {
    const data = await apiCall(ctx, '/api/requests');
    let items = Array.isArray(data.requests) ? data.requests : [];
    if (args.status) items = items.filter((r) => r.status === args.status);
    items = items.slice(0, Math.min(Number(args.limit) || 30, 100));
    return {
      summary: `${items.length} solicitação(ões).`,
      data: items.map((r) => ({ id: r.id, title: r.title, status: r.status, priority: r.priority, createdAt: r.createdAt })),
    };
  },
});

define('get_request', {
  description: 'Detalhe de uma solicitação com histórico e mensagens.',
  parameters: { id: S('ID da solicitação') },
  required: ['id'],
  run: async (args, ctx) => {
    const data = await apiCall(ctx, '/api/requests');
    const item = (data.requests || []).find((r) => String(r.id) === String(args.id));
    if (!item) throw new Error('Solicitação não encontrada.');
    return { summary: 'Solicitação carregada.', data: item };
  },
});

define('create_request', {
  description: 'Cria uma solicitação real para o Philippe a partir do pedido da usuária.',
  parameters: {
    title: S('Título curto'),
    details: S('Descrição completa do que precisa'),
    type: S('bug, feature, improvement, content, visual, technical'),
    priority: S('low, medium, high, critical'),
    section: S('Área do site'),
  },
  required: ['title', 'details'],
  run: async (args, ctx) => {
    const text = `[Pedido via Nua IA]\nÁrea: ${args.section || 'Geral'}\nTipo: ${args.type || 'improvement'}\nDetalhes: ${cleanText(args.details, 5000)}`;
    const data = await apiCall(ctx, '/api/requests', {
      method: 'POST',
      body: {
        action: 'create',
        text,
        category: `${args.type || 'improvement'} • ${args.section || 'Geral'}`,
        triage: {
          title: cleanText(args.title, 120),
          summary: cleanText(args.details, 1000),
          type: args.type || 'improvement',
          priority: args.priority || 'medium',
          contractScope: 'franquia_suporte',
        },
      },
    });
    const request = data.request || data;
    return {
      summary: `Solicitação **${args.title}** criada e enviada para o Philippe.`,
      data: { id: request.id, status: request.status },
      lastContext: { entityType: 'request', entityId: request.id, entityTitle: args.title },
    };
  },
});

define('reply_request', {
  description: 'Responde uma solicitação existente com uma mensagem.',
  parameters: { id: S('ID da solicitação'), text: S('Mensagem') },
  required: ['id', 'text'],
  run: async (args, ctx) => {
    await apiCall(ctx, '/api/requests', {
      method: 'POST',
      body: { action: 'message', id: args.id, text: cleanText(args.text, 3000), role: 'admin' },
    });
    return { summary: 'Resposta enviada na solicitação.' };
  },
});

define('update_request_status', {
  description: 'Altera o status de uma solicitação. Sensível: exige confirmação.',
  parameters: { id: S('ID da solicitação'), status: S('Novo status') },
  required: ['id', 'status'],
  risk: 'sensitive',
  run: async (args, ctx) => {
    const prop = proposal(ctx, {
      actionType: 'update_request_status',
      targetId: args.id,
      summary: `Alterar o andamento desta solicitação para "${REQUEST_STATUS_LABELS[args.status] || args.status}"?`,
      proposedChanges: { status: args.status },
      payload: { requestId: args.id, status: args.status },
    });
    await ctx.services.write(`nua_ai_proposal:${prop.proposalId}`, prop);
    return {
      summary: 'Alteração de status preparada. Confirme no cartão abaixo.',
      proposal: {
        proposalId: prop.proposalId,
        nonce: prop.nonce,
        actionType: prop.actionType,
        targetId: prop.targetId,
        summary: prop.summary,
        proposedChanges: prop.proposedChanges,
      },
    };
  },
});

// ===== Contratos / Cofre / Música =====

define('get_contract_status', {
  description: 'Mostra o status das assinaturas do contrato (sem assinar nada).',
  parameters: {},
  run: async (args, ctx) => {
    const data = await apiCall(ctx, '/api/contract/sign');
    return {
      summary: 'Status do contrato carregado.',
      data: {
        contractorSigned: Boolean(data.contractor || data.state?.contractor),
        clientSigned: Boolean(data.client || data.state?.client),
        raw: trimValue(data, 300, 10),
      },
    };
  },
});

define('list_vault_metadata', {
  description: 'Lista apenas METADADOS do cofre (serviço, título, usuário, URL). Nunca retorna senhas.',
  parameters: {},
  run: async (args, ctx) => {
    const data = await apiCall(ctx, '/api/admin/vault');
    const credentials = Array.isArray(data.credentials) ? data.credentials : [];
    return {
      summary: `${credentials.length} credencial(is) no cofre (somente metadados).`,
      data: credentials.map((c) => ({
        id: c.id,
        service: c.service,
        category: c.category,
        title: c.title,
        username: c.username,
        accessUrl: c.accessUrl || c.url || null,
      })),
    };
  },
});

define('list_music', {
  description: 'Lista as faixas e a configuração do player de música.',
  parameters: {},
  run: async (args, ctx) => {
    const data = await apiCall(ctx, '/api/music/list');
    return { summary: 'Biblioteca musical carregada.', data: { tracks: data.tracks || [], config: data.config || {} } };
  },
});

define('update_music_config', {
  description: 'Atualiza a configuração do player (enabled, autoplay, playlistTitle).',
  parameters: { config: O({ enabled: B('Ligado'), autoplay: B('Autoplay'), playlistTitle: S('Título da playlist') }, 'Configuração') },
  required: ['config'],
  run: async (args, ctx) => {
    const data = await apiCall(ctx, '/api/music/config', { method: 'PUT', body: args.config });
    return { summary: 'Configuração do player atualizada.', data: data.config };
  },
});

define('remove_music_track', {
  description: 'Remove uma faixa da biblioteca musical. Sensível: exige confirmação.',
  parameters: { id: S('ID da faixa') },
  required: ['id'],
  risk: 'sensitive',
  run: async (args, ctx) => {
    const prop = proposal(ctx, {
      actionType: 'remove_music_track',
      targetId: args.id,
      summary: 'Remover esta faixa da biblioteca musical?',
      proposedChanges: { trackId: args.id },
      payload: { trackId: args.id },
    });
    await ctx.services.write(`nua_ai_proposal:${prop.proposalId}`, prop);
    return {
      summary: 'Remoção preparada. Confirme no cartão abaixo.',
      proposal: {
        proposalId: prop.proposalId,
        nonce: prop.nonce,
        actionType: prop.actionType,
        targetId: prop.targetId,
        summary: prop.summary,
        proposedChanges: prop.proposedChanges,
      },
    };
  },
});

// ===== Auditoria =====

define('get_audit_tail', {
  description: 'Mostra as últimas ações executadas pela Nua IA.',
  parameters: { limit: N('Máximo (padrão 20)') },
  run: async (args, ctx) => {
    const entries = (await ctx.services.read('nua_ai_audit:index')) || [];
    return {
      summary: `${entries.length} registro(s) de auditoria.`,
      data: entries.slice(0, Math.min(Number(args.limit) || 20, 100)),
    };
  },
});

// Ferramentas restritas: a cliente pode apenas abrir solicitações.
for (const [name, def] of Object.entries(DEFS)) {
  def.roles = name === 'create_request' ? ['dev', 'admin', 'client'] : ['dev', 'admin'];
}

// ---------------------------------------------------------------------------
// API pública do registro
// ---------------------------------------------------------------------------

export function toolDeclarations(role = 'admin') {
  return Object.entries(DEFS)
    .filter(([, def]) => def.roles.includes(role))
    .map(([name, def]) => ({
      name,
      description: def.description,
      parameters: {
        type: 'OBJECT',
        properties: def.parameters || {},
        ...(def.required?.length ? { required: def.required } : {}),
      },
    }));
}

export function getToolDefinition(name) {
  return DEFS[name] || null;
}

/**
 * Executa uma ferramenta e devolve um resultado normalizado.
 * Nunca lança para o chamador: erros viram `{ ok:false, error }` para o modelo
 * poder corrigir e para a usuária receber a causa real.
 */
export async function executeTool(name, args, ctx) {
  const def = DEFS[name];
  if (!def) {
    return { ok: false, summary: 'Não reconheci essa ação.', error: { code: 'UNKNOWN_TOOL', friendly: 'Não reconheci essa ação.' } };
  }
  if (!def.roles.includes(ctx.role)) {
    return {
      ok: false,
      summary: 'Seu perfil não tem permissão para esta ação.',
      error: { code: 'FORBIDDEN', friendly: 'Seu perfil não tem permissão para esta ação.' },
    };
  }

  const startedAt = Date.now();
  try {
    const result = await def.run(args || {}, ctx);
    return {
      ok: true,
      summary: result.summary || 'Ação executada.',
      content: result.content,
      data: result.data,
      proposal: result.proposal,
      action: result.action,
      lastContext: result.lastContext,
      risk: def.risk,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível executar a ação.';
    return {
      ok: false,
      summary: message,
      error: { code: 'TOOL_FAILED', friendly: message },
      durationMs: Date.now() - startedAt,
    };
  }
}

export function toolNames() {
  return Object.keys(DEFS);
}
