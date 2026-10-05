/**
 * NUA IA — Classificador de Intenções e Roteador de Contexto
 * 
 * Classifica a intenção da mensagem da Nua Borges para determinar:
 * 1. Quais camadas consultar (Scientific KB, Knowledge, Memory, History)
 * 2. Se a pergunta pode ser respondida localmente (zero custo) ou exige o modelo
 * 3. Orçamento de tokens dedicado a cada contexto
 */

import { isDispatchConfirmation } from './ticketExtractor';

export type NuaAiIntent =
  | 'SCIENTIFIC_LOOKUP'
  | 'KNOWLEDGE_LOOKUP'
  | 'TECHNICAL_REQUEST'
  | 'DISPATCH_CONFIRMATION'
  | 'MEMORY_LOOKUP'
  | 'HISTORY_LOOKUP'
  | 'CREATIVE'
  | 'STRATEGY'
  | 'ANALYSIS'
  | 'WRITING'
  | 'MIXED';

export interface IntentClassificationResult {
  primaryIntent: NuaAiIntent;
  confidence: number;
  consultScientificKb: boolean;
  consultKnowledge: boolean;
  consultMemory: boolean;
  consultHistory: boolean;
  canAnswerLocally: boolean;
  scientificKeywords: string[];
}

// Termos científicos de sexologia e saúde sexual
const SCIENTIFIC_TERMS_REGEX = new RegExp(
  [
    'sa[uú]de\\s+sexual',
    'clit[oó]ris',
    'orgasmo',
    'desejo\\s+(responsivo|espont[aâ]neo)',
    'ciclo\\s+de\\s+(resposta|basson|masters)',
    'rosemary\\s+basson',
    'lubrifica[cç][aã]o',
    'disfun[cç][aã]o',
    'vaginismo',
    'vulvod[ií]nia',
    'prep',
    'pep',
    'ist[s]?',
    'hiv',
    'preservativo',
    'camisinha',
    'contracep[cç][aã]o',
    'consentimento',
    'fries',
    'prazer\\s+feminino',
    'educa[cç][aã]o\\s+sexual',
    'anatomia',
    'fisiologia',
    'assoalho\\s+p[eé]lvico',
  ].join('|'),
  'i'
);

// Termos do portal e conhecimento da Nua
const KNOWLEDGE_TERMS_REGEX = new RegExp(
  [
    '(?:queria|quero|gostaria\\s+de|preciso|vou)\\s+(?:trocar|mudar|alterar|editar|tirar|remover|ajustar)',
    '(?:trocar|mudar|alterar|editar|ajustar|substituir)\\s+(?:o\\s+|a\\s+|esse\\s+|essa\\s+|este\\s+|esta\\s+)?(?:texto|frase|palavra|foto|imagem|link|t[ií]tulo|subt[ií]tulo|bot[aã]o|banner)',
    'n[aã]o\\s+gostei\\s+(?:d[eoa]|desse|dessa|daquele|daquela)',
    'explore\\s+o\\s+mundo',
    'exploretext',
    'frase\\s+(?:da\\s+capa|do\\s+rodap[eé]|de\\s+boas[- ]vindas|do\\s+bot[aã]o)',
    'convite\\s+(?:do\\s+rodap[eé]|de\\s+scroll)',
    'rodap[eé]\\s+da\\s+capa',
    'texto\\s+do\\s+(?:site|painel|admin|rodap[eé]|topo|bot[aã]o)',
    'onde\\s+(?:posso\\s+)?(?:fica|ficar|mudo|mudar|altero|alterar|edito|editar|troco|trocar|aparece|est[aá]|encontro)',
    'como\\s+(?:posso\\s+)?(?:altero|mudo|edito|troco|alterar|mudar|editar|trocar|funciona|publicar|salvar)',
    'para\\s+que\\s+serve',
    'o\\s+que\\s+(?:essa\\s+parte|essa\\s+aba|essa\\s+se[cç][aã]o|esse\\s+bot[aã]o|essa\\s+foto|esse\\s+texto|aparece|tem|faz)',
    'qual\\s+(?:texto|foto|bot[aã]o|fun[cç][aã]o|finalidade)',
    'esse\\s+bot[aã]o\\s+leva',
    'essa\\s+foto\\s+aparece',
    'essa\\s+informa[cç][aã]o\\s+pode\\s+ser\\s+alterada',
    'em\\s+qual\\s+parte\\s+do\\s+site',
    'painel',
    'admin',
    'aba\\s+(?:galeria|in[ií]cio|capa|sobre|canais|redes|contato|biblioteca|acervo|pedidos|solicita[cç][oõ]es|ajustes|seo)',
    'publicar\\s+(?:no\\s+site|altera[cç][oõ]es)',
    'salvar\\s+rascunho',
    'cores\\s+oficiais',
    'posicionamento',
    'servi[cç]os',
    'nuaborges\\.com',
    'site\\s+da\\s+nua',
    'termos\\s+de\\s+uso',
    'pol[ií]tica\\s+de\\s+privacidade',
    'blog',
    'tumblr',
    'contrato',
    'anexo\\s+i',
  ].join('|'),
  'i'
);

