/**
 * Cloudflare Pages Function: GET / POST /api/admin/prelaunch-feedback
 *
 * Central Administrativa — Avaliações do Pré-lançamento NUA Borges:
 * - Protegida por sessão administrativa autenticada (Nua Borges e PHDEV)
 * - GET: visão geral, links (sem códigos/hashes), respostas, problemas com recorrência e configurações
 * - POST actions:
 *   - generate_links (1..100, retorna códigos completos SOMENTE nesta resposta imediata)
 *   - revoke_link (revoga link não concluído)
 *   - update_response (reviewStatus + adminNotes)
 *   - update_issue (issueStatus + adminNotes)
 *   - update_settings (collectionActive, hideFromSidebar, retentionDays)
 *   - export (csv / json sem tokens, hashes ou segredos)
 */

import { getSessionCookie, resolveAdminPanelProfile } from '../_authHelper';
import { parseAndVerifyActiveAdminSession } from '../_central/adminSessions';
import { getAdminSessionSecret } from '../_central/secrets';
import { getSupabaseClient } from '../_supabaseClient';
import { recordAuditEvent } from '../_auditHelper';
import type { CentralEnv } from '../_central/types';
import {
  MAX_LINKS_PER_BATCH,
  generateFeedbackRawCode,
  getFeedbackSettings,
  hashFeedbackCode,
  mapIssueRow,
  mapLinkRow,
  mapResponseRow,
  resolvePublicSiteBaseUrl,
  sanitizePlainText,
  updateFeedbackSettings,
  type PrelaunchFeedbackEnv,
} from '../prelaunch-feedback/_store';
import {
  annotateSimilarIssues,
  buildFeedbackCsvExport,
  buildFeedbackJsonExport,
  computeFeedbackMetrics,
  type FeedbackIssueRecord,
  type FeedbackLinkRecord,
  type FeedbackResponseRecord,
} from '../../../lib/prelaunchFeedback';

type Env = PrelaunchFeedbackEnv & CentralEnv;

type PagesContext = {
  request: Request;
  env: Env;
};

const NO_STORE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
};

