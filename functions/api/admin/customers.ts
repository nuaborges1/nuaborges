/**
 * Cloudflare Pages Function: GET/POST /api/admin/customers
 *
 * Módulo Admin › Clientes (Seção 12 do Prompt Mestre).
 *
 * Restrições estritamente aplicadas:
 * - Protegido pela autenticação administrativa em `_middleware.ts` (sessão de cliente recebe 401).
 * - NUNCA expõe senhas, tokens de compra, cookies ou IDs de sessão.
 * - NUNCA permite entrar na conta do cliente nem manipular pagamentos arbitrariamente.
 * - NÃO duplica o banco de pedidos: lê diretamente os perfis e agrega dos módulos reais.
 * - Registra ações administrativas sensíveis em `audit_logs` + `customer_audit_events`.
 */

import { recordAuditEvent } from '../_auditHelper';
import {
  getProfileById,
  listAllProfiles,
  listCustomerAuditEvents,
  NuaIdEnv,
  recordCustomerAuditEvent,
  revokeAllCustomerSessions,
  revokeEntitlementsByOrder,
  saveProfile,
} from '../id/_nuaIdStore';
import { loadCustomerBundle } from '../me/_customerData';

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

const ADMIN_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
};

export const onRequestGet = async (context: PagesContext<NuaIdEnv>) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const profileId = (url.searchParams.get('id') || '').trim();
  const query = (url.searchParams.get('q') || '').trim().toLowerCase();
  const filter = (url.searchParams.get('filter') || 'all').trim().toLowerCase();

  // 1. Detalhe de um cliente específico
  if (profileId) {
    const profile = await getProfileById(env, profileId);
    if (!profile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cliente não encontrado.' }),
        { status: 404, headers: ADMIN_HEADERS }
      );
    }

    const [bundle, auditEvents] = await Promise.all([
      loadCustomerBundle(env, profile.id),
      listCustomerAuditEvents(env, profile.id),
    ]);

    // Sanitização estrita: nunca expõe tokens, URLs de mídia privada ou sessões
    return new Response(
      JSON.stringify({
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
        library: bundle.library.map((item) => ({
          entitlementId: item.entitlementId,
          orderRef: item.orderRef,
          resourceId: item.resourceId,
          kind: item.kind,
          title: item.title,
          purchasedAt: item.purchasedAt,
          expiresAt: item.expiresAt,
          status: item.status,
          revokeReason: item.revokeReason,
          // Nunca envia mediaPaths privados nem URLs assinadas ao painel admin sem autorização
        })),
        appointments: bundle.appointments.map((apt) => ({
          ...apt,
          callLink: null, // Não expõe link privativo de chamada na listagem geral
        })),
        personalizados: bundle.personalizados.map((p) => ({
          ...p,
          vaultFiles: [], // Não revela mídia privada sem autorização
        })),
        auditEvents: auditEvents.slice(0, 30).map((ev) => ({
          id: ev.id,
          action: ev.action,
          createdAt: ev.createdAt,
          details: ev.details || {},
        })),
      }),
      { status: 200, headers: ADMIN_HEADERS }
    );
  }

  // 2. Listagem geral com busca, filtros e sinalização de atendimento
  const allProfiles = await listAllProfiles(env);
  const rows = [];

  for (const p of allProfiles) {
    const bundle = await loadCustomerBundle(env, p.id);
    const totalSpent = bundle.orders
      .filter((o) => o.financialStatus === 'paid')
      .reduce((sum, o) => sum + Number(o.amount || 0), 0);
    const hasPendingRefund =
      bundle.appointments.some((a) => a.operationalStatus === 'reembolso_pendente') ||
      bundle.orders.some((o) => o.financialStatus === 'refunded' || o.financialStatus === 'charged_back');
    const needsAttention =
      bundle.appointments.some((a) =>
        ['reagendamento_pendente', 'reembolso_pendente'].includes(a.operationalStatus)
      ) ||
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

    if (query) {
      const hay = `${row.displayName} ${row.email} ${row.id}`.toLowerCase();
      if (!hay.includes(query)) continue;
    }

    if (filter === 'attention' && !row.needsAttention) continue;
    if (filter === 'refunds' && !row.hasPendingRefund) continue;
    if (filter === 'active' && row.status !== 'active') continue;
    if (filter === 'suspended' && row.status !== 'suspended') continue;

    rows.push(row);
  }

  return new Response(
    JSON.stringify({
      success: true,
      customers: rows,
      totals: {
        all: allProfiles.length,
        active: allProfiles.filter((p) => p.status === 'active').length,
        attention: rows.filter((r) => r.needsAttention).length,
      },
    }),
    { status: 200, headers: ADMIN_HEADERS }
  );
};

