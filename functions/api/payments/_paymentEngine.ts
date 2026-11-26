/**
 * Camada Única Compartilhada de Pagamentos (Mercado Pago) — NUA ID
 *
 * Centraliza toda a lógica financeira do novo núcleo (Packs, Chamadas VIP, Personalizados):
 * - Validação criptográfica HMAC-SHA256 de assinatura x-signature (fail-closed)
 * - Mapeamento canônico de status Mercado Pago -> Pedido -> Direito de Acesso
 * - Validação server-side de valor, moeda (BRL) e external_reference (invariantes 1 e 2)
 * - Deduplicação estrita de eventos e idempotência por (provider, payment_id)
 * - Concessão e revogação automática de entitlements (refunded, charged_back, cancelled)
 * - Tratamento de pagamento tardio em Chamadas VIP (hold expirado -> estorno automático + aviso)
 */

import { refundStateKey } from './_refundEngine';
import { notifyVaultDelivery } from '../me/_vaultMail';
import { timingSafeEqual } from '../id/_crypto';
import { dispatchTransactionalEmail } from '../id/_emailDispatch';
import { renderTransactionalNotificationHtml } from '../id/_emailTemplates';
import {
  claimOrderForProfile,
  getNuaIdAdapter,
  getOrCreateProfileByEmail,
  getOrderClaim,
  getProfileById,
  grantEntitlement,
  isValidEmailStrict,
  normalizeEmail,
  NuaIdEnv,
  PaymentRecord,
  recordCustomerAuditEvent,
  recordNotificationEvent,
  recordPaymentEventOnce,
  recordRefund,
  releasePaymentEvent,
  revokeEntitlementsByOrder,
  upsertPaymentRecord,
} from '../id/_nuaIdStore';

export type CanonicalOrderFinancialStatus =
  | 'paid'
  | 'pending'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'charged_back';

export type AccessEffect = 'grant' | 'none' | 'revoke';

export interface StatusMapping {
  paymentStatus: PaymentRecord['status'];
  orderStatus: CanonicalOrderFinancialStatus;
  accessEffect: AccessEffect;
  labelPtBr: string;
}

/**
 * Mapeamento oficial (Seção 8 do Prompt Mestre).
 */
export function mapMercadoPagoStatus(mpStatus: string): StatusMapping {
  const normalized = String(mpStatus || '').trim().toLowerCase();
  switch (normalized) {
    case 'approved':
      return {
        paymentStatus: 'approved',
        orderStatus: 'paid',
        accessEffect: 'grant',
        labelPtBr: 'Pago',
      };
    case 'in_process':
    case 'pending':
    case 'authorized':
    case 'in_mediation':
      return {
        paymentStatus: 'pending',
        orderStatus: 'pending',
        accessEffect: 'none',
        labelPtBr: 'Pendente',
      };
    case 'rejected':
      return {
        paymentStatus: 'rejected',
        orderStatus: 'failed',
        accessEffect: 'none',
        labelPtBr: 'Falhou',
      };
    case 'cancelled':
    case 'expired':
      return {
        paymentStatus: 'cancelled',
        orderStatus: 'cancelled',
        accessEffect: 'revoke',
        labelPtBr: normalized === 'expired' ? 'Expirado' : 'Cancelado',
      };
    case 'refunded':
      return {
        paymentStatus: 'refunded',
        orderStatus: 'refunded',
        accessEffect: 'revoke',
        labelPtBr: 'Reembolsado',
      };
    case 'charged_back':
      return {
        paymentStatus: 'charged_back',
        orderStatus: 'charged_back',
        accessEffect: 'revoke',
        labelPtBr: 'Contestado',
      };
    default:
      return {
        paymentStatus: 'pending',
        orderStatus: 'pending',
        accessEffect: 'none',
        labelPtBr: 'Pendente',
      };
  }
}

/**
 * Valida a assinatura HMAC-SHA256 do webhook do Mercado Pago (x-signature).
 * Inclui janela anti-replay de 15 minutos e comparação em tempo constante.
 */
