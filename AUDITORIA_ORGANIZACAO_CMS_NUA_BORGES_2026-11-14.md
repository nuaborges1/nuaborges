# Auditoria Exaustiva de Organização — CMS NUA Borges

**Data:** 14/11/2026  
**Escopo:** Organização, Arquitetura da Informação, Carga Cognitiva, Distribuição de Funcionalidades e Fluxos de Uso (`/admin`)  
**Método:** Inspeção real no navegador (`http://localhost:3000/admin` em Desktop `1536×738` e Mobile `390×844`) + leitura estrutural dos componentes em `nuasite/components/nua/admin/`.  
**Restrição:** Nenhuma alteração foi feita no código, banco de dados ou configurações.

---

## 1. Mapa Atual do CMS

```text
Admin (/admin)
├── Header Global
│   ├── Busca Rápida / Spotlight (⌘K)
│   ├── Badge de Mensalidade (ex: "Mensalidade: Vencida") → /admin/mensalidade
│   ├── Sino de Notificações ("Ver pedidos recebidos") → /admin/alertas
│   ├── Link "Ver Site" → /
│   ├── Status de Publicação ("Site atualizado" / "Publicar alterações")
│   └── Avatar ("NB")
├── COMECE AQUI
│   └── Pedidos recebidos (/admin/alertas)
│       └── Filtros: Todos, Personalizados, Chamadas VIP, Packs Avulsos | Botão: Configurar Alertas → /admin/configuracoes
├── VENDER E ATENDER
│   ├── Conteúdos & Packs (/admin/conteudos)
│   │   ├── Aba 1: Produtos à venda
│   │   │   ├── Acordeão: Configurações da Seção & Textos da Vitrine
│   │   │   ├── 4 KPIs (Total, Ativos, Preço Médio, Exibição)
│   │   │   ├── Filtros (Todos, Ativos, Ocultos) + Busca
│   │   │   └── Editor de Pack (3 passos: Dados & Precificação, Amostras Gratuitas, Cofre Protegido)
│   │   └── Aba 2: Fotos e vídeos (Biblioteca de Mídia)
│   │       ├── Dropzone de Upload + Botão "Criar Álbum" + Botão "Adicionar Mídias"
│   │       ├── Barra de Álbuns e Pastas + Botão "Criar Álbum" (duplicado)
│   │       └── Filtros (Todos, Fotos, Vídeos, Favoritos) + Busca + Ordenação + Grade/Lista
│   ├── Pedidos personalizados (/admin/personalizados)
│   │   ├── Aba 1: Preços & Calculadora (Ensaio, Vídeos, Adicionais, Prazos/Ética, Textos da Vitrine)
│   │   └── Aba 2: Fila de Pedidos (Todos, Em Gravação, Prontos, Entregues + Busca)
│   └── Chamadas VIP (/admin/chamadas)
│       ├── 5 KPIs fixos no topo (Hoje, Pendentes, Confirmadas, Concluídas, Faturamento)
│       ├── Aba 1: Fila de Chamadas
│       ├── Aba 2: Calendário Visual (Mês + Painel lateral do dia)
│       ├── Aba 3: Modalidades & Preços (Cards 30min / 60min + Modal)
│       └── Aba 4: Horários & Agenda (Dias da semana, Regras/Buffer, Datas Bloqueadas)
├── MEU SITE
│   ├── Editar meu site (/admin/vitrine)
│   │   ├── Aba 1: Foto e textos da capa (Banner dimensões, 7 textos, 3 toggles, 4 campos de Menu/Header, 4 fotos)
│   │   ├── Aba 2: Galeria de fotos (Botão "Editar Textos da Vitrine", filtros, lista de ensaios)
│   │   └── Aba 3: Sobre mim (Foto, 4 campos de identidade, 2 blocos de texto, assinatura cursiva)
│   ├── Divulgação & SEO (/admin/seo)
│   │   ├── Aba 1: Divulgação & Google (Meta tags, Prévia WhatsApp/Google, Rodapé, Proteção, Restaurar Tudo)
│   │   └── Aba 2: Páginas Legais & Termos (Rodapé Institucional, Links Cadastrados, Gate 18+, Resumos)
│   └── Redes e contato (/admin/conexoes)
│       ├── Aba 1: Redes sociais e plataformas (Privacy, OnlyFans, botões de textos da vitrine)
│       └── Aba 2: Contato comercial (E-mail, Anti-spam, Textos da janela, Assuntos)
├── GESTÃO & SISTEMA
│   ├── Financeiro (/admin/financeiro) → 6 KPIs, Receita por Modalidade, Gráfico, Histórico
│   ├── Contratos (/admin/contratos) → Assinaturas, 20 Cláusulas, Anexo I, PDFs, Busca
│   ├── Acessos e senhas (/admin/cofre) → Atalhos, Filtros, Cards de Credenciais, Modal de Cadastro
│   ├── Configurações (/admin/configuracoes) → Alertas & Notificações, Diagnóstico, Sessão & Sincronização
│   └── Mensalidade do Site (/admin/mensalidade) → 4 KPIs, Tabela 10 parcelas, Pix, Modal de Recibo
└── FERRAMENTAS DEV (BETA)
    ├── Player de Áudio DEV (/admin/beta_player) → Biblioteca de Faixas, Preview do Player (Beta)
    └── Assistente Nua IA DEV (/admin/beta_ia) → Apresentação + NuaAiChatDrawer
```

