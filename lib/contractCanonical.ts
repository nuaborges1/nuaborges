/**
 * Módulo Canônico do Contrato Nua Borges — Versão Definitiva 1.1 (2026)
 *
 * Fonte ÚNICA de verdade jurídica e técnica para:
 * - Visualização no navegador (/contrato)
 * - Geração de PDF oficial (/lib/generateContractPdf.ts)
 * - Auditoria e validação de assinaturas eletrônicas (/api/contract/sign)
 * - Termo de entrega e aceite técnico
 *
 * Validade nos termos da MP nº 2.200-2/2001 e Lei nº 14.063/2020.
 */

export const CONTRACT_VERSION = '1.1';
export const CONTRACT_DOC_ID = 'NUA-BORGES-CONTRATO-DESENVOLVIMENTO-V1.1-2026';
export const CONTRACT_DATE = '04/10/2026';

export const CONTRACTOR_INFO = {
  name: 'João Philippe de Oliveira Boechat',
  role: 'CONTRATADO — Desenvolvedor Web',
  nationality: 'brasileiro',
  maritalStatus: 'solteiro',
  profession: 'desenvolvedor web',
  rg: '3.755.968',
  cpf: '053.795.071-07',
  cpfClean: '05379507107',
  address: 'Ceilândia, Brasília/DF',
  email: 'philippeboechat1@gmail.com',
  phone: '(61) 99361-9554',
  pixKey: '05379507107',
} as const;

export const CLIENT_INFO = {
  name: 'Nayara Borges da Costa',
  artisticName: 'Nua Borges',
  role: 'CONTRATANTE — "Nua Borges"',
  nationality: 'brasileira',
  maritalStatus: 'casada',
  cpfFormatted: '083.205.107-30',
  cpfClean: '08320510730',
  address: 'República da Irlanda',
  email: 'nua@nuaborges.com',
  phone: '+353 83 205 1073',
} as const;

export const CONTRACT_FINANCIAL = {
  totalValue: 'R$ 2.000,00',
  totalValueWords: 'dois mil reais',
  installmentsCount: 10,
  installmentValue: 'R$ 200,00',
  installmentValueWords: 'duzentos reais',
  firstDueDate: '04/10/2026',
  dueDayEveryMonth: 4,
  installments: [
    { number: '1ª Parcela', dueDate: '04/10/2026', value: 'R$ 200,00' },
    { number: '2ª Parcela', dueDate: '04/11/2026', value: 'R$ 200,00' },
    { number: '3ª Parcela', dueDate: '04/12/2026', value: 'R$ 200,00' },
    { number: '4ª Parcela', dueDate: '04/01/2027', value: 'R$ 200,00' },
    { number: '5ª Parcela', dueDate: '04/02/2027', value: 'R$ 200,00' },
    { number: '6ª Parcela', dueDate: '04/03/2027', value: 'R$ 200,00' },
    { number: '7ª Parcela', dueDate: '04/04/2027', value: 'R$ 200,00' },
    { number: '8ª Parcela', dueDate: '04/05/2027', value: 'R$ 200,00' },
    { number: '9ª Parcela', dueDate: '04/06/2027', value: 'R$ 200,00' },
    { number: '10ª Parcela', dueDate: '04/07/2027', value: 'R$ 200,00' },
  ],
} as const;

export interface CanonicalClause {
  num: string;
  title: string;
  fullTitle: string;
  highlight?: boolean;
  paragraphs: string[];
  hasTable?: boolean;
  afterTableParagraphs?: string[];
  note?: {
    text: string;
    variant?: 'neutral' | 'warning' | 'positive';
  };
}

