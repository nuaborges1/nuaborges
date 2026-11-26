/**
 * Design System Oficial de E-mails Transacionais — Nua Borges
 *
 * 100% fiel aos tokens oficiais de `app/globals.css` (ZERO rosa):
 * - Grafite profundo (#0C0D12 / #14151B) + Vinho Maduro (#431322 / #661C30 / #7A293D) + Ouro Sutil (#B89A70)
 * - Fundo externo transparente: mistura-se nativamente ao Gmail, Outlook/Hotmail, Yahoo e Apple Mail
 * - Modo Claro: cabeçalho compacto em grafite #0C0D12 (assinatura NUA BORGES ♡), corpo branco neutro (#FFFFFF)
 *   com bordas #E4E4E7 e botão pílula Vinho Maduro (#661C30)
 * - Modo Escuro: adapta automaticamente para #14151B (mesa de trabalho do projeto) com textos #F4F4F5
 */

export function escapeHtml(input: unknown): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeEmailHref(rawUrl?: string | null): string | null {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

function normalizeHighlightColor(color?: string): string {
  if (!color) return '#18181b';
  const c = color.toLowerCase().trim();
  if (c === '#34d399' || c === '#15803d' || c === '#166534') return '#15803d';
  if (c === '#fbbf24' || c === '#b45309' || c === '#92400e') return '#b45309';
  if (c === '#fb7185' || c === '#be123c' || c === '#9f1239') return '#b91c1c';
  if (c === '#d4d4d8' || c === '#e4e4e7' || c === '#f5eee9') return '#18181b';
  if (c === '#9ca3af' || c === '#71717a' || c === '#7a656c') return '#71717a';
  return color;
}

export function wrapEmailLayout(params: {
  title: string;
  preheader: string;
  heading: string;
  bodyHtml: string;
  eyebrow?: string;
  footerNote?: string;
}): string {
  const eyebrow = params.eyebrow || 'Área Privativa';
  const footerNote =
    params.footerNote ||
    'E-mail transacional automático da plataforma oficial Nua Borges. Comunicação enviada de forma reservada.';

  return `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${escapeHtml(params.title)}</title>
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    body { margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    @media (prefers-color-scheme: dark) {
      .nua-card { background-color: #14151b !important; border-color: #27272a !important; }
      .nua-footer { background-color: #101116 !important; border-top-color: #27272a !important; }
      .nua-title, .nua-val, .nua-code { color: #f4f4f5 !important; }
      .nua-body { color: #d4d4d8 !important; }
      .nua-muted { color: #a1a1aa !important; }
      .nua-link { color: #B89A70 !important; }
      .nua-divider, .nua-row { border-color: #27272a !important; }
      .nua-surface { background-color: #0e0f14 !important; border-color: #27272a !important; }
      .nua-quote { background-color: #0e0f14 !important; border-left-color: #661C30 !important; color: #e4e4e7 !important; }
    }
    [data-ogsc] .nua-card { background-color: #14151b !important; border-color: #27272a !important; }
    [data-ogsc] .nua-title, [data-ogsc] .nua-val, [data-ogsc] .nua-code { color: #f4f4f5 !important; }
    [data-ogsc] .nua-body { color: #d4d4d8 !important; }
    [data-ogsc] .nua-muted { color: #a1a1aa !important; }
    [data-ogsc] .nua-surface { background-color: #0e0f14 !important; border-color: #27272a !important; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:transparent;color:#18181b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${escapeHtml(params.preheader)}</div>
  <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation" style="background-color:transparent;">
    <tr>
      <td align="center" style="padding:18px 12px 26px;">
        <table class="nua-card" width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation" style="max-width:540px;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:16px;overflow:hidden;text-align:left;">
          <!-- Cabeçalho compacto oficial Grafite #0C0D12 + Vinho #661C30 -->
          <tr>
            <td style="padding:20px 28px;background-color:#0c0d12;border-bottom:2px solid #661C30;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation">
                <tr>
                  <td align="left" valign="middle">
                    <span style="font-family:Georgia,'Times New Roman',serif;font-size:15px;font-weight:400;letter-spacing:0.24em;color:#F5EEE9;text-transform:uppercase;">
                      NUA BORGES <span style="color:#B89A70;letter-spacing:0;">&#9825;</span>
                    </span>
                  </td>
                  <td align="right" valign="middle">
                    <span style="font-size:10px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#B89A70;">
                      ${escapeHtml(eyebrow)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Conteúdo principal (neutro e respirável) -->
          <tr>
            <td style="padding:28px 28px 26px;">
              <h1 class="nua-title" style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:400;color:#18181b;margin:0 0 14px;letter-spacing:-0.01em;line-height:1.3;">
                ${escapeHtml(params.heading)}
              </h1>
              ${params.bodyHtml}
            </td>
          </tr>

          <!-- Rodapé neutro discreto -->
          <tr>
            <td class="nua-footer" style="padding:16px 28px 18px;background-color:#fafafa;border-top:1px solid #e4e4e7;">
              <p class="nua-muted" style="margin:0;font-size:11.5px;color:#71717a;line-height:1.55;">
                ${escapeHtml(footerNote)}
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

export function renderEmailPrimaryCta(params: {
  url?: string | null;
  label: string;
  secondaryUrl?: string | null;
  secondaryLabel?: string;
}): string {
  const safePrimary = sanitizeEmailHref(params.url);
  if (!safePrimary) return '';

  const safeSecondary = sanitizeEmailHref(params.secondaryUrl);
  const secondaryBlock =
    safeSecondary && params.secondaryLabel
      ? `<div style="margin-top:12px;">
          <a class="nua-link" href="${escapeHtml(safeSecondary)}" target="_blank" rel="noopener noreferrer" style="font-size:12.5px;color:#661C30;text-decoration:underline;text-underline-offset:3px;">
            ${escapeHtml(params.secondaryLabel)}
          </a>
        </div>`
      : '';

  return `
    <div style="margin:24px 0 4px;text-align:left;">
      <a class="nua-btn" href="${escapeHtml(safePrimary)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 26px;border-radius:9999px;background:linear-gradient(90deg,#431322 0%,#661C30 55%,#7A293D 100%);background-color:#661C30;color:#F5EEE9;text-decoration:none;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;">
        ${escapeHtml(params.label)}
      </a>
      ${secondaryBlock}
    </div>`;
}

export function renderEmailDetailsTable(
  rows: Array<{ label: string; value: string; monospace?: boolean; highlightColor?: string }>
): string {
  const validRows = rows.filter((r) => r.label && r.value);
  if (!validRows.length) return '';

  const htmlRows = validRows
    .map((r, index) => {
      const borderTop = index === 0 ? 'border-top:1px solid #e4e4e7;' : '';
      const resolvedColor = normalizeHighlightColor(r.highlightColor);
      const valClass = r.highlightColor ? '' : 'nua-val';
      return `
        <tr>
          <td class="nua-muted nua-row" style="padding:10px 0;${borderTop}border-bottom:1px solid #e4e4e7;font-size:12.5px;color:#71717a;">
            ${escapeHtml(r.label)}
          </td>
          <td align="right" class="${valClass} nua-row" style="padding:10px 0;${borderTop}border-bottom:1px solid #e4e4e7;font-size:13px;color:${resolvedColor};font-weight:600;${
            r.monospace ? "font-family:'Courier New',Courier,monospace;" : ''
          }">
            ${escapeHtml(r.value)}
          </td>
        </tr>`;
    })
    .join('');

  return `
    <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation" style="margin:18px 0 22px;border-collapse:collapse;">
      ${htmlRows}
    </table>`;
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
      eyebrow: 'Minha Conta',
      bodyHtml: `
        <p class="nua-body" style="font-size:14.5px;color:#3f3f46;margin:0 0 20px;line-height:1.65;">
          Informe o código de 6 dígitos abaixo na tela onde você iniciou o acesso. Ele é de uso único e expira em <strong class="nua-title" style="color:#18181b;">${params.expiresMinutes} minutos</strong>.
        </p>
        <div class="nua-surface" style="background-color:#f4f4f5;border:1px solid #e4e4e7;border-radius:12px;padding:20px 18px;text-align:center;margin:0 0 20px;">
          <div class="nua-code" style="font-family:'Courier New',Courier,monospace;font-size:30px;font-weight:700;letter-spacing:0.24em;color:#18181b;">
            ${spaced}
          </div>
        </div>
        <p class="nua-muted" style="font-size:12px;color:#71717a;margin:0;">
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
  const spaced = safeCode.split('').join(' ');
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
      eyebrow: 'Segurança da Conta',
      bodyHtml: `
        <p class="nua-body" style="font-size:14.5px;color:#3f3f46;margin:0 0 20px;line-height:1.65;">
          Para sua segurança, a alteração de e-mail exige confirmação nos dois endereços. Use o código abaixo (válido por <strong class="nua-title" style="color:#18181b;">${params.expiresMinutes} minutos</strong>):
        </p>
        <div class="nua-surface" style="background-color:#f4f4f5;border:1px solid #e4e4e7;border-radius:12px;padding:20px 18px;text-align:center;margin:0 0 20px;">
          <div class="nua-code" style="font-family:'Courier New',Courier,monospace;font-size:30px;font-weight:700;letter-spacing:0.24em;color:#18181b;">
            ${spaced}
          </div>
        </div>
        <p class="nua-muted" style="font-size:12px;color:#71717a;margin:0;">
          Se você não solicitou esta troca, ignore esta mensagem e revise suas sessões ativas em Minha Conta.
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
  const accountUrl = `${(params.siteUrl || 'https://nuaborges.com.br').replace(/\/$/, '')}/conta?tab=perfil`;
  return {
    subject: 'Novo acesso à sua conta — Nua Borges',
    html: wrapEmailLayout({
      title: 'Alerta de segurança — Nua Borges',
      preheader: 'Um novo acesso foi registrado na sua conta privativa.',
      heading: 'Novo acesso registrado',
      eyebrow: 'Segurança da Conta',
      bodyHtml: `
        <p class="nua-body" style="font-size:14.5px;color:#3f3f46;margin:0 0 18px;line-height:1.65;">
          Identificamos um novo login na sua conta privativa. Se foi você, não é necessário fazer nada.
        </p>
        ${renderEmailDetailsTable([
          { label: 'Dispositivo', value: params.deviceLabel },
          { label: 'Data e hora', value: params.atFormatted },
        ])}
        ${renderEmailPrimaryCta({ url: accountUrl, label: 'Revisar sessões ativas' })}
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
  eyebrow?: string;
}): { subject: string; html: string } {
  const detailsBlock = renderEmailDetailsTable([
    ...(params.orderRef ? [{ label: 'Referência', value: params.orderRef, monospace: true }] : []),
    ...(params.statusLabel ? [{ label: 'Situação', value: params.statusLabel }] : []),
  ]);

  const ctaBlock =
    params.ctaUrl && params.ctaLabel
      ? renderEmailPrimaryCta({ url: params.ctaUrl, label: params.ctaLabel })
      : '';

  return {
    subject: params.subject,
    html: wrapEmailLayout({
      title: params.subject,
      preheader: 'Atualização privativa do seu pedido na plataforma Nua Borges.',
      heading: params.heading,
      eyebrow: params.eyebrow || 'Área Privativa',
      bodyHtml: `
        <p class="nua-body" style="font-size:14.5px;color:#3f3f46;margin:0 0 18px;line-height:1.65;">
          ${escapeHtml(params.message)}
        </p>
        ${detailsBlock}
        ${ctaBlock}
      `,
    }),
  };
}

