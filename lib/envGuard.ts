import { isLocalhost as checkHost } from './env';

/**
 * Trava de ambiente para o Módulo Blog / Diário Secreto.
 * - Em LOCALHOST (desenvolvimento / testes): sempre ativo.
 * - Em PRODUÇÃO (Cloudflare Pages / domínio público): travado por padrão (404),
 *   podendo ser liberado instantaneamente configurando a variável de ambiente
 *   NEXT_PUBLIC_ENABLE_BLOG="true" nas configurações do Cloudflare Pages.
 */
export function isLocalhost(): boolean {
  if (process.env.NEXT_PUBLIC_ENABLE_BLOG === 'true') {
    return true;
  }
  return checkHost();
}

export function isBlogEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_ENABLE_BLOG === 'true') {
    return true;
  }
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV !== 'production' || process.env.ENABLE_LOCAL_BLOG === 'true';
  }
  return checkHost();
}
