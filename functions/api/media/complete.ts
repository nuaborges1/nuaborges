import { getSupabaseClient, SupabaseEnv } from '../_supabaseClient';
import { MediaEnv } from '../_mediaStore';

type Context = { request: Request; env: SupabaseEnv & MediaEnv };
const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export const onRequestPost = async ({ env }: Context) => {
  try {
    const body = (await request.json().catch(() => null)) as {
      assetId?: string;
      claimToken?: string;
      mediaItem?: Record<string, any>;
    } | null;

    if (!body?.assetId || !body.claimToken || !body.mediaItem || typeof body.mediaItem !== 'object') {
      return json({ error: 'Dados de conclusão do upload incompletos.' }, 400);
    }

    const supabase = getSupabaseClient(env);
    if (!supabase) return json({ error: 'Não foi possível registrar a conclusão do upload.' }, 503);

    const variants = Object.entries(body.mediaItem.variants || {}).map(([name, value]: [string, any]) => ({
      name,
      transformKey: String(value?.transformKey || `${name}:v1`),
      key: String(value?.key || ''),
      mimeType: String(value?.mimeType || 'application/octet-stream'),
      sizeBytes: Math.max(0, Number(value?.sizeBytes) || 0),
    })).filter((variant) => Boolean(variant.key));

    const { data, error } = await supabase.rpc('complete_b2_media_asset', {
      p_asset_id: body.assetId,
      p_claim_token: body.claimToken,
      p_media_item: body.mediaItem,
      p_variants: variants,
    });

    if (error) {
      console.error('[MediaComplete] Falha ao concluir reserva:', error.message);
      return json({ error: 'Não foi possível confirmar o registro da mídia.' }, 503);
    }
    if (data !== true) return json({ error: 'A reserva do upload expirou ou não pertence a esta sessão.' }, 409);

    return json({ ok: true }, 200);
  } catch (error) {
    console.error('[MediaComplete] Erro inesperado:', error);
    return json({ error: 'Erro ao registrar a conclusão do upload.' }, 500);
  }
};