---

## 2. Inventário de Cobertura

| Interface / Tela | Localização | Método de Inspeção | Status |
| :--- | :--- | :--- | :--- |
| Header Global & Spotlight (`⌘K`) | Topo do `/admin` (Desktop + Mobile `390×844`) | Navegador (Playwright) | **AUDITADA** |
| Sidebar & Drawer Mobile | Lateral esquerda | Navegador + `AdminSidebar.tsx` | **AUDITADA** |
| Pedidos recebidos | `/admin/alertas` | Navegador (Playwright) | **AUDITADA** |
| Conteúdos & Packs (Produtos + Biblioteca) | `/admin/conteudos` | Navegador (Playwright) | **AUDITADA** |
| Editor de Pack (3 passos) | `/admin/conteudos` → Criar Pack | Navegador (Playwright) | **AUDITADA** |
| Modal Criar Álbum | `/admin/conteudos` → Fotos e vídeos | Navegador (Playwright) | **AUDITADA** |
| Seletor de Mídia (`ImagePickerModal`) | Aberto via `/admin/vitrine` | Navegador (Playwright) | **AUDITADA** |
| Visualizador de Mídia (`MediaViewerModal`) | Aberto via `/admin/vitrine` | Navegador (Playwright) | **AUDITADA** |
| Pedidos personalizados (Fila + Calculadora) | `/admin/personalizados` | Navegador (Playwright) | **AUDITADA** |
| Chamadas VIP (4 abas) | `/admin/chamadas` | Navegador (Playwright) | **AUDITADA** |
| Editar meu site (Capa, Galeria, Sobre Mim) | `/admin/vitrine` | Navegador (Playwright) | **AUDITADA** |
| Divulgação & SEO (Google + Páginas Legais) | `/admin/seo` | Navegador (Playwright) | **AUDITADA** |
| Redes e contato (Plataformas + Contato) | `/admin/conexoes` | Navegador (Playwright) | **AUDITADA** |
| Financeiro | `/admin/financeiro` | Navegador (Playwright) | **AUDITADA** |
| Contratos | `/admin/contratos` | Navegador (Playwright) | **AUDITADA** |
| Acessos e senhas + Modal Cadastro | `/admin/cofre` | Navegador (Playwright) | **AUDITADA** |
| Configurações (3 abas) | `/admin/configuracoes` | Navegador (Playwright) | **AUDITADA** |
| Mensalidade do Site + Modal Recibo | `/admin/mensalidade` | Navegador (Playwright) | **AUDITADA** |
| Player de Áudio DEV (2 abas) | `/admin/beta_player` | Navegador (Playwright) | **AUDITADA** |
| Assistente Nua IA DEV | `/admin/beta_ia` | Navegador (Playwright) | **AUDITADA** |

