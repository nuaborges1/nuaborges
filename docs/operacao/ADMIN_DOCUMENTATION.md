# Documentação Completa do Ecossistema Administrativo — Nua Borges

**Projeto:** `nuasite`  
**Última leitura do código:** 24/10/2026  
**Framework:** Next.js App Router, React 19, TypeScript  
**Infraestrutura:** Cloudflare Pages (Deploy & Proxy) + Pages Functions + Supabase (Database) + Backblaze B2 (Storage de Mídia)

## 1. Objetivo deste documento

Este documento descreve o funcionamento do ecossistema administrativo da plataforma Nua Borges a partir do código existente, não apenas da documentação comercial. Ele cobre:

- o painel `/admin` utilizado pela cliente;
- o núcleo de operações comerciais;
- o gerenciamento editorial do site público;
- autenticação, sessão e RBAC;
- APIs consumidas pelo painel;
- persistência, publicação e sincronização de conteúdo;
- mídia, produtos, pedidos, chamadas, contratos, finanças e cofre;
- NuaIA e ferramentas de apoio;
- Admin Geral do desenvolvedor;
- deploy, testes, riscos conhecidos e procedimentos operacionais.

Quando a documentação descreve uma intenção diferente do comportamento observado no código, a diferença é indicada como **divergência**.

---

## 2. Visão geral do ecossistema

O repositório contém um monólito modular com três superfícies administrativas:

### 2.1 Painel da cliente — `/admin`

É o painel principal da Nua Borges. Permite administrar o conteúdo público, produtos, pedidos, agenda, pagamentos, contratos, credenciais e configurações.

Entrada principal:

```text
app/admin/page.tsx
app/admin/layout.tsx
app/admin/components/useAdminShell.ts
app/admin/components/AdminModuleRouter.tsx
```

Componentes principais:

```text
components/nua/admin/
```

### 2.2 Admin Geral / central técnica

É a superfície de operação do desenvolvedor, com triagem de solicitações, gestão financeira de contratos, telemetria e métricas da NuaIA.

Componentes:

```text
components/admingeral/
lib/admingeral/
lib/services/admingeral/
```

No estado atual observado, não existe `app/admingeral/page.tsx` no App Router. Portanto, o Admin Geral deve ser tratado como pacote/interface de deploy separado ou como superfície integrada por outro entrypoint de build. A documentação de arquitetura declara um deploy `out-admingeral`, mas a rota precisa ser confirmada antes de qualquer alteração.

### 2.3 Serviços de backend

As superfícies administrativas acessam Pages Functions:

```text
functions/api/
```

O middleware em `functions/api/_middleware.ts` é o gateway central de CORS, CSRF, autenticação, RBAC e headers de segurança.

---

## 3. Fluxo de inicialização do `/admin`

O ciclo de vida do painel é controlado por `useAdminShell`.

### 3.1 Estados iniciais

O painel começa em três estados possíveis:

1. `authenticated === null`: verificando sessão;
2. `authenticated === false`: exibindo `AdminLogin`;
3. `authenticated === true`: exibindo o shell completo.

Enquanto a sessão é verificada, o usuário vê a mensagem de inicialização do painel.

### 3.2 Em ambiente local

Quando `isLocalhost()` retorna verdadeiro:

- o painel é autenticado automaticamente;
- o conteúdo inicial é carregado do `localStorage` por `getDraftContent()`;
- o conteúdo publicado remoto é buscado e mesclado ao rascunho;
- o ambiente é marcado como local;
- a gaveta NuaIA é exibida.

### 3.3 Em produção

Quando não é localhost:

- `checkServerSession()` consulta a sessão do servidor;
- se a sessão for válida, o conteúdo publicado remoto é carregado;
- o conteúdo remoto é mesclado ao rascunho local;
- se a sessão expirar, o painel retorna ao login;
- a NuaIA visual integrada ao painel fica condicionada ao ambiente local no `AdminPage` atual.

### 3.4 Logout

O logout chama `clearSession()` e altera o estado para não autenticado. A invalidação efetiva da sessão deve ser garantida também por `/api/auth/logout` quando o fluxo de produção estiver baseado em cookie HttpOnly.

