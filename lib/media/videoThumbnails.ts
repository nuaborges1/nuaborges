/**
 * Utilitário de extração de frames/miniaturas de vídeo estilo YouTube.
 * Permite que a criadora escolha miniaturas automáticas capturadas diretamente do vídeo.
 */

export interface VideoThumbnailCandidate {
  timeSeconds: number;
  timeFormatted: string;
  dataUrl: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function extractVideoThumbnails(
  videoUrl: string,
  count = 4
): Promise<VideoThumbnailCandidate[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve([]);
      return;
    }

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    let isCleanedUp = false;
    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      video.pause();
      video.removeAttribute('src');
      video.load();
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve([]);
    }, 10000);

    video.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      resolve([]);
    };

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      if (!duration || isNaN(duration) || duration <= 0) {
        clearTimeout(timeout);
        cleanup();
        resolve([]);
        return;
      }

      // Calcula os pontos percentuais ao longo do vídeo (ex: 10%, 30%, 55%, 80%)
      const ratios = [0.12, 0.32, 0.58, 0.82];
      const targetTimes = ratios.slice(0, count).map((r) => Math.max(0.5, duration * r));

      const candidates: VideoThumbnailCandidate[] = [];

      for (const t of targetTimes) {
        if (isCleanedUp) break;
        try {
          await new Promise<void>((seekResolve) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              seekResolve();
            };
            video.addEventListener('seeked', onSeeked);
            video.currentTime = t;
          });

          const width = Math.min(640, video.videoWidth || 640);
          const aspectRatio = (video.videoHeight || 360) / (video.videoWidth || 640);
          const height = Math.round(width * (aspectRatio || 9 / 16));

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            candidates.push({
              timeSeconds: Math.round(t),
              timeFormatted: formatTime(t),
              dataUrl,
            });
          }
        } catch {
          // Em caso de restrição de CORS em domínio externo, interrompe silenciosamente
          break;
        }
      }

      clearTimeout(timeout);
      cleanup();
      resolve(candidates);
    };

    video.src = videoUrl;
  });
}
