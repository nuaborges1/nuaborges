/**
 * Motor Extensível de Estorno Manual via Mercado Pago — Nua Borges
 *
 * Arquitetura orientada a adaptadores por modalidade (`RefundModalityAdapter`):
 * - Funciona hoje para Packs/Avulsos, Personalizados e Chamadas VIP.
 * - Qualquer modalidade futura que grave em `orders` + `payments` já funciona automaticamente
 *   pelo adaptador genérico (`generic_order`), e modalidades com tabela própria só precisam
 *   registrar um adaptador adicional em `REFUND_MODALITY_ADAPTERS`.
 *
 * Garantias de segurança e integridade:
 * - Usa exclusivamente `MP_ACCESS_TOKEN` comercial (nunca credenciais de mensalidade).
 * - Valida correspondência entre `orderId` e `external_reference` no Mercado Pago.
 * - Lock atômico contra cliques duplos e requisições concorrentes.
 * - Idempotência determinística por operação.
 * - Reconciliação segura em timeout / resultado inconclusivo.
 * - Nunca marca como estornado sem confirmação real do Mercado Pago.
 * - Nunca apaga mídias nem históricos; revoga apenas entitlements do pedido estornado.
 */

import {
  getMercadoPagoPayment,
  refundMercadoPagoPayment,
  listMercadoPagoRefunds,
} from '../_mercadopago';
import {
  getAppointmentByIdFromSupabase,
  getOrderFromSupabase,
  getPersonalizadoOrderFromSupabase,
  saveAppointmentToSupabase,
  savePersonalizadoOrderToSupabase,
  updateOrderInSupabase,
} from '../_supabaseStore';
import {
  getNuaIdAdapter,
  getOrderClaim,
  getPaymentByOrderRef,
  listRefundsByOrderRef,
  recordCustomerAuditEvent,
  recordNotificationEvent,
  recordRefund,
  revokeEntitlementsByOrder,
  upsertPaymentRecord,
  type NuaIdEnv,
} from '../id/_nuaIdStore';
import { dispatchTransactionalEmail } from '../id/_emailDispatch';
import { renderRefundConfirmationEmailHtml } from '../id/_emailTemplates';
import { loadCustomerCatalogIndex } from '../me/_customerData';
import { formatCurrencyBrl } from '../../../lib/personalizadosCanonical';

export type RefundLifecycleState =
  | 'eligible'
  | 'not_eligible'
  | 'requested'
  | 'processing'
  | 'refunded'
  | 'rejected'
  | 'unknown_awaiting_reconciliation';

export interface RefundAdminActor {
  profile: 'nua' | 'phdev';
  subject: string;
  role: string;
}

export interface LoadedRefundTarget {
  orderId: string;
  modality: string;
  modalityLabel: string;
  title: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  providerPaymentId: string | null;
  expectedExternalReferences: string[];
  operationalStatus: string;
  financialStatus: string;
  localRefundStatus: string | null;
  localRefundAmount?: number;
  isManualPayment: boolean;
  stageSummary?: string;
  consequences: string[];
  raw: any;
}

export interface RefundEligibilitySummary {
  orderId: string;
  modality: string;
  modalityLabel: string;
  title: string;
  customerName: string;
  customerEmail: string;
  amountPaid: number;
  amountPaidFormatted: string;
  refundableAmount: number;
  refundableAmountFormatted: string;
  alreadyRefundedAmount: number;
  state: RefundLifecycleState;
  eligible: boolean;
  canReconcile: boolean;
  reasonIfIneligible?: string;
  stageSummary?: string;
  consequences: string[];
  providerPaymentId: string | null;
  providerStatus?: string;
  lastError?: string | null;
}

export interface RefundExecutionResult {
  success: boolean;
  state: RefundLifecycleState;
  orderId: string;
  modality: string;
  refundId?: string;
  refundAmount?: number;
  emailSent?: boolean;
  reconciled?: boolean;
  message: string;
  error?: string;
  httpStatus: number;
}

interface PersistedRefundOperationState {
  orderId: string;
  modality: string;
  state: RefundLifecycleState;
  providerPaymentId: string;
  refundId?: string;
  amount?: number;
  paymentAmount?: number;
  providerConfirmed?: boolean;
  emailPending?: boolean;
  reason?: string;
  requestedBy?: string;
  requestedProfile?: string;
  lastError?: string | null;
  updatedAt: string;
}

export interface RefundModalityAdapter {
  readonly modality: string;
  matches(orderId: string, hintModality?: string | null): boolean;
  load(env: NuaIdEnv, orderId: string): Promise<LoadedRefundTarget | null>;
  applyConfirmedRefund(
    env: NuaIdEnv,
    target: LoadedRefundTarget,
    ctx: {
      refundId?: string;
      refundAmount: number;
      reason: string;
      actor: RefundAdminActor;
    }
  ): Promise<void>;
}

export interface RefundGatewayDeps {
  getPayment: typeof getMercadoPagoPayment;
  refundPayment: typeof refundMercadoPagoPayment;
  listRefunds: typeof listMercadoPagoRefunds;
}

const DEFAULT_GATEWAY_DEPS: RefundGatewayDeps = {
  getPayment: getMercadoPagoPayment,
  refundPayment: refundMercadoPagoPayment,
  listRefunds: listMercadoPagoRefunds,
};

function isManualTxId(txId?: string | null, paymentStatus?: string | null): boolean {
  const s = String(txId || '').trim();
  const st = String(paymentStatus || '').toLowerCase().trim();
  return (
    st === 'manual_confirmed' ||
    s.startsWith('ADMIN_') ||
    s.startsWith('MANUAL_ADMIN_') ||
    s.startsWith('sim_')
  );
}

function normalizeEmailCandidate(raw?: string | null): string {
  const clean = String(raw || '').trim().toLowerCase();
  return /^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/.test(clean) ? clean : '';
}

export function refundStateKey(orderId: string): string {
  return `nua_id:refund_op:${orderId}`;
}

function refundLockKey(orderId: string): string {
  return `nua_id:refund_lock:${orderId}`;
}

