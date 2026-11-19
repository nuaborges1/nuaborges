/**
 * Cloudflare Pages Function: GET /api/media/list
 *
 * Central de Mídias Global & Rastreabilidade de Armazenamento:
 * 1. Mídias reais no Backblaze B2 (bucket nuaborges-media)
 * 2. Referências e vínculos no Supabase PostgreSQL (site_content)
 * 3. Rastreabilidade completa: Nome, Tipo, Formato, Tamanho, Data, Origem,
 *    Vínculos (Packs, Avulsos, Capas, Galeria, Bio), Privacidade (Public/Protected),
 *    Situação no B2 e Supabase (InStorage, InDatabase, IsOrphan, IsBroken, IsThumbnail)
 * 4. Métricas de auditoria para visualização na Central Administrativa Global
 */

import { getSupabaseClient, isSupabaseConfigured } from '../_supabaseClient';
import { headMedia, isMediaStorageConfigured, listMediaObjects, MediaEnv } from '../_mediaStore';

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

const STATIC_SITE_MEDIA = [
  {
    key: 'images/nua/hero/hero-1.jpg',
    name: 'Hero 01 — Nua Borges',
    usageLocation: 'Hero (Capa)',
    url: '/images/nua/hero/hero-1.jpg',
    origin: 'site_preset',
    type: 'image',
    format: 'JPEG',
    privacy: 'public',
    sizeBytes: 131308,
    uploadedAt: '2026-09-01T00:00:00.000Z',
    inStorage: true,
    inDatabase: true,
    isOrphan: false,
    isBroken: false,
    isThumbnail: false,
    canDelete: false,
  },
  {
    key: 'images/nua/hero/hero-2.jpg',
    name: 'Hero 02 — Nua Borges',
    usageLocation: 'Hero (Capa)',
    url: '/images/nua/hero/hero-2.jpg',
    origin: 'site_preset',
    type: 'image',
    format: 'JPEG',
    privacy: 'public',
    sizeBytes: 148230,
    uploadedAt: '2026-09-01T00:00:00.000Z',
    inStorage: true,
    inDatabase: true,
    isOrphan: false,
    isBroken: false,
    isThumbnail: false,
    canDelete: false,
  },
  {
    key: 'images/nua/gallery/gallery-1.png',
    name: 'Galeria 01 — Luz & Silhueta',
    usageLocation: 'Galeria Oficial',
    url: '/images/nua/gallery/gallery-1.png',
    origin: 'site_preset',
    type: 'image',
    format: 'PNG',
    privacy: 'public',
    sizeBytes: 656501,
    uploadedAt: '2026-09-01T00:00:00.000Z',
    inStorage: true,
    inDatabase: true,
    isOrphan: false,
    isBroken: false,
    isThumbnail: false,
    canDelete: false,
  },
  {
    key: 'images/nua/gallery/gallery-2.png',
    name: 'Galeria 02 — Sombras Íntimas',
    usageLocation: 'Galeria Oficial',
    url: '/images/nua/gallery/gallery-2.png',
    origin: 'site_preset',
    type: 'image',
    format: 'PNG',
    privacy: 'public',
    sizeBytes: 459426,
    uploadedAt: '2026-09-01T00:00:00.000Z',
    inStorage: true,
    inDatabase: true,
    isOrphan: false,
    isBroken: false,
    isThumbnail: false,
    canDelete: false,
  },
];

