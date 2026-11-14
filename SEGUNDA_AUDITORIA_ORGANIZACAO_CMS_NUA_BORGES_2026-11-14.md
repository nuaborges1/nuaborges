# SEGUNDA AUDITORIA EXAUSTIVA DE ORGANIZAÇÃO — CMS NUA BORGES

**Data da Auditoria:** 14 de Novembro de 2026  
**Ambiente Inspecionado:** `http://localhost:3000/admin` (Desktop `1536×738` e Mobile iPhone `390×844`) + Mapeamento estrutural completo dos componentes em `components/nua/admin/`  
**Papel da Auditoria:** Especialista Sênior em UX, Arquitetura da Informação, Design de Produto e Sistemas Administrativos (CMS/Backoffice)  
**Escopo Exclusivo:** Organização das interfaces, distribuição das informações, sobrecarga visual e cognitiva, arquitetura da informação, hierarquia de navegação, funcionalidades mal posicionadas ou duplicadas, complexidade de formulários e fluxos, excesso de abas/sub-abas/cartões/botões, clareza da linguagem para a cliente e organização Desktop vs. Mobile.  
**Status do Projeto:** **ZERO ALTERAÇÕES REALIZADAS** (Etapa 100% de Investigação e Diagnóstico).

---

## SKILLS E FERRAMENTAS EFETIVAMENTE UTILIZADAS

1. **Skills Aplicadas:**
   - `ui-review` (`C:\Users\Philippe\.gemini\config\skills\ui-review\SKILL.md`) — Auditoria de hierarquia visual, densidade de informação, espaçamento e estados de componentes.
   - `software-architecture` (`C:\Users\Philippe\.gemini\config\skills\software-architecture\SKILL.md`) — Separação de responsabilidades (SoC) entre módulos de operação comercial, gestão de mídias (DAM) e edição de vitrine.
   - `ui-ux-pro-max` (`C:\Users\Philippe\.gemini\config\skills\ui-ux-pro-max\SKILL.md`) — Heurísticas de usabilidade de Nielsen, carga cognitiva (Lei de Hick e Lei de Miller), *Progressive Disclosure* e modelos mentais para usuários não técnicos.
   - `mobile-design` (`C:\Users\Philippe\.gemini\config\skills\mobile-design\SKILL.md`) — Ergonomia mobile-first (`390×844`), *touch targets*, prevenção de *horizontal overflow* e navegação em gaveta (*drawer*).
   - `browser-automation` (`C:\Users\Philippe\.gemini\config\skills\browser-automation\SKILL.md`) — Navegação sistemática no navegador real verificando a árvore de elementos, *bounding boxes* e estados interativos.
2. **Ferramentas Utilizadas:**
   - **Playwright MCP (`browser_navigate`, `browser_snapshot`, `browser_click`, `browser_resize`, `browser_take_screenshot`, `browser_press_key`):** Percorrimento real de todos os 14 módulos da sidebar, sub-abas, acordeões, modais, seletores, busca global (`⌘K`) e viewport mobile (`390×844`).
   - **Leitura Complementar de Código (`read_file`):** Inspeção exata dos componentes em `components/nua/admin/` para mapear estados condicionais (ex.: cartões de pedidos quando a fila está preenchida).

---

## 1. RESUMO EXECUTIVO E AVALIAÇÃO GERAL DE ORGANIZAÇÃO

### 1.1 Diagnóstico Sintético
O painel administrativo da **NUA Borges** tem uma estética visual refinada, mas apresenta **problemas severos de organização estrutural, distribuição incoerente de funcionalidades, fragmentação do sistema de mídias e sobrecarga cognitiva em telas de uso diário**.

Sob a ótica da cliente (**Nayara / Nua Borges** — uma criadora de conteúdo e empreendedora que não é programadora e precisa operar seu negócio pelo computador e pelo iPhone), os 4 maiores gargalos organizacionais são:

1. **Mistura entre Operação Diária e Configuração Rara:** Módulos de atendimento diário abrem diretamente na tela de configuração complexa (como `Pedidos personalizados`, cuja primeira aba é `Preços & Calculadora` e não a `Fila de Pedidos`) ou mantêm 5 cartões gigantes de métricas fixos no topo enquanto a cliente tenta editar preços e horários (`Chamadas VIP`).
2. **Fragmentação extrema do Ecossistema de Mídias (4 seletores diferentes + fluxos quebrados):**
   - A Biblioteca de Mídias central não tem item próprio no menu lateral: está escondida como a 2ª aba (`Fotos e vídeos`) dentro de `Conteúdos & Packs` (`/admin/conteudos`).
   - Existem **4 interfaces diferentes** para selecionar mídias no painel (`LibraryMediaGrid`, `ImagePickerModal`, `AlbumMediaSelectorModal` e o seletor inline de capa dentro de `AlbumCreateModal`).
   - Na Etapa 3 do Editor de Pack (`3. Cofre Protegido`), anexar **Fotos Exclusivas** abre o seletor da biblioteca, mas clicar em **`"Adicionar Vídeo 4K"` NÃO abre a biblioteca**: exige que a cliente digite manualmente o título, a duração (`05:20 Min`) e cole uma **URL bruta `.mp4` (`https://...`)**! O mesmo erro ocorre na entrega de arquivos em `Pedidos personalizados → Fila de Pedidos`.
3. **Mistura de responsabilidades sem relação dentro da mesma aba:**
   - A aba `Foto e textos da capa` (`HeroEditor.tsx`) mistura os textos do Hero, switches técnicos de layout CSS, as 4 fotos da capa (jogadas para o final da página) **e** o formulário **`Menu & Cabeçalho do Site`** (que altera a barra de navegação global do site inteiro).
   - A aba `Divulgação & Google` (`SeoEditor.tsx`) mistura meta tags de SEO/WhatsApp com os **textos do Rodapé do site**, um **cartão estático de segurança** sem nenhuma ação e um botão destrutivo global **`"Restaurar Tudo"`**.
   - Em `Redes e contato`, o formulário que edita a **Faixa de Contato Profissional & Imprensa** está no final da Aba 1 (`Redes sociais e plataformas`), enquanto a janela que abre ao clicar nessa faixa está na Aba 2 (`Contato comercial`).
4. **Conflito de Salvamento Global vs. Salvamento Local:** Alterações em `Editar meu site`, `Divulgação & SEO`, `Redes e contato` e `Configurações da Seção de Packs` dependem do botão **`"Publicar"`** no Header Global do topo. Já alterações em `Packs`, `Pedidos personalizados`, `Chamadas VIP` e `Acessos e senhas` possuem botões internos próprios de **`"Salvar"`** (às vezes **dois botões de salvar na mesma tela**, como em `Preços & Calculadora` e no `PackEditorPage`).

### 1.2 Quadro de Notas de Organização (Escala 0 a 10)
| Critério de Organização | Nota | Diagnóstico Resumido |
| :--- | :---: | :--- |
| **Arquitetura da Informação (Sidebar & Grupos)** | **5.5 / 10** | 14 itens em 5 grupos; Biblioteca escondida em `Conteúdos & Packs`; `FERRAMENTAS DEV` expostas para a cliente; `Packs` separado de `VENDER E ATENDER`. |
| **Coesão e Distribuição por Aba** | **4.5 / 10** | Cabeçalho global dentro da Capa; Rodapé e Reset Global dentro de SEO; Faixa de Contato separada da aba de Contato Comercial. |
| **Organização do Ecossistema de Mídias** | **3.5 / 10** | 4 seletores diferentes; paradigma duplo (*Push* vs. *Pull*); Vídeos 4K exigindo URL manual; botão `"Voltar para o Pack"` hardcoded em todo o site. |
| **Densidade Visual e Carga Cognitiva** | **5.0 / 10** | Excesso de campos abertos simultaneamente em `Capa`, `Preços & Calculadora` e `Galeria de fotos`; botões de ação e campos duplicados. |
| **Clareza de Linguagem para a Cliente** | **6.5 / 10** | Presença de termos técnicos desnecessários (`Slug`, `21:9 Ultra-Wide`, `Honeypot invisível`, `Time-Trap de 2.5s`, `AAAA-MM-DD`, `D1 / KV`, `R2`). |
| **Organização Mobile (`390×844` iPhone)** | **5.0 / 10** | Header superior estoura em `26px` (`416px` em tela de `390px`), cortando o sino e o avatar; falta barra inferior fixa; excesso de rolagem vertical. |
| **NOTA GERAL DE ORGANIZAÇÃO** | **5.0 / 10** | **Esteticamente sofisticado, mas estruturalmente confuso, fragmentado e sobrecarregado.** |

---

## 2. REVISÃO CRÍTICA DOS ACHADOS DA PRIMEIRA AUDITORIA

Ao confrontar o relatório da primeira auditoria (`AUDITORIA_ORGANIZACAO_CMS_NUA_BORGES_2026-11-14.md`) com a inspeção completa tela a tela, identificamos **8 falhas graves de organização que a primeira auditoria não viu ou analisou superficialmente**:

1. **Existência de 4 interfaces distintas de seleção de mídia (e não apenas 2):** A primeira auditoria citou apenas a Biblioteca e o `ImagePickerModal`. Na verdade, existem **4 grades/seletores independentes**:
   - `LibraryMediaGrid.tsx` (grade principal da biblioteca);
   - `ImagePickerModal.tsx` (modal seletor usado no site e nas fotos do pack);
   - `AlbumMediaSelectorModal.tsx` (um segundo modal seletor totalmente diferente, com busca e botão `"Marcar Todas"` próprios, usado para adicionar fotos a um álbum);
   - Seletor inline `showCoverPicker` dentro de `AlbumCreateModal.tsx` (uma mini-grade embutida de `max-h-44` para escolher a capa de um álbum).
2. **Desconexão total entre Vídeos 4K do Pack e a Biblioteca de Mídias (`PackVaultTab.tsx:133-170`):** Na Etapa `3. Cofre Protegido` do Editor de Packs, clicar em `"Anexar Foto do Cofre"` abre o `ImagePickerModal`, mas clicar em **`"Adicionar Vídeo 4K"` NÃO abre a biblioteca!** Em vez disso, renderiza 3 campos de texto para digitar manualmente `Título do Vídeo`, `Duração (Ex: 05:20 Min)` e `URL do Arquivo MP4 (https://...)`.
3. **Entrega manual por URL na `Fila de Pedidos` de Personalizados (`PersonalizadosOrderCard.tsx`):** Para entregar uma encomenda personalizada no cofre do cliente, o card exige digitar manualmente o nome e a URL do arquivo em vez de selecionar da Biblioteca de Mídias.
4. **Ordem invertida das abas em `Pedidos personalizados` (`PersonalizadosEditor.tsx:75-100`):** A primeira aba (e tela padrão ao abrir o módulo) é `Preços & Calculadora` (`settings`), deixando a `Fila de Pedidos` (`orders`) em segundo plano.
5. **Duplicação de botões de Salvar na mesma tela em 2 módulos críticos:**
   - Em `Pedidos personalizados → Preços & Calculadora`, há o botão `"Salvar Alterações"` no topo direito e o botão `"Publicar Alterações na Calculadora"` dentro do card do Simulador.
   - Em `PackEditorPage`, há uma barra no topo (`"Voltar"`, `"Excluir Pack"`, `"Salvar Pack"`) e outra barra fixa no rodapé (`"Cancelar e Descartar"`, `"Salvar Pack Agora"`).
6. **Duplicação de botões `"Criar Álbum"` colados um em cima do outro na Biblioteca (`LibraryEditor.tsx`):** O bloco `LibraryUploadDropzone` tem um botão `"Criar Álbum"` e, imediatamente abaixo dele, a barra `LibraryAlbumsBar` tem outro botão `"Criar Álbum"`.
7. **Divisão ilógica do fluxo de Contato Comercial entre duas abas (`ChannelsEditor.tsx:180` vs. `ContactEditor.tsx`):** O card `"Faixa de Contato Profissional & Imprensa"` está no fim da Aba 1 (`Redes sociais e plataformas`), enquanto a configuração da janela que abre quando alguém clica nessa faixa está na Aba 2 (`Contato comercial`).
8. **Avaliação individual de TODAS as sub-abas e modais:** Todas as 43 interfaces do sistema recebem agora uma análise individualizada completa (**A. Inventário, B. Organização, C. Complexidade, D. Recomendação, E. Proposta**).

---

## 3. INVENTÁRIO COMPLETO DE MÓDULOS, ABAS, SUB-ABAS E INTERFACES

