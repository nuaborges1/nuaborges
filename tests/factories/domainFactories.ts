/**
 * Deterministic Factories & Cryptographic Helpers for NUA Borges QA Suite
 *
 * Uses strictly synthetic credentials, isolated test URLs, and per-call unique IDs.
 * Never embeds real tokens, PII, or production URLs.
 */

export const TEST_SECRETS = {
  ADMIN_PASSWORD: 'qa-admin-pass-2026-isolated',
  CLIENT_PASSWORD: 'qa-client-pass-2026-isolated',
  CONTRACT_PASSWORD: 'qa-contract-pass-2026-isolated',
  ADMIN_SESSION_SECRET: 'qa-admin-session-secret-64chars-00000000000000000000000000000001',
  ADMIN_API_SECRET: 'qa-master-api-secret-64chars-00000000000000000000000000000000002',
  NUA_ID_SECRET: 'qa-nua-id-secret-64chars-000000000000000000000000000000000000003',
  IP_HASH_SECRET: 'qa-ip-hash-secret-64chars-00000000000000000000000000000000000004',
  CRON_SECRET: 'qa-cron-secret-64chars-00000000000000000000000000000000000000005',
  MP_WEBHOOK_SECRET: 'qa-mp-webhook-secret-64chars-00000000000000000000000000000000006',
  MP_ACCESS_TOKEN: 'TEST-0000000000000000-000000-00000000000000000000000000000000-000000000',
  SUPABASE_URL: 'https://qa-isolated.supabase.test',
  SUPABASE_SERVICE_ROLE_KEY: 'qa-service-role-key-isolated-not-real-000000000000000000000000',
};

let seq = 0;
export function nextUid(prefix = 'qa'): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq}`;
}

export function createTestEmail(label = 'cliente'): string {
  return `${nextUid(label)}@qa-nua.example.test`;
}

export function createTestPack(overrides: Record<string, any> = {}) {
  const id = overrides.id || `avulso-${nextUid('pack')}`;
  const slug = overrides.slug || id.replace(/^avulso-/, '');
  return {
    id,
    slug,
    modality: 'pack',
    title: 'Ensaio Exclusivo QA',
    subtitle: 'Coleção autoral de teste isolado',
    description: 'Descrição do ensaio de teste.',
    price: 'R$ 89,90',
    numericPrice: 89.9,
    active: true,
    isDraft: false,
    coverImage: '/media/gallery/qa-cover.webp',
    previewImages: ['/media/gallery/qa-preview-1.webp'],
    exclusivePhotos: [`/media/private/${slug}/foto-01.webp`, `/media/private/${slug}/foto-02.webp`],
    videos: [
      {
        id: 'vid-1',
        title: 'Vídeo Principal QA',
        duration: '04:12',
        posterUrl: '/media/gallery/qa-poster.webp',
        url: `/media/private/${slug}/video-01.mp4`,
      },
    ],
    ...overrides,
  };
}

export async function signMercadoPagoWebhook(params: {
  dataId: string;
  secret?: string;
  requestId?: string;
  ts?: number;
}): Promise<{ xSignature: string; xRequestId: string; ts: number }> {
  const secret = params.secret || TEST_SECRETS.MP_WEBHOOK_SECRET;
  const requestId = params.requestId || `req_${nextUid('mp')}`;
  const ts = params.ts ?? Math.floor(Date.now() / 1000);
  const manifest = `id:${params.dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(manifest));
  const v1 = Array.from(new Uint8Array(sigBuf), (b) => b.toString(16).padStart(2, '0')).join('');
  return {
    xSignature: `ts=${ts},v1=${v1}`,
    xRequestId: requestId,
    ts,
  };
}

export function extractCookies(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  const list =
    typeof (headers as any).getSetCookie === 'function'
      ? ((headers as any).getSetCookie() as string[])
      : headers.get('set-cookie')
        ? [headers.get('set-cookie')!]
        : [];
  for (const raw of list) {
    const first = raw.split(';')[0];
    const eq = first.indexOf('=');
    if (eq > 0) {
      result[first.slice(0, eq).trim()] = first.slice(eq + 1).trim();
    }
  }
  return result;
}

export function serializeCookieJar(jar: Record<string, string>): string {
  return Object.entries(jar)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}
