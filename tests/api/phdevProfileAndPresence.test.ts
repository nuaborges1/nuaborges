import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { onRequestPost as adminLogin } from '@/functions/api/auth/login';
import { onRequestGet as adminSession } from '@/functions/api/auth/session';
import { onRequestPost as adminLogout } from '@/functions/api/auth/logout';
import {
  onRequestGet as getPresence,
  onRequestPost as postPresence,
  PRESENCE_STORAGE_KEY,
  PRESENCE_HEARTBEAT_TTL_MS,
  PRESENCE_INACTIVITY_TTL_MS,
} from '@/functions/api/admin/presence';
import { IsolatedBackendHarness } from '../helpers/supabaseStub';
import { extractCookies, serializeCookieJar, TEST_SECRETS } from '../factories/domainFactories';

describe('PHDEV — Perfil Independente, Sessões Isoladas & Presença Discreta', () => {
  let harness: IsolatedBackendHarness;
  let env: Record<string, any>;

  const NUA_PASSWORD = TEST_SECRETS.ADMIN_PASSWORD;
  const DEV_PASSWORD = 'DevTestPassword!2026';

  beforeEach(() => {
    harness = new IsolatedBackendHarness();
    harness.installFetchInterceptor();
    env = harness.createEnv({
      ADMIN_PASSWORD: NUA_PASSWORD,
      DEV_PANEL_PASSWORD: DEV_PASSWORD,
      CLIENT_PASSWORD: '',
      ADMIN_SESSION_SECRET: TEST_SECRETS.ADMIN_SESSION_SECRET,
    });
  });

  afterEach(() => {
    harness.restoreFetch();
  });

  async function doLogin(password: string, ip = '203.0.113.10') {
    const res = await adminLogin({
      request: new Request('https://admin.nuaborges.com.br/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': ip,
        },
        body: JSON.stringify({ password }),
      }),
      env,
    });
    const cookies = extractCookies(res.headers);
    const cookieHeader = serializeCookieJar(cookies);
    const body = await res.json();
    return { res, body, cookieHeader };
  }

  it('autentica Nua Borges e PHDEV com senhas distintas, rejeita senha inválida e identifica corretamente na sessão', async () => {
    const wrong = await doLogin('senha-errada-123', '203.0.113.11');
    expect(wrong.res.status).toBe(401);

    const nua = await doLogin(NUA_PASSWORD, '203.0.113.12');
    expect(nua.res.status).toBe(200);
    expect(nua.body).toMatchObject({ success: true, profile: 'nua', displayName: 'Nua Borges' });
    expect(nua.body.token).toBeUndefined();

    const phdev = await doLogin(DEV_PASSWORD, '203.0.113.13');
    expect(phdev.res.status).toBe(200);
    expect(phdev.body).toMatchObject({ success: true, role: 'dev', profile: 'phdev', displayName: 'PHDEV' });
    expect(phdev.body.token).toBeUndefined();

    // GET /api/auth/session reflete exatamente a sessão autenticada
    const nuaSession = await adminSession({
      request: new Request('https://admin.nuaborges.com.br/api/auth/session', {
        headers: { Cookie: nua.cookieHeader },
      }),
      env: env as any,
    });
    expect(await nuaSession.json()).toMatchObject({
      authenticated: true,
      profile: 'nua',
      displayName: 'Nua Borges',
    });

    const devSession = await adminSession({
      request: new Request('https://admin.nuaborges.com.br/api/auth/session', {
        headers: { Cookie: phdev.cookieHeader },
      }),
      env: env as any,
    });
    expect(await devSession.json()).toMatchObject({
      authenticated: true,
      role: 'dev',
      profile: 'phdev',
      displayName: 'PHDEV',
    });
  });

  it('mantém sessões independentes: logout do PHDEV não derruba sessão da Nua e vice-versa', async () => {
    const nua = await doLogin(NUA_PASSWORD, '203.0.113.21');
    const phdev = await doLogin(DEV_PASSWORD, '203.0.113.22');

    // PHDEV faz logout
    const devOut = await adminLogout({
      request: new Request('https://admin.nuaborges.com.br/api/auth/logout', {
        method: 'POST',
        headers: { Cookie: phdev.cookieHeader },
      }),
      env: env as any,
    });
    expect(devOut.status).toBe(200);

    // Sessão do PHDEV revogada
    const devCheck = await adminSession({
      request: new Request('https://admin.nuaborges.com.br/api/auth/session', {
        headers: { Cookie: phdev.cookieHeader },
      }),
      env: env as any,
    });
    expect(await devCheck.json()).toMatchObject({ authenticated: false });

    // Sessão da Nua continua 100% ativa!
    const nuaCheck = await adminSession({
      request: new Request('https://admin.nuaborges.com.br/api/auth/session', {
        headers: { Cookie: nua.cookieHeader },
      }),
      env: env as any,
    });
    expect(await nuaCheck.json()).toMatchObject({
      authenticated: true,
      profile: 'nua',
      displayName: 'Nua Borges',
    });
  });

  it('presença discreta: atualiza página em tempo real para o PHDEV, bloqueia leitura pela cliente, respeita inatividade e limpa no logout', async () => {
    const nua = await doLogin(NUA_PASSWORD, '203.0.113.31');
    const phdev = await doLogin(DEV_PASSWORD, '203.0.113.32');

    // 1. Cliente (Nua) NÃO pode consultar presença (403)
    const clientRead = await getPresence({
      request: new Request('https://admin.nuaborges.com.br/api/admin/presence', {
        method: 'GET',
        headers: { Cookie: nua.cookieHeader },
      }),
      env: env as any,
    });
    expect(clientRead.status).toBe(403);

    // 2. Antes do heartbeat, PHDEV vê offline
    const before = await getPresence({
      request: new Request('https://admin.nuaborges.com.br/api/admin/presence', {
        method: 'GET',
        headers: { Cookie: phdev.cookieHeader },
      }),
      env: env as any,
    });
    expect(before.status).toBe(200);
    expect(await before.json()).toMatchObject({ online: false });

    // 3. Nua envia heartbeat em Conteúdos & Packs
    const hb1 = await postPresence({
      request: new Request('https://admin.nuaborges.com.br/api/admin/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: nua.cookieHeader },
        body: JSON.stringify({
          module: 'conteudos',
          moduleLabel: 'Conteúdos & Packs',
          pathname: '/conteudos',
          active: true,
        }),
      }),
      env: env as any,
    });
    expect(hb1.status).toBe(200);

    // PHDEV vê Nua online em Conteúdos & Packs
    const read1 = await getPresence({
      request: new Request('https://admin.nuaborges.com.br/api/admin/presence', {
        method: 'GET',
        headers: { Cookie: phdev.cookieHeader },
      }),
      env: env as any,
    });
    expect(await read1.json()).toMatchObject({
      online: true,
      module: 'conteudos',
      moduleLabel: 'Conteúdos & Packs',
      pathname: '/conteudos',
    });

    // 4. PHDEV enviando POST é ignorado e não altera a página da Nua
    const devPost = await postPresence({
      request: new Request('https://admin.nuaborges.com.br/api/admin/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: phdev.cookieHeader },
        body: JSON.stringify({ module: 'configuracoes', moduleLabel: 'Configurações' }),
      }),
      env: env as any,
    });
    expect(await devPost.json()).toMatchObject({ success: true, ignored: true });

    // 5. Nua navega para Chamadas VIP -> presença atualiza automaticamente
    await postPresence({
      request: new Request('https://admin.nuaborges.com.br/api/admin/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: nua.cookieHeader },
        body: JSON.stringify({
          module: 'chamadas',
          moduleLabel: 'Chamadas VIP',
          pathname: '/chamadas',
          active: true,
        }),
      }),
      env: env as any,
    });
    const read2 = await getPresence({
      request: new Request('https://admin.nuaborges.com.br/api/admin/presence', {
        method: 'GET',
        headers: { Cookie: phdev.cookieHeader },
      }),
      env: env as any,
    });
    expect(await read2.json()).toMatchObject({
      online: true,
      module: 'chamadas',
      moduleLabel: 'Chamadas VIP',
    });

    // 6. Simula inatividade da Nua além do limite -> PHDEV vê offline (sem presença falsa)
    const presenceRow = harness.tables.site_content.find((r) => r.key === PRESENCE_STORAGE_KEY)!;
    presenceRow.content.lastActivityAt = new Date(Date.now() - PRESENCE_INACTIVITY_TTL_MS - 10_000).toISOString();
    const readInactive = await getPresence({
      request: new Request('https://admin.nuaborges.com.br/api/admin/presence', {
        method: 'GET',
        headers: { Cookie: phdev.cookieHeader },
      }),
      env: env as any,
    });
    expect(await readInactive.json()).toMatchObject({ online: false });

    // 7. Simula heartbeat expirado (> 45s) -> PHDEV vê offline
    presenceRow.content.lastActivityAt = new Date().toISOString();
    presenceRow.content.lastSeenAt = new Date(Date.now() - PRESENCE_HEARTBEAT_TTL_MS - 10_000).toISOString();
    const readStale = await getPresence({
      request: new Request('https://admin.nuaborges.com.br/api/admin/presence', {
        method: 'GET',
        headers: { Cookie: phdev.cookieHeader },
      }),
      env: env as any,
    });
    expect(await readStale.json()).toMatchObject({ online: false });

    // 8. Reativa presença e Nua faz logout -> imediatamente offline para PHDEV (e PHDEV continua logado)
    presenceRow.content.lastSeenAt = new Date().toISOString();
    await adminLogout({
      request: new Request('https://admin.nuaborges.com.br/api/auth/logout', {
        method: 'POST',
        headers: { Cookie: nua.cookieHeader },
      }),
      env: env as any,
    });
    const readAfterLogout = await getPresence({
      request: new Request('https://admin.nuaborges.com.br/api/admin/presence', {
        method: 'GET',
        headers: { Cookie: phdev.cookieHeader },
      }),
      env: env as any,
    });
    expect(readAfterLogout.status).toBe(200);
    expect(await readAfterLogout.json()).toMatchObject({ online: false });
  });
});