```text
CMS NUA BORGES (/admin) — 43 INTERFACES MAPEADAS
├── 0. SHELL GLOBAL E NAVEGAÇÃO
│   ├── 0.1 Header Global (Breadcrumb, Busca ⌘K, Selo Vencida, Ver Site, Sino + Popover, Avatar NB, Publicar)
│   ├── 0.2 Modal de Busca Rápida / Spotlight (⌘K)
│   ├── 0.3 Sidebar Desktop (5 grupos, 14 módulos, recolhível)
│   └── 0.4 Navegação Mobile (Top Header 390px + Gaveta Lateral / Drawer)
│
├── GRUPO 1: COMECE AQUI
│   ├── 1. Pedidos recebidos (/admin/alertas — AlertasSistemaModule)
│   └── 2. Conteúdos & Packs (/admin/conteudos — ConteudosPacksModule)
│       ├── 2.1 Aba: Produtos à venda (AvulsosEditor)
│       │   ├── 2.1.1 Acordeão: Configurações da Seção & Textos da Vitrine (PacksSectionSettings)
│       │   └── 2.1.2 Subpágina: Editor Completo de Pack (PackEditorPage)
│       │       ├── Etapa 1: 1. Dados & Precificação (PackInfoTab)
│       │       ├── Etapa 2: 2. Amostras Gratuitas (PackPreviewsTab)
│       │       └── Etapa 3: 3. Cofre Protegido (PackVaultTab)
│       └── 2.2 Aba: Fotos e vídeos (LibraryEditor — Biblioteca de Mídias Central)
│           ├── 2.2.1 Modal: Criar / Editar Álbum (AlbumCreateModal + seletor inline de capa)
│           ├── 2.2.2 Modal: Adicionar Fotos ao Álbum (AlbumMediaSelectorModal)
│           └── 2.2.3 Modal: Visualizador de Mídia / Lightbox (MediaViewerModal + menu "Usar no Site")
│
├── GRUPO 2: VENDER E ATENDER
│   ├── 3. Pedidos personalizados (/admin/personalizados — PersonalizadosEditor)
│   │   ├── 3.1 Aba: Preços & Calculadora (PersonalizadosPricingForm + Simulador em Tempo Real)
│   │   └── 3.2 Aba: Fila de Pedidos (PersonalizadosOrdersTab + PersonalizadosOrderCard)
│   └── 4. Chamadas VIP (/admin/chamadas — AppointmentsEditor)
│       ├── 4.1 Aba: Fila de Chamadas (AppointmentsBookingsTab + AppointmentBookingPage)
│       ├── 4.2 Aba: Calendário Visual (AppointmentsCalendarTab)
│       ├── 4.3 Aba: Modalidades & Preços (AppointmentsTypesTab)
│       ├── 4.4 Aba: Horários & Agenda (AppointmentsAvailabilityTab)
│       └── 4.5 Modais Operacionais (AppointmentsModals: Confirmar/Link, Cancelar, Reagendar)
│
├── GRUPO 3: MEU SITE E DIVULGAÇÃO
│   ├── 5. Editar meu site (/admin/vitrine — VitrineCapaModule)
│   │   ├── 5.1 Aba: Foto e textos da capa (HeroEditor: Textos Hero + Menu/Cabeçalho Global + 4 Fotos Capa)
│   │   ├── 5.2 Aba: Galeria de fotos (GalleryEditor + Acordeão Editar Textos da Vitrine + Cards de Mídia)
│   │   └── 5.3 Aba: Sobre mim (AboutEditor: Biografia & Identidade + Mensagem & Assinatura)
│   ├── 6. Divulgação & SEO (/admin/seo — DivulgacaoSeoModule)
│   │   ├── 6.1 Aba: Divulgação & Google (SeoEditor: Meta Tags + Prévias + Rodapé + Card Segurança + Reset Global)
│   │   └── 6.2 Aba: Páginas Legais & Termos (InstitutionalEditor: Coluna Rodapé + Links + Maioridade 18+ + Resumos Checkout)
│   └── 7. Redes e contato (/admin/conexoes — ConexoesContatoModule)
│       ├── 7.1 Aba: Redes sociais e plataformas (ChannelsEditor: Textos Seção + Lista de Canais + Faixa Contato Imprensa)
│       └── 7.2 Aba: Contato comercial (ContactEditor: E-mail Oficial + Card Anti-Spam + Textos Modal + Assuntos)
│
├── GRUPO 4: GESTÃO E SISTEMA
│   ├── 8. Financeiro (/admin/financeiro — CommercialFinanceEditor)
│   ├── 9. Contratos (/admin/contratos — ContratosModule)
│   ├── 10. Acessos e senhas (/admin/cofre — CofreCredenciaisModule)
│   │   └── 10.1 Modal: Cadastrar / Editar Credencial (CredentialFormModal)
│   ├── 11. Configurações (/admin/configuracoes — ConfiguracoesModule)
│   │   ├── 11.1 Aba: Alertas & Notificações (Switch IA + Cards Som, Aba Piscando, Windows)
│   │   ├── 11.2 Aba: Diagnóstico das Conexões (Status Cloudflare, D1/KV, R2, Stripe, Resend + Atalhos)
│   │   └── 11.3 Aba: Sessão & Sincronização (Status Rascunho + Limpar Cache + Restaurar Original + Logout)
│   └── 12. Mensalidade do Site (/admin/mensalidade — SiteSubscriptionEditor)
│       ├── 12.1 Modal: Comprovante de Pagamento (ReceiptModal)
│       └── 12.2 Modal: Pagamento Pix / Cartão (PaymentModal)
│
├── GRUPO 5: FERRAMENTAS DEV
│   ├── 13. Player de Áudio DEV (/admin/beta_player — MusicEditor)
│   │   ├── 13.1 Aba: Biblioteca de Faixas
│   │   └── 13.2 Aba: Preview do Player (Beta)
│   └── 14. Assistente Nua IA DEV (/admin/beta_ia — BetaIaModule + Widget Flutuante AdminAiAssistant)
│
└── MODAIS TRANSVERSAIS DE MÍDIA E CONFIRMAÇÃO
    ├── M.1 Seletor Universal de Mídias (ImagePickerModal — Abas: Fotos do Site, Minha Biblioteca, Enviar Nova)
    └── M.2 Modal de Confirmação (ConfirmModal)
```

---

## 4. MATRIZ DE COBERTURA DA AUDITORIA

| # | Módulo / Aba / Sub-aba / Modal | Rota / Componente | Status | Método de Inspeção |
| :-: | :--- | :--- | :---: | :--- |
| **0.1** | Header Global + Popover Sino | `AdminHeader.tsx` | **AUDITADA** | Playwright (Desktop + Mobile) + Clique no Sino. |
| **0.2** | Busca Rápida (`⌘K` Spotlight) | `AdminSpotlightModal.tsx` | **AUDITADA** | Playwright (Abertura do modal e listagem de comandos). |
| **0.3** | Sidebar Desktop (14 itens / 5 grupos) | `AdminSidebar.tsx` | **AUDITADA** | Playwright (Modo expandido e recolhido). |
| **0.4** | Navegação Mobile (`390×844` + Drawer) | `AdminHeader` / `AdminSidebar` | **AUDITADA** | Playwright em viewport `390×844` + abertura da gaveta. |
| **1.0** | Pedidos recebidos | `/admin/alertas` (`AlertasSistemaModule.tsx`) | **AUDITADA** | Playwright (4 filtros) + Código para card preenchido. |
| **2.1** | Conteúdos & Packs → Produtos à venda | `/admin/conteudos` (`AvulsosEditor.tsx`) | **AUDITADA** | Playwright (KPIs, filtros, estado vazio com 3 botões). |
| **2.1.1** | Acordeão: Configurações da Seção de Packs | `PacksSectionSettings.tsx` | **AUDITADA** | Playwright (Expandido via clique: 4 campos). |
| **2.1.2** | Editor de Pack → 1. Dados & Precificação | `PackEditorPage.tsx` / `PackInfoTab.tsx` | **AUDITADA** | Playwright (Aberto via `"Criar Primeiro Pack"`). |
| **2.1.3** | Editor de Pack → 2. Amostras Gratuitas | `PackPreviewsTab.tsx` | **AUDITADA** | Playwright (Navegação para Etapa 2). |
| **2.1.4** | Editor de Pack → 3. Cofre Protegido | `PackVaultTab.tsx` | **AUDITADA** | Playwright (Navegação para Etapa 3 + teste `"Adicionar Vídeo 4K"`). |
| **2.2** | Conteúdos & Packs → Fotos e vídeos | `LibraryEditor.tsx` | **AUDITADA** | Playwright (Dropzone, álbuns, filtros, busca, ordenação, grade/lista, seleção múltipla). |
| **2.2.1** | Modal: Criar Novo Álbum + Seletor de Capa | `AlbumCreateModal.tsx` | **AUDITADA** | Playwright (Aberto via `"Criar Álbum"` + seletor de capa). |
| **2.2.2** | Modal: Adicionar Fotos ao Álbum | `AlbumMediaSelectorModal.tsx` | **AUDITADA** | Inspeção de componente (`AlbumMediaSelectorModal.tsx`). |
| **2.2.3** | Modal: Visualizador de Mídia (Lightbox) | `MediaViewerModal.tsx` | **AUDITADA** | Playwright (Aberto na galeria + menu `"Usar no Site"`). |
| **3.1** | Pedidos personalizados → Preços & Calculadora | `/admin/personalizados` (`PersonalizadosPricingForm.tsx`) | **AUDITADA** | Playwright (Todos os 5 blocos + Simulador em Tempo Real). |
| **3.2** | Pedidos personalizados → Fila de Pedidos | `PersonalizadosOrdersTab.tsx` | **AUDITADA** | Playwright (Estado vazio + filtros) + Código (`PersonalizadosOrderCard.tsx`). |
| **4.1** | Chamadas VIP → Fila de Chamadas | `/admin/chamadas` (`AppointmentsBookingsTab.tsx`) | **AUDITADA** | Playwright (KPIs, filtros, busca) + Código (`AppointmentBookingPage.tsx`). |
| **4.2** | Chamadas VIP → Calendário Visual | `AppointmentsCalendarTab.tsx` | **AUDITADA** | Playwright (Grade Abril 2026 + painel `"Bloquear Data"`). |
| **4.3** | Chamadas VIP → Modalidades & Preços | `AppointmentsTypesTab.tsx` | **AUDITADA** | Playwright (3 cards de sessão + 6 campos de texto da vitrine). |
| **4.4** | Chamadas VIP → Horários & Agenda | `AppointmentsAvailabilityTab.tsx` | **AUDITADA** | Playwright (Regras, grade seg-dom, bloqueio `AAAA-MM-DD`). |
| **4.5** | Chamadas VIP → Modais Operacionais | `AppointmentsModals.tsx` | **AUDITADA** | Código-fonte (Confirmar/Link, Cancelar, Reagendar). |
| **5.1** | Editar meu site → Foto e textos da capa | `/admin/vitrine` (`HeroEditor.tsx`) | **AUDITADA** | Playwright (Banner medidas, Textos Hero, Cabeçalho Global, 4 Fotos). |
| **5.2** | Editar meu site → Galeria de fotos | `GalleryEditor.tsx` | **AUDITADA** | Playwright (Acordeão textos, filtros, 8 cards horizontais completos). |
| **5.3** | Editar meu site → Sobre mim | `AboutEditor.tsx` | **AUDITADA** | Playwright (Foto perfil, 4 inputs identidade, 2 textareas e assinatura). |
| **6.1** | Divulgação & SEO → Divulgação & Google | `/admin/seo` (`SeoEditor.tsx`) | **AUDITADA** | Playwright (Meta tags, foto OG, prévias WhatsApp/Google, Rodapé, Segurança, Reset). |
| **6.2** | Divulgação & SEO → Páginas Legais & Termos | `InstitutionalEditor.tsx` | **AUDITADA** | Playwright (Coluna rodapé, 2 links, Aviso 18+, Resumos Checkout). |
| **7.1** | Redes e contato → Redes sociais e plataformas | `/admin/conexoes` (`ChannelsEditor.tsx`) | **AUDITADA** | Playwright (Textos seção, 4 canais expansíveis, Faixa Contato Imprensa). |
| **7.2** | Redes e contato → Contato comercial | `ContactEditor.tsx` | **AUDITADA** | Playwright (E-mail oficial, Card Anti-Spam, Textos Modal, 4 assuntos). |
| **8.0** | Financeiro | `/admin/financeiro` (`CommercialFinanceEditor.tsx`) | **AUDITADA** | Playwright (Filtros período, 6 KPIs, 3 modalidades, gráfico, tabela). |
| **9.0** | Contratos | `/admin/contratos` (`ContratosModule.tsx`) | **AUDITADA** | Playwright (Resumo, 20 cláusulas, assinaturas e PDF). |
| **10.0** | Acessos e senhas + Modal Credencial | `/admin/cofre` (`CofreCredenciaisModule.tsx`) | **AUDITADA** | Playwright (6 atalhos, 6 abas, busca + Modal `"Cadastrar Nova Credencial"`). |
| **11.1** | Configurações → Alertas & Notificações | `/admin/configuracoes` (`ConfiguracoesModule.tsx`) | **AUDITADA** | Playwright (Switch IA + 3 cards Som, Aba, Windows). |
| **11.2** | Configurações → Diagnóstico das Conexões | `ConfiguracoesModule.tsx` | **AUDITADA** | Playwright (5 status técnicos + 3 cards de atalhos). |
| **11.3** | Configurações → Sessão & Sincronização | `ConfiguracoesModule.tsx` | **AUDITADA** | Playwright (Status rascunho, Limpar Cache, Restaurar Original, Logout). |
| **12.0** | Mensalidade do Site + Modais Recibo e Pix | `/admin/mensalidade` (`SiteSubscriptionEditor.tsx`) | **AUDITADA** | Playwright (Banner próxima fatura, 4 KPIs, 10 parcelas + `ReceiptModal`). |
| **13.1** | Player de Áudio DEV → Biblioteca de Faixas | `/admin/beta_player` (`MusicEditor.tsx`) | **AUDITADA** | Playwright (Switches, estilo, dropzone MP3 e 3 faixas). |
| **13.2** | Player de Áudio DEV → Preview do Player (Beta) | `MusicEditor.tsx` | **AUDITADA** | Playwright (Simulador interativo do player). |
| **14.0** | Assistente Nua IA DEV + Widget Flutuante | `/admin/beta_ia` (`BetaIaModule.tsx`) | **AUDITADA** | Playwright (4 cards + abertura do chat flutuante). |
| **M.1** | Modal Seletor de Fotos (`ImagePickerModal`) | `ImagePickerModal.tsx` | **AUDITADA** | Playwright (Aberto na Capa: 3 abas internas + botão `"Voltar para o Pack"`). |

---

## 5. AUDITORIA INDIVIDUAL DETALHADA DE CADA INTERFACE

---

### 0. SHELL GLOBAL: HEADER, BUSCA (`⌘K`), SIDEBAR E NAVEGAÇÃO MOBILE

#### 0.1 Header Global (`AdminHeader.tsx`)
- **A. Inventário:**
  - Esquerda: Botão Hambúrguer (mobile), Breadcrumb (`Categoria > Módulo`), Subtítulo do módulo, Indicador de rascunho (`Salvo` / `Alterações pendentes`).
  - Direita: Botão `Buscar... ⌘K`, Selo de status da mensalidade (`Vencida` / `Em dia`), Link externo `Ver Site`, Botão Sino de Notificações (abre popover de pedidos), Avatar `NB` e Botão primário `Publicar`.
- **B. Organização:**
  - Mistura no canto direito ações de **edição do site** (`Ver Site`, `Publicar`), **operação de vendas** (`Sino`) e **cobrança de hospedagem da agência** (`Vencida`).
  - **Estouro Horizontal no Mobile (`390×844`):** No iPhone, o bloco de botões da direita começa em `x=190px` com largura `226px` (`total = 416px` em tela de `390px`), cortando o sino e o avatar `NB`.
- **C. Complexidade:**
  - **Ambiguidade de Salvamento:** O botão `"Publicar"` no topo salva apenas alterações no `SiteContent` (Capa, Galeria, Sobre Mim, SEO, Redes), enquanto `Packs`, `Personalizados`, `Chamadas VIP` e `Senhas` usam botões internos `"Salvar"`. A cliente não sabe qual botão usar em cada tela.
