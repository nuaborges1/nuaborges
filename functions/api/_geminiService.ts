/**
 * functions/api/_geminiService.ts — Ponto de entrada de compatibilidade para Cloudflare Pages Functions.
 * 
 * NUNCA importar em componentes client.
 * Delega toda a lógica para os novos módulos server-side em lib/geminiService,
 * lib/requestHeuristics e lib/projectKnowledge.
 */

export * from '../../lib/geminiService';
export * from '../../lib/requestHeuristics';
export * from '../../lib/projectKnowledge';
