# Auditoria de Segurança, Hardening e Correções — Nua Borges

**Alvo do projeto:** Nua Borges (`nuasite`)  
**Arquitetura:** Next.js com exportação estática (`output: 'export'`) + Cloudflare Pages Functions (`functions/` - Deploy & Proxy) + Backblaze B2 (Storage de Mídia) + Supabase (Database)  
**Data:** 11 de outubro de 2026  
**Status da Auditoria:** Concluída com sucesso. Todas as vulnerabilidades de código confirmadas foram mitigadas, testadas com suite automatizada e validadas via build e tipagem.

---

## 1. Resumo Executivo das Correções Implementadas

Todos os achados críticos, altos e médios confirmados nos relatórios foram corrigidos diretamente no código-fonte, sem regressão visual ou funcional:

1. **C1 (Fallbacks de Senha no Contrato):** Removidos fallbacks literais (`contrato2026`, `nuaborges2026`), eliminada comparação `.toLowerCase()`, instituída comparação estrita em tempo constante (`timingSafeEqualString`) e exigido segredo via Cloudflare Pages (`CONTRACT_PASSWORD`).
2. **C2 (RBAC Centralizado):** Implementada matriz de autorização por papel (`isRouteAuthorizedForRole`) no middleware Edge (`functions/api/_middleware.ts`) e helper (`functions/api/_authHelper.ts`). Tokens de contrato (`contract_client` e `contract_dev`) não conseguem mais acessar CMS, mídia, finanças ou Nua IA.
3. **C3 (Eliminação de PII do Bundle):** Dados civis das partes (CPFs, RGs, endereços, WhatsApp, chave PIX) foram completamente expurgados do bundle estático gerado (`out/`). O PDF público desprotegido em `public/` foi excluído. Os dados sensíveis agora são mantidos no runtime do servidor e hidratados dinamicamente apenas após autenticação com token HMAC válido.
4. **A1 (Sessão & CSP):** Eliminado o armazenamento de hash SHA-256 no `localStorage`. Limpeza ativa de credenciais legadas. Removido `'unsafe-eval'` de `public/_headers` e ajustada a `Permissions-Policy` para compatibilidade com o gravador sem abrir brechas a terceiros.
5. **A2 (Webhook Mercado Pago):** Em produção, a ausência de `MP_WEBHOOK_SECRET` agora falha de forma segura com status 503 (fail-closed). A verificação de assinatura e o bypass de teste utilizam comparação timing-safe e o modo de simulação foi restrito a `localhost`.
6. **A3 & A4 (CORS & CSRF):** Ancoragem rigorosa de subdomínios em `phdev.store`. Rejeição de mutações autenticadas por cookie caso `Origin` e `Referer` estejam ausentes ou apontem para origens não permitidas.
7. **M1, M2, M5, IA & Content Sync:** Rate limiting em memória para endpoints públicos e críticos (contato, telemetria, upload, Nua IA). Time-trap com validação temporal. Validação de extensão compatível com MIME/magic-bytes no upload. Teto de payload (2.5MB) e namespace isolado (`backup:content:`) em sincronização de conteúdo.

---

## 2. Matriz de Achados e Resolução

| ID | Severidade | Componente | Status Anterior | Resolução Implementada |
|---|---|---|---|---|
| **C1** | Crítica | `functions/api/contract/sign.ts` | Senha com `.toLowerCase()` e fallbacks em texto claro no código | Fallbacks eliminados; comparação em tempo constante e case-sensitive; obrigatoriedade de secret no ambiente. |
| **C2** | Crítica | `functions/api/_middleware.ts` & `_authHelper.ts` | Gateway validava HMAC sem checar `payload.role` | Matriz RBAC implementada no middleware (`admin`, `dev`, `client`, `contract_client`, `contract_dev`). |
| **C3** | Crítica | `lib/contractCanonical.ts` & `app/contrato/page.tsx` | CPFs, RGs e endereços expostos no bundle JS público e PDF em `public/` | PII removida dos bundles estáticos; PDF público excluído; hidratação dinâmica via servidor autenticado. |
| **A1** | Alta | `lib/contentStore.ts` & `public/_headers` | Hash SHA-256 no `localStorage` e CSP com `unsafe-eval` | Hash removido do client-side; limpeza de chaves legadas; CSP sem `unsafe-eval`. |
| **A2** | Alta | `functions/api/finance/webhook.ts` | HMAC ignorado sem secret; comparação não constante | Fail-closed (503) em produção; `timingSafeEqualString` para HMAC e simulação restrita a localhost. |
| **A3** | Alta | `functions/api/_middleware.ts` | CORS aceitava qualquer host terminado em `phdev.store` | Regex ancorada com limites de subdomínio estritos (`^https:\/\/([a-z0-9-]+\.)*phdev\.store$`). |
| **A4** | Alta | `functions/api/_middleware.ts` | Mutações sem `Origin` nem `Referer` prosseguiam | Mutações autenticadas por cookie agora exigem origem ou referer válido da allowlist. |
| **M1/M2** | Média | `functions/api/contact.ts` & `telemetry/track.ts` | Ausência de rate limiting e cota; honeypot burlável | Rate limiting por IP; validação temporal estrita de `renderedAt`; sanitização de logs. |
| **M3** | Média | `functions/api/auth/session.ts` | Resposta positiva a localhost e conflito com Bearer | Validação unificada via cookie e Bearer; remoção de falsos positivos em headers de dev. |
| **M4** | Média | `functions/api/_middleware.ts` | Rotas fantasma na allowlist (`/api/traps/*`) | Rotas obsoletas removidas da allowlist pública; endpoint `/api/traps/scraper` alinhado. |
| **M5** | Média | `functions/api/media/upload.ts` | Cliente escolhe chave sem validação cruzada | Rate limit adicionado; correspondência estrita entre extensão de arquivo e magic bytes. |
| **M6/M7**| Média | `functions/api/_authHelper.ts` & `_middleware.ts`| Falta de segredo causava fallback para senha | Separação explícita de secrets; fail-closed em produção se chaves estiverem ausentes. |

---

## 3. Testes Automatizados e Evidências

Suite criada em `scripts/security-audit.test.mjs` executada com sucesso total:
- **Criptografia:** `timingSafeEqualString` validada para tempo constante e sensibilidade a maiúsculas/minúsculas.
- **Sessões HMAC:** Geração, assinatura e expiração de tokens HMAC-SHA256 testadas.
- **RBAC:** Matriz testada para todos os 5 papéis, garantindo que `contract_client` receba 403 em `/api/content/sync`, `/api/media/upload` e `/api/finance/sync`.
- **Fallbacks Proibidos:** Varredura no código-fonte confirmando ausência de `contrato2026` e `nuaborges2026`.
- **Proteção de PII:** Varredura em módulos canônicos e nos chunks de `out/` confirmando ausência de CPFs reais.
- **CORS:** Validação de subdomínios legítimos e rejeição de domínios maliciosos.
- **Webhook HMAC:** Validação de assinatura do Mercado Pago e rejeição de assinaturas divergentes.

Build de produção:
- `npx tsc --noEmit` -> 0 erros
- `npm run build` -> 19 páginas estáticas geradas com sucesso
