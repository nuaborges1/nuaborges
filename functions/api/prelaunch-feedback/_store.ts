/**
 * Camada de Persistência e Segurança — Avaliação do Pré-lançamento NUA Borges
 *
 * - Códigos individuais criptograficamente seguros (24 bytes base64url)
 * - Armazenamento exclusivo do hash SHA-256 no Supabase (nunca o código em texto claro)
 * - Consumo atômico único via RPC SQL `submit_prelaunch_feedback_atomic`
 *   com fallback atômico seguro (lock KV + update condicional) para ambientes/testes
 */

import { getSupabaseClient, type SupabaseEnv } from '../_supabaseClient';
import { getNuaIdAdapter, type NuaIdEnv } from '../id/_nuaIdStore';
import { sha256Hex } from '../id/_crypto';
import {
  ALL_QUESTIONS_BY_ID,
  ISSUE_AREA_OPTIONS,
  buildIssueClusterKey,
  type FeedbackAttachment,
  type FeedbackIssueInput,
  type FeedbackIssueRecord,
  type FeedbackLinkRecord,
  type FeedbackLinkStatus,
  type FeedbackResponseRecord,
  type FeedbackSettings,
} from '../../../lib/prelaunchFeedback';

export type PrelaunchFeedbackEnv = SupabaseEnv &
  NuaIdEnv & {
    NEXT_PUBLIC_SITE_URL?: string;
    SITE_URL?: string;
    [key: string]: any;
  };

export const PRIVATE_ATTACHMENT_PREFIX = 'objects/private/prelaunch-feedback/';
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB por imagem
export const MAX_ATTACHMENTS_PER_ISSUE = 3;
export const MAX_ISSUES_PER_SUBMISSION = 15;
export const MAX_LINKS_PER_BATCH = 100;

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

const DEFAULT_SETTINGS: FeedbackSettings = {
  collectionActive: true,
  hideFromSidebar: false,
  retentionDays: 90,
  closedAt: null,
  updatedAt: null,
};

// Lock em processo para concorrência simultânea dentro do mesmo isolate/teste
const inProcessSubmitLocks = new Set<string>();

