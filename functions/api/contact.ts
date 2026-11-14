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
import { sendSmtpEmail } from './_smtpHelper';

interface Env {
  [key: string]: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

// In-memory rate limiting map (IP -> { count, resetTime })
const contactRateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_CONTACT_PER_WINDOW = 5;
const WINDOW_MS = 15 * 60 * 1000;

function checkContactRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = contactRateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    contactRateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return true;
  }
  if (record.count >= MAX_CONTACT_PER_WINDOW) {
    return false;
  }
  record.count += 1;
  return true;
}

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  const clientIp =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For') ||
    '127.0.0.1';
  const country = request.headers.get('CF-IPCountry') || 'BR';

  // 0. RATE LIMITING
  if (!checkContactRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ error: 'Muitas mensagens enviadas. Por favor, aguarde alguns minutos antes de tentar novamente.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

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
        summary: `Spam de formulário neutralizado por Honeypot a partir de ${clientIp} [${country}]`,
        details: {
          clientIp,
          honeypotValue: company_website_verify.substring(0, 100),
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Sua mensagem foi enviada com sucesso.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. VERIFICAÇÃO TIME-TRAP (Velocidade de Envio)
    const now = Date.now();
    if (renderedAt && typeof renderedAt === 'number') {
      const elapsedMs = now - renderedAt;
      if (elapsedMs < 2500 || elapsedMs > 24 * 3600 * 1000) {
        await recordAuditEvent(env, request, {
          type: 'HONEYPOT_TIME_TRAP',
          severity: 'warning',
          summary: `Envio automatizado detectado por Time-Trap (${elapsedMs}ms) em ${clientIp}`,
          details: {
            clientIp,
            elapsedMs,
          },
        });

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

    // 4. Dispara e-mails via SMTP oficial (para Nua e confirmação para o cliente)
    try {
      await sendSmtpEmail(env, {
        to: 'contato@nuaborges.com.br',
        subject: `💌 [Novo Contato] ${cleanName} — ${cleanSubject}`,
        html: `
          <div style="font-family: Georgia, serif; background: #050507; color: #fff; padding: 30px; border-radius: 16px;">
            <h2 style="color: #f4a7b9; text-transform: uppercase; letter-spacing: 0.1em; font-size: 20px;">Nova Proposta de Contato</h2>
            <p><strong>Nome:</strong> ${cleanName}</p>
            <p><strong>E-mail:</strong> ${cleanEmail}</p>
            <p><strong>Assunto:</strong> ${cleanSubject}</p>
            <hr style="border-color: rgba(255,255,255,0.1); margin: 20px 0;">
            <p style="white-space: pre-wrap; line-height: 1.6; color: #d4d4d8;">${cleanMessage}</p>
          </div>
        `,
      });

      await sendSmtpEmail(env, {
        to: cleanEmail,
        subject: `✨ Mensagem Recebida — Nua Borges`,
        html: `
          <div style="font-family: Georgia, serif; background: #f7f6f3; color: #222; padding: 30px; border-radius: 12px; border: 1px solid #e9e6df;">
            <h2 style="color: #1a1a1a; text-transform: uppercase; letter-spacing: 0.15em; text-align: center; font-size: 22px;">Nua Borges</h2>
            <p style="text-align: center; color: #9c8e82; font-size: 11px; text-transform: uppercase; letter-spacing: 0.25em;">Cofre Privativo & Galeria Autoral</p>
            <p style="margin-top: 24px;">Olá, <strong>${cleanName}</strong>,</p>
            <p>Recebemos sua mensagem com sucesso. Agradeço o contato e retornarei em breve.</p>
            <p style="margin-top: 30px; color: #666; font-size: 12px;">Atenciosamente,<br><strong>Nua Borges</strong></p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('[Contact Email Dispatch Error]:', emailErr);
    }

    // 5. Registra proposta recebida minimizando PII nos logs de auditoria (LGPD)
    await recordAuditEvent(env, request, {
      type: 'CONTACT_MESSAGE_RECEIVED',
      severity: 'info',
      summary: `Nova proposta de contato recebida de ${cleanName} — [${cleanSubject}]`,
      details: {
        name: cleanName,
        subject: cleanSubject,
        messageLength: cleanMessage.length,
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
