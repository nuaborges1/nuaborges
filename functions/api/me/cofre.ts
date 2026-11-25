import { buildCustomerHintCookieHeader, buildCustomerSessionCookieHeader, getClientIp, getIdSecret, parseDeviceLabel, resolveCustomerSession, SESSION_DURATION_SECONDS } from '../id/_customerGuard';
import { generateSessionId, hashClientIp } from '../id/_crypto';
import { getNuaIdAdapter, getOrderClaim, getProfileById, NuaIdEnv, recordNotificationEvent, saveCustomerSession } from '../id/_nuaIdStore';
import { dispatchTransactionalEmail } from '../id/_emailDispatch';
import { renderVaultBrowserConfirmationEmailHtml } from '../id/_emailTemplates';
import { checkAndConsumeRateLimit } from '../id/_rateLimiter';
import { CONFIRM_SECONDS, TRUST_SECONDS, currentVisit, cookie, Device, digest, setCookie, startVisit, trustedDevice, vaultContents } from './_vault';


interface Challenge { profile: string; order: string; email: string; browser: string; expires: number }
export async function onRequestPost({request, env}: {request:Request; env:NuaIdEnv}) {
  const headers = new Headers({'Content-Type':'application/json','Cache-Control':'private, no-store'});
  const reply = (state:string, data:Record<string,unknown> = {}, status = 200) => new Response(JSON.stringify({state,...data}),{status,headers});
  const origin = request.headers.get('Origin');
  if (!origin || ![new URL(request.url).origin, env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/,'')].includes(origin) || !request.headers.get('Content-Type')?.startsWith('application/json')) return reply('denied',{},403);
  const store = getNuaIdAdapter(env);
  const secret = getIdSecret(env);
  if (!store || !secret) {
    console.error('[Cofre] Indisponível na inicialização:', { hasStore: Boolean(store), hasSecret: Boolean(secret) });
    return reply('unavailable', { reason: 'config_missing' }, 503);
  }
  try {
    let body: Record<string, string>;
    try {
      body = (await request.json()) as Record<string, string>;
    } catch {
      return reply('denied', {}, 400);
    }
    const { action, token, id } = body || {};
    let order = body?.order;
    if (action === 'close') {
      const visit = cookie(request, 'visit');
      if (visit) await store.kvDelete('vault:visit:' + (await digest(visit)));
      return reply('idle');
    }
    if (action === 'resume') {
      const visit = await currentVisit(request, env);
      if (!visit) return reply('missing');
      order = visit.order;
    }
    const account = await resolveCustomerSession(request, env);
    if (action === 'activity') {
      const visit = await currentVisit(request, env);
      return reply(visit && visit.order === order ? 'ready' : 'idle');
    }
    if (action === 'devices' || action === 'revoke') {
      if (!account) return reply('denied', {}, 401);
      const prefix = 'vault:device:' + account.profile.id + ':';
      if (action === 'revoke') {
        if (!/^[a-f0-9]{64}$/.test(id) || !(await store.kvDelete(prefix + id))) return reply('unavailable', {}, 400);
      }
      const devices = (await store.kvListByPrefix<Device>(prefix)).map((row) => row.value).filter((d) => d.expires > Date.now());
      return reply('devices', { devices });
    }
    if (!order || !/^[\w-]{1,128}$/.test(order)) return reply('denied', {}, 400);
    const claim = await getOrderClaim(env, order);
    const owner = claim && (await getProfileById(env, claim.profileId));
    const contents = owner?.status === 'active' && (await vaultContents(env, owner.id, order));
    if (!owner || !contents) return reply(action === 'request' ? 'sent' : 'confirm');
    let device = account?.profile.id === owner.id && (await trustedDevice(request, env, owner.id));
    let sessionId = account?.session.id;
    if (action === 'request') {
      const ip = await hashClientIp(getClientIp(request), secret);
      for (const [key, limit] of [[ip, 12], [owner.id, 4]] as const) {
        if (!(await checkAndConsumeRateLimit(env, 'vault:' + key, limit, 600)).allowed) return reply('wait', {}, 429);
      }
      const proof = crypto.randomUUID();
      const browser = crypto.randomUUID();
      const key = 'vault:challenge:' + (await digest(proof));
      const challenge: Challenge = { profile: owner.id, email: owner.email, order, browser: await digest(browser), expires: Date.now() + CONFIRM_SECONDS * 1000 };
      if (!(await store.kvSet(key, challenge))) {
        console.error('[Cofre] Falha ao persistir challenge do navegador para pedido:', order);
        return reply('unavailable', { reason: 'challenge_store' }, 503);
      }
      const link = new URL('/cofre', env.NEXT_PUBLIC_SITE_URL || 'https://nuaborges.com.br');
      link.hash = new URLSearchParams({ order, confirm: proof }).toString();
      const confirmEmail = renderVaultBrowserConfirmationEmailHtml({
        confirmUrl: link.href,
        expiresMinutes: Math.round(CONFIRM_SECONDS / 60),
        itemTitle: contents.title,
      });
      const sent = await dispatchTransactionalEmail(env, {
        to: owner.email,
        subject: confirmEmail.subject,
        html: confirmEmail.html,
      });
      await recordNotificationEvent(env, {
        profileId: owner.id,
        recipientEmail: owner.email,
        orderRef: order,
        kind: 'vault_browser_confirmation',
        status: sent.sent ? 'sent' : 'failed',
        errorMessage: sent.error,
      }).catch(() => {});
      if (!sent.sent) {
        console.error('[Cofre] Falha ao enviar e-mail de confirmação do navegador:', { order, error: sent.error });
        await store.kvDelete(key);
        return reply('unavailable', { reason: 'email_dispatch' }, 503);
      }
      setCookie(headers, request, 'pending', browser, CONFIRM_SECONDS);
      return reply('sent');
    }
    if (action === 'confirm') {
      if (!token || token.length > 80) return reply('expired', {}, 400);
      const key = 'vault:challenge:' + (await digest(token));
      const challenge = await store.kvGet<Challenge>(key);
      if (!challenge || challenge.expires <= Date.now() || challenge.profile !== owner.id || challenge.order !== order || challenge.email !== owner.email) return reply('expired', {}, 403);
      if (challenge.browser !== (await digest(cookie(request, 'pending')))) return reply('wrongBrowser', {}, 403);
      if (!(await store.kvConsume?.(key))) return reply('expired', {}, 403);
      if (account?.profile.id !== owner.id) {
        sessionId = generateSessionId();
        const now = new Date().toISOString();
        const ua = request.headers.get('User-Agent') || '';
        if (!(await saveCustomerSession(env, { id: sessionId, profileId: owner.id, deviceLabel: parseDeviceLabel(ua), userAgent: ua.slice(0, 240), ipHash: await hashClientIp(getClientIp(request), secret), isRevoked: false, createdAt: now, lastSeenAt: now, expiresAt: new Date(Date.now() + SESSION_DURATION_SECONDS * 1000).toISOString() }))) {
          console.error('[Cofre] Falha ao salvar sessão do cliente na confirmação:', order);
          return reply('unavailable', { reason: 'session_save' }, 503);
        }
        headers.append('Set-Cookie', await buildCustomerSessionCookieHeader(sessionId, secret, request));
        headers.append('Set-Cookie', buildCustomerHintCookieHeader(request));
      }
      const raw = crypto.randomUUID();
      device = { id: await digest(raw), label: parseDeviceLabel(request.headers.get('User-Agent')), expires: Date.now() + TRUST_SECONDS * 1000 };
      if (!(await store.kvSet('vault:device:' + owner.id + ':' + device.id, device))) {
        console.error('[Cofre] Falha ao salvar dispositivo confiável:', order);
        return reply('unavailable', { reason: 'device_store' }, 503);
      }
      setCookie(headers, request, 'browser', raw, TRUST_SECONDS);
      setCookie(headers, request, 'pending', '', 0);
    } else if (action !== 'open' && action !== 'resume') return reply('denied', {}, 400);
    if (!device || !sessionId) return reply('confirm');
    if (action !== 'resume') {
      try {
        await startVisit(request, env, headers, { order, device: device.id, accountSession: sessionId });
      } catch (visitErr: any) {
        console.error('[Cofre] Falha ao iniciar visita do cofre:', { order, error: visitErr?.message || visitErr });
        return reply('unavailable', { reason: 'visit_store' }, 503);
      }
    }
    const files = contents.files.map((f) => {
      const url = '/media/' + f.path.split('/').map(encodeURIComponent).join('/') + '?cofre=1';
      return { label: f.label, video: f.video, url, download: contents.right.allowDownload ? url + '&dl=1' : undefined };
    });
    return reply('ready', { files, order, title: contents.title });
  } catch (err: any) {
    console.error('[Cofre] Erro inesperado em /api/me/cofre:', err?.message || err);
    return reply('unavailable', { reason: 'unhandled' }, 503);
  }
}