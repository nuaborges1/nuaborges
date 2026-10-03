/**
 * Cloudflare Pages Function: POST /api/contact
 *
 * Endpoint do formulário de contato com proteção Honeypot e Time-Trap:
 * 1. Campo Honeypot ('company_website_verify'): Invisível para humanos, mas preenchido por bots.
 * 2. Time-Trap ('renderedAt'): Rejeita envios em menos de 2.5 segundos (velocidade sobre-humana de scripts).
 * 3. Sanitização de entradas e registro no feed de auditoria.
 */

import { recordAuditEvent } from './_auditHelper';
import { isValidEmail, sanitizeText } from './_security';

interface Env {
  BUCKET?: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  const clientIp =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For') ||
    '127.0.0.1';
  const country = request.headers.get('CF-IPCountry') || 'BR';

  try {
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
      company_website_verify?: string; // Campo Honeypot
      renderedAt?: number; // Time-Trap
    };

    const { name, email, subject, message, company_website_verify, renderedAt } = body;

    // 1. VERIFICAÇÃO HONEYPOT (Campo Oculto)
    // Se o campo estiver preenchido com qualquer caractere, é 100% um bot!
    if (company_website_verify && company_website_verify.trim() !== '') {
      await recordAuditEvent(env, request, {
        type: 'HONEYPOT_FORM_SPAM',
        severity: 'warning',
        summary: `Spam de formulário bloqueado por Honeypot! Bot preencheu campo oculto a partir de ${clientIp} [${country}]`,
        details: {
          clientIp,
          honeypotValue: company_website_verify.substring(0, 100),
          botSubmittedName: name,
          botSubmittedEmail: email,
        },
      });

      // Retorna 200 fictício para o bot achar que teve sucesso e não tentar contornar a proteção
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Sua mensagem foi enviada com sucesso.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. VERIFICAÇÃO TIME-TRAP (Velocidade de Envio)
    // Humanos levam no mínimo 2.5 a 5 segundos para preencher um formulário
    const now = Date.now();
    if (renderedAt && typeof renderedAt === 'number') {
      const elapsedMs = now - renderedAt;
      if (elapsedMs < 2500) {
        await recordAuditEvent(env, request, {
          type: 'HONEYPOT_TIME_TRAP',
          severity: 'warning',
          summary: `Envio ultra-rápido detectado por Time-Trap (${elapsedMs}ms). Provável automação de bot em ${clientIp}`,
          details: {
            clientIp,
            elapsedMs,
            botSubmittedName: name,
            botSubmittedEmail: email,
          },
        });

        // Resposta silenciosa de sucesso falso
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Sua mensagem foi enviada com sucesso.',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 3. Validação de campos legítimos
    const cleanName = sanitizeText(name, 100);
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanSubject = sanitizeText(subject, 120);
    const cleanMessage = sanitizeText(message, 3000);

    if (!cleanName || !cleanEmail || !cleanMessage) {
      return new Response(
        JSON.stringify({ error: 'Por favor, preencha todos os campos obrigatórios.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!isValidEmail(cleanEmail)) {
      return new Response(
        JSON.stringify({ error: 'Por favor, informe um endereço de e-mail válido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Registra mensagem legítima recebida no log de auditoria
    await recordAuditEvent(env, request, {
      type: 'CONTACT_MESSAGE_RECEIVED',
      severity: 'info',
      summary: `Nova proposta de contato recebida de ${cleanName} (${cleanEmail}) — [${cleanSubject}]`,
      details: {
        name: cleanName,
        email: cleanEmail,
        subject: cleanSubject,
        preview: cleanMessage.substring(0, 200),
        clientIp,
        country,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Mensagem enviada com sucesso! Em breve entraremos em contato.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[Contact] Erro ao processar mensagem:', err);
    return new Response(
      JSON.stringify({ error: 'Falha ao processar envio de mensagem.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
