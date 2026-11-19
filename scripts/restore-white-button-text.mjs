/**
 * Restaura texto branco nos botões vinho maduro conforme preferência do usuário.
 */

import fs from 'fs';
import path from 'path';

const TARGET_DIR = path.resolve(process.cwd());

function walkDir(dir, callback) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git', 'out', 'out-admin', 'out-site', '.wrangler'].includes(entry.name)) {
        continue;
      }
      walkDir(fullPath, callback);
    } else if (entry.isFile()) {
      if (['.tsx', '.ts', '.css', '.js', '.mjs', '.html'].includes(path.extname(entry.name))) {
        callback(fullPath);
      }
    }
  }
}

let updatedCount = 0;

walkDir(TARGET_DIR, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  if (content.includes('text-zinc-950 font-bold') || content.includes('text-zinc-950')) {
    // Substitui text-zinc-950 (ou text-zinc-950 font-bold) por text-white em botões bg-[#843C52] ou bg-[var(--pink)]
    content = content.replace(/bg-\[#843C52\]([^>]*?)text-zinc-950(\s+font-bold)?/g, 'bg-[#843C52]$1text-white');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[Restaurado para Branco] ${path.relative(TARGET_DIR, filePath)}`);
    updatedCount++;
  }
});

console.log(`\nRestauração concluída! Total de arquivos ajustados: ${updatedCount}`);
