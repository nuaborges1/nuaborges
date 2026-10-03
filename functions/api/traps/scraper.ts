/**
 * Cloudflare Pages Function: /api/traps/scraper
 *
 * Honeypot Scraper Trap:
 * Este endpoint é linkado exclusivamente de forma invisível no HTML público.
 * Visitantes humanos e motores de busca legítimos (Googlebot) nunca acessam este link.
 * Apenas robôs de raspagem que varrem todo o DOM e seguem todos os links caem aqui.
 */

import { recordAuditEvent } from '../_auditHelper';

interface Env {
  BUCKET?: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequest = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  const clientIp =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For') ||
    '127.0.0.1';
  const userAgent = request.headers.get('User-Agent') || 'Desconhecido';
  const country = request.headers.get('CF-IPCountry') || 'Desconhecido';

  // Registra o bot na auditoria do Master Admin
  await recordAuditEvent(env, request, {
    type: 'HONEYPOT_SCRAPER_TRAP',
    severity: 'warning',
    summary: `Bot de raspagem (scraper) capturado na armadilha invisível! IP: ${clientIp} [${country}]`,
    details: {
      clientIp,
      country,
      userAgent,
      url: request.url,
      headers: {
        accept: request.headers.get('Accept'),
        referer: request.headers.get('Referer'),
      },
    },
  });

  // Retorna resposta inócua com diretiva noindex para enganar o bot sem quebrar nada
  return new Response(
    '<!DOCTYPE html><html><head><meta name="robots" content="noindex,nofollow"><title>OK</title></head><body><!-- Trap Triggered --></body></html>',
    {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Robots-Tag': 'noindex, nofollow',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
};
