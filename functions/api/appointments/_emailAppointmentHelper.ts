import { sendSmtpEmail } from '../_smtpHelper';
import { AppointmentBooking, addMinutesToTime } from '../../../lib/appointmentsCanonical';
import { formatCurrencyBrl, formatDateForDisplay, formatDualTimezone } from '../../../lib/appointments/timeUtils';

export interface EmailResult {
  success: boolean;
  error?: string;
}

const EMAIL_RE = /^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/;

function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!)
  );
}

function sanitizeHttpsUrl(rawUrl?: string | null): string | null {
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

export async function sendAppointmentRescheduledEmail(
  env: any,
  booking: AppointmentBooking,
  previous: { date: string; startTime: string }
): Promise<EmailResult> {
  const recipient = (booking.clientEmail || '').trim();
  if (!EMAIL_RE.test(recipient)) return { success: false, error: 'E-mail do cliente inválido ou ausente.' };

  const voucherUrl = `https://nuaborges.com.br/chamadas/reserva?token=${encodeURIComponent(booking.publicToken)}`;
  const scheduleTz = booking.timezone || 'Europe/Dublin';
  const clientTz = booking.clientTimezone || 'America/Sao_Paulo';
  const duration = Number(booking.durationMinutes) || 30;
  const prevEnd = addMinutesToTime(previous.startTime, duration);
  const prevTimes = formatDualTimezone(previous.date, previous.startTime, prevEnd, scheduleTz, clientTz);
  const times = formatDualTimezone(booking.date, booking.startTime, booking.endTime, scheduleTz, clientTz);

  const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><body style="background:#050507;color:#e4e4e7;font:15px Arial;padding:32px"><main style="max-width:560px;margin:auto;background:#0c0d12;padding:28px;border-radius:16px;border:1px solid rgba(132,60,82,0.3)"><h1 style="color:#fff;font-family:Georgia,serif;font-size:22px">Chamada Reagendada</h1><p>Olá, ${esc(booking.clientName)}. Sua chamada de ${esc(booking.modalityName)} foi alterada.</p><p><strong>Horário anterior:</strong> ${esc(formatDateForDisplay(previous.date))}, ${esc(prevTimes.combined)}</p><p><strong>Novo horário:</strong> ${esc(formatDateForDisplay(booking.date))}, ${esc(times.combined)}</p><p style="color:#a1a1aa">Acesse seu voucher para conferir os dados atualizados e o link da sala privativa.</p><p style="margin-top:24px"><a href="${voucherUrl}" style="display:inline-block;padding:12px 28px;border-radius:50px;background:#843C52;color:#ffffff;text-decoration:none;font-weight:bold;font-size:12px;text-transform:uppercase;letter-spacing:1px">Abrir Voucher Atualizado</a></p></main></body></html>`;
  try {
    const success = await sendSmtpEmail(env, {
      to: recipient,
      subject: 'Novo horário da sua Chamada VIP — Nua Borges',
      html,
    });
    return { success, error: success ? undefined : 'Falha no envio SMTP.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao enviar e-mail.' };
  }
}

export async function sendAppointmentProposalEmail(
  env: any,
  booking: AppointmentBooking
): Promise<EmailResult> {
  const recipient = (booking.clientEmail || '').trim();
  if (!EMAIL_RE.test(recipient) || !booking.proposal) {
    return { success: false, error: 'E-mail do cliente ou proposta ausente.' };
  }

  const voucherUrl = `https://nuaborges.com.br/chamadas/reserva?token=${encodeURIComponent(booking.publicToken)}`;
  const scheduleTz = booking.timezone || 'Europe/Dublin';
  const clientTz = booking.clientTimezone || 'America/Sao_Paulo';
  const duration = Number(booking.durationMinutes) || 30;
  const propEnd = addMinutesToTime(booking.proposal.time, duration);
  const propTimes = formatDualTimezone(booking.proposal.date, booking.proposal.time, propEnd, scheduleTz, clientTz);
  const noteBlock = booking.proposal.note
    ? `<p style="color:#d4d4d8;font-style:italic">Mensagem da Nua: "${esc(booking.proposal.note)}"</p>`
    : '';

  const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><body style="background:#050507;color:#e4e4e7;font:15px Arial;padding:32px"><main style="max-width:560px;margin:auto;background:#0c0d12;padding:28px;border-radius:16px;border:1px solid rgba(132,60,82,0.3)"><h1 style="color:#fff;font-family:Georgia,serif;font-size:22px">Proposta de Novo Horário — Nua Borges</h1><p>Olá, ${esc(booking.clientName)}. A Nua Borges enviou uma sugestão de ajuste para o horário da sua chamada (${esc(booking.modalityName)}).</p><p><strong>Novo horário sugerido:</strong> ${esc(formatDateForDisplay(booking.proposal.date))}, ${esc(propTimes.combined)}</p>${noteBlock}<p style="color:#a1a1aa">Seu horário original continua reservado até sua decisão. Acesse seu voucher abaixo para aceitar ou recusar a sugestão com 1 clique:</p><p style="margin-top:24px"><a href="${voucherUrl}" style="display:inline-block;padding:12px 28px;border-radius:50px;background:#843C52;color:#ffffff;text-decoration:none;font-weight:bold;font-size:12px;text-transform:uppercase;letter-spacing:1px">Responder no Voucher</a></p></main></body></html>`;
  try {
    const success = await sendSmtpEmail(env, {
      to: recipient,
      subject: 'Sugestão de novo horário para sua Chamada VIP — Nua Borges',
      html,
    });
    return { success, error: success ? undefined : 'Falha no envio SMTP.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao enviar e-mail.' };
  }
}

export async function sendAppointmentCancellationEmail(env: any, booking: AppointmentBooking): Promise<EmailResult> {
  const recipient = (booking.clientEmail || '').trim();
  if (!EMAIL_RE.test(recipient)) return { success: false, error: 'E-mail da cliente ausente.' };

  const scheduleTz = booking.timezone || 'Europe/Dublin';
  const clientTz = booking.clientTimezone || 'America/Sao_Paulo';
  const times = formatDualTimezone(booking.date, booking.startTime, booking.endTime, scheduleTz, clientTz);

  const refundMessage =
    booking.refundStatus === 'completed'
      ? `A devolução de ${formatCurrencyBrl(booking.refundAmount || booking.payment.amount)} foi confirmada pelo Mercado Pago.`
      : booking.refundStatus === 'manual_required'
      ? 'O pagamento foi registrado manualmente e a devolução está pendente de conferência pela equipe.'
      : booking.refundStatus === 'pending' || booking.refundStatus === 'failed'
      ? `A devolução${booking.refundAmount ? ` de ${formatCurrencyBrl(booking.refundAmount)}` : ''} está sendo processada pela equipe.`
      : 'Não há devolução pendente para esta reserva.';

  const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><body style="background:#050507;color:#e4e4e7;font:15px Arial;padding:32px"><main style="max-width:560px;margin:auto;background:#0c0d12;padding:28px;border-radius:16px;border:1px solid rgba(132,60,82,0.3)"><h1 style="color:#fff;font-family:Georgia,serif;font-size:22px">Chamada Cancelada</h1><p>Olá, ${esc(booking.clientName)}. Sua chamada de ${esc(booking.modalityName)} para ${esc(formatDateForDisplay(booking.date))} (${esc(times.combined)}) foi cancelada.</p><p><strong>Motivo:</strong> ${esc(booking.cancellationReason || 'Cancelamento registrado')}</p><p style="color:#d4d4d8">${esc(refundMessage)}</p><p style="color:#a1a1aa;margin-top:20px">Se precisar de ajuda, responda a este e-mail ou fale com a equipe Nua Borges.</p></main></body></html>`;
  try {
    const success = await sendSmtpEmail(env, {
      to: recipient,
      subject: 'Atualização da sua Chamada VIP — Nua Borges',
      html,
    });
    return { success, error: success ? undefined : 'Falha no envio SMTP.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao enviar e-mail.' };
  }
}

/**
 * Envia e-mail oficial de confirmação de agendamento de Chamada VIP
 */
export async function sendAppointmentConfirmationEmail(
  env: any,
  booking: AppointmentBooking
): Promise<EmailResult> {
  const recipient = (booking.clientEmail || '').trim();
  if (!EMAIL_RE.test(recipient)) {
    return { success: false, error: 'E-mail do cliente inválido ou ausente.' };
  }

  const scheduleTz = booking.timezone || 'Europe/Dublin';
  const clientTz = booking.clientTimezone || 'America/Sao_Paulo';
  const times = formatDualTimezone(booking.date, booking.startTime, booking.endTime, scheduleTz, clientTz);
  const dataFormatada = formatDateForDisplay(booking.date);
  const voucherUrl = `https://nuaborges.com.br/chamadas/reserva?token=${encodeURIComponent(booking.publicToken)}`;

  const safeMeetingUrl = sanitizeHttpsUrl(booking.meeting?.url);
  const roomBlock = safeMeetingUrl
    ? `
      <div style="margin: 24px 0; padding: 20px; border-radius: 12px; background: rgba(132, 60, 82, 0.15); border: 1px solid rgba(132, 60, 82, 0.35);">
        <p style="margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #ffffff; font-weight: bold;">
          Sala Privativa de Vídeo Liberada
        </p>
        <p style="margin: 0 0 16px; font-size: 13px; color: #e4e4e7; line-height: 1.5;">
          ${esc(booking.meeting?.instructions || 'Sua sala privativa já está liberada. Entre no horário agendado com câmera e microfone funcionando.')}
        </p>
        <a href="${esc(safeMeetingUrl)}" target="_blank" style="display: inline-block; padding: 12px 24px; border-radius: 50px; background: #843C52; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
          Entrar na Sala Virtual
        </a>
      </div>
    `
    : `
      <div style="margin: 24px 0; padding: 20px; border-radius: 12px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08);">
        <p style="margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #a1a1aa; font-weight: bold;">
          Acesso à Sala Privativa
        </p>
        <p style="margin: 0; font-size: 13px; color: #d4d4d8; line-height: 1.5;">
          Sua chamada está confirmada. O link de acesso privativo será liberado no seu voucher assim que estiver preparado pela Nua Borges.
        </p>
      </div>
    `;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Confirmação da sua Chamada VIP — Nua Borges</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050507; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e4e4e7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #050507; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #0c0d12; border: 1px solid rgba(132, 60, 82, 0.3); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);">
          <tr>
            <td style="padding: 36px 32px; background: linear-gradient(180deg, #180d12 0%, #0c0d12 100%); border-bottom: 1px solid rgba(132, 60, 82, 0.25); text-align: center;">
              <h1 style="margin: 0 0 6px; font-size: 22px; font-weight: 300; letter-spacing: 3px; text-transform: uppercase; color: #ffffff;">
                NUA BORGES
              </h1>
              <p style="margin: 0; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #843C52; font-weight: 600;">
                Chamada por Vídeo Exclusiva
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 32px 32px 24px;">
              <p style="margin: 0 0 16px; font-size: 15px; color: #ffffff; font-weight: 500;">
                Olá, ${esc(booking.clientName)}! ♡
              </p>
              <p style="margin: 0 0 24px; font-size: 13px; line-height: 1.6; color: #a1a1aa;">
                Seu pagamento foi confirmado e seu agendamento privativo com Nua Borges está 100% garantido.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #12131a; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 14px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 13px;">
                      <tr>
                        <td style="color: #71717a; width: 35%;">Modalidade:</td>
                        <td style="color: #ffffff; font-weight: 600;">${esc(booking.modalityName)}</td>
                      </tr>
                      <tr>
                        <td style="color: #71717a;">Data:</td>
                        <td style="color: #ffffff; font-weight: 600;">${esc(dataFormatada)}</td>
                      </tr>
                      <tr>
                        <td style="color: #71717a;">Horários:</td>
                        <td style="color: #ffffff; font-weight: 600;">${esc(times.combined)}</td>
                      </tr>
                      <tr>
                        <td style="color: #71717a;">Duração:</td>
                        <td style="color: #ffffff;">${esc(booking.durationMinutes)} minutos</td>
                      </tr>
                      <tr>
                        <td style="color: #71717a;">Valor Pago:</td>
                        <td style="color: #ffffff; font-weight: 600;">${esc(formatCurrencyBrl(booking.price))}</td>
                      </tr>
                      <tr>
                        <td style="color: #71717a;">Status:</td>
                        <td style="color: #34d399; font-weight: bold; text-transform: uppercase; font-size: 11px;">Confirmada</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${roomBlock}

              <div style="text-align: center; margin: 32px 0 24px;">
                <a href="${voucherUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; border-radius: 50px; background: #843C52; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; box-shadow: 0 4px 20px rgba(132, 60, 82, 0.4);">
                  Acessar Voucher da Reserva
                </a>
                <p style="margin: 12px 0 0; font-size: 11px; color: #71717a;">
                  Guarde este e-mail. Você pode consultar seu agendamento em qualquer dispositivo pelo link acima.
                </p>
              </div>

              <div style="padding: 16px; border-radius: 12px; background: rgba(255, 255, 255, 0.02); border-left: 3px solid #843C52; margin-top: 24px;">
                <p style="margin: 0 0 6px; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #ffffff; letter-spacing: 1px;">
                  Orientações Importantes:
                </p>
                <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #a1a1aa; line-height: 1.6;">
                  <li>Acesse o link do voucher alguns minutos antes para verificar som e imagem.</li>
                  <li>Pontualidade é essencial para o aproveitamento integral do seu tempo.</li>
                  <li>Atendimento individual, estritamente confidencial e seguro.</li>
                </ul>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 32px; background-color: #08090c; border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center;">
              <p style="margin: 0 0 6px; font-size: 11px; color: #71717a;">
                Nua Borges · Atendimento VIP Privativo
              </p>
              <p style="margin: 0; font-size: 10px; color: #52525b;">
                Extrato bancário discreto. Este e-mail é intransferível e direcionado ao titular.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const sent = await sendSmtpEmail(env, {
      to: recipient,
      subject: `Confirmação de Agendamento — Chamada VIP com Nua Borges`,
      html,
    });
    return { success: sent, error: sent ? undefined : 'Falha no envio SMTP.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro inesperado ao enviar e-mail.' };
  }
}

