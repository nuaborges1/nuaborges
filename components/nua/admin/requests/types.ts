import React from 'react';
import {
  Clock,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export interface RequestItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: 'new' | 'analyzing' | 'planned' | 'in_progress' | 'review' | 'done' | 'rejected';
  title: string;
  summary: string;
  originalText: string;
  category?: string;
  messages: { at: string; role: 'client' | 'admin'; text: string }[];
}

export const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: React.ElementType; description: string }
> = {
  new: {
    label: 'Recebido pelo Desenvolvedor',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    icon: Clock,
    description: 'Seu pedido foi registrado e está na fila para o Philippe iniciar a triagem.',
  },
  analyzing: {
    label: 'Em Análise Técnica',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    icon: Search,
    description: 'O Philippe está analisando o código e arquitetura para a melhor implementação.',
  },
  planned: {
    label: 'Planejado para o Site',
    badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    icon: Clock,
    description: 'Aprovado tecnicamente e preparado para a fase de código.',
  },
  in_progress: {
    label: 'Em Desenvolvimento',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    icon: RefreshCw,
    description: 'O Philippe está programando e testando as alterações no site agora.',
  },
  review: {
    label: 'Pronto para Sua Revisão',
    badgeClass: 'bg-[#843C52]/20 text-[#843C52] border-[#843C52]/40',
    icon: CheckCircle2,
    description: 'O ajuste já foi implementado! Dê uma olhada no site para conferir.',
  },
  done: {
    label: 'Concluído com Sucesso',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    icon: CheckCircle2,
    description: 'Finalizado, testado e publicado no seu site oficial.',
  },
  rejected: {
    label: 'Arquivado',
    badgeClass: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    icon: AlertCircle,
    description: 'Item arquivado ou substituído por outra solução.',
  },
};
