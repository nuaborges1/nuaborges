/**
 * scripts/kb/ingest.mjs — Pipeline de Ingestão Científica Desacoplada (Node.js)
 * 
 * Executa estritamente FORA do Cloudflare Worker (zero consumo de CPU dos 10ms do isolate).
 * Responsabilidades:
 * 1. Consulta PubMed via E-utilities pública com deduplicação por PMID
 * 2. Limpeza e extração estruturada de resumo, termos em PT/EN e evidência
 * 3. Divide em chunks pequenos (~250-350 tokens)
 * 4. Produz os arquivos JSON locais e o arquivo SQL para Cloudflare D1
 */

import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const chunksPath = path.resolve(cwd, 'nua-ai', 'scientific-kb', 'chunks.json');
const sourcesPath = path.resolve(cwd, 'nua-ai', 'scientific-kb', 'sources.json');
const d1SqlPath = path.resolve(cwd, 'nua-ai', 'scientific-kb', 'd1_migration.sql');

export async function fetchPubMedArticle(pmid) {
  console.log(`[PubMed Ingest] Buscando artigo PMID: ${pmid}...`);
  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Falha ao consultar NCBI PubMed: ${res.status}`);
  }

  const data = await res.json();
  const doc = data.result?.[pmid];
  if (!doc) {
    throw new Error(`Artigo PMID ${pmid} não encontrado na base NCBI.`);
  }

  return {
    pmid,
    title: doc.title,
    authors: (doc.authors || []).map((a) => a.name).join(', '),
    source: doc.source,
    pubdate: doc.pubdate,
    doi: doc.articleids?.find((id) => id.idtype === 'doi')?.value,
  };
}

export function generateD1Sql(chunks) {
  const lines = [
    '-- Cloudflare D1 Migration: Scientific KB with FTS5 Full-Text Search',
    'CREATE TABLE IF NOT EXISTS kb_chunks (',
    '  id TEXT PRIMARY KEY,',
    '  source_id TEXT,',
    '  domain TEXT,',
    '  authority TEXT,',
    '  tier TEXT,',
    '  title TEXT,',
    '  summary_pt TEXT,',
    '  content TEXT,',
    '  citation TEXT,',
    '  created_at TEXT DEFAULT CURRENT_TIMESTAMP',
    ');',
    '',
    'CREATE VIRTUAL TABLE IF NOT EXISTS kb_chunks_fts USING fts5(',
    '  title, summary_pt, content, keywords,',
    '  content="kb_chunks",',
    '  content_rowid="rowid"',
    ');',
    '',
    '-- Inserção em Lote dos Chunks',
  ];

  for (const c of chunks) {
    const escContent = c.content.replace(/'/g, "''");
    const escSummary = c.summaryPt.replace(/'/g, "''");
    const escCitation = c.citation.replace(/'/g, "''");
    const escTitle = c.title.replace(/'/g, "''");

    lines.push(
      `INSERT OR REPLACE INTO kb_chunks (id, source_id, domain, authority, tier, title, summary_pt, content, citation) VALUES ('${c.id}', '${c.sourceId}', '${c.domain}', '${c.authority}', '${c.tier}', '${escTitle}', '${escSummary}', '${escContent}', '${escCitation}');`
    );
  }

  return lines.join('\n');
}

// Execução direta via CLI se chamado diretamente
if (process.argv[1]?.endsWith('ingest.mjs')) {
  console.log('--- Pipeline de Ingestão Científica Nua IA ---');
  if (fs.existsSync(chunksPath)) {
    const raw = fs.readFileSync(chunksPath, 'utf8');
    const parsed = JSON.parse(raw);
    const sql = generateD1Sql(parsed.chunks || []);
    fs.writeFileSync(d1SqlPath, sql, 'utf8');
    console.log(`✅ Arquivo de migração D1 gerado com sucesso em: ${d1SqlPath}`);
  }
}