---

## 4. Shell visual e navegação

O shell do painel é composto por:

```text
AdminHeader
AdminSidebar
AdminModuleRouter
PreviewModal
NuaSpotlightModal
NuaAiChatDrawer
```

### 4.1 Cabeçalho

O `AdminHeader` concentra:

- menu mobile;
- busca/Spotlight;
- módulo atual;
- status da mensalidade;
- quantidade de alertas;
- abertura da prévia;
- indicador de alterações não publicadas;
- botão de publicação.

### 4.2 Barra lateral

O `AdminSidebar` apresenta os módulos agrupados por área, com badges calculados a partir de pedidos e alertas reais.

Badges atualmente calculados:

- personalizados pendentes;
- chamadas pendentes;
- vendas de packs;
- alertas não lidos.

### 4.3 URL e módulos

O módulo ativo é refletido na URL com `history.pushState`, normalmente em formatos como:

```text
/admin/conteudos
/admin/personalizados
/admin/chamadas
/admin/vitrine
```

Também existem aliases legados aceitos por `resolveModuleFromParam`, por exemplo `packs`, `gallery`, `appointments`, `vault`, `settings` e `ai`.

O navegador pode voltar e avançar entre módulos por meio de `popstate`.

### 4.4 Spotlight

O Spotlight é aberto por:

- botão na interface;
- evento `open_spotlight`;
- `Ctrl+K` no Windows/Linux;
- `Cmd+K` no macOS.

Ele permite busca e navegação rápida entre áreas do painel.

---

## 5. Catálogo completo de módulos do painel da cliente

Os módulos são definidos em `app/admin/components/types.ts` e encaminhados por `AdminModuleRouter`.

| ID | Nome | Grupo | Responsabilidade |
|---|---|---|---|
| `conteudos` | Conteúdos & Packs | Operação Comercial | Packs avulsos, biblioteca privada e cofre de mídia |
| `personalizados` | Personalizados | Operação Comercial | Pedidos sob medida, preços, produção e entrega |
| `chamadas` | Chamadas VIP | Operação Comercial | Agenda, modalidades, horários e links de sala |
| `vitrine` | Vitrine & Capa | Gestão do Site | Hero, galeria, biografia e apresentação |
| `conexoes` | Conexões & Contato | Gestão do Site | Redes, OnlyFans, contato e canais externos |
| `financeiro` | Financeiro | Financeiro | Vendas, receitas, parcelas e conciliação |
| `contratos` | Contratos | Jurídico & Contratos | Contrato, Anexo I e assinaturas |
| `cofre` | Cofre de credenciais | Segurança | Credenciais criptografadas |
| `configuracoes` | Configurações | Sistema | Alertas, notificações e diagnósticos |
| `beta_player` | Player de Áudio | Beta Experimental | Música ambiente do site |
| `beta_ia` | Assistente Nua IA | Beta Experimental | Assistente, conhecimento e suporte |
| `alertas` | Central de Alertas | Sistema | Pedidos, segurança e avisos |
| `mensalidade` | Mensalidade do Site | Financeiro | Cobrança da manutenção técnica |

---

## 6. Módulo Conteúdos & Packs

Arquivos principais:

```text
components/nua/admin/AvulsosEditor.tsx
components/nua/admin/LibraryEditor.tsx
components/nua/admin/PackEditorPage.tsx
components/nua/admin/ConteudosPacksModule.tsx
components/nua/admin/avulsos/
components/nua/admin/packs/
components/nua/admin/library/
```

### 6.1 Responsabilidades

- criar e editar produtos avulsos;
- definir título, descrição, preço e status;
- organizar previews e mídias privadas;
- associar conteúdo a packs;
- controlar publicação e disponibilidade;
- administrar biblioteca de mídia;
- enviar fotos e vídeos;
- criar álbuns;
- selecionar mídias para a galeria;
- mover, ordenar e visualizar arquivos.

### 6.2 Fluxo de criação de pack

