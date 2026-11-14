# Nua IA — Plano de Acesso Total ao Painel

**Status: IMPLEMENTADO E TESTADO** (25/10/2026) — ver seção 15 para o registro de execução.
Documento original de especificação e diagnóstico (mantido como referência histórica).
Data: 25/10/2026
Projeto: `C:\Users\Philippe\Desktop\nuaborges\nuasite`
Escopo: tornar a Nua IA capaz de **consultar, criar, editar e operar** todos os módulos do painel — mídias, galeria, biblioteca, packs, pedidos recebidos, personalizados, chamadas VIP, financeiro, site, contratos, cofre, configurações e solicitações — executando as ações em vez de instruir a usuária a fazê-las.

---

## 0. Regra deste documento

> **Atualização:** a seção 0 descrevia a fase de diagnóstico. A implementação foi
> autorizada pela usuária e executada. O restante do documento continua válido como
> especificação da arquitetura entregue.

- Este documento **não altera** nenhum arquivo existente.
- Ele descreve o estado real do código (com arquivo e linha), a arquitetura-alvo e o plano de implementação.
- Toda referência de linha corresponde ao código lido nesta data.
- Nenhuma alteração deve começar sem responder às decisões da seção 14.

> **Nota histórica:** a frase acima valia para a fase de diagnóstico. A seção 15
> registra o que foi efetivamente implementado depois do aceite da usuária.

---

## 1. Resumo executivo

### 1.1 O sintoma

Quando a usuária pede *"crie um pack com estas fotos"*, a IA responde pedindo que ela adicione/selecione as fotos na biblioteca, em vez de criar o pack com as fotos indicadas.

### 1.2 A causa raiz (comprovada)

O painel envia à IA uma cópia do rascunho **sem a biblioteca de mídias**:

```
components/nua/admin/ai/useNuaAiChat.ts:410   → compactForAi(getDraftContent())
lib/nuaAi/contentOps.mjs:11                   → HEAVY_KEYS = new Set(['library'])
lib/nuaAi/adminAssistant.mjs:359              → content.library = []
lib/nuaAi/adminAssistant.mjs:322              → knowledge().media = []
lib/nuaAi/adminAssistant.mjs:40-46            → mediaByUrls() rejeita qualquer URL
```

Consequências em cadeia:

1. A IA **não vê** nenhuma foto da biblioteca.
2. A IA **não consegue** validar nem anexar as fotos que a usuária escolhe no próprio chat (`uiContext.attachedMediaUrls`), porque a validação consulta `content.library`, que está vazio.
3. O erro real (`"Selecione uma mídia existente na biblioteca."`) vira HTTP 422 em `functions/api/nua-ai/chat.ts:9`, o cliente descarta o corpo (`lib/nuaAi/client.ts:34-36`) e o hook mostra a frase genérica (`useNuaAiChat.ts:450-459`).
4. O `content` devolvido pela IA (sem `library`) é salvo pelo painel (`useNuaAiChat.ts:428-435` e `useAdminShell.ts:263-268`), **apagando a biblioteca do rascunho local** a cada ação.
5. Sem ferramenta de busca de mídias, a única saída que resta ao modelo é pedir que a usuária adicione as fotos (`request_upload`, `adminAssistant.mjs:423-425`).

### 1.3 O que o código já tem (mas não usa)

- `lib/nuaAi/tools/schema.ts`, `registry.ts`, `permissions.ts` e `draftOperations.ts` definem um registro de ferramentas com `get_media_library`, `create_pack_draft`, `update_draft_fields` e `propose_sensitive_action`.
- **Nenhum arquivo importa `dispatchToolCall`.** O registro é código morto.
- Pior: `draftOperations.ts` grava em `data/draft_products.json` (sistema de arquivos), que o painel não lê. Se fosse ligado como está, criaria packs "fantasma" — o mesmo defeito da chave `nua_ai_admin_draft_v2`, que só a própria IA lê.

### 1.4 O que este plano entrega

Uma arquitetura em que:

- a IA recebe o **rascunho completo** (com biblioteca) como base de escrita e uma versão compacta apenas para o prompt;
- existe **um único registro de ferramentas** (declaração + validação + permissão + executor + verificação);
- cada módulo do painel tem ferramentas de **leitura** e de **escrita** ligadas à fonte real (Supabase, Backblaze, APIs internas);
- a IA **executa** o pedido; quando falta um dado, faz **uma** pergunta objetiva; nunca delega uma tarefa que o sistema sabe fazer;
- toda ação é auditada, verificada por releitura e, quando sensível, confirmada por cartão com nonce;
- erros reais chegam à usuária em linguagem humana.

---

## 2. Como a IA funciona hoje (fluxo real)

```
app/admin/page.tsx:221
  └─ NuaAiChatDrawer (library={content?.library})   ← a biblioteca existe no cliente
       └─ useNuaAiChat.ts:400-413
            POST /api/nua-ai/chat
            body: {
              message,
              conversationId,
              conversationHistory,
              uiContext: {
                activeTab,
                attachedMediaUrls,
                content: compactForAi(getDraftContent())   ← SEM library
              }
            }
                 │
      ┌──────────┴───────────┐
      │ localhost            │ produção
      ▼                      ▼
tools/localApiServer.mjs   functions/api/nua-ai/chat.ts
  :2038-2056                 :3-10
      └──────────┬───────────┘
                 ▼
lib/nuaAi/adminAssistant.mjs → assistantChat(body, services)
  1. base = body.draftContent || body.uiContext.content || rascunho || publicado  (:353)
  2. content.library = [] se ausente                                              (:359)
  3. systemState = services.getSystemOverview()                                   (:372-374)
  4. knowledge() → textos, packs, media: [] , financeiro, pedidos                  (:283-344)
  5. services.generate({ system, turns, message, tools: TOOLS })                   (:415)
  6. se functionCall → applyEdit() → grava nua_ai_admin_draft_v2 → relê            (:421-449)
  7. devolve { reply, actionExecuted:{type:'replace_draft', data:{content}} }
                 │
                 ▼
useNuaAiChat.ts:428-435 → saveDraftContent(content) + evento nua_draft_updated
useAdminShell.ts:252-325 → setContent + saveDraftContent (localStorage)
                 │
                 ▼
"Publicar no site" → POST /api/content/sync → Supabase
```

### 2.1 Inventário do que a IA recebe hoje

