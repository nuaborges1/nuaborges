/**
 * Cloudflare Pages Function: /api/finance/installments
 *
 * GET: Retorna a listagem das 10 parcelas do contrato Nua Borges,
 * indicando a parcela atual, status de pagamento e resumo financeiro.
 * Persistência 100% Supabase PostgreSQL.
 */

import {
  calculateFinanceSummary,
} from '../../../lib/financeCanonical';
import { getFinanceInstallments } from './_financeStore';

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  [key: string]: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestGet = async (context: PagesContext<Env>) => {
  const { env } = context;

  try {
    const installments = await getFinanceInstallments(env);
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
