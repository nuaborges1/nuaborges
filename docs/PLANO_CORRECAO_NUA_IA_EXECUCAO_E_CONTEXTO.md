# Nua IA — Diagnóstico e Plano de Correção: Execução de Ações, Banco de Dados e Contexto

**Documento 1 de 2** (análise e plano — nenhum código do projeto foi alterado na elaboração deste documento).
**Data da análise:** 25/10/2026, 00h05–00h25 (horário da máquina).
**Escopo:** chat da Nua IA no painel administrativo, caminho de execução de ações, persistência (Supabase), arquivos (Backblaze), contexto da conversa e consultas administrativas/financeiras.

---

## 0. Aviso antes de qualquer coisa: o projeto foi alterado durante esta análise

Enquanto eu lia os arquivos, quatro deles foram gravados por outra sessão/ferramenta (não fui eu — não escrevi nada no projeto):

| Arquivo | Última gravação | Tamanho antes → depois |
|---|---|---|
| `lib/nuaAi/assistantServices.mjs` | 25/10/2026 00:16:12 | 10.426 → 15.052 bytes |
| `lib/nuaAi/adminAssistant.mjs` | 25/10/2026 00:16:26 | 24.446 → 24.913 bytes |
| `components/nua/admin/ai/useNuaAiChat.ts` | 25/10/2026 00:17:02 | — |
| `tools/localApiServer.mjs` | 25/10/2026 00:17:17 | 2.335 → 2.342 linhas |

Também há um processo do Next gerando `.next/types` às 00:18 (dev server/build em execução).

**O que isso muda:** este documento descreve o estado do código **como estava em 25/10/2026 00:20**. Uma das alterações detectadas é relevante e está descrita em **F09**. Antes de eu começar a corrigir, é preciso confirmar se existe outra sessão de trabalho aberta neste mesmo projeto — dois agentes mexendo nos mesmos arquivos ao mesmo tempo invalidam qualquer plano.

---

## 1. Como a Nua IA funciona hoje (estado real)

### 1.1 Caminho da mensagem

```
Painel (app/admin/page.tsx:221 → NuaAiChatDrawer → useNuaAiChat)
  │  POST { message, conversationId, conversationHistory, uiContext{activeTab, attachedMediaUrls, content} }
  │  uiContext.content = compactForAi(getDraftContent())      ← lib/contentStore (localStorage)
  ▼
getPublicApiUrl()  (lib/sessionToken.ts:16)
  ├─ localhost → http://localhost:3105
  └─ produção  → mesma origem ("/")
  ▼
┌─────────────────────────────────┬──────────────────────────────────────────┐
│ LOCAL: tools/localApiServer.mjs │ PRODUÇÃO: functions/api/nua-ai/chat.ts   │
│ rota 1703 → assistantChat()     │ → assistantChat()                        │
└─────────────────────────────────┴──────────────────────────────────────────┘
  ▼
lib/nuaAi/adminAssistant.mjs → assistantChat()
  1. lê rascunho: services.read('nua_ai_admin_draft_v2')
  2. lê publicado: services.read('private_admin_content') || 'published_content'
  3. ESCOLHE a base: body.draftContent || body.uiContext.content || rascunho || publicado
  4. injeta systemState (financeiro, pedidos, personalizados, agendamentos, memória) no prompt
  5. monta knowledge() (textos do site, packs, mídia, navegação) e envia como JSON no system
  6. services.generate() → Gemini com 11 function declarations (TOOLS)
  7. se houver functionCall → applyEdit() → grava em 'nua_ai_admin_draft_v2' → relê para conferir
  8. devolve { reply, actionExecuted:{type:'replace_draft', data:{content}}, proposal? }
  ▼
useNuaAiChat (linha 428-436) → saveDraftContent(content) + evento 'nua_draft_updated'
  ▼
useAdminShell (linha 237-241) → setContent + saveDraftContent (localStorage `nua_draft_content_v1`)
  ▼
Humana clica em "Publicar no site" → POST /api/content/sync → Supabase
    site_content: private_admin_content + published_content (com _version+1)
```

### 1.2 Persistência real (quem é a dona de cada dado)

