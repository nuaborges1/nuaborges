import { jsPDF } from 'jspdf';

export function buildAnexoPdfDoc() {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  function checkNewPage(neededHeight: number) {
    if (y + neededHeight > pageHeight - margin - 35) {
      doc.addPage();
      y = margin + 20;
      return true;
    }
    return false;
  }

  // Header
  doc.setFillColor(244, 244, 246);
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.6);
  doc.roundedRect(pageWidth / 2 - 130, y, 260, 16, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 110);
  doc.text('DOCUMENTO ANEXO E INDISSOCIÁVEL AO CONTRATO', pageWidth / 2, y + 11, { align: 'center' });
  y += 26;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(24, 24, 27);
  doc.text('ANEXO I — MEMORIAL DESCRITIVO E ESCOPO TÉCNICO', pageWidth / 2, y, { align: 'center' });
  y += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(113, 113, 122);
  doc.text('Detalhamento Técnico de Telas, Módulos, Infraestrutura e Regras de Aceite', pageWidth / 2, y, { align: 'center' });
  y += 16;

  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 14;

  // Preâmbulo do Anexo
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(82, 82, 91);
  const pre =
    'Este memorial descritivo delimita com clareza as funcionalidades, componentes e infraestrutura entregues no projeto. Em caso de eventual divergência com o contrato, prevalecem as disposições do contrato.';
  const splitPre = doc.splitTextToSize(pre, contentWidth);
  doc.text(splitPre, margin, y);
  y += splitPre.length * 11 + 10;

  const sections = [
    {
      num: 'SEÇÃO 01 — IDENTIFICAÇÃO DO PROJETO E OBJETIVO',
      paragraphs: [
        'Nome: Plataforma Digital Oficial Nua Borges & Sistema de Gerenciamento de Conteúdo (CMS).',
        'Propósito: Portal web com identidade visual aprovada pela CONTRATANTE, destinado a portfólio artístico, canal de assessoria comercial e direcionamento oficial para suas plataformas de conteúdo autoral.',
      ],
    },
    {
      num: 'SEÇÃO 02 — ESTRUTURA DO SITE PÚBLICO (FRONT-END)',
      paragraphs: [
        '• Cabeçalho Fixo Global: Barra flutuante com efeito glassmorphism, logotipo oficial, menu responsivo (drawer mobile) e botões CTA para OnlyFans e Instagram.',
        '• Seção Capa (Hero): Carrossel fotográfico editorial com fotos verticais e transições suaves, com fluidez condicionada ao dispositivo e navegador do visitante.',
        '• Galeria de Ensaios: Esteira contínua infinita (Infinite Marquee) com pausa ao interagir e visualizador Lightbox em tela cheia.',
        '• Seção Manifesto & Biografia: Apresentação editorial com retrato autoral, titulação oficial, pull quote e assinatura artística.',
        '• Canais Oficiais & Redes: Cards parametrizados para OnlyFans e Instagram, além de banner para contato comercial.',
        '• Modal de Contato: Formulário com validação que aciona o aplicativo de e-mail do visitante (mailto:) com campos preenchidos e registra cópia no log do painel.',
        '• Rodapé Institucional: Créditos da marca, links de navegação secundária e menção de direitos reservados.',
        '• Player Musical Editorial: Motor híbrido MP3 e YouTube IFrame API, equalizador sincronizado via Web Audio API, pílula miniaturizada e fade de volume.',
      ],
    },
    {
      num: 'SEÇÃO 03 — PAINEL ADMINISTRATIVO (CMS AUTÔNOMO)',
      paragraphs: [
        '• Aba 1 — Hero / Capa: Edição de chamada principal, subtítulo, botão de ação e ordem dos slides fotográficos;',
        '• Aba 2 — Bio & Manifesto: Edição do texto de manifesto, foto de perfil e citação em destaque;',
        '• Aba 3 — Galeria: Upload e exclusão de fotos de ensaios com ordenação direta e tags visuais;',
        '• Aba 4 — Canais & Redes: Atualização de URLs de redes sociais e canais de monetização;',
        '• Aba 5 — Player de Música: Gestão de faixas MP3 e vídeos do YouTube com título, artista e ordem;',
        '• Aba 6 — SEO & Metadados: Edição das tags de compartilhamento social, descrição e palavras-chave;',
        '• Aba 7 — Contatos Recebidos: Visualização do histórico de mensagens enviadas pelo formulário;',
        '• Aba 8 — Segurança & Senha: Alteração autônoma da chave de acesso mestre do painel.',
      ],
    },
    {
      num: 'SEÇÃO 04 — ARQUITETURA, HOSPEDAGEM E NUVEM',
      paragraphs: [
        '• Framework: Next.js (App Router) com React e TypeScript para alto desempenho e SEO pré-renderizado;',
        '• Hospedagem: Cloudflare Pages com borda global distribuída (Edge Network) de altíssima velocidade;',
        '• Armazenamento: Backblaze B2 Object Storage (bucket `nuaborges-media`) com CDN dedicada e S3 SDK;',
        '• Banco de Dados: Cloudflare Workers KV para persistência ultra-rápida de configurações do CMS;',
        '• Segurança de Borda: Proteção automática contra ataques DDoS e certificado SSL/TLS gratuito renovado pela Cloudflare.',
      ],
    },
    {
      num: 'SEÇÃO 05 — MEDIDAS DE SEGURANÇA E PROTEÇÃO DIGITAL',
      paragraphs: [
        '• Gateway de Borda Fail-Closed: Bloqueio estrito de requisições não autorizadas nas rotas administrativas;',
        '• Sessões Criptográficas: Cookies HttpOnly seguros gerados com HMAC-SHA256 para prevenção de sequestro de sessão;',
        '• Proteção CSRF e CORS Restrito: Autorização estrita apenas de origens oficiais;',
        '• Sanitização e Validação: Validação rígida de tipos de arquivos (MIME types) em uploads de imagens;',
        '• Proteção de Conteúdo: Camada de desativação de clique direito sobre fotografias no site público.',
      ],
    },
    {
      num: 'SEÇÃO 06 — OTIMIZAÇÕES DE DESEMPENHO E SEO',
      paragraphs: [
        '• Metadados dinâmicos e marcação semântica estruturada JSON-LD (ProfilePage, Person, WebSite);',
        '• Suporte integral a cartões Open Graph e Twitter Cards para WhatsApp, Instagram, Telegram e X;',
        '• Acessibilidade digital baseada em HTML5 semântico, atributos ARIA e foco acessível;',
        '• Responsividade total Mobile-First otimizada para smartphones iOS e Android.',
      ],
    },
    {
      num: 'SEÇÃO 07 — DELIMITAÇÃO DE ESCOPO',
      paragraphs: [
        'Inclusos: Todo o portal web, o painel administrativo de 8 abas, implantação na nuvem Cloudflare, configuração de DNS, player de música, regras de segurança, período de ajustes e homologação, garantia e suporte delimitados na Cláusula 6 do contrato.',
        'Não Inclusos: Streaming e hospedagem massiva de vídeos pesados de alta demanda, taxa anual de registro de domínio, contratação de ferramentas pagas de terceiros e desenvolvimento de aplicativos móveis nativos.',
      ],
    },
    {
      num: 'SEÇÃO 08 — TERMO DE HOMOLOGAÇÃO E ACEITE',
      paragraphs: [
        'A entrega e aceite definitivo do projeto consolidam-se mediante a disponibilização da aplicação e do painel administrativo no domínio oficial (ou subdomínio de homologação) em pleno funcionamento e cumprimento do rito de homologação previsto na Cláusula 6.1 do contrato.',
      ],
    },
    {
      num: 'SEÇÃO 09 — RECURSOS ADICIONAIS, NAVEGADORES SUPORTADOS E LIMITES',
      paragraphs: [
        '• Recursos Adicionais Entregues por Liberalidade: Módulo de perguntas anônimas ("Asks"); gravador de vídeo vertical com teleprompter integrado; páginas institucionais de Termos de Uso e Política de Privacidade; e painel técnico de auditoria e estatísticas (Cláusula 15.2).',
        '• Navegadores Suportados: As duas últimas versões estáveis dos navegadores Google Chrome, Apple Safari, Microsoft Edge e Mozilla Firefox, em ambientes operacionais móveis (iOS e Android) e desktop (Windows e macOS).',
        '• Limites Técnicos do Plano Gratuito Cloudflare: Uploads de fotos de até 15 MB e vídeos curtos de até 25 MB; limites de leitura/escrita diários conforme as cotas padrão do plano gratuito da Cloudflare (Cláusula 9.3).',
        '• Prevalência: Em caso de conflito entre este Anexo e o contrato, prevalecem rigorosamente as disposições do contrato.',
      ],
    },
  ];

  for (const sec of sections) {
    checkNewPage(55);

    doc.setFillColor(245, 245, 247);
    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(24, 24, 27);
    doc.text(sec.num, margin + 8, y + 12);
    y += 24;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(55, 65, 81);

    for (const p of sec.paragraphs) {
      const splitP = doc.splitTextToSize(p, contentWidth);
      checkNewPage(splitP.length * 11 + 6);
      doc.text(splitP, margin, y);
      y += splitP.length * 11 + 4;
    }

    y += 6;
  }

  // Footer & Header loop
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    if (i > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 170);
      doc.text('PROJETO NUA BORGES — ANEXO I — MEMORIAL DESCRITIVO', margin, 30);
      doc.setDrawColor(228, 228, 231);
      doc.setLineWidth(0.5);
      doc.line(margin, 34, pageWidth - margin, 34);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 170);
    doc.text('Documento Confidencial — Anexo Técnico ao Contrato de Serviços', margin, pageHeight - 24);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 24, { align: 'right' });
    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 32, pageWidth - margin, pageHeight - 32);
  }

  return doc;
}

export function downloadAnexoPdf() {
  const doc = buildAnexoPdfDoc();
  doc.save('Anexo_I_Memorial_Descritivo_Nua_Borges.pdf');
}
