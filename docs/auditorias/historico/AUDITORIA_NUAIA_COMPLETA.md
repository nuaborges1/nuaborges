# Auditoria da NuaIA — funcionamento, conhecimento e ações no Admin

## Parecer

A NuaIA atual não é confiável para executar alterações administrativas nem para confirmar que uma operação foi concluída. O problema é estrutural: interface, servidores, conhecimento, ferramentas e persistência não usam um contrato único. Melhorar apenas o texto do prompt não resolve.

O relato de que ela não sabe orientar, não executa e edita campos errados é compatível com falhas concretas encontradas no código.

**Escopo:** código atual do chat, Spotlight, motor de contexto, servidores locais, endpoint Cloudflare, ferramentas, aprovação, histórico, privacidade e integração com o shell do Admin.

**Método:** leitura estática e três cenários executados em ambiente isolado com respostas simuladas do provedor. Sem alteração de conteúdo, chamada paga ao modelo, acesso a conversas pessoais ou deploy nesta auditoria.

**Limite:** não foi reproduzida uma conversa específica da cliente em sua sessão. Não foram verificadas a validade dos modelos na conta Gemini, cotas, segredos de produção ou logs autenticados. Assim, a auditoria identifica causas comprovadas no código, mas não atribui todo episódio relatado a uma causa específica.

## 1. Existem três implementações diferentes

```text
INTERFACE: chat da NuaIA
      |
      +-- localhost:3105 / tools/localApiServer.mjs
      |      Prompt próprio + histórico enviado pelo navegador
      |      Function calling + gravação em JSON local
      |      Atualização do painel por evento no navegador
      |
      +-- bridge local / lib/nuaAi/devServer.ts -> engine.ts
      |      Classificador + base científica + conhecimento + memória
      |      Histórico JSONL + chamada textual ao modelo
      |      Sem circuito de execução de ferramentas no engine
      |
      +-- Cloudflare / functions/api/nua-ai/chat.ts
             Apenas mensagem atual + prompt curto
             Sem memória real, recuperação de conhecimento ou ferramentas
             Falhas do provedor viram resposta genérica HTTP 200
```

O servidor geral é iniciado por `next.config.ts`. O comando `nua-ai:dev` inicia a bridge. Ambos usam a porta 3105. A URL do cliente pode ainda ser substituída por `nua_public_api_url` no localStorage ou por `NEXT_PUBLIC_API_URL`.

Consequência: testar uma implementação não valida as demais. A mesma interface pode apresentar capacidades diferentes conforme o processo que ocupou a porta ou a URL configurada.

Referências: `next.config.ts`, `tools/nuaAiDevBridge.mjs`, `lib/nuaAi/devServer.ts`, `lib/sessionToken.ts`, `functions/api/nua-ai/chat.ts`.

## 2. Achados prioritários

| ID | Gravidade | Constatação | Sintoma explicado |
|---|---|---|---|
| A01 | Alta | Três caminhos com comportamentos diferentes | Funciona em uma situação e falha em outra |
| A02 | Alta | Cloudflare não recebe contexto efetivo nem ferramentas | Não sabe sobre a tela e não executa |
| A03 | Alta | Campos de contato incorretos no prompt local | Diz que editou, mas o contato não muda |
| A04 | Alta | Aplicação livre de section/fields | Modifica alvo errado ou grava propriedades inúteis |
| A05 | Alta | Aprovação local declara execução sem executar | Botão de aprovação transmite sucesso falso |
| A06 | Alta | Envio de ticket não valida resposta HTTP | Diz que enviou sem entrega comprovada |
| A07 | Alta | Mapa administrativo desatualizado | Orienta para abas que não existem |
| A08 | Alta | Estados de rascunho fragmentados | Alteração some ou só aparece numa sessão |
| A09 | Média | Histórico Edge é fixo e não persiste chat | Não lembra e exibe conversas de exemplo |
| A10 | Alta | Falhas do modelo são ocultadas por fallback | Responde frases vazias sem revelar indisponibilidade |
| A11 | Média | Ferramentas declaradas sem implementação | Promete capacidades que não executa |
| A12 | Média | Recuperação sem ranking adequado | Consulta contexto pouco relacionado |
| A13 | Média | Busca não entrega texto inicial ao chat | Usuário precisa repetir a pergunta |
| A14 | Média | Disponibilidade visual contraditória | IA aparece no menu, mas chat não abre |
| A15 | Alta | Proteção de dados não cobre todos os caminhos | Relatos podem chegar crus ao provedor |

