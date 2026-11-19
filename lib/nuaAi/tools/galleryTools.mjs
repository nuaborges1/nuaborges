/**
 * lib/nuaAi/tools/galleryTools.mjs
 *
 * Ferramentas modulares da Nua IA para manipulação e curadoria
 * da Galeria Pública de Ensaios (`content.gallery`).
 */

export function registerGalleryTools(define, { S, N, B, A, resolveOne, clone }) {
  // 1. Inspecionar galeria completa
  define('get_gallery', {
    description: 'Retorna a lista completa de ensaios fotográficos da galeria pública, incluindo posição, títulos, legendas, status ativo/oculto e URLs.',
    parameters: {
      onlyActive: B('Se true, lista apenas fotos visíveis no site público.'),
    },
    run: async (args, ctx) => {
      const photos = Array.isArray(ctx.content.gallery?.photos) ? ctx.content.gallery.photos : [];
      const filtered = args.onlyActive ? photos.filter((p) => p.active !== false) : photos;
      const items = filtered.map((p, idx) => ({
        position: idx + 1,
        id: p.id,
        title: p.title || 'Sem título',
        caption: p.caption || '',
        imageUrl: p.imageUrl,
        linkUrl: p.linkUrl || '',
        active: p.active !== false,
      }));

      return {
        summary: `Galeria pública contém ${photos.length} foto(s) (${photos.filter((p) => p.active !== false).length} ativa(s)).`,
        data: {
          total: photos.length,
          activeCount: photos.filter((p) => p.active !== false).length,
          hiddenCount: photos.filter((p) => p.active === false).length,
          header: {
            eyebrow: ctx.content.gallery?.eyebrow || '',
            title: ctx.content.gallery?.title || '',
            subtitle: ctx.content.gallery?.subtitle || '',
          },
          photos: items,
        },
      };
    },
  });

  // 2. Adicionar nova foto à galeria
  define('add_gallery_photo', {
    description: 'Adiciona uma foto da biblioteca ao topo da galeria pública com título, legenda e link.',
    parameters: {
      mediaId: S('ID da mídia na biblioteca.'),
      url: S('URL exata da mídia na biblioteca.'),
      title: S('Título artístico do ensaio (ex: "Luz & Silhueta").'),
      caption: S('Legenda descritiva do ensaio.'),
      linkUrl: S('Link de destino (OnlyFans, WhatsApp, etc.). Padrão: canal oficial.'),
      position: S('Onde posicionar: "start" (topo da galeria, padrão) ou "end" (final da galeria).'),
    },
    required: [],
    run: async (args, ctx) => {
      const next = clone(ctx.content);
      const mediaRef = args.mediaId || args.url || '';
      if (!mediaRef) throw new Error('Indique a mídia por mediaId ou url para adicionar à galeria.');

      const resolved = resolveOne(next, mediaRef);
      if (resolved.status !== 'ok') {
        throw new Error('Foto não localizada na biblioteca de mídias. Use list_media para conferir os arquivos.');
      }
      if (resolved.item.isVideo) {
        throw new Error('A galeria pública aceita apenas fotos fotográficas autorais. Para vídeos, use a capa ou um pack.');
      }

      next.gallery = next.gallery || { eyebrow: '', title: '', subtitle: '', photos: [] };
      const current = Array.isArray(next.gallery.photos) ? next.gallery.photos : [];

      if (current.some((p) => p.imageUrl === resolved.item.url)) {
        throw new Error('Essa foto já está presente na galeria pública.');
      }

      const defaultLink = next.hero?.ctaUrl || 'https://onlyfans.com/nuaborges';
      const newPhoto = {
        id: `gal-${Date.now()}`,
        title: (args.title || resolved.item.name || 'Novo Ensaio').trim(),
        caption: (args.caption || '').trim(),
        imageUrl: resolved.item.url,
        linkUrl: (args.linkUrl || defaultLink).trim(),
        active: true,
      };

      if (args.position === 'end') {
        next.gallery.photos = [...current, newPhoto];
      } else {
        next.gallery.photos = [newPhoto, ...current];
      }

      return {
        content: next,
        summary: `Foto "${newPhoto.title}" adicionada com sucesso à galeria pública (total: ${next.gallery.photos.length} fotos).`,
      };
    },
  });

  // 3. Atualizar foto existente na galeria
  define('update_gallery_photo', {
    description: 'Atualiza o título, legenda, link ou status de exibição de um ensaio da galeria por ID ou posição.',
    parameters: {
      photoId: S('ID do ensaio na galeria (ex: "gal-1", "gal-1712345678").'),
      position: N('Posição visual da foto na galeria (1 para a primeira, 2 para a segunda, etc.).'),
      title: S('Novo título artístico do ensaio.'),
      caption: S('Nova legenda do ensaio.'),
      linkUrl: S('Novo link de destino.'),
      active: B('true para exibir no site, false para ocultar da vitrine pública.'),
    },
    run: async (args, ctx) => {
      const next = clone(ctx.content);
      const photos = Array.isArray(next.gallery?.photos) ? next.gallery.photos : [];
      if (!photos.length) throw new Error('A galeria pública está vazia.');

      let targetIdx = -1;
      if (args.photoId) {
        targetIdx = photos.findIndex((p) => String(p.id) === String(args.photoId));
      } else if (Number.isInteger(args.position) && args.position >= 1 && args.position <= photos.length) {
        targetIdx = args.position - 1;
      }

      if (targetIdx === -1) {
        throw new Error('Ensaio não localizado na galeria. Informe o photoId exato ou a posição (1, 2, 3...).');
      }

      const currentItem = photos[targetIdx];
      const updated = {
        ...currentItem,
        title: args.title !== undefined ? String(args.title).trim() : currentItem.title,
        caption: args.caption !== undefined ? String(args.caption).trim() : currentItem.caption,
        linkUrl: args.linkUrl !== undefined ? String(args.linkUrl).trim() : currentItem.linkUrl,
        active: args.active !== undefined ? Boolean(args.active) : (currentItem.active !== false),
      };

      next.gallery.photos[targetIdx] = updated;

      return {
        content: next,
        summary: `Ensaio #${targetIdx + 1} ("${updated.title}") atualizado na galeria em rascunho.`,
      };
    },
  });

  // 4. Alternar status ativo/oculto de foto na galeria
  define('set_gallery_photo_active', {
    description: 'Ativa ou oculta uma foto na galeria pública sem deletá-la.',
    parameters: {
      photoId: S('ID do ensaio na galeria.'),
      position: N('Posição visual da foto na galeria (1, 2, 3...).'),
      active: B('true para tornar visível no site, false para ocultar.'),
    },
    required: ['active'],
    run: async (args, ctx) => {
      const next = clone(ctx.content);
      const photos = Array.isArray(next.gallery?.photos) ? next.gallery.photos : [];
      let targetIdx = -1;
      if (args.photoId) {
        targetIdx = photos.findIndex((p) => String(p.id) === String(args.photoId));
      } else if (Number.isInteger(args.position) && args.position >= 1 && args.position <= photos.length) {
        targetIdx = args.position - 1;
      }

      if (targetIdx === -1) throw new Error('Foto não localizada na galeria.');

      next.gallery.photos[targetIdx].active = Boolean(args.active);
      const statusText = args.active ? 'visível na vitrine' : 'oculta da vitrine';

      return {
        content: next,
        summary: `Foto #${targetIdx + 1} ("${next.gallery.photos[targetIdx].title}") agora está ${statusText}.`,
      };
    },
  });

  // 5. Reordenar galeria
  define('reorder_gallery', {
    description: 'Reordena as fotos da galeria com base na lista de IDs fornecida na ordem desejada.',
    parameters: {
      photoIds: A(S('IDs dos ensaios na ordem desejada'), 'Lista completa de IDs na nova sequência.'),
    },
    required: ['photoIds'],
    run: async (args, ctx) => {
      const next = clone(ctx.content);
      const photos = Array.isArray(next.gallery?.photos) ? next.gallery.photos : [];
      const ids = Array.isArray(args.photoIds) ? args.photoIds : [];

      if (!ids.length) throw new Error('Informe a lista de IDs na nova ordem.');

      const map = new Map(photos.map((p) => [String(p.id), p]));
      const reordered = [];
      for (const id of ids) {
        const found = map.get(String(id));
        if (found) {
          reordered.push(found);
          map.delete(String(id));
        }
      }
      // Anexa quaisquer fotos que não tenham sido mencionadas para não perder nada
      for (const leftover of map.values()) {
        reordered.push(leftover);
      }

      next.gallery.photos = reordered;
      return {
        content: next,
        summary: `Galeria reordenada com sucesso (${reordered.length} fotos).`,
      };
    },
  });

  // 6. Remover foto da galeria (a mídia permanece na biblioteca)
  define('remove_gallery_photo', {
    description: 'Remove uma foto específica da galeria pública por ID ou posição. O arquivo permanece salvo com total segurança na biblioteca.',
    parameters: {
      photoId: S('ID do ensaio na galeria.'),
      position: N('Posição visual da foto na galeria (1 para a primeira, 2 para a segunda, etc.).'),
    },
    run: async (args, ctx) => {
      const next = clone(ctx.content);
      const photos = Array.isArray(next.gallery?.photos) ? next.gallery.photos : [];
      let targetIdx = -1;
      if (args.photoId) {
        targetIdx = photos.findIndex((p) => String(p.id) === String(args.photoId));
      } else if (Number.isInteger(args.position) && args.position >= 1 && args.position <= photos.length) {
        targetIdx = args.position - 1;
      }

      if (targetIdx === -1) throw new Error('Foto não localizada na galeria.');

      const removed = photos[targetIdx];
      next.gallery.photos = photos.filter((_, idx) => idx !== targetIdx);

      return {
        content: next,
        summary: `Foto "${removed.title || 'Sem título'}" removida da galeria pública em rascunho. O arquivo continua salvo na sua biblioteca de mídias.`,
      };
    },
  });
}
