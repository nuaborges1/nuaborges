import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  getOrCreateProfileByEmail,
  claimOrderForProfile,
  grantEntitlement,
  saveOtpChallenge,
  revokeEntitlementsByOrder,
} from '../../functions/api/id/_nuaIdStore';
import { hashOtpCode } from '../../functions/api/id/_crypto';
import { onRequestPost as verifyCodePost } from '../../functions/api/id/verify-code';
import { onRequestPost as logoutPost } from '../../functions/api/id/logout';
import { onRequestPost as cofrePost } from '../../functions/api/me/cofre';
import { onRequestGet as overviewGet } from '../../functions/api/me/overview';
import { onRequestGet as mediaProxyGet } from '../../functions/media/[[path]]';
import { renderVaultDeliveryEmailHtml } from '../../functions/api/id/_emailTemplates';
import { renderTokenAccessEmailHtml } from '../../functions/api/payments/send-otp';

function createMemoryAdapter() {
  const map = new Map<string, any>();
  return {
    _map: map,
    async kvGet<T = any>(key: string): Promise<T | null> {
      return map.has(key) ? structuredClone(map.get(key)) : null;
    },
    async kvSet(key: string, value: any): Promise<boolean> {
      map.set(key, structuredClone(value));
      return true;
    },
    async kvDelete(key: string): Promise<boolean> {
      return map.delete(key);
    },
    async kvListByPrefix<T = any>(prefix: string): Promise<Array<{ key: string; value: T }>> {
      const out: Array<{ key: string; value: T }> = [];
      for (const [k, v] of map.entries()) {
        if (k.startsWith(prefix)) out.push({ key: k, value: structuredClone(v) });
      }
      return out;
    },
    async kvCreate(key: string, value: any): Promise<boolean> {
      if (map.has(key)) return false;
      map.set(key, structuredClone(value));
      return true;
    },
    async kvConsume(key: string): Promise<boolean> {
      return map.delete(key);
    },
    async ensureAuthUser(_email: string): Promise<string> {
      return crypto.randomUUID();
    },
  };
}

