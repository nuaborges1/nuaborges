# Auditoria de Clareza e Usabilidade do Admin

**Escopo:** painel administrativo da cliente (`/admin`)  
**Base:** leitura do código de navegação, shell, módulos, formulários, manual da cliente e fluxos de publicação  
**Data:** 24/10/2026

## Diagnóstico executivo

O principal problema não é falta de funcionalidade. É excesso de conceitos expostos ao mesmo tempo.

A cliente recebe uma interface de operação profissional, mas precisa pensar como desenvolvedora para usá-la:

- o manual descreve 7 abas simples;
- o produto real mostra 12 módulos;
- alguns módulos misturam várias tarefas diferentes;
- vários nomes são técnicos ou ambíguos;
- o ato de editar, salvar rascunho e publicar não é suficientemente separado;
- há ferramentas de desenvolvimento visíveis na navegação principal;
- a interface oferece badges, status, ícones e grupos, mas não explica o próximo passo.

Minha conclusão é que a cliente provavelmente não está “com dificuldade de aprender o sistema”. O sistema está exigindo que ela descubra a arquitetura interna do produto antes de conseguir realizar tarefas simples.

---

## 1. Problemas mais graves

### P0 — Manual e interface não correspondem

O manual instrui a cliente a procurar:

```text
Início & Capa
Biblioteca de Mídia
Galeria do Site
Sobre Mim
Redes & OnlyFans
Contato
Ajustes
```

Mas a barra lateral real apresenta:

```text
Conteúdos & Packs
Personalizados
Chamadas VIP
Vitrine & Capa
Conexões & Redes
Financeiro
Contratos
Cofre de credenciais
Configurações
Alertas & Sistema
Player de Áudio
IA Automação
```

Evidência:

- `components/nua/admin/AdminSidebar.tsx:52-116`
- `app/admin/components/types.ts:8-71`
- `MANUAL_DA_CLIENTE_NUA_BORGES.md:25-87`

Impacto: a cliente procura um nome que não existe, acredita que a função desapareceu ou entra no módulo errado.

Correção recomendada: fazer a interface seguir o vocabulário do manual. O ideal é reduzir a navegação principal para 6 áreas:

1. Editar Site;
2. Biblioteca de Mídia;
3. Vendas e Conteúdos;
4. Pedidos e Chamadas;
5. Financeiro;
6. Configurações.

Contratos, cofre, alertas e ferramentas beta devem ficar dentro de “Configurações” ou “Mais ferramentas”, não competindo com as tarefas diárias.

### P0 — “Salvar” e “Publicar” são conceitos diferentes, mas a interface não os explica

Os editores salvam alterações no rascunho local e o cabeçalho mostra apenas `Publicar`. O texto do botão não explica que:

- editar já salva um rascunho;
- o site público ainda não mudou;
- publicar coloca tudo no ar;
- publicar pode publicar alterações de vários módulos ao mesmo tempo.

Evidência:

- `app/admin/components/AdminHeader.tsx:157-172`
- `app/admin/components/useAdminShell.ts:180-232`
- `components/nua/admin/ContactEditor.tsx:27-31`

Impacto: a cliente pode achar que perdeu uma alteração, publicar sem revisar ou acreditar que cada formulário tem seu próprio botão de publicação.

Correção recomendada:

- usar no cabeçalho o texto `Há alterações salvas como rascunho`;
- trocar `Publicar` por `Publicar no site`;
- abrir confirmação com resumo: `3 alterações em Vitrine, 1 alteração em Contato`;
- exibir `Rascunho salvo` próximo ao formulário;
- manter uma prévia claramente rotulada como `Prévia — ainda não está no ar`.

### P0 — O módulo “Vitrine & Capa” concentra tarefas que a cliente entende como páginas diferentes

O módulo `vitrine` encaminha hero, galeria, sobre, institucional e SEO. Para o código isso é conveniente; para a cliente são tarefas distintas.

Evidência:

- `app/admin/components/AdminModuleRouter.tsx:40-70`
- `components/nua/admin/VitrineCapaModule.tsx`

