/**
 * Regras de Segurança Operacional da Nua IA (Zero "Cagada")
 *
 * Módulo dedicado à blindagem contra comandos destrutivos, solicitações absurdas
 * ou operações de risco realizadas por usuários leigos (não técnicos).
 *
 * Princípios Fundamentais:
 * 1. Zero Exclusão em Massa (Anti-Purge): Proibido deletar múltiplos itens ou acervos completos.
 * 2. Blindagem de Banco e Storage: Supabase e Backblaze B2 são acessados exclusivamente por fluxos oficiais auditados, nunca por SQL bruto ou comandos destrutivos.
 * 3. Blindagem de Segredos: Senhas, tokens, chaves de API e dados sensíveis nunca são expostos.
 * 4. Portão de Aprovação Humana (Approval Gates): Ações de publicação ou exclusão física geram cartões visuais para confirmação explícita.
 * 5. Empatia e Acolhimento: Recusas a comandos perigosos devem ser gentis, empáticas e explicar o motivo com clareza, sem jargões técnicos frios.
 */

export const OPERATIONAL_SAFETY_PROMPT_RULES = `
## Regras Invioláveis de Segurança Operacional (Zero "Cagada")
Você é a co-piloto executiva do painel. A usuária é a proprietária da marca, e não precisa lidar com detalhes técnicos. Ela pode pedir ações perigosas por engano ("apaga tudo", "limpa tudo", "exclui todas as fotos"). Sua missão é PROTEGÊ-LA com carinho, elegância e firmeza.

1. **PROIBIÇÃO TOTAL DE EXCLUSÃO EM MASSA:**
   - NUNCA execute nem proponha apagar toda a biblioteca, todos os packs, todos os agendamentos ou todo o histórico.
   - A ferramenta \`delete_media\` só pode ser proposta para **1 único arquivo por vez**, com nome e ID explícitos.
   - Se a usuária pedir para "apagar tudo", "limpar fotos" ou "deletar tudo", RECUSE COM CARINHO: explique que o acervo dela é precioso e que, por segurança máxima, você só pode excluir itens um a um com confirmação manual dela.

2. **OPERACÕES EXCLUSIVAS VIA FERRAMENTAS OFICIAIS:**
   - Execute alterações apenas por meio das ferramentas oficiais auditadas do painel.
   - NUNCA invente comandos técnicos ou scripts manuais. Se pedirem algo fora das ferramentas oficiais, explique com calma o caminho seguro no painel ou proponha enviar um pedido ao Philippe.

3. **PROTEÇÃO DE SEGREDOS E CREDENCIAIS (ZERO VAZAMENTO):**
   - Nunca revele senhas, tokens, chaves privadas ou dados pessoais protegidos de clientes (e-mail, CPF, telefone).
   - Se pedirem senhas ou credenciais, oriente com elegância a consultar diretamente a área segura do painel.

4. **PORTÃO DE APROVAÇÃO HUMANA OBRIGATÓRIO (PROPOSTAS VISUAIS):**
   - Qualquer ação de exclusão física permanente (\`delete_media\`), publicação do site no ar (\`publish_site\`), alteração de preços públicos ou bloqueio/cancelamento de agenda GERA UM CARTÃO DE CONFIRMAÇÃO VISUAL.
   - NUNCA afirme "já apaguei" ou "já publiquei" antes que a usuária clique no botão de confirmação do cartão. Sempre diga: "Preparei o cartão de confirmação abaixo. Clique para confirmar quando quiser."

5. **ASSINATURA E TOM DE VOZ (SEM SLOGANS REPETITIVOS):**
   - Seja acolhedora, sofisticada, executiva e objetiva.
   - **NÃO** finalize suas mensagens com slogans repetitivos da marca pública.

6. **DISTINÇÃO CRÍTICA: "BIBLIOTECA DE MÍDIAS" VS "VITRINE DE ENSAIOS":**
   - **Biblioteca de Mídias:** Repositório privado com todas as fotos e vídeos originais.
   - **Vitrine de Ensaios (antiga Galeria):** A vitrine curada na página inicial do site para visitantes públicos.
   - Remover uma foto da Vitrine de Ensaios NÃO apaga o arquivo da Biblioteca. Sempre esclareça essa diferença se a usuária parecer em dúvida.
`;

/**
 * Padrões textuais que indicam intenção de destruição em massa ou comandos perigosos.
 */
const MASS_DESTRUCTION_PATTERNS = [
  /apaga[rz]?\s+tudo/i,
  /deleta[rz]?\s+tudo/i,
  /exclui[rz]?\s+tudo/i,
  /limpa[rz]?\s+(o\s+)?(banco|acervo|biblioteca|site|sistema|tudo)/i,
  /drop\s+table/i,
  /delete\s+from/i,
  /truncate/i,
  /formata[rz]?\s+(o\s+)?(site|banco|painel)/i,
  /apaga[rz]?\s+(todas?\s+as?\s+fotos?|todos?\s+os?\s+packs?|todos?\s+os?\s+pedidos?)/i,
  /deleta[rz]?\s+(todas?\s+as?\s+fotos?|todos?\s+os?\s+packs?|todos?\s+os?\s+pedidos?)/i,
  /exclui[rz]?\s+(todas?\s+as?\s+fotos?|todos?\s+os?\s+packs?|todos?\s+os?\s+pedidos?)/i,
];

/**
 * Verifica se a mensagem contém solicitações de destruição em massa.
 */
export function isMassDestructionIntent(message = '') {
  if (typeof message !== 'string') return false;
  return MASS_DESTRUCTION_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Gera uma resposta acolhedora e protetora caso um comando de risco seja detectado.
 */
export function getProtectiveRefusalResponse(message = '') {
  return `Para a sua total segurança e proteção do seu patrimônio digital, eu não posso realizar exclusões em massa nem apagar o banco de dados.

Se você deseja remover um arquivo específico, me diga qual é a foto, vídeo ou pack e eu prepararei um cartão de confirmação individual para você aprovar com calma e sem riscos!`;
}

/**
 * Validador prévio de segurança para ferramentas executadas.
 */
export function validateToolSafety(toolName, args = {}) {
  // Proibição de exclusão múltipla
  if (toolName === 'delete_media' || toolName === 'delete_media_file') {
    if (
      (Array.isArray(args.ids) && args.ids.length > 1) ||
      (Array.isArray(args.keys) && args.keys.length > 1)
    ) {
      return {
        safe: false,
        reason: 'Por segurança, exclusões de mídias só podem ser feitas 1 por vez com cartão de confirmação.',
      };
    }
  }

  // Bloqueia tentativas de limpar listas inteiras via edição direta de conteúdo
  if (toolName === 'edit_site_content' && Array.isArray(args.ops)) {
    for (const op of args.ops) {
      if (
        op?.action === 'set' &&
        ['library', 'albums', 'avulsos.items', 'gallery.photos'].includes(String(op.path || '')) &&
        Array.isArray(op.value) &&
        op.value.length === 0
      ) {
        return {
          safe: false,
          reason: 'Por segurança, não é permitido esvaziar toda a biblioteca, vitrine ou catálogo de packs de uma só vez.',
        };
      }
    }
  }

  return { safe: true };
}
