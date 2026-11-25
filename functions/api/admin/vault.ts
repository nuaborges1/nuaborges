/**
 * Cloudflare Pages Function: /api/admin/vault
 *
 * DESATIVADO (Operação Refinamento Definitivo — 24/11/2026).
 * O módulo administrativo "Acessos e Senhas" (/admin/cofre) foi removido da experiência da cliente.
 * Registros criptografados legados em `site_content.key = 'vault_credentials'` são preservados
 * intactos no banco sem exclusão automática, mas o endpoint não aceita mais leitura ou gravação.
 *
 * ATENÇÃO: Este arquivo NÃO tem relação com o Cofre Digital dos compradores (https://nuaborges.com.br/cofre),
 * que continua operando normalmente via `/api/me/cofre`, `/api/me/_vault` e `/api/me/media-url`.
 */

const GONE_RESPONSE = () =>
  new Response(
    JSON.stringify({
      success: false,
      error: 'O módulo Acessos e Senhas foi desativado neste painel.',
    }),
    {
      status: 410,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    }
  );

export const onRequestGet = async () => GONE_RESPONSE();
export const onRequestPost = async () => GONE_RESPONSE();
export const onRequestDelete = async () => GONE_RESPONSE();
export const onRequest = async () => GONE_RESPONSE();