1. A cliente abre Conteúdos & Packs.
2. Cria ou seleciona um produto.
3. Preenche dados gerais.
4. Adiciona previews públicos.
5. Adiciona mídia protegida ao cofre do pack.
6. Salva como rascunho.
7. O painel dispara o evento `create_pack_draft` quando aplicável.
8. O conteúdo local é atualizado e marcado como não publicado.
9. A publicação geral torna o item visível no site.

### 6.3 Mídia privada

Mídia privada não deve ser exposta diretamente por caminhos públicos. O fluxo correto utiliza presign/upload, validação de MIME/magic bytes e autorização no backend.

APIs relacionadas:

```text
/api/media/list
/api/media/presign
/api/media/upload
/api/media/delete
/api/admin/vault
/media/[path]
```

---

## 7. Módulo Personalizados

Arquivos principais:

```text
components/nua/admin/PersonalizadosEditor.tsx
components/nua/admin/PersonalizadosModule.tsx
components/nua/admin/PersonalizadoOrderPage.tsx
components/nua/admin/personalizados/
lib/personalizadosCanonical.ts
lib/personalizadosStore.ts
lib/services/nua/personalizadosService.ts
```

### 7.1 Responsabilidades

- visualizar fila de pedidos;
- consultar status e dados comerciais;
- configurar preços de fotos e vídeos;
- controlar limites e opções do pedido;
- acompanhar produção;
- carregar mídia de entrega;
- enviar ou registrar mensagens ao cliente;
- marcar pedido como concluído;
- abrir detalhes e histórico.

### 7.2 Estados relevantes

O painel considera como pendentes estados como:

```text
pending
paid
pendente
em_producao
pending_payment
```

O estado financeiro e o estado operacional não devem ser confundidos: um pedido pode estar pago, mas ainda em produção.

### 7.3 Backend

```text
/api/personalizados/create
/api/personalizados/status
/api/personalizados/admin
```

O helper de e-mail está em `functions/api/personalizados/_emailHelper.ts`.

---

## 8. Módulo Chamadas VIP

Arquivos principais:

```text
components/nua/admin/AppointmentsEditor.tsx
components/nua/admin/ChamadasModule.tsx
components/nua/admin/appointments/
lib/appointments/
lib/appointmentsCanonical.ts
lib/appointmentsStore.ts
lib/services/nua/appointmentsService.ts
```

### 8.1 Responsabilidades

- configurar modalidades;
- definir preço e duração;
- administrar disponibilidade;
- consultar calendário;
- acompanhar fila de reservas;
- confirmar ou alterar agendamentos;
- gerenciar links e dados de sala;
- consultar status de pagamento;
- lidar com conflitos de horário.

### 8.2 Motor de disponibilidade

O domínio de agenda possui:

- tipos de agendamento;
- utilitários de horário;
- motor de disponibilidade;
- notificações;
- sincronização;
- validação de concorrência.

O fluxo público usa:

```text
/api/appointments/availability
/api/appointments/book
/api/appointments/lookup
/api/appointments/pix
/api/appointments/sync
```

O fluxo administrativo usa:

```text
/api/appointments/admin
```

Uma regra crítica é impedir dupla reserva do mesmo slot. Essa regra possui teste automatizado em `scripts/audit-validation.test.mjs`.

---

## 9. Módulo Vitrine & Capa

Arquivos principais:

```text
components/nua/admin/VitrineCapaModule.tsx
components/nua/admin/HeroEditor.tsx
components/nua/admin/GalleryEditor.tsx
components/nua/admin/AboutEditor.tsx
components/nua/admin/InstitutionalEditor.tsx
components/nua/admin/SeoEditor.tsx
components/nua/admin/hero/
components/nua/admin/gallery/
components/nua/admin/institutional/
```

### 9.1 Conteúdo administrável

- título e subtítulo do hero;
- chamada principal;
- fotos do carrossel;
- ordem das fotos;
- configurações de capa;
- galeria pública;
- álbuns e legendas;
- biografia;
- manifesto;
- links institucionais;
- SEO e imagem de compartilhamento;
- páginas legais e textos institucionais.

### 9.2 Publicação

