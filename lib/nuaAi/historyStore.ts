/**
 * NUA IA — Gerenciador de Histórico Persistente (JSONL + Index)
 * 
 * Persiste conversas em formato JSONL particionado por mês (`YYYY-MM.jsonl`)
 * e mantém índice leve em `index.json` para busca instantânea e navegação.
 */

import fs from 'node:fs';
import path from 'node:path';
import { HistoryTurn, HistoryIndex, ConversationMeta } from './types';

// Cache do índice em RAM
let cachedIndex: HistoryIndex | null = null;
let lastIndexMtimeMs = 0;

function resolveHistoryDir(): string {
  const dir = path.resolve(process.cwd(), 'nua-ai', 'history');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function resolveIndexFilePath(): string {
  return path.join(resolveHistoryDir(), 'index.json');
}

function resolveMonthJsonlPath(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return path.join(resolveHistoryDir(), `${yyyy}-${mm}.jsonl`);
}

/**
 * Carrega o índice de conversas com cache em RAM.
 */
export function getHistoryIndex(): HistoryIndex {
  const indexPath = resolveIndexFilePath();

  try {
    if (!fs.existsSync(indexPath)) {
      const initial: HistoryIndex = {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        conversations: [],
      };
      fs.writeFileSync(indexPath, JSON.stringify(initial, null, 2), 'utf8');
      cachedIndex = initial;
      lastIndexMtimeMs = Date.now();
      return cachedIndex;
    }

    const stats = fs.statSync(indexPath);
    if (cachedIndex && stats.mtimeMs <= lastIndexMtimeMs) {
      return cachedIndex;
    }

    const raw = fs.readFileSync(indexPath, 'utf8');
    const parsed = JSON.parse(raw) as HistoryIndex;
    cachedIndex = parsed;
    lastIndexMtimeMs = stats.mtimeMs;
    return cachedIndex;
  } catch (err) {
    console.warn('[NuaAiHistory] Erro ao ler índice de histórico:', err);
    return cachedIndex || { version: '1.0', lastUpdated: new Date().toISOString(), conversations: [] };
  }
}

/**
 * Salva o índice atualizado.
 */
export function saveHistoryIndex(index: HistoryIndex): void {
  const indexPath = resolveIndexFilePath();
  index.lastUpdated = new Date().toISOString();
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
  cachedIndex = index;
  lastIndexMtimeMs = Date.now();
}

/**
 * Grava uma mensagem/evento no JSONL particionado e atualiza o índice de metadados.
 */
export async function appendHistoryTurn(turn: HistoryTurn, customTitle?: string): Promise<void> {
  const dir = resolveHistoryDir();
  const date = new Date(turn.timestamp || Date.now());
  const jsonlPath = resolveMonthJsonlPath(date);

  // 1. Gravação append-only atômica no JSONL
  const line = JSON.stringify(turn) + '\n';
  fs.appendFileSync(jsonlPath, line, 'utf8');

  // 2. Atualização do índice de conversas
  const index = getHistoryIndex();
  let meta = index.conversations.find((c) => c.id === turn.conversation_id);

  if (!meta) {
    const title = customTitle || (turn.role === 'user' ? turn.content.slice(0, 40) + '...' : 'Nova conversa');
    meta = {
      id: turn.conversation_id,
      title,
      summary: turn.content.slice(0, 150),
      createdAt: turn.timestamp,
      updatedAt: turn.timestamp,
      messageCount: 1,
      entities: extractSimpleEntities(turn.content),
      keywords: extractSimpleKeywords(turn.content),
    };
    index.conversations.unshift(meta);
  } else {
    meta.updatedAt = turn.timestamp;
    meta.messageCount += 1;
    if (turn.role === 'user' && meta.messageCount <= 2 && !customTitle) {
      meta.title = turn.content.slice(0, 45) + (turn.content.length > 45 ? '...' : '');
    }
    // Incrementa entidades e keywords
    const newEntities = extractSimpleEntities(turn.content);
    newEntities.forEach((e) => {
      if (!meta!.entities.includes(e)) meta!.entities.push(e);
    });
    const newKeywords = extractSimpleKeywords(turn.content);
    newKeywords.forEach((k) => {
      if (!meta!.keywords.includes(k)) meta!.keywords.push(k);
    });
    // Atualiza resumo básico se a conversa estiver se desenvolvendo
    if (meta.messageCount % 4 === 0) {
      meta.summary = `${meta.summary.slice(0, 100)}... Último tópico: ${turn.content.slice(0, 60)}`;
    }
  }

  saveHistoryIndex(index);
}

/**
 * Lê os turnos de uma conversa específica procurando nos arquivos JSONL.
 */
export function getConversationTurns(conversationId: string, limit = 20): HistoryTurn[] {
  const dir = resolveHistoryDir();
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')).sort().reverse();
  const turns: HistoryTurn[] = [];

  for (const file of files) {
    const filePath = path.join(dir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const item = JSON.parse(line) as HistoryTurn;
          if (item.conversation_id === conversationId) {
            turns.push(item);
          }
        } catch {}
      }
    } catch {}
  }

  // Ordena por timestamp crescente
  turns.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return turns.slice(-limit);
}

/**
 * Extrai entidades simples (nomes com letra maiúscula ou termos relevantes).
 */
function extractSimpleEntities(text: string): string[] {
  const entities: string[] = [];
  // Detecta nomes próprios comuns e palavras capitalizadas no meio da frase
  const matches = text.match(/\b[A-ZÀ-Ú][a-zà-ú]{2,}\b/g) || [];
  for (const m of matches) {
    if (!['Lua', 'Nua', 'Borges', 'Para', 'Como', 'Você', 'Hoje', 'Acho'].includes(m)) {
      if (!entities.includes(m)) entities.push(m);
    }
  }
  return entities.slice(0, 6);
}

/**
 * Extrai keywords normalizadas.
 */
function extractSimpleKeywords(text: string): string[] {
  const stopWords = new Set(['para', 'com', 'que', 'uma', 'como', 'sobre', 'esse', 'essa', 'este', 'esta', 'meus', 'minha', 'isso', 'aqui', 'hoje']);
  const clean = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');

  const words = clean.split(/\s+/).filter((w) => w.length >= 4 && !stopWords.has(w));
  return Array.from(new Set(words)).slice(0, 10);
}
