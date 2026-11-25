import { getSupabaseClient, SupabaseEnv } from '../_supabaseClient';
import { deleteMedia, getMedia, headMedia, isMediaStorageConfigured, MediaEnv } from '../_mediaStore';
import { verifyMagicBytes } from '../../../lib/security';

type Context = { request: Request; env: SupabaseEnv & MediaEnv };
const MAX_PRESIGN_BYTES = 250 * 1024 * 1024; // 250 MB

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export const onRequestPost = async ({ request, env }: Context) => {
  try {
    const body = (await request.json().catch(() => null)) as {
      assetId?: string;
      claimToken?: string;
      mediaItem?: Record<string, any>;
    } | null;

    if (!body?.assetId || !body.claimToken || !body.mediaItem || typeof body.mediaItem !== 'object') {
      return json({ error: 'Dados incompletos para concluir o envio.' }, 400);
    }

    const variants = Object.entries(body.mediaItem.variants || {}).map(([name, value]: [string, any]) => ({
      name,
      transformKey: String(value?.transformKey || `${name}:v1`),
      key: String(value?.key || ''),
      mimeType: String(value?.mimeType || 'application/octet-stream'),
      sizeBytes: Math.max(0, Number(value?.sizeBytes) || 0),
    })).filter((variant) => Boolean(variant.key));

    // NUA-AUD-014: valida tamanho real + Magic Bytes dos objetos enviados via presign direto no B2
    if (isMediaStorageConfigured(env)) {
      const primaryKey = String(body.mediaItem.objectKey || body.mediaItem.storageKey || '').trim();
      const primaryMime = String(body.mediaItem.mimeType || '').trim();
      const targets = [
        ...(primaryKey ? [{ key: primaryKey, mimeType: primaryMime }] : []),
        ...variants.map((v) => ({ key: v.key, mimeType: v.mimeType })),
      ];

      for (const target of targets) {
        if (!target.key) continue;
        const head = await headMedia(env, target.key).catch(() => null);
        if (!head) {
          return json({ error: 'Arquivo não encontrado no armazenamento após o envio.' }, 400);
        }
        if (head.size > MAX_PRESIGN_BYTES) {
          await deleteMedia(env, [target.key]).catch(() => {});
          return json({ error: 'Arquivo excede o limite máximo permitido (250 MB).' }, 413);
        }
        const effectiveMime = target.mimeType && target.mimeType !== 'application/octet-stream'
          ? target.mimeType
          : head.contentType;
        if (effectiveMime && (effectiveMime.startsWith('image/') || effectiveMime.startsWith('video/'))) {
          const sample = await getMedia(env, target.key, 'bytes=0-31').catch(() => null);
          if (sample?.body) {
            const buf = new Uint8Array(await new Response(sample.body).arrayBuffer());
            const check = verifyMagicBytes(buf);
            const declaredFamily = effectiveMime.split('/')[0];
            const detectedFamily = (check.detectedMime || '').split('/')[0];
            if (!check.valid || (declaredFamily && detectedFamily && declaredFamily !== detectedFamily)) {
              await deleteMedia(env, [target.key]).catch(() => {});
              return json(
                { error: 'Conteúdo real do arquivo não corresponde ao tipo de mídia permitido.' },
                415
              );
            }
          }
        }
      }
    }

    const supabase = getSupabaseClient(env);
    if (supabase) {
      try {
        const { data, error } = await supabase.rpc('complete_b2_media_asset', {
          p_asset_id: body.assetId,
          p_claim_token: body.claimToken,
          p_media_item: body.mediaItem,
          p_variants: variants,
        });

        if (error) {
          console.warn('[MediaComplete] RPC opcional não disponível no banco:', error.message);
        } else if (data === false) {
          return json({ error: 'O envio expirou. Tente enviar o arquivo novamente.' }, 409);
        }
      } catch (rpcErr) {
        console.warn('[MediaComplete] Falha ao registrar no índice:', rpcErr);
      }
    }

    return json({ ok: true }, 200);
  } catch (error) {
    console.error('[MediaComplete] Erro inesperado:', error);
    return json({ error: 'Não foi possível concluir o envio. Tente novamente.' }, 500);
  }
};
