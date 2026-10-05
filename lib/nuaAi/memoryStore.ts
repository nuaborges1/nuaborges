/**
 * NUA IA — Gerenciador de Memória Persistente com Cache em RAM
 * 
 * Mantém `nua-memory.json` pré-carregado na memória para consultas instantâneas.
 * Salva no disco e atualiza o cache atômico quando houver nova consolidação.
 */

import fs from 'node:fs';
import path from 'node:path';
import { NuaMemory } from './types';

// Fallback padrão seguro para inicialização ou degradação graciosa
export const DEFAULT_NUA_MEMORY: NuaMemory = {
  brand: {
    name: 'Nua Borges',
    creator: "Nayara 'Lua' Borges",
    profession: 'Educadora sexual, sexóloga e criadora de conteúdo',
    positioning: 'Educação sexual elegante, intimista e autêntica, unindo sensualidade editorial, ciência e conexão humana com alto padrão.',
    audience: 'Mulheres, homens e casais que buscam autoconhecimento, quebra de tabus e intimidade saudável com sofisticação.',
    tone: 'Acolhedor, elegante, direto, intimista, inteligente, descomplicado, sem jargões corporativos e sem apelação publicitária agressiva.',
  },
  preferences: {
    scripts: 'Prefere roteiros naturais, espontâneos, curtos (45-60s) e fáceis de gravar em vídeo. Odeia linguagem excessivamente publicitária ou mecânica.',
    formats: 'Prioriza Reels dinâmicos com gancho forte nos primeiros 3 segundos, Stories diários conversacionais e carrosséis com estética editorial refinada.',
    design_elements: 'Preto profundo (#09090b), rosa chá (#f4a7b9), dourado suave (#d4af37). Proibido o uso de ícones de faísca (sparkles) ou estética infantil.',
    communication: 'Gosta de conversar como conselheira e amiga próxima, sem postura professoral fria e sem intimidade forçada.',
  },
  goals: {
    current_priority: 'Aumentar o alcance orgânico qualificado e o engajamento autêntico da comunidade.',
    secondary_goals: 'Consolidar a autoridade como sexóloga de referência com estética de luxo e aproximar seguidores em conversas reais.',
  },
  projects: [
    {
      name: 'Portal Nua Borges (nuaborges.com)',
      status: 'Em operação',
      summary: 'Site oficial com ensaios editoriais, biografia, player de música e canais oficiais.',
    },
    {
      name: 'Linha Editorial Instagram & Reels',
      status: 'Ativo',
      summary: 'Produção semanal de vídeos com respostas a dúvidas da audiência, reflexões sexológicas e bastidores.',
    },
  ],
  decisions: [
    {
      date: '2026-09-01',
      topic: 'Tom da marca',
      decision: 'Manter postura de conselheira e amiga íntima, sem apelação sensacionalista.',
    },
    {
      date: '2026-09-15',
      topic: 'Roteiros de Reels',
      decision: 'Limitar gravações a 45-60 segundos com ganchos fortes nos primeiros 3 segundos.',
    },
  ],
  content_preferences: [
    'Ganchos provocativos e elegantes nos primeiros 3 segundos de cada vídeo',
    'Linguagem acolhedora que acolhe inseguranças e dúvidas sem julgamento',
    "Chamadas para ação (CTAs) conversacionais nos Stories ('me conta aqui', 'já passou por isso?')",
  ],
  admin_knowledge: {
    hero: 'Aba Início: altera título principal, subtítulo e imagem de destaque.',
    gallery: 'Aba Galeria: gerencia ensaios fotográficos e ordem das fotos.',
    about: 'Aba Sobre: edita manifesto, biografia e fotos de apresentação.',
    channels: 'Aba Canais: links para Instagram, redes e canais.',
    contact: 'Aba Contato: assuntos de formulário e orientações de contato.',
    library: 'Aba Acervo: biblioteca de fotos e uploads privados.',
    requests: 'Aba Solicitações: central onde a Lua envia pedidos de melhoria ao Philippe com triagem da IA.',
  },
  important_context: [
    'A Nua IA é uma assistente consultiva e criativa, sem permissão para executar alterações no site.',
    'Philippe é o desenvolvedor e arquiteto de software responsável pela engenharia e código da plataforma.',
  ],
};

