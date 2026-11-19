/**
 * Assinador de URLs Temporárias de Mídia Privada — NUA ID
 *
 * Seção 10 do Prompt Mestre:
 * - Links assinados com TTL curto (padrão: 5 minutos / 300s)
 * - Assinatura HMAC-SHA256 cobrindo: caminho exato + profileId + exp + flag de download (dl)
 * - Revogação de direito encerra imediatamente novas emissões de link
 * - Casamento estrito por segmento de caminho (impede acesso lateral entre packs)
 */

import { timingSafeEqual } from '../id/_crypto';

export const DEFAULT_SIGNED_MEDIA_TTL_SECONDS = 300; // 5 minutos
export const MAX_SIGNED_MEDIA_TTL_SECONDS = 600; // 10 minutos máx

function normalizeMediaPath(mediaPath: string): string | null {
  const clean = String(mediaPath || '').trim().replace(/^\/+/, '').replace(/^media\//i, '');
  if (!clean || clean.includes('..') || clean.includes('\\') || clean.includes('\0')) {
    return null;
  }
  return clean;
}

/**
 * Garante que o arquivo solicitado pertence ao recurso autorizado (casamento por segmento, nunca substring solta).
 */
export function mediaPathMatchesResource(mediaPath: string, resourceId: string): boolean {
  const normPath = normalizeMediaPath(mediaPath)?.toLowerCase();
  const normRes = String(resourceId || '').trim().toLowerCase();
  if (!normPath || !normRes || normRes.length < 2) return false;

  return normPath.split('/').some((seg) => {
    const base = seg.replace(/\.[a-z0-9]{2,5}$/, '');
    return (
      base === normRes ||
      base.startsWith(`${normRes}_`) ||
      base.startsWith(`${normRes}-`) ||
      base.endsWith(`_${normRes}`) ||
      base.endsWith(`-${normRes}`)
    );
  });
}

async function computeMediaHmac(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const buf = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function signPrivateMediaUrl(params: {
  mediaPath: string;
  profileId: string;
  allowDownload: boolean;
  secret: string;
  ttlSeconds?: number;
  nowEpochSeconds?: number;
}): Promise<{ signedUrl: string; expiresAt: string; ttlSeconds: number } | null> {
  const cleanPath = normalizeMediaPath(params.mediaPath);
  if (!cleanPath || !params.profileId || !params.secret) return null;

  const ttl = Math.max(
    30,
    Math.min(params.ttlSeconds ?? DEFAULT_SIGNED_MEDIA_TTL_SECONDS, MAX_SIGNED_MEDIA_TTL_SECONDS)
  );
  const nowSec = params.nowEpochSeconds ?? Math.floor(Date.now() / 1000);
  const exp = nowSec + ttl;
  const dl = params.allowDownload ? '1' : '0';

  const canonical = `v1|${cleanPath}|${params.profileId}|${exp}|${dl}`;
  const sig = await computeMediaHmac(canonical, params.secret);

  const query = new URLSearchParams({
    exp: String(exp),
    pid: params.profileId,
    dl,
    sig,
  });

  return {
    signedUrl: `/media/${cleanPath}?${query.toString()}`,
    expiresAt: new Date(exp * 1000).toISOString(),
    ttlSeconds: ttl,
  };
}

export async function verifyPrivateMediaSignature(params: {
  mediaPath: string;
  exp: string | null;
  pid: string | null;
  dl: string | null;
  sig: string | null;
  secret: string;
  nowEpochSeconds?: number;
}): Promise<{ valid: boolean; allowDownload: boolean; profileId?: string; reason?: string }> {
  const cleanPath = normalizeMediaPath(params.mediaPath);
  if (!cleanPath || !params.exp || !params.pid || !params.sig || !params.secret) {
    return { valid: false, allowDownload: false, reason: 'missing_params' };
  }

  const expNum = Number.parseInt(params.exp, 10);
  const nowSec = params.nowEpochSeconds ?? Math.floor(Date.now() / 1000);
  if (!Number.isFinite(expNum) || expNum <= nowSec) {
    return { valid: false, allowDownload: false, reason: 'expired' };
  }

  // Rejeita TTL absurdamente longo (defesa contra manipulação)
  if (expNum - nowSec > MAX_SIGNED_MEDIA_TTL_SECONDS + 60) {
    return { valid: false, allowDownload: false, reason: 'ttl_exceeded' };
  }

  const dl = params.dl === '1' ? '1' : '0';
  const canonical = `v1|${cleanPath}|${params.pid}|${expNum}|${dl}`;
  const expectedSig = await computeMediaHmac(canonical, params.secret);

  if (!timingSafeEqual(expectedSig, params.sig.toLowerCase())) {
    return { valid: false, allowDownload: false, reason: 'bad_signature' };
  }

  return {
    valid: true,
    allowDownload: dl === '1',
    profileId: params.pid,
  };
}
