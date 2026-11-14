# Reorganização do Admin da Nua Borges

## Proposta de navegação, sidebar e separação entre cliente e desenvolvedor

**Status:** proposta aprovada para orientar a próxima alteração de interface  
**Escopo:** organização visual e hierárquica do painel da cliente  
**Não altera nesta etapa:** regras de negócio, APIs, autenticação, pagamentos ou persistência

---

## 1. Decisão principal

O Admin continuará tendo todos os recursos necessários para a operação da Nua Borges, mas a navegação será reorganizada para refletir a forma como a cliente trabalha.

A regra será:

> O painel da cliente mostra o que ela precisa operar. O painel do desenvolvedor recebe solicitações técnicas destinadas ao dev.

Portanto:

- IA e Player continuam visíveis no sidebar;
- ambos permanecem marcados como `DEV`/`BETA`;
- pedidos personalizados de conteúdo continuam no Admin quando forem pedidos comerciais de clientes;
- pedidos, tickets ou solicitações destinados ao desenvolvedor não entram no painel da cliente;
- funções técnicas ficam agrupadas e visualmente separadas das tarefas diárias.

### Interpretação adotada

“Pedidos personalizados pro dev” será tratado como o fluxo de solicitações técnicas para Philippe/desenvolvedor: pedidos de nova funcionalidade, correções, integrações, alterações estruturais ou suporte técnico.

Isso é diferente de `Pedidos Personalizados`, que são pedidos comerciais feitos pelos clientes da Nua e continuam sendo necessários no Admin.

---

## 2. Problema atual

Hoje o sidebar mistura quatro tipos de coisa:

```text
OPERAÇÃO COMERCIAL
  Conteúdos & Packs
  Personalizados
  Chamadas VIP

GESTÃO DO SITE
  Vitrine & Capa
  Conexões & Redes

GESTÃO & SISTEMA
  Financeiro
  Contratos
  Cofre de credenciais
  Configurações
  Alertas & Sistema

BETA
  Player de Áudio
  IA Automação
```

O problema não é a quantidade isolada de itens. É que a cliente precisa descobrir:

- quais itens são usados diariamente;
- quais itens são administrativos;
- quais itens são experimentais;
- onde editar o site;
- onde acompanhar um pedido;
- onde pagar ou consultar a manutenção;
- o que é responsabilidade dela e o que é responsabilidade do desenvolvedor.

---

## 3. Nova organização visual proposta

### Sidebar novo

```text
┌────────────────────────────────────────────┐
│ NUA BORGES                         ADMIN    │
├────────────────────────────────────────────┤
│ PRINCIPAL                                  │
│  Visão geral                                │
│  Novos pedidos                         3    │
│                                            │
│ OPERAÇÃO                                   │
│  Conteúdos e packs                         │
│  Pedidos personalizados                     │
│  Chamadas VIP                               │
│                                            │
│ SITE                                       │
│  Editar site                                │
│  Redes e contato                            │
│                                            │
│ GESTÃO                                     │
│  Financeiro                                 │
│  Contratos                                  │
│                                            │
│ SISTEMA                                    │
│  Configurações                              │
│  Acessos e senhas                           │
│                                            │
│ FERRAMENTAS DEV                            │
│  Player de áudio                 DEV / BETA │
│  Assistente Nua IA              DEV / BETA │
│                                            │
├────────────────────────────────────────────┤
│ Sair do painel                              │
└────────────────────────────────────────────┘
```

### Ordem de prioridade

1. Visão geral;
2. Novos pedidos;
3. Operação comercial;
4. Edição do site;
5. Gestão administrativa;
6. Sistema;
7. Ferramentas de desenvolvimento.

Essa ordem coloca primeiro aquilo que pode exigir uma ação da cliente e deixa ferramentas técnicas em uma área claramente separada.

---

## 4. Módulos novos e módulos reorganizados

