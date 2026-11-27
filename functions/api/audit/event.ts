/**
 * Cloudflare Pages Function: POST /api/audit/event
 *
 * Registra eventos disparados pelo painel administrativo ou pelo site:
 * - Edição de rascunho
 * - Publicação de conteúdo
 * - Alertas operacionais
 */

import { recordAuditEvent, AuditEventType } from '../_auditHelper';
import { hasAdminCapability } from '../_central/adminCapabilities';
import type { CentralActor } from '../_central/types';

interface Env {
  ADMIN_PASSWORD?: string;
  ADMIN_API_SECRET?: string;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
  data?: { actor?: CentralActor };
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;
  const actor = context.data?.actor;
  if (!actor || !hasAdminCapability(actor, 'audit.append')) {
    return Response.json({ error: 'Acesso não autorizado.' }, { status: 403 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      type?: AuditEventType;
      summary?: string;
      details?: Record<string, any>;
      severity?: 'info' | 'warning' | 'critical' | 'alert';
    };

    if (!body.type || !body.summary) {
      return new Response(
        JSON.stringify({ error: 'Dados incompletos para registrar a atividade.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!hasAdminCapability(actor, 'operations.audit')) {
      if (body.type !== 'CONTENT_DRAFT_SAVE') {
        return Response.json({ error: 'Seu perfil não pode registrar este tipo de evento.' }, { status: 403 });
      }
      await recordAuditEvent(env, request, {
        type: 'CONTENT_DRAFT_SAVE',
        summary: 'Rascunho salvo no painel',
        severity: 'info',
        actorRole: actor.role,
        details: { subject: actor.subject },
      });
      return Response.json({ success: true });
    }

    const recorded = await recordAuditEvent(env, request, {
      type: body.type,
      summary: body.summary,
      actorRole: actor.role,
      details: { ...body.details, subject: actor.subject },
      severity: body.severity,
    });

    return new Response(JSON.stringify({ success: true, event: recorded }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[AuditEvent] Erro ao registrar evento:', err);
    return new Response(
      JSON.stringify({ error: 'Não foi possível registrar a atividade.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
