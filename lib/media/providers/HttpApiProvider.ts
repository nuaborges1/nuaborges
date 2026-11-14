/**
 * HTTP API Storage Provider (Client-Safe)
 *
 * Implements MediaStorageProvider for browser environments.
 * It NEVER requires or exposes storage credentials on the client.
 * Instead, it delegates authentication and upload URLs to the edge endpoints
 * (/api/media/presign or /api/media/upload).
 */

import { MediaStorageProvider, PresignedUploadResult } from '../types';
import { resolveMediaUrl } from '../urlResolver';
import { getPublicApiUrl, getStoredSessionToken } from '../../sessionToken';

/**
 * Erro lançado quando o backend sinaliza que NÃO existe backend de armazenamento
 * configurado (o único caso em que o fallback local temporário faz sentido).
 * Qualquer outro erro (validação, rede, limite) NÃO é falha de configuração e
 * deve propagar para a usuária em vez de ser mascarado.
 */
export class StorageNotConfiguredError extends Error {
  public readonly code = 'storage-not-configured';
  constructor(message = 'Armazenamento de mídia não configurado.') {
    super(message);
    this.name = 'StorageNotConfiguredError';
  }
}

export class HttpApiProvider implements MediaStorageProvider {
  public readonly name = 'http-media-api';
  // Sem URL assinada disponível: após o primeiro resposta vazia/501 pulamos direto para /upload
  private static presignUnavailable = false;

  public isConfigured(): boolean {
    // Available in browser whenever running
    return typeof window !== 'undefined';
  }

  public getUrl(key: string): string {
    return resolveMediaUrl(key);
  }

  public async upload(
    data: Blob | ArrayBuffer | Uint8Array,
    key: string,
    mimeType: string,
    metadata?: Record<string, string>
  ): Promise<{ key: string; url: string; sizeBytes: number }> {
    const blob = data instanceof Blob ? data : new Blob([data as any], { type: mimeType });
    const sizeBytes = blob.size;
    const apiUrl = getPublicApiUrl();
    const token = getStoredSessionToken();

    // Strategy 1: Try Presigned URL direct PUT (fastest, zero edge memory load)
    if (!HttpApiProvider.presignUnavailable) {
      try {
        const presignRes = await fetch(`${apiUrl}/api/media/presign`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ key, mimeType }),
        });

        if (presignRes.status === 501) {
          HttpApiProvider.presignUnavailable = true;
        }

        if (presignRes.ok) {
          const presignData = (await presignRes.json().catch(() => ({}))) as PresignedUploadResult & {
            reason?: string;
          };
          const { uploadUrl, publicUrl } = presignData;

          // Contrato explícito do endpoint: sem uploadUrl => presign indisponível.
          // Marca o estado para não refazer a chamada a cada variante de imagem.
          if (!uploadUrl) {
            HttpApiProvider.presignUnavailable = true;
          } else {
            const putRes = await fetch(uploadUrl, {
              method: 'PUT',
              body: blob,
              headers: { 'Content-Type': mimeType },
            });

            if (putRes.ok) {
              return {
                key,
                url: publicUrl || resolveMediaUrl(key),
                sizeBytes,
              };
            }
          }
        } else if (presignRes.status === 404 || presignRes.status === 405) {
          // Rota inexistente é permanente: não adianta insistir no presign.
          HttpApiProvider.presignUnavailable = true;
        }
      } catch {
        // Fall through to direct upload endpoint
      }
    }

    // Strategy 2: Direct upload endpoint with automatic retry on 429 rate limit.
    // Repetimos APENAS 429 (transiente) e falhas de rede; qualquer 4xx é permanente.
    let attempts = 0;
    const maxAttempts = 3;
    let lastError = '';

    while (attempts < maxAttempts) {
      attempts++;

      let uploadRes: Response;
      try {
        uploadRes = await fetch(`${apiUrl}/api/media/upload`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': mimeType,
            'X-Object-Key': key,
            'X-Mime-Type': mimeType,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: blob,
        });
      } catch (networkErr) {
        // Falha de rede é transitória: permite nova tentativa dentro do limite.
        lastError = 'Falha de rede ao enviar o arquivo.';
        if (attempts >= maxAttempts) break;
        continue;
      }

      if (uploadRes.status === 429 && attempts < maxAttempts) {
        // Aguarda 1.5s * tentativa antes de tentar novamente para contornar o rate limit
        await new Promise((r) => setTimeout(r, 1500 * attempts));
        continue;
      }

      if (uploadRes.status === 404 || uploadRes.status === 405) {
        throw new Error('O serviço de upload não está disponível neste ambiente.');
      }

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        if ((errData as any)?.code === 'storage_not_configured' || uploadRes.status === 503) {
          throw new StorageNotConfiguredError();
        }
        lastError = errData.error || `Falha no upload (${uploadRes.status})`;
        throw new Error(lastError);
      }

      const resJson = await uploadRes.json().catch(() => ({}));
      return {
        key,
        url: resJson.url || resolveMediaUrl(key),
        sizeBytes,
      };
    }

    throw new Error(lastError || 'Limite de uploads temporariamente atingido. Tente em instantes.');
  }

  public async delete(key: string): Promise<boolean> {
    try {
      const apiUrl = getPublicApiUrl();
      const token = getStoredSessionToken();
      const res = await fetch(`${apiUrl}/api/media/delete`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ keys: [key] }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async deleteMany(keys: string[]): Promise<boolean> {
    try {
      const apiUrl = getPublicApiUrl();
      const token = getStoredSessionToken();
      const res = await fetch(`${apiUrl}/api/media/delete`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ keys }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