export async function verifyMercadoPagoWebhookSignature(params: {
  xSignature: string;
  dataId: string;
  secret: string;
  requestId?: string;
  nowEpochSeconds?: number;
}): Promise<boolean> {
  const { xSignature, dataId, secret, requestId = '', nowEpochSeconds } = params;
  if (!xSignature || !secret || !dataId) return false;

  let ts = '';
  let v1 = '';
  for (const part of xSignature.split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k === 'ts') ts = v;
    if (k === 'v1') v1 = v;
  }
  if (!ts || !v1) return false;

  const tsNum = Number.parseInt(ts, 10);
  const nowSec = nowEpochSeconds ?? Math.floor(Date.now() / 1000);
  if (!Number.isFinite(tsNum) || Math.abs(nowSec - tsNum) > 900) {
    return false;
  }

  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const normalizedId = dataId.toLowerCase();
    const manifests = [
      `id:${normalizedId};request-id:${requestId};ts:${ts};`,
      `id:${dataId};request-id:${requestId};ts:${ts};`,
      `id:${normalizedId};request-id:;ts:${ts};`,
    ];

    for (const manifest of manifests) {
      const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(manifest));
      const hex = Array.from(new Uint8Array(sigBuf), (b) => b.toString(16).padStart(2, '0')).join('');
      if (timingSafeEqual(hex, v1.toLowerCase())) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export interface VerifiedMercadoPagoPayment {
  paymentId: string;
  status: string;
  statusDetail?: string;
  transactionAmount: number;
  currencyId: string;
  externalReference: string;
  paymentMethodId?: string;
  dateApproved?: string | null;
  dateLastUpdated?: string | null;
}

export interface OrderDomainTarget {
  orderRef: string;
  activePaymentId?: string;
  kind: 'pack' | 'avulso' | 'vip' | 'custom';
  resourceId: string;
  title: string;
  expectedAmountCents: number;
  currency?: string;
  currentStatus: string;
  profileId?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
  expiresAt?: string | null; // Para packs com validade
  holdExpiresAt?: string | null; // Para Chamadas VIP (hold temporário)
  slotStillAvailable?: boolean; // Para Chamadas VIP quando hold expirou
  allowDownload?: boolean;
}

export interface PaymentProcessingDependencies {
  notifyApprovedOrder?: (target: OrderDomainTarget) => Promise<void>;
  loadOrderTarget: (externalReference: string) => Promise<OrderDomainTarget | null>;
  updateOrderState: (
    target: OrderDomainTarget,
    next: {
      financialStatus: CanonicalOrderFinancialStatus;
      operationalStatus?: string;
      paymentId: string;
      paymentMethod?: string;
      paidAt?: string | null;
      refundId?: string;
    }
  ) => Promise<void>;
  executeAutoRefund?: (
    paymentId: string,
    orderRef: string,
    amountCents: number
  ) => Promise<{ success: boolean; refundId?: string; error?: string }>;
}

export interface ProcessPaymentResult {
  processed: boolean;
  duplicate?: boolean;
  rejectedReason?: string;
  orderRef?: string;
  financialStatus?: CanonicalOrderFinancialStatus;
  accessAction?: 'granted' | 'revoked' | 'none';
  autoRefunded?: boolean;
}

/**
 * Processa um pagamento JÁ CONSULTADO na API oficial do Mercado Pago.
 * Garante invariantes 1, 2, 5, idempotência e estorno automático de pagamento tardio em VIP.
 */
