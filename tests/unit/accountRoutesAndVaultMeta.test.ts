import { describe, it, expect } from 'vitest';
import {
  buildAccountPath,
  buildLibrarySlugLookup,
  buildPersonalizadoSlugLookup,
  parseAccountLocation,
  slugifyAccountItem,
} from '../../lib/accountRoutes';
import { packVaultFiles, vaultFiles } from '../../lib/media/vaultPath';

describe('Rotas limpas e slugs da Minha Conta', () => {
  it('normaliza títulos com acentos e espaços para slugs limpos', () => {
    expect(slugifyAccountItem('Teste Conteúdo')).toBe('teste-conteudo');
    expect(slugifyAccountItem('Ensaio Âmbar · Edição Especial!')).toBe('ensaio-ambar-edicao-especial');
    expect(slugifyAccountItem('')).toBe('conteudo');
  });

  it('gera slugs únicos e desambigua colisões de forma determinística', () => {
    const lookup = buildLibrarySlugLookup([
      { orderRef: 'ord_aaa_1111', slug: 'teste-conteudo', title: 'Teste Conteúdo' },
      { orderRef: 'ord_bbb_2222', slug: 'teste-conteudo', title: 'Teste Conteúdo' },
      { orderRef: 'ord_ccc_3333', title: 'Noite de Vinho' },
    ]);

    expect(lookup.orderToSlug.get('ord_ccc_3333')).toBe('noite-de-vinho');
    expect(lookup.slugToOrder.get('noite-de-vinho')).toBe('ord_ccc_3333');

    const s1 = lookup.orderToSlug.get('ord_aaa_1111');
    const s2 = lookup.orderToSlug.get('ord_bbb_2222');
    expect(s1).toBe('teste-conteudo-1111');
    expect(s2).toBe('teste-conteudo-2222');
    expect(lookup.slugToOrder.get(s1!)).toBe('ord_aaa_1111');
    expect(lookup.slugToOrder.get(s2!)).toBe('ord_bbb_2222');
  });

  it('gera slugs curtos e estáveis para personalizados', () => {
    const lookup = buildPersonalizadoSlugLookup([{ id: 'ped_mwwslhgq_4d2577baf6e65b65' }]);
    const slug = lookup.orderToSlug.get('ped_mwwslhgq_4d2577baf6e65b65');
    expect(slug).toBe('pedido-e65b65');
    expect(lookup.slugToOrder.get('pedido-e65b65')).toBe('ped_mwwslhgq_4d2577baf6e65b65');
  });

  it('interpreta rotas limpas e preserva retrocompatibilidade total com URLs legadas', () => {
    expect(parseAccountLocation('/conta/biblioteca/teste-conteudo', '', '')).toMatchObject({
      tab: 'biblioteca',
      itemKey: 'teste-conteudo',
      explicit: true,
      isLegacyQuery: false,
    });

    expect(parseAccountLocation('/conta/pedidos', '', '')).toMatchObject({
      tab: 'conta',
      itemKey: null,
      explicit: true,
      isLegacyQuery: false,
    });

    expect(
      parseAccountLocation('/conta', '?tab=biblioteca&item=ord_mwwslhgq_4d2577baf6e65b65', '')
    ).toMatchObject({
      tab: 'biblioteca',
      itemKey: 'ord_mwwslhgq_4d2577baf6e65b65',
      explicit: true,
      isLegacyQuery: true,
    });

    expect(parseAccountLocation('/conta', '', '#order=ord_123&confirm=tok_abc')).toMatchObject({
      tab: 'biblioteca',
      itemKey: 'ord_123',
      confirmToken: 'tok_abc',
      isLegacyQuery: true,
    });
  });

  it('monta caminhos limpos para todas as abas', () => {
    expect(buildAccountPath('biblioteca')).toBe('/conta/biblioteca');
    expect(buildAccountPath('biblioteca', 'teste-conteudo')).toBe('/conta/biblioteca/teste-conteudo');
    expect(buildAccountPath('personalizados', 'pedido-e65b65')).toBe('/conta/personalizados/pedido-e65b65');
    expect(buildAccountPath('chamadas')).toBe('/conta/chamadas');
    expect(buildAccountPath('conta')).toBe('/conta/pedidos');
    expect(buildAccountPath('perfil')).toBe('/conta/perfil');
  });
});

describe('Metadados seguros do Cofre (vaultPath)', () => {
  it('preserva duração e poster seguro sem vazar caminhos privados como URLs públicas', () => {
    const files = packVaultFiles({
      exclusivePhotos: [
        '/media/private/pack1/IMG_001.webp',
        {
          url: '/media/private/pack1/foto-2.webp',
          label: 'Retrato em contraluz',
          variants: { mobile: { key: '/media/private/pack1/foto-2-mobile.webp' } },
        },
      ],
      videos: [
        {
          url: '/media/private/pack1/cena-1.mp4',
          title: 'Bastidores em estúdio',
          duration: '04:32',
          posterUrl: '/media/private/pack1/cena-1-poster.webp',
        },
        {
          url: '/media/private/pack1/cena-2.mp4',
          posterUrl: 'https://evil.example.com/phish.jpg',
        },
      ],
    });

    expect(files).toHaveLength(4);

    // Foto genérica sem título customizado
    expect(files[0].hasCustomLabel).toBe(false);
    expect(files[0].label).toBe('Foto 1');

    // Foto com título autoral e variante privada otimizada
    expect(files[1].hasCustomLabel).toBe(true);
    expect(files[1].label).toBe('Retrato em contraluz');
    expect(files[1].previewPath).toBe('private/pack1/foto-2-mobile.webp');

    // Vídeo com poster privado fica restrito a posterPath (servido via ?cofre=1)
    expect(files[2].video).toBe(true);
    expect(files[2].duration).toBe('04:32');
    expect(files[2].posterPath).toBe('private/pack1/cena-1-poster.webp');
    expect(files[2].posterUrl).toBeUndefined();

    // Poster externo não confiável é descartado
    expect(files[3].posterPath).toBeUndefined();
    expect(files[3].posterUrl).toBeUndefined();
  });

  it('mantém bloqueio contra path traversal em vaultFiles', () => {
    const files = vaultFiles([
      { raw: '/media/private/../../secret.txt', video: false },
      { raw: '/media/public/nao-privado.jpg', video: false },
    ]);
    expect(files).toHaveLength(0);
  });
});
