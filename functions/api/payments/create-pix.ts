/**
 * Cloudflare Pages Function: /api/payments/create-pix
 *
 * Gera cobrança Pix oficial no Mercado Pago para qualquer pack existente ou futuro.
 */

import { packPurchasePrice } from '../../../lib/publicCatalog';
import {
  computePixExpiration,
  createMercadoPagoPix,
  PACK_PIX_EXPIRATION_MS,
} from '../_mercadopago';
import { isLocalhostPaymentSimulationAllowed } from '../_security';
import { newOrderId, newPurchaseToken } from '../_secureId';
import { resolveCustomerSession } from '../id/_customerGuard';
import { claimOrderForProfile, isEntitlementActive, listEntitlementsByProfile } from '../id/_nuaIdStore';
import { checkAndConsumeRateLimit } from '../id/_rateLimiter';
import { getClientIp, sha256Hex } from '../id/_crypto';
import { loadCustomerCatalogIndex } from '../me/_customerData';
import { packVaultFiles } from '../../../lib/media/vaultPath';
import {
  saveOrderToSupabase,
  getAppointmentByIdFromSupabase,
  getPersonalizadoOrderFromSupabase,
  getSiteContentFromSupabase,
} from '../_supabaseStore';

interface Env {
  MP_ACCESS_TOKEN?: string;
  ENVIRONMENT?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_ANON_KEY?: string;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

async function findPublishedProduct(env: Env, reference: unknown) {
  if (typeof reference !== 'string') return null;
  const slug = reference.trim().toLowerCase();
  if (!slug || slug.length > 160) return null;
  let content: any = null;
  try {
    content = await getSiteContentFromSupabase(env, 'published_content', { strict: true });
  } catch (err: any) {
    if (err?.message?.includes('Supabase não configurado')) {
      const { DEFAULT_SITE_CONTENT } = await import('../../../lib/defaultContent');
      content = DEFAULT_SITE_CONTENT;
    } else {
      throw err;
    }
  }
  const catalog = content?.avulsos;
  if (catalog?.active === false || !Array.isArray(catalog?.items)) return null;
  return catalog.items.find((item: any) => {
    const id = String(item?.id || '').trim().toLowerCase();
    return item && item.active !== false && !item.isDraft && (
      String(item.slug || '').trim().toLowerCase() === slug || id === slug || id.replace(/^avulso-/, '') === slug
    );
  }) || null;
}

async function hasPrivateDelivery(env: Env, slug: string) {
  const catalog = await loadCustomerCatalogIndex(env, { strict: true });
  return packVaultFiles(catalog.get(slug.trim().toLowerCase())).length > 0;
}

export const onRequestGet = async ({ request, env }: PagesContext<Env>) => {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const product = await findPublishedProduct(env, new URL(request.url).searchParams.get('slug'));
    const available = Boolean(product && packPurchasePrice(product) !== null
      && await hasPrivateDelivery(env, product.slug || product.id.replace(/^avulso-/, '')));
    return Response.json({ available }, { headers });
  } catch {
    return Response.json({ available: false }, { status: 503, headers });
  }
};

