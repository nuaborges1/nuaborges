import { resolveAdminOperator } from '../_authHelper';
import type { CentralActor } from './types';

export type AdminCapability =
  | 'business.manage'
  | 'business.billing.pay'
  | 'business.billing.read'
  | 'personal.preferences'
  | 'presence.update'
  | 'presence.read'
  | 'feedback.manage'
  | 'experiments.manage'
  | 'operations.control'
  | 'operations.billing'
  | 'operations.audit'
  | 'audit.append'
  | 'operations.telemetry'
  | 'media.list'
  | 'operations.media'
  | 'operations.reconcile'
  | 'payments.refund.inspect'
  | 'payments.refund.manage'
  | 'payments.refund.reconcile';

const nua = new Set<AdminCapability>([
  'business.manage', 'business.billing.read', 'business.billing.pay', 'personal.preferences', 'presence.update', 'audit.append',
  'payments.refund.inspect', 'payments.refund.manage', 'payments.refund.reconcile', 'media.list',
]);

const phdev = new Set<AdminCapability>([
  'personal.preferences', 'presence.read', 'feedback.manage', 'experiments.manage',
  'operations.control', 'operations.billing', 'operations.audit', 'audit.append', 'operations.telemetry',
  'media.list', 'operations.media', 'operations.reconcile', 'payments.refund.reconcile',
]);

// Scope of legacy server-to-server credentials. The monitor in the browser uses an operator session.
const consoleService = new Set<AdminCapability>([
  'operations.audit', 'operations.telemetry', 'media.list',
]);

export function hasAdminCapability(actor: CentralActor, capability: AdminCapability): boolean {
  if (actor.authMethod === 'master_key') return consoleService.has(capability);
  if (actor.authMethod === 'local_dev') return nua.has(capability);
  if (actor.authMethod === 'cron_secret') return capability === 'operations.reconcile';

  const profile = resolveAdminOperator({ sub: actor.subject, role: actor.role });
  if (profile === 'nua') return nua.has(capability);
  if (profile === 'phdev') return phdev.has(capability);
  return false;
}
