# MEMORIAL DESCRITIVO E ESCOPO TÉCNICO-FUNCIONAL DO PROJETO
## ANEXO DE ESCOPO PARA CONTRATO DE DESENVOLVIMENTO WEB
### PROJETO: PLATAFORMA OFICIAL & PAINEL DE CONTROLE — NUA BORGES

---

## 1. IDENTIFICAÇÃO DO PROJETO E OBJETIVO

* **Nome do Projeto:** Plataforma Digital Oficial Nua Borges & Sistema de Gerenciamento de Conteúdo (CMS).
* **Propósito:** Criação de um portal web de alto padrão estético (editorial de luxo) voltado à consolidação da marca pessoal da criadora, sexóloga em formação e educadora sexual Nua Borges, atuando como o hub oficial de convergência de público, portfólio artístico, canal de assessoria comercial e direcionamento estratégico para suas plataformas de conteúdo exclusivo (OnlyFans) e rede social (Instagram).
* **Finalidade deste Documento:** Servir como **Memorial Descritivo e Anexo de Escopo Técnico** integrante do Contrato de Prestação de Serviços de Desenvolvimento de Software, delimitando todas as funcionalidades, interfaces, painel administrativo, infraestrutura e garantias inclusas no fornecimento.

---

## 2. ESTRUTURA DO SITE PÚBLICO (FRONT-END / EXPERIÊNCIA DO VISITANTE)

