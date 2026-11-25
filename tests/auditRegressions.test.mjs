import assert from 'node:assert/strict';

import { onRequestPost as createPixPost } from '../functions/api/payments/create-pix';
import { onRequestGet as contentSyncGet } from '../functions/api/content/sync';
import { onRequest as apiMiddleware } from '../functions/api/_middleware';
import { createSessionToken, isRouteAuthorizedForRole } from '../functions/api/_authHelper';
import { readBodyText } from '../functions/api/mail/_common';
import { sanitizeUrl } from '../functions/api/mail/_sanitize';
import { verifyMagicBytes } from '../lib/security';
import { toolDeclarations } from '../lib/nuaAi/toolRegistry.mjs';
import {
  buildEditorialImageTag,
  extractAllEditorialImages,
  normalizePastedOrAiTextToCanonical,
  parseEditorialImageTag,
  stripRichTextFormatting,
} from '../lib/editorialMarkup';
import {
  polishEditorialPost,
  restoreAndVerifyEditorialImages,
  tokenizeEditorialImages,
} from '../lib/nuaAi/polishPost';
import { onRequestPost as polishPostEndpoint } from '../functions/api/nua-ai/polish-post';

let passed = 0;

async function test(name, fn) {
  await fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

console.log('Running pre-delivery audit regression tests...');

await test('create-pix rejects disallowed product type', async () => {
  const req = new Request('https://nuaborges.com.br/api/payments/create-pix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'arbitrary_bypass',
      slug: 'anything',
      price: 0.01,
      payerEmail: 'buyer@example.com',
    }),
  });
  const res = await createPixPost({
    request: req,
    env: { ENVIRONMENT: 'production' },
  });
  assert.equal(res.status, 400);
});

await test('create-pix returns 404 for unknown slug before email check', async () => {
  const req = new Request('https://nuaborges.com.br/api/payments/create-pix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'avulso',
      slug: 'slug-que-nao-existe-9999',
      price: 0.01,
    }),
  });
  const res = await createPixPost({
    request: req,
    env: { ENVIRONMENT: 'production' },
  });
  assert.equal(res.status, 404);
});

await test('content/sync?mode=admin rejects contract_client tokens with 403', async () => {
  const secret = 'test-secret-key-for-audit-regressions-32chars!';
  const contractToken = await createSessionToken(secret, 'contract_client');
  const req = new Request('https://nuaborges.com.br/api/content/sync?mode=admin', {
    method: 'GET',
    headers: { Authorization: `Bearer ${contractToken}` },
  });
  const res = await contentSyncGet({
    request: req,
    env: { ADMIN_API_SECRET: secret, ENVIRONMENT: 'production' },
  });
  assert.equal(res.status, 403);
});

await test('api/_middleware blocks raw ADMIN_PASSWORD as Bearer/X-Master-Key and blocks arbitrary pages.dev CORS', async () => {
  const env = {
    ADMIN_PASSWORD: 'weak-login-password-123',
    ADMIN_API_SECRET: 'weak-login-password-123',
    ENVIRONMENT: 'production',
  };
  const req = new Request('https://nuaborges.com.br/api/admin/orders-feed', {
    method: 'GET',
    headers: {
      Origin: 'https://nuaborges-evil-attacker.pages.dev',
      Authorization: 'Bearer weak-login-password-123',
      'X-Master-Key': 'weak-login-password-123',
    },
  });
  const res = await apiMiddleware({
    request: req,
    env,
    next: async () => new Response('ok'),
  });
  assert.equal(res.status, 401);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), null);
});

