# Site público, UX e acessibilidade

## Rotas observadas no App Router

16 page files: `/`, `/sobre`, `/contato`, `/contrato`, `/termos`, `/privacidade`, `/chamadas`, `/chamadas/reserva`, `/assistir/[slug]`, `/avulsos`, `/avulsos/[slug]`, `/acervo`, `/personalizados`, `/personalizados/pedido`, `/admin`, `/admin/[module]`. Extensões e redirects de Cloudflare alteram URLs publicadas; conferir artefato implantado.

Achado: ContactModal pode mostrar sucesso mesmo se backend falha e abre mailto; assim não comprova envio/recepção pelo sistema. Metadados canônicos e dados estruturados precisam revisão por rota; auditoria de dispositivo real está pendente. Conteúdo protegido é achado P0 separado.

Nenhuma captura, automação de browser ou navegação de produção foi realizada. A avaliação visual não equivale a teste de WCAG. Pendem contraste, zoom, foco, leitor de tela, teclado, toque, orientação e Safari/iOS com viewport real. Refinamentos devem preservar a identidade atual.