export function generateFeedbackRawCode(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function isValidFeedbackCodeFormat(raw: unknown): raw is string {
  return typeof raw === 'string' && /^[A-Za-z0-9_-]{16,80}$/.test(raw.trim());
}

export async function hashFeedbackCode(rawCode: string): Promise<string> {
  return sha256Hex(`nua-prelaunch-feedback-v1:${rawCode.trim()}`);
}

export function sanitizePlainText(raw: unknown, maxLen: number): string {
  return String(raw ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLen);
}

export function isValidAttachmentKeyForLink(key: string, linkId: string): boolean {
  if (!key || !linkId) return false;
  if (key.includes('..') || key.includes('\\') || key.includes('\0')) return false;
  const expectedPrefix = `${PRIVATE_ATTACHMENT_PREFIX}${linkId}/`;
  if (!key.startsWith(expectedPrefix)) return false;
  const rest = key.slice(expectedPrefix.length);
  return /^[a-zA-Z0-9_-]{8,96}\.(png|jpg|jpeg|webp)$/i.test(rest);
}

export function isValidAnyFeedbackAttachmentKey(key: string): boolean {
  if (!key || key.includes('..') || key.includes('\\') || key.includes('\0')) return false;
  if (!key.startsWith(PRIVATE_ATTACHMENT_PREFIX)) return false;
  const rest = key.slice(PRIVATE_ATTACHMENT_PREFIX.length);
  return /^[a-zA-Z0-9_-]{4,80}\/[a-zA-Z0-9_-]{8,96}\.(png|jpg|jpeg|webp)$/i.test(rest);
}

export async function getFeedbackSettings(env: PrelaunchFeedbackEnv): Promise<FeedbackSettings> {
  const sb = getSupabaseClient(env);
  if (!sb) return { ...DEFAULT_SETTINGS };
  try {
    const { data, error } = await sb
      .from('prelaunch_feedback_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (error || !data) return { ...DEFAULT_SETTINGS };
    return {
      collectionActive: data.collection_active !== false,
      hideFromSidebar: Boolean(data.hide_from_sidebar),
      retentionDays: Number(data.retention_days) || 90,
      closedAt: data.closed_at || null,
      updatedAt: data.updated_at || null,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function updateFeedbackSettings(
  env: PrelaunchFeedbackEnv,
  patch: Partial<Pick<FeedbackSettings, 'collectionActive' | 'hideFromSidebar' | 'retentionDays'>>
): Promise<FeedbackSettings> {
  const sb = getSupabaseClient(env);
  if (!sb) throw new Error('Supabase não configurado.');

  const current = await getFeedbackSettings(env);
  const nowIso = new Date().toISOString();
  const nextActive =
    typeof patch.collectionActive === 'boolean' ? patch.collectionActive : current.collectionActive;
  const nextHide =
    typeof patch.hideFromSidebar === 'boolean' ? patch.hideFromSidebar : current.hideFromSidebar;
  const nextRetention =
    typeof patch.retentionDays === 'number' && Number.isFinite(patch.retentionDays)
      ? Math.min(365, Math.max(7, Math.round(patch.retentionDays)))
      : current.retentionDays;
  const nextClosedAt =
    nextActive === false ? current.closedAt || nowIso : null;

  const { error } = await sb.from('prelaunch_feedback_settings').upsert(
    {
      id: 1,
      collection_active: nextActive,
      hide_from_sidebar: nextHide,
      retention_days: nextRetention,
      closed_at: nextClosedAt,
      updated_at: nowIso,
    },
    { onConflict: 'id' }
  );
  if (error) throw new Error(`Falha ao salvar configurações: ${error.message}`);

  return {
    collectionActive: nextActive,
    hideFromSidebar: nextHide,
    retentionDays: nextRetention,
    closedAt: nextClosedAt,
    updatedAt: nowIso,
  };
}

export interface RawLinkRow {
  id: string;
  admin_code: string;
  code_hash: string;
  status: FeedbackLinkStatus;
  started_at: string | null;
  completed_at: string | null;
  revoked_at: string | null;
  response_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export async function findLinkByRawCode(
  env: PrelaunchFeedbackEnv,
  rawCode: string
): Promise<{ link: RawLinkRow | null; codeHash: string }> {
  const codeHash = await hashFeedbackCode(rawCode);
  const sb = getSupabaseClient(env);
  if (!sb) return { link: null, codeHash };

  const { data, error } = await sb
    .from('prelaunch_feedback_links')
    .select('*')
    .eq('code_hash', codeHash)
    .maybeSingle();

  if (error || !data) return { link: null, codeHash };
  return { link: data as RawLinkRow, codeHash };
}

export function mapLinkRow(row: any, participantName?: string | null): FeedbackLinkRecord {
  return {
    id: String(row.id),
    adminCode: String(row.admin_code || ''),
    status: row.status as FeedbackLinkStatus,
    startedAt: row.started_at || null,
    completedAt: row.completed_at || null,
    revokedAt: row.revoked_at || null,
    responseId: row.response_id || null,
    participantName: participantName ?? null,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function mapIssueRow(row: any): FeedbackIssueRecord {
  const rawAtts = Array.isArray(row.attachments) ? row.attachments : [];
  return {
    id: String(row.id),
    responseId: String(row.response_id),
    linkId: String(row.link_id),
    participantName: String(row.participant_name || ''),
    area: String(row.area || 'Outro lugar'),
    whatTrying: String(row.what_trying || ''),
    whatHappened: String(row.what_happened || ''),
    whatExpected: String(row.what_expected || ''),
    happenedMoreThanOnce:
      row.happened_more_than_once === 'yes' || row.happened_more_than_once === 'no'
        ? row.happened_more_than_once
        : 'not_tried',
    attachments: rawAtts.map((a: any) => ({
      id: String(a.id || ''),
      key: String(a.key || ''),
      name: String(a.name || 'captura.png'),
      mimeType: String(a.mimeType || 'image/png'),
      size: Number(a.size || 0),
    })),
    issueStatus: (row.issue_status || 'new') as FeedbackIssueRecord['issueStatus'],
    adminNotes: String(row.admin_notes || ''),
    clusterKey: String(row.cluster_key || ''),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
  };
}

export function mapResponseRow(
  row: any,
  extras?: { adminCode?: string; issues?: FeedbackIssueRecord[] }
): FeedbackResponseRecord {
  const firstName = String(row.first_name || '').trim();
  const lastName = String(row.last_name || '').trim();
  const issues = extras?.issues || [];
  return {
    id: String(row.id),
    linkId: String(row.link_id),
    adminCode: extras?.adminCode,
    firstName,
    lastName,
    participantName: `${firstName} ${lastName}`.trim(),
    overallRating: typeof row.overall_rating === 'number' ? row.overall_rating : null,
    appearanceRating: typeof row.appearance_rating === 'number' ? row.appearance_rating : null,
    deviceUsed: String(row.device_used || ''),
    areasVisited: Array.isArray(row.areas_visited) ? row.areas_visited.map(String) : [],
    answers: row.answers && typeof row.answers === 'object' ? row.answers : {},
    reviewStatus: (row.review_status || 'new') as FeedbackResponseRecord['reviewStatus'],
    adminNotes: String(row.admin_notes || ''),
    issuesCount: issues.length,
    issues,
    submittedAt: row.submitted_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.submitted_at || new Date().toISOString(),
  };
}

export interface ValidatedSubmissionPayload {
  firstName: string;
  lastName: string;
  overallRating: number | null;
  appearanceRating: number | null;
  deviceUsed: string;
  areasVisited: string[];
  answers: Record<string, string | number | string[]>;
  issues: Array<FeedbackIssueInput & { clusterKey: string }>;
}

export function validateSubmissionPayload(
  rawBody: any,
  linkId: string
): { ok: true; data: ValidatedSubmissionPayload } | { ok: false; error: string } {
  const firstName = sanitizePlainText(rawBody?.firstName, 60);
  const lastName = sanitizePlainText(rawBody?.lastName, 80);

  if (firstName.length < 2) {
    return { ok: false, error: 'Informe seu nome para enviar sua avaliação.' };
  }
  if (lastName.length < 2) {
    return { ok: false, error: 'Informe seu sobrenome para enviar sua avaliação.' };
  }

  const rawAnswers = rawBody?.answers && typeof rawBody.answers === 'object' ? rawBody.answers : {};
  const cleanAnswers: Record<string, string | number | string[]> = {};

  for (const [key, val] of Object.entries(rawAnswers)) {
    if (!/^[a-z0-9_]{2,64}$/i.test(key)) continue;

    // Permite respostas de perguntas conhecidas, gates (p3_visitou_packs etc.), p6_atividades e campos *_explain
    const baseKey = key.endsWith('_explain') ? key.slice(0, -'_explain'.length) : key;
    const isKnown =
      Boolean(ALL_QUESTIONS_BY_ID[baseKey]) ||
      ['p3_visitou_packs', 'p4_visitou_personalizados', 'p5_visitou_chamadas', 'p6_atividades'].includes(key);
    if (!isKnown) continue;

    if (Array.isArray(val)) {
      cleanAnswers[key] = val.map((item) => sanitizePlainText(item, 80)).filter(Boolean).slice(0, 12);
    } else if (typeof val === 'number') {
      if (Number.isInteger(val) && val >= 1 && val <= 5) {
        cleanAnswers[key] = val;
      }
    } else if (typeof val === 'string') {
      const cleaned = sanitizePlainText(val, 2500);
      if (cleaned) cleanAnswers[key] = cleaned;
    }
  }

  const parseRating = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
  };

  const overallRating = parseRating(cleanAnswers.p8_nota_geral);
  const appearanceRating = parseRating(cleanAnswers.p1_nota_aparencia);
  const deviceUsed = sanitizePlainText(cleanAnswers.p2_aparelho, 40);

  const areasSet = new Set<string>(['Página inicial', 'Navegação']);
  if (cleanAnswers.p3_visitou_packs === 'sim') areasSet.add('Packs');
  if (cleanAnswers.p4_visitou_personalizados === 'sim') areasSet.add('Personalizados');
  if (cleanAnswers.p5_visitou_chamadas === 'sim') areasSet.add('Chamadas VIP');
  const p6Acts = Array.isArray(cleanAnswers.p6_atividades) ? cleanAnswers.p6_atividades : [];
  if (p6Acts.some((a) => ['comecei_compra', 'conclui_compra'].includes(a))) {
    areasSet.add('Compra e pagamento');
  }
  if (p6Acts.some((a) => ['entrei_area_privada', 'abri_conteudo', 'voltei_acessar'].includes(a))) {
    areasSet.add('Área privada e Cofre');
  }

  const allowedAreas = new Set<string>(ISSUE_AREA_OPTIONS as readonly string[]);
  const rawIssues = Array.isArray(rawBody?.issues) ? rawBody.issues.slice(0, MAX_ISSUES_PER_SUBMISSION) : [];
  const cleanIssues: Array<FeedbackIssueInput & { clusterKey: string }> = [];

  for (const rawIssue of rawIssues) {
    if (!rawIssue || typeof rawIssue !== 'object') continue;
    const whatTrying = sanitizePlainText(rawIssue.whatTrying, 1000);
    const whatHappened = sanitizePlainText(rawIssue.whatHappened, 2000);
    const whatExpected = sanitizePlainText(rawIssue.whatExpected, 1000);
    if (!whatTrying && !whatHappened) continue;

    const rawArea = sanitizePlainText(rawIssue.area, 60);
    const area = allowedAreas.has(rawArea) ? rawArea : 'Outro lugar';
    const repeat =
      rawIssue.happenedMoreThanOnce === 'yes' || rawIssue.happenedMoreThanOnce === 'no'
        ? rawIssue.happenedMoreThanOnce
        : 'not_tried';

    const rawAttachments = Array.isArray(rawIssue.attachments)
      ? rawIssue.attachments.slice(0, MAX_ATTACHMENTS_PER_ISSUE)
      : [];
    const attachments: FeedbackAttachment[] = [];
    for (const att of rawAttachments) {
      if (!att || typeof att !== 'object') continue;
      const key = sanitizePlainText(att.key, 260);
      if (!isValidAttachmentKeyForLink(key, linkId)) continue;
      attachments.push({
        id: sanitizePlainText(att.id, 64) || crypto.randomUUID(),
        key,
        name: sanitizePlainText(att.name, 120) || 'imagem.png',
        mimeType: ALLOWED_IMAGE_MIME_TYPES.has(String(att.mimeType)) ? String(att.mimeType) : 'image/png',
        size: Math.min(MAX_ATTACHMENT_BYTES, Math.max(0, Number(att.size) || 0)),
      });
    }

    cleanIssues.push({
      area,
      whatTrying: whatTrying || 'Não informado',
      whatHappened: whatHappened || 'Não informado',
      whatExpected,
      happenedMoreThanOnce: repeat,
      attachments,
      clusterKey: buildIssueClusterKey(area, whatHappened || whatTrying),
    });
  }

  return {
    ok: true,
    data: {
      firstName,
      lastName,
      overallRating,
      appearanceRating,
      deviceUsed,
      areasVisited: [...areasSet],
      answers: cleanAnswers,
      issues: cleanIssues,
    },
  };
}

export async function submitFeedbackAtomically(
  env: PrelaunchFeedbackEnv,
  codeHash: string,
  payload: ValidatedSubmissionPayload
): Promise<
  | { ok: true; responseId: string; linkId: string }
  | { ok: false; code: 'COLLECTION_CLOSED' | 'INVALID_LINK' | 'ALREADY_COMPLETED' | 'REVOKED_LINK' | 'CONFLICT' | 'UNAVAILABLE' }
> {
  const sb = getSupabaseClient(env);
  if (!sb) return { ok: false, code: 'UNAVAILABLE' };

  // 1. Tenta via RPC transacional PostgreSQL (SELECT ... FOR UPDATE + INSERT + UPDATE atômicos)
  try {
    const { data, error } = await sb.rpc('submit_prelaunch_feedback_atomic', {
      p_code_hash: codeHash,
      p_first_name: payload.firstName,
      p_last_name: payload.lastName,
      p_overall_rating: payload.overallRating,
      p_appearance_rating: payload.appearanceRating,
      p_device_used: payload.deviceUsed,
      p_areas_visited: payload.areasVisited,
      p_answers: payload.answers,
      p_issues: payload.issues,
    });
    if (!error && data && typeof data === 'object') {
      if ((data as any).ok === true) {
        return {
          ok: true,
          responseId: String((data as any).responseId),
          linkId: String((data as any).linkId),
        };
      }
      return { ok: false, code: (data as any).code || 'CONFLICT' };
    }
    const msg = String(error?.message || '').toLowerCase();
    const isMissingRpc =
      msg.includes('could not find the function') ||
      msg.includes('does not exist') ||
      msg.includes('unknown rpc') ||
      error?.code === 'PGRST202' ||
      error?.code === '42883';
    if (!isMissingRpc) {
      return { ok: false, code: 'UNAVAILABLE' };
    }
  } catch {
    // Fallback controlado abaixo
  }

  // 2. Fallback atômico (lock em processo + KV + update condicional) — garante segurança em testes e pré-RPC
  if (inProcessSubmitLocks.has(codeHash)) {
    return { ok: false, code: 'ALREADY_COMPLETED' };
  }
  inProcessSubmitLocks.add(codeHash);

  const adapter = getNuaIdAdapter(env);
  const lockKey = `nua_prelaunch_lock:${codeHash}`;
  let kvLocked = false;
  try {
    if (adapter?.kvCreate) {
      kvLocked = await adapter.kvCreate(lockKey, { at: Date.now() }).catch(() => false);
      if (!kvLocked) {
        return { ok: false, code: 'ALREADY_COMPLETED' };
      }
    }

    const settings = await getFeedbackSettings(env);
    if (!settings.collectionActive) {
      return { ok: false, code: 'COLLECTION_CLOSED' };
    }

    const { data: linkRow, error: linkErr } = await sb
      .from('prelaunch_feedback_links')
      .select('*')
      .eq('code_hash', codeHash)
      .maybeSingle();

    if (linkErr) return { ok: false, code: 'UNAVAILABLE' };
    if (!linkRow) return { ok: false, code: 'INVALID_LINK' };
    if (linkRow.status === 'completed') return { ok: false, code: 'ALREADY_COMPLETED' };
    if (linkRow.status === 'revoked') return { ok: false, code: 'REVOKED_LINK' };

    const nowIso = new Date().toISOString();
    const responseId = crypto.randomUUID();
    const participantName = `${payload.firstName} ${payload.lastName}`.trim();

    // Marca link como completed condicionalmente ANTES de retornar sucesso
    const { data: updatedLinks, error: updErr } = await sb
      .from('prelaunch_feedback_links')
      .update({
        status: 'completed',
        completed_at: nowIso,
        response_id: responseId,
        updated_at: nowIso,
      })
      .eq('id', linkRow.id)
      .in('status', ['available', 'in_progress'])
      .select('id');

    if (updErr) return { ok: false, code: 'UNAVAILABLE' };
    if (!Array.isArray(updatedLinks) || updatedLinks.length === 0) {
      return { ok: false, code: 'ALREADY_COMPLETED' };
    }

    const { error: insRespErr } = await sb.from('prelaunch_feedback_responses').insert({
      id: responseId,
      link_id: linkRow.id,
      first_name: payload.firstName,
      last_name: payload.lastName,
      overall_rating: payload.overallRating,
      appearance_rating: payload.appearanceRating,
      device_used: payload.deviceUsed,
      areas_visited: payload.areasVisited,
      answers: payload.answers,
      review_status: 'new',
      admin_notes: '',
      submitted_at: nowIso,
      updated_at: nowIso,
    });

    if (insRespErr) {
      // Rollback do link em caso de falha ao gravar resposta
      await sb
        .from('prelaunch_feedback_links')
        .update({ status: 'in_progress', completed_at: null, response_id: null, updated_at: nowIso })
        .eq('id', linkRow.id);
      return { ok: false, code: 'UNAVAILABLE' };
    }

    if (payload.issues.length > 0) {
      const issueRows = payload.issues.map((issue) => ({
        id: crypto.randomUUID(),
        response_id: responseId,
        link_id: linkRow.id,
        participant_name: participantName,
        area: issue.area,
        what_trying: issue.whatTrying,
        what_happened: issue.whatHappened,
        what_expected: issue.whatExpected || '',
        happened_more_than_once: issue.happenedMoreThanOnce,
        attachments: issue.attachments,
        issue_status: 'new',
        admin_notes: '',
        cluster_key: issue.clusterKey,
        created_at: nowIso,
        updated_at: nowIso,
      }));
      const { error: insIssErr } = await sb.from('prelaunch_feedback_issues').insert(issueRows);
      if (insIssErr) {
        console.warn('[PrelaunchFeedback] Falha parcial ao gravar issues:', insIssErr.message);
      }
    }

    return { ok: true, responseId, linkId: String(linkRow.id) };
  } finally {
    inProcessSubmitLocks.delete(codeHash);
    if (kvLocked && adapter) {
      await adapter.kvDelete(lockKey).catch(() => {});
    }
  }
}

export function resolvePublicSiteBaseUrl(env: PrelaunchFeedbackEnv): string {
  const raw = String(env.NEXT_PUBLIC_SITE_URL || env.SITE_URL || 'https://nuaborges.com.br').trim();
  return raw.replace(/\/+$/, '');
}