await test('RBAC allows client role on CMS/media/music and denies finance/admin/disabled vault', async () => {
  assert.equal(isRouteAuthorizedForRole('/api/content/sync', 'POST', 'client'), true);
  assert.equal(isRouteAuthorizedForRole('/api/admin/vault', 'POST', 'client'), false);
  assert.equal(isRouteAuthorizedForRole('/api/media/presign', 'POST', 'client'), true);
  assert.equal(isRouteAuthorizedForRole('/api/music/update', 'POST', 'client'), true);
  assert.equal(isRouteAuthorizedForRole('/api/finance/admin', 'GET', 'client'), false);
  assert.equal(isRouteAuthorizedForRole('/api/audit/logs', 'GET', 'client'), false);

  const { onRequestGet: vaultGet } = await import('../functions/api/admin/vault.ts');
  const vaultRes = await vaultGet();
  assert.equal(vaultRes.status, 410);

  const { resolveModuleFromParam } = await import('../app/admin/components/types.ts');
  assert.equal(resolveModuleFromParam('cofre'), 'dashboard');
  assert.equal(resolveModuleFromParam('senhas'), 'dashboard');
});

await test('mail readBodyText allows multiline bodies and rejects control chars', async () => {
  const body = 'Olá,\r\n\r\nLinha 2\tcom tab.';
  assert.equal(readBodyText(body, 'text'), body);
  assert.throws(() => readBodyText('abc\u0000def', 'text'));
});

await test('mail sanitizeUrl blocks protocol-relative trackers when blocking remote images', async () => {
  assert.equal(sanitizeUrl('//tracker.evil.test/pixel.gif', true), null);
  assert.equal(sanitizeUrl('/internal-track.gif', true), null);
  assert.equal(sanitizeUrl('https://cdn.example.com/img.png', true), null);
  assert.equal(sanitizeUrl('javascript:alert(1)', false), null);
});

await test('verifyMagicBytes rejects HTML containing "free" disguised as video/mp4 and accepts valid ftyp MP4', async () => {
  const fakeHtml = new TextEncoder().encode('<html><body>free video <script>alert(1)</script></body></html>');
  const fakeResult = verifyMagicBytes(fakeHtml, 'video/mp4');
  assert.equal(fakeResult.valid, false);

  // Real ISOBMFF box header: size = 24 (0x00000018), type = 'ftyp', brand = 'isom'
  const realMp4 = new Uint8Array([
    0x00, 0x00, 0x00, 0x18,
    0x66, 0x74, 0x79, 0x70,
    0x69, 0x73, 0x6f, 0x6d,
    0x00, 0x00, 0x02, 0x00,
  ]);
  const realResult = verifyMagicBytes(realMp4, 'video/mp4');
  assert.equal(realResult.valid, true);
});

await test('Nua IA toolRegistry exposes real operational tools to client role', async () => {
  const clientTools = new Set(toolDeclarations('client').map((t) => t.name));
  for (const required of [
    'confirm_appointment',
    'set_appointment_link',
    'complete_appointment',
    'mark_absent',
    'publish_site',
    'get_finance_summary',
  ]) {
    assert.equal(clientTools.has(required), true, `Missing client tool: ${required}`);
  }
  assert.equal(clientTools.has('mark_finance_paid'), false);
  assert.equal(clientTools.has('revert_finance_payment'), false);
});

await test('editorialRichText parses and builds image tags, headings, highlights, and font sizes safely', async () => {
  const tag = buildEditorialImageTag({
    urls: ['/images/nua/about/about.jpg', '/images/nua/hero/hero-1.jpg'],
    layout: 'grid',
    caption: 'Bastidores em Dublin',
    alt: 'Nua Borges em Dublin',
  });
  const parsed = parseEditorialImageTag(tag);
  assert.ok(parsed);
  assert.deepEqual(parsed.urls, ['/images/nua/about/about.jpg', '/images/nua/hero/hero-1.jpg']);
  assert.equal(parsed.layout, 'grid');
  assert.equal(parsed.caption, 'Bastidores em Dublin');
  assert.equal(parsed.alt, 'Nua Borges em Dublin');

  const stripped = stripRichTextFormatting(
    '# Título\n\n[centro]**Texto** com [grifo]destaque[/grifo] e [grande]tamanho[/grande][/centro]\n\n' + tag
  );
  assert.equal(stripped.includes('[grifo]'), false);
  assert.equal(stripped.includes('[grande]'), false);
  assert.equal(stripped.includes('[img'), false);
  assert.equal(stripped.includes('Texto com destaque e tamanho'), true);
});

