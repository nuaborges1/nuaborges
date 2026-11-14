import { AvulsoProductItem, AvulsoVideoItem, LibraryImageItem } from '@/lib/types';

/**
 * Converte títulos em slugs amigáveis
 */
export function generateSlugFromTitle(title: string): string {
  const clean = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return clean || 'ensaio-exclusivo';
}

/**
 * Determina se uma URL refere-se a um arquivo de vídeo
 */
export function isMediaItemAVideo(url?: string): boolean {
  if (!url) return false;
  const clean = url.trim().toLowerCase();
  if (clean.includes('/poster.webp') || clean.endsWith('poster.webp')) return true;
  if (
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.mov') ||
    clean.endsWith('.m4v') ||
    clean.endsWith('.mkv') ||
    clean.includes('/video.') ||
    clean.includes('video/')
  ) {
    return true;
  }
  return false;
}

/**
 * Garante a URL do arquivo de vídeo (.mp4) e a URL do pôster
 */
export function resolveVideoUrls(
  urlOrKey: string,
  mediaItem?: LibraryImageItem
): { videoUrl: string; posterUrl: string } {
  if (urlOrKey.startsWith('http://') || urlOrKey.startsWith('https://')) {
    const isPoster = urlOrKey.toLowerCase().includes('/poster.webp');
    const videoUrl = isPoster ? urlOrKey.replace('/poster.webp', '/video.mp4') : urlOrKey;
    const posterUrl = isPoster ? urlOrKey : (mediaItem?.posterUrl || '');
    return { videoUrl, posterUrl };
  }

  let videoUrl = urlOrKey;
  let posterUrl = mediaItem?.posterUrl || '';

  if (mediaItem?.isVideo) {
    videoUrl = mediaItem.variants?.original?.url || mediaItem.url || urlOrKey;
    posterUrl = mediaItem.posterUrl || '';
  } else if (urlOrKey.includes('/poster.webp')) {
    videoUrl = urlOrKey.replace('/poster.webp', '/video.mp4');
    posterUrl = urlOrKey;
  }

  return { videoUrl, posterUrl };
}

/**
 * Higieniza as mídias do item sem sobrescrever ou descartar URLs personalizadas do usuário
 */
export function sanitizeItemMedia(item: AvulsoProductItem): AvulsoProductItem {
  const rawPreviews = item.previewImages || [];
  const rawExclusive = item.exclusivePhotos || [];
  const rawVideos = [...(item.videos || [])];

  const cleanPreviews: string[] = [];
  const cleanExclusive: string[] = [];
  const updatedVideos: AvulsoVideoItem[] = [];

  for (const url of rawPreviews) {
    if (url && typeof url === 'string' && !cleanPreviews.includes(url)) {
      cleanPreviews.push(url);
    }
  }

  for (const url of rawExclusive) {
    if (url && typeof url === 'string' && !cleanExclusive.includes(url)) {
      cleanExclusive.push(url);
    }
  }

  for (const v of rawVideos) {
    if (!v) continue;
    const cleanUrl = (v.url || '').trim();
    if (!cleanUrl) continue;

    updatedVideos.push({
      id: v.id || 'vid-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      title: v.title || `Vídeo — ${item.title}`,
      url: cleanUrl,
      posterUrl: v.posterUrl || item.imageUrl || '',
      duration: v.duration || 'Vídeo 4K UHD',
    });
  }

  const pCount = cleanPreviews.length;
  const eCount = cleanExclusive.length > 0 ? cleanExclusive.length : pCount;
  const vCount = updatedVideos.length;

  let dynamicDuration = item.duration;
  if (
    !dynamicDuration ||
    dynamicDuration.trim() === '' ||
    dynamicDuration.includes('35 Fotos') ||
    (eCount !== 15 && dynamicDuration.includes('15 Fotos'))
  ) {
    if (vCount > 0 && eCount > 0) {
      dynamicDuration = `${eCount} Foto${eCount === 1 ? '' : 's'} 4K • ${vCount} Vídeo${vCount === 1 ? '' : 's'} UHD`;
    } else if (vCount > 0) {
      dynamicDuration = `${vCount} Vídeo${vCount === 1 ? '' : 's'} 4K UHD`;
    } else if (eCount > 0) {
      dynamicDuration = `${eCount} Foto${eCount === 1 ? '' : 's'} 4K`;
    } else {
      dynamicDuration = 'Sem mídias anexadas';
    }
  }

  const updatedTechDetails = {
    ...(item.technicalDetails || {}),
    format:
      item.technicalDetails?.format ||
      (vCount > 0
        ? eCount > 0
          ? 'Ensaio Fotográfico & Vídeo Autoral'
          : 'Produção Audiovisual UHD'
        : 'Ensaio Fotográfico Autoral'),
    mediaCount:
      vCount > 0
        ? eCount > 0
          ? `${eCount} Fotografia${eCount === 1 ? '' : 's'} RAW / 4K UHD + ${vCount} Vídeo${vCount === 1 ? '' : 's'} UHD`
          : `${vCount} Vídeo${vCount === 1 ? '' : 's'} 4K UHD`
        : `${eCount} Fotografia${eCount === 1 ? '' : 's'} RAW / 4K UHD`,
  };

  return {
    ...item,
    duration: dynamicDuration,
    technicalDetails: updatedTechDetails,
    previewImages: cleanPreviews,
    exclusivePhotos: cleanExclusive,
    videos: updatedVideos,
  };
}
