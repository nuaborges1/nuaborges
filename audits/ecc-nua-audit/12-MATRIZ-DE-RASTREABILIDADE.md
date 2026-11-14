# Matriz de rastreabilidade

Inventário de API: 77 arquivos em `functions/api`, 95 pares sintéticos endpoint/método considerados, 475 decisões gateway em `evidence/authorization.md`. As rotas dinâmicas/duplicadas não equivalem a paths HTTP comprovados; `_routes.json` de build não foi produzido. Exame handler por handler parcial. Status padrão: verificado estaticamente quando houve leitura; local sintético apenas nos casos indicados; produção não verificada.

| Grupo | Localização | Responsabilidade/dependências | Status e achados | Pendência |
|---|---|---|---|---|
| Auth | functions/api/auth, _authHelper, _middleware | admin, contrato, sessões | parcialmente verificado; SEC-002/003 | testes de expiração/revogação em staging |
| Conteúdo | content/sync, supabase/content, stores | publicação/Supabase/JSON | sintético parcial; SEC-004, SEC-001 | persistência e deploy |
| Pagamentos | payments, stripe, finance, webhooks | Stripe/MP/Supabase | sintético; PAY-001–008 | gateway real sem transação, staging |
| Mídia | media API, functions/media, B2 | S3/B2/CDN | sintético; SEC-001 | ACL/CDN/objeto/range |
| Chamadas | appointments, reserva e store | disponibilidade/pagamento | parcial; PAY-008, SEC-002 | concorrência DB |
| Personalizados | personalizados, requests, páginas | contato/pedido/conteúdo | parcial; SEC-005, PAY-007 | autenticação por pedido |
| IA | nua-ai, Gemini, proposals | provedor LLM e ações | estático parcial | modelo/custos/privacidade/runtime |
| Admin | app/admin, components/nua/admin | APIs acima | estático parcial | interação visual e papel |
| Público | 16 páginas app/**/page | conteúdo/mídia/checkout | inventariado estático | browser, HTTP, UX, SEO publicado |
| Privacidade/contratos | contrato, contato, privacy/terms | PII, PDF, assinatura | estático parcial | política jurídica e configuração |

Matriz de método/papel completa: [authorization.md](evidence/authorization.md). Cobertura total não é alegada. Cada conclusão deve ser interpretada em conjunto com riscos residuais.
