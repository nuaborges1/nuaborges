/**
 * Cloudflare Pages Function: GET /api/media/list
 *
 * Lista completa e unificada de mídias para a Central phdev (Admin Geral):
 * 1. Mídias e fotos reais publicadas no Supabase (site_content)
 * 2. Mídias salvas no Cofre/Biblioteca da Nua Borges (library, gallery, albums, hero, avulsos)
 * 3. Uploads de arquivos e vídeos no Backblaze B2 / Storage
 */

import { getSupabaseClient, isSupabaseConfigured } from '../_supabaseClient';
import { isMediaStorageConfigured, listMediaObjects, MediaEnv } from '../_mediaStore';

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

const STATIC_SITE_MEDIA = [
  {
    key: 'images/nua/hero/hero-1.jpg',
    name: 'Hero 01 — Nua Borges',
    section: 'Hero (Capa)',
    url: '/images/nua/hero/hero-1.jpg',
    origin: 'site_preset',
    isVideo: false,
    contentType: 'image/jpeg',
    sizeBytes: 131308,
    uploadedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    key: 'images/nua/hero/hero-2.jpg',
    name: 'Hero 02 — Nua Borges',
    section: 'Hero (Capa)',
    url: '/images/nua/hero/hero-2.jpg',
    origin: 'site_preset',
    isVideo: false,
    contentType: 'image/jpeg',
    sizeBytes: 148230,
    uploadedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    key: 'images/nua/gallery/gallery-1.png',
    name: 'Galeria 01 — Luz & Silhueta',
    section: 'Galeria Oficial',
    url: '/images/nua/gallery/gallery-1.png',
    origin: 'site_preset',
    isVideo: false,
    contentType: 'image/png',
    sizeBytes: 656501,
    uploadedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    key: 'images/nua/gallery/gallery-2.png',
    name: 'Galeria 02 — Sombras Íntimas',
    section: 'Galeria Oficial',
    url: '/images/nua/gallery/gallery-2.png',
    origin: 'site_preset',
    isVideo: false,
    contentType: 'image/png',
    sizeBytes: 459426,
    uploadedAt: '2026-09-01T00:00:00.000Z',
  },
];