## 3. A01 — Caminhos divergentes e disputa de porta

O servidor em `tools/localApiServer.mjs:1679` processa chat diretamente. Ele não delega ao `processNuaAiChat` de `engine.ts`. Já a bridge usa justamente esse engine.

`lib/nuaAi/devServer.ts` trata `EADDRINUSE` como se o serviço já estivesse disponível, resolve a inicialização e não comprova qual implementação está na porta. Isso permite uma aparência de inicialização correta com outro servidor respondendo.

**Correção:** um endpoint e um serviço de orquestração compartilhado, com adaptadores de persistência por ambiente. Informar no status a versão, runtime, ferramentas habilitadas e saúde do modelo. Falhar claramente quando a porta está ocupada por outro serviço.

## 4. A02 — O endpoint de produção não conhece o Admin

Em `functions/api/nua-ai/chat.ts`, o corpo é reduzido a `message` e `conversationId`. A chamada ao modelo contém uma única mensagem do usuário e um prompt geral de sexologia/criação.

Não são enviados ao modelo:

- histórico de conversa;
- módulo ativo;
- nomes atuais dos módulos;
- valores atuais dos campos;
- conteúdo publicado e rascunho;
- biblioteca e identificação de mídia;
- declaração de ferramentas;
- base de conhecimento do site;
- regras específicas de edição por seção.

O prompt ainda declara que a IA não possui permissão para alterar o site. Portanto, esse caminho não tem meios de executar as ações administrativas prometidas pela interface local.

**Reprodução isolada:** fornecer `conversationHistory` e `uiContext`; interceptar o payload de saída; confirmar que nenhum deles chega ao modelo e que `tools` não existe.

**Correção:** fornecer contexto mínimo e atual, e conectar ferramentas reais ao mesmo orquestrador. Não anunciar execução onde há apenas geração de texto.

## 5. A03 — Campos de contato errados

O prompt local em `tools/localApiServer.mjs`, aproximadamente linhas 1847–1865, instrui:

| Prompt da IA | Campo que o formulário realmente usa |
|---|---|
| `contact.title` | `contact.modalTitle` |
| `contact.subtitle` | `contact.modalSubtitle` |
| `contact.email` | `contact.officialEmail` |

Evidências do formulário: `components/nua/admin/ContactEditor.tsx:105`, `:152`, `:169`. Tipos: `lib/types.ts:209`.

O executor faz spread dos campos sem verificar o esquema. Assim, `{email: 'novo endereço'}` pode ser gravado ao lado de `officialEmail`, sem atualizar o valor usado na tela.

Isso é uma causa concreta de edição aparente sem efeito. Também permite que o modelo escolha campos incompatíveis com o pedido.

**Correção:** gerar ferramentas a partir de um registro canônico de campos reais, com validação de chave, tipo e seção. Rejeitar propriedades desconhecidas, sem tentar adivinhar silenciosamente.

## 6. A04 — Alterações sem resolução segura de alvo

O executor local em `tools/localApiServer.mjs:2062` aceita `section` e `fields` do modelo, aplica `hero` como seção padrão e cria seções inexistentes. Não há ali uma allowlist de campos por seção ou verificação do estado anterior.

O hook `useAdminShell` também aceita `detail.section` e espalha `detail.fields` no estado editorial quando recebe `nua_draft_updated`.

Para `about`, o servidor tenta converter `description`, `bio` e `text1` em `paragraph1`. Essa conveniência é ambígua: “mude a descrição” não determina se o usuário queria a apresentação, o subtítulo ou um parágrafo.

Não há confirmação de “antes e depois” nesse caminho nem bloqueio por conflito com uma edição manual recente.

**Correção proposta:**

```text
Pedido -> identificar alvo -> ler valor atual -> preparar diferença
       -> confirmar se ambíguo -> validar esquema e versão
       -> salvar -> reler -> só então confirmar resultado
```

