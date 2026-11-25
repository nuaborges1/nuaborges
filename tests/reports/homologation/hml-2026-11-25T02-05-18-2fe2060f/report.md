# NUA BORGES — RELATÓRIO DE HOMOLOGAÇÃO INTEGRADA (STAGING)

- **Run ID:** `hml-2026-11-25T02-05-18-2fe2060f`
- **Modo:** `PREFLIGHT`
- **Data/Hora (UTC):** 2026-11-25T02:05:18.762Z
- **Ambiente Alvo:** `staging`
- **Site Staging:** `https://staging.nuaborges-er7.pages.dev`
- **Admin Staging:** `https://staging.nuaborges-admin.pages.dev`
- **Webhook Staging:** `https://staging.nuaborges-er7.pages.dev/api/webhooks/mercadopago`
- **Veredito:** **INDETERMINADO (Integrações externas pendentes/bloqueadas — nenhuma integração indisponível foi marcada como aprovada)**

## Resumo de Classificações

- **Aprovados (REAL / SANDBOX):** 0
- **Falhos:** 0
- **Bloqueados (serviço externo ausente):** 7
- **Não executados:** 5

## Matriz de Verificações (12 Pilares)

| ID | Verificação | Classificação | Status | Duração | Evidência / Motivo |
|---|---|---|---|---:|---|
| `01_cloudflare_pages_functions` | Comunicação com Cloudflare Pages Functions + Headers + Default-Deny | `NÃO EXECUTADO` | **NOT_EXECUTED** | 0ms | Modo preflight/dry-run ativo (defina STAGING_ALLOW_LIVE_SANDBOX_RUN=true e remova --preflight para executar em staging). |
| `02_supabase_staging` | Conexão, migrations e persistência isolada no Supabase Staging | `BLOQUEADO` | **BLOCKED** | 0ms | SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY de staging ausentes. |
| `03_mercadopago_sandbox_create` | Criação de cobrança Pix no Mercado Pago Sandbox + verificação de notification_url | `BLOQUEADO` | **BLOCKED** | 1ms | Mercado Pago Sandbox (TEST- + MP_WEBHOOK_SECRET) ou STAGING_SITE_URL ausentes. |
| `04_webhook_reception_and_auth` | Recebimento e validação criptográfica (x-signature) de webhooks em staging | `BLOQUEADO` | **BLOCKED** | 0ms | Webhook staging ou MP_WEBHOOK_SECRET indisponíveis. |
| `05_financial_reconciliation` | Reconciliação financeira autenticada (/api/payments/reconcile) e bloqueio não autorizado | `NÃO EXECUTADO` | **NOT_EXECUTED** | 0ms | Modo preflight/dry-run ativo (defina STAGING_ALLOW_LIVE_SANDBOX_RUN=true e remova --preflight para executar em staging). |
| `06_orders_and_entitlements_persistence` | Persistência real do pedido criado e verificação de integridade no Supabase Staging | `BLOQUEADO` | **BLOCKED** | 0ms | Supabase Staging indisponível ou nenhum pedido criado na etapa 03. |
| `07_vault_authorization` | Bloqueio fail-closed de /media/private/* sem sessão válida e resposta do Cofre | `NÃO EXECUTADO` | **NOT_EXECUTED** | 0ms | Modo preflight/dry-run ativo (defina STAGING_ALLOW_LIVE_SANDBOX_RUN=true e remova --preflight para executar em staging). |
| `08_b2_staging_storage` | Upload privado, leitura autenticada (Range/no-store) e exclusão segura no Backblaze B2 Staging | `BLOQUEADO` | **BLOCKED** | 0ms | Credenciais B2 Staging ou Admin Staging ausentes. |
| `09_smtp_test_inbox` | Disparo transacional real (OTP NUA ID) para caixa de teste SMTP | `BLOQUEADO` | **BLOCKED** | 0ms | SMTP de teste / STAGING_TEST_EMAIL não configurado. |
| `10_cron_worker_auth` | Autenticação do Cron Worker (/api/cron/appointment-reminders) com x-cron-secret e Bearer | `NÃO EXECUTADO` | **NOT_EXECUTED** | 0ms | Modo preflight/dry-run ativo (defina STAGING_ALLOW_LIVE_SANDBOX_RUN=true e remova --preflight para executar em staging). |
| `11_unauthorized_access_rejection` | Revogação efetiva de sessão admin após logout (DEF-004) e isolamento de host admin | `NÃO EXECUTADO` | **NOT_EXECUTED** | 0ms | Modo preflight/dry-run ativo (defina STAGING_ALLOW_LIVE_SANDBOX_RUN=true e remova --preflight para executar em staging). |
| `12_failure_recovery_and_idempotency` | Idempotência de webhook duplicado em staging sem efeitos colaterais duplicados | `BLOQUEADO` | **BLOCKED** | 0ms | Mercado Pago Sandbox ou pagamento da etapa 03 indisponível. |

## Limpeza de Artefatos de Teste

- Executada: `false`
- Itens limpos: 0
- Avisos: Nenhum