await test('polishPost preserves 100% of images even if AI drops or duplicates tokens', async () => {
  const sampleText = [
    'Primeiro parágrafo longo sobre sexologia, autoconhecimento e fotografia autoral.',
    '[img layout="full" caption="Foto 1"]/images/nua/about/about.jpg[/img]',
    'Segundo parágrafo sobre liberdade e acolhimento sem tabus.',
    '[img layout="portrait" caption="Foto 2"]/images/nua/hero/hero-1.jpg[/img]',
  ].join('\n\n');

  const { mediaTokens } = tokenizeEditorialImages(sampleText);
  assert.equal(mediaTokens.length, 2);

  // Simula resposta da IA que duplicou a Foto 1 e esqueceu a Foto 2
  const simulatedAiReply = [
    '## Minha Trajetória',
    'Primeiro parágrafo revisado.',
    '[[NUA_MEDIA_1:right]]',
    '[[NUA_MEDIA_1:left]]',
    'Segundo parágrafo revisado.',
  ].join('\n\n');

  const restored = restoreAndVerifyEditorialImages(simulatedAiReply, mediaTokens);
  const finalImages = extractAllEditorialImages(restored.restoredText);
  assert.equal(finalImages.length, 2);
  assert.equal(finalImages[0].urls[0], '/images/nua/about/about.jpg');
  assert.equal(finalImages[0].layout, 'right');
  assert.equal(finalImages[1].urls[0], '/images/nua/hero/hero-1.jpg');

  // Testa o organizador determinístico, relatório explicativo e o endpoint autenticado
  const basicRes = await polishEditorialPost({ text: sampleText, mode: 'basic' });
  assert.equal(basicRes.ok, true);
  assert.equal(extractAllEditorialImages(basicRes.organizedText).length, 2);
  assert.equal(Array.isArray(basicRes.detailedReport), true);
  assert.equal(basicRes.detailedReport.length > 0, true);

  // Testa limpeza e formatação automática de textos colados de IA (¨¨, **, ##, listas)
  const rawAiPasted = [
    '### **Quem Sou Eu**',
    'Eu sou ¨¨Nua Borges¨¨ e acredito na __liberdade__ de expressão.',
    '* Primeiro ponto importante',
    '* Segundo ponto importante',
  ].join('\n');
  const normalizedPaste = normalizePastedOrAiTextToCanonical(rawAiPasted);
  assert.equal(normalizedPaste.includes('### Quem Sou Eu'), true);
  assert.equal(normalizedPaste.includes('**Nua Borges**'), true);
  assert.equal(normalizedPaste.includes('**liberdade**'), true);
  assert.equal(normalizedPaste.includes('- Primeiro ponto importante'), true);
  assert.equal(normalizedPaste.includes('¨'), false);

  const unauthReq = new Request('https://nuaborges.com.br/api/nua-ai/polish-post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: sampleText }),
  });
  const unauthRes = await polishPostEndpoint({
    request: unauthReq,
    env: { ADMIN_API_SECRET: 'secret-key-32-chars-minimum-12345', ENVIRONMENT: 'production' },
  });
  assert.equal(unauthRes.status, 401);
});

await test('AUD-PRE-002: migration 202611210001 aligns with real appointments schema and RPC signatures', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const sql = fs.readFileSync(
    path.resolve(process.cwd(), 'supabase/migrations/202611210001_security_rls_and_rpc_hardening.sql'),
    'utf-8'
  );
  assert.equal(sql.includes('exclude using gist (public.appointment_slot_range(date_time, duration_minutes) with &&)'), true);
  assert.equal(sql.includes('reserve_vip_appointment(\n  p_booking jsonb'), true);
  assert.equal(sql.includes('reschedule_vip_appointment(\n  p_booking jsonb'), true);
  assert.equal(sql.includes('set search_path = public, pg_temp'), true);
  assert.equal(sql.includes('a.start_time'), false);
  assert.equal(sql.includes('a.end_time'), false);
});

