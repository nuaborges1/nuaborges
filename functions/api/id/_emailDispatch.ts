/**
 * Dispatcher de E-mail Transacional — NUA ID
 *
 * Isola o import de `_smtpHelper` (que referencia `cloudflare:sockets`) para permitir
 * execução nativa tanto em Cloudflare Pages Functions quanto em suítes de teste Node.js.
 */

export interface DispatchEmailOptions {
  to: string;
  subject: string;
  html: string;
  meta?: Record<string, any>;
}

export async function dispatchTransactionalEmail(
  env: Record<string, any>,
  options: DispatchEmailOptions
): Promise<{ sent: boolean; error?: string }> {
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

    const { sendSmtpEmail } = await import('../_smtpHelper');
    const ok = await sendSmtpEmail(env, {
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    return { sent: ok, error: ok ? undefined : 'SMTP retornou falha no envio.' };
  } catch (err: any) {
    const msg = err?.message || 'Erro ao despachar e-mail transacional.';
    console.error('[NUA ID EmailDispatch] Erro:', msg);
    return { sent: false, error: msg };
  }
}
