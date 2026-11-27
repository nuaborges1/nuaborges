/**
 * Endpoint Exclusivo PHDEV: GET / POST /api/control/archive
 *
 * - GET: lista TODOS os objetos físicos do Backblaze B2 (com paginação completa)
 *   + metadados dos packs/mídias publicados.
 * - GET ?preview=<key> | ?download=<key>: entrega segura direto do B2 autenticado
 *   como PHDEV (inclusive objetos privados e cópias `phdev-archive/`).
 * - POST { action: 'delete_objects', keys, deleteArchiveCopy?, confirmationPassword }:
 *   remove fisicamente os objetos selecionados do bucket Backblaze B2 após
 *   reautenticação por senha PHDEV e registro em auditoria.
 */

import {
  purgeMediaVersions,
  getMediaStream,
  isMediaStorageConfigured,
  listMediaObjects,
} from '../_mediaStore';
import { archiveActions, buildArchiveInventory, listArchiveInventory, loadArchiveReferences, referenceSafetyStatus, resolveArchiveDeletion } from '../_mediaInventory.mjs';
import { getSupabaseClient } from '../_supabaseClient';
import { hasAdminCapability } from '../_central/adminCapabilities';
import { requireAdminReauthentication } from '../_central/requireAdminReauthentication';
import { emitProtocolEvent } from '../_central/protocolActivity';
import { safeInternalError } from '../_central/errorHandler';
import type { CentralActor, CentralEnv } from '../_central/types';

type PagesContext<T = CentralEnv> = {
  request: Request;
  env: T;
  data?: { actor?: CentralActor };
};

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

function sanitizeB2Key(raw: string): string | null {
  const clean = String(raw || '').trim().replace(/^\/+/, '');
  if (!clean || clean.length > 512) return null;
  if (clean.includes('..') || clean.includes('\\') || clean.includes('\0')) return null;
  return clean;
}

async function loadInventory(env: CentralEnv) {
  const [objects, references] = await Promise.all([
    listArchiveInventory((options: { cursor?: string; limit: number }) => listMediaObjects(env, options)),
    loadArchiveReferences(getSupabaseClient(env)).catch(() => null),
  ]);
  return buildArchiveInventory(objects, references);
}

export const onRequestGet = async (context: PagesContext) => {
  const { request, env } = context;
  const actor = context.data?.actor;
  if (!actor || !hasAdminCapability(actor, 'operations.control')) {
    return Response.json(
      { success: false, error: 'Acesso restrito ao operador PHDEV.' },
      { status: 403, headers: JSON_HEADERS },
    );
  }

  try {
    const url = new URL(request.url);
    const previewKey = url.searchParams.get('preview');
    const downloadKey = url.searchParams.get('download');

    // Preview ou Download direto do Backblaze B2 (público, privado ou phdev-archive/)
    if (previewKey || downloadKey) {
      const targetKey = sanitizeB2Key(downloadKey || previewKey || '');
      if (!targetKey) {
        return Response.json({ success: false, error: 'Chave de objeto inválida.' }, { status: 400, headers: JSON_HEADERS });
      }
      if (!isMediaStorageConfigured(env as any)) {
        return Response.json({ success: false, error: 'Backblaze B2 não configurado.' }, { status: 503, headers: JSON_HEADERS });
      }
      const stream = await getMediaStream(env as any, targetKey, request.headers.get('Range') || undefined);
      if (!stream) {
        return Response.json({ success: false, error: 'Objeto não encontrado no Backblaze B2.' }, { status: 404, headers: JSON_HEADERS });
      }

      const filename = targetKey.split('/').pop() || 'arquivo';
      const mime = stream.contentType.split(';', 1)[0].toLowerCase();
      const inline = /^(image\/(webp|avif|jpeg|png|gif)|video\/(mp4|webm|quicktime)|audio\/(mpeg|wav|ogg|mp4))$/.test(mime);
      const headers = new Headers({
        'Content-Type': inline ? mime : 'application/octet-stream',
        'Content-Security-Policy': 'sandbox',
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      });
      if (typeof stream.contentLength === 'number') {
        headers.set('Content-Length', String(stream.contentLength));
      }
      if (stream.contentRange) {
        headers.set('Content-Range', stream.contentRange);
      }
      if (downloadKey || !inline) {
        headers.set(
          'Content-Disposition',
          `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}"`,
        );
      }
      return new Response(stream.body, {
        status: stream.contentRange ? 206 : 200,
        headers,
      });
    }

    const configured = isMediaStorageConfigured(env as any);
    if (!configured) {
      return Response.json(
        {
          success: true,
          storageConfigured: false,
          totalObjects: 0,
          archivedCopies: 0,
          totalBytes: 0,
          assets: [],
          objects: [],
          referencesVerified: false,
        },
        { status: 200, headers: JSON_HEADERS },
      );
    }

    return Response.json({
      success: true,
      storageConfigured: true,
      ...await loadInventory(env),
    }, { status: 200, headers: JSON_HEADERS });
  } catch (err) {
    return safeInternalError('control/archive:GET', err);
  }
};