- **D. Recomendação:** **Simplificar no mobile e tornar o botão `"Publicar"` uma barra contextual explícita.**
- **E. Proposta:**
  - No mobile (`< 640px`), exibir no topo apenas `[☰] [Título da Tela] [Sino] [Publicar (se houver rascunho)]`, movendo `Buscar`, `Ver Site` e `Mensalidade` para a gaveta do menu.

#### 0.2 Modal de Busca Rápida (`⌘K` — `AdminSpotlightModal.tsx`)
- **A. Inventário:** Input de busca instantânea + lista agrupada de módulos e sub-abas com dicas de atalho (`Alt+1..9`, `↑↓`, `Enter`, `ESC`).
- **B. Organização:** Limpa, rápida e bem estruturada.
- **C. Complexidade:** Baixa.
- **D. Recomendação:** **Manter.**
- **E. Proposta:** Adicionar busca direta por títulos de **Packs** e **Álbuns da Biblioteca**.

#### 0.3 Sidebar Desktop e Gaveta Mobile (`AdminSidebar.tsx`)
- **A. Inventário:** 5 grupos e 14 módulos (`Pedidos recebidos`, `Conteúdos & Packs`, `Pedidos personalizados`, `Chamadas VIP`, `Editar meu site`, `Divulgação & SEO`, `Redes e contato`, `Financeiro`, `Contratos`, `Acessos e senhas`, `Configurações`, `Mensalidade do Site`, `Player de Áudio DEV`, `Assistente Nua IA DEV`) + botões `"Recolher menu"` e `"Sair do Painel"`.
- **B. Organização:**
  - **Excesso de itens (14 módulos):** Dificulta a localização rápida, especialmente no celular.
  - **Divisão artificial entre `COMECE AQUI` e `VENDER E ATENDER`:** `Conteúdos & Packs` é um produto comercial tanto quanto `Pedidos personalizados` e `Chamadas VIP`, mas está separado deles.
  - **Biblioteca de Mídias oculta:** O repositório central de fotos e vídeos não tem item próprio na sidebar.
  - **Módulos de suporte/agência e DEV competindo com a operação diária:** `Contratos`, `Mensalidade do Site`, `Player de Áudio DEV` e `Assistente Nua IA DEV` ocupam quase 30% do menu lateral.
- **C. Complexidade:** Alta carga visual no menu principal.
- **D. Recomendação:** **Reduzir a Sidebar de 14 para 8 itens principais em 3 grupos.**
- **E. Proposta:** Ver arquitetura detalhada na Seção 11 (`1. Pedidos & Alertas`, `2. Packs à Venda`, `3. Pedidos Personalizados`, `4. Chamadas VIP`, `5. Financeiro`, `6. Biblioteca de Mídias`, `7. Editar Meu Site`, `8. Configurações & Conta`).

---

### 1. MÓDULO: PEDIDOS RECEBIDOS (`/admin/alertas` — `AlertasSistemaModule.tsx`)
- **A. Inventário:**
  - Cabeçalho com título `"Central de Alertas & Pedidos"`, botões `"Configurar Alertas"` e `"Atualizar"`.
  - Filtros: `Todos (0)`, `Personalizados`, `Chamadas VIP`, `Packs Avulsos` + `"Marcar todas como lidas"`.
  - Feed de notificações de pedidos (com cliente, contato, valor e botão `"Acessar Registro"`) ou card de estado vazio.
- **B. Organização:**
  - **Inconsistência de nomes na mesma tela:** Sidebar diz `Pedidos recebidos` (grupo `COMECE AQUI`), o Header diz `SISTEMA > Pedidos recebidos (Notificações e avisos do sistema)` e o card diz `Central de Alertas & Pedidos`.
  - O botão `"Configurar Alertas"` tira a cliente da tela atual e a joga em `/admin/configuracoes`.
- **C. Complexidade:** Baixa, mas quando está com `0` pedidos, a primeira tela do painel fica completamente vazia e sem ações úteis.
- **D. Recomendação:** **Manter como página inicial, unificar o nome para `Pedidos & Alertas` e adicionar atalhos rápidos no estado vazio.**
- **E. Proposta:** Exibir no estado vazio 3 botões de ação rápida: `[+ Criar Novo Pack]`, `[Ver Fila de Chamadas]` e `[Subir Fotos na Biblioteca]`.

---

### 2. MÓDULO: CONTEÚDOS & PACKS (`/admin/conteudos` — `ConteudosPacksModule.tsx`)

#### 2.1 Aba 1: `Produtos à venda` (`AvulsosEditor.tsx`) + Acordeão `PacksSectionSettings.tsx`
- **A. Inventário:**
  - Topo: Título `"Catálogo de Produtos"`, botão `"Ir para Fotos e Vídeos"` e botão **`"Criar produto / pack"`**.
  - Acordeão `"Configurações da Seção & Textos da Vitrine"` (4 campos de texto para o cabeçalho da loja de packs).
  - 4 KPIs (`Total de Packs`, `Publicados`, `Em Destaque`, `Amostras Grátis`).
  - Busca + filtros (`Todos`, `Ativos`, `Ocultos`) + botão **`"Criar Pack"`**.
  - Estado vazio com botão **`"Criar Primeiro Pack"`**.
- **B. Organização:**
  - **Três botões de criar pack na mesma tela** quando a lista está vazia (`"Criar produto / pack"`, `"Criar Pack"` e `"Criar Primeiro Pack"`).
  - **Mistura de Módulos:** Está acoplado à Biblioteca Global de Mídias (`Fotos e vídeos`).
- **C. Complexidade:** Baixa na listagem, mas poluída por controles repetidos.
- **D. Recomendação:** **Tornar `Packs à Venda` um módulo independente na sidebar e eliminar os botões duplicados.**
- **E. Proposta:** Deixar apenas 1 botão primário `"Criar Novo Pack"` no topo (e no centro se a lista estiver vazia), ocultando a barra de busca/filtros quando houver `0` packs.

#### 2.1.2 Subpágina: Editor Completo de Pack (`PackEditorPage.tsx`)

##### Etapa 1: `1. Dados & Precificação` (`PackInfoTab.tsx`)
- **A. Inventário:**
  - Barra superior (`Voltar`, `Excluir Pack`, **`Salvar Pack`**).
  - Coluna Esquerda: `Título do Pack *`, `Preço Oficial *`, **`Destaque / Badge (Opcional)`** (linha 60), `Slug / Identificador de URL (Automático)`, `Link Direto de Checkout Externo (Opcional)`, **`Selo / Badge de Destaque`** (linha 115), `Quantidade de Fotos (No Card)`, `Quantidade de Vídeos (No Card)`, `Descrição Comercial & Sinopse`, switches `Pack Visível na Loja` e `Destacar Pack (VIP)`.
  - Coluna Direita: Imagem de capa (`Escolher da Biblioteca` / `Enviar do Computador`) + 4 botões de proporção (`3:4 Retrato`, `16:9 Cinema`, `1:1 Quadrado`, `21:9 Ultra-Wide`).
  - Barra inferior fixa (`Cancelar e Descartar`, **`Salvar Pack Agora`**).
- **B. Organização:**
  - **Campo `pack.badge` duplicado duas vezes no mesmo formulário** (linhas 60 e 115 de `PackInfoTab.tsx`).
  - **Duas barras de Salvar/Cancelar visíveis simultaneamente** (topo e rodapé).
  - **Contadores manuais desconectados:** Pede para digitar manualmente a quantidade de fotos e vídeos do card, em vez de contar os arquivos anexados na Etapa 3.
- **C. Complexidade:** Campos técnicos (`Slug`, `Link de Checkout Externo`, `21:9 Ultra-Wide`) poluem o cadastro básico do produto.
- **D. Recomendação:** **Simplificar drasticamente a Etapa 1.**
- **E. Proposta:** Remover o campo `Badge` duplicado; ocultar `Slug` e `Checkout Externo` em `"Opções Avançadas"`; calcular automaticamente o total de fotos e vídeos a partir do Cofre (Etapa 3); manter uma única barra de salvamento.

##### Etapa 2: `2. Amostras Gratuitas` (`PackPreviewsTab.tsx`)
- **A. Inventário:** Botões `"Escolher da Biblioteca"` e `"Subir do Computador"` + grade de fotos/vídeos de prévia gratuita.
- **B. Organização:** Clara e focada em uma única tarefa.
- **C. Complexidade:** Como o `ImagePickerModal` só permite escolher **1 foto por vez**, adicionar 6 amostras exige abrir e fechar o modal 6 vezes.
- **D. Recomendação:** **Manter a aba e adicionar seleção múltipla ao `ImagePickerModal`.**
- **E. Proposta:** Permitir selecionar várias fotos de uma vez no modal e clicar em `"Adicionar X Fotos"`.

##### Etapa 3: `3. Cofre Protegido` (`PackVaultTab.tsx`)
- **A. Inventário:**
  - Bloco 1: `Galeria de Fotos Exclusivas` (botões `"Anexar Foto do Cofre"` via `ImagePickerModal` e `"Subir Nova Foto"`).
  - Bloco 2: `Vídeos em 4K & Bastidores Exclusivos` (botão `"Adicionar Vídeo 4K"`, que cria linhas com inputs de texto manuais: `Título do Vídeo`, `Duração (Ex: 05:20 Min)` e `URL do Arquivo MP4 (https://...)`).
  - Bloco 3: `Áudios Exclusivos & Arquivos Bônus` (botão `"Adicionar Áudio / Extra"` com inputs manuais de título, tipo e URL).
  - Bloco 4: `Mensagem de Boas-Vindas no Cofre do Comprador` (textarea).
- **B. Organização:**
  - **Inconsistência Crítica:** Fotos usam a Biblioteca de Mídias visual, mas **Vídeos 4K** exigem colar URLs `.mp4` na mão e digitar a duração manualmente!
- **C. Complexidade:** Inviável para uma usuária não técnica cadastrar vídeos por URL manual.
- **D. Recomendação:** **Integrar o bloco de Vídeos 4K diretamente com a Biblioteca de Mídias e Upload direto.**
- **E. Proposta:** O botão `"Adicionar Vídeo 4K"` deve abrir o seletor da Biblioteca filtrado por vídeos (`allowedMediaType="videos"`) ou permitir upload direto do vídeo, preenchendo URL, miniatura e duração automaticamente.

#### 2.2 Aba 2: `Fotos e vídeos` — Biblioteca de Mídias (`LibraryEditor.tsx`)
- **A. Inventário:**
  - Dropzone de upload + seletor `"Salvar em: Sem álbum específico"` + botão **`"Criar Álbum"`**.
  - Barra de álbuns (`Todas as Mídias`, `Favoritas`, `Sem Álbum`, álbuns personalizados) + segundo botão **`"Criar Álbum"`**.
  - Barra de ferramentas: filtros (`Todos`, `Fotos`, `Vídeos`), busca, ordenação (`Mais recentes`, `Mais antigas`, `Nome A-Z`), modo de exibição (`Mosaico` / `Compacta`), botão `"Selecionar Várias"`.
  - Grade de mídias (`LibraryMediaGrid`) com badges de onde a foto está em uso no site (`Na Capa`, `Na Galeria`, `No Sobre`).
- **B. Organização:**
  - **Escondida no lugar errado:** Sendo o acervo central do site inteiro, não pode ser uma sub-aba de `Conteúdos & Packs`.
  - **Botão `"Criar Álbum"` duplicado:** Aparece no canto direito da área de upload e, 40 pixels abaixo, aparece de novo na barra de álbuns.
- **C. Complexidade:** Boa usabilidade interna, mas prejudicada pela existência de múltiplos modais diferentes (`AlbumCreateModal`, `AlbumMediaSelectorModal`, `ImagePickerModal`, `MediaViewerModal`).
- **D. Recomendação:** **Promover para item de 1º nível na Sidebar (`Biblioteca de Mídias`), remover o botão `"Criar Álbum"` duplicado e unificar os seletores.**
- **E. Proposta:** Ver detalhamento completo na Seção 9.

---

### 3. MÓDULO: PEDIDOS PERSONALIZADOS (`/admin/personalizados` — `PersonalizadosEditor.tsx`)

#### 3.1 Aba 1 (Atual): `Preços & Calculadora` (`PersonalizadosPricingForm.tsx` + `PersonalizadosSimulator.tsx`)
- **A. Inventário:**
  - Botão superior **`"Salvar Alterações"`**.
  - Coluna Esquerda: 1) Precificação de Fotos (switch, valor unitário, mín/máx, mínimo global); 2) Tabela de Vídeos (switch + 5 faixas de duração e preço); 3) Adicionais (Falar Nome, Entrega Expressa 24h, Desconto Progressivo); 4) Canais de Entrega & Prazos (Telegram, Cofre no Site, Prazo Normal, Prazo Express, Limites Éticos); 5) Textos de Apresentação da Vitrine (`/personalizados`).
  - Coluna Direita: `Simulador em Tempo Real` + botão **`"Publicar Alterações na Calculadora"`**.
- **B. Organização:**
  - **Ordem de Abas Invertida:** Esta aba de configuração abre primeiro que a `Fila de Pedidos`.
  - **Sobrecarga Visual Severa:** Mistura tabela de preços, regras de entrega, limites éticos e textos institucionais da página pública em uma única tela longa.
  - **Dois botões de salvar na mesma tela:** `"Salvar Alterações"` no topo e `"Publicar Alterações na Calculadora"` no simulador.
- **C. Complexidade:** Mais de 25 controles simultâneos na mesma visualização.
- **D. Recomendação:** **Mover para a Aba 2 (depois da Fila de Pedidos), unificar o botão de salvar e separar Textos/Regras da Vitrine em acordeão.**
- **E. Proposta:** Deixar visíveis apenas **Preços de Fotos, Vídeos e Adicionais** ao lado do **Simulador**, recolhendo `"Prazos & Limites Éticos"` e `"Textos da Página Pública (/personalizados)"` em acordeões expansíveis.

#### 3.2 Aba 2 (Atual): `Fila de Pedidos` (`PersonalizadosOrdersTab.tsx` + `PersonalizadosOrderCard.tsx`)
- **A. Inventário:** 4 KPIs, busca, 5 filtros de status e lista de cards de pedidos (`PersonalizadosOrderCard`) com formulário de entrega no cofre (`vaultFileName`, `vaultFileUrl`, `vaultFileType`).
- **B. Organização:**
  - Deveria ser a **Aba 1** (tela padrão do módulo).
  - Na entrega do pedido para o cliente, exige digitar manualmente uma **URL de arquivo** em vez de escolher da Biblioteca de Mídias ou fazer upload direto.
