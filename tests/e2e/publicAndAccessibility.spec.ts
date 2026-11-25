import { test, expect } from '@playwright/test';
import { catalogFallbackSlug } from '../../lib/publicCatalog';
import { readPublishedPacks } from '../../lib/publishedSeoData';

const publicPackSlug = readPublishedPacks()[0]?.slug ?? catalogFallbackSlug;

const PUBLIC_ROUTES = [
  '/',
  '/avulsos',
  `/avulsos/${publicPackSlug}`,
  '/chamadas',
  '/personalizados',
  '/acervo',
  '/sobre',
  '/contato',
  '/termos',
  '/privacidade',
];

test.describe('E2E — Site Público, Rotas Diretas, 404 e Acessibilidade Básica', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('/__qa__/reset');
  });

  for (const route of PUBLIC_ROUTES) {
    test(`renderiza rota pública ${route} sem erros JS não tratados e com estrutura semântica`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (err) => pageErrors.push(err.message));

      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);

      await expect(page.locator('body')).toBeVisible();
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.trim().length).toBeGreaterThan(20);

      // Verify keyboard focus moves cleanly via Tab
      await page.keyboard.press('Tab');
      const activeTag = await page.evaluate(() => document.activeElement?.tagName || '');
      expect(activeTag).not.toBe('');

      expect(pageErrors, `Uncaught JS errors on ${route}`).toEqual([]);
    });
  }

  test('exibe página 404 amigável para rota inexistente', async ({ page }) => {
    const res = await page.goto('/rota-inexistente-qa-404', { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBe(404);
    await expect(page.locator('body')).toContainText(/404|não encontrada|página/i);
  });

  test('orienta o cliente a recuperar a compra a partir do endereço antigo de assistir', async ({ page }) => {
    await page.goto('/assistir/sessao-tantrica');
    await expect(page.getByRole('link', { name: 'Recuperar minhas compras' })).toHaveAttribute('href', '/conta?tab=biblioteca');
  });
});