---

## 3. Diagnóstico de Desorganização (Módulo a Módulo)

1. **Pedidos recebidos (`/admin/alertas`):**
   - **Problema:** O item chama-se *"Pedidos recebidos"* no grupo *"COMECE AQUI"*, mas a página exibe `SISTEMA` na breadcrumb e *"Central de Alertas & Pedidos — Notificações e avisos do sistema"*. Mistura linguagem de operação comercial com linguagem de sistema.
2. **Conteúdos & Packs (`/admin/conteudos`):**
   - **Problema 1:** A Biblioteca de Mídia inteira (*Fotos e vídeos*) está presa dentro de *Conteúdos & Packs*, embora seja usada também na Capa, Galeria e Sobre Mim.
   - **Problema 2:** No formulário de criação de pack, o campo de selo/badge aparece duplicado no mesmo passo.
   - **Problema 3:** Na aba *Fotos e vídeos*, há dois botões *"Criar Álbum"* empilhados na mesma tela.
3. **Pedidos personalizados (`/admin/personalizados`):**
   - **Problema:** A aba *Preços & Calculadora* mistura precificação (fotos, vídeos, adicionais) com textos de apresentação da vitrine pública (`/personalizados`) e diretrizes éticas em uma única rolagem longa.
4. **Chamadas VIP (`/admin/chamadas`):**
   - **Problema 1:** Os 5 cards de KPI ficam fixos no topo em **todas** as 4 abas, inclusive em *Horários & Agenda* e *Modalidades & Preços*, ocupando espaço vertical nobre onde a cliente está apenas configurando regras.
   - **Problema 2:** Em *Horários & Agenda*, o bloqueio de datas exige digitação manual em `AAAA-MM-DD`, ignorando que a aba vizinha (*Calendário Visual*) já oferece bloqueio por clique.
5. **Editar meu site (`/admin/vitrine`):**
   - **Problema:** A aba *Foto e textos da capa* é um "monólito" que mistura: instruções técnicas de resolução, textos do Hero, configurações de layout (tela cheia/logo), configuração do **Menu/Cabeçalho global do site** e o carrossel de fotos da capa.
6. **Divulgação & SEO (`/admin/seo`):**
   - **Problema:** Além de SEO e Páginas Legais, contém *"Mensagem do Rodapé"* e *"Restaurar Conteúdo Original (Restaurar Tudo)"*. O botão *"Restaurar Tudo"* (que afeta o site inteiro) está escondido no final da aba de SEO, enquanto *"Restaurar Padrão Editorial"* (da capa) está dentro de *Editar meu site*.
7. **Header Mobile (`390×844`):**
   - **Problema:** O conjunto de botões à direita (`Spotlight + Vencida + Sino + Avatar`) soma `416px` de largura e transborda para fora da tela de `390px`.

---

## 4. Mapa de Sobrecarga (Ranking das Telas Mais Carregadas)

| Posição | Tela | Elementos que Causam Sobrecarga |
| :--- | :--- | :--- |
| **1º** | **Editar meu site → Foto e textos da capa** | Banner técnico + 7 inputs de texto + 3 toggles + 4 inputs de Menu/Header + 4 cards de fotos com 4 botões cada. |
| **2º** | **Pedidos personalizados → Preços & Calculadora** | Todos os blocos de preço (foto, 4 faixas de vídeo, adicionais, pedido mínimo) + prazos + ética + textos da vitrine abertos simultaneamente. |
| **3º** | **Conteúdos & Packs → Fotos e vídeos** | Dropzone grande + barra de álbuns + barra de filtros + barra de busca/ordenação/modo + grade de mídias, tudo empilhado. |
| **4º** | **Divulgação & SEO → Divulgação & Google** | Metadados + 2 prévias visuais + rodapé + card informativo de segurança + card de restauração global. |

---

## 5. Funcionalidades Mal Posicionadas

