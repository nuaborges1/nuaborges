import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function downloadContractPdf() {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  function checkNewPage(neededHeight: number) {
    if (y + neededHeight > pageHeight - margin - 25) {
      doc.addPage();
      y = margin + 25;
      return true;
    }
    return false;
  }

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(24, 24, 27);
  const title = 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE DESENVOLVIMENTO WEB';
  const splitTitle = doc.splitTextToSize(title, contentWidth);
  doc.text(splitTitle, pageWidth / 2, y, { align: 'center' });
  y += splitTitle.length * 16 + 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(82, 82, 91);
  doc.text('Instrumento Particular de Desenvolvimento Web, Gestão Digital e Suporte Técnico', pageWidth / 2, y, { align: 'center' });
  y += 13;
  doc.text('Projeto Nua Borges — Brasília/DF — 2026', pageWidth / 2, y, { align: 'center' });
  y += 13;

  // Divider
  doc.setDrawColor(212, 212, 216);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  // Preamble
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(39, 39, 42);
  const preamble =
    'Pelo presente instrumento particular, as partes abaixo identificadas têm, entre si, justo e contratado o presente Contrato de Prestação de Serviços de Desenvolvimento Web, mediante as cláusulas e condições seguintes:';
  const splitPre = doc.splitTextToSize(preamble, contentWidth);
  doc.text(splitPre, margin, y);
  y += splitPre.length * 12 + 12;

  const clauses = [
    {
      num: 'CLÁUSULA PRIMEIRA — DAS PARTES',
      paragraphs: [
        'CONTRATADO: João Philippe de Oliveira Boechat, brasileiro, solteiro, desenvolvedor web, portador do RG nº 3.755.968 e CPF nº 053.795.071-07, residente e domiciliado em Ceilândia, Brasília/DF, e-mail: philippeboechat1@gmail.com.',
        'CONTRATANTE: Nua Borges, educadora sexual e sexóloga em formação, residente e domiciliada em [Cidade/UF a completar], portadora do CPF nº [CPF a completar], e-mail: [E-mail a completar].',
        'As partes acima qualificadas celebram o presente contrato sob as cláusulas e condições a seguir estipuladas.',
      ],
    },
    {
      num: 'CLÁUSULA SEGUNDA — DO OBJETO',
      paragraphs: [
        'O presente contrato tem como objeto o desenvolvimento de um website personalizado para o projeto Nua Borges, compreendendo sua estrutura visual, programação, publicação em nuvem e os recursos administrativos definidos entre as partes, conforme discriminado detalhadamente no Anexo I — Memorial Descritivo e Escopo Técnico-Funcional, parte integrante deste instrumento.',
        'O projeto será desenvolvido em consonância com a identidade visual, diretrizes estéticas e objetivos apresentados pela CONTRATANTE durante a execução, consistindo em uma presença digital autoral e de alto padrão.',
      ],
    },
    {
      num: 'CLÁUSULA TERCEIRA — DO ESCOPO DO PROJETO',
      paragraphs: [
        'O projeto contratado compreende:',
        'I — Site público: Página inicial com seção capa (Hero) em carrossel fotográfico editorial; galeria de ensaios com visualizador lightbox; seção Sobre Mim / Manifesto; seção de canais e redes sociais; modal de contato comercial validado; player musical editorial híbrido (YouTube e MP3); cabeçalho fixo com menu responsivo; rodapé institucional; otimizações de carregamento e SEO técnico básico.',
        'II — Painel administrativo (CMS): Interface restrita com autenticação de segurança para edição de textos e fotos da capa, biblioteca de mídia com upload direto, gerenciamento de fotos da galeria, personalização de links e canais, controle da playlist musical, configuração de meta tags de SEO e alteração da credencial de acesso.',
        'Parágrafo Único: O detalhamento técnico exaustivo das funcionalidades consta no Anexo I, parte integrante e indissociável deste instrumento.',
      ],
    },
    {
      num: 'CLÁUSULA QUARTA — DO VALOR E DA FORMA DE PAGAMENTO',
      paragraphs: [
        'Pelo desenvolvimento integral do projeto e concessão dos recursos descritos, a CONTRATANTE pagará ao CONTRATADO o valor total de R$ 2.000,00 (dois mil reais), dividido em 10 (dez) parcelas mensais e sucessivas de R$ 200,00 (duzentos reais) cada.',
        'Os pagamentos serão efetuados via transferência PIX ou outro meio eletrônico acordado entre as partes, conforme o cronograma abaixo:',
      ],
      hasTable: true,
      afterTableParagraphs: [
        'Em caso de atraso injustificado no pagamento de qualquer parcela, incidirá multa moratória de 2% (dois por cento) sobre o valor da parcela em atraso, juros moratórios de 1% (um por cento) ao mês calculados pro rata die, e atualização monetária pelo índice oficial IPCA/IBGE.',
        'Parágrafo Único: O atraso superior a 15 (quinze) dias corridos autorizará o CONTRATADO a suspender preventivamente o suporte técnico e o acesso às rotas administrativas até a regularização financeira.',
      ],
    },
    {
      num: 'CLÁUSULA QUINTA — DO PRAZO DE DESENVOLVIMENTO E ENTREGA',
      paragraphs: [
        'O prazo de desenvolvimento e entrega final da plataforma será acordado entre as partes no início dos trabalhos, considerando a disponibilidade mútua e o envio tempestivo dos materiais fundamentais.',
        'O cronograma passará a fluir a partir do efetivo recebimento dos insumos fornecidos pela CONTRATANTE (textos definitivos, ensaios fotográficos em alta resolução, links oficiais e informações cadastrais) e da confirmação do pagamento da primeira parcela.',
        'Parágrafo Único: Eventuais atrasos na entrega dos materiais pela CONTRATANTE ensejarão prorrogação proporcional automática do prazo de entrega, sem caracterizar mora ou inadimplemento por parte do CONTRATADO.',
      ],
    },
    {
      num: 'CLÁUSULA SEXTA — DO PERÍODO DE AJUSTES E DO SUPORTE VITALÍCIO',
      paragraphs: [
        'O CONTRATADO prestará suporte contínuo e vitalício à CONTRATANTE relacionado ao website e aos seus recursos, sem qualquer cobrança de mensalidade, compreendendo:',
        'I — Período de Ajustes e Homologação Inicial: Durante a fase de implantação e aprovação do projeto, estão plenamente inclusos todos os ajustes necessários para que o site e o painel fiquem alinhados ao gosto e às diretrizes da CONTRATANTE, englobando refinamentos de layout, inclusão ou exclusão de seções, criação de páginas institucionais de estrutura similar e ajustes práticos nas rotas do painel administrativo (CMS);',
        'II — Correção de eventuais inconsistências ou falhas (bugs) decorrentes do código-fonte do desenvolvimento original;',
        'III — Suporte operacional, esclarecimento de dúvidas e orientações sobre a gestão de conteúdo via painel administrativo;',
        'IV — Pequenas melhorias e adaptações evolutivas no website e no painel para acompanhar a rotina e as necessidades da CONTRATANTE;',
        'V — Manutenção preventiva para assegurar a compatibilidade contínua com atualizações de navegadores web e sistemas operacionais móveis.',
        'Parágrafo Único: Os atendimentos serão prestados em prazo razoável, com primeira resposta em até 48 (quarenta e oito) horas úteis, não configurando regime de sobreaviso, plantão 24 horas ou dedicação exclusiva.',
      ],
    },
    {
      num: 'CLÁUSULA SÉTIMA — DAS DEMANDAS DE ALTA COMPLEXIDADE TÉCNICA',
      paragraphs: [
        'Permanecem expressamente fora do escopo do suporte vitalício apenas projetos ou implementações de alta complexidade estrutural que representem produtos digitais independentes ou novos modelos de negócio, tais como:',
        'a) Desenvolvimento de sistema próprio de pagamentos online (checkout transparente com gateway de cartão ou PIX automatizado);',
        'b) Área de membros restrita com autenticação de assinantes e controle automático de mensalidades pagas;',
        'c) Desenvolvimento de aplicativos móveis nativos para publicação nas lojas Google Play Store e Apple App Store;',
        'd) Infraestrutura própria para streaming e hospedagem massiva de vídeos pesados de alta demanda;',
        'e) Redesign estrutural completo e reconstrução do projeto do zero após a aprovação e homologação definitiva.',
        'Parágrafo Único: Demandas dessa natureza serão previamente orçadas em proposta técnica específica e submetidas à aprovação prévia da CONTRATANTE, mantendo-se o website original plenamente ativo e suportado independentemente de novas contratações.',
      ],
    },
    {
      num: 'CLÁUSULA OITAVA — DAS ALTERAÇÕES REALIZADAS POR TERCEIROS',
      paragraphs: [
        'A garantia e o suporte vitalício não abrangem defeitos provocados por intervenções diretas de terceiros não autorizados no código-fonte, banco de dados, repositório ou infraestrutura de hospedagem. Qualquer restauração técnica decorrente de intervenções externas não autorizadas será objeto de orçamento específico.',
      ],
    },
    {
      num: 'CLÁUSULA NONA — DO DOMÍNIO E SERVIÇOS DE TERCEIROS',
      paragraphs: [
        'O valor pactuado na Cláusula Quarta remunera unicamente os serviços de projeto e desenvolvimento do CONTRATADO. Despesas recorrentes relativas a taxas anuais de registro/renovação de domínio (ex: Registro.br), plataformas pagas de terceiros ou serviços externos adicionais que a CONTRATANTE venha a optar correrão por conta exclusiva desta.',
        'Parágrafo Único: Nenhuma despesa ou contratação de serviço terceiro será efetuada sem prévia ciência e autorização expressa da CONTRATANTE.',
      ],
    },
    {
      num: 'CLÁUSULA DÉCIMA — DAS OBRIGAÇÕES DO CONTRATADO',
      paragraphs: [
        'São obrigações do CONTRATADO: executar os serviços de acordo com as especificações contratadas; prestar o suporte vitalício nos termos estipulados; corrigir falhas técnicas decorrentes do desenvolvimento original; manter sigilo sobre dados e credenciais aos quais tiver acesso; comunicar previamente à CONTRATANTE qualquer limitação técnica relevante ou necessidade de insumos.',
      ],
    },
    {
      num: 'CLÁUSULA DÉCIMA PRIMEIRA — DAS OBRIGAÇÕES DA CONTRATANTE',
      paragraphs: [
        'São obrigações da CONTRATANTE: fornecer tempestivamente os textos, imagens, dados e acessos necessários; honrar pontualmente os pagamentos nos termos acordados; zelar pela guarda e confidencialidade de suas senhas de acesso; responsabilizar-se pela legalidade, veracidade e direitos autorais de todos os conteúdos fornecidos para publicação.',
      ],
    },
    {
      num: 'CLÁUSULA DÉCIMA SEGUNDA — DA RESPONSABILIDADE PELO NEGÓCIO',
      paragraphs: [
        'O CONTRATADO responde exclusivamente pela entrega técnica e funcional da plataforma, não assumindo qualquer garantia de resultados comerciais, faturamento, alcance de público, conversão de vendas ou engajamento de redes sociais, os quais dependem de fatores mercadológicos alheios ao desenvolvimento de software.',
      ],
    },
    {
      num: 'CLÁUSULA DÉCIMA TERCEIRA — DA PROPRIEDADE INTELECTUAL E DIREITO DE USO',
      paragraphs: [
        'Pertencem integralmente à CONTRATANTE todos os direitos sobre a marca, nome, fotografias, vídeos e conteúdos textuais por ela fornecidos. Mediante a quitação integral do valor acordado, a CONTRATANTE adquire o direito irrestrito e perpétuo de utilização da aplicação desenvolvida.',
        'Parágrafo Único: Bibliotecas de código aberto (open-source), frameworks e módulos de terceiros utilizados no projeto permanecem regidos por suas respectivas licenças originais de distribuição.',
      ],
    },
    {
      num: 'CLÁUSULA DÉCIMA QUARTA — DA CONFIDENCIALIDADE',
      paragraphs: [
        'As partes obrigam-se a manter rigoroso sigilo acerca de quaisquer informações confidenciais, estratégias operacionais, métricas internas, credenciais técnicas ou dados comerciais compartilhados em razão deste contrato, não os revelando a terceiros sem prévio consentimento formal.',
      ],
    },
    {
      num: 'CLÁUSULA DÉCIMA QUINTA — DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)',
      paragraphs: [
        'As partes comprometem-se a cumprir integralmente as disposições da Lei Federal nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais — LGPD). O CONTRATADO não utilizará, compartilhará ou comercializará quaisquer dados pessoais aos quais tiver acesso para finalidades estranhas à prestação dos serviços contratados, aplicando medidas técnicas razoáveis de proteção da informação.',
      ],
    },
    {
      num: 'CLÁUSULA DÉCIMA SEXTA — DO DIREITO DE PORTFÓLIO',
      paragraphs: [
        'Fica o CONTRATADO autorizado a exibir o website desenvolvido em seu portfólio profissional (capturas de tela e menção de autoria técnica), resguardando-se rigorosamente quaisquer dados sigilosos, senhas ou conteúdos sensíveis.',
      ],
    },
    {
      num: 'CLÁUSULA DÉCIMA SÉTIMA — DA RESCISÃO CONTRATUAL',
      paragraphs: [
        'O presente contrato poderá ser rescindido motivadamente por descumprimento de obrigação não sanado em 10 (dez) dias após notificação, ou imotivadamente por qualquer das partes mediante comunicação prévia por escrito com antecedência mínima de 15 (quinze) dias corridos.',
        'Parágrafo Único: Em caso de rescisão antecipada, apurar-se-ão os serviços proporcionalmente executados até a data da notificação para acerto de contas, resguardando-se a entrega dos arquivos e acessos já remunerados.',
      ],
    },
    {
      num: 'CLÁUSULA DÉCIMA OITAVA — DA SEGURANÇA E ACESSOS',
      paragraphs: [
        'O CONTRATADO implementará padrões modernos de segurança na plataforma. A CONTRATANTE é a única responsável pela preservação de suas credenciais pessoais de acesso ao painel, não respondendo o CONTRATADO por invasões ou vazamentos causados por descuido de guarda ou repasse de senha a terceiros.',
      ],
    },
    {
      num: 'CLÁUSULA DÉCIMA NONA — DAS DISPOSIÇÕES GERAIS',
      paragraphs: [
        'Toda e qualquer alteração a este instrumento será realizada por aditivo escrito. A tolerância de qualquer das partes perante o atraso ou inadimplemento temporário não configurará novação ou renúncia de direitos. O presente contrato revoga e substitui quaisquer conversas preliminares sobre o objeto.',
      ],
    },
    {
      num: 'CLÁUSULA VIGÉSIMA — DO FORO',
      paragraphs: [
        'Para dirimir eventuais litígios oriundos da interpretação ou execução deste contrato, as partes elegem expressamente o Foro da Circunscrição Judiciária de Brasília/DF, com renúncia a qualquer outro, por mais especial ou privilegiado que seja.',
      ],
    },
  ];

  for (const clause of clauses) {
    checkNewPage(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(24, 24, 27);
    const splitClauseHeader = doc.splitTextToSize(clause.num, contentWidth);
    doc.text(splitClauseHeader, margin, y);
    y += splitClauseHeader.length * 12 + 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(39, 39, 42);

    for (const p of clause.paragraphs) {
      const splitP = doc.splitTextToSize(p, contentWidth);
      checkNewPage(splitP.length * 11 + 5);
      doc.text(splitP, margin, y);
      y += splitP.length * 11 + 4;
    }

    if (clause.hasTable) {
      checkNewPage(110);
      const tableRows: string[][] = [];
      for (let i = 1; i <= 10; i++) {
        tableRows.push([`${i}ª Parcela`, 'R$ 200,00', 'Mensal sucessiva']);
      }
      autoTable(doc, {
        startY: y + 2,
        margin: { left: margin, right: margin },
        head: [['Parcela', 'Valor Unitário', 'Periodicidade / Vencimento']],
        body: tableRows,
        theme: 'grid',
        headStyles: {
          fillColor: [244, 244, 245],
          textColor: [24, 24, 27],
          fontStyle: 'bold',
          fontSize: 8,
          cellPadding: 3.5,
        },
        bodyStyles: {
          textColor: [39, 39, 42],
          fontSize: 7.5,
          cellPadding: 3,
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250],
        },
        columnStyles: {
          0: { cellWidth: 90, fontStyle: 'bold' },
          1: { cellWidth: 90 },
          2: { cellWidth: 'auto' },
        },
      });
      // @ts-expect-error lastAutoTable is injected by jspdf-autotable
      y = doc.lastAutoTable.finalY + 8;

      if (clause.afterTableParagraphs) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(39, 39, 42);
        for (const p of clause.afterTableParagraphs) {
          const splitP = doc.splitTextToSize(p, contentWidth);
          checkNewPage(splitP.length * 11 + 5);
          doc.text(splitP, margin, y);
          y += splitP.length * 11 + 4;
        }
      }
    }

    y += 6;
  }

  // Signatures
  checkNewPage(100);
  y += 15;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(63, 63, 70);
  doc.text('Brasília/DF, 2026.', margin, y);
  y += 35;

  const sigColWidth = (contentWidth - 40) / 2;
  const col1X = margin;
  const col2X = margin + sigColWidth + 40;

  doc.setDrawColor(161, 161, 170);
  doc.setLineWidth(0.7);
  doc.line(col1X, y, col1X + sigColWidth, y);
  doc.line(col2X, y, col2X + sigColWidth, y);
  y += 11;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(24, 24, 27);
  doc.text('JOÃO PHILIPPE DE OLIVEIRA BOECHAT', col1X, y);
  doc.text('NUA BORGES', col2X, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(113, 113, 122);
  doc.text('CONTRATADO — Desenvolvedor Web', col1X, y);
  doc.text('CONTRATANTE — Educadora Sexual', col2X, y);
  y += 9;
  doc.text('CPF: 053.795.071-07', col1X, y);
  doc.text('CPF: [A preencher]', col2X, y);

  // Headers and Footers with total pages count
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    if (i > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(161, 161, 170);
      doc.text('PROJETO NUA BORGES — CONTRATO DE PRESTAÇÃO DE SERVIÇOS', margin, 32);
      doc.setDrawColor(228, 228, 231);
      doc.setLineWidth(0.5);
      doc.line(margin, 36, pageWidth - margin, 36);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(161, 161, 170);
    doc.text('Documento Confidencial — Para Leitura e Alinhamento Prévio', margin, pageHeight - 25);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 25, { align: 'right' });
    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 33, pageWidth - margin, pageHeight - 33);
  }

  doc.save('Contrato_Desenvolvimento_Web_Nua_Borges.pdf');
}

