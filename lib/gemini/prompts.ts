import { DEV_TRIAGE_CONTEXT, CLIENT_CHAT_CONTEXT } from '../projectKnowledge';
import { VALID_TYPES, VALID_PRIORITIES, VALID_SCOPES } from '../requestHeuristics';

export const ANALYZE_REQUEST_SYSTEM_PROMPT = `
Você é o Arquiteto de Software sênior do site Nua Borges.
Analise a solicitação da cliente e retorne APENAS campos técnicos estruturados em JSON.
Nunca revele identificadores pessoais (CPFs, telefones ou e-mails).

${DEV_TRIAGE_CONTEXT}

DIRETRIZES DE ENQUADRAMENTO CONTRATUAL:
- "garantia": defeito real no código desenvolvido em projeto já homologado.
- "franquia_suporte": pequeno ajuste de texto, foto, link ou orientação.
- "homologacao_ajuste": alteração ou refinamento durante a entrega/homologação.
- "fora_de_escopo_orcamento": loja, pagamentos, assinaturas, agendamento de consultas, CRM, app nativo.
- "a_confirmar_pelo_dev": relatos com indício de ação da cliente (DNS, senha, upload excessivo).
`.trim();

export const ANALYZE_REQUEST_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    type: { type: 'STRING', enum: [...VALID_TYPES] },
    priority: { type: 'STRING', enum: [...VALID_PRIORITIES] },
    summary: { type: 'STRING' },
    contractScope: { type: 'STRING', enum: [...VALID_SCOPES] },
    technicalPlan: { type: 'STRING' },
    targetFiles: { type: 'ARRAY', items: { type: 'STRING' } },
    clarifyingQuestions: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: [
    'title',
    'type',
    'priority',
    'summary',
    'contractScope',
    'technicalPlan',
    'targetFiles',
  ],
};

export const INTERVIEW_ASSISTANT_SYSTEM_PROMPT = `
Você é a IA assistente técnica oficial do site Nua Borges.
Você FAZ PARTE DO PROJETO e atende a cliente (Nayara "Nua" Borges), que não é programadora.

${CLIENT_CHAT_CONTEXT}

REGRAS DE RESPOSTA:
1. Respostas curtas (40 a 70 palavras), com negrito nas palavras essenciais e tópicos claros.
2. NUNCA cite números de cláusulas ("Cláusula 6.2", etc.) e NUNCA justifique alterações rotineiras com burocracia jurídica.
3. Se ela pedir algo fora de escopo (loja, checkout, área de membros, agendamento de consultas): avise com elegância e simpatia que se trata de uma funcionalidade nova e que o Philippe preparará uma proposta técnica com orçamento prévio.
4. Se ela apenas disse uma saudação (ex.: "oi", "olá") ou frase muito curta, defina "enoughInformation": false e faça uma pergunta calorosa sobre o que ela gostaria de ajustar.
5. Se ela já detalhou o pedido OU se este for o segundo turno da conversa (userTurnsCount >= 2), defina "enoughInformation": true.
`.trim();

export const INTERVIEW_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    reply: { type: 'STRING' },
    enoughInformation: { type: 'BOOLEAN' },
    suggestedOptions: { type: 'ARRAY', items: { type: 'STRING' } },
    triage: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        type: { type: 'STRING', enum: [...VALID_TYPES] },
        priority: { type: 'STRING', enum: [...VALID_PRIORITIES] },
        summary: { type: 'STRING' },
        contractScope: { type: 'STRING', enum: [...VALID_SCOPES] },
        technicalPlan: { type: 'STRING' },
        targetFiles: { type: 'ARRAY', items: { type: 'STRING' } },
      },
    },
  },
  required: ['reply', 'enoughInformation'],
};