function normalizeMediaKey(key: string): string {
  if (!key) return '';
  return key
    .replace(/^https?:\/\/[^\/]+\//, '')
    .replace(/^\/+/, '')
    .split('?')[0];
}

function detectMediaType(key: string, contentType = ''): { type: 'image' | 'video' | 'audio'; format: string } {
  if (contentType.startsWith('video/')) return { type: 'video', format: contentType.split('/')[1].toUpperCase() };
  if (contentType.startsWith('audio/')) return { type: 'audio', format: contentType.split('/')[1].toUpperCase() };
  if (contentType.startsWith('image/')) return { type: 'image', format: contentType.split('/')[1].toUpperCase() };
  const lower = key.toLowerCase();
  if (lower.endsWith('.mp4') || lower.endsWith('.m4v')) return { type: 'video', format: 'MP4' };
  if (lower.endsWith('.mov')) return { type: 'video', format: 'MOV' };
  if (lower.endsWith('.webm')) return { type: 'video', format: 'WEBM' };
  if (lower.endsWith('.mp3')) return { type: 'audio', format: 'MP3' };
  if (lower.endsWith('.wav')) return { type: 'audio', format: 'WAV' };
  if (lower.endsWith('.ogg')) return { type: 'audio', format: 'OGG' };
  if (lower.endsWith('.webp')) return { type: 'image', format: 'WEBP' };
  if (lower.endsWith('.png')) return { type: 'image', format: 'PNG' };
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return { type: 'image', format: 'JPEG' };
  if (lower.endsWith('.avif')) return { type: 'image', format: 'AVIF' };
  return { type: 'image', format: 'ARQUIVO' };
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface UsageRecord {
  section: string;
  title: string;
  role: string;
  privacy: 'public' | 'protected';
}

function extractSupabaseUsages(content: any): Map<string, UsageRecord[]> {
  const usageMap = new Map<string, UsageRecord[]>();

  const recordUsage = (
    urlOrKey: string | undefined,
    rec: UsageRecord
  ) => {
    if (!urlOrKey) return;
    const norm = normalizeMediaKey(urlOrKey);
    if (!norm) return;

    if (!usageMap.has(norm)) {
      usageMap.set(norm, []);
    }
    const list = usageMap.get(norm)!;
    if (!list.some((existing) => existing.role === rec.role && existing.title === rec.title)) {
      list.push(rec);
    }

    // Vincula também o diretório pai da variante de mídia (ex: media/media-123/)
    const dirMatch = norm.match(/^(media\/media-[^\/]+)/);
    if (dirMatch) {
      const parentDir = dirMatch[1];
      if (!usageMap.has(parentDir)) {
        usageMap.set(parentDir, []);
      }
      const parentList = usageMap.get(parentDir)!;
      if (!parentList.some((existing) => existing.role === rec.role && existing.title === rec.title)) {
        parentList.push(rec);
      }
    }
  };

  if (!content || typeof content !== 'object') return usageMap;

  // 1. Hero Capa
  if (Array.isArray(content.hero?.photos)) {
    content.hero.photos.forEach((p: any, idx: number) => {
      recordUsage(p?.imageUrl, {
        section: 'Hero (Capa Principal)',
        title: p?.title || `Hero Capa #${idx + 1}`,
        role: 'Hero Capa',
        privacy: 'public',
      });
    });
  }

  // 2. Galeria Oficial
  if (Array.isArray(content.gallery?.photos)) {
    content.gallery.photos.forEach((p: any, idx: number) => {
      recordUsage(p?.imageUrl, {
        section: 'Galeria Oficial',
        title: p?.title || `Foto #${idx + 1}`,
        role: 'Galeria Oficial',
        privacy: 'public',
      });
    });
  }

  // 3. Sobre Mim (Bio)
  if (content.about?.photoUrl) {
    recordUsage(content.about.photoUrl, {
      section: 'Sobre Mim (Bio)',
      title: 'Foto de Perfil & Manifesto',
      role: 'Foto Bio',
      privacy: 'public',
    });
  }

  // 4. Packs & Conteúdos Avulsos
  if (Array.isArray(content.avulsos?.items)) {
    content.avulsos.items.forEach((item: any) => {
      const isAvulso = item.modality === 'avulso';
      const entityLabel = isAvulso ? `Avulso: "${item.title}"` : `Pack: "${item.title}"`;

      // Capa
      recordUsage(item.imageUrl, {
        section: isAvulso ? 'Conteúdos Avulsos' : 'Packs / Coleções',
        title: item.title,
        role: `${entityLabel} (Capa)`,
        privacy: 'public',
      });

      // Prévias / Amostras
      if (Array.isArray(item.previewImages)) {
        item.previewImages.forEach((prevUrl: string) => {
          recordUsage(prevUrl, {
            section: isAvulso ? 'Conteúdos Avulsos' : 'Packs / Coleções',
            title: item.title,
            role: `${entityLabel} (Amostra)`,
            privacy: 'public',
          });
        });
      }

      // Fotos Exclusivas do Cofre
      if (Array.isArray(item.exclusivePhotos)) {
        item.exclusivePhotos.forEach((exUrl: string) => {
          recordUsage(exUrl, {
            section: isAvulso ? 'Conteúdos Avulsos' : 'Packs / Coleções',
            title: item.title,
            role: `${entityLabel} (Cofre Protegido)`,
            privacy: 'protected',
          });
        });
      }

      // Vídeos UHD
      if (Array.isArray(item.videos)) {
        item.videos.forEach((v: any) => {
          recordUsage(v.url, {
            section: isAvulso ? 'Conteúdos Avulsos' : 'Packs / Coleções',
            title: item.title,
            role: `${entityLabel} (Vídeo UHD)`,
            privacy: 'protected',
          });
          if (v.posterUrl) {
            recordUsage(v.posterUrl, {
              section: isAvulso ? 'Conteúdos Avulsos' : 'Packs / Coleções',
              title: item.title,
              role: `${entityLabel} (Poster do Vídeo)`,
              privacy: 'public',
            });
          }
        });
      }
    });
  }

  // 5. Biblioteca Geral do Painel (Cofre Central)
  if (Array.isArray(content.library)) {
    content.library.forEach((item: any, idx: number) => {
      const name = item.name || item.customName || `Item #${idx + 1}`;
      recordUsage(item.url || item.imageUrl || item.objectKey, {
        section: 'Biblioteca de Mídias',
        title: name,
        role: `Biblioteca Central (${name})`,
        privacy: 'protected',
      });
      if (item.posterUrl) {
        recordUsage(item.posterUrl, {
          section: 'Biblioteca de Mídias',
          title: name,
          role: `Poster da Biblioteca (${name})`,
          privacy: 'public',
        });
      }
      if (item.variants && typeof item.variants === 'object') {
        Object.values(item.variants).forEach((variant: any) => {
          if (variant?.key || variant?.url) {
            recordUsage(variant.key || variant.url, {
              section: 'Biblioteca de Mídias',
              title: name,
              role: `Variante da Biblioteca (${variant.format || 'Otimizada'})`,
              privacy: 'protected',
            });
          }
        });
      }
    });
  }

  // 6. Álbuns e Coleções Adicionais
  if (Array.isArray(content.albums)) {
    content.albums.forEach((album: any) => {
      const albumTitle = album.title || 'Coleção';
      if (Array.isArray(album.photos)) {
        album.photos.forEach((p: any, idx: number) => {
          recordUsage(p?.imageUrl, {
            section: `Álbum: ${albumTitle}`,
            title: p?.title || `${albumTitle} #${idx + 1}`,
            role: `Álbum "${albumTitle}"`,
            privacy: 'public',
          });
        });
      }
    });
  }

  return usageMap;
}

export const onRequestGet = async (context: PagesContext<MediaEnv>) => {
  const { request, env } = context;
  const url = new URL(request.url);

  const limitParam = url.searchParams.get('limit');
  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : 500;
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 1000) : 500;
  const cursor = url.searchParams.get('cursor') || undefined;

  const baseUrl = url.origin;
  const cdnBase = (env.NEXT_PUBLIC_MEDIA_CDN_URL || baseUrl).replace(/\/$/, '');

  // 1. Carrega todas as referências ativas do Supabase (site_content)
  let contentUsageMap = new Map<string, UsageRecord[]>();
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

        const privMap = extractSupabaseUsages(privData?.content);
        const pubMap = extractSupabaseUsages(pubData?.content);

        // Mescla referências
        contentUsageMap = privMap;
        for (const [k, recs] of pubMap.entries()) {
          if (!contentUsageMap.has(k)) {
            contentUsageMap.set(k, recs);
          } else {
            const existing = contentUsageMap.get(k)!;
            recs.forEach((r) => {
              if (!existing.some((e) => e.role === r.role && e.title === r.title)) {
                existing.push(r);
              }
            });
          }
        }
      }
    } catch (err) {
      console.warn('[MediaList] Erro ao carregar referências do Supabase:', err);
    }
  }

  // 2. Consulta o armazenamento real: Backblaze B2 Object Storage
  let storageError: string | undefined;
  let nextCursor: string | undefined;
  let b2Objects: Array<{ key: string; size?: number; uploadedAt?: string; contentType?: string }> = [];

  if (isMediaStorageConfigured(env)) {
    try {
      const listed = await listMediaObjects(env, { limit, cursor });
      nextCursor = listed.nextCursor;
      b2Objects = listed.objects || [];
    } catch (err: any) {
      storageError = `Não foi possível consultar o armazenamento Backblaze B2: ${err?.message || err}`;
      console.error('[MediaList] Erro ao listar Backblaze B2:', err?.message || err);
    }
  }

  // 3. Mapeamento Unificado de Mídias (B2 + Supabase)
  const mediaMap = new Map<string, any>();
  const b2FoundKeys = new Set<string>();

  // Processa arquivos reais retornados do Backblaze B2 (estritamente fotos e vídeos)
  for (const obj of b2Objects) {
    if (
      !obj.key ||
      obj.key.startsWith('audit/') ||
      obj.key.startsWith('content/') ||
      obj.key.startsWith('audio/') ||
      obj.key.startsWith('music/') ||
      obj.key.includes('test-audit') ||
      obj.key.includes('/audit/') ||
      obj.key.endsWith('.json')
    ) {
      continue;
    }

    const normKey = normalizeMediaKey(obj.key);
    if (!normKey || normKey.startsWith('audio/') || normKey.startsWith('music/') || normKey.includes('test-audit')) {
      continue;
    }

    b2FoundKeys.add(normKey);

    const storageMime = obj.contentType || '';
    const { type, format } = detectMediaType(normKey, storageMime);
    if (type !== 'image' && type !== 'video') {
      continue;
    }
    const isThumbnail = normKey.endsWith('thumb.webp') || normKey.endsWith('mobile.webp') || /\/poster-/i.test(normKey);
    const parentDirMatch = normKey.match(/^(media\/objects\/(?:public|private)\/[^/]+)|^(media\/media-[^\/]+)/i);
    const parentFolder = parentDirMatch ? parentDirMatch[1] : undefined;
    const parentKey = isThumbnail && parentFolder ? `${parentFolder}/full.webp` : undefined;

    // Localiza vínculos no Supabase
    const directUsages = contentUsageMap.get(normKey) || [];
    const parentUsages = parentFolder ? contentUsageMap.get(parentFolder) || [] : [];
    const combinedUsages = [...directUsages, ...parentUsages.filter((pu) => !directUsages.some((du) => du.role === pu.role))];

    const inDatabase = combinedUsages.length > 0;
    const isOrphan = !inDatabase;
    const isProtected = combinedUsages.some((u) => u.privacy === 'protected') || normKey.split('/').includes('private') || (!inDatabase && normKey.startsWith('media/'));

    const displayTitle = combinedUsages.length > 0
      ? combinedUsages[0].title
      : normKey.split('/').pop() || 'Arquivo B2';

    const usageDescriptions = combinedUsages.map((u) => u.role);

    const publicUrl = isProtected
      ? `/${normKey}`
      : normKey.startsWith('http')
      ? normKey
      : `${cdnBase}/${normKey}`;

    mediaMap.set(normKey, {
      key: normKey,
      name: displayTitle,
      type,
      format,
      sizeBytes: obj.size || 0,
      sizeFormatted: formatBytes(obj.size),
      uploadedAt: obj.uploadedAt || new Date().toISOString(),
      url: publicUrl,
      origin: 'b2_storage',
      privacy: isProtected ? 'protected' : 'public',
      inStorage: true,
      inDatabase,
      isOrphan,
      isBroken: false,
      isThumbnail,
      parentFolder,
      parentKey,
      usageLocations: usageDescriptions,
      section: usageDescriptions[0] || (isOrphan ? 'Armazenamento Órfão (B2)' : 'Acervo Oficial'),
      canDelete: isOrphan,
    });
  }

  // Mapeia existência de referências contra o inventário B2 já listado sem chamadas excessivas de HEAD (preserva cota de transações Classe B)
  const referenceStorageStatus = new Map<string, 'exists' | 'missing' | 'unknown'>();
  for (const refKey of contentUsageMap.keys()) {
    referenceStorageStatus.set(refKey, b2FoundKeys.has(refKey) ? 'exists' : 'unknown');
  }

  // Processa referências do Supabase que não foram listadas no B2 (verificação de integridade)
  for (const [refKey, usages] of contentUsageMap.entries()) {
    if (
      refKey.startsWith('images/') ||
      refKey.startsWith('audio/') ||
      refKey.startsWith('music/') ||
      refKey.startsWith('audit/') ||
      refKey.startsWith('test-audit/')
    ) {
      // Asset estático do frontend ou faixa musical
      continue;
    }

    const { type, format } = detectMediaType(refKey);
    if (type !== 'image' && type !== 'video') {
      continue;
    }

    // Se a chave não é um diretório pai e não está no B2
    if (!refKey.endsWith('/') && !refKey.includes('media-') && !b2FoundKeys.has(refKey)) {
      const isKnownDir = Array.from(b2FoundKeys).some((bk) => bk.startsWith(refKey));
      if (!isKnownDir && !mediaMap.has(refKey)) {
        const isProtected = usages.some((u) => u.privacy === 'protected') || refKey.split('/').includes('private');
        const storageStatus = referenceStorageStatus.get(refKey) || 'unknown';
        const usageDescriptions = usages.map((u) => u.role);

        mediaMap.set(refKey, {
          key: refKey,
          name: usages[0]?.title || refKey.split('/').pop() || 'Referência CMS',
          type,
          format,
          sizeBytes: 0,
          sizeFormatted: 'Indisponível',
          uploadedAt: new Date().toISOString(),
          url: isProtected ? `/${refKey}` : `${cdnBase}/${refKey}`,
          origin: 'supabase_content',
          privacy: isProtected ? 'protected' : 'public',
          inStorage: storageStatus === 'exists',
          inDatabase: true,
          isOrphan: false,
          isBroken: storageStatus === 'missing',
          storageStatusUnknown: storageStatus === 'unknown',
          isThumbnail: false,
          usageLocations: usageDescriptions,
          section: usageDescriptions[0] || 'Vínculo do Site',
          canDelete: false,
        });
      }
    }
  }

  // Fallback para presets de fábrica se o acervo estiver completamente vazio
  if (mediaMap.size === 0 && !isMediaStorageConfigured(env)) {
    for (const staticItem of STATIC_SITE_MEDIA) {
      mediaMap.set(staticItem.key, {
        ...staticItem,
        sizeFormatted: formatBytes(staticItem.sizeBytes),
        usageLocations: [staticItem.usageLocation],
      });
    }
  }

  const allItems = Array.from(mediaMap.values());

  // Ordenação cronológica: mais recentes primeiro
  allItems.sort((a, b) => {
    return new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime();
  });

  // Estatísticas de Auditoria Rigorosa
  const inventoryComplete = isMediaStorageConfigured(env) && !cursor && !nextCursor && !storageError;
  const audit = {
    totalB2Files: inventoryComplete ? b2Objects.length : null,
    inventoryPageCount: b2Objects.length,
    inventoryComplete,
    totalDatabaseRefs: contentUsageMap.size,
    activeInSite: allItems.filter((m) => m.inDatabase).length,
    orphanCount: allItems.filter((m) => m.isOrphan).length,
    brokenCount: allItems.filter((m) => m.isBroken).length,
    protectedCount: allItems.filter((m) => m.privacy === 'protected').length,
    publicCount: allItems.filter((m) => m.privacy === 'public').length,
    thumbnailsCount: allItems.filter((m) => m.isThumbnail).length,
  };

  return new Response(
    JSON.stringify({
      success: !storageError,
      objects: allItems,
      items: allItems,
      audit,
      stats: {
        totalUploads: inventoryComplete ? b2Objects.length : null,
        pageUploads: b2Objects.length,
        totalEdits: contentUsageMap.size,
        orphanCount: audit.orphanCount,
      },
      nextCursor: nextCursor || null,
      hasMore: Boolean(nextCursor),
      cursor: cursor || null,
      ...(storageError ? { storageError } : {}),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*',
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Master-Key',
    },
  });

export const onRequest = async (context: PagesContext<MediaEnv>) => {
  if (context.request.method === 'OPTIONS') {
    return onRequestOptions();
  }
  return onRequestGet(context);
};