export const onRequestPost = async (context: PagesContext) => {
  const { request, env } = context;
  const actor = context.data?.actor;
  if (!actor || !hasAdminCapability(actor, 'operations.control')) {
    return Response.json(
      { success: false, error: 'Exclusão física no Backblaze B2 restrita ao PHDEV.' },
      { status: 403, headers: JSON_HEADERS },
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      keys?: unknown;
      deleteArchiveCopy?: boolean;
      confirmationPassword?: unknown;
    };

    const action = String(body.action || '').trim();
    if (!archiveActions.has(action)) {
      return Response.json(
        { success: false, error: 'Ação inválida para /api/control/archive.' },
        { status: 400, headers: JSON_HEADERS },
      );
    }

    const denied = await requireAdminReauthentication(request, env, actor, body.confirmationPassword);
    if (denied) return denied;

    if (!isMediaStorageConfigured(env as any)) {
      return Response.json(
        { success: false, error: 'Backblaze B2 não configurado neste ambiente.' },
        { status: 503, headers: JSON_HEADERS },
      );
    }

    const ids = Array.isArray(body.keys) ? [...new Set(body.keys.map(key => sanitizeB2Key(String(key))))] : [];
    if (!ids.length || ids.includes(null) || ids.length > 1000) {
      return Response.json({ success: false, error: 'Seleção de mídias inválida.' }, { status: 400, headers: JSON_HEADERS });
    }
    const inventory = await loadInventory(env);
    const selection = resolveArchiveDeletion(inventory, action, ids, body.deleteArchiveCopy === true);
    if (!selection.keys) {
      return Response.json({ success: false, error: selection.error }, { status: selection.status, headers: JSON_HEADERS });
    }

    await emitProtocolEvent(env, request, {
      protocol: 'tobirama',
      category: 'midia',
      actor: 'phdev',
      type: 'MEDIA_DELETE',
      severity: 'warning',
      requireDurable: true,
      summary: 'PHDEV confirmou uma exclusão física no Backblaze B2.',
      details: { action, phase: 'confirmed', objectCount: selection.keys.length, keys: selection.keys.slice(0, 10) },
    });

    const expected = new Map(inventory.objects.map(object => [object.key, object]));
    const result = await purgeMediaVersions(env, selection.keys, {
      expected,
      duplicatePairs: selection.duplicatePairs,
      checkReferences: async () => {
        const references = await loadArchiveReferences(getSupabaseClient(env)).catch(() => null);
        const status = referenceSafetyStatus(references, selection.keys);
        if (status !== 200) throw new Error(`ARCHIVE_REFERENCES_${status}`);
      },
    });
    await emitProtocolEvent(env, request, {
      protocol: 'tobirama',
      category: 'midia',
      actor: 'phdev',
      type: 'MEDIA_DELETE',
      severity: result.failures.length ? 'warning' : 'info',
      summary: `PHDEV apagou ${result.deleted.length} arquivo(s) do Backblaze B2.`,
      details: {
        action,
        deletedCount: result.deleted.length,
        failedCount: result.failures.length,
        keys: result.deleted.slice(0, 10),
      },
    });

    return new Response(
      JSON.stringify({
        success: result.failures.length === 0,
        deleted: result.deleted,
        failures: result.failures,
      }),
      { status: result.failures.length === 0 ? 200 : 207, headers: JSON_HEADERS },
    );
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('ARCHIVE_REFERENCES_')) {
      const status = err.message.endsWith('409') ? 409 : 503;
      return Response.json({ success: false, error: 'Os vínculos das mídias mudaram ou não puderam ser verificados. Atualize o inventário.' }, { status, headers: JSON_HEADERS });
    }
    if (err instanceof Error && err.message === 'ARCHIVE_DUPLICATE_CHANGED') {
      return Response.json({ success: false, error: 'O conteúdo da duplicata ou da cópia a manter mudou. Atualize o inventário.' }, { status: 409, headers: JSON_HEADERS });
    }
    if (err instanceof Error && err.message === 'AUDIT_UNAVAILABLE') {
      return Response.json({ success: false, error: 'O registro de auditoria está indisponível. Tente novamente.' }, { status: 503, headers: JSON_HEADERS });
    }
    return safeInternalError('control/archive:POST', err);
  }
};