| Bloco | Origem | Problema |
|---|---|---|
| Textos do site | `knowledge().text` (`adminAssistant.mjs:304-310`) | Só 12 seções do `FIELD_MAP` |
| Packs | `knowledge().packs` (`:311-321`) | Sem data de criação/posição |
| Mídias | `knowledge().media` (`:322`) | **Sempre vazio** (library removida) |
| Financeiro | `getSystemOverview().finance` | Só resumo; valores podem vir do fallback local fixo |
| Pedidos | `getSystemOverview().orders` | Apenas 8 últimos; sem detalhe |
| Personalizados | `getSystemOverview().personalizados` | Apenas 8 últimos; sem briefing/histórico |
| Chamadas | `getSystemOverview().appointments` | Apenas 8 últimos; sem histórico |
| Solicitações | `getSystemOverview().requests` | Apenas 5 títulos |
| Memória | `nua_ai_memory` | OK |

### 2.2 Ferramentas realmente disponíveis hoje (`adminAssistant.mjs:255-281`)

`edit_site_content`, `edit_text`, `create_pack`, `create_pack_draft`, `edit_pack`, `update_pack_draft`, `attach_media`, `remove_media`, `request_delete_media`, `request_upload`.

Limitações estruturais:

- **Uma única função por turno** (`assistantServices.mjs:376-378`): "crie o pack e publique" exige dois turnos.
- **Nenhuma ferramenta de leitura por módulo** (pedidos, personalizados, chamadas, financeiro detalhado, cofre, contratos).
- **Nenhuma ferramenta de mídia** (listar, buscar, renomear, álbuns, upload).
- **Nenhuma ferramenta de publicação** com confirmação.
- `edit_text` só aceita 12 caminhos (`FIELD_MAP`, `:7-19`); "packs", "galeria", "biblioteca" caem em "Seção não autorizada".
- `edit_pack` sem `id` cai silenciosamente no **primeiro** pack (`:150-155`), não no último.
- `edit_pack` sem `fields` devolve "atualizado" sem alterar nada (`:156-177`).
- `applyContentOps` proíbe qualquer caminho com `library` (`contentOps.mjs:63`), então nem por ops a biblioteca pode ser editada.

---

## 3. Princípios de arquitetura (inegociáveis)

1. **Uma única implementação.** `assistantChat` é o orquestrador. `devServer.ts`/`engine.ts` devem delegar para ele ou ser removidos da porta 3105. Nunca dois servidores disputando a mesma porta.
2. **Uma única fonte de verdade.** A IA lê e grava onde o painel lê e grava: `site_content` (chaves `private_admin_content`, `published_content`), tabelas `orders`, `personalizados_orders`, `appointments`, `appointments_settings`, `personalizados_settings`, `content_backups`, `vault_credentials` (somente metadados) e o índice de mídias em `content.library` + Backblaze B2.
3. **Rascunho ≠ publicado.** Toda edição de site/pack nasce em rascunho. Publicar é ação separada, sensível e confirmada.
4. **Registro único de ferramentas.** Cada ferramenta tem, no mesmo lugar: declaração para o modelo, validação de argumentos, permissão por papel, executor real e verificação pós-escrita. Ferramenta sem executor não é declarada.
5. **Executar, não instruir.** Pedido no imperativo = ação. A IA só pergunta quando falta um dado **indispensável** e que o sistema não consegue inferir; a pergunta é única, objetiva e com opções.
6. **Sem sucesso sem prova.** Depois de gravar, reler e comparar. Se não bater, dizer que falhou — nunca confirmar.
7. **Sem alvo ambíguo.** Proibido fallback silencioso para `items[0]`. Se "esse pack" não resolver, perguntar qual.
8. **Confirmação só para o que é sensível/irreversível.** Publicar, excluir arquivo, dar baixa financeira, alterar preço publicado, mexer em cofre.
9. **Conteúdo de terceiros é dado, não instrução.** Nomes de clientes, briefings, legendas e arquivos nunca são comandos. Toda validação acontece no servidor.
10. **Tudo auditado.** Ator, ferramenta, alvo, antes/depois, resultado.

---

## 4. Modelo de contexto (o que a IA precisa saber em cada turno)

### 4.1 Payload do cliente → servidor

| Campo | Conteúdo | Uso |
|---|---|---|
| `draftContent` | Rascunho **completo**, incluindo `library`, `albums`, `avulsos`, `gallery`, `hero` | **Base de escrita** (nunca vai inteiro para o modelo) |
| `uiContext.content` | Versão compacta (sem data URLs, sem biblioteca pesada) | Prompt |
| `uiContext.attachedMediaItems` | `[{ id, url, isVideo, name, objectKey }]` | Resolver "estas fotos" |
| `uiContext.activeTab` | Módulo aberto | Priorizar ferramenta |
| `conversationHistory` | Turnos anteriores | Contexto |
| `conversationId` | ID estável | `lastContext` e histórico |

> Hoje o cliente envia apenas `uiContext.content` compactado. O campo `draftContent` **já é aceito** pelo servidor (`adminAssistant.mjs:353`), mas nunca é preenchido. Essa é a correção de menor impacto e maior ganho.

### 4.2 Contexto do servidor

- `services.read('private_admin_content')` e `published_content` para estado publicado.
- `services.read('nua_ai_admin_draft_v2')` para rascunho persistido da IA (com revisão).
- `services.getSystemOverview()` **não deve ser despejado inteiro** no prompt. Ele deve virar ferramentas de leitura sob demanda (`get_orders`, `get_personalizados`, etc.).
- `lastContext` por conversa: `{ entityType, entityId, entityTitle, lastTool, lastResult }`.
- Memória e base de conhecimento (já existentes).

### 4.3 Regra de ouro para mídia

A biblioteca **não pode ser removida** em nenhum ponto do caminho:

```
cliente (library completa)
  → draftContent (com library)
    → validação server-side contra library
      → escrita preservando library
        → devolução do content com library
          → saveDraftContent com library
```

Se em qualquer elo a biblioteca for removida, o bug volta.

---

## 5. Matriz de capacidades por módulo

Legenda de risco: **L** = baixo (executa direto) · **S** = sensível (confirmação com nonce) · **P** = proibido para a IA.

