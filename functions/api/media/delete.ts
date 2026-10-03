/**
 * Cloudflare Pages Function: /api/media/delete
 *
 * Security Level 5 Hardened Deletion Endpoint:
 * - Anti-IDOR validation (keys must match strict pattern and namespace)
 * - Array length cap (anti-DoS)
 * - Masked error messages
 */

import { isValidObjectKey } from '../_security';
import { recordAuditEvent } from '../_auditHelper';
import { deleteMedia, MediaEnv } from '../_mediaStore';

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

const MAX_KEYS_PER_BATCH = 100;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const onRequestPost = async (context: PagesContext<MediaEnv>) => {
  const { request, env } = context;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      keys?: string[];
    };
    const { keys } = body;

    // 1. Structure validation
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return json({ error: 'Nenhuma chave fornecida para exclusão.' }, 400);
    }

    if (keys.length > MAX_KEYS_PER_BATCH) {
      return json({ error: `Limite de ${MAX_KEYS_PER_BATCH} chaves por requisição excedido.` }, 400);
    }

    // 2. Normaliza URLs relativas (/media/...) para chaves e valida (anti-IDOR)
    const normalized = keys.map((k) => (typeof k === 'string' ? k.replace(/^\/+/, '') : k));
    const invalidKeys = normalized.filter((k) => !isValidObjectKey(k));
    if (invalidKeys.length > 0) {
      return json(
        {
          error:
            'Uma ou mais chaves fornecidas são inválidas ou estão fora do diretório permitido.',
        },
        400
      );
    }

    // 3. Remove do R2 e/ou KV
    await deleteMedia(env, normalized);

    await recordAuditEvent(env, request, {
      type: 'MEDIA_DELETE',
      severity: 'warning',
      summary: `Exclusão de ${normalized.length} arquivo(s): ${normalized.slice(0, 3).join(', ')}${
        normalized.length > 3 ? '...' : ''
      }`,
      details: {
        deletedKeys: normalized,
        count: normalized.length,
      },
    });

    return json({ success: true, deletedCount: normalized.length }, 200);
  } catch (err: any) {
    console.error('[Delete] Erro interno:', err);
    return json({ error: 'Falha interna ao excluir mídia.' }, 500);
  }
};
