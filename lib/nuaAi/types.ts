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

export interface AdminUiContext {
  activeTab?: string;
  activeTabLabel?: string;
  tabs?: Array<{ id: string; label: string; description?: string }>;
  attachedMediaUrls?: string[];
  attachedMediaItems?: Array<{ id?: string; url: string; objectKey?: string; isVideo?: boolean; name?: string }>;
  /** Rascunho COMPLETO (com `library` enxuta). É a base de escrita do servidor. */
  content?: any;
}

export interface NuaAiChatRequest {
  message: string;
  conversationId?: string;
  uiContext?: AdminUiContext;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Rascunho completo enviado separadamente do contexto de prompt. */
  draftContent?: any;
  /** Papel resolvido no servidor (o cliente não decide permissão). */
  actorRole?: string;
  lastContext?: { entityType?: string; entityId?: string; entityTitle?: string } | null;
}

export interface NuaAiActionExecuted {
  type: string;
  pack?: any;
  data?: any;
  tools?: Array<{ name: string; ok: boolean; summary: string }>;
}

export interface NuaAiError {
  code: string;
  friendly: string;
  details?: string;
}

export interface NuaAiChatResponse {
  ok?: boolean;
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
    media?: boolean;
  };
  modelUsed: string;
  source:
    | 'gemini'
    | 'heuristic'
    | 'scientific_kb'
    | 'knowledge_store'
    | 'gemini_function_calling'
    | 'gemini_sensitive_proposal'
    | 'nua_ai'
    | 'system_error';
  actionExecuted?: NuaAiActionExecuted;
  proposal?: {
    proposalId: string;
    nonce: string;
    actionType: string;
    targetId: string;
    summary: string;
    proposedChanges: Record<string, any>;
  } | null;
  proposals?: NuaAiChatResponse['proposal'][];
  tools?: Array<{ name: string; ok: boolean; summary: string }>;
  error?: NuaAiError | null;
  lastContext?: { entityType?: string; entityId?: string; entityTitle?: string } | null;
}
