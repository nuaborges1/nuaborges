/**
 * Cloudflare Pages Function: /api/payments/send-otp
 *
 * Envia o link de acesso privativo para pedidos aprovados de avulsos e packs.
 * Design Dark Luxury unificado via `wrapEmailLayout` com escape HTML estrito.
 */

import { checkAndConsumeRateLimit } from '../id/_rateLimiter';
import { getClientIp, getIdSecret } from '../id/_customerGuard';
import { hashClientIp } from '../id/_crypto';
import { getOrderFromSupabase } from '../_supabaseStore';
import { getSupabaseClient } from '../_supabaseClient';
import { sendSmtpEmailDetailed } from '../_smtpHelper';
import {
  escapeHtml,
  renderEmailDetailsTable,
  renderEmailPrimaryCta,
  wrapEmailLayout,
} from '../id/_emailTemplates';

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

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return 'e***l@dominio.com';
  const [user, domain] = email.split('@');
  if (user.length <= 2) {
    return `${user[0]}***@${domain}`;
  }
  return `${user[0]}${user[1]}***${user[user.length - 1]}@${domain}`;
}

export interface RenderTokenEmailParams {
  orderId: string;
  purchaseToken: string;
  itemTitle: string;
  itemSlug: string;
  payerEmail: string;
  siteUrl?: string;
}

export function renderTokenAccessEmailHtml({
  orderId,
  purchaseToken,
  itemTitle,
  itemSlug,
  payerEmail,
  siteUrl = 'https://nuaborges.com.br',
}: RenderTokenEmailParams): string {
  const shortId = orderId.replace(/^ord_/, '').slice(-8).toUpperCase();
  const accessUrl = siteUrl.replace(/\/$/, '') + '/cofre?order=' + encodeURIComponent(orderId);
  return wrapEmailLayout({
    title: 'Acesso privativo liberado — Nua Borges',
    preheader: `Seu pedido #${shortId} foi confirmado e já está disponível na sua área privativa.`,
    heading: 'Seu acesso privativo está liberado',
    eyebrow: 'Cofre Privativo',
    bodyHtml: `
      <p class="nua-body" style="font-size:14.5px;color:#3f3f46;margin:0 0 20px;line-height:1.65;">
        Seu pagamento foi confirmado com sucesso. Use o botão abaixo para acessar seu conteúdo com total privacidade ou entre pela sua conta.
      </p>
      ${renderEmailDetailsTable([
        { label: 'Referência', value: `#PED-${shortId}`, monospace: true },
        { label: 'Item', value: itemTitle || 'Conteúdo Exclusivo' },
        { label: 'Situação', value: 'Confirmado e liberado', highlightColor: '#15803d' },
      ])}
      ${renderEmailPrimaryCta({
        url: accessUrl,
        label: 'Abrir meu Cofre',
      })}
      <div class="nua-surface" style="background-color:#f4f4f5;border:1px solid #e4e4e7;border-radius:10px;padding:12px 14px;margin-top:20px;">
        <div class="nua-muted" style="font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">
          Link direto de acesso (pessoal e intransferível)
        </div>
        <div class="nua-body" style="font-family:'Courier New',Courier,monospace;font-size:11.5px;color:#3f3f46;word-break:break-all;">
          ${escapeHtml(accessUrl)}
        </div>
      </div>
      <p class="nua-muted" style="margin:14px 0 0;font-size:12.5px;color:#71717a;line-height:1.55;">
        <strong class="nua-title" style="color:#18181b;">Confidencial:</strong> Em um novo navegador, confirme seu acesso pelo seu e-mail.
      </p>
    `,
    footerNote: `Comunicação reservada da plataforma oficial. © ${new Date().getFullYear()} Nua Borges. Todos os direitos reservados.`,
  });
}

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      search?: string;
      orderId?: string;
      slug?: string;
    };

    const query = (body.search || body.orderId || '').trim().toLowerCase();
    if (!query) {
      return new Response(
        JSON.stringify({ success: false, error: 'Informe o número do pedido ou e-mail da compra.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const quiet = () => Response.json({success:true,sent:true},{headers:{'Cache-Control':'no-store'}});
    const secret = getIdSecret(env);
    if (!secret || !(await checkAndConsumeRateLimit(env,'delivery-ip:'+await hashClientIp(getClientIp(request),secret),8,600)).allowed) return quiet();
    let foundOrder: any = null;

    const directOrder = await getOrderFromSupabase(env, query);
    if (directOrder) {
      foundOrder = directOrder;
    } else if (query.includes('@')) {
      const sb = getSupabaseClient(env);
      if (sb) {
        const { data } = await sb
          .from('orders')
          .select('*')
          .eq('customer_email', query)
          .in('status', ['paid', 'approved'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          foundOrder = {
            id: data.id,
            purchaseToken: data.purchase_token,
            packId: data.pack_id,
            amount: Number(data.amount),
            status: data.status,
            customerEmail: data.customer_email,
            customerName: data.customer_name,
            createdAt: data.created_at,
          };
        }
      }
    }

    if (!foundOrder || !['paid','approved'].includes(foundOrder.status)) return quiet();
    const payerEmail = String(foundOrder.customerEmail || '').trim().toLowerCase();
    if (!payerEmail.includes('@') || !(await checkAndConsumeRateLimit(env,'delivery:'+foundOrder.id,3,600)).allowed) return quiet();
    const orderId = foundOrder.id || query;
    const purchaseToken = foundOrder.purchaseToken || foundOrder.id || orderId;
    const itemTitle = foundOrder.packTitle || foundOrder.packId || 'Conteúdo Exclusivo';
    const itemSlug = foundOrder.packId || body.slug || '';

    const emailSubject = 'Seu acesso privativo foi liberado — Nua Borges';
    const emailHtml = renderTokenAccessEmailHtml({
      orderId,
      purchaseToken,
      itemTitle,
      itemSlug,
      payerEmail,
      siteUrl:env.NEXT_PUBLIC_SITE_URL,
    });

    const smtpRes = await sendSmtpEmailDetailed(env, {
      to: payerEmail,
      subject: emailSubject,
      html: emailHtml,
    });

    if (!smtpRes.ok) {
      console.error(`[send-otp] Falha SMTP para ${orderId}:`, smtpRes.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Não foi possível enviar o e-mail de acesso no momento. Por favor, tente novamente em instantes.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return quiet();
  } catch (err: any) {
    console.error('[payments/send-otp] Erro:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Não foi possível enviar o link de acesso agora.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};


