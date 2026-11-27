import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const nextBuildDir = path.join(root, '.next-build');

async function exists(target) {
  return (await fs.stat(target).catch(() => null)) !== null;
}

async function prepareStaticBuild() {
  if (!(await exists(nextBuildDir))) return;

  // Garante build estático isolado de `.next` (preservando eventual `next dev` ativo)
  // removendo artefatos anteriores de `.next-build` antes de `next build`.
  await fs.rm(nextBuildDir, { recursive: true, force: true });
}

await prepareStaticBuild();