- **Onde está:** *Conteúdos & Packs → Aba "Fotos e vídeos"*  
  **Problema:** A Biblioteca de Mídias é um recurso transversal (usado em Capa, Galeria, Sobre Mim, SEO e Packs), mas está escondida dentro de um módulo de vendas.  
  **Solução proposta:** Promover **Biblioteca de Mídias** para item próprio na sidebar (sob *MEU SITE & MÍDIAS*).

- **Onde está:** *Editar meu site → Foto e textos da capa → "Menu & Cabeçalho do Site"*  
  **Problema:** Configurações globais da barra de navegação do site (nome, monograma `NB`, botão `OnlyFans`) estão dentro da aba da Capa.  
  **Solução proposta:** Mover para uma sub-seção dedicada *"Cabeçalho & Identidade"* dentro de *Editar meu site*.

- **Onde está:** *Divulgação & SEO → "Restaurar Tudo"*  
  **Problema:** Uma ação destrutiva global (*"Volta todos os textos e fotos para a versão original"*) está dentro de *Divulgação & SEO*.  
  **Solução proposta:** Mover para *Configurações → Sessão & Sincronização* (onde já fica *"Limpar Rascunhos Locais"*).

---

## 6. Redundâncias e Duplicações

1. **Campo de Badge/Selo duplicado em Criar Pack:**  
   *Onde está:* `Conteúdos & Packs → Criar Pack → 1. Dados & Precificação`.  
   *Evidência:* *"Destaque / Badge (Opcional)"* e *"Selo / Badge de Destaque"* aparecem no mesmo formulário com o mesmo valor padrão (`LANÇAMENTO`).  
   *Prioridade:* **Alta**.
2. **Botão "Criar Álbum" duplicado na Biblioteca:**  
   *Onde está:* `Conteúdos & Packs → Fotos e vídeos`.  
   *Evidência:* Um botão *"Criar Álbum"* no topo (`LibraryAlbumHeader`) e outro logo abaixo na barra `Álbuns e Pastas (3)` (`LibraryAlbumsBar`).  
   *Prioridade:* **Média**.
3. **Dois fluxos distintos para Bloquear Data em Chamadas VIP:**  
   *Onde está:* `Chamadas VIP → Calendário Visual` (botão *"Bloquear Data"* no dia selecionado) vs `Chamadas VIP → Horários & Agenda` (input manual `AAAA-MM-DD`).  
   *Prioridade:* **Alta**.
4. **Rótulo "Voltar para o Pack" no Seletor de Mídias (`ImagePickerModal`):**  
   *Onde está:* Ao clicar em *"Trocar Foto"* em *Editar meu site → Capa*.  
   *Evidência:* O modal exibe *"Voltar para o Pack"* mesmo fora do módulo de Packs.  
   *Prioridade:* **Alta**.

---

## 7. Auditoria Específica da Galeria

- **Diagnóstico:** A interface da biblioteca em si (*Fotos e vídeos*) é rica em recursos (álbuns, favoritos, filtros, ordenação, busca), mas sua **organização no CMS** falha em dois pontos:
  1. **Descoberta:** Está oculta como sub-aba de *Conteúdos & Packs*.
  2. **Fluxo entre módulos:** Quando a cliente está em *Editar meu site*, ela abre o `ImagePickerModal`, que é uma segunda interface de grade/filtros sobre os mesmos dados — e que ainda carrega texto hardcoded de Packs (*"Voltar para o Pack"*).
- **Proposta de Centralização (UX):**
  1. Transformar **Biblioteca de Mídias** em módulo independente na sidebar.
  2. Manter o `ImagePickerModal` exclusivamente como seletor rápido contextual (com título dinâmico: *"Selecionar foto para a Capa"*, *"Selecionar foto para o Pack"*, etc.), sem duplicar controles de gestão pesada.

---

## 8. Nova Arquitetura da Informação (Comparativo)

