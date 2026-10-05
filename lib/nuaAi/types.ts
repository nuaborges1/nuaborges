/**
 * NUA IA — Definições de Tipos TypeScript
 */

export interface BrandMemory {
  name: string;
  creator: string;
  profession: string;
  positioning: string;
  audience: string;
  tone: string;
}

export interface PreferencesMemory {
  scripts?: string;
  formats?: string;
  design_elements?: string;
  communication?: string;
  [key: string]: string | undefined;
}

export interface GoalsMemory {
  current_priority?: string;
  secondary_goals?: string;
  [key: string]: string | undefined;
}

export interface ProjectMemoryItem {
  name: string;
  status: string;
  summary: string;
}

export interface DecisionMemoryItem {
  date: string;
  topic: string;
  decision: string;
}

export interface NuaMemory {
  brand: BrandMemory;
  preferences: PreferencesMemory;
  goals: GoalsMemory;
  projects: ProjectMemoryItem[];
  decisions: DecisionMemoryItem[];
  content_preferences: string[];
  admin_knowledge: Record<string, string>;
  important_context: string[];
}

export interface HistoryTurn {
  timestamp: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface ConversationMeta {
  id: string;
  title: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  entities: string[];
  keywords: string[];
}

export interface HistoryIndex {
  version: string;
  lastUpdated: string;
  conversations: ConversationMeta[];
}

export interface HistorySearchResult {
  conversationId: string;
  title: string;
  matchedEntities: string[];
  score: number;
  snippet: string;
  timestamp: string;
}

export interface NuaAiChatRequest {
  message: string;
  conversationId?: string;
}

export interface NuaAiChatResponse {
  reply: string;
  conversationId: string;
  conversationTitle?: string;
  sourcesUsed: {
    memory: boolean;
    history: boolean;
    historyTitle?: string;
    entitiesMatched?: string[];
    scientific?: boolean;
    scientificCitation?: string;
    knowledge?: boolean;
  };
  modelUsed: string;
  source: 'gemini' | 'heuristic' | 'scientific_kb' | 'knowledge_store';
}
