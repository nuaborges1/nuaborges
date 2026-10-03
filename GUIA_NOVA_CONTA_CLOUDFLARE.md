# 🚀 Guia Passo a Passo: Configuração na Nova Conta Cloudflare
## Projeto: Nua Borges (Plataforma Oficial & Painel Administrativo)

> Este guia foi elaborado para você configurar do zero a nova conta da Cloudflare onde o site da Nua Borges ficará hospedado em definitivo, garantindo **custo zero permanente (plano gratuito)** e máxima performance.

---

### Visão Geral dos Recursos na Nova Conta

| Recurso | Nome na Nova Conta | Função | Custo |
| :--- | :--- | :--- | :--- |
| **Cloudflare Pages (Deploy 1)** | `nuaborges-admin` | Hospeda exclusivamente o Painel Administrativo (`https://nuaborges-admin.pages.dev`) | $0 (Gratuito) |
| **Cloudflare Pages (Deploy 2)** | `nuaborges` | Hospeda o Site Público de Apresentação e as APIs (`https://nuaborges-er7.pages.dev`) | $0 (Gratuito) |
| **Cloudflare KV Storage** | `NUA_CONTENT` & `NUA_MEDIA` | Sincroniza o conteúdo publicado em tempo real entre o Admin e o Site | $0 (100% Free) |
| **Cloudflare R2 (Opcional)** | `nuaborges-media` | Guarda acervo de vídeos/fotos adicionais sem custo de tráfego | $0 (10 GB inclusos) |
| **Custom Domain** | `nuaborges.com.br` | Domínio principal do site público | Gratuito na Cloudflare |
| **Admin Subdomain** | `admin.nuaborges.com.br` | Subdomínio dedicado do painel | Gratuito na Cloudflare |

---

## Passo 1: Criar a Conta Cloudflare da Cliente

