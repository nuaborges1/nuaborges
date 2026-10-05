# Cloudflare Pages Functions — Backend Architecture

Este diretório contém os endpoints serverless executados no Cloudflare Pages edge runtime (V8 Isolate).

---

## 🛡️ Segurança e Middlewares Globais

* **`_middleware.ts`**: Middleware raiz global.
  - Roteamento e streaming de payloads RSC (`text/x-component`) do Next.js App Router para navegação contínua (música ininterrupta).
  - Honeypot Trap para interceptação e neutralização de bots maliciosos e vulnerability scanners.
  - Telemetria de visitas públicas reais da Nua Borges (com exclusão de administradores e pré-carregamentos).
* **`api/_middleware.ts`**: Security Level 5 Gateway para `/api/*`.
  - CORS restrito com allowlist explícita (sem wildcard `*`).
  - Proteção anti-CSRF para métodos mutantes (`POST`, `PUT`, `DELETE`, `PATCH`).
  - Fail-Closed Authentication para endpoints privados em produção (Cookies HttpOnly, Bearer token e `X-Master-Key`).
  - Headers rigorosos de segurança (`Cache-Control: no-store`, `nosniff`).

---

## 🌸 1. Endpoints do Projeto Nua Borges

Endpoints exclusivos do site público e do painel administrativo da cliente Nua Borges:

| Rota HTTP | Arquivo | Finalidade |
| :--- | :--- | :--- |
| `POST /api/contact` | `api/contact.ts` | Envio de formulário comercial com validação anti-spam |
| `POST /api/auth/login` | `api/auth/login.ts` | Autenticação no painel da Nua Borges |
| `GET /api/auth/session` | `api/auth/session.ts` | Verificação de validade da sessão da cliente |
| `POST /api/auth/logout` | `api/auth/logout.ts` | Encerramento seguro da sessão admin |
| `POST /api/auth/contract` | `api/auth/contract.ts` | Validação de senha para visualização do contrato |
| `GET, POST /api/content/sync` | `api/content/sync.ts` | Leitura pública e sincronização de conteúdo via KV (`NUA_CONTENT`) |
| `GET, POST /api/media/upload` | `api/media/upload.ts` | Upload de fotos e mídias para R2/KV |
| `GET /api/media/list` | `api/media/list.ts` | Listagem de imagens da biblioteca |
| `POST /api/media/delete` | `api/media/delete.ts` | Exclusão de arquivos de mídia |
| `POST /api/media/presign` | `api/media/presign.ts` | Geração de URLs pré-assinadas S3/R2 |
| `GET /api/music/list` | `api/music/list.ts` | Lista pública de faixas da playlist |
| `POST /api/music/upload` | `api/music/upload.ts` | Upload de faixas de áudio |
| `PUT, DELETE /api/music/update` | `api/music/update.ts` | Edição e remoção de faixas |
| `PUT /api/music/config` | `api/music/config.ts` | Configurações de reprodução (autoplay, volume) |
| `POST /api/nua-ai/chat` | `api/nua-ai/chat.ts` | Chat da assistente inteligente Nua AI |
| `GET /api/nua-ai/conversations` | `api/nua-ai/conversations.ts` | Histórico de conversas da assistente |
| `GET /api/finance/installments` | `api/finance/installments.ts` | Consulta de parcelas e status financeiro da cliente |
| `POST /api/finance/pix` | `api/finance/pix.ts` | Emissão de cobrança e QR Code Pix Oficial |
| `GET /api/finance/verify` | `api/finance/verify.ts` | Consulta do status de pagamento de parcela |
| `POST /api/finance/create-preference` | `api/finance/create-preference.ts` | Criação de checkout com cartão Mercado Pago |
| `POST /api/finance/webhook` | `api/finance/webhook.ts` | Webhook de notificações de pagamento |
| `GET /audio/*` | `audio/[[path]].ts` | Streaming de alta performance de faixas de áudio R2 |
| `GET /media/*` | `media/[[path]].ts` | Streaming de imagens e vídeos R2 |

---

## ⚡ 2. Endpoints da Central phdev (Admin Geral)

Endpoints independentes pertencentes ao ecossistema **phdev.store** para monitoramento, triagem e gestão de projetos:

| Rota HTTP | Arquivo | Finalidade |
| :--- | :--- | :--- |
| `GET /api/audit/feed` | `api/audit/feed.ts` | Feed em tempo real de logs de segurança e auditoria |
| `POST /api/audit/event` | `api/audit/event.ts` | Registro de novos eventos no barramento de auditoria |
| `GET /api/telemetry/stats` | `api/telemetry/stats.ts` | Métricas de audiência, dispositivos e visitas reais |
| `POST /api/telemetry/track` | `api/telemetry/track.ts` | Registro anônimo de pageview do visitante |
| `GET, POST /api/traps/scraper` | `api/traps/scraper.ts` | Honeypot trap para catalogação de scrapers e bots |
| `ALL /api/finance/admin` | `api/finance/admin.ts` | Gestão financeira máster do desenvolvedor (conciliação, baixas manuais, reversões) |

---

## 🌉 3. Bridge de Comunicação Cliente ↔ Desenvolvedor

* **`GET, POST /api/requests`** (`api/requests/index.ts`):
  - **Lado Cliente (Nua)**: Abertura de chamados, envio de sugestões, feedback e aprovação de planos técnicos.
  - **Lado Desenvolvedor (Central phdev)**: Kanban completo de triagem, planejamento técnico com Gemini, estimativas de prazo e gestão de status.