O painel trabalha com a distinção:

```text
draft local -> conteúdo publicado remoto
```

Cada alteração editável chama `handleContentChange`, atualiza o estado React, grava o draft e marca `hasUnpublished = true`.

---

## 10. Módulo Conexões & Contato

Arquivos principais:

```text
components/nua/admin/ChannelsEditor.tsx
components/nua/admin/ContactEditor.tsx
components/nua/admin/ConexoesContatoModule.tsx
components/nua/admin/channels/
```

Permite administrar:

- OnlyFans;
- Instagram;
- canais externos;
- links de contato;
- e-mail comercial;
- assuntos de contato;
- textos e badges dos cards;
- banners de contato.

O formulário público usa `/api/contact`. O endpoint deve aplicar validação, sanitização, honeypot e rate limit.

---

## 11. Módulo Financeiro

Arquivos principais:

```text
components/nua/admin/FinanceEditor.tsx
components/nua/admin/CommercialFinanceEditor.tsx
components/nua/admin/finance/
components/admingeral/FinanceAdminManager.tsx
functions/api/finance/
lib/financeCanonical.ts
lib/services/nua/financeService.ts
lib/services/admingeral/financeAdminService.ts
```

### 11.1 Financeiro da operação da Nua

Abrange:

- vendas;
- pedidos pagos e pendentes;
- receitas;
- parcelas;
- pagamentos manuais;
- reversões;
- modalidades comerciais;
- transações;
- indicadores e timeline.

### 11.2 Endpoints

```text
/api/finance/admin
/api/finance/installments
/api/finance/create-preference
/api/finance/pix
/api/finance/verify
/api/finance/webhook
```

Também existem endpoints Stripe:

```text
/api/stripe/create-checkout
/api/stripe/dashboard
/api/stripe/invoicing
/api/stripe/webhook
/api/webhooks/stripe
```

E endpoints Mercado Pago/pagamentos:

```text
/api/payments/create-pix
/api/payments/status
/api/payments/verify-access
/api/payments/send-otp
/api/payments/verify-otp
/api/payments/recover-access
```

### 11.3 Regras operacionais

- webhooks devem ser idempotentes;
- assinatura deve ser verificada em produção;
- modo de teste deve ficar restrito a localhost;
- credenciais devem vir do ambiente;
- valores financeiros devem seguir os modelos canônicos;
- baixas manuais e reversões devem gerar auditoria.

---

## 12. Módulo Contratos

Arquivos principais:

```text
components/nua/admin/ContratosModule.tsx
lib/contractCanonical.ts
lib/contract/
lib/generateContractPdf.ts
lib/generateReceiptPdf.ts
functions/api/contract/sign.ts
functions/api/auth/contract.ts
```

Funções:

- visualizar contrato;
- visualizar Anexo I;
- gerar documentos PDF;
- acompanhar assinaturas;
- validar identidade do fluxo contratual;
- consultar estado de assinatura;
- manter dados civis fora do bundle público.

Perfis de contrato:

```text
contract_client
contract_dev
```

Esses perfis devem ser restritos ao endpoint de assinatura e não podem acessar CMS, mídia, finanças ou NuaIA.

---

## 13. Cofre de credenciais

Arquivos principais:

```text
components/nua/admin/CofreCredenciaisModule.tsx
components/nua/admin/vault/
functions/api/admin/vault.ts
lib/vaultCrypto.ts
```

O cofre armazena credenciais operacionais, como senhas, e-mails e acessos. O módulo possui:

- listagem de credenciais;
- criação;
- edição;
- exclusão;
- visualização protegida;
- criptografia/descriptografia no fluxo definido pelo projeto.

### 13.1 Regras de segurança

- nunca exibir credenciais em logs;
- nunca incluir credenciais em conteúdo público;
- nunca enviar segredo ao client bundle sem necessidade;
- manter o segredo mestre apenas no ambiente seguro;
- auditar leitura e alteração;
- não usar valores padrão em produção.

API:

```text
/api/admin/vault
```

---

## 14. Configurações e Central de Alertas

Arquivos principais:

