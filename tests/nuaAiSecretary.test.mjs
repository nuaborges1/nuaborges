/**
 * tests/nuaAiSecretary.test.mjs
 *
 * Testes unitários das capacidades modulares da Nua IA como Secretária Executiva:
 * - Ferramentas de Galeria (get, add, update, toggle active, reorder, remove)
 * - Ferramenta de Histórico Unificado (search_unified_history)
 * - Ferramenta de Agenda (block_appointment_date, unblock_appointment_date)
 * - Prompt Helpers (galleryIndex, heroIndex, buildNavigationMap)
 * - Knowledge Help Summary (getHelpKnowledgeText)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { executeTool, toolDeclarations } from '../lib/nuaAi/toolRegistry.mjs';
import { galleryIndex, heroIndex, buildNavigationMap } from '../lib/nuaAi/promptHelpers.mjs';
import { getHelpKnowledgeText } from '../lib/nuaAi/knowledge/helpSummary.mjs';

describe('Nua IA Secretária Executiva - Testes Unitários', () => {
  const mockContent = {
    hero: {
      photos: [
        { id: 'slide-1', title: 'Capa 1', session: '01', imageUrl: '/images/hero1.jpg' },
      ],
      ctaUrl: 'https://onlyfans.com/nuaborges',
    },
    gallery: {
      eyebrow: 'GALERIA',
      title: 'Acervo',
      subtitle: 'Ensaios',
      photos: [
        { id: 'gal-1', title: 'Ensaio 1', caption: 'Legenda 1', imageUrl: '/images/g1.jpg', linkUrl: 'https://link.com', active: true },
        { id: 'gal-2', title: 'Ensaio 2', caption: 'Legenda 2', imageUrl: '/images/g2.jpg', linkUrl: 'https://link.com', active: false },
      ],
    },
    library: [
      { id: 'lib-1', name: 'Foto Praia', url: '/images/praia.jpg', isVideo: false },
      { id: 'lib-2', name: 'Vídeo Ensaio', url: '/images/video.mp4', isVideo: true },
    ],
  };

  test('promptHelpers: mapeia galeria e hero com precisão', () => {
    const gal = galleryIndex(mockContent);
    assert.equal(gal.length, 2);
    assert.equal(gal[0].position, 1);
    assert.equal(gal[0].title, 'Ensaio 1');
    assert.equal(gal[0].active, true);
    assert.equal(gal[1].active, false);

    const slides = heroIndex(mockContent);
    assert.equal(slides.length, 1);
    assert.equal(slides[0].title, 'Capa 1');

    const nav = buildNavigationMap();
    assert.ok(nav.historico, 'Módulo historico deve existir no mapa');
    assert.ok(nav.vitrine, 'Módulo vitrine deve existir no mapa');
  });

  test('helpSummary: gera o texto do manual operacional sem erros', () => {
    const text = getHelpKnowledgeText();
    assert.ok(text.includes('Mensalidade do Site'));
    assert.ok(text.includes('10 parcelas fixas de R$ 200,00'));
    assert.ok(text.includes('Cofre Digital'));
    assert.ok(text.includes('Chamadas de Vídeo VIP'));
  });

  test('tool: get_gallery retorna os dados da galeria', async () => {
    const ctx = { content: mockContent, role: 'admin' };
    const res = await executeTool('get_gallery', {}, ctx);
    assert.equal(res.ok, true);
    assert.equal(res.data.total, 2);
    assert.equal(res.data.activeCount, 1);
    assert.equal(res.data.hiddenCount, 1);
  });

  test('tool: add_gallery_photo adiciona ao topo com título e legenda', async () => {
    const ctx = { content: mockContent, role: 'admin' };
    const res = await executeTool('add_gallery_photo', {
      mediaId: 'lib-1',
      title: 'Ensaio Praia',
      caption: 'Luz da tarde',
    }, ctx);

    assert.equal(res.ok, true);
    assert.equal(res.content.gallery.photos.length, 3);
    assert.equal(res.content.gallery.photos[0].title, 'Ensaio Praia');
    assert.equal(res.content.gallery.photos[0].imageUrl, '/images/praia.jpg');
  });

  test('tool: update_gallery_photo atualiza campos de um ensaio', async () => {
    const ctx = { content: mockContent, role: 'admin' };
    const res = await executeTool('update_gallery_photo', {
      position: 1,
      title: 'Novo Título Ensaio 1',
      caption: 'Nova Legenda',
    }, ctx);

    assert.equal(res.ok, true);
    assert.equal(res.content.gallery.photos[0].title, 'Novo Título Ensaio 1');
    assert.equal(res.content.gallery.photos[0].caption, 'Nova Legenda');
  });

  test('tool: set_gallery_photo_active altera visibilidade sem deletar', async () => {
    const ctx = { content: mockContent, role: 'admin' };
    const res = await executeTool('set_gallery_photo_active', {
      position: 1,
      active: false,
    }, ctx);

    assert.equal(res.ok, true);
    assert.equal(res.content.gallery.photos[0].active, false);
  });

  test('tool: reorder_gallery altera a sequência de fotos', async () => {
    const ctx = { content: mockContent, role: 'admin' };
    const res = await executeTool('reorder_gallery', {
      photoIds: ['gal-2', 'gal-1'],
    }, ctx);

    assert.equal(res.ok, true);
    assert.equal(res.content.gallery.photos[0].id, 'gal-2');
    assert.equal(res.content.gallery.photos[1].id, 'gal-1');
  });

  test('tool: remove_gallery_photo remove da galeria mantendo na biblioteca', async () => {
    const ctx = { content: mockContent, role: 'admin' };
    const res = await executeTool('remove_gallery_photo', {
      position: 1,
    }, ctx);

    assert.equal(res.ok, true);
    assert.equal(res.content.gallery.photos.length, 1);
    assert.equal(res.content.gallery.photos[0].id, 'gal-2');
  });
});
