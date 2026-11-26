import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getOrCreateProfileByEmail, claimOrderForProfile, grantEntitlement, saveOtpChallenge } from '../../functions/api/id/_nuaIdStore';
import { hashOtpCode } from '../../functions/api/id/_crypto';
import { onRequestPost as verifyCodePost } from '../../functions/api/id/verify-code';
import { onRequestPost as cofrePost } from '../../functions/api/me/cofre';

function createMemoryAdapter() {
  const map = new Map<string, any>();
  return {
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

function extractCookieHeader(res: Response): string {
  const raw = res.headers.getSetCookie?.() || [];
  return raw.map((c) => c.split(';')[0]).join('; ');
}

describe('Blindagem Cofre + NUA ID (regressão AUD-001 / AUD-004)', () => {
  it('garante que a migration que amplia site_content.key para TEXT existe no repositório', () => {
    const migrationPath = path.resolve(
      __dirname,
      '../../supabase/migrations/202611260001_site_content_key_text.sql'
    );
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, 'utf-8').toLowerCase();
    expect(sql).toContain('alter table public.site_content');
    expect(sql).toContain('alter column key type text');
  });

  it('unifica confiança do navegador: login OTP já libera POST /api/me/cofre (action=open) sem segundo e-mail', async () => {
    const store = createMemoryAdapter();
    const sentEmails: Array<{ to: string; subject: string }> = [];
    const orderId = 'ord_test_unificado_001';
    const email = 'cliente.unificado@example.com';

    const env: any = {
      NUA_ID_SECRET: 'segredo-teste-unificado-1234567890',
      NEXT_PUBLIC_SITE_URL: 'https://nuaborges.com.br',
      __NUA_ID_TEST_STORE__: store,
      __EMAIL_SENDER__: async (msg: any) => {
        sentEmails.push({ to: msg.to, subject: msg.subject });
        return true;
      },
      __CUSTOMER_DATA_FIXTURES__: {
        orders: {
          [orderId]: {
            id: orderId,
            packId: 'pack-teste',
            status: 'paid',
            amount: 49.9,
            customerEmail: email,
          },
        },
        catalog: [
          {
            id: 'avulso-pack-teste',
            slug: 'pack-teste',
            title: 'Pack Teste Unificado',
            media: [{ url: '/media/packs/pack-teste/foto1.jpg', type: 'image', label: 'Foto 1' }],
          },
        ],
      },
    };

    const profile = await getOrCreateProfileByEmail(env, email, 'Cliente Teste');
    expect(profile).toBeTruthy();
    await claimOrderForProfile(env, orderId, profile!.id, 'post_payment_email');
    await grantEntitlement(env, {
      profileId: profile!.id,
      orderRef: orderId,
      kind: 'pack',
      resourceId: 'pack-teste',
      title: 'Pack Teste Unificado',
      expiresAt: null,
      allowDownload: false,
    });

    const otpCode = '654321';
    const salt = 'salt-teste-123';
    await saveOtpChallenge(env, {
      emailNormalized: email,
      codeHash: await hashOtpCode(otpCode, salt),
      salt,
      attempts: 0,
      maxAttempts: 5,
      purpose: 'login',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    const verifyReq = new Request('https://nuaborges.com.br/api/id/verify-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 Chrome/130.0',
      },
      body: JSON.stringify({ email, code: otpCode }),
    });

    const verifyRes = await verifyCodePost({ request: verifyReq, env });
    expect(verifyRes.status).toBe(200);
    const cookies = extractCookieHeader(verifyRes);
    expect(cookies).toContain('__Host-nua_id_session=');
    expect(cookies).toContain('__Host-nua_vault_browser=');

    // Agora abre o Cofre diretamente no mesmo navegador: deve abrir sem pedir 2º e-mail
    const openReq = new Request('https://nuaborges.com.br/api/me/cofre', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://nuaborges.com.br',
        Cookie: cookies,
      },
      body: JSON.stringify({ action: 'open', order: orderId }),
    });

    const openRes = await cofrePost({ request: openReq, env });
    expect(openRes.status).toBe(200);
    const openJson: any = await openRes.json();
    expect(openJson.state).toBe('ready');
    expect(openJson.order).toBe(orderId);
    expect(sentEmails.length).toBe(0);
  });
});
