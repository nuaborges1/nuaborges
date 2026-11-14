/**
 * Cloudflare Pages Function: /api/payments/send-otp
 *
 * Gera e dispara código OTP de 6 dígitos via e-mail seguro para autorização de acesso avulso.
 * Persistência 100% no Supabase PostgreSQL.
 */

import {
  getOrderFromSupabase,
  setSystemKVInSupabase,
} from '../_supabaseStore';
import { getSupabaseClient } from '../_supabaseClient';
import { sendSmtpEmail } from '../_smtpHelper';

interface Env {
  CLOUDFLARE_EMAIL_API_KEY?: string;
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

interface RenderEmailParams {
  otpCode: string;
  orderId: string;
  itemTitle: string;
  itemSlug: string;
  payerEmail: string;
  siteUrl?: string;
  expiresInMinutes?: number;
}

// Generate luxury LIGHT HTML email template matching Nua Borges brand
function renderOtpEmailHtml({
  otpCode,
  orderId,
  itemTitle,
  itemSlug,
  payerEmail,
  siteUrl = 'https://nuaborges.com.br',
  expiresInMinutes = 10,
}: RenderEmailParams): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Acesso Privativo — Nua Borges</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f6f3; color: #222222; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; line-height: 1.6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f7f6f3; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Container Principal -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e9e6df; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);">
          
          <!-- Header Sofisticado -->
          <tr>
            <td style="padding: 36px 36px 24px 36px; text-align: center; border-bottom: 1px solid #f0ede6;">
              <span style="font-family: 'Playfair Display', Georgia, serif; font-size: 26px; font-weight: 700; letter-spacing: 0.15em; color: #1a1a1a; text-transform: uppercase;">
                NUA BORGES
              </span>
              <div style="font-size: 11px; font-weight: 500; letter-spacing: 0.25em; text-transform: uppercase; color: #9c8e82; margin-top: 6px;">
                Cofre Privativo & Galeria Autoral
              </div>
            </td>
          </tr>

          <!-- Conteúdo -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 20px; font-weight: 600; color: #1a1a1a; margin: 0 0 16px 0; text-align: center;">
                Autorização de Acesso Privativo
              </h1>
              
              <p style="font-size: 14px; color: #555555; margin: 0 0 24px 0; text-align: center; line-height: 1.6;">
                Recebemos uma solicitação para desbloquear a exibição do seu ensaio autoral privativo. Utilize o código de verificação abaixo:
              </p>

              <!-- Bloco do Código OTP -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <div style="background-color: #faf8f5; border: 1px solid #e8e2d8; border-radius: 10px; padding: 18px 32px; display: inline-block;">
                      <span style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 34px; font-weight: 700; letter-spacing: 0.25em; color: #8e2b46;">
                        ${otpCode}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="font-size: 12px; color: #888888; text-align: center; margin: 0 0 28px 0;">
                ⏱️ Este código expira em <strong>${expiresInMinutes} minutos</strong> e é de uso pessoal e intransferível.
              </p>

              <!-- Detalhes da Compra -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #faf9f6; border-radius: 8px; border: 1px solid #eeece6; padding: 16px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #999999; margin-bottom: 4px;">Conteúdo Adquirido:</div>
                    <div style="font-size: 14px; font-weight: 600; color: #222222; margin-bottom: 8px;">${itemTitle}</div>
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #999999; margin-bottom: 4px;">Identificador do Pedido:</div>
                    <div style="font-family: monospace; font-size: 13px; color: #555555;">#${orderId.slice(-8).toUpperCase()}</div>
                  </td>
                </tr>
              </table>

              <!-- Aviso de Segurança e Dispositivos -->
              <div style="border-left: 3px solid #8e2b46; padding-left: 14px; margin: 20px 0;">
                <p style="font-size: 12px; color: #666666; margin: 0; line-height: 1.5;">
                  🔒 <strong>Proteção de Direitos e Privacidade:</strong> Por questões de segurança e proteção dos direitos autorais, o acesso é limitado a até 2 dispositivos vinculados. Nunca compartilhe este código.
                </p>
              </div>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style="padding: 24px 36px; background-color: #faf9f7; border-top: 1px solid #f0ede6; text-align: center;">
              <p style="font-size: 11px; color: #999999; margin: 0 0 6px 0;">
                Se você não solicitou este acesso, desconsidere este e-mail.
              </p>
              <p style="font-size: 11px; color: #b5aba1; margin: 0;">
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
    const itemTitle = foundOrder.packTitle || foundOrder.packId || 'Ensaio Autoral VIP';
    const itemSlug = foundOrder.packId || body.slug || '';
    const payerEmail = foundOrder.customerEmail || 'contato@nuaborges.com.br';

    // Gerar código OTP de 6 dígitos aleatório
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Salva OTP no Supabase via site_content com validade de 10 minutos
    await setSystemKVInSupabase(env, `otp:${orderId}`, {
      code: otpCode,
      orderId,
      payerEmail,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
    }, 'SendOTP');

    // Renderiza e envia e-mail com design oficial Nua Borges
    const emailSubject = `🔑 Seu Código de Acesso (${otpCode}) — Nua Borges`;
    const emailHtml = renderOtpEmailHtml({
      otpCode,
      orderId,
      itemTitle,
      itemSlug,
      payerEmail,
    });

    await sendEmailViaCloudflare(env, payerEmail, emailSubject, emailHtml);

    return new Response(
      JSON.stringify({
        success: true,
        sent: true,
        orderId,
        itemTitle,
        maskedEmail: maskEmail(payerEmail),
        expiresInSeconds: 600,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Erro ao enviar código de verificação.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const onRequestGet = onRequestPost;
export const onRequest = onRequestPost;