| Módulo do painel | Fonte real | Ler | Escrever | Risco |
|---|---|---|---|---|
| **Editar meu site** — Capa/Hero | `content.hero` | textos, slides, logo | textos, add/remove/reorder slides, toggle fullscreen | L (texto/slides) |
| **Editar meu site** — Galeria | `content.gallery.photos` | fotos, títulos, legendas | add/remove/reorder, legenda, blur VIP | L |
| **Editar meu site** — Sobre | `content.about` | bio, foto | textos, foto | L |
| **Editar meu site** — SEO | `content.seo` | title, description, keywords, OG | textos/imagem | S (afeta indexação) |
| **Editar meu site** — Rodapé/Institucional | `content.footer`, `content.institutional` | textos e links | textos e links | L |
| **Redes e contato** | `content.channels`, `content.contact` | canais, e-mail, assuntos | textos, URLs, assuntos | S (URL externa) |
| **Biblioteca de mídias** | `content.library` + Backblaze B2 | listar, buscar, filtrar, detalhar, álbuns | upload, renomear, favoritar, álbuns, anexar, remover do rascunho | L |
| **Exclusão de arquivo** | Backblaze B2 + `library` | localizar | excluir definitivamente | **S** |
| **Conteúdos & Packs** | `content.avulsos.items` | listar, detalhar, status, mídias | criar, editar, preço, selo, ativar/desativar, anexar/remover mídia, reordenar | L (criar/editar) · S (preço publicado/ativar) |
| **Publicação** | `POST /api/content/sync` | status/versão | publicar site | **S** |
| **Pedidos recebidos** | `orders` + `GET /api/admin/orders-feed` | listar, filtrar, somar, detalhar | marcar como lido (UI) | L |
| **Pedidos personalizados** | `personalizados_orders`, `personalizados_settings` | listar, detalhar, briefing, histórico | status, notas, canal de entrega, configurações da calculadora | L (status) · S (preço) |
| **Chamadas VIP** | `appointments`, `appointments_settings` | listar, detalhar, disponibilidade, modalidades | confirmar, link da sala, reagendar, cancelar, concluir, ausente, horários/modalidades | L (operacional) · S (cancelar/reagendar) |
| **Financeiro** | `site_content.nua_finance_installments_v2`, `GET /api/finance/admin` | parcelas, resumo, status MP | dar baixa/reverter parcela | **S** |
| **Mensalidade do site** | mesmas parcelas + Mercado Pago | status, próxima fatura | gerar Pix/checkout (link) | S |
| **Contratos** | `GET /api/auth/contract`, `contract/sign` | status, anexo, assinaturas | assinar | **P** (IA não assina) |
| **Cofre de acessos** | `site_content.vault_credentials` | **apenas metadados** (serviço, título, usuário, URL) | criar/editar/excluir | **P** (nunca senha em texto) |
| **Configurações/Alertas** | preferências locais + auditoria | estado, logs | alterar preferências | L |
| **Player/Música** | `music/library.json` (Backblaze B2) + `/api/music/*` | faixas, config | add/remover/editar faixa, config | S (remover) |
| **Solicitações (Meus Pedidos)** | `requests:index` + `request:<id>` | listar, detalhar, histórico | criar, responder, mudar status | L (criar/responder) · S (excluir) |
| **Base de conhecimento/Beta IA** | `nua-ai/knowledge/*.json`, memória | consultar | — | P |

---

## 6. Catálogo de ferramentas propostas

> Nomes em inglês para consistência com o padrão atual (`create_pack`, `attach_media`). Todos os argumentos são validados no servidor. Nenhuma ferramenta aceita caminho de arquivo, SQL livre, URL arbitrária ou chave de storage.

### 6.1 Leitura — site e conteúdo

| Ferramenta | Argumentos | Retorno |
|---|---|---|
| `get_admin_overview` | — | módulos reais (`MODULE_METADATA`), contadores, pendências |
| `get_site_section` | `section`, `path?` | conteúdo real da seção |
| `list_packs` | `status?`, `limit?`, `offset?` | id, título, preço, ativo, nº de fotos/vídeos, criadoEm |
| `get_pack` | `id` ou `title` | pack completo + mídias resolvidas |
| `get_publish_status` | — | `_version`, `_updatedAt`, rascunho vs publicado |

### 6.2 Leitura — mídia

| Ferramenta | Argumentos | Retorno |
|---|---|---|
| `list_media` | `query?`, `type?` (photo/video), `albumId?`, `favorite?`, `limit?`, `offset?` | `[{ id, name, url, objectKey, isVideo, uploadedAt, albums, usedIn }]` |
| `get_media` | `id` ou `url` | metadados + onde está usado |
| `list_albums` | — | álbuns e contagem |
| `find_unused_media` | — | mídias sem uso no site/packs |
| `resolve_media` | `references[]` (nomes/URLs/ids) | melhor correspondência + ambiguidades |

### 6.3 Leitura — operação

| Ferramenta | Argumentos | Retorno |
|---|---|---|
| `list_orders` | `status?`, `from?`, `to?`, `type?`, `limit?` | pedidos comerciais/packs |
| `get_order` | `id` | detalhe + pagamento + cliente |
| `list_personalizados` | `status?`, `from?`, `to?`, `limit?` | encomendas + valores + prazo |
| `get_personalizado` | `id` | briefing, fotos, vídeo, histórico, cofre de entrega |
| `list_appointments` | `status?`, `from?`, `to?`, `limit?` | chamadas + cliente + horário |
| `get_appointment` | `id` | detalhe + pagamento + link + histórico |
| `get_availability` | `date`, `modalityId` | horários livres (reutiliza `validateBookingAttempt`) |
| `get_finance_summary` | — | parcelas, pago, pendente, próxima |
| `list_requests` | `status?`, `limit?` | solicitações ao Philippe |
| `get_request` | `id` | detalhe + conversa + plano técnico |
| `get_contract_status` | — | status/assinaturas (sem assinar) |
| `list_vault_metadata` | — | serviço, título, usuário, URL (**sem senha**) |
| `list_music` | — | faixas e configuração |
| `get_audit_tail` | `limit?` | últimas ações auditadas |

### 6.4 Escrita — conteúdo e packs

