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
import { sendSmtpEmailDetailed } from './_smtpHelper';
import { escapeHtml, renderEmailDetailsTable, wrapEmailLayout } from './id/_emailTemplates';
import { verifyTurnstileToken } from './id/_turnstile';
import { checkAndConsumeRateLimit } from './id/_rateLimiter';
import { hashIpPseudonym } from './_central/secrets';

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

  // 0. RATE LIMITING ATÔMICO NO SUPABASE (NUA-AUD-007)
  const ipHash = await hashIpPseudonym(clientIp, env);
  const rl = await checkAndConsumeRateLimit(env as any, `contact_ip:${ipHash}`, MAX_CONTACT_PER_WINDOW, 900);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: 'Muitas mensagens enviadas. Por favor, aguarde alguns minutos antes de tentar novamente.' }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfterSeconds || 900) } }
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
      turnstileToken?: string;
    };

    const { name, email, subject, message, company_website_verify, renderedAt, turnstileToken } = body;

    // 0.1 Verificação Cloudflare Turnstile obrigatória contra spam/email-bombing
    const ts = await verifyTurnstileToken(env, turnstileToken, clientIp, request.url);
    if (!ts.success) {
      return new Response(
        JSON.stringify({ error: ts.error || 'Verificação de segurança obrigatória.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

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

    // 4. Dispara e-mails via SMTP oficial (para Nua e confirmação para o cliente no padrão Dark Luxury)
    let adminSent = false;
    let adminEmailError: string | undefined;
    try {
      const adminHtml = wrapEmailLayout({
        title: `Novo Contato — ${cleanName}`,
        preheader: `Nova mensagem recebida pelo formulário oficial (${cleanSubject || 'Contato'}).`,
        heading: 'Nova mensagem de contato',
        eyebrow: 'Assessoria & Contato · Nua Borges',
        bodyHtml: `
          ${renderEmailDetailsTable([
            { label: 'Nome', value: cleanName },
            { label: 'E-mail', value: cleanEmail },
            { label: 'Assunto', value: cleanSubject || 'Contato Geral' },
          ])}
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.16em;color:#C97A8D;margin:0 0 8px;">
            Mensagem recebida
          </div>
          <div class="nua-quote" style="background-color:#f4f4f5;border-left:3px solid #661C30;border-radius:6px;padding:14px 16px;color:#27272a;font-size:13.5px;line-height:1.65;white-space:pre-wrap;">
            ${escapeHtml(cleanMessage)}
          </div>
        `,
        footerNote: 'Responda diretamente a este e-mail para retornar ao remetente.',
      });

      const adminRes = await sendSmtpEmailDetailed(env, {
        to: 'contato@nuaborges.com.br',
        replyTo: cleanEmail,
        subject: `[Novo Contato] ${cleanName} — ${cleanSubject || 'Mensagem'}`,
        html: adminHtml,
      });
      adminSent = adminRes.ok;
      adminEmailError = adminRes.error;
      // NUA-AUD-007: não dispara auto-resposta automática para e-mail não verificado (previne email-bombing)
    } catch (emailErr: any) {
      adminEmailError = emailErr?.message;
      console.error('[Contact Email Dispatch Error]:', emailErr);
    }

    if (!adminSent) {
      console.error('[Contact] Entrega ao admin falhou:', adminEmailError);
      await recordAuditEvent(env, request, {
        type: 'HONEYPOT_FORM_SPAM',
        severity: 'warning',
        summary: `Falha ao entregar mensagem de contato por e-mail de ${cleanName}`,
        details: { name: cleanName, email: cleanEmail, subject: cleanSubject, clientIp, error: adminEmailError },
      }).catch(() => {});

      return new Response(
        JSON.stringify({
          error: 'Não foi possível entregar sua mensagem no momento devido a uma indisponibilidade temporária no serviço de e-mail. Por favor, tente novamente em instantes.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
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
