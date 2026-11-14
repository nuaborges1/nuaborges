import {
  calculateAspectRatioFit,
  renderUltraResampledCanvas,
  compressCanvasToWebP,
} from './imageOptimizer';
import { optimizeMp4FastStart } from './fastStart';

export interface OptimizedVideoPackage {
  width: number;
  height: number;
  durationSeconds: number;
  sizeBytes: number;
  bitrateKbps?: number;
  posterBlob: Blob;
  posterWidth: number;
  posterHeight: number;
  optimizedVideoBlob?: Blob;
  wasFastStartApplied?: boolean;
}

/**
 * Gera um poster elegante de contingência em WebP quando o arquivo de vídeo
 * não puder ter frames decodificados localmente no navegador (ex: codec proprietário HEVC).
 */
export function generateFallbackPosterBlob(
  width = 1280,
  height = 720,
  title = 'NUA BORGES ♡'
): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      resolve(new Blob([], { type: 'image/webp' }));
      return;
    }

    // Fundo Gradiente Editorial Dark Luxury
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#070709');
    gradient.addColorStop(0.5, '#0e0e14');
    gradient.addColorStop(1, '#050507');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Borda Sutil
    ctx.strokeStyle = 'rgba(244, 167, 185, 0.2)';
    ctx.lineWidth = 3;
    ctx.strokeRect(16, 16, width - 32, height - 32);

    // Ícone de Play centralizado
    const centerX = width / 2;
    const centerY = height / 2 - 20;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 46, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fill();
    ctx.strokeStyle = '#f4a7b9';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Triângulo Play
    ctx.beginPath();
    ctx.moveTo(centerX - 10, centerY - 18);
    ctx.lineTo(centerX + 20, centerY);
    ctx.lineTo(centerX - 10, centerY + 18);
    ctx.closePath();
    ctx.fillStyle = '#f4a7b9';
    ctx.fill();

    // Texto de Apresentação
    ctx.fillStyle = '#ffffff';
    ctx.font = '500 20px serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, centerX, height - 60);

    ctx.fillStyle = '#f4a7b9';
    ctx.font = '600 12px sans-serif';
    ctx.fillText('PRODUÇÃO AUTORAL • VÍDEO EXCLUSIVO UHD', centerX, height - 35);

    canvas.toBlob(
      (b) => resolve(b || new Blob([], { type: 'image/webp' })),
      'image/webp',
      0.82
    );
  });
}

/**
 * Super-otimização de arquivo de vídeo:
 * - Extrai poster frame em alta definição (até 1280x720) com realce de nitidez
 * - Aplica FastStart no binário do MP4 sem perda de qualidade
 * - Calcula duração, resolução e taxa de bitrate
 */
export async function optimizeVideoFile(file: File): Promise<OptimizedVideoPackage> {
  // 1. Aplica FastStart no binário se for MP4/MOV
  const lowerName = file.name.toLowerCase();
  const isMp4OrMov =
    lowerName.endsWith('.mp4') ||
    lowerName.endsWith('.mov') ||
    lowerName.endsWith('.m4v') ||
    file.type.includes('mp4') ||
    file.type.includes('quicktime');

  let processedVideoBlob: Blob = file;
  let wasFastStartApplied = false;

  if (isMp4OrMov) {
    const fastStartResult = await optimizeMp4FastStart(file);
    processedVideoBlob = fastStartResult.blob;
    wasFastStartApplied = fastStartResult.wasRelocated;
  }

  // 2. Extrai poster e metadados
  return new Promise((resolve) => {
    let resolved = false;

    const finishWithFallback = async (dur = 0, w = 1280, h = 720) => {
      if (resolved) return;
      resolved = true;
      const posterBlob = await generateFallbackPosterBlob(1280, 720, 'NUA BORGES ♡');
      const bitrateKbps = dur > 0 ? Math.round((file.size * 8) / dur / 1000) : undefined;
      resolve({
        width: w,
        height: h,
        durationSeconds: dur,
        sizeBytes: processedVideoBlob.size,
        bitrateKbps,
        posterBlob,
        posterWidth: 1280,
        posterHeight: 720,
        optimizedVideoBlob: processedVideoBlob,
        wasFastStartApplied,
      });
    };

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);
    video.src = url;

    // Timeout de segurança: 4s para evitar travar se o codec for inacessível
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      finishWithFallback(Math.round(video.duration || 0));
    }, 4000);

    video.onloadedmetadata = () => {
      const seekTime = Math.min(0.8, Math.max(0.1, (video.duration || 0) * 0.1));
      try {
        video.currentTime = seekTime;
      } catch {
        // Segue adiante
      }
    };

    const attemptCapture = async () => {
      if (resolved) return;
      try {
        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;
        const durationSeconds = Math.round(video.duration || 0);
        const bitrateKbps =
          durationSeconds > 0
            ? Math.round((file.size * 8) / durationSeconds / 1000)
            : undefined;

        // Renderiza poster em resolução HD de até 1280x720 com nitidez editorial
        const posterDim = calculateAspectRatioFit(width, height, 1280, 720);
        const canvas = renderUltraResampledCanvas(video, posterDim.width, posterDim.height, true);

        const posterBlob = await compressCanvasToWebP(canvas, 0.82, 80 * 1024);

        clearTimeout(timeout);
        URL.revokeObjectURL(url);

        resolved = true;
        resolve({
          width,
          height,
          durationSeconds,
          sizeBytes: processedVideoBlob.size,
          bitrateKbps,
          posterBlob,
          posterWidth: posterDim.width,
          posterHeight: posterDim.height,
          optimizedVideoBlob: processedVideoBlob,
          wasFastStartApplied,
        });
      } catch {
        finishWithFallback(Math.round(video.duration || 0));
      }
    };

    video.onseeked = () => {
      attemptCapture();
    };

    video.onloadeddata = () => {
      setTimeout(() => {
        if (!resolved && video.readyState >= 2) {
          attemptCapture();
        }
      }, 800);
    };

    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      finishWithFallback(0);
    };
  });
}