/**
 * Ações administrativas auditadas (NUNCA manipulação arbitrária de pagamentos).
 * Permitidas: suspender/reativar conta, encerrar sessões por segurança, revogar acesso a um pedido.
 */
export const onRequestPost = async (context: PagesContext<NuaIdEnv>) => {
  const { request, env } = context;
  const body: any = await request.json().catch(() => ({}));
  const action = String(body?.action || '').trim();
  const profileId = String(body?.profileId || '').trim();
  const reason = String(body?.reason || '').replace(/[<>]/g, '').trim().slice(0, 240);

  if (!profileId || !action) {
    return new Response(
      JSON.stringify({ success: false, error: 'Informe profileId e action.' }),
      { status: 400, headers: ADMIN_HEADERS }
    );
  }

  // Bloqueio explícito contra manipulação arbitrária de pagamentos
  if (['mark_paid', 'edit_payment', 'impersonate', 'login_as'].includes(action)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Operação proibida pelas políticas de segurança e auditoria do NUA ID.',
      }),
      { status: 403, headers: ADMIN_HEADERS }
    );
  }

  const profile = await getProfileById(env, profileId);
  if (!profile) {
    return new Response(
      JSON.stringify({ success: false, error: 'Cliente não encontrado.' }),
      { status: 404, headers: ADMIN_HEADERS }
    );
  }

  if (action === 'revoke_sessions') {
    const count = await revokeAllCustomerSessions(env, profile.id);
    await recordCustomerAuditEvent(env, {
      profileId: profile.id,
      action: 'admin_revoke_all_sessions',
      details: { count, reason },
    });
    await recordAuditEvent(env, request, {
      type: 'SECURITY_ACTION' as any,
      summary: `Admin encerrou ${count} sessão(ões) do cliente ${profile.id}`,
      details: { profileId: profile.id, count, reason },
    }).catch(() => {});
    return new Response(
      JSON.stringify({ success: true, revokedCount: count }),
      { status: 200, headers: ADMIN_HEADERS }
    );
  }

  if (action === 'suspend' || action === 'reactivate') {
    if (profile.status === 'anonymized') {
      return new Response(
        JSON.stringify({ success: false, error: 'Contas anonimizadas não podem ser reativadas.' }),
        { status: 409, headers: ADMIN_HEADERS }
      );
    }
    profile.status = action === 'suspend' ? 'suspended' : 'active';
    await saveProfile(env, profile);
    if (action === 'suspend') {
      await revokeAllCustomerSessions(env, profile.id);
    }
    await recordCustomerAuditEvent(env, {
      profileId: profile.id,
      action: `admin_${action}_account`,
      details: { reason },
    });
    await recordAuditEvent(env, request, {
      type: 'SECURITY_ACTION' as any,
      summary: `Admin ${action === 'suspend' ? 'suspendeu' : 'reativou'} conta ${profile.id}`,
      details: { profileId: profile.id, reason },
    }).catch(() => {});
    return new Response(
      JSON.stringify({ success: true, status: profile.status }),
      { status: 200, headers: ADMIN_HEADERS }
    );
  }

  if (action === 'revoke_entitlement') {
    const orderRef = String(body?.orderRef || '').trim();
    if (!orderRef) {
      return new Response(
        JSON.stringify({ success: false, error: 'Informe orderRef para revogar o acesso.' }),
        { status: 400, headers: ADMIN_HEADERS }
      );
    }
    const revoked = await revokeEntitlementsByOrder(env, orderRef, reason || 'admin_revoked');
    await recordCustomerAuditEvent(env, {
      profileId: profile.id,
      action: 'admin_revoke_entitlement',
      details: { orderRef, revoked, reason },
    });
    await recordAuditEvent(env, request, {
      type: 'SECURITY_ACTION' as any,
      summary: `Admin revogou acesso do pedido ${orderRef} (${profile.id})`,
      details: { profileId: profile.id, orderRef, reason },
    }).catch(() => {});
    return new Response(
      JSON.stringify({ success: true, revoked }),
      { status: 200, headers: ADMIN_HEADERS }
    );
  }

  return new Response(
    JSON.stringify({ success: false, error: 'Ação administrativa desconhecida.' }),
    { status: 400, headers: ADMIN_HEADERS }
  );
};
