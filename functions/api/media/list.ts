/**
 * Cloudflare Pages Function: GET /api/media/list
 *
 * Lista completa e unificada de mídias para o Master Admin:
 * 1. Mídias ativas oficiais do site (Galeria, Hero, Sobre Mim)
 * 2. Mídias e fotos salvas na publicação oficial (content/published.json)
 * 3. Todos os uploads de arquivos e vídeos persistidos no Cloudflare R2
 */

interface Env {
  BUCKET?: any;
  NEXT_PUBLIC_MEDIA_CDN_URL?: string;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

const STATIC_SITE_MEDIA = [
  {
    key: 'images/nua/hero/hero-1.jpg',
    name: 'Hero 01 — Nua Borges',
    section: 'Hero (Capa)',
    url: 'https://nuaborges.phstatic.com.br/images/nua/hero/hero-1.jpg',
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
    url: 'https://nuaborges.phstatic.com.br/images/nua/hero/hero-2.jpg',
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
    url: 'https://nuaborges.phstatic.com.br/images/nua/gallery/gallery-1.png',
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
    url: 'https://nuaborges.phstatic.com.br/images/nua/gallery/gallery-2.png',
    origin: 'site_preset',
    isVideo: false,
    contentType: 'image/png',
    sizeBytes: 459426,
    uploadedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    key: 'images/nua/gallery/gallery-3.png',
    name: 'Galeria 03 — Pele & Textura',
    section: 'Galeria Oficial',
    url: 'https://nuaborges.phstatic.com.br/images/nua/gallery/gallery-3.png',
    origin: 'site_preset',
    isVideo: false,
    contentType: 'image/png',
    sizeBytes: 699959,
    uploadedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    key: 'images/nua/gallery/gallery-4.png',
    name: 'Galeria 04 — Presença & Olhar',
    section: 'Galeria Oficial',
    url: 'https://nuaborges.phstatic.com.br/images/nua/gallery/gallery-4.png',
    origin: 'site_preset',
    isVideo: false,
    contentType: 'image/png',
    sizeBytes: 688619,
    uploadedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    key: 'images/nua/about/about.jpg',
    name: 'Sobre Mim — Foto de Perfil',
    section: 'Sobre Mim (Bio)',
    url: 'https://nuaborges.phstatic.com.br/images/nua/about/about.jpg',
    origin: 'site_preset',
    isVideo: false,
    contentType: 'image/jpeg',
    sizeBytes: 131308,
    uploadedAt: '2026-09-01T00:00:00.000Z',
  },
];

function normalizeMediaKey(key: string): string {
  return (key || '').replace(/^https?:\/\/[^\/]+\//, '').replace(/^\/+/, '');
}

export const onRequestGet = async (context: PagesContext<Env>) => {
  const { request, env } = context;
  const url = new URL(request.url);

  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 60;
  const baseUrl = 'https://nuaborges.phstatic.com.br';
  const cdnBase = (env.NEXT_PUBLIC_MEDIA_CDN_URL || baseUrl).replace(/\/$/, '');

  const mediaMap = new Map<string, any>();

  // 1. Carrega uploads do R2
  if (env.BUCKET && typeof env.BUCKET.list === 'function') {
    try {
      const listed = await env.BUCKET.list({ limit: 100 });
      for (const obj of listed.objects || []) {
        // Ignora arquivos internos de auditoria e sincronização
        if (obj.key.startsWith('audit/') || obj.key.startsWith('content/')) {
          continue;
        }

        const isVideo =
          obj.key.endsWith('.mp4') ||
          obj.key.endsWith('.webm') ||
          obj.httpMetadata?.contentType?.startsWith('video/');

        const normKey = normalizeMediaKey(obj.key);
        const publicUrl = `${cdnBase}/${normKey}`;

        mediaMap.set(normKey, {
          key: normKey,
          name: normKey.replace(/^media\//, ''),
          section: 'Upload R2',
          sizeBytes: obj.size,
          uploadedAt: obj.uploaded?.toISOString() || new Date().toISOString(),
          contentType: obj.httpMetadata?.contentType || (isVideo ? 'video/mp4' : 'image/webp'),
          url: publicUrl,
          origin: 'r2_upload',
          isVideo,
        });
      }
    } catch (err) {
      console.warn('[MediaList] Erro ao listar bucket R2:', err);
    }

    // 2. Carrega fotos salvas em content/published.json (caso tenha fotos customizadas)
    try {
      const pubObj = await env.BUCKET.get('content/published.json');
      if (pubObj) {
        const text = await pubObj.text();
        const content = JSON.parse(text);

        // Galeria personalizada
        if (Array.isArray(content?.gallery?.photos)) {
          content.gallery.photos.forEach((p: any, idx: number) => {
            if (p?.imageUrl) {
              const normKey = normalizeMediaKey(p.imageUrl);
              if (!mediaMap.has(normKey)) {
                const fullUrl = p.imageUrl.startsWith('http') ? p.imageUrl : `${baseUrl}/${normKey}`;
                mediaMap.set(normKey, {
                  key: normKey,
                  name: p.title || `Galeria Foto #${idx + 1}`,
                  section: 'Galeria Oficial',
                  url: fullUrl,
                  origin: fullUrl.includes('/images/nua/') ? 'site_preset' : 'content_published',
                  isVideo: false,
                  contentType: 'image/webp',
                  uploadedAt: new Date().toISOString(),
                });
              }
            }
          });
        }

        // Hero fotos personalizadas
        if (Array.isArray(content?.hero?.photos)) {
          content.hero.photos.forEach((p: any, idx: number) => {
            if (p?.imageUrl) {
              const normKey = normalizeMediaKey(p.imageUrl);
              if (!mediaMap.has(normKey)) {
                const fullUrl = p.imageUrl.startsWith('http') ? p.imageUrl : `${baseUrl}/${normKey}`;
                mediaMap.set(normKey, {
                  key: normKey,
                  name: p.title || `Hero Foto #${idx + 1}`,
                  section: 'Hero (Capa)',
                  url: fullUrl,
                  origin: fullUrl.includes('/images/nua/') ? 'site_preset' : 'content_published',
                  isVideo: false,
                  contentType: 'image/jpeg',
                  uploadedAt: new Date().toISOString(),
                });
              }
            }
          });
        }
      }
    } catch (err) {
      console.warn('[MediaList] Erro ao ler published.json:', err);
    }
  }

  // 3. Adiciona as mídias estáticas originais do site (se ainda não adicionadas)
  for (const staticItem of STATIC_SITE_MEDIA) {
    const normKey = normalizeMediaKey(staticItem.key);
    if (!mediaMap.has(normKey)) {
      mediaMap.set(normKey, staticItem);
    }
  }

  const allObjects = Array.from(mediaMap.values());

  // Ordena: uploads R2 recentes primeiro, depois fotos ativas do site
  allObjects.sort((a, b) => {
    if (a.origin === 'r2_upload' && b.origin !== 'r2_upload') return -1;
    if (b.origin === 'r2_upload' && a.origin !== 'r2_upload') return 1;
    return new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime();
  });

  const sliced = allObjects.slice(0, limit);

  return new Response(
    JSON.stringify({
      objects: sliced,
      totalCount: allObjects.length,
      r2UploadsCount: allObjects.filter((m) => m.origin === 'r2_upload').length,
      sitePresetCount: allObjects.filter((m) => m.origin === 'site_preset').length,
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