1. Acesse: [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
2. Crie a conta usando o e-mail da cliente (ou um e-mail criado para a gestão do projeto).
3. Confirme o e-mail de ativação.
4. Anote o **Account ID** da conta (encontrado na URL ou na lateral direita da página inicial da Cloudflare).

---

## Passo 2: Criar o Bucket de Mídia no R2

1. No menu lateral esquerdo, clique em **R2 Object Storage**.
2. Clique no botão azul **Create bucket**.
3. **Bucket name:** digite `nuaborges-media`.
4. **Location:** selecione **Automatic** (ou `WNAM` / América do Norte).
5. Clique em **Create bucket**.

### 2.1 Conectar o Subdomínio da CDN ao Bucket
1. Dentro do bucket `nuaborges-media`, clique na aba **Settings**.
2. Role até a seção **Custom Domains** e clique em **Connect Domain**.
3. Digite: `cdn.nuaborges.com.br` *(substitua pelo domínio real da cliente)*.
4. Clique em **Continue** e depois em **Connect domain**.
*(A Cloudflare gerará o certificado SSL automaticamente).*

### 2.2 Gerar Token de API R2 (S3 Credentials)
1. Na página inicial do **R2 Object Storage**, clique em **Manage R2 API Tokens** (no canto superior direito).
2. Clique em **Create API token**.
3. Configure:
   - **Token name:** `NuaBorges R2 Media Token`
   - **Permissions:** Marque **Object Read & Write**.
   - **Bucket scope:** Escolha **Apply to specific buckets only** e selecione `nuaborges-media`.
   - **TTL:** Deixe sem expiração.
4. Clique em **Create API Token**.
5. **COPIE E SALVE AGORA:**
   - **Access Key ID**
   - **Secret Access Key**
   - **Endpoint S3:** `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

---

## Passo 3: Os 2 Projetos no Cloudflare Pages (Admin & Site)

A plataforma é dividida em dois deploys independentes que conversam entre si com sincronização em tempo real:

### 3.1 Deploy 1: Painel Administrativo (`nuaborges-admin`)
* **Pasta de Deploy:** `out-admin`
* **Comando:** `npm run deploy:admin`
* **URL de Produção:** `https://nuaborges-admin.pages.dev`

### 3.2 Deploy 2: Site Público Oficial (`nuaborges`)
* **Pasta de Deploy:** `out-site`
* **Comando:** `npm run deploy:site`
* **URL de Produção:** `https://nuaborges-er7.pages.dev` *(ou domínio da cliente)*

### 3.3 Como Fazer o Deploy de Tudo em 1 Clique
No terminal, basta rodar:
```bash
npm run deploy:all
```
Esse comando compila o Next.js, gera os 2 pacotes otimizados e publica ambos na Cloudflare automaticamente!

---

## Passo 4: Conectar o Binding do R2 e as Variáveis de Ambiente

No painel do projeto Pages (`Workers & Pages` > `nuaborges`):

### 4.1 Binding do R2 (Funções de API de Mídia)
1. Acesse a aba **Settings** > **Functions**.
2. Role até **R2 bucket bindings** e clique em **Add binding**:
   - **Variable name:** `BUCKET`
   - **R2 bucket:** selecione `nuaborges-media`.
3. Clique em **Save**.

### 4.2 Variáveis de Ambiente (Environment Variables)
1. Na aba **Settings** > **Environment variables**, clique em **Add variables**:

| Variable Name | Value | Nota |
| :--- | :--- | :--- |
| `MEDIA_STORAGE_PROVIDER` | `cloudflare-r2` | Ativa o armazenamento R2 |
| `CLOUDFLARE_ACCOUNT_ID` | `<Account ID da Conta Nova>` | ID da conta |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | `<Access Key ID do Passo 2.2>` | Chave pública R2 |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | `<Secret Key do Passo 2.2>` | **Criptografe (Encrypt)** |
| `CLOUDFLARE_R2_BUCKET_NAME` | `nuaborges-media` | Nome do bucket |
| `CLOUDFLARE_R2_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` | Endpoint S3 |
| `NEXT_PUBLIC_MEDIA_CDN_URL` | `https://cdn.nuaborges.com.br` | URL da CDN de fotos |
| `NEXT_PUBLIC_SITE_URL` | `https://nuaborges.com.br` | URL oficial |
| `ADMIN_PASSWORD` | `DefinaUmaSenhaForte2026!` | Senha de login do `/admin` |
| `ADMIN_API_SECRET` | `UmaChaveAleatoriaSuperSeguraHex` | Assinatura de tokens |
| `NEXT_PUBLIC_ENABLE_BLOG` | `false` | `false` = blog travado; `true` = blog liberado |

2. Clique em **Save**.

---

## Passo 5: Apontar o Domínio Oficial

1. No projeto Pages, acesse a aba **Custom domains**.
2. Clique em **Set up a custom domain**.
3. Digite o domínio da cliente (ex: `nuaborges.com.br` ou `www.nuaborges.com.br`).
4. Siga as instruções em tela para os registros DNS.

---

## Passo 6: Regra de Redirecionamento da Raiz da CDN (Segurança)

Para garantir que ninguém fique vendo tela em branco se digitar `cdn.nuaborges.com.br`:
1. No menu lateral da Cloudflare, vá na zona do domínio > **Rules** > **Redirect Rules** > **Create rule**.
2. **Rule name:** `Redirecionar Raiz CDN para Site Principal`
3. **Expressão (Match):**
   - `Hostname` equals `cdn.nuaborges.com.br`
   - `AND`
   - `URI Path` equals `/`
4. **Target URL:** `https://nuaborges.com.br` (Status: `301 - Moved Permanently`).
5. Clique em **Deploy**.

---

## Passo 7: Como Liberar o Blog no Futuro

Quando a Nua Borges aprovar e quiser colocar o Diário Secreto / Caixa de Asks no ar:
1. Acesse o Cloudflare Pages > **Settings** > **Environment variables**.
2. Edite `NEXT_PUBLIC_ENABLE_BLOG` alterando de `false` para `true`.
3. Vá em **Deployments** e clique em **Redeploy** na última versão.
4. Pronto! O link "Blog" aparecerá no menu e no rodapé, e a página `/blog` passará a carregar normalmente para todo o público.
