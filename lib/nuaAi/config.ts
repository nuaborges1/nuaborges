/**
 * NUA IA — Configurações Gerais e Chave Mestra ON/OFF
 * 
 * ============================================================================
 * CHAVE MESTRA LOCALHOST VS PRODUÇÃO:
 * 
 * Por padrão, esta funcionalidade fica ATIVA EXCLUSIVAMENTE NO LOCALHOST.
 * 
 * Para ativar em PRODUÇÃO:
 * 1. Altere ENABLED_IN_PRODUCTION abaixo para `true`, OU
 * 2. Defina a variável de ambiente `NEXT_PUBLIC_NUA_AI_PROD=true` no Cloudflare Pages.
 * ============================================================================
 */

export const NUA_AI_CONFIG = {
  /**
   * Chave ON/OFF para colocar em produção ou não.
   * false = APENAS LOCALHOST
   * true  = LIBERADO PARA PRODUÇÃO
   */
  ENABLED_IN_PRODUCTION: false,

  // Metadados visuais da assistente
  ASSISTANT_NAME: 'Nua IA',
  CREATOR_NAME: 'Nua Borges',
  SUBTITLE: 'Assistente em Sexologia & Criatividade',
  VERSION: '1.1.0',

  // Prioridade de Domínios
  DOMAIN_PRIORITIES: [
    '1. Sexologia e sexualidade humana',
    '2. Saúde sexual e reprodutiva',
    '3. Educação sexual',
    '4. Psicologia e relacionamentos',
    '5. Direitos, consentimento e segurança',
    '6. Pesquisa científica e evidências',
    '7. Conteúdo e comunicação',
    '8. Marketing e redes sociais',
    '9. Conhecimento específico da Nua Borges',
  ],

  // Porta do servidor local de arquivos (Node.js) em desenvolvimento
  DEV_SERVER_PORT: 3105,

  // Modelos recomendados para Gemini API (ultra rápidos e econômicos)
  CANDIDATE_MODELS: [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
  ],

  // Limites de controle de tokens (Token Economy)
  MAX_HISTORY_SNIPPET_TOKENS: 450,
  MAX_RECENT_TURNS_IN_PROMPT: 6,
  MAX_MEMORY_FACTS_IN_PROMPT: 8,
  MAX_SEARCH_SNIPPETS: 2,

  // Timeouts
  REQUEST_TIMEOUT_MS: 12000,
  MODEL_TIMEOUT_MS: 8000,

  /**
   * Avalia dinamicamente se a Nua IA deve estar visível e operante no ambiente atual.
   */
  isEnabled: (): boolean => {
    // 1. Chave explícita para produção ligada no código ou em variável de ambiente
    if (
      NUA_AI_CONFIG.ENABLED_IN_PRODUCTION ||
      process.env.NEXT_PUBLIC_NUA_AI_PROD === 'true'
    ) {
      return true;
    }

    // 2. Ambiente de navegador (client-side): verifica se está em localhost
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      return (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host.endsWith('.local')
      );
    }

    // 3. Ambiente de servidor (Node.js): ativo apenas em desenvolvimento
    return process.env.NODE_ENV !== 'production';
  },
};
