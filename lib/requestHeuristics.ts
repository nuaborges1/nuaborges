/**
 * requestHeuristics.ts — Funções puras e client-safe para triagem de solicitações.
 * 
 * Este módulo não contém dados sensíveis, credenciais ou APIs exclusivas de servidor.
 * Pode ser importado com total segurança tanto em componentes React (client)
 * quanto em rotas e Workers (server).
 */

export * from './heuristics/types';
export * from './heuristics/classifier';
export * from './heuristics/fileDetector';
export * from './heuristics/promptBuilder';
