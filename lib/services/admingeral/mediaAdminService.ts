/**
 * Serviço de Mídia — Central phdev (Admin Geral)
 * Responsável pela listagem e exclusão de arquivos de mídia em R2/KV
 */

import type { MediaItem } from '@/lib/admingeral/types';

export async function listAllMediaAdmin(
  fetchFromApi: (path: string, options?: RequestInit) => Promise<Response>,
  limit: number = 60
): Promise<MediaItem[]> {
  try {
    const res = await fetchFromApi(`/api/media/list?limit=${limit}`);
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data.items) ? data.items : [];
    }
  } catch (err) {
    console.warn('[mediaAdminService] Erro ao listar mídias:', err);
  }
  return [];
}

export async function deleteMediaAdmin(
  fetchFromApi: (path: string, options?: RequestInit) => Promise<Response>,
  key: string
): Promise<boolean> {
  try {
    const res = await fetchFromApi('/api/media/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
