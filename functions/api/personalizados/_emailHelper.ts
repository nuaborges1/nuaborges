/**
 * Helper de E-mail de Notificação de Pedidos Personalizados — Nua Borges
 *
 * Unificado sob `wrapEmailLayout` (540px, Dark Luxury) com disparo para:
 * 1. Administração (contato@nuaborges.com.br) — detalhes completos do briefing e atalho do painel
 * 2. Cliente — confirmação discreta de pagamento aprovado e acompanhamento em Minha Conta
 */

import { PersonalizadoOrder, formatCurrencyBrl } from '../../../lib/personalizadosCanonical';
import { sendSmtpEmailDetailed, SmtpSendResult } from '../_smtpHelper';
import {
  escapeHtml,
  renderEmailDetailsTable,
  renderEmailPrimaryCta,
  wrapEmailLayout,
} from '../id/_emailTemplates';

const EMAIL_RE = /^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/;

export function renderPersonalizadoEmailHtml(order: PersonalizadoOrder): string {
  const shortId = order.id.replace(/^(ped|pers)_/, '').slice(-6).toUpperCase();
  const formattedTotal = formatCurrencyBrl(order.totalPrice);
  const safeBriefing = escapeHtml(
    order.briefing || 'Sem observações específicas. Produzir conforme estilo autoral Nua Borges.'
  );

  const cleanContact = (order.clientContact || '').replace(/\D/g, '');
  const isPhone = cleanContact.length >= 10;
  const whatsappUrl = isPhone ? `https://wa.me/55${encodeURIComponent(cleanContact)}` : null;
  const telegramHandle = (order.clientContact || '').trim().replace(/^@/, '');
  const telegramUrl =
    (order.clientContact || '').trim().startsWith('@') && /^[a-zA-Z0-9_]{3,32}$/.test(telegramHandle)
      ? `https://t.me/${encodeURIComponent(telegramHandle)}`
      : null;

  const contactAction = whatsappUrl
    ? { url: whatsappUrl, label: 'Abrir WhatsApp do cliente' }
    : telegramUrl
      ? { url: telegramUrl, label: 'Abrir Telegram do cliente' }
      : null;

  const expressBadge = order.express24h
    ? `<div style="margin:0 0 16px;">
         <span style="display:inline-block;padding:4px 12px;border-radius:9999px;background-color:#fef3c7;border:1px solid #f59e0b;color:#92400e;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">
           Prioridade Express 24h
         </span>
       </div>`
    : '';

  return wrapEmailLayout({
    title: `Novo Pedido Personalizado #PED-${shortId} — Nua Borges`,
    preheader: `Pedido #PED-${shortId} confirmado via Pix (${formattedTotal}).`,
    heading: `Novo pedido #PED-${shortId}`,
    eyebrow: 'Ateliê Sob Medida',
    bodyHtml: `
      <div class="nua-surface" style="background-color:#f4f4f5;border:1px solid #e4e4e7;border-radius:10px;padding:16px 18px;margin:0 0 18px;">
        <div class="nua-muted" style="font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">
          Valor confirmado via Pix
        </div>
        <div class="nua-title" style="font-family:'Courier New',Courier,monospace;font-size:24px;font-weight:700;color:#18181b;letter-spacing:0.02em;">
          ${escapeHtml(formattedTotal)}
        </div>
      </div>
      ${expressBadge}
      ${renderEmailDetailsTable([
        { label: 'Cliente', value: order.clientName || 'Cliente' },
        { label: 'Contato / Canal', value: `${order.clientContact || 'Não informado'} (${(order.deliveryChannel || 'vault').toUpperCase()})` },
        { label: 'Fotos contratadas', value: `${Number(order.photoCount) || 0} foto(s)` },
        { label: 'Vídeo personalizado', value: Number(order.videoDurationMinutes) > 0 ? `${Number(order.videoDurationMinutes)} minuto(s)` : 'Apenas fotos' },
        { label: 'Dedicatória com nome', value: order.mentionName ? 'Sim' : 'Não' },
      ])}
      <div class="nua-eyebrow" style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#661C30;margin:0 0 8px;">
        Briefing do cliente
      </div>
      <div class="nua-quote" style="background-color:#f4f4f5;border-left:3px solid #661C30;border-radius:6px;padding:14px 16px;color:#27272a;font-size:13.5px;font-style:italic;line-height:1.65;margin:0 0 22px;">
        "${safeBriefing}"
      </div>
      ${renderEmailPrimaryCta({
        url: `https://admin.nuaborges.com.br/personalizados?order=${encodeURIComponent(order.id)}`,
        label: 'Abrir Pedido no Painel',
        secondaryUrl: contactAction?.url,
        secondaryLabel: contactAction?.label,
      })}
    `,
    footerNote: 'Notificação administrativa interna gerada pela Plataforma Oficial Nua Borges.',
  });
}

export function renderPersonalizadoClientEmailHtml(
  order: PersonalizadoOrder,
  recipientEmail: string
): { subject: string; html: string } {
  const shortId = order.id.replace(/^(ped|pers)_/, '').slice(-6).toUpperCase();
  const accountUrl = `https://nuaborges.com.br/conta?tab=personalizados`;
  const deliveryLabel =
    order.deliveryChannel === 'vault'
      ? 'Cofre digital na sua Área Privativa'
      : 'Canal informado no pedido';

  return {
    subject: 'Pedido confirmado e em produção — Nua Borges',
    html: wrapEmailLayout({
      title: 'Pedido confirmado — Nua Borges',
      preheader: `Recebemos o pagamento do pedido #${shortId}. Acompanhe o andamento na sua conta.`,
      heading: 'Seu pedido entrou em produção',
      eyebrow: 'Pedido Confirmado',
      bodyHtml: `
        <p class="nua-body" style="font-size:14.5px;color:#3f3f46;margin:0 0 18px;line-height:1.65;">
          Olá, <strong class="nua-title" style="color:#18181b;">${escapeHtml(order.clientName || 'Cliente')}</strong>. Seu pagamento foi confirmado e sua encomenda já está na fila de produção.
        </p>
        ${renderEmailDetailsTable([
          { label: 'Referência', value: `#PED-${shortId}`, monospace: true },
          { label: 'Valor pago', value: formatCurrencyBrl(order.totalPrice) },
          { label: 'Entrega', value: deliveryLabel },
          { label: 'Prioridade', value: order.express24h ? 'Express 24h' : 'Padrão' },
          { label: 'Situação', value: 'Em produção', highlightColor: '#15803d' },
        ])}
        <p class="nua-muted" style="font-size:13px;color:#71717a;margin:0 0 8px;">
          Assim que os arquivos forem finalizados, eles serão liberados na sua Área Privativa.
        </p>
        ${renderEmailPrimaryCta({
          url: accountUrl,
          label: 'Acompanhar na Minha Conta',
        })}
      `,
      footerNote: 'E-mail transacional discreto da plataforma Nua Borges. Extrato bancário 100% neutro.',
    }),
  };
}

export async function sendPersonalizadoNotificationEmail(
  env: any,
  order: PersonalizadoOrder
): Promise<boolean> {
  const res = await sendPersonalizadoNotificationEmailDetailed(env, order);
  return res.ok;
}

export async function sendPersonalizadoNotificationEmailDetailed(
  env: any,
  order: PersonalizadoOrder
): Promise<SmtpSendResult> {
  const html = renderPersonalizadoEmailHtml(order);
  const shortId = order.id.replace(/^(ped|pers)_/, '').slice(-6).toUpperCase();
  const safeName = String(order.clientName || 'Cliente').replace(/[\r\n]/g, ' ').slice(0, 80);
  const subject = `[Novo Personalizado] #PED-${shortId} — ${formatCurrencyBrl(order.totalPrice)} (${safeName})`;

  return sendSmtpEmailDetailed(env, {
    to: 'contato@nuaborges.com.br',
    subject,
    html,
  });
}

export async function sendPersonalizadoClientConfirmationEmail(
  env: any,
  order: PersonalizadoOrder,
  recipientEmail?: string | null
): Promise<SmtpSendResult> {
  const candidate = String(
    recipientEmail || (order.clientContact?.includes('@') ? order.clientContact : '')
  )
    .trim()
    .toLowerCase();

  if (!EMAIL_RE.test(candidate)) {
    return { ok: false, error: 'E-mail do cliente indisponível para pedido personalizado.' };
  }

  const tpl = renderPersonalizadoClientEmailHtml(order, candidate);
  return sendSmtpEmailDetailed(env, {
    to: candidate,
    subject: tpl.subject,
    html: tpl.html,
  });
}
