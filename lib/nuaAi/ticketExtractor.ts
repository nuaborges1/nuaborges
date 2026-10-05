/**
 * NUA IA — Extrator Inteligente de Propostas de Pedidos para o Desenvolvedor
 * 
 * Analisa os turnos recentes da conversa para extrair ou sintetizar o pedido
 * técnico para o desenvolvedor Philippe quando a Nua diz "manda pra ele" ou confirma.
 */

import { HistoryTurn } from './types';

export interface ExtractedTicket {
  type: string;
  title: string;
  section: string;
  details: string;
}

/**
 * Expressão regular para detectar confirmações explícitas de envio ao Philippe.
 */
export const DISPATCH_CONFIRMATION_REGEX = new RegExp(
  [
    '^(?:manda|mande|envia|envie|encaminha|encaminhe)(?:\\s+(?:pra|para|ao|pro)\\s+ele|\\s+(?:pra|para|ao|pro)\\s+philippe|\\s+(?:pra|para|ao|pro)\\s+dev)?$',
    '^(?:pode\\s+)?(?:mandar|enviar|encaminhar)(?:\\s+(?:pra|para|ao|pro)\\s+ele|\\s+(?:pra|para|ao|pro)\\s+philippe|\\s+(?:pra|para|ao|pro)\\s+dev)?$',
    '^(?:sim,?|com\\s+certeza,?|claro,?|ok,?|beleza,?|fechado,?|perfeito,?)\\s*(?:manda|mande|envia|envie|pode\\s+mandar|pode\\s+enviar|manda\\s+ver|manda\\s+bala)(?:\\s+(?:pra|para|pro)\\s+ele|\\s+(?:pra|para|pro)\\s+philippe)?$',
    '^(?:manda\\s+bala|manda\\s+ver|pode\\s+ser|confirmo|aprovado|pode\\s+abrir\\s+o\\s+pedido|pode\\s+encaminhar)$',
    '^(?:sim|confirmo|pode\\s+ser|com\\s+certeza|claro)$',
  ].join('|'),
  'i'
);

export function isDispatchConfirmation(text: string): boolean {
  const trimmed = text.trim();
  return DISPATCH_CONFIRMATION_REGEX.test(trimmed);
}

/**
 * Extrai uma proposta estruturada a partir do histórico recente de mensagens.
 */
export function extractProposalFromHistory(turns: HistoryTurn[]): ExtractedTicket | null {
  if (!turns || turns.length === 0) return null;

  // 1. Procura se algum turno recente da IA já continha o bloco RESUMO DO PEDIDO
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    if (turn.role === 'assistant' && turn.content.includes('RESUMO DO PEDIDO PARA O PHILIPPE')) {
      const typeMatch = turn.content.match(/[•\-*]?\s*Tipo:\s*(.+)/i);
      const whatMatch = turn.content.match(/[•\-*]?\s*(?:O quê|O que|Título):\s*(.+)/i);
      const whereMatch = turn.content.match(/[•\-*]?\s*Onde:\s*(.+)/i);
      const detailsMatch = turn.content.match(/[•\-*]?\s*Detalhes:\s*(.+)/i);

      if (whatMatch || detailsMatch) {
        return {
          type: typeMatch ? typeMatch[1].trim() : '💡 Nova Funcionalidade',
          title: whatMatch ? whatMatch[1].trim() : 'Solicitação da Nua Borges',
          section: whereMatch ? whereMatch[1].trim() : 'Geral',
          details: detailsMatch ? detailsMatch[1].trim() : turn.content,
        };
      }
    }
  }

  // 2. Procura se algum turno da IA rascunhou uma mensagem entre aspas ou para o Philippe
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    if (turn.role === 'assistant') {
      const draftMatch = turn.content.match(/(?:\*\*")?Oi,\s*Philippe!?[^"]+?(?:"\*\*|")/i) ||
                         turn.content.match(/(?:\*\*")?Gostaria de[^"]+?(?:"\*\*|")/i);
      if (draftMatch) {
        const rawDraft = draftMatch[0].replace(/\*\*/g, '').replace(/^"|"$/g, '').trim();
        
        // Identifica área e tipo baseados no texto
        const lower = turn.content.toLowerCase();
        let section = 'Página Inicial / Nova Seção';
        if (lower.includes('comentário') || lower.includes('depoimento') || lower.includes('seguidor')) {
          section = 'Página Inicial / Seção de Depoimentos';
        } else if (lower.includes('capa') || lower.includes('hero')) {
          section = 'Início & Capa';
        } else if (lower.includes('galeria')) {
          section = 'Galeria do Site';
        } else if (lower.includes('sobre')) {
          section = 'Sobre Mim';
        }

        let type = '💡 Nova Funcionalidade';
        if (lower.includes('bug') || lower.includes('erro') || lower.includes('problema')) {
          type = '🐛 Problema Técnico';
        } else if (lower.includes('visual') || lower.includes('design') || lower.includes('layout')) {
          type = '🎨 Visual & Layout';
        } else if (lower.includes('celular') || lower.includes('mobile')) {
          type = '📱 Ajuste no Celular';
        }

        let title = 'Solicitação da Nua Borges';
        if (lower.includes('comentário') || lower.includes('depoimento')) {
          title = 'Nova seção ou página para comentários dos seguidores';
        } else if (lower.includes('whatsapp')) {
          title = 'Integração ou botão de WhatsApp';
        }

        return {
          type,
          title,
          section,
          details: rawDraft,
        };
      }
    }
  }

  // 3. Analisa turnos recentes do usuário para identificar o desejo de mudança
  const userTurns = turns.filter((t) => t.role === 'user');
  if (userTurns.length > 0) {
    const lastUserTurn = userTurns[userTurns.length - 1].content;
    const allUserText = userTurns.map((t) => t.content).join(' ');
    const lower = allUserText.toLowerCase();

    // Se houve menção a mudança/ajuste/criação
    if (
      lower.includes('quero') ||
      lower.includes('mudança') ||
      lower.includes('adicionar') ||
      lower.includes('página') ||
      lower.includes('seção') ||
      lower.includes('sessao') ||
      lower.includes('botão') ||
      lower.includes('ajuste') ||
      lower.includes('melhoria') ||
      lower.includes('sessão dedicada')
    ) {
      let title = 'Nova solicitação de melhoria no site';
      let section = 'Página Inicial';
      let type = '💡 Nova Funcionalidade';

      if (lower.includes('comentário') || lower.includes('depoimento') || lower.includes('seguidor')) {
        title = 'Nova seção ou página para comentários dos seguidores';
        section = 'Página Inicial / Seção de Depoimentos';
        type = '💡 Nova Funcionalidade';
      } else if (lower.includes('whatsapp')) {
        title = 'Botão ou integração com WhatsApp';
        section = 'Header & Rodapé';
        type = '💡 Nova Funcionalidade';
      }

      // Detalhes compilados das mensagens
      const details = userTurns
        .filter((t) => !isDispatchConfirmation(t.content))
        .map((t) => t.content)
        .join('. ')
        .slice(0, 500);

      return {
        type,
        title,
        section,
        details: details || lastUserTurn,
      };
    }
  }

  return null;
}
