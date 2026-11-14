# Plano de correções proposto (não implementado)

## A — Contenção crítica

**Pré-requisito:** responsável confirma SHA de deploy e domínio de cada Pages project. Identificar se os handlers/mídias analisados correspondem ao runtime. Restringir exposição de mídia paga e revisar callback financeiro conforme procedimento de incidentes; preservar evidência e reconciliar pedidos sem alterar registros automaticamente. **Aceite:** nenhum acesso anônimo ao conteúdo pago; webhook sem assinatura não altera estado; evidências/objetos afetados contabilizados. **Risco:** invalidar previews ou callback legítimo.

## B — Integridade comercial

Preço e item canônicos no backend, assinaturas de gateway fail-closed, atualização transacional e idempotência após commit, transições de pagamento explícitas e conciliação com reembolso parcial/paginação. Corrigir resposta de personalizados e token de agendamento. **Aceite:** testes sintéticos adversariais e staging comprovam estados e valores.

## C — Estabilidade

Erro não vira sucesso; fallback de storage explícito; timeouts/retry sem duplicar operação; unicidade de slot transacional. Reautenticação/revogação e autorização por recurso/campo. **Aceite:** testes de falha concorrente e restart isolado.

## D — Arquitetura

Só depois de invariantes, mapear stores canônicos, environment boundaries e módulos grandes; separar por coesão e medir dependências. **Aceite:** comportamento equivalente e owners/testes.

## E — Experiência

Foco e teclado dos modais, confirmação do estado real, textos não técnicos, iOS Safari e navegação móvel. **Aceite:** testes WCAG e fluxos observados em dispositivos/staging.

## F — Performance/SEO

Corrigir canonical/robots com URL de produção validada; medir bundle e Web Vitals antes de otimizar imagens/fonts. **Aceite:** crawler e métricas repetíveis sem indexar áreas pagas.

## G — Prevenção

CI isolada com typecheck, lint, testes de handler, secret scanning e verificação de build com serviços stubados; deploy por ambiente e rollback observado. **Aceite:** pipeline evita deploy em falha e nenhuma credencial em fixture.