export const CANONICAL_CLAUSES: CanonicalClause[] = [
  {
    num: '01',
    title: 'Das Partes',
    fullTitle: 'CLÁUSULA 01 — DAS PARTES',
    highlight: true,
    paragraphs: [
      `CONTRATADO: ${CONTRACTOR_INFO.name}, ${CONTRACTOR_INFO.nationality}, ${CONTRACTOR_INFO.maritalStatus}, ${CONTRACTOR_INFO.profession}, portador do RG nº ${CONTRACTOR_INFO.rg} e CPF nº ${CONTRACTOR_INFO.cpf}, residente e domiciliado em ${CONTRACTOR_INFO.address}, e-mail: ${CONTRACTOR_INFO.email}, WhatsApp: ${CONTRACTOR_INFO.phone}.`,
      `CONTRATANTE: ${CLIENT_INFO.name}, conhecida profissionalmente como "${CLIENT_INFO.artisticName}", ${CLIENT_INFO.nationality}, ${CLIENT_INFO.maritalStatus}, portadora do CPF/Doc nº ${CLIENT_INFO.cpfFormatted}, residente e domiciliada na ${CLIENT_INFO.address}, e-mail oficial: ${CLIENT_INFO.email}, WhatsApp internacional: ${CLIENT_INFO.phone}.`,
      'Parágrafo Único: Os e-mails e números de WhatsApp acima constituem os canais oficiais de comunicação e notificação das partes para todos os fins deste contrato (Cláusula 19).',
    ],
  },
  {
    num: '02',
    title: 'Do Objeto',
    fullTitle: 'CLÁUSULA 02 — DO OBJETO',
    paragraphs: [
      '2.1. O objeto deste contrato é o desenvolvimento, a publicação e a homologação do website do projeto "Nua Borges", com o respectivo painel administrativo (CMS), exatamente conforme o Anexo I — Memorial Descritivo e Escopo Técnico-Funcional, bem como a prestação da garantia e do suporte nos estritos limites da Cláusula 6.',
      '2.2. Quaisquer alterações de escopo dependem de solicitação escrita da CONTRATANTE e de aceite do CONTRATADO, com orçamento específico quando excederem o previsto na Cláusula 6.',
      '2.3. O layout e a identidade visual são exclusivos do projeto. Componentes genéricos, ferramentas, técnicas e bibliotecas seguem a disciplina da Cláusula 13.',
    ],
  },
  {
    num: '03',
    title: 'Do Escopo do Projeto',
    fullTitle: 'CLÁUSULA 03 — DO ESCOPO DO PROJETO',
    paragraphs: [
      'O projeto contratado compreende exatamente os seguintes módulos e recursos:',
      'I — Site público: Adaptação a celulares, tablets e computadores nos navegadores suportados indicados no Anexo I; página inicial com seção capa (Hero) em carrossel fotográfico editorial; galeria de ensaios com esteira contínua infinita e visualizador lightbox em tela cheia; seção Sobre Mim / Manifesto com retrato autoral, pull quote e assinatura artística; seção de canais oficiais e redes sociais parametrizadas; modal de contato comercial com formulário e redirecionamento de e-mail; player musical editorial híbrido (YouTube + MP3); cabeçalho fixo responsivo com menu drawer mobile; rodapé institucional com créditos da marca; animações e microinterações conforme layout aprovado; otimizações de desempenho e carregamento em rede global; SEO técnico básico e marcação Open Graph.',
      'II — Painel administrativo (CMS): Edição de textos e fotos da capa; biblioteca de mídia com upload direto de arquivos e compressão automática; gerenciamento da galeria conforme Anexo I (Aba 3); alteração dinâmica de links e canais oficiais; gerenciamento da playlist musical; configuração de SEO e Open Graph; alteração de senha mestra do painel.',
      'Parágrafo Primeiro: O detalhamento técnico exaustivo das funcionalidades consta no Anexo I, parte integrante e indissociável deste instrumento.',
      'Parágrafo Segundo: Os recursos adicionais disponibilizados por mera liberalidade do CONTRATADO (módulo de perguntas "Asks", gravador de vídeo vertical com teleprompter, páginas institucionais de Termos de Uso e Política de Privacidade e painel técnico de auditoria) integram o website e são entregues estritamente "no estado em que se encontram" (as is), sem cobertura pela garantia de 12 (doze) meses (Cláusula 6.2) e sem obrigação de suporte técnico incluído (Cláusula 6.3), ressalvada unicamente a correção de eventuais vulnerabilidades críticas de segurança originadas no código desenvolvido pelo CONTRATADO. A CONTRATANTE declara-se ciente de que é a única e exclusiva responsável pelo monitoramento, moderação, triagem e respostas às mensagens recebidas no módulo "Asks", isentando integralmente o CONTRATADO de qualquer responsabilidade civil, administrativa ou criminal referente a tais conteúdos.',
    ],
  },
  {
    num: '04',
    title: 'Do Valor e da Forma de Pagamento',
    fullTitle: 'CLÁUSULA 04 — DO VALOR E DA FORMA DE PAGAMENTO',
    paragraphs: [
      `4.1. Pelo desenvolvimento, publicação, homologação e garantia técnica (Cláusula 6.2), a CONTRATANTE pagará ao CONTRATADO o valor total de ${CONTRACT_FINANCIAL.totalValue} (${CONTRACT_FINANCIAL.totalValueWords}), dividido em ${CONTRACT_FINANCIAL.installmentsCount} (dez) parcelas mensais e sucessivas de ${CONTRACT_FINANCIAL.installmentValue} (${CONTRACT_FINANCIAL.installmentValueWords}), vencendo-se a primeira em ${CONTRACT_FINANCIAL.firstDueDate} e as demais no dia 04 dos meses subsequentes, por transferência PIX para a chave do CONTRATADO (CPF: ${CONTRACTOR_INFO.cpfClean} / ${CONTRACTOR_INFO.cpf}) ou outro meio acordado por escrito.`,
    ],
    hasTable: true,
    afterTableParagraphs: [
      '4.2. Em caso de atraso, incidirão sobre o valor da parcela em atraso: multa moratória de 2% (dois por cento); juros de mora de 1% (um por cento) ao mês (pro rata die), ou o máximo legal, se inferior; e atualização monetária pelo índice oficial IPCA/IBGE.',
      '4.3. O atraso no pagamento de qualquer parcela superior a 15 (quinze) dias corridos, contados da notificação escrita enviada pelos canais oficiais (Cláusula 1), autoriza o CONTRATADO a suspender as atividades de suporte técnico, novas demandas, manutenções evolutivas e o seu respectivo acesso técnico de gestão às contas e infraestruturas do projeto. A suspensão limita-se estritamente à prestação de serviços do CONTRATADO, permanecendo inalterada a titularidade originária das contas e domínios da CONTRATANTE (Cláusula 9.2), sendo vedada a adoção de medidas coercitivas de desativação arbitrária de infraestrutura externa ou retenção de arquivos e dados de propriedade da CONTRATANTE (Cláusula 17.4).',
      '4.4. Atraso superior a 30 (trinta) dias, não sanado em 10 (dez) dias após notificação escrita, autoriza o CONTRATADO a considerar vencidas antecipadamente todas as parcelas vincendas e/ou a resolver o contrato de pleno direito (Cláusula 17.2).',
      '4.5. Pagamentos com origem no exterior: O valor deste contrato foi convencionado em moeda corrente nacional brasileira (Reais — BRL). Caso a CONTRATANTE opte por efetuar o pagamento de qualquer parcela por meio diverso do arranjo PIX (tais como remessa internacional de câmbio, plataformas como Wise, transferências bancárias internacionais ou cartão internacional), todas as taxas de envio e intermediação bancária, tarifas de liquidação, tributos incidentes (inclusive IOF) e diferenciais de spread e câmbio correrão por sua exclusiva conta. Caberá à CONTRATANTE emitir a remessa no montante bruto necessário para assegurar que o valor líquido creditado na conta bancária do CONTRATADO seja de exatamente R$ 200,00 (duzentos reais) por parcela.',
    ],
  },
  {
    num: '05',
    title: 'Do Prazo de Entrega e da Homologação',
    fullTitle: 'CLÁUSULA 05 — DO PRAZO DE ENTREGA E DA HOMOLOGAÇÃO',
    paragraphs: [
      '5.1. O CONTRATADO desenvolverá e disponibilizará o website para homologação pela CONTRATANTE no prazo de até 3 (três) meses contados da data de assinatura deste instrumento, mediante comunicação formal por escrito enviada pelos canais oficiais previstos na Cláusula 1. O prazo de homologação de 10 (dez) dias úteis (Cláusula 6.1) terá início na data do envio dessa comunicação. A contagem do prazo da garantia técnica de 12 (doze) meses (Cláusula 6.2), do suporte incluído (Cláusula 6.3) e a caracterização de eventual aceite tácito por uso público (Cláusula 6.1) operam-se estritamente após a referida comunicação de disponibilização. O prazo de 3 (três) meses prorroga-se automaticamente, sem caracterizar mora, penalidade ou inadimplemento do CONTRATADO: (a) pelo atraso da CONTRATANTE no fornecimento de insumos, materiais, respostas, aprovações ou pagamento das parcelas vencidas (Cláusula 5.2); (b) pela solicitação de alterações de escopo demandadas pela CONTRATANTE (Cláusulas 2.2 e 7.1); e (c) por motivo de caso fortuito ou força maior (Código Civil, art. 393). O descumprimento do prazo de entrega pelo CONTRATADO somente caracterizará mora após regular notificação escrita enviada pela CONTRATANTE e concessão de prazo de 15 (quinze) dias corridos para saneamento.',
      '5.2. Atrasos no fornecimento de insumos ou nas respostas da CONTRATANTE prorrogam proporcionalmente o cronograma, sem caracterizar mora do CONTRATADO.',
      '5.3. A homologação ocorre estritamente na forma da Cláusula 6.1, a partir da efetiva disponibilização do website comunicada nos termos da Cláusula 5.1, iniciando a contagem dos prazos das Cláusulas 6.2 e 6.3.',
    ],
  },
  {
    num: '06',
    title: 'Da Homologação, da Garantia e do Suporte',
    fullTitle: 'CLÁUSULA 06 — DA HOMOLOGAÇÃO, DA GARANTIA E DO SUPORTE',
    highlight: true,
    paragraphs: [
      '6.1. Período de ajustes e homologação: Disponibilizado o website para homologação nos termos da Cláusula 5.1, a CONTRATANTE terá 10 (dez) dias úteis para apresentar, em lista única e por escrito, os ajustes desejados dentro do escopo do Anexo I. Estão incluídas até 2 (duas) rodadas de ajustes, compreendendo refinamentos visuais, reorganização, inclusão ou remoção de seções existentes e até 2 (duas) páginas institucionais de estrutura semelhante às já existentes. Para os fins deste contrato, define-se "página institucional de estrutura semelhante" como página estática composta exclusivamente por textos e imagens, estruturada com o reaproveitamento de componentes e estilos já existentes no projeto, sem criação de nova funcionalidade, sem nova aba, seção ou fluxo de edição no painel administrativo (CMS), sem integração com serviços externos ou APIs de terceiros e sem novo formulário dinâmico. Quaisquer pedidos que extrapolem essa definição, bem como quaisquer demandas solicitadas antes ou durante a homologação que fujam das especificações expressas no Anexo I, constituem alteração de escopo (Cláusulas 2.2 e 7.1), exigindo prévio orçamento e aprovação escrita para execução. Concluída a última rodada de ajustes, ou decorrido o prazo sem apontamentos, ou iniciado o uso público do website pela CONTRATANTE após a comunicação da Cláusula 5.1, o projeto será considerado plenamente homologado e aceito tacitamente. Ajustes posteriores seguirão as Cláusulas 6.3 a 6.5.',
      '6.2. Garantia de correção de defeitos — 12 (doze) meses: Pelo prazo de 12 (doze) meses contados da homologação formal ou tácita ocorrida após a disponibilização formal prevista na Cláusula 5.1, o CONTRATADO corrigirá, sem custo adicional, os defeitos do código-fonte desenvolvido por ele, assim entendidos as falhas reproduzíveis em que um recurso descrito no Anexo I deixa de funcionar como descrito, nos navegadores e sistemas suportados (Anexo I, item 09), sem que a causa seja uma das hipóteses da Cláusula 8. Inclui a correção de vulnerabilidade de segurança identificada no código original ou em suas dependências diretas, quando houver atualização compatível disponível. Esta garantia é complementar à garantia legal.',
      '6.3. Suporte incluído — 12 (doze) meses: No mesmo período, o CONTRATADO prestará, sem custo adicional, até 2 (duas) horas mensais, não cumulativas, de: (a) orientação sobre o uso do painel administrativo; (b) pequenos ajustes de texto, imagem, link, cor ou ordem de elementos já existentes; (c) adaptações pontuais de compatibilidade com versões atuais dos navegadores suportados, desde que não exijam atualização de versão maior de framework ou migração de plataforma. Demandas excedentes serão previamente orçadas (Cláusula 6.5).',
      '6.4. Suporte continuado: Encerrado o período da Cláusula 6.3, o CONTRATADO continuará disponível para correções, manutenção e ajustes, mediante orçamento avulso por demanda ao valor por hora acordado entre as partes, reajustado anualmente pelo IPCA, ou mediante plano mensal que as partes venham a contratar por escrito. O CONTRATADO poderá deixar de oferecer o suporte continuado mediante aviso prévio de 60 (sessenta) dias, entregando à CONTRATANTE código-fonte atualizado, credenciais e documentação básica, de modo que outro profissional possa assumir a sustentação do website.',
      '6.5. Demandas fora dos itens acima: Toda demanda não prevista expressamente nas Cláusulas 6.1 a 6.3 será orçada previamente por escrito e somente executada após formal aceite da CONTRATANTE. Sem aprovação do orçamento, o CONTRATADO não terá obrigação de executá-la.',
      '6.6. Atendimento: Solicitações serão encaminhadas pelos canais oficiais da Cláusula 1, com descrição objetiva do problema e capturas de tela. Primeira resposta em até 2 (dois) dias úteis (segunda a sexta, das 9h às 18h, horário de Brasília, exceto feriados nacionais e do Distrito Federal). Pequenos ajustes da franquia mensal (Cláusula 6.3) serão executados com prazo estimado informado na primeira resposta, habitualmente em até 5 (cinco) dias úteis conforme complexidade. Defeito crítico que deixe o website público fora do ar, quando causado pelo código do CONTRATADO, terá início de atendimento prioritário em até 1 (um) dia útil e empenho contínuo e diligente até o pronto restabelecimento do serviço. O suporte não constitui regime de plantão 24 horas, sobreaviso ou prazo garantido pré-fixado de solução, empregando o CONTRATADO diligência compatível com a complexidade técnica.',
      '6.7. Natureza e extinção: A garantia e o suporte constituem obrigações de meio quanto à disponibilidade de serviços e infraestruturas de terceiros, e de resultado apenas quanto à correção dos defeitos técnicos definidos na Cláusula 6.2. Extinguem-se pela morte ou incapacidade permanente do CONTRATADO (Código Civil, art. 607), conservando a CONTRATANTE todos os direitos de propriedade intelectual da Cláusula 13.',
    ],
  },
  {
    num: '07',
    title: 'Dos Serviços Não Incluídos',
    fullTitle: 'CLÁUSULA 07 — DOS SERVIÇOS NÃO INCLUÍDOS',
    highlight: true,
    paragraphs: [
      '7.1. Estão incluídos na garantia e no suporte contratado exclusivamente os itens previstos na Cláusula 6. São considerados serviços novos, sujeitos a orçamento e aceite prévio, entre outros:',
      '• Novas funcionalidades, páginas, módulos ou integrações externas (sistema próprio de pagamentos online, checkout transparente, integração com gateways de cartão ou PIX automatizado, área de membros restrita com controle de assinantes, agendamentos, newsletters, CRM, ferramentas de analytics avançadas e pixels);',
      '• Redesign estrutural, total ou parcial, ou alteração da identidade visual após a homologação definitiva;',
      '• Atualização de versão maior de framework e bibliotecas (ex.: upgrades principais de Next.js ou React) e migrações de plataforma ou de provedor de hospedagem;',
      '• Adaptações exigidas por descontinuação ou mudanças de regras unilaterais de serviços de terceiros (Cloudflare, YouTube, Registro.br, redes sociais, navegadores ou sistemas operacionais) que excedam o suporte da Cláusula 6.3, "c";',
      '• Desenvolvimento de aplicativos móveis nativos para publicação nas lojas Google Play Store ou Apple App Store;',
      '• Infraestrutura própria para transmissão e hospedagem massiva de vídeos pesados de streaming;',
      '• Produção, edição, gravação ou inserção massiva de conteúdos em lote;',
      '• Recuperação de dados ou mídias apagadas acidentalmente pela CONTRATANTE ou por terceiros;',
      '• Consultoria de marketing, gestão de tráfego, SEO avançado além do básico, ou suporte a equipamentos e contas pessoais da CONTRATANTE.',
      '7.2. A não contratação de serviços adicionais não afeta a vigência da garantia e do suporte da Cláusula 6 em relação ao website original homologado.',
    ],
  },
  {
    num: '08',
    title: 'Das Excludentes de Garantia e Suporte',
    fullTitle: 'CLÁUSULA 08 — DAS EXCLUDENTES DE GARANTIA E SUPORTE',
    highlight: true,
    paragraphs: [
      '8.1. Não estão cobertos pela garantia nem pelo suporte incluído, podendo ser objeto de orçamento de reparo específico, as falhas e inconsistências causadas por:',
      '• Ação ou omissão da CONTRATANTE ou de pessoas a quem ela fornecer credenciais (exclusão ou substituição de arquivos, uploads fora dos limites do Anexo I, alteração de DNS, de configurações ou de planos, ou compartilhamento de senhas);',
      '• Alterações no código-fonte, nos dados ou na infraestrutura realizadas por terceiros, ainda que autorizados pela CONTRATANTE;',
      '• Falhas, indisponibilidades, alterações de regras, limites de cota, preços ou descontinuação de serviços de terceiros (Cloudflare, Registro.br, YouTube, provedores de e-mail, redes sociais), bem como atualizações de navegadores que exijam mais do que a Cláusula 6.3, "c";',
      '• Caso fortuito ou força maior (Código Civil, art. 393), inclusive ataques cibernéticos em escala que superem as medidas de segurança razoáveis adotadas;',
      '• Utilização em desacordo com as instruções do Anexo I ou orientações técnicas do CONTRATADO.',
      '8.2. A contratação de outro profissional pela CONTRATANTE é plenamente livre. Todavia, a garantia cessa imediatamente sobre as partes do código modificadas por terceiros e sobre os efeitos dessas intervenções externas.',
    ],
  },
  {
    num: '09',
    title: 'Do Domínio, das Contas e dos Serviços de Terceiros',
    fullTitle: 'CLÁUSULA 09 — DO DOMÍNIO, DAS CONTAS E DOS SERVIÇOS DE TERCEIROS',
    paragraphs: [
      '9.1. O valor pactuado na Cláusula 4 remunera exclusivamente os serviços de desenvolvimento e suporte do CONTRATADO. Não estão incluídas anuidades de domínio (ex: Registro.br), planos pagos de hospedagem, armazenamento adicional ou APIs pagas contratadas pela CONTRATANTE.',
      '9.2. O domínio oficial deve ser registrado em nome e CPF da CONTRATANTE. As contas de hospedagem e banco de dados em nuvem (Cloudflare Pages, KV e R2) devem pertencer à CONTRATANTE, figurando o CONTRATADO como membro técnico convidado com acesso revogável a qualquer tempo. Caso alguma conta esteja provisoriamente sob titularidade do CONTRATADO, este a transferirá integralmente à CONTRATANTE quando solicitado, no prazo de até 10 (dez) dias úteis, ou ao término do contrato.',
      '9.3. A plataforma utiliza arquitetura em planos gratuitos sujeitos a limites operacionais de cota (Anexo I, item 09) e a eventuais alterações unilaterais dos provedores globais. Se o crescimento de tráfego exigir migração para plano pago, o CONTRATADO comunicará a CONTRATANTE para aprovação. Caso a CONTRATANTE opte por não arcar com custos adicionais de provedores, o CONTRATADO não responderá por eventuais bloqueios ou lentidões decorrentes.',
      '9.4. Nenhuma despesa financeira será realizada em nome da CONTRATANTE sem sua expressa autorização prévia por escrito.',
      '9.5. A guarda e preservação de cópias de segurança (backups) das fotos, vídeos, textos e músicas originais é de responsabilidade da CONTRATANTE. Rotinas personalizadas de backup em nuvem podem ser contratadas à parte.',
    ],
  },
  {
    num: '10',
    title: 'Das Obrigações do Contratado',
    fullTitle: 'CLÁUSULA 10 — DAS OBRIGAÇÕES DO CONTRATADO',
    paragraphs: [
      'São obrigações do CONTRATADO:',
      '• Desenvolver e publicar o website conforme o memorial técnico do Anexo I;',
      '• Realizar a homologação e prestar a garantia e o suporte técnico nos estritos termos e prazos da Cláusula 6;',
      '• Manter rigoroso sigilo sobre dados, arquivos e credenciais acessadas (Cláusula 14);',
      '• Tratar dados pessoais em estrita conformidade com a LGPD (Cláusula 15);',
      '• Comunicar previamente à CONTRATANTE limitações técnicas relevantes que impeçam recursos planejados;',
      '• Entregar à CONTRATANTE, após a homologação e a quitação integral, o código-fonte, credenciais e instruções básicas de operação.',
    ],
  },
  {
    num: '11',
    title: 'Das Obrigações da Contratante',
    fullTitle: 'CLÁUSULA 11 — DAS OBRIGAÇÕES DA CONTRATANTE',
    paragraphs: [
      '11.1. Fornecer tempestivamente os materiais, fotos em alta resolução, textos e links necessários; honrar pontualmente os pagamentos nos prazos avençados; zelar pelo sigilo de suas senhas pessoais; manter obrigatoriamente ativa a autenticação em dois fatores (2FA) em suas contas externas de titularidade própria (e-mail, Cloudflare e provedor de registro de domínio), ciente de que a exigência de 2FA refere-se a essas plataformas e não constitui funcionalidade do painel administrativo (CMS) desenvolvido, salvo disposição em contrário no Anexo I; comunicar prontamente inconsistências observadas; e arcar com os custos de domínio e serviços de terceiros previamente aprovados.',
      '11.2. A CONTRATANTE declara e garante expressamente que: (a) detém os direitos autorais, patrimoniais ou as autorizações legais necessárias sobre todas as fotos, vídeos, textos, faixas musicais, marcas e imagens que fornecer ou publicar no website, inclusive perante fotógrafos e titulares de direitos fonomecânicos; (b) todas as pessoas retratadas no acervo são comprovadamente maiores de 18 (dezoito) anos e consentiram expressamente com a divulgação de sua imagem; (c) o conteúdo publicado é lícito e atende aos termos de uso das plataformas de terceiros.',
      '11.3. O CONTRATADO não revisa nem exerce moderação sobre os conteúdos artísticos e editoriais publicados. A CONTRATANTE responderá com exclusividade por quaisquer reclamações ou autuações de terceiros e ressarcirá integralmente o CONTRATADO por eventuais danos, condenações, custas e honorários que este vier a suportar por força do conteúdo publicado.',
    ],
  },
  {
    num: '12',
    title: 'Da Responsabilidade Civil e Limitações',
    fullTitle: 'CLÁUSULA 12 — DA RESPONSABILIDADE CIVIL E LIMITAÇÕES',
    highlight: true,
    paragraphs: [
      '12.1. O CONTRATADO responde pelos defeitos técnicos de desenvolvimento nos estritos termos da Cláusula 6. Não assume qualquer responsabilidade ou garantia quanto a resultados comerciais, alcance de público, número de seguidores, volume de vendas, conversão de novos assinantes no OnlyFans ou faturamento financeiro, os quais dependem exclusivamente de fatores mercadológicos e do engajamento próprio da CONTRATANTE.',
      '12.2. A disponibilidade contínua e a segurança da plataforma constituem obrigações de meio: o CONTRATADO emprega padrões modernos de engenharia de software, sem garantir funcionamento ininterrupto ou invulnerabilidade absoluta.',
      '12.3. O CONTRATADO não responde por falhas de infraestrutura de terceiros (Cloudflare, YouTube, provedores de DNS e internet), caso fortuito ou força maior (Código Civil, art. 393), nem por lucros cessantes, perdas indiretas ou danos reflexos, salvo comprovado dolo ou culpa grave.',
      '12.4. Salvo dolo, culpa grave ou expressa vedação legal, a responsabilidade indenizatória total do CONTRATADO por quaisquer eventos relacionados a este contrato limita-se rigorosamente ao valor total efetivamente pago pela CONTRATANTE.',
    ],
  },
  {
    num: '13',
    title: 'Da Propriedade Intelectual e Cessão',
    fullTitle: 'CLÁUSULA 13 — DA PROPRIEDADE INTELECTUAL E CESSÃO',
    paragraphs: [
      '13.1. Os conteúdos fornecidos pela CONTRATANTE (fotografias, vídeos, ensaios, textos, músicas, marca e nome artístico) permanecem sob sua exclusiva propriedade ou de seus respectivos licenciantes.',
      '13.2. Mediante a quitação integral do valor acordado de R$ 2.000,00, o CONTRATADO cede em definitivo à CONTRATANTE os direitos patrimoniais sobre o código-fonte sob medida e o layout desenvolvidos especificamente para este projeto, assegurando o direito de utilizar, reproduzir, modificar (por si ou por terceiros) e hospedar a aplicação onde preferir. Até a quitação, a CONTRATANTE goza de direito de uso normal e precário.',
      '13.2.1. Na hipótese de rescisão antecipada legítima deste contrato na forma da Cláusula 17.1, caso a CONTRATANTE tenha quitado as parcelas proporcionais devidas até a fase correspondente da entrega, ser-lhe-á concedida a licença definitiva e não exclusiva de uso e modificação do código-fonte e do layout no estado em que se encontrarem, restrita exclusivamente ao projeto "Nua Borges".',
      '13.3. Permanecem sob titularidade do CONTRATADO as bibliotecas genéricas, ferramentas reutilizáveis, rotinas de infraestrutura e conhecimentos técnicos desenvolvidos independentemente deste contrato. Sobre esses elementos, é concedida à CONTRATANTE licença perpétua, irrevogável e gratuita para uso e modificação no âmbito deste website. O CONTRATADO não reutilizará o layout específico e a identidade visual da CONTRATANTE em outros projetos.',
      '13.4. Módulos open-source e bibliotecas de terceiros permanecem regidos por suas licenças originárias.',
      '13.5. Fica resguardado ao CONTRATADO o direito moral de ser identificado como autor técnico do software (Lei nº 9.609/1998, art. 2º, §1º), cabendo à CONTRATANTE a faculdade de solicitar a remoção ou preservação do crédito de rodapé.',
    ],
  },
  {
    num: '14',
    title: 'Da Confidencialidade',
    fullTitle: 'CLÁUSULA 14 — DA CONFIDENCIALIDADE',
    paragraphs: [
      '14.1. As partes comprometem-se a resguardar sigilo sobre quaisquer informações confidenciais, dados de visitantes, credenciais de acesso, estratégias comerciais, código-fonte e métricas privadas recebidas em virtude deste contrato, durante a sua vigência e pelo prazo de 5 (cinco) anos subsequentes ao término. Para credenciais técnicas e senhas de acesso, o dever de sigilo perdura por prazo indeterminado.',
      '14.2. Não são confidenciais as informações que já sejam públicas sem violação deste contrato, sendo autorizada a revelação estritamente exigida por lei ou autoridade judicial competente, mediante aviso prévio à outra parte quando juridicamente viável.',
    ],
  },
  {
    num: '15',
    title: 'Da Proteção de Dados Pessoais (LGPD)',
    fullTitle: 'CLÁUSULA 15 — DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)',
    highlight: true,
    paragraphs: [
      '15.1. Quanto aos dados pessoais de visitantes coletados através do portal (mensagens do formulário de contato, perguntas enviadas, registros de data/hora, endereço IP, país de origem, navegador e referrer), a CONTRATANTE atua na qualidade de Controladora e o CONTRATADO atua como Operador (Lei nº 13.709/2018, art. 5º, VI e VII), realizando o tratamento exclusivamente para fins operacionais de hospedagem, segurança, diagnóstico de rede e estatísticas de uso, de acordo com as instruções da Controladora.',
      '15.2. A CONTRATANTE autoriza expressamente o CONTRATADO a acessar os registros de telemetria técnica e logs de auditoria, inclusive por meio de painel administrativo técnico, com o propósito exclusivo de monitoramento de integridade, mitigação de falhas e segurança. Esse acesso constará da Política de Privacidade do portal e poderá ser revogado a qualquer tempo pela CONTRATANTE.',
      '15.3. A Cloudflare atua como suboperadora de infraestrutura com rede global. A Política de Privacidade refletirá com exatidão os tratamentos realizados, incluindo a retenção técnica de logs de auditoria e IP por prazo de até 6 (seis) meses para garantia da segurança da aplicação, salvo necessidade legal de conservação.',
      '15.4. O CONTRATADO adotará medidas técnicas e administrativas razoáveis de proteção e comunicará à CONTRATANTE, no prazo de até 2 (dois) dias úteis da ciência inequívoca, qualquer incidente relevante de segurança que possa comprometer dados pessoais.',
      '15.5. Findo o contrato, o CONTRATADO eliminará os dados pessoais eventualmente mantidos fora da infraestrutura da CONTRATANTE, respeitadas as hipóteses legais de guarda (art. 16 da LGPD).',
    ],
  },
  {
    num: '16',
    title: 'Do Portfólio Profissional',
    fullTitle: 'CLÁUSULA 16 — DO PORTFÓLIO PROFISSIONAL',
    paragraphs: [
      '16.1. A CONTRATANTE autoriza o CONTRATADO a mencionar a autoria técnica do projeto e a exibir capturas de tela do website em seu portfólio profissional e redes de tecnologia, desde que não contenham imagens íntimas ou sensuais, credenciais, dados de visitantes ou métricas financeiras privadas.',
      '16.2. A CONTRATANTE poderá, a qualquer tempo, solicitar motivadamente a substituição ou retirada de capturas que contenham sua imagem, permanecendo inalterada a prerrogativa de menção à autoria técnica do desenvolvimento.',
    ],
  },
  {
    num: '17',
    title: 'Da Extinção do Contrato',
    fullTitle: 'CLÁUSULA 17 — DA EXTINÇÃO DO CONTRATO',
    paragraphs: [
      '17.1. Resilição durante o desenvolvimento: Antes da disponibilização para homologação ou da homologação final, qualquer das partes poderá resilar imotivadamente o contrato mediante notificação prévia por escrito com antecedência mínima de 15 (quinze) dias corridos. Os valores devidos pela CONTRATANTE serão apurados proporcionalmente ao estágio do projeto: (a) até a aprovação do layout: 30% (trinta por cento) do valor total; (b) até a disponibilização do website para homologação (Cláusula 5.1): 80% (oitenta por cento) do valor total; e (c) após a disponibilização para homologação ou ocorrida a homologação (Cláusula 6.1): 100% (cem por cento) do preço, mantido o cronograma de parcelamento original. Caso o prazo de 3 (três) meses da Cláusula 5.1 (já consideradas as legítimas prorrogações cabíveis) seja descumprido por culpa exclusiva do CONTRATADO e não seja sanado no prazo de 15 (quinze) dias após a notificação escrita ali prevista, a CONTRATANTE poderá resilar o contrato pagando exclusivamente o percentual proporcional às etapas comprovadamente entregues, sem incidência de qualquer multa rescisória ou indenização. Eventuais valores pagos a maior serão restituídos em até 10 (dez) dias úteis.',
      '17.2. Resolução por inadimplemento: O descumprimento injustificado de qualquer obrigação contratual não sanado no prazo de 10 (dez) dias após notificação escrita autoriza a parte inocente a resolver o contrato de pleno direito (Código Civil, art. 474), sem prejuízo da apuração de perdas e danos comprovados (art. 475).',
      '17.3. Garantia e suporte: Homologado o projeto, o CONTRATADO não poderá rescindir imotivadamente a garantia de defeitos (Cláusula 6.2) nem o suporte incluído (Cláusula 6.3) antes do término do prazo de 12 meses. O suporte continuado posterior (Cláusula 6.4) seguirá o aviso prévio de 60 dias ali pactuado.',
      '17.4. Efeitos da extinção: Em qualquer hipótese de rescisão, o CONTRATADO, no prazo de até 10 (dez) dias úteis e mediante a quitação das parcelas vencidas e proporcionais devidas até então (observada a Cláusula 13.2.1), entregará à CONTRATANTE o código-fonte atualizado no estado em que se encontrar, credenciais e exportação de mídias, prestando até 2 (duas) horas de transição técnica a outro profissional por ela designado. Nenhuma das partes reterá bens, códigos ou arquivos da outra como mecanismo coercitivo de cobrança.',
      '17.5. A morte ou incapacidade permanente de qualquer das partes extingue as obrigações personalíssimas de prestação de serviços (Código Civil, art. 607), resguardados os direitos de propriedade intelectual da Cláusula 13.',
    ],
  },
  {
    num: '18',
    title: 'Da Segurança da Informação e Gestão de Acessos',
    fullTitle: 'CLÁUSULA 18 — DA SEGURANÇA DA INFORMAÇÃO E GESTÃO DE ACESSOS',
    highlight: true,
    paragraphs: [
      '18.1. O CONTRATADO adotou as medidas técnicas de segurança descritas no Anexo I, item 05, e prestará correções de vulnerabilidade no código original durante a garantia de 12 meses (Cláusula 6.2). As medidas implementadas reduzem riscos operacionais, mas não consubstanciam garantia de invulnerabilidade absoluta (Cláusula 12.2).',
      '18.2. A CONTRATANTE é a única responsável pela guarda confidencial de suas senhas, pela ativação obrigatória de autenticação em dois fatores (2FA) em suas contas externas (e-mail, Cloudflare e registro de domínio) e pela segurança lógica e física de seus dispositivos, não correspondendo o 2FA a um recurso do painel administrativo (CMS), salvo inclusão expressa no Anexo I. O CONTRATADO não responderá por incidentes decorrentes de senhas fracas, repasse voluntário de credenciais a terceiros, golpes de engenharia social (phishing) ou malwares presentes nos aparelhos da CONTRATANTE.',
    ],
  },
  {
    num: '19',
    title: 'Das Disposições Gerais',
    fullTitle: 'CLÁUSULA 19 — DAS DISPOSIÇÕES GERAIS',
    paragraphs: [
      '19.1. Toda e qualquer alteração a este instrumento será formalizada por aditivo escrito e assinado pelas partes, inclusive pelo meio de aceite eletrônico da Cláusula 19.4.',
      '19.2. Notificações, solicitações de suporte, orçamentos e comunicações oficiais são plenamente válidas quando encaminhadas aos e-mails ou números de WhatsApp cadastrados na Cláusula 1.',
      '19.3. Cláusula de Substituição Integral: O presente contrato (Versão Definitiva 1.1) substitui, revoga e cancela integralmente todas as versões, minutas, arquivos PDF anteriores, termos de entrega e entendimentos verbais ou escritos pretéritos sobre o mesmo objeto. Em caso de conflito entre o contrato e o Anexo I, prevalecem as disposições do contrato.',
      '19.4. Validade do Aceite Eletrônico: As partes reconhecem expressamente como plenamente válido, eficaz e dotado de força probatória, nos termos do art. 10, §2º, da Medida Provisória nº 2.200-2/2001 e da Lei nº 14.063/2020, o aceite eletrônico colhido na página digital do contrato, acompanhado do registro de carimbo de data/hora, endereço IP, user-agent e hash criptográfico SHA-256 do documento.',
      '19.5. A tolerância perante eventual descumprimento temporário constituirá mera liberalidade, não implicando novação ou renúncia de direitos. A nulidade de qualquer disposição não afetará as demais (Código Civil, art. 184). Este contrato não estabelece vínculo trabalhista nem exclusividade comercial entre as partes.',
    ],
  },
  {
    num: '20',
    title: 'Do Foro de Eleição',
    fullTitle: 'CLÁUSULA 20 — DO FORO DE ELEIÇÃO',
    highlight: true,
    paragraphs: [
      'Para dirimir quaisquer controvérsias decorrentes deste contrato, as partes elegem expressamente o foro da Circunscrição Judiciária de Brasília/Distrito Federal, com expressa renúncia a qualquer outro, por mais privilegiado que seja, reconhecendo a natureza civil e empresarial da relação jurídica entre profissionais independentes.',
    ],
  },
];

