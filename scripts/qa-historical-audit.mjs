/**
 * NUA BORGES — Read-Only Historical Data Consistency Audit (Section 15)
 *
 * STRICTLY READ-ONLY: NEVER mutates, writes, updates, or deletes any database record.
 * Analyzes a snapshot of domain tables (`orders`, `personalizados_orders`, `appointments`,
 * `entitlements`, `order_claims`, `pending_vault_mail`, `payment_events`) to detect
 * historical inconsistencies caused by DEF-001, DEF-002, DEF-005, or DEF-006 and generates
 * an idempotent, human-approved reconciliation plan.
 *
 * Usage:
 *   node scripts/qa-historical-audit.mjs --snapshot path/to/snapshot.json [--out path/to/report.json]
 *   node scripts/qa-historical-audit.mjs --self-check
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const VALID_PERSONALIZADO_STATUSES = new Set([
  'aguardando_pagamento',
  'em_producao',
  'pronto',
  'entregue',
  'cancelado',
]);

export const PAID_ORDER_STATUSES = new Set(['paid', 'approved', 'pago', 'liberado']);

/**
 * Pure, side-effect-free historical consistency analyzer.
 */
export function analyzeHistoricalConsistency(snapshot = {}) {
  const orders = Array.isArray(snapshot.orders) ? snapshot.orders : [];
  const personalizados = Array.isArray(snapshot.personalizados_orders) ? snapshot.personalizados_orders : [];
  const appointments = Array.isArray(snapshot.appointments) ? snapshot.appointments : [];
  const claims = Array.isArray(snapshot.order_claims) ? snapshot.order_claims : [];
  const entitlements = Array.isArray(snapshot.entitlements) ? snapshot.entitlements : [];
  const pendingVaultMail = Array.isArray(snapshot.pending_vault_mail) ? snapshot.pending_vault_mail : [];
  const paymentEvents = Array.isArray(snapshot.payment_events) ? snapshot.payment_events : [];

  const ordersById = new Map(orders.map((o) => [String(o.id), o]));
  const claimsByOrder = new Map();
  for (const c of claims) {
    const ref = String(c.orderRef || c.order_ref || '');
    if (!ref) continue;
    if (!claimsByOrder.has(ref)) claimsByOrder.set(ref, []);
    claimsByOrder.get(ref).push(c);
  }
  const activeEntitlementByOrder = new Set(
    entitlements
      .filter((e) => !e.revokedAt && !e.revoked_at)
      .map((e) => String(e.orderRef || e.order_ref || ''))
      .filter(Boolean)
  );

  const findings = {
    paidPacksWithoutClaimOrEntitlement: [],
    divergentPersonalizadosOrdersMirror: [],
    divergentVipOrdersMirror: [],
    vipCancelledWithPendingPayment: [],
    invalidPersonalizadoStatusesOrUnpaidDelivery: [],
    stuckPendingVaultMailJobs: [],
    duplicateClaimsOrPaymentEvents: [],
  };

  // 1. DEF-001 fallout: Paid pack/avulso orders missing claim or active entitlement
  for (const order of orders) {
    const id = String(order.id || '');
    const status = String(order.status || '').toLowerCase();
    const isPackOrder = id.startsWith('ord_');
    if (isPackOrder && PAID_ORDER_STATUSES.has(status)) {
      const hasClaim = (claimsByOrder.get(id)?.length || 0) > 0;
      const hasEntitlement = activeEntitlementByOrder.has(id);
      if (!hasClaim || !hasEntitlement) {
        findings.paidPacksWithoutClaimOrEntitlement.push({
          orderId: id,
          customerEmail: order.customer_email || order.customerEmail || null,
          missingClaim: !hasClaim,
          missingEntitlement: !hasEntitlement,
          recommendedAction:
            'Reprocess via idempotent _paymentEngine reconciliation (resolve/create profile by customer_email, claimOrderForProfile, grantEntitlement, notifyVaultDelivery).',
        });
      }
    }
  }

  // 2. DEF-005 & DEF-006 fallout: Personalizados status validity + orders mirror divergence
  for (const pers of personalizados) {
    const id = String(pers.id || '');
    const status = String(pers.status || '');
    const payStatus = String(pers.payment?.status || 'pending').toLowerCase();
    const mirror = ordersById.get(id);

    if (!VALID_PERSONALIZADO_STATUSES.has(status)) {
      findings.invalidPersonalizadoStatusesOrUnpaidDelivery.push({
        orderId: id,
        issue: 'INVALID_STATUS',
        currentStatus: status,
        paymentStatus: payStatus,
        recommendedAction:
          'Map legacy/invalid status to canonical PersonalizadoOrderStatus after verifying payment status.',
      });
    } else if (['em_producao', 'pronto', 'entregue'].includes(status) && payStatus !== 'approved') {
      findings.invalidPersonalizadoStatusesOrUnpaidDelivery.push({
        orderId: id,
        issue: 'UNPAID_PRODUCTION_OR_DELIVERY',
        currentStatus: status,
        paymentStatus: payStatus,
        recommendedAction:
          'Verify payment directly in Mercado Pago API; if unpaid, block delivery and review operational status.',
      });
    }

    if (mirror) {
      const mirrorStatus = String(mirror.status || '').toLowerCase();
      const expectedMirror =
        payStatus === 'approved'
          ? 'paid'
          : payStatus === 'refunded'
            ? 'refunded'
            : payStatus === 'rejected'
              ? 'cancelled'
              : 'pending';
      if (mirrorStatus !== expectedMirror) {
        findings.divergentPersonalizadosOrdersMirror.push({
          orderId: id,
          domainPaymentStatus: payStatus,
          ordersMirrorStatus: mirrorStatus,
          expectedMirrorStatus: expectedMirror,
          recommendedAction: `Synchronize orders.status for ${id} from '${mirrorStatus}' to '${expectedMirror}'.`,
        });
      }
    }
  }

  // 3. DEF-005 fallout: VIP bookings mirror divergence + cancelled bookings with payment.status === 'pending'
  for (const apt of appointments) {
    const id = String(apt.id || '');
    const status = String(apt.status || '');
    const payStatus = String(apt.payment?.status || 'pending').toLowerCase();
    const mirror = ordersById.get(id);

    if (status === 'cancelada' && payStatus === 'pending') {
      findings.vipCancelledWithPendingPayment.push({
        bookingId: id,
        appointmentStatus: status,
        paymentStatus: payStatus,
        recommendedAction:
          'Verify payment in Mercado Pago API; if cancelled/expired, update appointment.payment.status to rejected and orders.status to cancelled.',
      });
    }

    if (mirror) {
      const mirrorStatus = String(mirror.status || '').toLowerCase();
      const expectedMirror =
        payStatus === 'approved' || payStatus === 'manual_confirmed'
          ? 'paid'
          : payStatus === 'refunded'
            ? 'refunded'
            : payStatus === 'rejected'
              ? 'cancelled'
              : 'pending';
      if (mirrorStatus !== expectedMirror) {
        findings.divergentVipOrdersMirror.push({
          bookingId: id,
          domainPaymentStatus: payStatus,
          ordersMirrorStatus: mirrorStatus,
          expectedMirrorStatus: expectedMirror,
          recommendedAction: `Synchronize orders.status for ${id} from '${mirrorStatus}' to '${expectedMirror}'.`,
        });
      }
    }
  }

  // 4. DEF-002 fallout: Pending vault mail jobs stuck overdue
  const nowMs = Date.now();
  for (const job of pendingVaultMail) {
    const nextMs = Number(job.next || 0);
    if (nextMs <= nowMs) {
      findings.stuckPendingVaultMailJobs.push({
        orderId: String(job.order || job.orderRef || ''),
        attempts: Number(job.attempts || 0),
        overdueMs: Math.max(0, nowMs - nextMs),
        recommendedAction:
          'Execute authenticated POST /api/cron/appointment-reminders (runs retryVaultMail) after verifying SMTP health.',
      });
    }
  }

  // 5. Duplicate claims or duplicate payment event keys
  for (const [orderRef, list] of claimsByOrder.entries()) {
    if (list.length > 1) {
      findings.duplicateClaimsOrPaymentEvents.push({
        type: 'duplicate_order_claim',
        key: orderRef,
        count: list.length,
        recommendedAction: 'Audit original buyer profile and deduplicate order_claims safely.',
      });
    }
  }
  const eventKeyCounts = new Map();
  for (const ev of paymentEvents) {
    const k = `${ev.provider || 'mercadopago'}:${ev.eventKey || ev.event_key || ''}`;
    eventKeyCounts.set(k, (eventKeyCounts.get(k) || 0) + 1);
  }
  for (const [key, count] of eventKeyCounts.entries()) {
    if (count > 1) {
      findings.duplicateClaimsOrPaymentEvents.push({
        type: 'duplicate_payment_event',
        key,
        count,
        recommendedAction: 'Verify UNIQUE(provider, event_key) constraint on payment_events.',
      });
    }
  }

  const totalInconsistencies = Object.values(findings).reduce((sum, arr) => sum + arr.length, 0);

  return {
    mode: 'READ_ONLY_AUDIT',
    mutatedProduction: false,
    generatedAt: new Date().toISOString(),
    scannedCounts: {
      orders: orders.length,
      personalizados_orders: personalizados.length,
      appointments: appointments.length,
      order_claims: claims.length,
      entitlements: entitlements.length,
      pending_vault_mail: pendingVaultMail.length,
      payment_events: paymentEvents.length,
    },
    totalInconsistencies,
    healthy: totalInconsistencies === 0,
    findings,
  };
}