// =============================================================================
// Adaptadores por Modalidade (Extensível para futuras modalidades!)
// =============================================================================

const vipAppointmentAdapter: RefundModalityAdapter = {
  modality: 'vip',
  matches(orderId, hint) {
    const h = String(hint || '').toLowerCase();
    return (
      h === 'vip' ||
      h === 'chamada' ||
      h === 'chamadas' ||
      h === 'appointment' ||
      orderId.startsWith('apt_') ||
      orderId.startsWith('app_') ||
      orderId.startsWith('book_')
    );
  },
  async load(env, orderId) {
    const fixtures = (env as any)?.__CUSTOMER_DATA_FIXTURES__;
    const booking =
      fixtures?.appointments?.[orderId] ||
      (await getAppointmentByIdFromSupabase(env, orderId));
    if (!booking) return null;

    const paymentRec = await getPaymentByOrderRef(env, orderId).catch(() => null);
    const txId = String(
      booking.payment?.transactionId || paymentRec?.providerPaymentId || ''
    ).trim();
    const manual = isManualTxId(txId, booking.payment?.status);
    const isFutureOrActive = ['confirmada', 'reagendamento_pendente'].includes(booking.status);

    const consequences = [
      'O valor será devolvido ao cliente diretamente pelo Mercado Pago.',
      isFutureOrActive
        ? 'A reserva da Chamada VIP será cancelada e o horário será liberado na agenda.'
        : 'O histórico da reserva será preservado com o registro financeiro do estorno.',
      'Financeiro, Histórico de Pedidos e Central de Clientes serão atualizados automaticamente.',
    ];

    return {
      orderId: booking.id,
      modality: 'vip',
      modalityLabel: 'Chamada VIP',
      title: booking.modalityName || 'Chamada VIP',
      customerName: booking.clientName || 'Cliente VIP',
      customerEmail: normalizeEmailCandidate(booking.clientEmail),
      amount: Number(booking.price || paymentRec?.amountCents ? (paymentRec ? paymentRec.amountCents / 100 : booking.price) : 0),
      providerPaymentId: txId || null,
      expectedExternalReferences: [`apt_${booking.id}`, booking.id],
      operationalStatus: booking.status || '',
      financialStatus: paymentRec?.status || booking.payment?.status || 'pending',
      localRefundStatus: booking.refundStatus || null,
      localRefundAmount: typeof booking.refundAmount === 'number' ? booking.refundAmount : undefined,
      isManualPayment: manual,
      stageSummary: `Status da reserva: ${booking.status}`,
      consequences,
      raw: booking,
    };
  },
  async applyConfirmedRefund(env, target, ctx) {
    const booking = target.raw;
    if (!booking) return;

    const nowIso = new Date().toISOString();
    booking.payment = {
      ...(booking.payment || {}),
      status: 'refunded',
      refundId: ctx.refundId || booking.payment?.refundId,
      refundAmount: ctx.refundAmount,
    };
    booking.refundId = ctx.refundId || booking.refundId;
    booking.refundAmount = ctx.refundAmount;
    booking.refundStatus = 'completed';

    if (['confirmada', 'reagendamento_pendente', 'aguardando_pagamento'].includes(booking.status)) {
      booking.status = 'cancelada';
      booking.cancellationReason = ctx.reason || booking.cancellationReason || 'Estorno manual aprovado pela administração';
    }
    if (!Array.isArray(booking.history)) booking.history = [];
    if (!booking.history.some((h: any) => h.action === 'reembolso_concluido' && h.note?.includes(ctx.refundId || ''))) {
      booking.history.push({
        at: nowIso,
        action: 'reembolso_concluido',
        note: `Estorno manual confirmado pelo Mercado Pago (${ctx.refundId || 'sem ID'}) — ${formatCurrencyBrl(ctx.refundAmount)}. Solicitado por ${ctx.actor.profile.toUpperCase()}. Motivo: ${ctx.reason}`,
        author: 'admin',
      });
    }
    booking.updatedAt = nowIso;

    if (!(env as any)?.__CUSTOMER_DATA_FIXTURES__) {
      const saved = await saveAppointmentToSupabase(env, booking);
      const mirror = await updateOrderInSupabase(env, booking.id, { status: 'refunded' });
      if (!saved.success || !mirror.success) throw new Error('Falha ao sincronizar a reserva estornada.');
    }
  },
};

