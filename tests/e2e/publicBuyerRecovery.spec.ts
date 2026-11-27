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
    await visit.getByRole('button', { name: 'Receber código de acesso' }).click();
    await expect(visit.getByLabel('Código de 6 dígitos')).toBeVisible();
    const outbox = async () => (await (await request.get('/__qa__/emails')).json()).emails;
    const otp = (await outbox()).find((mail: { to: string; kind: string }) => mail.to === buyer && mail.kind === 'access_code');
    expect(otp?.code).toMatch(/^\d{6}$/);
    // A database/API interruption is different from an account with zero purchases.
    await visit.route('**/api/me/overview?*', (route) => route.fulfill({ status: 503, json: { success: false } }));
    await visit.getByLabel('Código de 6 dígitos').fill(otp.code);
    await expect(visit.locator('main').getByRole('alert')).toContainText('Não conseguimos atualizar os dados da sua conta');
    await expect(visit.getByText('Sua biblioteca ainda está vazia')).toHaveCount(0);
    await visit.unroute('**/api/me/overview?*');
    await visit.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(visit.getByText(itemTitle, { exact: true })).toBeVisible();
    await visit.getByRole('button', { name: 'Abrir conteúdo' }).click();
    await visit.getByRole('button', { name: 'Receber confirmação por e-mail' }).click();
    await expect(visit.getByRole('status')).toContainText('Abra o link recebido neste mesmo navegador');
    const confirm = (await outbox()).find((mail: { to: string; kind: string }) => mail.to === buyer && mail.kind === 'vault_browser_confirmation');
    const link = new URL(confirm.confirmUrl);
    const confirmationLink = new URL(link.pathname + link.hash, origin).href;

    const other = await mistakenBrowser.newPage();
    await other.goto(confirmationLink);
    await other.getByRole('button', { name: 'Autorizar este navegador' }).click();
    await expect(other.getByRole('status')).toContainText('Este link precisa ser aberto no mesmo navegador');
    await other.getByRole('button', { name: 'Copiar link para o navegador' }).click();
    await expect(other.getByRole('button', { name: /Link copiado/ })).toBeVisible();
    expect(await other.evaluate(() => navigator.clipboard.readText())).toBe(new URL('/conta' + link.hash, origin).href);

    await visit.goto(confirmationLink);
    await visit.getByRole('button', { name: 'Autorizar este navegador' }).click();
    await expect(visit.getByRole('heading', { name: itemTitle })).toBeVisible();
    const privatePhoto = visit.locator('main img[src*="/media/private/"]').first();
    await expect(privatePhoto).toBeVisible();
    await expect.poll(() => privatePhoto.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    await visit.getByRole('button', { name: 'Encerrar', exact: true }).click();
    await visit.getByRole('button', { name: 'Reabrir conteúdo' }).click();
    await expect(visit.getByRole('heading', { name: itemTitle })).toBeVisible();
    const accountNav = visit.getByRole('navigation', { name: 'Seções da Minha Conta' });
    expect(phone.pages()).toHaveLength(1);
    expect(new URL(visit.url()).pathname).toMatch(/^\/conta\/biblioteca\/[^/]+$/);
    await expect(privatePhoto).toBeVisible();
    await visit.getByRole('button', { name: 'Voltar à biblioteca' }).click();
    await expect(visit.getByRole('region', { name: 'Biblioteca', exact: true })).toBeVisible();
    await expect(accountNav.getByRole('button', { name: /^Biblioteca/ })).toHaveAttribute('aria-current', 'page');
    await expect(accountNav.getByRole('button', { name: 'Perfil' })).toBeVisible();
    await expect(visit.getByRole('button', { name: 'Abrir conteúdo' })).toBeVisible();
    expect(new URL(visit.url()).searchParams.has('item')).toBe(false);

    await accountNav.getByRole('button', { name: 'Pedidos' }).click();
    await expect(visit.getByRole('region', { name: 'Pedidos', exact: true }).getByText(itemTitle, { exact: true })).toBeVisible();
    await expect(visit).toHaveURL(/\/conta\/pedidos$/);
    await visit.goBack();
    await expect(accountNav.getByRole('button', { name: /^Biblioteca/ })).toHaveAttribute('aria-current', 'page');
    await expect(visit.getByRole('button', { name: 'Abrir conteúdo' })).toBeVisible();

    for (const [label, section] of [
      ['Personalizados', 'personalizados'],
      ['Chamadas', 'chamadas'],
      ['Perfil', 'perfil'],
    ]) {
      await accountNav.getByRole('button', { name: label, exact: true }).click();
      await expect(visit.getByRole('region', { name: label, exact: true })).toBeVisible();
      expect(new URL(visit.url()).pathname).toBe('/conta/' + section);
      expect(phone.pages()).toHaveLength(1);
    }
    await accountNav.getByRole('button', { name: /^Biblioteca/ }).click();
    await expect(visit.getByRole('region', { name: 'Biblioteca', exact: true })).toBeVisible();
    for (const width of [320, 1280]) {
      await visit.setViewportSize({ width, height: 800 });
      await expect(accountNav.getByRole('button', { name: 'Perfil' })).toBeVisible();
      expect(await visit.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  } finally {
    await Promise.all([desktop.close(), phone.close(), mistakenBrowser.close()]);
  }
});