| Nome exibido | ID técnico sugerido | Origem | Objetivo |
|---|---|---|---|
| Visão geral | `inicio` | Novo | Mostrar pendências, atalhos e status do negócio |
| Novos pedidos | `alertas` | Renomeado | Centralizar pedidos que precisam de atenção |
| Conteúdos e packs | `conteudos` | Renomeado | Criar e administrar produtos/conteúdos |
| Pedidos personalizados | `personalizados` | Renomeado | Atender pedidos comerciais dos clientes |
| Chamadas VIP | `chamadas` | Mantido | Agenda e atendimento de chamadas |
| Editar site | `vitrine` | Renomeado | Reunir capa, galeria, Sobre Mim, SEO e textos |
| Redes e contato | `conexoes` | Renomeado | Links, redes sociais e canais de contato |
| Financeiro | `financeiro` | Mantido | Vendas, receitas, parcelas e pagamentos |
| Contratos | `contratos` | Mantido | Documentos e assinaturas |
| Configurações | `configuracoes` | Mantido | Preferências e comportamento do sistema |
| Acessos e senhas | `cofre` | Renomeado | Credenciais operacionais protegidas |
| Player de áudio | `beta_player` | Mantido | Música do site, com selo DEV/BETA |
| Assistente Nua IA | `beta_ia` | Renomeado | Assistente experimental, com selo DEV/BETA |

---

## 5. O que fica fora do painel da cliente

O painel da cliente não deve mostrar uma área para abrir pedidos técnicos destinados ao desenvolvedor.

Devem ficar fora:

- solicitação de nova página;
- pedido de nova integração;
- pedido de alteração estrutural do Admin;
- ticket de bug técnico;
- solicitação de mudança de banco ou API;
- pedido de alteração de deploy;
- solicitação de ajuste de infraestrutura;
- fila interna de triagem do desenvolvedor;
- plano técnico e estimativa interna;
- métricas internas de suporte;
- telemetria administrativa do sistema.

Esses itens pertencem ao Admin Geral/desenvolvedor.

### O que continua no painel da cliente

Continuam visíveis:

- pedidos personalizados comerciais recebidos de clientes;
- agendamentos de chamadas;
- vendas de packs;
- edição de conteúdo;
- finanças da operação;
- contratos;
- acessos e senhas;
- configurações do próprio painel;
- Player e NuaIA, identificados como ferramentas DEV/BETA.

---

## 6. Separação visual entre cliente e desenvolvedor

### Área comum da cliente

```text
Visão geral
Novos pedidos
Conteúdos e packs
Pedidos personalizados
Chamadas VIP
Editar site
Redes e contato
Financeiro
Contratos
Configurações
Acessos e senhas
```

### Área experimental/dev

```text
Ferramentas DEV
  Player de áudio        DEV / BETA
  Assistente Nua IA      DEV / BETA
```

O grupo deve usar:

- separador visual próprio;
- selo âmbar `DEV` ou `BETA`;
- descrição curta ao passar o mouse ou abrir o módulo;
- confirmação de que a ferramenta é experimental;
- nenhuma badge de urgência misturada com pedidos comerciais.

### Área exclusiva do desenvolvedor

Não deve aparecer no painel da cliente:

```text
Solicitações técnicas
Triagem de chamados
Plano técnico
Métricas da NuaIA
Auditoria técnica
Conciliação master
Telemetria
Administração de infraestrutura
```

Esses recursos permanecem em `components/admingeral` e nos serviços administrativos correspondentes.

---

## 7. Visão geral: nova tela inicial

O módulo inicial deve ser uma central de ação, não apenas uma tela decorativa.

### Estrutura visual

```text
┌──────────────────────────────────────────────────────────┐
│ Bom dia, Nua                                              │
│ Aqui está o que precisa da sua atenção hoje.              │
├──────────────────────────────────────────────────────────┤
│ [ 3 novos pedidos ] [ 1 chamada hoje ] [ site atualizado ]│
├─────────────────────────────┬────────────────────────────┤
│ ATENÇÃO                     │ ATALHOS                    │
│ • 2 pedidos personalizados  │ Editar capa                │
│   aguardando resposta       │ Adicionar conteúdo         │
│ • 1 chamada para confirmar  │ Ver pedidos                │
│                             │ Abrir prévia               │
├─────────────────────────────┴────────────────────────────┤
│ ÚLTIMAS ATIVIDADES                                        │
│ Pedido recebido · Pack vendido · Alteração publicada      │
└──────────────────────────────────────────────────────────┘
```