- **C. Complexidade:** Fácil para consultar a fila, mas técnica demais para entregar o arquivo ao fã.
- **D. Recomendação:** **Tornar esta a Aba 1 e integrar a entrega do pedido com a Biblioteca de Mídias / Upload Direto.**
- **E. Proposta:** Substituir os inputs manuais de URL por um botão `"Anexar Fotos/Vídeos para o Cliente"` que abre o seletor da biblioteca ou faz upload direto.

---

### 4. MÓDULO: CHAMADAS VIP (`/admin/chamadas` — `AppointmentsEditor.tsx`)

#### 4.1 Aba 1: `Fila de Chamadas` (`AppointmentsBookingsTab.tsx`)
- **A. Inventário:** 5 KPIs no topo (`Hoje`, `Pendentes`, `Confirmadas`, `Concluídas`, `Faturamento`), busca, 6 filtros de status e lista de agendamentos (com acesso a `AppointmentBookingPage` e `AppointmentsModals` para confirmar/inserir link da chamada, reagendar ou cancelar).
- **B. Organização:** Bem organizada e posicionada corretamente como Aba 1.
- **C. Complexidade:** Adequada.
- **D. Recomendação:** **Manter como Aba 1, mas exibir os 5 KPIs SOMENTE nesta aba.**
- **E. Proposta:** Ocultar os 5 cards de KPIs quando a cliente alternar para `Calendário Visual`, `Modalidades & Preços` ou `Horários & Agenda`.

#### 4.2 Aba 2: `Calendário Visual` (`AppointmentsCalendarTab.tsx`)
- **A. Inventário:** Calendário mensal interativo + painel lateral do dia selecionado com lista de chamadas do dia e botão `"Bloquear Data"`.
- **B. Organização:** Excelente visualização e interação direta.
- **C. Complexidade:** Muito fácil de usar.
- **D. Recomendação:** **Manter como o lugar oficial para bloquear folgas e feriados.**
- **E. Proposta:** Exibir no painel lateral do dia um resumo das datas já bloqueadas no mês.

#### 4.3 Aba 3: `Modalidades & Preços` (`AppointmentsTypesTab.tsx`)
- **A. Inventário:** 3 cards de pacotes de tempo (`15 min — R$ 150`, `30 min — R$ 280`, `60 min — R$ 500`) + card inferior `"Textos da Vitrine Pública (/chamadas)"` com 6 campos de texto.
- **B. Organização:** Poluída pelos 5 KPIs globais no topo e pelos 6 campos de texto da vitrine abertos no final da página.
- **C. Complexidade:** Moderada.
- **D. Recomendação:** **Recolher os `"Textos da Vitrine Pública (/chamadas)"` em um acordeão no topo da aba** (padronizando com `Packs` e `Galeria`).
- **E. Proposta:** Focar a tela nos 3 cards de preços de pacotes e deixar os textos institucionais da página `/chamadas` recolhidos até que a cliente queira editá-los.

#### 4.4 Aba 4: `Horários & Agenda` (`AppointmentsAvailabilityTab.tsx`)
- **A. Inventário:**
  - Bloco 1: Regras Gerais (Fuso, Antecedência Mínima, Intervalo entre chamadas, Janela máxima).
  - Bloco 2: Horários Semanais (Segunda a Domingo com switch e horários de início/fim).
  - Bloco 3: `Datas Bloqueadas (Férias e Folgas)` com input de texto bruto exigindo formato técnico **`AAAA-MM-DD`** (`Ex: 2026-12-25`).
- **B. Organização:** Os Blocos 1 e 2 são claros, mas o Bloco 3 duplica o bloqueio de datas do `Calendário Visual` usando um formato técnico hostil (`AAAA-MM-DD`).
- **C. Complexidade:** Exigir digitação `AAAA-MM-DD` é um erro clássico de formulário técnico.
- **D. Recomendação:** **Remover a digitação manual `AAAA-MM-DD` e usar seletor de data visual (`DD/MM/AAAA`) integrado ao Calendário Visual.**
- **E. Proposta:** Substituir o input de texto por um seletor de data nativo ou botão `"Selecionar Folgas no Calendário"`.

---

### 5. MÓDULO: EDITAR MEU SITE (`/admin/vitrine` — `VitrineCapaModule.tsx`)

#### 5.1 Aba 1: `Foto e textos da capa` (`HeroEditor.tsx`)
- **A. Inventário:**
  1. Banner técnico de medidas (`1920 × 1080 px` / `1080 × 1920 px`) + botão `"Restaurar Padrão Editorial"`.
  2. `Textos da Capa Principal`: 3 switches (`Imagem em Tela Cheia`, `Preencher Altura da Tela`, `Usar Imagem de Logo`) + 7 campos de texto.
  3. **`Menu & Cabeçalho do Site` (`HeroHeaderForm`):** 4 campos (`Nome da Marca no Topo`, `Monograma NB`, `Texto do Botão do Topo`, `Link do Botão do Topo`).
  4. `Fotos da Capa (4)` (`HeroPhotosManager`): Grade com as 4 fotos do carrossel da capa.
- **B. Organização:**
  - **1ª Tela Mais Sobrecarregada do CMS:** Mistura **Capa Principal (Hero)** com **Barra de Navegação Global do Site (`Menu & Cabeçalho do Site`)**.
  - **Fotos escondidas no fim da página:** Em uma aba chamada `"Foto e textos da capa"`, a cliente precisa rolar por um banner técnico, 3 switches e 11 campos de texto antes de enxergar as **Fotos da Capa**!
  - **Botão `"Restaurar Padrão Editorial"` enganoso:** Está dentro do card de medidas de fotos, mas reseta silenciosamente todos os textos do Hero **e** do Menu do Topo.
- **C. Complexidade:** Alta. Switches como `"Imagem em Tela Cheia (Fundo)"` e `"Preencher Altura da Tela"` são controles de layout CSS que a cliente não precisa mexer no dia a dia.
- **D. Recomendação:** **Trazer as Fotos da Capa para o topo da aba, mover `Menu & Cabeçalho do Site` para uma sub-aba própria (`Topo & Rodapé`) e ocultar switches técnicos.**
- **E. Proposta:**
  - Ordem na aba `Capa Principal`: **1º Fotos da Capa (4)** → **2º Textos e Botão da Capa** (com opção simples de usar Logo ou Texto).
  - Mover `Menu & Cabeçalho do Site` para uma nova sub-aba **`Topo & Rodapé`** (junto com os textos de rodapé que hoje estão em SEO).

#### 5.2 Aba 2: `Galeria de fotos` (`GalleryEditor.tsx`)
- **A. Inventário:**
  - Topo: Contador `8 itens na vitrine`, botão `"Editar Textos da Vitrine"` (acordeão com 4 campos), botão `"Adicionar da Biblioteca"`.
  - Filtros: `Todos os Ensaios (8)`, `Apenas Fotos (8)`, `Produções em Vídeo (0)`.
  - Lista de 8 cards horizontais (`GalleryItemCard`), cada um exibindo miniatura + 3 inputs de texto abertos (`Título`, `Legenda`, `Link`) + 6 botões (`Trocar`, `Desfoque VIP`, `↑`, `↓`, `Visível/Ocultar`, `Remover`).
- **B. Organização:**
  - O cabeçalho com acordeão é bem organizado, mas a **lista de fotos com formulários completos repetidos linha a linha** torna a página excessivamente longa (`24 inputs` e `48 botões` para apenas 8 fotos) e impede que a cliente veja o mosaico da galeria como ele aparece no site.
- **C. Complexidade:** Cansativa para ordenar e revisar visualmente o conjunto das fotos.
- **D. Recomendação:** **Transformar a lista de linhas pesadas em uma Grade Visual de Cards Compactos.**
- **E. Proposta:** Exibir 3 a 4 fotos por linha com controles rápidos visíveis (`#Posição`, `Desfoque VIP`, `Ocultar`, `Subir/Descer`, `Remover`) e abrir os 3 campos de texto (`Título`, `Legenda`, `Link`) apenas ao clicar em `"Editar Legenda"` naquela foto.

#### 5.3 Aba 3: `Sobre mim` (`AboutEditor.tsx`)
- **A. Inventário:** Foto de perfil + 4 campos de identidade à esquerda; 2 textareas de biografia + input de assinatura manuscrita com prévia cursiva à direita.
- **B. Organização:** **Exemplar.** Clara, limpa, sem excesso de informação.
- **C. Complexidade:** Baixa.
- **D. Recomendação:** **Manter integralmente.**
- **E. Proposta:** Apenas corrigir o texto `"Voltar para o Pack"` no modal seletor de foto quando aberto a partir daqui.

---

### 6. MÓDULO: DIVULGAÇÃO & SEO (`/admin/seo` — `DivulgacaoSeoModule.tsx`)

#### 6.1 Aba 1: `Divulgação & Google` (`SeoEditor.tsx`)
- **A. Inventário:**
  1. Card `Aparência no Google, WhatsApp & Redes`: Título (contador 60), Descrição (contador 160), Palavras-chave, Foto de Prévia (`ogImage`) e Prévias simuladas do **WhatsApp** e do **Google**.
  2. Card `Mensagem do Rodapé`: `Texto de Direitos Autorais` e `Frase de Assinatura do Rodapé`.
  3. Card `Proteção Ativa de Fotos e Conteúdo`: Card estático informativo (`Anti-Scraping Ativo`, `Proteção de Download Fácil`, `CDN Cloudflare com SSL`).
  4. Card `Restaurar Conteúdo Original`: Botão destrutivo global **`"Restaurar Tudo"`**.
- **B. Organização:**
  - O Card 1 (Google e WhatsApp) é excelente, mas os Cards 2, 3 e 4 estão **totalmente fora de lugar**:
    - **Rodapé** não é SEO;
    - **Proteção Ativa** é um banner estático sem nenhuma função interativa;
    - **Restaurar Tudo** é um botão de pânico global duplicado (já existe em `Configurações`) que pode fazer a cliente apagar o site inteiro achando que está restaurando apenas o SEO!
- **C. Complexidade:** Desnecessariamente inchada pelos 3 cards finais.
- **D. Recomendação:** **Manter apenas o Card 1 nesta aba.**
- **E. Proposta:** Mover `Mensagem do Rodapé` para `Editar Meu Site → Topo & Rodapé`; remover o card estático de proteção e remover o botão duplicado `"Restaurar Tudo"`.

#### 6.2 Aba 2: `Páginas Legais & Termos` (`InstitutionalEditor.tsx`)
- **A. Inventário:** Card 1: Título/descrição da coluna Institucional no rodapé; Card 2: Lista de links legais (`Termos de Uso`, `Política de Privacidade`); Card 3: `Aviso de Maioridade (+18)`; Card 4: `Diretrizes dos Termos de Uso & Privacidade no Checkout`.
- **B. Organização:** Bem organizada internamente, mas escondida sob o nome `Divulgação & SEO` na sidebar.
- **C. Complexidade:** Moderada e bem dividida.
- **D. Recomendação:** **Transformar em sub-aba `Termos Legais & Aviso +18` dentro de `Editar Meu Site`.**
- **E. Proposta:** Manter os 4 cards internos e tornar seu nome explícito na navegação de `Editar Meu Site`.

---

### 7. MÓDULO: REDES E CONTATO (`/admin/conexoes` — `ConexoesContatoModule.tsx`)

#### 7.1 Aba 1: `Redes sociais e plataformas` (`ChannelsEditor.tsx`)
- **A. Inventário:**
  1. Card `Textos da Seção de Redes` (3 campos).
  2. Card `Lista de Redes e Plataformas` (`Privacy`, `OnlyFans`, `Instagram`, `Telegram VIP`) com edição expansível inline.
  3. Card `Faixa de Contato Profissional & Imprensa` (4 campos que configuram a faixa de contato comercial no site).
- **B. Organização:**
  - Os Cards 1 e 2 são ótimos, mas o **Card 3 (`Faixa de Contato Profissional & Imprensa`) está na aba errada**: ele configura a chamada para o formulário de contato comercial, que fica na Aba 2 (`Contato comercial`)!
- **C. Complexidade:** Baixa.
- **D. Recomendação:** **Mover o Card `"Faixa de Contato Profissional & Imprensa"` para a Aba 2 (`Contato comercial`).**
- **E. Proposta:** Deixar na Aba 1 apenas as redes sociais e plataformas VIP.

#### 7.2 Aba 2: `Contato comercial` (`ContactEditor.tsx`)
- **A. Inventário:** E-mail oficial de recebimento (com validação em tempo real), Card informativo `Proteção Ativa Anti-Spam no Formulário` (citando `Honeypot invisível` e `Time-Trap de 2.5s`), Título e Boas-vindas da janela modal, e lista de 4 `Opções de Assunto`.
- **B. Organização:** Boa, porém incompleta sem a `Faixa de Contato` (que está na Aba 1) e com jargão técnico no card de Anti-Spam.
- **C. Complexidade:** Baixa.
- **D. Recomendação:** **Unificar aqui a Faixa de Contato + Janela de Contato + E-mail + Assuntos e simplificar o texto Anti-Spam.**
- **E. Proposta:** Substituir o parágrafo sobre *Honeypot invisível e Time-Trap de 2.5s* por um selo simples ao lado do e-mail: `"✓ Filtro anti-spam automático ativo"`.

---

### 8. MÓDULO: FINANCEIRO (`/admin/financeiro` — `CommercialFinanceEditor.tsx`)
- **A. Inventário:**
  - Topo: Seletor de período (`Mês Atual`, `30 Dias`, `90 Dias`, `Tudo`) + botão Atualizar.
  - 6 KPIs Principais (`Receita Bruta`, `Receita Líquida`, `Taxas Stripe`, `Vendas Aprovadas`, `Ticket Médio`, `Pendentes / Reembolsos`).
  - 3 Cards de Consolidação por Modalidade (`Packs Avulsos`, `Pedidos Personalizados`, `Chamadas VIP`).
  - Gráfico de Evolução Temporal (barras diárias/mensais).
  - Tabela `Histórico Completo de Transações` com busca, filtro de modalidade (`Todas`, `Packs`, `Personalizados`, `Chamadas`) e filtro de status (`Todos`, `Aprovados`, `Pendentes`, `Falhas`, `Reembolsados`).
