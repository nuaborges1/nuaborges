/**
 * Cloudflare Pages Function: /api/vip/subscribe
 *
 * - GET (admin): Lista leads da Lista VIP salvos no Supabase (`site_content` chave `vip_leads_v1`)
 * - POST (público): Cadastra lead por e-mail com rate limit por IP e dispara e-mail transacional automático de boas-vindas
 * - PUT (admin): Reenvia e-mail de boas-vindas para um lead ou envia e-mail de teste do template configurado
 * - DELETE (admin): Remove um lead por id
 */

import {
  getSiteContentFromSupabase,
  getSystemKVFromSupabase,
  setSystemKVInSupabase,
} from '../_supabaseStore';
import { checkAndConsumeRateLimit } from '../id/_rateLimiter';
import { getClientIp, sha256Hex } from '../id/_crypto';
import { getSessionCookie, parseAndVerifySessionToken } from '../_authHelper';
import { dispatchTransactionalEmail } from '../id/_emailDispatch';
import { escapeHtml, renderEmailPrimaryCta, sanitizeEmailHref, wrapEmailLayout } from '../id/_emailTemplates';

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  ADMIN_API_SECRET?: string;
  ADMIN_PASSWORD?: string;
  HOSTINGER_MAIL_API_KEY?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  [key: string]: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

interface VipEmailConfig {
  welcomeEmailEnabled?: boolean;
  welcomeEmailSubject?: string;
  welcomeEmailHeading?: string;
  welcomeEmailBody?: string;
  welcomeEmailCtaText?: string;
  welcomeEmailCtaUrl?: string;
}

const VIP_LEADS_KEY = 'vip_leads_v1';
const EMAIL_RE = /^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/;

const DEFAULT_WELCOME_EMAIL: Required<VipEmailConfig> = {
  welcomeEmailEnabled: true,
  welcomeEmailSubject: 'Confirmação de cadastro — Lista Reservada',
  welcomeEmailHeading: 'Seu cadastro foi confirmado',
  welcomeEmailBody:
    'Olá, {nome}!\n\nSeu cadastro na lista reservada foi confirmado. Por aqui você receberá avisos antecipados e novidades com total discrição.',
  welcomeEmailCtaText: 'Acessar Novidades',
  welcomeEmailCtaUrl: 'https://nuaborges.com.br/avulsos',
};

async function isAdminSession(request: Request, env: Env): Promise<boolean> {
  const { getAdminSessionSecret } = await import('../_central/secrets');
  const { parseAndVerifyActiveAdminSession } = await import('../_central/adminSessions');
  const secret = getAdminSessionSecret(env as any);
  if (!secret) return false;
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : getSessionCookie(request);
  if (!token) return false;
  const payload = await parseAndVerifyActiveAdminSession(env as any, token, secret, ['admin', 'dev', 'client']);
  return Boolean(payload);
}

async function resolveVipEmailConfig(env: Env, override?: VipEmailConfig): Promise<Required<VipEmailConfig>> {
  let stored: VipEmailConfig = {};
  try {
    const published = await getSiteContentFromSupabase(env, 'published_content');
    if (published && typeof published === 'object' && published.vipClub) {
      stored = published.vipClub as VipEmailConfig;
    }
  } catch {}

  const merged = { ...stored, ...(override || {}) };
  return {
    welcomeEmailEnabled: merged.welcomeEmailEnabled !== false,
    welcomeEmailSubject: String(merged.welcomeEmailSubject || DEFAULT_WELCOME_EMAIL.welcomeEmailSubject).trim(),
    welcomeEmailHeading: String(merged.welcomeEmailHeading || DEFAULT_WELCOME_EMAIL.welcomeEmailHeading).trim(),
    welcomeEmailBody: String(merged.welcomeEmailBody || DEFAULT_WELCOME_EMAIL.welcomeEmailBody).trim(),
    welcomeEmailCtaText: String(merged.welcomeEmailCtaText ?? DEFAULT_WELCOME_EMAIL.welcomeEmailCtaText).trim(),
    welcomeEmailCtaUrl: String(merged.welcomeEmailCtaUrl ?? DEFAULT_WELCOME_EMAIL.welcomeEmailCtaUrl).trim(),
  };
}

