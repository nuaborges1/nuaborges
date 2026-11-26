import { devices, expect, test } from '@playwright/test';

test('compra pela interface e recupera o Cofre pelo menu no celular, sem o e-mail original', async ({ browser, request, baseURL }) => {
  test.setTimeout(60_000);
  await request.post('/__qa__/reset');
  const buyer = 'recuperacao.cofre@qa.test';
  const origin = new URL(baseURL!);
  // Use the production client routing (same origin) against the loopback QA server.
  origin.hostname = 'nua.localhost';
  const desktop = await browser.newContext({ baseURL: origin.origin });
  const phone = await browser.newContext({ ...devices['Pixel 7'], baseURL: origin.origin });
  const mistakenBrowser = await browser.newContext({ baseURL: origin.origin, permissions: ['clipboard-read', 'clipboard-write'] });
  try {
    for (const context of [desktop, phone, mistakenBrowser]) {
      await context.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === origin.origin) return route.continue();
        if (url.hostname === 'challenges.cloudflare.com' && url.pathname === '/turnstile/v0/api.js') {
          return route.fulfill({ contentType: 'application/javascript', body: `
            window.turnstile = {
              render: (_, options) => { queueMicrotask(() => options.callback('loopback-qa-only')); return 'qa'; },
              reset: () => {}, remove: () => {}
            };` });
        }
        return route.abort();
      });
    }

    const shop = await desktop.newPage();
    await shop.goto('/avulsos/teste');
    await shop.getByRole('button', { name: /comprar.*pix/i }).filter({ visible: true }).first().click();
    await shop.getByPlaceholder('seu.email@exemplo.com').fill(buyer);
    const created = shop.waitForResponse((response) => response.url().endsWith('/api/payments/create-pix') && response.request().method() === 'POST');
    await shop.getByRole('button', { name: 'Pagar com Pix Agora' }).click();
    const payment = await created;
    expect(payment.status()).toBe(201);
    const { orderId, itemTitle } = await payment.json();
    await expect(shop.getByAltText('QR Code Pix')).toBeVisible();
    await desktop.close();
    expect((await request.post('/__qa__/approve-payment', { data: { orderId } })).ok()).toBe(true);

    const visit = await phone.newPage();
    await visit.goto('/');
    await visit.getByRole('button', { name: 'Abrir menu' }).click();
    await visit.getByRole('link', { name: 'Minha Conta', exact: true }).filter({ visible: true }).first().click();
    await visit.getByLabel('E-mail utilizado na compra').fill(buyer);
    await visit.getByRole('button', { name: 'Receber código por e-mail' }).click();
    await expect(visit.getByLabel('Código de 6 dígitos')).toBeVisible();
    const outbox = async () => (await (await request.get('/__qa__/emails')).json()).emails;
    const otp = (await outbox()).find((mail: { to: string; kind: string }) => mail.to === buyer && mail.kind === 'access_code');
    expect(otp?.code).toMatch(/^\d{6}$/);
    // A database/API interruption is different from an account with zero purchases.
    await visit.route('**/api/me/overview?*', (route) => route.fulfill({ status: 503, json: { success: false } }));
    await visit.getByLabel('Código de 6 dígitos').fill(otp.code);
    await expect(visit.locator('main').getByRole('alert')).toContainText('Não conseguimos atualizar suas compras e reservas');
    await expect(visit.getByText('Sua biblioteca ainda está vazia')).toHaveCount(0);
    await visit.unroute('**/api/me/overview?*');
    await visit.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(visit.getByText(itemTitle, { exact: true })).toBeVisible();
    await visit.getByRole('button', { name: 'Abrir conteúdo' }).click();
    await visit.getByRole('button', { name: 'Receber confirmação por e-mail' }).click();
    await expect(visit.getByRole('status')).toContainText('Enviamos um link de confirmação');
    const confirm = (await outbox()).find((mail: { to: string; kind: string }) => mail.to === buyer && mail.kind === 'vault_browser_confirmation');
    const link = new URL(confirm.confirmUrl);
    const confirmationLink = new URL(link.pathname + link.hash, origin).href;

    const other = await mistakenBrowser.newPage();
    await other.goto(confirmationLink);
    await other.getByRole('button', { name: 'Autorizar este navegador' }).click();
    await expect(other.getByRole('status')).toContainText('Abra o link no mesmo navegador em que você pediu acesso');
    await other.getByRole('button', { name: 'Copiar link para abrir no navegador' }).click();
    await expect(other.getByRole('button', { name: /Link copiado/ })).toBeVisible();
    expect(await other.evaluate(() => navigator.clipboard.readText())).toBe(new URL('/conta' + link.hash, origin).href);

    await visit.goto(confirmationLink);
    await visit.getByRole('button', { name: 'Autorizar este navegador' }).click();
    await expect(visit.getByRole('heading', { name: itemTitle })).toBeVisible();
    const privatePhoto = visit.locator('main img[src*="/media/private/"]').first();
    await expect(privatePhoto).toBeVisible();
    await expect.poll(() => privatePhoto.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    await visit.getByRole('button', { name: 'Encerrar acesso' }).click();
    await visit.getByRole('button', { name: 'Reabrir conteúdo' }).click();
    await expect(visit.getByRole('heading', { name: itemTitle })).toBeVisible();
    await expect(visit.getByRole('navigation', { name: 'Navegação da Minha Conta' })).toHaveCount(0);
    await visit.getByRole('button', { name: 'Voltar à biblioteca' }).click();
    await expect(visit.getByRole('heading', { name: 'Sua biblioteca' })).toBeVisible();
    await expect(visit.getByRole('button', { name: 'Perfil e segurança' })).toBeVisible();
    await expect(visit.getByRole('button', { name: 'Abrir conteúdo' })).toBeVisible();
    expect(new URL(visit.url()).searchParams.has('item')).toBe(false);
  } finally {
    await Promise.all([desktop.close(), phone.close(), mistakenBrowser.close()]);
  }
});