// Termos de implementação técnica, código, APIs e infraestrutura
const TECHNICAL_TERMS_REGEX = new RegExp(
  [
    '\\bapi\\b',
    'api\\s*key',
    'token',
    'endpoint',
    'c[oó]digo',
    'banco\\s+de\\s+dados',
    'database',
    'sql',
    'cloudflare',
    'servidor',
    'server',
    'hospedagem',
    'deploy',
    'git',
    'github',
    'webhook',
    'autentica[cç][aã]o',
    'qual\\s+arquivo',
    'me\\s+passa\\s+o\\s+c[oó]digo',
    'integra[cç][aã]o\\s+(?:do\\s+)?(?:whatsapp|gateway|pagamento|pixel|api)',
  ].join('|'),
  'i'
);

// Termos de histórico passado
const HISTORY_TERMS_REGEX = new RegExp(
  [
    'lembra\\s+(de|da|do|daquele|daquela|que|sobre)',
    'semana\\s+passada',
    'm[eê]s\\s+passado',
    'outro\\s+dia',
    'que\\s+(voc[eê]|a\\s+gente)\\s+(falou|conversou|sugeriu|combinou)',
    'aquele\\s+seguidor',
  ].join('|'),
  'i'
);

// Termos de criação de roteiros e Reels
const CREATIVE_TERMS_REGEX = new RegExp(
  [
    'cria\\s+(um\\s+)?roteiro',
    'ideia\\s+de\\s+reel',
    'ideia\\s+para\\s+post',
    'gancho',
    'stories\\s+de\\s+hoje',
    'carrossel',
    'sugest[aã]o\\s+de\\s+v[ií]deo',
  ].join('|'),
  'i'
);

/**
 * Classifica a intenção de uma mensagem.
 */
