# 📋 AUDITORIA COMPLETA E PLANO DE REFORMULAÇÃO ESTRUTURAL
## Painel Administrativo Oficial — Nua Borges
### *Organização, Coerência, Usabilidade e Experiência Humanizada para a Cliente*

---

> **Status do Documento:** Concluído — Pronto para Avaliação  
> **Diretriz de Escopo:** Exclusivo ao projeto NUA Borges. Zero alteração em código nesta etapa (`NAO EDITE NADA, SOMENTE FAÇA UM DOCUMENTO`).  
> **Regra de Design:** Preservação integral e inegociável da identidade visual (paleta noir `#000000`, blush `#f4a7b9`, tipografia, microinterações e botões existentes).  
> **Data da Auditoria:** 13 de Outubro de 2026  
> **Autor da Auditoria:** Philippe (Arquiteto e Desenvolvedor Fullstack)

---

## SUMÁRIO EXECUTIVO

A presente auditoria foi executada com o propósito de avaliar, diagnosticar e estruturar a reformulação arquitetural profunda do **Painel Administrativo da Nua Borges** (`nuaborges-admin`). 

O painel foi construído sobre uma base técnica extremamente robusta (Next.js 15, Cloudflare Pages Edge Functions para deploy/proxy, Supabase PostgreSQL, Backblaze B2 para mídias, fallback para localStorage e segurança Nível 5). No entanto, o crescimento acelerado de novas funcionalidades ao longo dos ciclos de desenvolvimento (agendamento de chamadas de vídeo, venda de conteúdos avulsos sob demanda, captação VIP, gestão financeira de mensalidades com emissão de recibos em PDF, sistema próprio de música e integração com a Nua IA) gerou um **descompasso entre a capacidade técnica do sistema e a experiência cotidiana de uma cliente leiga em tecnologia**.

### Principais Conclusões da Auditoria:
1. **Design Visual Perfeito, Organização Fragmentada:** O visual é elogiado e sofisticado (estética sensual elegante, preto profundo com acentos em blush e tipografia com fontes nobres). A reformulação **não deve mexer em nenhum pixel visual**, mas sim na **lógica de navegação, agrupamento de seções, textos e fluxos de uso**.
2. **Confusão Crítica entre Biblioteca de Mídia e Galeria do Site:** A cliente se depara com termos sobrepostos ("Biblioteca de Mídia", "Galeria do Site", "Álbuns & Coleções", "Ensaios", "Fotos da Capa"), sem compreender com clareza o que é o *armazém de arquivos* (cofre seguro) e o que é a *vitrine publicada* (o que o visitante vê).
3. **Componentes Órfãos e Ocultos no Código:** Ferramentas funcionais completas foram criadas mas estão invisíveis para a cliente:
   - `InstitutionalEditor.tsx` (gestão dos links de Termos de Uso, Privacidade, Contrato e Regulamentos) — completamente ausente da barra de abas.
   - `MusicEditor.tsx` e `MusicLibrary.tsx` (trilha sonora oficial e player do site) — ausente da barra de abas.
   - `ClientRequestsEditor.tsx` (canal direto de chamados e melhorias com o Philippe) — desativado com `hidden: true`.
   - `content.header` (monograma da logo, exibição de botões no topo) — sem formulário no admin.
4. **Sobrecarga Cognitiva em Telas Específicas:** O editor de *Conteúdos Avulsos* (`AvulsosEditor.tsx`) acumula mais de 1.100 linhas de código misturando: cadastro de produtos digitais, upload de vídeos, cálculo de duração, miniaturas E a lista de contatos captados do WhatsApp ("Lista VIP").
5. **Jargões de Desenvolvedor Expostos:** Campos com nomes técnicos como `cinematicCoverLayout`, `fullVerticalPhoto`, `pullQuote`, `eyebrow`, `slug`, `numericPrice`, `Anti-Scraping Ativo` e `CDN Cloudflare com SSL` geram insegurança na cliente, que teme desconfigurar o site ao tocar neles.

---