export const CONTRACT_PREAMBLE =
  'Pelo presente instrumento particular, as partes acima qualificadas têm, entre si, justo e contratado o presente Contrato de Prestação de Serviços de Desenvolvimento Web, mediante as cláusulas e condições seguintes:';

export const CONTRACT_CLOSING =
  'E, por estarem assim justas e contratadas, as partes firmam o presente instrumento por meio de assinatura eletrônica (simples ou avançada), com plena validade, eficácia jurídica e força probatória nos termos do art. 10, § 2º, da Medida Provisória nº 2.200-2/2001 e da Lei nº 14.063/2020, produzindo todos os efeitos jurídicos e legais.';

/**
 * Produz o texto canônico normalizado completo para cálculo de integridade criptográfica SHA-256.
 */
export function getCanonicalContractFullText(): string {
  const parts: string[] = [];
  parts.push(`INSTRUMENTO PARTICULAR DE CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE DESENVOLVIMENTO WEB`);
  parts.push(`VERSÃO CANÔNICA DEFINITIVA ${CONTRACT_VERSION} — ${CONTRACT_DATE}`);
  parts.push(`ID: ${CONTRACT_DOC_ID}`);
  parts.push(CONTRACT_PREAMBLE);

  for (const clause of CANONICAL_CLAUSES) {
    parts.push(clause.fullTitle);
    for (const p of clause.paragraphs) {
      parts.push(p.trim());
    }
    if (clause.afterTableParagraphs) {
      for (const p of clause.afterTableParagraphs) {
        parts.push(p.trim());
      }
    }
  }

  parts.push(`Brasília/DF (Brasil) — República da Irlanda, 2026.`);
  parts.push(CONTRACT_CLOSING);
  parts.push(`CONTRATADO: ${CONTRACTOR_INFO.name} — CPF: ${CONTRACTOR_INFO.cpf}`);
  parts.push(`CONTRATANTE: ${CLIENT_INFO.name} — CPF: ${CLIENT_INFO.cpfFormatted}`);

  return parts.join('\n\n').normalize('NFC');
}

/**
 * Calcula o hash SHA-256 (hex) do texto canônico normalizado.
 * Suporta Web Crypto API (navegador, Edge Workers, Cloudflare Pages).
 */
export async function computeCanonicalContractHash(): Promise<string> {
  const text = getCanonicalContractFullText();
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