export function renderAppointmentReminderEmailHtml(params: {
  clientName: string;
  modalityName: string;
  dateFormatted: string;
  dualTimeCombined: string;
  stage: 'day_of' | 'one_hour_before';
  accountUrl: string;
  voucherUrl: string;
  meetingUrl?: string | null;
}): { subject: string; html: string } {
  const isSoon = params.stage === 'one_hour_before';
  const heading = isSoon ? 'Sua chamada começa em breve' : 'Lembrete do seu agendamento hoje';
  const subject = isSoon
    ? 'Seu agendamento começa em breve — Nua Borges'
    : 'Lembrete do seu agendamento hoje — Nua Borges';
  const intro = isSoon
    ? `Olá, ${params.clientName}. Sua chamada privativa acontece em cerca de 1 hora. Recomendamos testar áudio e câmera com antecedência.`
    : `Olá, ${params.clientName}. Este é um lembrete discreto de que seu agendamento privativo acontece hoje.`;

  const safeRoom = sanitizeEmailHref(params.meetingUrl);
  const primaryUrl = safeRoom || params.accountUrl;
  const primaryLabel = safeRoom ? 'Entrar na Sala Privativa' : 'Acessar Minha Conta';

  return {
    subject,
    html: wrapEmailLayout({
      title: subject,
      preheader: `Lembrete do seu horário reservado para ${params.dateFormatted}.`,
      heading,
      eyebrow: 'Lembrete de Agendamento',
      bodyHtml: `
        <p class="nua-body" style="font-size:14.5px;color:#3f3f46;margin:0 0 18px;line-height:1.65;">
          ${escapeHtml(intro)}
        </p>
        ${renderEmailDetailsTable([
          { label: 'Modalidade', value: params.modalityName },
          { label: 'Data', value: params.dateFormatted },
          { label: 'Horário', value: params.dualTimeCombined },
          {
            label: 'Sala virtual',
            value: safeRoom ? 'Link liberado' : 'Disponível na sua conta / voucher',
            highlightColor: safeRoom ? '#15803d' : undefined,
          },
        ])}
        ${renderEmailPrimaryCta({
          url: primaryUrl,
          label: primaryLabel,
          secondaryUrl: params.voucherUrl,
          secondaryLabel: 'Abrir voucher da reserva',
        })}
      `,
      footerNote:
        'Este lembrete foi enviado automaticamente para o seu agendamento confirmado pela plataforma Nua Borges.',
    }),
  };
}