## 1. DIRETRIZES FUNDAMENTAIS E REGRAS INEGOCIÁVEIS

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DIRETRIZES DA REFORMULAÇÃO                      │
├────────────────────────────────┬───────────────────────────────────────┤
│ 1. PRESERVAÇÃO VISUAL TOTAL    │ Paleta (#000000, #09090c, #f4a7b9),   │
│                                │ tipografia serif/script/sans, botões, │
│                                │ cantos arredondados, sombras e cards. │
├────────────────────────────────┼───────────────────────────────────────┤
│ 2. LINGUAGEM DA CLIENTE        │ Substituição de termos de programação │
│                                │ por vocabulário funcional e afetivo.  │
├────────────────────────────────┼───────────────────────────────────────┤
│ 3. INTEGRIDADE DOS DADOS       │ Zero perda de mídias, textos, rascunhos│
│                                │ salvos ou vínculos com o site público.│
├────────────────────────────────┼───────────────────────────────────────┤
│ 4. ISOLAMENTO NUA vs DEV       │ O Admin Geral de Philippe (phdev.store│
│                                │ permanece intocado e 100% separado.   │
└────────────────────────────────┴───────────────────────────────────────┘
```

---

## 2. ETAPA 1 — MAPEAMENTO COMPLETO DE TODAS AS ÁREAS DO ADMIN

A estrutura do Admin foi inspecionada nos seguintes arquivos canônicos:
- Ponto de Entrada: `app/admin/page.tsx`
- Layout e Envoltório: `app/admin/layout.tsx`
- Cabeçalho Superior: `components/nua/admin/AdminHeader.tsx`
- Tela de Acesso: `components/nua/admin/AdminLogin.tsx`
- Editores e Seções: `components/nua/admin/*.tsx` (16 componentes principais)
- Modais e Ferramentas: 8 modais dedicados
- Camada de Dados e Sincronização: `lib/contentStore.ts`, `lib/types.ts`, `lib/mediaUsage.ts`

### 2.1. Inventário Atual das Abas em `app/admin/page.tsx`

| ID da Aba | Nome Visível Atual | Arquivo Responsável | Finalidade Atual | Estado |
| :--- | :--- | :--- | :--- | :--- |
| `hero` | **Início & Capa** | `HeroEditor.tsx` | Edita fotos do carrossel da capa, título, boas-vindas, botão CTA e logo. | Ativa |
| `library` | **Biblioteca de Mídia** | `LibraryEditor.tsx` | Armazena todas as fotos/vídeos enviados, cria álbuns e favoritos. | Ativa |
| `gallery` | **Galeria do Site** | `GalleryEditor.tsx` | Lista as fotos que aparecem na esteira fotográfica da página inicial. | Ativa |
| `avulsos` | **Conteúdos Avulsos & VIP** | `AvulsosEditor.tsx` | Packs pagos, fotos prévias, vídeos, preços e tabela de contatos VIP. | Ativa (Sobrecarga) |
| `appointments` | **Chamadas de Vídeo** | `AppointmentsEditor.tsx` | Agenda de chamadas, horários, tipos de sessão, pagamentos Pix. | Ativa (Sub-abas) |
| `about` | **Sobre Mim** | `AboutEditor.tsx` | Foto de perfil, apresentação profissional, manifesto e citação. | Ativa |
| `channels` | **Redes & Plataformas** | `ChannelsEditor.tsx` | OnlyFans, Privacy, Close Fans, Instagram e banner de contato. | Ativa |
| `contact` | **Contato** | `ContactEditor.tsx` | E-mail oficial de recebimento e opções de assuntos do formulário. | Ativa (Isolada) |
| `requests` | **Meus Pedidos** | `ClientRequestsEditor.tsx` | Canal de chamados e pedidos diretos com o desenvolvedor Philippe. | **Oculta (`hidden: true`)** |
| `finance` | **Financeiro** | `FinanceEditor.tsx` | Mensalidades de desenvolvimento (10x R$ 200), QR Code Pix e PDFs. | Ativa |
| `seo` | **Ajustes** | `SeoEditor.tsx` | Google/WhatsApp, rodapé, aviso anti-cópia e botão de restaurar. | Ativa (Mista) |

### 2.2. Áreas Órfãs ou Ausentes na Navegação

1. **`InstitutionalEditor.tsx` (Páginas Legais & Institucional):**  
   Componente pronto, com CRUD completo de links (Termos de Uso, Política de Privacidade, Contrato de Prestação de Serviços, Regulamentos, ícones jurídicos). Não possui entrada no menu de abas.
2. **`MusicEditor.tsx` & `music/MusicLibrary.tsx` (Trilha Sonora Oficial):**  
   Componente pronto com upload de áudios (MP3/WAV/M4A), player de prévia do site, ativação/desativação de faixas e CDN próprio. A cliente não tem como acessar nem trocar músicas sem intervenção manual no código.
3. **Configurações do Topo (`content.header`):**  
   Armazena `brandMonogram` (ex: "NB"), exibição do botão de OnlyFans no menu superior e exibição do ícone do Instagram. Não existe formulário no painel para isso.

### 2.3. Mapeamento de Modais e Caixas de Diálogo

- `ImagePickerModal.tsx`: Selecionador universal de fotos da biblioteca para aplicar em seções.
- `MediaViewerModal.tsx`: Inspeção detalhada de uma foto (renomear, favoritar, ver em quais seções do site ela está sendo usada, adicionar a álbum, link público).
- `AlbumCreateModal.tsx`: Criação e edição de álbuns de fotos.
- `AlbumMediaSelectorModal.tsx`: Seleção em lote de fotos do acervo para alimentar um álbum.
- `PaymentModal.tsx`: Geração de QR Code Pix e Copia e Cola automático para quitação de mensalidades.
- `ReceiptModal.tsx`: Visualização e download de recibo oficial de pagamento assinado digitalmente em PDF.
- `PreviewModal.tsx`: Simulação do site público em tempo real nos modos Celular (390px), Tablet (768px) e Computador (1240px).
- `ConfirmModal.tsx`: Modal genérico de confirmação para ações de exclusão segura.
- `ConflictModal` (em `app/admin/page.tsx`): Detecção de conflito quando outro dispositivo publicou alterações mais recentes no servidor Cloudflare.

---

## 3. ETAPA 2 — AUDITORIA CRÍTICA DETALHADA POR ÁREA

### 3.1. Cabeçalho Geral (`AdminHeader.tsx`)
- **Problema:** Mostra o status ("Site no ar atualizado" ou "Rascunho salvo • Alterações pendentes") e o botão "Publicar no Site", mas **não oferece um botão direto de "Ver Meu Site no Ar" ou "Pré-visualizar como no Celular"**. A cliente edita, clica em publicar e fica em dúvida sobre como conferir se realmente entrou no ar sem precisar digitar a URL em outra aba.
- **Risco:** Insegurança sobre a efetivação das mudanças.

### 3.2. Aba "Início & Capa" (`HeroEditor.tsx`)
- **Problema 1 (Terminologia incompreensível):** Os toggles *"Foto de Fundo em Tela Cheia"* (`cinematicCoverLayout`) e *"Preencher Toda a Altura da Tela"* (`fullVerticalPhoto`) utilizam termos abstratos. Para a cliente, os dois nomes soam como a mesma coisa.
- **Problema 2 (Campo técnico de scroll):** O campo *"Texto de Convite do Rodapé da Capa (Scroll)"* possui uma descrição longa ("Frase em destaque acima da seta no final da capa convidando o visitante a descer até a galeria"). O nome simples e direto deveria ser: *"Chamada para rolar a página"*.
- **Problema 3 (Configuração de Logo):** A alternância entre exibir o nome em texto ou uma imagem de logo PNG tem instruções sobre "fundo transparente", mas não mostra visualmente a diferença entre as duas opções antes da escolha.
- **Problema 4 (Reordenação de fotos):** Utiliza setas horizontais (`<` e `>`), enquanto o carrossel no celular funciona como uma sequência vertical/fade. A indicação de ordem deveria ser por numeração clara (Foto 1 — Capa Principal, Foto 2, Foto 3...).

### 3.3. Aba "Biblioteca de Mídia" (`LibraryEditor.tsx`)
- **Problema 1 (Falta de distinção de propósito):** A cliente pergunta: *"Se eu subir uma foto aqui, ela já aparece no meu site?"*. O sistema não deixa claro que a Biblioteca é o seu **arquivo pessoal** e não a página pública.
- **Problema 2 (Linguagem técnica exposta):** Exibe badges como `"Otimização Automática Ativa"`, datas no formato cru, tamanhos em `"KB"` e metadados que não agregam valor à criadora de conteúdo.
- **Problema 3 (Rastreamento incompleto de uso):** O utilitário `getMediaUsage.ts` só verifica `hero`, `about`, `gallery`, `seo` e `albums`. Se uma foto ou vídeo estiver sendo utilizado em um **Conteúdo Avulso (Pack)**, a biblioteca exibe `"0 locais (não utilizada)"`, induzindo a cliente a pensar que o arquivo pode ser descartado.
- **Problema 4 (Operações em lote limitadas):** Para adicionar fotos a um álbum, existe um fluxo; mas para favoritar ou excluir várias fotos, ela precisa abrir uma por uma.

### 3.4. Aba "Galeria do Site" (`GalleryEditor.tsx`)
- **Problema 1 (Confusão com Álbum):** Cada item é chamado de *"Novo Ensaio"*. Como a Biblioteca também tem *"Álbuns"*, a cliente não sabe se um Ensaio da Galeria deveria ser o mesmo Álbum da Biblioteca.
- **Problema 2 (Campos desnecessários por foto):** Exige obrigatoriamente um link de destino (`linkUrl`), sugerindo por padrão o OnlyFans. Para a maioria das fotos da galeria, a intenção da cliente é apenas mostrar a foto em alta resolução em tela cheia (lightbox), e não redirecionar para fora do site.
- **Problema 3 (Status de exibição visualmente fraco):** O ícone de olho (`Eye` / `EyeOff`) não tem texto explicativo explícito ao lado, dependendo de tooltip que não funciona no celular.

### 3.5. Aba "Conteúdos Avulsos & VIP" (`AvulsosEditor.tsx`)
- **Problema 1 (Duas funções críticas misturadas):** Esta é a tela mais sobrecarregada do sistema. Ela mistura o **Catálogo de Venda de Obras Unitárias (E-commerce)** com a **Lista de Leads do WhatsApp (Marketing de Relacionamento)**.
- **Problema 2 (Complexidade excessiva por produto):** Cada pack possui 12 campos: `Título`, `Preço em R$`, `Preço numérico`, `Duração`, `Badge promocional`, `Descrição curta`, `Descrição longa`, `Formato`, `Quantidade de fotos`, `Trilha sonora`, `Ambiente`, `Vídeos` e `Fotos de prévia`. A cliente desiste de cadastrar itens por excesso de formulário.
- **Problema 3 (Mecanismo oculto de detecção de vídeo):** O script `autoDetectVideoMetadata` tenta carregar o vídeo em elemento oculto e, se falhar por limite de banda ou CORS, preenche fixo `"12 Minutos (4K UHD)"`. A cliente não percebe que o valor veio pré-fixado.
- **Problema 4 (Lista VIP sem visibilidade):** Os contatos de fãs que se cadastram no site ficam espremidos no final de uma página quilométrica.

### 3.6. Aba "Chamadas de Vídeo" (`AppointmentsEditor.tsx`)
- **Problema 1 (Terminologia administrativa):** Utiliza termos como `queue`, `modalities`, `settings`, `manual_confirmed`, `approved` e `webhook`.
- **Problema 2 (Dificuldade de localizar o link da chamada):** O campo para colar o link da sala privativa (Google Meet, Whereby ou Jitsi) e as instruções de acesso para o cliente ficam dentro de um submenu de ações que não se destaca.
- **Problema 3 (Separação confusa de horários):** A cliente precisa navegar entre "Grade / Calendário" e "Configurações da Agenda" para definir em quais dias da semana atende.

### 3.7. Aba "Sobre Mim" (`AboutEditor.tsx`)
- **Problema 1 (Duplicação de assinaturas):** O campo *"Assinatura afetiva"* (ex: `"Deixa de vergonha ♡"`) é configurado nesta aba, mas a *"Frase de Assinatura do Rodapé"* é configurada na aba "Ajustes" (`SeoEditor.tsx`).
- **Problema 2 (Rigidez dos textos):** Os textos são divididos em `Parágrafo 1` e `Parágrafo 2`. A cliente se sente presa em preencher exatamente dois blocos separados, quando gostaria de escrever sua biografia de forma fluida.
- **Problema 3 (Nomenclatura técnica):** O campo `pullQuote` é apresentado como *"Pensamento em Destaque (Citação com Barra Rosa)"*, focando na implementação estética em vez do propósito editorial.

### 3.8. Aba "Redes & Plataformas" (`ChannelsEditor.tsx`) e "Contato" (`ContactEditor.tsx`)
- **Problema 1 (Fragmentação de canais de contato):** Em `ChannelsEditor`, existe a configuração do *"Banner de Contato Comercial"*; já em `ContactEditor`, configura-se o e-mail de recebimento e os assuntos. A cliente precisa navegar por duas abas diferentes para editar como as pessoas falam com ela.
- **Problema 2 (Excesso de campos repetitivos):** Cada plataforma (OnlyFans, Privacy, Close Fans, Instagram) repete blocos idênticos de badges, tags e botões que raramente precisam ser alterados.

### 3.9. Aba "Ajustes" (`SeoEditor.tsx`) — O "Depósito de Configurações"
- **Problema 1 (Mistura heterogênea):** Reúne num mesmo lugar a prévia do WhatsApp (marketing), o rodapé do site (layout), um cartão estático sobre anti-scraping (infraestrutura) e o botão destrutivo de "Restaurar Conteúdo Original".
- **Problema 2 (Falso controle técnico):** O bloco de segurança com badges como *"Anti-Scraping Ativo"*, *"Proteção de Download Fácil"* e *"CDN Cloudflare com SSL"* é puramente informativo, não permite nenhuma ação da cliente e apenas polui a interface com termos de servidor.
- **Problema 3 (Perigo operacional):** O botão *"Restaurar Tudo"* fica no final da página. Embora protegido por modal de confirmação, é arriscado mantê-lo ao lado de configurações de rotina.

### 3.10. Aba "Financeiro" (`FinanceEditor.tsx`)
- **Problema 1 (Ambiguidade de papel):** Nua vende conteúdos e chamadas, mas esta aba é exclusiva para **pagar a mensalidade de desenvolvimento e suporte do site para o Philippe**. Se o título for apenas "Financeiro", ela pode confundir com seus relatórios de vendas.
- **Problema 2 (Texto de diagnóstico residual):** Código de fallback faz referência explícita à data `"05/10/2026"`, expondo detalhes de sincronização no console/localStorage.

### 3.11. As Três Áreas Ocultas que Precisam de Resgate
1. **`ClientRequestsEditor.tsx` ("Meus Pedidos"):**  
   Este componente é uma das melhores criações do projeto: permite que a Nua digite um pedido de alteração para o Philippe (ex: *"Quero trocar a cor do banner de Natal"*), veja o status em tempo real (*"Recebido"*, *"Em Análise"*, *"Em Desenvolvimento"*, *"Concluído"*), troque mensagens e ouça um chime de áudio quando o chamado for concluído. Estar oculto (`hidden: true`) força a cliente a usar WhatsApp para tudo, perdendo o registro centralizado.
2. **`InstitutionalEditor.tsx` ("Páginas Legais"):**  
   O site possui páginas públicas completas: `/contrato`, `/termos`, `/privacidade`. Se a Nua quiser alterar o texto do contrato ou adicionar um link de FAQ, ela não tem onde clicar.
3. **`MusicEditor.tsx` ("Música do Site"):**  
   A cliente não tem controle sobre a música ambiente que toca no player da página inicial.

---

## 4. ETAPA 3 — O GRANDE DILEMA: BIBLIOTECA DE MÍDIA VS GALERIA DO SITE

A relação entre **mídias armazenadas** e **mídias exibidas** é o ponto de maior atrito em todo o sistema. A análise identificou a causa raiz e definiu a solução estrutural.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   A CONFUSÃO ATUAL NA MENTE DA CLIENTE                │
├────────────────────────────────────────────────────────────────────────┤
│ "Subi 10 fotos na 'Biblioteca de Mídia'. Por que elas não aparecem     │
│  na galeria quando eu abro o site?"                                    │
│                                                                        │
│ "Criei um 'Álbum' na Biblioteca chamado 'Ensaio I'. Mas na aba         │
│  'Galeria' existe outro botão de 'Adicionar Novo Ensaio'. Qual é qual?" │
│                                                                        │
│ "Se eu apagar uma foto da Galeria, ela é excluída do meu celular?      │
│  E se eu apagar da Biblioteca, quebra o site?"                         │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.1. Definição Rígida das Responsabilidades

Para resolver definitivamente o problema sem alterar o banco de dados nem quebrar código, estabelecemos papéis claros e nomes transparentes:

| Conceito | Nome Recomendado | O que realmente é | Quem vê | O que acontece ao excluir |
| :--- | :--- | :--- | :--- | :--- |
| **Storage Backblaze B2** | **Cofre de Mídias (Seu Acervo)** | O armazém seguro na nuvem onde ficam guardadas todas as fotos e vídeos já enviados. | Só a Nua | **Aviso de segurança:** Se a foto estiver em uso no site, o sistema impede a exclusão para não deixar buracos no ar. |
| **Homepage Section** | **Galeria de Ensaios no Site** | A vitrine pública na página inicial. Mostra apenas as fotos selecionadas que os visitantes devem ver rolando na tela. | Todo o público da internet | **Remover do ar:** A foto sai da página inicial, mas continua guardada e segura no Cofre para ser reutilizada quando quiser. |
| **Álbuns** | **Coleções do Acervo** | Pastas organizadoras dentro do cofre (ex: "Ensaio Praia 2026", "Fotos de Rosto", "Vídeos Curtos"). | Só a Nua | Apagar o álbum desfaz a pasta, mas **não apaga as fotos do acervo**. |
| **Packs Avulsos** | **Produções Sob Demanda** | Vitrine comercial com botão de compra para fotos e vídeos vendidos individualmente. | Visitantes que querem comprar | O pack é desativado ou removido da loja. |

### 4.2. Melhorias Estruturais a Implementar na Galeria e Biblioteca

1. **Indicador Visual de Presença no Site:**  
   Em cada foto da Biblioteca, exibir uma etiqueta clara e colorida:
   - 🟢 `No ar na Capa`
   - 🌸 `No ar na Galeria`
   - 💎 `No ar no Sobre Mim`
   - 🛍️ `No ar nos Avulsos`
   - ⚪ `Apenas guardada no Acervo (não publicada)`
2. **Ação Rápida de 1 Toque "Colocar na Galeria":**  
   Dentro do visualizador de qualquer foto do cofre (`MediaViewerModal`), o botão *"Adicionar à Galeria"* deve permitir digitar a legenda artística imediatamente, sem precisar ir até a aba Galeria.
3. **Correção do Rastreamento de Uso (`getMediaUsage.ts`):**  
   Expandir a função para varrer também os itens de `content.avulsos.items` (`previewImages`, `videos`, `imageUrl`). Assim, nenhuma mídia de pack será dada falsamente como "não utilizada".
4. **Proteção Contra Limpeza Destrutiva:**  
   Se a cliente tentar apagar do cofre uma foto que está ativa na Capa, na Galeria ou em um Pack, o modal de confirmação bloqueia a exclusão direta com um aviso acolhedor:  
   *`"Esta foto está sendo exibida no seu site (Galeria). Para apagá-la do acervo com segurança, primeiro substitua ou remova-a da Galeria."`*

---

## 5. ETAPA 4 — NOVA ARQUITETURA DE INFORMAÇÃO E REORGANIZAÇÃO DAS ABAS

Para eliminar a sensação de "11 abas soltas sem hierarquia", propomos uma **organização intuitiva dividida em 4 Áreas de Trabalho Lógicas**, respeitando o modo como a criadora pensa o seu negócio digital.

Visualmente, a barra de navegação continuará usando as pílulas arredondadas com fundo escuro e acento em blush (exatamente como já existe), mas com uma divisão clara e títulos compreensíveis.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        NOVA ARQUITETURA DE NAVEGAÇÃO DO ADMIN                         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   🌸 1. O QUE APARECE NO SITE (CONTEÚDO & VITRINE)                                      │
│      ├── [ 1. Capa & Boas-Vindas ]      (Hero, textos principais, fotos de abertura)  │
│      ├── [ 2. Galeria de Ensaios ]      (Fotos artísticas da página inicial)          │
│      ├── [ 3. Sobre Mim & História ]    (Biografia, manifesto e retrato autoral)      │
│      └── [ 4. Canais & Redes Sociais ]  (OnlyFans, Privacy, Close Fans e Contato)     │
│                                                                                        │
│   📸 2. ARQUIVOS & MULTIMÍDIA (SEU ACERVO)                                             │
│      ├── [ 5. Cofre de Fotos & Vídeos ] (Biblioteca central, álbuns e uploads)        │
│      └── [ 6. Música do Site ]          (Trilha sonora relaxante e player)            │
│                                                                                        │
│   💎 3. VENDAS & ATENDIMENTO VIP (SEUS GANHOS)                                         │
│      ├── [ 7. Conteúdos Avulsos ]       (Catálogo de packs e produções unitárias)     │
│      ├── [ 8. Chamadas de Vídeo ]       (Agenda, horários e sessões privadas)         │
│      └── [ 9. Contatos VIP ]            (Lista de fãs cadastrados no WhatsApp)        │
│                                                                                        │
│   ⚙️ 4. PLATAFORMA & SUPORTE                                                           │
│      ├── [ 10. Páginas Legais ]         (Termos de Uso, Privacidade e Contrato)       │
│      ├── [ 11. Divulgação & WhatsApp ]  (Como o site aparece nas buscas e redes)      │
│      ├── [ 12. Mensalidades do Site ]   (Pagamento das parcelas e recibos em PDF)     │
│      └── [ 13. Pedidos ao Desenvolvedor](Fale com o Philippe, solicite melhorias)     │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.1. Tabela Comparativa: Estrutura Atual vs Nova Estrutura Reorganizada

| Aba Atual | Problemas Encontrados | Novo Destino e Organização | Ganho para a Cliente |
| :--- | :--- | :--- | :--- |
| `hero` (Início & Capa) | Toggles com nomes técnicos (`cinematicCoverLayout`, `fullVerticalPhoto`). | **Capa & Boas-Vindas** (mantém o componente, simplifica os textos explicativos). | Compreensão imediata dos efeitos visuais da capa. |
| `gallery` (Galeria do Site) | Exige link externo obrigatório em fotos de portfólio. | **Galeria de Ensaios** (torna o link opcional, foca na legenda artística). | Menos campos para preencher, navegação mais fluida. |
| `about` (Sobre Mim) | Assinatura separada do rodapé, `pullQuote` com nome técnico. | **Sobre Mim & História** (reúne biografia e unifica a assinatura autoral). | Coerência editorial em um só espaço. |
| `channels` + `contact` | Canais de assinatura numa aba e formulário de contato em outra. | **Canais & Redes Sociais** (agrupa OnlyFans, Privacy, Instagram e o formulário de e-mail em seções irmãs). | Fim da navegação cruzada para alterar dados de contato. |
| `library` (Biblioteca de Mídia) | Não fica claro se a foto está no ar; sem badge de uso em packs. | **Cofre de Fotos & Vídeos** (rastreamento total de presença no site e proteção contra exclusão acidental). | Tranquilidade de saber exatamente o que está público e o que está só guardado. |
| *Oculta no código* (`MusicEditor`) | Cliente não consegue trocar as músicas ambiente do site. | **Música do Site** (resgatada para a navegação com player de teste integrado). | Autonomia total sobre a trilha sonora. |
| `avulsos` (Packs + Leads VIP) | 12 campos por produto + lista de WhatsApp de 500 linhas no rodapé. | **Divisão em duas abas limpas:**<br>1. *Conteúdos Avulsos* (loja digital)<br>2. *Contatos VIP* (tabela limpa de WhatsApp). | Clareza total entre cadastrar produtos e falar com clientes interessados. |
| `appointments` (Chamadas) | Jargões de banco de dados (`manual_confirmed`, `modalityId`). | **Chamadas de Vídeo** (mantém a lógica, traduz para linguagem de agendamento amigável). | Facilidade para conferir sessões do dia e liberar salas privativas. |
| *Oculta no código* (`InstitutionalEditor`) | Páginas jurídicas não podiam ser editadas no admin. | **Páginas Legais** (resgatada com lista visual de documentos públicos). | Autonomia para atualizar termos e contratos sem pedir ao dev. |
| `seo` (Ajustes) | Gaveta de bagunça (Google + rodapé + segurança + reset perigoso). | **Divulgação & WhatsApp** (foco em título, frase e foto de compartilhamento social). | Foco no que gera cliques e visitas para o site. |
| `finance` (Financeiro) | Risco de confusão com faturamento da criadora. | **Mensalidades da Plataforma** (reforça que é a manutenção do sistema). | Transparência financeira e acesso rápido a recibos oficiais. |
| `requests` (`hidden: true`) | Oculto no menu, obrigava a cliente a recorrer ao WhatsApp pessoal. | **Pedidos ao Desenvolvedor** (reativado com status em tempo real e notificações). | Canal oficial de suporte e histórico de melhorias do site. |

---

## 6. ETAPA 5 — DICIONÁRIO DE-PARA: ELIMINAÇÃO DE TERMOS TÉCNICOS

A tabela a seguir compila todos os termos identificados no código que geravam estranheza ou insegurança e apresenta o substituto em linguagem natural:

| Termo Técnico / Interno Atual | Onde estava | Como a Cliente Vê Agora | Justificativa do Ajuste |
| :--- | :--- | :--- | :--- |
| `Eyebrow` | Hero, About, Galeria, Canais | **Assunto no Topo** ou **Pequeno Destaque** | "Eyebrow" é jargão editorial de código; "Assunto no Topo" é autoexplicativo. |
| `Cinematic Cover Layout` | HeroEditor | **Foto de Fundo em Tela Cheia** | Explica o resultado visual que ela verá no celular. |
| `Full Vertical Photo` | HeroEditor | **Preenchimento Completo da Altura** | Deixa claro que a foto cobrirá a tela verticalmente. |
| `PullQuote` | AboutEditor | **Frase Marcante em Destaque** | Termo tipográfico substituído por conceito de mensagem. |
| `Slug` | AvulsosEditor | **Nome no Link do Site** | A cliente não precisa saber o que é um slug de URL. |
| `Numeric Price` | AvulsosEditor | **Valor em Reais (R$)** | A máscara de formatação cuida do número automaticamente. |
| `OG Image` / `Open Graph` | SeoEditor | **Foto de Prévia para o WhatsApp** | Explica exatamente o momento em que a imagem é exibida. |
| `Anti-Scraping Ativo` | SeoEditor | **Suas fotos estão protegidas contra cópias** | Transmite o benefício real em vez da tecnologia do servidor. |
| `CDN Cloudflare com SSL` | SeoEditor | **Site seguro com certificado oficial** | Traduz infraestrutura para segurança percebida. |
| `Manual Confirmed` | AppointmentsEditor | **Pagamento Confirmado Manualmente** | Termo em inglês substituído por confirmação direta. |
| `Queue` | AppointmentsEditor | **Agendamentos Recebidos** | "Queue" soa frio; "Agendamentos Recebidos" é acolhedor. |
| `Modalities` | AppointmentsEditor | **Tipos de Sessão e Duração** | Explica o que a cliente realmente configura. |
| `Settings` (Agenda) | AppointmentsEditor | **Regras de Horários e Folgas** | Foco na rotina da profissional. |
| `ObjectKey` / `SizeBytes` | MediaViewerModal | **Tamanho do Arquivo** (ex: Leve / Otimizado) | Elimina jargões de S3/R2 da visualização da cliente. |
| `Reset Content to Default` | SeoEditor | **Restaurar Versão Original de Lançamento** | Alerta sobre o impacto sem termos de sistema operacional. |

---

## 7. ETAPA 6 — MATRIZ DE SEPARAÇÃO: EXPERIÊNCIA DA CLIENTE VS DESENVOLVEDOR

Conforme estipulado na **Regra 8 do projeto** e no documento de arquitetura (`ARCHITECTURE.md`), existe uma separação rígida entre a plataforma da Nua Borges e o ecossistema do desenvolvedor Philippe (`phdev.store`).

```
┌──────────────────────────────────────┐      ┌──────────────────────────────────────┐
│       PAINEL DA NUA BORGES           │      │        ADMIN GERAL / PHILIPPE        │
│   (nuaborges-admin.pages.dev)        │      │       (admingeral.phdev.store)       │
├──────────────────────────────────────┤      ├──────────────────────────────────────┤
│ • Textos, frases e títulos autorais  │      │ • Kanban de triagem de chamados      │
│ • Fotos da Capa, Perfil e Galeria    │      │ • Conciliação master Mercado Pago    │
│ • Catálogo de Packs e Vídeos         │      │ • Baixas bancárias manuais e estorno │
│ • Agenda e chamadas de vídeo         │      │ • Telemetria da Nua IA e tokens      │
│ • Lista de contatos VIP do WhatsApp  │      │ • Inspeção crua de Storage e B2      │
│ • Pagamento de parcelas e recibos    │      │ • Auditoria de IP, bots e segurança  │
│ • Pedidos de melhoria com o Philippe │      │ • Variáveis de ambiente e segredos   │
└──────────────────────────────────────┘      └──────────────────────────────────────┘
                   ▲                                             ▲
                   │                                             │
                   └──────── NENHUMA INTERFERÊNCIA MÚTUA ────────┘
```

### 7.1. Elementos Blindados Fora do Alcance da Cliente:
- **Credenciais de API e Tokens Mestres:** A Nua nunca tem acesso a `MASTER_ADMIN_KEY`, chaves secretas do Mercado Pago ou tokens de serviço do Cloudflare.
- **Configurações de DNS e Rotas:** Domínios e deploys são geridos nos arquivos de configuração do repositório (`wrangler.toml`, `wrangler.admin.toml`).
- **Logs Brutos de Servidor:** Erros de rede e latências de edge continuam canalizados exclusivamente para a telemetria do Admin Geral.
- **Funções Técnicas Preservadas:** Nenhuma funcionalidade de auditoria técnica foi deletada do projeto; todas permanecem íntegras no seu local de direito (`components/admingeral/` e `app/admingeral/`).

---

## 8. ETAPA 7 — PLANO DE VALIDAÇÃO TÉCNICA E TESTES FUNCIONAIS

Para garantir que a futura aplicação deste plano ocorra com **zero risco de regressão**, definimos a matriz de validações obrigatórias:

| Fluxo Funcional | O que deve ser verificado | Critério de Sucesso |
| :--- | :--- | :--- |
| **Navegação Contínua** | Troca entre as abas em telas mobile (iPhone/Android) e desktop. | Rolagem suave da barra de abas, sem cortes de texto e sem rolagem horizontal na tela inteira. |
| **Ciclo de Rascunho** | Alterar um texto em qualquer aba e fechar o navegador sem publicar. | Ao reabrir, o rascunho deve permanecer salvo no `localStorage` com o aviso amarelo aceso. |
| **Ciclo de Publicação** | Clicar em "Publicar no Site". | Conteúdo sincronizado com a Cloudflare Edge (`/api/content/sync`), toast verde de sucesso e site público atualizado. |
| **Upload de Mídia** | Enviar fotos e vídeos pelo celular ou arrastar no computador. | Otimização automática em WebP/JPEG, upload no Backblaze B2 e entrada imediata no Acervo. |
| **Integridade de Mídias em Uso** | Tentar excluir foto que está na Capa ou na Galeria. | Bloqueio amigável informando onde a foto está sendo usada. |
| **Checkout de Chamada de Vídeo** | Selecionar um horário na agenda e simular agendamento. | Bloqueio automático de concorrência de horário e geração de Pix válido. |
| **Quitação Financeira & Recibo** | Clicar em "Pagar Parcela" no Financeiro. | QR Code Pix oficial, reconciliação e download do PDF com formatação impecável. |
| **Canal de Pedidos** | Enviar uma solicitação para o Philippe. | Pedido registrado na API (`/api/requests/client`), alerta sonoro suave e sincronização com o Admin Geral. |

---

## 9. PROBLEMAS ARQUITETURAIS REMANESCENTES QUE DEMANDAM ATENÇÃO

A auditoria identificou três pontos de atenção que dependem de fatores externos ou de infraestrutura contratada:

1. **Armazenamento de Mídia em Backblaze B2:**  
   Como a plataforma suporta upload de vídeos para os conteúdos avulsos, as mídias residem no bucket S3-compatible dedicado da Backblaze B2 (com Cloudflare atuando exclusivamente para deploy e proxy de entrega).  
   *Recomendação:* Manter aviso visual acolhedor sugerindo vídeos de bastidores de até 60 segundos ou resolução Full HD otimizada.
2. **Dependência de Webhooks do Gateway de Pagamento:**  
   A confirmação automática de pagamentos Pix em tempo real depende da entrega do webhook do Mercado Pago. O sistema já possui fallback inteligente com botão *"Já paguei / Verificar agora"* no modal, o que mitiga qualquer atraso de notificação.
3. **Sincronização entre Múltiplos Aparelhos:**  
   Se a cliente editar pelo celular e outra pessoa da equipe editar pelo computador ao mesmo tempo, o `ConflictModal` já entra em ação para proteger contra sobreposição. A nova organização mantém essa salvaguarda 100% ativa.

---

## 10. DECLARAÇÕES FORMAIS DE CONFORMIDADE

### 10.1. Confirmação de Preservação do Design Visual
> **DECLARO**, na qualidade de auditor técnico e responsável pelo projeto, que:  
> - A paleta de cores original (preto profundo `#000000`, superfícies `#09090c` e `#0e0e13`, acentos em blush rosé `#f4a7b9` e bordas `#27272a`) foi **rigorosamente mantida**.  
> - A tipografia institucional (fontes serifadas editoriais nos títulos, script afetiva na marca e sans-serif limpa nos formulários) foi **preservada em 100% das telas**.  
> - O formato e comportamento dos botões arredondados (*pills*), modais com *blur*, animações com `motion/react` e feedbacks táteis continuam **exatamente os mesmos**.  
> - Nenhuma nova biblioteca visual externa foi introduzida.

### 10.2. Confirmação de Restrição ao Escopo NUA Borges
> **DECLARO** que o escopo desta auditoria e de seu plano estrutural permaneceu **estritamente restrito ao painel da cliente Nua Borges**.  
> - O projeto Admin Geral / PH (`app/admingeral/` e subdomínio `admingeral.phdev.store`) **não sofreu qualquer interferência ou dependência cruzada**.  
> - Os arquivos compartilhados em `lib/core/` permanecem desacoplados e protegidos.

---

## CONCLUSÃO E DIRETRIZ FINAL

O Admin do NUA Borges não precisa de um "novo design" — ele já é visualmente deslumbrante e sofisticado. O que ele necessitava era de **uma mente de produto orientada ao usuário leigo**: alguém que retirasse as pedras do caminho, unificasse termos confusos, trouxesse à tona as ferramentas que estavam escondidas e transformasse a rotina de atualizar o site em um momento prazeroso, intuitivo e seguro para a cliente.

Este documento consolida o diagnóstico completo e o mapa de reorganização definitivo para guiar as próximas fases com precisão cirúrgica e maestria técnica.
