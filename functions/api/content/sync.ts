/**
 * Cloudflare Pages Function: /api/content/sync
 *
 * Sincronização e Backup de Conteúdo:
 * 1. Fonte Oficial e Master Database: Supabase PostgreSQL (Tabelas site_content e content_backups)
 */

import { recordAuditEvent } from '../_auditHelper';
import { verifySessionToken, getSessionCookie } from '../_authHelper';
import { getSupabaseClient, isSupabaseConfigured } from '../_supabaseClient';

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

function sanitizeForPublicSite(rawContent: any): any {
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
              .filter((item: any) => item && item.active !== false && item.modality !== 'avulso')
              .map((item: any) => {
                const slug = (item.slug || item.id || '').trim().replace(/^\/avulsos\//, '').replace(/^\/+/, '');
                return {
                  ...item,
                  modality: item.modality || 'pack',
                  isDraft: false,
                  slug,
                  checkoutUrl: item.checkoutUrl || `/avulsos/${slug}`,
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
    const secret = env.ADMIN_API_SECRET || env.ADMIN_PASSWORD;

    const isAuth = secret && token ? await verifySessionToken(token, secret) : false;
    const wantsAdmin = url.searchParams.get('mode') === 'admin';

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
                'Access-Control-Allow-Origin': '*',
                'Cache-Control':
                  isAuth && wantsAdmin
                    ? 'no-store, no-cache, must-revalidate'
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
      JSON.stringify({ error: 'Falha ao buscar conteúdo do servidor.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 50 * 1024 * 1024) {
    return new Response(
      JSON.stringify({ error: 'O payload de conteúdo excede o limite máximo permitido de 50MB.' }),
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

    // Obtém conteúdo atual do Supabase PostgreSQL
    if (isSupabaseConfigured(env)) {
      const supabase = getSupabaseClient(env);
      if (supabase) {
        try {
          const { data } = await supabase
            .from('site_content')
            .select('content, updated_at, version')
            .eq('key', KV_PRIVATE_CONTENT_KEY)
            .maybeSingle();
          if (data?.content) {
            existingContent = data.content;
            if (!existingContent._updatedAt && data.updated_at) {
              existingContent._updatedAt = data.updated_at;
            }
            if (!existingContent._version && data.version) {
              existingContent._version = data.version;
            }
          }
        } catch {}
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

    const rawContent = {
      ...processedContent,
      _updatedAt: now.toISOString(),
      _version: (existingContent?._version || 0) + 1,
    };
    const fullPayload = JSON.stringify(rawContent, null, 2);
    const publicContent = sanitizeForPublicSite(rawContent);
    const publicPayload = JSON.stringify(publicContent, null, 2);

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
              error: `Erro ao persistir no banco de dados Supabase: ${upsertErr.message}`,
            }),
            {
              status: 500,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
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
    if (body.content.seo) changedSections.push('SEO & Metadados');
    if (body.content.institutional) changedSections.push('Links Institucionais');

    const isAdministrative = Boolean(body.isAdministrative);
    const summaryText =
      body.summary ||
      (isAdministrative
        ? `Operação administrativa executada diretamente: ${changedSections.join(', ')}`
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
          ? 'Operação administrativa salva com sucesso.'
          : 'Conteúdo salvo e sincronizado com sucesso.',
        updatedAt: rawContent._updatedAt,
        version: rawContent._version,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err: any) {
    console.error('[ContentSync] Erro capturado na sincronização:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Falha ao sincronizar conteúdo com o servidor.',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
};

export const onRequestOptions = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Master-Key',
    },
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