const personalizadoAdapter: RefundModalityAdapter = {
  modality: 'personalizado',
  matches(orderId, hint) {
    const h = String(hint || '').toLowerCase();
    return (
      h === 'personalizado' ||
      h === 'personalizados' ||
      h === 'custom' ||
      orderId.startsWith('ped_') ||
      orderId.startsWith('pers_')
    );
  },
  async load(env, orderId) {
    const fixtures = (env as any)?.__CUSTOMER_DATA_FIXTURES__;
    const pers =
      fixtures?.personalizados?.[orderId] ||
      (await getPersonalizadoOrderFromSupabase(env, orderId));
    if (!pers) return null;

    const [paymentRec, sbOrder] = await Promise.all([
      getPaymentByOrderRef(env, orderId).catch(() => null),
      fixtures?.orders?.[orderId]
        ? Promise.resolve(fixtures.orders[orderId])
        : getOrderFromSupabase(env, orderId).catch(() => null),
    ]);
    const txId = String(
      pers.payment?.transactionId ||
        paymentRec?.providerPaymentId ||
        sbOrder?.providerPaymentId ||
        sbOrder?.paymentId ||
        ''
    ).trim();
    const manual = isManualTxId(txId, pers.payment?.status);

    const stageDescriptions: Record<string, string> = {
      aguardando_pagamento: 'Pedido ainda não iniciado (aguardando pagamento).',
      em_producao: 'Pedido em produção — a gravação/produção será interrompida e o pedido cancelado.',
      pronto: 'Conteúdo já concluído no cofre — o acesso ao cofre será revogado, mas os arquivos originais não serão apagados.',
      entregue: 'Conteúdo já entregue ao cliente — o acesso ao cofre deste pedido será revogado, preservando arquivos e histórico.',
      cancelado: 'Pedido já marcado como cancelado.',
    };
    const stageSummary = stageDescriptions[pers.status] || `Estágio atual: ${pers.status}`;

    const consequences = [
      'O valor será devolvido ao cliente diretamente pelo Mercado Pago.',
      stageSummary,
      'Arquivos produzidos e histórico do pedido serão preservados para rastreabilidade (nada é apagado fisicamente).',
      'O acesso do cliente ao Cofre referente a este pedido será revogado.',
    ];

    const title = `Personalizado (${pers.photoCount || 0} fotos${pers.videoDurationMinutes ? ` + ${pers.videoDurationMinutes}min vídeo` : ''})`;

    return {
      orderId: pers.id,
      modality: 'personalizado',
      modalityLabel: 'Personalizado',
      title,
      customerName: pers.clientName || sbOrder?.customerName || 'Cliente',
      customerEmail: normalizeEmailCandidate(
        sbOrder?.customerEmail || pers.clientContact
      ),
      amount: Number(pers.totalPrice || sbOrder?.amount || 0),
      providerPaymentId: txId || null,
      expectedExternalReferences: [pers.id, `pers_${pers.id}`, `ped_${pers.id}`, 'nua_pers_' + pers.id, 'nua_personalizado_' + pers.id],
      operationalStatus: pers.status || '',
      financialStatus: paymentRec?.status || pers.payment?.status || 'pending',
      localRefundStatus: pers.payment?.status === 'refunded' ? 'completed' : null,
      isManualPayment: manual,
      stageSummary,
      consequences,
      raw: pers,
    };
  },
  async applyConfirmedRefund(env, target, ctx) {
    const pers = target.raw;
    if (!pers) return;

    const nowIso = new Date().toISOString();
    pers.payment = {
      ...(pers.payment || {}),
      status: 'refunded',
      refundId: ctx.refundId,
      refundAmount: ctx.refundAmount,
      refundedAt: nowIso,
      refundReason: ctx.reason,
      refundedBy: ctx.actor.profile,
    };
    // Preserva registro se já foi entregue; cancela se estava em produção/pronto
    if (pers.status !== 'entregue') {
      pers.status = 'cancelado';
    }
    const noteLine = `[Estorno ${new Date(nowIso).toLocaleDateString('pt-BR')} por ${ctx.actor.profile.toUpperCase()}] ${formatCurrencyBrl(ctx.refundAmount)} (${ctx.refundId || 'MP'}) — ${ctx.reason}`;
    pers.adminNotes = pers.adminNotes ? `${pers.adminNotes}\n${noteLine}` : noteLine;
    pers.updatedAt = nowIso;

    if (!(env as any)?.__CUSTOMER_DATA_FIXTURES__) {
      const saved = await savePersonalizadoOrderToSupabase(env, pers);
      const mirror = await updateOrderInSupabase(env, pers.id, { status: 'refunded' });
      if (!saved.success || !mirror.success) throw new Error('Falha ao sincronizar o Personalizado estornado.');
    }
    await revokeEntitlementsByOrder(env, pers.id, `Estorno manual: ${ctx.reason}`);
  },
};

const packAndGenericOrderAdapter: RefundModalityAdapter = {
  modality: 'pack',
  matches(_orderId, hint) {
    const h = String(hint || '').toLowerCase();
    return !h || ['pack', 'avulso', 'conteudos', 'generic_order'].includes(h);
  },
  async load(env, orderId) {
    const fixtures = (env as any)?.__CUSTOMER_DATA_FIXTURES__;
    const ord =
      fixtures?.orders?.[orderId] ||
      (await getOrderFromSupabase(env, orderId));
    if (!ord) return null;

    const [paymentRec, catalog] = await Promise.all([
      getPaymentByOrderRef(env, orderId).catch(() => null),
      loadCustomerCatalogIndex(env).catch(() => new Map<string, any>()),
    ]);
    const txId = String(
      ord.providerPaymentId || ord.paymentId || paymentRec?.providerPaymentId || ''
    ).trim();
    const manual = isManualTxId(txId, ord.status);
    const catItem = ord.packId ? catalog.get(String(ord.packId).toLowerCase()) : null;
    const title = catItem?.title || catItem?.name || ord.packId || ord.id;

    return {
      orderId: ord.id,
      modality: 'pack',
      modalityLabel: catItem ? 'Conteúdo & Pack' : 'Pedido Comercial',
      title,
      customerName: ord.customerName || 'Cliente Digital',
      customerEmail: normalizeEmailCandidate(ord.customerEmail),
      amount: Number(ord.amount || (paymentRec ? paymentRec.amountCents / 100 : 0)),
      providerPaymentId: txId || null,
      expectedExternalReferences: [
        ord.id,
        ...(ord.packId ? ['nua_pack_' + ord.packId + '_' + ord.id, 'nua_avulso_' + ord.packId + '_' + ord.id] : []),
      ],
      operationalStatus: ord.status || '',
      financialStatus: paymentRec?.status || ord.status || 'pending',
      localRefundStatus: ord.status === 'refunded' ? 'completed' : null,
      isManualPayment: manual,
      consequences: [
        'O valor será devolvido ao cliente diretamente pelo Mercado Pago.',
        'O direito de acesso (Cofre / Biblioteca) exclusivo deste pedido será revogado.',
        'As mídias originais, o histórico da compra e outros pedidos válidos do cliente não serão afetados.',
      ],
      raw: ord,
    };
  },
  async applyConfirmedRefund(env, target, ctx) {
    const ord = target.raw;
    if (ord) {
      ord.status = 'refunded';
      ord.updatedAt = new Date().toISOString();
    }
    if (!(env as any)?.__CUSTOMER_DATA_FIXTURES__) {
      const saved = await updateOrderInSupabase(env, target.orderId, { status: 'refunded' });
      if (!saved.success) throw new Error('Falha ao sincronizar o Pack estornado.');
    }
    await revokeEntitlementsByOrder(
      env,
      target.orderId,
      `Estorno manual (${ctx.actor.profile}): ${ctx.reason}`
    );
  },
};

