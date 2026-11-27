import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildArchiveInventory, referenceKeys, resolveArchiveDeletion } from '../../functions/api/_mediaInventory.mjs';
import { assetStoragePut } from '../../functions/api/_mediaStoragePut.mjs';
import { deletePhysicalMedia } from '../../functions/api/_mediaPhysicalDelete.mjs';
import { deduplicateLibraryItems, mediaUrlsInclude } from '../../lib/mediaUsage';
import type { LibraryImageItem } from '../../lib/types';
import { onRequestPost as claim } from '../../functions/api/media/claim';

const storage = vi.hoisted(() => ({
  headMedia: vi.fn(),
  listMediaObjects: vi.fn(),
  isMediaStorageConfigured: vi.fn(() => true),
}));
vi.mock('../../functions/api/_mediaStore', () => storage);
vi.mock('../../functions/api/_supabaseClient', () => ({ getSupabaseClient: () => null }));

const hash = 'a'.repeat(64);
const publicAsset = `media/objects/public/${hash}`;
const privateAsset = `media/objects/private/${hash}`;
const legacyAsset = 'media/media-1792615470200-example';
const full = 'variants/full-1920x1400-q88-v1.webp';
const mobile = 'variants/mobile-900x900-q80-v1.webp';
const thumb = 'variants/thumb-400x400-q76-v1.webp';
const etag = '0123456789abcdef0123456789abcdef';
const file = (key: string, eTag?: string) => ({ key, size: 1200, eTag, uploadedAt: '2026-11-27T12:00:00.000Z' });