### Regra da tela inicial

Cada alerta precisa levar diretamente à ação correta.

Exemplos:

```text
2 pedidos aguardando resposta  → Abrir Pedidos personalizados
1 chamada aguardando confirmação → Abrir Chamadas VIP
Alterações ainda não publicadas → Revisar e publicar
```

---

## 8. Reorganização interna de “Editar site”

O módulo técnico `vitrine` pode continuar existindo, mas deve apresentar uma entrada simples.

```text
EDITAR SITE

┌──────────────────┐ ┌──────────────────┐
│ Capa do site     │ │ Galeria pública  │
│ Fotos e chamada  │ │ Ensaios e ordem  │
│ [Abrir]          │ │ [Abrir]          │
└──────────────────┘ └──────────────────┘

┌──────────────────┐ ┌──────────────────┐
│ Sobre Mim        │ │ SEO e compartilh.│
│ Bio e manifesto  │ │ WhatsApp e redes │
│ [Abrir]          │ │ [Abrir]          │
└──────────────────┘ └──────────────────┘

┌──────────────────┐
│ Textos legais    │
│ Institucional    │
│ [Abrir]          │
└──────────────────┘
```

A cliente não deve precisar saber que todas essas telas pertencem internamente ao mesmo componente `VitrineCapaModule`.

---

## 9. Reorganização de “Redes e contato”

```text
REDES E CONTATO

┌───────────────────────┐ ┌───────────────────────┐
│ Redes sociais         │ │ OnlyFans e plataformas │
│ Instagram e canais    │ │ Links e descrições    │
│ [Abrir]               │ │ [Abrir]               │
└───────────────────────┘ └───────────────────────┘

┌───────────────────────┐
│ Contato comercial     │
│ E-mail e assuntos     │
│ [Abrir]               │
└───────────────────────┘
```

---

## 10. Fluxo de publicação revisado

### Estado normal

```text
Site atualizado
Última publicação: hoje às 14:32
```

### Depois de editar

```text
Rascunho salvo
O site público ainda não foi alterado.

[Ver prévia] [Publicar no site]
```

### Confirmação de publicação

```text
PUBLICAR NO SITE?

Você está prestes a colocar no ar:
✓ Nova foto da capa
✓ Novo texto Sobre Mim
✓ Novo link do Instagram

Esta ação não apaga o seu rascunho.

[Voltar e revisar] [Publicar agora]
```

### Resultado

```text
Publicado com sucesso
O site público foi atualizado agora.
[Abrir site]
```

---

## 11. Badges e estados

Os números atuais devem continuar existindo, mas com significado mais claro.

| Estado | Exibição recomendada |
|---|---|
| Pedido novo | `Novo` |
| Aguardando resposta | `Responder` |
| Pagamento pendente | `Pagamento pendente` |
| Em produção | `Em produção` |
| Chamada próxima | `Hoje` ou `Amanhã` |
| Rascunho local | `Rascunho salvo` |
| Site publicado | `Site atualizado` |
| Ferramenta experimental | `DEV` + `BETA` |

Evitar que a cliente precise interpretar apenas cores, pontos ou números.

---

## 12. Responsabilidades do código

### Alterar

```text
components/nua/admin/AdminSidebar.tsx
app/admin/components/types.ts
app/admin/components/AdminModuleRouter.tsx
app/admin/components/AdminHeader.tsx
app/admin/page.tsx
```

### Criar ou reorganizar

```text
components/nua/admin/AdminDashboard.tsx
components/nua/admin/SiteManagementHub.tsx
components/nua/admin/ConnectionsHub.tsx
```

### Preservar

```text
components/nua/admin/BetaIaModule.tsx
components/nua/admin/MusicEditor.tsx
components/nua/admin/PersonalizadosEditor.tsx
components/nua/admin/AppointmentsEditor.tsx
```

Esses componentes continuam funcionais. A primeira etapa deve mudar a entrada e a organização, não reescrever suas regras internas.