function buildVipWelcomeEmail(name: string, cfg: Required<VipEmailConfig>): { subject: string; html: string; text: string } {
  const safeName = name.trim() || 'Visitante';
  const interpolatedBody = cfg.welcomeEmailBody.replace(/\{nome\}/gi, safeName);
  const paragraphs = interpolatedBody
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const paragraphsHtml = paragraphs
    .map(
      (p) =>
        `<p class="nua-body" style="margin:0 0 14px;font-size:14.5px;color:#3f3f46;line-height:1.65;">${escapeHtml(p).replace(/\n/g, '<br />')}</p>`
    )
    .join('');

  const safeHref = sanitizeEmailHref(cfg.welcomeEmailCtaUrl);
  const ctaHtml =
    safeHref && cfg.welcomeEmailCtaText
      ? renderEmailPrimaryCta({ url: safeHref, label: cfg.welcomeEmailCtaText })
      : '';

  const subject = cfg.welcomeEmailSubject.replace(/\{nome\}/gi, safeName);
  const heading = cfg.welcomeEmailHeading.replace(/\{nome\}/gi, safeName);

  const html = wrapEmailLayout({
    title: subject,
    preheader: paragraphs[0] || heading,
    eyebrow: 'Lista Reservada',
    heading,
    bodyHtml: `${paragraphsHtml}${ctaHtml}`,
    footerNote:
      'Você recebeu este e-mail automático porque confirmou seu cadastro na lista reservada. Comunicação 100% discreta.',
  });

  const text = `${heading}\n\n${interpolatedBody}${safeHref ? `\n\n${cfg.welcomeEmailCtaText || 'Acessar'}: ${safeHref}` : ''}`;

  return { subject, html, text };
}

