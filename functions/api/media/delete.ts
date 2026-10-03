/**
 * Cloudflare Pages Function: /api/media/delete
 *
 * Security Level 5 Hardened Deletion Endpoint:
 * - Anti-IDOR validation (keys must match strict pattern and namespace)
 * - Array length cap (anti-DoS)
 * - Masked error messages
 */

import { S3Client, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { isValidObjectKey } from '../_security';
import { recordAuditEvent } from '../_auditHelper';

interface Env {
  BUCKET?: any;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_R2_ACCESS_KEY_ID?: string;
  CLOUDFLARE_R2_SECRET_ACCESS_KEY?: string;
  CLOUDFLARE_R2_BUCKET_NAME?: string;
  CLOUDFLARE_R2_ENDPOINT?: string;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

const MAX_KEYS_PER_BATCH = 100;

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      keys?: string[];
    };
    const { keys } = body;

    // 1. Structure validation
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma chave fornecida para exclusão.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (keys.length > MAX_KEYS_PER_BATCH) {
      return new Response(
        JSON.stringify({
          error: `Limite de ${MAX_KEYS_PER_BATCH} chaves por requisição excedido.`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Strict IDOR / Key Validation
    const invalidKeys = keys.filter((k) => !isValidObjectKey(k));
    if (invalidKeys.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'Uma ou mais chaves fornecidas são inválidas ou estão fora do diretório permitido.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Native Cloudflare R2 Binding
    if (env.BUCKET && typeof env.BUCKET.delete === 'function') {
      await Promise.all(keys.map((k) => env.BUCKET.delete(k)));
    } else {
      // 4. S3 Fallback Client
      const accountId = env.CLOUDFLARE_ACCOUNT_ID;
      const accessKeyId = env.CLOUDFLARE_R2_ACCESS_KEY_ID;
      const secretAccessKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
      const bucket = env.CLOUDFLARE_R2_BUCKET_NAME || 'nuaborges-media';
      const endpoint =
        env.CLOUDFLARE_R2_ENDPOINT ||
        (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

      if (accessKeyId && secretAccessKey && endpoint) {
        const s3 = new S3Client({
          region: 'auto',
          endpoint,
          credentials: { accessKeyId, secretAccessKey },
        });

        await s3.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: {
              Objects: keys.map((k) => ({ Key: k })),
              Quiet: true,
            },
          })
        );
      }
    }

    // Registra evento de exclusão no monitoramento
    await recordAuditEvent(env, request, {
      type: 'MEDIA_DELETE',
      severity: 'warning',
      summary: `Exclusão de ${keys.length} arquivo(s): ${keys.slice(0, 3).join(', ')}${
        keys.length > 3 ? '...' : ''
      }`,
      details: {
        deletedKeys: keys,
        count: keys.length,
      },
    });

    return new Response(
      JSON.stringify({ success: true, deletedCount: keys.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[Delete] Erro interno:', err);
    return new Response(
      JSON.stringify({ error: 'Falha interna ao excluir mídia.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
