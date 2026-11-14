# Dossiê Técnico e de UX — Auditoria Completa do CMS NUA Borges

**Data da Auditoria:** 14/11/2026  
**Escopo:** Painel Administrativo (`/admin`) e Ecossistema de Mídias (`nuasite`)  
**Método:** Inspeção real em navegador (Desktop `1536×738` e Mobile `390×844` via Playwright) + Análise arquitetural e de código-fonte (somente leitura).

---

## 1. Diagnóstico Geral

O CMS da NUA Borges apresenta uma **identidade visual refinada e consistente** (tema escuro `#0c0d12` com acentos rosê `#f4a7b9`), **zero erros fatais de renderização React** durante a navegação e uma separação conceitual acertada entre a operação comercial da criadora e a gestão técnica/financeira da plataforma.

Contudo, ao avaliar o painel sob a ótica de **uma usuária não técnica que precisa operar o próprio negócio diariamente (inclusive pelo iPhone)**, o sistema sofre de três problemas estruturais centrais:

1. **Sobrecarga Cognitiva por Tela:** Várias abas concentram dezenas de campos, toggles, textos explicativos e listas em uma única rolagem longa (especialmente *Editar meu site → Capa* e *Pedidos personalizados → Preços & Calculadora*).
2. **Ecossistema de Mídias Fragmentado:** A "Biblioteca de Mídia" convive com referências soltas por URL (`imageUrl`) em `HeroSlideItem`, `GalleryPhotoItem`, `About` e `Packs`, além de depender de endpoints (`/api/media/list`) que falham com `404` no servidor de desenvolvimento Next.js (`next dev`) quando as Cloudflare Pages Functions não estão acopladas.
3. **Atritos de Usabilidade e Responsividade:** Bugs pontuais de interface — como campo duplicado no cadastro de packs, input de data manual (`AAAA-MM-DD`) em Chamadas VIP e **overflow horizontal no cabeçalho mobile (`390px`)** — prejudicam a fluidez e a confiança no uso diário.

---

## 2. Inventário Completo do CMS

O painel é estruturado em **5 grupos na sidebar**, totalizando **14 módulos**:

| Grupo | Módulo (Sidebar) | Rota | Função Principal |
| :--- | :--- | :--- | :--- |
| **COMECE AQUI** | Pedidos recebidos | `/admin/alertas` | Feed unificado de pedidos, agendamentos e alertas. |
| **VENDER E ATENDER** | Conteúdos & Packs | `/admin/conteudos` | Catálogo de packs avulsos e biblioteca central de fotos/vídeos. |
| **VENDER E ATENDER** | Pedidos personalizados | `/admin/personalizados` | Fila de encomendas sob medida e calculadora pública de preços. |
| **VENDER E ATENDER** | Chamadas VIP | `/admin/chamadas` | Fila de chamadas, calendário visual, modalidades e horários. |
| **MEU SITE** | Editar meu site | `/admin/vitrine` | Edição da Capa (Hero), Galeria pública da Home e seção Sobre Mim. |
| **MEU SITE** | Divulgação & SEO | `/admin/seo` | Metadados (Google/WhatsApp), rodapé, gate 18+ e links legais. |
| **MEU SITE** | Redes e contato | `/admin/conexoes` | Links de Privacy/OnlyFans e formulário de contato comercial. |
| **GESTÃO & SISTEMA** | Financeiro | `/admin/financeiro` | Receitas comerciais (Stripe), taxas, saldo e histórico de vendas. |
| **GESTÃO & SISTEMA** | Contratos | `/admin/contratos` | Contrato de prestação de serviços (20 cláusulas), Anexo I e PDFs. |
| **GESTÃO & SISTEMA** | Acessos e senhas | `/admin/cofre` | Cofre local criptografado (AES-256) para credenciais de serviços. |
| **GESTÃO & SISTEMA** | Configurações | `/admin/configuracoes` | Alertas sonoros/visuais, toggle da Nua IA, diagnóstico e cache local. |
| **GESTÃO & SISTEMA** | Mensalidade do Site | `/admin/mensalidade` | Cronograma de 10 parcelas (Mercado Pago), Pix e recibos em PDF. |
| **FERRAMENTAS DEV (BETA)** | Player de Áudio DEV | `/admin/beta_player` | Gestão experimental de trilha sonora do site. |
| **FERRAMENTAS DEV (BETA)** | Assistente Nua IA DEV | `/admin/beta_ia` | Base de conhecimento e co-piloto experimental do painel. |

**Recursos Globais (Header):** Busca rápida **Spotlight (`⌘K`)**, badge de status da mensalidade, atalho de notificações, link *"Ver Site"* e indicador de publicação (*"Site atualizado"* / *"Publicar alterações"*).

---

## 3. Auditoria Página por Página

