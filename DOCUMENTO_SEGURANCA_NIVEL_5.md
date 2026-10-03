# MANUAL DE SEGURANÇA EM PROFUNDIDADE — SECURITY LEVEL 5
## SISTEMA OFICIAL NUA BORGES

Este documento detalha a arquitetura de segurança, protocolos operacionais e procedimentos de emergência implementados no projeto para garantir uma postura de segurança de nível corporativo (**Security Level 5**).

---

## 1. ARQUITETURA DE SEGURANÇA EM PROFUNDIDADE

A aplicação segue o princípio de **Defesa em Profundidade**, onde nenhuma camada confia cegamente nas demais:

```
                      INTERNET
                         │
                         ▼
                  CLOUDFLARE EDGE
                (DNS / WAF / DDoS)
                         │
                         ▼
             SECURITY HEADERS & CSP
           (Strict CSP, HSTS Preload)
                         │
                         ▼
              AUTORIZAÇÃO & GATEWAY
         (functions/api/_middleware.ts)
                         │
           ┌─────────────┴─────────────┐
           ▼                           ▼
    SITE PÚBLICO                PAINEL ADMIN
   (Sanitized URLs)         (HMAC Cookie Session)
           │                           │
           └─────────────┬─────────────┘
                         │
                         ▼
                  EDGE API ROUTES
                (/api/media/*, etc.)
                         │
                         ▼
              VALIDAÇÃO BINÁRIA (R2)
            (Magic Bytes & Path Regex)
                         │
                         ▼
               STORAGE CLOUDFLARE R2
```

---

## 2. SUBSISTEMA DE AUTENTICAÇÃO

1. **Validação no Servidor (Edge):**
   - Rota: `POST /api/auth/login`
   - A senha nunca é avaliada apenas no navegador do cliente. Ela é enviada para a Edge Function onde é processada com **comparação em tempo constante** (`timingSafeEqualString`), impedindo ataques de timing side-channel.
2. **Cookies Criptográficos (`__Host-Admin-Session`):**
   - Flags ativas: `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`
   - O prefixo `__Host-` bloqueia injeção por subdomínios.
   - O atributo `HttpOnly` torna impossível que qualquer script malicioso (XSS) acesse ou roube a sessão.
   - O token é assinado com chave HMAC-SHA256 (`ADMIN_API_SECRET`).
3. **Validação de Sessão:**
   - Rota: `GET /api/auth/session`
   - Verifica a assinatura e expiração na borda da Cloudflare.

---

## 3. AUTORIZAÇÃO E GATEWAY FAIL-CLOSED

1. **Middleware Central (`functions/api/_middleware.ts`):**
   - Intercepta todas as requisições para `/api/*`.
   - Aplica a política **Fail-Closed**: se a requisição não tiver um cookie de sessão válido ou header `Authorization: Bearer <ADMIN_API_SECRET>`, a requisição é **rejeitada com 401 Unauthorized**.
2. **Proteção Anti-IDOR / BOLA:**
   - As chaves de arquivos são rigorosamente validadas via regex (`isValidObjectKey`).
   - Nenhuma requisição consegue alterar ou apagar arquivos fora do diretório oficial `media/`.
   - Tentativas de Directory Traversal (`../`, `//`, `\0`) são sumariamente descartadas.

---

## 4. PROTEÇÃO DE UPLOADS E STORAGE R2

1. **Inspeção de Assinatura Binária (Magic Bytes):**
   - Não confiamos na extensão do arquivo nem no header `Content-Type` do cliente.
   - Os primeiros bytes de cada arquivo são inspecionados:
     - JPEG: `FF D8 FF`
     - PNG: `89 50 4E 47`
     - WebP: `RIFF` ... `WEBP`
     - MP4: cabeçalho `ftyp`
   - Arquivos executáveis ou scripts disfarçados são rejeitados com erro 400.
2. **Limites de Tamanho:**
   - Fotos: Máximo 15MB.
   - Vídeos: Máximo 50MB.
   - Arquivos maiores são barrados com `413 Payload Too Large`.