| Dado | Onde vive | Quem escreve | Quem lê |
|---|---|---|---|
| Rascunho do painel | `localStorage nua_draft_content_v1` | painel (`saveDraftContent`) | painel no mount |
| Conteúdo publicado | Supabase `site_content` (`private_admin_content` e `published_content`) | `POST /api/content/sync` | site público e painel |
| Rascunho da Nua IA | Supabase `site_content` chave **`nua_ai_admin_draft_v2`** | `assistantChat` | **ninguém além da própria IA** |
| Histórico de conversas | Supabase `site_content` chave `nua_ai_conversation:<id>` | `assistantChat` | `/api/nua-ai/conversations[/:id]` |
| Memória da marca | Supabase `site_content` chave `nua_ai_memory` | `assistantChat` | `getSystemOverview` |
| Financeiro (contrato) | Supabase `site_content` chave `nua_finance_installments_v2` | `/api/finance/admin` | painel, `getSystemOverview` |
| Pedidos comerciais | Supabase tabela `orders` | webhooks/pagamentos | painel, `getSystemOverview` |
| Personalizados | Supabase `personalizados_orders` | `/api/personalizados/*` | painel, `getSystemOverview` |
| Agendamentos VIP | Supabase `appointments` | `/api/appointments/*` | painel, `getSystemOverview` |
| Mídia (fotos/vídeos) | **Backblaze B2** bucket `nuaborges-media` (SDK S3) + índice em `content.library` | `/api/media/*` | `/media/...`, `content.library` |
| Arquivos auxiliares | `data/*.json` (local) e `data/draft_products.json` | servidor local | servidor local |

Conferido por leitura: nomes de tabelas/colunas usados pela IA (`orders.customer_name`, `personalizados_orders.total_price`, `appointments.client_name/date_time/call_link`, chaves `requests:index` e `request:<id>`) **coincidem** com os usados pelas Functions do projeto. Não houve erro de "inventar tabela".

### 1.3 Funcionalidades reais do painel (as 13, conforme `types/admin.ts`)

`conteudos` (Conteúdos & Packs) · `personalizados` · `chamadas` · `vitrine` (Editar meu site) · `conexoes` (Redes e contato) · `financeiro` · `contratos` · `cofre` · `configuracoes` · `alertas` · `beta_player` · `beta_ia` · `mensalidade`.

Operações disponíveis hoje no código: **ler** (conteúdo, packs, biblioteca, financeiro, pedidos, personalizados, agendamentos, solicitações), **criar** (packs, mídia em rascunho, solicitação/ticket), **editar** (campos de texto, preço, estado de pack, seções do site), **publicar** (`/api/content/sync`), **excluir arquivo** (proposto pela IA, sem executor — ver F10).

---

## 2. Causas das falhas (F01 – F16)

As linhas citadas referem-se à versão dos arquivos às 00:20 de 25/10/2026.

### F01 — A IA edita uma cópia da qual a biblioteca de mídia foi apagada *(gravidade: alta — perda de dado)*
- `components/nua/admin/ai/useNuaAiChat.ts:410` envia `compactForAi(getDraftContent())`.
- `lib/nuaAi/contentOps.mjs:11,25` — `HEAVY_KEYS = new Set(['library'])`: **a chave `library` é removida do payload**.
- `lib/nuaAi/adminAssistant.mjs:308` — `content.library = []` quando não vem.
- Consequências:
  - `knowledge()` informa ao modelo `media: []` e `backblazeStorage.totalFiles: 0` (`adminAssistant.mjs:271,276`) → **a IA acredita que não há nenhum arquivo no Backblaze**;
  - `mediaByUrls()` (`:42`) lança *"Selecione uma mídia existente na biblioteca"* para qualquer anexo → **criar/editar pack com imagem falha**;
  - a gravação devolve `edited.content` **sem `library`**, que é salvo no rascunho do painel (`useNuaAiChat.ts:431`, `useAdminShell.ts:240`) → **a biblioteca inteira é apagada do rascunho local a cada ação da IA**;
  - se a humana publicar em seguida, `library: []` vai para o Supabase.
- **Evidência (executada):** probe `nua_probe.mjs` (em `%TEMP%\opencode`), saída `1) compactForAi remove library? true` e `6) library no rascunho gravado: []`.

