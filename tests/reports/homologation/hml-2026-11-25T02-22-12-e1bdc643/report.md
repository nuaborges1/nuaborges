# NUA BORGES — RELATÓRIO DE HOMOLOGAÇÃO INTEGRADA (STAGING)

- **Run ID:** `hml-2026-11-25T02-22-12-e1bdc643`
- **Modo:** `LIVE_STAGING`
- **Data/Hora (UTC):** 2026-11-25T02:22:13.589Z
- **Ambiente Alvo:** `staging`
- **Site Staging:** `https://nuaborges-staging.pages.dev`
- **Admin Staging:** `https://nuaborges-admin-staging.pages.dev`
- **Webhook Staging:** `https://nuaborges-staging.pages.dev/api/webhooks/mercadopago`
- **Veredito:** **NO-GO**

## Resumo de Classificações

- **Aprovados (REAL / SANDBOX):** 3
- **Falhos:** 2
- **Bloqueados (serviço externo ausente):** 7
- **Não executados:** 0

## Matriz de Verificações (12 Pilares)

| ID | Verificação | Classificação | Status | Duração | Evidência / Motivo |
|---|---|---|---|---:|---|
| `01_cloudflare_pages_functions` | Comunicação com Cloudflare Pages Functions + Headers + Default-Deny | `REAL` | **PASS** | 319ms | Cloudflare Pages Functions respondeu 200 (/api/content/sync) e 404 ROUTE_NOT_FOUND com headers de segurança. |
| `02_supabase_staging` | Conexão, migrations e persistência isolada no Supabase Staging | `BLOQUEADO` | **BLOCKED** | 0ms | SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY de staging ausentes. |
| `03_mercadopago_sandbox_create` | Criação de cobrança Pix no Mercado Pago Sandbox + verificação de notification_url | `BLOQUEADO` | **BLOCKED** | 0ms | Mercado Pago Sandbox (TEST- + MP_WEBHOOK_SECRET) ou STAGING_SITE_URL ausentes. |
| `04_webhook_reception_and_auth` | Recebimento e validação criptográfica (x-signature) de webhooks em staging | `BLOQUEADO` | **BLOCKED** | 0ms | Webhook staging ou MP_WEBHOOK_SECRET indisponíveis. |
| `05_financial_reconciliation` | Reconciliação financeira autenticada (/api/payments/reconcile) e bloqueio não autorizado | `SANDBOX` | **FAIL** | 91ms | Reconcile autenticado retornou HTTP 503. |
| `06_orders_and_entitlements_persistence` | Persistência real do pedido criado e verificação de integridade no Supabase Staging | `BLOQUEADO` | **BLOCKED** | 0ms | Supabase Staging indisponível ou nenhum pedido criado na etapa 03. |
| `07_vault_authorization` | Bloqueio fail-closed de /media/private/* sem sessão válida e resposta do Cofre | `REAL` | **PASS** | 46ms | Acesso direto sem sessão a /media/private/* bloqueado com HTTP 403 e Cache-Control no-store. |
| `08_b2_staging_storage` | Upload privado, leitura autenticada (Range/no-store) e exclusão segura no Backblaze B2 Staging | `BLOQUEADO` | **BLOCKED** | 0ms | Credenciais B2 Staging ou Admin Staging ausentes. |
| `09_smtp_test_inbox` | Disparo transacional real (OTP NUA ID) para caixa de teste SMTP | `BLOQUEADO` | **BLOCKED** | 0ms | SMTP de teste / STAGING_TEST_EMAIL não configurado. |
| `10_cron_worker_auth` | Autenticação do Cron Worker (/api/cron/appointment-reminders) com x-cron-secret e Bearer | `SANDBOX` | **FAIL** | 71ms | Cron com x-cron-secret retornou HTTP 503. |
| `11_unauthorized_access_rejection` | Revogação efetiva de sessão admin após logout (DEF-004) e isolamento de host admin | `REAL` | **PASS** | 378ms | Logout revogou sessão no servidor e replay em /api/content/sync?mode=admin foi rejeitado. |
| `12_failure_recovery_and_idempotency` | Idempotência de webhook duplicado em staging sem efeitos colaterais duplicados | `BLOQUEADO` | **BLOCKED** | 0ms | Mercado Pago Sandbox ou pagamento da etapa 03 indisponível. |

## Limpeza de Artefatos de Teste

- Executada: `true`
- Itens limpos: 0
- Avisos: Nenhum
