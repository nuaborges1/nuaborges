/**
 * Cloudflare Pages Function: /api/content/sync
 *
 * Sincronização e Backup de Conteúdo no Cloudflare R2:
 * GET: Retorna o conteúdo publicado salvo no R2 (com fallback para default)
 * POST: Salva o novo conteúdo publicado no R2 e registra evento de auditoria
 */

import { recordAuditEvent } from '../_auditHelper';
import { verifySessionToken, getSessionCookie } from '../_authHelper';

interface Env {
  NUA_CONTENT?: any;
  CONTENT_KV?: any;
  BUCKET?: any;
  ADMIN_PASSWORD?: string;
  ADMIN_API_SECRET?: string;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

const KV_PUBLIC_CONTENT_KEY = 'published_content';
const KV_PRIVATE_CONTENT_KEY = 'private_admin_content';
const R2_PUBLIC_CONTENT_KEY = 'content/published.json';
const R2_PRIVATE_CONTENT_KEY = 'content/private_admin.json';
const R2_BACKUP_PREFIX = 'content/backups/';

function sanitizeForPublicSite(rawContent: any): any {
  if (!rawContent || typeof rawContent !== 'object') return rawContent;
  const { library, albums, ...publicFields } = rawContent;
  return {
    ...publicFields,
    library: [],
    albums: [],
  };
}

export const onRequestGet = async (context: PagesContext<Env>) => {
  const { request, env } = context;
  const kv = env.NUA_CONTENT || env.CONTENT_KV;

  try {
    const url = new URL(request.url);
    const authHeader = request.headers.get('Authorization');
    const sessionCookie = getSessionCookie(request);
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : sessionCookie;
    const secret = env.ADMIN_API_SECRET || env.ADMIN_PASSWORD;

    const isAuth = secret && token ? await verifySessionToken(token, secret) : false;
    const wantsAdmin = url.searchParams.get('mode') === 'admin';

    // 1. Visão de Administrador Autenticado: Carrega acervo completo (inclui library privada)
    if (isAuth && wantsAdmin) {
      if (kv && typeof kv.get === 'function') {
        const privateData = await kv.get(KV_PRIVATE_CONTENT_KEY);
        if (privateData) {
          return new Response(privateData, {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store, no-cache, must-revalidate',
            },
          });
        }
      }

      if (env.BUCKET && typeof env.BUCKET.get === 'function') {
        const obj = await env.BUCKET.get(R2_PRIVATE_CONTENT_KEY);
        if (obj) {
          const text = await obj.text();
          return new Response(text, {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store, no-cache, must-revalidate',
            },
          });
        }
      }
    }

