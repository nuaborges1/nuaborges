/**
 * Aplicação da Paleta Vinho Maduro, Elegante & Discreto (#843C52)
 * Conforme especificação oficial de auditoria Nua Borges.
 */

import fs from 'fs';
import path from 'path';

const TARGET_DIR = path.resolve(process.cwd());

const REPLACEMENTS = [
  { from: /#843C52/gi, to: '#843C52' }, // Vinho Principal (#843C52)
  { from: /#93485E/gi, to: '#93485E' }, // Vinho Hover suave (#93485E)
  { from: /#65313F/gi, to: '#65313F' }, // Vinho Profundo (#65313F)
  { from: /rgba\(194,\s*65,\s*108,/gi, to: 'rgba(132, 60, 82,' }, // Soft Wine Glow
];

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

  for (const rep of REPLACEMENTS) {
    if (rep.from.test(content)) {
      content = content.replace(rep.from, rep.to);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[Vinho Maduro Aplicado] ${path.relative(TARGET_DIR, filePath)}`);
    updatedCount++;
  }
});

console.log(`\nAplicação da paleta Vinho Maduro concluída! Total de arquivos ajustados: ${updatedCount}`);
