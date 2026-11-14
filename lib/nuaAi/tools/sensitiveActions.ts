/**
 * NUA IA — Gerenciador de Ações Sensíveis com Aprovação Humana e Nonce
 * 
 * Cria propostas assinadas para ações como Publicação ou Mudança de Preço.
 * Apenas o clique no botão do Card no chat valida o Nonce e executa a alteração.
 */

import { appendAuditLog } from './audit';

export interface SensitiveActionProposal {
  proposalId: string;
  nonce: string;
  actionType: 'publish_content' | 'update_published_price' | 'update_payment_settings';
  targetId: string;
  summary: string;
  proposedChanges: Record<string, any>;
  expiresAt: number; // Timestamp em ms (10 min de validade)
  executed: boolean;
}

// Armazena propostas pendentes em memória (tempo de vida: 10 min)
const pendingProposals = new Map<string, SensitiveActionProposal>();

export function generateSensitiveActionProposal(params: {
  actionType: 'publish_content' | 'update_published_price' | 'update_payment_settings';
  targetId: string;
  summary: string;
  proposedChanges: Record<string, any>;
}): SensitiveActionProposal {
  const proposalId = `prop_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const nonce = `nonce_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;

  const proposal: SensitiveActionProposal = {
    proposalId,
    nonce,
    actionType: params.actionType,
    targetId: params.targetId,
    summary: params.summary,
    proposedChanges: params.proposedChanges,
    expiresAt: Date.now() + 10 * 60 * 1000,
    executed: false,
  };

  pendingProposals.set(proposalId, proposal);

  appendAuditLog({
    actor: 'admin_session',
    source: 'nua_ai_assistant',
    action: `propose_${params.actionType}`,
    resourceType: 'proposal',
    resourceId: proposalId,
    status: 'PROPOSAL_GENERATED',
    riskLevel: 'SENSITIVE',
    details: {
      targetId: params.targetId,
      summary: params.summary,
      proposedChanges: params.proposedChanges,
    },
  });

  return proposal;
}

export function executeSensitiveAction(params: {
  proposalId: string;
  nonce: string;
}): { success: boolean; result?: any; error?: string } {
  const proposal = pendingProposals.get(params.proposalId);
  if (!proposal) {
    return { success: false, error: 'Proposta de alteração não encontrada ou expirada.' };
  }

  if (proposal.executed) {
    return { success: false, error: 'Esta proposta de alteração já foi aprovada e executada anteriormente.' };
  }

  if (Date.now() > proposal.expiresAt) {
    pendingProposals.delete(params.proposalId);
    return { success: false, error: 'O tempo limite de 10 minutos para aprovação desta proposta expirou.' };
  }

  if (proposal.nonce !== params.nonce) {
    return { success: false, error: 'Token de segurança inválido (nonce incorreto).' };
  }

  // Marca como executada para impedir repetição (anti-replay)
  proposal.executed = true;
  pendingProposals.delete(params.proposalId);

  appendAuditLog({
    actor: 'human_admin',
    source: 'human_admin',
    action: `execute_${proposal.actionType}`,
    resourceType: 'pack',
    resourceId: proposal.targetId,
    status: 'SUCCESS',
    riskLevel: 'SENSITIVE',
    details: {
      proposalId: proposal.proposalId,
      actionType: proposal.actionType,
      changes: proposal.proposedChanges,
    },
  });

  return {
    success: true,
    result: {
      message: `Ação "${proposal.actionType}" aprovada e executada com sucesso!`,
      targetId: proposal.targetId,
      changes: proposal.proposedChanges,
    },
  };
}
