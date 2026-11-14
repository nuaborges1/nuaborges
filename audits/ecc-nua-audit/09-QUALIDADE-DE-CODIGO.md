# Arquitetura e qualidade

## Mapa

Next.js App Router e React no frontend; Cloudflare Pages Functions em `functions/api`, entrega adicional em `functions/media`/audio; PostgreSQL/Supabase em helpers server-side; B2 via SDK S3; Stripe, Mercado Pago e Gemini em integrações. Arquivos JSON locais servem alguns caminhos e fixtures. Três TOML de Pages declaram nomes públicos/admin/central. Isso descreve fontes, não ambiente implantado.

544? Medida automatizada reporta 543 arquivos selecionados e 16 rotas; conta anterior pode variar por exclusões. 80 arquivos functions; 77 handlers API. Contagens em `evidence/frontend-metrics.json`; heurística, não métrica de execução. Maior arquivo 2277 linhas. Duplicação `components/admin` e `components/nua/admin` merece confirmar import graph antes de consolidar; 69 wrappers detectados heuristicamente. Nenhum ciclo de dependência foi estabelecido (`import-graph.json` incompleto).

Riscos estruturais: múltiplos stores e fallbacks; fronteira de ambiente local/prod; domínio de conteúdo inteiro serializado; handlers com responsabilidades comerciais e persistência; inconsistências entre shape do servidor e cliente. Recomendações priorizadas por invariantes de segurança/persistência antes de refactor. Sem refatoração nesta etapa.