- **B. Organização:**
  - **Excelente organização interna!** Segue a pirâmide invertida de dashboards executivos (Resumo Geral → Divisão por Produto → Evolução no Tempo → Transações Individuais).
  - **Posicionamento na Sidebar:** Hoje está em `GESTÃO E SISTEMA`, longe de `VENDER E ATENDER`. Como ele mostra exatamente as vendas de Packs, Personalizados e Chamadas VIP, deveria ficar no grupo comercial.
- **C. Complexidade:** Moderada, mas muito bem hierarquizada. No mobile, a tabela final exige scroll horizontal.
- **D. Recomendação:** **Manter a tela intacta e movê-la para o grupo `VENDER E ATENDER` na Sidebar.**
- **E. Proposta:** No mobile (`< 640px`), renderizar as transações da tabela como pequenos cartões empilhados para evitar rolagem horizontal.

---

### 9. MÓDULO: CONTRATOS (`/admin/contratos` — `ContratosModule.tsx`)
- **A. Inventário:**
  - Banner com selo `"Instrumento Particular Vigente"` e botão `"Baixar Contrato (PDF)"`.
  - 4 cards de resumo (`Contratante`, `Contratado`, `Valor Total R$ 2.000`, `Foro`).
  - Documento completo aberto na tela com **20 cláusulas jurídicas integrais** + bloco de assinaturas digitais.
- **B. Organização:**
  - O contrato é um documento estático de consulta eventual (lido uma vez na contratação), mas ocupa um item fixo de 1º nível na sidebar e renderiza 20 cláusulas jurídicas abertas de uma só vez.
  - Está separado de `Mensalidade do Site` (`/admin/mensalidade`), embora ambos tratem exatamente da mesma relação contratual (o contrato de R$ 2.000 em 10 parcelas de R$ 200!).
- **C. Complexidade:** Página muito longa por exibir as 20 cláusulas abertas.
- **D. Recomendação:** **Unificar `Contratos` e `Mensalidade do Site` em uma única área (`Minha Assinatura & Contrato`) dentro de `Configurações & Conta`.**
- **E. Proposta:** Colocar o texto integral das 20 cláusulas dentro de um container com altura controlada (`max-h-[420px] overflow-y-auto`) ou acordeão `"Ler todas as 20 cláusulas do contrato"`, mantendo o Resumo e o botão `"Baixar PDF"` sempre visíveis no topo.

---

### 10. MÓDULO: ACESSOS E SENHAS (`/admin/cofre` — `CofreCredenciaisModule.tsx`) + Modal `CredentialFormModal.tsx`
- **A. Inventário:**
  - Banner `"Cofre Criptografado AES-256"` + botão `"Cadastrar Credencial"`.
  - Grade de 6 `"Atalhos de Serviços Pré-Configurados"` (`Hostinger`, `Yahoo Mail`, `Painel Admin`, `Stripe`, `Cloudflare`, `Outro Serviço`).
  - Barra de 6 abas de categoria (`Todas`, `Hostinger`, `Yahoo`, `Painel Admin`, `Stripe`, `Cloudflare`) + campo de busca.
  - Lista de cartões de credenciais (`CredentialCard` com revelar senha, copiar usuário, copiar senha, editar, excluir) ou estado vazio com botão `"Cadastrar Primeira Senha"`.
  - Modal `CredentialFormModal`: Seletor de serviço, Título, Categoria, Usuário/E-mail, Senha (com botão `"Gerar Forte"`), URL de acesso e botões Cancelar/Salvar.
- **B. Organização:**
  - **Redundância visual com Cofre Vazio:** Quando não há nenhuma senha cadastrada, a tela exibe **6 botões grandes de atalhos** + **6 abas de filtro para as mesmas categorias** + **3 botões de cadastrar** (`"Cadastrar Credencial"` no topo, os 6 cards de atalho no meio e `"Cadastrar Primeira Senha"` no estado vazio).
- **C. Complexidade:** Baixa e segura, mas com excesso de elementos repetidos quando a lista está vazia.
- **D. Recomendação:** **Ocultar a barra de filtros e busca quando o cofre estiver vazio e integrar como aba de `Configurações & Conta`.**
- **E. Proposta:** Enquanto `credentials.length === 0`, mostrar apenas o cabeçalho e os 6 atalhos rápidos para a cliente clicar e cadastrar sua primeira senha; exibir a barra de filtros e busca somente quando houver senhas salvas.

---

### 11. MÓDULO: CONFIGURAÇÕES (`/admin/configuracoes` — `ConfiguracoesModule.tsx`)

#### 11.1 Aba 1: `Alertas & Notificações`
- **A. Inventário:**
  - Card superior: Switch **`Assistente Nua IA`** (Ativada/Desativada no painel).
  - Grid de 3 cards: 1) **`Toque Sonoro`** (switch + botão `"Testar Som"`); 2) **`Aba do Navegador`** (switch + botão `"Testar Aba"`); 3) **`Notificações Windows`** (switch + botão `"Autorizar no Navegador"` / `"Testar Windows"`).
- **B. Organização:** Muito limpa, visual e fácil de testar. O único detalhe é o switch da `Assistente Nua IA` estar dentro da aba de `Alertas & Notificações`, enquanto existe um módulo inteiro na sidebar chamado `Assistente Nua IA DEV`.
- **C. Complexidade:** Baixa.
- **D. Recomendação:** **Manter esta aba como o centro oficial de preferências do painel (incluindo o switch da IA e eliminando o módulo `Assistente Nua IA DEV` da sidebar).**
- **E. Proposta:** Renomear a aba para **`Preferências & Alertas`**.

#### 11.2 Aba 2: `Diagnóstico das Conexões`
- **A. Inventário:**
  - Card 1: `Status Técnico dos Serviços Integrados` com 5 linhas técnicas: `Hospedagem & CDN (Cloudflare Pages)`, `Banco de Dados & Catálogo (Cloudflare D1 / KV)`, `Armazenamento de Mídias (Cloudflare R2 Bucket)`, `Gateway de Pagamentos (Stripe Checkout & Webhooks)`, `Disparo de E-mails Transacionais (Resend API)`.
  - Card 2: 3 cartões de atalho (`"Ir para o Cofre de Senhas"`, `"Ver Faturamento Stripe"`, `"Ver Mensalidade do Site"`).
- **B. Organização:**
  - **Excesso de jargão de infraestrutura:** Termos como `Cloudflare D1 / KV`, `Cloudflare R2 Bucket` e `Resend API` não dizem nada para a cliente, e os status mostrados no código (`ConfiguracoesModule.tsx:318-395`) são **estáticos/hardcoded** (`Operacional`, `Conectado`, `Ativo`), não refletindo um teste real de conexão!
- **C. Complexidade:** Técnica e meramente decorativa.
- **D. Recomendação:** **Simplificar para um resumo amigável na aba de Sistema ou remover jargões técnicos.**
- **E. Proposta:** Se mantido, usar linguagem humana (`Site no Ar`, `Banco de Dados`, `Galeria de Fotos`, `Pagamentos Stripe`, `Envio de E-mails`) e fundir com a Aba 3.

#### 11.3 Aba 3: `Sessão & Sincronização`
- **A. Inventário:**
  - Card 1 (`Estado de Publicação Local`): Mostra se há rascunho não publicado + botão `"Limpar Cache Local de Rascunhos"`.
  - Card 2 (`Restaurar Conteúdo Original`): Botão **`"Restaurar Padrão Original"`** (mesma função que também aparece duplicada lá na aba de SEO!).
  - Card 3 (`Segurança da Sessão`): Botão `"Encerrar Sessão com Segurança"`.
- **B. Organização:** Clara e bem separada, sendo o **lugar correto** para ações de cache, reset de fábrica e logout (diferente da aba de SEO).
- **C. Complexidade:** Baixa.
- **D. Recomendação:** **Manter aqui o `"Restaurar Padrão Original"` (com modal de confirmação) e removê-lo da aba de SEO.**
- **E. Proposta:** Unificar `Diagnóstico` + `Sessão & Sincronização` em uma única aba **`Sistema & Segurança`**.

---

### 12. MÓDULO: MENSALIDADE DO SITE (`/admin/mensalidade` — `SiteSubscriptionEditor.tsx`) + Modais `ReceiptModal.tsx` e `PaymentModal.tsx`
- **A. Inventário:**
  - Banner superior: `Infraestrutura & Suporte Técnico (Mercado Pago)` mostrando a próxima fatura (`Parcela 2/10 • R$ 200,00`) + botão **`"Pagar via Pix"`** (abre `PaymentModal`).
  - 4 KPIs: `Total Contratado (R$ 2.000,00)`, `Total Já Quitado (R$ 200,00)`, `Saldo Restante (R$ 1.800,00)`, `Progresso Geral (10%)`.
  - Tabela `Cronograma de Faturamento (10 Parcelas)`: Colunas `Parcela`, `Vencimento`, `Valor`, `Status` (`Quitada`, `Vencida`, `Em Aberto`), `Data de Pagamento` e `Ações` (`Ver Recibo` / `PDF` nas pagas; `Pagar via Pix` nas abertas).
  - Modais: `ReceiptModal` (comprovante detalhado + download PDF) e `PaymentModal` (QR Code Pix / Copia e Cola).
- **B. Organização:**
  - Internamente é muito bem organizada, transparente e prática.
  - Estruturalmente, trata do pagamento das 10 parcelas previstas no módulo `Contratos` (`/admin/contratos`), mas está separada dele na sidebar.
- **C. Complexidade:** Baixa no desktop; no mobile (`390×844`), a tabela de 6 colunas exige scroll horizontal.
- **D. Recomendação:** **Unificar com `Contratos` em uma única área `Assinatura & Contrato` (acessível pelo selo do topo ou por `Configurações & Conta`).**
- **E. Proposta:** Na aba `Assinatura & Contrato`, exibir primeiro o **Cronograma das 10 Parcelas (Mensalidade)** e, logo abaixo (ou em uma sub-aba `"Ver Contrato Assinado"`), os termos do contrato e download do PDF.

---

### 13. MÓDULO: PLAYER DE ÁUDIO DEV (`/admin/beta_player` — `MusicEditor.tsx`)

#### 13.1 Aba 1: `Biblioteca de Faixas` e 13.2 Aba 2: `Preview do Player (Beta)`
- **A. Inventário:**
  - Aba 1: Switch `"Player de Áudio Ativado"`, seletor `"Estilo do Player no Site"` (`Discreto / Pílula` vs. `Card Expandido`), switch `"Reprodução Automática (Autoplay)"`, dropzone para subir `.mp3` e lista de 3 faixas (`Sade - No Ordinary Love`, etc.) com edição de título/artista, play de teste, reordenação e exclusão.
  - Aba 2: Simulador visual interativo mostrando como o player flutuante fica no canto do site.
- **B. Organização:**
  - O módulo está pronto, funcional e edita diretamente `content.music` no site público!
  - **Problema de Organização:** Por que ele está rotulado como **`Player de Áudio DEV`** dentro de uma categoria **`FERRAMENTAS DEV`** no final da sidebar? "DEV" transmite para a cliente que é algo quebrado ou exclusivo para programadores, quando na verdade é o controle da **Música de Fundo do Site**!
- **C. Complexidade:** Baixa e muito intuitiva.
- **D. Recomendação:** **Remover o rótulo `DEV`, eliminar o grupo `FERRAMENTAS DEV` da sidebar e mover o controle de Música para dentro de `Editar Meu Site` (ou `Configurações`).**
- **E. Proposta:** Renomear para **`Música de Fundo`** (sem a sigla `DEV`) e integrá-lo como uma aba ou seção de `Editar Meu Site` (unindo a lista de faixas e o preview na mesma tela em 2 colunas, sem precisar de 2 sub-abas).

---

### 14. MÓDULO: ASSISTENTE NUA IA DEV (`/admin/beta_ia` — `BetaIaModule.tsx`) + Widget `AdminAiAssistant.tsx`
- **A. Inventário:**
  - Página `/admin/beta_ia`: Cabeçalho explicativo + 4 cartões estáticos descrevendo o que a IA faz (`Gestão de Conteúdo & Textos`, `Controle de Preços & Packs`, `Operação Financeira & Parcelas`, `Navegação Inteligente`) + botão `"Abrir Assistente Nua IA"`.
  - Widget Flutuante (`AdminAiAssistant`): Botão redondo fixo no canto inferior direito de **todas as telas do painel**, que abre a janela de chat com a IA.
- **B. Organização:**
  - **Página 100% Redundante:** Como o botão flutuante da `Assistente Nua IA` já está presente no canto inferior direito de todas as páginas do admin e o switch de ativar/desativar a IA já está em `Configurações → Alertas & Notificações`, ter um módulo inteiro na sidebar (`/admin/beta_ia`) apenas para mostrar 4 cartões de propaganda da própria IA e um botão que abre o chat do canto direito é desperdício de espaço na navegação!
- **C. Complexidade:** Desnecessária como item de menu.
- **D. Recomendação:** **Remover completamente o item `Assistente Nua IA DEV` da Sidebar.**
- **E. Proposta:** Manter apenas o **botão flutuante da IA** no canto inferior direito do painel e o switch de ativar/desativar dentro de `Configurações`.

---

## 6. RANKING DAS TELAS MAIS SOBRECARREGADAS (E COMO RESOLVER SEM ACORDEÕES GENÉRICOS)