```text
components/nua/admin/ConfiguracoesModule.tsx
components/nua/admin/AlertasSistemaModule.tsx
components/nua/admin/NotificationCenter.tsx
components/nua/admin/NotificationSettingsEditor.tsx
components/nua/admin/NotificationSettingsModal.tsx
```

As configurações abrangem:

- alertas sonoros;
- notificações;
- preferências de sistema;
- diagnósticos;
- configuração de canais de aviso.

A Central de Alertas agrega pedidos e ocorrências. A navegação pode levar diretamente ao módulo relacionado:

- personalizado;
- chamada;
- conteúdo/pack;
- configurações.

---

## 15. Player de áudio

Arquivos principais:

```text
components/nua/admin/MusicEditor.tsx
components/nua/admin/music/
lib/music/
functions/api/music/
```

Funções:

- upload de faixas;
- edição de metadados;
- listagem;
- configuração do player;
- integração com o site público;
- suporte a oEmbed quando aplicável.

APIs:

```text
/api/music/list
/api/music/config
/api/music/upload
/api/music/update
/api/music/oembed
```

---

## 16. NuaIA no Admin

Arquivos de interface:

```text
components/nua/admin/BetaIaModule.tsx
components/nua/admin/NuaAiChatDrawer.tsx
components/nua/admin/ai/
```

Arquivos de domínio:

```text
lib/nuaAi/
nua-ai/
```

O ecossistema inclui:

- histórico;
- memória;
- conhecimento da marca;
- conhecimento científico;
- classificação de intenção;
- sanitização de dados pessoais;
- propostas de ação;
- propostas de ticket;
- telemetria;
- ferramentas sensíveis;
- encaminhamento técnico.

Endpoints:

```text
/api/nua-ai/chat
/api/nua-ai/conversations
```

### 16.1 Limites de autoridade

A NuaIA não deve alterar código, executar comandos ou publicar mudanças diretamente. Ela pode orientar a cliente, sugerir conteúdo, preparar propostas e estruturar tickets.

### 16.2 Divergência atual

O endpoint Edge observado em `functions/api/nua-ai/chat.ts` implementa um fluxo simplificado de heurística ou chamada direta ao Gemini. O motor mais amplo em `lib/nuaAi/` existe no repositório, mas precisa ser verificado se está conectado ao endpoint de produção em cada deploy.

---

## 17. Publicação de conteúdo

### 17.1 Modelo de dados

O estado editorial usa `SiteContent`, com dados como:

- hero;
- galeria;
- biblioteca;
- álbuns;
- sobre;
- conexões;
- contato;
- produtos avulsos;
- configurações de SEO;
- metadados de versão e atualização.

### 17.2 Salvamento local

Alterações são salvas por `saveDraftContent`. O painel mantém um rascunho local para permitir continuidade mesmo antes da publicação.

### 17.3 Publicação remota

`publishContent(content, { force: true })` envia a versão ao backend. Em sucesso:

- a versão é atualizada;
- `hasUnpublished` volta para falso;
- o usuário recebe confirmação;
- o site público passa a consumir o novo conteúdo conforme o mecanismo de sincronização.

Em erro:

- a mensagem é exibida;
- o rascunho permanece preservado;
- se a sessão expirou, o painel volta ao login.

Backend relacionado:

```text
/api/content/sync
lib/contentStore.ts
lib/contentStore.ts
data/content.json
data/published_content.json
```

---

## 18. Autenticação, sessão e RBAC

Arquivos centrais:

```text
functions/api/_middleware.ts
functions/api/_authHelper.ts
functions/api/auth/login.ts
functions/api/auth/session.ts
functions/api/auth/logout.ts
lib/sessionToken.ts
lib/security.ts
```

### 18.1 Papéis

```text
admin
dev
client
contract_client
contract_dev
```

### 18.2 Regras principais

- `admin` e `dev`: acesso amplo às rotas privadas;
- `client`: portal da cliente, solicitações, parcelas e NuaIA;
- `contract_client`: assinatura contratual;
- `contract_dev`: assinatura contratual do desenvolvedor;
- acesso não autenticado: rejeitado para rotas privadas.

