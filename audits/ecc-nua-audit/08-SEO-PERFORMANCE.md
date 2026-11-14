# SEO e desempenho

Inspeção estática local, sem crawler público. Há `app/sitemap.ts`, metadata raiz em `app/layout.tsx`, `lib/nua/seo.ts` e `public/_headers`. Relato frontend encontrou canonical raiz herdado por páginas importantes e referência pages.dev em robots; verificar linhas/artefato e deploy antes de afirmar resposta pública.

Rotas privadas e conteúdo pago precisam `noindex` efetivo na resposta, além de proteção de acesso; ocultar da busca não protege dados. A existência de sitemap não confirma rotas válidas, canonical, códigos HTTP ou indexação.

Performance: fonte Next remota, imagens não otimizadas e componentes cliente abundantes são pontos a medir, não prova de lentidão. Evidence metrics conta 543 arquivos candidatos, 207 marcados com client boundary, 69 wrappers heurísticos; maior módulo `lib/nuaAi/toolRegistry.mjs` (2277 linhas). Esses números não medem JS enviado, cobertura do grafo nem velocidade. Sem build auditável, Web Vitals, Lighthouse ou browser, métricas não verificadas.
