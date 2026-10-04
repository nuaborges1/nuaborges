import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ContractSignatureData {
  signedAt?: string;
  ip?: string;
  certificateHash?: string;
  signatureDataUrl?: string;
  signatureType?: 'drawn' | 'typed';
}

export function buildContractPdfDoc(signatures?: {
  contractor?: ContractSignatureData | null;
  client?: ContractSignatureData | null;
}) {
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

  // === CABEÇALHO EXECUTIVO (PÁGINA 1) ===
  // Tag / Badge superior
  doc.setFillColor(244, 244, 246);
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.6);
  doc.roundedRect(pageWidth / 2 - 130, y, 260, 16, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 110);
  doc.text('INSTRUMENTO PARTICULAR DE CONTRATO DE PRESTAÇÃO DE SERVIÇOS', pageWidth / 2, y + 11, { align: 'center' });
  y += 26;

  // Título Principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(24, 24, 27);
  doc.text('CONTRATO DE DESENVOLVIMENTO WEB & GESTÃO DIGITAL', pageWidth / 2, y, { align: 'center' });
  y += 14;

  // Subtítulo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(113, 113, 122);
  doc.text('Portal Web Autoral, CMS Autônomo, Implantação em Nuvem e Suporte Técnico', pageWidth / 2, y, { align: 'center' });
  y += 11;
  doc.text('Projeto Nua Borges · Brasília/DF — República da Irlanda · 2026', pageWidth / 2, y, { align: 'center' });
  y += 16;

  // Linha divisória elegante
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 14;

  // Card Executivo de Resumo das Partes e Condições
  const cardHeight = 68;
  doc.setFillColor(250, 250, 252);
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, y, contentWidth, cardHeight, 4, 4, 'FD');

  const halfWidth = contentWidth / 2;
  const col1Left = margin + 12;
  const col2Left = margin + halfWidth + 8;

  // Coluna CONTRATADO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(24, 24, 27);
  doc.text('CONTRATADO:', col1Left, y + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(' João Philippe de Oliveira Boechat', col1Left + 62, y + 13);
  doc.setFontSize(7);
  doc.setTextColor(82, 82, 91);
  doc.text('CPF: 053.795.071-07 · Ceilândia, Brasília/DF', col1Left, y + 24);
  doc.text('WhatsApp: (61) 99361-9554 · philippeboechat1@gmail.com', col1Left, y + 34);

  // Coluna CONTRATANTE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(24, 24, 27);
  doc.text('CONTRATANTE:', col2Left, y + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(' Nayara Borges da Costa ("Nua Borges")', col2Left + 68, y + 13);
  doc.setFontSize(7);
  doc.setTextColor(82, 82, 91);
  doc.text('CPF: 0832051073 · República da Irlanda', col2Left, y + 24);
  doc.text('WhatsApp: 0832051073 · nua@nuaborges', col2Left, y + 34);

  // Linha inferior do Card (Valores & Vigência)
  doc.setDrawColor(235, 235, 238);
  doc.setLineWidth(0.5);
  doc.line(col1Left, y + 43, margin + contentWidth - 12, y + 43);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(24, 24, 27);
  doc.text('VALOR GLOBAL:', col1Left, y + 56);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(82, 82, 91);
  doc.text(' R$ 2.000,00 (10 parcelas de R$ 200,00)', col1Left + 66, y + 56);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(24, 24, 27);
  doc.text('GARANTIA & SUPORTE:', col2Left, y + 56);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(82, 82, 91);
  doc.text(' 12 meses nos termos da Cláusula 6', col2Left + 98, y + 56);

  y += cardHeight + 14;

  // Preâmbulo
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(82, 82, 91);
  const preamble =
    'Pelo presente instrumento particular, as partes acima qualificadas têm, entre si, justo e contratado o presente Contrato de Prestação de Serviços de Desenvolvimento Web, que se regerá pelas cláusulas e condições seguintes:';
  const splitPre = doc.splitTextToSize(preamble, contentWidth);
  doc.text(splitPre, margin, y);
  y += splitPre.length * 11 + 10;

  // === CLÁUSULAS ===
  const clauses = [
    {
      num: 'CLÁUSULA 01 — DAS PARTES',
      paragraphs: [
        'CONTRATADO: João Philippe de Oliveira Boechat, brasileiro, solteiro, desenvolvedor web, portador do RG nº 3.755.968 e CPF nº 053.795.071-07, residente e domiciliado em Ceilândia, Brasília/DF, e-mail: philippeboechat1@gmail.com, WhatsApp: 61993619554.',
        'CONTRATANTE: Nayara Borges da Costa, conhecida profissionalmente como "Nua Borges", brasileira, casada, portadora do CPF nº 0832051073, residente e domiciliada na República da Irlanda, e-mail: nua@nuaborges, WhatsApp: 0832051073.',
        'Parágrafo Único: Os e-mails e números de WhatsApp acima constituem os canais oficiais de comunicação e notificação das partes para todos os fins deste contrato (Cláusula 19).',
      ],
    },
    {
      num: 'CLÁUSULA 02 — DO OBJETO',
      paragraphs: [
        '2.1. O objeto deste contrato é o desenvolvimento, a publicação e a homologação do website do projeto "Nua Borges", com o respectivo painel administrativo (CMS), exatamente conforme o Anexo I — Memorial Descritivo e Escopo Técnico-Funcional, bem como a prestação da garantia e do suporte nos estritos limites da Cláusula 6.',
        '2.2. Quaisquer alterações de escopo dependem de solicitação escrita da CONTRATANTE e de aceite do CONTRATADO, com orçamento específico quando excederem o previsto na Cláusula 6.',
        '2.3. O layout e a identidade visual são exclusivos do projeto. Componentes genéricos, ferramentas, técnicas e bibliotecas seguem a disciplina da Cláusula 13.',
      ],
    },
    {
      num: 'CLÁUSULA 03 — DO ESCOPO DO PROJETO',
      paragraphs: [
        'O projeto contratado compreende exatamente os seguintes módulos e recursos:',
        'I — Site público: Adaptação a celulares, tablets e computadores nos navegadores suportados do Anexo I; página inicial com seção capa (Hero) em carrossel fotográfico editorial; galeria de ensaios com esteira contínua infinita e visualizador lightbox em tela cheia; seção Sobre Mim / Manifesto; seção de canais oficiais e redes sociais; modal de contato comercial validado; player musical editorial híbrido (YouTube + MP3); cabeçalho fixo responsivo com menu drawer mobile; rodapé institucional; animações e microinterações conforme layout aprovado; otimizações de carregamento e SEO técnico básico com Open Graph.',
        'II — Painel administrativo (CMS): Interface restrita com autenticação de segurança para edição de textos e fotos da capa, biblioteca de mídia com upload direto, gerenciamento da galeria conforme Anexo I (Aba 3), alteração dinâmica de links e canais, controle da playlist musical, configuração de meta tags de SEO e alteração de senha mestra.',
        'Parágrafo Primeiro: O detalhamento técnico exaustivo das funcionalidades consta no Anexo I, parte integrante e indissociável deste instrumento.',
        'Parágrafo Segundo: Os recursos adicionais entregues por liberalidade do CONTRATADO (blog, módulo de perguntas "Asks", gravador de vídeo vertical com teleprompter, páginas de Termos e Privacidade e painel de auditoria) integram o website. O suporte a eles observa a Cláusula 6 e não gera obrigação de evolução perpétua.',
      ],
    },
    {
      num: 'CLÁUSULA 04 — DO VALOR E DA FORMA DE PAGAMENTO',
      paragraphs: [
        '4.1. Pelo desenvolvimento, publicação, homologação e garantia técnica (Cláusula 6.2), a CONTRATANTE pagará ao CONTRATADO o valor total de R$ 2.000,00 (dois mil reais), dividido em 10 (dez) parcelas mensais e sucessivas de R$ 200,00 (duzentos reais) cada, vencendo-se a primeira em 04 de outubro de 2026 (04/10/2026) e as demais no dia 04 dos meses subsequentes, por transferência PIX para a chave informada ou outro meio acordado por escrito.',
      ],
      hasTable: true,
      afterTableParagraphs: [
        '4.2. Em caso de atraso, incidirão sobre o valor da parcela em atraso: multa moratória de 2% (dois por cento); juros de mora de 1% (um por cento) ao mês (pro rata die), ou o máximo legal, se inferior; e atualização monetária pelo índice oficial IPCA/IBGE.',
        '4.3. Atraso superior a 15 (quinze) dias corridos, após notificação pelos canais oficiais, autoriza o CONTRATADO a suspender preventivamente o suporte técnico e o atendimento de novas demandas até a regularização. O CONTRATADO não retirará o website do ar nem bloqueará o acesso da CONTRATANTE ao painel administrativo ou ao seu conteúdo.',
        '4.4. Atraso superior a 30 (trinta) dias, não sanado em 10 (dez) dias após notificação escrita, autoriza o CONTRATADO a considerar vencidas antecipadamente todas as parcelas vincendas e/ou a resolver o contrato (Cláusula 17.2).',
      ],
    },
    {
      num: 'CLÁUSULA 05 — DO PRAZO DE ENTREGA E DA HOMOLOGAÇÃO',
      paragraphs: [
        '5.1. O website foi disponibilizado para homologação pela CONTRATANTE na data acordada, contando-se a execução a partir do recebimento dos materiais essenciais (textos, fotos e links) e da confirmação do pagamento da primeira parcela.',
        '5.2. Atrasos no fornecimento de insumos ou nas respostas da CONTRATANTE prorrogam proporcionalmente o cronograma, sem caracterizar mora do CONTRATADO.',
        '5.3. A homologação ocorre estritamente na forma da Cláusula 6.1, iniciando a contagem dos prazos das Cláusulas 6.2 e 6.3.',
      ],
    },
    {
      num: 'CLÁUSULA 06 — DA HOMOLOGAÇÃO, DA GARANTIA E DO SUPORTE',
      paragraphs: [
        '6.1. Período de ajustes e homologação: Disponibilizado o website para homologação, a CONTRATANTE terá 10 (dez) dias úteis para apresentar, em lista única e por escrito, os ajustes desejados dentro do escopo do Anexo I. Estão incluídas até 2 (duas) rodadas de ajustes, compreendendo refinamentos visuais, reorganização, inclusão ou remoção de seções existentes e até 2 (duas) páginas institucionais de estrutura semelhante. Concluída a última rodada, ou decorrido o prazo sem apontamentos, ou iniciado o uso público do website pela CONTRATANTE, considera-se o projeto plenamente homologado e aceito tacitamente.',
        '6.2. Garantia de correção de defeitos (12 meses): Pelo prazo de 12 (doze) meses contados da homologação, o CONTRATADO corrigirá, sem custo adicional, os defeitos do código-fonte desenvolvido por ele (falhas reproduzíveis em que um recurso descrito no Anexo I deixa de funcionar nos navegadores suportados, sem intervenção de terceiros). Inclui correção de vulnerabilidade de segurança no código original ou dependências diretas. Garantia complementar à legal.',
        '6.3. Suporte incluído (12 meses): No mesmo período, o CONTRATADO prestará, sem custo adicional, até 2 (duas) horas mensais, não cumulativas, de: (a) orientação sobre o painel administrativo; (b) pequenos ajustes de texto, imagem, link, cor ou ordem de elementos existentes; (c) adaptações pontuais de compatibilidade com versões atuais dos navegadores suportados, sem envolver atualização de versão maior de framework. Demandas excedentes serão previamente orçadas.',
        '6.4. Suporte continuado: Encerrado o período da Cláusula 6.3, o CONTRATADO continuará disponível para suporte e manutenções mediante orçamento avulso por demanda ao valor por hora acordado, reajustado pelo IPCA, ou plano mensal contratado por escrito. O CONTRATADO poderá encerrar o suporte continuado mediante aviso prévio de 60 dias, entregando código-fonte, credenciais e documentação para transição.',
        '6.5. Demandas fora dos itens acima: Toda demanda não prevista expressamente nas Cláusulas 6.1 a 6.3 será orçada previamente por escrito e somente executada após formal aceite da CONTRATANTE.',
        '6.6. Atendimento: Pedidos pelos canais oficiais da Cláusula 1. Primeira resposta em até 2 (dois) dias úteis (segunda a sexta, das 9h às 18h, exceto feriados nacionais e do DF). Defeito crítico que deixe o site público fora do ar terá início de atendimento prioritário em até 1 (um) dia útil. O suporte não constitui plantão 24h, sobreaviso ou prazo garantido de solução.',
        '6.7. Natureza e extinção: Obrigações de meio quanto à infraestrutura de terceiros, e de resultado quanto aos defeitos da Cláusula 6.2. Extinguem-se por morte ou incapacidade permanente do CONTRATADO (Código Civil, art. 607), preservados os direitos da Cláusula 13.',
      ],
    },
    {
      num: 'CLÁUSULA 07 — DOS SERVIÇOS NÃO INCLUÍDOS',
      paragraphs: [
        '7.1. Estão incluídos na garantia e suporte exclusivamente os itens da Cláusula 6. São considerados serviços novos sujeitos a orçamento e aceite prévio, entre outros: novas funcionalidades ou módulos (pagamentos online, checkout transparente, área de membros, assinaturas, agendamentos, newsletters, CRM, pixels); redesign estrutural ou alteração de identidade visual após homologação; upgrades de versão maior de framework (Next.js/React) e migrações de plataforma; adaptações por mudanças unilaterais de serviços de terceiros que excedam a Cl. 6.3; apps móveis nativos; transmissão massiva de vídeos pesados; inserção massiva de conteúdo em lote; recuperação de dados apagados pela CONTRATANTE; consultoria de marketing ou suporte a equipamentos pessoais.',
        '7.2. A não contratação de serviços novos não afeta a vigência da garantia e do suporte da Cláusula 6.',
      ],
    },
    {
      num: 'CLÁUSULA 08 — DAS EXCLUDENTES DE GARANTIA E SUPORTE',
      paragraphs: [
        '8.1. Não estão cobertos pela garantia nem pelo suporte incluído os problemas causados por: ação ou omissão da CONTRATANTE ou pessoas com acesso (exclusão de arquivos, uploads fora dos limites, alteração de DNS ou configurações); alterações no código ou infraestrutura feitas por terceiros; falhas ou mudanças de regras unilaterais de terceiros (Cloudflare, Registro.br, YouTube, redes sociais); caso fortuito ou força maior (CC art. 393), inclusive ataques em escala; e uso em desacordo com o Anexo I.',
        '8.2. A contratação de outro profissional pela CONTRATANTE é livre, cessando a garantia sobre as partes alteradas por terceiros e seus efeitos.',
      ],
    },
    {
      num: 'CLÁUSULA 09 — DO DOMÍNIO, DAS CONTAS E DOS SERVIÇOS DE TERCEIROS',
      paragraphs: [
        '9.1. O preço pactuado remunera unicamente os serviços do CONTRATADO, não incluindo anuidades de domínio, planos pagos de hospedagem ou ferramentas terceiras.',
        '9.2. O domínio e as contas em nuvem (Cloudflare Pages, KV e R2) devem pertencer à CONTRATANTE, figurando o CONTRATADO com acesso técnico revogável a qualquer tempo. Contas sob titularidade provisória do CONTRATADO serão transferidas à CONTRATANTE em até 10 dias úteis quando solicitado.',
        '9.3. O website opera em planos gratuitos com limites operacionais (Anexo I, item 09). Se o crescimento de tráfego exigir plano pago, os custos serão submetidos à CONTRATANTE. Caso esta não aprove, o CONTRATADO não responderá por eventuais limitações decorrentes.',
        '9.4. Nenhuma despesa será realizada sem aprovação prévia por escrito da CONTRATANTE.',
        '9.5. A preservação de backups originais de fotos, vídeos, textos e músicas é de responsabilidade da CONTRATANTE.',
      ],
    },
    {
      num: 'CLÁUSULA 10 — DAS OBRIGAÇÕES DO CONTRATADO',
      paragraphs: [
        'São obrigações do CONTRATADO: desenvolver e publicar o website conforme o Anexo I; prestar a garantia e o suporte técnico nos estritos termos e prazos da Cláusula 6; manter rigoroso sigilo sobre dados e credenciais (Cláusula 14); cumprir a LGPD (Cláusula 15); comunicar limitações técnicas relevantes; e entregar código-fonte, credenciais e instruções operacionais após a quitação.',
      ],
    },
    {
      num: 'CLÁUSULA 11 — DAS OBRIGAÇÕES DA CONTRATANTE',
      paragraphs: [
        '11.1. Fornecer tempestivamente insumos e aprovações; honrar pontualmente os pagamentos; zelar pelo sigilo de suas senhas com autenticação 2FA; comunicar prontamente inconsistências; e arcar com custos de domínio e serviços previamente aprovados.',
        '11.2. A CONTRATANTE declara e garante que: (a) detém os direitos autorais e autorizações sobre todas as fotos, vídeos, textos, músicas, marcas e imagens fornecidas ou publicadas; (b) todas as pessoas retratadas no acervo são comprovadamente maiores de 18 (dezoito) anos e consentiram expressamente com a divulgação; (c) o conteúdo publicado é lícito e atende aos termos das plataformas utilizadas.',
        '11.3. O CONTRATADO não exerce moderação editorial. A CONTRATANTE responderá integralmente por reclamações de terceiros e ressarcirá o CONTRATADO por eventuais perdas, danos, custas e honorários suportados em razão do conteúdo.',
      ],
    },
    {
      num: 'CLÁUSULA 12 — DA RESPONSABILIDADE CIVIL E LIMITAÇÕES',
      paragraphs: [
        '12.1. O CONTRATADO responde pelos defeitos técnicos nos termos da Cláusula 6, não assumindo garantia de resultados comerciais, vendas, alcance, novos assinantes no OnlyFans ou faturamento.',
        '12.2. A disponibilidade contínua e a segurança da plataforma constituem obrigações de meio, sem garantia de funcionamento ininterrupto ou invulnerabilidade absoluta.',
        '12.3. O CONTRATADO não responde por falhas de infraestrutura de terceiros (Cloudflare, YouTube, registradores), caso fortuito ou força maior (CC art. 393), nem por lucros cessantes ou danos indiretos, salvo dolo ou culpa grave.',
        '12.4. Salvo dolo, culpa grave ou vedação legal, a responsabilidade indenizatória total do CONTRATADO por qualquer evento limita-se ao valor total efetivamente pago pela CONTRATANTE.',
      ],
    },
    {
      num: 'CLÁUSULA 13 — DA PROPRIEDADE INTELECTUAL E CESSÃO',
      paragraphs: [
        '13.1. Os conteúdos fornecidos pela CONTRATANTE (fotos, ensaios, textos, músicas, marca e nome) permanecem sob sua exclusiva propriedade.',
        '13.2. Mediante quitação integral de R$ 2.000,00, o CONTRATADO cede em definitivo à CONTRATANTE os direitos patrimoniais sobre o código-fonte sob medida e o layout desenvolvidos para este projeto, permitindo uso, alteração e hospedagem livre.',
        '13.3. Componentes genéricos, ferramentas e rotinas reutilizáveis desenvolvidas independentemente permanecem sob titularidade do CONTRATADO, concedendo-se à CONTRATANTE licença perpétua e gratuita para uso neste website. O layout e identidade visual exclusivos não serão reutilizados em outros clientes.',
        '13.4. Módulos open-source permanecem regidos por suas respectivas licenças.',
        '13.5. Fica resguardado ao CONTRATADO o direito moral de ser indicado como autor técnico do software (Lei 9.609/98, art. 2º, §1º), podendo a CONTRATANTE remover o crédito do rodapé se desejar.',
      ],
    },
    {
      num: 'CLÁUSULA 14 — DA CONFIDENCIALIDADE',
      paragraphs: [
        '14.1. As partes obrigam-se a manter rigoroso sigilo acerca de quaisquer informações confidenciais, dados de visitantes, credenciais, estratégias e código-fonte, durante a vigência e por 5 (cinco) anos após o término (indeterminado para credenciais e senhas).',
        '14.2. É autorizada a revelação estritamente exigida por lei ou ordem judicial, com aviso prévio à outra parte quando viável.',
      ],
    },
    {
      num: 'CLÁUSULA 15 — DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)',
      paragraphs: [
        '15.1. Quanto aos dados pessoais de visitantes coletados através do portal, a CONTRATANTE atua como Controladora e o CONTRATADO como Operador (Lei nº 13.709/2018), tratando-os para fins de hospedagem, segurança e estatísticas do site conforme orientações da Controladora.',
        '15.2. A CONTRATANTE autoriza expressamente o CONTRATADO a acessar os registros de telemetria técnica e logs de auditoria exclusivamente para segurança, diagnóstico e suporte, fato informado na Política de Privacidade.',
        '15.3. A Cloudflare atua como suboperadora de rede global. A Política de Privacidade refletirá com fidelidade a retenção de logs de auditoria e IP por até 6 (seis) meses para garantia da segurança.',
        '15.4. O CONTRATADO comunicará qualquer incidente relevante de dados em até 2 (dois) dias úteis da ciência.',
        '15.5. Ao término, os dados pessoais mantidos fora das contas da CONTRATANTE serão eliminados, ressalvadas as hipóteses legais de conservação.',
      ],
    },
    {
      num: 'CLÁUSULA 16 — DO DIREITO DE PORTFÓLIO',
      paragraphs: [
        '16.1. O CONTRATADO fica autorizado a mencionar a autoria técnica e a exibir capturas de tela do website em seu portfólio profissional, resguardando-se fotos íntimas ou sensuais, credenciais, dados de visitantes ou dados financeiros.',
        '16.2. A CONTRATANTE poderá solicitar motivadamente a substituição ou retirada de capturas que contenham sua imagem, preservada a menção à autoria técnica.',
      ],
    },
    {
      num: 'CLÁUSULA 17 — DA EXTINÇÃO DO CONTRATO',
      paragraphs: [
        '17.1. Resilição durante o desenvolvimento: Notificação prévia de 15 dias corridos. Valores devidos apurados proporcionalmente: até aprovação de layout, 30%; até disponibilização para homologação, 80%; após homologação, 100% do preço.',
        '17.2. Resolução por inadimplemento: Descumprimento não sanado em 10 dias após notificação autoriza a resolução de pleno direito (CC art. 474), com apuração de perdas e danos comprovados (art. 475).',
        '17.3. Garantia e suporte: Homologado o projeto, o CONTRATADO não poderá rescindir imotivadamente a garantia de defeitos (Cl. 6.2) nem o suporte incluído (Cl. 6.3) antes de 12 meses. O suporte continuado posterior segue aviso de 60 dias.',
        '17.4. Efeitos: Em até 10 dias úteis e quitadas as parcelas vencidas, o CONTRATADO entregará código-fonte, credenciais e mídias, com até 2 horas de transição técnica a outro profissional. Vedada a retenção de arquivos como cobrança coercitiva.',
        '17.5. Morte ou incapacidade permanente extingue obrigações personalíssimas de fazer (CC art. 607), preservada a Cláusula 13.',
      ],
    },
    {
      num: 'CLÁUSULA 18 — DA SEGURANÇA E ACESSOS',
      paragraphs: [
        '18.1. O CONTRATADO adotou as medidas técnicas descritas no Anexo I e corrigirá vulnerabilidades no código original durante a garantia de 12 meses, sem promessa de invulnerabilidade absoluta.',
        '18.2. A CONTRATANTE é a única responsável pela guarda de suas senhas, 2FA obrigatório e segurança de seus dispositivos, não respondendo o CONTRATADO por senhas fracas, repasse de credenciais, phishing ou malwares na ponta da usuária.',
      ],
    },
    {
      num: 'CLÁUSULA 19 — DAS DISPOSIÇÕES GERAIS',
      paragraphs: [
        '19.1. Toda alteração será formalizada por aditivo escrito e assinado, inclusive pelo meio de aceite eletrônico da Cláusula 19.4.',
        '19.2. Notificações, solicitações de suporte e orçamentos são válidos pelos e-mails e números de WhatsApp oficiais da Cláusula 1.',
        '19.3. Cláusula de Substituição Integral: O presente instrumento (Versão Definitiva 1.1) substitui, revoga e cancela integralmente todas as versões, minutas, arquivos PDF anteriores, termos de entrega e entendimentos prévios sobre o mesmo objeto.',
        '19.4. Validade do Aceite Eletrônico: As partes reconhecem expressamente como válido e eficaz, nos termos do art. 10, §2º da MP nº 2.200-2/2001 e da Lei nº 14.063/2020, o aceite eletrônico colhido na página digital do contrato com data/hora, IP, user-agent e hash SHA-256 do documento.',
        '19.5. A tolerância não implicará novação. A nulidade de disposição não contamina as demais (CC art. 184). Inexistência de vínculo empregatício ou exclusividade comercial.',
      ],
    },
    {
      num: 'CLÁUSULA 20 — DO FORO',
      paragraphs: [
        'Para dirimir eventuais litígios oriundos deste contrato, as partes elegem expressamente o Foro da Circunscrição Judiciária de Brasília/DF, ressalvada à CONTRATANTE a faculdade de demandar no foro de seu domicílio caso reste configurada relação de consumo.',
      ],
    },
  ];

  for (const clause of clauses) {
    // Evita título órfão no final da página
    checkNewPage(65);

    // Faixa elegante do título da cláusula
    doc.setFillColor(245, 245, 247);
    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(24, 24, 27);
    doc.text(clause.num, margin + 8, y + 12);
    y += 24;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(55, 65, 81);

    for (const p of clause.paragraphs) {
      const splitP = doc.splitTextToSize(p, contentWidth);
      checkNewPage(splitP.length * 11 + 6);
      doc.text(splitP, margin, y);
      y += splitP.length * 11 + 4;
    }

    if (clause.hasTable) {
      checkNewPage(120);

      autoTable(doc, {
        startY: y + 2,
        margin: { left: margin, right: margin },
        head: [['Condição Financeira', 'Detalhamento dos Prazos e Obrigações', 'Valor (R$)']],
        body: [
          ['Valor Global do Projeto', 'Desenvolvimento, publicação, homologação e suporte inicial', 'R$ 2.000,00'],
          ['Plano de Pagamento', '10 (dez) parcelas mensais, iguais e sucessivas de R$ 200,00', '10x R$ 200,00'],
          ['Forma de Quitação', 'Chave PIX do CONTRATADO ou transferência bancária acordada', 'À vista da parcela'],
          ['Primeiro Vencimento', '04 de outubro de 2026 (04/10/2026)', '1ª Parcela: R$ 200,00'],
          ['Parcelas Subsequentes', 'Todo dia 04 dos meses subsequentes até quitação integral', 'Demais: R$ 200,00/mês'],
        ],
        theme: 'plain',
        headStyles: {
          fillColor: [240, 240, 243],
          textColor: [24, 24, 27],
          fontStyle: 'bold',
          fontSize: 7.5,
          cellPadding: 4.5,
        },
        bodyStyles: {
          textColor: [55, 65, 81],
          fontSize: 7.5,
          cellPadding: 4,
          lineColor: [230, 230, 235],
          lineWidth: 0.5,
        },
        columnStyles: {
          0: { cellWidth: 120, fontStyle: 'bold' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 95, halign: 'right', fontStyle: 'bold' },
        },
      });

      // @ts-expect-error lastAutoTable is injected by jspdf-autotable
      y = doc.lastAutoTable.finalY + 8;

      if (clause.afterTableParagraphs) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(55, 65, 81);
        for (const p of clause.afterTableParagraphs) {
          const splitP = doc.splitTextToSize(p, contentWidth);
          checkNewPage(splitP.length * 11 + 6);
          doc.text(splitP, margin, y);
          y += splitP.length * 11 + 4;
        }
      }
    }

    y += 6;
  }

  // === SEÇÃO DE FECHO E ASSINATURAS ===
  checkNewPage(190);
  y += 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(24, 24, 27);
  doc.text('Brasília/DF — República da Irlanda, 2026.', margin, y);
  y += 13;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 110);
  const fechoText =
    'E, por estarem assim justas e contratadas, as partes firmam o presente instrumento por meio de assinatura eletrônica qualificada, produzindo todos os efeitos jurídicos e legais.';
  const splitFecho = doc.splitTextToSize(fechoText, contentWidth);
  doc.text(splitFecho, margin, y);
  y += splitFecho.length * 11 + 35;

  const sigColWidth = (contentWidth - 28) / 2;
  const col1X = margin;
  const col2X = margin + sigColWidth + 28;

  // Imagens das Rubricas
  if (signatures?.contractor?.signatureDataUrl) {
    try {
      doc.addImage(signatures.contractor.signatureDataUrl, 'PNG', col1X + 25, y - 38, 100, 32);
    } catch {}
  }
  if (signatures?.client?.signatureDataUrl) {
    try {
      doc.addImage(signatures.client.signatureDataUrl, 'PNG', col2X + 25, y - 38, 100, 32);
    } catch {}
  }

  // Linhas de Assinatura
  doc.setDrawColor(180, 180, 186);
  doc.setLineWidth(0.8);
  doc.line(col1X, y, col1X + sigColWidth, y);
  doc.line(col2X, y, col2X + sigColWidth, y);
  y += 12;

  // Nome e Qualificação
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(24, 24, 27);
  doc.text('JOÃO PHILIPPE DE OLIVEIRA BOECHAT', col1X, y);
  doc.text('NAYARA BORGES DA COSTA', col2X, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(82, 82, 91);
  doc.text('CONTRATADO — Desenvolvedor Web', col1X, y);
  doc.text('CONTRATANTE — "Nua Borges"', col2X, y);
  y += 9;
  doc.text('CPF: 053.795.071-07 · Tel: (61) 99361-9554', col1X, y);
  doc.text('CPF: 0832051073 · WhatsApp: 0832051073', col2X, y);
  y += 9;
  doc.text('E-mail: philippeboechat1@gmail.com', col1X, y);
  doc.text('E-mail: nua@nuaborges', col2X, y);

  // Cards de Auditoria Digital Criptográfica
  if (signatures?.contractor?.signedAt || signatures?.client?.signedAt) {
    y += 14;
    const certBoxHeight = 44;

    if (signatures?.contractor?.signedAt) {
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
      doc.setLineWidth(0.6);
      doc.roundedRect(col1X, y, sigColWidth, certBoxHeight, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(22, 101, 52);
      doc.text('[✓] ASSINADO ELETRONICAMENTE', col1X + 8, y + 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(75, 85, 99);
      const dt = new Date(signatures.contractor.signedAt).toLocaleString('pt-BR');
      doc.text(`Carimbo: ${dt}`, col1X + 8, y + 21);
      if (signatures.contractor.ip) {
        doc.text(`IP: ${signatures.contractor.ip}`, col1X + 8, y + 30);
      }
      if (signatures.contractor.certificateHash) {
        doc.text(`Cert: ${signatures.contractor.certificateHash.slice(0, 24)}...`, col1X + 8, y + 39);
      }
    }

    if (signatures?.client?.signedAt) {
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
      doc.setLineWidth(0.6);
      doc.roundedRect(col2X, y, sigColWidth, certBoxHeight, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(22, 101, 52);
      doc.text('[✓] ASSINADO ELETRONICAMENTE', col2X + 8, y + 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(75, 85, 99);
      const dt = new Date(signatures.client.signedAt).toLocaleString('pt-BR');
      doc.text(`Carimbo: ${dt}`, col2X + 8, y + 21);
      if (signatures.client.ip) {
        doc.text(`IP: ${signatures.client.ip}`, col2X + 8, y + 30);
      }
      if (signatures.client.certificateHash) {
        doc.text(`Cert: ${signatures.client.certificateHash.slice(0, 24)}...`, col2X + 8, y + 39);
      }
    }
  }

  // === RODAPÉS E CABEÇALHOS PERIÓDICOS ===
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Cabeçalho da página 2 em diante
    if (i > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 170);
      doc.text('PROJETO NUA BORGES — CONTRATO DE PRESTAÇÃO DE SERVIÇOS', margin, 30);
      doc.setDrawColor(228, 228, 231);
      doc.setLineWidth(0.5);
      doc.line(margin, 34, pageWidth - margin, 34);
    }

    // Rodapé em todas as páginas
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 170);
    doc.text('Documento Eletrônico Confidencial · Registro Criptográfico em Nuvem', margin, pageHeight - 24);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 24, { align: 'right' });
    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 32, pageWidth - margin, pageHeight - 32);
  }

  return doc;
}

export function downloadContractPdf(signatures?: {
  contractor?: ContractSignatureData | null;
  client?: ContractSignatureData | null;
}) {
  const doc = buildContractPdfDoc(signatures);
  doc.save('Contrato_Desenvolvimento_Web_Nua_Borges.pdf');
}

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
        '• Armazenamento: Cloudflare R2 Object Storage (armazenamento de fotos e mídias sem cobrança de tráfego de saída);',
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
        '• Recursos Adicionais Entregues por Liberalidade: Blog autoral com leitor de artigos; módulo de perguntas anônimas ("Asks"); gravador de vídeo vertical com teleprompter integrado; páginas institucionais de Termos de Uso e Política de Privacidade; e painel técnico de auditoria e estatísticas (Cláusula 15.2).',
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