### F02 — Todo erro vira a mesma frase genérica *(gravidade: alta — é exatamente o sintoma relatado)*
- `functions/api/nua-ai/chat.ts:9` devolve HTTP **422** com `{error: "<mensagem técnica>"}`; o servidor local faz o mesmo (`localApiServer.mjs:1710-1713`).
- `lib/nuaAi/client.ts:34-36` faz `throw new Error("Falha na comunicação... status 422")` **sem ler o corpo**.
- `useNuaAiChat.ts:450-459` responde sempre: *"Tive um probleminha para responder agora. Tenta de novo em alguns segundos!"*.
- Resultado: `"Seção não autorizada."`, `"Campo não permitido"`, `"Informe os campos"`, falha do Gemini etc. **nunca chegam à usuária** — ela vê uma resposta genérica, exatamente como relatado.

### F03 — Quando o id não bate, a IA edita o **primeiro** pack, sem avisar *(alta — alvo errado)*
- `adminAssistant.mjs:136-139`: se `args.id` não existir, cai em `items[0]` (o **mais antigo**) e devolve *"Rascunho do pack X atualizado."*.
- A criação insere no **fim** da lista (`:119`), então "o último pack" é o último item — o fallback escolhe o oposto.
- **Evidência (executada):** `2) alvo escolhido pelo fallback: pack_OLD=Teste 1 | pack_NEW=Pack Novo` (o pack errado foi renomeado).

### F04 — Sucesso declarado sem nenhuma alteração *(alta — confirmação falsa)*
- `adminAssistant.mjs:141`: `const fields = args.fields || (args.title || ... ? args : {})`. Se o modelo chamar `edit_pack {id}` sem `fields`, o laço não executa e a função **ainda assim** retorna *"Rascunho do pack **X** atualizado."*.
- **Evidência (executada):** `4) sem fields -> "Rascunho do pack **Pack Novo** atualizado." | title ficou: Pack Novo`.

### F05 — Ferramenta errada para o pedido → erro que vira frase genérica *(alta)*
- `edit_text` só aceita as 12 seções de `FIELD_MAP` (`adminAssistant.mjs:7-19`); qualquer tentativa sobre "packs", "produtos", "acervo" cai em `:49` → *"Seção não autorizada."* → F02.
- **Evidência (executada):** `3) erro devolvido ao cliente: Seção não autorizada.`
- O prompt (`:356`) manda "use a ferramenta" mas **não diz qual ferramenta para cada tipo de pedido**; a escolha fica a cargo do modelo.

### F06 — O rascunho gravado pela IA não é o rascunho que o painel lê *(alta — a edição "some")*
- A IA grava em `nua_ai_admin_draft_v2` (`adminAssistant.mjs:4,392`). **Nenhum outro arquivo do projeto lê essa chave** (verificado por busca).
- O painel guarda em `localStorage nua_draft_content_v1` e, ao abrir, chama `mergePublishedIntoDraft` (`lib/contentStore.ts:77-97`), que **faz o conteúdo publicado do servidor prevalecer** quando `remoteVersion >= draftVersion` — e a IA não altera `_version`/`_updatedAt`. 
- Resultado: **recarregar a página apaga a edição da IA** (a menos que a humana publique no mesmo minuto).
- O prompt ainda afirma *"as edições ficam salvas em rascunho no Supabase"* (`:359`) — verdadeiro no sentido da chave, falso no sentido operacional (o painel não lê aquela chave).

### F07 — Dois servidores disputam a porta 3105, e "porta em uso" é tratado como sucesso *(alta — implementação trocada em silêncio)*
- `next.config.ts:8-17` sobe `tools/localApiServer.mjs` em 3105 no dev; `npm run nua-ai:dev` sobe `lib/nuaAi/devServer.ts` **na mesma porta**.
- Ambos tratam `EADDRINUSE` como sucesso: `localApiServer.mjs:2313-2315` ("Servidor já está rodando") e `devServer.ts:172-176`.
- Quem ganha a corrida muda o comportamento: `devServer` → `engine.ts` → **nenhuma ferramenta, nenhuma edição**; apenas texto e respostas locais prontas (`localResponses`/`knowledgeStore`). Ou seja: **é possível estar conversando com uma versão da IA que não executa nada nenhum**.
- `lib/nuaAi/engine.ts` (395 linhas) não tem circuito de function calling — confirmado por leitura integral.

