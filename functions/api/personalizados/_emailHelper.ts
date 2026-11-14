/**
 * Helper de E-mail de Notificação de Novos Pedidos Personalizados
 * Dispara e-mail formatado (Dark Luxury) para contato@nuaborges.com
 */

import { PersonalizadoOrder, formatCurrencyBrl } from '../../../lib/personalizadosCanonical';
import { sendSmtpEmail } from '../_smtpHelper';

export function renderPersonalizadoEmailHtml(order: PersonalizadoOrder): string {
  const shortId = order.id.replace('ped_', '').slice(-6).toUpperCase();
  const formattedTotal = formatCurrencyBrl(order.totalPrice);
  const cleanContact = order.clientContact.replace(/\D/g, '');
  const isPhone = cleanContact.length >= 10;
  const whatsappUrl = isPhone ? `https://wa.me/55${cleanContact}` : null;
  const telegramUrl = order.clientContact.startsWith('@')
    ? `https://t.me/${order.clientContact.replace('@', '')}`
    : null;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Novo Pedido de Conteúdo Personalizado — Nua Borges</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050507; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; line-height: 1.6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050507; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Container Principal -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #0d0d12; border: 1px solid rgba(244, 167, 185, 0.25); border-radius: 28px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.8);">
          
          <!-- Top Banner -->
          <tr>
            <td style="background: linear-gradient(180deg, #18151c 0%, #0d0d12 100%); padding: 36px 30px 24px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06);">
              <span style="font-size: 11px; letter-spacing: 0.25em; color: #f4a7b9; text-transform: uppercase; font-weight: 600; display: block; margin-bottom: 8px;">
                ATELIÊ SOB MEDIDA • VENDA CONFIRMADA
              </span>
              <h1 style="font-family: Georgia, serif; font-size: 26px; font-weight: normal; margin: 0; color: #ffffff; letter-spacing: 0.08em; text-transform: uppercase;">
                Nua Borges <span style="color: #f4a7b9; font-size: 16px;">♡</span>
              </h1>
              <p style="color: #a1a1aa; font-size: 13px; margin-top: 8px; margin-bottom: 0;">
                Pedido <strong style="color: #ffffff;">#PED-${shortId}</strong> aprovado via Pix
              </p>
            </td>
          </tr>

          <!-- Destaque do Valor -->
          <tr>
            <td style="padding: 24px 30px; text-align: center; background-color: #121017; border-bottom: 1px solid rgba(255,255,255,0.04);">
              <span style="font-size: 11px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.15em; display: block; margin-bottom: 4px;">Valor Total Recebido</span>
              <span style="font-size: 32px; font-weight: bold; color: #f4a7b9; font-family: monospace; letter-spacing: 0.05em;">${formattedTotal}</span>
              ${order.express24h ? '<span style="display: block; margin-top: 6px; font-size: 11px; color: #fbbf24; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em;">⚡ ENTREGA EXPRESS (PRIORIDADE 24H)</span>' : ''}
            </td>
          </tr>

          <!-- Dados do Cliente e Produção -->
          <tr>
            <td style="padding: 30px;">
              <h3 style="font-size: 13px; color: #f4a7b9; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 0; margin-bottom: 16px;">
                📋 Detalhes da Produção Encomendada
              </h3>

              <table width="100%" border="0" cellspacing="0" cellpadding="8" style="font-size: 13px; color: #d4d4d8; background: #07070a; border-radius: 16px; padding: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="color: #a1a1aa; width: 40%;">Cliente:</td>
                  <td style="color: #ffffff; font-weight: 600;">${order.clientName}</td>
                </tr>
                <tr>
                  <td style="color: #a1a1aa;">Contato / Canal:</td>
                  <td style="color: #ffffff; font-weight: 600;">
                    ${order.clientContact} 
                    <span style="color: #f4a7b9; font-size: 11px;">(${order.deliveryChannel.toUpperCase()})</span>
                  </td>
                </tr>
                <tr>
                  <td style="color: #a1a1aa;">Fotos Contratadas:</td>
                  <td style="color: #ffffff; font-weight: 600;">📷 ${order.photoCount} Fotos Exclusivas</td>
                </tr>
                <tr>
                  <td style="color: #a1a1aa;">Vídeo Personalizado:</td>
                  <td style="color: #ffffff; font-weight: 600;">
                    ${order.videoDurationMinutes > 0 ? `🎬 ${order.videoDurationMinutes} Minuto(s)` : 'Nenhum vídeo (Apenas fotos)'}
                  </td>
                </tr>
                <tr>
                  <td style="color: #a1a1aa;">Falar Nome do Cliente:</td>
                  <td style="color: #ffffff; font-weight: 600;">${order.mentionName ? '✅ Sim (Dedicatória falada)' : '❌ Não'}</td>
                </tr>
              </table>

              <!-- Briefing -->
              <h3 style="font-size: 13px; color: #f4a7b9; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 0; margin-bottom: 12px;">
                💬 Briefing &amp; Ideia do Cliente
              </h3>
              <div style="background-color: #07070a; border-left: 3px solid #f4a7b9; border-radius: 4px 16px 16px 4px; padding: 18px 20px; color: #e4e4e7; font-size: 14px; font-style: italic; line-height: 1.6; margin-bottom: 30px;">
                "${order.briefing || 'Sem observações específicas. Gravar de acordo com estilo autoral Nua Borges.'}"
              </div>

              <!-- Botões de Ação Rápida -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                ${whatsappUrl ? `
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <a href="${whatsappUrl}" target="_blank" style="display: inline-block; width: 100%; box-sizing: border-box; background-color: #25d366; color: #000000; font-size: 12px; font-weight: bold; text-align: center; text-decoration: none; text-transform: uppercase; letter-spacing: 0.15em; padding: 14px 20px; border-radius: 50px;">
                      💬 Abrir WhatsApp do Cliente
                    </a>
                  </td>
                </tr>
                ` : ''}
                ${telegramUrl ? `
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <a href="${telegramUrl}" target="_blank" style="display: inline-block; width: 100%; box-sizing: border-box; background-color: #229ed9; color: #ffffff; font-size: 12px; font-weight: bold; text-align: center; text-decoration: none; text-transform: uppercase; letter-spacing: 0.15em; padding: 14px 20px; border-radius: 50px;">
                      ✈️ Abrir Telegram do Cliente
                    </a>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td align="center">
                    <a href="https://nuaborges.com.br/admingeral" target="_blank" style="display: inline-block; width: 100%; box-sizing: border-box; background-color: rgba(255,255,255,0.08); color: #ffffff; font-size: 11px; font-weight: bold; text-align: center; text-decoration: none; text-transform: uppercase; letter-spacing: 0.15em; padding: 12px 20px; border-radius: 50px; border: 1px solid rgba(255,255,255,0.15);">
                      ⚙️ Ver Pedido no Painel Admin
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style="background-color: #070709; padding: 20px 30px; text-align: center; border-top: 1px solid rgba(255,255,255,0.04);">
              <p style="font-size: 11px; color: #71717a; margin: 0; line-height: 1.5;">
                Notificação automática gerada pela Plataforma Oficial Nua Borges.<br>
                Este e-mail contém dados protegidos e confidenciais do cliente.
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

export async function sendPersonalizadoNotificationEmail(env: any, order: PersonalizadoOrder): Promise<boolean> {
  const html = renderPersonalizadoEmailHtml(order);
  const shortId = order.id.replace('ped_', '').slice(-6).toUpperCase();
  const subject = `✨ [Novo Personalizado] #PED-${shortId} — ${formatCurrencyBrl(order.totalPrice)} (${order.clientName})`;

  return await sendSmtpEmail(env, {
    to: 'contato@nuaborges.com.br',
    subject,
    html,
  });
}