```text
ESTRUTURA ATUAL                          ESTRUTURA RECOMENDADA
───────────────────────────────────      ───────────────────────────────────
COMECE AQUI                              OPERAÇÃO DIÁRIA
  └─ Pedidos recebidos                     └─ Pedidos recebidos (título unificado)
VENDER E ATENDER                         VENDAS & AGENDA
  ├─ Conteúdos & Packs                     ├─ Conteúdos & Packs (apenas Produtos)
  │    ├─ Produtos à venda                 ├─ Pedidos personalizados
  │    └─ Fotos e vídeos (Biblioteca)      └─ Chamadas VIP
  ├─ Pedidos personalizados              MEU SITE & MÍDIAS
  └─ Chamadas VIP                          ├─ Biblioteca de Mídias (centralizada)
MEU SITE                                   ├─ Editar meu site (Capa, Menu, Galeria, Sobre)
  ├─ Editar meu site                       ├─ Divulgação & SEO
  ├─ Divulgação & SEO                      └─ Redes e contato
  └─ Redes e contato                     FINANCEIRO & SISTEMA
GESTÃO & SISTEMA                           ├─ Financeiro (Vendas)
  ├─ Financeiro                            ├─ Mensalidade do Site
  ├─ Contratos                             ├─ Acessos e senhas
  ├─ Acessos e senhas                      ├─ Contratos
  ├─ Configurações                         └─ Configurações (inclui Restaurar Tudo)
  └─ Mensalidade do Site                 BETA / LAB
FERRAMENTAS DEV (BETA)                     ├─ Player de Áudio
  ├─ Player de Áudio DEV                   └─ Assistente Nua IA
  └─ Assistente Nua IA DEV
```

---

## 9. Propostas de Simplificação (Progressive Disclosure)

1. **Recolher em sanfonas (accordions):** Na aba *Preços & Calculadora* (*Pedidos personalizados*) e em *Foto e textos da capa* (*Editar meu site*), manter apenas o resumo/campos principais visíveis e recolher configurações secundárias (ex: *"Textos da Vitrine"*, *"Configurações do Menu Superior"*).
2. **Ocultar KPIs fora da aba de operação:** Em *Chamadas VIP*, exibir os 5 cards de KPI apenas em *Fila de Chamadas* e *Calendário Visual*, removendo-os de *Modalidades & Preços* e *Horários & Agenda*.
3. **Substituir entrada técnica por seletor visual:** Trocar o campo `AAAA-MM-DD` por `<input type="date">` em *Chamadas VIP*.
4. **Compactar Header Mobile:** Em telas `< 400px`, reduzir o badge *"Mensalidade: Vencida"* para um ícone/ponto de alerta ou movê-lo para o topo do drawer mobile, eliminando o corte lateral.

---

## 10. Plano de Reorganização

1. **Etapa 1 — Correções Imediatas de Organização e Clareza (Baixa complexidade):**
   - Corrigir overflow horizontal do `AdminHeader.tsx` no mobile (`390px`).
   - Remover campo duplicado de Badge em `PackEditorPage.tsx`.
   - Remover botão duplicado *"Criar Álbum"* em `Conteúdos & Packs → Fotos e vídeos`.
   - Corrigir texto *"Voltar para o Pack"* em `ImagePickerModal.tsx` para ser dinâmico/genérico (*"Fechar"* / *"Voltar"*).
   - Trocar input `AAAA-MM-DD` por `<input type="date">` em `AppointmentsEditor.tsx`.
2. **Etapa 2 — Redução de Sobrecarga Cognitiva (Média complexidade):**
   - Aplicar Progressive Disclosure (sanfonas) em `HeroEditor.tsx` e `PersonalizadosEditor.tsx`.
   - Ocultar os 5 KPIs nas abas de configuração de `Chamadas VIP`.
   - Padronizar título de `AlertasSistemaModule.tsx` e mover *"Restaurar Tudo"* para *Configurações*.
3. **Etapa 3 — Reestruturação da Sidebar e Biblioteca Central (Média/Alta complexidade):**
   - Promover **Biblioteca de Mídias** para item independente na sidebar sob *MEU SITE & MÍDIAS*, desacoplando-a de *Conteúdos & Packs*.

---

*Auditoria concluída com inspeção real no navegador e sem alterações no projeto. Aguardo sua autorização para iniciar qualquer etapa.*