### 18.3 Tokens

Sessões usam tokens HMAC-SHA256 com:

- payload codificado;
- assinatura;
- expiração;
- nonce;
- papel do usuário.

O cookie principal é `__Host-Admin-Session`, com `HttpOnly`, `Secure`, `SameSite=Lax` e `Path=/`.

### 18.4 Gateway

O middleware aplica:

- CORS com allowlist;
- validação de Origin/Referer;
- CSRF para mutações;
- autenticação por cookie/Bearer;
- RBAC;
- `X-Content-Type-Options`;
- `X-Frame-Options`;
- `Referrer-Policy`;
- bloqueio fail-closed quando o segredo não existe.

### 18.5 Risco crítico corrigido

A aceitação do segredo literal (`Nuaborges2026`) no gateway e rotas de login foi **completamente removida**. A autenticação depende estritamente das variáveis `ADMIN_API_SECRET` e `ADMIN_PASSWORD` no ambiente Cloudflare Pages (Fail-Closed).

---

## 19. APIs administrativas por domínio

| Domínio | Endpoints principais |
|---|---|
| Auth | `/api/auth/login`, `/api/auth/session`, `/api/auth/logout`, `/api/auth/contract` |
| Conteúdo | `/api/content/sync` |
| Mídia | `/api/media/list`, `/api/media/presign`, `/api/media/upload`, `/api/media/delete` |
| Admin | `/api/admin/orders-feed`, `/api/admin/vault` |
| Packs | `/api/avulsos/*` e integração via conteúdo/persistência |
| Personalizados | `/api/personalizados/create`, `/api/personalizados/status`, `/api/personalizados/admin` |
| Chamadas | `/api/appointments/availability`, `/api/appointments/book`, `/api/appointments/lookup`, `/api/appointments/pix`, `/api/appointments/sync`, `/api/appointments/admin` |
| Finanças | `/api/finance/admin`, `/api/finance/installments`, `/api/finance/create-preference`, `/api/finance/pix`, `/api/finance/verify`, `/api/finance/webhook` |
| Pagamentos | `/api/payments/create-pix`, `/api/payments/status`, `/api/payments/verify-access`, `/api/payments/send-otp`, `/api/payments/verify-otp`, `/api/payments/recover-access` |
| Stripe | `/api/stripe/create-checkout`, `/api/stripe/dashboard`, `/api/stripe/invoicing`, `/api/stripe/webhook`, `/api/webhooks/stripe` |
| Música | `/api/music/list`, `/api/music/config`, `/api/music/upload`, `/api/music/update`, `/api/music/oembed` |
| Solicitações | `/api/requests` |
| NuaIA | `/api/nua-ai/chat`, `/api/nua-ai/conversations` |
| Telemetria | `/api/telemetry/track`, `/api/telemetry/stats` |
| Contratos | `/api/contract/sign` |

---

## 20. Admin Geral do desenvolvedor

Arquivos:

```text
components/admingeral/RequestsCenter.tsx
components/admingeral/FinanceAdminManager.tsx
components/admingeral/NuaAiMetricsTab.tsx
components/admingeral/requests/
components/admingeral/finance/
lib/admingeral/
lib/services/admingeral/
```

### 20.1 Central de solicitações

Permite:

- receber solicitações da cliente;
- classificar e triar chamados;
- alterar status;
- registrar plano técnico;
- responder mensagens;
- criar solicitações manuais;
- acompanhar indicadores da fila.

### 20.2 Financeiro administrativo

Permite:

- visualizar KPIs;
- consultar parcelas;
- registrar pagamento manual;
- reverter pagamento;
- visualizar transações;
- acompanhar timeline financeira.

### 20.3 Métricas da NuaIA

Permite acompanhar:

- volume de conversas;
- latência;
- custo aproximado;
- candidatos de memória;
- eventos de telemetria;
- saúde do motor cognitivo.

### 20.4 Serviço administrativo

O cliente HTTP em `lib/services/admingeral/client.ts` centraliza autenticação, requisições e medição de latência. Os serviços de auditoria, mídia, solicitações, finanças e telemetria ficam separados por domínio.