/**
 * Registry ordenado de adaptadores de modalidade.
 * Para adicionar uma nova modalidade no futuro, basta registrar seu adaptador aqui antes de `packAndGenericOrderAdapter`.
 */
export const REFUND_MODALITY_ADAPTERS: RefundModalityAdapter[] = [
  vipAppointmentAdapter,
  personalizadoAdapter,
  packAndGenericOrderAdapter,
];

export async function resolveRefundTarget(
  env: NuaIdEnv,
  orderId: string,
  hintModality?: string | null
): Promise<{ adapter: RefundModalityAdapter; target: LoadedRefundTarget } | null> {
  const cleanId = String(orderId || '').trim();
  if (!cleanId || !/^[A-Za-z0-9_-]{3,128}$/.test(cleanId)) return null;

  // Tenta primeiro adaptadores que casam com o prefixo/hint
  const ordered = [
    ...REFUND_MODALITY_ADAPTERS.filter((a) => a.matches(cleanId, hintModality)),
    ...REFUND_MODALITY_ADAPTERS.filter((a) => !a.matches(cleanId, hintModality)),
  ];

  for (const adapter of ordered) {
    const target = await adapter.load(env, cleanId);
    if (target) return { adapter, target };
  }
  return null;
}

function externalReferenceMatches(
  gatewayRef: string | undefined | null,
  expected: string[]
): boolean {
  const clean = String(gatewayRef || '').trim();
  if (!clean) return false;
  return expected.some((candidate) => candidate === clean);
}

// =============================================================================
// Consulta de Elegibilidade (GET /api/admin/refund)
// =============================================================================

export async function inspectRefundEligibility(
  env: NuaIdEnv,
  orderId: string,
  hintModality?: string | null,
  deps: RefundGatewayDeps = DEFAULT_GATEWAY_DEPS
): Promise<{ found: boolean; summary?: RefundEligibilitySummary; error?: string }> {
  const resolved = await resolveRefundTarget(env, orderId, hintModality);
  if (!resolved) {
    return { found: false, error: 'Pedido não encontrado.' };
  }

  const { target } = resolved;
  const adapterStore = getNuaIdAdapter(env);
  const [persistedOp, existingRefunds] = await Promise.all([
    adapterStore
      ? adapterStore.kvGet<PersistedRefundOperationState>(refundStateKey(target.orderId)).catch(() => null)
      : Promise.resolve(null),
    listRefundsByOrderRef(env, target.orderId).catch(() => []),
  ]);

  const alreadyRefundedCents = existingRefunds
    .filter((r) => ['approved', 'completed', 'refunded'].includes(String(r.status || '').toLowerCase()))
    .reduce((acc, r) => acc + Number(r.amountCents || 0), 0);
  const alreadyRefundedAmount = Math.round(alreadyRefundedCents) / 100;

  let state: RefundLifecycleState = 'not_eligible';
  let reasonIfIneligible: string | undefined;
  let providerStatus: string | undefined;
  let providerRefundedAmount = alreadyRefundedAmount;
  let amountPaid = target.amount;
  let refundableAmount = 0;

  if (persistedOp?.providerConfirmed && persistedOp.state !== 'refunded') {
    state = 'unknown_awaiting_reconciliation';
    reasonIfIneligible = 'O Mercado Pago confirmou a devolução. Falta atualizar o pedido no painel.';
  } else if (
    target.financialStatus === 'refunded' ||
    target.localRefundStatus === 'completed' ||
    target.operationalStatus === 'refunded'
  ) {
    state = 'refunded';
    refundableAmount = 0;
    reasonIfIneligible = 'Este pagamento já foi estornado.';
  } else if (target.isManualPayment || !target.providerPaymentId || !/^\d{1,32}$/.test(target.providerPaymentId)) {
    state = 'not_eligible';
    reasonIfIneligible = target.isManualPayment
      ? 'Pagamento confirmado manualmente fora do Mercado Pago. Faça a devolução diretamente pelo banco.'
      : 'Este pedido não possui identificador de pagamento no Mercado Pago.';
  } else if (persistedOp?.state === 'unknown_awaiting_reconciliation') {
    state = 'unknown_awaiting_reconciliation';
    reasonIfIneligible = 'O último estorno teve resposta inconclusiva. Reconcilie com o Mercado Pago antes de tentar novamente.';
  } else if (persistedOp?.state === 'processing' || persistedOp?.state === 'requested') {
    state = 'processing';
    reasonIfIneligible = 'Estorno em processamento no Mercado Pago. Clique em reconciliar para verificar a confirmação.';
  } else {
    try {
      const gw = await deps.getPayment(env, target.providerPaymentId);
      providerStatus = gw.status;
      amountPaid = gw.amount;

      if (!externalReferenceMatches(gw.externalReference, target.expectedExternalReferences)) {
        state = 'not_eligible';
        reasonIfIneligible = 'O pagamento retornado pelo Mercado Pago pertence a outro pedido.';
      } else if (gw.status === 'charged_back') {
        state = 'not_eligible';
        reasonIfIneligible = 'O pagamento está em contestação no Mercado Pago.';
      } else if (gw.status === 'refunded') {
        state = 'refunded';
        refundableAmount = 0;
        reasonIfIneligible = 'O Mercado Pago informa que este pagamento já foi estornado.';
      } else if (gw.status === 'approved') {
        const listRefundsFn = typeof deps?.listRefunds === 'function' ? deps.listRefunds : async () => [];
        const refunds = await listRefundsFn(env, target.providerPaymentId);
        const confirmed = refunds.filter(({ status }) => ['approved', 'completed', 'refunded'].includes(status));
        providerRefundedAmount = Math.max(Number(gw.raw?.transaction_amount_refunded || 0), confirmed.reduce((sum, refund) => sum + refund.amount, 0));
        refundableAmount = Math.max(
          0,
          Math.round((gw.amount - providerRefundedAmount) * 100) / 100
        );
        if (refunds.some(({ status }) => !['approved', 'completed', 'refunded', 'rejected', 'cancelled', 'canceled'].includes(status))) {
          state = 'processing';
          reasonIfIneligible = 'Há uma devolução em andamento no Mercado Pago.';
        } else if (refundableAmount <= 0) {
          state = 'refunded';
          reasonIfIneligible = 'O valor integral já foi devolvido no Mercado Pago.';
        } else {
          state = 'eligible';
        }
      } else {
        state = 'not_eligible';
        reasonIfIneligible = `Pagamento com status "${gw.status}" no Mercado Pago (somente pagamentos aprovados podem ser estornados).`;
      }
    } catch (err: any) {
      state = 'unknown_awaiting_reconciliation';
      reasonIfIneligible =
        err?.message || 'Não foi possível consultar o status atual no Mercado Pago.';
    }
  }

  return {
    found: true,
    summary: {
      orderId: target.orderId,
      modality: target.modality,
      modalityLabel: target.modalityLabel,
      title: target.title,
      customerName: target.customerName,
      customerEmail: target.customerEmail,
      amountPaid,
      amountPaidFormatted: formatCurrencyBrl(amountPaid),
      refundableAmount,
      refundableAmountFormatted: formatCurrencyBrl(refundableAmount),
      alreadyRefundedAmount: providerRefundedAmount,
      state,
      eligible: state === 'eligible',
      canReconcile:
        state === 'unknown_awaiting_reconciliation' || state === 'processing',
      reasonIfIneligible,
      stageSummary: target.stageSummary,
      consequences: target.consequences,
      providerPaymentId: target.providerPaymentId,
      providerStatus,
      lastError: persistedOp?.lastError || null,
    },
  };
}

