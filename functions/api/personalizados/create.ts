/**
 * Cloudflare Pages Function: POST /api/personalizados/create
 * 
 * Criação de Encomenda de Conteúdo Personalizado e Emissão de Pix Oficial.
 * Conectado diretamente ao PostgreSQL Supabase (personalizados_settings, personalizados_orders e orders).
 */

import {
  PersonalizadoOrder,
  PersonalizadosSettings,
  calculateOrderPrice,
} from '../../../lib/personalizadosCanonical';
import { recordAuditEvent } from '../_auditHelper';
import { createMercadoPagoPix } from '../_mercadopago';
import {
  getPersonalizadosSettingsFromSupabase,
  savePersonalizadoOrderToSupabase,
  saveOrderToSupabase,
} from '../_supabaseStore';

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  MP_ACCESS_TOKEN?: string;
  ENVIRONMENT?: string;
  [key: string]: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      clientName?: string;
      clientContact?: string;
      deliveryChannel?: 'whatsapp' | 'telegram' | 'vault';
      photoCount?: number;
      videoOptionId?: string;
      mentionName?: boolean;
      express24h?: boolean;
      briefing?: string;
    };

    const clientName = (body.clientName || '').trim();
    const clientContact = (body.clientContact || '').trim();
    const deliveryChannel = body.deliveryChannel || 'whatsapp';
    const photoCount = Math.max(0, Number(body.photoCount) || 0);
    const videoOptionId = body.videoOptionId || 'vid_none';
    const mentionName = Boolean(body.mentionName);
    const express24h = Boolean(body.express24h);
    const briefing = (body.briefing || '').trim();

    if (!clientName || !clientContact) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nome e canal de contato são obrigatórios.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Carrega configurações salvas no Supabase PostgreSQL
    const settings: PersonalizadosSettings = await getPersonalizadosSettingsFromSupabase(env);

    // 2. Preço calculado e validado estritamente no servidor
    const priceCalc = calculateOrderPrice(photoCount, videoOptionId, mentionName, express24h, settings);

    if (priceCalc.total <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Selecione pelo menos uma foto ou vídeo para encomendar.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const hex = Array.from(randomBytes, (b) => b.toString(16).padStart(2, '0')).join('');
    const orderId = `ped_${Date.now()}_${hex.slice(0, 8)}`;
    const publicToken = `tok_ped_${hex}`;
    const nowIso = new Date().toISOString();

    const shortId = orderId.replace('ped_', '').slice(-6).toUpperCase();
    const description = `Produção Gráfica e Edição Digital — REF: ${shortId}`;
    const authoritativePrice = Number(priceCalc.total);

    // 3. Geração do Pix Oficial via Mercado Pago
    let mpPix;
    try {
      mpPix = await createMercadoPagoPix(env, {
        amount: authoritativePrice,
        description: `Encomenda Personalizada #${shortId} — Nua Borges`,
        payerName: clientName,
        payerEmail: clientContact.includes('@') ? clientContact : 'contato@nuaborges.com.br',
        externalReference: `nua_pers_${orderId}`,
        notificationUrl: 'https://nuaborges.com.br/api/finance/webhook',
      });
    } catch (mpErr: any) {
      console.error('[Personalizados Create] Erro Mercado Pago:', mpErr);
      return new Response(
        JSON.stringify({
          success: false,
          error: mpErr?.message || 'Gateway de pagamento Pix momentaneamente indisponível. Tente novamente em instantes.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const pixPayload = mpPix?.qrCode || '';
    const pixQrCode = mpPix?.qrCodeBase64 || '';
    const transactionId = mpPix?.id ? String(mpPix.id) : '';

    if (!pixPayload) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Gateway de pagamento Pix não retornou o QR Code. Tente novamente em instantes.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const order: PersonalizadoOrder = {
      id: orderId,
      publicToken,
      createdAt: nowIso,
      updatedAt: nowIso,
      clientName,
      clientContact,
      deliveryChannel,
      photoCount,
      videoOptionId,
      videoDurationMinutes: priceCalc.selectedVideoOption?.durationMinutes || 0,
      mentionName,
      express24h,
      briefing,
      totalPrice: authoritativePrice,
      status: 'aguardando_pagamento',
      payment: {
        status: 'pending',
        method: 'pix',
        amount: authoritativePrice,
        pixPayload,
        pixQrCode,
        transactionId,
      },
      vaultFiles: [],
      adminNotes: '',
    };

    // 4. Salva no Supabase PostgreSQL (Tabela personalizados_orders)
    const saveRes = await savePersonalizadoOrderToSupabase(env, order);
    if (!saveRes.success) {
      console.error('[Personalizados Create] Falha ao salvar no Supabase:', saveRes.error);
      return new Response(
        JSON.stringify({ success: false, error: 'Falha ao registrar pedido no banco de dados.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Registra na tabela orders do Supabase para auditoria financeira unificada
    await saveOrderToSupabase(env, {
      id: orderId,
      purchaseToken: publicToken,
      packId: `personalizado_${photoCount}f`,
      amount: authoritativePrice,
      status: 'pending',
      customerEmail: clientContact.includes('@') ? clientContact : '',
      customerName: clientName,
      paymentId: transactionId,
      paymentMethod: 'mercadopago_pix',
      createdAt: nowIso,
      updatedAt: nowIso,
    }).catch((oErr: any) => console.warn('[Personalizados Create] Aviso ao registrar order:', oErr));

    // 6. Auditoria
    recordAuditEvent(env, request, {
      type: 'PAYMENT_PIX_GENERATED' as any,
      summary: `Novo pedido de conteúdo personalizado criado: ${orderId} (${photoCount} fotos) por ${clientName}`,
      details: { orderId, clientName, photoCount, total: authoritativePrice },
    }).catch(() => {});

    return new Response(
      JSON.stringify({
        success: true,
        order,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Personalizados Create API Error]:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno ao gerar pedido personalizado.', details: error?.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
