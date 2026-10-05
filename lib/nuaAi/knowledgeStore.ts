/**
 * NUA IA — Gerenciador de Conhecimento Consolidado (Camada 3 - KNOWLEDGE)
 * 
 * Fonte única de verdade sobre o site público da Nua Borges e o Admin da cliente.
 * 
 * Regras Estritas:
 * 1. O Admin Geral (admingeral) NÃO faz parte deste Knowledge.
 * 2. Conhecimento detalhado e granular: página → seção → componente → conteúdo → comportamento → Admin.
 * 3. Mapeamento explícito: Admin → aba → campo → efeito no site público.
 * 4. Textos reais e atualizados com versionamento.
 * 5. Conhecimento não significa controle: a IA explica e contextualiza, mas não executa alterações técnicas.
 * 6. Formatação rica em Markdown com elegância e emojis com bom gosto.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface KnowledgeItem {
  id: string;
  category: 'branding' | 'communication' | 'portal' | 'design' | 'editorial' | 'site_page' | 'site_section' | 'admin_tab' | 'admin_mapping';
  title: string;
  content: string;
  confidence: number;
  status: 'active' | 'archived';
  origin: string;
  updatedAt: string;
  version: number;
}

export interface KnowledgeBase {
  version: string;
  lastUpdated: string;
  items: KnowledgeItem[];
}

export interface SiteAdminKnowledgeBase {
  version: string;
  lastUpdated: string;
  scope: string;
  excludedScope: string[];
  description: string;
  brand: {
    name: string;
    monogram: string;
    profession: string;
    concept: string;
    signOff: string;
    palette: Record<string, string>;
    rules: string[];
  };
  publicSite: {
    url: string;
    pages: Array<{
      id: string;
      name: string;
      route: string;
      purpose: string;
      orderOfSections?: string[];
      sections?: Record<string, any>;
      categories?: string[];
      interactiveFeatures?: string[];
      keyPoints?: string[];
      adminEditable?: string;
    }>;
  };
  clientAdmin: {
    url: string;
    name: string;
    purpose: string;
    accessControl: string;
    headerControls: Record<string, any>;
    tabs: Array<{
      id: string;
      label: string;
      purpose: string;
      fields?: any[];
      buttons?: string[];
      features?: string[];
      effectOnSite: string;
    }>;
    assistantDrawer: Record<string, any>;
  };
  adminToSiteMapping: Array<{
    adminTab: string;
    field: string;
    effect: string;
    siteLocation: string;
    editableByClient: boolean;
    requiresPublish: boolean;
  }>;
  faqCatalog: Array<{
    question: string;
    answer: string;
  }>;
}

let cachedKnowledge: KnowledgeBase | null = null;
let lastKnowledgeMtime = 0;

let cachedSiteKnowledge: SiteAdminKnowledgeBase | null = null;
let lastSiteKnowledgeMtime = 0;

function resolveKnowledgePath(): string {
  return path.resolve(process.cwd(), 'nua-ai', 'knowledge', 'nua-knowledge.json');
}

function resolveSiteKnowledgePath(): string {
  return path.resolve(process.cwd(), 'nua-ai', 'knowledge', 'site-admin-knowledge.json');
}

/**
 * Carrega a base geral de branding com cache em RAM.
 */
