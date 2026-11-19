import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteMedia } from '../functions/api/_mediaStore.ts';
import { isValidObjectKey, verifyMagicBytes } from '../functions/api/_security.ts';

test('media deletion helper handles unconfigured environment safely', async () => {
  const result = await deleteMedia({}, ['media/example.webp', 'media/objects/private/a/video']);
  assert.deepEqual(result.deleted, []);
  assert.equal(result.failures.length, 0);
});

test('object key validation blocks traversal and permits media namespaces', () => {
  assert.equal(isValidObjectKey('media/objects/public/a/variants/full.webp'), true);
  assert.equal(isValidObjectKey('media/../snapshot.zip'), false);
  assert.equal(isValidObjectKey('b2-snapshots-2a052ae18938/file.zip'), false);
});

test('magic byte detection classifies WebP, AVIF and MP4 signatures', () => {
  assert.equal(verifyMagicBytes(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])).detectedMime, 'image/webp');
  const avif = new Uint8Array(32);
  avif.set([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66], 0);
  assert.equal(verifyMagicBytes(avif).detectedMime, 'image/avif');
  const mp4 = new Uint8Array(32);
  mp4.set([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d], 0);
  assert.equal(verifyMagicBytes(mp4).detectedMime, 'video/mp4');
});
