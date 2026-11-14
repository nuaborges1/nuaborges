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

// Configuração de variantes calibrada para altíssima fidelidade estética e peso mínimo
export const VARIANT_CONFIGS = [
  {
    name: 'thumb' as const,
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.76,
    maxTargetBytes: 35 * 1024, // máx 35 KB para miniaturas
  },
  {
    name: 'mobile' as const,
    maxWidth: 900,
    maxHeight: 900,
    quality: 0.80,
    maxTargetBytes: 95 * 1024, // máx 95 KB para telas de celular
  },
  {
    name: 'full' as const,
    maxWidth: 1920,
    maxHeight: 2400,
    quality: 0.84,
    maxTargetBytes: 380 * 1024, // máx 380 KB para telas 4K / Retina
  },
];

/**
 * Calcula dimensões preservando proporção exata sem distorção.
 */
export function calculateAspectRatioFit(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number,
  maxHeight: number
): ImageDimensions {
  const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight, 1);
  return {
    width: Math.max(1, Math.round(srcWidth * ratio)),
    height: Math.max(1, Math.round(srcHeight * ratio)),
  };
}

/**
 * Aplica um filtro de micro-nitidez (Unsharp Mask Convolution) de intensidade sutil (12%)
 * no buffer de pixels 2D do Canvas. Isso neutraliza a suavização típica do downscaling
 * e do codec WebP, mantendo a nitidez editorial de pele, tecidos e brilho.
 */
export function applySubtleClarityPass(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): void {
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const output = ctx.createImageData(w, h);
    const outData = output.data;
    outData.set(data);

    const weight = 0.12;

    for (let y = 1; y < h - 1; y++) {
      const rowOffset = y * w;
      for (let x = 1; x < w - 1; x++) {
        const idx = (rowOffset + x) * 4;

        for (let c = 0; c < 3; c++) {
          const center = data[idx + c];
          const top = data[((y - 1) * w + x) * 4 + c];
          const bottom = data[((y + 1) * w + x) * 4 + c];
          const left = data[(rowOffset + (x - 1)) * 4 + c];
          const right = data[(rowOffset + (x + 1)) * 4 + c];

          const diff = center * 4 - top - bottom - left - right;
          const enhanced = center + diff * weight;
          outData[idx + c] = enhanced < 0 ? 0 : enhanced > 255 ? 255 : enhanced;
        }
      }
    }

    ctx.putImageData(output, 0, 0);
  } catch {
    // Caso haja restrição de memória ou cross-origin, preserva imagem original sem interrupção
  }
}

/**
 * Redimensiona a imagem usando amostragem progressiva em etapas (Step-Down Resampling).
 * Reduz em passos de 50% para evitar aliasing, perda de textura e artefatos de amostragem.
 */
export function renderUltraResampledCanvas(
  source: HTMLImageElement | HTMLVideoElement,
  targetWidth: number,
  targetHeight: number,
  applySharpening = true
): HTMLCanvasElement {
  let curWidth = source instanceof HTMLVideoElement ? source.videoWidth || 1280 : source.naturalWidth || source.width;
  let curHeight = source instanceof HTMLVideoElement ? source.videoHeight || 720 : source.naturalHeight || source.height;

  // Canvas intermediário inicial
  let tempCanvas = document.createElement('canvas');
  tempCanvas.width = curWidth;
  tempCanvas.height = curHeight;
  let tempCtx = tempCanvas.getContext('2d', { alpha: true });
  if (!tempCtx) return tempCanvas;

  tempCtx.imageSmoothingEnabled = true;
  tempCtx.imageSmoothingQuality = 'high';
  tempCtx.drawImage(source, 0, 0, curWidth, curHeight);

  // Redução em degraus progressivos se a imagem for mais de 2x maior que o alvo
  while (curWidth * 0.5 > targetWidth && curHeight * 0.5 > targetHeight) {
    curWidth = Math.round(curWidth * 0.5);
    curHeight = Math.round(curHeight * 0.5);

    const nextCanvas = document.createElement('canvas');
    nextCanvas.width = curWidth;
    nextCanvas.height = curHeight;
    const nextCtx = nextCanvas.getContext('2d', { alpha: true });
    if (!nextCtx) break;

    nextCtx.imageSmoothingEnabled = true;
    nextCtx.imageSmoothingQuality = 'high';
    nextCtx.drawImage(tempCanvas, 0, 0, curWidth, curHeight);

    tempCanvas = nextCanvas;
    tempCtx = nextCtx;
  }

  // Canvas final com as dimensões exatas solicitadas
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = targetWidth;
  finalCanvas.height = targetHeight;
  const finalCtx = finalCanvas.getContext('2d', { alpha: true });
  if (!finalCtx) return tempCanvas;

  finalCtx.imageSmoothingEnabled = true;
  finalCtx.imageSmoothingQuality = 'high';
  finalCtx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight);

  // Aplica micro-nitidez para reter definição de foto de estúdio
  if (applySharpening && targetWidth >= 300) {
    applySubtleClarityPass(finalCtx, targetWidth, targetHeight);
  }

  return finalCanvas;
}

/**
 * Converte um Canvas para WebP com validação adaptativa de tamanho máximo.
 */
export async function compressCanvasToWebP(
  canvas: HTMLCanvasElement,
  initialQuality: number,
  maxTargetBytes?: number
): Promise<Blob> {
  const getBlob = (q: number) =>
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Falha ao exportar imagem para WebP'));
        },
        'image/webp',
        q
      );
    });

  let blob = await getBlob(initialQuality);

  // Se exceder o orçamento de bytes recomendado (ex: foto com muito ruído ISO), faz um segundo passe calibrado
  if (maxTargetBytes && blob.size > maxTargetBytes && initialQuality > 0.72) {
    const secondaryQuality = Math.max(0.70, initialQuality - 0.08);
    const refinedBlob = await getBlob(secondaryQuality);
    if (refinedBlob.size < blob.size) {
      blob = refinedBlob;
    }
  }

  return blob;
}

/**
 * Otimiza uma foto em variantes WebP responsivas de super-compressão com zero perda visual.
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
            const targetDim = calculateAspectRatioFit(
              originalWidth,
              originalHeight,
              config.maxWidth,
              config.maxHeight
            );

            // Resampling progressivo com passe de nitidez
            const canvas = renderUltraResampledCanvas(
              img,
              targetDim.width,
              targetDim.height,
              config.name !== 'thumb' // thumb já tem densidade alta
            );

            const blob = await compressCanvasToWebP(
              canvas,
              config.quality,
              config.maxTargetBytes
            );

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
