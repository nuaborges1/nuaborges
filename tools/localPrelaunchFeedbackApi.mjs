/**
 * Local Dev API Handler — Avaliações do Pré-lançamento (NUA Borges)
 *
 * Espelha integralmente as rotas Cloudflare Pages Functions:
 *   - GET  /api/prelaunch-feedback/session
 *   - POST /api/prelaunch-feedback/start
 *   - POST /api/prelaunch-feedback/upload
 *   - POST /api/prelaunch-feedback/submit
 *   - GET  /api/admin/prelaunch-feedback
 *   - POST /api/admin/prelaunch-feedback
 *   - GET  /api/admin/prelaunch-feedback/attachment
 *
 * Persiste apenas em arquivos locais (nuasite/data/), sem tocar no Supabase de produção.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const PRIVATE_KEY_PREFIX = 'objects/private/prelaunch-feedback/';

function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function generateRawCode() {
  return crypto.randomBytes(24).toString('base64url');
}

function detectImageMime(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return 'image/png';
  }
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

function getExtForMime(mime) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  return 'bin';
}

function getMimeForExt(ext) {
  const e = String(ext || '').toLowerCase();
  if (e === '.png') return 'image/png';
  if (e === '.jpg' || e === '.jpeg') return 'image/jpeg';
  if (e === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

function normalizeText(value, maxLen = 2000) {
  if (typeof value !== 'string') return '';
  return value.replace(/\r\n/g, '\n').trim().slice(0, maxLen);
}

function buildClusterKey(area, whatHappened) {
  const cleanArea = String(area || 'geral')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  const tokens = String(whatHappened || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !['para', 'como', 'mais', 'muito', 'quando', 'essa', 'esse', 'esta', 'este', 'tava', 'estava', 'tinha', 'ficou', 'fazer'].includes(w))
    .slice(0, 4)
    .sort()
    .join('_');
  return `${cleanArea}:${tokens || 'relato'}`;
}

function csvSafeCell(value) {
  let str = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

function loadStore(storeFile) {
  const fallback = {
    settings: {
      collectionActive: true,
      hideFromSidebar: false,
      retentionDays: 90,
      closedAt: null,
      updatedAt: null,
    },
    links: [],
    responses: [],
    issues: [],
    seq: 0,
  };
  try {
    if (!fs.existsSync(storeFile)) return fallback;
    const raw = JSON.parse(fs.readFileSync(storeFile, 'utf-8'));
    return {
      settings: { ...fallback.settings, ...(raw.settings || {}) },
      links: Array.isArray(raw.links) ? raw.links : [],
      responses: Array.isArray(raw.responses) ? raw.responses : [],
      issues: Array.isArray(raw.issues) ? raw.issues : [],
      seq: typeof raw.seq === 'number' ? raw.seq : (Array.isArray(raw.links) ? raw.links.length : 0),
    };
  } catch {
    return fallback;
  }
}

function saveStore(storeFile, data) {
  fs.mkdirSync(path.dirname(storeFile), { recursive: true });
  fs.writeFileSync(storeFile, JSON.stringify(data, null, 2), 'utf-8');
}

function average(nums) {
  const valid = nums.filter((n) => typeof n === 'number' && Number.isFinite(n) && n >= 1 && n <= 5);
  if (!valid.length) return null;
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
  return Math.round(avg * 100) / 100;
}

function annotateSimilarIssues(issues) {
  const counts = new Map();
  for (const iss of issues) {
    const k = iss.clusterKey || buildClusterKey(iss.area, iss.whatHappened);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  return issues.map((iss) => {
    const k = iss.clusterKey || buildClusterKey(iss.area, iss.whatHappened);
    return { ...iss, clusterKey: k, similarCount: counts.get(k) || 1 };
  });
}

function computeMetrics(links, responses, issues) {
  const areaVisitCounts = new Map();
  for (const r of responses) {
    for (const a of r.areasVisited || []) {
      areaVisitCounts.set(a, (areaVisitCounts.get(a) || 0) + 1);
    }
  }
  const issueAreaCounts = new Map();
  for (const iss of issues) {
    const a = iss.area || 'Outro lugar';
    issueAreaCounts.set(a, (issueAreaCounts.get(a) || 0) + 1);
  }

  return {
    linksGenerated: links.length,
    linksAvailable: links.filter((l) => l.status === 'available').length,
    linksInProgress: links.filter((l) => l.status === 'in_progress').length,
    linksCompleted: links.filter((l) => l.status === 'completed').length,
    linksRevoked: links.filter((l) => l.status === 'revoked').length,
    responsesReceived: responses.length,
    responsesPendingReview: responses.filter((r) => r.reviewStatus === 'new' || r.reviewStatus === 'in_review').length,
    issuesReported: issues.length,
    issuesResolved: issues.filter((i) => i.issueStatus === 'resolved').length,
    averageOverallRating: average(responses.map((r) => r.overallRating)),
    averageAppearanceRating: average(responses.map((r) => r.appearanceRating)),
    averagePacksRating: average(responses.map((r) => Number(r.answers?.p3_apresentacao_fotos))),
    topEvaluatedAreas: Array.from(areaVisitCounts.entries())
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    areasWithMostIssues: Array.from(issueAreaCounts.entries())
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
  };
}

function sanitizeLinkForAdmin(link) {
  return {
    id: link.id,
    adminCode: link.adminCode,
    status: link.status,
    startedAt: link.startedAt || null,
    completedAt: link.completedAt || null,
    revokedAt: link.revokedAt || null,
    responseId: link.responseId || null,
    participantName: link.participantName || null,
    createdAt: link.createdAt,
  };
}

function extractAreasVisited(answers) {
  const areas = [];
  if (answers?.p3_visitou_packs === 'sim') areas.push('Packs');
  if (answers?.p4_visitou_personalizados === 'sim') areas.push('Personalizados');
  if (answers?.p5_visitou_chamadas === 'sim') areas.push('Chamadas VIP');
  const activities = Array.isArray(answers?.p6_atividades) ? answers.p6_atividades : [];
  if (activities.includes('criei_conta')) areas.push('Conta Privada');
  if (activities.includes('tentei_comprar') || activities.includes('conclui_compra')) areas.push('Compra / Pagamento');
  if (activities.includes('acessei_cofre')) areas.push('Cofre');
  return areas;
}

function readRawBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function resolvePublicOrigin(req) {
  const origin = String(req.headers.origin || '').trim();
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return origin.replace(/\/$/, '');
  }
  const referer = String(req.headers.referer || '').trim();
  const refMatch = referer.match(/^(https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?)/i);
  if (refMatch) return refMatch[1];
  return 'http://localhost:3000';
}

export async function handleLocalPrelaunchFeedback({
  pathname,
  parsedUrl,
  req,
  res,
  readJsonBody,
  dataDir,
  isAdminAuthorized,
  getAdminProfile,
}) {
  const isPublicFeedback = pathname.startsWith('/api/prelaunch-feedback/');
  const isAdminFeedback =
    pathname === '/api/admin/prelaunch-feedback' ||
    pathname === '/api/admin/prelaunch-feedback/attachment';

  if (!isPublicFeedback && !isAdminFeedback) return false;

  const storeFile = path.join(dataDir, 'local_prelaunch_feedback.json');
  const uploadsDir = path.join(dataDir, 'private_prelaunch_feedback');

  const sendJson = (status, obj) => {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    });
    res.end(JSON.stringify(obj));
  };

  // =========================================================================
  // 1. PUBLIC ENDPOINTS (/api/prelaunch-feedback/*)
  // =========================================================================
  if (pathname === '/api/prelaunch-feedback/session' && req.method === 'GET') {
    const rawCode = String(parsedUrl.searchParams.get('code') || '').trim();
    if (!rawCode || rawCode.length < 16 || rawCode.length > 128) {
      return sendJson(200, {
        state: 'invalid',
        message: 'Esse link de avaliação não é válido ou não foi encontrado.',
      }), true;
    }

    const store = loadStore(storeFile);
    const codeHash = sha256Hex(rawCode);
    const link = store.links.find((l) => l.codeHash === codeHash);

    if (!link) {
      return sendJson(200, {
        state: 'invalid',
        message: 'Esse link de avaliação não é válido ou não foi encontrado.',
      }), true;
    }

    if (link.status === 'completed') {
      return sendJson(200, {
        state: 'completed',
        message: 'Essa avaliação já foi enviada. Muito obrigada por participar!',
      }), true;
    }

    if (link.status === 'revoked') {
      return sendJson(200, {
        state: 'revoked',
        message: 'Esse link de avaliação não está mais disponível.',
      }), true;
    }

    if (!store.settings.collectionActive) {
      return sendJson(200, {
        state: 'closed',
        message: 'O período de avaliações já foi encerrado. Muito obrigada pelo carinho!',
      }), true;
    }

    return sendJson(200, {
      state: link.status === 'in_progress' ? 'in_progress' : 'available',
      linkId: link.id,
      retentionDays: store.settings.retentionDays,
    }), true;
  }

  if (pathname === '/api/prelaunch-feedback/start' && req.method === 'POST') {
    const body = (await readJsonBody()) || {};
    const rawCode = String(body.code || '').trim();
    const store = loadStore(storeFile);
    const link = store.links.find((l) => l.codeHash === sha256Hex(rawCode));

    if (!link) return sendJson(404, { ok: false, error: 'Link não encontrado.' }), true;
    if (!store.settings.collectionActive) {
      return sendJson(403, { ok: false, error: 'O período de avaliações já foi encerrado.' }), true;
    }
    if (link.status === 'completed') {
      return sendJson(409, { ok: false, error: 'Essa avaliação já foi enviada.' }), true;
    }
    if (link.status === 'revoked') {
      return sendJson(403, { ok: false, error: 'Esse link não está mais disponível.' }), true;
    }

    if (link.status === 'available') {
      link.status = 'in_progress';
      link.startedAt = new Date().toISOString();
      saveStore(storeFile, store);
    }

    return sendJson(200, { ok: true, state: 'in_progress', linkId: link.id }), true;
  }

  if (pathname === '/api/prelaunch-feedback/upload' && req.method === 'POST') {
    const contentTypeHeader = String(req.headers['content-type'] || '');
    const lowerCt = contentTypeHeader.toLowerCase();

    let rawBody;
    try {
      // Folga de 256 KB para cabeçalhos multipart/form-data além dos 5 MB da imagem
      rawBody = await readRawBody(req, MAX_ATTACHMENT_BYTES + 256 * 1024);
    } catch {
      return sendJson(413, { ok: false, error: 'A imagem precisa ter no máximo 5 MB.' }), true;
    }

    let rawCode = '';
    let rawFileName = 'captura.png';
    let bytes = null;

    if (lowerCt.includes('multipart/form-data')) {
      try {
        const parsedReq = new Request('http://local.internal/api/prelaunch-feedback/upload', {
          method: 'POST',
          headers: { 'content-type': contentTypeHeader },
          body: rawBody,
        });
        const form = await parsedReq.formData();
        rawCode = String(form.get('code') || '').trim();
        const file = form.get('file');
        if (file && typeof file !== 'string') {
          rawFileName = String(file.name || 'captura.png').trim().slice(0, 120);
          bytes = Buffer.from(await file.arrayBuffer());
        }
      } catch {
        return sendJson(400, { ok: false, error: 'Não foi possível ler o arquivo enviado.' }), true;
      }
    } else {
      rawCode = String(req.headers['x-feedback-code'] || '').trim();
      rawFileName = String(req.headers['x-file-name'] || 'captura.png').trim().slice(0, 120);
      bytes = rawBody;
    }

    const store = loadStore(storeFile);
    if (!store.settings.collectionActive) {
      return sendJson(403, { ok: false, error: 'O período de avaliações já foi encerrado.' }), true;
    }

    const link = store.links.find((l) => l.codeHash === sha256Hex(rawCode));
    if (!link || (link.status !== 'available' && link.status !== 'in_progress')) {
      return sendJson(403, { ok: false, error: 'Link indisponível para envio de imagens.' }), true;
    }

    if (!bytes || !bytes.length) {
      return sendJson(400, { ok: false, error: 'Escolha uma imagem válida para anexar.' }), true;
    }
    if (bytes.length > MAX_ATTACHMENT_BYTES) {
      return sendJson(413, { ok: false, error: 'A imagem precisa ter no máximo 5 MB.' }), true;
    }

    const detectedMime = detectImageMime(bytes);
    if (!detectedMime || !ALLOWED_IMAGE_MIMES.has(detectedMime)) {
      return sendJson(415, { ok: false, error: 'Envie apenas imagens nos formatos PNG, JPG ou WebP.' }), true;
    }

    const ext = getExtForMime(detectedMime);
    const id = crypto.randomUUID().replace(/-/g, '');
    const relKey = `${PRIVATE_KEY_PREFIX}${link.id}/${id}.${ext}`;
    const diskPath = path.join(uploadsDir, link.id, `${id}.${ext}`);
    fs.mkdirSync(path.dirname(diskPath), { recursive: true });
    fs.writeFileSync(diskPath, bytes);

    return sendJson(201, {
      ok: true,
      attachment: {
        id,
        key: relKey,
        name: rawFileName.replace(/[^a-zA-Z0-9._-\s]/g, '_') || `captura.${ext}`,
        mimeType: detectedMime,
        size: bytes.length,
      },
    }), true;
  }

  if (pathname === '/api/prelaunch-feedback/submit' && req.method === 'POST') {
    const body = (await readJsonBody()) || {};
    const rawCode = String(body.code || '').trim();
    const firstName = normalizeText(body.firstName, 80);
    const lastName = normalizeText(body.lastName, 80);

    if (firstName.length < 2 || lastName.length < 2) {
      return sendJson(400, { error: 'Por favor, informe seu nome e sobrenome.' }), true;
    }

    const store = loadStore(storeFile);
    if (!store.settings.collectionActive) {
      return sendJson(403, { error: 'O período de avaliações já foi encerrado.' }), true;
    }

    const link = store.links.find((l) => l.codeHash === sha256Hex(rawCode));
    if (!link) return sendJson(404, { error: 'Link de avaliação não encontrado.' }), true;
    if (link.status === 'completed') {
      return sendJson(409, { error: 'Essa avaliação já foi enviada anteriormente.' }), true;
    }
    if (link.status === 'revoked') {
      return sendJson(403, { error: 'Esse link não está mais disponível.' }), true;
    }

    const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};
    const rawIssues = Array.isArray(body.issues) ? body.issues.slice(0, 15) : [];
    const nowIso = new Date().toISOString();
    const responseId = crypto.randomUUID();
    const participantName = `${firstName} ${lastName}`.trim();

    const parsedIssues = rawIssues
      .map((iss) => {
        const area = normalizeText(iss?.area || 'Outro lugar', 80) || 'Outro lugar';
        const whatTrying = normalizeText(iss?.whatTrying, 1200);
        const whatHappened = normalizeText(iss?.whatHappened, 1500);
        const whatExpected = normalizeText(iss?.whatExpected, 1200);
        if (!whatTrying && !whatHappened && !whatExpected) return null;
        const allowedAttachments = Array.isArray(iss?.attachments)
          ? iss.attachments
              .filter(
                (a) =>
                  a &&
                  typeof a.key === 'string' &&
                  a.key.startsWith(`${PRIVATE_KEY_PREFIX}${link.id}/`) &&
                  !a.key.includes('..')
              )
              .slice(0, 5)
          : [];
        return {
          id: crypto.randomUUID(),
          responseId,
          linkId: link.id,
          participantName,
          area,
          whatTrying,
          whatHappened,
          whatExpected,
          happenedMoreThanOnce: ['yes', 'no', 'not_tried'].includes(iss?.happenedMoreThanOnce)
            ? iss.happenedMoreThanOnce
            : 'not_tried',
          attachments: allowedAttachments,
          issueStatus: 'new',
          adminNotes: '',
          clusterKey: buildClusterKey(area, whatHappened || whatTrying),
          createdAt: nowIso,
          updatedAt: nowIso,
        };
      })
      .filter(Boolean);

    const overallNum = Number(answers.p8_nota_geral);
    const appearanceNum = Number(answers.p1_nota_aparencia);

    const responseRecord = {
      id: responseId,
      linkId: link.id,
      adminCode: link.adminCode,
      firstName,
      lastName,
      participantName,
      overallRating: Number.isFinite(overallNum) && overallNum >= 1 && overallNum <= 5 ? overallNum : null,
      appearanceRating: Number.isFinite(appearanceNum) && appearanceNum >= 1 && appearanceNum <= 5 ? appearanceNum : null,
      deviceUsed: typeof answers.p2_aparelho === 'string' ? answers.p2_aparelho : null,
      areasVisited: extractAreasVisited(answers),
      answers,
      reviewStatus: 'new',
      adminNotes: '',
      issuesCount: parsedIssues.length,
      submittedAt: nowIso,
      updatedAt: nowIso,
    };

    link.status = 'completed';
    link.completedAt = nowIso;
    if (!link.startedAt) link.startedAt = nowIso;
    link.responseId = responseId;
    link.participantName = participantName;

    store.responses.unshift(responseRecord);
    for (const iss of parsedIssues) {
      store.issues.unshift(iss);
    }
    saveStore(storeFile, store);

    return sendJson(201, {
      ok: true,
      responseId,
      message: 'Obrigada por fazer parte desse momento!',
    }), true;
  }

  // =========================================================================
  // 2. ADMIN ENDPOINTS (/api/admin/prelaunch-feedback*) — Restrito ao PHDEV
  // =========================================================================
  if (!isAdminAuthorized()) {
    return sendJson(401, { success: false, error: 'Sessão administrativa necessária.' }), true;
  }
  if (typeof getAdminProfile === 'function' && getAdminProfile() !== 'phdev') {
    return sendJson(403, { success: false, error: 'Acesso restrito ao perfil PHDEV.' }), true;
  }

  if (pathname === '/api/admin/prelaunch-feedback/attachment' && req.method === 'GET') {
    const key = String(parsedUrl.searchParams.get('key') || '').trim();
    if (!key.startsWith(PRIVATE_KEY_PREFIX) || key.includes('..') || key.includes('\\')) {
      return sendJson(400, { success: false, error: 'Caminho de anexo inválido.' }), true;
    }

    const relPath = key.slice(PRIVATE_KEY_PREFIX.length);
    const resolvedBase = path.resolve(uploadsDir);
    const resolvedTarget = path.resolve(uploadsDir, relPath);
    if (!resolvedTarget.startsWith(resolvedBase + path.sep) || !fs.existsSync(resolvedTarget)) {
      return sendJson(404, { success: false, error: 'Anexo não encontrado.' }), true;
    }

    const bytes = fs.readFileSync(resolvedTarget);
    res.writeHead(200, {
      'Content-Type': getMimeForExt(path.extname(resolvedTarget)),
      'Content-Length': String(bytes.length),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(bytes);
    return true;
  }

  if (pathname === '/api/admin/prelaunch-feedback' && req.method === 'GET') {
    const store = loadStore(storeFile);
    const annotatedIssues = annotateSimilarIssues(store.issues);
    const issuesByResponse = new Map();
    for (const iss of annotatedIssues) {
      const list = issuesByResponse.get(iss.responseId) || [];
      list.push(iss);
      issuesByResponse.set(iss.responseId, list);
    }

    const safeLinks = store.links.map(sanitizeLinkForAdmin);
    const enrichedResponses = store.responses.map((r) => ({
      ...r,
      issues: issuesByResponse.get(r.id) || [],
    }));
    const metrics = computeMetrics(safeLinks, enrichedResponses, annotatedIssues);

    return sendJson(200, {
      success: true,
      settings: store.settings,
      metrics,
      links: safeLinks,
      responses: enrichedResponses,
      issues: annotatedIssues,
    }), true;
  }

  if (pathname === '/api/admin/prelaunch-feedback' && req.method === 'POST') {
    const body = (await readJsonBody()) || {};
    const action = String(body.action || '').trim();
    const store = loadStore(storeFile);

    if (action === 'generate_links') {
      const count = Math.floor(Number(body.count));
      if (!Number.isFinite(count) || count < 1 || count > 100) {
        return sendJson(400, { success: false, error: 'Escolha entre 1 e 100 links por geração.' }), true;
      }
      const baseOrigin = resolvePublicOrigin(req);
      const generated = [];
      const nowIso = new Date().toISOString();

      for (let i = 0; i < count; i += 1) {
        store.seq += 1;
        const adminCode = `AV-${String(store.seq).padStart(3, '0')}`;
        const rawCode = generateRawCode();
        const id = crypto.randomUUID();
        store.links.unshift({
          id,
          adminCode,
          codeHash: sha256Hex(rawCode),
          status: 'available',
          startedAt: null,
          completedAt: null,
          revokedAt: null,
          responseId: null,
          participantName: null,
          createdAt: nowIso,
        });
        generated.push({
          id,
          adminCode,
          url: `${baseOrigin}/avaliacao/${rawCode}`,
          createdAt: nowIso,
        });
      }

      saveStore(storeFile, store);
      return sendJson(201, { success: true, generated }), true;
    }

    if (action === 'revoke_link') {
      const linkId = String(body.linkId || '').trim();
      const link = store.links.find((l) => l.id === linkId);
      if (!link) return sendJson(404, { success: false, error: 'Link não encontrado.' }), true;
      if (link.status === 'completed') {
        return sendJson(409, { success: false, error: 'Links já respondidos não podem ser revogados.' }), true;
      }
      link.status = 'revoked';
      link.revokedAt = new Date().toISOString();
      saveStore(storeFile, store);
      return sendJson(200, { success: true }), true;
    }

    if (action === 'update_response') {
      const responseId = String(body.responseId || '').trim();
      const reviewStatus = String(body.reviewStatus || '').trim();
      if (!['new', 'in_review', 'reviewed'].includes(reviewStatus)) {
        return sendJson(400, { success: false, error: 'Status de análise inválido.' }), true;
      }
      const resp = store.responses.find((r) => r.id === responseId);
      if (!resp) return sendJson(404, { success: false, error: 'Resposta não encontrada.' }), true;
      resp.reviewStatus = reviewStatus;
      resp.adminNotes = normalizeText(body.adminNotes, 4000);
      resp.updatedAt = new Date().toISOString();
      saveStore(storeFile, store);
      return sendJson(200, { success: true }), true;
    }

    if (action === 'update_issue') {
      const issueId = String(body.issueId || '').trim();
      const issueStatus = String(body.issueStatus || '').trim();
      if (!['new', 'in_review', 'resolved', 'dismissed'].includes(issueStatus)) {
        return sendJson(400, { success: false, error: 'Status do problema inválido.' }), true;
      }
      const iss = store.issues.find((i) => i.id === issueId);
      if (!iss) return sendJson(404, { success: false, error: 'Problema não encontrado.' }), true;
      iss.issueStatus = issueStatus;
      iss.adminNotes = normalizeText(body.adminNotes, 4000);
      iss.updatedAt = new Date().toISOString();
      saveStore(storeFile, store);
      return sendJson(200, { success: true }), true;
    }

    if (action === 'update_settings') {
      const nowIso = new Date().toISOString();
      if (typeof body.collectionActive === 'boolean') {
        store.settings.collectionActive = body.collectionActive;
        store.settings.closedAt = body.collectionActive ? null : nowIso;
      }
      if (typeof body.hideFromSidebar === 'boolean') {
        store.settings.hideFromSidebar = body.hideFromSidebar;
      }
      if (body.retentionDays !== undefined) {
        const d = Math.floor(Number(body.retentionDays));
        if (Number.isFinite(d) && d >= 7 && d <= 365) {
          store.settings.retentionDays = d;
        }
      }
      store.settings.updatedAt = nowIso;
      saveStore(storeFile, store);
      return sendJson(200, { success: true, settings: store.settings }), true;
    }

    if (action === 'export') {
      const format = body.format === 'csv' ? 'csv' : 'json';
      const scope = body.scope === 'issues' ? 'issues' : body.scope === 'responses' ? 'responses' : 'all';
      const annotatedIssues = annotateSimilarIssues(store.issues);
      const safeLinks = store.links.map(sanitizeLinkForAdmin);
      const metrics = computeMetrics(safeLinks, store.responses, annotatedIssues);

      if (format === 'json') {
        const payload = {
          exportedAt: new Date().toISOString(),
          settings: store.settings,
          consolidated: metrics,
          responses: scope === 'issues' ? undefined : store.responses,
          issues: scope === 'responses' ? undefined : annotatedIssues,
        };
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="avaliacoes-pre-lancamento-${scope}.json"`,
          'Cache-Control': 'no-store',
        });
        res.end(JSON.stringify(payload, null, 2));
        return true;
      }

      const lines = [];
      if (scope === 'issues') {
        lines.push(['Participante', 'Area', 'O que tentava fazer', 'O que aconteceu', 'O que esperava', 'Mais de uma vez', 'Status', 'Relatos semelhantes', 'Observacoes', 'Data'].map(csvSafeCell).join(','));
        for (const iss of annotatedIssues) {
          lines.push([
            iss.participantName,
            iss.area,
            iss.whatTrying,
            iss.whatHappened,
            iss.whatExpected,
            iss.happenedMoreThanOnce,
            iss.issueStatus,
            iss.similarCount,
            iss.adminNotes,
            iss.createdAt,
          ].map(csvSafeCell).join(','));
        }
      } else {
        lines.push(['Codigo Admin', 'Participante', 'Nota Geral', 'Nota Aparencia', 'Aparelho', 'Areas Visitadas', 'Problemas', 'Status Revisao', 'Observacoes', 'Data'].map(csvSafeCell).join(','));
        for (const r of store.responses) {
          lines.push([
            r.adminCode,
            r.participantName,
            r.overallRating ?? '',
            r.appearanceRating ?? '',
            r.deviceUsed ?? '',
            (r.areasVisited || []).join('; '),
            r.issuesCount ?? 0,
            r.reviewStatus,
            r.adminNotes,
            r.submittedAt,
          ].map(csvSafeCell).join(','));
        }
      }

      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="avaliacoes-pre-lancamento-${scope}.csv"`,
        'Cache-Control': 'no-store',
      });
      res.end('\uFEFF' + lines.join('\r\n'));
      return true;
    }

    return sendJson(400, { success: false, error: 'Ação não reconhecida.' }), true;
  }

  return false;
}