### F08 — Erros do modelo são engolidos e viram a mensagem errada *(média-alta)*
- `assistantServices.mjs:379-382`: o `catch` de **qualquer** erro (inclusive os `throw` internos de validação, linha 370 e 376) faz `continue` para o próximo modelo. 
- O laço testa 6 modelos com timeout de 10s cada; se todos falharem → `"Nenhum modelo do Gemini respondeu com sucesso"` (`:384`), **mesmo quando a causa real era outra** (ex.: "várias ações simultâneas").
- Não há distinção entre: sem chave, cota, timeout, modelo inexistente, resposta sem texto, resposta com múltiplas chamadas.

### F09 — *Alteração detectada durante a análise:* fallback local com **financeiro fictício** e **gravação silenciosa** *(alta — viola os requisitos 5 e 8)*
Em `lib/nuaAi/assistantServices.mjs` (gravado às 00:16:12):
- Se faltar `SUPABASE_URL`/chave, ou se **qualquer** leitura/gravação no Supabase falhar, o código cai para `createLocalFileServices()` que lê/grava `data/*.json`.
- `write()` (`:166-183`): em erro do Supabase, grava no arquivo local e **retorna normalmente** → `assistantChat` relê (`:393`) e, como a leitura também cai para o arquivo local, o `revision` bate → **a IA confirma "Rascunho salvo no Supabase" quando o Supabase nunca recebeu nada**.
- `getSystemOverview()` local (`:87-94`) devolve **financeiro fixo**: `totalPaid: 'R$ 2.000,00'`, `paidCount: '10 de 10 parcelas'`, `'Todas as parcelas do contrato do site estão quitadas! 🌸'` — independente dos dados reais. É exatamente o tipo de "resposta previamente programada" que o briefing proíbe.

### F10 — Exclusão de arquivo: proposta criada, executor não existe *(média)*
- `adminAssistant.mjs:374-388` grava `nua_ai_proposal:<id>` e mostra o card.
- `ProposalActionCard.tsx:24` chama `POST /api/nua-ai/approve-action`:
  - **não existe** em `functions/api/` (só no servidor local);
  - no servidor local devolve **501** (`localApiServer.mjs:1759-1765`) e ainda tem código morto após o `return`.
- Obrigação de leitura: o botão nunca executa nada. (Hoje isso é "seguro", mas é uma promessa quebrada na interface.)

### F11 — Em produção a IA está desligada e o endpoint exige sessão *(média — depende de decisão)*
- `lib/nuaAi/config.ts:21` — `ENABLED_IN_PRODUCTION: false`; sem `NEXT_PUBLIC_NUA_AI_PROD=true` o drawer sequer renderiza (`NuaAiChatDrawer.tsx:75`).
- `functions/api/_middleware.ts:144` — `/api/nua-ai/chat` **não** está na lista pública → exige cookie/Bearer de sessão. O SDK (`client.ts:26-32`) não envia `Authorization` nem `credentials:'include'`; em mesma origem o cookie pode ir sozinho, mas com `nua_public_api_url`/`NEXT_PUBLIC_API_URL` apontando para outra origem, dá 401 (que vira a frase genérica de F02).

### F12 — Quando o modelo não chama ferramenta, a resposta é reescrita como recusa *(média)*
- `adminAssistant.mjs:402-404`: sem `functionCall`, qualquer resposta contendo "alterei/atualizei/criei/..." é trocada por *"Preparei uma sugestão, mas nenhuma alteração foi executada."*. 
- É correto como proteção contra alucinação, mas combinado com F05/F08 produz a percepção de "a IA não faz nada".

### F13 — "O último pack", "esse pack", "o que criamos" não são resolvidos *(alta — requisito 2)*
- Não existe ponteiro de entidade na conversa (nada como `lastPackId`).
- `knowledge().packs` (`adminAssistant.mjs:260-270`) devolve `id, title, description, price, active, imageUrl, ...` **sem data de criação nem posição** — o modelo precisa adivinhar a ordem.
- `edit_pack` exige `id` obrigatório → leva ao fallback de F03.
- O caminho `avulsos.items[último].title` **funciona** (`contentOps.mjs:57` aceita `last/ultimo/último` e `[-1]`) — confirmado no probe: `5) path [último]: ok` — mas **não está declarado nem orientado** no prompt.

### F14 — Contexto e privacidade *(média-alta — requisito 8)*
- Cada turno envia ao Gemini um `system` com **todo** o conteúdo textual do site + até 250 itens de mídia + financeiro + nomes de clientes (`adminAssistant.mjs:242-292,360`), além dos turnos (até 14) sem passar pelo `sanitizer` — o sanitizador só existe no caminho do `engine.ts`.
- `contextSummary` (`:336-343`) só é recalculado com ≥10 turnos, descarta os 6 últimos e trunca em 1.200 caracteres — resumo pobre e sem menção às ações executadas.

