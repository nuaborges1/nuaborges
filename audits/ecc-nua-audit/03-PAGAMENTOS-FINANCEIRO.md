# Pagamentos e financeiro

## Achados

### NUA-PAY-001 — Webhook Stripe sem assinatura aceita evento financeiro

**P0 · reproduzido em handler sintético, produção não testada.** Em `functions/api/webhooks/stripe.ts`, a condição valida a assinatura apenas se o segredo e o cabeçalho estiverem ambos presentes. Middleware encaminha webhook público. Teste: segredo configurado, assinatura ausente, resposta 200 e pedido sintético mudou para paid. Um evento forjado pode disparar concessão de acesso/serviço. Esperado: falhar fechado quando assinatura ausente/inválida, validar corpo bruto e evento no Stripe. Corrigir handler e rotas duplicadas de webhook; cobrir assinatura inválida, ausente, duplicada e replay em staging. Conter confirmando deploy; reconciliação manual autorizada. Alta complexidade; risco de rejeitar callbacks legados.

### NUA-PAY-002 — Webhook Mercado Pago não exige HMAC sob segredo presente

**P0 · código estático; deploy não confirmado.** `functions/api/finance/webhook.ts`: verificar configuração do segredo e assinatura real antes de aceitar atualização de pagamento. É endpoint público no gateway. Como o estado de implantação pode divergir, confirmar conteúdo implantado e variável sem revelar valor. Recomendação: fail-closed, validar assinatura/documento consultado no provedor, pagador/valor/moeda e idempotência persistida. Testes só isolados. Complexidade média/alta.

### NUA-PAY-003 — Checkout Stripe usa preço controlado pelo cliente e falha após criar sessão

**P1 · reproduzido com dependências stubadas.** `functions/api/stripe/create-checkout.ts` encaminha amount 0,01 fornecido pelo cliente e depois falha com `nowIso is not defined`, retornando HTTP 500 sem persistir pedido. Assim, fluxo comprovadamente funcional: nenhum. Esperado: preço derivado do item canônico no servidor, sessão/pedido ligados e persistência após resultado coerente. Pode haver sessão externa órfã em chamadas reais; nenhuma chamada externa foi feita. Alterar autoridade de preço e definir estado transacional. Complexidade média; risco de incompatibilidade de produtos.

### NUA-PAY-004 — Marcador idempotente precede atualização persistente

Prova sintética: falha de escrita seguida de retry resulta em evento deduplicado, sem repetir gravação. Webhook Stripe pode perder pagamento confirmado por falha transitória. Usar inbox/outbox ou marcar processado apenas junto ao commit; testar falha e duplicata concorrente.

### NUA-PAY-005 — Painel financeiro calcula reembolso bruto e não pagina resultados

Teste sintético indicou reembolso parcial de 10 apresentado como 100 e quatro respostas não seguiram `has_more`. Evidência referente ao handler `functions/api/stripe/dashboard.ts`; validar contra contrato atual do provedor e sem credenciais. Conciliação e limites de consulta devem refletir registros completos, moeda, estado e fuso.

### NUA-PAY-006 — Falha de leitura inicia parcela como paga

A lógica de `functions/api/finance/installments.ts` foi reproduzida com store sintético: falha de leitura resultou em status paid e falha de escrita ignorada. Risco de liberar serviço ou saldo incorreto. Falhar fechado e não interpretar ausência/erro como quitação.

### NUA-PAY-007 — Personalizados recebe 500 e resposta incompatível

Handler retorna sem campo payment necessário e omite arquivos entregues que o cliente consome; prova isolada resultou TypeError. Endpoint por ID também revela campos privados, ver NUA-SEC-005. Fluxo quebrado em condição reproduzida; esquema de resposta e autorização devem ser acordados.

### NUA-PAY-008 — Token de chamada consultado em coluna divergente

Prova estática/sintética: token gerado é procurado em `id` em vez de `public_token`, prejudicando lookup. Agendamento concorrente depende de mecanismo atômico real; um teste existente apenas usa Map e não prova transação. Não há verificação de banco concorrente.

## Integrações e separação

Stripe e Mercado Pago aparecem em código; nenhuma transação real foi criada ou consultada. A mensalidade do site e as vendas à cliente precisam de contas/credenciais separadas confirmadas fora deste repositório. Não se pode afirmar quais métodos (PIX/cartão) estão habilitados no ambiente implantado.

## Plano

Fase A confirmar os handlers e exposição, reconciliar eventos; Fase B assinatura criptográfica e estado do servidor como autoridade; inbox idempotente transacional; depois conciliação com paginação, reembolsos parciais, moedas e fuso. Critérios: assinatura inválida não muda dados, valor do cliente é ignorado, retry recupera falha, estados não pagos não concedem acesso.
