import { resolveMediaUrl } from '@/lib/media';

/**
 * Detecta a duração de um arquivo de vídeo automaticamente usando o elemento HTML5 Video
 */
export function autoDetectVideoMetadata(
  urlOrFile: string
): Promise<{ duration: string; title?: string }> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve({ duration: 'Vídeo 4K', title: 'Vídeo Autoral (4K UHD)' });
      return;
    }
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';

      const resolvedUrl = resolveMediaUrl(urlOrFile, 'full');

      video.onloadedmetadata = () => {
        const durationSec = Math.round(video.duration);
        if (!durationSec || isNaN(durationSec)) {
          resolve({ duration: 'Vídeo 4K' });
          return;
        }

        const mins = Math.floor(durationSec / 60);
        const secs = durationSec % 60;
        let durationStr = '01:00 Minuto';

        if (mins === 0) {
          durationStr = `${secs} Segundos`;
        } else if (secs === 0) {
          durationStr = `${mins} Minuto${mins === 1 ? '' : 's'}`;
        } else {
          durationStr = `${mins}:${secs < 10 ? '0' : ''}${secs} Minutos`;
        }

        resolve({ duration: durationStr });
      };

      video.onerror = () => {
        resolve({ duration: 'Vídeo 4K' });
      };

      video.src = resolvedUrl;
    } catch {
      resolve({ duration: 'Vídeo 4K' });
    }
  });
}
