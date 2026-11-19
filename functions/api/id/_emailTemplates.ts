/**
 * Templates de E-mail Transacionais — NUA ID
 *
 * Requisitos atendidos:
 * - Identidade visual Dark Luxury Nua Borges (vinho #661C30 / #843C52, grafite #0c0d12)
 * - Discrição absoluta: assuntos e prévias NUNCA revelam o tipo de conteúdo adquirido
 * - Autenticação exclusivamente por código OTP de 6 dígitos (nunca link mágico)
 * - Sem dados financeiros ou tokens além do estritamente necessário
 */

function escapeHtml(input: string): string {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function wrapEmailLayout(params: {
  title: string;
  preheader: string;
  heading: string;
  bodyHtml: string;
}): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(params.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#050507;color:#F5EEE9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;line-height:1.6;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(params.preheader)}</div>
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#050507;padding:36px 14px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:540px;background-color:#0c0d12;border:1px solid rgba(132,60,82,0.32);border-radius:18px;overflow:hidden;">
          <tr>
            <td style="padding:32px 28px 22px;background:linear-gradient(180deg,#171115 0%,#0c0d12 100%);border-bottom:1px solid rgba(132,60,82,0.22);text-align:center;">
              <div style="font-family:Georgia,serif;font-size:22px;font-weight:400;letter-spacing:0.24em;color:#F5EEE9;text-transform:uppercase;">
                NUA BORGES
              </div>
              <div style="font-size:10px;font-weight:600;letter-spacing:0.24em;text-transform:uppercase;color:#A65B6C;margin-top:6px;">
                Área Privativa · NUA ID
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 28px 26px;">
              <h1 style="font-family:Georgia,serif;font-size:20px;font-weight:400;color:#F5EEE9;margin:0 0 14px;text-align:center;letter-spacing:0.02em;">
                ${escapeHtml(params.heading)}
              </h1>
              ${params.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 24px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0;font-size:11px;color:#71717a;line-height:1.5;">
                E-mail transacional automático da sua conta NUA ID. Se você não reconhece esta solicitação, ignore esta mensagem com segurança.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderAccessCodeEmailHtml(params: {
  code: string;
  expiresMinutes: number;
}): { subject: string; html: string } {
  const safeCode = escapeHtml(params.code);
  const spaced = safeCode.split('').join(' ');

  return {
    subject: 'Seu código de acesso — Nua Borges',
    html: wrapEmailLayout({
      title: 'Código de acesso — Nua Borges',
      preheader: `Use o código temporário para entrar na sua conta. Válido por ${params.expiresMinutes} minutos.`,
      heading: 'Seu código de acesso',
      bodyHtml: `
        <p style="font-size:14px;color:#a1a1aa;margin:0 0 22px;text-align:center;">
          Informe o código de 6 dígitos abaixo na tela onde você iniciou o acesso. Ele é de uso único e expira em <strong style="color:#F5EEE9;">${params.expiresMinutes} minutos</strong>.
        </p>
        <div style="background-color:#171115;border:1px solid rgba(144,54,75,0.45);border-radius:14px;padding:22px 16px;text-align:center;margin:0 0 22px;">
          <div style="font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:700;letter-spacing:0.22em;color:#F5EEE9;">
            ${spaced}
          </div>
        </div>
        <p style="font-size:12px;color:#71717a;margin:0;text-align:center;">
          Por segurança, nunca compartilhe este código com terceiros. Nossa equipe nunca solicita códigos por mensagem.
        </p>
      `,
    }),
  };
}

export function renderEmailChangeCodeEmailHtml(params: {
  code: string;
  stage: 'current' | 'new';
  expiresMinutes: number;
}): { subject: string; html: string } {
  const safeCode = escapeHtml(params.code);
  const label =
    params.stage === 'current'
      ? 'Confirme a alteração no seu e-mail atual'
      : 'Confirme seu novo endereço de e-mail';

  return {
    subject: 'Confirmação de alteração de e-mail — Nua Borges',
    html: wrapEmailLayout({
      title: 'Alteração de e-mail — Nua Borges',
      preheader: 'Código temporário para confirmar a alteração de endereço na sua conta.',
      heading: label,
      bodyHtml: `
        <p style="font-size:14px;color:#a1a1aa;margin:0 0 20px;text-align:center;">
          Para sua segurança, a alteração de e-mail exige confirmação nos dois endereços. Use o código abaixo (válido por ${params.expiresMinutes} minutos):
        </p>
        <div style="background-color:#171115;border:1px solid rgba(144,54,75,0.45);border-radius:14px;padding:20px 16px;text-align:center;margin:0 0 20px;">
          <div style="font-family:'Courier New',Courier,monospace;font-size:30px;font-weight:700;letter-spacing:0.2em;color:#F5EEE9;">
            ${safeCode}
          </div>
        </div>
        <p style="font-size:12px;color:#71717a;margin:0;text-align:center;">
          Se você não solicitou esta troca, ignore esta mensagem e revise suas sessões ativas em Minha NUA.
        </p>
      `,
    }),
  };
}

export function renderSecurityAlertEmailHtml(params: {
  deviceLabel: string;
  atFormatted: string;
  siteUrl?: string;
}): { subject: string; html: string } {
  const accountUrl = `${(params.siteUrl || 'https://nuaborges.com.br').replace(/\/$/, '')}/minha-nua`;
  return {
    subject: 'Novo acesso à sua conta — Nua Borges',
    html: wrapEmailLayout({
      title: 'Alerta de segurança — Nua Borges',
      preheader: 'Um novo acesso foi registrado na sua conta privativa.',
      heading: 'Novo acesso registrado',
      bodyHtml: `
        <p style="font-size:14px;color:#a1a1aa;margin:0 0 18px;text-align:center;">
          Identificamos um novo login na sua conta NUA ID.
        </p>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#14151b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:16px;margin-bottom:22px;">
          <tr>
            <td style="font-size:13px;color:#d4d4d8;">
              <div style="margin-bottom:8px;"><span style="color:#71717a;">Dispositivo:</span> ${escapeHtml(params.deviceLabel)}</div>
              <div><span style="color:#71717a;">Data/Hora:</span> ${escapeHtml(params.atFormatted)}</div>
            </td>
          </tr>
        </table>
        <div style="text-align:center;">
          <a href="${accountUrl}" style="display:inline-block;padding:12px 26px;border-radius:9999px;background-color:#661C30;color:#F5EEE9;text-decoration:none;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">
            Revisar sessões ativas
          </a>
        </div>
      `,
    }),
  };
}

export function renderTransactionalNotificationHtml(params: {
  subject: string;
  heading: string;
  message: string;
  orderRef?: string;
  statusLabel?: string;
  ctaUrl?: string;
  ctaLabel?: string;
}): { subject: string; html: string } {
  const detailsBlock =
    params.orderRef || params.statusLabel
      ? `
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#14151b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:16px;margin:0 0 22px;">
          <tr>
            <td style="font-size:13px;color:#d4d4d8;">
              ${params.orderRef ? `<div style="margin-bottom:6px;"><span style="color:#71717a;">Referência:</span> <span style="font-family:monospace;color:#F5EEE9;">${escapeHtml(params.orderRef)}</span></div>` : ''}
              ${params.statusLabel ? `<div><span style="color:#71717a;">Situação:</span> <strong style="color:#F5EEE9;">${escapeHtml(params.statusLabel)}</strong></div>` : ''}
            </td>
          </tr>
        </table>`
      : '';

  const ctaBlock =
    params.ctaUrl && params.ctaLabel
      ? `<div style="text-align:center;margin-top:8px;">
          <a href="${escapeHtml(params.ctaUrl)}" style="display:inline-block;padding:13px 28px;border-radius:9999px;background-color:#661C30;color:#F5EEE9;text-decoration:none;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">
            ${escapeHtml(params.ctaLabel)}
          </a>
        </div>`
      : '';

  return {
    subject: params.subject,
    html: wrapEmailLayout({
      title: params.subject,
      preheader: 'Atualização privativa na sua conta NUA ID.',
      heading: params.heading,
      bodyHtml: `
        <p style="font-size:14px;color:#a1a1aa;margin:0 0 20px;text-align:center;">
          ${escapeHtml(params.message)}
        </p>
        ${detailsBlock}
        ${ctaBlock}
      `,
    }),
  };
}
