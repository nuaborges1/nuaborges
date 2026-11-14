/**
 * URL pública oficial do site.
 *
 * Para usar um domínio próprio no futuro, defina NEXT_PUBLIC_SITE_URL
 * (ex: https://nuaborges.com.br) no build — nenhum outro arquivo precisa mudar.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://nuaborges.com.br'
).replace(/\/$/, '');

export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');

export const DEFAULT_CONTACT_EMAIL = 'contato@nuaborges.com.br';
