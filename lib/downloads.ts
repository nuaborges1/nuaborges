/**
 * Utilitários para download de mídias privativas (fotos e vídeos) no ambiente pós-compra.
 * Suporta download individual de alta resolução e empacotamento completo em arquivo ZIP via JSZip.
 */

import JSZip from 'jszip';

export interface MediaDownloadItem {
  url: string;
  filename: string;
  type: 'image' | 'video';
}

/**
 * Realiza o download individual de um arquivo no navegador via Blob/URL segura.
 */
export async function downloadSingleFile(url: string, filename: string): Promise<boolean> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
    return true;
  } catch (err) {
    // Fallback: tenta navegação direta
    try {
      const fallbackLink = document.createElement('a');
      fallbackLink.href = url;
      fallbackLink.download = filename;
      fallbackLink.target = '_blank';
      fallbackLink.rel = 'noopener noreferrer';
      document.body.appendChild(fallbackLink);
      fallbackLink.click();
      document.body.removeChild(fallbackLink);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Realiza o download de todo o acervo do pack compilado em um único arquivo .ZIP
 */
export async function downloadAllAsZip({
  packTitle,
  photos,
  videos,
  onProgress,
}: {
  packTitle: string;
  photos: string[];
  videos: { title: string; url: string }[];
  onProgress?: (percent: number, statusText: string) => void;
}): Promise<void> {
  const zip = new JSZip();
  const folderName = (packTitle || 'nua-borges-conteudo')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_');

  const root = zip.folder(folderName) || zip;

  const validVideos = videos.filter((v) => Boolean(v.url));
  const total = photos.length + validVideos.length;
  let completed = 0;

  onProgress?.(0, 'Iniciando download dos arquivos...');

  // Baixa fotos
  for (let i = 0; i < photos.length; i++) {
    const photoUrl = photos[i];
    onProgress?.(
      Math.round((completed / total) * 90),
      `Baixando foto ${i + 1} de ${photos.length}...`
    );

    try {
      const res = await fetch(photoUrl);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const ext = photoUrl.split('.').pop()?.split('?')[0] || 'jpg';
        root.file(`foto_${String(i + 1).padStart(2, '0')}.${ext}`, buffer);
      }
    } catch (e) {
      console.warn('Erro ao embutir foto no ZIP:', e);
    }
    completed++;
  }

  // Baixa vídeos
  for (let v = 0; v < validVideos.length; v++) {
    const vid = validVideos[v];
    onProgress?.(
      Math.round((completed / total) * 90),
      `Baixando vídeo ${v + 1} de ${validVideos.length}...`
    );

    try {
      const res = await fetch(vid.url);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const ext = vid.url.split('.').pop()?.split('?')[0] || 'mp4';
        const cleanName = (vid.title || `video_${v + 1}`)
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9_-]/g, '_')
          .replace(/_+/g, '_');

        root.file(`${cleanName}.${ext}`, buffer);
      }
    } catch (e) {
      console.warn('Erro ao embutir vídeo no ZIP:', e);
    }
    completed++;
  }

  onProgress?.(92, 'Compactando arquivo ZIP...');

  const content = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    (metadata) => {
      const percent = 92 + Math.round((metadata.percent / 100) * 8);
      onProgress?.(percent, `Compactando: ${Math.round(metadata.percent)}%`);
    }
  );

  const zipUrl = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = zipUrl;
  a.download = `${folderName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(zipUrl);

  onProgress?.(100, 'Download concluído com sucesso!');
}