await test('AUD-PRE-003: vault media guard blocks newly added public URLs and allows /media/private/', async () => {
  const { isPrivateVaultMediaUrl, findNewlyAddedPublicVaultMedia } = await import('../functions/api/content/sync.ts');
  assert.equal(isPrivateVaultMediaUrl('/media/private/pack-1/foto.webp'), true);
  assert.equal(isPrivateVaultMediaUrl('media/private/pack-1/video.mp4'), true);
  assert.equal(isPrivateVaultMediaUrl('/media/gallery/publica.webp'), false);
  assert.equal(isPrivateVaultMediaUrl('https://nuaborges.com.br/media/previews/sample.jpg'), false);

  const violations = findNewlyAddedPublicVaultMedia(
    [{ id: 'p1', slug: 'pack-1', exclusivePhotos: ['/media/gallery/publica.webp', '/media/private/ok.webp'], videos: [] }],
    [{ id: 'p1', slug: 'pack-1', exclusivePhotos: [], videos: [] }]
  );
  assert.equal(violations.length, 1);
  assert.equal(violations[0].field, 'exclusivePhotos');

  // Legacy already-saved URLs must not block unrelated edits
  const legacyNoViolation = findNewlyAddedPublicVaultMedia(
    [{ id: 'p1', slug: 'pack-1', exclusivePhotos: ['/media/gallery/legada.webp'], videos: [] }],
    [{ id: 'p1', slug: 'pack-1', exclusivePhotos: ['/media/gallery/legada.webp'], videos: [] }]
  );
  assert.equal(legacyNoViolation.length, 0);
});

await test('AUD-PRE-008 & AUD-PRE-011: client RBAC allows polish-post and reconcile rejects unauthenticated calls', async () => {
  const { isRouteAuthorizedForRole } = await import('../functions/api/_authHelper.ts');
  assert.equal(isRouteAuthorizedForRole('/api/nua-ai/polish-post', 'POST', 'client'), true);
  assert.equal(isRouteAuthorizedForRole('/api/finance/admin', 'POST', 'client'), false);

  const { onRequestPost: reconcilePost } = await import('../functions/api/payments/reconcile.ts');
  const res = await reconcilePost({
    request: new Request('https://nuaborges.com.br/api/payments/reconcile', { method: 'POST' }),
    env: { CRON_SECRET: 'cron-secret-12345678901234567890', ADMIN_API_SECRET: 'admin-secret-12345678901234567890' },
  });
  assert.equal(res.status, 401);
});

await test('AUD-FINAL-001: content-ops enforces async timingSafeEqualString on X-Master-Key in isolation', async () => {
  const { onRequestPost: contentOpsPost } = await import('../functions/api/admin/content-ops.ts');
  const baseEnv = {
    ADMIN_API_SECRET: 'super-dedicated-api-secret-9988776655',
    ADMIN_PASSWORD: 'separate-login-password-112233',
  };

  // 1. Missing key -> 401
  const missingRes = await contentOpsPost({
    request: new Request('https://admin.nuaborges.com.br/api/admin/content-ops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }),
    env: baseEnv,
  });
  assert.equal(missingRes.status, 401);

  // 2. Wrong X-Master-Key -> 401 (previously bypassed due to missing await!)
  const wrongRes = await contentOpsPost({
    request: new Request('https://admin.nuaborges.com.br/api/admin/content-ops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': 'wrong-key-value' },
      body: JSON.stringify({}),
    }),
    env: baseEnv,
  });
  assert.equal(wrongRes.status, 401);

  // 3. Raw ADMIN_PASSWORD as X-Master-Key -> 401
  const rawPassRes = await contentOpsPost({
    request: new Request('https://admin.nuaborges.com.br/api/admin/content-ops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': baseEnv.ADMIN_PASSWORD },
      body: JSON.stringify({}),
    }),
    env: baseEnv,
  });
  assert.equal(rawPassRes.status, 401);

  // 4. Correct X-Master-Key -> passes auth (reaches payload validation 400, not 401)
  const validRes = await contentOpsPost({
    request: new Request('https://admin.nuaborges.com.br/api/admin/content-ops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': baseEnv.ADMIN_API_SECRET },
      body: JSON.stringify({}),
    }),
    env: baseEnv,
  });
  assert.equal(validRes.status, 400);
});