export function getLoadedKnowledge(): KnowledgeBase {
  const filePath = resolveKnowledgePath();

  try {
    if (!fs.existsSync(filePath)) {
      return { version: '1.0', lastUpdated: new Date().toISOString(), items: [] };
    }
    const stats = fs.statSync(filePath);
    if (cachedKnowledge && stats.mtimeMs <= lastKnowledgeMtime) {
      return cachedKnowledge;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    cachedKnowledge = JSON.parse(raw);
    lastKnowledgeMtime = stats.mtimeMs;
    return cachedKnowledge!;
  } catch (err) {
    console.warn('[KnowledgeStore] Erro ao ler base nua-knowledge.json:', err);
    return cachedKnowledge || { version: '1.0', lastUpdated: new Date().toISOString(), items: [] };
  }
}

/**
 * Carrega a base dedicada e granular do site público e admin da cliente.
 */
export function getLoadedSiteKnowledge(): SiteAdminKnowledgeBase | null {
  const filePath = resolveSiteKnowledgePath();

  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const stats = fs.statSync(filePath);
    if (cachedSiteKnowledge && stats.mtimeMs <= lastSiteKnowledgeMtime) {
      return cachedSiteKnowledge;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    cachedSiteKnowledge = JSON.parse(raw);
    lastSiteKnowledgeMtime = stats.mtimeMs;
    return cachedSiteKnowledge;
  } catch (err) {
    console.warn('[KnowledgeStore] Erro ao ler base site-admin-knowledge.json:', err);
    return cachedSiteKnowledge;
  }
}

/**
 * Busca itens de conhecimento pertinentes tanto na base geral quanto no site/admin.
 */
export function searchKnowledge(query: string): KnowledgeItem[] {
  const kb = getLoadedKnowledge();
  const siteKb = getLoadedSiteKnowledge();
  const lower = query.toLowerCase();
  const matched: KnowledgeItem[] = [];

  // 1. Itens da base geral
  for (const item of kb.items) {
    if (item.status !== 'active') continue;
    if (
      lower.includes(item.category) ||
      lower.includes(item.title.toLowerCase()) ||
      item.content.toLowerCase().split(' ').some((w) => w.length > 4 && lower.includes(w))
    ) {
      matched.push(item);
    }
  }

  // 2. Itens granulares extraídos do site-admin-knowledge.json
  if (siteKb) {
    // Caso especial: Consulta específica sobre "explore o mundo" ou texto de convite/rodapé da capa
    if (lower.includes('explore') || lower.includes('mundo da nua') || (lower.includes('rodap') && lower.includes('capa')) || lower.includes('exploretext')) {
      matched.push({
        id: 'admin_map_hero_explore_text',
        category: 'admin_mapping',
        title: 'Mapeamento Admin: Texto de Convite do Rodapé da Capa (exploreText)',
        content: 'O texto "EXPLORE O MUNDO DA NUA ♥️" fica no rodapé da Capa (Hero) antes da galeria. Ele é 100% editável no Admin: acesse a aba "Início & Capa" no campo "Texto de Convite do Rodapé da Capa (Scroll)". Ao alterar, clique em "Publicar Alterações" no topo do painel.',
        confidence: 1.0,
        status: 'active',
        origin: 'site_admin_knowledge',
        updatedAt: siteKb.lastUpdated,
        version: 1,
      });
    }

    // Abas do Admin
    for (const tab of siteKb.clientAdmin.tabs) {
      const hasFieldMatch = tab.fields?.some((f: any) => {
        const name = typeof f === 'string' ? f : (f?.name || '');
        const label = typeof f === 'string' ? '' : (f?.label || '');
        const desc = typeof f === 'string' ? '' : (f?.description || '');
        const ph = typeof f === 'string' ? '' : (f?.placeholder || '');
        const target = `${name} ${label} ${desc} ${ph}`.toLowerCase();
        return lower.split(/\s+/).some((w) => w.length >= 4 && target.includes(w));
      });

      if (
        lower.includes(tab.id) ||
        lower.includes(tab.label.toLowerCase()) ||
        hasFieldMatch ||
        (lower.includes('aba') && tab.purpose.toLowerCase().split(' ').some((w) => w.length > 4 && lower.includes(w)))
      ) {
        matched.push({
          id: `tab_${tab.id}`,
          category: 'admin_tab',
          title: `Aba do Admin: ${tab.label}`,
          content: `Finalidade: ${tab.purpose}. Efeito no site: ${tab.effectOnSite}`,
          confidence: 1.0,
          status: 'active',
          origin: 'site_admin_knowledge',
          updatedAt: siteKb.lastUpdated,
          version: 1,
        });
      }
    }

    // Mapeamentos Admin -> Site
    for (const map of siteKb.adminToSiteMapping) {
      const isMapMatch =
        lower.includes(map.adminTab) ||
        lower.includes(map.siteLocation.toLowerCase()) ||
        lower.includes('onde') ||
        lower.includes('efeito') ||
        lower.includes('trocar') ||
        lower.includes('mudar') ||
        lower.includes('alterar') ||
        map.field.toLowerCase().split(/[\s/()]+/).some((w: string) => w.length >= 4 && lower.includes(w)) ||
        map.effect.toLowerCase().split(/\s+/).some((w: string) => w.length >= 5 && lower.includes(w));

      if (isMapMatch) {
        matched.push({
          id: `map_${map.adminTab}_${map.field.slice(0, 10)}`,
          category: 'admin_mapping',
          title: `Mapeamento Admin → Site (${map.adminTab})`,
          content: `No Admin (${map.adminTab} → ${map.field}): ${map.effect} Localização no site: ${map.siteLocation}.`,
          confidence: 0.95,
          status: 'active',
          origin: 'site_admin_knowledge',
          updatedAt: siteKb.lastUpdated,
          version: 1,
        });
      }
    }

    // FAQs catalogados
    if (siteKb.faqCatalog) {
      for (const faq of siteKb.faqCatalog) {
        const qLower = faq.question.toLowerCase();
        if (
          lower.split(/\s+/).filter((w) => w.length >= 4).some((w) => qLower.includes(w)) ||
          (lower.includes('explore') && qLower.includes('explore'))
        ) {
          matched.push({
            id: `faq_${faq.question.slice(0, 15).replace(/\s+/g, '_')}`,
            category: 'portal',
            title: `FAQ Admin: ${faq.question}`,
            content: faq.answer,
            confidence: 0.98,
            status: 'active',
            origin: 'site_admin_knowledge',
            updatedAt: siteKb.lastUpdated,
            version: 1,
          });
        }
      }
    }

    // Páginas do Site
    for (const page of siteKb.publicSite.pages) {
      if (
        lower.includes(page.route) ||
        lower.includes(page.name.toLowerCase()) ||
        (page.id === 'page_blog' && lower.includes('blog')) ||
        (page.id === 'page_termos' && (lower.includes('termos') || lower.includes('uso'))) ||
        (page.id === 'page_privacidade' && (lower.includes('privacidade') || lower.includes('lgpd'))) ||
        (page.id === 'page_contrato' && lower.includes('contrato'))
      ) {
        matched.push({
          id: `page_${page.id}`,
          category: 'site_page',
          title: `Página do Site: ${page.name} (${page.route})`,
          content: `${page.purpose}`,
          confidence: 0.95,
          status: 'active',
          origin: 'site_admin_knowledge',
          updatedAt: siteKb.lastUpdated,
          version: 1,
        });
      }
    }
  }

  return matched.slice(0, 5);
}

/**
 * Responde localmente e instantaneamente (<1ms) a dúvidas operacionais e explicativas
 * sobre o site público e o Admin da Nua Borges com alta formatação e emojis sóbrios.
 */
export function tryLocalKnowledgeResponse(query: string): string | null {
  const lower = query.toLowerCase();

  // Mensagens conversacionais, pedidos de criação, projetos ou textos longos NUNCA recebem texto canônico estático
  if (
    lower.includes('quero') ||
    lower.includes('gostaria') ||
    lower.includes('projeto') ||
    lower.includes('nova página') ||
    lower.includes('nova pagina') ||
    lower.includes('novo espaço') ||
    lower.includes('planejando') ||
    lower.includes('pensando') ||
    lower.includes('me ajuda') ||
    lower.includes('o que acha') ||
    lower.includes('o que você acha') ||
    query.length > 120
  ) {
    return null;
  }

  // 1. Perguntas sobre a aba Galeria do Admin ou Seção Galeria do Site
  if (
    lower.includes('galeria') &&
    (lower.includes('onde') || lower.includes('como') || lower.includes('para que') || lower.includes('o que faz') || lower.includes('funciona') || lower.includes('aparece'))
  ) {
    return [
      '✨ **Galeria do Site & Acervo Autoral**\n',
      'Na aba **Galeria do Site** do seu painel administrativo, você tem controle total sobre os ensaios fotográficos que aparecem na esteira contínua da página inicial:\n',
      '- **O que você pode fazer:** Adicionar novas fotos do acervo, reordenar a sequência de exibição (usando as setas), ativar ou desativar ensaios e escrever legendas poéticas para cada um.',
      '- **Como funciona no site:** As fotos ativas deslizam em uma esteira horizontal infinita com iluminação suave. Ao clicar em qualquer imagem, ela abre em **tela cheia (Lightbox)** em alta resolução, com a legenda autoral e link direto para o OnlyFans.',
      '- **Onde alterar:** Acesse a aba **Galeria do Site** no menu superior do seu painel e, ao terminar, clique em **Publicar no Site** no topo da tela.'
    ].join('\n');
  }

  // 2. Perguntas sobre a aba Início & Capa (Hero)
  if (
    (lower.includes('hero') || lower.includes('capa') || lower.includes('início') || lower.includes('inicio')) &&
    (lower.includes('onde') || lower.includes('como') || lower.includes('para que') || lower.includes('o que faz') || lower.includes('funciona') || lower.includes('texto') || lower.includes('botão') || lower.includes('botao'))
  ) {
    return [
      '🌸 **Capa do Site (Hero)**\n',
      'A aba **Início & Capa** gerencia a primeira impressão do seu site — o cartão de visitas que todos os visitantes encontram ao entrar:\n',
      '- **Textos atuais da Capa:**',
      '  - **Chapéu (Eyebrow):** `PLATAFORMA OFICIAL`',
      '  - **Título Principal:** `Nua Borges`',
      '  - **Frase de Impacto (Tagline):** `Onde o corpo é arte e o prazer é livre de culpas.`',
      '  - **Texto de Introdução:** `Um olhar íntimo, sofisticado e sem rodeios sobre o desejo, a autoimagem e a liberdade feminina.`',
      '  - **Texto de Convite do Rodapé da Capa (Scroll):** `EXPLORE O MUNDO DA NUA ♥️` (ou a frase personalizada definida por você) — convida a rolar até a galeria autoral.',
      '  - **Botão Principal:** `Acessar Acervo Exclusivo` (direciona para o OnlyFans)',
      '- **Carrossel Fotográfico:** Você pode adicionar até 4 fotos autorais que se alternam suavemente a cada 4.2 segundos com transição cinematográfica.',
      '- **Onde editar:** Tudo isso é configurado diretamente na aba **Início & Capa** no painel!'
    ].join('\n');
  }

  // 2.1 Pergunta específica sobre o texto 'explore o mundo da nua' ou convite do rodapé
  if (
    (lower.includes('explore o mundo') || lower.includes('exploretext') || (lower.includes('explore') && lower.includes('nua'))) &&
    (lower.includes('onde') || lower.includes('como') || lower.includes('mudo') || lower.includes('altero') || lower.includes('troco') || lower.includes('edito'))
  ) {
    return [
      '✨ **Texto de Convite do Rodapé da Capa (Scroll)**\n',
      'Essa frase fica no rodapé da Capa (Hero) convidando o visitante a descer até a galeria de ensaios autorais e é **100% editável no seu painel administrativo**:\n',
      '- **Onde alterar:** Acesse a aba **Início & Capa** no seu painel.',
      '- **Campo exato:** Localize o campo **Texto de Convite do Rodapé da Capa (Scroll)**.',
      '- **Como salvar:** Digite a nova frase que desejar e clique no botão **Publicar Alterações** no canto superior direito do painel para que a mudança entre no ar imediatamente!'
    ].join('\n');
  }

  // 3. Perguntas sobre Sobre Mim / Manifesto / Biografia
  if (
    (lower.includes('sobre') || lower.includes('biografia') || lower.includes('manifesto') || lower.includes('retrato')) &&
    (lower.includes('onde') || lower.includes('como') || lower.includes('para que') || lower.includes('o que faz') || lower.includes('funciona') || lower.includes('texto'))
  ) {
    return [
      '📝 **Sobre Mim — Manifesto & Biografia**\n',
      'A aba **Sobre Mim** é dedicada à sua apresentação autoral, fundamentação em sexologia e voz artística:\n',
      '- **Estrutura na Página Inicial:**',
      '  - **Fotografia Lateral:** Retrato autoral em alta resolução.',
      '  - **Título:** `A coragem de despir a vergonha.`',
      '  - **Função:** `Educadora Sexual & Sexóloga em Formação`',
      '  - **Citação em Destaque (Pull Quote):** `A vergonha é a primeira fronteira que nos impõem. Meu trabalho é ajudar a derrubá-la.`',
      '  - **Parágrafos Oficiais:** Reflexões sobre o encontro da sexologia com a fotografia autoral e a desmistificação do prazer.',
      '  - **Assinatura:** `Deixa de vergonha ♡`',
      '- **Onde editar:** Basta acessar a aba **Sobre Mim** no seu painel para atualizar qualquer um desses textos ou trocar a foto do retrato.'
    ].join('\n');
  }

  // 4. Perguntas sobre Redes & OnlyFans (Canais Oficiais)
  if (
    (lower.includes('canal') || lower.includes('canais') || lower.includes('rede') || lower.includes('redes') || lower.includes('onlyfans') || lower.includes('instagram')) &&
    (lower.includes('onde') || lower.includes('como') || lower.includes('para que') || lower.includes('mudo') || lower.includes('altero') || lower.includes('link'))
  ) {
    return [
      '🎯 **Redes & OnlyFans (Canais Oficiais)**\n',
      'A aba **Redes & OnlyFans** configura os blocos de presença externa e redirecionamento do seu público:\n',
      '- **Card do OnlyFans:** Exibe o selo `ACERVO EXCLUSIVO`, descrição dos ensaios em alta resolução sem censura e botão direto para o seu perfil oficial.',
      '- **Card do Instagram:** Exibe seu arroba (`@nuaborges`), tags temáticas (Educação Sexual, Corpo & Tabus) e botão para acompanhar seu perfil.',
      '- **Banner Comercial:** Título e chamada para marcas, imprensa e assessoria entrarem em contato.',
      '- **Onde alterar:** Todos os links, textos e descrições desses cards são gerenciados na aba **Redes & OnlyFans** do painel.'
    ].join('\n');
  }

  // 5. Perguntas sobre Contato Comercial
  if (
    lower.includes('contato') &&
    (lower.includes('onde') || lower.includes('como') || lower.includes('para que') || lower.includes('email') || lower.includes('e-mail') || lower.includes('assunto') || lower.includes('funciona'))
  ) {
    return [
      '📬 **Contato & Assessoria Comercial**\n',
      'A aba **Contato** gerencia as informações do modal de atendimento aberto tanto no cabeçalho quanto no banner da página inicial:\n',
      '- **E-mail Oficial de Recebimento:** `nuaborges@yahoo.com`',
      '- **Assuntos Disponíveis no Formulário:**',
      '  - `Parceria Comercial / Publicidade`',
      '  - `Imprensa / Entrevista`',
      '  - `Dúvidas & Acesso Exclusivo`',
      '  - `Outro Assunto`',
      '- **O que você pode fazer:** Você pode adicionar novos assuntos, remover existentes e atualizar o e-mail oficial de contato a qualquer momento na aba **Contato**.'
    ].join('\n');
  }

  // 6. Perguntas sobre a Biblioteca de Mídia
  if (
    (lower.includes('biblioteca') || lower.includes('acervo de mídia') || lower.includes('upload de foto')) &&
    (lower.includes('onde') || lower.includes('como') || lower.includes('para que') || lower.includes('o que faz') || lower.includes('funciona'))
  ) {
    return [
      '🖼️ **Biblioteca de Mídia**\n',
      'A aba **Biblioteca de Mídia** é o repositório central de todas as suas fotografias e arquivos visuais:\n',
      '- **Upload com Otimização Automática:** Ao enviar imagens em alta resolução, o sistema comprime automaticamente para WebP leve, preservando a nitidez sem pesar o site.',
      '- **Organização por Álbuns:** Você pode criar coleções como `Ensaios Principais`, `Retratos & Capa` e `Fotos Profissionais`.',
      '- **Etiquetas de Uso:** Cada imagem indica claramente onde está sendo utilizada (ex: `Usado em: Hero, Galeria, Sobre`).',
      '- **Lembrete:** As fotos enviadas para a biblioteca ficam guardadas com segurança, mas só aparecem no site público quando você as seleciona na Capa, na Galeria ou no Sobre Mim!'
    ].join('\n');
  }

  // 7. Perguntas diretas sobre a aba Meus Pedidos
  if (
    /^(?:o\s+que\s+[eé]|para\s+que\s+serve|qual\s+a\s+fun[cç][aã]o|onde\s+fica|como\s+funciona)\s+(?:a\s+aba\s+|o\s+canal\s+de\s+)?(?:meus\s+pedidos|solicita[cç][oõ]es)/i.test(lower) ||
    /^(?:onde\s+(?:eu\s+)?vejo\s+(?:os\s+)?meus\s+pedidos)/i.test(lower)
  ) {
    return [
      '🤝 **Meus Pedidos (Acompanhamento com o Desenvolvedor Philippe)**\n',
      'A aba **Meus Pedidos** é o seu canal de acompanhamento contínuo e transparente com o desenvolvedor Philippe:\n',
      '- **Criação Direta pelo Chat:** Basta conversar comigo aqui no chat da Nua IA sobre qualquer ideia, melhoria ou ajuste que você queira no site!',
      '- **Organização Inteligente:** Eu te ajudo a estruturar os detalhes, monto o resumo e, com a sua confirmação, envio direto para o painel de atendimento do Philippe.',
      '- **Acompanhamento em Tempo Real:** Na aba **Meus Pedidos**, você visualiza o andamento de cada solicitação (*Recebido, Em Análise, Em Desenvolvimento, Pronto para Revisão, Concluído*), lê as mensagens dele e responde com facilidade!',
      '- **Notificações e Alertas:** Você recebe avisos sonoros e notificações na tela assim que o Philippe responder ou concluir seu pedido.'
    ].join('\n');
  }

  // 8. Perguntas sobre Ajustes / SEO
  if (
    (lower.includes('ajustes') || lower.includes('seo') || lower.includes('google') || lower.includes('whatsapp') || lower.includes('compartilhamento') || lower.includes('metatags')) &&
    (lower.includes('onde') || lower.includes('como') || lower.includes('para que') || lower.includes('o que faz'))
  ) {
    return [
      '⚙️ **Aba Ajustes & SEO**\n',
      'A aba **Ajustes** concentra as configurações de visibilidade nos mecanismos de busca e nas redes sociais:\n',
      '- **Título nos Buscadores (SEO Title):** Define o texto que aparece na aba do navegador e nos resultados do Google.',
      '- **Descrição nos Buscadores:** O pequeno parágrafo resumo exibido no Google abaixo do seu nome.',
      '- **Foto de Compartilhamento (Open Graph):** A imagem que aparece automaticamente no card de pré-visualização quando alguém compartilha o link do seu site no WhatsApp, Telegram ou Instagram.',
      '- **Monograma & Rodapé:** Monograma `NB` e textos institucionais de direitos autorais.'
    ].join('\n');
  }

  // 9. Perguntas sobre Páginas Institucionais (Termos de Uso, Privacidade, Contrato, Blog)
  if (lower.includes('termos de uso') || (lower.includes('página') && lower.includes('termos'))) {
    return [
      '⚖️ **Página de Termos de Uso (`/termos`)**\n',
      'Esta página institucional protege juridicamente a sua obra autoral sob a **Lei de Direitos Autorais (Lei nº 9.610/98)**:\n',
      '- **Objetivo:** Estabelece a titularidade exclusiva das fotografias, textos e produções de Nua Borges.',
      '- **Proibições Estritas:** Proíbe expressamente o download, redistribuição, cópia ou treinamento de modelos de inteligência artificial com seu acervo sem autorização formal.',
      '- **Acesso:** Fica com link direto no rodapé de todas as páginas do site.'
    ].join('\n');
  }

  if (lower.includes('privacidade') || lower.includes('lgpd')) {
    return [
      '🛡️ **Página de Política de Privacidade (`/privacidade`)**\n',
      'Página institucional formulada em estrita conformidade com a **LGPD (Lei Federal nº 13.709/2018)**:\n',
      '- **Compromisso de Sigilo:** Assegura que nenhum dado pessoal de visitantes ou mensagens de contato é comercializado ou compartilhado com terceiros.',
      '- **Discrição Absoluta:** Garante respeito integral à intimidade de quem acessa e se comunica com a plataforma da Nua Borges.',
      '- **Acesso:** Disponível no rodapé institucional de todo o site.'
    ].join('\n');
  }

  if (lower.includes('blog') || lower.includes('tumblr') || lower.includes('nostalgia')) {
    return [
      '🎞️ **Blog & Feed Tumblr Nostalgia (`/blog`)**\n',
      'Um espaço editorial intimista inspirado na estética clássica dos blogs do Tumblr dos anos 2010:\n',
      '- **Formatos:** Confissões em texto de sexologia, polaroids de bastidores em 35mm, fitas VHS em vídeo, citações literárias e trilhas de vinil.',
      '- **Recurso Exclusivo — Pergunte à Nua (Asks):** Caixa interativa onde visitantes e seguidores podem enviar dúvidas anônimas ou identificadas para você responder.',
      '- **Geração de Stories:** Gera cards verticais em proporção 9:16 prontos para postar no Instagram.'
    ].join('\n');
  }

  if (lower.includes('contrato') && (lower.includes('onde') || lower.includes('o que') || lower.includes('como') || lower.includes('anexo'))) {
    return [
      '📜 **Página de Contrato & Anexo I (`/contrato`)**\n',
      'Área jurídica restrita e protegida por chave de acesso exclusiva:\n',
      '- **Conteúdo:** Contrato formal de desenvolvimento web e o **Anexo I com o Memorial Descritivo** de todas as funcionalidades entregues.',
      '- **Assinatura Digital:** Permite rubrica vetorial ou digitada de ambas as partes (Nua Borges e o desenvolvedor João Philippe Boechat) com certificação e download de PDF oficial.'
    ].join('\n');
  }

  // 10. Perguntas sobre publicação e rascunhos no Admin
  if (
    (lower.includes('publicar') || lower.includes('rascunho') || lower.includes('salvar')) &&
    (lower.includes('como') || lower.includes('funciona') || lower.includes('onde'))
  ) {
    return [
      '💾 **Como Funciona o Salvamento e a Publicação no Site**\n',
      'O Admin da Nua Borges foi desenhado para você editar com total tranquilidade e sem medo de errar:\n',
      '1. **Salvamento Automático como Rascunho:** Conforme você digita ou altera fotos, o painel salva tudo em tempo real como rascunho no seu navegador.',
      '2. **Indicador de Status:** No canto superior direito, aparece um selo laranja `Rascunho não publicado` indicando que há mudanças pendentes.',
      '3. **Botão Ver Site:** Permite que você abra o site para conferir o visual.',
      '4. **Botão Publicar no Site:** Quando estiver tudo perfeito, clique em **Publicar no Site**. Em apenas 1 segundo, suas mudanças são enviadas para a nuvem e ficam visíveis imediatamente para todos os visitantes do mundo!'
    ].join('\n');
  }

  // 11. Cores oficiais da marca
  if (lower.includes('cor') || lower.includes('cores') || lower.includes('paleta')) {
    return [
      '🎨 **Identidade Visual e Cores Oficiais da Nua Borges**\n',
      'A atmosfera visual da marca é inspirada na alta costura e no minimalismo intimista:\n',
      '- **Preto Profundo / Zinc-950 (`#09090b`):** Fundo predominante que confere dramaticidade e sofisticação.',
      '- **Rosa Chá Suave (`#f4a7b9`):** Acento delicado para detalhes femininos, botões de ação e corações.',
      '- **Dourado Suave (`#d4af37`):** Toque nobre para elementos de prestígio e destaques.',
      '- **Diretriz de Design:** É proibido o uso de ícones de faísca (sparkles) nas interfaces da cliente, mantendo o tom sóbrio e autoral.'
    ].join('\n');
  }

  return null;
}
