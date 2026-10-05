/**
 * Cloudflare Pages Function: /api/finance/installments
 *
 * GET: Retorna a listagem das 10 parcelas do contrato Nua Borges,
 * indicando a parcela atual, status de pagamento e resumo financeiro.
 */

import {
  FinancialInstallment,
  getDefaultInstallments,
  calculateFinanceSummary,
  KV_FINANCE_KEY,
} from '../../../lib/financeCanonical';

interface Env {
  NUA_CONTENT?: any;
  CONTENT_KV?: any;
  ADMIN_PASSWORD?: string;
  ADMIN_API_SECRET?: string;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

// Fallback em memória para desenvolvimento local isolado
let memoryInstallments: FinancialInstallment[] | null = null;

export const onRequestGet = async (context: PagesContext<Env>) => {
  const { env } = context;
  const kv = env.NUA_CONTENT || env.CONTENT_KV;

  try {
    let installments: FinancialInstallment[] = [];

    if (kv && typeof kv.get === 'function') {
      const stored = await kv.get(KV_FINANCE_KEY);
      if (stored) {
        try {
          installments = JSON.parse(stored);
        } catch {
          installments = [];
        }
      }

      // Se ainda não houver parcelas persistidas no KV, inicializa com o padrão canônico
      if (!installments || installments.length === 0) {
        installments = getDefaultInstallments();
        await kv.put(KV_FINANCE_KEY, JSON.stringify(installments));
      }
    } else {
      // Ambiente local sem KV ativo
      if (!memoryInstallments) {
        memoryInstallments = getDefaultInstallments();
      }
      installments = memoryInstallments;
    }

    // Garante que a 1ª parcela esteja confirmada como paga em 05/10/2026
    const p1 = installments.find((p) => p.number === 1);
    if (p1 && p1.status !== 'paid') {
      p1.status = 'paid';
      p1.paidAt = '2026-10-05T11:00:00-03:00';
      p1.paidAmount = 200;
      p1.paymentMethod = 'pix';
      p1.paymentId = 'PIX-NUA-20261005-001';
      if (kv && typeof kv.put === 'function') {
        await kv.put(KV_FINANCE_KEY, JSON.stringify(installments));
      }
    }

    const summary = calculateFinanceSummary(installments);

    return new Response(
      JSON.stringify({
        success: true,
        installments,
        summary,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Erro ao carregar dados financeiros.',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
