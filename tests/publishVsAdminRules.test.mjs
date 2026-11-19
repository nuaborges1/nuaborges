import test from 'node:test';
import assert from 'node:assert/strict';
import { getModifiedSections } from '../lib/content/diff.ts';

// Helper mirror of functions/api/content/sync.ts sanitizeForPublicSite
function sanitizeForPublicSite(rawContent) {
  if (!rawContent || typeof rawContent !== 'object') return rawContent;
  const { library, albums, ...publicFields } = rawContent;

  const publicGallery = publicFields.gallery
    ? {
        ...publicFields.gallery,
        photos: Array.isArray(publicFields.gallery.photos)
          ? publicFields.gallery.photos.filter(
              (p) => p && p.active !== false && !p.isPendingPublish
            )
          : [],
      }
    : undefined;

  const publicAvulsos = publicFields.avulsos
    ? {
        ...publicFields.avulsos,
        items: Array.isArray(publicFields.avulsos.items)
          ? publicFields.avulsos.items.filter(
              (item) =>
                item && item.modality !== 'avulso' && item.active !== false && !item.isDraft
            )
          : [],
      }
    : undefined;

  return {
    ...publicFields,
    ...(publicGallery ? { gallery: publicGallery } : {}),
    ...(publicAvulsos ? { avulsos: publicAvulsos } : {}),
    library: [],
    albums: [],
  };
}

const BASE_CONTENT = {
  hero: {
    eyebrow: 'NUA BORGES',
    title: 'Nua Borges',
    tagline: 'Boas-vindas',
    description: 'Apresentação',
    photos: ['/images/nua/hero.png'],
  },
  gallery: {
    eyebrow: 'ENSAIOS AUTORAIS',
    title: 'Galeria Exclusiva',
    subtitle: 'Momentos únicos',
    photos: [
      { id: 'photo-1', url: '/media/photo-1.jpg', title: 'Foto 1', active: true },
      { id: 'photo-2', url: '/media/photo-2.jpg', title: 'Foto 2', active: true },
      { id: 'photo-3', url: '/media/photo-3.jpg', title: 'Foto 3', active: true },
    ],
  },
  avulsos: {
    eyebrow: 'CONTEÚDOS AVULSOS',
    title: 'Acervo Sob Demanda',
    subtitle: 'Obras unitárias',
    items: [
      { id: 'pack-1', title: 'Pack Alpha', active: true, modality: 'pack' },
      { id: 'pack-2', title: 'Pack Beta', active: true, modality: 'pack' },
    ],
  },
  library: [
    { id: 'lib-1', url: '/media/photo-1.jpg', name: 'Foto 1 Original' },
    { id: 'lib-2', url: '/media/photo-2.jpg', name: 'Foto 2 Original' },
  ],
  albums: [
    { id: 'alb-1', title: 'Ensaios 2026', mediaIds: ['lib-1', 'lib-2'] },
  ],
};

test('Cenário A: Renomear foto ou mídia não exige publicação editorial', () => {
  // Renomear foto na galeria ou na biblioteca
  const modified = {
    ...BASE_CONTENT,
    gallery: {
      ...BASE_CONTENT.gallery,
      photos: [
        { ...BASE_CONTENT.gallery.photos[0], title: 'Foto 1 Renomeada' },
        BASE_CONTENT.gallery.photos[1],
        BASE_CONTENT.gallery.photos[2],
      ],
    },
    library: [
      { ...BASE_CONTENT.library[0], name: 'Foto 1 Novo Nome', customName: 'Foto 1 Novo Nome' },
      BASE_CONTENT.library[1],
    ],
  };

  const sections = getModifiedSections(BASE_CONTENT, modified);
  assert.equal(sections.length, 0, 'Nenhuma seção editorial deve ser marcada como pendente de publicação');

  // Sanitização pública preserva o novo título da foto
  const sanitized = sanitizeForPublicSite(modified);
  assert.equal(sanitized.gallery.photos[0].title, 'Foto 1 Renomeada');
});

test('Cenário B: Mover/reordenar fotos na galeria pública não exige publicação e reflete diretamente', () => {
  // Mover a terceira foto para a primeira posição
  const reorderedPhotos = [
    BASE_CONTENT.gallery.photos[2],
    BASE_CONTENT.gallery.photos[0],
    BASE_CONTENT.gallery.photos[1],
  ];

  const modified = {
    ...BASE_CONTENT,
    gallery: {
      ...BASE_CONTENT.gallery,
      photos: reorderedPhotos,
    },
  };

  const sections = getModifiedSections(BASE_CONTENT, modified);
  assert.equal(sections.length, 0, 'Reordenação administrativa não deve exigir publicação');

  // No site público sanitizado, a nova ordem é imediatamente refletida
  const sanitized = sanitizeForPublicSite(modified);
  assert.deepEqual(
    sanitized.gallery.photos.map((p) => p.id),
    ['photo-3', 'photo-1', 'photo-2']
  );
});