export async function processVerifiedMercadoPagoPayment(
  env: NuaIdEnv,
  mp: VerifiedMercadoPagoPayment,
  deps: PaymentProcessingDependencies
): Promise<ProcessPaymentResult> {
  if (!mp.paymentId || !mp.externalReference) {
    return { processed: false, rejectedReason: 'payment_id ou external_reference ausente.' };
  }

  const mapping = mapMercadoPagoStatus(mp.status);
  const eventKey = `${mp.paymentId}:${mapping.paymentStatus}:${mp.dateLastUpdated || mp.status}`;

  // 1. Deduplicação estrita de eventos (webhook repetido não gera efeito duplicado)
  const dedupe = await recordPaymentEventOnce(env, {
    provider: 'mercadopago',
    eventKey,
    paymentId: mp.paymentId,
    payload: {
      status: mp.status,
      amount: mp.transactionAmount,
      currency: mp.currencyId,
      externalReference: mp.externalReference,
    },
  });

  if (dedupe.isDuplicate) {
    return {
      processed: false,
      duplicate: true,
      orderRef: mp.externalReference,
      financialStatus: mapping.orderStatus,
      accessAction: 'none',
    };
  }

  try {
  // 2. Carrega o pedido canônico no servidor (preço/dono nunca vêm do cliente)
  const target = await deps.loadOrderTarget(mp.externalReference);
  if (!target) {
    await recordCustomerAuditEvent(env, {
      profileId: null,
      action: 'payment_orphan_external_ref',
      details: { paymentId: mp.paymentId, externalReference: mp.externalReference, status: mp.status },
    });
    return { processed: false, rejectedReason: 'Pedido não encontrado para external_reference.' };
  }

  if (target.activePaymentId && String(target.activePaymentId) !== mp.paymentId) {
    return { processed: false, orderRef: target.orderRef, rejectedReason: 'A cobrança foi substituída.' };
  }

  // Resolve titularidade via claim caso profileId não esteja preenchido na linha legada
  let ownerProfileId = target.profileId || null;
  const existingClaim = !ownerProfileId ? await getOrderClaim(env, target.orderRef) : null;
  if (!ownerProfileId && existingClaim) {
    ownerProfileId = existingClaim.profileId;
  }

  // 3. Conferência obrigatória de moeda e valor contra o servidor (Invariante 2)
  const expectedCurrency = (target.currency || 'BRL').toUpperCase();
  const actualCurrency = String(mp.currencyId || 'BRL').toUpperCase();
  const paidAmountCents = Math.round(Number(mp.transactionAmount || 0) * 100);

  if (actualCurrency !== expectedCurrency) {
    await recordCustomerAuditEvent(env, {
      profileId: ownerProfileId,
      action: 'payment_currency_mismatch',
      details: { orderRef: target.orderRef, expectedCurrency, actualCurrency, paymentId: mp.paymentId },
    });
    return { processed: false, rejectedReason: `Moeda divergente (${actualCurrency} != ${expectedCurrency}).` };
  }

  if (mapping.accessEffect === 'grant' && paidAmountCents < target.expectedAmountCents) {
    await recordCustomerAuditEvent(env, {
      profileId: ownerProfileId,
      action: 'payment_amount_mismatch',
      details: {
        orderRef: target.orderRef,
        expectedAmountCents: target.expectedAmountCents,
        paidAmountCents,
        paymentId: mp.paymentId,
      },
    });
    return {
      processed: false,
      rejectedReason: `Valor pago (${paidAmountCents}) inferior ao valor do pedido (${target.expectedAmountCents}).`,
    };
  }

  // 4. Persiste estado oficial em `payments` com unicidade (provider, provider_payment_id)
  const paymentRecord = await upsertPaymentRecord(env, {
    orderRef: target.orderRef,
    provider: 'mercadopago',
    providerPaymentId: mp.paymentId,
    amountCents: paidAmountCents,
    currency: actualCurrency,
    status: mapping.paymentStatus,
    rawStatus: mp.status,
    paymentMethod: mp.paymentMethodId || 'pix',
    paidAt: mapping.paymentStatus === 'approved' ? (mp.dateApproved || new Date().toISOString()) : null,
  });

  const siteUrl = (env.NEXT_PUBLIC_SITE_URL || 'https://nuaborges.com.br').replace(/\/$/, '');
  const ownerProfile = ownerProfileId ? await getProfileById(env, ownerProfileId) : null;
  const recipientEmail = ownerProfile?.email || target.customerEmail || null;

  // 5. Tratamento de APROVAÇÃO
  if (mapping.accessEffect === 'grant') {
    // Caso especial Chamadas VIP: pagamento aprovado APÓS expiração do hold
    if (target.kind === 'vip' && target.holdExpiresAt) {
      const holdMs = new Date(target.holdExpiresAt).getTime();
      const approvedMs = mp.dateApproved ? Date.parse(mp.dateApproved) : NaN;
      const paidBeforeExpiry =
        Number.isFinite(approvedMs) && Number.isFinite(holdMs) && approvedMs <= holdMs;
      const holdExpired = Number.isFinite(holdMs) && Date.now() > holdMs && !paidBeforeExpiry;
      const slotLost =
        (holdExpired || (Number.isFinite(holdMs) && Date.now() > holdMs)) &&
        target.slotStillAvailable === false;
      const alreadyCancelled = target.currentStatus === 'cancelada' || target.currentStatus === 'cancelled';

      if (slotLost || (holdExpired && alreadyCancelled)) {
        let refundId: string | undefined;
        let autoRefunded = false;

        if (deps.executeAutoRefund) {
          const ref = await deps.executeAutoRefund(mp.paymentId, target.orderRef, paidAmountCents);
          if (ref.success) {
            refundId = ref.refundId;
            autoRefunded = true;
          }
        }

        if (paymentRecord) {
          await recordRefund(env, {
            paymentId: paymentRecord.id,
            orderRef: target.orderRef,
            providerRefundId: refundId,
            amountCents: paidAmountCents,
            status: autoRefunded ? 'approved' : 'pending_manual',
            reason: 'late_payment_hold_expired',
          });
          await upsertPaymentRecord(env, {
            orderRef: target.orderRef,
            provider: 'mercadopago',
            providerPaymentId: mp.paymentId,
            amountCents: paidAmountCents,
            currency: actualCurrency,
            status: autoRefunded ? 'refunded' : 'approved',
            rawStatus: autoRefunded ? 'refunded_late_hold' : mp.status,
            paymentMethod: mp.paymentMethodId || 'pix',
            paidAt: mp.dateApproved || new Date().toISOString(),
          });
        }

        await deps.updateOrderState(target, {
          financialStatus: autoRefunded ? 'refunded' : 'cancelled',
          operationalStatus: autoRefunded ? 'cancelada' : 'reembolso_pendente',
          paymentId: mp.paymentId,
          paymentMethod: mp.paymentMethodId || 'pix',
          refundId,
        });

        await recordCustomerAuditEvent(env, {
          profileId: ownerProfileId,
          action: 'vip_late_payment_auto_refund',
          details: { orderRef: target.orderRef, paymentId: mp.paymentId, autoRefunded, refundId },
        });

        if (recipientEmail) {
          const mail = renderTransactionalNotificationHtml({
            subject: 'Atualização sobre sua reserva',
            heading: 'Horário expirado — reembolso iniciado',
            message: autoRefunded
              ? 'Recebemos a confirmação do seu pagamento após o tempo limite da reserva temporária e o horário não estava mais disponível. O estorno integral foi iniciado automaticamente.'
              : 'Recebemos a confirmação do seu pagamento após o tempo limite da reserva. Nossa equipe já foi acionada para concluir o estorno integral ou reagendamento.',
            orderRef: target.orderRef,
            statusLabel: autoRefunded ? 'Reembolso automático iniciado' : 'Reembolso pendente',
            ctaUrl: `${siteUrl}/conta`,
            ctaLabel: 'Acompanhar em Minha Conta',
          });
          const res = await dispatchTransactionalEmail(env, { to: recipientEmail, ...mail });
          await recordNotificationEvent(env, {
            profileId: ownerProfileId,
            recipientEmail,
            orderRef: target.orderRef,
            kind: 'vip_late_payment_refund',
            status: res.sent ? 'sent' : 'failed',
            errorMessage: res.error,
          });
        }

        return {
          processed: true,
          orderRef: target.orderRef,
          financialStatus: autoRefunded ? 'refunded' : 'cancelled',
          accessAction: 'none',
          autoRefunded,
        };
      }
    }

    // Não reaprova pedidos já cancelados/reembolsados de outros serviços sem fluxo explícito
    if (
      target.kind !== 'vip' &&
      ['cancelled', 'cancelado', 'refunded', 'charged_back'].includes(
        String(target.currentStatus || '').toLowerCase()
      )
    ) {
      await recordCustomerAuditEvent(env, {
        profileId: ownerProfileId,
        action: 'payment_approved_on_cancelled_order',
        details: { orderRef: target.orderRef, paymentId: mp.paymentId },
      });
      return {
        processed: false,
        rejectedReason: 'Pedido já estava cancelado ou reembolsado.',
      };
    }

    // Atualiza pedido no domínio específico
    const operationalStatus =
      target.kind === 'vip'
        ? 'confirmada'
        : target.kind === 'custom'
          ? 'em_producao'
          : 'liberado';

    await deps.updateOrderState(target, {
      financialStatus: 'paid',
      operationalStatus,
      paymentId: mp.paymentId,
      paymentMethod: mp.paymentMethodId || 'pix',
      paidAt: mp.dateApproved || new Date().toISOString(),
    });

    // DEF-001 (P0): Checkout convidado aprovado via webhook precisa resolver/criar o perfil NUA ID,
    // registrar o claim idempotente e conceder o entitlement sem depender do retorno do navegador.
    let claimMethod: 'checkout_authenticated' | 'post_payment_email' = 'checkout_authenticated';
    if (!ownerProfileId && recipientEmail) {
      const cleanEmail = normalizeEmail(recipientEmail);
      if (isValidEmailStrict(cleanEmail)) {
        const createdProfile = await getOrCreateProfileByEmail(
          env,
          cleanEmail,
          target.customerName || undefined
        );
        if (!createdProfile?.id) {
          throw new Error(`Falha ao resolver/criar perfil pós-pagamento para o pedido ${target.orderRef}.`);
        }
        ownerProfileId = createdProfile.id;
        claimMethod = 'post_payment_email';
      }
    }

    // Vincula e concede entitlement de forma idempotente (nunca sobrescreve dono em caso de conflito)
    if (ownerProfileId) {
      const claimRes = await claimOrderForProfile(env, target.orderRef, ownerProfileId, claimMethod);
      if (claimRes.conflict) {
        await recordCustomerAuditEvent(env, {
          profileId: ownerProfileId,
          action: 'payment_claim_conflict_blocked',
          details: { orderRef: target.orderRef, paymentId: mp.paymentId },
        });
        const actualClaim = await getOrderClaim(env, target.orderRef);
        ownerProfileId = actualClaim?.profileId || null;
      } else if (!claimRes.ok) {
        throw new Error(`Falha ao vincular pedido ${target.orderRef} ao perfil do comprador.`);
      }

      if (ownerProfileId) {
        const granted = await grantEntitlement(env, {
          profileId: ownerProfileId,
          orderRef: target.orderRef,
          kind: target.kind,
          resourceId: target.resourceId,
          title: target.title,
          expiresAt: target.expiresAt || null, // Respeita validade real do módulo (não vira vitalício automaticamente)
          allowDownload: target.allowDownload ?? false,
        });
        if (!granted) {
          throw new Error(`Falha ao conceder direito de acesso para o pedido ${target.orderRef}.`);
        }
      }
    }

    await recordCustomerAuditEvent(env, {
      profileId: ownerProfileId,
      action: 'payment_approved_entitlement_granted',
      details: { orderRef: target.orderRef, paymentId: mp.paymentId, kind: target.kind },
    });

    if (target.kind === 'pack' || target.kind === 'avulso') {
      await notifyVaultDelivery(env, target.orderRef);
    } else if (deps.notifyApprovedOrder) {
      await deps.notifyApprovedOrder(target);
    }

    return {
      processed: true,
      orderRef: target.orderRef,
      financialStatus: 'paid',
      accessAction: 'granted',
    };
  }

  // 6. Tratamento de REVOGAÇÃO (refunded, charged_back, cancelled) — Invariante 5
  if (mapping.accessEffect === 'revoke') {
    const manualRefund = mapping.paymentStatus === 'refunded'
      ? await getNuaIdAdapter(env)?.kvGet<{ providerPaymentId?: string; state?: string }>(refundStateKey(target.orderRef))
      : null;
    const manualRefundTracked = manualRefund?.providerPaymentId === mp.paymentId
      && ['requested', 'processing', 'unknown_awaiting_reconciliation', 'refunded'].includes(manualRefund?.state || '');

    await revokeEntitlementsByOrder(env, target.orderRef, mapping.paymentStatus);

    if (!manualRefundTracked && (mapping.paymentStatus === 'refunded' || mapping.paymentStatus === 'charged_back') && paymentRecord) {
      await recordRefund(env, {
        paymentId: paymentRecord.id,
        orderRef: target.orderRef,
        amountCents: paidAmountCents || target.expectedAmountCents,
        status: mapping.paymentStatus,
        reason: mapping.paymentStatus,
      });
    }

    const operationalStatus =
      target.kind === 'vip'
        ? 'cancelada'
        : target.kind === 'custom'
          ? 'cancelado'
          : 'revogado';

    await deps.updateOrderState(target, {
      financialStatus: mapping.orderStatus,
      operationalStatus,
      paymentId: mp.paymentId,
      paymentMethod: mp.paymentMethodId || 'pix',
    });

    await recordCustomerAuditEvent(env, {
      profileId: ownerProfileId,
      action: `payment_${mapping.paymentStatus}_access_revoked`,
      details: { orderRef: target.orderRef, paymentId: mp.paymentId },
    });

    const wasPendingUnpaid = ['pending', 'aguardando_pagamento'].includes(
      String(target.currentStatus || '').toLowerCase()
    );
    const isUnpaidCancellation =
      wasPendingUnpaid && mapping.paymentStatus === 'cancelled';

    // Não envia e-mail enganoso de "acessos encerrados" para cobrança pendente que expirou/cancelou sem nunca ter sido paga
    if (recipientEmail && !isUnpaidCancellation && !manualRefundTracked) {
      const mail = renderTransactionalNotificationHtml({
        subject: 'Atualização financeira do seu pedido',
        heading:
          mapping.paymentStatus === 'refunded'
            ? 'Reembolso registrado'
            : mapping.paymentStatus === 'charged_back'
              ? 'Contestação registrada'
              : 'Pedido cancelado',
        message:
          'O status financeiro deste pedido foi atualizado e os acessos associados foram encerrados automaticamente.',
        orderRef: target.orderRef,
        statusLabel: mapping.labelPtBr,
        ctaUrl: `${siteUrl}/conta`,
        ctaLabel: 'Ver histórico em Minha Conta',
      });
      const res = await dispatchTransactionalEmail(env, { to: recipientEmail, ...mail });
      await recordNotificationEvent(env, {
        profileId: ownerProfileId,
        recipientEmail,
        orderRef: target.orderRef,
        kind: `payment_${mapping.paymentStatus}`,
        status: res.sent ? 'sent' : 'failed',
        errorMessage: res.error,
      });
    }

    return {
      processed: true,
      orderRef: target.orderRef,
      financialStatus: mapping.orderStatus,
      accessAction: 'revoked',
    };
  }

  // 7. Pendente ou Falhou: registra status, NUNCA concede acesso
  await deps.updateOrderState(target, {
    financialStatus: mapping.orderStatus,
    paymentId: mp.paymentId,
    paymentMethod: mp.paymentMethodId || 'pix',
  });

  if (mapping.paymentStatus === 'rejected' && recipientEmail) {
    const mail = renderTransactionalNotificationHtml({
      subject: 'Status do pagamento',
      heading: 'Pagamento não concluído',
      message: 'Não foi possível concluir o pagamento deste pedido. Você pode gerar uma nova tentativa na sua área privativa.',
      orderRef: target.orderRef,
      statusLabel: 'Falhou',
      ctaUrl: `${siteUrl}/conta`,
      ctaLabel: 'Acessar Minha Conta',
    });
    await dispatchTransactionalEmail(env, { to: recipientEmail, ...mail });
  }

  return {
    processed: true,
    orderRef: target.orderRef,
    financialStatus: mapping.orderStatus,
    accessAction: 'none',
  };
  } catch (err) {
    // Recuperabilidade (FIN-006): em falha transitória (banco/store), libera a trava de
    // deduplicação para permitir reprocessamento seguro pelo webhook retry ou reconciliação.
    await releasePaymentEvent(env, 'mercadopago', eventKey).catch(() => {});
    throw err;
  }
}