async function requireAdminSession(request: Request, env: Env) {
  const secret = getAdminSessionSecret(env);
  if (!secret) return null;
  const cookieToken = getSessionCookie(request);
  const authHeader = request.headers.get('Authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const token = cookieToken || bearer;
  if (!token) return null;
  return parseAndVerifyActiveAdminSession(env, token, secret, ['admin', 'dev', 'client']);
}

async function loadAllFeedbackData(env: Env): Promise<{
  settings: Awaited<ReturnType<typeof getFeedbackSettings>>;
  links: FeedbackLinkRecord[];
  responses: FeedbackResponseRecord[];
  issues: FeedbackIssueRecord[];
}> {
  const sb = getSupabaseClient(env);
  const settings = await getFeedbackSettings(env);
  if (!sb) {
    return { settings, links: [], responses: [], issues: [] };
  }

  const [linksRes, responsesRes, issuesRes] = await Promise.all([
    sb.from('prelaunch_feedback_links').select('*').order('created_at', { ascending: false }).limit(1000),
    sb.from('prelaunch_feedback_responses').select('*').order('submitted_at', { ascending: false }).limit(1000),
    sb.from('prelaunch_feedback_issues').select('*').order('created_at', { ascending: false }).limit(2000),
  ]);

  const rawLinks = Array.isArray(linksRes.data) ? linksRes.data : [];
  const rawResponses = Array.isArray(responsesRes.data) ? responsesRes.data : [];
  const rawIssues = Array.isArray(issuesRes.data) ? issuesRes.data : [];

  const issues = annotateSimilarIssues(rawIssues.map(mapIssueRow));
  const issuesByResponseId = new Map<string, FeedbackIssueRecord[]>();
  for (const issue of issues) {
    const arr = issuesByResponseId.get(issue.responseId) || [];
    arr.push(issue);
    issuesByResponseId.set(issue.responseId, arr);
  }

  const adminCodeByLinkId = new Map<string, string>();
  for (const row of rawLinks) {
    adminCodeByLinkId.set(String(row.id), String(row.admin_code || ''));
  }

  const participantByLinkId = new Map<string, string>();
  const responses: FeedbackResponseRecord[] = rawResponses.map((row) => {
    const linkId = String(row.link_id);
    const mapped = mapResponseRow(row, {
      adminCode: adminCodeByLinkId.get(linkId),
      issues: issuesByResponseId.get(String(row.id)) || [],
    });
    participantByLinkId.set(linkId, mapped.participantName);
    return mapped;
  });

  const links: FeedbackLinkRecord[] = rawLinks.map((row) =>
    mapLinkRow(row, participantByLinkId.get(String(row.id)) || null)
  );

  return { settings, links, responses, issues };
}

export const onRequestGet = async (context: PagesContext) => {
  const { request, env } = context;
  const session = await requireAdminSession(request, env);
  if (!session) {
    return new Response(JSON.stringify({ success: false, error: 'Não autorizado.' }), {
      status: 401,
      headers: NO_STORE_HEADERS,
    });
  }
  if (resolveAdminPanelProfile(session) !== 'phdev') {
    return new Response(JSON.stringify({ success: false, error: 'Acesso restrito ao perfil PHDEV.' }), {
      status: 403,
      headers: NO_STORE_HEADERS,
    });
  }

  try {
    const { settings, links, responses, issues } = await loadAllFeedbackData(env);
    const metrics = computeFeedbackMetrics(links, responses, issues);

    return new Response(
      JSON.stringify({
        success: true,
        settings,
        metrics,
        links,
        responses,
        issues,
      }),
      { status: 200, headers: NO_STORE_HEADERS }
    );
  } catch (err: any) {
    console.error('[AdminPrelaunchFeedback] Erro GET:', String(err?.message || '').slice(0, 120));
    return new Response(
      JSON.stringify({ success: false, error: 'Não foi possível carregar as avaliações do pré-lançamento.' }),
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
};

export const onRequestPost = async (context: PagesContext) => {
  const { request, env } = context;
  const session = await requireAdminSession(request, env);
  if (!session) {
    return new Response(JSON.stringify({ success: false, error: 'Não autorizado.' }), {
      status: 401,
      headers: NO_STORE_HEADERS,
    });
  }
  if (resolveAdminPanelProfile(session) !== 'phdev') {
    return new Response(JSON.stringify({ success: false, error: 'Acesso restrito ao perfil PHDEV.' }), {
      status: 403,
      headers: NO_STORE_HEADERS,
    });
  }

  const sb = getSupabaseClient(env);
  if (!sb) {
    return new Response(JSON.stringify({ success: false, error: 'Banco de dados indisponível.' }), {
      status: 503,
      headers: NO_STORE_HEADERS,
    });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as any;
    const action = String(body?.action || '').trim();
    const actorLabel = resolveAdminPanelProfile(session) === 'phdev' ? 'PHDEV' : 'Nua Borges';

    if (action === 'generate_links') {
      const count = Number(body?.count);
      if (!Number.isInteger(count) || count < 1 || count > MAX_LINKS_PER_BATCH) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Informe uma quantidade entre 1 e ${MAX_LINKS_PER_BATCH} links.`,
          }),
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }

      const { data: existingLinks } = await sb
        .from('prelaunch_feedback_links')
        .select('admin_code')
        .limit(2000);

      let maxNumber = 0;
      for (const row of Array.isArray(existingLinks) ? existingLinks : []) {
        const m = String(row?.admin_code || '').match(/^AV-(\d+)$/i);
        if (m) {
          const n = Number(m[1]);
          if (n > maxNumber) maxNumber = n;
        }
      }

      const nowIso = new Date().toISOString();
      const baseUrl = resolvePublicSiteBaseUrl(env);
      const rowsToInsert: any[] = [];
      const generatedForAdmin: Array<{ id: string; adminCode: string; url: string; createdAt: string }> = [];

      for (let i = 1; i <= count; i++) {
        const id = crypto.randomUUID();
        const adminCode = `AV-${String(maxNumber + i).padStart(3, '0')}`;
        const rawCode = generateFeedbackRawCode();
        const codeHash = await hashFeedbackCode(rawCode);

        rowsToInsert.push({
          id,
          admin_code: adminCode,
          code_hash: codeHash,
          status: 'available',
          created_by: actorLabel,
          created_at: nowIso,
          updated_at: nowIso,
        });

        // O código completo é retornado exclusivamente no momento da geração e NUNCA salvo em texto claro
        generatedForAdmin.push({
          id,
          adminCode,
          url: `${baseUrl}/avaliacao/${rawCode}`,
          createdAt: nowIso,
        });
      }

      const { error: insErr } = await sb.from('prelaunch_feedback_links').insert(rowsToInsert);
      if (insErr) {
        return new Response(
          JSON.stringify({ success: false, error: 'Não foi possível gerar os links agora.' }),
          { status: 500, headers: NO_STORE_HEADERS }
        );
      }

      await recordAuditEvent(env, request, {
        type: 'PRELAUNCH_LINKS_GENERATED' as any,
        severity: 'info',
        actorRole: session.role,
        summary: `${actorLabel} gerou ${count} link(s) de avaliação do pré-lançamento`,
        details: { count, firstCode: generatedForAdmin[0]?.adminCode, lastCode: generatedForAdmin.at(-1)?.adminCode },
      }).catch(() => {});

      return new Response(
        JSON.stringify({
          success: true,
          generated: generatedForAdmin,
        }),
        { status: 201, headers: NO_STORE_HEADERS }
      );
    }

    if (action === 'revoke_link') {
      const linkId = sanitizePlainText(body?.linkId, 80);
      if (!linkId) {
        return new Response(JSON.stringify({ success: false, error: 'Link não informado.' }), {
          status: 400,
          headers: NO_STORE_HEADERS,
        });
      }

      const { data: existing } = await sb
        .from('prelaunch_feedback_links')
        .select('id, admin_code, status')
        .eq('id', linkId)
        .maybeSingle();

      if (!existing) {
        return new Response(JSON.stringify({ success: false, error: 'Link não encontrado.' }), {
          status: 404,
          headers: NO_STORE_HEADERS,
        });
      }
      if (existing.status === 'completed') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Links já respondidos não podem ser revogados.',
          }),
          { status: 409, headers: NO_STORE_HEADERS }
        );
      }

      const nowIso = new Date().toISOString();
      const { error: updErr } = await sb
        .from('prelaunch_feedback_links')
        .update({ status: 'revoked', revoked_at: nowIso, updated_at: nowIso })
        .eq('id', linkId)
        .in('status', ['available', 'in_progress']);

      if (updErr) {
        return new Response(JSON.stringify({ success: false, error: 'Falha ao revogar link.' }), {
          status: 500,
          headers: NO_STORE_HEADERS,
        });
      }

      return new Response(JSON.stringify({ success: true, status: 'revoked' }), {
        status: 200,
        headers: NO_STORE_HEADERS,
      });
    }

    if (action === 'update_response') {
      const responseId = sanitizePlainText(body?.responseId, 80);
      const reviewStatus = String(body?.reviewStatus || '').trim();
      const adminNotes = sanitizePlainText(body?.adminNotes, 2000);

      if (!responseId) {
        return new Response(JSON.stringify({ success: false, error: 'Avaliação não informada.' }), {
          status: 400,
          headers: NO_STORE_HEADERS,
        });
      }

      const patch: Record<string, any> = { updated_at: new Date().toISOString() };
      if (['new', 'in_review', 'reviewed'].includes(reviewStatus)) {
        patch.review_status = reviewStatus;
      }
      if (body?.adminNotes !== undefined) {
        patch.admin_notes = adminNotes;
      }

      const { error: updErr } = await sb
        .from('prelaunch_feedback_responses')
        .update(patch)
        .eq('id', responseId);

      if (updErr) {
        return new Response(JSON.stringify({ success: false, error: 'Falha ao atualizar avaliação.' }), {
          status: 500,
          headers: NO_STORE_HEADERS,
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: NO_STORE_HEADERS,
      });
    }

    if (action === 'update_issue') {
      const issueId = sanitizePlainText(body?.issueId, 80);
      const issueStatus = String(body?.issueStatus || '').trim();
      const adminNotes = sanitizePlainText(body?.adminNotes, 2000);

      if (!issueId) {
        return new Response(JSON.stringify({ success: false, error: 'Problema não informado.' }), {
          status: 400,
          headers: NO_STORE_HEADERS,
        });
      }

      const patch: Record<string, any> = { updated_at: new Date().toISOString() };
      if (['new', 'in_review', 'resolved', 'dismissed'].includes(issueStatus)) {
        patch.issue_status = issueStatus;
      }
      if (body?.adminNotes !== undefined) {
        patch.admin_notes = adminNotes;
      }

      const { error: updErr } = await sb
        .from('prelaunch_feedback_issues')
        .update(patch)
        .eq('id', issueId);

      if (updErr) {
        return new Response(JSON.stringify({ success: false, error: 'Falha ao atualizar problema.' }), {
          status: 500,
          headers: NO_STORE_HEADERS,
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: NO_STORE_HEADERS,
      });
    }

    if (action === 'update_settings') {
      const updated = await updateFeedbackSettings(env, {
        collectionActive:
          typeof body?.collectionActive === 'boolean' ? body.collectionActive : undefined,
        hideFromSidebar:
          typeof body?.hideFromSidebar === 'boolean' ? body.hideFromSidebar : undefined,
        retentionDays:
          typeof body?.retentionDays === 'number' ? body.retentionDays : undefined,
      });

      await recordAuditEvent(env, request, {
        type: 'PRELAUNCH_SETTINGS_UPDATED' as any,
        severity: 'info',
        actorRole: session.role,
        summary: `${actorLabel} atualizou a coleta do pré-lançamento (${updated.collectionActive ? 'ativa' : 'encerrada'})`,
        details: {
          collectionActive: updated.collectionActive,
          hideFromSidebar: updated.hideFromSidebar,
          retentionDays: updated.retentionDays,
        },
      }).catch(() => {});

      return new Response(JSON.stringify({ success: true, settings: updated }), {
        status: 200,
        headers: NO_STORE_HEADERS,
      });
    }

    if (action === 'export') {
      const format = String(body?.format || 'json').toLowerCase();
      const scope = String(body?.scope || 'responses').toLowerCase();
      const { settings, links, responses, issues } = await loadAllFeedbackData(env);

      if (format === 'csv') {
        const csvScope =
          scope === 'issues' ? 'issues' : scope === 'summary' ? 'summary' : 'responses';
        const csv = buildFeedbackCsvExport(csvScope, responses, issues);
        return new Response(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="prelancamento-${csvScope}.csv"`,
            'Cache-Control': 'private, no-store',
          },
        });
      }

      const jsonPayload = buildFeedbackJsonExport(links, responses, issues, settings);
      return new Response(JSON.stringify(jsonPayload, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': 'attachment; filename="prelancamento-avaliacoes.json"',
          'Cache-Control': 'private, no-store',
        },
      });
    }

    return new Response(JSON.stringify({ success: false, error: 'Ação inválida.' }), {
      status: 400,
      headers: NO_STORE_HEADERS,
    });
  } catch (err: any) {
    console.error('[AdminPrelaunchFeedback] Erro POST:', String(err?.message || '').slice(0, 120));
    return new Response(
      JSON.stringify({ success: false, error: 'Erro ao processar operação.' }),
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
};
