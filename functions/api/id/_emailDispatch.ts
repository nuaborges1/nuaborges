/**
 * Dispatcher de E-mail Transacional — NUA ID
 *
 * Isola o import de `_smtpHelper` (que referencia `cloudflare:sockets`) para permitir
 * execução nativa tanto em Cloudflare Pages Functions quanto em suítes de teste Node.js.
 */

import { htmlToPlainText } from '../_smtpHelper';

export interface DispatchEmailOptions {
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  meta?: Record<string, any>;
}

export async function dispatchTransactionalEmail(
  env: Record<string, any>,
  options: DispatchEmailOptions
): Promise<{ sent: boolean; error?: string; messageId?: string }> {
  try {
    if (typeof env?.__EMAIL_SENDER__ === 'function') {
      const ok = await env.__EMAIL_SENDER__({
        to: options.to,
        subject: options.subject,
        html: options.html,
        ...(options.meta || {}),
      });
      return { sent: Boolean(ok), error: ok ? undefined : 'Test sender returned false' };
    }

    const derivedText = options.text || htmlToPlainText(options.html);

    let hostingerError: string | undefined;

    // 1. Em ambientes Edge (Cloudflare Pages), o Hostinger Mail API (HTTPS REST via fetch nativo)
    // é o transporte prioritário, contornando bloqueios de proxy de sockets da Cloudflare.
    if (env?.HOSTINGER_MAIL_API_KEY) {
      try {
        const { sendEmail } = await import('../mail/_hostingerClient.ts');
        await sendEmail(env, {
          to: [options.to],
          displayName: 'NUA Borges',
          subject: options.subject,
          html: options.html,
          ...(derivedText ? { text: derivedText } : {}),
        });
        return { sent: true };
      } catch (apiError: any) {
        hostingerError = `Hostinger Mail API falhou: ${apiError?.message || apiError}`;
        console.error('[NUA ID EmailDispatch]', hostingerError);
        // Continua para tentar fallback SMTP se configurado
      }
    }

    // 2. Fallback via SMTP direto (quando credenciais SMTP estão configuradas)
    if (env?.SMTP_USER && env?.SMTP_PASS) {
      try {
        const { sendSmtpEmailDetailed } = await import('../_smtpHelper');
        // Evita reexecutar a Hostinger Mail API em loop quando ela acabou de falhar acima
        const smtpEnv = hostingerError ? { ...env, HOSTINGER_MAIL_API_KEY: '' } : env;
        const smtpRes = await sendSmtpEmailDetailed(smtpEnv as any, {
          to: options.to,
          replyTo: options.replyTo,
          subject: options.subject,
          html: options.html,
          ...(derivedText ? { text: derivedText } : {}),
        });
        if (smtpRes.ok) {
          return { sent: true, messageId: smtpRes.messageId };
        }
        return {
          sent: false,
          error: hostingerError
            ? `${hostingerError} | SMTP: ${smtpRes.error || 'falhou'}`
            : smtpRes.error || 'Falha ao enviar e-mail via SMTP.',
        };
      } catch (smtpErr: any) {
        console.error('[NUA ID EmailDispatch] Fallback SMTP falhou:', smtpErr?.message || smtpErr);
        return {
          sent: false,
          error: hostingerError || 'Falha ao enviar e-mail via transporte alternativo.',
        };
      }
    }

    if (hostingerError) {
      return { sent: false, error: hostingerError };
    }

    return {
      sent: false,
      error: 'Serviço de envio de e-mail não configurado no servidor.',
    };
  } catch (err: any) {
    const msg = err?.message || 'Erro ao despachar e-mail transacional.';
    console.error('[NUA ID EmailDispatch] Erro:', msg);
    return { sent: false, error: msg };
  }
}
