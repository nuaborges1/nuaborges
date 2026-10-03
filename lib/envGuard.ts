import { isLocalhost as checkHost } from './env';

/**
 * Módulo Blog / Diário Secreto.
 * Ativo em todos os ambientes (desenvolvimento, staging e produção na Cloudflare).
 * Para desativar temporariamente em produção, basta definir NEXT_PUBLIC_ENABLE_BLOG="false".
 */
export function isLocalhost(): boolean {
  if (process.env.NEXT_PUBLIC_ENABLE_BLOG === 'false') {
    return false;
  }
  return true;
}

export function isBlogEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_ENABLE_BLOG === 'false') {
    return false;
  }
  return true;
}
