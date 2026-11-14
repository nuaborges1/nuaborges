/**
 * NUA IA — Matriz de Permissões e Classificação de Risco
 * 
 * Regra Central:
 * A IA pode executar diretamente APENAS operações classificadas como LOW_RISK.
 * Operações SENSITIVE geram propostas para aprovação humana com Nonce temporário.
 * Operações PROHIBITED são bloqueadas incondicionalmente no backend.
 */

export type ActionRiskLevel = 'LOW_RISK' | 'SENSITIVE' | 'PROHIBITED';

export interface ActionDefinition {
  id: string;
  name: string;
  riskLevel: ActionRiskLevel;
  description: string;
  allowedParams: string[];
}

export const ADMIN_ACTION_DEFINITIONS: Record<string, ActionDefinition> = {
  // 🟢 BAIXO RISCO — Execução direta autorizada
  list_content_summary: {
    id: 'list_content_summary',
    name: 'Consultar Resumo de Conteúdos',
    riskLevel: 'LOW_RISK',
    description: 'Lista packs e produtos existentes no acervo com status e valores.',
    allowedParams: ['type'],
  },
  get_media_library: {
    id: 'get_media_library',
    name: 'Consultar Acervo de Mídias',
    riskLevel: 'LOW_RISK',
    description: 'Consulta fotos e vídeos disponíveis na biblioteca com metadados.',
    allowedParams: ['filter', 'limit'],
  },
  create_pack_draft: {
    id: 'create_pack_draft',
    name: 'Criar Rascunho de Pack/Conteúdo',
    riskLevel: 'LOW_RISK',
    description: 'Cria um novo item no acervo salvo como rascunho (não visível publicamente).',
    allowedParams: ['title', 'price', 'description', 'previewImages', 'videos', 'badge', 'duration'],
  },
  update_draft_fields: {
    id: 'update_draft_fields',
    name: 'Editar Campos de Rascunho',
    riskLevel: 'LOW_RISK',
    description: 'Atualiza título, descrição ou dados de um item que ainda está em rascunho.',
    allowedParams: ['id', 'title', 'description', 'badge', 'duration', 'buttonText'],
  },
  attach_media_to_draft: {
    id: 'attach_media_to_draft',
    name: 'Vincular Mídias ao Rascunho',
    riskLevel: 'LOW_RISK',
    description: 'Associa fotos ou vídeos existentes a um rascunho de pack.',
    allowedParams: ['id', 'imageUrls', 'videoUrls'],
  },
  update_admin_content_fields: {
    id: 'update_admin_content_fields',
    name: 'Atualizar Campos do Painel Admin (Capa, Textos, Bio)',
    riskLevel: 'LOW_RISK',
    description: 'Atualiza campos de texto do rascunho do painel (ex: texto de destaque da capa, frase de boas-vindas, título, bio).',
    allowedParams: ['section', 'fields'],
  },
  remove_media_from_draft: {
    id: 'remove_media_from_draft',
    name: 'Desvincular Mídia do Rascunho',
    riskLevel: 'LOW_RISK',
    description: 'Remove uma foto/vídeo do rascunho sem excluir o arquivo do cofre.',
    allowedParams: ['id', 'mediaUrl'],
  },

  // 🟡 SENSÍVEL — Exige revisão humana explícita no chat antes de executar
  publish_content: {
    id: 'publish_content',
    name: 'Publicar Conteúdo no Site Público',
    riskLevel: 'SENSITIVE',
    description: 'Torna um rascunho visível e disponível para compra no site real.',
    allowedParams: ['id'],
  },
  update_published_price: {
    id: 'update_published_price',
    name: 'Alterar Preço Efetivo de Item Publicado',
    riskLevel: 'SENSITIVE',
    description: 'Altera o valor comercial de um item que já está à venda no site.',
    allowedParams: ['id', 'newPrice'],
  },
  update_payment_settings: {
    id: 'update_payment_settings',
    name: 'Alterar Configurações de Pagamento',
    riskLevel: 'SENSITIVE',
    description: 'Modifica links de checkout, chaves Pix ou integrações comerciais.',
    allowedParams: ['id', 'checkoutUrl'],
  },
  archive_content: {
    id: 'archive_content',
    name: 'Ocultar ou Arquivar Conteúdo Público',
    riskLevel: 'SENSITIVE',
    description: 'Desativa a visibilidade pública de um item publicado.',
    allowedParams: ['id'],
  },

  // 🔴 PROIBIDO — Bloqueio estrito no servidor (nunca executado por IA)
  delete_media_permanent: {
    id: 'delete_media_permanent',
    name: 'Exclusão Física de Arquivo de Mídia',
    riskLevel: 'PROHIBITED',
    description: 'Excluir definitivamente arquivos do servidor ou do bucket Backblaze B2.',
    allowedParams: [],
  },
  delete_product_permanent: {
    id: 'delete_product_permanent',
    name: 'Exclusão Definitiva de Produto',
    riskLevel: 'PROHIBITED',
    description: 'Deletar permanentemente um produto do banco sem arquivamento.',
    allowedParams: [],
  },
  modify_security_credentials: {
    id: 'modify_security_credentials',
    name: 'Alterar Senhas ou Permissões',
    riskLevel: 'PROHIBITED',
    description: 'Modificar senhas de admin, tokens de sessão ou chaves de API.',
    allowedParams: [],
  },
  execute_terminal_code: {
    id: 'execute_terminal_code',
    name: 'Executar Comandos de Terminal',
    riskLevel: 'PROHIBITED',
    description: 'Executar comandos no sistema operacional do servidor.',
    allowedParams: [],
  },
};

/**
 * Avalia se uma ação é autorizada e qual seu nível de risco.
 */
export function checkActionPermission(actionId: string): {
  allowed: boolean;
  riskLevel: ActionRiskLevel;
  reason?: string;
} {
  const def = ADMIN_ACTION_DEFINITIONS[actionId];
  if (!def) {
    return {
      allowed: false,
      riskLevel: 'PROHIBITED',
      reason: `Ação "${actionId}" não é reconhecida no sistema.`,
    };
  }

  if (def.riskLevel === 'PROHIBITED') {
    return {
      allowed: false,
      riskLevel: 'PROHIBITED',
      reason: `A operação "${def.name}" é estritamente proibida para execução automatizada pela IA por motivos de segurança e integridade.`,
    };
  }

  if (def.riskLevel === 'SENSITIVE') {
    return {
      allowed: true,
      riskLevel: 'SENSITIVE',
      reason: `A operação "${def.name}" é sensível e exige aprovação humana explícita antes de qualquer alteração.`,
    };
  }

  return {
    allowed: true,
    riskLevel: 'LOW_RISK',
  };
}