### Não expor no Admin da cliente

Não adicionar ao `AdminModuleRouter` módulos de triagem técnica, tickets para o desenvolvedor ou métricas internas do Admin Geral.

---

## 13. Compatibilidade técnica

Os IDs técnicos podem ser preservados para reduzir risco:

```text
conteudos       → Produtos e conteúdos
personalizados  → Pedidos personalizados
chamadas        → Chamadas VIP
vitrine         → Editar site
conexoes        → Redes e contato
alertas         → Novos pedidos
cofre           → Acessos e senhas
beta_player     → Player de áudio
beta_ia         → Assistente Nua IA
```

Assim, a mudança principal fica na camada de apresentação e navegação, sem quebrar links internos ou APIs.

Aliases antigos devem continuar funcionando durante a transição:

```text
/admin/vitrine
/admin/conexoes
/admin/alertas
/admin/beta_player
/admin/beta_ia
```

O texto exibido pode mudar sem alterar esses IDs.

---

## 14. Critérios para considerar a reorganização concluída

### Navegação

- a cliente identifica a área correta sem abrir o manual;
- ferramentas diárias aparecem antes das ferramentas administrativas;
- IA e Player continuam acessíveis com selo DEV/BETA;
- nenhum fluxo de solicitação técnica para o desenvolvedor aparece no painel da cliente;
- “Pedidos personalizados” continua disponível para pedidos comerciais reais.

### Conteúdo

- a cliente encontra capa, galeria e Sobre Mim por nomes visíveis;
- redes e contato ficam no mesmo grupo;
- contratos e financeiro não competem com edição de conteúdo;
- cofre deixa de parecer uma tarefa comum.

### Publicação

- a cliente entende quando algo é rascunho;
- entende quando algo está no ar;
- sabe o que será publicado;
- consegue abrir uma prévia;
- recebe confirmação persistente após publicar.

### Operação

- novos pedidos levam diretamente ao registro correto;
- badges indicam ação, não apenas quantidade;
- a tela inicial apresenta pendências reais;
- a interface não exige conhecimento de termos técnicos.

---

## 15. Plano de execução recomendado

### Etapa 1 — navegação

1. Renomear labels visíveis.
2. Reagrupar o sidebar.
3. Manter IA e Player no grupo `Ferramentas DEV`.
4. Remover qualquer módulo de solicitação técnica da cliente.
5. Atualizar breadcrumbs e títulos.

### Etapa 2 — entrada dos módulos

1. Criar `Visão geral`.
2. Criar cartões internos para `Editar site`.
3. Criar cartões internos para `Redes e contato`.
4. Renomear a central de alertas para `Novos pedidos`.

### Etapa 3 — publicação

1. Melhorar o estado de rascunho.
2. Renomear o botão para `Publicar no site`.
3. Criar resumo de alterações.
4. Adicionar confirmação e resultado persistente.

### Etapa 4 — validação com a cliente

Pedir que ela execute, sem ajuda:

1. trocar a foto da capa;
2. alterar o texto Sobre Mim;
3. adicionar um item à galeria;
4. abrir um pedido personalizado;
5. consultar uma chamada;
6. abrir o Player;
7. abrir a NuaIA.

O objetivo é confirmar que IA e Player continuam fáceis de encontrar sem parecerem funções obrigatórias.

---

## 16. Resultado esperado

Depois da reorganização, a cliente deve pensar assim:

```text
Quero mudar o site       → Editar site
Quero subir conteúdo     → Conteúdos e packs
Recebi um pedido         → Novos pedidos
Preciso atender cliente  → Pedidos personalizados
Tenho uma chamada        → Chamadas VIP
Quero mudar um link      → Redes e contato
Quero ver pagamentos     → Financeiro
Preciso de documento     → Contratos
Quero ajustar o painel   → Configurações
Preciso de um acesso     → Acessos e senhas
Quero usar uma ferramenta experimental → Ferramentas DEV
```

Esse é o objetivo da mudança: não retirar capacidade do Admin, mas transformar a capacidade existente em caminhos compreensíveis para a cliente.
