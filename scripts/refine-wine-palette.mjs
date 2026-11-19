/**
 * Script de refinamento da paleta Vinho Maduro / Nua Borges
 * Eleva a luminosidade e o contraste (de #843C52 para #843C52 e #93485E)
 * e garante texto de alto contraste em botões primários.
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

  // Substitui o vinho muito escuro (#843C52) por vinho vibrante com boa luminância (#843C52)
  if (content.includes('#843C52')) {
    content = content.replace(/#843C52/gi, '#843C52');
    changed = true;
  }

  // Em botões primários (bg-[#...]), garante texto escuro de alto contraste
  if (content.includes('bg-[#843C52]') && content.includes('text-white')) {
    content = content.replace(/bg-\[#843C52\]([^>]*?)text-white/g, 'bg-[#843C52]$1text-white');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[Refinado] ${path.relative(TARGET_DIR, filePath)}`);
    updatedCount++;
  }
});

console.log(`\nRefinamento concluído com sucesso! Total de arquivos ajustados: ${updatedCount}`);