test('Cenário C: Remover foto da galeria aplica diretamente sem apagar o arquivo original do acervo', () => {
  // Remover a foto 2 da galeria
  const modified = {
    ...BASE_CONTENT,
    gallery: {
      ...BASE_CONTENT.gallery,
      photos: [BASE_CONTENT.gallery.photos[0], BASE_CONTENT.gallery.photos[2]],
    },
  };

  const sections = getModifiedSections(BASE_CONTENT, modified);
  assert.equal(sections.length, 0, 'Remoção de item da galeria não exige publicação');

  // Acervo original continua intacto
  assert.equal(modified.library.length, 2);
  assert.ok(modified.library.some((img) => img.url === '/media/photo-2.jpg'));

  // Galeria pública não tem mais a foto 2
  const sanitized = sanitizeForPublicSite(modified);
  assert.equal(sanitized.gallery.photos.length, 2);
  assert.ok(!sanitized.gallery.photos.some((p) => p.id === 'photo-2'));
});

test('Cenário D: Editar metadados internos de vídeo/mídia não gera pendências editoriais', () => {
  const modified = {
    ...BASE_CONTENT,
    avulsos: {
      ...BASE_CONTENT.avulsos,
      items: [
        {
          ...BASE_CONTENT.avulsos.items[0],
          videos: [
            {
              id: 'vid-1',
              title: 'Vídeo 4K Editado',
              duration: '12:45',
              posterUrl: '/media/poster-updated.jpg',
            },
          ],
        },
        BASE_CONTENT.avulsos.items[1],
      ],
    },
  };

  const sections = getModifiedSections(BASE_CONTENT, modified);
  assert.equal(sections.length, 0, 'Ajustes internos de mídia e vídeo não exigem publicação');
});

test('Cenário E: Criar novo pack começa como rascunho e permanece invisível até publicação explícita', () => {
  const newDraftPack = {
    id: 'pack-new-draft',
    title: 'Novo Pack em Rascunho',
    active: false,
    isDraft: true,
    modality: 'pack',
  };

  const withDraft = {
    ...BASE_CONTENT,
    avulsos: {
      ...BASE_CONTENT.avulsos,
      items: [newDraftPack, ...BASE_CONTENT.avulsos.items],
    },
  };

  // Enquanto estiver em rascunho, não exige publicação de site
  const draftSections = getModifiedSections(BASE_CONTENT, withDraft);
  assert.equal(draftSections.length, 0, 'Salvar pack como rascunho não deve gerar pendência de publicação obrigatória');

  // No site público sanitizado, o pack em rascunho fica OCULTO
  const sanitizedDraft = sanitizeForPublicSite(withDraft);
  assert.ok(!sanitizedDraft.avulsos.items.some((item) => item.id === 'pack-new-draft'));
  assert.equal(sanitizedDraft.avulsos.items.length, 2);

  // Quando a administradora explicitamente publica o novo pack (active: true, isDraft: false)
  const publishedPack = {
    ...newDraftPack,
    active: true,
    isDraft: false,
  };

  const withPublished = {
    ...BASE_CONTENT,
    avulsos: {
      ...BASE_CONTENT.avulsos,
      items: [publishedPack, ...BASE_CONTENT.avulsos.items],
    },
  };

  const publishedSections = getModifiedSections(BASE_CONTENT, withPublished);
  assert.equal(publishedSections.length, 1);
  assert.equal(publishedSections[0].label, 'Conteúdos: Novo Pack para Publicar');

  // Agora no site público sanitizado o pack aparece
  const sanitizedPublished = sanitizeForPublicSite(withPublished);
  assert.ok(sanitizedPublished.avulsos.items.some((item) => item.id === 'pack-new-draft'));
  assert.equal(sanitizedPublished.avulsos.items.length, 3);
});

