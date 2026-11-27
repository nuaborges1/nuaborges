import { getSupabaseClient, SupabaseEnv } from '../_supabaseClient';
import { ALLOWED_MIME_TYPES } from '../_security';

import { headMedia, isMediaStorageConfigured, listMediaObjects, type MediaEnv } from '../_mediaStore';
import { recoverStoredMedia } from '../_mediaRecovery.mjs';

type Env = SupabaseEnv & MediaEnv;
type Context = { request: Request; env: Env };

const json = (body: unknown, status: number, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extraHeaders },
  });

export const onRequestPost = (context: Context) => claimMedia(context);

async function claimMedia({ request, env }: Context, allowIndexReset = true): Promise<Response> {
  const body = (await request.json().catch(() => null)) as {
    sha256?: string;
    accessScope?: string;
    mimeType?: string;
    sizeBytes?: number;
    originalName?: string;
    processingVersion?: string;
  } | null;

  const sha256 = typeof body?.sha256 === 'string' ? body.sha256.toLowerCase() : '';
  const accessScope = body?.accessScope || 'public';
  const mimeType = body?.mimeType || '';
  const sizeBytes = Number(body?.sizeBytes);

  if (!/^[0-9a-f]{64}$/.test(sha256)) return json({ error: 'Impressão digital de mídia inválida.' }, 400);
  if (accessScope !== 'public' && accessScope !== 'private') return json({ error: 'Destino da mídia inválido.' }, 400);
  if (!ALLOWED_MIME_TYPES.includes(mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
    return json({ error: 'Formato de mídia não permitido.' }, 415);
  }
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > 500 * 1024 * 1024) {
    return json({ error: 'Tamanho de arquivo inválido ou acima do limite.' }, 413);
  }

  const claimToken = crypto.randomUUID();
  const storageKey = `media/objects/${accessScope}/${sha256}`;
  const originalName = String(body?.originalName || '').replace(/[\\/\u0000-\u001f]/g, '').slice(0, 255);
  const processingVersion = String(body?.processingVersion || 'v1').slice(0, 255);

  const supabase = getSupabaseClient(env);
  let reservation: { assetId: string; claimToken: string; storageKey: string } | null = null;
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('claim_b2_media_asset', {
        p_sha256: sha256,
        p_access_scope: accessScope,
        p_storage_key: storageKey,
        p_mime_type: mimeType,
        p_size_bytes: sizeBytes,
        p_claim_token: claimToken,
        p_original_name: originalName,
        p_processing_version: processingVersion,
      });

      if (!error && data && typeof data === 'object') {
        const claim = data as Record<string, any>;
        if (claim.shouldUpload === false && claim.mediaItem) {
          const indexed = claim.mediaItem;
          if (!isMediaStorageConfigured(env)) return json({ reused: true, mediaItem: { ...indexed, reused: true } }, 200);
          // A physical purge can leave a stale ready row in the optional index.
          const keys = [...new Set<string>([indexed.objectKey, ...Object.values(indexed.variants || {}).map((v: any) => v?.key)])];
          const valid = keys.every(key => typeof key === 'string' && key.startsWith(`${storageKey}/`));
          let heads;
          try {
            heads = valid ? await Promise.all(keys.map(key => headMedia(env, key))) : [];
          } catch {
            return json({ error: 'Não foi possível verificar a mídia no armazenamento. Tente novamente.' }, 503);
          }
          if (heads.length > 0 && heads.every(head => head && head.size > 0)) {
            return json({ reused: true, mediaItem: { ...indexed, reused: true } }, 200);
          }
          if (!allowIndexReset || !claim.assetId) return json({ error: 'O índice da mídia mudou. Tente novamente.' }, 409);
          const reset = await supabase.from('b2_media_assets').update({ status: 'failed' })
            .eq('asset_id', claim.assetId).eq('status', 'ready').select('asset_id');
          if (reset.error || !reset.data?.length) return json({ error: 'O índice da mídia mudou. Tente novamente.' }, 409);
          return claimMedia({ request: new Request(request.url, { method: 'POST', body: JSON.stringify(body) }), env }, false);
        }
        if (claim.shouldUpload === false && claim.status === 'uploading') {
          return json(
            { error: 'Este arquivo já está sendo enviado. Aguarde um instante e tente novamente.', retryAfterSeconds: claim.retryAfterSeconds || 5 },
            409,
            { 'Retry-After': String(claim.retryAfterSeconds || 5) }
          );
        }
        if (claim.assetId && claim.claimToken && claim.storageKey) {
          reservation = { assetId: claim.assetId, storageKey, claimToken: claim.claimToken };
        }
      } else if (error) {
        console.warn('[MediaClaim] RPC de deduplicação não disponível no banco, usando reserva direta:', error.message);
      }
    } catch (error) {
      console.warn('[MediaClaim] Falha na consulta de deduplicação, usando reserva direta:', error);
    }
  }

  if (isMediaStorageConfigured(env)) {
    const release = async () => {
      if (!reservation || !supabase) return;
      try {
        await supabase.rpc('fail_b2_media_asset', {
          p_asset_id: reservation.assetId, p_claim_token: reservation.claimToken, p_error_code: 'storage_reconciliation_failed',
        });
      } catch {
        console.warn('[MediaClaim] Não foi possível liberar a reserva da mídia.');
      }
    };

    try {
      const mediaItem = await recoverStoredMedia(
        (options: { prefix: string; limit: number }) => listMediaObjects(env, options),
        (key: string) => headMedia(env, key),
        { storageKey, mimeType, originalName, sizeBytes, processingVersion, assetId: reservation?.assetId }
      );
      if (mediaItem) {
        if (reservation && supabase) {
          try {
            const { data, error } = await supabase.rpc('complete_b2_media_asset', {
              p_asset_id: reservation.assetId,
              p_claim_token: reservation.claimToken,
              p_media_item: mediaItem,
              p_variants: Object.entries(mediaItem.variants).map(([name, variant]: [string, any]) => ({
                name, transformKey: variant.key, key: variant.key, mimeType: variant.mimeType, sizeBytes: variant.sizeBytes,
              })),
            });
            if (error || data === false) await release();
          } catch {
            await release();
          }
        }
        return json({ reused: true, mediaItem: { ...mediaItem, reused: true } }, 200);
      }
    } catch {
      await release();
      return json({ error: 'Não foi possível verificar o arquivo no armazenamento. Tente novamente.' }, 503);
    }
  }

  if (reservation) return json({ ...reservation, reused: false, shouldUpload: true }, 200);
  const assetId = crypto.randomUUID();
  return json({
    reused: false,
    assetId,
    storageKey,
    claimToken,
    shouldUpload: true,
  }, 200);
};
