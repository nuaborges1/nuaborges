# MANUAL OFICIAL DE IDENTIDADE VISUAL E DESIGN SYSTEM
## NUA BORGES — EDITORIAL LUXURY & DESIGN SYSTEM

---

> **VERSÃO DA DOCUMENTAÇÃO:** 1.0.0  
> **DATA DE AUDITORIA E EMISSÃO:** 17 de Novembro de 2026  
> **ORIGEM DOS DADOS:** Código-fonte e tokens extraídos diretamente da aplicação (`nuasite`)  
> **ESTADO DE AUDITORIA:** 100% Baseado em Evidências do Código  

---

## SUMÁRIO DE CONTEÚDO

1. [Capa e Identificação da Marca](#1-capa-e-identificação-da-marca)
2. [Apresentação do Manual](#2-apresentação-do-manual)
3. [Metodologia da Auditoria](#3-metodologia-da-auditoria)
4. [Inventário dos Arquivos Analisados](#4-inventário-dos-arquivos-analisados)
5. [DNA e Personalidade Visual](#5-dna-e-personalidade-visual)
6. [Identidade Gráfica](#6-identidade-gráfica)
7. [Logotipo e Assinaturas Visuais](#7-logotipo-e-assinaturas-visuais)
8. [Paleta Cromática Completa](#8-paleta-cromática-completa)
9. [Regras de Utilização das Cores](#9-regras-de-utilização-das-cores)
10. [Tipografia Oficial Identificada](#10-tipografia-oficial-identificada)
11. [Geometria e Formas](#11-geometria-e-formas)
12. [Espaçamento e Grid](#12-espaçamento-e-grid)
13. [Botões e Componentes](#13-botões-e-componentes)
14. [Superfícies, Bordas e Sombras](#14-superfícies-bordas-e-sombras)
15. [Iconografia](#15-iconografia)
16. [Fotografia e Imagens](#16-fotografia-e-imagens)
17. [Animações e Microinterações](#17-animações-e-microinterações)
18. [Responsividade](#18-responsividade)
19. [Linguagem Visual das Interfaces (Site Público vs. Admin)](#19-linguagem-visual-das-interfaces-site-público-vs-admin)
20. [Design Tokens Oficialmente Documentados](#20-design-tokens-oficialmente-documentados)
21. [Consistência e Acessibilidade](#21-consistência-e-acessibilidade)
22. [Guia de Aplicação da Identidade](#22-guia-de-aplicação-da-identidade)
23. [Aplicações Incorretas e Padrões a Evitar](#23-aplicações-incorretas-e-padrões-a-evitar)
24. [Inconsistências Identificadas na Auditoria](#24-inconsistências-identificadas-na-auditoria)
25. [Referências Técnicas e Caminhos de Arquivos](#25-referências-técnicas-e-caminhos-de-arquivos)
26. [Checklist Completo de Fidelidade à Marca](#26-checklist-completo-de-fidelidade-à-marca)
27. [Conclusão](#27-conclusão)

---

## 1. CAPA E IDENTIFICAÇÃO DA MARCA

* **Marca:** Nua Borges
* **Assinatura Editorial:** *"Deixa de vergonha ♡"*
* **Posicionamento de Design:** Editorial de Luxo, Sensual, Minimalista e Íntimo ("Alta Costura Digital").
* **Atuação:** Educadora sexual e sexóloga em formação — Corpo, relações, liberdade e acervo autoral.
* **Cor Canônica de Identidade:** Vinho Maduro (`#843C52`).
* **Fundo Predominante Público:** Preto Absoluto (`#000000`).
* **Fundo Predominante Admin:** Grafite Profundo (`#0c0d12`).

---

## 2. APRESENTAÇÃO DO MANUAL

Este manual estabelece as diretrizes oficiais e o sistema de design definitivo da marca **Nua Borges**. Ele foi construído rigorosamente através da auditoria técnica do código-fonte do projeto `nuasite`, extraindo a paleta de cores, tipografia, componentes, proporções, movimentos e regras estéticas que dão vida à experiência visual da marca.

Este documento destina-se a designers, desenvolvedores, criadores de conteúdo e agentes automatizados para garantir que qualquer nova interface, componente ou recurso produzido para a Nua Borges mantenha fidelidade estética absoluta ao ecossistema original.

---

## 3. METODOLOGIA DA AUDITORIA

A auditoria foi realizada através da análise minuciosa de todo o ecossistema de código do projeto `nuasite`. A metodologia compreendeu:

1. **Inspeção de Estilos Globais e Tokens:** Análise de `app/globals.css`, diretivas do Tailwind CSS (`@theme`, `@layer components`, `@layer base`) e variáveis de raiz (`:root`).
2. **Inspeção de Metadados e Fontes:** Verificação de `app/layout.tsx` e instâncias do `next/font/google` (`Playfair Display`, `Plus Jakarta Sans`, `Pinyon Script`).
3. **Análise de Componentes Públicos:** Exame das estruturas visuais de `Header`, `Hero`, `HomeLançamentos`, `HomeManifesto`, `HomeBastidoresGallery`, `HomeCaminhos`, `HomeFaq`, `Footer`, `MusicPlayer`, `ContactModal`, `VipModal` e views de rotas públicas (`AcervoClientView`).
4. **Análise do Painel Administrativo:** Auditoria do sistema de design do CMS (`AdminSidebar`, `AdminHeader`, `AdminPrimitives`, `DashboardModule`, `PackEditorPage`, etc.).
5. **Mapeamento de Regras e Restrições:** Verificação das regras institucionais especificadas no projeto (`GEMINI.md`), incluindo a proibição estrita de ícones informais (ex.: `Sparkles`).

---

## 4. INVENTÁRIO DOS ARQUIVOS ANALISADOS

Abaixo estão os arquivos prioritários que fundamentam tecnicamente esta documentação:

| Arquivo / Seletor | Tipo / Papel no Sistema | Evidências Extraídas |
|---|---|---|
| `app/globals.css` | Estilos Globais, Design Tokens & Animações | Declarativo de variáveis CSS, temas `@theme`, botões canônicos, texturas analógicas (grain), chaveamentos de animação. |
| `app/layout.tsx` | Layout Raiz & Fontes Globais | Carregamento otimizado de `Playfair Display`, `Plus Jakarta Sans` e `Pinyon Script`. Definição de esquema de cores base. |
| `app/admin/layout.tsx` | Layout da Área Administrativa | Configuração de robôs (`noindex, nofollow`), providers de ajuda e isolamento de interface. |
| `components/nua/site/Header.tsx` | Navegação Superior Pública | Efeito glassmorphic (`backdrop-blur-xl`), logo serifado com ícone de coração (`♡`), indicador de aba ativa via Motion. |
| `components/nua/site/Footer.tsx` | Rodapé Institucional | Estrutura de grid de 4 colunas, assinatura editorial *"Deixa de vergonha ♡"*, créditos corporativos `phdev.store`. |
| `components/nua/site/Hero.tsx` & layouts | Seção Principal de Capa | Modos cinematográfico e split layout, carrossel autoral, overlays gradientes de profundidade. |
| `components/nua/site/HomeLançamentos.tsx` | Vitrine de Obras & Cards | Bento grid responsivo, aspecto `4/5`, selos flutuantes, overlays de leitura gradientes. |
| `components/nua/site/HomeManifesto.tsx` | Manifesto Editorial | Foto split em proporção `3/4` com bordas arredondadas (`28px`), citação em itálico serifado. |
| `components/nua/site/HomeCaminhos.tsx` | Cards de Acesso em 3 Vias | Grid de cartões de `380px` min-height com fotos sob brilho reduzido (`brightness-[0.35]`). |
| `components/nua/site/HomeFaq.tsx` | Acordeão de Suporte | Cards com borda rosa blush sutil quando expandidos, transição suave de altura. |
| `components/nua/site/MusicPlayer.tsx` | Player de Áudio/Vídeo de Alta Costura | Cápsula flutuante de `44px` (modo pílula), glassmorphism `rgba(10, 10, 14, 0.94)` com `blur(36px)`. |
| `components/nua/site/ContactModal.tsx` | Modal de Contato & Assessoria | Formatador de inputs em dark surface (`#09090c`), honeypot e time-trap anti-bot. |
| `components/nua/site/VipModal.tsx` | Modal da Lista VIP | Estética de cartão privativo em `rounded-[28px]`, acento em Vinho Maduro. |
| `app/acervo/AcervoClientView.tsx` | Vitrine do Acervo VIP | Destaque para Privacy (PIX) e OnlyFans (USD), badges flutuantes. |
| `components/nua/admin/AdminSidebar.tsx` | Navegação Lateral do CMS | Categorização de módulos, acento ativo `#843C52`, badges de notificação e alerta de rascunho. |
| `components/nua/admin/ui/AdminPrimitives.tsx` | Primitivas de UI do Admin | Componentes de formulário: `PageHeader`, `FormSection`, `AdminTabs`, `StatusBadge`, `AdminNumberStepper`, `AdminSwitch`, `AdminInput`. |

---

## 5. DNA E PERSONALIDADE VISUAL

### 5.1. Essência da Marca
A identidade visual de **Nua Borges** traduz uma experiência editorial luxuosa, sensual e minimalista. Diferente de plataformas comerciais convencionais ou apelos visuais saturados, a marca inspira-se em revistas de alta costura e fotografia autoral.

### 5.2. Pilares Estéticos
* **Editorial de Luxo:** Tipografia serifada clássica combinada com arranjos limpos e bastante espaço negativo.
* **Sensualidade Discreta:** Tons quentes e profundos de Vinho Maduro (`#843C52`) contrastando com fundos pretos dramáticos (`#000000`).
* **Intimidade & Liberdade:** Toques analógicos como a textura sutil de "film grain" (`body::after`) e expressões acolhedoras (*"Deixa de vergonha ♡"*).
* **Sofisticação Sem Excesso:** Proibição de elementos infantilizados, purpurinas ou estrelinhas brilhantes (`Sparkles`), priorizando iconografia sóbria e funcional.

---

## 6. IDENTIDADE GRÁFICA

A linguagem gráfica é composta por:
1. **Linhas Separadoras Gradientes (`.section-divider`):** Divisórias horizontais suaves que somem nas extremidades (`linear-gradient(to right, transparent, rgba(255, 255, 255, 0.06), transparent)`).
2. **Brilhos de Fundo Ambientais ("Glow"):** Esferas radiais desfocadas em tons de vinho com baixíssima opacidade (`bg-[#843C52]/[0.025] blur-[180px]`).
3. **Textura Analógica de Grão de Filme:** Overlay fixo em todo o `body` gerado por SVG dinâmico (`fractalNoise`) com opacidade de `0.022` para proporcionar toque de película fotográfica.

---

## 7. LOGOTIPO E ASSINATURAS VISUAIS

### 7.1. Logotipo Principal (Texto Serifado + Coração Íntimo)
O logotipo principal é composto pelo nome **NUA BORGES** em letras maiúsculas, com espaçamento amplo entre letras, acompanhado pelo símbolo de coração em tom vinho.

* **Tipografia:** `Playfair Display`
* **Estilo:** `font-medium`, `uppercase`, `letter-spacing: 0.22em` (Mobile) / `0.28em` (Desktop).
* **Complemento:** Coração not-italic `♡` na cor `#843C52`.

```html
<!-- Aplicação Canônica do Logotipo no Header/Footer -->
<div className="group flex items-center gap-1.5">
  <span className="font-serif text-[15px] tracking-[0.28em] uppercase text-zinc-100 font-medium">
    NUA BORGES
  </span>
  <span className="text-[#843C52] text-xs font-sans font-light not-italic">
    ♡
  </span>
</div>
```

### 7.2. Logotipo Gráfico Autoral (WebP)
Quando a versão em imagem é ativada (ex.: layout da Hero), utiliza-se o recurso oficial:
* **Caminho:** `/images/nua/logo-oficial.webp`

### 7.3. Sign-Off da Marca
* **Texto Oficial:** `Deixa de vergonha ♡`
* **Aplicação:** Usado em itálico no rodapé de páginas, modais e legendas de fotos.

---

## 8. PALETA CROMÁTICA COMPLETA

### 8.1. Inventário Cromático do Site Público

| Nome da Cor | Token / Variável | Valor HEX / Format | Finalidade | Origem / Componentes |
|---|---|---|---|---|
| **Vinho Maduro (Primary)** | `var(--pink)` | `#843C52` | Cor primária da marca, botões CTAs, acentos ativos, bordas de destaque. | `globals.css`, `Header`, `Hero`, `MusicPlayer` |
| **Vinho Hover** | `var(--pink-hover)` | `#93485E` | Estado hover de botões primários e links de destaque. | `globals.css`, `.btn-primary:hover` |
| **Vinho Active** | `var(--pink-active)` | `#65313F` | Estado pressionado/active de botões primários. | `globals.css`, `.btn-primary:active` |
| **Vinho Soft (Glow/Subtle)** | `--` | `rgba(132, 60, 82, 0.15)` | Fundos de selos, badges e destaques discretos. | `globals.css`, `AcervoClientView` |
| **Preto Absoluto (Fundo Site)** | `--` | `#000000` | Fundo principal de todas as páginas públicas. | `globals.css`, `layout.tsx` |
| **Preto Superfície Elevada** | `--` | `#07070a` / `#09090c` | Fundo de modais, acordeões e seções internas. | `HomeFaq`, `ContactModal`, `VipModal` |
| **Grafite Escuro Card** | `--` | `#0d0d12` / `#050507` | Superfície de cartões de produtos e planos. | `HomeLançamentos`, `HomeCaminhos` |
| **Branco Puro** | `--` | `#ffffff` | Texto principal de títulos, ícones ativos. | `globals.css`, `Header` |
| **Zinc 100** | `--` | `#f4f4f5` | Texto corrido principal. | `globals.css`, `body` |
| **Zinc 300** | `--` | `#d4d4d8` | Subtítulos e botões secundários (ghost). | `.btn-ghost`, `HomeCaminhos` |
| **Zinc 400** | `--` | `#a1a1aa` | Textos de apoio, descrições e ícones inativos. | `Header`, `Footer`, `HomeLançamentos` |
| **Zinc 500** | `--` | `#71717a` | Rótulos secundários e elementos desabilitados. | `Footer`, `AdminSidebar` |
| **Borda Sutil** | `--` | `rgba(255, 255, 255, 0.06)` | Linhas divisórias e bordas de containers. | `.section-divider`, `Header`, `Footer` |

---

### 8.2. Inventário Cromático do Painel Administrativo (CMS)

| Nome da Cor Token | Variável CSS (@theme) | Valor HEX / RGB | Finalidade no Admin |
|---|---|---|---|
| `color-adm-bg` | `--color-adm-bg` | `#0c0d12` | Fundo geral da aplicação administrativa. |
| `color-adm-sidebar` | `--color-adm-sidebar` | `#101116` | Fundo da barra lateral e cabeçalho do CMS. |
| `color-adm-surface` | `--color-adm-surface` | `#14151b` | Mesa de trabalho / fundo das visualizações. |
| `color-adm-raised` | `--color-adm-raised` | `#171821` | Cartões, caixas de formulário e contêineres. |
| `color-adm-hover` | `--color-adm-hover` | `#1e1f2a` | Hover de cartões e itens de lista neutros. |
| `color-adm-input` | `--color-adm-input` | `#0e0f14` | Fundo de campos de input e textareas. |
| `color-adm-line` | `--color-adm-line` | `rgb(255 255 255 / 0.07)` | Bordas padrão de cartões e separadores. |
| `color-adm-line-strong` | `--color-adm-line-strong` | `rgb(255 255 255 / 0.12)` | Bordas de foco e botões secundários. |
| `color-adm-text` | `--color-adm-text` | `#f4f4f5` | Texto principal de leitura do admin. |
| `color-adm-muted` | `--color-adm-muted` | `#a1a1aa` | Rótulos de formulário e metadados. |
| `color-adm-subtle` | `--color-adm-subtle` | `#71717a` | Textos de ajuda, placeholders e sobrancelhas. |
| `color-adm-accent` | `--color-adm-accent` | `#843C52` | Botão primário, itens de menu ativos, foco. |
| `color-adm-accent-hover` | `--color-adm-accent-hover` | `#93485E` | Hover de elementos acentuados. |
| `color-adm-success` | `--color-adm-success` | `#34d399` | Badges de sucesso, valores positivos. |
| `color-adm-warning` | `--color-adm-warning` | `#fbbf24` | Alertas de rascunho, pagamentos pendentes. |
| `color-adm-danger` | `--color-adm-danger` | `#fb7185` | Ações destrutivas, exclusões, alertas graves. |

---

## 9. REGRAS DE UTILIZAÇÃO DAS CORES

1. **Dominância do Preto Absoluto (`#000000`):** No site público, o fundo DEVE ser impreterivelmente `#000000` para garantir profundidade às fotografias.
2. **Dominância do Grafite Profundo (`#0c0d12`):** No painel admin, NUNCA utilize preto puro no fundo; utilize as superfícies grafite (`#0c0d12`, `#101116`, `#14151b`).
3. **Uso Módico do Vinho Maduro (`#843C52`):** O vinho é a assinatura cromática de luxo. Ele deve ser aplicado em CTAs de conversão, acentos de navegação ativa, selos VIP e linhas de destaque. NUNCA utilize vinho em grandes superfícies de fundo contínuas.
4. **Contrastes Semânticos:**
   * Textos sobre vinho devem ser **Brancos (`#ffffff`)**.
   * Textos selecionados recebem fundo `#843C52` e texto `#ffffff` (ou `#000000`).
   * Elementos com alerta de alteração não publicada utilizam tom **Âmbar (`#fbbf24` com opacidade)**.

---

## 10. TIPOGRAFIA OFICIAL IDENTIFICADA

O sistema tipográfico da Nua Borges é composto por três famílias de fontes carregadas via `next/font/google`:

```typescript
// Declaração Canônica de Fontes em app/layout.tsx
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '700'],
  style: ['normal', 'italic'],
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600'],
});

const pinyonScript = Pinyon_Script({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-script',
});
```

### 10.1. Tabela da Hierarquia Tipográfica Real

| Função / Categoria | Família de Fonte | Seletor / Classe | Pesos Efetivos | Letter-Spacing | Aplicação no Código |
|---|---|---|---|---|---|
| **Títulos de Impacto (H1, H2)** | `Playfair Display` | `.font-serif` | 400, 700 (Normal/Itálico) | `-0.025em` a `tracking-tight` | Títulos da Hero, títulos de seções, manifestos e nomes de produtos. |
| **Citações / Assinaturas** | `Playfair Display` | `.font-serif italic` | 400 Italic | `tracking-wider` | Legendas autorais, frases de manifesto (*"A coragem de despir..."*). |
| **Texto de Corpo & UI** | `Plus Jakarta Sans` | `body`, `.font-sans` | 400 (Light), 500 (Medium), 600 (Semibold) | `normal` / `tracking-wide` | Parágrafos de leitura, itens de navegação, modais e formulários. |
| **Rótulos / Eyebrow** | `Plus Jakarta Sans` | `.eyebrow`, `.adm-eyebrow` | 600 (Semibold) | `0.28em` (uppercase) | Sobrancelhas de seções públicos (ex.: `MANIFESTO AUTORAL`). |
| **Acentos Decorativos** | `Pinyon Script` | `.font-script` | 400 | `normal` | Toques poéticos em seções especiais do site. |
| **Dados / Contadores / Badges** | Monospace do Sistema | `font-mono` | 500, 600, 700 | `0.16em` / `tracking-wider` | Valores numéricos, esteiras de preços e códigos de steppers. |

---

## 11. GEOMETRIA E FORMAS

### 11.1. Border-Radius (Arredondamento)

* **Botões Canônicos (Pílulas):** `rounded-full` (`9999px`) — Utilizado em todos os botões de ação primários e secundários do site público.
* **Cards de Conteúdo Público:** `rounded-2xl` (`16px`), `rounded-[22px]`, `rounded-[28px]`, `rounded-[32px]` — Proporciona um visual orgânico e suave sem perder o rigor moderno.
* **Modais Públicos:** `rounded-t-3xl` (Mobile) / `rounded-3xl` / `rounded-[28px]` (Desktop).
* **Containers do CMS (Admin):** `var(--radius-adm)` (`0.875rem` / `14px`) e `var(--radius-adm-sm)` (`0.625rem` / `10px`).

### 11.2. Linguagem de Composição
* **Proporções de Imagem:** Fotografias da galeria e cards utilizam majoritariamente a proporção vertical **`4/5`** (Cards de Lançamentos) e **`3/4`** (Manifesto).
* **Densidade Visual:** Uso generoso de espaços negativos. Elementos não competem entre si; há separação clara por gradientes e margens amplas.

---

## 12. ESPAÇAMENTO E GRID

### 12.1. Tokens de Espaçamento Dinâmico (CSS Variables)

```css
:root {
  --section-px: clamp(1.25rem, 5vw, 3rem);
  --section-py: clamp(4rem, 8vw, 8rem);
  --max-w: 72rem; /* 1152px — Largura máxima padrão das seções */
}
```

### 12.2. Escala de Margens e Paddings do Sistema

| Token / Classe | Valor em Pixels | Aplicação Típica |
|---|---|---|
| `px-4` / `px-5` | 16px - 20px | Margem lateral interna em dispositivos móveis. |
| `px-8` / `px-12` | 32px - 48px | Margem lateral em telas desktop. |
| `py-16` / `py-24` | 64px - 96px | Espaçamento vertical entre seções do site público. |
| `.section-container` | `max-width: 72rem` (1152px) | Container padrão centralizado para o site. |
| Grid de Caminhos / Acervo | `max-width: 76rem` (1216px) | Grids expandidos de 3 colunas. |

---

## 13. BOTÕES E COMPONENTES

### 13.1. Botão Primário Canônico (`.btn-primary`)
O botão primário representa a ação principal de conversão do site (ex.: *"Acessar Acervo Exclusivo"*).

```css
/* Código Extraído de app/globals.css */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  padding: 0 2rem;
  min-height: 52px;
  border-radius: 9999px;
  background-color: var(--pink); /* #843C52 */
  color: #ffffff;
  font-weight: 700;
  font-size: 0.6875rem; /* 11px */
  letter-spacing: 0.16em;
  text-transform: uppercase;
  transition: background-color 200ms ease, transform 200ms ease, box-shadow 200ms ease;
  box-shadow: 0 4px 18px rgba(132, 60, 82, 0.22);
  cursor: pointer;
}

.btn-primary:hover {
  background-color: var(--pink-hover); /* #93485E */
}

.btn-primary:active {
  background-color: var(--pink-active); /* #65313F */
}
```

### 13.2. Botão Secundário / Ghost (`.btn-ghost`)

```css
.btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0 1.5rem;
  min-height: 44px;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #a1a1aa;
  font-weight: 600;
  font-size: 0.6875rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  transition: border-color 200ms ease, color 200ms ease, background-color 200ms ease;
}

.btn-ghost:hover {
  border-color: rgba(132, 60, 82, 0.45);
  color: #fff;
}
```

### 13.3. Botões do Painel Administrativo (`AdminButton`)

O CMS possui variações padronizadas com tamanho fixo e raio de canto controlado:

* **Primary (`variant="primary"`):** Fundo Vinho `#843C52`, texto branco semibold.
* **Secondary (`variant="secondary"`):** Fundo `white/[0.06]`, border `white/[0.08]`, texto `zinc-200`.
* **Ghost (`variant="ghost"`):** Fundo transparente, texto `zinc-400`.
* **Danger (`variant="danger"`):** Fundo `rose-500/10`, border `rose-500/20`, texto `rose-300`.

---

## 14. SUPERFÍCIES, BORDAS E SOMBRAS

### 14.1. Sombras e Profundidade Visual
* **Sombra de Botão Primário:** `0 4px 18px rgba(132, 60, 82, 0.22)`
* **Sombra de Cards em Hover:** `0 24px 60px -20px rgba(244, 167, 185, 0.25)`
* **Sombra de Modais:** `0 24px 80px rgba(0, 0, 0, 0.95)`
* **Sombra do Admin (`--shadow-adm`):** `0 1px 0 rgb(255 255 255 / 0.03) inset, 0 8px 24px -12px rgb(0 0 0 / 0.6)`

### 14.2. Efeito Glassmorphism (Vidro Fosco)
As superfícies flutuantes (Header e Music Player) utilizam desfoque de fundo intenso:

```css
/* Header Fixo ao Rolar */
background-color: rgba(0, 0, 0, 0.94);
backdrop-filter: blur(24px);

/* Music Player Flutuante */
background: rgba(10, 10, 14, 0.94);
backdrop-filter: blur(36px);
```

---

## 15. ICONOGRAFIA

### 15.1. Regra de Ouro da Marca: Proibição Estrita do Ícone `Sparkles`
Conforme diretriz expressa do projeto, **é estritamente proibido o uso do ícone `Sparkles` (estrelinhas/brilhozinhos)** de qualquer biblioteca (`lucide-react`, etc.) em qualquer arquivo da Nua Borges. Estrelinhas quebram o tom de alta costura e sensualidade adulta da marca.

### 15.2. Mapeamento de Ícones Permitidos e Contextualizados

| Contexto de Aplicação | Ícones Autorizados (`lucide-react`) | Ícones Personalizados (SVG Autoral) |
|---|---|---|
| **Pedidos Personalizados / Fotos** | `Camera`, `Film`, `Sliders`, `Crown`, `Images` | `--` |
| **Clube VIP / Exclusividade** | `Crown`, `Gem`, `Lock`, `ShieldCheck` | `OnlyFansIcon`, `TelegramIcon` |
| **Destaques & Ações** | `Flame`, `Zap`, `CheckCircle2`, `Heart`, `ArrowRight` | `PrivacyIcon`, `PixIcon` |
| **Navegação & Sistema** | `LayoutDashboard`, `ShoppingBag`, `TrendingUp`, `Home`, `Share2`, `Sliders`, `Music`, `X`, `Menu` | `--` |

---

## 16. FOTOGRAFIA E IMAGENS

### 16.1. Direção Visual das Imagens
* **Tratamento:** Fotografia autoral editorial, tons quentes, contrastes acentuados e sombras profundas.
* **Recortes:** Cantos arredondados (`28px` no site público, `16px` em cards menores).
* **Proteção de Leitura:** Todas as imagens que contêm texto sobreposto utilizam overlays verticais gradientes:

```html
<div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />
```

---

## 17. ANIMAÇÕES E MICROINTERAÇÕES

### 17.1. Tabela das Animações Canônicas (CSS Keyframes)

| Nome da Animação | Duração / Easing | Descrição e Finalidade |
|---|---|---|
| `continuousMarquee` | `45s linear infinite` | Deslizamento contínuo da galeria horizontal de bastidores. |
| `pageEnter` | `0.7s cubic-bezier(0.16, 1, 0.3, 1)` | Transição de entrada suave das páginas ao carregar. |
| `nuaHeartBeat` | `0.84s cubic-bezier(0.25, 0.1, 0.25, 1) infinite` | Animação de batimento "lub-dub" do coração do Music Player quando ativo. |
| `nuaHeartIdle` | `2.2s ease-in-out infinite` | Pulsação suave de "respiração" do coração quando o áudio está pausado. |
| `nayZenLevitation` | `8s ease-in-out infinite` | Levitação sutil de elementos de destaque. |
| `nayBreathing` | `6s ease-in-out infinite` | Variação suave da borda e sombra para dar efeito orgânico ao card. |

### 17.2. Motion React (Framer Motion)
Transições de abas ativas utilizam física de mola (*spring*):
```typescript
transition={{ type: 'spring', stiffness: 380, damping: 36 }}
```

---

## 18. RESPONSIVIDADE

### 18.1. Breakpoints Adotados
* **Mobile Pequeno:** `< 640px` (Stack vertical de 1 coluna, drawers inferiores para modais).
* **Tablet (sm/md):** `640px` a `768px` (Grids de 2 colunas).
* **Desktop (lg/xl):** `1024px` a `1280px` (Grids de 3 a 4 colunas, navegação horizontal completa no header, sidebar fixa no admin).

---

## 19. LINGUAGEM VISUAL DAS INTERFACES (SITE PÚBLICO VS. ADMIN)

| Elemento Visual | Site Público (Nua Borges) | Painel Administrativo (CMS Admin) |
|---|---|---|
| **Fundo de Tela** | Preto Absoluto (`#000000`) | Grafite Profundo (`#0c0d12`) |
| **Superfície de Cards** | Preto Profundo (`#09090c`) | Grafite Cartão (`#171821` / `#14161d`) |
| **Estilo de Botões** | Pílulas arredondadas (`rounded-full`) | Cantos suavizados (`rounded-xl` / `9999px` em `.adm-btn`) |
| **Tipografia Dominante** | `Playfair Display` (Serifada Luxo) | `Plus Jakarta Sans` (Sans-serif funcional) |
| **Sensação Visual** | Editorial, sensual, imersivo | Utilitário, denso, produtivo |

---

## 20. DESIGN TOKENS OFICIALMENTE DOCUMENTADOS

### Block CSS de Tokens Reutilizáveis (Globais)

```css
@theme {
  --color-adm-bg: #0c0d12;
  --color-adm-sidebar: #101116;
  --color-adm-surface: #14151b;
  --color-adm-raised: #171821;
  --color-adm-hover: #1e1f2a;
  --color-adm-input: #0e0f14;
  --color-adm-line: rgb(255 255 255 / 0.07);
  --color-adm-line-strong: rgb(255 255 255 / 0.12);
  --color-adm-text: #f4f4f5;
  --color-adm-muted: #a1a1aa;
  --color-adm-subtle: #71717a;
  --color-adm-accent: #843C52;
  --color-adm-accent-hover: #93485E;
  --color-adm-accent-soft: rgba(132, 60, 82, 0.15);
  --color-adm-success: #34d399;
  --color-adm-warning: #fbbf24;
  --color-adm-danger: #fb7185;
  --radius-adm: 0.875rem;
  --radius-adm-sm: 0.625rem;
  --shadow-adm: 0 1px 0 rgb(255 255 255 / 0.03) inset, 0 8px 24px -12px rgb(0 0 0 / 0.6);
}

:root {
  --font-serif: "Playfair Display", Georgia, serif;
  --font-sans: "Plus Jakarta Sans", -apple-system, sans-serif;
  --font-script: "Pinyon Script", cursive;
  --pink: #843C52;
  --pink-hover: #93485E;
  --pink-active: #65313F;
  --section-px: clamp(1.25rem, 5vw, 3rem);
  --section-py: clamp(4rem, 8vw, 8rem);
  --max-w: 72rem;
}
```

---

## 21. CONSISTÊNCIA E ACESSIBILIDADE

1. **Foco Visível Acessível:** Todos os elementos interativos possuem anel de foco bem definido para navegação por teclado:
   ```css
   :focus-visible {
     outline: 2px solid var(--pink);
     outline-offset: 3px;
     border-radius: 4px;
   }
   ```
2. **Movimento Reduzido:** Suporte nativo a usuários que preferem movimento reduzido (`prefers-reduced-motion: reduce`), desativando animações e marquees.
3. **Contraste de Texto:** Texto primário em branco ou `#f4f4f5` sobre fundos pretos/grafites garante taxa de contraste superior a 12:1 (excede o padrão WCAG AAA).

---

## 22. GUIA DE APLICAÇÃO DA IDENTIDADE

Ao criar novas telas para a Nua Borges, siga a ordem de composição:
1. **Background:** Escolha `#000000` para o site público e `#0c0d12` para o admin.
2. **Cabeçalhos:** Utilize a sobrancelha `.eyebrow` em caixa alta com letra espaçada (`0.28em`), seguida por título principal em `Playfair Display`.
3. **CTAs Principais:** Utilize a classe `.btn-primary` para ações de conversão em Vinho Maduro (`#843C52`).
4. **Assinatura:** Adicione o detalhe do coração em tom vinho `♡` em pontos estratégicos de encerramento de conteúdo.

---

## 23. APLICAÇÕES INCORRETAS E PADRÕES A EVITAR

* ❌ **NUNCA** utilizar o ícone `Sparkles` ou elementos gráficos de estrelinhas/faíscas.
* ❌ **NUNCA** utilizar fundos brancos, cinzas claros ou coloridos nas superfícies principais.
* ❌ **NUNCA** utilizar fontes sans-serif genéricas (ex.: Arial, Inter) nos títulos principais.
* ❌ **NUNCA** aplicar a cor Vinho Maduro (`#843C52`) em grandes superfícies contínuas de fundo de página.
* ❌ **NUNCA** remover a textura de grão de filme (`body::after`) das visualizações públicas.

---

## 24. INCONSISTÊNCIAS IDENTIFICADAS NA AUDITORIA

Durante a investigação do código-fonte, foram observadas as seguintes oportunidades de padronização (sem alteração do código):

1. **Variações Isoladas no Tom Vinho:** Embora `#843C52` seja o token padrão, foram encontrados pontualmente os valores inline `#992b4a` e `#f4a7b9` em alguns estados de hover/sombra.
2. **Raio de Canto dos Cards:** O site público alterna entre `16px`, `22px`, `28px` e `32px` dependendo da seção, enquanto o admin utiliza `14px` e `16px`.

---

## 25. REFERÊNCIAS TÉCNICAS E CAMINHOS DE ARQUIVOS

* **Estilos Globais e Tokens:** [globals.css](file:///C:/Users/Philippe/Desktop/nuaborges/nuasite/app/globals.css)
* **Layout Raiz e Fontes:** [layout.tsx](file:///C:/Users/Philippe/Desktop/nuaborges/nuasite/app/layout.tsx)
* **Primitivas de UI do Admin:** [AdminPrimitives.tsx](file:///C:/Users/Philippe/Desktop/nuaborges/nuasite/components/nua/admin/ui/AdminPrimitives.tsx)
* **Sidebar do Admin:** [AdminSidebar.tsx](file:///C:/Users/Philippe/Desktop/nuaborges/nuasite/components/nua/admin/AdminSidebar.tsx)
* **Header Público:** [Header.tsx](file:///C:/Users/Philippe/Desktop/nuaborges/nuasite/components/nua/site/Header.tsx)
* **Footer Público:** [Footer.tsx](file:///C:/Users/Philippe/Desktop/nuaborges/nuasite/components/nua/site/Footer.tsx)

---

## 26. CHECKLIST COMPLETO DE FIDELIDADE À MARCA

- [x] O fundo da página é `#000000` (Site) ou `#0c0d12` (Admin)?
- [x] A cor de destaque utilizada é o Vinho Maduro (`#843C52`)?
- [x] Os títulos principais utilizam a fonte `Playfair Display`?
- [x] O texto corrido utiliza a fonte `Plus Jakarta Sans`?
- [x] O ícone `Sparkles` foi mantido 100% fora do arquivo/componente?
- [x] Os botões primários utilizam o formato pílula com texto em caixa alta e espaçamento amplo?
- [x] As fotografias possuem overlays gradientes para garantir legibilidade dos textos?
- [x] A assinatura *"Deixa de vergonha ♡"* está presente nos encerramentos editoriais?

---

## 27. CONCLUSÃO

Este **Manual Oficial de Identidade Visual e Design System** reflete com exatidão a alma estética da **Nua Borges** registrada no código-fonte do projeto. Ao preservar suas cores sóbrias, sua tipografia sofisticada e sua postura editorial luxuosa, garantimos que a marca continue transmitindo elegância, liberdade e sensualidade autêntica em todas as suas manifestações digitais.

---