    // 2. Visão Pública dos Visitantes: Sanitiza para garantir zero exposição de mídias não publicadas (C9)
    if (kv && typeof kv.get === 'function') {
      const publicData = await kv.get(KV_PUBLIC_CONTENT_KEY);
      if (publicData) {
        try {
          const parsed = JSON.parse(publicData);
          const sanitized = JSON.stringify(sanitizeForPublicSite(parsed));
          return new Response(sanitized, {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
            },
          });
        } catch {
          return new Response(publicData, {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
            },
          });
        }
      }
    }

    // Fallback R2 público
    if (env.BUCKET && typeof env.BUCKET.get === 'function') {
      const obj = await env.BUCKET.get(R2_PUBLIC_CONTENT_KEY);
      if (obj) {
        const text = await obj.text();
        try {
          const parsed = JSON.parse(text);
          return new Response(JSON.stringify(sanitizeForPublicSite(parsed)), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
            },
          });
        } catch {
          return new Response(text, {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
            },
          });
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

  try {
    const body = (await request.json().catch(() => ({}))) as {
      content?: any;
      summary?: string;
      editorName?: string;
      baseUpdatedAt?: string;
      force?: boolean;
    };

    if (!body.content || typeof body.content !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Conteúdo inválido fornecido para publicação.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const kv = env.NUA_CONTENT || env.CONTENT_KV;
    let existingContent: any = null;
    if (kv && typeof kv.get === 'function') {
      const existingRaw = await kv.get(KV_PRIVATE_CONTENT_KEY);
      if (existingRaw) {
        try {
          existingContent = JSON.parse(existingRaw);
        } catch {}
      }
    }

    // Detecção de Conflito Multi-dispositivo (C11)
    if (
      existingContent &&
      existingContent._updatedAt &&
      body.baseUpdatedAt &&
      existingContent._updatedAt !== body.baseUpdatedAt &&
      !body.force
    ) {
      return new Response(
        JSON.stringify({
          conflict: true,
          error: `Conflito de edição: O conteúdo foi atualizado em outro dispositivo às ${new Date(existingContent._updatedAt).toLocaleTimeString('pt-BR')}. Deseja recarregar ou forçar a sobrescrita?`,
          serverUpdatedAt: existingContent._updatedAt,
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const rawContent = {
      ...body.content,
      _updatedAt: now.toISOString(),
      _version: (existingContent?._version || 0) + 1,
    };
    const fullPayload = JSON.stringify(rawContent, null, 2);
    const publicContent = sanitizeForPublicSite(rawContent);
    const publicPayload = JSON.stringify(publicContent, null, 2);

    if (kv && typeof kv.put === 'function') {
      // Grava versão pública sanitizada (sem library/albums privados)
      await kv.put(KV_PUBLIC_CONTENT_KEY, publicPayload);
      // Grava acervo completo na chave privada
      await kv.put(KV_PRIVATE_CONTENT_KEY, fullPayload);

      // Salva snapshot com histórico para segurança
      const backupKey = `backup_${now.toISOString().replace(/[:.]/g, '-')}`;
      await kv.put(backupKey, fullPayload, { expirationTtl: 30 * 86400 }).catch(() => {});
    }

    // 2. Salva no Cloudflare R2 se habilitado
    if (env.BUCKET && typeof env.BUCKET.put === 'function') {
      await env.BUCKET.put(R2_PUBLIC_CONTENT_KEY, publicPayload, {
        httpMetadata: { contentType: 'application/json' },
      }).catch(() => {});

      await env.BUCKET.put(R2_PRIVATE_CONTENT_KEY, fullPayload, {
        httpMetadata: { contentType: 'application/json' },
      }).catch(() => {});

      const backupKey = `${R2_BACKUP_PREFIX}${now.toISOString().replace(/[:.]/g, '-')}.json`;
      await env.BUCKET.put(backupKey, fullPayload, {
        httpMetadata: { contentType: 'application/json' },
      }).catch(() => {});
    }

    // 3. Registra auditoria com resumo detalhado
    const changedSections: string[] = [];
    if (body.content.hero) changedSections.push('Hero (Capa)');
    if (body.content.gallery) changedSections.push('Galeria');
    if (body.content.about) changedSections.push('Sobre Mim');
    if (body.content.channels) changedSections.push('Canais / Redes');
    if (body.content.contact) changedSections.push('Contato');
    if (body.content.seo) changedSections.push('SEO & Metadados');
    if (body.content.institutional) changedSections.push('Links Institucionais');

    const summaryText =
      body.summary ||
      `Conteúdo do site publicado com alterações em: ${changedSections.join(', ')}`;

    await recordAuditEvent(env, request, {
      type: 'CONTENT_PUBLISH',
      severity: 'info',
      summary: summaryText,
      details: {
        sectionsModified: changedSections,
        editor: body.editorName || 'Admin Oficial',
        timestamp: now.toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Conteúdo salvo e sincronizado com sucesso.',
        updatedAt: rawContent._updatedAt,
        version: rawContent._version,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[ContentSync] Falha ao sincronizar conteúdo:', err);
    return new Response(
      JSON.stringify({ error: 'Falha ao processar sincronização de conteúdo.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