await test('AUD-FINAL-002: strict privatePath and personalizados/admin reject public, external, and traversal vaultFiles', async () => {
  const { privatePath } = await import('../functions/api/me/_vault.ts');
  const { isPrivateVaultMediaUrl } = await import('../functions/api/content/sync.ts');

  // Positive cases
  assert.equal(privatePath('/media/private/ped_1/foto.webp'), 'private/ped_1/foto.webp');
  assert.equal(privatePath('private/ped_1/video.mp4'), 'private/ped_1/video.mp4');
  assert.equal(privatePath('https://nuaborges.com.br/media/private/ped_1/foto.webp'), 'private/ped_1/foto.webp');
  assert.equal(isPrivateVaultMediaUrl('/media/private/ped_1/foto.webp'), true);

  // Negative cases
  const invalidUrls = [
    '',
    '/media/gallery/publica.webp',
    'gallery/publica.webp',
    'https://evil.com/media/private/roubo.jpg',
    'https://evil.com/private/roubo.jpg',
    '//nuaborges.com.br/media/private/foto.webp',
    '/media/private/../gallery/publica.webp',
    '/media/private/%2e%2e/publica.webp',
    '/media/private/',
    'private/',
    'javascript:alert(1)',
    '/media/private/a//b.jpg',
  ];
  for (const bad of invalidUrls) {
    assert.equal(privatePath(bad), '', `privatePath should reject: ${bad}`);
    assert.equal(isPrivateVaultMediaUrl(bad), false, `isPrivateVaultMediaUrl should reject: ${bad}`);
  }

  // Handler-level validation on personalizados/admin
  const { onRequestPost: persAdminPost } = await import('../functions/api/personalizados/admin.ts');
  const origFetch = globalThis.fetch;
  try {
    let savedPayload = null;
    globalThis.fetch = async (input, init) => {
      const u = String(typeof input === 'string' ? input : input?.url || '');
      if (u.includes('personalizados_orders') && (!init?.method || init.method === 'GET')) {
        return new Response(
          JSON.stringify([
            {
              id: 'ped_test_1',
              client_name: 'Cliente Teste',
              client_contact: 'cliente@example.com',
              delivery_channel: 'vault',
              status: 'em_producao',
              photo_count: 2,
              video_duration_minutes: 0,
              total_price: 150,
              payment: { status: 'approved', amount: 150 },
              vault_files: [],
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (u.includes('personalizados_orders') && init?.method === 'POST') {
        savedPayload = JSON.parse(String(init.body || '{}'));
        return new Response(JSON.stringify([savedPayload]), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    const env = {
      SUPABASE_URL: 'https://supabase.test',
      SUPABASE_SERVICE_ROLE_KEY: 'service-key-test',
      NEXT_PUBLIC_SITE_URL: 'https://nuaborges.com.br',
    };

    // Rejects public URL even while em_producao
    const badRes = await persAdminPost({
      request: new Request('https://admin.nuaborges.com.br/api/personalizados/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_order',
          orderId: 'ped_test_1',
          patch: {
            status: 'em_producao',
            vaultFiles: [{ id: 'v1', name: 'publica', url: '/media/gallery/publica.webp', type: 'photo' }],
          },
        }),
      }),
      env,
    });
    assert.equal(badRes.status, 400);

    // Rejects external URL with /private/ in path
    const extRes = await persAdminPost({
      request: new Request('https://admin.nuaborges.com.br/api/personalizados/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_order',
          orderId: 'ped_test_1',
          patch: {
            status: 'pronto',
            vaultFiles: [{ id: 'v1', name: 'ext', url: 'https://evil.com/media/private/a.webp', type: 'photo' }],
          },
        }),
      }),
      env,
    });
    assert.equal(extRes.status, 400);

    // Accepts valid private media and canonicalizes URL
    const okRes = await persAdminPost({
      request: new Request('https://admin.nuaborges.com.br/api/personalizados/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_order',
          orderId: 'ped_test_1',
          patch: {
            status: 'pronto',
            vaultFiles: [{ id: 'v1', name: 'foto1', url: 'https://nuaborges.com.br/media/private/ped_test_1/foto1.webp', type: 'photo' }],
          },
        }),
      }),
      env,
    });
    assert.equal(okRes.status, 200);
    const okJson = await okRes.json();
    assert.equal(okJson.order.vaultFiles[0].url, '/media/private/ped_test_1/foto1.webp');
  } finally {
    globalThis.fetch = origFetch;
  }
});

