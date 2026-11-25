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
import { claimOrderForProfile } from '../id/_nuaIdStore';
import { getClientIp, getIdSecret, resolveCustomerSession } from '../id/_customerGuard';
import { hashClientIp } from '../id/_crypto';
import { checkAndConsumeRateLimit } from '../id/_rateLimiter';
import { verifyTurnstileToken } from '../id/_turnstile';
import {
  computePixExpiration,
  createMercadoPagoPix,
  PERSONALIZADO_PIX_EXPIRATION_MS,
} from '../_mercadopago';
import { GUEST_CHECKOUT_ENABLED } from '../../../lib/featureFlags';
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
      turnstileToken?: string;
    };

    const customerCtx = await resolveCustomerSession(request, env);
    if (!customerCtx && !GUEST_CHECKOUT_ENABLED) {
      return Response.json({ success: false, error: 'Entre na sua conta para continuar.' }, { status: 401 });
    }
    const clientName = (body.clientName || '').trim();
    const clientContact = (body.clientContact || '').trim();
    const rawChannel = String(body.deliveryChannel || 'vault').trim().toLowerCase();
    const deliveryChannel: 'telegram' | 'vault' = rawChannel === 'telegram' ? 'telegram' : 'vault';
    const rawPhotoCount = Number(body.photoCount ?? 0);
    if (!Number.isInteger(rawPhotoCount) || rawPhotoCount < 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Quantidade de fotos deve ser um número inteiro válido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const photoCount = rawPhotoCount;
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

    if (deliveryChannel === 'vault' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientContact)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Informe um e-mail válido para receber o acesso após a confirmação do pagamento.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const clientIp = getClientIp(request);
    const turnstile = await verifyTurnstileToken(env, body.turnstileToken, clientIp, request.url);
    if (!turnstile.success) {
      return new Response(
        JSON.stringify({ success: false, error: turnstile.error || 'Conclua a verificação de segurança e tente novamente.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const { getIpHashSecret } = await import('../_central/secrets');
    const ipHash = await hashClientIp(clientIp, getIdSecret(env) || getIpHashSecret(env as any));
    const rateLimit = await checkAndConsumeRateLimit(env, `personalizado_create:${ipHash}`, 6, 600);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ success: false, error: 'Muitas tentativas de encomenda. Aguarde alguns minutos e tente novamente.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }

    // 1. Carrega configurações salvas no Supabase PostgreSQL
    const settings: PersonalizadosSettings = await getPersonalizadosSettingsFromSupabase(env);

    if (settings.enabled === false) {
      return new Response(
        JSON.stringify({ success: false, error: 'As encomendas personalizadas estão temporariamente pausadas.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (photoCount > 0 && (photoCount < settings.minPhotos || photoCount > settings.maxPhotos)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `A quantidade de fotos deve estar entre ${settings.minPhotos} e ${settings.maxPhotos}.`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const effectiveVideoOptionId = settings.videoEnabled === false ? 'vid_none' : videoOptionId;

    // 2. Preço calculado e validado estritamente no servidor
    const priceCalc = calculateOrderPrice(photoCount, effectiveVideoOptionId, mentionName, express24h, settings);

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

    const order: PersonalizadoOrder = {
      id: orderId,
      publicToken,
      createdAt: nowIso,
      updatedAt: nowIso,
      clientName,
      clientContact,
      deliveryChannel,
      photoCount,
      videoOptionId: effectiveVideoOptionId,
      videoDurationMinutes: settings.videoEnabled === false ? 0 : (priceCalc.selectedVideoOption?.durationMinutes || 0),
      mentionName,
      express24h,
      briefing,
      totalPrice: authoritativePrice,
      status: 'aguardando_pagamento',
      payment: {
        status: 'pending',
        method: 'pix',
        amount: authoritativePrice,
      },
      vaultFiles: [],
      adminNotes: '',
    };

    // 3. Pré-persiste o pedido no Supabase ANTES de gerar o Pix (AUD-PRE-009: evita cobrança órfã sem pedido)
    const initialSaveRes = await savePersonalizadoOrderToSupabase(env, order);
    if (!initialSaveRes.success) {
      console.error('[Personalizados Create] Falha ao pré-registrar pedido no Supabase:', initialSaveRes.error);
      return new Response(
        JSON.stringify({ success: false, error: 'Falha ao registrar pedido no banco de dados.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Geração do Pix Oficial via Mercado Pago — prazo de 2 horas
    const pixExpiry = computePixExpiration(PERSONALIZADO_PIX_EXPIRATION_MS);
    let mpPix;
    try {
      mpPix = await createMercadoPagoPix(env, {
        amount: authoritativePrice,
        description: `Encomenda Personalizada #${shortId} — Nua Borges`,
        payerName: clientName,
        payerEmail: clientContact.includes('@') ? clientContact : 'contato@nuaborges.com.br',
        externalReference: `nua_pers_${orderId}`,
        dateOfExpiration: pixExpiry.mpDateOfExpiration,
      });
    } catch (mpErr: any) {
      console.error('[Personalizados Create] Erro Mercado Pago:', mpErr);
      order.adminNotes = 'Falha ao confirmar emissão do Pix no gateway; manter para conciliação segura.';
      order.updatedAt = new Date().toISOString();
      await savePersonalizadoOrderToSupabase(env, order).catch(() => {});
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

    const mpExpiresMs = mpPix.expiresAt ? Date.parse(mpPix.expiresAt) : NaN;
    const resolvedExpiresAt = Number.isFinite(mpExpiresMs)
      ? new Date(mpExpiresMs).toISOString()
      : pixExpiry.isoUtc;

    order.payment = {
      status: 'pending',
      method: 'pix',
      amount: authoritativePrice,
      pixPayload,
      pixQrCode,
      expiresAt: resolvedExpiresAt,
      transactionId,
    };
    order.updatedAt = new Date().toISOString();

    // 4.1 Atualiza no Supabase PostgreSQL com os dados do Pix gerado
    const saveRes = await savePersonalizadoOrderToSupabase(env, order);
    if (!saveRes.success) {
      console.error('[Personalizados Create] Pix gerado, mas falha ao atualizar pedido no Supabase:', saveRes.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'O Pix foi gerado, mas houve falha temporária ao salvar os dados de pagamento. Não pague novamente; recarregue seu pedido ou fale com o suporte.',
          orderId,
          publicToken,
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Resolve sessão NUA ID antes de salvar em orders para preservar customerEmail real

    const resolvedEmail =
      (customerCtx?.profile?.email || '').trim().toLowerCase() ||
      (clientContact.includes('@') ? clientContact.trim().toLowerCase() : '');

    // Registra na tabela orders do Supabase para auditoria financeira unificada
    await saveOrderToSupabase(env, {
      id: orderId,
      purchaseToken: publicToken,
      packId: `personalizado_${photoCount}f`,
      amount: authoritativePrice,
      status: 'pending',
      customerEmail: resolvedEmail,
      customerName: clientName,
      paymentId: transactionId,
      paymentMethod: 'mercadopago_pix',
      expiresAt: resolvedExpiresAt,
      createdAt: nowIso,
      updatedAt: nowIso,
    }).catch((oErr: any) => console.warn('[Personalizados Create] Aviso ao registrar order:', oErr));

    // 5.1 Vínculo automático com a conta NUA ID autenticada (se houver sessão ativa)
    try {
      if (customerCtx?.profile?.id) {
        await claimOrderForProfile(env as any, orderId, customerCtx.profile.id, 'checkout_authenticated');
      }
    } catch {}

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
      JSON.stringify({ success: false, error: 'Erro interno ao gerar pedido personalizado.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