### F15 — Conhecimento do painel hardcoded e incompleto *(média)*
- `knowledge().navigation` (`adminAssistant.mjs:241-251`) lista 9 destinos; o painel tem **13 módulos** (`types/admin.ts:9-22`). Faltam `alertas`, `beta_player`, `beta_ia`, `mensalidade`; os rótulos não vêm de `MODULE_METADATA`.
- Risco de voltar a orientar para abas que não existem (é o problema já documentado em `AUDITORIA_NUAIA_COMPLETA.md`, A07).

### F16 — Histórico e contexto *(média — requisito 6)*
- Persistência de turnos existe e funciona nas duas rotas (`/api/nua-ai/conversations` e `/conversations/:id`).
- Porém: turnos só são gravados quando **nenhum erro** acontece (o `throw` em `applyEdit`/`generate` ocorre antes de `:406`) → **a falha não fica registrada**; não há campo com a ação executada, o alvo e o resultado; `body.conversationHistory` é ignorado quando há turnos gravados (ok) e vice-versa; a listagem usa `like.nua_ai_conversation%3A*` (padrão PostgREST `*`→`%`), o que **não foi verificado contra o banco real**.

---

## 3. O que será corrigido — plano em 6 fases

> Princípio reitor: **uma única implementação, uma única fonte de dado, escrita → releitura → só então confirmação.** Nenhuma confirmação antes da prova.

### Fase 0 — Congelamento e decisões (antes de tocar código)
1. Confirmar se há outra sessão editando o projeto (item 0). Dois escritores simultâneos anulam o plano.
2. Decidir a implementação única: manter `assistantChat` como orquestrador (já é o comum entre local e Functions) e **fazer `devServer.ts`/`engine.ts` delegarem para ele** ou remover a disputa de porta. `EADDRINUSE` deve **falhar**, não ser tratado como sucesso.
3. Decidir sobre produção (hoje desligada — F11).

### Fase 1 — Fonte de verdade e edição real (corrige F01, F03, F04, F05, F06)
1. **Base de edição nunca pode perder `library`.** Enviar o payload completo (com `library`) para o servidor usar como *base de escrita*, e usar a versão compactada **apenas** para o prompt. Alternativa equivalente: servidor ler `library` de `private_admin_content` e fazer *merge* antes de gravar.
2. **Gravar onde o painel lê.** Duas opções (a decidir na implementação):
   - **A (recomendada):** a IA devolve *patches* (`apply_content_ops`, já suportado por `useAdminShell.ts:242-251`) aplicados ao estado real do painel, e grava o mesmo patch num registro durável (`nua_ai_admin_draft_v2`) que o painel **passa a ler no mount** quando for mais novo que o rascunho local;
   - **B:** a IA grava direto no mesmo formato que `publishContent` espera, mantendo `_version`/`_updatedAt` coerentes.
   Em ambos os casos: **reler após gravar e comparar antes/depois**; se não bater, dizer que falhou.
3. **Resolução de alvo:** nova ferramenta/tipo de argumento `target` aceitando `{id}`, `{title}`, `{index}`, `"último"`, `{lastCreatedInConversation}`. **Proibido** o fallback silencioso para `items[0]` — alvo ambíguo/ausente → a IA pergunta.
4. **Zero sucesso sem mudança:** se a lista de campos a alterar for vazia, ou se o `before === after`, **lançar erro** em vez de resumo de sucesso (corrige F04).
5. **Mapear pedido → ferramenta no prompt** (tabela curta): pack → `edit_pack`/`edit_site_content`; texto de seção → `edit_text`; mídia → `attach_media`/`remove_media`; consulta → `get_*`. Remover a ambiguidade de F05.
6. Validação por ferramenta: chave, tipo, seção, pertencimento ao objeto real (já existe em `contentOps.mjs`; manter e estender).