export const onRequestGet = async (context: PagesContext<Env>) => {
  const { request, env } = context;
  if (!(await isAdminSession(request, env))) {
    return Response.json({ success: false, error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const existing = await getSystemKVFromSupabase(env, VIP_LEADS_KEY);
  const leads = Array.isArray(existing) ? existing : [];
  return Response.json({ success: true, leads });
};

export const onRequestDelete = async (context: PagesContext<Env>) => {
  const { request, env } = context;
  if (!(await isAdminSession(request, env))) {
    return Response.json({ success: false, error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const id = new URL(request.url).searchParams.get('id')?.trim();
  if (!id) {
    return Response.json({ success: false, error: 'Selecione o contato que deseja remover.' }, { status: 400 });
  }
  const existing = await getSystemKVFromSupabase(env, VIP_LEADS_KEY);
  const list = Array.isArray(existing) ? existing : [];
  const next = list.filter((l: any) => l?.id !== id);
  const ok = await setSystemKVInSupabase(env, VIP_LEADS_KEY, next);
  if (!ok) {
    return Response.json({ success: false, error: 'Falha ao remover contato.' }, { status: 500 });
  }
  return Response.json({ success: true, deletedId: id });
};

export const onRequestPut = async (context: PagesContext<Env>) => {
  const { request, env } = context;
  if (!(await isAdminSession(request, env))) {
    return Response.json({ success: false, error: 'Acesso não autorizado.' }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: 'resend' | 'test';
      id?: string;
      email?: string;
      name?: string;
      config?: VipEmailConfig;
    };

    if (body.action === 'test') {
      const to = String(body.email || '').trim().toLowerCase();
      if (!to || !EMAIL_RE.test(to)) {
        return Response.json({ success: false, error: 'Informe um e-mail válido para o teste.' }, { status: 400 });
      }
      const cfg = await resolveVipEmailConfig(env, body.config);
      const rendered = buildVipWelcomeEmail(String(body.name || 'Visitante Teste'), cfg);
      const sent = await dispatchTransactionalEmail(env, {
        to,
        subject: `[TESTE] ${rendered.subject}`,
        html: rendered.html,
        text: rendered.text,
        meta: { type: 'vip_welcome_test' },
      });
      if (!sent.sent) {
        return Response.json(
          { success: false, error: sent.error || 'Não foi possível enviar o e-mail de teste.' },
          { status: 502 }
        );
      }
      return Response.json({ success: true, message: `E-mail de teste enviado para ${to}.` });
    }

    if (body.action === 'resend') {
      const id = String(body.id || '').trim();
      if (!id) {
        return Response.json({ success: false, error: 'Contato não informado.' }, { status: 400 });
      }
      const existing = await getSystemKVFromSupabase(env, VIP_LEADS_KEY);
      const list: any[] = Array.isArray(existing) ? existing : [];
      const lead = list.find((l) => l && l.id === id);
      if (!lead || !lead.email || !EMAIL_RE.test(lead.email)) {
        return Response.json(
          { success: false, error: 'Este contato não possui um e-mail válido cadastrado.' },
          { status: 400 }
        );
      }

      const cfg = await resolveVipEmailConfig(env, body.config);
      const rendered = buildVipWelcomeEmail(lead.name || 'Fã VIP', cfg);
      const sent = await dispatchTransactionalEmail(env, {
        to: lead.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        meta: { type: 'vip_welcome_resend', leadId: lead.id },
      });

      lead.welcomeEmailSent = sent.sent;
      if (sent.sent) {
        lead.welcomeEmailSentAt = new Date().toISOString();
        delete lead.welcomeEmailError;
      } else {
        lead.welcomeEmailError = sent.error || 'Falha no envio';
      }
      await setSystemKVInSupabase(env, VIP_LEADS_KEY, list, 'VipWelcomeResend');

      if (!sent.sent) {
        return Response.json(
          { success: false, error: sent.error || 'Não foi possível reenviar o e-mail.' },
          { status: 502 }
        );
      }
      return Response.json({ success: true, lead });
    }

    return Response.json({ success: false, error: 'Ação inválida.' }, { status: 400 });
  } catch (err: any) {
    console.error('[VIP Put Error]:', err);
    return Response.json({ success: false, error: 'Erro interno ao processar disparo.' }, { status: 500 });
  }
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  try {
    try {
      const ipHash = await sha256Hex(getClientIp(request));
      const rl = await checkAndConsumeRateLimit(env as any, `vip_subscribe_ip:${ipHash}`, 8, 600);
      if (!rl.allowed) {
        return Response.json(
          { success: false, error: 'Muitas tentativas em sequência. Aguarde alguns minutos.' },
          { status: 429 }
        );
      }
    } catch {}

    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      email?: string;
      whatsapp?: string;
      turnstileToken?: string;
    };

    const { verifyTurnstileToken } = await import('../id/_turnstile');
    const ts = await verifyTurnstileToken(env, body.turnstileToken, getClientIp(request), request.url);
    if (!ts.success) {
      return Response.json(
        { success: false, error: ts.error || 'Verificação de segurança obrigatória.' },
        { status: 403 }
      );
    }

    const name = String(body.name || '').trim().slice(0, 120);
    const email = String(body.email || '').trim().toLowerCase().slice(0, 160);
    const whatsapp = String(body.whatsapp || '').replace(/\D/g, '').slice(0, 20);

    if (name.length < 2) {
      return Response.json({ success: false, error: 'Informe seu nome.' }, { status: 400 });
    }
    if (!email || !EMAIL_RE.test(email)) {
      return Response.json({ success: false, error: 'Informe um e-mail válido.' }, { status: 400 });
    }

    const existing = await getSystemKVFromSupabase(env, VIP_LEADS_KEY).catch(() => null);
    const list: any[] = Array.isArray(existing) ? existing : [];

    let lead = list.find((l) => l && l.email && String(l.email).toLowerCase() === email);
    let isNew = false;

    if (!lead) {
      isNew = true;
      lead = {
        id: `lead_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`,
        name,
        email,
        ...(whatsapp ? { whatsapp } : {}),
        createdAt: new Date().toISOString(),
        welcomeEmailSent: false,
      };
      list.unshift(lead);
    }

    // Disparo automático do e-mail transacional de boas-vindas (para novos cadastros ou caso ainda não tenha sido enviado)
    let welcomeEmailSent = Boolean(lead.welcomeEmailSent);
    if (isNew || !lead.welcomeEmailSent) {
      const cfg = await resolveVipEmailConfig(env);
      if (cfg.welcomeEmailEnabled) {
        const rendered = buildVipWelcomeEmail(name, cfg);
        const dispatch = await dispatchTransactionalEmail(env, {
          to: email,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          meta: { type: 'vip_welcome', leadId: lead.id },
        });
        welcomeEmailSent = dispatch.sent;
        lead.welcomeEmailSent = dispatch.sent;
        if (dispatch.sent) {
          lead.welcomeEmailSentAt = new Date().toISOString();
          delete lead.welcomeEmailError;
        } else if (dispatch.error) {
          lead.welcomeEmailError = dispatch.error;
        }
      }
    }

    await setSystemKVInSupabase(env, VIP_LEADS_KEY, list.slice(0, 2000), 'VipSubscribe');

    return Response.json(
      {
        success: true,
        message: 'Cadastro confirmado na Lista VIP!',
        welcomeEmailSent,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[VIP Subscribe Error]:', err);
    return Response.json(
      { success: false, error: 'Não foi possível concluir sua inscrição agora. Tente novamente.' },
      { status: 500 }
    );
  }
};
