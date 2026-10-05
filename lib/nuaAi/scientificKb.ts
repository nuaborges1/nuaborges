/**
 * NUA IA — Motor de Recuperação da Scientific Knowledge Base (RAG Científico)
 * 
 * Consulta os chunks científicos curados (OMS, Ministério da Saúde, FEBRASGO, Basson)
 * com autoridade classificada (Tier A, Tier B, Tier C) e controle de tokens.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface ScientificChunk {
  id: string;
  sourceId: string;
  domain: string;
  authority: string;
  tier: 'A' | 'B' | 'C';
  keywordsPt: string[];
  keywordsEn: string[];
  title: string;
  summaryPt: string;
  content: string;
  citation: string;
  isCurated: boolean;
}

export interface ScientificSource {
  id: string;
  authority: string;
  tier: 'A' | 'B' | 'C';
  country: string;
  title: string;
  year: number;
  url?: string;
  doi?: string;
  pmid?: string;
  type: string;
}

export interface ScientificMatch {
  chunk: ScientificChunk;
  score: number;
  matchedTerms: string[];
}

let cachedChunks: ScientificChunk[] | null = null;
let lastChunksMtime = 0;

function resolveChunksPath(): string {
  return path.resolve(process.cwd(), 'nua-ai', 'scientific-kb', 'chunks.json');
}

/**
 * Carrega a base de chunks científicos com cache em RAM.
 */
export function getScientificChunks(): ScientificChunk[] {
  const filePath = resolveChunksPath();

  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const stats = fs.statSync(filePath);
    if (cachedChunks && stats.mtimeMs <= lastChunksMtime) {
      return cachedChunks;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    cachedChunks = parsed.chunks || [];
    lastChunksMtime = stats.mtimeMs;
    return cachedChunks!;
  } catch (err) {
    console.warn('[ScientificKb] Erro ao carregar chunks:', err);
    return cachedChunks || [];
  }
}

/**
 * Busca trechos científicos relevantes para a pergunta.
 */
export function searchScientificKb(query: string, maxResults = 2): ScientificMatch[] {
  const chunks = getScientificChunks();
  if (chunks.length === 0) return [];

  const lowerQuery = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const words = lowerQuery.split(/\s+/).filter((w) => w.length >= 3);
  const matches: ScientificMatch[] = [];

  for (const chunk of chunks) {
    let score = 0;
    const matchedTerms: string[] = [];

    // Peso por Tier de Autoridade
    if (chunk.tier === 'A') score += 10;
    if (chunk.tier === 'B') score += 6;

    // Match de palavras-chave em PT
    for (const kw of chunk.keywordsPt) {
      const normKw = kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (lowerQuery.includes(normKw)) {
        score += 12;
        matchedTerms.push(kw);
      }
    }

    // Match nos termos individuais do query no título ou resumo
    const normSummary = chunk.summaryPt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const w of words) {
      if (normSummary.includes(w)) {
        score += 3;
      }
    }

    // Se houve match real
    if (matchedTerms.length > 0 || score >= 20) {
      matches.push({
        chunk,
        score,
        matchedTerms,
      });
    }
  }

  // Ordena por maior relevância
  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, maxResults);
}

/**
 * Avalia se é uma pergunta canônica curada que pode ser respondida diretamente (Zero Custo).
 */
export function tryLocalScientificResponse(query: string): string | null {
  const lower = query.toLowerCase();

  const norm = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Caso 1: Definição oficial de Saúde Sexual segundo a OMS
  if (
    norm.includes('saude sexual') &&
    (norm.includes('oms') || norm.includes('who') || norm.includes('definicao') || norm.includes('conceito'))
  ) {
    const chunks = getScientificChunks();
    const whoChunk = chunks.find((c) => c.id === 'chk_who_def_sexual_health');
    if (whoChunk) {
      return `Segundo a **Organização Mundial da Saúde (OMS)**:\n\n> "${whoChunk.content}"\n\n📌 **Fonte Oficial:** ${whoChunk.citation}\n\n*Esse conceito é fundamental para o trabalho da Nua, pois estabelece o prazer, o consentimento e a ausência de violência como partes indissociáveis da saúde.*`;
    }
  }

  // Caso 2: O que é Desejo Responsivo de Basson
  if (
    (norm.includes('desejo responsivo') || norm.includes('basson')) &&
    (norm.includes('que e') || norm.includes('explica') || norm.includes('como funciona') || norm.includes('conceito'))
  ) {
    const chunks = getScientificChunks();
    const bassonChunk = chunks.find((c) => c.id === 'chk_basson_desejo_responsivo');
    if (bassonChunk) {
      return `O **Desejo Responsivo**, formulado pela médica Rosemary Basson (2000), descreve que na sexualidade feminina o desejo frequentemente não surge do nada (espontâneo), mas sim **em resposta à estimulação, intimidade emocional e conexão prévia**.\n\nNo modelo circular de Basson, a mulher pode iniciar o contato sexual a partir de um estado de neutralidade receptiva, e o desejo é gerado à medida que a excitação acontece. Isso desconstrói a culpa de muitas mulheres que acreditavam ter baixa libido apenas por não sentirem desejo espontâneo constante.\n\n📌 **Referência Científica:** ${bassonChunk.citation}`;
    }
  }

  return null;
}
