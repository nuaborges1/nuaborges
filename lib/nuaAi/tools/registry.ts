/**
 * NUA IA — Registro e Despachante Central de Ferramentas
 * 
 * Conecta o retorno do Gemini à execução real no backend, garantindo
 * verificação de permissões e integridade de dados.
 */

import { checkActionPermission } from './permissions';
import { listDraftProductsSummary, createPackDraftOperation, updateDraftFieldsOperation } from './draftOperations';
import { generateSensitiveActionProposal } from './sensitiveActions';
import { appendAuditLog } from './audit';

export async function dispatchToolCall(toolName: string, args: Record<string, any>): Promise<{
  success: boolean;
  data?: any;
  proposal?: any;
  error?: string;
}> {
  const perm = checkActionPermission(toolName);
  if (!perm.allowed) {
    appendAuditLog({
      actor: 'admin_session',
      source: 'nua_ai_assistant',
      action: toolName,
      resourceType: 'system',
      status: 'REJECTED',
      riskLevel: perm.riskLevel,
      error: perm.reason,
    });
    return {
      success: false,
      error: perm.reason || 'Operação não autorizada.',
    };
  }

  try {
    switch (toolName) {
      case 'list_content_summary': {
        const list = listDraftProductsSummary(args.type);
        return { success: true, data: list };
      }

      case 'create_pack_draft': {
        const res = createPackDraftOperation({
          title: args.title,
          price: args.price,
          description: args.description,
          previewImages: args.previewImages,
          badge: args.badge,
          duration: args.duration,
        });
        return res;
      }

      case 'update_draft_fields': {
        const res = updateDraftFieldsOperation({
          id: args.id,
          title: args.title,
          description: args.description,
          badge: args.badge,
          price: args.price,
          active: args.active,
        });
        return res;
      }

      case 'propose_sensitive_action': {
        const proposal = generateSensitiveActionProposal({
          actionType: args.actionType,
          targetId: args.targetId,
          summary: args.summary,
          proposedChanges: args.proposedChanges || {},
        });
        return { success: true, proposal };
      }

      default:
        return { success: false, error: `Ferramenta "${toolName}" não implementada no despachante.` };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro interno na execução da ferramenta.' };
  }
}
