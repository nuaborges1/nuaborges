/**
 * Cloudflare Pages Function: /api/content/sync
 *
 * Sincronização e Backup de Conteúdo:
 * 1. Fonte Oficial e Master Database: Supabase PostgreSQL (Tabelas site_content e content_backups)
 */

import { recordAuditEvent } from '../_auditHelper';
import { isHostAllowedForSurface } from '../_central/hostGuard';
import { isProductionEnv } from '../_central/secrets';
import { parseAndVerifySessionToken, getSessionCookie, resolveAdminOperator } from '../_authHelper';
import { getSupabaseClient, isSupabaseConfigured } from '../_supabaseClient';
import { isPublicPack, packPurchasePrice } from '../../../lib/publicCatalog';
import { privatePath, packVaultFiles } from '../../../lib/media/vaultPath';
import { guardPurchasedPackChanges } from './_purchasedPacks';

interface Env {
  ADMIN_PASSWORD?: string;
  ADMIN_API_SECRET?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  [key: string]: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

const KV_PUBLIC_CONTENT_KEY = 'published_content';
const KV_PRIVATE_CONTENT_KEY = 'private_admin_content';

/**
 * Verifica se a referência de mídia usa um dos caminhos protegidos do Cofre.
 */
export function isPrivateVaultMediaUrl(raw: unknown): boolean {
  return Boolean(privatePath(raw));
}

export function findNewlyAddedPublicVaultMedia(
  incomingItems: any[],
  existingItems: any[] = []
): Array<{ packSlug: string; url: string; field: string }> {
  const existingByKey = new Map<string, any>();
  for (const item of existingItems || []) {
    if (!item || typeof item !== 'object') continue;
    const idKey = String(item.id || '').trim().toLowerCase();
    const slugKey = String(item.slug || '').trim().toLowerCase();
    if (idKey) existingByKey.set(idKey, item);
    if (slugKey) existingByKey.set(slugKey, item);
  }

  const violations: Array<{ packSlug: string; url: string; field: string }> = [];
  for (const item of incomingItems || []) {
    if (!item || typeof item !== 'object') continue;
    const idKey = String(item.id || '').trim().toLowerCase();
    const slugKey = String(item.slug || '').trim().toLowerCase();
    const existing = existingByKey.get(idKey) || existingByKey.get(slugKey);
    const existingPhotos = new Set<string>(
      Array.isArray(existing?.exclusivePhotos) ? existing.exclusivePhotos.map((u: any) => String(u || '').trim()) : []
    );
    const existingVideoUrls = new Set<string>(
      Array.isArray(existing?.videos) ? existing.videos.map((v: any) => String(v?.url || '').trim()) : []
    );
    const packLabel = String(item.slug || item.id || item.title || 'pack');

    for (const photo of Array.isArray(item.exclusivePhotos) ? item.exclusivePhotos : []) {
      const url = String(photo || '').trim();
      if (!url || existingPhotos.has(url)) continue;
      if (!isPrivateVaultMediaUrl(url)) {
        violations.push({ packSlug: packLabel, url, field: 'exclusivePhotos' });
      }
    }
    for (const vid of Array.isArray(item.videos) ? item.videos : []) {
      const url = String(vid?.url || '').trim();
      if (!url || existingVideoUrls.has(url)) continue;
      if (!isPrivateVaultMediaUrl(url)) {
        violations.push({ packSlug: packLabel, url, field: 'videos' });
      }
    }
    // NUA-AUD-012: inspeciona também protectedMedia, privateFiles e files
    for (const extraField of ['protectedMedia', 'privateFiles', 'files'] as const) {
      const arr = Array.isArray(item[extraField]) ? item[extraField] : [];
      for (const entry of arr) {
        const url = String(typeof entry === 'string' ? entry : entry?.url || entry?.originalUrl || '').trim();
        if (!url) continue;
        if (!isPrivateVaultMediaUrl(url)) {
          violations.push({ packSlug: packLabel, url, field: extraField });
        }
      }
    }
  }
  return violations;
}

export function sanitizeForPublicSite(rawContent: any): any {
  if (!rawContent || typeof rawContent !== 'object') return rawContent;
  const { library, albums, ...publicFields } = rawContent;

  const publicGallery = publicFields.gallery
    ? {
        ...publicFields.gallery,
        photos: Array.isArray(publicFields.gallery.photos)
          ? publicFields.gallery.photos.filter(
              (p: any) => p && p.active !== false && !p.isPendingPublish
            )
          : [],
      }
    : undefined;

  const publicAvulsos = publicFields.avulsos
    ? {
        ...publicFields.avulsos,
        items: Array.isArray(publicFields.avulsos.items)
          ? publicFields.avulsos.items
              // Itens com modality='avulso' ficam fora da vitrine pública (alinhado a lib/publicCatalog.ts e create-pix).
              .filter((item: any) => item && item.active !== false && !item.isDraft && item.modality !== 'avulso')
              .map((item: any) => {
                const slug = (item.slug || item.id || '').trim().replace(/^\/avulsos\//, '').replace(/^\/+/, '');
                const rawExclusive = Array.isArray(item.exclusivePhotos) ? item.exclusivePhotos : [];
                const rawVideos = Array.isArray(item.videos) ? item.videos : [];
                const safeVideos = rawVideos.map((v: any, idx: number) => ({
                  id: v?.id || `vid-${idx + 1}`,
                  title: v?.title || `Vídeo ${idx + 1}`,
                  duration: v?.duration || undefined,
                  posterUrl:
                    typeof v?.posterUrl === 'string' && !v.posterUrl.includes('/private/')
                      ? v.posterUrl
                      : undefined,
                  url: '',
                }));
                const {
                  protectedMedia: _pm,
                  privateFiles: _pf,
                  files: _f,
                  ...restItem
                } = item;
                return {
                  ...restItem,
                  modality: item.modality || 'pack',
                  isDraft: false,
                  slug,
                  checkoutUrl: item.checkoutUrl || `/avulsos/${slug}`,
                  exclusivePhotos: [],
                  exclusivePhotosCount: rawExclusive.length,
                  videos: safeVideos,
                  videosCount: rawVideos.length,
                };
              })
          : [],
      }
    : undefined;

  return {
    ...publicFields,
    ...(publicGallery ? { gallery: publicGallery } : {}),
    ...(publicAvulsos ? { avulsos: publicAvulsos } : {}),
    library: [],
    albums: [],
  };
}

export const onRequestGet = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const authHeader = request.headers.get('Authorization');
    const sessionCookie = getSessionCookie(request);
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : sessionCookie;
    const { getAdminSessionSecret } = await import('../_central/secrets');
    const { parseAndVerifyActiveAdminSession } = await import('../_central/adminSessions');
    const secret = getAdminSessionSecret(env);

    const sessionPayload = await parseAndVerifyActiveAdminSession(env as any, token, secret, ['admin', 'dev', 'client']);
    const isAuth = Boolean(sessionPayload && resolveAdminOperator(sessionPayload) === 'nua');
    const wantsAdmin = url.searchParams.get('mode') === 'admin';

    if (wantsAdmin && (!isAuth || !isHostAllowedForSurface(url, 'admin', isProductionEnv(env), env))) {
      return new Response(
        JSON.stringify({ error: 'Você precisa entrar no painel para acessar estes dados.' }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'private, no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    // 1. Fonte Oficial e Única: Supabase PostgreSQL
    if (isSupabaseConfigured(env)) {
      const supabase = getSupabaseClient(env);
      if (supabase) {
        try {
          const targetKey = isAuth && wantsAdmin ? KV_PRIVATE_CONTENT_KEY : KV_PUBLIC_CONTENT_KEY;
          const { data, error } = await supabase
            .from('site_content')
            .select('content, updated_at, version')
            .eq('key', targetKey)
            .maybeSingle();

          if (data?.content && typeof data.content === 'object') {
            const finalPayload = isAuth && wantsAdmin ? data.content : sanitizeForPublicSite(data.content);
              if (!wantsAdmin && Array.isArray(finalPayload.avulsos?.items)) {
                finalPayload.avulsos.items = finalPayload.avulsos.active === false
                  ? []
                  : finalPayload.avulsos.items.filter(isPublicPack);
              }
            if (!finalPayload._updatedAt && data.updated_at) {
              finalPayload._updatedAt = data.updated_at;
            }
            if (!finalPayload._version && data.version) {
              finalPayload._version = data.version;
            }
            return new Response(JSON.stringify(finalPayload), {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control':
                  isAuth && wantsAdmin
                    ? 'private, no-store, no-cache, must-revalidate'
                    : 'public, max-age=0, s-maxage=10, must-revalidate',
              },
            });
          }
        } catch (supabaseErr) {
          console.warn('[ContentSync] Supabase read error:', supabaseErr);
        }
      }
    }



    return new Response(JSON.stringify({ exists: false, content: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[ContentSync] Falha ao recuperar conteúdo:', err);
    return new Response(
      JSON.stringify({ error: 'Não foi possível carregar o conteúdo do site. Tente novamente em instantes.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 50 * 1024 * 1024) {
    return new Response(
      JSON.stringify({ error: 'O conteúdo ultrapassa o limite máximo de 50 MB.' }),
      { status: 413, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    if (!body || !body.content || typeof body.content !== 'object') {
      // Se não houver body.content explícito, tenta aceitar o próprio body como content
      if (body && typeof body === 'object' && Object.keys(body).length > 0 && !body.error) {
        body = { content: body };
      } else {
        return new Response(
          JSON.stringify({ error: 'Conteúdo inválido fornecido para publicação.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    let existingContent: any = null;
    let existingPublicContent: any = null;

    // Obtém conteúdo atual do Supabase PostgreSQL
    if (isSupabaseConfigured(env)) {
      const supabase = getSupabaseClient(env);
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('site_content')
            .select('key, content, updated_at, version')
            .in('key', [KV_PRIVATE_CONTENT_KEY, KV_PUBLIC_CONTENT_KEY]);
          if (error) throw error;
          if (Array.isArray(data)) {
            for (const row of data) {
              if (row.key === KV_PRIVATE_CONTENT_KEY && row.content) {
                existingContent = row.content;
                if (!existingContent._updatedAt && row.updated_at) existingContent._updatedAt = row.updated_at;
                if (!existingContent._version && row.version) existingContent._version = row.version;
              }
              if (row.key === KV_PUBLIC_CONTENT_KEY && row.content) {
                existingPublicContent = row.content;
              }
            }
          }
        } catch {
          return Response.json({ success: false, error: 'Não foi possível consultar o catálogo atual. Tente salvar novamente.' }, { status: 503 });
        }
      }
    }

    // Conflito desativado permanentemente a pedido do usuário (sem bloqueios 409)

    const now = new Date();
    
    // Regra Estrita de Publicação: Conteúdo Avulso aceita estritamente 1 foto OU 1 vídeo
    let processedContent = { ...body.content };
    if (processedContent.avulsos && Array.isArray(processedContent.avulsos.items)) {

      processedContent.avulsos = {
        ...processedContent.avulsos,
        items: processedContent.avulsos.items.map((it: any) => {
          if (it && it.modality === 'avulso') {
            const hasVideos = Array.isArray(it.videos) && it.videos.length > 0;
            const hasPhotos = Array.isArray(it.exclusivePhotos) && it.exclusivePhotos.length > 0;
            if (hasVideos) {
              return {
                ...it,
                modality: 'avulso',
                videos: [it.videos[0]],
                exclusivePhotos: [],
                previewImages: [],
                isDraft: it.active === false,
              };
            } else if (hasPhotos) {
              return {
                ...it,
                modality: 'avulso',
                exclusivePhotos: [it.exclusivePhotos[0]],
                videos: [],
                previewImages: [],
                isDraft: it.active === false,
              };
            }
          }
          const isItemActive = it.active !== false;
          const cleanSlug = (it.slug || it.id || '').trim().replace(/^\/avulsos\//, '').replace(/^\/+/, '');
          return {
            ...it,
            modality: it.modality || 'pack',
            active: isItemActive,
            isDraft: !isItemActive,
            slug: cleanSlug,
            checkoutUrl: it.checkoutUrl || `/avulsos/${cleanSlug}`,
          };
        }),
      };
    }

    const restricted = await guardPurchasedPackChanges(env, existingContent?.avulsos?.items, processedContent.avulsos?.items);
    if (restricted) return restricted;

    const previousItems = Array.isArray(existingContent?.avulsos?.items) ? existingContent.avulsos.items : [];
    const previousPacks = new Map<string, any>(previousItems.filter(Boolean).map((item: any) => [item.id, item]));
    const currentItems = Array.isArray(processedContent.avulsos?.items) ? processedContent.avulsos.items : [];
    const unavailableNewOffer = currentItems.find((item: any) => {
      if (!isPublicPack(item) || packPurchasePrice(item) === null || packVaultFiles(item).length > 0) return false;
      const previous = previousPacks.get(item.id);
      return !isPublicPack(previous) || packPurchasePrice(previous) === null || packVaultFiles(previous).length > 0;
    });
    if (unavailableNewOffer) {
      return Response.json({
        success: false,
        code: 'PACK_REQUIRES_PRIVATE_DELIVERY',
        error: 'Adicione pelo menos um arquivo privado na aba Cofre antes de colocar este pack à venda.',
      }, { status: 422 });
    }

    const isAdministrative = Boolean(body.isAdministrative);
    const rawContent = {
      ...processedContent,
      _updatedAt: now.toISOString(),
      _version: (existingContent?._version || 0) + 1,
    };

    // Segurança Editorial (AUD-014): Operações administrativas (upload de mídia, álbum, toggle, pack)
    // NUNCA podem publicar rascunhos inacabados de Hero/Sobre/Contato/SEO/Institucional em published_content.
    let publicContent: any;
    if (isAdministrative && existingPublicContent && typeof existingPublicContent === 'object') {
      const sanitizedAdminDelta = sanitizeForPublicSite(rawContent);
      publicContent = {
        ...existingPublicContent,
        ...(sanitizedAdminDelta.gallery ? { gallery: sanitizedAdminDelta.gallery } : {}),
        ...(sanitizedAdminDelta.avulsos ? { avulsos: sanitizedAdminDelta.avulsos } : {}),
        ...(sanitizedAdminDelta.adminUi ? { adminUi: sanitizedAdminDelta.adminUi } : {}),
        library: [],
        albums: [],
        _updatedAt: rawContent._updatedAt,
        _version: rawContent._version,
      };
    } else {
      publicContent = sanitizeForPublicSite(rawContent);
    }

    // 1. Persistência no Supabase PostgreSQL (Master Database)
    if (isSupabaseConfigured(env)) {
      const supabase = getSupabaseClient(env);
      if (supabase) {
        const { error: upsertErr } = await supabase.from('site_content').upsert([
          {
            key: KV_PRIVATE_CONTENT_KEY,
            content: rawContent,
            version: rawContent._version,
            updated_at: rawContent._updatedAt,
            updated_by: body.editorName || 'Admin Oficial',
          },
          {
            key: KV_PUBLIC_CONTENT_KEY,
            content: publicContent,
            version: rawContent._version,
            updated_at: rawContent._updatedAt,
            updated_by: body.editorName || 'Admin Oficial',
          },
        ]);

        if (upsertErr) {
          console.error('[ContentSync] Erro na gravação do Supabase:', upsertErr);
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Não foi possível salvar o conteúdo. Tente novamente em instantes.',
            }),
            {
              status: 500,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        }

        try {
          await supabase.from('content_backups').insert({
            content_key: KV_PRIVATE_CONTENT_KEY,
            snapshot: rawContent,
          });
        } catch (backupErr) {
          console.warn('[ContentSync] Backup snapshot warning:', backupErr);
        }
      }
    }

    // 4. Registra auditoria com resumo detalhado
    const changedSections: string[] = [];
    if (body.content.hero) changedSections.push('Hero (Capa)');
    if (body.content.gallery) changedSections.push('Galeria');
    if (body.content.about) changedSections.push('Sobre Mim');
    if (body.content.channels) changedSections.push('Canais / Redes');
    if (body.content.contact) changedSections.push('Contato');
    if (body.content.seo) changedSections.push('Aparecer no Google');
    if (body.content.institutional) changedSections.push('Links Institucionais');

    const summaryText =
      body.summary ||
      (isAdministrative
        ? `Alteração salva no painel: ${changedSections.join(', ')}`
        : `Conteúdo do site publicado com alterações em: ${changedSections.join(', ')}`);

    try {
      await recordAuditEvent(env, request, {
        type: isAdministrative ? 'CONTENT_ADMIN_OPERATION' : 'CONTENT_PUBLISH',
        severity: 'info',
        summary: summaryText,
        details: {
          sectionsModified: changedSections,
          editor: body.editorName || (isAdministrative ? 'Admin Oficial (Operação Direta)' : 'Admin Oficial'),
          timestamp: now.toISOString(),
          isAdministrative,
        },
      });
    } catch (auditErr) {
      console.warn('[ContentSync] Audit warning (non-fatal):', auditErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: isAdministrative
          ? 'Alteração salva com sucesso.'
          : 'Conteúdo salvo e publicado com sucesso.',
        updatedAt: rawContent._updatedAt,
        version: rawContent._version,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err: any) {
    console.error('[ContentSync] Erro capturado na sincronização:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Não foi possível salvar o conteúdo. Tente novamente em instantes.',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

export const onRequestOptions = async () =>
  new Response(null, {
    status: 204,
  });

export const onRequest = async (context: PagesContext<Env>) => {
  if (context.request.method === 'OPTIONS') {
    return onRequestOptions();
  }
  if (context.request.method === 'GET') {
    return onRequestGet(context);
  }
  return onRequestPost(context);
};
