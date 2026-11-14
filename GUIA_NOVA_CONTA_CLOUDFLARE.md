# 🚀 Guia Passo a Passo: Configuração na Conta Cloudflare
## Projeto: Nua Borges (Plataforma Oficial & Painel Administrativo)

> **Importante:** A Cloudflare é utilizada **exclusivamente para Deploy, Hospedagem Edge (Cloudflare Pages), DNS e Proxy/CDN**.
> O armazenamento de fotos, vídeos e faixas de áudio é gerenciado **exclusivamente no Backblaze B2** (bucket S3-compatible `nuaborges-media`), e os dados editoriais no **Supabase PostgreSQL**.

---

### Visão Geral dos Recursos

| Recurso | Função | Provedor | Custo |
| :--- | :--- | :--- | :--- |
| **Cloudflare Pages (Deploy 1)** `nuaborges-admin` | Hospeda exclusivamente o Painel Administrativo (`https://nuaborges-admin.pages.dev`) | Cloudflare | $0 (Gratuito) |
| **Cloudflare Pages (Deploy 2)** `nuaborges` | Hospeda o Site Público Oficial e as APIs Edge (`https://nuaborges-er7.pages.dev`) | Cloudflare | $0 (Gratuito) |
| **Edge Proxy & CDN** | Proxy reverso, cache de borda e certificado SSL universal | Cloudflare | $0 (Gratuito) |
| **Supabase PostgreSQL** | Banco de dados mestre autoritativo (`site_content`, `orders`, etc.) | Supabase | $0 (Free Tier) |
| **Backblaze B2 Object Storage** | Armazenamento de fotos, vídeos UHD e músicas (bucket `nuaborges-media`) | Backblaze | 10 GB Gratuitos |
| **Custom Domain** | `nuaborges.com.br` e `admin.nuaborges.com.br` | Registro.br + Cloudflare DNS | Gratuito na Cloudflare |

---

## Passo 1: Conta Cloudflare (Deploy & Proxy)

1. Acesse: [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
2. Crie ou acesse a conta da cliente.
3. Confirme o e-mail de ativação.

---

## Passo 2: Os 2 Projetos no Cloudflare Pages (Admin & Site)

A plataforma é dividida em dois deploys independentes que conversam entre si com sincronização em tempo real:

### 2.1 Deploy 1: Painel Administrativo (`nuaborges-admin`)
* **Pasta de Deploy:** `out-admin`
* **Comando:** `npm run deploy:admin`
* **URL de Produção:** `https://nuaborges-admin.pages.dev`

### 2.2 Deploy 2: Site Público Oficial (`nuaborges`)
* **Pasta de Deploy:** `out-site`
* **Comando:** `npm run deploy:site`
* **URL de Produção:** `https://nuaborges-er7.pages.dev` *(ou domínio oficial)*

### 2.3 Como Fazer o Deploy de Tudo em 1 Comando
No terminal:
```bash
npm run deploy:all
```
Esse comando compila o Next.js, gera os 2 pacotes otimizados e publica ambos na Cloudflare automaticamente.

---

## Passo 3: Variáveis de Ambiente no Cloudflare Pages

No painel do projeto Pages (`Workers & Pages` > `nuaborges`):
Acesse a aba **Settings** > **Environment variables** e configure:

| Variable Name | Valor de Exemplo | Descrição |
| :--- | :--- | :--- |
| `B2_APPLICATION_KEY_ID` | `005...` | Key ID do Backblaze B2 |
| `B2_APPLICATION_KEY` | `K005...` | Application Key do Backblaze B2 (Encrypt) |
| `B2_BUCKET_NAME` | `nuaborges-media` | Nome do bucket de mídia |
| `B2_ENDPOINT` | `https://s3.us-east-005.backblazeb2.com` | Endpoint S3 do Backblaze B2 |
| `B2_REGION` | `us-east-005` | Região do bucket B2 |
| `SUPABASE_URL` | `https://xxxx.supabase.co` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Chave de serviço Supabase (Encrypt) |
| `ADMIN_PASSWORD` | `SuaSenhaForte!` | Senha de login do `/admin` |
| `ADMIN_API_SECRET` | `HexSecreto32Chars` | Assinatura de tokens |
| `NEXT_PUBLIC_SITE_URL` | `https://nuaborges.com.br` | URL oficial |
| `NEXT_PUBLIC_ENABLE_BLOG` | `false` | `false` = blog travado; `true` = blog liberado |

*Nota:* O Cloudflare Pages é apenas a camada de deploy e proxy. Não é necessário nenhum binding de storage de mídia.

---

## Passo 4: Apontar o Domínio Oficial

1. No projeto Pages, acesse a aba **Custom domains**.
2. Clique em **Set up a custom domain**.
3. Digite o domínio da cliente (ex: `nuaborges.com.br` ou `admin.nuaborges.com.br`).
4. Siga as instruções em tela para os registros DNS.