| Posição | Tela / Aba | Por que está sobrecarregada (Elementos Concorrentes) | Solução Estrutural Recomendada (Sem esconder tudo em acordeão) |
| :-: | :--- | :--- | :--- |
| **#1** | **`Editar meu site → Foto e textos da capa`** (`HeroEditor.tsx`) | Mistura **4 escopos**: 1) Banner técnico de resoluções + Reset Geral; 2) 3 switches de CSS + 7 inputs de texto do Hero; 3) **Menu & Cabeçalho Global do Site (4 inputs)**; 4) Carrossel de 4 Fotos da Capa (jogado no final da página). | **1. Separação de Domínio:** Mover `Menu & Cabeçalho do Site` (junto com o Rodapé) para uma sub-aba própria `Topo & Rodapé`.<br>**2. Inversão de Hierarquia:** Colocar as **4 Fotos da Capa no topo** da tela, ao lado dos textos principais.<br>**3. Eliminação de Ruído:** Remover switches técnicos de CSS (`Preencher Altura`, `Tela Cheia`). |
| **#2** | **`Pedidos personalizados → Preços & Calculadora`** (`PersonalizadosPricingForm.tsx`) | Mais de **25 campos abertos** + **Simulador** + **2 botões de salvar** concorrentes. Mistura preços de fotos/vídeos/extras com prazos operacionais, limites éticos e textos institucionais da página `/personalizados`. | **1. Sub-abas de Escopo:** Dividir a configuração em duas visões limpas: **`Tabela de Preços & Simulador`** (Fotos, Vídeos, Extras + Simulador ao lado) e **`Regras, Prazos & Textos da Página`** (Canais de entrega, limites éticos e textos da vitrine).<br>**2. Botão Único:** Manter apenas 1 botão de salvar. |
| **#3** | **`Editar meu site → Galeria de fotos`** (`GalleryEditor.tsx`) | Renderiza cada foto como uma linha horizontal gigante com **3 inputs de texto sempre abertos** (`Título`, `Legenda`, `Link`) e **6 botões**. Para 8 fotos, são **24 inputs** e **48 botões** repetidos na tela. | **Mudança de Padrão Visual (Lista de Formulários → Grade de Mosaico):** Exibir as fotos em grade visual de 3 ou 4 colunas (como no site real). Os 3 campos de texto (`Título`, `Legenda`, `Link`) só aparecem em um modal/gaveta rápida quando a cliente clica em `"Editar Detalhes"` na foto desejada. |
| **#4** | **`Editor de Pack → 1. Dados & Precificação`** (`PackInfoTab.tsx`) | 10 campos de formulário (com o campo **`Badge` duplicado duas vezes**), contadores manuais de fotos/vídeos, campos técnicos (`Slug`, `Checkout Externo`), 4 botões de proporção de tela e **2 barras de Salvar/Cancelar** simultâneas. | **1. Remoção e Automação:** Eliminar o `Badge` duplicado; calcular quantidade de fotos/vídeos automaticamente a partir da Etapa 3; manter 1 única barra de salvar.<br>**2. Simplificação:** Reduzir proporções para 2 opções claras (`Retrato Vertical` vs `Horizontal`) e ocultar `Slug`. |
| **#5** | **`Divulgação & SEO → Divulgação & Google`** (`SeoEditor.tsx`) | Mistura configuração de **Google/WhatsApp** (3 inputs + foto + 2 prévias) com **Textos do Rodapé** (2 inputs), **Card estático de Segurança** e **Card de Reset Global do Site (`Restaurar Tudo`)**. | **Purificação de Escopo:** Deixar na aba **exclusivamente** os campos e prévias do Google/WhatsApp. Mover `Rodapé` para `Editar meu site → Topo & Rodapé` e excluir os cards de Segurança estática e Reset duplicado. |
| **#6** | **`Chamadas VIP → Modalidades & Preços` e `Horários & Agenda`** (`AppointmentsEditor.tsx`) | Ambas as abas carregam no topo os **5 cartões de KPIs de vendas/agenda**, empurrando os 3 cards de pacotes, os 6 campos de texto da vitrine e a grade de horários de segunda a domingo para o fundo da página. | **1. KPIs Contextuais:** Renderizar os 5 KPIs **apenas** na Aba 1 (`Fila de Chamadas`).<br>**2. Separação Visual:** Substituir o bloqueio manual `AAAA-MM-DD` da Aba 4 pelo clique direto no `Calendário Visual` (Aba 2). |

---

## 7. MAPA DE FUNCIONALIDADES MAL POSICIONADAS

| Funcionalidade / Componente | Onde está hoje (Local Atual) | Por que está no lugar errado | Para onde deve ir (Local Recomendado) |
| :--- | :--- | :--- | :--- |
| **Biblioteca Central de Mídias (`Fotos e vídeos`)** | `Conteúdos & Packs` → Aba 2 (`Fotos e vídeos`) | Abastece o site inteiro (Capa, Galeria, Sobre Mim, SEO, Packs), mas está escondida dentro do módulo de venda de Packs. | **Item de 1º nível na Sidebar:** `Biblioteca de Mídias` (`/admin/midias`). |
| **`Menu & Cabeçalho do Site` (`HeroHeaderForm`)** | `Editar meu site` → Aba 1 (`Foto e textos da capa`) | Controla a barra de navegação global do topo do site inteiro (Nome, Sigla `NB`, Botão `OnlyFans`), não apenas a foto da capa. | `Editar meu site` → Sub-aba **`Topo & Rodapé`** (junto com os textos de rodapé). |
| **`Mensagem do Rodapé` (Direitos Autorais e Frase Final)** | `Divulgação & SEO` → Aba 1 (`Divulgação & Google`) | Textos de assinatura do rodapé do site não têm nenhuma relação com SEO ou compartilhamento no Google/WhatsApp. | `Editar meu site` → Sub-aba **`Topo & Rodapé`**. |
| **`Faixa de Contato Profissional & Imprensa`** | `Redes e contato` → Aba 1 (`Redes sociais e plataformas`) | Configura o banner e botão de contato comercial no fim da aba de Redes Sociais, separado da Aba 2 (`Contato comercial`), que configura a janela que esse botão abre! | `Redes e contato` → Aba **`Contato comercial`** (unificando a faixa e a janela modal no mesmo lugar). |
| **Card `Restaurar Conteúdo Original` (`"Restaurar Tudo"`)** | `Divulgação & SEO` → Aba 1 (`Divulgação & Google`) | É um reset destrutivo do site inteiro posicionado no final da tela de SEO, induzindo a erro grave. | Manter **exclusivamente** em `Configurações → Sistema & Segurança` (onde já existe). |
| **Aba `Preços & Calculadora` antes da `Fila de Pedidos`** | `Pedidos personalizados` → Aba 1 | Coloca a configuração rara da calculadora na frente da fila diária de pedidos pagos pelos clientes. | Inverter ordem: **Aba 1: `Fila de Pedidos`** \| **Aba 2: `Preços & Calculadora`**. |
| **Módulo `Conteúdos & Packs`** | Grupo `COMECE AQUI` da Sidebar | Está separado dos outros dois produtos comerciais (`Pedidos personalizados` e `Chamadas VIP`), que ficam em `VENDER E ATENDER`. | Grupo **`VENDER E ATENDER`** da Sidebar, renomeado para **`Packs à Venda`**. |
| **Módulo `Financeiro` (Stripe)** | Grupo `GESTÃO E SISTEMA` da Sidebar | Consolida exclusivamente as vendas de Packs, Personalizados e Chamadas VIP, mas fica longe deles no menu. | Grupo **`VENDER E ATENDER`** da Sidebar, logo abaixo dos 3 produtos comerciais. |
| **Módulo `Player de Áudio DEV`** | Grupo `FERRAMENTAS DEV` da Sidebar | É o controle real da música de fundo do site, mas está escondido como ferramenta de desenvolvedor. | Sub-aba **`Música de Fundo`** dentro de `Editar Meu Site` (sem o sufixo `DEV`). |
| **Módulo `Assistente Nua IA DEV`** | Grupo `FERRAMENTAS DEV` da Sidebar | Página estática que apenas explica o botão flutuante que já existe no canto inferior direito da tela. | **Remover da Sidebar** (manter apenas o botão flutuante no canto inferior direito e o switch em `Configurações`). |

---

## 8. MAPA DE DUPLICAÇÕES E REDUNDÂNCIAS

| Item Duplicado / Redundante | Onde se repete | Tipo | Impacto na Usabilidade e Ação Recomendada |
| :--- | :--- | :---: | :--- |
| **Campo `Badge / Selo de Destaque` do Pack** | `PackInfoTab.tsx` linha 60 (`Destaque / Badge`) e linha 115 (`Selo / Badge de Destaque`) | **Duplicação Prejudicial (Bug de UI)** | Ambos os campos editam a mesma propriedade `pack.badge` na mesma tela. **Ação:** Excluir o campo da linha 115. |
| **4 Seletores / Grades de Mídia Diferentes** | `LibraryMediaGrid`, `ImagePickerModal`, `AlbumMediaSelectorModal`, `AlbumCreateModal (inline)` | **Duplicação Prejudicial (Arquitetura)** | Cada modal tem layout, filtros e comportamentos diferentes (uns têm busca, outros não; uns têm seleção múltipla, outros não). **Ação:** Unificar em **1 único `MediaSelectorModal`** universal. |
| **3 Botões `"Criar Pack"` na mesma tela** | `AvulsosEditor.tsx`: topo (`Criar produto / pack`), barra de filtros (`Criar Pack`) e estado vazio (`Criar Primeiro Pack`) | **Duplicação Prejudicial (Poluição)** | Três botões com nomes ligeiramente diferentes fazendo a mesma coisa na mesma tela. **Ação:** Manter apenas 1 botão primário no topo (e no estado vazio). |
| **2 Botões `"Criar Álbum"` colados na Biblioteca** | `LibraryUploadDropzone` e `LibraryAlbumsBar` (um em cima do outro) | **Duplicação Prejudicial (Poluição)** | Dois botões idênticos em linhas seguidas. **Ação:** Manter apenas na barra de álbuns (`LibraryAlbumsBar`). |
| **2 Botões de Salvar em `Preços & Calculadora`** | Topo (`Salvar Alterações`) e base do Simulador (`Publicar Alterações na Calculadora`) | **Duplicação Prejudicial (Confusão)** | A cliente não sabe se "Salvar" é diferente de "Publicar na Calculadora". **Ação:** Manter 1 único botão `"Salvar Preços da Calculadora"`. |
| **2 Barras de Salvar/Cancelar no `PackEditorPage`** | Cabeçalho (`Voltar`, `Excluir`, `Salvar Pack`) e Rodapé fixo (`Cancelar e Descartar`, `Salvar Pack Agora`) | **Duplicação Prejudicial (Poluição)** | Duplica os mesmos controles em cima e embaixo. **Ação:** Manter apenas no cabeçalho sticky do editor. |
| **2 Sistemas de Bloqueio de Datas em `Chamadas VIP`** | Aba 2 (`Calendário Visual` → clique no dia) vs. Aba 4 (`Horários & Agenda` → digitar `AAAA-MM-DD`) | **Duplicação Prejudicial (Fricção)** | Um é visual e fácil; o outro exige digitar formato ISO `2026-12-25`. **Ação:** Centralizar no Calendário Visual (ou datepicker visual). |
| **2 Botões `"Restaurar Conteúdo Original"`** | `Divulgação & SEO` (`SeoEditor.tsx`) e `Configurações → Sessão & Sincronização` | **Duplicação Prejudicial (Risco)** | Risco altíssimo de reset acidental na tela de SEO. **Ação:** Remover de SEO e manter apenas em `Configurações`. |
| **Fluxo *"Usar no Site"* (`MediaViewerModal`) vs. *"Trocar Foto"* (`Editar meu site`)** | Biblioteca (`MediaViewerModal`) vs. `HeroEditor` / `GalleryEditor` / `AboutEditor` | **Atalho Útil (se bem rotulado)** | Permitir enviar uma foto para a Capa/Galeria direto da Biblioteca é um atalho produtivo, desde que deixe claro se vai **substituir** ou **adicionar** e que avise que é preciso publicar. |

---

## 9. AUDITORIA APROFUNDADA DA BIBLIOTECA DE MÍDIAS (PRIORIDADE MÁXIMA)