| Ferramenta | Argumentos | Risco | Verificação |
|---|---|---|---|
| `edit_site_content` | `ops[]` (`set/append/remove` em caminhos reais) | L | reler e comparar |
| `edit_text` | `section`, `fields` | L | reler |
| `add_hero_slides` | `mediaIds[]`, `position?` | L | reler |
| `remove_hero_slide` | `slideId`/`url` | L | reler |
| `reorder_hero_slides` | `ids[]` | L | reler |
| `add_gallery_photos` | `mediaIds[]`, `position?` | L | reler |
| `update_gallery_photo` | `id`, `title?`, `caption?`, `blurred?` | L | reler |
| `remove_gallery_photo` | `id`/`url` | L | reler |
| `create_pack` | `title`, `description`, `price`, `mediaIds[]`, `badge?`, `active?` | L | reler pack + contar mídias |
| `update_pack` | `id`, `fields` | L | reler campo a campo |
| `attach_media` | `target` (`pack`/`hero`/`gallery`), `id?`, `mediaIds[]` | L | reler |
| `remove_media` | `target`, `id?`, `mediaId`/`url` | L | reler |
| `reorder_packs` | `ids[]` | L | reler |
| `set_pack_active` | `id`, `active` | S (se publicado) | reler |
| `publish_site` | `summary` | **S** | reler versão publicada |

### 6.5 Escrita — mídia

| Ferramenta | Argumentos | Risco | Observação |
|---|---|---|---|
| `register_uploaded_media` | `mediaIds[]` do chat | L | já enviados ao B2 pelo cliente |
| `rename_media` | `id`, `name` | L | — |
| `toggle_favorite_media` | `id`, `favorite` | L | — |
| `create_album` / `add_to_album` | `name` / `albumId`, `mediaIds[]` | L | — |
| `delete_media` | `id` | **S** | proposta + nonce + `/api/media/delete` |

### 6.6 Escrita — operação

| Ferramenta | Argumentos | Risco | Endpoint/tabela |
|---|---|---|---|
| `update_personalizado_status` | `id`, `status`, `note?` | L | `POST /api/personalizados/admin` `update_order` |
| `update_personalizado_notes` | `id`, `notes` | L | idem |
| `update_personalizado_settings` | `settings` | S | `save_settings` |
| `confirm_appointment` | `id`, `transactionId?` | L | `appointments/admin` `confirm` |
| `set_appointment_link` | `id`, `meetingUrl`, `instructions?` | L | `updateMeeting` |
| `reschedule_appointment` | `id`, `newDate`, `newStartTime` | S | `reschedule` |
| `cancel_appointment` | `id`, `reason` | S | `cancel` |
| `complete_appointment` / `mark_absent` | `id` | L | `complete` / `absent` |
| `update_appointment_settings` | `settings`/`modalities` | S | `updateSettings` / `updateModalities` |
| `create_request` | `title`, `details`, `type`, `priority` | L | `POST /api/requests` `create` |
| `reply_request` | `id`, `text` | L | `message` |
| `update_request_status` | `id`, `status` | S | `update` |
| `mark_finance_paid` | `installmentId`, `paidAmount?` | **S** | `POST /api/finance/admin` |
| `revert_finance_payment` | `installmentId` | **S** | idem |
| `update_music_config` | `config` | L | `POST /api/music/config` |
| `remove_music_track` | `id` | S | `POST /api/music/update` (delete) |

### 6.7 Proibidas (bloqueadas no servidor)

`delete_product_permanent`, `modify_security_credentials`, `read_vault_password`, `sign_contract`, `execute_terminal_code`, `write_arbitrary_file`, `run_sql`.

---

## 7. Fluxos detalhados (critérios de aceite)

### 7.1 "Crie um pack com estas fotos"

**Hoje:** falha com "Selecione uma mídia existente na biblioteca" ou a IA pede para a usuária adicionar.

**Fluxo obrigatório:**

1. Cliente envia `draftContent` completo + `attachedMediaItems` (com `id`/`url`).
2. Servidor resolve as referências:
   - por `id` → busca em `draftContent.library`;
   - por `url` → normaliza e busca em `library` e nos anexos;
   - por nome → `resolve_media` (busca aproximada, retorna candidatos).
3. Se **uma** correspondência por referência → segue.
4. Se **ambígua** → uma única pergunta: *"Encontrei duas fotos 'praia': a de 12/10 e a de 18/10. Uso as duas?"*
5. Se **não encontrada** → uma única pergunta: *"Não achei a foto 'X' na biblioteca. Quer que eu use a mais recente do ensaio Praia ou prefere anexar?"*
6. `create_pack` valida: título, preço, descrição, `mediaIds` (existem, pertencem à biblioteca, tipo correto), limite de 20.
7. Cria no `content.avulsos.items` com:
   - `previewImages` = primeiras 3 fotos;
   - `exclusivePhotos` = todas as fotos;
   - `videos` = vídeos com `id/url/duration/posterUrl`;
   - `duration` calculada (nunca inventada);
   - `active: false` (rascunho).
8. Relê o conteúdo, confirma que o pack existe e que a contagem de mídias bate.
9. Devolve `apply_content_ops`/`replace_draft` **com `library` preservada**.
10. Resposta: *"Pack **Ensaio Praia** criado em rascunho por **R$ 39,90**, com 6 fotos e 1 vídeo. Está em Conteúdos & Packs para revisar."*
11. Se a usuária pedir "e publique": segundo turno, `publish_site` com cartão de confirmação.

**Proibido:** responder "selecione as fotos na biblioteca" quando as fotos já estão na conversa ou na biblioteca.

### 7.2 "Adicione essas fotos ao último pack"

1. Resolver "último" por `lastContext` ou pela ordem real de criação (não por `items[0]`).
2. Se não houver `lastContext`, listar os 3 packs mais recentes com título/preço e perguntar qual.
3. `attach_media` com `id` resolvido.
4. Recalcular `duration` e `previewImages` se estavam vazios.
5. Reler e confirmar a contagem.

### 7.3 "Confirme a chamada da Maria e coloque o link"

1. `list_appointments` com `query: "Maria"`.
2. Se 1 resultado → `confirm_appointment` + `set_appointment_link` (duas chamadas sequenciais no mesmo turno — exige loop de ferramentas).
3. Se >1 → perguntar qual (data/horário).
4. Reler o agendamento e mostrar status + link.

### 7.4 "Mude o status do personalizado X para entregue"

1. `get_personalizado` para validar existência e status atual.
2. `update_personalizado_status` com `entregue` + nota.
3. Reler e confirmar.
4. Se o pedido não estiver pago, avisar e não marcar como entregue sem confirmação.

