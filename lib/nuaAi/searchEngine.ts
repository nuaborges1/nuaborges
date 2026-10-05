/**
 * NUA IA — Mecanismo de Busca Híbrida e Detecção de Referências Históricas
 * 
 * Detecta quando a Lua faz perguntas que dependem de conversas passadas
 * (ex: "aquele seguidor da semana passada", "aquele roteiro que você sugeriu")
 * e recupera SOMENTE trechos pontuais com controle estrito de tokens.
 */

import { getHistoryIndex, getConversationTurns } from './historyStore';
import { HistorySearchResult } from './types';
import { NUA_AI_CONFIG } from './config';

// Padrões de frases que indicam referência ao passado
const HISTORICAL_REFERENCE_REGEX = new RegExp(
  [
    'lembra\\s+(de|da|do|daquele|daquela|que|sobre)',
    'semana\\s+passada',
    'm[eê]s\\s+passado',
    'outro\\s+dia',
    'anteriormente',
    'j[aá]\\s+conversamos',
    'que\\s+(voc[eê]|a\\s+gente)\\s+(falou|conversou|sugeriu|combinou|discutiu|pensou)',
    'que\\s+eu\\s+te\\s+(falei|contei|disse|comentei)',
    'aquele\\s+(seguidor|roteiro|post|texto|v[ií]deo|cliente|ensaio|relato|assunto)',
    'aquela\\s+(ideia|campanha|conversa|d[uú]vida|estrat[eé]gia|mensagem|foto)',
    'qual\\s+(era|foi)\\s+aquela',
    'como\\s+ficou\\s+aquela',
    'o\\s+neg[oó]cio\\s+que\\s+voc[eê]\\s+sugeriu',
  ].join('|'),
  'i'
);

/**
 * Identifica se a mensagem contém pistas linguísticas de referência histórica.
 */
export function detectHistoricalReference(text: string): boolean {
  return HISTORICAL_REFERENCE_REGEX.test(text);
}

/**
 * Normaliza um texto para busca (minúsculo, sem acentos, sem pontuação excessiva).
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

// Palavras de parada e marcadores de intenção que NÃO devem contar como termos tópicos de busca
const QUERY_STOP_WORDS = new Set([
  'lembra', 'lembras', 'lembre', 'lembro', 'lembrança', 'lembrancas',
  'voce', 'aquele', 'aquela', 'aqueles', 'aquelas', 'daquele', 'daquela', 'desta', 'deste',
  'semana', 'passada', 'passado', 'mes', 'outro', 'dia', 'ontem', 'hoje',
  'sobre', 'para', 'com', 'que', 'uma', 'como', 'ficou', 'qual', 'era', 'foi',
  'falei', 'contei', 'disse', 'falou', 'conversou', 'sugeriu', 'combinou', 'pensou',
  'gente', 'nossa', 'nosso', 'conversamos', 'conversa', 'conversas', 'negocio',
  'coisa', 'algo', 'tudo', 'mais', 'menos', 'muito', 'pouco', 'sempre', 'nunca',
  'estava', 'estavam', 'tinha', 'tinham', 'tenho', 'temos', 'mandou', 'enviou',
]);

/**
 * Executa a busca híbrida no índice histórico e extrai apenas o trecho mais relevante.
 * Se nenhuma correspondência confiável for encontrada, retorna `null` para evitar alucinação.
 */
export function searchHistoricalSnippet(
  query: string,
  excludeConversationId?: string
): HistorySearchResult | null {
  const normQuery = normalizeText(query);
  const rawWords = normQuery.split(/\s+/).filter((w) => w.length >= 3);
  // Filtra apenas termos com valor tópico real
  const topicalWords = rawWords.filter((w) => !QUERY_STOP_WORDS.has(w));

  if (topicalWords.length === 0) return null;

  const index = getHistoryIndex();
  if (!index.conversations || index.conversations.length === 0) {
    return null;
  }

  interface ScoredConv {
    id: string;
    title: string;
    summary: string;
    createdAt: string;
    score: number;
    matchedEntities: string[];
    topicalMatches?: number;
  }

  const scoredList: ScoredConv[] = [];
  const nowMs = Date.now();

  for (const conv of index.conversations) {
    if (excludeConversationId && conv.id === excludeConversationId) {
      continue;
    }

    let score = 0;
    let topicalMatches = 0;
    const matchedEntities: string[] = [];

    // 1. Match de entidades explícitas (peso altíssimo: +12 cada)
    if (conv.entities && Array.isArray(conv.entities)) {
      for (const ent of conv.entities) {
        const normEnt = normalizeText(ent);
        if (normEnt && normQuery.includes(normEnt)) {
          score += 12;
          topicalMatches += 2;
          matchedEntities.push(ent);
        }
      }
    }

    // 2. Match de palavras-chave indexadas (+5 cada)
    if (conv.keywords && Array.isArray(conv.keywords)) {
      for (const kw of conv.keywords) {
        const normKw = normalizeText(kw);
        if (normKw && topicalWords.includes(normKw)) {
          score += 5;
          topicalMatches++;
        }
      }
    }

    // 3. Match no título e resumo (+4 por termo tópico)
    const normTitle = normalizeText(conv.title || '');
    const normSummary = normalizeText(conv.summary || '');
    for (const word of topicalWords) {
      if (normTitle.includes(word)) {
        score += 4;
        topicalMatches++;
      }
      if (normSummary.includes(word)) {
        score += 3;
        topicalMatches++;
      }
    }

    // Só qualifica se houver real correspondência temática (pelo menos 1 entidade ou 2 matches tópicos)
    if (topicalMatches >= 2 || matchedEntities.length >= 1) {
      // 4. Boost de proximidade temporal apenas como desempate se houver match temático
      const convDateMs = new Date(conv.updatedAt || conv.createdAt).getTime();
      const daysAgo = Math.max(0, (nowMs - convDateMs) / (1000 * 60 * 60 * 24));
      if (daysAgo <= 7) {
        score += 2; // última semana
      } else if (daysAgo <= 30) {
        score += 1; // último mês
      }

      if (score >= 10) {
        scoredList.push({
          id: conv.id,
          title: conv.title,
          summary: conv.summary,
          createdAt: conv.createdAt,
          score,
          matchedEntities,
        });
      }
    }
  }

  if (scoredList.length === 0) {
    return null;
  }

  // Ordena pelo maior score
  scoredList.sort((a, b) => b.score - a.score);
  const best = scoredList[0];

  // Recupera as falas reais do JSONL para a conversa vencedora
  const turns = getConversationTurns(best.id, 6);
  if (turns.length === 0) {
    return null;
  }

  // Monta um snippet compacto e informativo (máx ~450 tokens / 1400 caracteres)
  const dateFormatted = new Date(best.createdAt).toLocaleDateString('pt-BR');
  const lines: string[] = [
    `[Registro Histórico: "${best.title}" — Ocorrida em ${dateFormatted}]`,
  ];

  for (const t of turns) {
    const speaker = t.role === 'user' ? 'Lua' : 'Nua IA';
    lines.push(`${speaker}: "${t.content.trim()}"`);
  }

  const rawSnippet = lines.join('\n');
  const snippet = rawSnippet.slice(0, 1400);

  return {
    conversationId: best.id,
    title: best.title,
    matchedEntities: best.matchedEntities,
    score: best.score,
    snippet,
    timestamp: best.createdAt,
  };
}