### 3.1 Pedidos recebidos (`/admin/alertas`)
* **Evidência observada:** Sidebar exibe *"Pedidos recebidos"* sob *"COMECE AQUI"*, mas a página renderiza breadcrumb `SISTEMA`, subtítulo *"Notificações e avisos do sistema"* e título interno *"Central de Alertas & Pedidos"*. O botão *"Configurar Alertas"* redireciona para `/admin/configuracoes`.
* **Problema:** Dissonância de nomenclatura. "SISTEMA" e "avisos do sistema" passam a impressão de logs técnicos, não de vendas/pedidos reais.
* **Recomendação:** Padronizar o cabeçalho da página para `OPERAÇÃO DIÁRIA > Pedidos recebidos` e manter o foco em ações rápidas de atendimento.

### 3.2 Conteúdos & Packs (`/admin/conteudos`)
* **Evidência observada:** Possui duas abas (*Produtos à venda* e *Fotos e vídeos*). Ao clicar em **"Criar Primeiro Pack"** (`PackEditorPage.tsx`), o passo *1. Dados & Precificação* exibe **dois campos idênticos para o mesmo propósito**:
  * *"Destaque / Badge (Opcional):"* (valor padrão `LANÇAMENTO`) sob *Identificação do Produto*.
  * *"Selo / Badge de Destaque:"* (valor padrão `LANÇAMENTO`) sob *Precificação*.
* **Problema:** Redundância direta no mesmo formulário. A cliente não sabe qual dos dois campos altera o selo na vitrine.
* **Recomendação:** Remover o campo duplicado do bloco *Precificação*, mantendo apenas um campo de badge em *Identificação do Produto*.

### 3.3 Pedidos personalizados (`/admin/personalizados`)
* **Evidência observada:** Aba *Fila de Pedidos* é limpa e objetiva. Já a aba *Preços & Calculadora* exibe simultaneamente, em uma única rolagem: configuração de ensaio fotográfico, 4 faixas de duração de vídeo, adicionais especiais, prazos éticos e textos da vitrine (`/personalizados`).
* **Problema:** Alta densidade de informação. A mistura de regras de negócio (preços) com textos editoriais da página pública cansa a leitura.
* **Recomendação:** Agrupar os blocos de *Preços & Calculadora* em sanfonas (accordions) recolhidas por padrão, deixando aberto apenas o resumo de valores.

### 3.4 Chamadas VIP (`/admin/chamadas`)
* **Evidência observada:** 4 sub-abas (*Fila de Chamadas, Calendário Visual, Modalidades & Preços, Horários & Agenda*). Na aba *Horários & Agenda*, o bloco *"Datas Bloqueadas (Férias e Folgas)"* apresenta um `<input type="text">` puro instruindo: *"formato AAAA-MM-DD"*.
* **Problema:** Exigir digitação manual no formato ISO (`AAAA-MM-DD`) de uma usuária não técnica no Brasil (habituada a `DD/MM/AAAA`) gera erro humano e frustração, especialmente no celular.
* **Recomendação:** Substituir por `<input type="date">` nativo (que abre o seletor nativo do iOS/Android/Desktop) ou permitir o bloqueio direto pelo *Calendário Visual* (que já possui botão *"Bloquear Data"*).

### 3.5 Editar meu site (`/admin/vitrine`)
* **Evidência observada:**
  * *Foto e textos da capa:* Concentra banner técnico de dimensões (`1920 × 1080 px`), 7 inputs de texto, 3 switches de layout, 4 campos do menu superior e o gerenciador de 4 fotos em carrossel na mesma tela.
  * *Galeria de fotos (4):* Bem organizada, com reordenação, visibilidade, desfoque VIP e link opcional.
  * *Sobre mim:* Excelente, com contadores de caracteres e prévia da assinatura cursiva.
* **Problema:** A aba da Capa está sobrecarregada e mistura edição de **Textos/Links**, **Cabeçalho do Site** e **Fotos**. Além disso, não há botão explícito de "Salvar" na tela (depende do autosave em rascunho + botão no header), o que pode gerar insegurança na cliente sobre se a edição foi salva.
* **Recomendação:** Subdividir *Foto e textos da capa* em sub-seções colapsáveis (*1. Textos Principais*, *2. Fotos da Capa*, *3. Menu Superior*) e exibir um indicador discreto *"Rascunho salvo automaticamente"* próximo aos campos.

### 3.6 Divulgação & SEO (`/admin/seo`)
* **Evidência observada:** Prévias visuais em tempo real de como o link aparece no **WhatsApp** e no **Google**, além de gestão de Gate 18+ e links do rodapé.
* **Avaliação:** Módulo exemplar. Transforma um conceito técnico (meta tags OG/SEO) em algo visual e compreensível.

