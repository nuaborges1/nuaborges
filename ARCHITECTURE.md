# 🏛️ Arquitetura do Repositório — Ecossistemas Separados

Este repositório foi estruturado com separação rígida entre dois projetos independentes que compartilham infraestrutura de build e deploy:

```
┌────────────────────────────────────────────────────────┐
│                      REPOSITÓRIO                       │
├───────────────────────────┬────────────────────────────┤
│   PROJETO NUA BORGES      │     ADMIN GERAL / PH       │
│   (Site & Admin da Cliente)│   (Central phdev.store)    │
└───────────────────────────┴────────────────────────────┘
```

---

## 🌸 1. Projeto Nua / Admin da Nua

Tudo relacionado ao site oficial da criadora Nua Borges e ao seu painel administrativo exclusivo.

### Estrutura de Pastas:
* **`app/(site)` & `app/page.tsx`**: Landing page oficial, portfólio, galeria e links.
* **`app/blog/`**: Blog com confissões, fotos e cards multimídia.
* **`app/contrato/`, `app/termos/`, `app/privacidade/`**: Páginas institucionais e jurídicas.
* **`app/admin/`**: Painel administrativo exclusivo da cliente (`/admin`).
* **`components/nua/site/`**: Componentes da interface pública (Header, Hero, About, Gallery, MusicPlayer, ContactModal, etc.).
* **`components/nua/admin/`**: Componentes do painel da cliente (HeroEditor, GalleryEditor, FinanceEditor, ClientRequestsEditor, etc.).
* **`components/nua/blog/`**: Componentes do blog (StoryCardModal).
* **`lib/nua/`**: Regras de negócio, stores e lógicas específicas da Nua (contentStore, blogStore, contractCanonical, pdfs, etc.).
* **`lib/services/nua/`**: Camada oficial de comunicação com APIs da Nua (authService, contentService, financeService, requestsService, contactService, musicService).
* **`nua-ai/` & `lib/nuaAi/`**: Motor cognitivo e base de conhecimento da inteligência artificial da Nua.

---

## ⚡ 2. Admin Geral / PH (Ecossistema phdev.store)

Projeto independente desenvolvido por Philippe para monitoramento centralizado, triagem de chamados e controle técnico dos clientes.

### Estrutura de Pastas:
* **`app/admingeral/`**: Central de comando do desenvolvedor (`/admingeral` ou subdomínio dedicado `admingeral.phdev.store`).
* **`components/admingeral/`**:
  - `RequestsCenter.tsx`: Kanban central de triagem de chamados, planejamento de escopo e feedback.
  - `FinanceAdminManager.tsx`: Gestão financeira máster (conciliação Mercado Pago, baixas manuais Pix, reversões).
  - `NuaAiMetricsTab.tsx`: Telemetria, inspeção de candidatos e saúde cognitiva da IA.
* **`lib/admingeral/`**: Tipos, modelos e barramento do Admin Geral.
* **`lib/services/admingeral/`**:
  - `client.ts`: Cliente HTTP com autenticação por Bearer / `X-Master-Key` e medição de latência.
  - `auditService.ts`: Consumo do feed de auditoria e registro de alertas de segurança.
  - `telemetryService.ts`: Métricas de audiência, dispositivos e tráfego real.
  - `requestsAdminService.ts`: Atualização de status e planos técnicos de chamados.
  - `financeAdminService.ts`: Conciliação financeira e controle de parcelas.
  - `mediaAdminService.ts`: Gerenciamento e inspeção de mídias em R2/KV.

---

## 🔒 3. Núcleo Compartilhado (`lib/core/`)

Utilitários de infraestrutura pura que não pertencem exclusivamente a nenhum dos dois projetos:
* `env.ts`: Detecção de ambiente (`isLocalhost()`, URLs de API).
* `envGuard.ts`: Validações de segurança em runtime.
* `security.ts`: Criptografia, tokens de sessão e funções timing-safe.
* `financeCanonical.ts`: Modelos canônicos de parcelas e regras de cálculo financeiro.
* `audioAlerts.ts`: Síntese de áudio Web Audio API (chimes e notificações).
* `utils.ts`: Utilitário `cn` (clsx + tailwind-merge).

---

## 🚀 4. Backend Edge & Deploys (`functions/` e `tools/`)

### Cloudflare Pages Functions (`functions/`):
* `_middleware.ts`: Roteamento contínuo RSC Next.js, honeypot traps e telemetria de visitantes.
* `api/_middleware.ts`: Security Level 5 (CORS restrito, CSRF, Fail-Closed Auth).
* `api/`: Endpoints REST mapeados para Cloudflare KV (`NUA_CONTENT`, `NUA_MEDIA`) e Bucket R2.

### Deploys Independentes (`tools/prepareDeploys.mjs`):
1. **`npm run deploy:site`** (`out-site`): Deploy do site público `nuaborges` (`nuaborges.com.br`).
2. **`npm run deploy:admin`** (`out-admin`): Deploy do painel administrativo da cliente `nuaborges-admin` (`admin.nuaborges.com.br`).
3. **`npm run deploy:admingeral`** (`out-admingeral`): Deploy da Central phdev `admingeral` (`admingeral.phdev.store`).