// =============================================================================
// Execução & Reconciliação de Estorno (POST /api/admin/refund)
// =============================================================================

async function persistConfirmedRefundSideEffects(
  env: NuaIdEnv,
  adapter: RefundModalityAdapter,
  target: LoadedRefundTarget,
  params: {
    operation: PersistedRefundOperationState;
    refundId?: string;
    refundAmount: number;
    reason: string;
    actor: RefundAdminActor;
    providerPaymentId: string;
  }
): Promise<{ emailSent: boolean }> {
  const { operation, refundId, refundAmount, reason, actor, providerPaymentId } = params;
  const store = getNuaIdAdapter(env);
  if (!store) throw new Error('Armazenamento de estorno indisponível.');
  const key = refundStateKey(target.orderId);
  if (operation.state !== 'refunded') {

    // 1. Efeitos operacionais específicos da modalidade (revogação de acesso, cancelamento VIP, etc.)
    await adapter.applyConfirmedRefund(env, target, {
      refundId,
      refundAmount,
      reason,
      actor,
    });

    // 2. Registros financeiros unificados (PaymentRecord + RefundRecord) — mantém Financeiro e Clientes consistentes
    const paymentRec = await upsertPaymentRecord(env, {
      orderRef: target.orderId,
      provider: 'mercadopago',
      providerPaymentId,
      amountCents: Math.round(operation.paymentAmount! * 100),
      currency: 'BRL',
      status: 'refunded',
      rawStatus: 'refunded',
    }, true);
    if (!paymentRec) throw new Error('Falha ao registrar pagamento estornado.');

    const refundRecord = await recordRefund(env, {
      paymentId: paymentRec?.id || providerPaymentId,
      orderRef: target.orderId,
      providerRefundId: refundId || `mp_ref_${providerPaymentId}`,
      amountCents: Math.round(refundAmount * 100),
      status: 'approved',
      reason,
    }, true);
    if (!refundRecord) throw new Error('Falha ao registrar a devolução.');

    // 3. Trilha de auditoria do cliente
    const claim = await getOrderClaim(env, target.orderId).catch(() => null);
    const audited = await recordCustomerAuditEvent(env, {
      profileId: claim?.profileId || null,
      action: 'admin_manual_refund_confirmed',
      details: {
        orderRef: target.orderId,
        modality: target.modality,
        providerPaymentId,
        refundId: refundId || null,
        amountCents: Math.round(refundAmount * 100),
        reason,
        requestedByProfile: actor.profile,
        requestedBySubject: actor.subject,
      },
    });
    if (!audited || !(await store.kvSet(key, { ...operation, state: 'refunded',
      emailPending: Boolean(target.customerEmail), updatedAt: new Date().toISOString() }))) {
      throw new Error('Falha ao concluir a trilha do estorno.');
    }
  }

  const claim = await getOrderClaim(env, target.orderId).catch(() => null);
  // 5. E-mail ao cliente (somente após confirmação real do Mercado Pago e com idempotência)
  let emailSent = false;
  const emailFlagKey = `nua_id:email_sent:refund_confirmed:${target.orderId}`;
  const alreadySent = Boolean(await store.kvGet(emailFlagKey));

  if (!alreadySent && target.customerEmail) {
    const site = (env.NEXT_PUBLIC_SITE_URL || 'https://nuaborges.com.br').replace(/\/$/, '');
    const mail = renderRefundConfirmationEmailHtml({
      customerName: target.customerName,
      itemTitle: target.title,
      orderRef: target.orderId,
      refundAmountFormatted: formatCurrencyBrl(refundAmount),
      reason,
      accountUrl: `${site}/conta`,
    });
    const dispatch = await dispatchTransactionalEmail(env, {
      to: target.customerEmail,
      subject: mail.subject,
      html: mail.html,
    });
    emailSent = dispatch.sent;
    await recordNotificationEvent(env, {
      profileId: claim?.profileId || null,
      recipientEmail: target.customerEmail,
      orderRef: target.orderId,
      kind: 'refund_confirmed',
      status: dispatch.sent ? 'sent' : 'failed',
      errorMessage: dispatch.error,
    }).catch(() => {});
    if (dispatch.sent && !(await store.kvSet(emailFlagKey, { sentAt: new Date().toISOString() }))) {
      throw new Error('Falha ao registrar o envio do aviso de estorno.');
    }
  }

  if (alreadySent || emailSent || !target.customerEmail) {
    await store.kvSet(key, { ...operation, state: 'refunded', emailPending: false, updatedAt: new Date().toISOString() });
  }
  return { emailSent: emailSent || alreadySent };
}

