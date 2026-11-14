/**
 * Cloudflare Pages Function: /api/personalizados/admin
 * 
 * Gestão de Pedidos e Configurações da Calculadora para o Painel da Nua Borges.
 * Totalmente integrado ao PostgreSQL Supabase (personalizados_settings e personalizados_orders).
 */

import {
  PersonalizadoOrder,
  PersonalizadosSettings,
  DEFAULT_PERSONALIZADOS_SETTINGS,
} from '../../../lib/personalizadosCanonical';
import {
  getPersonalizadosSettingsFromSupabase,
  savePersonalizadosSettingsToSupabase,
  listPersonalizadosOrdersFromSupabase,
  getPersonalizadoOrderFromSupabase,
  savePersonalizadoOrderToSupabase,
} from '../_supabaseStore';

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  ADMIN_TOKEN?: string;
  [key: string]: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestGet = async (context: PagesContext<Env>) => {
  const { env } = context;

  try {
    // 1. Carrega configurações oficiais diretamente do Supabase PostgreSQL
    const settings: PersonalizadosSettings = await getPersonalizadosSettingsFromSupabase(env);

    // 2. Carrega lista real de encomendas da tabela personalizados_orders do Supabase
    const orders: PersonalizadoOrder[] = await listPersonalizadosOrdersFromSupabase(env, { limit: 100 });

    return new Response(
      JSON.stringify({
        success: true,
        settings,
        orders,
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
    console.error('[Personalizados Admin GET Error]:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro ao carregar dados de personalizados.', details: err?.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  try {
    const body = await request.json().catch(() => ({}));
    const { action } = body;

    // 1. Salvar configurações de preços da calculadora
    if (action === 'save_settings') {
      const { settings } = body;
      if (!settings) {
        return new Response(
          JSON.stringify({ success: false, error: 'Configurações inválidas.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const res = await savePersonalizadosSettingsToSupabase(env, settings);
      if (!res.success) {
        return new Response(
          JSON.stringify({ success: false, error: res.error || 'Falha ao salvar configurações no Supabase.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, settings }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Atualizar status, mídias do cofre ou notas de um pedido
    if (action === 'update_order') {
      const { orderId, patch } = body;
      if (!orderId || !patch) {
        return new Response(
          JSON.stringify({ success: false, error: 'orderId e patch obrigatórios.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const order = await getPersonalizadoOrderFromSupabase(env, orderId);
      if (!order) {
        return new Response(
          JSON.stringify({ success: false, error: 'Pedido não encontrado no banco de dados.' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const updatedOrder: PersonalizadoOrder = {
        ...order,
        ...patch,
        updatedAt: new Date().toISOString(),
      };

      const saveRes = await savePersonalizadoOrderToSupabase(env, updatedOrder);
      if (!saveRes.success) {
        return new Response(
          JSON.stringify({ success: false, error: saveRes.error || 'Falha ao atualizar pedido no Supabase.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, order: updatedOrder }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: `Ação desconhecida: ${action}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Personalizados Admin API Error]:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro ao processar requisição administrativa.', details: error?.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
