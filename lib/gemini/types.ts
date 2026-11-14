import { RequestType, RequestPriority, ContractScope } from '../requestHeuristics';

export interface GeminiEnv {
  GEMINI_API_KEY?: string;
  GEMINI_MODELS?: string;
  GEMINI_MODEL?: string;
}

export interface RequestAnalysis {
  title: string;
  type: RequestType;
  priority: RequestPriority;
  summary: string;
  contractScope: ContractScope;
  technicalPlan: string;
  targetFiles: string[];
  aiAgentPrompt: string;
  clarifyingQuestions: string[];
  source: 'gemini' | 'heuristic';
  model?: string;
  fallbackReason?: string;
}

export interface InterviewMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface InterviewResponse {
  reply: string;
  enoughInformation: boolean;
  suggestedOptions?: string[];
  triage?: {
    title: string;
    type: RequestType;
    priority: RequestPriority;
    summary: string;
    contractScope: ContractScope;
    technicalPlan: string;
    targetFiles: string[];
  };
  source: 'gemini' | 'heuristic';
  model?: string;
  fallbackReason?: string;
}

export interface CallGeminiResult {
  data: Record<string, unknown> | null;
  model?: string;
  fallbackReason?: string;
}

export interface GeminiContentPart {
  text?: string;
  thought?: boolean;
}

export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiContentPart[];
}