/**
 * Envia notificação por e-mail quando o link da sala virtual é disponibilizado ou atualizado
 */
export async function sendMeetingLinkUpdatedEmail(
  env: any,
  booking: AppointmentBooking
): Promise<EmailResult> {
  const recipient = (booking.clientEmail || '').trim();
  const safeMeetingUrl = sanitizeHttpsUrl(booking.meeting?.url);
  if (!EMAIL_RE.test(recipient) || !safeMeetingUrl) {
    return { success: false, error: 'Link da sala ou e-mail inválido.' };
  }

  const scheduleTz = booking.timezone || 'Europe/Dublin';
  const clientTz = booking.clientTimezone || 'America/Sao_Paulo';
  const times = formatDualTimezone(booking.date, booking.startTime, booking.endTime, scheduleTz, clientTz);
  const dataFormatada = formatDateForDisplay(booking.date);
  const voucherUrl = `https://nuaborges.com.br/chamadas/reserva?token=${encodeURIComponent(booking.publicToken)}`;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Link da Sala Privativa Liberado — Nua Borges</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050507; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e4e4e7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #050507; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #0c0d12; border: 1px solid rgba(132, 60, 82, 0.3); border-radius: 20px; overflow: hidden;">
          <tr>
            <td style="padding: 32px; background: linear-gradient(180deg, #180d12 0%, #0c0d12 100%); text-align: center; border-bottom: 1px solid rgba(132, 60, 82, 0.25);">
              <h1 style="margin: 0 0 6px; font-size: 20px; font-weight: 300; letter-spacing: 3px; text-transform: uppercase; color: #ffffff;">
                NUA BORGES
              </h1>
              <p style="margin: 0; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #843C52; font-weight: 600;">
                Sua Sala Virtual está Pronta
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 15px; color: #ffffff;">
                Olá, ${esc(booking.clientName)}! ♡
              </p>
              <p style="margin: 0 0 20px; font-size: 13px; line-height: 1.6; color: #a1a1aa;">
                O link exclusivo da sua sala privativa com Nua Borges para o dia <strong>${esc(dataFormatada)}</strong> (${esc(times.combined)}) já está disponível para acesso.
              </p>

              <div style="margin: 24px 0; padding: 24px; border-radius: 14px; background: rgba(132, 60, 82, 0.15); border: 1px solid rgba(132, 60, 82, 0.35); text-align: center;">
                <p style="margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #ffffff; font-weight: bold;">
                  Sala Virtual Oficial
                </p>
                <p style="margin: 0 0 18px; font-size: 13px; color: #e4e4e7;">
                  ${esc(booking.meeting?.instructions || 'Por favor, teste sua câmera e microfone antes de entrar.')}
                </p>
                <a href="${esc(safeMeetingUrl)}" target="_blank" style="display: inline-block; padding: 13px 30px; border-radius: 50px; background: #843C52; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                  Entrar na Sala Virtual
                </a>
              </div>

              <div style="text-align: center; margin-top: 24px;">
                <a href="${voucherUrl}" target="_blank" style="color: #d4d4d8; font-size: 12px; text-decoration: underline;">
                  Visualizar voucher completo e instruções
                </a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const sent = await sendSmtpEmail(env, {
      to: recipient,
      subject: `Link da Sala Privativa Liberado — Chamada VIP com Nua Borges`,
      html,
    });
    return { success: sent, error: sent ? undefined : 'Falha no envio SMTP.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao enviar e-mail.' };
  }
}