Ausência de alvo explícito deve gerar uma pergunta curta, nunca fallback automático para `hero`.

## 7. A05 — Aprovar não equivale a executar

Há duas implementações problemáticas:

1. `tools/localApiServer.mjs:2223`: o endpoint `/approve-action` exige apenas `proposalId` e `nonce` não vazios, registra uma linha de auditoria e retorna que a operação foi aplicada. Não verifica uma proposta armazenada, não compara nonce, não valida expiração e não executa publicação ou mudança de preço.
2. `lib/nuaAi/tools/sensitiveActions.ts`: mantém proposta em memória, valida nonce/expiração e marca como executada, mas não chama um serviço de publicação, preço ou pagamento. Retorna sucesso e mudanças como dados.

O componente `ProposalActionCard.tsx` considera `res.ok` suficiente, mostra “aplicada no site” e emite um evento sem `detail`. O shell ignora eventos sem `detail`.

**Resultado:** uma sequência inteira comunica sucesso sem comprovar mudança no dado real.

**Correção:** proposta persistida e vinculada à sessão, executor real por ação, controle de concorrência, idempotência e leitura de confirmação. A interface só deve declarar “publicado” se o serviço de publicação confirmar a versão.

## 8. A06 — Tickets podem ter sucesso falso ou envio duplicado

`components/nua/admin/ai/useNuaAiChat.ts` chama `/api/requests`, mas não testa `response.ok`. Erros de rede são capturados e o código segue para cache local, estado de enviado e mensagem de sucesso.

Além disso:

- uma confirmação curta pode enviar a proposta anterior sem aguardar a chamada;
- a resposta do modelo pode disparar outro envio por conter `✅` ou expressões de sucesso;
- não existe chave de idempotência compartilhada nesses caminhos;
- o engine afirma “encaminhado com sucesso” antes de executar uma criação real de ticket;
- o prompt obriga o modelo a confirmar envio, transferindo a verdade operacional para um texto gerado.

**Correção:** resposta do modelo prepara proposta; envio real ocorre uma única vez por ID; confirmar apenas após retorno com ID persistido. Manter solicitações técnicas no fluxo do desenvolvedor, conforme a decisão do projeto, sem inventar uma aba “Meus Pedidos” no Admin da cliente.

## 9. A07 — Conhecimento desatualizado e contraditório

`lib/nuaAi/promptBuilder.ts:56` afirma que existem “EXATAMENTE” oito abas e nenhuma outra. Lista “Início & Capa”, “Biblioteca”, “Meus Pedidos” e “Ajustes” como abas principais.

O Admin atual usa módulos como `Editar meu site`, `Redes e contato`, `Pedidos recebidos`, `Pedidos personalizados`, `Financeiro`, `Contratos` e `Ferramentas DEV`.

O prompt também cita `nuaborges.com` em um trecho, enquanto o domínio principal confirmado é `nuaborges.com.br`.

`knowledgeStore.ts`, `localResponses.ts`, prompt local, prompt do engine e fallback do modelo mantêm descrições separadas. O fallback textual chega a orientar para “Galeria”, “Sobre” e “Canais” como se fossem abas principais.

**Correção:** fonte única de conhecimento gerada dos metadados de navegação, subabas e esquema dos editores. Registrar versão e data. A ferramenta de orientação deve devolver o caminho completo, por exemplo:

```text
Editar meu site -> Galeria de fotos -> campo desejado
```

Não inserir automaticamente toda informação privada do site no prompt.

## 10. A08 — Rascunhos usam fontes diferentes

O fluxo local usa `data/draft_products.json` para packs, `data/content.json` para alterações de seções e um evento de navegador para refletir parte das mudanças no draft do shell.

O painel manual administra `SiteContent` e rascunho no localStorage. Produção possui sincronização e persistência operacional por serviços próprios. Não há garantia de que gravar no JSON local altere o mesmo dado posteriormente publicado ou lido em outro dispositivo.

O shell trata `create_pack_draft` e `update_admin_content_fields`, mas esse evento não constitui um registro transacional da operação. Eventos perdidos ou sem payload não confirmam sincronização.

`saveDraftProducts` captura erro de escrita sem propagá-lo; o chamador pode continuar retornando `success: true`.

