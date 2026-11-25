import { getSupabaseClient, SupabaseEnv } from '../_supabaseClient';

type Context = { request: Request; env: SupabaseEnv };
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
    } | null;
    if (!body?.assetId || !body.claimToken) return json({ error: 'Reserva inválida.' }, 400);

    const supabase = getSupabaseClient(env);
    if (!supabase) return json({ error: 'Não foi possível cancelar o envio.' }, 503);

    const { data, error } = await supabase.rpc('fail_b2_media_asset', {
      p_asset_id: body.assetId,
      p_claim_token: body.claimToken,
      p_error_code: 'client_upload_failed',
    });
    if (error) {
      console.error('[MediaFail] Falha ao marcar reserva como interrompida:', error.message);
      return json({ error: 'Não foi possível cancelar o envio.' }, 503);
    }
    return json({ ok: data === true }, data === true ? 200 : 409);
  } catch (error) {
    console.error('[MediaFail] Erro inesperado:', error);
    return json({ error: 'Não foi possível cancelar o envio.' }, 500);
  }
};