export function downloadAnexoPdf() {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  function checkNewPage(neededHeight: number) {
    if (y + neededHeight > pageHeight - margin - 25) {
      doc.addPage();
      y = margin + 25;
      return true;
    }
    return false;
  }

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(24, 24, 27);
  const title = 'ANEXO I — MEMORIAL DESCRITIVO & ESCOPO TÉCNICO-FUNCIONAL';
  const splitTitle = doc.splitTextToSize(title, contentWidth);
  doc.text(splitTitle, pageWidth / 2, y, { align: 'center' });
  y += splitTitle.length * 16 + 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(82, 82, 91);
  doc.text('Detalhamento Técnico Integral do Website e Sistema de Gerenciamento de Conteúdo', pageWidth / 2, y, { align: 'center' });
  y += 13;
  doc.text('Projeto Nua Borges — Brasília/DF — 2026', pageWidth / 2, y, { align: 'center' });
  y += 13;

  // Divider
  doc.setDrawColor(212, 212, 216);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  // Preamble
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(39, 39, 42);
  const preamble =
    'Este documento constitui o Anexo I do Contrato de Prestação de Serviços de Desenvolvimento Web celebrado entre João Philippe de Oliveira Boechat e Nua Borges, delimitando de forma exaustiva a arquitetura, funcionalidades, painel administrativo e infraestrutura do projeto.';
  const splitPre = doc.splitTextToSize(preamble, contentWidth);
  doc.text(splitPre, margin, y);
  y += splitPre.length * 12 + 12;

  const sections = [
    {
      num: 'SEÇÃO 01 — IDENTIFICAÇÃO DO PROJETO E OBJETIVO',
      paragraphs: [
        'Nome do Projeto: Plataforma Digital Oficial Nua Borges & Sistema de Gerenciamento de Conteúdo (CMS).',
        'Propósito Central: Portal web de altíssimo padrão estético (editorial de luxo) para consolidação da marca pessoal da criadora Nua Borges, atuando como hub oficial de portfólio artístico, canal de assessoria comercial e direcionamento para suas plataformas de conteúdo exclusivo.',
      ],
    },
    {
      num: 'SEÇÃO 02 — ESTRUTURA DO SITE PÚBLICO (FRONT-END)',
      paragraphs: [
        'a) Cabeçalho Fixo Global: Barra flutuante com efeito glassmorphism fosco, logotipo editorial da marca, navegação fluida responsiva (drawer mobile) e botões de chamada rápida para OnlyFans e Instagram;',
        'b) Seção Capa (Hero): Carrossel cinematográfico com fotos verticais editoriais, transições a 60/120 FPS e botão de ação primária;',
        'c) Galeria de Ensaios Editoriais: Esteira horizontal contínua infinita (Infinite Marquee) com visualizador Lightbox em tela cheia e controle touch;',
        'd) Seção Manifesto & Biografia: Apresentação editorial com retrato autoral, titulação oficial, pull quote em tipografia serifada e assinatura artística;',
        'e) Canais Oficiais & Redes: Cards parametrizados para OnlyFans e Instagram, além de banner de contato comercial direto;',
        'f) Modal de Contato: Formulário moderno com envio automatizado, botão de cópia de e-mail e validação rigorosa de campos;',
        'g) Rodapé Institucional: Créditos da marca, links secundários e menção de direitos reservados;',
        'h) Player Musical Editorial Híbrido: Motor de áudio compatível com YouTube IFrame API e arquivos MP3, equalizador em tempo real via Web Audio API, pílula flutuante recolhível e transições suaves de volume.',
      ],
    },
    {
      num: 'SEÇÃO 03 — PAINEL DE CONTROLE ADMINISTRATIVO (CMS — /admin)',
      paragraphs: [
        'Acesso restrito por senha mestra com proteção por taxa de requisição, cookies criptografados HMAC-SHA256 e sessão segura de 24 horas. O painel dispõe de 8 módulos completos:',
        '• Aba 1 — Capa (Hero): Edição de textos de chamada, ativação/pausa e ordenação dos slides do carrossel;',
        '• Aba 2 — Biblioteca de Mídia: Upload direto de imagens (JPG, PNG, WebP, AVIF) e vídeos (MP4, WebM) com compressão e geração de links otimizados;',
        '• Aba 3 — Galeria: Ativação, inclusão e curadoria de fotos de ensaios com legendas editoriais;',
        '• Aba 4 — Sobre Mim: Gestão do texto biográfico, manifesto autoral e foto de perfil;',
        '• Aba 5 — Redes Sociais: Edição dinâmica de links, títulos e etiquetas dos canais oficiais;',
        '• Aba 6 — Contato: Configuração do e-mail de destino e assuntos do formulário de contato;',
        '• Aba 7 — Player Musical: Gerenciamento da trilha sonora com links do YouTube, uploads de MP3 e controle de reprodução;',
        '• Aba 8 — SEO & Ajustes: Customização do título, meta description, imagem Open Graph para redes sociais e alteração da senha mestra do painel.',
      ],
    },
    {
      num: 'SEÇÃO 04 — INFRAESTRUTURA TÉCNICA E DESEMPENHO',
      paragraphs: [
        '• Framework Base: Next.js 15 (App Router) + React 19;',
        '• Arquitetura: Jamstack Serverless com Edge Functions de baixa latência;',
        '• Hospedagem & CDN: Cloudflare Pages Global Edge Network (mais de 300 data centers, tempo de resposta inferior a 1 segundo);',
        '• Armazenamento de Mídia: Cloudflare R2 Object Storage com CDN dedicada e Zero Egress Fees;',
        '• Animações & Estilo: Motion (Framer Motion v12) + Tailwind CSS v4.',
      ],
    },
    {
      num: 'SEÇÃO 05 — ARQUITETURA DE SEGURANÇA EM PROFUNDIDADE (LEVEL 5)',
      paragraphs: [
        '• Criptografia SSL/TLS Universal com HSTS Preload por 1 ano;',
        '• Cabeçalhos de Segurança Estritos (Content-Security-Policy, X-Frame-Options: DENY, X-Content-Type-Options: nosniff);',
        '• Middleware de proteção com arquitetura Fail-Closed para rotas restritas;',
        '• Inspeção binária de arquivos enviados (Magic Bytes) na biblioteca de mídia;',
        '• Higienização de entradas contra ataques XSS e proteção anti-IDOR.',
      ],
    },
    {
      num: 'SEÇÃO 06 — SEO TÉCNICO & ACESSIBILIDADE',
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
        'Inclusos: Todo o portal web, o painel administrativo de 8 abas, implantação na nuvem Cloudflare, configuração de DNS, player de música, regras de segurança, suporte vitalício e período inicial de ajustes e homologação.',
        'Não Inclusos: Streaming e hospedagem massiva de vídeos pesados de alta demanda, taxa anual de registro de domínio, contratação de ferramentas pagas de terceiros e desenvolvimento de aplicativos móveis nativos.',
      ],
    },
    {
      num: 'SEÇÃO 08 — TERMO DE HOMOLOGAÇÃO E ACEITE',
      paragraphs: [
        'A entrega e aceite definitivo do projeto consolidam-se mediante a disponibilização da aplicação e do painel administrativo no domínio oficial (ou subdomínio de homologação) em pleno funcionamento, conforme os recursos discriminados neste memorial.',
      ],
    },
  ];

  for (const sec of sections) {
    checkNewPage(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(24, 24, 27);
    const splitHeader = doc.splitTextToSize(sec.num, contentWidth);
    doc.text(splitHeader, margin, y);
    y += splitHeader.length * 12 + 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(39, 39, 42);

    for (const p of sec.paragraphs) {
      const splitP = doc.splitTextToSize(p, contentWidth);
      checkNewPage(splitP.length * 11 + 5);
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
      doc.setFontSize(7.5);
      doc.setTextColor(161, 161, 170);
      doc.text('PROJETO NUA BORGES — ANEXO I — MEMORIAL DESCRITIVO', margin, 32);
      doc.setDrawColor(228, 228, 231);
      doc.setLineWidth(0.5);
      doc.line(margin, 36, pageWidth - margin, 36);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(161, 161, 170);
    doc.text('Documento Confidencial — Anexo Técnico ao Contrato de Serviços', margin, pageHeight - 25);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 25, { align: 'right' });
    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 33, pageWidth - margin, pageHeight - 33);
  }

  doc.save('Anexo_I_Memorial_Descritivo_Nua_Borges.pdf');
}
