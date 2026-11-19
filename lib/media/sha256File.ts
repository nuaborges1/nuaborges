const ROUND_CONSTANTS = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const INITIAL_STATE = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]);

const rotateRight = (value: number, bits: number) => (value >>> bits) | (value << (32 - bits));

class Sha256Stream {
  private state = new Uint32Array(INITIAL_STATE);
  private pending = new Uint8Array(64);
  private pendingLength = 0;
  private bytesProcessed = 0;

  update(chunk: Uint8Array): void {
    this.bytesProcessed += chunk.byteLength;
    let offset = 0;

    if (this.pendingLength > 0) {
      const copied = Math.min(64 - this.pendingLength, chunk.byteLength);
      this.pending.set(chunk.subarray(0, copied), this.pendingLength);
      this.pendingLength += copied;
      offset += copied;
      if (this.pendingLength === 64) {
        this.processBlock(this.pending, 0);
        this.pendingLength = 0;
      }
    }

    while (offset + 64 <= chunk.byteLength) {
      this.processBlock(chunk, offset);
      offset += 64;
    }

    if (offset < chunk.byteLength) {
      this.pending.set(chunk.subarray(offset), 0);
      this.pendingLength = chunk.byteLength - offset;
    }
  }

  digestHex(): string {
    const tail = new Uint8Array(128);
    tail.set(this.pending.subarray(0, this.pendingLength));
    tail[this.pendingLength] = 0x80;
    const paddedLength = this.pendingLength < 56 ? 64 : 128;
    const bitLength = BigInt(this.bytesProcessed) * BigInt(8);
    const view = new DataView(tail.buffer);
    const mask32 = BigInt('0xffffffff');
    view.setUint32(paddedLength - 8, Number((bitLength >> BigInt(32)) & mask32), false);
    view.setUint32(paddedLength - 4, Number(bitLength & mask32), false);
    this.processBlock(tail, 0);
    if (paddedLength === 128) this.processBlock(tail, 64);
    return Array.from(this.state, (word) => word.toString(16).padStart(8, '0')).join('');
  }

  private processBlock(bytes: Uint8Array, offset: number): void {
    const words = new Uint32Array(64);
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 64);
    for (let i = 0; i < 16; i++) words[i] = view.getUint32(i * 4, false);
    for (let i = 16; i < 64; i++) {
      const x = words[i - 15];
      const y = words[i - 2];
      const s0 = rotateRight(x, 7) ^ rotateRight(x, 18) ^ (x >>> 3);
      const s1 = rotateRight(y, 17) ^ rotateRight(y, 19) ^ (y >>> 10);
      words[i] = (words[i - 16] + s0 + words[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = this.state;
    for (let i = 0; i < 64; i++) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + sum1 + choice + ROUND_CONSTANTS[i] + words[i]) >>> 0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (sum0 + majority) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }

    this.state[0] = (this.state[0] + a) >>> 0;
    this.state[1] = (this.state[1] + b) >>> 0;
    this.state[2] = (this.state[2] + c) >>> 0;
    this.state[3] = (this.state[3] + d) >>> 0;
    this.state[4] = (this.state[4] + e) >>> 0;
    this.state[5] = (this.state[5] + f) >>> 0;
    this.state[6] = (this.state[6] + g) >>> 0;
    this.state[7] = (this.state[7] + h) >>> 0;
  }
}

/** Hashes every file byte in bounded chunks without allocating a full-file buffer. */
export async function sha256File(
  file: Blob,
  onProgress?: (percent: number) => void,
  chunkBytes = 2 * 1024 * 1024
): Promise<string> {
  if (!Number.isSafeInteger(file.size) || file.size < 0) {
    throw new Error('Tamanho de arquivo inválido para cálculo do SHA-256.');
  }
  const hasher = new Sha256Stream();
  for (let offset = 0; offset < file.size; offset += chunkBytes) {
    const buffer = await file.slice(offset, Math.min(file.size, offset + chunkBytes)).arrayBuffer();
    hasher.update(new Uint8Array(buffer));
    onProgress?.(file.size === 0 ? 100 : Math.round(((offset + buffer.byteLength) / file.size) * 100));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  onProgress?.(100);
  return hasher.digestHex();
}
