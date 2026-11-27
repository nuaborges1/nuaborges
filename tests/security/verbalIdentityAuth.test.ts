import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { onRequestPost as adminLogin } from '@/functions/api/auth/login';
import {
  onRequestGet as verbalIdentityGet,
  onRequestPost as verbalIdentityPost,
} from '@/functions/api/admin/verbal-identity';
import { onRequestGet as publicCopyModeGet } from '@/functions/api/site/copy-mode';
import { invalidateVerbalIdentityCache } from '@/functions/api/_verbalIdentityStore';
import { IsolatedBackendHarness } from '../helpers/supabaseStub';
import { invokeThroughGateway } from '../helpers/gatewayHarness';
import { extractCookies, serializeCookieJar, TEST_SECRETS } from '../factories/domainFactories';

const PHDEV_QA_PASSWORD = 'qa-phdev-only-pass-2026-isolated';

describe('SECURITY — Identidade Verbal Experimental (Exclusividade PHDEV, RBAC, Persistência e API Pública)', () => {
  let harness: IsolatedBackendHarness;
  let env: Record<string, any>;

  beforeEach(() => {
    invalidateVerbalIdentityCache();
    harness = new IsolatedBackendHarness();
    harness.installFetchInterceptor();
    env = {
      ...harness.createEnv(),
      PHDEV_PASSWORD: PHDEV_QA_PASSWORD,
    };
  });

  afterEach(() => {
    invalidateVerbalIdentityCache();
    harness.restoreFetch();
  });

  async function loginAs(password: string): Promise<string> {
    const res = await adminLogin({
      request: new Request('https://admin.nuaborges.com.br/api/auth/login', {
        method: 'POST',
        headers: {
          Origin: 'https://admin.nuaborges.com.br',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      }),
      env,
    });
    expect(res.status).toBe(200);
    return serializeCookieJar(extractCookies(res.headers));
  }

  it('retorna 401 para requisições não autenticadas em GET e POST /api/admin/verbal-identity', async () => {
    const getRes = await invokeThroughGateway({
      request: new Request('https://admin.nuaborges.com.br/api/admin/verbal-identity', {
        method: 'GET',
      }),
      env,
      handler: verbalIdentityGet as any,
    });
    expect(getRes.status).toBe(401);

    const postRes = await invokeThroughGateway({
      request: new Request('https://admin.nuaborges.com.br/api/admin/verbal-identity', {
        method: 'POST',
        headers: {
          Origin: 'https://admin.nuaborges.com.br',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: true }),
      }),
      env,
      handler: verbalIdentityPost as any,
    });
    expect(postRes.status).toBe(401);
  });

  it('bloqueia estritamente com 403 a conta da Nua (ADMIN_PASSWORD mesmo com role dev) e a conta client', async () => {
    const nuaAdminCookie = await loginAs(TEST_SECRETS.ADMIN_PASSWORD);
    const clientCookie = await loginAs(TEST_SECRETS.CLIENT_PASSWORD);

    // Nua (ADMIN_PASSWORD) -> 403 em GET e POST
    const nuaGet = await invokeThroughGateway({
      request: new Request('https://admin.nuaborges.com.br/api/admin/verbal-identity', {
        method: 'GET',
        headers: { Cookie: nuaAdminCookie },
      }),
      env,
      handler: verbalIdentityGet as any,
    });
    expect(nuaGet.status).toBe(403);
    expect((await nuaGet.json()).code).toBe('PHDEV_ONLY');

    const nuaPost = await invokeThroughGateway({
      request: new Request('https://admin.nuaborges.com.br/api/admin/verbal-identity', {
        method: 'POST',
        headers: {
          Origin: 'https://admin.nuaborges.com.br',
          Cookie: nuaAdminCookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: true }),
      }),
      env,
      handler: verbalIdentityPost as any,
    });
    expect(nuaPost.status).toBe(403);
    expect((await nuaPost.json()).code).toBe('PHDEV_ONLY');

    // Client -> 403 em GET e POST
    const clientPost = await invokeThroughGateway({
      request: new Request('https://admin.nuaborges.com.br/api/admin/verbal-identity', {
        method: 'POST',
        headers: {
          Origin: 'https://admin.nuaborges.com.br',
          Cookie: clientCookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: true }),
      }),
      env,
      handler: verbalIdentityPost as any,
    });
    expect(clientPost.status).toBe(403);

    // Garante que o estado público permaneceu em original após tentativas bloqueadas
    const pubRes = await invokeThroughGateway({
      request: new Request('https://nuaborges.com.br/api/site/copy-mode', { method: 'GET' }),
      env,
      handler: publicCopyModeGet as any,
    });
    expect(pubRes.status).toBe(200);
    const pubData = await pubRes.json();
    expect(pubData.mode).toBe('original');
    expect(pubData.enabled).toBe(false);
  });

  it('isola o endpoint administrativo do host público nuaborges.com.br (403 HOST_NOT_ALLOWED)', async () => {
    const phdevCookie = await loginAs(PHDEV_QA_PASSWORD);
    const res = await invokeThroughGateway({
      request: new Request('https://nuaborges.com.br/api/admin/verbal-identity', {
        method: 'GET',
        headers: { Cookie: phdevCookie },
      }),
      env,
      handler: verbalIdentityGet as any,
    });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('HOST_NOT_ALLOWED');
  });

  it('permite exclusivamente ao perfil PHDEV ler, ativar, persistir e reverter para original, refletindo em /api/site/copy-mode sem vazar dados internos', async () => {
    const phdevCookie = await loginAs(PHDEV_QA_PASSWORD);

    // 1. Estado inicial deve ser original (OFF por padrão)
    const initialGet = await invokeThroughGateway({
      request: new Request('https://admin.nuaborges.com.br/api/admin/verbal-identity', {
        method: 'GET',
        headers: { Cookie: phdevCookie },
      }),
      env,
      handler: verbalIdentityGet as any,
    });
    expect(initialGet.status).toBe(200);
    const initialBody = await initialGet.json();
    expect(initialBody.config.enabled).toBe(false);
    expect(initialBody.config.mode).toBe('original');

    // 2. Payload inválido retorna 400
    const badPost = await invokeThroughGateway({
      request: new Request('https://admin.nuaborges.com.br/api/admin/verbal-identity', {
        method: 'POST',
        headers: {
          Origin: 'https://admin.nuaborges.com.br',
          Cookie: phdevCookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: 'sim' }),
      }),
      env,
      handler: verbalIdentityPost as any,
    });
    expect(badPost.status).toBe(400);

    // 3. PHDEV ativa copy experimental -> 200 e persiste
    const enablePost = await invokeThroughGateway({
      request: new Request('https://admin.nuaborges.com.br/api/admin/verbal-identity', {
        method: 'POST',
        headers: {
          Origin: 'https://admin.nuaborges.com.br',
          Cookie: phdevCookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: true }),
      }),
      env,
      handler: verbalIdentityPost as any,
    });
    expect(enablePost.status).toBe(200);
    const enableBody = await enablePost.json();
    expect(enableBody.config.enabled).toBe(true);
    expect(enableBody.config.mode).toBe('nua_autoral_experimental');
    expect(enableBody.config.updatedBy).toBe('phdev');
    expect(enableBody.config.updatedAt).toBeTruthy();

    // 4. Endpoint público reflete ON com Cache-Control: no-store e sem vazar updatedBy/segredos
    const pubOnRes = await invokeThroughGateway({
      request: new Request('https://nuaborges.com.br/api/site/copy-mode', { method: 'GET' }),
      env,
      handler: publicCopyModeGet as any,
    });
    expect(pubOnRes.status).toBe(200);
    expect(pubOnRes.headers.get('Cache-Control')).toContain('no-store');
    const pubOnBody = await pubOnRes.json();
    expect(pubOnBody).toEqual({
      mode: 'nua_autoral_experimental',
      enabled: true,
      updatedAt: enableBody.config.updatedAt,
    });
    expect(pubOnBody.updatedBy).toBeUndefined();

    // 5. PHDEV desativa -> reversão completa para original
    const disablePost = await invokeThroughGateway({
      request: new Request('https://admin.nuaborges.com.br/api/admin/verbal-identity', {
        method: 'POST',
        headers: {
          Origin: 'https://admin.nuaborges.com.br',
          Cookie: phdevCookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: false }),
      }),
      env,
      handler: verbalIdentityPost as any,
    });
    expect(disablePost.status).toBe(200);
    const disableBody = await disablePost.json();
    expect(disableBody.config.enabled).toBe(false);
    expect(disableBody.config.mode).toBe('original');

    const pubOffRes = await invokeThroughGateway({
      request: new Request('https://nuaborges.com.br/api/site/copy-mode', { method: 'GET' }),
      env,
      handler: publicCopyModeGet as any,
    });
    expect(pubOffRes.status).toBe(200);
    const pubOffBody = await pubOffRes.json();
    expect(pubOffBody.mode).toBe('original');
    expect(pubOffBody.enabled).toBe(false);
  });
});