function runCli() {
  const args = process.argv.slice(2);
  if (args.includes('--self-check')) {
    const sample = analyzeHistoricalConsistency({
      orders: [{ id: 'ord_clean_1', status: 'paid', customer_email: 'ok@qa.test' }],
      order_claims: [{ orderRef: 'ord_clean_1', profileId: 'prof_1' }],
      entitlements: [{ orderRef: 'ord_clean_1', profileId: 'prof_1', revokedAt: null }],
    });
    console.log(JSON.stringify(sample, null, 2));
    process.exit(sample.healthy ? 0 : 1);
  }

  const snapIdx = args.indexOf('--snapshot');
  if (snapIdx === -1 || !args[snapIdx + 1]) {
    console.error(
      'Usage: node scripts/qa-historical-audit.mjs --snapshot <snapshot.json> [--out <report.json>] | --self-check'
    );
    console.error('Note: Strictly READ-ONLY. Never connects to or mutates production databases directly.');
    process.exit(2);
  }

  const snapshotPath = path.resolve(process.cwd(), args[snapIdx + 1]);
  const raw = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  const report = analyzeHistoricalConsistency(raw);

  const outIdx = args.indexOf('--out');
  if (outIdx !== -1 && args[outIdx + 1]) {
    const outPath = path.resolve(process.cwd(), args[outIdx + 1]);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  }

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.healthy ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