// Cache em memória (RAM)
let cachedMemory: NuaMemory = DEFAULT_NUA_MEMORY;
let lastMemoryMtimeMs = 0;

function resolveMemoryFilePath(): string {
  return path.resolve(process.cwd(), 'nua-ai', 'memory', 'nua-memory.json');
}

/**
 * Carrega a memória do disco ou devolve do cache em RAM.
 */
export function getLoadedMemory(): NuaMemory {
  const filePath = resolveMemoryFilePath();

  try {
    if (!fs.existsSync(filePath)) {
      // Se não existir, assegura a pasta e salva o default
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(DEFAULT_NUA_MEMORY, null, 2), 'utf8');
      cachedMemory = DEFAULT_NUA_MEMORY;
      lastMemoryMtimeMs = Date.now();
      return cachedMemory;
    }

    const stats = fs.statSync(filePath);
    if (stats.mtimeMs <= lastMemoryMtimeMs) {
      return cachedMemory; // Retorno instantâneo do cache em RAM
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    cachedMemory = {
      ...DEFAULT_NUA_MEMORY,
      ...parsed,
      brand: { ...DEFAULT_NUA_MEMORY.brand, ...(parsed.brand || {}) },
      preferences: { ...DEFAULT_NUA_MEMORY.preferences, ...(parsed.preferences || {}) },
      goals: { ...DEFAULT_NUA_MEMORY.goals, ...(parsed.goals || {}) },
    };
    lastMemoryMtimeMs = stats.mtimeMs;
    return cachedMemory;
  } catch (err) {
    console.warn('[NuaAiMemory] Falha ao ler arquivo de memória, usando cache em fallback:', err);
    return cachedMemory || DEFAULT_NUA_MEMORY;
  }
}

/**
 * Salva a memória no disco e atualiza o cache em RAM.
 */
export async function saveMemory(updated: NuaMemory): Promise<void> {
  const filePath = resolveMemoryFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf8');
  cachedMemory = updated;
  lastMemoryMtimeMs = Date.now();
}

/**
 * Extrai apenas os fatos mais relevantes da memória para responder à pergunta atual
 * sem enviar todo o JSON bruto para o modelo (Economia Máxima de Tokens).
 */
export function extractRelevantMemoryFacts(query: string): string[] {
  const mem = getLoadedMemory();
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const facts: string[] = [];

  // Fatos sempre presentes (Essência da marca)
  facts.push(`Posicionamento: ${mem.brand.positioning}`);
  facts.push(`Tom da voz: ${mem.brand.tone}`);

  // Se perguntar sobre roteiros, reels ou formato de gravação
  if (q.includes('roteiro') || q.includes('reel') || q.includes('grava') || q.includes('post') || q.includes('video')) {
    if (mem.preferences.scripts) facts.push(`Preferência de roteiro: ${mem.preferences.scripts}`);
    if (mem.preferences.formats) facts.push(`Formatos preferidos: ${mem.preferences.formats}`);
    mem.content_preferences.forEach((cp) => facts.push(`Diretriz de conteúdo: ${cp}`));
  }

  // Se perguntar sobre metas, alcance ou objetivos
  if (q.includes('meta') || q.includes('alcance') || q.includes('objetivo') || q.includes('crescimento') || q.includes('planeja')) {
    if (mem.goals.current_priority) facts.push(`Meta prioritária: ${mem.goals.current_priority}`);
    if (mem.goals.secondary_goals) facts.push(`Objetivos secundários: ${mem.goals.secondary_goals}`);
  }

  // Se perguntar sobre onde fica algo no site ou admin
  if (q.includes('onde') || q.includes('painel') || q.includes('admin') || q.includes('muda') || q.includes('foto') || q.includes('galeria') || q.includes('texto') || q.includes('site')) {
    for (const [sec, desc] of Object.entries(mem.admin_knowledge)) {
      if (q.includes(sec) || q.includes('onde') || q.includes('como')) {
        facts.push(`Seção do Admin (${sec}): ${desc}`);
      }
    }
  }

  // Regra inviolável
  facts.push('Regra: Nua IA conhece a Nua, mas não possui permissões administrativas para alterar o site diretamente.');

  return facts.slice(0, 8);
}