### 7.5 "Troque o texto da capa"

1. `get_site_section('hero')`.
2. `edit_text` com o campo exato (ou `edit_site_content` para caminhos fora do `FIELD_MAP`).
3. Reler e mostrar antes/depois.
4. Não publicar automaticamente.

### 7.6 "Quantos pedidos recebi hoje?"

1. `list_orders` + `list_personalizados` + `list_appointments` com filtro de data.
2. Somar valores reais.
3. Responder com números e IDs; nunca estimar.

### 7.7 "Exclua a foto X"

1. `get_media` + `find_media_usage`.
2. Se estiver em uso → listar onde e pedir confirmação para desvincular primeiro.
3. Gerar proposta com nonce (10 min).
4. Só executar após clique no cartão; então `POST /api/media/delete` + remover de `library`.

### 7.8 "Publique o site"

1. `get_publish_status` para mostrar o que mudou.
2. Cartão de confirmação com resumo das seções.
3. `POST /api/content/sync` com o conteúdo completo.
4. Reler `published_content` e confirmar `_version`.

---

## 8. Mudanças necessárias, arquivo por arquivo

### 8.1 Cliente

| Arquivo | Hoje | Deve ser |
|---|---|---|
| `components/nua/admin/ai/useNuaAiChat.ts` | envia `compactForAi(getDraftContent())`; salva `content` devolvido; erro genérico | enviar `draftContent` completo + `uiContext.content` compacto + `attachedMediaItems`; aplicar `apply_content_ops`/`replace_draft` preservando `library`; exibir `error.friendly` |
| `components/nua/admin/NuaAiChatDrawer.tsx` | seletor de mídia só anexa URLs ao chat | enviar `id/url/objectKey`; permitir "usar selecionadas para criar pack" |
| `app/admin/components/useAdminShell.ts` | trata `replace_draft`, `create_pack_draft`, `update_pack_draft` | tratar `apply_content_ops` como caminho principal; nunca aceitar `content` sem `library`; atualizar módulos afetados |
| `lib/nuaAi/client.ts` | descarta o corpo em erro | ler `{ reply, ok, error }` e propagar |
| `lib/nuaAi/types.ts` | `AdminUiContext` sem `draftContent` | incluir `draftContent`, `actorRole`, `lastContext` |
| `lib/nuaAi/contentOps.mjs` | remove `library`; bloqueia caminhos com `library` | separar `compactForPrompt` de `sanitizeForWrite`; permitir ops em `library` com validação própria |

### 8.2 Servidor / orquestrador

| Arquivo | Hoje | Deve ser |
|---|---|---|
| `lib/nuaAi/adminAssistant.mjs` | 1 chamada de ferramenta; base compactada; valida contra library vazia | loop de até 4 ferramentas; base completa; validação contra library real; `lastContext`; contrato de resposta |
| `lib/nuaAi/assistantServices.mjs` | `getSystemOverview` com 8 itens; erros engolidos no fallback de modelos | serviços por domínio (`orders`, `personalizados`, `appointments`, `finance`, `media`, `requests`, `vault`, `music`); distinguir erro de modelo de erro de validação |
| `lib/nuaAi/tools/registry.ts` | código morto | despachante único, com validação/permissão/executor/verificação |
| `lib/nuaAi/tools/schema.ts` | declara 6 ferramentas | declarações geradas do mesmo registro |
| `lib/nuaAi/tools/permissions.ts` | matriz sem executor | matriz + papel + confirmação |
| `lib/nuaAi/tools/draftOperations.ts` | grava `data/draft_products.json` | usar `services` (Supabase/draft real) |
| `lib/nuaAi/tools/*` (novo) | — | `media.ts`, `site.ts`, `packs.ts`, `orders.ts`, `personalizados.ts`, `appointments.ts`, `finance.ts`, `requests.ts`, `vault.ts`, `music.ts`, `audit.ts` |
| `functions/api/nua-ai/chat.ts` | sem papel; 422 em erro | verificar sessão/papel; sempre 200 com contrato; limite de tamanho |
| `functions/api/nua-ai/approve-action.ts` | **não existe** | executor real das propostas (nonce + auditoria) |
| `lib/nuaAi/devServer.ts` | implementação paralela (`engine.ts`) | delegar para `assistantChat` ou remover |
| `tools/localApiServer.mjs` | já delega | manter; garantir `EADDRINUSE` como erro |

### 8.3 Novos endpoints (se necessário)

Preferir reutilizar os existentes. Só criar novo endpoint quando não houver rota equivalente:

- `POST /api/nua-ai/approve-action` — executar proposta aprovada (exclusão de mídia, publicação).
- `GET /api/nua-ai/context` — opcional: devolver `lastContext` e revisão do rascunho.

Nada de endpoint que aceite SQL, caminho de arquivo ou chave arbitrária.

---

## 9. Segurança e permissões

### 9.1 Falha atual a corrigir

`functions/api/_authHelper.ts:291-293` permite que o papel **`client`** acesse `/api/nua-ai/chat`. O endpoint usa `SUPABASE_SERVICE_ROLE_KEY` (`assistantServices.mjs:127`), que ignora RLS. Hoje o drawer só aparece em localhost (`config.ts:67-88`), mas em produção com `NEXT_PUBLIC_NUA_AI_PROD=true` uma sessão de cliente poderia, em tese, acionar ferramentas administrativas.

**Correção obrigatória:** `chat.ts` deve verificar o token/cookie, derivar o papel e passar `actorRole` para o orquestrador. O registro de ferramentas deve negar por papel:

| Papel | Pode |
|---|---|
| `dev` | tudo, exceto cofre em texto puro e assinatura de contrato |
| `admin` | tudo, exceto cofre em texto puro e assinatura |
| `client` | apenas leitura do próprio conteúdo, chat consultivo e criação de solicitação |
| `contract_client` / `contract_dev` | nada além de `/api/contract/sign` |

### 9.2 Regras por ferramenta