**Correção:** usar os mesmos serviços de rascunho da edição manual. Retornar entidade, revisão e estado persistido; invalidar/recarregar o cache correspondente. Não considerar um evento de interface prova de persistência.

## 11. A09 — Histórico de produção é uma amostra fixa

`functions/api/nua-ai/conversations.ts` retorna duas conversas fixas. Não consulta histórico real.

O SDK pede `/api/nua-ai/conversations/:id`, mas essa rota não existe na pasta de Functions da NuaIA. O servidor geral local retorna uma lista vazia. Só a bridge possui armazenamento JSONL e rota de mensagens.

O endpoint Edge não grava mensagens e ignora o histórico enviado. O engine usa histórico em arquivo e não utiliza o `conversationHistory` enviado pelo cliente como fonte de turnos ativos.

**Correção:** armazenamento persistente por sessão/usuário/conversa, listagem e leitura reais. Remover exemplos da resposta operacional. Informar honestamente quando não há histórico.

## 12. A10 — Falhas escondidas atrás de respostas vazias

O endpoint Cloudflare inicia uma resposta genérica e a devolve com HTTP 200 se não houver chave, se o provedor responder erro ou se o retorno não contiver texto.

Não há timeout explícito na chamada Edge. A extração considera apenas a primeira parte do primeiro candidato. Estados de bloqueio, resposta vazia e formato inesperado não têm tratamento específico.

O cliente recebe a mesma forma de sucesso e a conversa segue sem uma explicação acionável. Mesmo nesse fallback, o endpoint declara `sourcesUsed.memory: true`, apesar de não carregar memória.

**Testado isoladamente:** ausência de chave e erro 404 simulado retornam HTTP 200. A resposta não tem ação executada.

**Correção:** estados distintos para indisponível, limite, erro de modelo, bloqueio e resposta válida. Telemetria deve dizer quais fontes realmente foram usadas. Confirmar os modelos disponíveis na conta antes de escolher fallback; a validade dos nomes atuais não foi verificada nesta auditoria.

## 13. A11 — Contrato de ferramentas não corresponde ao executor

`ADMIN_TOOL_DECLARATIONS` declara operações que o dispatcher não implementa, como `get_media_library` e `update_admin_content_fields`.

`permissions.ts` declara `allowedParams`, mas `checkActionPermission` só verifica ID/risco. Não valida parâmetros, sessão ou recurso.

`registry.ts` possui apenas quatro cases. `propose_sensitive_action` é declarado, mas não existe no mapa de permissões com esse nome; passa pela rejeição antes de chegar ao case.

O motor `engine.ts` chama um cliente de modelo textual sem registrar nem executar ferramentas. O servidor geral implementa outro conjunto inline, sem usar esse dispatcher.

A chamada local identifica apenas uma `functionCall` e retorna o resultado diretamente à interface; não existe ciclo geral de `functionResponse` para o modelo continuar consultando e concluindo uma tarefa de várias etapas.

**Correção:** registro único que gere declaração, validação, permissão e executor. Testar cada ferramenta desde a declaração até o serviço persistente. Não expor uma ferramenta sem implementação.

## 14. A12 — Busca de conhecimento com baixa precisão

`knowledgeStore.ts` combina buscas por palavras amplas. A presença de “onde”, “trocar”, “mudar” ou “alterar” pode selecionar numerosos mapeamentos. O resultado final é truncado em `slice(0, 5)` sem ranking de relevância.

Isso favorece a ordem do arquivo, não a pergunta. O dado correto pode ser excluído pelos cinco primeiros resultados. Os valores de confiança atribuídos são constantes, não uma medida calculada da qualidade da evidência.

**Correção:** ranking por seção/campo/intenção; priorizar correspondência exata e contexto da subaba. Incluir ID e versão da fonte na resposta interna. Sem evidência suficiente, consultar ou perguntar.

## 15. A13 — Spotlight perde a pergunta ao abrir o chat

`useSpotlightSearch.ts` envia `open_nua_ai` com `detail.initialPrompt`. `useNuaAiChat.ts:47` só abre a gaveta; não lê o detalhe nem preenche o texto.

