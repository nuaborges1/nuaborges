import { describe, it, expect } from 'vitest';
import {
  ORIGINAL_COPY,
  STOCK_CMS_BASELINES,
} from '@/lib/copy/original';
import { NUA_AUTORAL_EXPERIMENTAL_COPY } from '@/lib/copy/nua-autoral.experimental';
import {
  DEFAULT_COPY_MODE,
  isStockCmsValue,
  normalizeVerbalIdentityConfig,
  resolveCmsText,
  resolveCopyDictionary,
  resolveRouteSeo,
} from '@/lib/copy/resolver';
import {
  applyEdgeCopyModeToHtml,
  shouldInjectCopyMeta,
} from '@/functions/_verbalIdentityEdge';
import type { CmsStockOverrideKey, PublicSeoRoute } from '@/lib/copy/types';

function collectLeafEntries(
  obj: unknown,
  prefix = ''
): Array<{ path: string; value: unknown }> {
  if (obj === null || typeof obj !== 'object') {
    return [{ path: prefix, value: obj }];
  }
  if (Array.isArray(obj)) {
    return obj.flatMap((item, idx) =>
      collectLeafEntries(item, `${prefix}[${idx}]`)
    );
  }
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    collectLeafEntries(v, prefix ? `${prefix}.${k}` : k)
  );
}