async function finalizeConfirmedRefund(
  env: NuaIdEnv,
  adapter: RefundModalityAdapter,
  target: LoadedRefundTarget,
  store: NonNullable<ReturnType<typeof getNuaIdAdapter>>,
  operation: PersistedRefundOperationState,
  actor: RefundAdminActor,
): Promise<RefundExecutionResult> {
  const key = refundStateKey(operation.orderId);
  const pending = { ...operation, requestedBy: operation.requestedBy || actor.subject,
    requestedProfile: operation.requestedProfile || actor.profile };
  try {
    if (pending.state !== 'refunded' && !(await store.kvSet(key, pending))) {
      throw new Error('Falha ao registrar a confirmação externa.');
    }
    const { emailSent } = await persistConfirmedRefundSideEffects(env, adapter, target, {
      operation: pending,
      refundId: pending.refundId,
      refundAmount: pending.amount!,
      reason: pending.reason || 'Devolução confirmada pelo Mercado Pago',
      actor: { ...actor, subject: pending.requestedBy, profile: pending.requestedProfile === 'phdev' ? 'phdev' : 'nua' },
      providerPaymentId: pending.providerPaymentId,
    });
    return { success: true, state: 'refunded', orderId: operation.orderId, modality: target.modality,
      refundId: pending.refundId, refundAmount: pending.amount, emailSent, reconciled: true,
      message: 'Devolução confirmada pelo Mercado Pago e sincronizada no painel.', httpStatus: 200 };
  } catch (error) {
    console.error('[Refund] Falha ao sincronizar devolução confirmada:', error);
    return { success: false, state: 'unknown_awaiting_reconciliation', orderId: operation.orderId, modality: target.modality,
      message: 'O Mercado Pago confirmou a devolução. A sincronização do pedido segue pendente.', httpStatus: 503 };
  }
}