export const onRequestOptions = async () => {
  return new Response(null, { status: 204 });
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  try {
    // Rate limit por IP para prevenir abuso de geração de cobranças Pix
    try {
      const ipHash = await sha256Hex(getClientIp(request));
      const rl = await checkAndConsumeRateLimit(env as any, `create_pix_ip:${ipHash}`, 12, 600);
      if (!rl.allowed) {
        return Response.json(
          { error: 'Muitas tentativas de geração de Pix. Aguarde alguns minutos e tente novamente.' },
          { status: 429 }
        );
      }
    } catch {}

    const body: any = await request.json().catch(() => ({}));
    const {
      type = 'avulso',
      slug,
      payerEmail: submittedEmail,
      payerName,
      productId,
      simulate,
      isTestMode,
    } = body;

    // Allowlist estrita de tipos comerciais — nunca aceita preço/título do cliente
    const ALLOWED_TYPES = ['avulso', 'pack', 'chamada', 'appointment', 'personalizado'];
    if (typeof type !== 'string' || !ALLOWED_TYPES.includes(type)) {
      return Response.json(
        { error: 'Tipo de pedido inválido ou não suportado para emissão de Pix.' },
        { status: 400 }
      );
    }

    const customerCtx = await resolveCustomerSession(request, env);
    const cleanSubmittedEmail = typeof submittedEmail === 'string' ? submittedEmail.trim().toLowerCase() : '';
    const payerEmail = customerCtx?.profile.email || cleanSubmittedEmail;
    let targetTitle = 'Nua Borges — Conteúdo Autoral';
    let canonicalPrice = 0;
    let itemSlug = slug || productId || '';

    if (type === 'avulso' || type === 'pack') {
      const product = await findPublishedProduct(env, slug || productId);
      if (!product || product.active === false || product.isDraft === true) {
        return new Response(
          JSON.stringify({
            error: 'Conteúdo avulso não encontrado ou indisponível para aquisição no catálogo oficial.',
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (!payerEmail || !/^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/.test(payerEmail)) {
        return Response.json(
          { error: 'Informe um e-mail válido para gerar o Pix e receber o acesso ao seu Cofre.' },
          { status: 400 }
        );
      }

      targetTitle = product.title;
      const price = packPurchasePrice(product);
      if (price === null) {
        return Response.json(
          { error: 'Este produto está sem preço válido configurado no catálogo.' },
          { status: 422 }
        );
      }
      canonicalPrice = price;
      itemSlug = product.slug || product.id.replace(/^avulso-/, '');
      if (customerCtx) {
        const packRefs = new Set([itemSlug, product.id, product.id?.replace(/^avulso-/, '')]
          .filter((ref): ref is string => typeof ref === 'string')
          .map((ref) => ref.toLowerCase()));
        let rights: Awaited<ReturnType<typeof listEntitlementsByProfile>>;
        try {
          rights = await listEntitlementsByProfile(env, customerCtx.profile.id, true);
        } catch {
          return Response.json({ error: 'Não conseguimos verificar suas compras agora. Tente novamente em instantes.' }, { status: 503 });
        }
        if (rights.some((right) => (right.kind === 'pack' || right.kind === 'avulso') &&
          packRefs.has(right.resourceId.toLowerCase()) && isEntitlementActive(right))) {
          return Response.json({
            code: 'PACK_ALREADY_OWNED',
            error: 'Este conteúdo já está na biblioteca da sua conta.',
          }, { status: 409 });
        }
      }
      try {
        if (!(await hasPrivateDelivery(env, itemSlug))) {
          return Response.json({ code: 'PACK_UNAVAILABLE', error: 'Esta produção ainda não está disponível para compra.' }, { status: 422 });
        }
      } catch {
        return Response.json({ error: 'Não conseguimos verificar a disponibilidade agora. Tente novamente em instantes.' }, { status: 503 });
      }
    } else if (type === 'chamada' || type === 'appointment') {
      const targetBookingId = body.bookingId || body.appointmentId || slug || productId;
      let app: any = null;
      if (targetBookingId) {
        app = await getAppointmentByIdFromSupabase(env, targetBookingId);
      }
      if (!app) {
        return new Response(
          JSON.stringify({
            error: 'Agendamento não encontrado para emissão do pagamento.',
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      // NUA-AUD-006: exige prova de posse (publicToken da reserva ou conta NUA ID dona do agendamento)
      const providedToken = String(body.publicToken || body.token || '').trim();
      const hasValidToken = Boolean(providedToken && app.publicToken && providedToken === app.publicToken);
      const isAuthenticatedOwner = Boolean(
        customerCtx?.profile?.id &&
        ((app as any).profileId === customerCtx.profile.id ||
          (app.clientEmail && customerCtx.profile.emailNormalized === String(app.clientEmail).trim().toLowerCase()))
      );
      if (!hasValidToken && !isAuthenticatedOwner) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Autorização obrigatória para emitir cobrança deste agendamento.',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
      targetTitle = `Chamada ${app.modalityName} (${app.durationMinutes} min)`;
      canonicalPrice = Number(app.price) || 0;
      if (!Number.isFinite(canonicalPrice) || canonicalPrice < 1) {
        return Response.json({ error: 'Valor da chamada inválido.' }, { status: 422 });
      }
      itemSlug = app.id;
    } else if (type === 'personalizado') {
      const targetOrderId = body.personalizadoId || body.orderId || slug || productId;
      let pers: any = null;
      if (targetOrderId) {
        pers = await getPersonalizadoOrderFromSupabase(env, targetOrderId);
      }
      if (!pers) {
        return new Response(
          JSON.stringify({
            error: 'Encomenda personalizada não encontrada para emissão do pagamento.',
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      // NUA-AUD-006: exige prova de posse (publicToken do pedido ou conta NUA ID dona da encomenda)
      const providedToken = String(body.publicToken || body.token || '').trim();
      const hasValidToken = Boolean(providedToken && pers.publicToken && providedToken === pers.publicToken);
      const isAuthenticatedOwner = Boolean(
        customerCtx?.profile?.id &&
        ((pers as any).profileId === customerCtx.profile.id ||
          (pers.clientContact &&
            String(pers.clientContact).includes('@') &&
            customerCtx.profile.emailNormalized === String(pers.clientContact).trim().toLowerCase()))
      );
      if (!hasValidToken && !isAuthenticatedOwner) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Autorização obrigatória para emitir cobrança desta encomenda.',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
      targetTitle = `Produção Personalizada (${pers.photoCount} fotos)`;
      canonicalPrice = Number(pers.totalPrice || pers.payment?.amount) || 0;
      if (!Number.isFinite(canonicalPrice) || canonicalPrice < 1) {
        return Response.json({ error: 'Valor do personalizado inválido.' }, { status: 422 });
      }
      itemSlug = pers.id;
    }

    const orderId = newOrderId();
    const purchaseToken = newPurchaseToken();
    const externalReference =
      type === 'chamada' || type === 'appointment'
        ? `apt_${itemSlug}`
        : type === 'personalizado'
          ? `nua_pers_${itemSlug}`
          : `nua_${type}_${itemSlug}_${orderId}`;

    // TRAVA ABSOLUTA DE SEGURANÇA: Simulação restrita a localhost
    const isSimulationRequested = simulate === true || isTestMode === true;
    if (isSimulationRequested) {
      if (!isLocalhostPaymentSimulationAllowed(request, env)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Acesso negado: pagamentos simulados são estritamente proibidos em produção.',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Simulação estritamente em localhost
      const now = new Date();
      const simulatedQrCode = `00020126580014br.gov.bcb.pix0136nua-simulado-${itemSlug}-${orderId}5204000053039865405${canonicalPrice.toFixed(2)}5802BR5910NUA BORGES6009SAO PAULO62070503***6304ABCD`;
      const simulatedQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(simulatedQrCode)}`;

      const orderData = {
        orderId,
        purchaseToken,
        type,
        itemSlug,
        itemTitle: targetTitle,
        canonicalPrice,
        amount: canonicalPrice,
        status: 'pending',
        isTestMode: true,
        paymentMethod: 'simulated_local_pix',
        externalReference,
        qrCode: simulatedQrCode,
        qrCodeUrl: simulatedQrCodeUrl,
        payerEmail: payerEmail || undefined,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + PACK_PIX_EXPIRATION_MS).toISOString(),
      };

      // Persiste no Supabase PostgreSQL (Fonte de Verdade)
      const saveRes = await saveOrderToSupabase(env, {
        id: orderId,
        purchaseToken,
        packId: itemSlug,
        amount: canonicalPrice,
        status: 'pending',
        customerEmail: payerEmail || '',
        customerName: payerName || '',
        paymentMethod: 'simulated_local_pix',
        expiresAt: orderData.expiresAt,
        createdAt: orderData.createdAt,
        updatedAt: orderData.createdAt,
      });

      if (!saveRes.success) {
        return new Response(
          JSON.stringify({ success: false, error: 'Falha ao persistir pedido no banco de dados.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Apenas vincula imediatamente se o comprador já estiver autenticado (previne poluição de contas de terceiros)
      try {
        if (customerCtx?.profile?.id) {
          await claimOrderForProfile(env as any, orderId, customerCtx.profile.id, 'checkout_authenticated');
        }
      } catch {}

      return new Response(
        JSON.stringify({
          success: true,
          orderId,
          purchaseToken,
          paymentId: `sim_${orderId}`,
          qrCode: simulatedQrCode,
          qrCodeUrl: simulatedQrCodeUrl,
          qrCodeBase64: simulatedQrCodeUrl,
          amount: canonicalPrice,
          expiresAt: orderData.expiresAt,
          isTestMode: true,
          itemSlug,
          itemTitle: targetTitle,
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Geração do Pix oficial dinâmico via Mercado Pago (Ambiente Real) — prazo de 2 horas
    const now = new Date();
    const pixExpiry = computePixExpiration(PACK_PIX_EXPIRATION_MS, now.getTime());
    const mpResult = await createMercadoPagoPix(env, {
      amount: canonicalPrice,
      description: `Nua Borges — ${targetTitle} — REF: ${orderId}`,
      payerEmail: payerEmail || 'contato@nuaborges.com.br',
      payerName: payerName || 'Cliente VIP',
      externalReference,
      dateOfExpiration: pixExpiry.mpDateOfExpiration,
    });

    if (!mpResult.qrCode) {
      throw new Error('O Mercado Pago não retornou o código Pix. Tente novamente em instantes.');
    }

    const mpExpiresMs = mpResult.expiresAt ? Date.parse(mpResult.expiresAt) : NaN;
    const resolvedExpiresAt = Number.isFinite(mpExpiresMs)
      ? new Date(mpExpiresMs).toISOString()
      : pixExpiry.isoUtc;
    const orderData = {
      orderId,
      purchaseToken,
      type,
      itemSlug,
      itemTitle: targetTitle,
      canonicalPrice,
      amount: mpResult.amount,
      status: 'pending',
      mpPaymentId: String(mpResult.id),
      paymentMethod: 'mercadopago_pix',
      externalReference,
      qrCode: mpResult.qrCode,
      qrCodeUrl: mpResult.qrCodeBase64,
      payerEmail: payerEmail || undefined,
      createdAt: now.toISOString(),
      expiresAt: resolvedExpiresAt,
    };

    // Salva na tabela orders do Supabase PostgreSQL (Master Database - Fonte de Verdade)
    const saveRes = await saveOrderToSupabase(env, {
      id: orderId,
      purchaseToken,
      packId: itemSlug,
      amount: mpResult.amount,
      status: 'pending',
      customerEmail: payerEmail || '',
      customerName: payerName || '',
      paymentId: String(mpResult.id),
      paymentMethod: 'mercadopago_pix',
      expiresAt: orderData.expiresAt,
      createdAt: orderData.createdAt,
      updatedAt: orderData.createdAt,
    });

    if (!saveRes.success) {
      return new Response(
        JSON.stringify({ success: false, error: 'Falha ao persistir pedido no banco de dados oficial.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Se o cliente estiver autenticado no NUA ID, vincula o pedido à conta imediatamente.
    // Para convidados, a criação/vínculo do perfil ocorre somente após pagamento confirmado (previne poluição de contas).
    try {
      if (customerCtx?.profile?.id) {
        await claimOrderForProfile(env as any, orderId, customerCtx.profile.id, 'checkout_authenticated');
      }
    } catch {}

    return new Response(
      JSON.stringify({
        success: true,
        orderId,
        purchaseToken,
        paymentId: String(mpResult.id),
        mpPaymentId: String(mpResult.id),
        qrCode: mpResult.qrCode,
        qrCodeUrl: mpResult.qrCodeBase64,
        qrCodeBase64: mpResult.qrCodeBase64,
        amount: mpResult.amount,
        expiresAt: resolvedExpiresAt,
        itemSlug,
        itemTitle: targetTitle,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('[Create Pix Error]:', err?.message || err);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Não foi possível gerar o Pix agora. Tente novamente em instantes.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