Impacto: ao procurar “Sobre Mim” ou “Galeria”, a cliente não encontra uma entrada correspondente. Ela precisa entrar em “Vitrine & Capa” e descobrir abas internas.

Correção recomendada: preservar o módulo técnico internamente, mas expor uma tela de entrada com cartões de tarefa:

```text
Editar capa
Editar galeria
Editar Sobre Mim
Editar SEO e compartilhamento
Editar textos institucionais
```

Cada cartão deve ter uma frase simples e uma ação direta.

### P0 — Ferramentas beta aparecem para a cliente como se fossem parte do produto final

A barra lateral exibe “Player de Áudio” e “IA Automação” na navegação principal, com selo `BETA` e `DEV`.

Evidência:

- `components/nua/admin/AdminSidebar.tsx:124-188`

Impacto: “BETA”, “DEV” e “Automação” comunicam instabilidade e linguagem interna. A cliente pode clicar por curiosidade e perder confiança ou não saber se deve usar.

Correção recomendada: esconder por padrão. Se for necessário manter acesso, mover para `Configurações > Ferramentas experimentais` e mostrar uma explicação de uma linha.

---

## 2. Problemas de nomenclatura

### “Conteúdos & Packs” não é autoexplicativo

“Pack” é termo de negócio interno. A cliente pode não saber se ali ficam fotos, vídeos, produtos ou vendas.

Recomendação: `Produtos e Conteúdos`.

### “Personalizados” é amplo demais

Não fica evidente se é para criar um produto ou atender um pedido já recebido.

Recomendação: `Pedidos Personalizados`.

### “Conexões & Redes” mistura redes sociais e contato

O manual separa “Redes & OnlyFans” e “Contato”, enquanto o código mistura ambos.

Recomendação: `Redes e Contato`.

### “Cofre de credenciais” expõe um conceito técnico

“Credenciais” e “cofre” são termos de infraestrutura. A cliente provavelmente precisa de “Acessos importantes”.

Recomendação: `Acessos e Senhas` com uma explicação de segurança.

### “Mensalidade do Site” fica no cabeçalho, fora da lógica de navegação

É uma cobrança operacional e aparece como um botão global ao lado de publicar, alertas e ver site.

Impacto: parece uma ação urgente ou uma função central do trabalho editorial.

Recomendação: manter apenas um status discreto no menu de Configurações/Financeiro e reservar o cabeçalho para tarefas frequentes.

### “Alertas & Sistema” não deixa claro que contém pedidos

O conteúdo real é uma central de pedidos, chamadas e packs, mas o nome prioriza “Sistema”.

Recomendação: `Novos Pedidos` ou `Central de Pedidos`.

---

## 3. Problemas de hierarquia

### Todas as tarefas parecem ter o mesmo peso

Na barra lateral, editar o site, atender um pedido, consultar contrato e abrir o player têm peso visual semelhante.

A cliente precisa de uma hierarquia baseada na frequência:

1. tarefas urgentes: novos pedidos e chamadas;
2. tarefas recorrentes: conteúdo e mídia;
3. tarefas ocasionais: edição do site;
4. tarefas administrativas: financeiro e contratos;
5. ferramentas avançadas: cofre, IA, player e diagnósticos.

### A tela inicial não funciona como uma central de trabalho

O módulo padrão é `conteudos`, mas não há evidência de uma home com “o que precisa ser feito agora”. A cliente recebe navegação, não orientação.

Recomendação: criar um painel inicial com quatro blocos:

- `Pedidos aguardando atendimento`;
- `Chamadas próximas`;
- `Alterações do site em rascunho`;
- `Atalhos para tarefas frequentes`.

### Badges mostram quantidade, mas não ação

Os badges indicam números de pedidos e alertas, mas não distinguem claramente:

- novo;
- pendente de pagamento;
- aguardando produção;
- aguardando resposta;
- atrasado.

Recomendação: usar texto de estado dentro da lista, por exemplo `3 aguardando sua resposta`, em vez de apenas `3`.

