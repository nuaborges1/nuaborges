/**
 * Ponto de Entrada da Biblioteca Central (lib)
 * 
 * Dividido estritamente em:
 * 1. nua          -> Regras, stores, tipos e serviços do site e admin da Nua Borges
 * 2. admingeral   -> Tipos, cliente e serviços da Central phdev (phdev.store)
 * 3. core         -> Utilitários compartilhados (ambiente, segurança, financeiro canônico)
 * 4. services     -> Barramento de APIs e integrações externas
 */

export * as nua from './nua';
export * as adminGeral from './admingeral';
export * as core from './core';
export * as services from './services';
