/**
 * Endpoint de Controle Central da API: GET / POST /api/control/system
 *
 * Restrito estritamente ao superadministrador (`admin` / `dev` / `X-Master-Key`).
 * Permite:
 * - GET: saúde consolidada das integrações (Supabase, B2, Mercado Pago comercial,
 *   Hostinger SMTP, Pix estático da Mensalidade), flags/kill-switches ativos,
 *   contagem de políticas registradas e últimos eventos de auditoria.
 * - POST action='set_flags': ativar/desativar modo manutenção ou pausar módulos
 *   (`checkout`, `vip_booking`, `personalizados`, `nua_id_login`, `contact`, `vip_subscribe`).
 * - POST action='revoke_admin_sessions': derrubar todas as sessões admin ativas.
 */

import { getSupabaseClient } from '../_supabaseClient';
import { isMediaStorageConfigured } from '../_mediaStore';
import { getKillSwitchFlags, saveKillSwitchFlags } from '../_central/killSwitch';
import { revokeAllAdminSessions } from '../_central/adminSessions';
import { ALL_ROUTE_POLICIES } from '../_central/policies';
import { persistAuditEvent, queryAuditFeed } from '../_central/auditLogger';
import { safeInternalError } from '../_central/errorHandler';
import type { CentralEnv } from '../_central/types';

type PagesContext<T = CentralEnv> = {
  request: Request;
  env: T;
};

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

const CONTROLLABLE_MODULES = new Set([
  'checkout',
  'vip_booking',
  'personalizados',
  'nua_id_login',
  'contact',
  'vip_subscribe',
]);

async function checkMercadoPagoCommercial(token?: string) {
  if (!token) return { configured: false, connected: false };
  try {
    const res = await fetch('https://api.mercadopago.com/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { configured: true, connected: false, status: res.status };
    const data: any = await res.json();
    return {
      configured: true,
      connected: true,
      accountId: data?.id || null,
      nickname: data?.nickname || null,
      siteId: data?.site_id || null,
    };
  } catch {
    return { configured: true, connected: false };
  }
}

export const onRequestGet = async (context: PagesContext) => {
  const { env } = context;
  try {
    const sb = getSupabaseClient(env as any);
    let supabaseOk = false;
    if (sb) {
      const { error } = await sb.from('site_content').select('key').limit(1);
      supabaseOk = !error;
    }

    const [flags, mpCommercial, audit] = await Promise.all([
      getKillSwitchFlags(env),
      checkMercadoPagoCommercial(env.MP_ACCESS_TOKEN),
      queryAuditFeed(env, { limit: 15 }),
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        flags,
        controllableModules: Array.from(CONTROLLABLE_MODULES),
        registeredPolicies: ALL_ROUTE_POLICIES.length,
        integrations: {
          supabase: { configured: Boolean(sb), connected: supabaseOk },
          backblazeB2: { configured: isMediaStorageConfigured(env as any) },
          mercadoPagoCommercial: mpCommercial,
          mensalidadeStaticPix: { configured: Boolean((env.DEV_PIX_KEY || '').trim()) },
          turnstile: { configured: Boolean((env.TURNSTILE_SECRET_KEY || '').trim()) },
          smtp: { configured: Boolean((env.SMTP_HOST || env.HOSTINGER_MAIL_API_TOKEN || '').trim()) },
        },
        recentAudit: audit.events,
        auditStats: audit.stats,
      }),
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (err) {
    return safeInternalError('control/system:GET', err);
  }
};

export const onRequestPost = async (context: PagesContext) => {
  const { request, env } = context;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      maintenanceMode?: boolean;
      maintenanceMessage?: string;
      disabledModules?: string[];
    };

    const action = String(body.action || '').trim();

    if (action === 'set_flags') {
      const sanitizedModules = Array.isArray(body.disabledModules)
        ? body.disabledModules
            .map((m) => String(m).trim().toLowerCase())
            .filter((m) => CONTROLLABLE_MODULES.has(m))
        : undefined;

      const updated = await saveKillSwitchFlags(env, {
        ...(typeof body.maintenanceMode === 'boolean'
          ? { maintenanceMode: body.maintenanceMode }
          : {}),
        ...(typeof body.maintenanceMessage === 'string'
          ? { maintenanceMessage: body.maintenanceMessage }
          : {}),
        ...(sanitizedModules ? { disabledModules: sanitizedModules } : {}),
      });

      await persistAuditEvent(env, request, {
        type: 'SECURITY_ACTION',
        severity: 'warning',
        actorRole: 'admin',
        summary: 'Flags de controle central da API atualizadas',
        details: {
          maintenanceMode: updated.maintenanceMode,
          disabledModules: updated.disabledModules,
        },
      });

      return new Response(JSON.stringify({ success: true, flags: updated }), {
        status: 200,
        headers: JSON_HEADERS,
      });
    }

    if (action === 'revoke_admin_sessions') {
      const revokedCount = await revokeAllAdminSessions(env, 'superadmin_kill_switch');
      await persistAuditEvent(env, request, {
        type: 'SECURITY_ACTION',
        severity: 'critical',
        actorRole: 'admin',
        summary: `Revogação global de sessões administrativas (${revokedCount} sessões)`,
        details: { revokedCount },
      });

      return new Response(
        JSON.stringify({
          success: true,
          revokedCount,
          message: 'Todas as sessões administrativas ativas foram revogadas.',
        }),
        { status: 200, headers: JSON_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Ação de controle inválida.' }),
      { status: 400, headers: JSON_HEADERS }
    );
  } catch (err) {
    return safeInternalError('control/system:POST', err);
  }
};
