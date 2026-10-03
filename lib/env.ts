/**
 * Utilitário de detecção de ambiente para o ecossistema Nua Borges.
 *
 * REGRA ESTRITA DE PRODUÇÃO vs LOCALHOST:
 * - Em LOCALHOST (desenvolvimento / testes locais): o player de música e sua aba no admin ficam ATIVOS.
 * - Em PRODUÇÃO / DEPLOY (site público e admin na nuvem): o player de música e qualquer controle no admin
 *   ficam COMPLETAMENTE DESATIVADOS, sem carregar iframes, tags <audio>, scripts do YouTube ou elementos visuais.
 */

export function isLocalhost(): boolean {
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV !== 'production' || process.env.ENABLE_LOCAL_PLAYER === 'true';
  }

  const host = window.location.hostname;
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '[::1]' ||
    host.endsWith('.local')
  );
}
