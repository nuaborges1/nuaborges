import { resolveMediaUrl } from '@/lib/media';

// Device Fingerprint Generator
export function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'fp_server';
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const txt = 'NuaBorgesSecurity2026';
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = "14px 'Arial'";
      ctx.fillText(txt, 2, 2);
    }
    const data = canvas.toDataURL();
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const cleanUA = navigator.userAgent.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
    return `fp_${Math.abs(hash)}_${screenInfo}_${cleanUA}`;
  } catch {
    return `fp_fallback_${Date.now()}`;
  }
}

// Helper para identificar se uma URL pertence a um vídeo (arquivo .mp4 ou poster gerado)
export function isVideoUrl(url?: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase().trim();
  return (
    lower.includes('/videos/') ||
    lower.endsWith('.mp4') ||
    lower.endsWith('.mov') ||
    lower.endsWith('.webm') ||
    lower.includes('video.mp4') ||
    lower.includes('poster.webp')
  );
}

// Helper para garantir URL de vídeo reproduzível em HTML5
export function getPlayableVideoUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  const lower = rawUrl.toLowerCase().trim();
  if (lower.includes('poster.webp')) {
    return resolveMediaUrl(rawUrl.replace('poster.webp', 'video.mp4'));
  }
  return resolveMediaUrl(rawUrl);
}