describe('inventário PHDEV', () => {
  it('agrupa variantes, vídeos e retenção e mantém os caminhos físicos para auditoria', () => {
    const rows = [
      ...[full, mobile, thumb].map(name => file(`${publicAsset}/${name}`)),
      file(`phdev-archive/${publicAsset}/${full}`),
      file(`${legacyAsset}/full.webp`), file(`${legacyAsset}/thumb.webp`),
      file(`${privateAsset}/video-video-mp4-faststart-v1`),
      file(`${privateAsset}/poster-900x900-q82-max81920-clarity12-v1.webp`),
      file(`${privateAsset}/commercial-original`),
      file('phdev-archive/media/media-removed/full.webp'),
    ];
    const archive = buildArchiveInventory(rows, new Set());
    expect(archive.objects).toHaveLength(10);
    expect(archive.assets).toHaveLength(4);
    const image = archive.assets.find(asset => asset.key === publicAsset)!;
    expect(image).toMatchObject({ variantCount: 3, hasArchiveBackup: true, size: 4800, sha256: hash });
    expect(decodeURIComponent(image.previewUrl!)).toContain(mobile);
    expect(decodeURIComponent(image.fullUrl)).toContain(full);
    const video = archive.assets.find(asset => asset.key === privateAsset)!;
    expect(video.kind).toBe('video');
    expect(decodeURIComponent(video.previewUrl!)).toContain('poster-');
    expect(decodeURIComponent(video.fullUrl)).toContain('video-video-mp4-faststart-v1');
    expect(decodeURIComponent(video.downloadUrl)).toContain('commercial-original');
    expect(archive.assets.find(asset => asset.key === 'media/media-removed')?.isArchiveCopy).toBe(true);
  });

  it('prioriza uma cópia em uso e bloqueia exclusão de mídia vinculada e de uso desconhecido', () => {
    const rows = [
      file(`${legacyAsset}/full.webp`, etag),
      file(`${publicAsset}/${full}`, `"${etag}"`),
      file(`${privateAsset}/${full}`, etag),
      file('media/media-multipart/full.webp', `${etag}-2`),
      file(`phdev-archive/${publicAsset}/${full}`),
    ];
    const refs = referenceKeys([{ packs: [{ photos: [`https://cdn.example/${legacyAsset}/thumb.webp?cache=1`] }] }]);
    const archive = buildArchiveInventory(rows, refs);
    expect(archive.duplicateGroups).toBe(1);
    expect(archive.assets.find(asset => asset.key === publicAsset)?.duplicateOf).toBe(legacyAsset);
    expect(archive.assets.find(asset => asset.key === privateAsset)?.duplicateCount).toBe(0);
    expect(resolveArchiveDeletion(archive, 'delete_duplicates', [publicAsset], false).keys).toEqual([`${publicAsset}/${full}`]);
    expect(resolveArchiveDeletion(archive, 'delete_assets', [legacyAsset], true).status).toBe(409);
    expect(resolveArchiveDeletion(buildArchiveInventory(rows), 'delete_assets', [publicAsset], false).status).toBe(503);
    expect(buildArchiveInventory(rows, new Set()).assets.find(asset => asset.key === legacyAsset)?.duplicateOf).toBe(publicAsset);
  });

  it('bloqueia limpeza quando os bytes divergem apesar do ETag e tamanho iguais', async () => {
    const candidate = `${legacyAsset}/full.webp`;
    const keeper = `${publicAsset}/${full}`;
    const object = (value: number) => ({
      ContentLength: 1,
      ETag: etag,
      Body: { transformToWebStream: () => new ReadableStream({
        start(stream) { stream.enqueue(Uint8Array.of(value)); stream.close(); },
      }) },
    });
    const send = vi.fn().mockResolvedValueOnce(object(1)).mockResolvedValueOnce(object(2));
    const expected = new Map([candidate, keeper].map(key => [key, { size: 1, eTag: etag }]));
    await expect(deletePhysicalMedia({ send }, 'test-bucket', [candidate], {
      expected, duplicatePairs: [[candidate, keeper]],
    })).rejects.toThrow('ARCHIVE_DUPLICATE_CHANGED');
    expect(send.mock.calls.map(([cmd]) => cmd.constructor.name)).toEqual(['GetObjectCommand', 'GetObjectCommand']);
  });

  it('reconfirma vínculos antes do primeiro pedido de exclusão ao B2', async () => {
    const key = `${publicAsset}/${full}`;
    const send = vi.fn().mockResolvedValueOnce({ Versions: [{ Key: key, VersionId: 'latest', IsLatest: true }] });
    const checkReferences = vi.fn().mockRejectedValue(new Error('vínculo novo'));
    await expect(deletePhysicalMedia({ send }, 'test-bucket', [key], { checkReferences })).rejects.toThrow('vínculo novo');
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('preserva a versão atual se o B2 falhar ao excluir uma versão antiga', async () => {
    const key = `${publicAsset}/${full}`;
    const send = vi.fn()
      .mockResolvedValueOnce({ Versions: [
        { Key: key, VersionId: 'latest', IsLatest: true },
        { Key: key, VersionId: 'old', IsLatest: false },
      ], DeleteMarkers: [{ Key: key, VersionId: 'marker', IsLatest: false }] })
      .mockResolvedValueOnce({ Deleted: [{ Key: key, DeleteMarkerVersionId: 'marker' }], Errors: [{ Key: key, VersionId: 'old' }] });
    const result = await deletePhysicalMedia({ send }, 'test-bucket', [key]);
    expect(result.deleted).toEqual([]);
    expect(result.failures).toHaveLength(1);
    expect(send).toHaveBeenCalledTimes(2);
  });
});

describe('reuso de upload', () => {
  beforeEach(() => vi.clearAllMocks());

  it('responde reused no claim a partir das três variantes físicas, sem fazer upload', async () => {
    storage.listMediaObjects.mockResolvedValue({ objects: [full, mobile, thumb].map(name => file(`${publicAsset}/${name}`)) });
    const result = await claim({
      request: new Request('https://admin.example/api/media/claim', {
        method: 'POST',
        body: JSON.stringify({ sha256: hash, accessScope: 'public', mimeType: 'image/jpeg', sizeBytes: 2400, originalName: 'Foto.jpg' }),
      }),
      env: {},
    });
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({
      reused: true,
      mediaItem: {
        name: 'Foto',
        objectKey: `${publicAsset}/${full}`,
        variants: { mobile: { key: `${publicAsset}/${mobile}` }, thumb: { key: `${publicAsset}/${thumb}` } },
      },
    });
    expect(storage.listMediaObjects).toHaveBeenCalledWith({}, { prefix: `${publicAsset}/`, limit: 1000 });
  });

  it('pula o PUT dos objetos principal e de retenção quando tamanho e hash conferem', async () => {
    const send = vi.fn().mockResolvedValue({ ContentLength: 3, Metadata: { sha256: hash } });
    const result = await assetStoragePut({ config: {}, send }, 'test-bucket', `${publicAsset}/${full}`, new Uint8Array(3), 'image/webp', hash);
    expect(result).toEqual({ reused: true, retentionPending: false });
    expect(send.mock.calls.map(([cmd]) => cmd.constructor.name)).toEqual(['HeadObjectCommand', 'HeadObjectCommand']);
  });
});

describe('Biblioteca NUA', () => {
  it('mescla metadados e vínculos por ativo, sem misturar os escopos', () => {
    const first: LibraryImageItem = { id: 'existing', name: 'Foto', url: `/${publicAsset}/${full}`, uploadedAt: '' };
    const storageItem: LibraryImageItem = {
      ...first, id: 'indexed', url: `https://cdn.example/${publicAsset}/${mobile}`, customName: 'Ensaio',
      favorite: true, albumIds: ['album'],
      variants: { thumb: { key: `${publicAsset}/${thumb}`, url: `/${publicAsset}/${thumb}`, width: 400, height: 400, sizeBytes: 1200, format: 'webp' } },
    };
    const privateItem = { ...first, id: 'private', url: `https://cdn.example/${privateAsset}/${full}` };
    const [merged, protectedMedia] = deduplicateLibraryItems([first, storageItem, privateItem]);
    expect(merged).toMatchObject({
      id: 'existing', aliasIds: ['indexed'], name: 'Ensaio', favorite: true, albumIds: ['album'],
      fileHash: `sha256:${hash}`, variants: { thumb: storageItem.variants!.thumb },
    });
    expect(protectedMedia.id).toBe('private');
    expect(mediaUrlsInclude([first.url], storageItem.url)).toBe(true);
    expect(mediaUrlsInclude([first.url], privateItem.url)).toBe(false);
  });
});