O portal é desenvolvido com design responsivo exclusivo (Mobile First), paleta editorial escura (*Preto Absoluto #000000 com destaques em Rosa Blush Suave #F4A7B9 e Branco Puro #FFFFFF*) e tipografia combinada (*Playfair Display serifada, Plus Jakarta Sans moderna e Pinyon Script cursiva/assinatura*).

### 2.1. Cabeçalho Fixo Global (Header de Navegação)
* **Barra de Navegação Flutuante:** Fixa no topo com efeito *glassmorphism* (fundo translúcido com desfoque e bordas ultra-finas) que se adapta suavemente à rolagem da página.
* **Identidade Visual:** Exibição do logotipo oficial "Nua Borges ♡" ou monograma com transição sutil.
* **Menu de Navegação:** Âncoras suaves para as seções: *Início*, *Galeria*, *Sobre mim*, *Canais* e *Contato*.
* **Menu Mobile Otimizado (Drawer):** Gaveta lateral com abertura fluida, trava automática de rolagem de tela (*scroll-lock*), links em tamanho adequado para toque e botão de fechamento acessível.
* **Ações de Destaque (CTAs):** Botão direto e estilizado com direcionamento seguro para a plataforma OnlyFans e ícone de acesso rápido ao Instagram.

### 2.2. Seção Capa (Hero Section — Destaque de Entrada)
* **Carrossel / Apresentação Cinematográfica:**
  * Exibição de fotografias em formato vertical editorial (`aspect-[3/4]` e tela inteira), com fusão gradiente nas bordas.
  * Transição suave (*crossfade*) em 60/120 FPS via aceleração de hardware.
  * Suporte a múltiplos slides com título, indicador numérico de sessão (ex: 01, 02) e paginação interativa.
  * Alternância dinâmica: suporte a título tipográfico ou logotipo oficial em imagem PNG com transparência.
* **Copywriting & Conversão:**
  * Chapéu editorial (*eyebrow*): "PLATAFORMA OFICIAL".
  * Título nobre de impacto e slogan da marca.
  * Texto descritivo e de acolhimento focado em liberdade, autoimagem e quebra de tabus.
  * Botão de Ação Primário (Call to Action — CTA): botão com realce visual para o acervo restrito ("Acessar Acervo Exclusivo"), com link direto para o OnlyFans.
* **Navegação por Gestos:** Suporte nativo a *swipe* no celular (arrastar para trocar de slide) e setas laterais discretas no computador.

### 2.3. Galeria de Ensaios Editoriais (Acervo Autoral)
* **Esteira Contínua Infinita (Infinite Marquee/Carousel):**
  * Rolagem horizontal automática contínua e suave das fotografias dos ensaios sob luz natural.
  * Pausa suave da esteira ao passar o mouse ou interagir via toque para facilitar a visualização.
  * Cards com bordas arredondadas, iluminação sutil de fundo e legendas curatoriais para cada ensaio.
* **Visualizador em Tela Cheia (Lightbox Interativo):**
  * Ao clicar em qualquer imagem da galeria, a fotografia se expande em alta definição ocupando toda a tela.
  * Navegação entre fotos por setas no teclado, botões em tela ou gestos de deslizar (*swipe* em smartphones).
  * Exibição do título e da descrição artística de cada ensaio.
  * Fechamento por tecla `ESC`, botão dedicado ou toque fora da imagem.

### 2.4. Seção Manifesto & Biografia (Sobre Mim)
* **Composição Editorial:**
  * Retrato fotográfico autoral de destaque com moldura suave e vinheta gradiente.
  * Chapéu: "MANIFESTO & BIOGRAFIA".
  * Manchete central ("A coragem de despir a vergonha.").
  * Titulação oficial: "Educadora Sexual & Sexóloga em Formação".
  * *Pull Quote* (frase de efeito em destaque visual).
  * Parágrafos biográficos e reflexivos sobre a trajetória, valores e desmistificação do prazer.
  * Assinatura artística cursiva ("Deixa de vergonha ♡").

### 2.5. Seção Canais Oficiais & Redes (Presença & Conexão)
* **Hub Centralizador de Links Oficiais:**
  * **Card Oficial OnlyFans:** Badge "ACERVO EXCLUSIVO", descrição da proposta de ensaios completos e produções sem censura, etiquetas temáticas (*tags*) e botão de acesso direto.
  * **Card Oficial Instagram:** Identificação do perfil oficial (`@nuaborges`), descrição da linha editorial de conteúdos e sexologia, etiquetas de tópicos e botão direto para o perfil.
  * **Banner Comercial & Assessoria:** Área dedicada para imprensa, eventos, palestras e propostas comerciais, com botão de acionamento do Modal de Contato.

### 2.6. Modal de Atendimento & Contato Comercial
* **Janela Modal Integrada:**
  * Formulário de contato sem necessidade de sair da página.
  * Campos: Nome completo, e-mail do remetente, seleção de assunto (Parcerias, Imprensa, Palestras, Outros) e mensagem detalhada.
  * Disparo inteligente: formatação e abertura automática da mensagem no aplicativo de e-mail padrão do usuário através do protocolo seguro `mailto:` com assunto e corpo pré-preenchidos.
  * Botão de cópia rápida em um clique do endereço de e-mail oficial com confirmação visual (*feedback toast*).
  * Validação formal de endereço de e-mail (RFC-5322) para evitar envios incorretos ou falhas de digitação.

### 2.7. Rodapé Institucional (Footer)
* **Créditos da Marca:** Nome oficial com ícone da marca, titulação profissional e conceito central ("Corpo, relações e liberdade").
* **Navegação Secundária:** Links diretos de retorno rápido para as seções do site.
* **Copyright & Mantra:** Registro de direitos autorais protegido e assinatura afetiva "Deixa de vergonha ♡".

### 2.8. Player Musical Editorial Integrado (Sensual Lounge Engine)
* **Motor Híbrido de Áudio:**
  * Suporta músicas locais em alta qualidade (arquivos `.mp3` / `.wav`) e faixas do YouTube (via IFrame API oficial sem interrupção).
* **Equalizador em Tempo Real & Batida do Coração (Heartbeat Sync):**
  * Integração com a *Web Audio API* e analisador de frequências de graves (*kicks*).
  * O ícone de coração pulsa organicamente no ritmo exato dos graves da música que estiver tocando.
* **Interface Dinâmica:**
  * Barra flutuante elegante com controle de play/pause, avançar, retroceder e abertura da lista de faixas (*playlist*).
  * Modo Miniaturizado / Cápsula (Pill Mode): reduz o player a uma pílula compacta para não atrapalhar a navegação.
  * Controle manual de volume com barra deslizante sensível ao toque e opção de mudo instantâneo.
  * Transições musicais suaves com efeito de *Fade-in* (aumento gradual de volume ao iniciar ou trocar de faixa) e *Fade-out* (diminuição suave de volume ao finalizar).
  * Persistência de preferências: o site memoriza o volume escolhido pelo usuário e a faixa onde parou.
  * Ocultação inteligente: o player musical é desativado automaticamente ao acessar o painel administrativo para não atrapalhar as atividades de edição.

---

## 3. PAINEL DE CONTROLE ADMINISTRATIVO (CMS AUTÔNOMO — `/admin`)

O sistema conta com uma área administrativa privativa construída sob medida, permitindo que a própria Nua Borges e sua equipe alterem 100% dos textos, imagens, links e músicas sem depender de programadores ou custos recorrentes de manutenção.

### 3.1. Sistema de Autenticação e Segurança da Sessão
* **Acesso Restrito:** Acesso mediante senha mestra corporativa.
* **Proteção contra Ataques de Força Bruta:** Limitador de tentativas de login por IP (bloqueio automático de 15 minutos em caso de tentativas sucessivas incorretas).
* **Cookies de Sessão Seguros:** Cookie criptografado `__Host-Admin-Session` com assinatura HMAC-SHA256, atributos `HttpOnly`, `Secure`, `SameSite=Strict`, impedindo roubo de credenciais ou ataques de injeção XSS.
* **Duração da Sessão:** Expiração automática após 24 horas de inatividade ou encerramento manual via botão "Sair".

### 3.2. Barra Superior de Gestão (Header Admin)
* **Indicador de Alterações em Tempo Real:** Aviso visual caso existam edições em modo rascunho ainda não publicadas.
* **Botão "Pré-visualizar":** Abre uma janela modal com simulação idêntica ao site real, permitindo conferir como os novos textos e fotos ficaram antes de torná-los públicos.
* **Botão "Publicar no Site":** Transforma instantaneamente os rascunhos em versão oficial ativa para todos os visitantes da internet.
* **Notificação de Sucesso:** Alerta dinâmico de confirmação de publicação.

### 3.3. Aba 1 — Início & Capa (Hero Editor)
* **Edição de Textos:** Alteração do chapéu editorial, título da página, slogan e texto de apresentação.
* **Botão de Ação (CTA):** Modificação do texto do botão (ex: "Acessar Acervo Exclusivo") e da URL de destino (link do OnlyFans ou campanha especial).
* **Logotipo vs. Tipografia:** Opção de ligar/desligar logotipo em imagem PNG ou manter o título digitado, com seletor direto da logo.
* **Gestor de Slides da Capa:**
  * Adicionar novas fotos à capa a partir da biblioteca de mídia.
  * Reordenar a sequência de exibição dos slides (mover para a esquerda / direita).
  * Exclusão de slides com proteção (o sistema exige a confirmação e não permite deixar a capa sem fotos).

### 3.4. Aba 2 — Biblioteca de Mídia Centralizada (Media Library)
* **Armazenamento de Imagens e Vídeos:**
  * Suporte a múltiplos arquivos em formatos modernos: JPG, PNG, WebP, AVIF, MP4 e WebM.
  * Envio fácil por botão de seleção ou arrastar e soltar (*drag-and-drop*).
* **Otimização Automática no Upload:**
  * Redimensionamento inteligente no próprio navegador antes do envio para economizar banda e garantir máxima rapidez de carregamento.
  * Geração automática de variantes de resolução (miniatura, versão móvel e versão completa em alta definição).
* **Detecção de Duplicatas:** Previne o envio repetido de arquivos idênticos, poupando espaço de armazenamento.
* **Filtros e Organização:**
  * Visualização em Grade (*Grid*) ou Lista detalhada.
  * Filtros por: Todas as mídias, Apenas Fotos, Apenas Vídeos, Mídias Favoritas e Por Álbuns.
  * Busca instantânea por nome de arquivo ou ensaio.
  * Ordenação por: Mais recentes, Mais antigas ou Ordem alfabética.
* **Modal de Detalhes da Mídia (Media Inspector):**
  * Visualização ampliada da foto ou reprodução do vídeo.
  * Informações técnicas: tamanho em KB/MB, dimensões em pixels (largura x altura), data de envio e formato.
  * Identificação de uso: o sistema informa em quais seções do site a foto está atualmente ativa (ex: "Em uso na Capa", "Em uso na Galeria").
  * Botão de "Aplicar em": permite colocar a foto selecionada diretamente na Capa, na Galeria ou na seção Sobre Mim em apenas 1 clique.
  * Copiar link direto da imagem na CDN.
  * Exclusão segura com confirmação prévia para evitar remoções acidentais.
* **Gestão de Álbuns de Mídia:**
  * Criação, renomeação e exclusão de pastas temáticas (ex: *Retratos*, *Ensaios*, *Bastidores*).
  * Seleção de foto de capa para o álbum.
  * Associação e desassociação em massa de fotos aos álbuns.

### 3.5. Aba 3 — Galeria do Site (Gallery Editor)
* **Gerenciamento do Acervo de Ensaios:**
  * Alteração do chapéu ("GALERIA DE ENSAIOS"), título e texto descritivo da seção.
  * Adição de novas fotos à esteira rotativa através da Biblioteca de Mídia.
  * Edição individual de cada ensaio: Título (ex: "Luz & Silhueta") e Legenda curatorial.
  * Ativação e Pausa: opção de ocultar temporariamente uma foto do site sem precisar apagá-la.
  * Reordenação da esteira através de setas de posicionamento.

### 3.6. Aba 4 — Sobre Mim (About Editor)
* **Gestão Integral do Manifesto Pessoal:**
  * Edição do chapéu editorial, manchete principal e titulação profissional.
  * Alteração da frase de efeito em destaque (*pull quote*).
  * Edição dos parágrafos biográficos e da assinatura artística.
  * Seletor da foto de perfil: troca da fotografia principal da biografia com visualização prévia imediata.

### 3.7. Aba 5 — Redes & OnlyFans (Channels Editor)
* **Gestão do Card OnlyFans:**
  * Título do card e badge promocional.
  * Texto explicativo do conteúdo exclusivo.
  * Gerenciador de etiquetas (*tags*): adicionar e remover tags dinamicamente (ex: "Ensaios Completos", "Produção Autoral").
  * Texto do botão de ação e URL oficial do perfil.
* **Gestão do Card Instagram:**
  * Título, @handle da criadora, texto sobre a linha de sexologia e rotina.
  * Gerenciador de etiquetas (*tags*) com inclusão e exclusão simples.
  * Texto do botão de ação e URL de redirecionamento.
* **Gestão do Banner Comercial:**
  * Título da chamada comercial, texto de instrução para marcas e parceiros e texto do botão.

### 3.8. Aba 6 — Contato (Contact Editor)
* **Configurações do Canal de Atendimento:**
  * Definição do e-mail oficial que receberá as mensagens (com validação anti-erro).
  * Título e subtítulo exibidos no modal de contato.
  * Lista customizável de assuntos comerciais para o visitante escolher (ex: *Parceria Comercial*, *Imprensa & Entrevistas*, *Palestras & Eventos*), permitindo adicionar novos temas a qualquer momento.

### 3.9. Aba 7 — Música do Site (Music Editor)
* **Gerenciador da Experiência Sonora:**
  * Ativar ou Desativar completamente a música no site com uma chave seletora (*toggle switch*).
  * Edição do nome da playlist (ex: "Sensual Lounge").
  * Adição simples de faixas: basta colar o link de qualquer vídeo ou música do YouTube, ou fazer upload de áudio próprio.
  * Reconhecimento inteligente do link do YouTube (converte automaticamente links de celular, links encurtados `youtu.be` ou links completos).
  * Reordenação de faixas na playlist (arrastar ou usar setas de subir/descer).
  * Escuta prévia (*preview*) da música dentro do próprio painel antes de publicar.
  * Botão de restauração da playlist padrão da marca com 1 clique.
  * Guia integrado de uso para a cliente com instruções passo a passo sem termos técnicos.

### 3.10. Aba 8 — Ajustes & SEO (Seo Editor)
* **Otimização para Buscadores (Google SEO):**
  * Título da página exibido na aba do navegador e nos resultados de busca do Google.
  * Meta descrição resumida para indexação e atração de cliques.
* **Pré-visualização nas Redes Sociais (WhatsApp, Instagram e X):**
  * Escolha da foto oficial de compartilhamento (*Open Graph Image*): imagem que aparece automaticamente quando alguém compartilha o link do site em conversas de WhatsApp ou redes sociais.
* **Segurança Administrativa:**
  * Formulário direto para alteração da senha de acesso ao painel administrativo.
* **Restauração de Emergência:**
  * Botão de segurança para restaurar todas as configurações e textos originais do site caso haja algum erro operacional da usuária.

---

## 4. INFRAESTRUTURA TÉCNICA, HOSPEDAGEM E DESEMPENHO

| Componente | Especificação Adotada | Benefício para o Cliente |
| :--- | :--- | :--- |
| **Framework Base** | Next.js 15 (App Router) + React 19 | Código de última geração, altíssima velocidade e padrão global da indústria. |
| **Arquitetura** | Jamstack Serverless + Edge Functions | Elimina a necessidade e o custo mensal de servidores dedicados (VPS/Apache). |
| **Hospedagem & CDN** | Cloudflare Pages Global Edge Network | Distribuição instantânea em mais de 300 data centers no mundo, com tempo de carregamento inferior a 1 segundo e 99.9% de uptime garantido. |
| **Armazenamento de Mídia** | Cloudflare R2 Object Storage (compatível com S3) | Armazenamento de fotos e vídeos na nuvem com **Zero Custo de Tráfego de Saída (Zero Egress Fees)**, sem surpresas na fatura mesmo com milhões de acessos. |
| **CDN de Mídia Dedicada** | Subdomínio dedicado (`cdn.nuaborges.phstatic.com.br`) | Cache global de fotos para entrega imediata sem consumir banda do visitante. |
| **Tipografia & Fontes** | Carregamento assíncrono Google Fonts via Next/Font | Zero impacto de bloqueio visual (*zero layout shift / FOUT*). |
| **Animações e Interface** | Motion (Framer Motion v12) + Tailwind CSS v4 | Fluidez visual de 60 a 120 quadros por segundo em monitores convencionais e telas ProMotion/OLED. |

---

## 5. ARQUITETURA DE SEGURANÇA EM PROFUNDIDADE (SECURITY LEVEL 5)

O projeto incorpora medidas de segurança equivalentes aos padrões corporativos bancários e de proteção de dados:

1. **Criptografia Ponta a Ponta:** Certificado SSL/TLS Universal ativo, forçando conexões seguras HTTPS com suporte a protocolos modernos HTTP/2 e HTTP/3 (QUIC) e HSTS Preload ativo por 1 ano.
2. **Cabeçalhos de Segurança Estritos (Security Headers):**
   * *Content-Security-Policy (CSP)* com restrição rígida de origens autorizadas.
   * *Anti-Clickjacking:* `X-Frame-Options: DENY` e `frame-ancestors 'none'`, impedindo que o site seja clonado ou exibido dentro de janelas ocultas maliciosas.
   * *Anti-MIME Sniffing:* `X-Content-Type-Options: nosniff`.
   * *Referrer-Policy:* `strict-origin-when-cross-origin`.
3. **Gateway de API com Filosofia Fail-Closed:**
   * Todas as rotas internas da API administrativa (`/api/*`) são bloqueadas por padrão no Edge Middleware e só liberam execução após verificação válida da sessão criptografada.
4. **Proteção de Uploads (Inspeção Binária Magic Bytes):**
   * O sistema analisa os primeiros bytes do arquivo real (*Magic Numbers*) para garantir que fotos e vídeos enviados sejam autênticos (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF/WEBP`, MP4 `ftyp`), barrando códigos maliciosos ou scripts disfarçados de imagem.
5. **Defesa Anti-IDOR e Traversal:** As chaves de arquivos são isoladas estritamente na pasta `media/`, impedindo manipulação de arquivos do sistema.
6. **Sanitização de Dados:** Filtro automático em todos os links e e-mails contra injeção de scripts (XSS).

---

## 6. OTIMIZAÇÃO PARA MECANISMOS DE BUSCA (SEO) & ACESSIBILIDADE

* **Meta Tags Dinâmicas:** Títulos e descrições específicos em todas as telas gerados dinamicamente para indexação orgânica no Google e Bing.
* **Rich Snippets & Dados Estruturados (Schema.org):** Implementação de JSON-LD nativo para identificação da criadora perante os motores de busca (`ProfilePage`, `Person` e `WebSite`), facilitando a obtenção de painel de conhecimento e destaque do perfil.
* **Open Graph & Twitter Cards:** Configuração completa para exibição impecável de título, resumo e imagem em pré-visualizações do WhatsApp, Telegram, iMessage, Instagram Direct, Facebook e X.
* **Acessibilidade Web (a11y):** Marcação semântica HTML5 (`<header>`, `<main>`, `<section>`, `<nav>`, `<footer>`), suporte a navegação por teclado, rótulos ARIA para leitores de tela e contrastes de cores balanceados.

---

## 7. DELIMITAÇÃO DE ESCOPO: O QUE ESTÁ INCLUSO VS. O QUE NÃO ESTÁ INCLUSO

Para assegurar clareza jurídica e técnica entre as partes contratantes, estabelece-se a seguinte divisão de responsabilidades:

### ✅ 7.1. Itens Estritamente Inclusos no Projeto:
1. Desenvolvimento completo do portal web responsivo de acordo com todas as seções descritas na Cláusula 2.
2. Desenvolvimento e disponibilização do Painel Administrativo CMS proprietário com todas as abas e ferramentas descritas na Cláusula 3.
3. Implantação e configuração do ambiente na rede de borda da Cloudflare Pages e Cloudflare R2 Storage.
4. Configuração das regras de segurança de nível 5 e políticas de cabeçalhos.
5. Criação do player de áudio sincronizado com suporte a YouTube e áudio nativo.
6. Configuração dos registros de DNS e apontamento de subdomínios (sob fornecimento de acessos pela Contratante).
7. Manual de instruções integrado e garantia legal contra bugs de funcionamento.

### ❌ 7.2. Itens Não Inclusos no Escopo (Exclusões Explícitas):
1. **Processamento Financeiro e Gateway de Pagamentos:** O site atua como hub oficial e direciona o usuário diretamente para a conta verificada da criadora no OnlyFans. Não há cobrança com cartão de crédito, PIX ou checkout transacional interno dentro do site, sendo qualquer intermediação financeira de assinaturas de exclusiva responsabilidade da plataforma OnlyFans.
2. **Streaming Pornográfico Pesado / Armazenamento Ilimitado de Filmes:** A plataforma é desenhada para a estética editorial de ensaios, fotos artísticas e vídeos curtos de apresentação. Vídeos longos e transmissões ao vivo permanecem sob a infraestrutura do OnlyFans.
3. **Custos Periódicos de Terceiros:** Quaisquer despesas referentes ao registro anual do domínio próprio (ex: Registro.br, GoDaddy) ou serviços pagos que a Contratante venha a contratar por conta própria são de sua exclusiva responsabilidade.
4. **Criação de Conteúdo Artístico:** A produção fotográfica, captação de vídeos, edição de ensaios e redação de novos textos biográficos são de inteira responsabilidade da Contratante (a Contratada entrega o sistema pré-alimentado com o acervo e textos oficiais fornecidos durante o projeto).
5. **Desenvolvimento de Aplicativos Nativos para Lojas (App Store / Google Play):** O projeto consiste em uma Aplicação Web Responsiva de alta performance acessível via navegadores, não compreendendo publicação em lojas de aplicativos como app nativo.

---

## 8. TERMO DE HOMOLOGAÇÃO E ACEITE TÉCNICO

A entrega final do projeto é considerada concluída e aprovada após a disponibilização do portal no domínio oficial ou subdomínio de homologação, com a comprovação do funcionamento do site público e do painel de administração em conformidade com as especificações deste documento.
