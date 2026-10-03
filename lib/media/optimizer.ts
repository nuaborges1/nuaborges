/**
 * Client-Side Media Optimizer
 *
 * Runs locally in the browser to deliver extreme media optimization for $0:
 * - Generates WebP multi-size variants (thumb, mobile, full)
 * - Automatically strips EXIF/GPS metadata
 * - Extracts high-res video poster thumbnail frames
 * - Zero paid Cloudflare Images or Stream subscriptions required
 */

import { ImageDimensions } from './types';

export interface OptimizedVariantOutput {
  name: 'thumb' | 'mobile' | 'full';
  blob: Blob;
  width: number;
  height: number;
  format: 'webp';
  sizeBytes: number;
}

export interface OptimizedImagePackage {
  originalWidth: number;
  originalHeight: number;
  originalSizeBytes: number;
  variants: OptimizedVariantOutput[];
  totalOptimizedBytes: number;
  savingsPercentage: number;
}

export interface OptimizedVideoPackage {
  width: number;
  height: number;
  durationSeconds: number;
  sizeBytes: number;
  posterBlob: Blob;
  posterWidth: number;
  posterHeight: number;
}

const VARIANT_CONFIGS = [
  { name: 'thumb' as const, maxWidth: 400, maxHeight: 400, quality: 0.80 },
  { name: 'mobile' as const, maxWidth: 800, maxHeight: 800, quality: 0.82 },
  { name: 'full' as const, maxWidth: 1600, maxHeight: 2000, quality: 0.85 },
];

/**
 * Calculates resized dimensions while maintaining aspect ratio.
 */
function calculateAspectRatioFit(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number,
  maxHeight: number
): ImageDimensions {
  const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight, 1);
  return {
    width: Math.round(srcWidth * ratio),
    height: Math.round(srcHeight * ratio),
  };
}

/**
 * Optimizes an image file into responsive WebP variants.
 */
export async function optimizeImageFile(file: File): Promise<OptimizedImagePackage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const originalWidth = img.naturalWidth || img.width;
          const originalHeight = img.naturalHeight || img.height;
          const originalSizeBytes = file.size;

          const variants: OptimizedVariantOutput[] = [];

          for (const config of VARIANT_CONFIGS) {
            // For smaller variants, do not upscale if original is smaller
            const targetDim = calculateAspectRatioFit(
              originalWidth,
              originalHeight,
              config.maxWidth,
              config.maxHeight
            );

            const canvas = document.createElement('canvas');
            canvas.width = targetDim.width;
            canvas.height = targetDim.height;

            const ctx = canvas.getContext('2d', { alpha: true });
            if (!ctx) {
              throw new Error('Canvas 2D context is not available');
            }

            // High quality image smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            ctx.drawImage(img, 0, 0, targetDim.width, targetDim.height);

            const blob = await new Promise<Blob>((resBlob, rejBlob) => {
              canvas.toBlob(
                (b) => {
                  if (b) resBlob(b);
                  else rejBlob(new Error(`Failed to convert ${config.name} to WebP`));
                },
                'image/webp',
                config.quality
              );
            });

            variants.push({
              name: config.name,
              blob,
              width: targetDim.width,
              height: targetDim.height,
              format: 'webp',
              sizeBytes: blob.size,
            });
          }

          const totalOptimizedBytes = variants.reduce((acc, v) => acc + v.sizeBytes, 0);
          const fullVariant = variants.find((v) => v.name === 'full');
          const primarySize = fullVariant ? fullVariant.sizeBytes : totalOptimizedBytes;
          const savingsPercentage = Math.max(
            0,
            Math.round(((originalSizeBytes - primarySize) / originalSizeBytes) * 100)
          );

          resolve({
            originalWidth,
            originalHeight,
            originalSizeBytes,
            variants,
            totalOptimizedBytes,
            savingsPercentage,
          });
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => reject(new Error('Falha ao decodificar a imagem'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Falha ao ler o arquivo de imagem'));
    reader.readAsDataURL(file);
  });
}

/**
 * Optimizes a video file: extracts poster frame, inspects duration and dimensions.
 */
export async function optimizeVideoFile(file: File): Promise<OptimizedVideoPackage> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);
    video.src = url;

    // Timeout in case video metadata never loads
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error('Tempo limite excedido ao ler o vídeo'));
    }, 15000);

    video.onloadedmetadata = () => {
      // Seek to 0.5s or 10% into the video to avoid a black opening frame
      const seekTime = Math.min(0.5, Math.max(0.1, video.duration * 0.1));
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      clearTimeout(timeout);

      try {
        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;
        const durationSeconds = Math.round(video.duration || 0);

        // Render poster frame to canvas (max 800px wide for optimal performance)
        const posterDim = calculateAspectRatioFit(width, height, 800, 800);
        const canvas = document.createElement('canvas');
        canvas.width = posterDim.width;
        canvas.height = posterDim.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          throw new Error('Canvas 2D context not available for video poster');
        }

        ctx.drawImage(video, 0, 0, posterDim.width, posterDim.height);

        canvas.toBlob(
          (posterBlob) => {
            URL.revokeObjectURL(url);
            if (!posterBlob) {
              reject(new Error('Falha ao gerar o poster do vídeo'));
              return;
            }

            resolve({
              width,
              height,
              durationSeconds,
              sizeBytes: file.size,
              posterBlob,
              posterWidth: posterDim.width,
              posterHeight: posterDim.height,
            });
          },
          'image/webp',
          0.82
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      reject(new Error('Formato de vídeo não suportado pelo navegador'));
    };
  });
}
