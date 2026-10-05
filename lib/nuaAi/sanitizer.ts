/**
 * NUA IA — Sanitização de Dados Pessoais Sensíveis e Proteção LGPD
 * 
 * Especialmente crítico para o domínio de Sexologia e Saúde Sexual:
 * Remove ou anonimiza identificadores de terceiros (seguidoras, clientes, pacientes),
 * telefones, e-mails, documentos e dados financeiros antes da persistência em JSONL
 * e antes do envio para modelos externos.
 */

export interface SanitizationResult {
  sanitized: string;
  hasSensitiveData: boolean;
  maskedTypes: string[];
}

// Expressões regulares para detecção de dados sensíveis
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE_BR_REGEX = /(?:\+?55\s?)?(?:\(?0?[1-9]{2}\)?\s?)(?:9\s?)?\d{4}[-\s]?\d{4}\b/g;
const CPF_REGEX = /\b\d{3}\.?\d{3}\.?\d{3}[-\.]?\d{2}\b/g;
const CREDIT_CARD_REGEX = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;

// Padrões de introdução de casos de terceiros (ex: "uma seguidora chamada Mariana", "minha paciente Júlia")
const THIRD_PARTY_NAME_PATTERNS = [
  /(?:uma?\s+seguidor[ao]|uma?\s+paciente|uma?\s+cliente|uma?\s+alun[ao]|um\s+caso)\s+(?:chamad[ao]|de\s+nome)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*)/gi,
  /(?:conversei\s+com|atendi)\s+(?:um[a]?\s+)?([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)+)/g,
];

/**
 * Sanitiza o texto mascarando identificadores sensíveis para preservar a privacidade e conformidade com a LGPD.
 */
export function sanitizeTextForStorageAndPrompt(text: string): SanitizationResult {
  if (!text || typeof text !== 'string') {
    return { sanitized: '', hasSensitiveData: false, maskedTypes: [] };
  }

  let cleaned = text;
  const maskedTypes: string[] = [];

  // 1. Mascara E-mails
  if (EMAIL_REGEX.test(cleaned)) {
    cleaned = cleaned.replace(EMAIL_REGEX, '[E-mail Ocultado]');
    maskedTypes.push('email');
  }

  // 2. Mascara Telefones / WhatsApp
  if (PHONE_BR_REGEX.test(cleaned)) {
    cleaned = cleaned.replace(PHONE_BR_REGEX, '[Telefone Ocultado]');
    maskedTypes.push('telefone');
  }

  // 3. Mascara CPFs
  if (CPF_REGEX.test(cleaned)) {
    cleaned = cleaned.replace(CPF_REGEX, '[CPF Ocultado]');
    maskedTypes.push('cpf');
  }

  // 4. Mascara Cartões de Crédito
  if (CREDIT_CARD_REGEX.test(cleaned)) {
    cleaned = cleaned.replace(CREDIT_CARD_REGEX, '[Dado Financeiro Ocultado]');
    maskedTypes.push('cartao');
  }

  // 5. Mascara nomes de casos de terceiros em relatos de sexologia
  for (const pattern of THIRD_PARTY_NAME_PATTERNS) {
    cleaned = cleaned.replace(pattern, (match, capturedName) => {
      // Evita mascarar nomes públicos da marca como Nua ou Philippe
      if (/^(?:Nua|Philippe|Borges|Rafael)$/i.test(capturedName.trim())) {
        return match;
      }
      maskedTypes.push('nome_terceiro');
      return match.replace(capturedName, '[Pessoa Anonimizada]');
    });
  }

  return {
    sanitized: cleaned,
    hasSensitiveData: maskedTypes.length > 0,
    maskedTypes,
  };
}