### Fase 2 — Respostas honestas (corrige F02, F08, F12)
1. Contrato de resposta: **sempre HTTP 200** com `{ reply, ok, error?: {code, friendly}, actionExecuted? }`. A IA traduz o erro para linguagem amigável ("Não consegui localizar qual pack você quis dizer — é o *Pack Novo* ou o *Pack Antigo*?").
2. `client.ts` lê o corpo da resposta; `useNuaAiChat` mostra `error.friendly` (ou `reply`) e **nunca** a frase genérica quando houver mensagem real.
3. `generate()`: separar `continue` (modelo inexistente/404) de erros que **não** devem ser repetidos em outro modelo (429, múltiplas chamadas, resposta vazia); reportar `modelUsed`, status HTTP e causa.
4. Manter a trava de F02 (não deixar o modelo alucinar "alterei"), mas torná-la explícita e útil: dizer *o que* ficou pendente e *por quê*.

### Fase 3 — Ferramentas reais de consulta e ação (requisitos 1, 4, 5)
Criar um registro único (declaração + validação + permissão + executor + verificação) em `lib/nuaAi/tools/`, com:

| Ferramenta | Fonte real | Observação |
|---|---|---|
| `get_finance_summary` | Supabase `nua_finance_installments_v2` (mesmo cálculo de `calculateFinanceSummary`) | substituir valores fixos de F09; se a chave não existir → **dizer que não conseguiu consultar** |
| `get_orders` / `get_personalizados` / `get_appointments` | tabelas `orders`, `personalizados_orders`, `appointments` | filtros por data/status quando pedido |
| `get_admin_overview` | `MODULE_METADATA` (`types/admin.ts`) + contagens reais | orientação com caminho completo: `Conteúdos & Packs → …` |
| `get_content_section` / `find_pack` | `private_admin_content` / rascunho | permite "mostre o resumo do financeiro" e "encontre o último pack" |
| `list_media` | `content.library` (e opcionalmente `GET /api/media/list`) | corrige F01 no lado da leitura |
| `edit_content_ops`, `edit_pack`, `create_pack`, `attach_media`, `remove_media` | já existentes, corrigidos pela Fase 1 | |
| `publish_content` | `POST /api/content/sync` | **só com confirmação explícita** da usuária |
| `create_request` (ticket) | `POST /api/requests` com checagem de `resp.ok` | já feito no hook; manter idempotência |
| `approve_proposal` | implementar executor real (ex.: `deleteMedia` em `_mediaStore.ts` + remoção em `content.library`) ou **remover o card** | corrige F10 |

Regra: **nenhuma ferramenta declarada sem executor**. Onde a operação não existir no projeto, a IA diz que não existe e o que precisaria ser desenvolvido.

### Fase 4 — Contexto da conversa (requisito 6)
1. Manter a persistência atual (`nua_ai_conversation:<id>`) e **gravar também turnos de erro**, com `{role, content, at, action?, target?, result?}`.
2. Gravar por conversa um `lastContext: {entityType:'pack', entityId, entityTitle, lastAction, lastResult}` a cada ação bem-sucedida, e injetá-lo no prompt — assim "troque o nome **dele**" resolve sem a usuária repetir dados.
3. Recuperar o contexto ao reabrir a conversa (já existe `GET /conversations/:id`) e validar referências (`esse`, `aquele`, `o anterior`) contra `lastContext` + lista real; **se não houver correspondência segura, perguntar**.
4. Melhorar o resumo: incluir ações e resultados, não apenas texto cortado; manter separação estrita por `conversationId` (nunca misturar turnos de outra conversa).
5. Ao reabrir sessão posterior com histórico disponível, continuar do ponto certo (id gravado em `nua_ai_active_conv_id`, já existe).

### Fase 5 — Segurança e integridade (requisito 8)
1. Aplicar o sanitizador **em todos** os caminhos (hoje só no `engine.ts`).
2. Minimizar o que vai ao provedor: enviar só as seções/packs necessários para a tarefa do turno (ferramenta de consulta), em vez do dump completo com financeiro e nomes de clientes a cada mensagem.
3. Nada de service key no cliente (hoje está correto — só no servidor). Não expor `SUPABASE_*`/`B2_*` em resposta.
4. Ações destrutivas/exclusivas (excluir mídia, publicar, alterar preço de venda) exigem confirmação; idempotência e detecção de conflito por `revision`/`_version`.
5. Auditoria com ator real, alvo, antes/depois e resultado verificado (`/api/audit/event` já existe).
6. Retirar o fallback silencioso de F09 ou torná-lo **explícito e não-derivativo**: se o Supabase falhar, a resposta é "não consegui salvar", nunca sucesso; e **nunca** inventar financeiro.