await test('AUD-FINAL-003: unified webhook /api/webhooks/mercadopago enforces fail-closed signature and delegates to v2 engine', async () => {
  const { onRequestPost: webhookPost } = await import('../functions/api/webhooks/mercadopago.ts');

  // 1. Missing MP_WEBHOOK_SECRET -> fail-closed 503
  const noSecretRes = await webhookPost({
    request: new Request('https://nuaborges.com.br/api/webhooks/mercadopago?data.id=999001', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'payment', data: { id: '999001' } }),
    }),
    env: {},
  });
  assert.equal(noSecretRes.status, 503);

  // 2. Invalid signature -> 401
  const badSigRes = await webhookPost({
    request: new Request('https://nuaborges.com.br/api/webhooks/mercadopago?data.id=999001', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': 'req-bad',
        'x-signature': `ts=${Math.floor(Date.now() / 1000)},v1=deadbeef`,
      },
      body: JSON.stringify({ type: 'payment', data: { id: '999001' } }),
    }),
    env: { MP_WEBHOOK_SECRET: 'test-mp-webhook-secret-1234567890' },
  });
  assert.equal(badSigRes.status, 401);
});

await test('NUA-AUD-CENTRAL: default-deny unknown routes, host isolation, strict CSRF, and kill-switch', async () => {
  const secret = 'dedicated-admin-api-secret-32chars-minimum!';
  const token = await createSessionToken(secret, 'admin');
  const env = {
    ENVIRONMENT: 'production',
    ADMIN_API_SECRET: secret,
    ADMIN_PASSWORD: 'separate-human-password-123',
  };

  // 1. Removed Stripe & dead routes blocked by default-deny (404)
  for (const deadPath of ['/api/stripe/dashboard', '/api/mail/messages', '/api/payments/verify-otp']) {
    const res = await apiMiddleware({
      request: new Request(`https://admin.nuaborges.com.br${deadPath}`, { method: 'GET' }),
      env,
      next: async () => new Response('should-not-run'),
    });
    assert.equal(res.status, 404, `Expected 404 for ${deadPath}`);
  }

  // 2. Authenticated admin route blocked on public host nuaborges.com.br (403) and allowed on admin.nuaborges.com.br (200)
  const publicHostRes = await apiMiddleware({
    request: new Request('https://nuaborges.com.br/api/admin/orders-feed', {
      method: 'GET',
      headers: { Cookie: `__Host-Admin-Session=${token}` },
    }),
    env,
    next: async () => new Response('ok'),
  });
  assert.equal(publicHostRes.status, 403);

  const adminHostRes = await apiMiddleware({
    request: new Request('https://admin.nuaborges.com.br/api/admin/orders-feed', {
      method: 'GET',
      headers: { Cookie: `__Host-Admin-Session=${token}` },
    }),
    env,
    next: async () => new Response('ok'),
  });
  assert.equal(adminHostRes.status, 200);
  assert.ok(adminHostRes.headers.get('Content-Security-Policy')?.includes("default-src 'none'"));

  // 3. Strict CSRF blocks cookie-authenticated POST without Origin/Referer
  const csrfRes = await apiMiddleware({
    request: new Request('https://admin.nuaborges.com.br/api/content/sync', {
      method: 'POST',
      headers: { Cookie: `__Host-Admin-Session=${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }),
    env,
    next: async () => new Response('ok'),
  });
  assert.equal(csrfRes.status, 403);

  // 4. Kill-switch blocks disabled module with 503
  const ksRes = await apiMiddleware({
    request: new Request('https://nuaborges.com.br/api/payments/create-pix', {
      method: 'POST',
      headers: { Origin: 'https://nuaborges.com.br', 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }),
    env: { ...env, __SYSTEM_FLAGS_OVERRIDE__: { disabledModules: ['checkout'] } },
    next: async () => new Response('ok'),
  });
  assert.equal(ksRes.status, 503);
});

await test('NUA-AUD-003: admin login omits token from JSON and logout revokes session server-side', async () => {
  const { onRequestPost: loginPost } = await import('../functions/api/auth/login.ts');
  const { onRequestPost: logoutPost } = await import('../functions/api/auth/logout.ts');
  const { onRequestGet: sessionGet } = await import('../functions/api/auth/session.ts');

  const env = {
    ENVIRONMENT: 'production',
    ADMIN_PASSWORD: 'human-admin-password-secure!',
    ADMIN_API_SECRET: 'dedicated-crypto-session-secret-32chars!',
  };

  const loginRes = await loginPost({
    request: new Request('https://admin.nuaborges.com.br/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.10' },
      body: JSON.stringify({ password: env.ADMIN_PASSWORD }),
    }),
    env,
  });
  assert.equal(loginRes.status, 200);
  const loginJson = await loginRes.json();
  assert.equal(loginJson.success, true);
  assert.equal('token' in loginJson, false, 'Login JSON must never expose raw token');
  const setCookie = loginRes.headers.get('Set-Cookie') || '';
  assert.ok(setCookie.includes('__Host-Admin-Session=') && setCookie.includes('HttpOnly'));

  const cookiePair = setCookie.split(';')[0];

  const beforeRes = await sessionGet({
    request: new Request('https://admin.nuaborges.com.br/api/auth/session', {
      method: 'GET',
      headers: { Cookie: cookiePair },
    }),
    env,
  });
  assert.equal((await beforeRes.json()).authenticated, true);

  await logoutPost({
    request: new Request('https://admin.nuaborges.com.br/api/auth/logout', {
      method: 'POST',
      headers: { Cookie: cookiePair },
    }),
    env,
  });

  const afterRes = await sessionGet({
    request: new Request('https://admin.nuaborges.com.br/api/auth/session', {
      method: 'GET',
      headers: { Cookie: cookiePair },
    }),
    env,
  });
  assert.equal((await afterRes.json()).authenticated, false);
});

await test('NUA-AUD-001/011/012/015: Mensalidade reset confirmation, music URL check, /contrato redaction, and admingeral no-CDN', async () => {
  const { onRequestPost: financeAdminPost } = await import('../functions/api/finance/admin.ts');
  const resetBlocked = await financeAdminPost({
    request: new Request('https://admin.nuaborges.com.br/api/finance/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset_defaults' }),
    }),
    env: {},
  });
  assert.equal(resetBlocked.status, 400);

  const { onRequestPut: musicUpdatePut } = await import('../functions/api/music/update.ts');
  const xssMusicRes = await musicUpdatePut({
    request: new Request('https://admin.nuaborges.com.br/api/music/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'track-1', externalUrl: 'javascript:alert(1)' }),
    }),
    env: { B2_KEY_ID: 'k', B2_APP_KEY: 's', B2_BUCKET_NAME: 'b', B2_ENDPOINT: 'https://s3.us-west-000.backblazeb2.com' },
  });
  assert.notEqual(xssMusicRes.status, 200);

  const { CONTRACTOR_INFO, CLIENT_INFO } = await import('../lib/contractCanonical.ts');
  assert.equal(CONTRACTOR_INFO.name.includes('Boechat'), false);
  assert.equal(CLIENT_INFO.name.includes('Nayara'), false);

  const fs = await import('node:fs');
  const adminGeralHtml = fs.readFileSync(new URL('../admingeral-standalone/index.html', import.meta.url), 'utf8');
  assert.equal(adminGeralHtml.includes('cdn.tailwindcss.com'), false);
  assert.equal(adminGeralHtml.includes('unpkg.com'), false);
});

console.log(`All ${passed} audit regression checks passed.`);
