import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { onRequestGet as checkPixAvailability, onRequestPost as createPix } from '@/functions/api/payments/create-pix';
import { onRequestPost as simulateApprove } from '@/functions/api/payments/simulate-approve';
import { onRequestPost as createPersonalizado } from '@/functions/api/personalizados/create';
import { onRequestPost as adminPersonalizados } from '@/functions/api/personalizados/admin';
import { onRequestPost as cofreHandler } from '@/functions/api/me/cofre';
import { onRequestPost as mediaUrlHandler } from '@/functions/api/me/media-url';
import { onRequestPost as claimHandler } from '@/functions/api/me/claim';
import { onRequestGet as mediaProxyGet } from '@/functions/media/[[path]]';
import { onRequestPost as mediaDeletePost } from '@/functions/api/media/delete';
import * as mediaStore from '@/functions/api/_mediaStore';
import { onRequestPost as requestOtp } from '@/functions/api/id/request-code';
import { onRequestPost as verifyOtp } from '@/functions/api/id/verify-code';
import { onRequestGet as getOverview } from '@/functions/api/me/overview';
import { onRequestGet as getLibrary } from '@/functions/api/me/library';
import { onRequestPost as syncContent } from '@/functions/api/content/sync';
import { onRequestGet as financeDashboardGet } from '@/functions/api/admin/finance-dashboard';
import { onRequestGet as installmentsGet } from '@/functions/api/finance/installments';
import { onRequestGet as adminCustomersGet } from '@/functions/api/admin/customers';
import {
  claimOrderForProfile,
  getOrCreateProfileByEmail,
  grantEntitlement,
  revokeEntitlementsByOrder,
} from '@/functions/api/id/_nuaIdStore';
import { IsolatedBackendHarness } from '../helpers/supabaseStub';
import {
  createTestEmail,
  extractCookies,
  serializeCookieJar,
  TEST_SECRETS,
} from '../factories/domainFactories';

