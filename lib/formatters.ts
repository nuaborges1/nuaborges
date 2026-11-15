/**
 * Utilitários de formatação e normalização de valores da plataforma NUA Borges.
 */

/**
 * Remove qualquer caractere que não seja dígito ou vírgula/ponto,
 * normaliza pontos para vírgulas, impede múltiplas vírgulas
 * e limita a no máximo 2 casas decimais.
 */
export function cleanBrlInput(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '';
  const str = String(val);
  // Remove tudo exceto números, vírgula e ponto
  let cleaned = str.replace(/[^\d.,]/g, '').replace(/\./g, ',');
  
  // Permite apenas uma vírgula
  const parts = cleaned.split(',');
  if (parts.length > 2) {
    cleaned = parts[0] + ',' + parts.slice(1).join('');
  }
  
  // Limita a 2 casas decimais após a vírgula
  const [inteiro, decimais] = cleaned.split(',');
  if (decimais !== undefined) {
    cleaned = `${inteiro},${decimais.slice(0, 2)}`;
  }

  return cleaned;
}

/**
 * Converte qualquer representação de preço em número float válido.
 */
export function parseBrlPrice(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (!str) return 0;

  // Se contiver vírgula, pontos são separadores de milhar e vírgula é decimal
  let normalized: string;
  if (str.includes(',')) {
    normalized = str.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = str;
  }
  const clean = normalized.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Normaliza e formata um valor monetário para o padrão brasileiro (R$).
 * Exemplos:
 *  - "50" -> "50,00"
 *  - "1" -> "1,00"
 *  - "39.9" ou "39,9" -> "39,90"
 *  - "49,90" -> "49,90"
 *  - "" ou inválido -> "0,00"
 */
export function formatBrlPrice(raw: string | number | undefined | null): string {
  if (raw === undefined || raw === null) return '0,00';
  const str = String(raw).trim();
  if (!str) return '0,00';

  const parsed = parseBrlPrice(str);
  return parsed.toFixed(2).replace('.', ',');
}