export async function executeManualRefund(
  env: NuaIdEnv,
  params: {
    orderId: string;
    modality?: string | null;
    reason: string;
    confirmRefund: boolean;
    requestedPaymentId?: string | null;
    amount?: number;
    expectedRefundAmount?: number;
    reconcileOnly?: boolean;
    actor: RefundAdminActor;
  },
  deps: RefundGatewayDeps = DEFAULT_GATEWAY_DEPS
): Promise<RefundExecutionResult> {
  const { orderId, modality, confirmRefund, requestedPaymentId, reconcileOnly, actor } = params;
  if (!reconcileOnly && params.amount !== undefined) {
    return { success: false, state: 'not_eligible', orderId, modality: modality || 'unknown',
      message: 'Esta ação aceita apenas a devolução integral do saldo.', httpStatus: 400 };
  }
  const cleanReason = String(params.reason || '').trim().slice(0, 300);

  if (!reconcileOnly && confirmRefund !== true) {
    return {
      success: false,
      state: 'not_eligible',
      orderId,
      modality: modality || 'unknown',
      message: 'Confirmação explícita obrigatória.',
      error: 'Confirme explicitamente o estorno antes de prosseguir.',
      httpStatus: 400,
    };
  }
  if (!reconcileOnly && cleanReason.length < 3) {
    return {
      success: false,
      state: 'not_eligible',
      orderId,
      modality: modality || 'unknown',
      message: 'Motivo obrigatório.',
      error: 'Informe o motivo do estorno (mínimo 3 caracteres).',
      httpStatus: 400,
    };
  }

  const resolved = await resolveRefundTarget(env, orderId, modality);
  if (!resolved) {
    return {
      success: false,
      state: 'not_eligible',
      orderId,
      modality: modality || 'unknown',
      message: 'Pedido não encontrado.',
      error: 'Pedido não encontrado no sistema.',
      httpStatus: 404,
    };
  }

  const { adapter, target } = resolved;
  const store = getNuaIdAdapter(env);

  // Segurança: impede o frontend de informar um paymentId arbitrário de outro pedido
  if (
    requestedPaymentId &&
    target.providerPaymentId &&
    String(requestedPaymentId).trim() !== target.providerPaymentId
  ) {
    return {
      success: false,
      state: 'not_eligible',
      orderId: target.orderId,
      modality: target.modality,
      message: 'Identificador financeiro incompatível.',
      error: 'O identificador de pagamento informado não corresponde a este pedido.',
      httpStatus: 409,
    };
  }

  if (target.isManualPayment || !target.providerPaymentId || !/^\d{1,32}$/.test(target.providerPaymentId)) {
    return {
      success: false,
      state: 'not_eligible',
      orderId: target.orderId,
      modality: target.modality,
      message: 'Pedido inelegível para estorno via Mercado Pago.',
      error: target.isManualPayment
        ? 'Este pagamento foi confirmado manualmente fora do Mercado Pago.'
        : 'Este pedido não possui pagamento válido no Mercado Pago.',
      httpStatus: 409,
    };
  }

  // O mesmo pagamento usa uma única reserva, mesmo quando aparece em mais de um pedido.
  const lockKey = refundLockKey(target.providerPaymentId);
  const now = Date.now();
  const lease = { next: now + 120_000 };
  if (!store?.kvCreate || !store.kvLease) {
    return { success: false, state: 'not_eligible', orderId, modality: target.modality,
      message: 'Armazenamento de estorno indisponível. Nenhuma devolução foi solicitada.', httpStatus: 503 };
  }
  let lockAcquired = await store.kvCreate(lockKey, lease);
  if (!lockAcquired) {
    const previous = await store.kvGet<{ next: number }>(lockKey);
    if (previous && previous.next <= now) lockAcquired = await store.kvLease(lockKey, previous.next, lease);
  }
  if (!lockAcquired) {
    return { success: false, state: 'processing', orderId, modality: target.modality,
      message: 'Já existe uma solicitação em andamento para este pagamento.', httpStatus: 409 };
  }

  try {
    const operationKey = refundStateKey(target.orderId);
    const operation = await store.kvGet<PersistedRefundOperationState>(operationKey);
    const previous = operation?.providerPaymentId === target.providerPaymentId ? operation : null;
    if (previous?.providerConfirmed && previous.amount && previous.paymentAmount) {
      return await finalizeConfirmedRefund(env, adapter, target, store, previous, actor);
    }
    if (!reconcileOnly && previous && ['requested', 'processing', 'unknown_awaiting_reconciliation'].includes(previous.state)) {
      return { success: false, state: previous.state === 'processing' ? 'processing' : 'unknown_awaiting_reconciliation',
        orderId, modality: target.modality, message: 'Reconcilie a solicitação anterior antes de tentar novamente.', httpStatus: 409 };
    }

    // 1. Consulta estado real e atualizado no Mercado Pago
    let gatewayPayment: Awaited<ReturnType<typeof getMercadoPagoPayment>>;
    try {
      gatewayPayment = await deps.getPayment(env, target.providerPaymentId);
    } catch (err: any) {
      return {
        success: false,
        state: 'unknown_awaiting_reconciliation',
        orderId: target.orderId,
        modality: target.modality,
        message: 'Não foi possível consultar o Mercado Pago.',
        error: err?.message || 'Erro ao consultar o pagamento no Mercado Pago.',
        httpStatus: 502,
      };
    }

    // Valida vínculo real do pagamento com o pedido
    if (!externalReferenceMatches(gatewayPayment.externalReference, target.expectedExternalReferences)) {
      return {
        success: false,
        state: 'not_eligible',
        orderId: target.orderId,
        modality: target.modality,
        message: 'Pagamento divergente no provedor.',
        error: 'O pagamento consultado no Mercado Pago não pertence a este pedido.',
        httpStatus: 409,
      };
    }

    let providerRefunds: Awaited<ReturnType<typeof listMercadoPagoRefunds>>;
    try {
      const listRefundsFn = typeof deps?.listRefunds === 'function' ? deps.listRefunds : async () => [];
      providerRefunds = await listRefundsFn(env, target.providerPaymentId);
    } catch {
      return { success: false, state: 'unknown_awaiting_reconciliation', orderId, modality: target.modality,
        message: 'Não foi possível verificar as devoluções registradas no Mercado Pago.', httpStatus: 502 };
    }
    const confirmed = providerRefunds.filter(({ status }) => ['approved', 'completed', 'refunded'].includes(status));
    const paymentCents = Math.round(gatewayPayment.amount * 100);
    const listedRefunded = confirmed.reduce((sum, refund) => sum + Math.round(refund.amount * 100), 0);
    const refundedCents = Math.max(listedRefunded, Math.round(Number(gatewayPayment.raw?.transaction_amount_refunded || 0) * 100));
    if (paymentCents > 0 && (gatewayPayment.status === 'refunded' || refundedCents >= paymentCents)) {
      return await finalizeConfirmedRefund(env, adapter, target, store, {
        orderId, modality: target.modality, providerPaymentId: target.providerPaymentId,
        refundId: confirmed.find(({ id }) => id === previous?.refundId)?.id || confirmed.at(-1)?.id,
        paymentAmount: gatewayPayment.amount,
        amount: confirmed.find(({ id }) => id === previous?.refundId)?.amount || confirmed.at(-1)?.amount || gatewayPayment.amount,
        providerConfirmed: true, state: 'unknown_awaiting_reconciliation',
        reason: previous?.reason || cleanReason || 'Reconciliação de devolução integral',
        updatedAt: new Date().toISOString(),
      }, actor);
    }
    const unsettled = providerRefunds.some(({ status }) =>
      !['approved', 'completed', 'refunded', 'rejected', 'cancelled', 'canceled'].includes(status));
    if (unsettled) {
      const saved = await store.kvSet(operationKey, {
        ...previous, orderId, modality: target.modality, state: 'processing',
        providerPaymentId: target.providerPaymentId, updatedAt: new Date().toISOString(),
      } satisfies PersistedRefundOperationState);
      return { success: saved, state: 'processing', orderId, modality: target.modality,
        message: 'Há uma devolução em andamento no Mercado Pago.', httpStatus: saved ? 202 : 503 };
    }
    if (reconcileOnly) {
      const rejected = providerRefunds.some(({ id, status }) =>
        id === previous?.refundId && ['rejected', 'cancelled', 'canceled'].includes(status));
      if (rejected && previous) {
        const saved = await store.kvSet(operationKey, { ...previous, state: 'rejected', updatedAt: new Date().toISOString() });
        return { success: saved, state: 'rejected', orderId, modality: target.modality,
          message: 'O Mercado Pago confirmou o encerramento da solicitação anterior.', httpStatus: saved ? 200 : 503 };
      }
      return { success: false, state: 'unknown_awaiting_reconciliation', orderId, modality: target.modality,
        message: refundedCents > 0 ? 'O Mercado Pago confirma uma devolução parcial. A devolução integral ainda não foi confirmada.'
          : 'O Mercado Pago ainda não confirmou o resultado da solicitação. Reconcilie novamente antes de solicitar outra devolução.',
        httpStatus: 409 };
    }

    if (gatewayPayment.status !== 'approved') {
      return {
        success: false,
        state: 'not_eligible',
        orderId: target.orderId,
        modality: target.modality,
        message: 'Pagamento não elegível para estorno.',
        error: `Somente pagamentos aprovados podem ser estornados (status atual no Mercado Pago: ${gatewayPayment.status}).`,
        httpStatus: 409,
      };
    }

    const remainingAmount = Math.max(0, paymentCents - refundedCents) / 100;
    if (remainingAmount <= 0) {
      return {
        success: false,
        state: 'refunded',
        orderId: target.orderId,
        modality: target.modality,
        message: 'Pagamento já totalmente estornado.',
        error: 'O valor integral deste pagamento já foi devolvido.',
        httpStatus: 409,
      };
    }

    // Solicita o saldo integral ao provedor.
    if (params.expectedRefundAmount !== undefined && (!Number.isFinite(params.expectedRefundAmount) || Math.round(params.expectedRefundAmount * 100) !== Math.round(remainingAmount * 100))) {
      return { success: false, state: 'not_eligible', orderId, modality: target.modality,
        message: 'O valor precisa ser confirmado novamente. Atualize a consulta antes de estornar.', httpStatus: 409 };
    }
    const targetRefundAmount = remainingAmount;

    // 3. Registra intenção ("requested") antes de chamar o Mercado Pago
    if (store) {
      const saved = await store.kvSet(refundStateKey(target.orderId), {
        orderId: target.orderId,
        modality: target.modality,
        state: 'requested',
        providerPaymentId: target.providerPaymentId,
        amount: targetRefundAmount,
        reason: cleanReason,
        requestedBy: actor.subject,
        requestedProfile: actor.profile,
        lastError: null,
        updatedAt: new Date().toISOString(),
      } satisfies PersistedRefundOperationState);
      if (!saved) return { success: false, state: 'not_eligible', orderId, modality: target.modality,
        message: 'Falha ao registrar a solicitação de estorno.', httpStatus: 503 };
    }

    // 4. Executa estorno real no Mercado Pago com chave de idempotência determinística
    const mpRefund = await deps.refundPayment(
      env,
      target.providerPaymentId,
      target.orderId,
      targetRefundAmount,
      { scope: `nua-manual-refund:${target.modality}` }
    );

    const mpStatus = String(mpRefund.status || '').toLowerCase();

    if (mpRefund.success && (mpStatus === 'approved' || mpStatus === 'completed')) {
      if (Math.round(Number(mpRefund.amount || 0) * 100) !== Math.round(targetRefundAmount * 100)) {
        await store.kvSet(operationKey, {
          orderId, modality: target.modality, state: 'unknown_awaiting_reconciliation',
          providerPaymentId: target.providerPaymentId, refundId: mpRefund.id, amount: targetRefundAmount,
          reason: cleanReason, updatedAt: new Date().toISOString(),
        } satisfies PersistedRefundOperationState);
        return { success: false, state: 'unknown_awaiting_reconciliation', orderId, modality: target.modality,
          message: 'O valor confirmado divergiu do previsto. Reconcilie antes de prosseguir.', httpStatus: 409 };
      }
      return await finalizeConfirmedRefund(env, adapter, target, store, {
        orderId, modality: target.modality, state: 'unknown_awaiting_reconciliation',
        providerPaymentId: target.providerPaymentId, refundId: mpRefund.id, amount: targetRefundAmount,
        paymentAmount: gatewayPayment.amount, providerConfirmed: true, reason: cleanReason,
        updatedAt: new Date().toISOString(),
      }, actor);
    }

    if (mpRefund.success && (mpStatus === 'in_process' || mpStatus === 'pending' || !mpStatus)) {
      if (store) {
        await store.kvSet(refundStateKey(target.orderId), {
          orderId: target.orderId,
          modality: target.modality,
          state: 'processing',
          providerPaymentId: target.providerPaymentId,
          refundId: mpRefund.id,
          amount: targetRefundAmount,
          reason: cleanReason,
          requestedBy: actor.subject,
          requestedProfile: actor.profile,
          lastError: null,
          updatedAt: new Date().toISOString(),
        } satisfies PersistedRefundOperationState);
      }
      return {
        success: true,
        state: 'processing',
        orderId: target.orderId,
        modality: target.modality,
        refundId: mpRefund.id,
        refundAmount: targetRefundAmount,
        message: 'Estorno solicitado ao Mercado Pago e em processamento. Aguarde a confirmação ou reconcilie em instantes.',
        httpStatus: 202,
      };
    }

    // 5. Falha inconclusiva (timeout / 5xx) vs Recusa definitiva (4xx)
    const nextState: RefundLifecycleState = mpRefund.inconclusive
      ? 'unknown_awaiting_reconciliation'
      : 'rejected';

    if (store) {
      await store.kvSet(refundStateKey(target.orderId), {
        orderId: target.orderId,
        modality: target.modality,
        state: nextState,
        providerPaymentId: target.providerPaymentId,
        amount: targetRefundAmount,
        reason: cleanReason,
        requestedBy: actor.subject,
        requestedProfile: actor.profile,
        lastError: mpRefund.error || 'Erro ao solicitar estorno.',
        updatedAt: new Date().toISOString(),
      } satisfies PersistedRefundOperationState);
    }

    return {
      success: false,
      state: nextState,
      orderId: target.orderId,
      modality: target.modality,
      message:
        nextState === 'unknown_awaiting_reconciliation'
          ? 'Resposta inconclusiva do Mercado Pago. Use Reconciliar para verificar o estado real antes de tentar novamente.'
          : 'O Mercado Pago recusou a solicitação de estorno.',
      error: mpRefund.error || 'Não foi possível concluir o estorno no Mercado Pago.',
      httpStatus: nextState === 'unknown_awaiting_reconciliation' ? 504 : 422,
    };
  } finally {
    await store.kvLease(lockKey, lease.next, { next: 0 }).catch(() => {});
  }
}

export async function retryConfirmedRefunds(env: NuaIdEnv) {
  const store = getNuaIdAdapter(env);
  if (!store) return;
  const prefix = refundStateKey('');
  const operations = await store.kvListByPrefix<PersistedRefundOperationState>(prefix);
  for (const { value } of operations
    .filter(({ value }) => value.providerConfirmed && (value.state !== 'refunded' || value.emailPending)
      || ['requested', 'processing', 'unknown_awaiting_reconciliation'].includes(value.state))
    .sort((a, b) => Number(Boolean(b.value.providerConfirmed)) - Number(Boolean(a.value.providerConfirmed))
      || a.value.updatedAt.localeCompare(b.value.updatedAt))
    .slice(0, 10)) {
    await executeManualRefund(env, {
      orderId: value.orderId, modality: value.modality, confirmRefund: false, reconcileOnly: true,
      reason: value.reason || '',
      actor: { profile: value.requestedProfile === 'phdev' ? 'phdev' : 'nua', role: 'admin', subject: value.requestedBy || 'refund_cron' },
    }).catch(() => console.error('[Refund] Falha ao reprocessar devolução confirmada.'));
  }
}
