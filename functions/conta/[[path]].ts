/**
 * Cloudflare Pages Function: /conta/[[path]]
 *
 * Permite rotas limpas na área privada do cliente (/conta/biblioteca,
 * /conta/biblioteca/<slug>, /conta/personalizados, /conta/chamadas,
 * /conta/pedidos, /conta/perfil) com suporte a recarregamento direto (F5)
 * no export estático do Next.js, sem afetar APIs ou segurança do Cofre.
 */

type PagesContext = {
  request: Request;
  env: {
    ASSETS?: { fetch: (input: RequestInfo | URL) => Promise<Response> };
  };
  next: () => Promise<Response>;
};

export const onRequestGet = async ({ request, env, next }: PagesContext) => {
  if (!env?.ASSETS || typeof env.ASSETS.fetch !== 'function') {
    return next();
  }

  const url = new URL(request.url);
  // Se apontar para arquivo estático com extensão explícita, deixa seguir normalmente
  if (/\.[a-z0-9]{2,6}$/i.test(url.pathname)) {
    return next();
  }

  const candidates = ['/conta.html', '/conta/index.html', '/conta'];
  for (const candidate of candidates) {
    const assetUrl = new URL(candidate, url.origin);
    const res = await env.ASSETS.fetch(new Request(assetUrl.toString(), { method: request.method }));
    if (res.ok) {
      const headers = new Headers(res.headers);
      headers.set('X-Robots-Tag', 'noindex, nofollow');
      headers.set('Cache-Control', 'private, no-cache');
      return new Response(res.body, { status: 200, headers });
    }
  }

  return next();
};

export const onRequestHead = onRequestGet;
