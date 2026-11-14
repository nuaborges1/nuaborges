# Relatório de Auditoria: Integração Stripe & Conformidade de Termos

## 1. Resumo Executivo
A Stripe notificou a conta por suposta infração ao Contrato de Serviços (Lista de Empresas Restritas — Produtos e Serviços de Natureza Sexual). Isso ocorre porque os payloads enviados para a API da Stripe (Payment Intents, Checkout Sessions e descrições de itens) contêm termos comerciais, títulos de produtos e metadados associados à marca artística ("Nua Borges"), ensaios fotográficos, conteúdos "sem censura", conversas "intimistas" e exibições visuais.

Este relatório detalha exatamente **onde** o sistema interage com a Stripe, **quais dados** estão ativando os filtros automatizados de moderação da Stripe e **quais alterações estratégicas de sanitização** devem ser adotadas para neutralizar as descrições de pagamento sem alterar a experiência visual ou funcional do site para os clientes.

---

## 2. Pontos Críticos Mapeados no Código (Auditados)

### A. Core Stripe Service (`functions/api/_stripe.ts`)
- **`createStripePixPaymentIntent`**:
  - Envia o parâmetro `description` diretamente para o Stripe PaymentIntent.
  - Envia `metadata` contendo `orderType`, `orderId`, etc.
- **`createStripeCheckoutSession`**:
  - Constrói `line_items` contendo `product_data.name` (nome do produto/ensaio) e `product_data.description` (descrição do pack).
  - Envia `metadata` com `orderId` e `orderType`.

### B. Rotas de Pagamento e Pedidos
1. **Pix de Avulsos / Packs (`functions/api/payments/create-pix.ts`)**:
   - Puxa o título do catálogo (`product.title`, ex: *"Acervo Exclusivo"*, *"Ensaio Completo sem censura"*).
   - Envia para a Stripe a descrição: `${targetTitle} — Nua Borges`.
   - Inclui no metadado: `itemTitle`, `itemSlug`.

2. **Agendamentos / Chamadas por Vídeo (`functions/api/appointments/book.ts`)**:
   - Modalidade de agendamento (ex: *"Conversa intimista, envolvente e exclusiva em vídeo"*).
   - Envia para a Stripe a descrição: `Chamada ${modality.durationMinutes}min Nua Borges — ${clientName}`.

3. **Encomendas Personalizadas (`functions/api/personalizados/create.ts`)**:
   - Envia para a Stripe a descrição: `Nua Borges — Personalizado #${shortId} (${photoCount} fotos)`.

4. **Stripe Checkout (Cartão / Pix hospedado) (`functions/api/stripe/create-checkout.ts`)**:
   - Valida e repassa os itens do carrinho (`name` e `description`) do catálogo de ensaios e packs diretamente para a sessão de checkout da Stripe.

---

## 3. Principais Gatilhos que Acionam a Moderação da Stripe

A inteligência de risco da Stripe analisa automaticamente:
1. **Nome da Marca / Razão Social ou Descrição contendo "Nua"**: *"Nua Borges"* remete diretamente a nudez / conteúdo adulto na visão dos robôs de compliance da Stripe.
2. **Termos Explícitos ou Sensuais nas Descrições**:
   - *"sem censura"*
   - *"ensaio fotográfico"* / *"ensaio completo"*
   - *"Conversa intimista, envolvente e exclusiva"*
   - *"Intimidade autoral"*
   - Menção a fotos e vídeos de cunho pessoal/sensual.

---

## 4. Estratégia Recomendada para Neutralização (Sem Modificar o Site Front-End)

Para evitar que a Stripe volte a bloquear ou suspender a conta, **todas as descrições e nomes de produtos enviados para a API da Stripe** devem ser estritamente genéricos, corporativos e abstratos (serviços de tecnologia, design, licenciamento de mídia digital ou consultoria).

### Diretrizes de Sanitização para os Payloads da Stripe:
1. **Descrições de Pagamento (Payment Intents / Pix / Faturas)**:
   - *Antes*: `Ensaio Exclusivo sem censura — Nua Borges`
   - *Depois*: `Licenciamento de Mídia Digital e Conteúdo Editorial — REF: [ID]`
   - *Antes*: `Chamada 30min Nua Borges — Conversa intimista`
   - *Depois*: `Serviço de Consultoria Online e Atendimento Técnico — REF: [ID]`
   - *Antes*: `Nua Borges — Personalizado #ABC123 (10 fotos)`
   - *Depois*: `Produção Gráfica e Edição de Imagens Digitais — REF: [ID]`

2. **Remoção de Metadados Sensíveis na Stripe**:
   - Não enviar títulos explícitos de ensaios nos metadados (`metadata`). Enviar apenas códigos internos cifrados (`orderId`, `sku`).

3. **Descriptor na Fatura Bancária (Statement Descriptor)**:
   - Configurar na dashboard da Stripe o descritor de fatura corporativo neutro (ex: `NB DIGITAL` ou `EDITORIAL CONSULTING`), ocultando qualquer menção à marca pessoal artística nos extratos de cartão de crédito e Pix.
