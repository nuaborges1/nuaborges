# Nua Borges — Plataforma Oficial & Painel Administrativo CMS

> **"Seu espaço. Seu conteúdo. Seu universo. ♡"**  
> Plataforma digital oficial de alta performance com design editorial de luxo, portfólio autoral de ensaios fotográficos, canal de assessoria comercial e painel CMS autônomo para gerenciamento de conteúdo.

---

## 💎 Visão Geral do Projeto

A plataforma foi desenvolvida para consolidar a presença digital e a autoridade da criadora de conteúdo, educadora sexual e sexóloga em formação **Nua Borges** (`@nuaborges`).

### Principais Funcionalidades:
* **Front-end Editorial de Alto Luxo:** Design exclusivo escuro (*Noir & Blush*), tipografia serifada nobre e responsividade fluida (*Mobile First*).
* **Hero Cinematográfica:** Apresentação com carrossel dinâmico em 60/120 FPS e botão de ação direta (*CTA*) para o OnlyFans.
* **Galeria de Ensaios:** Esteira infinita contínua (*marquee*) e visualizador *lightbox* em alta definição com navegação por gestos de toque (*swipe*).
* **Biografia & Manifesto:** Composição editorial de posicionamento com assinatura manuscrita afetiva (*"Deixa de vergonha ♡"*).
* **Hub Central de Canais:** Redirecionamento seguro para OnlyFans oficial, perfil do Instagram e canal de contato comercial.
* **Painel CMS Autônomo (`/admin`):** Gestão completa e em tempo real de textos, fotos, ensaios e configurações protegida por senha mestra corporativa.
* **Segurança Nível 5:** Cabeçalhos HSTS, Content Security Policy (CSP), proteção anti-clickjacking, verificação binária de arquivos e rate-limiting.

---

## 🛠️ Tecnologias Utilizadas

* **Framework:** [Next.js 15 (App Router)](https://nextjs.org/) + [React 19](https://react.dev/)
* **Estilização:** [Tailwind CSS v4](https://tailwindcss.com/)
* **Animações:** [Motion (Framer Motion)](https://motion.dev/)
* **Ícones:** [Lucide React](https://lucide.dev/)
* **Hospedagem & Edge:** [Cloudflare Pages](https://pages.cloudflare.com/) + [Cloudflare R2 Object Storage](https://www.cloudflare.com/developer-platform/r2/)

---

## 🚀 Como Executar Localmente

### Pré-requisitos
* [Node.js](https://nodejs.org/) (versão 20 LTS ou superior)
* npm

### Passo a Passo

1. **Clonar o repositório:**
   ```bash
   git clone https://github.com/nuaborges1/nuaborges.git
   cd nuaborges
   ```

2. **Instalar as dependências:**
   ```bash
   npm install
   ```

3. **Configurar as variáveis de ambiente:**
   Copie o arquivo de modelo e preencha as variáveis locais se necessário:
   ```bash
   cp .env.example .env.local
   ```

4. **Iniciar o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse no navegador: `http://localhost:3000`  
   Painel Administrativo: `http://localhost:3000/admin`

5. **Compilar para produção:**
   ```bash
   npm run build
   ```

---

## 📄 Documentações do Projeto

* [`DOCUMENTO_NUA_BORGES.md`](DOCUMENTO_NUA_BORGES.md): Brand Book & Identidade Visual Oficial.
* [`DOCUMENTO_ESCOPO_CONTRATUAL_NUA_BORGES.md`](DOCUMENTO_ESCOPO_CONTRATUAL_NUA_BORGES.md): Memorial Descritivo e Escopo Técnico.
* [`MANUAL_DA_CLIENTE_NUA_BORGES.md`](MANUAL_DA_CLIENTE_NUA_BORGES.md): Manual de Uso Não Técnico para a Cliente.
* [`TERMO_DE_ENTREGA_E_ACEITE_FINAL.md`](TERMO_DE_ENTREGA_E_ACEITE_FINAL.md): Termo de Homologação e Garantia.
* [`GUIA_NOVA_CONTA_CLOUDFLARE.md`](GUIA_NOVA_CONTA_CLOUDFLARE.md): Manual de Infraestrutura Cloudflare.

---

*Todos os direitos reservados à Nua Borges ♡*
