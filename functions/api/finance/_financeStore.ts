/**
 * Finance Store — Persistência 100% Supabase PostgreSQL
 * 
 * Elimina toda dependência de Cloudflare Workers KV para a gestão financeira do contrato.
 */

import {
  FinancialInstallment,
  getDefaultInstallments,
  generateReceiptHash,
  KV_FINANCE_KEY,
} from '../../../lib/financeCanonical';
import {
  getSystemKVFromSupabase,
  setSystemKVInSupabase,
} from '../_supabaseStore';

let memoryInstallments: FinancialInstallment[] | null = null;

export async function getFinanceInstallments(env: any): Promise<FinancialInstallment[]> {
  const data = await getSystemKVFromSupabase(env, KV_FINANCE_KEY);
  if (Array.isArray(data) && data.length === 10) {
    return data;
  }
  if (!memoryInstallments) {
    memoryInstallments = getDefaultInstallments();
  }
  // Garante que a 1ª parcela esteja paga
  const p1 = memoryInstallments.find((p) => p.number === 1);
  if (p1 && p1.status !== 'paid') {
    p1.status = 'paid';
    p1.paidAt = '2026-10-05T11:00:00-03:00';
    p1.paidAmount = 200;
    p1.paymentMethod = 'pix';
    p1.paymentId = 'PIX-NUA-20261005-001';
    p1.receiptHash = generateReceiptHash(p1);
  }

  await setSystemKVInSupabase(env, KV_FINANCE_KEY, memoryInstallments, 'FinanceStore');
  return memoryInstallments;
}

export async function saveFinanceInstallments(
  env: any,
  installments: FinancialInstallment[]
): Promise<void> {
  memoryInstallments = installments;
  await setSystemKVInSupabase(env, KV_FINANCE_KEY, installments, 'FinanceStore');
}