### 3.7 Redes e contato (`/admin/conexoes`)
* **Evidência observada:** Gestão de Privacy/OnlyFans e formulário de contato com explicação clara sobre proteção anti-spam (*Honeypot* e *Time-Trap*).
* **Avaliação:** Bem estruturado e direto.

### 3.8 Financeiro (`/admin/financeiro`) e Mensalidade do Site (`/admin/mensalidade`)
* **Evidência observada:** Separação clara entre o faturamento comercial da cliente (Stripe) e o cronograma de 10 parcelas da hospedagem/desenvolvimento (Mercado Pago), com recibos em PDF e hash de autenticidade.
* **Avaliação:** Excelente arquitetura de informação. Evita que a cliente confunda suas vendas com suas despesas de infraestrutura.

### 3.9 Contratos (`/admin/contratos`), Acessos e senhas (`/admin/cofre`) e Configurações (`/admin/configuracoes`)
* **Avaliação:** Funcionais, bem isolados sob *GESTÃO & SISTEMA* e fora da rotina diária de vendas. O cofre AES-256 com atalhos pré-configurados é prático e seguro.

### 3.10 Ferramentas DEV (Beta) (`/admin/beta_player` e `/admin/beta_ia`)
* **Avaliação:** Bem sinalizadas com badges `BETA` e `DEV`, evitando expectativas irreais sobre recursos ainda em homologação.

---

## 4. Auditoria Profunda da Galeria e Mídias (Prioridade Máxima)

### 4.1 Mapeamento da Arquitetura Atual
* **Modelo de Dados (`lib/types.ts`):**
  * `LibraryImageItem` armazena `id`, `url`, `objectKey`, `variants` (`thumb`, `mobile`, `full`, `original`), `albumIds` e `usedIn`.
  * `MediaAlbum` armazena `mediaIds: string[]`, `coverMediaId` e `coverUrl`.
  * **Porém**, `HeroSlideItem` e `GalleryPhotoItem` armazenam **apenas `imageUrl: string`** (URL crua), sem vínculo obrigatório com `mediaId`.
* **Componentes de UI:**
  * Gestão principal: `components/nua/admin/library/` (`useLibraryManager.ts`, `LibraryMediaGrid.tsx`, `LibraryAlbumsBar.tsx`, `LibraryUploadDropzone.tsx`).
  * Seletor modal: `components/nua/admin/ImagePickerModal.tsx` e `components/nua/admin/picker/`.
  * Visualizador: `components/nua/admin/MediaViewerModal.tsx` e `components/nua/admin/viewer/`.
* **Backend e Storage:**
  * `functions/api/media/list.ts`, `upload.ts`, `presign.ts`, `delete.ts` e `functions/media/[[path]].ts` (Cloudflare Pages Functions + Backblaze B2).

### 4.2 Problemas Confirmados no Ecossistema de Mídias
1. **Botão Hardcoded no Seletor de Mídias (`ImagePickerModal.tsx`):**
   * *Evidência:* Ao abrir o seletor de fotos a partir de **Editar meu site → Foto e textos da capa** (botão *"Trocar Foto"*), o modal exibe um botão escrito **"Voltar para o Pack"** no cabeçalho, mesmo quando a usuária não está editando nenhum pack.
   * *Impacto:* Confunde a cliente sobre em qual área do painel ela está.
2. **Erro 404 em Desenvolvimento Local (`next dev`):**
   * *Evidência:* `useLibraryManager.ts:47` executa `fetch('/api/media/list?limit=500')`. Como `app/api/` não existe no Next.js (as APIs estão em `functions/api/` do Cloudflare), o console registra **2 erros 404** ao abrir a aba *Fotos e vídeos*.
2. **Acoplamento Fraco por URL em vez de ID:**
   * Como Capa (`HeroSlideItem`) e Galeria (`GalleryPhotoItem`) guardam `imageUrl` em vez de `mediaId`, se um arquivo for substituído ou otimizado na biblioteca, as referências antigas não são atualizadas automaticamente, podendo gerar links órfãos ou miniaturas inconsistentes.
3. **Localização Escondida da Biblioteca:**
   * A Biblioteca de Mídia completa está aninhada dentro de *Conteúdos & Packs → Fotos e vídeos*. Quando a cliente está em *Editar meu site* e quer organizar álbuns ou subir várias fotos de uma vez, ela não tem um acesso direto na sidebar para a Biblioteca.

### 4.3 Viabilidade de uma Biblioteca de Mídias Centralizada (Fonte Única de Verdade)
**Veredito: Totalmente viável e altamente recomendada**, aproveitando a base já existente em `LibraryImageItem` e `ImagePickerModal`.

