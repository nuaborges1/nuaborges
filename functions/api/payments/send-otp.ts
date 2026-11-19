/**
 * Cloudflare Pages Function: /api/payments/send-otp
 *
 * Envia o link de acesso direto com token de compra autorizada para avulsos e packs.
 * Design dark luxury coerente com a marca Nua Borges.
 */

import {
  getOrderFromSupabase,
} from '../_supabaseStore';
import { getSupabaseClient } from '../_supabaseClient';
import { sendSmtpEmail } from '../_smtpHelper';

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

// Mask e-mail for privacy display (ex: ph***e@gmail.com)
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return 'e***l@dominio.com';
  const [user, domain] = email.split('@');
  if (user.length <= 2) {
    return `${user[0]}***@${domain}`;
  }
  return `${user[0]}${user[1]}***${user[user.length - 1]}@${domain}`;
}

interface RenderTokenEmailParams {
  orderId: string;
  purchaseToken: string;
  itemTitle: string;
  itemSlug: string;
  payerEmail: string;
  siteUrl?: string;
}

// Design Dark Luxury Nua Borges (Fundo Obsidiana, Vinho #843C52, Tipografia Editorial)
export function renderTokenAccessEmailHtml({
  orderId,
  purchaseToken,
  itemTitle,
  itemSlug,
  payerEmail,
  siteUrl = 'https://nuaborges.com.br',
}: RenderTokenEmailParams): string {
  const shortId = orderId.replace(/^ord_/, '').slice(-8).toUpperCase();
  const targetSlug = itemSlug || 'acervo';
  const accessUrl = `${siteUrl}/assistir/${targetSlug}?token=${encodeURIComponent(purchaseToken)}`;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Link de Acesso Privativo — Nua Borges</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050507; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; line-height: 1.6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050507; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Container Principal Dark Luxury -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #0c0d12; border: 1px solid rgba(132, 60, 82, 0.3); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);">
          
          <!-- Header Vinho Editorial -->
          <tr>
            <td style="padding: 36px 32px 24px; background: linear-gradient(180deg, #180d12 0%, #0c0d12 100%); border-bottom: 1px solid rgba(132, 60, 82, 0.25); text-align: center;">
              <span style="font-family: Georgia, serif; font-size: 24px; font-weight: 300; letter-spacing: 0.2em; color: #ffffff; text-transform: uppercase;">
                NUA BORGES
              </span>
              <div style="font-size: 11px; font-weight: 600; letter-spacing: 0.25em; text-transform: uppercase; color: #843C52; margin-top: 6px;">
                Cofre Privativo & Galeria Autoral
              </div>
            </td>
          </tr>

          <!-- Conteúdo Principal -->
          <tr>
            <td style="padding: 32px 32px 28px;">
              <h1 style="font-family: Georgia, serif; font-size: 20px; font-weight: 400; color: #ffffff; margin: 0 0 16px; text-align: center; letter-spacing: 0.05em;">
                Seu Acesso Privativo Está Liberado
              </h1>
              
              <p style="font-size: 14px; color: #a1a1aa; margin: 0 0 24px; text-align: center; line-height: 1.6;">
                Seu pagamento foi confirmado com sucesso. Clique no botão abaixo para acessar instantaneamente seu ensaio autoral privativo no Cofre Nua Borges:
              </p>

              <!-- Botão CTA Principal -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${accessUrl}" target="_blank" style="display: inline-block; padding: 16px 36px; border-radius: 50px; background-color: #843C52; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.15em; box-shadow: 0 4px 20px rgba(132, 60, 82, 0.4);">
                      🔓 Acessar Conteúdo Agora
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Card de Detalhes do Pedido -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #12131a; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.06); padding: 18px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #71717a; margin-bottom: 4px;">Conteúdo Adquirido:</div>
                    <div style="font-size: 14px; font-weight: 600; color: #ffffff; margin-bottom: 12px;">${itemTitle}</div>
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #71717a; margin-bottom: 4px;">Identificador do Pedido:</div>
                    <div style="font-family: monospace; font-size: 13px; color: #843C52; font-weight: bold;">#PED-${shortId}</div>
                  </td>
                </tr>
              </table>

              <!-- Link Direto para Copiar -->
              <div style="background-color: #08090c; border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 12px 16px; margin-bottom: 24px;">
                <p style="font-size: 11px; color: #71717a; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.08em;">
                  Link direto de acesso (copie e cole se necessário):
                </p>
                <p style="font-family: monospace; font-size: 11px; color: #d4d4d8; margin: 0; word-break: break-all;">
                  ${accessUrl}
                </p>
              </div>

              <!-- Orientação de Segurança -->
              <div style="border-left: 3px solid #843C52; padding-left: 14px; margin: 20px 0;">
                <p style="font-size: 12px; color: #a1a1aa; margin: 0; line-height: 1.5;">
                  🔒 <strong>Confidencial & Privativo:</strong> Este link contém seu token pessoal de autorização. Não compartilhe com terceiros.
                </p>
              </div>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style="padding: 24px 32px; background-color: #08090c; border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center;">
              <p style="font-size: 11px; color: #71717a; margin: 0 0 6px;">
                Nua Borges · Cofre Privativo & Galeria Autoral
              </p>
              <p style="font-size: 10px; color: #52525b; margin: 0;">
                © ${new Date().getFullYear()} Nua Borges Oficial. Todos os direitos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

async function sendEmailViaCloudflare(
  env: any,
  toEmail: string,
  subject: string,
  htmlContent: string
): Promise<boolean> {
  return await sendSmtpEmail(env, {
    to: toEmail,
    subject,
    html: htmlContent,
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

    let foundOrder: any = null;

    // 1. Tenta buscar no PostgreSQL Supabase por ID / token
    const directOrder = await getOrderFromSupabase(env, query);
    if (directOrder) {
      foundOrder = directOrder;
    } else if (query.includes('@')) {
      // 2. Tenta buscar por e-mail no Supabase
      const sb = getSupabaseClient(env);
      if (sb) {
        const { data } = await sb
          .from('orders')
          .select('*')
          .eq('customer_email', query)
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

    if (!foundOrder) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Nenhum pedido foi localizado com estes dados. Verifique o número do pedido ou e-mail.',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const orderId = foundOrder.id || query;
    const purchaseToken = foundOrder.purchaseToken || foundOrder.id || orderId;
    const itemTitle = foundOrder.packTitle || foundOrder.packId || 'Ensaio Autoral VIP';
    const itemSlug = foundOrder.packId || body.slug || '';
    const payerEmail = foundOrder.customerEmail || 'contato@nuaborges.com.br';

    // Renderiza e envia e-mail com o link de acesso por token (design Dark Luxury Nua Borges)
    const emailSubject = `🔑 Seu Link de Acesso Privativo — Nua Borges`;
    const emailHtml = renderTokenAccessEmailHtml({
      orderId,
      purchaseToken,
      itemTitle,
      itemSlug,
      payerEmail,
    });

    const emailSent = await sendEmailViaCloudflare(env, payerEmail, emailSubject, emailHtml);

    if (!emailSent) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Não foi possível enviar o e-mail de acesso no momento. Por favor, tente novamente em instantes.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: true,
        orderId,
        itemTitle,
        maskedEmail: maskEmail(payerEmail),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Erro ao enviar link de acesso.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const onRequestGet = onRequestPost;
export const onRequest = onRequestPost;
