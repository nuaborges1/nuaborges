# 🏛️ Arquitetura de Mídia & Armazenamento — Nua Borges

> **Status:** Produção Homologada & Ativa  
> **Última Atualização:** Outubro de 2026  
> **Autor:** Engenharia de Software / Antigravity  

---

## 1. Visão Geral & Contexto

A Cloudflare **não é utilizada de forma alguma para armazenar mídias**. Ela é empregada **estritamente como plataforma de deploy, hospedagem edge (Cloudflare Pages) e proxy reverso/CDN**.

Todo o armazenamento de arquivos de mídia (fotos, ensaios em 4K, vídeos em alta definição e faixas de áudio) é centralizado de forma segura e autônoma no **Backblaze B2 Object Storage (S3-compatible)**.

---

## 2. Diagrama da Arquitetura

```mermaid
graph TD
    subgraph Cliente ["1. Frontends & Admin"]
        UI_Site["Site Público Oficial (nuaborges.com.br)"]
        UI_Admin["Painel Admin (/admin)"]
    end

    subgraph Edge ["2. Cloudflare Edge (Pages Functions — Proxy & Deploy)"]
        UploadEndpoint["/api/media/upload<br/>(Validação Magic Bytes & Anti-IDOR)"]
        MediaEndpoint["/media/[[path]]<br/>(Cache de Borda & HTTP 206 Streaming)"]
        EdgeCache["Cache de Borda (caches.default)"]
    end

    subgraph Storage ["3. Camadas de Armazenamento"]
        LocalAssets["Assets Estáticos do Deploy<br/>(public/images/nua/... e public/media/...)"]
        B2["Backblaze B2 Object Storage (S3)<br/>[nuaborges-media]<br/>10 GB Gratuitos (Uploads até 500 MB)"]
        SupabaseDB["Supabase PostgreSQL<br/>(site_content, pedidos, agendamentos)"]
    end

    UI_Site -->|Carrega Vitrine Estática| LocalAssets
    UI_Site -->|Assiste Vídeos / Fotos Dinâmicas| MediaEndpoint
    UI_Admin -->|Upload de Mídias / Acervo| UploadEndpoint

    UploadEndpoint -->|Grava no Storage| B2

    MediaEndpoint <-->|Hit / Miss| EdgeCache
    MediaEndpoint -->|Busca Objeto Remoto| B2
    MediaEndpoint -->|Fallback Estático (env.ASSETS)| LocalAssets

    UI_Site <-->|Sync Conteúdo JSON| SupabaseDB
    UI_Admin <-->|Sync Conteúdo JSON| SupabaseDB
```

---

## 3. As 4 Camadas de Mídia

### 🎯 Camada 1: Armazenamento Primário de Objetos (Backblaze B2 S3)
* **Provedor:** Backblaze B2 Cloud Storage (via protocolo compatível com AWS S3).
* **Bucket:** `nuaborges-media`
* **Endpoint:** `https://s3.us-east-005.backblazeb2.com`
* **Região:** `us-east-005`
* **Benefícios:**
  * **10 GB gratuitos perpétuos** sem necessidade de plano pago.
  * Suporte a arquivos de até **500 MB** (vídeos longos, áudios de podcasts e ensaios 4K).
  * Tráfego de saída sem custos adicionais via integração Cloudflare Bandwidth Alliance.