export function classifyIntent(message: string): IntentClassificationResult {
  const text = message.trim();
  const lower = text.toLowerCase();

  const isScientific = SCIENTIFIC_TERMS_REGEX.test(lower);
  const isKnowledge = KNOWLEDGE_TERMS_REGEX.test(lower);
  const isHistory = HISTORY_TERMS_REGEX.test(lower);
  const isCreative = CREATIVE_TERMS_REGEX.test(lower);

  // Pergunta operacional técnica que deve ser encaminhada ao desenvolvedor
  const isTechnicalOperational =
    TECHNICAL_TERMS_REGEX.test(lower) &&
    (
      /como\s+(?:eu\s+)?(?:posso\s+)?(?:pego|pegar|coloco|colocar|integro|integrar|altero|alterar|mudo|mudar|crio|criar|configuro|configurar|fa[cç]o|fazer|rodo|rodar|instalo|instalar|subo|subir|troco|trocar|edito|editar)/i.test(lower) ||
      /onde\s+(?:eu\s+)?(?:posso\s+)?(?:coloco|insiro|configuro|salvo|mudo|encontro|fica)\s+(?:essa|este|a|o)?\s*(?:api|api\s*key|chave|c[oó]digo|token|banco|servidor|cloudflare)/i.test(lower) ||
      /qual\s+arquivo\s+(?:preciso|devo|tenho\s+que)\s+(?:editar|alterar|mexer|abrir)/i.test(lower) ||
      /me\s+passa\s+o\s+c[oó]digo/i.test(lower) ||
      /como\s+(?:fa[cç]o\s+)?deploy/i.test(lower) ||
      /como\s+mudo\s+o\s+banco/i.test(lower) ||
      /como\s+altero\s+(?:o\s+c[oó]digo|a\s+autentica[cç][aã]o)/i.test(lower) ||
      /como\s+crio\s+essa\s+rota/i.test(lower)
    );

  const scientificKeywords: string[] = [];
  const matches = lower.match(SCIENTIFIC_TERMS_REGEX);
  if (matches) {
    matches.forEach((m) => {
      if (m && typeof m === 'string') {
        scientificKeywords.push(m.toLowerCase());
      }
    });
  }

  // 1. Identifica Intenção Primária
  let primaryIntent: NuaAiIntent = 'ANALYSIS';
  let confidence = 0.85;

  if (isDispatchConfirmation(text)) {
    // Confirmação explícita de envio para o desenvolvedor Philippe ("manda pra ele", "pode mandar", etc.)
    primaryIntent = 'DISPATCH_CONFIRMATION';
    confidence = 0.99;
  } else if (isTechnicalOperational) {
    // Solicitação técnica: encaminhamento obrigatório ao desenvolvedor
    primaryIntent = 'TECHNICAL_REQUEST';
    confidence = 0.98;
  } else if (isHistory) {
    primaryIntent = 'HISTORY_LOOKUP';
    confidence = 0.95;
  } else if (isScientific && isCreative) {
    // Ex: "Cria um roteiro sobre o mito do orgasmo e desejo responsivo"
    primaryIntent = 'MIXED';
    confidence = 0.9;
  } else if (isScientific) {
    primaryIntent = 'SCIENTIFIC_LOOKUP';
    confidence = 0.95;
  } else if (isKnowledge) {
    primaryIntent = 'KNOWLEDGE_LOOKUP';
    confidence = 0.9;
  } else if (isCreative) {
    primaryIntent = 'CREATIVE';
    confidence = 0.9;
  } else if (lower.includes('planeja') || lower.includes('semana') || lower.includes('meta')) {
    primaryIntent = 'STRATEGY';
    confidence = 0.85;
  } else if (lower.includes('melhora') || lower.includes('reescreve') || lower.includes('legenda')) {
    primaryIntent = 'WRITING';
    confidence = 0.85;
  }

  // Define quais camadas devem ser consultadas
  const consultScientificKb = isScientific || primaryIntent === 'SCIENTIFIC_LOOKUP' || primaryIntent === 'MIXED';
  const consultKnowledge = isKnowledge || primaryIntent === 'KNOWLEDGE_LOOKUP' || primaryIntent === 'STRATEGY';
  const consultMemory = true; // Memória da Nua é sempre relevante para alinhar o tom
  const consultHistory = isHistory || primaryIntent === 'HISTORY_LOOKUP';

  // Pergunta pode ser respondida localmente se for factual pura e simples
  const isDirectDefinitionQuestion =
    /^(?:o\s+que\s+[eé]|qual\s+a\s+defini[cç][aã]o|qual\s+o\s+conceito)/i.test(lower) &&
    scientificKeywords.length > 0;

  const isDirectAdminQuestion =
    /^(?:onde\s+(?:posso\s+)?(?:fica|ficar|mudo|mudar|altero|alterar|edito|editar|troco|trocar|aparece|est[aá]|encontro)|como\s+(?:posso\s+)?(?:alterar|mudar|editar|trocar|altero|mudo|edito|troco|funciona|publicar|salvar)|qual\s+(?:aba|texto|foto|bot[aã]o|fun[cç][aã]o|finalidade)|para\s+que\s+serve|o\s+que\s+(?:essa|este|o|a|aparece|tem|faz)|esse\s+bot[aã]o\s+leva|essa\s+foto\s+aparece|essa\s+informa[cç][aã]o\s+pode|em\s+qual\s+parte)/i.test(lower);

  // Mensagens conversacionais, pedidos de criação ou planejamento NUNCA devem ser respondidos com texto local estático
  const isConversationalOrPlanning =
    lower.includes('quero') ||
    lower.includes('gostaria') ||
    lower.includes('planejando') ||
    lower.includes('pensando') ||
    lower.includes('projeto') ||
    lower.includes('nova página') ||
    lower.includes('novo espaço') ||
    lower.includes('me ajuda') ||
    lower.includes('o que acha') ||
    text.length > 120;

  const canAnswerLocally =
    primaryIntent === 'DISPATCH_CONFIRMATION' ||
    ((isDirectDefinitionQuestion || isDirectAdminQuestion) &&
      !isCreative &&
      !isHistory &&
      !isConversationalOrPlanning);

  return {
    primaryIntent,
    confidence,
    consultScientificKb,
    consultKnowledge,
    consultMemory,
    consultHistory,
    canAnswerLocally,
    scientificKeywords,
  };
}