describe('API — Packs, Personalizados, Cofre Digital, Mídias & Central de Clientes', () => {
  let harness: IsolatedBackendHarness;
  let env: Record<string, any>;

  beforeEach(() => {
    harness = new IsolatedBackendHarness();
    harness.installFetchInterceptor();
    env = harness.createEnv();
  });

  afterEach(() => {
    harness.restoreFetch();
  });

  async function authenticateCustomer(email: string): Promise<{ cookie: string; profileId: string }> {
    const reqRes = await requestOtp({
      request: new Request('https://nuaborges.com.br/api/id/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://nuaborges.com.br' },
        body: JSON.stringify({ email, turnstileToken: 'qa-turnstile-token-valid-12345' }),
      }),
      env,
    });
    expect(reqRes.status).toBe(200);
    const otpMail = harness.emails.find((e) => e.to === email && e.meta?.code);
    expect(otpMail?.meta?.code).toMatch(/^\d{6}$/);

    const verRes = await verifyOtp({
      request: new Request('https://nuaborges.com.br/api/id/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://nuaborges.com.br', 'User-Agent': 'QA-Browser/1.0' },
        body: JSON.stringify({ email, code: otpMail!.meta!.code }),
      }),
      env,
    });
    expect(verRes.status).toBe(200);
    const body = await verRes.json();
    const cookies = extractCookies(verRes.headers);
    return { cookie: serializeCookieJar(cookies), profileId: body.profile.id };
  }

  it('does not report an empty account when the purchase ledger cannot be read', async () => {
    const { cookie, profileId } = await authenticateCustomer(createTestEmail('account-recovery'));
    const store = env.__NUA_ID_TEST_STORE__;
    const originalGet = store.kvGet.bind(store);
    const key = `nua_id:entitlements:${profileId}`;
    const overview = () => getOverview({ env, request: new Request('https://nuaborges.com.br/api/me/overview?full=1', { headers: { cookie } }) });
    const library = () => getLibrary({ env, request: new Request('https://nuaborges.com.br/api/me/library', { headers: { cookie } }) });
    store.kvGet = (requestedKey: string, strict?: boolean) => {
      if (requestedKey === key) {
        if (strict) throw new Error('QA ledger is unavailable');
        return Promise.resolve(null);
      }
      return originalGet(requestedKey, strict);
    };
    expect((await overview()).status).toBe(503);
    expect((await library()).status).toBe(503);

    store.kvGet = originalGet;
    const populated = await grantEntitlement(env, {
      profileId, orderRef: 'ord_qa_access', kind: 'pack', resourceId: 'ensaio-qa',
      title: 'Compra preservada', expiresAt: null, allowDownload: false,
    });
    expect(populated).toBeTruthy();
    expect((await (await overview()).json()).library).toEqual([expect.objectContaining({ title: 'Compra preservada' })]);
  });

  it('does not announce a successful login when the session cannot be saved', async () => {
    const email = createTestEmail('otp-retry');
    const headers = { 'Content-Type': 'application/json', Origin: 'https://nuaborges.com.br' };
    const requested = await requestOtp({ env, request: new Request('https://nuaborges.com.br/api/id/request-code', {
      method: 'POST', headers, body: JSON.stringify({ email, turnstileToken: 'qa-turnstile-token-valid-12345' }),
    }) });
    expect(requested.status).toBe(200);
    const code = harness.emails.find((mail) => mail.to === email)?.meta?.code;
    expect(code).toMatch(/^\d{6}$/);

    const store = env.__NUA_ID_TEST_STORE__;
    const set = store.kvSet.bind(store);
    store.kvSet = (key: string, value: unknown) => key.startsWith('nua_id:session:') ? Promise.resolve(false) : set(key, value);
    const response = await verifyOtp({ env, request: new Request('https://nuaborges.com.br/api/id/verify-code', {
      method: 'POST', headers, body: JSON.stringify({ email, code }),
    }) });
    expect(response.status).toBe(503);
    expect(response.headers.has('Set-Cookie')).toBe(false);
    expect(await response.json()).toMatchObject({ success: false });
  });

  it('does not create a new Pix for a pack the authenticated customer already owns', async () => {
    const { cookie, profileId } = await authenticateCustomer(createTestEmail('owns-pack'));
    await grantEntitlement(env, {
      profileId, orderRef: 'ord_qa_owned_pack', kind: 'pack', resourceId: 'ensaio-qa',
      title: 'Ensaio QA', expiresAt: null, allowDownload: false,
    });
    const response = await createPix({ env, request: new Request('https://nuaborges.com.br/api/payments/create-pix', {
      method: 'POST', headers: { cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'pack', slug: 'ensaio-qa' }),
    }) });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'PACK_ALREADY_OWNED' });
  });

  it('charges the displayed legacy BRL price and rejects a pack below the accepted minimum', async () => {
    const active = harness.tables.site_content.find((row) => row.key === 'published_content')!.content.avulsos.items[0];
    const checkout = () => createPix({ env, request: new Request('https://nuaborges.com.br/api/payments/create-pix', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'pack', slug: active.slug, payerEmail: createTestEmail('brl') }),
    }) });
    active.numericPrice = undefined;
    active.price = 'R$ 1.299,90';
    const price = await checkout();
    expect(price.status).toBe(201);
    expect(await price.json()).toMatchObject({ amount: 1299.9 });
    active.numericPrice = 0.1;
    active.price = 'R$ 0,10';
    expect((await checkout()).status).toBe(422);
  });

  it('does not create a Pix for a published pack with no valid private delivery files', async () => {
    const request = new Request('https://nuaborges.com.br/api/payments/create-pix?slug=ensaio-qa');
    const available = await checkPixAvailability({ env, request });
    expect(await available.json()).toEqual({ available: true });
    expect(available.headers.get('Cache-Control')).toBe('no-store');

    const privatePack = harness.tables.site_content.find((row) => row.key === 'private_admin_content')!.content.avulsos.items[0];
    privatePack.videos = [];
    privatePack.exclusivePhotos = ['/media/gallery/public-preview.jpg'];
    const result = await createPix({ env, request: new Request('https://nuaborges.com.br/api/payments/create-pix', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'pack', slug: 'ensaio-qa', payerEmail: createTestEmail('no-delivery') }),
    }) });
    expect(result.status).toBe(422);
    expect(await result.json()).toMatchObject({ code: 'PACK_UNAVAILABLE', error: 'Esta produção ainda não está disponível para compra.' });
    expect(await (await checkPixAvailability({ env, request })).json()).toEqual({ available: false });
    expect(harness.tables.orders).toHaveLength(0);
  });

  it('retires a purchased pack from sale while keeping its original address and private files', async () => {
    const original = structuredClone(harness.tables.site_content.find((row) => row.key === 'private_admin_content')!.content);
    harness.tables.orders.push({ id: 'ord_qa_sold', pack_id: 'ensaio-qa', status: 'paid' });
    const sold = original.avulsos.items.find((item: { slug: string }) => item.slug === 'ensaio-qa');
    const save = (items: unknown[]) => syncContent({ env, request: new Request('https://admin.nuaborges.com.br/api/content/sync', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { ...original, avulsos: { ...original.avulsos, items } } }),
    }) });

    for (const items of [[], [{ ...sold, slug: 'endereco-novo' }], [{ ...sold, exclusivePhotos: [], videos: [] }]]) {
      const response = await save(items);
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ code: 'PACK_HAS_PURCHASES' });
    }

    expect((await save([{ ...sold, active: false }])).status).toBe(200);
    const retired = harness.tables.site_content.find((row) => row.key === 'private_admin_content')!.content.avulsos.items[0];
    expect(retired).toMatchObject({ slug: sold.slug, active: false, exclusivePhotos: sold.exclusivePhotos });
    expect(harness.tables.site_content.find((row) => row.key === 'published_content')!.content.avulsos.items).toEqual([]);
  });

  it('allows deleting a pack with only expired pending Pix or simulated test orders, but blocks active pending Pix', async () => {
    const original = structuredClone(harness.tables.site_content.find((row) => row.key === 'private_admin_content')!.content);
    const saveEmpty = () =>
      syncContent({
        env,
        request: new Request('https://admin.nuaborges.com.br/api/content/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: { ...original, avulsos: { ...original.avulsos, items: [] } } }),
        }),
      });

    // 1. Active (unexpired) pending Pix still blocks deletion
    harness.tables.orders.push({
      id: 'ord_pending_active',
      pack_id: 'ensaio-qa',
      status: 'pending',
      payment_method: 'mercadopago_pix',
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    const activeBlocked = await saveEmpty();
    expect(activeBlocked.status).toBe(409);
    expect(await activeBlocked.json()).toMatchObject({ code: 'PACK_HAS_PURCHASES' });

    // 2. Expired pending Pix + simulated local test order do NOT block deletion
    harness.tables.orders = [
      {
        id: 'ord_pending_expired',
        pack_id: 'ensaio-qa',
        status: 'pending',
        payment_method: 'mercadopago_pix',
        expires_at: new Date(Date.now() - 60 * 1000).toISOString(),
      },
      {
        id: 'ord_sim_test',
        pack_id: 'ensaio-qa',
        status: 'paid',
        payment_method: 'simulated_local_pix',
      },
    ];
    const allowed = await saveEmpty();
    expect(allowed.status).toBe(200);
    expect(harness.tables.site_content.find((row) => row.key === 'private_admin_content')!.content.avulsos.items).toEqual([]);
  });

  it('Packs create-pix: enforces canonical server price, rejects drafts/tampering/prod-simulation', async () => {
    // 1. Disallowed product type -> 400
    const badType = await createPix({
      request: new Request('https://nuaborges.com.br/api/payments/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'hack', slug: 'ensaio-qa', payerEmail: 'a@qa.test' }),
      }),
      env,
    });
    expect(badType.status).toBe(400);

    // 2. Draft pack rejected with 404
    const draftRes = await createPix({
      request: new Request('https://nuaborges.com.br/api/payments/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'pack', slug: 'rascunho-qa', payerEmail: 'a@qa.test' }),
      }),
      env,
    });
    expect(draftRes.status).toBe(404);

    // 3. Production blocks simulate: true (403)
    const simProd = await createPix({
      request: new Request('https://nuaborges.com.br/api/payments/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'pack', slug: 'ensaio-qa', payerEmail: 'a@qa.test', simulate: true }),
      }),
      env,
    });
    expect(simProd.status).toBe(403);

    // 4. simulate-approve endpoint strictly blocked in production (403)
    const simApproveProd = await simulateApprove({
      request: new Request('https://nuaborges.com.br/api/payments/simulate-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: 'ord_any' }),
      }),
      env,
    });
    expect(simApproveProd.status).toBe(403);

    // 5. Legitimate Pix ignores client-submitted price/amount tampering and uses canonical R$ 89,90
    const email = createTestEmail('packbuyer');
    const okRes = await createPix({
      request: new Request('https://nuaborges.com.br/api/payments/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'pack',
          slug: 'ensaio-qa',
          payerEmail: email,
          amount: 0.01,
          price: 0.01,
          canonicalPrice: 1,
        }),
      }),
      env,
    });
    expect(okRes.status).toBe(201);
    const data = await okRes.json();
    expect(data.amount).toBe(89.9);
    expect(harness.tables.orders).toHaveLength(1);
    expect(harness.tables.orders[0].amount).toBe(89.9);
  });

  it('Cofre Digital: validates Fluxo A (first access), Fluxo B (return visit), Fluxo C (new browser), and Fluxo D (security/IDOR/download)', async () => {
    const photoPath = `objects/private/${'a'.repeat(64)}/variants/full-2400x1600-q85-v1.webp`;
    const videoPath = `objects/private/${'b'.repeat(64)}/video-video-mp4-faststart-v1`;
    const privateRow = harness.tables.site_content.find((row) => row.key === 'private_admin_content')!;
    const original = privateRow.content.avulsos.items[0];
    privateRow.content.avulsos.items[0] = { ...original, active: false, isDraft: true };
    const activate = (photoUrl: string) => syncContent({
      env,
      request: new Request('https://admin.nuaborges.com.br/api/content/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: {
          ...privateRow.content,
          avulsos: { ...privateRow.content.avulsos, items: [{
            ...original, active: true, isDraft: false,
            exclusivePhotos: [...original.exclusivePhotos, photoUrl],
            videos: [{ id: 'novo-video', title: 'Vídeo de entrega', url: `/media/${videoPath}` }],
          }] },
        } }),
      }),
    });
    const publicUpload = await activate(`/media/objects/public/${'c'.repeat(64)}/foto.webp`);
    expect(publicUpload.status).toBe(400);
    expect(await publicUpload.json()).toMatchObject({ code: 'VAULT_MEDIA_MUST_BE_PRIVATE' });
    expect((await activate(`/media/${photoPath}`)).status).toBe(200);
    const published = harness.tables.site_content.find((row) => row.key === 'published_content')!.content.avulsos.items[0];
    expect(published).toMatchObject({ slug: original.slug, active: true, exclusivePhotos: [], videos: [{ url: '' }] });
    expect(JSON.stringify(published).includes('objects/private/')).toBe(false);

    const ownerEmail = createTestEmail('owner');
    const attackerEmail = createTestEmail('attacker');
    const ownerProfile = await getOrCreateProfileByEmail(env as any, ownerEmail, 'Dono');
    expect(ownerProfile).toBeTruthy();

    const orderId = 'ord_cofre_qa_001';
    harness.tables.orders.push({
      id: orderId,
      purchase_token: 'tok_cofre_qa_001',
      pack_id: 'ensaio-qa',
      amount: 89.9,
      status: 'paid',
      customer_email: ownerEmail,
      customer_name: 'Dono',
      payment_method: 'mercadopago_pix',
      created_at: new Date().toISOString(),
    });
    await claimOrderForProfile(env as any, orderId, ownerProfile!.id, 'checkout_authenticated');
    await grantEntitlement(env as any, {
      profileId: ownerProfile!.id,
      orderRef: orderId,
      kind: 'pack',
      resourceId: 'ensaio-qa',
      title: 'Ensaio Exclusivo QA',
      expiresAt: null,
      allowDownload: false,
    });

    // Direct access to private media without Vault session -> 403
    const directDenied = await mediaProxyGet({
      request: new Request('https://nuaborges.com.br/media/private/ensaio-qa/foto-01.webp?cofre=1'),
      env,
      params: { path: ['private', 'ensaio-qa', 'foto-01.webp'] },
    });
    expect(directDenied.status).toBe(403);
    const newPathDenied = await mediaProxyGet({
      request: new Request(`https://nuaborges.com.br/media/${videoPath}?cofre=1`),
      env,
      params: { path: videoPath.split('/') },
    });
    expect(newPathDenied.status).toBe(403);

    // Fluxo A: Request browser confirmation
    const reqConfirm = await cofreHandler({
      request: new Request('https://nuaborges.com.br/api/me/cofre', {
        method: 'POST',
        headers: { Origin: 'https://nuaborges.com.br', 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', order: orderId }),
      }),
      env: env as any,
    });
    expect(reqConfirm.status).toBe(200);
    expect((await reqConfirm.json()).state).toBe('sent');
    const browser1Jar: Record<string, string> = extractCookies(reqConfirm.headers);

    const confirmMail = harness.emails.find((e) => e.to === ownerEmail && e.html.includes('confirm='));
    expect(confirmMail).toBeTruthy();
    const tokenMatch = confirmMail!.html.match(/confirm=([a-f0-9-]{20,})/i);
    expect(tokenMatch?.[1]).toBeTruthy();
    const confirmToken = tokenMatch![1];

    // Fluxo C (security): Confirming token in Browser 2 WITHOUT pending cookie -> 403 wrongBrowser!
    const wrongBrowserRes = await cofreHandler({
      request: new Request('https://nuaborges.com.br/api/me/cofre', {
        method: 'POST',
        headers: { Origin: 'https://nuaborges.com.br', 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', order: orderId, token: confirmToken }),
      }),
      env: env as any,
    });
    expect(wrongBrowserRes.status).toBe(403);
    expect((await wrongBrowserRes.json()).state).toBe('wrongBrowser');

    // Fluxo A: Confirm in Browser 1 WITH pending cookie -> ready!
    const confirmOk = await cofreHandler({
      request: new Request('https://nuaborges.com.br/api/me/cofre', {
        method: 'POST',
        headers: {
          Origin: 'https://nuaborges.com.br',
          'Content-Type': 'application/json',
          Cookie: serializeCookieJar(browser1Jar),
        },
        body: JSON.stringify({ action: 'confirm', order: orderId, token: confirmToken }),
      }),
      env: env as any,
    });
    expect(confirmOk.status).toBe(200);
    const readyBody = await confirmOk.json();
    expect(readyBody.state).toBe('ready');
    expect(readyBody.files.length).toBeGreaterThanOrEqual(2);
    expect(readyBody.files).toEqual(expect.arrayContaining([
      expect.objectContaining({ url: `/media/${photoPath}?cofre=1`, video: false }),
      expect.objectContaining({ url: `/media/${videoPath}?cofre=1`, video: true }),
    ]));
    expect(readyBody.files[0].download).toBeUndefined(); // allowDownload is false for Pack!
    Object.assign(browser1Jar, extractCookies(confirmOk.headers));

    const getStream = vi.spyOn(mediaStore, 'getMediaStream').mockResolvedValueOnce({
      body: new Response(new Uint8Array([1, 2, 3])).body!,
      contentType: 'video/mp4', contentLength: 3, contentRange: 'bytes 0-2/32',
    });
    try {
      const stream = await mediaProxyGet({
        request: new Request(`https://nuaborges.com.br/media/${videoPath}?cofre=1`, {
          headers: { Cookie: serializeCookieJar(browser1Jar), Range: 'bytes=0-2' },
        }),
        env,
        params: { path: videoPath.split('/') },
      });
      expect(getStream).toHaveBeenCalledWith(env, `media/${videoPath}`, 'bytes=0-2');
      expect(stream.status).toBe(206);
      expect(stream.headers.get('Cache-Control')?.startsWith('private, no-store')).toBe(true);
      expect(new Uint8Array(await stream.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    } finally {
      getStream.mockRestore();
    }

    // Reusing single-use token -> 403 expired
    const replayToken = await cofreHandler({
      request: new Request('https://nuaborges.com.br/api/me/cofre', {
        method: 'POST',
        headers: {
          Origin: 'https://nuaborges.com.br',
          'Content-Type': 'application/json',
          Cookie: serializeCookieJar(browser1Jar),
        },
        body: JSON.stringify({ action: 'confirm', order: orderId, token: confirmToken }),
      }),
      env: env as any,
    });
    expect(replayToken.status).toBe(403);

    // Media URL signing rejects unauthorized download=true when allowDownload=false (403)
    const dlDenied = await mediaUrlHandler({
      request: new Request('https://nuaborges.com.br/api/me/media-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: serializeCookieJar(browser1Jar) },
        body: JSON.stringify({
          resourceId: 'ensaio-qa',
          mediaPath: '/media/private/ensaio-qa/foto-01.webp',
          download: true,
        }),
      }),
      env: env as any,
    });
    expect(dlDenied.status).toBe(403);

    // Media URL signing succeeds for viewing (download=false)
    const signOk = await mediaUrlHandler({
      request: new Request('https://nuaborges.com.br/api/me/media-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: serializeCookieJar(browser1Jar) },
        body: JSON.stringify({
          resourceId: 'ensaio-qa',
          mediaPath: '/media/private/ensaio-qa/foto-01.webp',
          download: false,
        }),
      }),
      env: env as any,
    });
    expect(signOk.status).toBe(200);
    const signedData = await signOk.json();
    expect(signedData.signedUrl.includes('sig=')).toBe(true);

    // Fluxo D (Cross-account IDOR): Attacker authenticated with another NUA ID cannot sign or access owner's media
    const attackerAuth = await authenticateCustomer(attackerEmail);
    const idorSign = await mediaUrlHandler({
      request: new Request('https://nuaborges.com.br/api/me/media-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: attackerAuth.cookie },
        body: JSON.stringify({
          resourceId: 'ensaio-qa',
          mediaPath: '/media/private/ensaio-qa/foto-01.webp',
        }),
      }),
      env: env as any,
    });
    expect(idorSign.status).toBe(403);

    // Even possessing owner's signedUrl, attacker's browser has no active visit -> 403!
    const idorMedia = await mediaProxyGet({
      request: new Request(`https://nuaborges.com.br${signedData.signedUrl}`, {
        headers: { Cookie: attackerAuth.cookie },
      }),
      env,
      params: { path: ['private', 'ensaio-qa', 'foto-01.webp'] },
    });
    expect(idorMedia.status).toBe(403);

    // Fluxo B: Close visit, preserve browser trust cookie -> reopen creates new visit without email confirmation
    await cofreHandler({
      request: new Request('https://nuaborges.com.br/api/me/cofre', {
        method: 'POST',
        headers: {
          Origin: 'https://nuaborges.com.br',
          'Content-Type': 'application/json',
          Cookie: serializeCookieJar(browser1Jar),
        },
        body: JSON.stringify({ action: 'close', order: orderId }),
      }),
      env: env as any,
    });

    const reopenRes = await cofreHandler({
      request: new Request('https://nuaborges.com.br/api/me/cofre', {
        method: 'POST',
        headers: {
          Origin: 'https://nuaborges.com.br',
          'Content-Type': 'application/json',
          Cookie: serializeCookieJar(browser1Jar),
        },
        body: JSON.stringify({ action: 'open', order: orderId }),
      }),
      env: env as any,
    });
    expect(reopenRes.status).toBe(200);
    expect((await reopenRes.json()).state).toBe('ready');

    // Fluxo D (Revocation): After refund revokes entitlement, Cofre immediately denies access
    await revokeEntitlementsByOrder(env as any, orderId, 'refunded');
    const afterRevoke = await cofreHandler({
      request: new Request('https://nuaborges.com.br/api/me/cofre', {
        method: 'POST',
        headers: {
          Origin: 'https://nuaborges.com.br',
          'Content-Type': 'application/json',
          Cookie: serializeCookieJar(browser1Jar),
        },
        body: JSON.stringify({ action: 'open', order: orderId }),
      }),
      env: env as any,
    });
    expect((await afterRevoke.json()).state).toBe('confirm');
  });

  it('Personalizados: creates order with server-side price, rejects public vaultFiles, and releases entitlement on pronto', async () => {
    const email = createTestEmail('pers');
    const createRes = await createPersonalizado({
      request: new Request('https://nuaborges.com.br/api/personalizados/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: 'Cliente Personalizado',
          clientContact: email,
          deliveryChannel: 'vault',
          photoCount: 3,
          videoOptionId: 'vid_none',
          mentionName: true,
          express24h: false,
          briefing: 'Tema QA editorial',
          turnstileToken: 'qa-turnstile-token-valid-12345',
        }),
      }),
      env,
    });
    expect(createRes.status).toBe(201);
    const { order } = await createRes.json();
    expect(order.status).toBe('aguardando_pagamento');
    expect(order.totalPrice).toBeGreaterThan(0);

    // Admin attempting to attach public URL to vaultFiles -> 400
    const badVaultRes = await adminPersonalizados({
      request: new Request('https://admin.nuaborges.com.br/api/personalizados/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_order',
          orderId: order.id,
          patch: {
            status: 'pronto',
            vaultFiles: [{ id: 'f1', url: '/media/gallery/public.webp', type: 'image' }],
          },
        }),
      }),
      env,
    });
    expect(badVaultRes.status).toBe(400);

    // Simulate payment approved on persisted personalizado, then admin delivers valid /media/private/...
    const row = harness.tables.personalizados_orders.find((r) => r.id === order.id);
    row.payment = { ...(row.payment || {}), status: 'approved' };
    row.status = 'em_producao';

    const deliverRes = await adminPersonalizados({
      request: new Request('https://admin.nuaborges.com.br/api/personalizados/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_order',
          orderId: order.id,
          patch: {
            status: 'entregue',
            vaultFiles: [{ id: 'f1', url: `/media/private/${order.id}/entrega-01.webp`, type: 'image' }],
          },
        }),
      }),
      env,
    });
    expect(deliverRes.status).toBe(200);
    // Entitlement & Vault delivery email dispatched
    expect(harness.emails.some((e) => e.to === email && e.html.includes(order.id))).toBe(true);
  });

  it('Claim: enforces token + email match, prevents double ownership (409), and denies entitlement for unpaid orders', async () => {
    const ownerEmail = createTestEmail('claimowner');
    const otherEmail = createTestEmail('claimother');
    const ownerAuth = await authenticateCustomer(ownerEmail);
    const otherAuth = await authenticateCustomer(otherEmail);

    harness.tables.orders.push({
      id: 'ord_pending_claim',
      purchase_token: 'tok_pending_claim_1234',
      pack_id: 'ensaio-qa',
      amount: 89.9,
      status: 'pending',
      customer_email: ownerEmail,
      customer_name: 'Owner',
    });

    // Wrong email trying to claim -> 403
    const wrongEmailRes = await claimHandler({
      request: new Request('https://nuaborges.com.br/api/me/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: otherAuth.cookie },
        body: JSON.stringify({ token: 'tok_pending_claim_1234' }),
      }),
      env: env as any,
    });
    expect(wrongEmailRes.status).toBe(403);

    // Owner claims pending order -> 200, linked to history, entitlementGranted = FALSE!
    const pendingClaimRes = await claimHandler({
      request: new Request('https://nuaborges.com.br/api/me/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: ownerAuth.cookie },
        body: JSON.stringify({ token: 'tok_pending_claim_1234' }),
      }),
      env: env as any,
    });
    expect(pendingClaimRes.status).toBe(200);
    const claimBody = await pendingClaimRes.json();
    expect(claimBody.entitlementGranted).toBe(false);
    expect(claimBody.financialStatus).toBe('pending');
  });

  it('Media Delete: blocks deletion of referenced media in published_content or personalizados vault_files, rejects traversal, and fails closed on DB error', async () => {
    // Path traversal -> 400
    const travRes = await mediaDeletePost({
      request: new Request('https://admin.nuaborges.com.br/api/media/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: ['media/../secret.txt'] }),
      }),
      env,
    });
    expect(travRes.status).toBe(400);

    // Referenced media in published_content (qa-cover.webp) must be blocked!
    const inUseRes = await mediaDeletePost({
      request: new Request('https://admin.nuaborges.com.br/api/media/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: ['media/gallery/qa-cover.webp'] }),
      }),
      env,
    });
    const inUseBody = await inUseRes.json();
    expect(inUseRes.status).toBe(409);
    expect(inUseBody.inUseDetails?.length || 0).toBeGreaterThanOrEqual(1);

    // DB outage -> fail-closed 503 (never deletes blindly)
    harness.faults.supabaseDown = true;
    const dbDownRes = await mediaDeletePost({
      request: new Request('https://admin.nuaborges.com.br/api/media/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: ['media/gallery/orphan.webp'] }),
      }),
      env,
    });
    expect(dbDownRes.status).toBe(503);
  });

  it('Commercial Finance & Mensalidade remain strictly segregated and Central de Clientes unifies customer history', async () => {
    const email = createTestEmail('unified');
    const profile = await getOrCreateProfileByEmail(env as any, email, 'Cliente Unificado');
    harness.tables.orders.push({
      id: 'ord_fin_1',
      pack_id: 'ensaio-qa',
      amount: 89.9,
      status: 'paid',
      customer_email: email,
      customer_name: 'Cliente Unificado',
      created_at: new Date().toISOString(),
    });
    await claimOrderForProfile(env as any, 'ord_fin_1', profile!.id, 'checkout_authenticated');

    const commercialRes = await financeDashboardGet({
      request: new Request('https://admin.nuaborges.com.br/api/admin/finance-dashboard?period=all'),
      env,
    });
    expect(commercialRes.status).toBe(200);
    const commercial = await commercialRes.json();
    expect(commercial.transactions.some((t: any) => t.orderId === 'ord_fin_1')).toBe(true);

    const installmentsRes = await installmentsGet({
      request: new Request('https://admin.nuaborges.com.br/api/finance/installments'),
      env,
    });
    expect(installmentsRes.status).toBe(200);
    const instData = await installmentsRes.json();
    expect(instData.installments).toHaveLength(10);
    // Commercial orders never leak into site monthly installments
    expect(JSON.stringify(instData.installments).includes('ord_fin_1')).toBe(false);

    const customersRes = await adminCustomersGet({
      request: new Request('https://admin.nuaborges.com.br/api/admin/customers'),
      env: env as any,
    });
    expect(customersRes.status).toBe(200);
    const custData = await customersRes.json();
    const matches = (custData.customers || []).filter((c: any) => c.email === email);
    expect(matches).toHaveLength(1);
  });
});