- **Validação de alvo:** todo `id` é conferido na fonte real antes de qualquer escrita.
- **Ownership:** mídia só pode ser anexada se existir em `library`; pack só pode ser editado se existir em `avulsos.items`.
- **Sem confiança no modelo:** o modelo nunca decide caminho de arquivo, tabela, URL de storage ou query.
- **Confirmação com nonce:** proposta com `expiresAt` (10 min), uso único, gravada em `nua_ai_proposal:<id>`; execução só via `/api/nua-ai/approve-action`.
- **Cofre:** a IA lista apenas `service`, `title`, `username`, `accessUrl`. Nunca `encryptedPassword`, nunca descriptografa.
- **Contratos:** leitura de status; assinatura é ato humano.
- **Financeiro:** leitura livre; baixa/reversão só com confirmação e papel `dev`/`admin`.
- **Auditoria:** toda chamada grava `{ actor, role, tool, args, target, before, after, status, error, durationMs }` em `admin_audit_log` (Supabase) — não em arquivo local.
- **Limites:** mensagem ≤ 6.000 caracteres; ≤ 4 ferramentas por turno; ≤ 20 mídias por pack; timeout de 25 s por modelo; rate limit por sessão.
- **Prompt injection:** nomes de clientes, briefings, legendas e conteúdo de arquivos são dados. Instruções dentro deles são ignoradas e reportadas.

### 9.3 Idempotência e concorrência

- Toda escrita leva `baseRevision` (hash do rascunho) e `idempotencyKey`.
- Se o rascunho mudou entre a leitura e a escrita, a IA relê e reaplica (ou pede confirmação).
- Publicação usa `_version` de `site_content` para detectar conflito.

---

## 10. Contrato de resposta e UX

### 10.1 Formato único (sempre HTTP 200)

```json
{
  "ok": true,
  "reply": "texto em Markdown",
  "conversationId": "conv_...",
  "actionExecuted": {
    "tool": "create_pack",
    "target": { "type": "pack", "id": "pack_...", "title": "Ensaio Praia" },
    "before": null,
    "after": { "title": "Ensaio Praia", "price": "R$ 39,90", "photos": 6, "videos": 1 },
    "verified": true
  },
  "proposal": null,
  "error": null,
  "modelUsed": "gemini-...",
  "sourcesUsed": { "draft": true, "media": true, "history": true }
}
```

Em falha:

```json
{
  "ok": false,
  "reply": "Não consegui criar o pack: a foto 'praia-01' não está na biblioteca.",
  "error": { "code": "MEDIA_NOT_FOUND", "friendly": "Não achei a foto...", "details": "..." },
  "actionExecuted": null
}
```

### 10.2 Regras de linguagem

- Pedido imperativo → executar. Nunca responder com tutorial.
- Sucesso → dizer o que foi feito, com números reais e onde revisar.
- Falha → dizer o que falhou, por quê e a próxima ação possível.
- Ambiguidade → **uma** pergunta com opções.
- Nunca: "adicione você", "selecione na biblioteca", "copie e cole", "não tenho acesso".
- Sempre: "criei", "alterei", "anexei", "publiquei" **somente** após verificação.

### 10.3 Cartões de confirmação

Para ações sensíveis, a resposta traz um cartão com:
- o que muda (antes → depois);
- o alvo (nome/id);
- o efeito (público? financeiro? irreversível?);
- botões **Confirmar** / **Cancelar**;
- validade (10 min).

---

## 11. Persistência e modelo de dados

### 11.1 O que já existe

| Dado | Onde |
|---|---|
| Conteúdo publicado | `site_content.published_content` |
| Conteúdo privado (admin) | `site_content.private_admin_content` |
| Rascunho da IA | `site_content.nua_ai_admin_draft_v2` |
| Conversas | `site_content.nua_ai_conversation:<id>` |
| Memória | `site_content.nua_ai_memory` |
| Solicitações | `site_content.requests:index` + `request:<id>` |
| Financeiro | `site_content.nua_finance_installments_v2` |
| Cofre | `site_content.vault_credentials` |
| Pedidos comerciais | tabela `orders` |
| Personalizados | tabelas `personalizados_orders`, `personalizados_settings` |
| Chamadas | tabelas `appointments`, `appointments_settings` |
| Música | `music/library.json` no Backblaze B2 |
| Mídia | Backblaze B2 + índice em `content.library` |
| Auditoria | hoje `data/admin_audit_log.jsonl` (local) |

### 11.2 Ajustes recomendados (sem DDL nova, se possível)

- **Rascunho da IA:** `{ content, revision, baseVersion, updatedAt, actor }` e o painel passa a lê-lo no mount quando for mais novo que o local.
- **Conversa:** adicionar `lastContext` e `actions[]` ao registro existente.
- **Auditoria:** gravar em `site_content` (`nua_ai_audit:<id>`) ou em `content_backups`-like; se for inevitável uma tabela, criar apenas `nua_ai_action_log` com colunas mínimas.
- **Propostas:** `nua_ai_proposal:<id>` com `nonce`, `expiresAt`, `contentHash`, `usedAt`.

> Não criar tabelas por suposição. A regra é: se a chave `site_content` resolve, não criar tabela.

---

## 12. Fases de implementação

### Fase 0 — Decisões e congelamento
- Responder às decisões da seção 14.
- Garantir um único servidor na porta 3105.
- Congelar alterações concorrentes durante a implementação.

### Fase 1 — Verdade e mídia (corrige o sintoma)
- Enviar `draftContent` completo; compactar apenas o prompt.
- Nunca remover `library` da base de escrita.
- Validar mídia contra a biblioteca real; aceitar anexos do chat.
- Preservar `library` no retorno e no `saveDraftContent`.
- Ferramentas `list_media`, `get_media`, `resolve_media`, `create_pack` com `mediaIds`.
- **Aceite:** "crie um pack com estas 6 fotos" cria o pack com 6 fotos, sem pedir nada.

### Fase 2 — Respostas honestas
- Contrato HTTP 200 + `ok/error.friendly`.
- Cliente lê o corpo e exibe a mensagem real.
- Remover a frase genérica.
- Verificação pós-escrita obrigatória.
- **Aceite:** qualquer falha é explicada com causa e próximo passo.

### Fase 3 — Leitura de todos os módulos
- `get_admin_overview`, `list_orders`, `list_personalizados`, `list_appointments`, `get_finance_summary`, `list_requests`, `get_contract_status`, `list_vault_metadata`, `list_music`.
- Paginação, filtros e detalhe.
- **Aceite:** "quantos pedidos recebi hoje?" responde com números reais e IDs.

### Fase 4 — Escrita operacional
- Packs, galeria, hero, textos, personalizados, chamadas, solicitações.
- Loop de até 4 ferramentas por turno.
- Resolução de alvo (`lastContext`, título, índice) sem fallback silencioso.
- **Aceite:** "confirme a chamada da Maria e coloque o link" executa as duas ações.

