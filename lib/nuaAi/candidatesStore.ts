/**
 * NUA IA — Aprendizado Controlado e Gestão de Candidatos
 * 
 * Regra: A IA nunca altera diretamente a Memória ou Conhecimento ativo.
 * Ela apenas sugere candidatos com status 'pending_review' para aprovação em 1 clique.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface CandidateItem {
  id: string;
  target: 'memory' | 'knowledge';
  category: string;
  proposedContent: string;
  reason: string;
  sourceConversationId: string;
  createdAt: string;
  status: 'pending_review' | 'approved' | 'rejected';
}

export interface CandidatesFile {
  version: string;
  lastUpdated: string;
  candidates: CandidateItem[];
}

function resolveCandidatesPath(): string {
  const dir = path.resolve(process.cwd(), 'nua-ai', 'candidates');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, 'candidates.json');
}

export function getCandidates(): CandidateItem[] {
  const filePath = resolveCandidatesPath();
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed.candidates || [];
  } catch (err) {
    console.warn('[CandidatesStore] Erro ao ler candidatos:', err);
    return [];
  }
}

export function saveCandidates(candidates: CandidateItem[]): void {
  const filePath = resolveCandidatesPath();
  const data: CandidatesFile = {
    version: '1.0',
    lastUpdated: new Date().toISOString(),
    candidates,
  };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

export function addCandidate(candidate: Omit<CandidateItem, 'id' | 'createdAt' | 'status'>): CandidateItem {
  const list = getCandidates();
  const newItem: CandidateItem = {
    ...candidate,
    id: `cand_${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: 'pending_review',
  };
  list.unshift(newItem);
  saveCandidates(list);
  return newItem;
}

export function approveCandidate(id: string): { success: boolean; candidate?: CandidateItem; error?: string } {
  const list = getCandidates();
  const index = list.findIndex((c) => c.id === id);
  if (index === -1) {
    return { success: false, error: 'Candidato não encontrado.' };
  }

  const candidate = list[index];
  candidate.status = 'approved';

  try {
    if (candidate.target === 'memory') {
      const memoryPath = path.resolve(process.cwd(), 'nua-ai', 'memory', 'nua-memory.json');
      if (fs.existsSync(memoryPath)) {
        const raw = fs.readFileSync(memoryPath, 'utf8');
        const mem = JSON.parse(raw);
        if (!mem.decisions) mem.decisions = [];
        mem.decisions.unshift({
          date: new Date().toISOString().split('T')[0],
          topic: candidate.category || 'Decisão Estratégica',
          decision: candidate.proposedContent,
        });
        fs.writeFileSync(memoryPath, JSON.stringify(mem, null, 2), 'utf8');
      }
    } else if (candidate.target === 'knowledge') {
      const kbPath = path.resolve(process.cwd(), 'nua-ai', 'knowledge', 'nua-knowledge.json');
      if (fs.existsSync(kbPath)) {
        const raw = fs.readFileSync(kbPath, 'utf8');
        const kb = JSON.parse(raw);
        if (!kb.items) kb.items = [];
        kb.items.unshift({
          id: `kn_${Date.now()}`,
          category: candidate.category || 'editorial',
          title: `Fato Aprovado: ${candidate.category}`,
          content: candidate.proposedContent,
          confidence: 1.0,
          status: 'active',
          origin: `approved_from_${candidate.id}`,
          updatedAt: new Date().toISOString(),
          version: 1,
        });
        fs.writeFileSync(kbPath, JSON.stringify(kb, null, 2), 'utf8');
      }
    }

    saveCandidates(list);
    return { success: true, candidate };
  } catch (err: any) {
    console.error('[CandidatesStore] Erro ao aprovar candidato:', err);
    return { success: false, error: err.message };
  }
}

export function rejectCandidate(id: string): { success: boolean; candidate?: CandidateItem } {
  const list = getCandidates();
  const index = list.findIndex((c) => c.id === id);
  if (index === -1) {
    return { success: false };
  }

  list[index].status = 'rejected';
  saveCandidates(list);
  return { success: true, candidate: list[index] };
}

