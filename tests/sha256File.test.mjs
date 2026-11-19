import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { sha256File } from '../lib/media/sha256File.ts';

test('sha256File hashes empty files and standard text exactly', async () => {
  assert.equal(await sha256File(new Blob([])), createHash('sha256').update('').digest('hex'));
  assert.equal(await sha256File(new Blob(['abc'])), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('sha256File processes every byte across multiple bounded chunks', async () => {
  const bytes = new Uint8Array(9 * 1024 * 1024 + 37);
  for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 131 + 17) & 0xff;
  const expected = createHash('sha256').update(bytes).digest('hex');
  assert.equal(await sha256File(new Blob([bytes]), undefined, 1024 * 1024), expected);
});