---

## 4. Problemas nos fluxos de tarefa

### Editar capa

Fluxo atual provável:

```text
Vitrine & Capa -> descobrir aba interna -> editar -> perceber alteração -> procurar Publicar
```

Fluxo recomendado:

```text
Editar Site -> Capa -> editar -> Rascunho salvo -> Ver prévia -> Publicar no site
```

### Adicionar foto

O painel distribui a tarefa entre biblioteca, seletor, galeria, hero e modais. A cliente precisa saber primeiro se a foto é:

- apenas armazenada;
- usada na capa;
- usada na galeria pública;
- preview de produto;
- mídia privada de entrega.

Recomendação: começar por `Biblioteca de Mídia`, com ações explícitas em cada foto:

```text
Usar na capa
Usar na galeria
Usar como preview
Guardar como conteúdo privado
```

### Atender pedido personalizado

O fluxo envolve pagamento, produção, mídia, cofre e conclusão. A interface precisa mostrar uma linha do tempo única, não espalhar decisões por várias abas.

Recomendação de etapas visíveis:

```text
Recebido -> Pagamento confirmado -> Em produção -> Arquivos enviados -> Entregue
```

### Agendar chamada

O painel usa o conceito de “modalidades”, disponibilidade, fila e links. Para a cliente, a tarefa deveria ser apresentada como:

```text
Configurar horários
Ver próximas chamadas
Confirmar chamada
Enviar link
```

### Alterar contato

O editor mostra textos de configuração, mas não necessariamente uma prévia contextualizada do formulário público. Isso aumenta o risco de editar um texto sem entender onde ele aparecerá.

Recomendação: cada campo deve indicar `Aparece em: janela de contato da página inicial` e oferecer prévia lado a lado.

---

## 5. Feedback e confiança

### Publicação global é pouco explícita

O botão `Publicar` não informa escopo. A cliente pode não saber se está publicando somente a tela atual ou todas as mudanças acumuladas.

### Toasts desaparecem

Mensagens como “alterações gravadas no rascunho” aparecem em toasts temporários. Se a cliente estiver no celular ou distraída, perde a confirmação.

Recomendação: manter um estado persistente no cabeçalho do formulário:

```text
Rascunho salvo agora
Ainda não publicado
```

### Erro de publicação pode ser técnico demais

O shell mostra o erro retornado, mas não há garantia de que a mensagem seja orientada à ação. A cliente precisa receber:

```text
Não conseguimos publicar porque sua sessão expirou.
Entre novamente e tente publicar. Seu rascunho foi preservado.
```

### “No ar” não explica o que está no ar

O indicador `No ar` é positivo, mas não informa data/hora da última publicação. Recomendação: `No ar — atualizado hoje às 14:32`.

---

## 6. Problemas de linguagem

Há mistura de linguagem editorial, técnica e de desenvolvedor:

```text
CMS
BETA
DEV
Spotlight
IA Automação
SEO
oEmbed
cofre
credenciais
```

Nem todos os termos precisam desaparecer, mas a cliente deve ver o benefício, não a implementação.

| Termo atual | Texto recomendado |
|---|---|
| Spotlight | Busca rápida |
| Conteúdos & Packs | Produtos e conteúdos |
| Personalizados | Pedidos personalizados |
| Cofre de credenciais | Acessos e senhas |
| Alertas & Sistema | Novos pedidos |
| Player de Áudio | Música do site |
| IA Automação | Assistente da Nua |
| Mensalidade do Site | Manutenção do site |
| Publicar | Publicar no site |
| No ar | Site atualizado |

---

## 7. Acessibilidade que também afeta clareza

Mesmo sem uma execução com leitor de tela, a leitura estática mostra riscos que também prejudicam usuários comuns:

### Texto muito pequeno

O Admin usa muitos textos em `text-[9px]`, `text-[10px]` e `text-[11px]`. Isso reduz legibilidade, especialmente no celular.

Recomendação:

- texto de corpo: mínimo 14px;
- labels: mínimo 12px;
- badges: mínimo 11px;
- evitar transformar labels em caixa alta monoespaçada muito pequena.