export function renderVaultBrowserConfirmationEmailHtml(params: {
  confirmUrl: string;
  expiresMinutes?: number;
  itemTitle?: string;
}): { subject: string; html: string } {
  const expiresMinutes = params.expiresMinutes ?? 10;
  const itemRow = params.itemTitle
    ? renderEmailDetailsTable([{ label: 'Conteúdo', value: params.itemTitle }])
    : '';
  return {
    subject: 'Confirme este navegador para abrir seu Cofre — Nua Borges',
    html: wrapEmailLayout({
      title: 'Confirmação de acesso ao Cofre — Nua Borges',
      preheader: `Confirme este navegador em até ${expiresMinutes} minutos para visualizar sua compra com segurança.`,
      heading: 'Autorize este navegador',
      eyebrow: 'Cofre Privativo',
      bodyHtml: `
        <p class="nua-body" style="font-size:14.5px;color:#3f3f46;margin:0 0 18px;line-height:1.65;">
          Para proteger sua compra, confirme que foi você quem pediu acesso ao Cofre neste navegador. O botão abaixo vale por <strong class="nua-title" style="color:#18181b;">${expiresMinutes} minutos</strong> e deve ser aberto no mesmo navegador em que você iniciou o pedido.
        </p>
        ${itemRow}
        ${renderEmailPrimaryCta({
          url: params.confirmUrl,
          label: 'Confirmar navegador',
        })}
        <p class="nua-muted" style="font-size:12px;color:#71717a;margin:18px 0 0;">
          Se você não solicitou este acesso, ignore esta mensagem com tranquilidade.
        </p>
      `,
    }),
  };
}

