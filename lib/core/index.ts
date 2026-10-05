/**
 * Módulo Core / Compartilhado
 * Infraestrutura comum, segurança, utilitários e regras financeiras globais
 */

export * from './env';
export { isBlogEnabled } from './envGuard';
export * from './security';
export * from './financeCanonical';
export * from './audioAlerts';
export * from './utils';
