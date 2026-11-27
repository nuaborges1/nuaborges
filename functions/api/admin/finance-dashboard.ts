import { getSupabaseClient, type SupabaseEnv } from '../_supabaseClient';
import { commercialFinanceReport, loadCommercialFinance } from '../_financeDashboard.mjs';

export async function onRequestGet({ request, env }: { request: Request; env: SupabaseEnv }) {
  const headers = { 'Cache-Control': 'private, no-store' };
  const supabase = getSupabaseClient(env);
  try {
    if (!supabase) throw new Error('Supabase indisponível');
    const ledger = await loadCommercialFinance(supabase);
    return Response.json(commercialFinanceReport(ledger, new URL(request.url).searchParams), { headers });
  } catch {
    return Response.json({ success: false, error: 'Financeiro indisponível. Tente novamente.' }, {
      status: 503, headers,
    });
  }
}
