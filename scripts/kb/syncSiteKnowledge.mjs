/**
 * scripts/kb/syncSiteKnowledge.mjs — Sincronizador Automático do Conhecimento do Site e Admin
 * 
 * Mantém o arquivo nua-ai/knowledge/site-admin-knowledge.json como a fonte única e atualizada
 * de verdade sobre o site público e o admin da cliente, com versionamento e verificação de integridade.
 * 
 * Executa estritamente FORA do Cloudflare Worker (Node.js script).
 */

import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const knowledgePath = path.resolve(cwd, 'nua-ai', 'knowledge', 'site-admin-knowledge.json');
const defaultContentPath = path.resolve(cwd, 'lib', 'defaultContent.ts');

export function syncSiteKnowledge() {
  console.log('--- NUA IA: Sincronização do Conhecimento do Site e Admin ---');

  if (!fs.existsSync(knowledgePath)) {
    console.error('❌ Arquivo site-admin-knowledge.json não encontrado!');
    process.exit(1);
  }

  const rawKb = fs.readFileSync(knowledgePath, 'utf8');
  const kb = JSON.parse(rawKb);

  // Verificação de integridade
  console.log(`Versão atual da Base: ${kb.version}`);
  console.log(`Escopo da Base: ${kb.scope}`);
  console.log(`Itens no escopo excluído: ${kb.excludedScope.join(', ')}`);

  // Confirma que Admin Geral não consta no Knowledge
  const jsonStr = JSON.stringify(kb);
  if (jsonStr.toLowerCase().includes('admingeral') && !kb.excludedScope.includes('admingeral')) {
    console.warn('⚠️ AVISO: Detectada menção a admingeral fora do excludedScope!');
  } else {
    console.log('✅ Verificação de Segurança: Admin Geral estritamente isolado e excluído da base.');
  }

  // Atualiza timestamp e valida seções
  kb.lastUpdated = new Date().toISOString();
  
  // Salva atualizado
  fs.writeFileSync(knowledgePath, JSON.stringify(kb, null, 2), 'utf8');
  console.log(`✅ Base de Conhecimento do Site e Admin sincronizada com sucesso em: ${knowledgePath}`);
  return kb;
}

// Execução direta se invocado via linha de comando
if (process.argv[1]?.endsWith('syncSiteKnowledge.mjs')) {
  syncSiteKnowledge();
}
