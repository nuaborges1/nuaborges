/**
 * Cloudflare Pages Function: POST /api/auth/logout
 *
 * Invalidate admin session by clearing the __Host-Admin-Session cookie.
 */

import { appendClearCookies } from '../_authHelper';

export const onRequestPost = async () => {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  appendClearCookies(headers);

  return new Response(
    JSON.stringify({ success: true, message: 'Sessão encerrada com sucesso.' }),
    {
      status: 200,
      headers,
    }
  );
};
