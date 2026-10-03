/**
 * Cloudflare Pages Function: /api/content/sync
 *
 * Sincronização e Backup de Conteúdo no Cloudflare R2:
 * GET: Retorna o conteúdo publicado salvo no R2 (com fallback para default)
 * POST: Salva o novo conteúdo publicado no R2 e registra evento de auditoria
 */

import { recordAuditEvent } from '../_auditHelper';

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

const KV_CONTENT_KEY = 'published_content';
const R2_CONTENT_KEY = 'content/published.json';
const R2_BACKUP_PREFIX = 'content/backups/';

export const onRequestGet = async (context: PagesContext<Env>) => {
  const { env } = context;

  try {
    // 1. Try Cloudflare KV first (100% Free, zero credit card, globally replicated Edge storage)
    const kv = env.NUA_CONTENT || env.CONTENT_KV;
    if (kv && typeof kv.get === 'function') {
      const kvData = await kv.get(KV_CONTENT_KEY);
      if (kvData) {
        return new Response(kvData, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        });
      }
    }

    // 2. Fallback to Cloudflare R2 if configured
    if (env.BUCKET && typeof env.BUCKET.get === 'function') {
      const obj = await env.BUCKET.get(R2_CONTENT_KEY);
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
    };

    if (!body.content || typeof body.content !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Conteúdo inválido fornecido para publicação.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payload = JSON.stringify(body.content, null, 2);
    const now = new Date();

    // 1. Salva no Cloudflare KV (NUA_CONTENT)
    const kv = env.NUA_CONTENT || env.CONTENT_KV;
    if (kv && typeof kv.put === 'function') {
      await kv.put(KV_CONTENT_KEY, payload);
      // Salva snapshot com histórico para segurança
      const backupKey = `backup_${now.toISOString().replace(/[:.]/g, '-')}`;
      await kv.put(backupKey, payload, { expirationTtl: 30 * 86400 }).catch(() => {});
    }

    // 2. Salva no Cloudflare R2 se habilitado
    if (env.BUCKET && typeof env.BUCKET.put === 'function') {
      await env.BUCKET.put(R2_CONTENT_KEY, payload, {
        httpMetadata: { contentType: 'application/json' },
      }).catch(() => {});
      const backupKey = `${R2_BACKUP_PREFIX}${now.toISOString().replace(/[:.]/g, '-')}.json`;
      await env.BUCKET.put(backupKey, payload, {
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
      JSON.stringify({ success: true, message: 'Conteúdo salvo e sincronizado com sucesso.' }),
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