### ⚡ Camada 2: Edge CDN, Cache de Borda & Streaming (Cloudflare Pages)
* **Arquivo:** [`functions/media/[[path]].ts`](file:///c:/Users/Philippe/Desktop/nuaborges/nuasite/functions/media/[[path]].ts)
* **Função:** A Cloudflare **NÃO** guarda os arquivos pesados em disco. Ela atua como um **Proxy Reverso Inteligente**:
  * **Cache API (`caches.default`):** Mídias públicas são cacheadas nos servidores de borda mais próximos do usuário, acelerando a entrega e reduzindo requisições ao Backblaze.
  * **HTTP 206 Partial Content (Range Requests):** Suporte nativo a fatiamento de bytes, fundamental para o Safari/iOS reproduzir vídeos com busca (*scrubbing*) instantânea.
  * **Controle de Acesso Privado:** Mídias com prefixo `/private/` exigem token de compra aprovada ou token de sessão administrativa, impedindo vazamento de conteúdos exclusivos.

### 🖼️ Camada 3: Mídias Essenciais Locais (Static Assets)
* **Diretório:** [`public/images/nua/`](file:///c:/Users/Philippe/Desktop/nuaborges/nuasite/public/images/nua)
* **Fotos incluídas:**
  * Hero Retratos: `public/images/nua/hero/hero-1.jpg`, `hero-2.jpg`
  * Galeria Vitrine: `public/images/nua/gallery/gallery-1.png` até `gallery-4.png`
  * Sobre / Manifesto: `public/images/nua/about/about.jpg`
* **Finalidade:** O site abre instantaneamente mesmo em conexões lentas ou se qualquer serviço externo de nuvem estiver momentaneamente offline.

### 🗄️ Camada 4: Banco de Dados de Conteúdo (Supabase PostgreSQL)
* **Instância:** `https://<seu-projeto>.supabase.co`
* **Tabelas Principais:**
  * `site_content`: Guarda o JSON do CMS (textos, títulos, referências de URLs das fotos e vídeos).
  * `personalizados_orders`: Pedidos de ensaios personalizados e comprovação de pagamento.
  * `appointments`: Agendamentos de chamadas de vídeo.
* *Nota Técnica:* O Supabase Storage não possui buckets criados no momento (`Buckets: []`), mantendo-se como banco relacional.

---

## 4. Fluxo Completo de Operação

### 4.1 Fluxo de Upload (Painel Admin)
1. O administrador acessa a aba **Biblioteca** ou usa o **ImagePickerModal** e seleciona um arquivo (JPG, PNG, WebP, MP4, MOV, WebM).
2. O frontend executa otimização client-side (se for imagem, comprime para WebP; se for vídeo, valida integridade).
3. O cliente envia uma requisição `POST` para `/api/media/upload` com o binário no body e os headers `X-Object-Key` e `X-Mime-Type`.
4. O endpoint em [`functions/api/media/upload.ts`](file:///c:/Users/Philippe/Desktop/nuaborges/nuasite/functions/api/media/upload.ts):
   * Verifica a autenticação e rate limiting por IP.
   * Valida a chave contra path traversal e caracteres inválidos (`isValidObjectKey`).
   * Lê os primeiros 32 bytes do binário e valida os **Magic Bytes** reais contra o MIME type declarado.
5. O método `putMedia()` em [`functions/api/_mediaStore.ts`](file:///c:/Users/Philippe/Desktop/nuaborges/nuasite/functions/api/_mediaStore.ts) envia o arquivo via `PutObjectCommand` do SDK S3 diretamente para o Backblaze B2.
6. A API responde com a URL canônica relativa (ex: `/media/acervo/ensaio-01/video.mp4`), que é salva no JSON do CMS.

### 4.2 Fluxo de Consumo & Streaming (Visitante / Assinante)
1. O navegador solicita `GET /media/acervo/ensaio-01/video.mp4` com o header `Range: bytes=0-1048576`.
2. A Cloudflare Pages Function [`functions/media/[[path]].ts`](file:///c:/Users/Philippe/Desktop/nuaborges/nuasite/functions/media/[[path]].ts):
   * Verifica se o arquivo já está no cache de borda.
   * Se for um cache miss, chama `getMedia()` que busca o binário no Backblaze B2 via `GetObjectCommand`.
   * Armazena uma cópia no cache de borda.
   * Fatia o buffer no range solicitado e responde com status **206 Partial Content**, headers `Content-Range` e `Accept-Ranges: bytes`.
3. O player de vídeo inicia a reprodução imediatamente com buffer fluido.

---

## 5. Resiliência e Fallbacks

O arquivo [`functions/api/_mediaStore.ts`](file:///c:/Users/Philippe/Desktop/nuaborges/nuasite/functions/api/_mediaStore.ts) e as rotas [`functions/media/[[path]].ts`](file:///c:/Users/Philippe/Desktop/nuaborges/nuasite/functions/media/[[path]].ts) e [`functions/audio/[[path]].ts`](file:///c:/Users/Philippe/Desktop/nuaborges/nuasite/functions/audio/[[path]].ts) operam da seguinte forma:

| Prioridade | Destino | Critério de Ativação | Função |
| :--- | :--- | :--- | :--- |
| **1 (Armazenamento Remoto)** | **Backblaze B2 (S3)** | Chaves `B2_*` presentes no ambiente | Armazenamento de fotos, vídeos (até 500 MB) e músicas |
| **2 (Fallback de Deploy)** | **Assets Estáticos (`env.ASSETS`)** | Disponível no Cloudflare Pages | Serve mídias de fábrica empacotadas no deploy caso não estejam no B2 |

---

## 6. Variáveis de Ambiente Necessárias

Para o funcionamento pleno, as seguintes variáveis devem estar presentes no arquivo [`.env.local`](file:///c:/Users/Philippe/Desktop/nuaborges/nuasite/.env.local) e nas **Environment Variables** do Cloudflare Pages (`nuaborges` e `nuaborges-admin`):

```env
# Backblaze B2 — Object Storage S3 Compatível
B2_APPLICATION_KEY_ID=<SEU_B2_APPLICATION_KEY_ID>
B2_APPLICATION_KEY=<SEU_B2_APPLICATION_KEY>
B2_BUCKET_NAME=nuaborges-media
B2_ENDPOINT=https://s3.us-east-005.backblazeb2.com
B2_REGION=us-east-005

# Mapeamento Genérico S3 (Garante compatibilidade caso use SDKs genéricos)
S3_ACCESS_KEY_ID=<SEU_B2_APPLICATION_KEY_ID>
S3_SECRET_ACCESS_KEY=<SEU_B2_APPLICATION_KEY>
S3_BUCKET_NAME=nuaborges-media
S3_ENDPOINT=https://s3.us-east-005.backblazeb2.com
S3_REGION=us-east-005

# Supabase (Banco de Dados & Estado Canônico)
SUPABASE_URL=https://<seu-projeto>.supabase.co
SUPABASE_ANON_KEY=<SUA_SUPABASE_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SUA_SUPABASE_SERVICE_ROLE_KEY>
```

---

## 7. Scripts de Diagnóstico Rápido

Para testar a saúde do armazenamento a qualquer momento via terminal:

### Testar Conexão com o Backblaze B2:
```bash
node -e "
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const client = new S3Client({
  region: process.env.B2_REGION || 'us-east-005',
  endpoint: process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com',
  credentials: {
    accessKeyId: process.env.B2_APPLICATION_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY
  }
});
client.send(new ListObjectsV2Command({ Bucket: process.env.B2_BUCKET_NAME || 'nuaborges-media' }))
  .then(res => console.log('B2 Conectado! Objetos:', res.KeyCount))
  .catch(err => console.error('Erro B2:', err.message));
"
```

### Testar Conexão com o Supabase:
```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('site_content').select('count', { count: 'exact' })
  .then(res => console.log('Supabase Conectado! Linhas em site_content:', res.count))
  .catch(err => console.error('Erro Supabase:', err.message));
"
```

---

## 8. Considerações para Evolução Futura

1. **Unificação no Supabase Storage (Opcional):**
   * Se no futuro a equipe optar por centralizar banco e mídias em um único painel, basta criar o bucket `nuaborges-media` no Supabase e adicionar um adaptador em `lib/media/providers/SupabaseStorageProvider.ts`.
2. **CDN Customizada (`cdn.nuaborges.com.br`):**
   * A rota `/media/...` suporta apontamento para subdomínio próprio de CDN definindo `NEXT_PUBLIC_MEDIA_CDN_URL=https://cdn.nuaborges.com.br`.
3. **Limpeza Automática de Órfãos:**
   * A função `/api/media/delete` já remove os objetos associados no B2 quando uma foto ou vídeo é excluído do acervo no painel admin.
