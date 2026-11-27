import { expect, test } from '@playwright/test';

const qaPort = Number(process.env.QA_E2E_PORT || 3199);
test.use({ baseURL: `http://nua.localhost:${qaPort}` });

const destinations = [
  ['Início', '/'],
  ['Acervo VIP', '/acervo'],
  ['Avulsos', '/avulsos'],
  ['Chamadas VIP', '/chamadas'],
  ['Personalizados', '/personalizados'],
  ['Sobre mim', '/sobre'],
  ['Contato', '/contato'],
  ['Termos de Uso', '/termos'],
  ['Política de Privacidade', '/privacidade'],
  ['Acesso privado', '/conta'],
] as const;

test('rodapé mantém os destinos públicos e o acesso privado sem links duplicados', async ({ page, request }) => {
  await page.goto('/');
  const footer = page.getByRole('contentinfo', { name: 'Rodapé' });

  for (const [label, href] of destinations) {
    await expect(footer.getByRole('link', { name: label, exact: true })).toHaveAttribute('href', href);
    const expectedCount = href === '/' ? 2 : 1;
    await expect(footer.locator('a[href="' + href + '"]')).toHaveCount(expectedCount);
    expect((await request.get(`http://127.0.0.1:${qaPort}${href}`)).ok(), href).toBe(true);
  }

  await expect(footer.getByRole('link', { name: 'Desenvolvido por PHDEV.STORE' })).toHaveAttribute('href', 'https://phdev.store');

  const privacy = footer.getByRole('link', { name: 'Política de Privacidade' });
  const privateAccess = footer.getByRole('link', { name: 'Acesso privado' });
  await privacy.focus();
  await page.keyboard.press('Tab');
  await expect(privateAccess).toBeFocused();
  await expect(privateAccess).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/conta$/);
  await expect(page.getByLabel('E-mail utilizado na compra')).toBeVisible();
  await expect(footer).toHaveCount(1);
});

test('rodapé mantém as áreas alinhadas e sem overflow em cada largura', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const footer = page.getByRole('contentinfo', { name: 'Rodapé' });
  const explore = footer.getByRole('navigation', { name: 'Explore' });
  const information = footer.getByRole('navigation', { name: 'Institucional' });
  const platforms = footer.getByRole('navigation', { name: 'Plataformas' });
  await expect(explore.getByRole('link', { name: 'Início', exact: true })).toHaveCSS('transition-duration', '0s');

  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const exploreBox = (await explore.boundingBox())!;
    const infoBox = (await information.boundingBox())!;
    const platformBox = (await platforms.boundingBox())!;
    if (width >= 1024) {
      expect(exploreBox.y).toBeCloseTo(infoBox.y, 0);
      expect(infoBox.y).toBeCloseTo(platformBox.y, 0);
      expect(exploreBox.x + exploreBox.width).toBeLessThanOrEqual(infoBox.x);
      expect(infoBox.x + infoBox.width).toBeLessThanOrEqual(platformBox.x);
    } else if (width >= 640) {
      expect(infoBox.y).toBeCloseTo(platformBox.y, 0);
      expect(infoBox.x + infoBox.width).toBeLessThanOrEqual(platformBox.x);
      expect(exploreBox.y + exploreBox.height).toBeLessThan(infoBox.y);
    } else {
      expect(exploreBox.x).toBeCloseTo(infoBox.x, 0);
      expect(infoBox.x).toBeCloseTo(platformBox.x, 0);
      expect(exploreBox.y + exploreBox.height).toBeLessThan(infoBox.y);
      expect(infoBox.y + infoBox.height).toBeLessThan(platformBox.y);
    }

    const fits = await footer.evaluate((element) => element.scrollWidth <= element.clientWidth &&
      document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    expect(fits, width + ' px').toBe(true);
  }
});

test('rodapé aplica os dados publicados e oculta plataformas indisponíveis', async ({ page }) => {
  let showInstagram = true;
  await page.route('**/api/content/sync', (route) => route.fulfill({
    json: { content: {
      footer: {
        brandName: 'Marca publicada',
        role: showInstagram ? 'Descrição publicada' : 'Descrição atualizada',
        concept: 'Editorial publicado',
        copyrightText: '© Direitos personalizados',
        signOff: 'Assinatura publicada ♡',
      },
      institutional: {
        sectionTitle: 'Sobre o site',
        links: [
          { id: 'help', label: 'Ajuda publicada', active: true, url: 'https://example.org/ajuda', openInNewTab: true },
          { id: 'contact', label: 'Contato repetido', active: true, url: '/contato/' },
          { id: 'terms', label: 'Termos desativados', active: false, url: '/termos' },
        ],
      },
      channels: {
        instagram: { title: 'Instagram publicado', url: showInstagram ? 'https://www.instagram.com/nuaborges/' : '' },
        onlyfans: { title: 'OnlyFans desativado', url: 'https://onlyfans.com/nuaborges', active: false },
        privacy: { title: 'Privacy sem endereço', url: '', active: true },
        closefans: { title: 'Close Fans desativado', url: 'https://close.fans/nuaborges', active: false },
      },
    } },
  }));

  await page.goto('/');
  const footer = page.getByRole('contentinfo', { name: 'Rodapé' });
  await expect(footer).toContainText('Marca publicada');
  await expect(footer).toContainText('Descrição publicada');
  await expect(footer).toContainText('Editorial publicado');
  await expect(footer).toContainText('© Direitos personalizados');
  await expect(footer).toContainText('Assinatura publicada');
  await expect(footer).toContainText('♡');
  const information = footer.getByRole('navigation', { name: 'Sobre o site' });
  const help = information.getByRole('link', { name: 'Ajuda publicada' });
  await expect(help).toHaveAttribute('href', 'https://example.org/ajuda');
  await expect(help).toHaveAttribute('target', '_blank');
  await expect(information.getByRole('link', { name: /repetido|desativado/ })).toHaveCount(0);

  const platforms = footer.getByRole('navigation', { name: 'Plataformas' });
  await expect(platforms.getByRole('link', { name: 'Instagram publicado' })).toHaveAttribute('href', 'https://www.instagram.com/nuaborges/');
  await expect(platforms.getByRole('link')).toHaveCount(1);
  showInstagram = false;
  await page.reload();
  await expect(footer).toContainText('Descrição atualizada');
  await expect(platforms).toHaveCount(0);
});