---

## 21. Persistência e fontes de verdade

### 21.1 Supabase

É a fonte principal esperada para dados operacionais persistentes, especialmente:

- pedidos;
- produtos;
- agendamentos;
- contratos;
- parcelas;
- solicitações;
- dados publicados, conforme o fluxo.

### 21.2 Arquivos locais JSON/JSONL

Existem arquivos locais em `data/` e `nua-ai/` para fallback, desenvolvimento, conteúdo canônico, histórico e auditoria. Eles não devem ser tratados automaticamente como fonte de verdade de produção.

### 21.3 LocalStorage

O navegador armazena principalmente:

- rascunho de conteúdo;
- conteúdo publicado em cache;
- preferências de interface;
- estado de sessão legado, quando aplicável.

Nenhum segredo de produção deve depender de LocalStorage.

---

## 22. Deploy e ambientes

Scripts principais:

```text
npm run build
npm run build:packages
npm run deploy:site
npm run deploy:admin
npm run deploy:admingeral
npm run deploy:all
```

O script `prepareDeploys.mjs` prepara saídas independentes:

```text
out-site
out-admin
out-admingeral
```

Projetos declarados:

```text
nuaborges
nuaborges-admin
admingeral
```

Variáveis críticas incluem:

```text
ADMIN_PASSWORD
ADMIN_API_SECRET
GEMINI_API_KEY
MP_ACCESS_TOKEN
MP_WEBHOOK_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
```

Segredos nunca devem ser commitados, incluídos no bundle ou enviados ao navegador.

---

## 23. Testes e verificações

Arquivos de teste relevantes:

```text
tests/persistenceAudit.test.mjs
scripts/security-audit.test.mjs
scripts/audit-validation.test.mjs
scripts/checkout-unified.test.mjs
scripts/test-media-architecture.mjs
```

As verificações cobrem:

- persistência real e ausência de ressurreição por fallback;
- autenticação HMAC;
- RBAC;
- CORS e CSRF;
- webhooks;
- proteção de PII;
- mídia e magic bytes;
- dupla reserva de horários;
- checkout unificado;
- proibição do ícone `Sparkles`.

Estado observado na leitura atual:

- TypeScript passou sem erros;
- ESLint encontrou 1 erro e 5 avisos;
- o erro atual está em `lib/music/store.tsx:71`, por acesso de ref durante render;
- os avisos restantes são dependências incompletas em hooks.

---

## 24. Procedimentos operacionais

### Publicar alteração editorial

1. Entrar no `/admin`.
2. Abrir o módulo desejado.
3. Editar e salvar o conteúdo.
4. Confirmar que o indicador de não publicado apareceu.
5. Abrir a prévia.
6. Publicar.
7. Verificar o toast de sucesso.
8. Conferir o site público em janela anônima.

### Alterar uma credencial

1. Abrir Cofre de credenciais.
2. Localizar o registro.
3. Editar somente o campo necessário.
4. Confirmar a alteração.
5. Não copiar o segredo para chats, commits ou documentos públicos.
6. Registrar a mudança em auditoria quando o procedimento exigir.

### Processar pedido personalizado

1. Abrir Personalizados.
2. Localizar o pedido pendente.
3. Confirmar pagamento e dados do pedido.
4. Alterar o estado operacional para produção.
5. Produzir e carregar a mídia no cofre correto.
6. Revisar a entrega.
7. Marcar como concluído e notificar o cliente.

### Processar chamada VIP

1. Abrir Chamadas VIP.
2. Verificar disponibilidade e pagamento.
3. Confirmar o horário.
4. Gerar ou registrar o link de sala.
5. Conferir notificações.
6. Encerrar o atendimento conforme o estado operacional.

### Investigar erro de publicação

1. Não apagar o rascunho local.
2. Verificar sessão.
3. Conferir `NEXT_PUBLIC_SITE_URL` e allowlist de origem.
4. Conferir resposta de `/api/content/sync`.
5. Verificar logs da Pages Function.
6. Repetir a publicação somente após confirmar que não houve publicação parcial.