A interface oferece “Perguntar à Nua IA”, mas perde a pergunta selecionada.

Também passa `subAction` na navegação, porém o router dos módulos não encaminha esse estado aos editores. Um atalho específico pode abrir apenas o módulo geral.

**Correção:** consumir o texto inicial sem envio automático e encaminhar a subação até o componente responsável.

## 16. A14 — Acesso à IA contraditório

O item do sidebar abre `BetaIaModule`, uma página informativa que diz explicitamente que nenhum chat foi ativado.

O chat real é montado em `app/admin/page.tsx:220` somente quando `isLocal` é verdadeiro. Seu próprio hook aplica outra verificação por `NUA_AI_CONFIG.isEnabled()`. Ativar a configuração de produção não remove o bloqueio externo do shell.

O Spotlight pode oferecer a IA em produção, mas emitir um evento sem listener montado. Isso explica cliques sem resultado nesse cenário.

**Correção:** manter o selo DEV solicitado pelo proprietário, mas alinhar botão, disponibilidade real, configuração e capacidade. Um único controle de habilitação deve orientar todos os pontos de entrada.

## 17. A15 — Privacidade, autenticação e auditoria

O sanitizador é chamado pelo engine, mas não pelo endpoint Edge nem pelo caminho de edição do servidor geral. Mensagem e histórico podem seguir crus para o provedor nesses caminhos.

A página Beta descreve ausência de compartilhamento com terceiros, mas o chat chama uma API externa. O texto precisa refletir o processamento real.

O SDK do chat não envia Bearer e não define `credentials: include`. Em mesma origem, cookies podem funcionar normalmente; com URL de API em outra origem, autenticação pode falhar. Não é correto afirmar que isso quebra todo login: depende da origem efetiva.

A aprovação do card tem a mesma dependência de cookies. Os logs locais usam atores fixos como `admin_session`, sem demonstrar identidade real da pessoa que executou a ação.

O rate limit Edge fica em um Map do processo: é uma proteção parcial e não uma quota global persistente. A autorização pelo middleware existe, mas não substitui validação de recurso e escopo das ferramentas.

**Correção:** política de minimização comum a todos os caminhos, separando texto de conversa de valores operacionais autorizados. Não mascarar cegamente um e-mail público que o usuário pediu para cadastrar: esse valor deve ir à ferramenta validada, enquanto relatos pessoais precisam de minimização. Auditoria com ator real, alvo, antes/depois e resultado verificado.

## 18. Outros problemas observados

- O classificador usa regex e confiança fixa, podendo confundir pedido de edição, pergunta e confirmação. “Sim” não identifica qual proposta foi aprovada.
- O hook procura propostas em mensagens anteriores e pode agir sobre proposta antiga sem vínculo explícito entre a confirmação e a proposta.
- URLs de anexos são transformadas em instrução para usar previews/capa, mesmo quando a intenção do usuário não era criar um pack.
- Os anexos chegam como URLs/contexto; o caminho lido não constitui análise visual multimodal do conteúdo. Não se deve afirmar que o modelo viu a foto.
- `get_media_library` declarado não garante consulta da biblioteca. A IA recebe anexos e contexto limitado, não uma fotografia atual de todo o acervo.
- A busca rápida responde a “vendas de ontem” somando pedidos disponíveis, sem filtro de data nesse cálculo. Pode transmitir certeza financeira indevida.
- Erros de HTTP e falhas de histórico são reduzidos a lista vazia ou mensagem genérica, ocultando diferença entre ausência de dados e falha de acesso.
- Propostas usam `Math.random` e memória de processo; não há durabilidade ou identidade de sessão na estrutura mostrada. Isso exige revisão antes de ações sensíveis reais.
- Retornos com `sourcesUsed` e ator constantes geram observabilidade enganosa: o log pode dizer sucesso/memória sem comprovação.

## 19. Testes executados

Artefato reproduzível: `scripts/audit-nua-ai-readonly.cjs`.

Comando:

```text
node scripts/audit-nua-ai-readonly.cjs
```

| Cenário | Resultado observado |
|---|---|
| Endpoint sem chave | HTTP 200, resposta genérica, memória declarada como usada |
| Mensagem com histórico e contexto da UI | Payload do modelo possui uma mensagem e nenhuma ferramenta; contexto anterior e módulo omitidos |
| Provedor retorna 404 simulado | HTTP 200 com fonte heurística |

