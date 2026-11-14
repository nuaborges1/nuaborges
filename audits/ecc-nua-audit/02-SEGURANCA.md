# Segurança, autorização e privacidade

## Escopo

Revisão estática dos 77 arquivos de endpoints/functions, middleware, autenticação, mídia e exposição de dados; gateway real exercitado por matriz sintética local. Isso não confirma deploy, firewall, ambiente, chaves, RLS ou logs em produção. Nenhum segredo ou dado de cliente foi incluído.

## Achados prioritários

### NUA-SEC-001 — Upload comercial servido por namespace público

**P0 · confiança alta no código; exposição de produção não verificada · mídia/entitlements.** `lib/media/MediaService.ts`, `components/nua/site` e `functions/media/[[path]].ts`: o fluxo de mídia exclusiva usa o caminho normal `media/`, enquanto o servidor exige namespace `private/` para aplicar autorização. O sincronizador público preserva `avulsos.items.exclusivePhotos/videos`. Prova local: GET anônimo sintético retornou 200 e cache público de um dia/edge de sete dias. Condição: objetos pagos usam esse caminho e o deploy serve a function examinada. Resultado observado: mídia obtida sem entitlement; esperado: somente titular autorizado recebe URL/bytes. Causa: classificação de privacidade desconectada do fluxo comercial. Impacto: cópia e redistribuição irreversível do conteúdo, perda comercial e exposição privada. Prioridade imediata: conferir configuração do bucket/CDN e deploy; restringir entrega e invalidar caches após contenção. Alterações prováveis: uploader, serializer, handler de mídia, cache/CDN. Risco: quebrar capas/prévias públicas legítimas. Critérios: teste anônimo negado e comprador autorizado aceito em staging; remoção da URL do bundle público. Complexidade alta; depende de inventário e plano de cache.

### NUA-SEC-002 — Papel de contrato recebe capacidades administrativas

**P0 · confiança alta no gateway local · agendamento, mídia, dados.** `functions/api/_middleware.ts` permite que `contract_client` alcance operações de agendamento sync que gravam dados e obtém leitura de mídias privadas; prova sintética: leitura 200 e uma gravação de agendamento. O handler de mídia conflita com papel chamado contract_client tratado como comprador. Condição: token de contrato válido e endpoints publicados. Esperado: acesso limitado ao contrato atribuído. Recomendação: separar capability/token de contrato e entitlement de compra; negar por padrão. Rever chamadas de contrato e handlers. Complexidade alta; regressão possível para assinatura.

### NUA-SEC-003 — Logout não invalida token ainda válido

**P1 · confiança alta no desenho observado.** Token HMAC continua válido após logout; não há revogação server-side demonstrada. Limitação: duração do token reduz janela; cookies e estado do deploy não verificados. Usar sessão revogável/rotação e validar sessão no endpoint. Complexidade média.

### NUA-SEC-004 — Falso sucesso de sincronização sem persistência

**P1 · reproduzido sinteticamente.** `functions/api/content/sync.ts` devolve sucesso sem persistência configurada; mensagem diz sincronizado. Não se comprovou estado do ambiente de produção. Frontend pode perder alterações enquanto reporta sucesso. Retornar estado explícito somente após persistência confirmada; testar indisponibilidade e retentativa.

### NUA-SEC-005 — Endpoint de personalizados revela dados pessoais por ID

**P1 · reproduzido em handler com store sintético.** Resposta inclui publicToken, contato, briefing e anotações internas. Confirmar proteção adicional fora do handler; ID não é autorização suficiente. Restringir campos e exigir token de capacidade com escopo. Rever enumeração e rate limit.

### NUA-SEC-006 — Sessão do cofre não sobrevive a novo login

**P1 funcional/confidencialidade · prova local sintética.** Material de chave derivado do token de sessão torna dados cifrados ilegíveis após nova sessão. Nenhuma credencial real foi lida. Não operar esse módulo como cofre até validar estratégia de chave e recuperação. Considerar gerenciador especializado.

## Cobertura de autorização

`evidence/authorization.md` registra 95 combinações sintéticas de métodos e handlers, avaliadas para anônimo/client/contract_client/contract_dev/admin. “next” significa que o gateway encaminha; não significa que o handler autorizou. Pontos prioritários: webhooks são públicos por desenho, mas precisam de assinatura; endpoints de agendamento lookup/sync são públicos no gateway e a proteção interna precisa ser revisada; APIs de pedidos e personalizados dependem de validação em nível de objeto/campo.

## Outros controles

Scripts de teste incluem afirmações de segurança valiosas, mas alguns são mocks ou verificam expressões em isolamento; não provam controles em execução. Cookies, CORS, CSP, CSRF, limites distribuídos, erros, logs e bundles requerem verificação por endpoint e artefato exportado. A função de contrato aceita papel distinto e precisa ser auditada por operações individualmente. Dados de contato, briefing, contratos, pedidos, pagamentos, chaves, conteúdo restrito e telemetria são dados sensíveis identificados.

## Ação

Fase A: confirmar exposição nos três deploys e CDN; revisar proteção de URLs e callbacks; limitar entrega se o deploy corresponder ao caminho vulnerável; preservar logs e reconciliar pedidos sob procedimento autorizado. Depois, autorização por endpoint e escopo de campos, sessão revogável e revisão do cofre. Não houve teste contra produção.