function parseSetCookies(res: Response): Record<string, string> {
  const raw = res.headers.getSetCookie?.() || [];
  const jar: Record<string, string> = {};
  for (const item of raw) {
    const [pair] = item.split(';');
    const idx = pair.indexOf('=');
    if (idx > 0) {
      jar[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
    }
  }
  return jar;
}

function serializeJar(jar: Record<string, string>): string {
  return Object.entries(jar)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

describe('Unificação Conta Privada + Cofre (AUD-01 a AUD-09)', () => {
  it('elimina CofreViewerModal fullscreen e consolida visualizador inline em VaultContentViewer', () => {
    const root = path.resolve(__dirname, '../..');
    expect(fs.existsSync(path.join(root, 'components/nua/account/CofreViewerModal.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'components/nua/account/VaultContentViewer.tsx'))).toBe(true);

    const viewerCode = fs.readFileSync(
      path.join(root, 'components/nua/account/VaultContentViewer.tsx'),
      'utf-8'
    );
    expect(viewerCode.includes("action: 'close'")).toBe(true);
    expect(viewerCode.includes("action: 'logout'")).toBe(false);
    expect(viewerCode.includes("action: 'activity'")).toBe(true);

    const bridgeCode = fs.readFileSync(path.join(root, 'app/cofre/page.tsx'), 'utf-8');
    expect(bridgeCode.includes('/conta')).toBe(true);
    expect(bridgeCode.includes('confirm')).toBe(true);
  });

  it('AUD-01 & AUD-03: close limpa visita no servidor e cookie; logout invalida imediatamente visita e acesso a mídias', async () => {
    const store = createMemoryAdapter();
    const orderId = 'ord_pack_unif_001';
    const customId = 'ped_custom_unif_001';
    const email = 'titular.unificado@example.com';

    const env: any = {
      NUA_ID_SECRET: 'segredo-teste-unificacao-9876543210',
      NEXT_PUBLIC_SITE_URL: 'https://nuaborges.com.br',
      __NUA_ID_TEST_STORE__: store,
      __EMAIL_SENDER__: async () => true,
      __CUSTOMER_DATA_FIXTURES__: {
        orders: {
          [orderId]: {
            id: orderId,
            packId: 'ensaio-unif',
            status: 'paid',
            amount: 59.9,
            customerEmail: email,
          },
        },
        personalizados: {
          [customId]: {
            id: customId,
            photoCount: 1,
            videoDurationMinutes: 0,
            mentionName: false,
            express24h: false,
            deliveryChannel: 'vault',
            briefing: 'Teste unitário',
            totalPrice: 120,
            status: 'entregue',
            payment: { status: 'approved', method: 'pix', amount: 120 },
            vaultFiles: [
              { id: 'f1', name: 'foto-entrega.webp', type: 'photo', url: '/media/private/custom/foto-entrega.webp' },
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
        catalog: [
          {
            id: 'avulso-ensaio-unif',
            slug: 'ensaio-unif',
            title: 'Ensaio Unificado',
            exclusivePhotos: ['/media/private/ensaio-unif/foto-1.webp'],
            videos: [],
          },
        ],
      },
    };

    const profile = await getOrCreateProfileByEmail(env, email, 'Maria');
    await claimOrderForProfile(env, orderId, profile!.id, 'checkout_authenticated');
    await claimOrderForProfile(env, customId, profile!.id, 'checkout_authenticated');
    await grantEntitlement(env, {
      profileId: profile!.id,
      orderRef: orderId,
      kind: 'pack',
      resourceId: 'ensaio-unif',
      title: 'Ensaio Unificado',
      expiresAt: null,
      allowDownload: false,
    });
    await grantEntitlement(env, {
      profileId: profile!.id,
      orderRef: customId,
      kind: 'custom',
      resourceId: customId,
      title: 'Personalizado (1 fotos)',
      expiresAt: null,
      allowDownload: true,
    });

    // Autentica via OTP
    const salt = 'salt-unif-1';
    await saveOtpChallenge(env, {
      emailNormalized: email,
      codeHash: await hashOtpCode('123456', salt),
      salt,
      attempts: 0,
      maxAttempts: 5,
      purpose: 'login',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
    });
    const loginRes = await verifyCodePost({
      request: new Request('https://nuaborges.com.br/api/id/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Chrome/130' },
        body: JSON.stringify({ email, code: '123456' }),
      }),
      env,
    });
    expect(loginRes.status).toBe(200);
    const jar = parseSetCookies(loginRes);

    // Overview retorna watchUrl unificado (/conta?tab=biblioteca&item=...) e pluralização correta (AUD-07)
    const ovRes = await overviewGet({
      request: new Request('https://nuaborges.com.br/api/me/overview?full=1', {
        headers: { Cookie: serializeJar(jar) },
      }),
      env,
    });
    expect(ovRes.status).toBe(200);
    const ovData: any = await ovRes.json();
    expect(ovData.library[0].watchUrl).toBe(`/conta?tab=biblioteca&item=${encodeURIComponent(orderId)}`);
    expect(ovData.orders.find((o: any) => o.id === customId)?.title).toBe('Personalizado (1 foto)');
    expect(ovData.orders.find((o: any) => o.id === orderId)?.operationalLabel).toBe('Disponível no acervo');

    // Abre Pack: allowDownload = false
    const openPack = await cofrePost({
      request: new Request('https://nuaborges.com.br/api/me/cofre', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://nuaborges.com.br',
          Cookie: serializeJar(jar),
        },
        body: JSON.stringify({ action: 'open', order: orderId }),
      }),
      env,
    });
    expect(openPack.status).toBe(200);
    const packData: any = await openPack.json();
    expect(packData.state).toBe('ready');
    expect(packData.files[0].download).toBeUndefined();
    Object.assign(jar, parseSetCookies(openPack));

    // Troca para Personalizado: allowDownload = true e título corrigido para "1 foto"
    const openCustom = await cofrePost({
      request: new Request('https://nuaborges.com.br/api/me/cofre', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://nuaborges.com.br',
          Cookie: serializeJar(jar),
        },
        body: JSON.stringify({ action: 'open', order: customId }),
      }),
      env,
    });
    expect(openCustom.status).toBe(200);
    const customData: any = await openCustom.json();
    expect(customData.state).toBe('ready');
    expect(customData.title).toBe('Personalizado (1 foto)');
    expect(String(customData.files[0].download).includes('&dl=1')).toBe(true);
    Object.assign(jar, parseSetCookies(openCustom));

    // AUD-01: action='close' apaga visita no servidor E envia Set-Cookie para limpar __Host-nua_vault_visit
    const closeRes = await cofrePost({
      request: new Request('https://nuaborges.com.br/api/me/cofre', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://nuaborges.com.br',
          Cookie: serializeJar(jar),
        },
        body: JSON.stringify({ action: 'close', order: customId }),
      }),
      env,
    });
    expect(closeRes.status).toBe(200);
    expect((await closeRes.json()).state).toBe('idle');
    const closeCookies = closeRes.headers.getSetCookie?.() || [];
    expect(closeCookies.some((c) => c.startsWith('__Host-nua_vault_visit=;') && c.includes('Max-Age=0'))).toBe(true);

    // Reabre e testa AUD-03: logout limpa visita no KV e bloqueia mídia privada imediatamente
    const reopen = await cofrePost({
      request: new Request('https://nuaborges.com.br/api/me/cofre', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://nuaborges.com.br',
          Cookie: serializeJar(jar),
        },
        body: JSON.stringify({ action: 'open', order: orderId }),
      }),
      env,
    });
    Object.assign(jar, parseSetCookies(reopen));
    const visitsBeforeLogout = [...store._map.keys()].filter((k) => k.startsWith('vault:visit:'));
    expect(visitsBeforeLogout.length).toBeGreaterThan(0);

    const outRes = await logoutPost({
      request: new Request('https://nuaborges.com.br/api/id/logout', {
        method: 'POST',
        headers: { Cookie: serializeJar(jar) },
      }),
      env,
    });
    expect(outRes.status).toBe(200);
    const outCookies = outRes.headers.getSetCookie?.() || [];
    expect(outCookies.some((c) => c.startsWith('__Host-nua_vault_visit=;') && c.includes('Max-Age=0'))).toBe(true);

    // Tentativa de acesso à mídia privada mesmo reutilizando o cookie antigo -> 403
    const deniedAfterLogout = await mediaProxyGet({
      request: new Request('https://nuaborges.com.br/media/private/ensaio-unif/foto-1.webp?cofre=1', {
        headers: { Cookie: serializeJar(jar) },
      }),
      env,
      params: { path: ['private', 'ensaio-unif', 'foto-1.webp'] },
    });
    expect(deniedAfterLogout.status).toBe(403);

    // Revogação de acesso bloqueia abertura futura
    await revokeEntitlementsByOrder(env, orderId, 'refund');
    const revokedCheck = await cofrePost({
      request: new Request('https://nuaborges.com.br/api/me/cofre', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://nuaborges.com.br',
          Cookie: serializeJar(jar),
        },
        body: JSON.stringify({ action: 'open', order: orderId }),
      }),
      env,
    });
    expect((await revokedCheck.json()).state).toBe('confirm');
  });

  it('e-mails de entrega e recuperação apontam para /conta com contexto de aba e pedido', () => {
    const packMail = renderVaultDeliveryEmailHtml({
      itemTitle: 'Ensaio Exemplo',
      kindLabel: 'Conteúdo Exclusivo',
      orderRef: 'ord_123',
      vaultUrl: 'https://nuaborges.com.br/conta?tab=biblioteca&item=ord_123',
      accountUrl: 'https://nuaborges.com.br/conta?tab=biblioteca',
      isCustom: false,
    });
    expect(packMail.html.includes('/conta?tab=biblioteca&amp;item=ord_123')).toBe(true);
    expect(packMail.html.includes('Abrir conteúdo na conta')).toBe(true);

    const recoveryHtml = renderTokenAccessEmailHtml({
      orderId: 'ord_456',
      purchaseToken: 'tok_456',
      itemTitle: 'Ensaio Exemplo',
      itemSlug: 'ensaio',
      payerEmail: 'cliente@example.com',
      siteUrl: 'https://nuaborges.com.br',
    });
    expect(recoveryHtml.includes('/conta?tab=biblioteca&amp;item=ord_456')).toBe(true);
  });
});
