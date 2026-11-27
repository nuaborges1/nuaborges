/**
 * Helper Edge para injeção segura da flag de Identidade Verbal e coerência
 * de metadados SEO em respostas HTML (`functions/_middleware.ts`).
 *
 * - Usa `<meta name="nua-copy-mode" content="...">` (zero script inline, zero
 *   impacto em Content-Security-Policy).
 * - Quando `nua_autoral_experimental` está ativo em rotas públicas mapeadas,
 *   também atualiza `<title>`, `description`, `og:title`, `og:description`,
 *   `twitter:title` e `twitter:description` no edge.
 * - Usa `HTMLRewriter` nativo da Cloudflare em produção (streaming sem buffer
 *   completo) e fallback seguro em ambiente Node para testes unitários.
 */

import { resolveRouteSeo } from '../lib/copy/resolver';
import type { CopyMode } from '../lib/copy/types';

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const EXCLUDED_EDGE_COPY_PATH = /^\/(?:admin|admingeral|contrato|avaliacao)(?=[/.]|$)/i;

export function shouldInjectCopyMeta(hostname: string, pathname: string, response: Response): boolean {
  const lowerHost = (hostname || '').toLowerCase();
  if (lowerHost.startsWith('admin.') || lowerHost.startsWith('admingeral.')) {
    return false;
  }
  if (EXCLUDED_EDGE_COPY_PATH.test(pathname || '/')) {
    return false;
  }
  if (response.status < 200 || response.status >= 300) {
    return false;
  }
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  return contentType.includes('text/html');
}

export async function applyEdgeCopyModeToHtml(
  response: Response,
  pathname: string,
  mode: CopyMode
): Promise<Response> {
  const seo = mode === 'nua_autoral_experimental' ? resolveRouteSeo(pathname, mode) : null;
  const headers = new Headers(response.headers);
  headers.delete('Content-Length');
  headers.delete('ETag');
  headers.set('X-Nua-Copy-Mode', mode);

  const RewriterCtor = (globalThis as any).HTMLRewriter;
  if (typeof RewriterCtor === 'function') {
    let rewriter = new RewriterCtor().on('head', {
      element(el: any) {
        el.prepend(`<meta name="nua-copy-mode" content="${escapeHtmlAttr(mode)}">`, { html: true });
      },
    });

    if (seo) {
      rewriter = rewriter
        .on('title', {
          element(el: any) {
            el.setInnerContent(seo.title);
          },
        })
        .on('meta[name="description"]', {
          element(el: any) {
            el.setAttribute('content', seo.description);
          },
        })
        .on('meta[property="og:title"]', {
          element(el: any) {
            el.setAttribute('content', seo.title);
          },
        })
        .on('meta[property="og:description"]', {
          element(el: any) {
            el.setAttribute('content', seo.description);
          },
        })
        .on('meta[name="twitter:title"]', {
          element(el: any) {
            el.setAttribute('content', seo.title);
          },
        })
        .on('meta[name="twitter:description"]', {
          element(el: any) {
            el.setAttribute('content', seo.description);
          },
        });
    }

    const baseResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
    return rewriter.transform(baseResponse);
  }

  // Fallback seguro fora do runtime Cloudflare (ex.: testes unitários em Node)
  let html = await response.text();
  const metaTag = `<meta name="nua-copy-mode" content="${escapeHtmlAttr(mode)}">`;
  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, `<head$1>${metaTag}`);
  } else {
    html = `${metaTag}${html}`;
  }

  if (seo) {
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlText(seo.title)}</title>`);
    html = html.replace(
      /(<meta\s+[^>]*name=["']description["'][^>]*content=)["'][^"']*["']/i,
      `$1"${escapeHtmlAttr(seo.description)}"`
    );
    html = html.replace(
      /(<meta\s+[^>]*property=["']og:title["'][^>]*content=)["'][^"']*["']/i,
      `$1"${escapeHtmlAttr(seo.title)}"`
    );
    html = html.replace(
      /(<meta\s+[^>]*property=["']og:description["'][^>]*content=)["'][^"']*["']/i,
      `$1"${escapeHtmlAttr(seo.description)}"`
    );
    html = html.replace(
      /(<meta\s+[^>]*name=["']twitter:title["'][^>]*content=)["'][^"']*["']/i,
      `$1"${escapeHtmlAttr(seo.title)}"`
    );
    html = html.replace(
      /(<meta\s+[^>]*name=["']twitter:description["'][^>]*content=)["'][^"']*["']/i,
      `$1"${escapeHtmlAttr(seo.description)}"`
    );
  }

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