### Fase 6 — Conhecimento e navegação
Gerar `navigation`/`fields` a partir de `MODULE_METADATA` + editores reais, com versão e data; separar público/operacional/privado.

---

## 4. Matriz "pedido → o que deve acontecer" (critérios de aceite)

| Pedido da usuária | Fluxo obrigatório | Confirmação só depois de |
|---|---|---|
| "Crie um pack." | `create_pack` → gravar → reler | pack existir na base com id novo |
| "Troque o nome do último pack para Teste 1." | resolver "último" (ou `lastContext`) → ler `title` atual → alterar **só** `title` → gravar → reler | `title === 'Teste 1'` lido do banco/rascunho persistido |
| "Altere o preço para 29,90." | mesmo alvo da rodada anterior (`lastContext`) → `numericPrice=29.9` e `price='R$ 29,90'` → gravar → reler | os dois campos conferidos |
| "Edite a descrição." | mesmos campos preservados; se "descrição" for ambígua (curta/detalhada), perguntar | `description` (ou `longDescription`) confere |
| "Encontre o último pack que criamos." | consulta + confirmação de identidade | devolve título/preço/id lidos |
| "Qual é o nome dele agora?" | `lastContext` ou releitura | valor real, não memória do modelo |
| "Resumo do financeiro." | `get_finance_summary` no Supabase | dados lidos; se falhar, dizer que não conseguiu |
| "Consulte o painel." | `get_admin_overview` (módulos reais) | dados lidos |
| Duas conversas distintas | histórico isolado por `conversationId` | nunca citar dado da outra |

---

## 5. Supabase e Backblaze — papéis e ajustes

**Supabase (dado):**
- Já é a fonte real de tudo (site, financeiro, pedidos, personalizados, agendamentos, conversas). Os nomes de tabelas/colunas usados pela IA conferem com as Functions do projeto (verificado por leitura).
- Ajustes: (a) escrever no lugar que o painel lê; (b) remover/limitar o fallback para `data/*.json` (F09) — ou, se mantido em dev, marcar a resposta como "salvo localmente, **não** no Supabase"; (c) conferir a gravação por releitura com comparação de antes/depois; (d) usar os mesmos formatos/versões de `content/sync`.
- **Não criar tabelas novas por suposição.** A única adição candidata (e só se necessário) é uma coluna/chave de "rascunho da IA" já existente (`site_content.key`), sem DDL.

**Backblaze (arquivo):**
- Bucket `nuaborges-media` via SDK S3 (`functions/api/_mediaStore.ts`); rotas `/api/media/{presign,upload,list,delete}` e servimento em `/media/...`.
- A IA **não** deve falar direto com o B2: ela trabalha com `content.library` (índice: `id, name, url, isVideo, objectKey`) e com as rotas existentes.
- Primeiro passo obrigatório: parar de apagar/ignorar `library` (F01). Depois: `list_media`, `attach_media`, `remove_media` (referência) e exclusão definitiva apenas pelo fluxo com confirmação.
- **Não** gravar dados financeiros no Backblaze — hoje não há nada disso lá, e não deve haver.

---

## 6. Contexto da conversa ativa — como ficará

- **Persistência:** Supabase `site_content` chave `nua_ai_conversation:<id>` (já existe e funciona nas duas rotas).
- **Por turno:** mensagem da usuária + resposta da IA + **registro da ação** (`tool`, alvo resolvido, antes/depois, status) + falhas.
- **Por conversa:** `lastContext` (entidade atual e última ação) + resumo acumulado com ações.
- **Recuperação:** ao reabrir, a IA lê o histórico e o `lastContext`; "dele/dela" resolve por referência segura, com pergunta amigável quando houver dúvida.
- **Isolamento:** nada de turnos entre conversas; nunca usar referência a registro não identificado com segurança.
- **Limite honesto:** se o histórico não estiver disponível (falha de leitura), a IA diz que não lembra daquele trecho, em vez de inventar.

---

## 7. Testes obrigatórios (requisito 9) — roteiro

> **Status: NENHUM destes testes foi executado ainda.** Este documento é a análise; os testes rodam depois das correções, com dados de teste e uma conversa de teste dedicada (`conv_teste_<data>`), sem tocar em conteúdo de produção.