describe('Identidade Verbal Experimental — Cobertura, Transparência e Reversibilidade', () => {
  it('mantém paridade total de chaves e tipos entre ORIGINAL_COPY e NUA_AUTORAL_EXPERIMENTAL_COPY', () => {
    const origEntries = collectLeafEntries(ORIGINAL_COPY);
    const expEntries = collectLeafEntries(NUA_AUTORAL_EXPERIMENTAL_COPY);

    expect(expEntries.map((e) => e.path)).toEqual(origEntries.map((e) => e.path));

    for (let i = 0; i < origEntries.length; i++) {
      const orig = origEntries[i];
      const exp = expEntries[i];
      expect(typeof exp.value, `Tipo divergente em ${exp.path}`).toBe(typeof orig.value);

      if (typeof exp.value === 'string') {
        // Permite prefixo vazio opcional em checkout.approved.tokenWarningPrefix
        if (exp.path !== 'checkout.approved.tokenWarningPrefix') {
          expect(exp.value.trim().length, `String vazia em ${exp.path}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('executa funções parametrizadas de ambos os dicionários sem erros e com pluralização correta', () => {
    for (const dict of [ORIGINAL_COPY, NUA_AUTORAL_EXPERIMENTAL_COPY]) {
      expect(dict.footer.brandBackHomeAria('Nua Borges')).toContain('Nua Borges');
      expect(dict.footer.platformAriaOf('OnlyFans', 'Nua Borges')).toContain('OnlyFans');
      expect(dict.footer.copyrightFallback(2026, 'Nua Borges')).toContain('2026');
      expect(dict.home.hero.imageCounterAria(1, 3)).toContain('1');
      expect(dict.home.hero.goToPhotoAria(2)).toContain('2');
      expect(dict.home.lancamentos.formatPhotos(1)).toMatch(/1 foto$/);
      expect(dict.home.lancamentos.formatPhotos(5)).toMatch(/5 fotos$/);
      expect(dict.home.lancamentos.formatVideos(1)).toMatch(/1 vídeo$/);
      expect(dict.home.lancamentos.formatVideos(3)).toMatch(/3 vídeos$/);
      expect(dict.avulsos.cardPreviewCount(1, 2)).toContain('1 foto');
      expect(dict.avulsos.cardPreviewCount(1, 2)).toContain('2 vídeos');
      expect(dict.avulsos.includedPhotos(1)).toContain('1 foto');
      expect(dict.avulsos.includedVideos(2)).toContain('2 vídeos');
      expect(dict.checkout.inlineAuth.loggedInAs('a@b.com')).toContain('a@b.com');
      expect(dict.checkout.inlineAuth.codeHint('a@b.com')).toContain('a@b.com');
      expect(dict.checkout.inlineAuth.resendCountdown(30)).toContain('30');
      expect(dict.checkout.pix.expiresIn('14:59')).toContain('14:59');
      expect(dict.chamadas.durationMinutes(30)).toContain('30');
      expect(dict.chamadas.slotsAvailableCount(1)).toContain('1');
      expect(dict.chamadas.slotsAvailableCount(4)).toContain('4');
      expect(dict.personalizados.photoCard.unitPriceLabel('R$ 20,00')).toContain('R$ 20,00');
      expect(dict.personalizados.photoCard.minHint(5)).toContain('5');
      expect(dict.personalizados.summaryCard.photosRow(5)).toContain('5');
      expect(dict.personalizados.summaryCard.minOrderWarning('R$ 100,00')).toContain('R$ 100,00');
      expect(dict.conta.login.codeStepSubtitle('a@b.com')).toContain('a@b.com');
      expect(dict.conta.login.resendCountdown(20)).toContain('20');
      expect(dict.vault.photosTab(4)).toContain('4');
      expect(dict.vault.videosTab(2)).toContain('2');
      expect(dict.vault.photoCounter(2, 10)).toBe('2 / 10');
      expect(dict.lightbox.viewingAria('Ensaio')).toContain('Ensaio');
    }
  });

  it('impede promessas comerciais imprecisas e clichês na copy experimental', () => {
    const forbiddenPatterns = [
      /acesso vital[ií]cio/i,
      /extrato 100% neutro/i,
      /sigilo absoluto/i,
      /discri[cç][aã]o absoluta/i,
      /criptografia banc[aá]ria/i,
      /extrato banc[aá]rio do pix [eé] neutro e discreto/i,
      /identifica[cç][aã]o banc[aá]ria totalmente neutra/i,
      /deixa de vergonha/i, // assinatura preservada nos lugares originais, nunca spam nos rótulos
    ];

    const expStrings = collectLeafEntries(NUA_AUTORAL_EXPERIMENTAL_COPY).filter(
      (entry): entry is { path: string; value: string } => typeof entry.value === 'string'
    );

    for (const { path, value } of expStrings) {
      for (const pattern of forbiddenPatterns) {
        expect(
          pattern.test(value),
          `Copy experimental em "${path}" violou regra editorial/transparência (${pattern}): "${value}"`
        ).toBe(false);
      }
    }
  });

  it('resolve corretamente modo original (padrão) e modo experimental', () => {
    expect(DEFAULT_COPY_MODE).toBe('original');
    expect(normalizeVerbalIdentityConfig(null).enabled).toBe(false);
    expect(resolveCopyDictionary('original')).toBe(ORIGINAL_COPY);
    expect(resolveCopyDictionary('nua_autoral_experimental')).toBe(NUA_AUTORAL_EXPERIMENTAL_COPY);
  });

  it('normaliza configurações inválidas para original (fail-safe)', () => {
    expect(normalizeVerbalIdentityConfig(null).mode).toBe('original');
    expect(normalizeVerbalIdentityConfig({}).enabled).toBe(false);
    expect(
      normalizeVerbalIdentityConfig({ enabled: true, mode: 'nua_autoral_experimental', version: 3 })
    ).toMatchObject({
      mode: 'nua_autoral_experimental',
      enabled: true,
      version: 3,
    });
  });

  it('aplica precedência conservadora do CMS: sobrescreve apenas baseline de fábrica, respeita vazio e edição manual da Nua', () => {
    const stockKey: CmsStockOverrideKey = 'hero.tagline';
    const stockBaseline = STOCK_CMS_BASELINES[stockKey][0];
    const experimentalOverride = NUA_AUTORAL_EXPERIMENTAL_COPY.cmsStockOverrides[stockKey];

    expect(isStockCmsValue(stockBaseline, stockKey)).toBe(true);
    expect(isStockCmsValue('   ', stockKey)).toBe(false);
    expect(isStockCmsValue('', stockKey)).toBe(false);
    expect(isStockCmsValue('Frase personalizada criada pela Nua no CMS', stockKey)).toBe(false);

    // No modo original: devolve o publicado sem alteração
    expect(resolveCmsText(stockBaseline, stockKey, 'original')).toBe(stockBaseline);
    expect(resolveCmsText('Edição da Nua', stockKey, 'original')).toBe('Edição da Nua');

    // No modo experimental:
    // 1. Valor igual ao baseline de fábrica -> aplica override experimental
    expect(resolveCmsText(stockBaseline, stockKey, 'nua_autoral_experimental')).toBe(
      experimentalOverride
    );
    // 2. Valor explicitamente vazio ("") -> preserva vazio!
    expect(resolveCmsText('', stockKey, 'nua_autoral_experimental')).toBe('');
    // 3. Valor customizado pela Nua -> preserva edição da Nua!
    expect(resolveCmsText('Texto novo da Nua', stockKey, 'nua_autoral_experimental')).toBe(
      'Texto novo da Nua'
    );
    // 4. Undefined com fallback de fábrica -> aplica override experimental
    expect(resolveCmsText(undefined, stockKey, 'nua_autoral_experimental', stockBaseline)).toBe(
      experimentalOverride
    );
  });

  it('resolve SEO para todas as rotas públicas e ignora áreas administrativas/internas', () => {
    const publicRoutes: PublicSeoRoute[] = [
      '/',
      '/sobre',
      '/avulsos',
      '/acervo',
      '/chamadas',
      '/personalizados',
      '/contato',
      '/termos',
      '/privacidade',
    ];

    for (const route of publicRoutes) {
      const origSeo = resolveRouteSeo(route, 'original');
      const expSeo = resolveRouteSeo(route, 'nua_autoral_experimental');
      expect(origSeo?.title).toBeTruthy();
      expect(expSeo?.title).toBeTruthy();
      expect(resolveRouteSeo(`${route}/`, 'nua_autoral_experimental')?.title).toBe(expSeo?.title);
    }

    expect(resolveRouteSeo('/admin', 'nua_autoral_experimental')).toBeNull();
    expect(resolveRouteSeo('/admingeral', 'nua_autoral_experimental')).toBeNull();
    expect(resolveRouteSeo('/contrato', 'nua_autoral_experimental')).toBeNull();
    expect(resolveRouteSeo('/avaliacao', 'nua_autoral_experimental')).toBeNull();
  });

  it('edge HTML injection: injeta apenas meta tag segura, reescreve SEO no modo experimental e protege rotas excluídas', async () => {
    const htmlRes = () =>
      new Response('<!doctype html><html><head><title>T</title></head><body></body></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });

    expect(shouldInjectCopyMeta('nuaborges.com', '/', htmlRes())).toBe(true);
    expect(shouldInjectCopyMeta('nuaborges.com', '/avulsos', htmlRes())).toBe(true);
    expect(shouldInjectCopyMeta('nuaborges.com', '/conta', htmlRes())).toBe(true);
    expect(shouldInjectCopyMeta('nuaborges.com', '/admin', htmlRes())).toBe(false);
    expect(shouldInjectCopyMeta('nuaborges.com', '/admingeral', htmlRes())).toBe(false);
    expect(shouldInjectCopyMeta('nuaborges.com', '/contrato', htmlRes())).toBe(false);
    expect(shouldInjectCopyMeta('nuaborges.com', '/avaliacao', htmlRes())).toBe(false);
    expect(shouldInjectCopyMeta('admin.nuaborges.com', '/', htmlRes())).toBe(false);

    const sampleHtml = `<!doctype html><html><head><title>Original Title</title><meta name="description" content="Original Desc"><meta property="og:title" content="Original OG"><meta name="twitter:description" content="Original TW"></head><body><h1>Site</h1></body></html>`;

    // Modo original: injeta meta original e mantém SEO intacto (sem inline script!)
    const origResp = await applyEdgeCopyModeToHtml(
      new Response(sampleHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
      '/sobre',
      'original'
    );
    const origHtml = await origResp.text();
    expect(origHtml).toContain('<meta name="nua-copy-mode" content="original">');
    expect(origHtml).toContain('<title>Original Title</title>');
    expect(origHtml).not.toContain('<script');

    // Modo experimental: injeta meta experimental e atualiza SEO
    const expResp = await applyEdgeCopyModeToHtml(
      new Response(sampleHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
      '/sobre',
      'nua_autoral_experimental'
    );
    const expHtml = await expResp.text();
    expect(expHtml).toContain('<meta name="nua-copy-mode" content="nua_autoral_experimental">');
    expect(expHtml).toContain(NUA_AUTORAL_EXPERIMENTAL_COPY.seo['/sobre'].title);
    expect(expHtml).toContain(NUA_AUTORAL_EXPERIMENTAL_COPY.seo['/sobre'].description);
    expect(expHtml).not.toContain('<script');
  });
});