### Ícones sem explicação suficiente

O cabeçalho possui ações iconográficas para alertas e busca. Elas têm `aria-label` ou `title` em alguns casos, mas a experiência de descoberta para a cliente ainda depende de reconhecer o ícone.

Recomendação: manter texto visível para ações importantes em desktop e usar tooltip apenas como complemento.

### Mudança de módulo sem foco evidente

O painel usa `history.pushState` para trocar módulos. Não há evidência, no shell, de mover foco para o título do novo módulo ou anunciar a mudança. Isso prejudica teclado e também a orientação de qualquer pessoa que perca o contexto visual.

### Modais e drawers

O sistema possui muitos modais, drawers, preview e seletor de imagens. Cada um precisa garantir:

- título claro;
- fechamento por Esc;
- foco inicial;
- foco restaurado ao botão que abriu;
- fundo inerte;
- ação principal visível.

---

## 8. O que eu mudaria primeiro

### Fase 1 — reduzir confusão sem reescrever o Admin

1. Atualizar o manual para os nomes reais imediatamente.
2. Renomear itens da barra lateral para linguagem da cliente.
3. Esconder `BETA`, `DEV`, Player e IA da navegação principal.
4. Renomear `Publicar` para `Publicar no site`.
5. Exibir `Rascunho salvo` e `Ainda não publicado` de forma persistente.
6. Renomear `Alertas & Sistema` para `Novos pedidos`.
7. Adicionar descrição curta abaixo do título de cada módulo.

### Fase 2 — transformar módulos em tarefas

1. Dividir Vitrine em cartões: Capa, Galeria, Sobre Mim e SEO.
2. Dividir Conexões em Redes e Contato.
3. Criar uma home operacional com pendências.
4. Mostrar estados de pedidos em linguagem humana.
5. Colocar prévia contextual ao lado dos editores.

### Fase 3 — melhorar os fluxos

1. Criar linha do tempo para personalizados.
2. Criar linha do tempo para chamadas.
3. Criar confirmação de publicação com resumo de alterações.
4. Criar recuperação de sessão expirada sem perder o contexto.
5. Testar os fluxos reais com a cliente, sem explicar previamente o caminho.

---

## 9. Teste rápido com a cliente

Antes de alterar muita coisa, pedir para ela realizar estas tarefas sem ajuda:

1. trocar a foto da capa;
2. adicionar uma foto à galeria;
3. alterar o texto “Sobre Mim”;
4. mudar o link do OnlyFans;
5. publicar uma alteração;
6. encontrar um pedido personalizado;
7. configurar um horário de chamada.

Para cada tarefa, medir:

- se ela encontra o primeiro menu correto;
- quantos cliques faz;
- onde pergunta “é aqui?”;
- se entende quando a alteração foi salva;
- se entende quando foi publicada;
- se consegue desfazer ou recuperar um erro.

Não explicar os nomes durante o teste. Se ela perguntar o que significa um item, isso é evidência de problema de linguagem.

---

## 10. Veredito

O Admin tem recursos suficientes, mas está organizado segundo a estrutura técnica do projeto e não segundo as tarefas mentais da cliente.

As maiores fontes de confusão são:

1. manual desatualizado em relação à navegação real;
2. excesso de módulos na barra lateral;
3. termos técnicos e internos;
4. Vitrine concentrando várias páginas diferentes;
5. distinção pouco clara entre salvar, rascunho e publicar;
6. ferramentas beta misturadas com operações reais;
7. falta de uma tela inicial orientada por pendências;
8. feedback temporário e pouco contextual;
9. pedidos e agenda sem fluxo visual de etapas;
10. interface pensada para quem construiu o sistema, não para quem precisa operar o negócio.

Minha recomendação é não começar por uma grande refatoração técnica. Primeiro fazer uma camada de clareza: vocabulário, agrupamento, estados e orientação. Isso tende a reduzir a dificuldade da cliente rapidamente, com menor risco para o código existente.