Para que seja uma **fonte única de verdade** (e não apenas uma UI nova sobre lógica duplicada):
1. **Promover a Biblioteca na Sidebar:** Criar um item de topo ou sob *MEU SITE / VENDER*: **"Biblioteca de Mídias"** (ou manter acesso rápido unificado), desacoplando-a de dentro de *Conteúdos & Packs*.
2. **Padronizar Referências por `mediaId`:** Migrar gradualmente `HeroSlideItem`, `GalleryPhotoItem`, `About` e `Packs` para referenciar `mediaId` (mantendo `imageUrl` como fallback/cache de leitura para não quebrar o site público estático).
3. **Unificar Upload e Exclusão:** Garantir que qualquer upload feito pelo `ImagePickerModal` passe pelo mesmo pipeline de `useLibraryManager` / `MediaService.ts`, registrando automaticamente o `LibraryImageItem` e suas variantes.

---

## 5. Problemas Estruturais e Responsividade Mobile

1. **Overflow Horizontal no Header Mobile (`390×844`):**
   * *Evidência:* Na inspeção via Playwright, o container de ações do header (`ref=f2e16`) ocupa `box=190,12,226,32`, estendendo-se até `416px` em uma tela de `390px` (corte de `26px` na direita, afetando o avatar `NB` e o sino de notificações).
   * *Causa:* O botão *"Vencida"* (`102px`) somado ao Spotlight, sino e avatar excede a largura disponível.
2. **Menu Mobile Longo:**
   * *Evidência:* Com 14 itens, o drawer mobile exige rolagem vertical para alcançar *"Ferramentas DEV"* e *"Sair do Painel"*.

---

## 6. Proposta de Reorganização da Sidebar

A estrutura atual de 5 grupos funciona bem, mas pode ficar mais intuitiva para a cliente:

* **COMECE AQUI:** `Pedidos recebidos` (padronizar título interno).
* **VENDER E ATENDER:** `Conteúdos & Packs`, `Pedidos personalizados`, `Chamadas VIP`.
* **MEU SITE & MÍDIAS:** `Biblioteca de Mídias` *(promovida para cá)*, `Editar meu site`, `Divulgação & SEO`, `Redes e contato`.
* **GESTÃO & SISTEMA:** `Financeiro`, `Mensalidade do Site`, `Acessos e senhas`, `Contratos`, `Configurações`.
* **LABORATÓRIO (BETA):** `Player de Áudio`, `Assistente Nua IA` *(recolhível/discreto)*.

---

## 7. Matriz de Prioridades

| Prioridade | Problema | Localização | Complexidade |
| :--- | :--- | :--- | :--- |
| **Crítica** | Overflow horizontal no header mobile (`> 390px`) | `components/nua/admin/AdminHeader.tsx` | Baixa |
| **Alta** | Campo de Badge/Selo duplicado no cadastro de Pack | `components/nua/admin/PackEditorPage.tsx` | Baixa |
| **Alta** | Input de data manual (`AAAA-MM-DD`) em Chamadas VIP | `components/nua/admin/AppointmentsEditor.tsx` | Baixa |
| **Alta** | Erro 404 em `/api/media/list` no ambiente `next dev` | `useLibraryManager.ts` / proxy local | Média |
| **Média** | Sobrecarga visual em *Editar meu site → Capa* e *Personalizados → Preços* | `HeroEditor.tsx`, `PersonalizadosEditor.tsx` | Média |
| **Média** | Promover Biblioteca de Mídias e vincular por `mediaId` | `AdminSidebar.tsx`, `lib/types.ts` | Alta |
| **Baixa** | Dissonância de título em *Pedidos recebidos* (`SISTEMA`) | `AlertasSistemaModule.tsx` | Baixa |

---

## 8. Plano de Refatoração Sugerido (Aguardando Autorização)

1. **Fase 1 — Quick Wins de UI/UX (Sem risco de dados):**
   * Corrigir o overflow do `AdminHeader.tsx` no mobile (compactar badge de mensalidade em `< 400px`).
   * Remover o campo duplicado de Badge em `PackEditorPage.tsx`.
   * Trocar o input `AAAA-MM-DD` por `<input type="date">` em `AppointmentsEditor.tsx`.
   * Padronizar o título de `AlertasSistemaModule.tsx`.
2. **Fase 2 — Redução de Carga Cognitiva:**
   * Aplicar sanfonas (accordions) em *Preços & Calculadora* e *Foto e textos da capa*.
   * Adicionar indicador visual discreto de *"Rascunho salvo"* nos editores da vitrine.
3. **Fase 3 — Centralização da Biblioteca de Mídias:**
   * Promover a Biblioteca na sidebar, configurar proxy/fallback limpo para `/api/media/list` em `next dev` e iniciar a transição de `imageUrl` para `mediaId` com retrocompatibilidade.

---

*Dossiê gerado após inspeção real e sem nenhuma alteração aplicada ao código-fonte.*
