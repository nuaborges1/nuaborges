/**
 * Cloudflare Pages Function: /api/media/delete
 *
 * Verificação Segura de Dependências e Exclusão de Mídias:
 * - Anti-IDOR: validação de chaves e namespace
 * - Verificação obrigatória de dependência ativa no Supabase (site_content)
 * - Mídias em uso no site são estritamente BLOQUEADAS de exclusão
 * - Mídias órfãs (sem vínculos em packs, avulsos, galerias ou capas) podem ser removidas com segurança do Backblaze B2
 * - Auditoria completa registrada em log
 */

import { isValidObjectKey } from '../_security';
import { recordAuditEvent } from '../_auditHelper';
import { getSupabaseClient, SupabaseEnv } from '../_supabaseClient';
import { deleteMedia, MediaEnv } from '../_mediaStore';

type DeleteEnv = MediaEnv & SupabaseEnv;

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

const MAX_KEYS_PER_BATCH = 100;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

function normalizeMediaKey(value: string): string {
  if (!value) return '';
  let path = String(value).trim();
  try { if (/^https?:\/\//i.test(path)) path = new URL(path).pathname; } catch { /* ignore */ }
  try { path = decodeURIComponent(path.split('?')[0]).replace(/^\/+/, ''); } catch { /* ignore */ }
  const mediaIndex = path.indexOf('media/');
  const audioIndex = path.indexOf('audio/');
  if (mediaIndex >= 0) path = path.slice(mediaIndex);
  else if (audioIndex >= 0) path = path.slice(audioIndex);
  return path.includes('..') ? '' : path;
}

function findActiveUsagesInContent(
  content: any,
  includeLibrary = false,
  excludedMediaIds: Set<string> = new Set()
): Map<string, string[]> {
  const usageMap = new Map<string, string[]>();

  const recordUsage = (urlOrKey: string | undefined, description: string) => {
    if (!urlOrKey) return;
    const norm = normalizeMediaKey(urlOrKey);
    if (!norm) return;

    if (!usageMap.has(norm)) usageMap.set(norm, []);
    const list = usageMap.get(norm)!;
    if (!list.includes(description)) list.push(description);

    const dirMatch = norm.match(/^(media\/media-[^\/]+)/);
    if (dirMatch) {
      const parent = dirMatch[1];
      if (!usageMap.has(parent)) usageMap.set(parent, []);
      const pList = usageMap.get(parent)!;
      if (!pList.includes(description)) pList.push(description);
    }
  };

  if (!content || typeof content !== 'object') return usageMap;

  // Examine todas as áreas persistidas, inclusive seções adicionadas no futuro.
  // A biblioteca e os álbuns são metadados administrativos; removê-los não
  // significa que a mídia esteja publicada ou em uso por outra seção.
  const visit = (value: any, path: string[] = []) => {
    if (typeof value === 'string') {
      if (/(?:^|\/)media\//i.test(value) || /^media\//i.test(value)) {
        recordUsage(value, path.join('.') || 'Conteúdo');
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry, index) => visit(entry, [...path, String(index + 1)]));
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (path.length === 0 && key === 'albums') continue;
      if (path.length === 0 && key === 'library' && !includeLibrary) continue;
      if (path.length === 0 && key === 'library' && includeLibrary && Array.isArray(child)) {
        child
          .filter((item: any) => !item?.id || !excludedMediaIds.has(item.id))
          .forEach((item: any, index: number) => visit(item, ['library', String(index + 1)]));
        continue;
      }
      visit(child, [...path, key]);
    }
  };
  visit(content);

  return usageMap;
}

export const onRequestPost = async (context: PagesContext<DeleteEnv>) => {
  const { request, env } = context;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      keys?: string[];
      mediaIds?: string[];
    };
    const { keys } = body;
    const deletingMediaIds = new Set(
      Array.isArray(body.mediaIds) ? body.mediaIds.filter((id): id is string => typeof id === 'string') : []
    );

    // 1. Validação de estrutura
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return json({ error: 'Nenhuma chave fornecida para exclusão.' }, 400);
    }

    if (keys.length > MAX_KEYS_PER_BATCH) {
      return json({ error: `Limite de ${MAX_KEYS_PER_BATCH} chaves por requisição excedido.` }, 400);
    }

    // 2. Normaliza URLs e chaves (anti-IDOR)
    const normalized = keys
      .map((k) => (typeof k === 'string' ? normalizeMediaKey(k) : ''))
      .filter((k) => Boolean(k) && !k.includes('..'));

    // Separa chaves que residem no armazenamento B2
    const storageKeys = normalized.filter((k) => isValidObjectKey(k));
    if (storageKeys.length !== keys.length) {
      return json({ error: 'Uma ou mais chaves são inválidas ou estão fora do espaço de mídias permitido.' }, 400);
    }

    // Sem uma leitura íntegra das duas versões do conteúdo, não é seguro
    // presumir que os objetos estejam órfãos.
    const supabase = getSupabaseClient(env);
    if (!supabase) {
      return json({ error: 'Não foi possível confirmar o uso das mídias. Nenhum arquivo foi excluído.' }, 503);
    }

    // 3. Verificação de Dependência Ativa no Supabase
    let privResult;
    let pubResult;
    try {
      [privResult, pubResult] = await Promise.all([
        supabase
          .from('site_content')
          .select('content')
          .eq('key', 'private_admin_content')
          .maybeSingle(),
        supabase
          .from('site_content')
          .select('content')
          .eq('key', 'published_content')
          .maybeSingle(),
      ]);
    } catch (error) {
      console.error('[MediaDelete] Falha ao verificar referências no Supabase:', error);
      return json({ error: 'Não foi possível confirmar o uso das mídias. Nenhum arquivo foi excluído.' }, 503);
    }

    if (privResult.error || pubResult.error || !privResult.data?.content || !pubResult.data?.content) {
      console.error('[MediaDelete] Conteúdo ausente ou leitura incompleta; exclusão bloqueada.', {
        privateError: privResult.error?.message,
        publishedError: pubResult.error?.message,
      });
      return json({ error: 'Não foi possível confirmar o uso das mídias. Nenhum arquivo foi excluído.' }, 503);
    }

    const privUsages = findActiveUsagesInContent(privResult.data.content);
    const pubUsages = findActiveUsagesInContent(pubResult.data.content);
    const privLibraryUsages = findActiveUsagesInContent(privResult.data.content, true, deletingMediaIds);
    const pubLibraryUsages = findActiveUsagesInContent(pubResult.data.content, true, deletingMediaIds);
    const inUseDetails: Array<{ key: string; locations: string[] }> = [];

    for (const keyToDel of storageKeys) {
      const parentDir = keyToDel.match(/^(media\/media-[^\/]+)/)?.[1];
      const inUsePriv = privUsages.get(keyToDel) || (parentDir ? privUsages.get(parentDir) : null);
      const inUsePub = pubUsages.get(keyToDel) || (parentDir ? pubUsages.get(parentDir) : null);
      const libraryUsagePriv = privLibraryUsages.get(keyToDel) || (parentDir ? privLibraryUsages.get(parentDir) : null);
      const libraryUsagePub = pubLibraryUsages.get(keyToDel) || (parentDir ? pubLibraryUsages.get(parentDir) : null);
      const allUsages = Array.from(new Set([
        ...(inUsePriv || []),
        ...(inUsePub || []),
        ...(libraryUsagePriv || []),
        ...(libraryUsagePub || []),
      ]));
      if (allUsages.length > 0) {
        inUseDetails.push({ key: keyToDel, locations: allUsages });
      }
    }

    // A exclusão é atômica por lote: não apague parte do conjunto se algum
    // objeto ainda estiver referenciado.
    if (inUseDetails.length > 0) {
      return json({
        success: false,
        deleted: [],
        deletedCount: 0,
        failures: [],
        inUseDetails,
        error: 'Uma ou mais mídias ainda estão em uso. Nenhum arquivo foi excluído.',
      }, 409);
    }

    // Descubra os ativos afetados pelas variantes e bloqueie a deduplicação
    // enquanto a exclusão física ocorre. A chave-base costuma ser diferente
    // das chaves versionadas enviadas pelo navegador.
    const [variantLookup, baseAssetLookup] = await Promise.all([
      supabase.from('b2_media_variants').select('asset_id').in('storage_key', storageKeys),
      supabase.from('b2_media_assets').select('asset_id').in('storage_key', storageKeys),
    ]);
    if (variantLookup.error || baseAssetLookup.error) {
      console.error('[MediaDelete] Não foi possível localizar registros de deduplicação.', {
        variants: variantLookup.error?.message,
        assets: baseAssetLookup.error?.message,
      });
      return json({ error: 'Não foi possível preparar a exclusão com segurança. Nenhum arquivo foi excluído.' }, 503);
    }
    const affectedAssetIds = Array.from(new Set([
      ...(variantLookup.data || []).map((row: any) => row.asset_id).filter(Boolean),
      ...(baseAssetLookup.data || []).map((row: any) => row.asset_id).filter(Boolean),
    ]));
    if (affectedAssetIds.length > 0) {
      const lockResult = await supabase
        .from('b2_media_assets')
        .update({ status: 'quarantined', claim_token: null, claim_expires_at: null, updated_at: new Date().toISOString() })
        .in('asset_id', affectedAssetIds);
      if (lockResult.error) {
        console.error('[MediaDelete] Não foi possível bloquear a deduplicação antes da exclusão:', lockResult.error.message);
        return json({ error: 'Não foi possível preparar a exclusão com segurança. Nenhum arquivo foi excluído.' }, 503);
      }
    }

    // 4. Executa exclusão física real no Backblaze B2
    const deleteResult = await deleteMedia(env, storageKeys);
    if (deleteResult.failures.length > 0 || deleteResult.deleted.length !== storageKeys.length) {
      if (deleteResult.deleted.length > 0) {
        const [variantRelease, quarantineRelease] = await Promise.all([
          supabase.from('b2_media_variants').delete().in('storage_key', deleteResult.deleted),
          supabase.from('b2_media_quarantine').delete().in('object_key', deleteResult.deleted),
        ]);
        if (variantRelease.error || quarantineRelease.error) {
          console.error('[MediaDelete] Falha ao limpar referências dos objetos já excluídos.', {
            variants: variantRelease.error?.message,
            quarantine: quarantineRelease.error?.message,
          });
        }
      }
      if (affectedAssetIds.length > 0) {
        const releaseResult = await supabase
          .from('b2_media_assets')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .in('asset_id', affectedAssetIds);
        if (releaseResult.error) console.error('[MediaDelete] Não foi possível liberar a reserva após falha física:', releaseResult.error.message);
      }
      return json({
        success: false,
        deleted: deleteResult.deleted,
        deletedCount: deleteResult.deleted.length,
        failures: deleteResult.failures,
        inUseDetails: [],
        error: 'Não foi possível confirmar a exclusão de todos os arquivos.',
      }, 502);
    }

    // 5. Invalida variantes e mantém a identidade SHA como falha. Um upload
    // futuro poderá reenviar o arquivo sem reutilizar URLs já apagadas.
    const [variantCleanup, quarantineCleanup, assetCleanup] = await Promise.all([
      supabase.from('b2_media_variants').delete().in('storage_key', storageKeys),
      supabase.from('b2_media_quarantine').delete().in('object_key', storageKeys),
      affectedAssetIds.length > 0
        ? supabase
            .from('b2_media_assets')
            .update({ status: 'failed', claim_token: null, claim_expires_at: null, updated_at: new Date().toISOString() })
            .in('asset_id', affectedAssetIds)
        : Promise.resolve({ error: null }),
    ]);
    if (variantCleanup.error || quarantineCleanup.error || assetCleanup.error) {
      console.error('[MediaDelete] Falha ao invalidar índices após exclusão física.', {
        variants: variantCleanup.error?.message,
        quarantine: quarantineCleanup.error?.message,
        assets: assetCleanup.error?.message,
      });
      return json({
        success: false,
        deleted: deleteResult.deleted,
        deletedCount: deleteResult.deleted.length,
        failures: [{ key: '', code: 'MEDIA_INDEX_CLEANUP_FAILED', message: 'O arquivo foi apagado, mas o índice precisa de reconciliação.' }],
        inUseDetails: [],
        error: 'O arquivo foi apagado, mas não foi possível atualizar o índice de mídias. Atualize a biblioteca antes de tentar novamente.',
      }, 502);
    }

    // Registra evento de auditoria
    await recordAuditEvent(env, request, {
      type: 'MEDIA_DELETE',
      severity: 'warning',
      summary: `Exclusão de ${deleteResult.deleted.length} arquivo(s): ${deleteResult.deleted.slice(0, 3).join(', ')}${deleteResult.deleted.length > 3 ? '...' : ''}`,
      details: {
        deletedKeys: deleteResult.deleted,
        failures: deleteResult.failures,
        inUseDetails,
        timestamp: new Date().toISOString(),
      },
    });

    return json(
      {
        success: true,
        deleted: deleteResult.deleted,
        deletedCount: deleteResult.deleted.length,
        failures: deleteResult.failures,
        inUseDetails,
      },
      200
    );
  } catch (err: any) {
    console.error('[MediaDelete] Erro inesperado:', err);
    return json({ error: 'Erro interno ao processar a exclusão segura de mídia.' }, 500);
  }
};

export const onRequestOptions = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Master-Key',
    },
  });

export const onRequest = async (context: PagesContext<DeleteEnv>) => {
  if (context.request.method === 'OPTIONS') {
    return onRequestOptions();
  }
  return onRequestPost(context);
};