3. **Isolamento de Execução:**
   - O Cloudflare R2 armazena os arquivos de forma estática pura, sem interpretadores de código.
   - Na CDN, os arquivos são entregues com `X-Content-Type-Options: nosniff`.

---

## 5. CONTENT SECURITY POLICY (CSP) E HEADERS

Configurados em `public/_headers`:
- **Content-Security-Policy:**
  - `default-src 'self'`
  - `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com`
  - `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
  - `font-src 'self' https://fonts.gstatic.com data:`
  - `img-src 'self' data: blob: https://cdn.nuaborges.phstatic.com.br https://*.r2.cloudflarestorage.com https://*.pages.dev`
  - `media-src 'self' blob: https://cdn.nuaborges.phstatic.com.br https://*.r2.cloudflarestorage.com`
  - `frame-ancestors 'none'` (Anti-Clickjacking)
  - `object-src 'none'`
  - `base-uri 'self'`
  - `upgrade-insecure-requests`
- **HSTS Preload:** `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- **Outros:** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.

---

## 6. SANITIZAÇÃO DE LINKS E DEFESA ANTI-XSS

- Todos os links inseridos dinamicamente passam pela função `sanitizeUrl()` em `lib/security.ts`.
- Esquemas perigosos como `javascript:`, `data:` e `vbscript:` são neutralizados e substituídos por `#`.
- O e-mail de contato é validado por expressão regular RFC-5322 antes de abrir o aplicativo de correio eletrônico.

---

## 7. RATE LIMITING E PROTEÇÃO CONTRA ABUSO

1. **No Backend Edge:**
   - O endpoint `/api/auth/login` possui limitador de tentativas por IP (máximo de 5 tentativas a cada 15 minutos).
   - Bloqueio automático com status `429 Too Many Requests`.
2. **Recomendações no Cloudflare Dashboard:**
   - **WAF Rule 1:** Ativar desafio gerenciado (Managed Challenge) na rota `/admin*`.
   - **WAF Rule 2:** Rate limiting de 30 requisições/minuto em `/api/media/*`.

---

## 8. HIGIENE DE DEPENDÊNCIAS E REPOSITÓRIO

- `npm audit` 100% limpo (**0 vulnerabilidades**).
- Remoção do pacote obsoleto `firebase-tools` (redução de 594 pacotes).
- Atualização e resolução de brechas do `postcss` via overrides.
- Exclusão do script legado `fix_header.js`.

---

## 9. PROCEDIMENTOS DE OPERAÇÃO E EMERGÊNCIA

### 9.1 Troca / Rotação da Senha de Administração
1. No painel da Cloudflare Pages:
   - Acesse **Settings > Environment Variables**.
   - Atualize a variável `ADMIN_PASSWORD` para a nova senha forte.
   - Atualize `ADMIN_API_SECRET` para um novo segredo alfanumérico longo (mínimo 32 caracteres).
2. Salve as variáveis e acione um novo deploy (Redeploy).
3. Todas as sessões anteriores ativas serão automaticamente invalidadas na borda.

### 9.2 Procedimento para Revogar Sessões Comprometidas
Se houver suspeita de vazamento de credenciais:
1. Altere o valor de `ADMIN_API_SECRET` nas Environment Variables do Cloudflare Pages.
2. Como os cookies `__Host-Admin-Session` são assinados com essa chave, **todas as sessões existentes no mundo se tornam imediatamente inválidas**.
3. Ninguém conseguirá realizar uploads, exclusões ou acessar a API sem fazer login novamente com a nova chave.

### 9.3 Procedimento de Resposta a Incidentes (IR)
1. **Identificação:** Verificar nos logs do Cloudflare Analytics e Pages Functions requisições com código 401, 403 ou 429 anormais.
2. **Contenção:** Ativar a opção **Under Attack Mode** no painel da Cloudflare. Isso força um desafio JavaScript da Cloudflare para 100% dos visitantes antes de chegarem à aplicação.
3. **Erradicação:** Rotacionar `ADMIN_API_SECRET`, `CLOUDFLARE_R2_ACCESS_KEY_ID` e `CLOUDFLARE_R2_SECRET_ACCESS_KEY`.
4. **Recuperação:** Desativar o Under Attack Mode assim que o tráfego anômalo cessar.
