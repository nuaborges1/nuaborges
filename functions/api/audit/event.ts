/**
 * Cloudflare Pages Function: POST /api/audit/event
 *
 * Registra eventos disparados pelo painel administrativo ou pelo site:
 * - Edição de rascunho
 * - Publicação de conteúdo
 * - Alertas operacionais
 */

import { recordAuditEvent, AuditEventType } from '../_auditHelper';

interface Env {
  BUCKET?: any;
  ADMIN_PASSWORD?: string;
  ADMIN_API_SECRET?: string;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      type?: AuditEventType;
      summary?: string;
      details?: Record<string, any>;
      severity?: 'info' | 'warning' | 'critical' | 'alert';
    };

    if (!body.type || !body.summary) {
      return new Response(
        JSON.stringify({ error: 'Campos "type" e "summary" são obrigatórios.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const recorded = await recordAuditEvent(env, request, {
      type: body.type,
      summary: body.summary,
      details: body.details,
      severity: body.severity,
    });

    return new Response(JSON.stringify({ success: true, event: recorded }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[AuditEvent] Erro ao registrar evento:', err);
    return new Response(
      JSON.stringify({ error: 'Falha ao processar evento de auditoria.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