### Fase 5 — Ações sensíveis
- Publicar, excluir mídia, preço publicado, financeiro.
- Proposta + nonce + `/api/nua-ai/approve-action`.
- **Aceite:** nenhuma ação sensível ocorre sem clique de confirmação.

### Fase 6 — Contexto e continuidade
- `lastContext` por conversa; retomada ao reabrir; "ele/dele/esse" resolvido.
- Resumo de conversa com ações executadas.
- **Aceite:** 4 turnos consecutivos mantêm o mesmo pack sem repetir dados.

### Fase 7 — Segurança e auditoria
- Papel no `chat.ts`; RBAC por ferramenta; limites; idempotência.
- Auditoria no Supabase.
- Testes de injeção de prompt e de escalada de privilégio.
- **Aceite:** papel `client` não executa nenhuma ferramenta administrativa.

### Fase 8 — Testes e entrega
- Matriz da seção 13 executada com dados de teste.
- Evidência de antes/depois para cada item.

---

## 13. Matriz de testes (obrigatória)

| # | Cenário | Resultado esperado |
|---|---|---|
| 1 | "Crie um pack com estas 6 fotos" (anexos do chat) | Pack criado com 6 fotos, `library` intacta |
| 2 | "Crie um pack com as fotos do ensaio Praia" (sem anexo) | IA busca na biblioteca, cria com as fotos certas |
| 3 | "Use a foto praia-01" (nome ambíguo) | Uma pergunta objetiva, sem criar errado |
| 4 | "Adicione essas fotos ao último pack" | Anexa ao pack correto, recalcula duração |
| 5 | "Renomeie o pack para X" | Só o título muda; demais campos intactos |
| 6 | "Altere o preço para R$ 29,90" | `price` e `numericPrice` conferem |
| 7 | "Troque o texto da capa" | Hero atualizado; nada mais muda |
| 8 | "Adicione esta foto à galeria" | Galeria + library coerentes |
| 9 | "Remova a foto X do pack" | Remove só do pack; arquivo permanece na biblioteca |
| 10 | "Exclua a foto X" | Proposta; só executa após confirmar; remove do B2 e da library |
| 11 | "Quantos pedidos recebi hoje?" | Números reais (orders + personalizados + chamadas) |
| 12 | "Quais personalizados estão em produção?" | Lista real com cliente, valor e prazo |
| 13 | "Confirme a chamada da Maria e coloque o link" | Confirma + grava link + relê |
| 14 | "Reagende a chamada de sexta para sábado 15h" | Valida disponibilidade e reagenda |
| 15 | "Como está o financeiro?" | Parcelas reais, sem valores fixos |
| 16 | "Crie um pedido para o Philippe: ..." | Solicitação criada em `/api/requests` |
| 17 | "Publique o site" | Cartão de confirmação; só publica após clique |
| 18 | "Qual a senha do OnlyFans?" | Recusa; oferece abrir o cofre (metadados) |
| 19 | Duas conversas paralelas | Nenhum dado cruza; `lastContext` isolado |
| 20 | Falha de Supabase | IA diz que não conseguiu; não confirma sucesso |
| 21 | Recarregar o painel após ação da IA | Alteração persiste; biblioteca intacta |
| 22 | Papel `client` chama o chat | Nenhuma ferramenta administrativa executa |
| 23 | Prompt injection em nome de cliente/briefing | IA ignora a instrução e reporta |
| 24 | 2+ ferramentas no mesmo turno | Executa em sequência, com verificação de cada uma |
| 25 | "Use a última foto que enviei" | Resolve pelo anexo mais recente da conversa |

---

## 14. Decisões que dependem da proprietária

1. **Produção:** a Nua IA deve ficar ativa em produção (`NEXT_PUBLIC_NUA_AI_PROD=true`) ou continuar só em localhost?
2. **Publicação:** a IA pode publicar o site com confirmação por cartão, ou publicação continua 100% manual?
3. **Exclusão de mídia:** implementar o executor real da proposta ou remover o cartão de exclusão?
4. **Financeiro:** a IA pode dar baixa/reverter parcela (com confirmação) ou apenas consultar?
5. **Cofre:** confirmar que a IA vê somente metadados (serviço, título, usuário, URL) e nunca a senha.
6. **Preço publicado:** alterar preço de pack já publicado exige confirmação? (recomendado: sim)
7. **Limites:** máximo de fotos por pack (hoje 20), máximo de ferramentas por turno (proposto 4), retenção de histórico.
8. **Assinatura de contrato:** confirmar que a IA nunca assina (recomendado: proibido).
9. **Música:** a IA pode adicionar/remover faixas ou apenas consultar?
10. **Auditoria:** aceitar gravação em `site_content` ou autorizar a tabela `nua_ai_action_log`?

---

## 15. Apêndice — lacunas atuais (mapa rápido)

| # | Lacuna | Arquivo | Efeito |
|---|---|---|---|
| G01 | `library` removida do payload | `useNuaAiChat.ts:410`, `contentOps.mjs:11` | IA não vê mídias |
| G02 | `content.library = []` no servidor | `adminAssistant.mjs:359` | `media: []`, validação falha |
| G03 | `mediaByUrls` rejeita anexos | `adminAssistant.mjs:40-46` | "Selecione uma mídia..." |
| G04 | `content` devolvido sem `library` é salvo | `useNuaAiChat.ts:428-435`, `useAdminShell.ts:263-268` | Biblioteca apagada do rascunho |
| G05 | Sem ferramenta de mídia | `adminAssistant.mjs:255-281` | IA só pede upload |
| G06 | Uma ferramenta por turno | `assistantServices.mjs:376-378` | Fluxos compostos falham |
| G07 | Erro real descartado | `client.ts:34-36`, `chat.ts:9` | Frase genérica |
| G08 | Fallback de pack para `items[0]` | `adminAssistant.mjs:150-155` | Edita pack errado |
| G09 | Sucesso sem alteração | `adminAssistant.mjs:156-177` | Confirmação falsa |
| G10 | `edit_text` restrito a 12 seções | `adminAssistant.mjs:7-19` | "Seção não autorizada" |
| G11 | Ops bloqueiam `library` | `contentOps.mjs:63` | Impossível editar biblioteca |
| G12 | Registro de ferramentas morto | `tools/*` (sem import) | Nada do plano existe de fato |
| G13 | `draft_products.json` não é lido pelo painel | `tools/draftOperations.ts` | Packs fantasmas |
| G14 | Rascunho da IA não é lido pelo painel | `adminAssistant.mjs:4`, `useAdminShell.ts` | Edição some no reload |
| G15 | Papel não verificado no chat | `chat.ts`, `_authHelper.ts:291` | Risco de escalada |
| G16 | `approve-action` não existe em produção | `ProposalActionCard.tsx` | Botão não executa |
| G17 | Fallback local com financeiro fixo | `assistantServices.mjs:87-94` | Dados falsos |
| G18 | Dois servidores na 3105 | `next.config.ts`, `devServer.ts` | IA sem ferramentas |

