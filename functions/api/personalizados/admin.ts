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
  validatePersonalizadoStatusTransition,
} from '../../../lib/personalizadosCanonical';
import {
  getPersonalizadosSettingsFromSupabase,
  savePersonalizadosSettingsToSupabase,
  listPersonalizadosOrdersFromSupabase,
  getPersonalizadoOrderFromSupabase,
  savePersonalizadoOrderToSupabase,
} from '../_supabaseStore';
import {
  claimOrderForProfile,
  getOrCreateProfileByEmail,
  getOrderClaim,
  grantEntitlement,
} from '../id/_nuaIdStore';
import { privatePath } from '../me/_vault';
import { notifyVaultDelivery } from '../me/_vaultMail';

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
      JSON.stringify({ success: false, error: 'Erro ao carregar dados de personalizados.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  try {
    const body = await request.json().catch(() => ({}));
    const { action } = body;

    // 1. Salvar configurações de preços da calculadora (NUA-AUD-012: valida limites numéricos positivos)
    if (action === 'save_settings') {
      const { settings } = body;
      if (!settings || typeof settings !== 'object') {
        return new Response(
          JSON.stringify({ success: false, error: 'Configurações inválidas.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const priceFields = [
        'basePhotoPrice',
        'pricePerPhoto',
        'baseVideoPrice',
        'pricePerVideoMinute',
        'minimumOrderPrice',
        'expressFee',
      ];
      for (const field of priceFields) {
        if (field in settings && settings[field] !== undefined && settings[field] !== null) {
          const val = Number(settings[field]);
          if (!Number.isFinite(val) || val < 0 || val > 50000) {
            return new Response(
              JSON.stringify({
                success: false,
                error: `Valor inválido para o campo ${field}. Informe um valor entre R$ 0 e R$ 50.000.`,
              }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }
      }

      const res = await savePersonalizadosSettingsToSupabase(env, settings);
      if (!res.success) {
        return new Response(
          JSON.stringify({ success: false, error: 'Não foi possível salvar as configurações. Tente novamente em instantes.' }),
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
          JSON.stringify({ success: false, error: 'Dados incompletos para atualizar o pedido.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const order = await getPersonalizadoOrderFromSupabase(env, orderId);
      if (!order) {
        return new Response(
          JSON.stringify({ success: false, error: 'Pedido não encontrado.' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Allowlist estrita de campos editáveis no admin (impede mutação acidental de id/publicToken/payment/totalPrice)
      const safePatch: Partial<PersonalizadoOrder> = {};
      if ('status' in patch && patch.status !== undefined) {
        const transition = validatePersonalizadoStatusTransition(order, patch.status);
        if (!transition.valid) {
          return new Response(
            JSON.stringify({
              success: false,
              code: transition.code,
              error: transition.error || 'Transição de status inválida.',
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        safePatch.status = patch.status as PersonalizadoOrder['status'];
      }
      if (Array.isArray(patch?.vaultFiles)) {
        const normalizedFiles: NonNullable<PersonalizadoOrder['vaultFiles']> = [];
        for (const f of patch.vaultFiles) {
          const canonical = privatePath(f?.url, env.NEXT_PUBLIC_SITE_URL);
          if (!canonical) {
            return Response.json(
              {
                success: false,
                error:
                  'Apenas mídias privadas do Cofre (/media/private/...) podem ser anexadas a pedidos personalizados. URLs públicas ou externas não são permitidas.',
              },
              { status: 400 }
            );
          }
          normalizedFiles.push({
            ...f,
            url: `/media/${canonical}`,
          });
        }
        safePatch.vaultFiles = normalizedFiles;
      }
      if (typeof patch?.adminNotes === 'string') safePatch.adminNotes = patch.adminNotes;
      if (typeof patch?.deliveredAt === 'string') safePatch.deliveredAt = patch.deliveredAt;

      const updatedOrder: PersonalizadoOrder = {
        ...order,
        ...safePatch,
        updatedAt: new Date().toISOString(),
      };

      // Exige arquivos privados no Cofre apenas quando o canal de entrega é 'vault' (libera finalização de entregas via Telegram)
      const requiresVaultFiles = updatedOrder.deliveryChannel === 'vault';
      if (
        requiresVaultFiles &&
        ['pronto', 'entregue'].includes(updatedOrder.status) &&
        (!updatedOrder.vaultFiles?.length ||
          updatedOrder.vaultFiles.some((f) => !privatePath(f?.url, env.NEXT_PUBLIC_SITE_URL)))
      ) {
        return Response.json(
          { success: false, error: 'Adicione arquivos privados ao Cofre (/media/private/...) antes de liberar a entrega.' },
          { status: 400 }
        );
      }
      const saveRes = await savePersonalizadoOrderToSupabase(env, updatedOrder);
      if (!saveRes.success) {
        return new Response(
          JSON.stringify({ success: false, error: 'Não foi possível atualizar o pedido. Tente novamente em instantes.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Sincroniza entrega com a conta NUA ID do cliente (incluindo compradores visitantes via e-mail) quando pronto/entregue
      if (
        updatedOrder.payment?.status === 'approved' &&
        requiresVaultFiles &&
        updatedOrder.vaultFiles?.length &&
        ['pronto', 'entregue'].includes(updatedOrder.status)
      ) {
        try {
          let claim = await getOrderClaim(env as any, updatedOrder.id);
          if (!claim?.profileId) {
            const candidateEmail = updatedOrder.clientContact?.includes('@')
              ? updatedOrder.clientContact.trim().toLowerCase()
              : '';
            if (candidateEmail) {
              const profile = await getOrCreateProfileByEmail(env as any, candidateEmail, updatedOrder.clientName);
              if (profile?.id) {
                await claimOrderForProfile(env as any, updatedOrder.id, profile.id, 'post_payment_email');
                claim = {
                  orderRef: updatedOrder.id,
                  profileId: profile.id,
                  claimedAt: new Date().toISOString(),
                  method: 'post_payment_email',
                };
              }
            }
          }
          if (claim?.profileId) {
            await grantEntitlement(env as any, {
              profileId: claim.profileId,
              orderRef: updatedOrder.id,
              kind: 'custom',
              resourceId: updatedOrder.id,
              title: `Personalizado (${updatedOrder.photoCount} fotos)`,
              expiresAt: null,
              allowDownload: true,
            });
            await notifyVaultDelivery(env, updatedOrder.id);
          }
        } catch {}
      }

      return new Response(
        JSON.stringify({ success: true, order: updatedOrder }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Ação não reconhecida.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Personalizados Admin API Error]:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Não foi possível concluir a ação. Tente novamente em instantes.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