Atualmente, a cliente sente que a galeria/mídia é confusa porque o painel **mistura três tarefas diferentes sem fronteiras claras**:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ 1. GERENCIAR O ACERVO (Biblioteca Central / DAM)                           │
│    Subir fotos/vídeos brutos, organizar em álbuns privados de trabalho,    │
│    favoritar, buscar, renomear e excluir do servidor (R2).                 │
├────────────────────────────────────────────────────────────────────────────┤
│ 2. SELECIONAR MÍDIAS (Modal Seletor Universal)                             │
│    Estar dentro de um Pack, da Capa, da Galeria ou de um Pedido e abrir    │
│    uma janela para escolher 1 ou várias fotos/vídeos do acervo.            │
├────────────────────────────────────────────────────────────────────────────┤
│ 3. ORGANIZAR A EXIBIÇÃO PÚBLICA (Vitrine do Site)                          │
│    Definir a ordem das 4 fotos da Capa e das fotos da Galeria Pública,     │
│    colocar legenda artística e marcar se a foto tem "Desfoque VIP".        │
└────────────────────────────────────────────────────────────────────────────┘
```

### Diagnóstico Ponto a Ponto dos 12 Aspectos do Ecossistema de Mídias

1. **Onde a biblioteca está localizada:**
   - Está escondida como a **Aba 2 (`Fotos e vídeos`)** dentro do módulo `Conteúdos & Packs` (`/admin/conteudos`). Quando a cliente quer apenas subir um ensaio novo para usar na Capa do site, ela não imagina que precisa entrar em `Conteúdos & Packs`.
2. **Se deveria ser um módulo próprio na sidebar:**
   - **SIM, obrigatoriamente.** A `Biblioteca de Mídias` é a fonte única de verdade de fotos e vídeos para todo o sistema e deve ser um módulo de 1º nível na sidebar (`/admin/midias`).
3. **Como fotos e vídeos são enviados:**
   - Podem ser enviados pela dropzone da Biblioteca (`LibraryUploadDropzone`) ou pela 3ª aba (`"Enviar Nova"`) do `ImagePickerModal`. Porém, vídeos **não podem** ser selecionados na Etapa 3 do Pack (`PackVaultTab`), que exige URL manual!
4. **Como álbuns são criados e utilizados:**
   - Álbuns são pastas organizacionais internas da Biblioteca (`AlbumCreateModal`). Porém:
     - Há **dois botões `"Criar Álbum"`** seguidos na tela;
     - Para escolher a capa do álbum dentro do `AlbumCreateModal`, abre-se uma mini-grade inline (`showCoverPicker`) em vez de um seletor padrão;
     - Para adicionar fotos a um álbum já criado, abre-se o `AlbumMediaSelectorModal`, que é um modal totalmente diferente do `ImagePickerModal`.
5. **Como filtros, favoritos, busca e ordenação funcionam:**
   - Na Biblioteca (`LibraryEditor`), funcionam muito bem (`Todas`, `Favoritas`, `Sem Álbum`, filtro `Fotos`/`Vídeos`, busca por texto, ordenação e alternância `Mosaico`/`Compacta`).
   - **Porém, no `ImagePickerModal` (quando a cliente vai escolher uma foto para o site ou para um Pack), NÃO EXISTE barra de álbuns, NÃO EXISTE filtro de Favoritas e NÃO EXISTE ordenação!** Ou seja: a cliente organiza tudo em álbuns e favoritas na Biblioteca, mas na hora de escolher a foto dentro do `ImagePickerModal`, toda essa organização desaparece!
6. **Como uma mídia é escolhida para um produto (Pack):**
   - Na Etapa 1 (`Capa do Pack`), Etapa 2 (`Amostras Gratuitas`) e Etapa 3 (`Fotos Exclusivas do Cofre`), abre-se o `ImagePickerModal`.
   - **Defeito 1 (Sem Multi-Seleção):** Nas Etapas 2 e 3, onde a cliente precisa anexar 10 ou 30 fotos ao pack, o `ImagePickerModal` só permite clicar em **1 foto por vez** e fecha o modal, obrigando-a a repetir o processo dezenas de vezes!
   - **Defeito 2 (Vídeos 4K sem Biblioteca):** Na Etapa 3 (`Vídeos em 4K`), não existe botão para abrir a biblioteca — apenas campos para digitar URL `.mp4` na mão!
7. **Como uma mídia é escolhida para a Capa, Galeria ou Sobre Mim:**
   - Existem dois caminhos concorrentes:
     - **Caminho Pull (Puxar):** Ir em `Editar meu site` (`Capa`, `Galeria` ou `Sobre mim`), clicar em `"Trocar Foto"` ou `"Adicionar da Biblioteca"`, o que abre o `ImagePickerModal`.
     - **Caminho Push (Empurrar):** Ir na Biblioteca (`Fotos e vídeos`), clicar na lupa de uma foto para abrir o `MediaViewerModal`, clicar no botão `"Usar no Site"` e escolher `"Definir como 1ª da Capa"`, `"Adicionar na Capa"`, `"Adicionar na Galeria"` ou `"Usar no Sobre Mim"`.
8. **Qual é a diferença entre a Biblioteca Geral e a Galeria Pública (e por que isso confunde a cliente):**
   - Na Biblioteca Geral (`Conteúdos & Packs → Fotos e vídeos`), estão **todas** as fotos enviadas (inclusive fotos privadas de packs).
   - Na Galeria Pública (`Editar meu site → Galeria de fotos`), estão apenas as fotos escolhidas para aparecer na página inicial do site público, com título, legenda e opção de `Desfoque VIP`.
   - Como ambas usam termos parecidos e o `ImagePickerModal` tem duas abas chamadas **`"Fotos do Site"`** (que lista as fotos já usadas na vitrine) e **`"Minha Biblioteca"`** (que lista o acervo do banco/R2), a cliente não entende a diferença entre *"Fotos do Site"* e *"Minha Biblioteca"*.
9. **Se existem seletores diferentes para a mesma função:**
   - **Sim, 4 seletores diferentes:**
     1. `LibraryMediaGrid.tsx` (com busca, álbuns, favoritas, tipo, ordem e seleção em lote);
     2. `ImagePickerModal.tsx` (com abas `"Fotos do Site"`, `"Minha Biblioteca"` e `"Enviar Nova"`, mas **sem filtro de álbuns, sem favoritas e sem seleção múltipla**);
     3. `AlbumMediaSelectorModal.tsx` (modal exclusivo para adicionar fotos a um álbum, com busca e botão `"Marcar Todas"`);
     4. Mini-grade inline `showCoverPicker` dentro de `AlbumCreateModal.tsx`.
10. **Texto equivocado `"Voltar para o Pack"` no `ImagePickerModal`:**
    - Em `ImagePickerModal.tsx:35`, a propriedade padrão é `backText = 'Voltar para o Pack'`. Quando a cliente está em `Editar meu site → Capa`, `Galeria de fotos`, `Sobre mim` ou `Divulgação & SEO` e abre o modal para trocar uma foto, o botão do canto superior direito diz **"Voltar para o Pack"**!
11. **O que precisa ser unificado na Biblioteca de Mídias:**
    - Eliminar a aba duplicada `"Fotos do Site"` dentro do `ImagePickerModal` (toda foto do site deve fazer parte da Biblioteca unificada).
    - Criar **um único `MediaSelectorModal` universal** que possua **exatamente os mesmos filtros de Álbuns, Favoritas e Busca da Biblioteca**, suporte **seleção simples** (para Capa/Sobre/SEO) e **seleção múltipla** (para Galeria Pública, Amostras de Pack, Fotos/Vídeos do Cofre do Pack e Álbuns), e tenha botão `"Fechar"` contextual.

---

## 10. ANÁLISE PASSO A PASSO DAS 10 JORNADAS REAIS DA CLIENTE

### Jornada 1: Subir novas fotos ou vídeos
- **Caminho Atual:** Sidebar `Conteúdos & Packs` → Clicar na 2ª aba `Fotos e vídeos` → Arrastar arquivos na Dropzone (ou escolher álbum de destino antes).
- **Telas e Interações:** 2 telas, 3 cliques.
- **Pontos de Confusão:**
  1. Para subir fotos para o site, ela precisa adivinhar que a biblioteca fica dentro de `Conteúdos & Packs`.
  2. Vê dois botões `"Criar Álbum"` seguidos um embaixo do outro.
- **Passos Redundantes:** Entrar na loja de packs (`Produtos à venda`) primeiro para depois mudar para a aba `Fotos e vídeos`.
- **Proposta de Fluxo Mais Simples:** Clicar diretamente em **`Biblioteca de Mídias`** na Sidebar (1 clique) → Soltar as fotos ou vídeos.

### Jornada 2: Organizar mídias em álbuns
- **Caminho Atual:** `Conteúdos & Packs` → Aba `Fotos e vídeos` → Clicar em `"Criar Álbum"` → Preencher Nome, Descrição e clicar em `"Escolher capa da biblioteca"` (abre mini-grade inline) → Clicar em `"Criar Álbum"` → Selecionar o álbum criado na barra → Clicar em `"Adicionar Fotos ao Álbum"` (abre `AlbumMediaSelectorModal`) → Marcar fotos → Clicar em `"Confirmar Seleção"`.
- **Telas e Interações:** 1 aba + 2 modais diferentes (`AlbumCreateModal` e `AlbumMediaSelectorModal`), 8+ cliques.
- **Pontos de Confusão:** Criar o álbum em um modal e só depois descobrir como colocar fotos nele usando outro modal diferente (ou usando o botão `"Selecionar Várias"` da barra de ferramentas).
- **Proposta de Fluxo Mais Simples:** No modal `"Criar Álbum"`, já permitir selecionar as fotos iniciais (ou criar o álbum direto a partir de fotos já selecionadas na grade com `"Mover X selecionadas para Novo Álbum"`).

### Jornada 3: Criar um pack à venda
- **Caminho Atual:** Sidebar `Conteúdos & Packs` → Aba `Produtos à venda` → Clicar em um dos 3 botões `"Criar Pack"` →
  - **Etapa 1 (`Dados & Precificação`):** Preencher Título, Preço, Badge #1, Slug, Checkout Externo, Badge #2 (duplicado!), Quantidade de Fotos, Quantidade de Vídeos, Sinopse, escolher Capa (`ImagePickerModal`), escolher Proporção (`3:4`, `16:9`, `1:1`, `21:9`).
  - **Etapa 2 (`Amostras Gratuitas`):** Clicar em `"Escolher da Biblioteca"` → Selecionar 1 foto → Modal fecha → Clicar de novo em `"Escolher da Biblioteca"` para cada amostra!
  - **Etapa 3 (`Cofre Protegido`):** Adicionar cada foto exclusiva 1 por 1 no `ImagePickerModal` → Clicar em `"Adicionar Vídeo 4K"` → **Ter que digitar manualmente Título, Duração e colar URL `.mp4`!** → Clicar em `"Salvar Pack"` (no topo ou no rodapé).
- **Pontos de Confusão Críticos:**
  1. Dois campos `Badge` iguais na Etapa 1.
  2. Ter que contar e digitar na mão quantas fotos e vídeos o pack tem.
  3. Ter que abrir o modal 15 vezes se quiser colocar 15 fotos no cofre.
  4. **Bloqueio total nos Vídeos 4K:** Não conseguir escolher um vídeo da biblioteca e ser solicitada a colar uma URL `.mp4`.
- **Proposta de Fluxo Mais Simples:**
  1. **Etapa 1 Limpa:** Apenas Título, Preço, Selo de Destaque (1 único campo), Sinopse e Foto de Capa (contadores de fotos/vídeos calculados sozinhos).
  2. **Etapa 2 e Etapa 3 com Multi-Seleção + Vídeos da Biblioteca:** Abrir o seletor universal filtrando por Álbum, marcar 20 fotos e 2 vídeos de uma só vez e clicar em `"Inserir 22 arquivos no Cofre"`.

### Jornada 4: Trocar fotos da capa do site
- **Caminho Atual:** Sidebar `Editar meu site` → Aba `Foto e textos da capa` → Rolar a página inteira passando pelo banner técnico de `1920x1080`, pelos 3 switches, pelos 7 campos de texto da capa e pelos 4 campos do `Menu & Cabeçalho do Site` → Chegar em `Fotos da Capa (4)` no final da página → Clicar em `"Trocar Foto"` → Abre `ImagePickerModal` (com botão dizendo **`"Voltar para o Pack"`** e duas abas confusas `"Fotos do Site"` e `"Minha Biblioteca"`) → Clicar na foto → Clicar no botão **`"Publicar"`** lá no Header Global do topo.
- **Pontos de Confusão:**
  1. As fotos da capa ficam escondidas no fim da página.
  2. O modal de escolher foto da capa diz `"Voltar para o Pack"`.
  3. Não há filtro de álbuns dentro do modal seletor.
- **Proposta de Fluxo Mais Simples:** Ao abrir `Editar Meu Site → Capa Principal`, exibir o carrossel **`Fotos da Capa (4)` logo no topo da tela**. Ao clicar em `"Trocar Foto"`, abrir o seletor universal com filtro por álbuns e botão `"Fechar"`.

### Jornada 5: Atualizar a galeria pública
- **Caminho Atual:** Sidebar `Editar meu site` → Aba `Galeria de fotos` → Clicar em `"Adicionar da Biblioteca"` → Escolher 1 foto no `ImagePickerModal` → Rolar uma lista vertical longa onde cada foto tem 3 inputs abertos e 6 botões → Clicar em `↑` / `↓` repetidamente para mudar a posição → Clicar em `"Publicar"` no Header Global.
- **Pontos de Confusão:**
  1. Só é possível adicionar 1 foto por vez.
  2. A lista vertical de formulários ocupa várias telas de altura, impedindo ver o mosaico da galeria.
- **Proposta de Fluxo Mais Simples:** Permitir adicionar várias fotos de uma vez e exibir a galeria em **Grade Visual de Cards**, editando título/legenda apenas quando clicar em `"Editar Legenda"` na foto.

### Jornada 6: Alterar preços e regras de pedidos personalizados
- **Caminho Atual:** Sidebar `Pedidos personalizados` → Já abre em `Preços & Calculadora` → Rolar por 5 blocos extensos (Fotos, Vídeos, Extras, Canais/Prazos/Limites Éticos, Textos da Vitrine) → Testar no Simulador à direita → Dúvida entre clicar em `"Salvar Alterações"` (no topo) ou `"Publicar Alterações na Calculadora"` (no simulador).
- **Pontos de Confusão:** Excesso de informações na mesma tela e dois botões de salvamento diferentes.
- **Proposta de Fluxo Mais Simples:** Separar em `Tabela de Preços & Simulador` (foco numérico) e um bloco recolhido/sub-aba `Prazos, Limites & Textos da Página`, com **1 único botão de salvar**.

### Jornada 7: Atender um pedido personalizado na fila
- **Caminho Atual:** Sidebar `Pedidos personalizados` → Precisa clicar na 2ª aba `Fila de Pedidos` (porque abre na calculadora!) → Localizar o pedido do cliente → Mudar status para `Em Produção` → Para entregar o arquivo no Cofre do Site, precisa digitar `Nome do Arquivo` e **colar manualmente uma `URL do Arquivo`**!
- **Pontos de Confusão:**
  1. A fila não é a primeira aba do módulo.
  2. Exigir URL manual para entregar o vídeo/foto encomendado pelo fã.
- **Proposta de Fluxo Mais Simples:** Abrir `Pedidos personalizados` direto na **`Fila de Pedidos`** e substituir o campo de URL manual por um botão **`"Anexar Entrega da Biblioteca / Subir Arquivo"`**.

### Jornada 8: Configurar e atender Chamadas VIP
- **Caminho Atual:** Sidebar `Chamadas VIP` →
  - Para ver agendamentos: Aba 1 (`Fila de Chamadas`), clicar em `"Confirmar / Sala"` para colar o link da videochamada.
  - Para bloquear um dia de folga: Pode ir na Aba 2 (`Calendário Visual`) e clicar em `"Bloquear Data"` **OU** ir na Aba 4 (`Horários & Agenda`) e digitar manualmente no formato `AAAA-MM-DD`.
  - Para mudar preços: Aba 3 (`Modalidades & Preços`), rolando abaixo dos 5 KPIs fixos no topo.
- **Pontos de Confusão:** Os 5 KPIs ocupam o topo de todas as 4 abas, e o bloqueio de datas na Aba 4 pede formato `AAAA-MM-DD`.
- **Proposta de Fluxo Mais Simples:** Exibir os 5 KPIs apenas na `Fila de Chamadas` e fazer com que todo bloqueio de folgas seja visual (pelo Calendário ou seletor `DD/MM/AAAA`).

### Jornada 9: Editar redes sociais, contato e SEO
- **Caminho Atual:**
  - Para editar Instagram/OnlyFans/Privacy: `Redes e contato` → Aba 1 (`Redes sociais e plataformas`).
  - Para editar o texto da faixa de contato profissional: Final da Aba 1 (`Redes sociais e plataformas`).
  - Para editar o e-mail e os assuntos do formulário que abre ao clicar nessa faixa: Aba 2 (`Contato comercial`).
  - Para editar como o link aparece no WhatsApp/Google: `Divulgação & SEO` → Aba 1 (`Divulgação & Google`).
  - Para editar a frase do rodapé do site: `Divulgação & SEO` → Aba 1 (`Divulgação & Google`).
  - Para editar o cabeçalho do site: `Editar meu site` → Aba 1 (`Foto e textos da capa`).
- **Pontos de Confusão:** As partes globais do site (Cabeçalho, Rodapé, Faixa de Contato, Redes e SEO) estão espalhadas e cruzadas em lugares imprevisíveis!
- **Proposta de Fluxo Mais Simples:** Unificar tudo dentro de **`Editar Meu Site`** com sub-abas claras e coesas: `1. Capa Principal`, `2. Galeria Pública`, `3. Sobre Mim`, `4. Redes & Contato` (unificado!), `5. Topo, Rodapé & Música` e `6. Google, WhatsApp & Legal (+18)`.

### Jornada 10: Consultar financeiro, contratos, senhas e mensalidade
- **Caminho Atual:**
  - Ver vendas: `Financeiro` (`/admin/financeiro`).
  - Pagar parcela de R$ 200 da hospedagem ou baixar recibo: `Mensalidade do Site` (`/admin/mensalidade`).
  - Ler o contrato dessas mesmas 10 parcelas de R$ 200: `Contratos` (`/admin/contratos`).
  - Ver uma senha salva: `Acessos e senhas` (`/admin/cofre`).
- **Pontos de Confusão:** `Contratos` e `Mensalidade do Site` tratam do mesmo assunto (o contrato de desenvolvimento/suporte de 10x R$ 200), mas estão separados em 2 módulos diferentes na sidebar.
- **Proposta de Fluxo Mais Simples:**
  - Mover `Financeiro` (vendas da cliente) para o grupo `VENDER E ATENDER`.
  - Agrupar `Preferências & Alertas`, `Cofre de Senhas` e `Assinatura & Contrato` (unificando Mensalidade + Contrato) dentro de **`Configurações & Conta`**.

---

## 11. COMPARAÇÃO DA ARQUITETURA ATUAL COM A RECOMENDADA

```text
====================================================================================
ESTRUTURA ATUAL (14 Módulos em 5 Grupos)     →  ESTRUTURA RECOMENDADA (8 Módulos em 3 Grupos)
====================================================================================

