import { isLocalhost as checkHost } from './env';

/**
 * Trava estrita de ambiente para o Módulo Blog / Diário Secreto.
 * - Em LOCALHOST: Ativo para testes e desenvolvimento.
 * - Em PRODUÇÃO: COMPLETAMENTE DESATIVADO (retorna 404 e links ocultos no site).
 */
export function isLocalhost(): boolean {
  return checkHost();
}

export function isBlogEnabled(): boolean {
  return checkHost();
}
