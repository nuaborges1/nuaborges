/**
 * Camada Central de Serviços e APIs
 * 
 * Separada estritamente em dois ecossistemas:
 * 1. nua          -> Tudo relacionado ao site e painel administrativo da Nua Borges
 * 2. admingeral   -> Central phdev / ecossistema phdev.store
 */

export * as nuaServices from './nua';
export * as adminGeralServices from './admingeral';
