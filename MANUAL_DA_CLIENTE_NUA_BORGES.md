# 📖 Manual de Uso da Plataforma Oficial — Nua Borges
## *Seu espaço. Seu conteúdo. Seu universo. ♡*

> Olá, Nua! Este manual foi preparado para que você e sua equipe tenham total autonomia sobre a sua nova plataforma digital. Tudo foi construído para ser intuitivo, rápido e acessível tanto pelo seu computador quanto direto pelo seu celular.

---

## 1. Como Acessar o seu Painel de Controle e o seu Site

A sua plataforma foi desenvolvida com arquitetura de alta performance, dividida em **2 deploys independentes e sincronizados**:

* **Painel Administrativo Oficial (Exclusivo seu):** `https://nuaborges-admin.pages.dev`
* **Site Público Oficial (Para seus visitantes e fãs):** `https://nuaborges-er7.pages.dev` *(ou seu domínio personalizado)*
* **Sua Senha de Acesso:** entregue separadamente, em documento privado *(veja como trocar no item 4)*

> 💡 **Dica no Celular (iPhone ou Android):** Você pode salvar o seu painel (`nuaborges-admin.pages.dev`) na tela de início do seu celular (como se fosse um aplicativo próprio)! Basta abrir no Safari/Chrome, clicar em **Compartilhar** e escolher **"Adicionar à Tela de Início"**.

---

## 2. Conhecendo o seu Painel de Edição

Ao fazer login no seu painel administrativo, você encontrará o menu com abas objetivas e diretas:

```
[ Início & Capa ]  [ Biblioteca de Mídia ]  [ Galeria do Site ]  [ Sobre Mim ]  [ Redes & OnlyFans ]  [ Contato ]  [ Ajustes ]
```

Abaixo está o que você faz em cada seção:

---

### 🌟 Aba 1: Início & Capa
É a primeira impressão que o visitante tem ao abrir o seu site:
* **Fotos de Destaque:** Escolha quais fotos aparecem no carrossel vertical de abertura.
* **Textos & Slogan:** Personalize o título principal, o texto de abertura e a chamada para o seu OnlyFans.
* **Botão CTA:** Escolha o texto do botão de ação (ex: *"Acessar Acervo Exclusivo"*).

---

### 🖼️ Aba 2: Biblioteca de Mídia
Seu acervo central de imagens e ensaios:
* **Subir Novas Fotos:** Faça upload direto do celular ou computador.
* **Organização em Álbuns:** Classifique suas fotos por ensaios, retratos ou fotos profissionais.
* **Favoritas:** Marque suas fotos preferidas para encontrar com rapidez.

---

### 📷 Aba 3: Galeria do Site
Onde ficam as fotos dos seus ensaios sob luz natural que passam na esteira contínua:
* **Seleção de Fotos:** Escolha quais imagens da sua biblioteca entram na galeria pública.
* **Legenda Artística:** Defina o título de cada ensaio (ex: *"Ensaio I — Luz Natural"*).
* **Organização:** Arraste ou reordene a sequência em que as fotos aparecem na galeria.

---

### ✍️ Aba 4: Sobre Mim
Sua biografia, posicionamento como sexóloga em formação e educadora sexual:
* **Foto de Retrato:** A foto autoral intimista da seção.
* **Manchete:** Frase marcante (ex: *"A coragem de despir a vergonha."*).
* **Parágrafos:** Conte sua história, seus valores e o propósito do seu trabalho.
* **Assinatura:** O seu mantra afetivo *"Deixa de vergonha ♡"*.

---

### 🔗 Aba 5: Redes & OnlyFans
Onde você centraliza a sua presença digital:
* **Card OnlyFans:** Atualize o link do seu perfil, badges e textos descritivos.
* **Card Instagram:** Atualize o seu `@` oficial e a descrição do perfil.
* **Canal Comercial:** Configure os links institucionais e canais oficiais.

---

### ✉️ Aba 6: Contato
Configuração do formulário de contato do site:
* **E-mail Oficial:** Defina para qual endereço de e-mail chegam as mensagens dos visitantes.
* **Assuntos:** Escolha os temas pré-definidos (Assessoria, Imprensa, Palestras, Parcerias).

---

### ⚙️ Aba 7: Ajustes
* **SEO & Redes Sociais:** Escolha a foto e a frase que aparecem quando alguém compartilha o link do seu site no WhatsApp ou no Instagram.
* **Publicar Alterações:** Quando terminar de editar, clique em **"Publicar no Site"**. Aparece um aviso verde quando entrou no ar. Se aparecer um aviso vermelho, nada foi perdido: seu rascunho continua salvo — basta tentar de novo (ou entrar novamente, se a sessão de 24h expirou).

---

## 3. Recomendações para Fotos e Vídeos

* **Fotos Verticais:** As fotos no formato retrato (proporção 3:4 ou 9:16) valorizam a visualização em celulares.
* **Iluminação Natural:** Fotos com tons quentes, sombras suaves e estética analógica combinam perfeitamente com a paleta preta e blush do site.
* **Vídeos Curtos:** Respostas em vídeo entre 15 a 60 segundos têm o maior engajamento entre os fãs.
* **Limites do plano gratuito:** fotos até 15 MB e vídeos até 25 MB por arquivo (as fotos são otimizadas automaticamente). O espaço total gratuito é de 1 GB — prefira vídeos curtos.

---

## 4. Como Trocar a Senha do Painel

A senha fica guardada com segurança na sua conta Cloudflare (não no navegador):

1. Entre em `dash.cloudflare.com` → **Workers & Pages** → projeto **nuaborges**.
2. **Settings → Variables and Secrets** → edite `ADMIN_PASSWORD` e salve.
3. Repita o mesmo no projeto **nuaborges-admin**.
4. Em **Deployments**, clique em **Retry deployment** no deploy mais recente de cada projeto para aplicar.

---

*Com amor e autenticidade,*  
**Equipe de Desenvolvimento — Plataforma Oficial Nua Borges ♡**