Os testes executam o código do handler transpiliado em contexto isolado, com `fetch` simulado. Não passam pelo middleware de produção nem validam a experiência visual, sessões reais ou a qualidade das respostas do modelo.

As demais constatações são de leitura do código, não de execução de mutações. Aprovação, publicação e criação de tickets não foram acionadas para evitar efeito sobre dados reais.

## 20. Ordem recomendada de correção

### Primeiro: impedir resultados falsos

1. Corrigir o mapa de campos do contato.
2. Validar seção, campo, tipo e versão antes de aplicar qualquer alteração.
3. Remover confirmação de sucesso antes da persistência e releitura.
4. Fazer aprovação executar de fato ou informar que a ação ainda não está disponível.
5. Validar resposta de tickets e aplicar idempotência.

### Depois: unificar comportamento

1. Escolher um orquestrador comum para local e Cloudflare.
2. Usar adaptadores de banco/histórico, sem depender de arquivo local em produção.
3. Fazer declaração e execução de ferramentas nascerem do mesmo registro.
4. Montar contexto com dados atuais, versão e subaba ativa.
5. Alinhar todos os pontos de entrada ao mesmo controle de habilitação.

### Em seguida: atualizar conhecimento

1. Gerar mapa do Admin a partir de módulos e campos reais.
2. Separar conhecimento público, operacional e privado.
3. Resolver consultas com ranking e evidência rastreável.
4. Atualizar a terminologia conforme a reorganização do sidebar.
5. Remover referências a “Meus Pedidos” como área da cliente.

### Por fim: melhorar experiência e confiabilidade

1. Preservar perguntas vindas da busca.
2. Exibir antes/depois para edição ambígua.
3. Oferecer desfazer apoiado em revisão anterior.
4. Diferenciar rascunho aplicado, publicação concluída e proposta pendente.
5. Exibir indisponibilidade do modelo com recuperação clara.

Essas correções devem respeitar o design visual existente e manter IA/Player identificados como DEV.

## 21. Critérios de aceite para a NuaIA corrigida

| Pedido/teste | Comportamento obrigatório |
|---|---|
| “Onde mudo minha biografia?” | Caminho atual Editar meu site -> Sobre mim |
| “Troque só o e-mail de contato” | Alterar apenas `contact.officialEmail`, com confirmação do valor persistido |
| “Mude aquela frase” | Pedir qual frase quando o contexto não determinar o alvo |
| “Mude a frase do rodapé da capa” | Resolver `hero.exploreText`, sem confundir footer ou tagline |
| Pergunta após vários turnos | Usar contexto da mesma conversa, sem misturar sessões |
| Falha de chave/cota/modelo | Exibir indisponibilidade; não alegar tarefa concluída |
| Aprovar proposta inexistente | Rejeitar |
| Repetir aprovação | Não executar duas vezes |
| Editar um campo manualmente após proposta | Detectar conflito de revisão |
| Criar um pack | Salvar na mesma fonte usada pelo editor manual e retornar ID/revisão |
| Anexar uma foto para análise | Não criar produto nem publicá-la por inferência |
| Solicitação técnica | Encaminhar somente pelo fluxo autorizado do desenvolvedor, sem inventar aba no Admin da cliente |
| Reabrir chat | Carregar mensagens reais, sem amostras fixas |
| Abrir IA pela busca | Preservar a pergunta e respeitar disponibilidade |
| Qualquer edição | Não alterar design, preços, links ou campos não solicitados |

## 22. Conclusão técnica

As falhas relatadas têm explicação no código: a NuaIA de produção não usa o conhecimento e as ferramentas existentes; o caminho local que edita tem campos incompatíveis e validação insuficiente; aprovações e tickets podem anunciar sucesso sem prova; e o conhecimento do Admin está desatualizado.

O objetivo da correção deve ser uma assistente que consulte o estado real, identifique um alvo inequívoco, execute por serviços validados e confirme somente o resultado verificado. A qualidade da conversa depende dessa base antes de depender da escolha de modelo ou de um prompt mais extenso.