[COMECE AQUI]                                   [1. VENDER E ATENDER (Operação Diária)]
 1. Pedidos recebidos (/admin/alertas)       →   1. Pedidos & Alertas (/admin/alertas)
 2. Conteúdos & Packs (/admin/conteudos)     →   2. Packs à Venda (/admin/packs)
    ├── Produtos à venda                            (Catálogo + Editor de Pack simplificado)
    └── Fotos e vídeos (ESCONDIDO AQUI!)     →   3. Pedidos Personalizados (/admin/personalizados)
                                                    ├── Aba 1: Fila de Pedidos (PADRÃO!)
[VENDER E ATENDER]                                  └── Aba 2: Preços & Calculadora
 3. Pedidos personalizados                   →   4. Chamadas VIP (/admin/chamadas)
    ├── Aba 1: Preços & Calculadora (INVERTIDO!)    ├── Aba 1: Fila de Chamadas (com KPIs)
    └── Aba 2: Fila de Pedidos                      ├── Aba 2: Calendário & Folgas
 4. Chamadas VIP                                    ├── Aba 3: Pacotes & Preços
    ├── Fila de Chamadas                            └── Aba 4: Horários da Semana
    ├── Calendário Visual                    →   5. Financeiro (/admin/financeiro)
    ├── Modalidades & Preços                        (Faturamento Stripe junto das vendas!)
    └── Horários & Agenda
                                                [2. ACERVO E MEU SITE (Editorial)]
[MEU SITE E DIVULGAÇÃO]                      →   6. Biblioteca de Mídias (/admin/midias)
 5. Editar meu site (/admin/vitrine)                (MÓDULO PRÓPRIO! Fotos, Vídeos e Álbuns)
    ├── Foto e textos da capa (+ Cabeçalho!) →   7. Editar Meu Site (/admin/vitrine)
    ├── Galeria de fotos                            ├── Aba 1: Capa Principal (Fotos no topo!)
    └── Sobre mim                                   ├── Aba 2: Galeria Pública (Grade visual)
 6. Divulgação & SEO (/admin/seo)                   ├── Aba 3: Sobre Mim
    ├── Divulgação & Google (+ Rodapé/Reset!)       ├── Aba 4: Redes & Contato Comercial
    └── Páginas Legais & Termos                     ├── Aba 5: Topo, Rodapé & Música
 7. Redes e contato (/admin/conexoes)               └── Aba 6: Google, WhatsApp & Legal (+18)
    ├── Redes sociais (+ Faixa Contato!)
    └── Contato comercial                       [3. CONTA E SISTEMA]
                                             →   8. Configurações & Conta (/admin/configuracoes)
[GESTÃO E SISTEMA]                                  ├── Aba 1: Preferências, Sons & IA
 8. Financeiro                                      ├── Aba 2: Cofre de Senhas
 9. Contratos                                       ├── Aba 3: Assinatura & Contrato (10x R$200)
10. Acessos e senhas                                └── Aba 4: Sistema & Segurança
11. Configurações
12. Mensalidade do Site
                                                [REMOVIDOS DA SIDEBAR]
[FERRAMENTAS DEV]                                ✕ Player de Áudio DEV (movido p/ Editar Meu Site)
13. Player de Áudio DEV                          ✕ Assistente Nua IA DEV (já é botão flutuante)
14. Assistente Nua IA DEV
```

---

## 12. PROPOSTA DETALHADA DE REORGANIZAÇÃO POR MÓDULO

1. **`Pedidos & Alertas` (`/admin/alertas`):**
   - Unificar título em toda a tela para `Pedidos & Alertas`.
   - Adicionar 3 cartões de ação rápida quando a fila estiver vazia (`+ Criar Novo Pack`, `Ver Agenda de Chamadas`, `Subir Fotos na Biblioteca`).
2. **`Packs à Venda` (`/admin/packs`):**
   - Separar da Biblioteca de Mídias.
   - Manter 1 único botão `"Criar Novo Pack"`.
   - No `PackEditorPage`: remover o 2º campo `Badge` duplicado; calcular `Quantidade de Fotos` e `Quantidade de Vídeos` automaticamente; manter 1 única barra de salvamento; habilitar multi-seleção nas Amostras (Etapa 2) e Cofre (Etapa 3); **substituir os campos de URL manual de Vídeos 4K pelo seletor da Biblioteca de Mídias / Upload direto**.
3. **`Pedidos Personalizados` (`/admin/personalizados`):**
   - Inverter abas: **`1. Fila de Pedidos`** (padrão) e **`2. Preços & Calculadora`**.
   - Na `Fila de Pedidos`, permitir anexar os arquivos entregues ao cliente diretamente da Biblioteca de Mídias / Upload.
   - Em `Preços & Calculadora`, unificar os 2 botões de salvar em 1 só e recolher os textos da vitrine e limites éticos em sub-aba ou acordeão.
4. **`Chamadas VIP` (`/admin/chamadas`):**
   - Exibir os 5 KPIs apenas na Aba 1 (`Fila de Chamadas`).
   - Recolher os 6 campos de `"Textos da Vitrine Pública (/chamadas)"` da Aba 3.
   - Substituir a digitação `AAAA-MM-DD` da Aba 4 por seletor visual sincronizado com o `Calendário Visual` (Aba 2).
5. **`Financeiro` (`/admin/financeiro`):**
   - Mover para o grupo `VENDER E ATENDER` na sidebar.
   - Adicionar visualização em cards empilhados para a lista de transações no mobile (`< 640px`).
6. **`Biblioteca de Mídias` (`/admin/midias`):**
   - Promover a módulo próprio na sidebar.
   - Remover o botão `"Criar Álbum"` duplicado da área de upload.
   - Unificar `ImagePickerModal`, `AlbumMediaSelectorModal` e o seletor inline de capa em **um único `MediaSelectorModal` universal**, dotado de filtro por Álbuns, Favoritas, Busca, Tipo (`Fotos`/`Vídeos`), suporte a multi-seleção e botão `"Fechar"` contextual (eliminando o texto fixo `"Voltar para o Pack"`).
7. **`Editar Meu Site` (`/admin/vitrine`):**
   - Centralizar toda a gestão editorial do site público em 6 sub-abas limpas e sem mistura de escopo:
     - `Capa Principal` (com as 4 fotos no topo e sem o cabeçalho global);
     - `Galeria Pública` (em grade visual de cards compactos em vez de linhas gigantes de formulário);
     - `Sobre Mim` (mantida como está);
     - `Redes & Contato` (unificando a Faixa de Contato com a Janela de Contato Comercial);
     - `Topo, Rodapé & Música` (reunindo o `Menu & Cabeçalho do Site`, a `Mensagem do Rodapé` e o `Player de Música de Fundo`);
     - `Google, WhatsApp & Legal (+18)` (SEO com prévias + Termos e Aviso +18, sem o card estático de segurança e sem o botão de Reset Global).
8. **`Configurações & Conta` (`/admin/configuracoes`):**
   - Reunir as funções de retaguarda em 4 abas organizadas: `1. Preferências, Sons & IA`, `2. Cofre de Senhas`, `3. Assinatura & Contrato` (unificando Mensalidade + Contrato) e `4. Sistema & Segurança` (Cache, Reset Original e Logout).

---

## 13. PRIORIZAÇÃO DAS MUDANÇAS POR IMPACTO NA USABILIDADE

### Prioridade CRÍTICA (Bloqueios de Fluxo, Erros Visuais e Confusão Grave)
1. **Conectar Vídeos 4K do Pack (`PackVaultTab`) e entregas de `Pedidos Personalizados` à Biblioteca de Mídias** (eliminar exigência de digitar URLs `.mp4` e durações manualmente).
2. **Promover a `Biblioteca de Mídias` a módulo próprio na Sidebar** e criar o **Seletor Universal com Multi-Seleção e filtro de Álbuns/Favoritas** (corrigindo também o texto hardcoded `"Voltar para o Pack"`).
3. **Remover o campo `Badge` duplicado** na Etapa 1 do Pack e as **barras/botões de Salvar duplicados** no `PackEditorPage` e em `Preços & Calculadora`.
4. **Corrigir o estouro horizontal (`overflow` de `26px`) no Header Mobile (`390×844`)** que corta o sino de notificações e o avatar no iPhone.
5. **Remover o botão destrutivo `"Restaurar Tudo"` da aba de SEO** (mantendo-o apenas em `Configurações`).

### Prioridade ALTA (Redução de Sobrecarga e Ordem de Operação Diária)
6. **Inverter a ordem das abas em `Pedidos personalizados`** (`Fila de Pedidos` como 1ª aba padrão; `Preços & Calculadora` como 2ª aba).
7. **Reorganizar a aba `Foto e textos da capa` (`HeroEditor`):** colocar as **4 Fotos da Capa no topo** e separar `Menu & Cabeçalho do Site` + `Mensagem do Rodapé` em `Topo & Rodapé`.
8. **Enxugar a Sidebar de 14 para 8 módulos**, movendo `Financeiro` para perto das vendas e removendo a seção `FERRAMENTAS DEV`.
9. **Unificar a `Faixa de Contato Profissional` com a aba `Contato comercial`** em `Redes e contato`.

### Prioridade MÉDIA (Melhoria de Escaneabilidade e Ergonomia)
10. **Transformar a lista da `Galeria de fotos` (`GalleryEditor`) em Grade Visual de Cards**, abrindo os campos de legenda/link sob demanda.
11. **Ocultar os 5 KPIs de `Chamadas VIP`** nas abas de configuração (`Modalidades & Preços` e `Horários & Agenda`) e trocar o input `AAAA-MM-DD` por seleção visual de data.
12. **Unificar `Mensalidade do Site` e `Contratos`** em uma única área `Assinatura & Contrato`.

### Prioridade BAIXA (Polimento de Linguagem e Limpeza Visual)
13. Remover botões duplicados (`3x "Criar Pack"` na lista vazia, `2x "Criar Álbum"` na biblioteca) e ocultar barras de busca/filtro quando listas estiverem zeradas (`0 itens`).
14. Substituir jargões técnicos (`Slug`, `21:9 Ultra-Wide`, `Honeypot invisível`, `Time-Trap de 2.5s`, `Cloudflare D1 / KV / R2`) por linguagem simples voltada para a cliente.

---

## 14. PLANO DE REORGANIZAÇÃO POR ETAPAS (SEM IMPLEMENTAÇÃO)

1. **Etapa 1 — Unificação e Correção do Ecossistema de Mídias (DAM):**
   - Promover `Biblioteca de Mídias` na Sidebar;
   - Unificar o modal seletor (`ImagePickerModal` + `AlbumMediaSelectorModal`) com suporte a **Álbuns, Favoritas e Seleção Múltipla**;
   - Corrigir o texto `"Voltar para o Pack"`;
   - Conectar **Vídeos 4K do Pack** e **Entregas de Pedidos Personalizados** ao seletor da Biblioteca / Upload direto;
   - Remover o botão `"Criar Álbum"` duplicado.
2. **Etapa 2 — Desobstrução dos Fluxos Comerciais (`Packs`, `Personalizados` e `Chamadas VIP`):**
   - Limpar a Etapa 1 do `PackEditorPage` (remover `Badge` duplicado, automatizar contadores de fotos/vídeos, unificar barra de salvar);
   - Inverter as abas de `Pedidos personalizados` (`Fila de Pedidos` em 1º lugar) e unificar o botão de salvar da calculadora;
   - Tornar os 5 KPIs de `Chamadas VIP` exclusivos da `Fila de Chamadas` e substituir o campo `AAAA-MM-DD` por seletor visual de data.
3. **Etapa 3 — Reorganização Editorial (`Editar Meu Site`, `SEO` e `Redes & Contato`):**
   - Colocar as **Fotos da Capa** no topo de `HeroEditor`;
   - Criar a sub-aba `Topo, Rodapé & Música` (movendo `Menu & Cabeçalho`, `Mensagem do Rodapé` e `Player de Áudio`);
   - Transformar a `Galeria de fotos` em Grade Visual compacta;
   - Mover a `Faixa de Contato Profissional` para junto de `Contato comercial`;
   - Limpar a aba de SEO (removendo o botão duplicado `"Restaurar Tudo"` e o card estático de segurança).
4. **Etapa 4 — Nova Arquitetura de Navegação (Sidebar 8 Itens) e Ergonomia Mobile (`390×844`):**
   - Reorganizar a Sidebar nos 3 grupos recomendados (8 módulos);
   - Consolidar `Configurações & Conta` (incluindo `Cofre de Senhas` e `Assinatura & Contrato`);
   - Corrigir o *overflow* de `26px` no Header Mobile (`390×844`).
