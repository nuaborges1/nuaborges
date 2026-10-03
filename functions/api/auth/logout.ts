/**
 * Cloudflare Pages Function: POST /api/auth/logout
 *
 * Invalidate admin session by clearing the __Host-Admin-Session cookie.
 */

import { buildClearCookie } from '../_authHelper';

export const onRequestPost = async () => {
  return new Response(
    JSON.stringify({ success: true, message: 'Sessão encerrada com sucesso.' }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': buildClearCookie(),
      },
    }
  );
};