| # | Cenário | Como verificar | Resultado atual (pré-correção) |
|---|---|---|---|
| 1 | Criar pack e renomear na mensagem seguinte | conferir `title` no rascunho persistido e no painel após recarregar | **não executado**; F06 indica perda no reload |
| 2 | Alterar preço de pack existente | ler `numericPrice`/`price` após a ação | **não executado** |
| 3 | Mais de um campo em turnos consecutivos | conferir campo a campo que os demais não mudaram | **não executado** |
| 4 | Identificar "o último" com vários registros | criar 3 packs de teste, renomear o último | **F03 provado em probe**: o fallback edita o *primeiro* |
| 5 | Manter referência ao mesmo pack por 4 turnos | "dele", "agora", "outro campo" | **não executado** (F13) |
| 6 | Consultar financeiro real | comparar com `/api/finance/admin` | **não executado**; risco F09 (valor fixo) |
| 7 | Consultar painel real | comparar com `MODULE_METADATA` e módulos | **não executado** (F15) |
| 8 | Persistência no Supabase | reler a chave após a ação e comparar JSON | **não executado**; F06/F09 indicam falha |
| 9 | Fluxo Backblaze (mídia) | anexar mídia existente a um pack; verificar `library` preservada | **F01 provado em probe**: `library` é apagada |
| 10 | Registro inexistente / ambiguidade / permissão / rede | pedir edição de pack inexistente; cortar Supabase | **parcial**: F02/F03/F04 provados |
| 11 | IA não afirma execução que falhou | forçar falha de gravação | **falha atual**: F09 confirma sucesso falso |
| 12 | Contexto não contamina outra conversa | duas conversas de teste paralelas | **não executado** |

Probe já executado nesta análise (somente leitura, sem tocar no projeto): `nua_probe.mjs` em `%TEMP%\opencode` — saída reproduzida em F01, F03, F04, F05.

---

## 8. O que ainda depende de configuração, acesso ou decisão

1. **Outra sessão/executor ativo no projeto** (item 0) — precisa ser resolvido antes de qualquer alteração.
2. **Produção ligada ou não** (`ENABLED_IN_PRODUCTION` / `NEXT_PUBLIC_NUA_AI_PROD`) — decisão de produto.
3. **Variáveis de ambiente em produção** (Cloudflare Pages): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `B2_*`. Os arquivos locais `.dev.vars` e `.env.local` existem e trazem esses nomes; **os valores não foram lidos** e o ambiente de produção não foi verificado.
4. **Chave do Gemini e modelos válidos**: as chamadas ao provedor não foram disparadas nesta análise. A lista de modelos hoje no código (`gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-flash-lite-latest`, `gemini-2.5-flash`, `gemini-3.5-flash`, `gemini-3.1-flash-lite` + `GEMINI_MODEL`) precisa ser confirmada contra a conta real.
5. **Dados reais no Supabase** (tabelas vazias? chave `nua_finance_installments_v2` presente? RLS?): não fiz nenhuma consulta ao banco do cliente — **posso fazer leituras somente-leitura se você autorizar**.
6. **Escopo da publicação pela IA**: hoje a IA não publica (só rascunho). Confirmar se "publique" deve ser permitido com confirmação explícita.
7. **Exclusão de mídia**: implementar aprovação com executor real ou remover o card da interface.

---

## 9. Limites desta análise

- Leitura estática do código + 1 probe local de funções puras (`compactForAi`, `applyEdit`, `applyContentOps`).
- **Não** houve: chamada ao Gemini, consulta ao Supabase do cliente, acesso ao Backblaze, execução do painel no navegador, deploy ou alteração de arquivo do projeto.
- As linhas citadas valem para a versão de 25/10/2026 00:20 (o projeto estava sendo modificado durante a leitura — item 0).
- A auditoria anterior `AUDITORIA_NUAIA_COMPLETA.md` foi lida e conferida contra o código: vários itens dela já foram corrigidos (o servidor local já delega para `assistantChat`; o ticket já checa `resp.ok`; existe rota de conversas nas Functions), mas **os itens F01–F16 deste documento permanecem válidos hoje**.

---

## 10. Próximo passo

Com sua confirmação sobre o item 0 (sessão concorrente) e sobre as decisões 2, 6 e 7 da seção 8, sigo para o **Documento 2**: execução das Fases 1–5, seguida da bateria de testes da seção 7, com entrega de evidência real (leituras antes/depois no Supabase) para cada item.