export function renderVaultDeliveryEmailHtml(params: {
  customerName?: string | null;
  itemTitle: string;
  kindLabel: string;
  includedSummary?: string | null;
  orderRef: string;
  amountFormatted?: string | null;
  paymentMethodLabel?: string | null;
  confirmedAtFormatted?: string | null;
  vaultUrl: string;
  accountUrl?: string | null;
  isCustom?: boolean;
}): { subject: string; html: string } {
  const greetingName = String(params.customerName || '').trim();
  const greetingPrefix = greetingName
    ? `Olá, <strong class="nua-title" style="color:#18181b;">${escapeHtml(greetingName)}</strong>. `
    : '';
  const heading = params.isCustom ? 'Sua encomenda está pronta' : 'Sua compra está liberada';
  const eyebrow = params.isCustom ? 'Entrega Privativa' : 'Confirmação de Compra';
  const subject = params.isCustom
    ? 'Sua entrega está disponível — Nua Borges'
    : 'Compra confirmada — Nua Borges';
  const intro = params.isCustom
    ? `${greetingPrefix}Os arquivos da sua encomenda personalizada já estão disponíveis na sua conta privada.`
    : `${greetingPrefix}Seu pagamento foi confirmado e o conteúdo adquirido já está liberado no seu acervo privado.`;

  const detailRows: Array<{ label: string; value: string; monospace?: boolean; highlightColor?: string }> = [
    { label: 'Item adquirido', value: params.itemTitle },
    { label: 'Categoria', value: params.kindLabel },
  ];
  if (params.includedSummary) {
    detailRows.push({ label: 'Conteúdo incluído', value: params.includedSummary });
  }
  detailRows.push({ label: 'Pedido', value: params.orderRef, monospace: true });
  if (params.amountFormatted) {
    detailRows.push({ label: 'Valor pago', value: params.amountFormatted });
  }
  if (params.paymentMethodLabel) {
    detailRows.push({ label: 'Pagamento', value: params.paymentMethodLabel });
  }
  if (params.confirmedAtFormatted) {
    detailRows.push({ label: 'Confirmado em', value: params.confirmedAtFormatted });
  }
  detailRows.push({ label: 'Situação', value: 'Disponível na sua conta', highlightColor: '#15803d' });

  return {
    subject,
    html: wrapEmailLayout({
      title: subject,
      preheader: 'Acesso liberado no seu Cofre privativo Nua Borges.',
      heading,
      eyebrow,
      bodyHtml: `
        <p class="nua-body" style="font-size:14.5px;color:#3f3f46;margin:0 0 18px;line-height:1.65;">
          ${intro}
        </p>
        ${renderEmailDetailsTable(detailRows)}
        <p class="nua-muted" style="font-size:12.5px;color:#71717a;margin:0 0 8px;line-height:1.6;">
          Você pode acessar este conteúdo sempre que quiser pela sua conta em nuaborges.com.br/conta. No primeiro acesso em um novo navegador, confirme o navegador pelo seu e-mail.
        </p>
        ${renderEmailPrimaryCta({
          url: params.vaultUrl,
          label: params.isCustom ? 'Ver minha entrega' : 'Abrir conteúdo na conta',
          secondaryUrl: params.accountUrl || undefined,
          secondaryLabel: params.accountUrl ? 'Ir para Minha Conta' : undefined,
        })}
      `,
      footerNote:
        'E-mail transacional automático da plataforma oficial Nua Borges. Extrato e comunicação 100% discretos.',
    }),
  };
}