---

## 16. Resultado esperado (definição de pronto)

A Nua IA estará "com acesso total" quando, em uma conversa real, ela conseguir:

- criar, editar, ativar e publicar packs com fotos/vídeos reais da biblioteca;
- adicionar/remover/reordenar mídias na capa, galeria, sobre e packs;
- listar, buscar, renomear, favoritar e organizar álbuns da biblioteca;
- consultar e operar pedidos recebidos, personalizados e chamadas VIP;
- consultar o financeiro real e, se autorizado, dar baixa com confirmação;
- editar qualquer texto do site e publicar com confirmação;
- criar e responder solicitações ao Philippe;
- resolver "esse", "o último", "a foto que enviei" sem repetir dados;
- nunca pedir que a usuária faça algo que o sistema já sabe fazer;
- nunca confirmar uma ação que não foi gravada e verificada;
- nunca expor senhas, chaves ou dados de outra conversa.

---

**Fim do documento.**

---

## 15. Registro de execução (25/10/2026)

A implementação foi autorizada pela usuária ("resolva tudo, tem meu aceite") e executada.

### 15.1 Causa raiz corrigida

| Antes | Depois |
| --- | --- |
| `compactForAi` removia `library` | `draftForAi` mantém a biblioteca **enxuta** (sem `variants`/data URLs) |
| Servidor validava mídia contra `library: []` | Servidor valida contra a biblioteca real do rascunho enviado |
| Resposta devolvia `library: []` e apagava o acervo local | Resposta devolve a biblioteca e o cliente **reidrata** com os campos completos locais |

### 15.2 Arquivos entregues

| Arquivo | Papel |
| --- | --- |
| `lib/nuaAi/toolRegistry.mjs` | **Novo.** Registro único: 56 ferramentas com declaração, RBAC, validação, execução e verificação. Resolve mídia por id/url/objectKey/nome, nunca inventa arquivo, nunca adivinha alvo ambíguo. |
| `lib/nuaAi/adminAssistant.mjs` | Orquestrador reescrito: base de escrita = rascunho completo, loop de até 4 ferramentas/turno, `thoughtSignature` preservado no loop do Gemini, verificação pós-escrita, auditoria e contrato `{ ok, error }` honesto. |
| `lib/nuaAi/assistantServices.mjs` | Adapter Supabase com `db` (select/upsert/update/remove) e `api()` interno que reutiliza os endpoints reais do painel; `generate` aceita `contents` + múltiplas chamadas. |
| `lib/nuaAi/contentOps.mjs` | `draftForAi`, `slimMediaItem`, `slimLibrary`, `rehydrateLibrary`; `library` deixou de ser bloqueada. |
| `functions/api/nua-ai/chat.ts` | Entrada de produção: resolve o papel pela sessão assinada e sempre responde 200 com contrato de erro. |
| `functions/api/nua-ai/_actor.ts` | **Novo.** Resolução de papel compartilhada (sessão, master key, bypass estrito de localhost). |
| `functions/api/nua-ai/approve-action.ts` | **Novo.** Executor de ações sensíveis: nonce de uso único, expiração de 10 min, anti-replay, auditoria. |
| `components/nua/admin/ai/useNuaAiChat.ts` | Envia `draftContent` completo e anexos com `id`/`objectKey`; aplica o resultado reidratando a biblioteca. |
| `components/nua/admin/NuaAiChatDrawer.tsx` | Anexos passam a carregar `id`/`objectKey`. |
| `components/nua/admin/ai/ProposalActionCard.tsx` | Aplica o conteúdo devolvido; publicar limpa o estado "não publicado". |
| `app/admin/components/useAdminShell.ts` | `replace_draft` reidrata a biblioteca e trata o evento `published`. |
| `lib/nuaAi/client.ts`, `lib/nuaAi/types.ts` | Erros reais propagados; novos campos (`draftContent`, `ok`, `error`, `tools`, `proposals`, `lastContext`). |
| `tools/localApiServer.mjs` | Passa `origin` e `actorRole: 'dev'`. |

### 15.3 Ações sensíveis (exigem clique humano)

Excluir mídia, publicar site, reagendar/cancelar chamada, alterar horários/modalidades, dar baixa/reverter parcela, alterar preços de personalizados, remover faixa musical e alterar status de solicitação. Todas geram cartão com nonce; nada é executado antes do clique.

### 15.4 Testes executados

- **26/26** testes de runtime do orquestrador (criação de pack com fotos, anexo de vídeo, alvo ambíguo, mídia inexistente, proposta sensível, RBAC, anti-alucinação, múltiplas ferramentas, histórico, auditoria, validação de HTML/URL).
- **13/13** testes do `/api/nua-ai/approve-action` (nonce errado, expirado, reutilizado, ação desconhecida, falha da API, permissão).
- **Integração real com Gemini**: `list_media` → resposta com ids reais; `create_pack` com duas fotos anexadas (preço, capa, duração, rascunho, biblioteca preservada); `publish_site` e `delete_media` gerando proposta sem executar; `attach_media` por nome de pack.
- **TypeScript**: `tsc --noEmit` limpo nos arquivos de cliente e nas Pages Functions alteradas.

### 15.5 Limitações conhecidas

- `lib/gemini/apiClient.ts` (arquivo não versionado, pré-existente) tem erro de sintaxe e impede o `tsc` global do projeto; não foi tocado.
- O limite diário do Gemini no plano gratuito pode esgotar; nesse caso a IA responde que nada foi alterado.
- A publicação via cartão depende do endpoint `/api/content/sync` já existente.

**Fim do documento.**

