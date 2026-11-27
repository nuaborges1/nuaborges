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
import { sha256File } from '../sha256File';

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
  ): Promise<{ key: string; url: string; sizeBytes: number; sha256?: string }> {
    const blob = data instanceof Blob ? data : new Blob([data as any], { type: mimeType });
    const sizeBytes = blob.size;
    const objectSha256 = await sha256File(blob);
    const resultUrl = key.split('/').includes('private') ? resolveMediaUrl(key) : undefined;
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
          body: JSON.stringify({ key, mimeType, sizeBytes, objectSha256 }),
        });

        if (presignRes.status === 501) {
          HttpApiProvider.presignUnavailable = true;
        }

        if (presignRes.ok) {
          const presignData = (await presignRes.json().catch(() => ({}))) as PresignedUploadResult & {
            reason?: string;
          };
          const { uploadUrl, publicUrl, cacheControl, alreadyExists } = presignData as typeof presignData & { alreadyExists?: boolean };
          if (alreadyExists) return { key, url: resultUrl || publicUrl || resolveMediaUrl(key), sizeBytes, sha256: objectSha256 };

          // Um arquivo pequeno pode usar o proxy, enquanto um vídeo maior ainda precisa de presign.
          if (uploadUrl) {
            try {
              const putRes = await fetch(uploadUrl, {
                method: 'PUT',
                body: blob,
                headers: {
                  'Content-Type': mimeType,
                  ...(cacheControl ? { 'Cache-Control': cacheControl } : {}),
                  'x-amz-meta-sha256': objectSha256,
                },
              });

              if (putRes.ok) {
                return {
                  key,
                  url: resultUrl || publicUrl || resolveMediaUrl(key),
                  sizeBytes,
                  sha256: objectSha256,
                };
              } else {
                // Falha de PUT no bucket (ex: assinatura ou permissão) -> desativa presign
                HttpApiProvider.presignUnavailable = true;
              }
            } catch (putErr) {
              // Bloqueio de CORS do navegador no preflight do S3/B2 -> desativa presign imediatamente
              HttpApiProvider.presignUnavailable = true;
            }
          }
        } else if (presignRes.status === 404 || presignRes.status === 405) {
          // Rota inexistente é permanente: não adianta insistir no presign.
          HttpApiProvider.presignUnavailable = true;
        }
      } catch {
        // Fall through to direct upload endpoint
        HttpApiProvider.presignUnavailable = true;
      }
    }

    // Never send a large video through Pages Functions: their request body is
    // buffered by this legacy proxy path. Large uploads require a working B2 PUT.
    if (sizeBytes > 25 * 1024 * 1024) {
      throw new Error('O envio direto ao armazenamento não ficou disponível para este vídeo grande. Verifique a conexão CORS do bucket e tente novamente.');
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
            'X-Object-SHA256': objectSha256,
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
        if (errData?.code === 'storage_not_configured') {
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
        sha256: objectSha256,
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

  public async deleteMany(keys: string[], mediaIds: string[] = []): Promise<boolean> {
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
        body: JSON.stringify({ keys, mediaIds }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