function normalizeMediaKey(key: string): string {
  return (key || '').replace(/^https?:\/\/[^\/]+\//, '').replace(/^\/+/, '');
}

function processContentMedia(content: any, baseUrl: string, mediaMap: Map<string, any>) {
  if (!content || typeof content !== 'object') return;

  const addItem = (imageUrl: string, title: string, section: string, itemData: any = {}) => {
    if (!imageUrl) return;
    const normKey = normalizeMediaKey(imageUrl);
    const fullUrl = imageUrl.startsWith('http') || imageUrl.startsWith('data:')
      ? imageUrl
      : `${baseUrl}/${normKey}`;

    const isVideo =
      itemData.type === 'video' ||
      imageUrl.endsWith('.mp4') ||
      imageUrl.endsWith('.webm') ||
      imageUrl.includes('video');

    const existing = mediaMap.get(normKey);
    if (existing) {
      if (section && !existing.section?.includes(section)) {
        existing.section = `${existing.section} • ${section}`;
      }
      if (
        title &&
        (!existing.name ||
          existing.name.startsWith('Mídia no Cofre') ||
          existing.name.startsWith('Cofre #') ||
          existing.name.startsWith('Upload'))
      ) {
        existing.name = title;
      }
      return;
    }

    mediaMap.set(normKey, {
      key: normKey,
      name: title || normKey.split('/').pop() || 'Mídia',
      section: section || 'Acervo Oficial',
      url: fullUrl,
      origin: 'supabase_published',
      isVideo,
      contentType: isVideo ? 'video/mp4' : 'image/webp',
      uploadedAt: itemData.uploadedAt || new Date().toISOString(),
      ...itemData,
    });
  };

  // 1. Fotos da Galeria / Bastidores & Registros
  if (Array.isArray(content?.gallery?.photos)) {
    content.gallery.photos.forEach((p: any, idx: number) => {
      addItem(p?.imageUrl, p?.title || `Ensaio #${idx + 1}`, 'Galeria / Ensaios', p);
    });
  }

  // 2. Álbuns & Coleções
  if (Array.isArray(content?.albums)) {
    content.albums.forEach((album: any) => {
      if (Array.isArray(album?.photos)) {
        album.photos.forEach((p: any, idx: number) => {
          addItem(p?.imageUrl, p?.title || `${album.title || 'Álbum'} #${idx + 1}`, `Álbum: ${album.title || 'Coleção'}`, p);
        });
      }
    });
  }

  // 3. Fotos da Hero (Capa)
  if (Array.isArray(content?.hero?.photos)) {
    content.hero.photos.forEach((p: any, idx: number) => {
      addItem(p?.imageUrl, p?.title || `Hero #${idx + 1}`, 'Hero (Capa)', p);
    });
  }

  // 4. Packs & Conteúdos Avulsos
  if (Array.isArray(content?.avulsos?.items)) {
    content.avulsos.items.forEach((item: any) => {
      addItem(item?.imageUrl, item?.title || 'Pack Avulso', 'Packs Avulsos', item);
      if (Array.isArray(item?.previewImages)) {
        item.previewImages.forEach((imgUrl: string) => {
          addItem(imgUrl, `Prévia: ${item?.title || 'Pack'}`, 'Packs Avulsos (Prévias)');
        });
      }
      if (Array.isArray(item?.exclusivePhotos)) {
        item.exclusivePhotos.forEach((imgUrl: string) => {
          addItem(imgUrl, `Exclusivo: ${item?.title || 'Pack'}`, 'Packs Avulsos (Exclusivas)');
        });
      }
    });
  }

  // 5. Cofre de Mídias (Library Central)
  if (Array.isArray(content?.library)) {
    content.library.forEach((item: any, idx: number) => {
      addItem(item?.imageUrl, item?.name || item?.title || `Cofre #${idx + 1}`, 'Cofre de Mídias (B2)', item);
    });
  }

  // 6. Sobre Mim / Foto da Bio
  if (content?.about?.photoUrl) {
    addItem(content.about.photoUrl, 'Foto Bio / Manifesto', 'Sobre Mim (Bio)');
  }
}

export const onRequestGet = async (context: PagesContext<MediaEnv>) => {
  const { request, env } = context;
  const url = new URL(request.url);

  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 500) : 500;
  const baseUrl = url.origin;
  const cdnBase = (env.NEXT_PUBLIC_MEDIA_CDN_URL || baseUrl).replace(/\/$/, '');

  const mediaMap = new Map<string, any>();

  // 1. Carrega o Conteúdo Publicado Oficial do Supabase
  if (isSupabaseConfigured(env)) {
    try {
      const supabase = getSupabaseClient(env);
      if (supabase) {
        const { data: privData } = await supabase
          .from('site_content')
          .select('content')
          .eq('key', 'private_admin_content')
          .maybeSingle();

        const { data: pubData } = await supabase
          .from('site_content')
          .select('content')
          .eq('key', 'published_content')
          .maybeSingle();

        if (privData?.content) processContentMedia(privData.content, cdnBase, mediaMap);
        if (pubData?.content) processContentMedia(pubData.content, cdnBase, mediaMap);
      }
    } catch (err) {
      console.warn('[MediaList] Erro ao ler Supabase:', err);
    }
  }

  // 2. Lista o storage real: Backblaze B2.
  if (isMediaStorageConfigured(env)) {
    try {
      const listed = await listMediaObjects(env, { limit: Math.max(limit, 500) });
      for (const obj of listed) {
        if (obj.key.startsWith('audit/') || obj.key.startsWith('content/')) {
          continue;
        }

        const isVideo =
          obj.key.endsWith('.mp4') ||
          obj.key.endsWith('.webm') ||
          obj.contentType?.startsWith('video/');

        const normKey = normalizeMediaKey(obj.key);
        const publicUrl = `${cdnBase}/${normKey}`;

        if (!mediaMap.has(normKey)) {
          mediaMap.set(normKey, {
            key: normKey,
            name: normKey.replace(/^media\//, ''),
            section: 'Upload Backblaze B2 / Storage',
            sizeBytes: obj.size,
            uploadedAt: obj.uploadedAt || new Date().toISOString(),
            contentType: obj.contentType || (isVideo ? 'video/mp4' : 'image/webp'),
            url: publicUrl,
            origin: 'storage_upload',
            isVideo,
          });
        }
      }
    } catch (err) {
      const error = err as { name?: string; message?: string };
      console.error('[MediaList] Erro ao listar armazenamento de mídia:', {
        name: error?.name || 'UnknownError',
        message: error?.message || 'Erro sem mensagem',
      });
    }
  }

  // 3. Se nenhuma mídia do Supabase/Storage for encontrada, usa mídias estáticas de fábrica
  if (mediaMap.size === 0) {
    for (const staticItem of STATIC_SITE_MEDIA) {
      const normKey = normalizeMediaKey(staticItem.key);
      mediaMap.set(normKey, staticItem);
    }
  }

  const allObjects = Array.from(mediaMap.values());

  // Ordenação inteligente: Fotos de Ensaios/Galeria e Cofre Recentes primeiro
  allObjects.sort((a, b) => {
    return new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime();
  });

  const sliced = allObjects.slice(0, limit);

  return new Response(
    JSON.stringify({
      success: true,
      objects: sliced,
      items: sliced,
      totalCount: allObjects.length,
      storageUploadsCount: allObjects.filter((m) => m.origin === 'storage_upload' || m.origin === 'b2_library').length,
      publishedCount: allObjects.filter((m) => m.origin === 'supabase_published').length,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
};

export const onRequestOptions = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });

export const onRequest = onRequestGet;