---

## 25. Riscos e divergências que exigem atenção

### 25.1 Segredo literal no middleware (Resolvido)

A aceitação de `Nuaborges2026` foi eliminada do gateway de produção, login e serviços de IA. A autenticação depende exclusivamente de segredo configurado no ambiente.

### 25.2 Admin Geral sem entrypoint explícito

Os componentes existem e o build prevê `out-admingeral`, mas a rota `app/admingeral` não foi encontrada na leitura atual. O processo de build deve ser documentado e testado para garantir que o pacote é realmente acessível.

### 25.3 NuaIA documentada versus endpoint simplificado

Confirmar se `functions/api/nua-ai/chat.ts` deve delegar ao motor completo de `lib/nuaAi/` ou se o fluxo simplificado é intencional.

### 25.4 Monólitos administrativos

Arquivos como `AvulsosEditor.tsx`, `AppointmentsEditor.tsx`, `PersonalizadosEditor.tsx`, `NuaAiChatDrawer.tsx` e `LibraryEditor.tsx` ainda concentram muita responsabilidade. O plano de refatoração existente recomenda decomposição gradual sem alteração de comportamento.

### 25.5 Estado local e remoto

O uso simultâneo de rascunho local, conteúdo publicado remoto e fallbacks JSON exige testes de precedência para impedir que conteúdo antigo ressuscite após reload.

### 25.6 ESLint

O erro de `ref` em `lib/music/store.tsx` precisa ser corrigido antes de considerar o Admin plenamente limpo em qualidade estática.

---

## 26. Mapa de manutenção por pasta

| Pasta | Papel |
|---|---|
| `app/admin` | Entry point, shell e roteamento do painel |
| `components/nua/admin` | Interface administrativa da cliente |
| `components/admingeral` | Interface da central do desenvolvedor |
| `lib/services/nua` | Clientes de API da operação Nua |
| `lib/services/admingeral` | Clientes de API do Admin Geral |
| `lib/nuaAi` | Motor cognitivo e regras da NuaIA |
| `functions/api` | Backend Edge e endpoints REST |
| `lib/core` | Segurança, ambiente e utilitários compartilhados |
| `lib/contentStore.ts` | Draft, publicação e sincronização de conteúdo |
| `lib/*Canonical.ts` | Modelos e regras canônicas por domínio |
| `data` | Dados locais, fixtures e fallbacks controlados |
| `scripts` | Auditorias, testes e operações auxiliares |
| `tools` | Build, sincronização e preparação de deploy |

---

## 27. Princípios para futuras alterações

1. Toda mudança administrativa deve preservar a separação entre draft e publicação.
2. Toda mutação deve ser validada no backend, mesmo que a interface a esconda.
3. Toda rota privada deve passar por autenticação e RBAC.
4. Dados pessoais e credenciais não podem entrar no bundle público.
5. Mídia privada deve usar autorização server-side e chaves validadas.
6. Webhooks precisam ser assinados e idempotentes.
7. Alterações de domínio devem usar os modelos canônicos existentes.
8. Componentes de UI não devem conter regras financeiras ou criptográficas diretamente.
9. Toda correção de bug deve incluir teste regressivo.
10. O ícone `Sparkles` permanece proibido em todo o ecossistema.

---

## 28. Conclusão

O Admin da Nua Borges é mais do que um CMS: ele funciona como uma central operacional para conteúdo, vendas, atendimento, agenda, contratos, pagamentos, mídia privada, segurança e assistência inteligente.

O painel da cliente está organizado em módulos de negócio e possui uma camada central de sessão, navegação, publicação e notificações. O Admin Geral complementa a operação com triagem técnica, finanças administrativas e telemetria.

Os próximos pontos prioritários para estabilização são:

1. remover o segredo literal do middleware;
2. confirmar e documentar o entrypoint real do Admin Geral;
3. alinhar o endpoint de NuaIA ao motor completo ou declarar oficialmente o fluxo simplificado;
4. corrigir o erro atual do ESLint;
5. manter os segredos e bases locais fora de commits e artefatos públicos.