export function renderRefundConfirmationEmailHtml(params: {
  customerName?: string | null;
  itemTitle: string;
  orderRef: string;
  refundAmountFormatted: string;
  reason?: string | null;
  accountUrl?: string | null;
}): { subject: string; html: string } {
  const greetingName = String(params.customerName || '').trim();
  const greetingPrefix = greetingName
    ? `Olá, <strong class="nua-title" style="color:#18181b;">${escapeHtml(greetingName)}</strong>. `
    : '';

  const rows: Array<{ label: string; value: string; monospace?: boolean; highlightColor?: string }> = [
    { label: 'Item', value: params.itemTitle },
    { label: 'Pedido', value: params.orderRef, monospace: true },
    { label: 'Valor estornado', value: params.refundAmountFormatted },
    { label: 'Situação', value: 'Estorno confirmado', highlightColor: '#15803d' },
  ];
  if (params.reason && params.reason.trim()) {
    rows.push({ label: 'Motivo registrado', value: params.reason.trim().slice(0, 180) });
  }

  return {
    subject: `Estorno confirmado — ${params.itemTitle} — Nua Borges`,
    html: wrapEmailLayout({
      title: 'Estorno confirmado — Nua Borges',
      preheader: `O estorno de ${params.refundAmountFormatted} foi confirmado pelo Mercado Pago.`,
      heading: 'Seu estorno foi confirmado',
      eyebrow: 'Atualização Financeira',
      bodyHtml: `
        <p class="nua-body" style="font-size:14.5px;color:#3f3f46;margin:0 0 18px;line-height:1.65;">
          ${greetingPrefix}Confirmamos a devolução do pagamento referente ao seu pedido. O valor retorna automaticamente pelo mesmo meio utilizado na compra (via Mercado Pago).
        </p>
        ${renderEmailDetailsTable(rows)}
        ${renderEmailPrimaryCta({
          url: params.accountUrl || 'https://nuaborges.com.br/conta',
          label: 'Ver na Minha Conta',
        })}
      `,
      footerNote:
        'Comunicação transacional automática da plataforma Nua Borges. Em caso de dúvida, responda a este e-mail.',
    }),
  };
}
