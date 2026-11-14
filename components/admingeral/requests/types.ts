export interface Req {
  id: string;
  createdAt: string;
  updatedAt?: string;
  status: 'new' | 'analyzing' | 'planned' | 'in_progress' | 'review' | 'done' | 'rejected';
  title: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  contractScope?: 'garantia' | 'franquia_suporte' | 'fora_de_escopo_orcamento';
  technicalPlan: string;
  targetFiles?: string[];
  aiAgentPrompt?: string;
  clarifyingQuestions?: string[];
  source: string;
  originalText: string;
  category?: string;
  history: { at: string; event: string; detail: string }[];
  messages: { at: string; role: string; text: string }[];
}

export const PIPELINE_STAGES = [
  { key: 'new', label: 'Recebida', color: 'sky' },
  { key: 'analyzing', label: 'Em Análise', color: 'purple' },
  { key: 'planned', label: 'Planejada', color: 'indigo' },
  { key: 'in_progress', label: 'Em Dev', color: 'amber' },
  { key: 'done', label: 'Concluída', color: 'emerald' },
];

export const STATUS_LABEL: Record<string, string> = {
  new: 'Recebida',
  analyzing: 'Em análise',
  planned: 'Planejada',
  in_progress: 'Em desenvolvimento',
  review: 'Em revisão',
  done: 'Concluída',
  rejected: 'Cancelada',
};

export const PRIORITY_CONFIG: Record<
  string,
  { label: string; textClass: string; bgClass: string; borderClass: string }
> = {
  critical: {
    label: 'Crítica',
    textClass: 'text-rose-400',
    bgClass: 'bg-rose-500/15',
    borderClass: 'border-rose-500/30',
  },
  high: {
    label: 'Alta',
    textClass: 'text-amber-400',
    bgClass: 'bg-amber-500/15',
    borderClass: 'border-amber-500/30',
  },
  medium: {
    label: 'Média',
    textClass: 'text-sky-400',
    bgClass: 'bg-sky-500/15',
    borderClass: 'border-sky-500/30',
  },
  low: {
    label: 'Baixa',
    textClass: 'text-zinc-400',
    bgClass: 'bg-zinc-500/10',
    borderClass: 'border-zinc-700/40',
  },
};

export function formatRelativeTime(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'agora há pouco';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `há ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `há ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `há ${diffDays} d`;
  } catch {
    return 'recentemente';
  }
}
