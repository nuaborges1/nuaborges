import {
  RequestType,
  RequestPriority,
  ContractScope,
  ProjectPhaseContext,
} from './types';

/**
 * Normaliza textos para análise heurística:
 * Minúsculas, decomposição NFD sem diacríticos e espaços colapsados.
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Identifica se a solicitação possui características de funcionalidade fora de escopo (Cl. 7.1).
 * Trata falso-positivo em "assinatura" (distingue assinatura artística de assinatura financeira).
 */
export function isExplicitOutOfScope(normalizedText: string): boolean {
  // Loja / Pagamentos / Checkout
  if (
    /\b(loja|loja virtual|carrinho|checkout|comprar|venda|vender|infoproduto|infoprodutos|pagamento|pagamentos|gateway|mercadopago|pagseguro)\b/.test(
      normalizedText
    )
  ) {
    return true;
  }

  // Área de membros ou assinatura com conotação financeira/recorrente
  if (
    /\b(area de membros|clube vip)\b/.test(normalizedText) ||
    /\bassinatura(s)?\s+(mensal|recorrente|paga|plano|vip|clube)\b/.test(normalizedText) ||
    /\b(plano|sistema)\s+de\s+assinatura\b/.test(normalizedText)
  ) {
    return true;
  }

  // Agendamento e consultas marcadas
  if (
    /\b(agendamento|agendamentos|marcar consulta|consulta marcada|agenda integrada|calendly)\b/.test(
      normalizedText
    )
  ) {
    return true;
  }

  // CRM, newsletter em massa ou app móvel nativo
  if (
    /\b(crm|newsletter|disparo de email|email marketing|mala direta|app nativo|aplicativo nativo|ios app|android app)\b/.test(
      normalizedText
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Classifica o enquadramento contratual sugerido para a solicitação.
 * O resultado é SEMPRE uma sugestão técnica para o Philippe confirmar.
 */
export function classifyContractScope(text: string, ctx?: ProjectPhaseContext): ContractScope {
  const norm = normalizeText(text);
  const phase = ctx?.phase ?? 'desenvolvimento';

  // 1. Demandas nitidamente fora de escopo (Cl. 7.1)
  if (isExplicitOutOfScope(norm)) {
    return 'fora_de_escopo_orcamento';
  }

  // 2. Pedidos de nova página / criação de páginas
  if (/\b(nova pagina|criar pagina|adicionar pagina|fazer uma pagina)\b/.test(norm)) {
    // Se exigir sistemas dinâmicos, formulários complexos ou APIs
    if (/\b(formulario complexo|login|banco de dados|api|dinamica|sistema)\b/.test(norm)) {
      return 'fora_de_escopo_orcamento';
    }
    // Página estática baseada em blocos existentes (texto e imagens)
    if (phase === 'desenvolvimento' || phase === 'homologacao') {
      return 'homologacao_ajuste';
    }
    return 'franquia_suporte';
  }

  // 3. Relato de bug ou falha
  const isBug = /\b(erro|erros|bug|bugs|falha|falhas|travou|travando|nao funciona|nao abre|quebrou|quebrado)\b/.test(
    norm
  );
  if (isBug) {
    // Se houver indício de causa atribuível a ação da cliente (exclusão, DNS, arquivos fora do padrão)
    if (
      /\b(apaguei|deletei|exclui|subi arquivo gigante|limite|dns|cloudflare|mudei senha|esqueci senha)\b/.test(
        norm
      )
    ) {
      return 'a_confirmar_pelo_dev';
    }
    // Bug só é garantia formal (Cl. 6.2) se o projeto já tiver sido homologado e estiver na fase de garantia
    if (phase === 'garantia') {
      return 'garantia';
    }
    // Durante desenvolvimento ou homologação é ajuste da entrega inicial
    return 'homologacao_ajuste';
  }

  // 4. Demais alterações comuns (fotos, textos, cores, links, player, etc.)
  if (phase === 'desenvolvimento' || phase === 'homologacao') {
    return 'homologacao_ajuste';
  }

  return 'franquia_suporte';
}

/**
 * Classifica o tipo da solicitação a partir do texto do usuário.
 */
export function classifyRequestType(text: string): RequestType {
  const norm = normalizeText(text);

  if (/\b(erro|erros|bug|bugs|falha|falhas|travou|travando|nao funciona|nao abre|quebrou|quebrado)\b/.test(norm)) {
    return 'bug';
  }
  if (isExplicitOutOfScope(norm) || /\b(nova pagina|criar pagina|novo recurso|nova funcionalidade)\b/.test(norm)) {
    return 'feature';
  }
  if (/\b(duvida|como faco|como funciona|onde fica|ajuda)\b/.test(norm)) {
    return 'question';
  }
  if (/\b(trocar foto|trocar imagem|mudar texto|corrigir texto|novo texto|nova foto|subir musica)\b/.test(norm)) {
    return 'content';
  }
  if (/\b(melhorar|ajustar|mudar|trocar|alinhar|espacamento|layout|design)\b/.test(norm)) {
    return 'improvement';
  }
  if (/\b(ideia|sugestao|pensando em|que tal)\b/.test(norm)) {
    return 'idea';
  }

  return 'improvement';
}

/**
 * Classifica a prioridade sugerida para a solicitação.
 */
export function classifyRequestPriority(text: string, type: RequestType): RequestPriority {
  const norm = normalizeText(text);

  if (/\b(urgente|urgencia|fora do ar|caiu|critico|nao abre nada|travou tudo)\b/.test(norm)) {
    return 'critical';
  }
  if (type === 'bug') {
    return 'high';
  }
  if (/\b(importante|assim que puder|o quanto antes)\b/.test(norm)) {
    return 'medium';
  }

  return 'medium';
}