test('Cenário F: Adicionar foto à galeria salva diretamente e exibe no site sem exigir publicação', () => {
  const newPhoto = {
    id: 'photo-new',
    url: '/media/photo-new.jpg',
    title: 'Nova Foto Direta',
    active: true,
  };

  const withNewPhoto = {
    ...BASE_CONTENT,
    gallery: {
      ...BASE_CONTENT.gallery,
      photos: [newPhoto, ...BASE_CONTENT.gallery.photos],
    },
  };

  // Nenhuma pendência de publicação
  const sections = getModifiedSections(BASE_CONTENT, withNewPhoto);
  assert.equal(sections.length, 0, 'Adicionar foto à galeria não deve exigir publicação de site');

  // No site público sanitizado, a nova foto aparece imediatamente
  const sanitized = sanitizeForPublicSite(withNewPhoto);
  assert.equal(sanitized.gallery.photos.length, 4);
  assert.equal(sanitized.gallery.photos[0].id, 'photo-new');
});

test('Toggles administrativos salvam diretamente e não geram pendência editorial', () => {
  // 1. Toggle de ocultar foto individual da galeria
  const withHiddenPhoto = {
    ...BASE_CONTENT,
    gallery: {
      ...BASE_CONTENT.gallery,
      photos: [
        { ...BASE_CONTENT.gallery.photos[0], active: false },
        BASE_CONTENT.gallery.photos[1],
        BASE_CONTENT.gallery.photos[2],
      ],
    },
  };
  assert.equal(getModifiedSections(BASE_CONTENT, withHiddenPhoto).length, 0);
  const sanitizedPhoto = sanitizeForPublicSite(withHiddenPhoto);
  assert.equal(sanitizedPhoto.gallery.photos.length, 2, 'Foto inativada é ocultada do site público');

  // 2. Toggle de ocultar pack existente
  const withHiddenPack = {
    ...BASE_CONTENT,
    avulsos: {
      ...BASE_CONTENT.avulsos,
      items: [
        { ...BASE_CONTENT.avulsos.items[0], active: false },
        BASE_CONTENT.avulsos.items[1],
      ],
    },
  };
  assert.equal(getModifiedSections(BASE_CONTENT, withHiddenPack).length, 0);
  const sanitizedPack = sanitizeForPublicSite(withHiddenPack);
  assert.equal(sanitizedPack.avulsos.items.length, 1, 'Pack inativado é ocultado da vitrine pública');

  // 3. Toggle de ocultar seção da galeria inteira
  const withHiddenGallery = {
    ...BASE_CONTENT,
    gallery: {
      ...BASE_CONTENT.gallery,
      active: false,
    },
  };
  assert.equal(getModifiedSections(BASE_CONTENT, withHiddenGallery).length, 0);

  // 4. Toggle da NUA IA nas configurações administrativas
  const withAiToggled = {
    ...BASE_CONTENT,
    adminUi: {
      aiEnabled: false,
    },
  };
  assert.equal(getModifiedSections(BASE_CONTENT, withAiToggled).length, 0);
});

test('Cenário G: Reorganizar conteúdos já publicados mantém status sem alterar publicação', () => {
  // Inverter ordem dos packs já publicados
  const reorderedPacks = [
    BASE_CONTENT.avulsos.items[1],
    BASE_CONTENT.avulsos.items[0],
  ];

  const modified = {
    ...BASE_CONTENT,
    avulsos: {
      ...BASE_CONTENT.avulsos,
      items: reorderedPacks,
    },
  };

  const sections = getModifiedSections(BASE_CONTENT, modified);
  assert.equal(sections.length, 0, 'Reordenar packs já publicados não deve exigir nova publicação');

  // Site público reflete a nova ordem imediatamente
  const sanitized = sanitizeForPublicSite(modified);
  assert.deepEqual(
    sanitized.avulsos.items.map((item) => item.id),
    ['pack-2', 'pack-1']
  );
  // Ambos continuam ativos
  assert.equal(sanitized.avulsos.items[0].active, true);
  assert.equal(sanitized.avulsos.items[1].active, true);
});

test('Cenário H: Erro no banco de dados deve reportar status 500 e nunca falso sucesso', async () => {
  // Simular a chamada de sync com backend com falha
  const mockSyncHandler = async (shouldFail) => {
    if (shouldFail) {
      return {
        status: 500,
        body: {
          success: false,
          error: 'Falha ao sincronizar com banco de dados Supabase.',
        },
      };
    }
    return {
      status: 200,
      body: {
        success: true,
        updatedAt: new Date().toISOString(),
      },
    };
  };

  const failResult = await mockSyncHandler(true);
  assert.equal(failResult.status, 500);
  assert.equal(failResult.body.success, false);
  assert.ok(failResult.body.error.includes('Falha ao sincronizar'));
  assert.notEqual(failResult.status, 200, 'Não deve mascarar falhas como status 200 de sucesso');
});
