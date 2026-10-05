/**
 * Barramento Central de Componentes de UI
 * 
 * Separado estritamente por projeto:
 * 1. nua          -> Componentes do Site Público e Painel Administrativo da Nua Borges
 * 2. admingeral   -> Componentes da Central phdev (phdev.store)
 */

export * from './nua';
export * as adminGeralComponents from './admingeral';
