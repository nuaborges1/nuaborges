/**
 * Domínio compartilhado do Sistema de Avaliação do Pré-lançamento — NUA Borges
 *
 * Contém:
 * - Tipos compartilhados entre formulário público, APIs e Central Administrativa
 * - Catálogo das 8 partes e perguntas em linguagem 100% humana (sem termos técnicos)
 * - Helpers puros de métricas consolidadas, agrupamento de problemas semelhantes e exportação CSV/JSON
 */

export type FeedbackLinkStatus = 'available' | 'in_progress' | 'completed' | 'revoked';
export type FeedbackReviewStatus = 'new' | 'in_review' | 'reviewed';
export type FeedbackIssueStatus = 'new' | 'in_review' | 'resolved' | 'dismissed';
export type IssueRepeatAnswer = 'yes' | 'no' | 'not_tried';

export interface FeedbackAttachment {
  id: string;
  key: string;
  name: string;
  mimeType: string;
  size: number;
}

export interface FeedbackIssueInput {
  area: string;
  whatTrying: string;
  whatHappened: string;
  whatExpected?: string;
  happenedMoreThanOnce: IssueRepeatAnswer;
  attachments: FeedbackAttachment[];
}

export interface FeedbackSettings {
  collectionActive: boolean;
  hideFromSidebar: boolean;
  retentionDays: number;
  closedAt: string | null;
  updatedAt: string | null;
}

export interface FeedbackLinkRecord {
  id: string;
  adminCode: string;
  status: FeedbackLinkStatus;
  startedAt: string | null;
  completedAt: string | null;
  revokedAt: string | null;
  responseId: string | null;
  participantName?: string | null;
  createdAt: string;
}

export interface FeedbackIssueRecord {
  id: string;
  responseId: string;
  linkId: string;
  participantName: string;
  area: string;
  whatTrying: string;
  whatHappened: string;
  whatExpected: string;
  happenedMoreThanOnce: IssueRepeatAnswer;
  attachments: FeedbackAttachment[];
  issueStatus: FeedbackIssueStatus;
  adminNotes: string;
  clusterKey: string;
  similarCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackResponseRecord {
  id: string;
  linkId: string;
  adminCode?: string;
  firstName: string;
  lastName: string;
  participantName: string;
  overallRating: number | null;
  appearanceRating: number | null;
  deviceUsed: string;
  areasVisited: string[];
  answers: Record<string, string | number | string[]>;
  reviewStatus: FeedbackReviewStatus;
  adminNotes: string;
  issuesCount: number;
  issues?: FeedbackIssueRecord[];
  submittedAt: string;
  updatedAt: string;
}

export type QuestionKind = 'rating' | 'choice' | 'yes_no_maybe' | 'text' | 'textarea' | 'multi';

export interface FeedbackQuestionDef {
  id: string;
  part: number;
  label: string;
  helper?: string;
  kind: QuestionKind;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  /** Quando definido, exibe campo de explicação condicional se a resposta for uma dessas opções */
  explainOnValues?: string[];
  explainPlaceholder?: string;
  /** Para a Parte 6: exibe somente se pelo menos uma das atividades marcadas estiver nesta lista */
  showForActivities?: string[];
}

export interface FeedbackPartDef {
  part: number;
  shortTitle: string;
  title: string;
  subtitle: string;
  /** Quando definido, pergunta inicial permite pular toda a parte caso não tenha visitado */
  gateQuestion?: {
    id: string;
    label: string;
    yesLabel: string;
    noLabel: string;
    areaKey: string;
  };
  questions: FeedbackQuestionDef[];
}

export const YES_NO_MAYBE_OPTIONS = [
  { value: 'sim', label: 'Sim' },
  { value: 'mais_ou_menos', label: 'Mais ou menos' },
  { value: 'nao', label: 'Não' },
  { value: 'nao_sei', label: 'Prefiro não responder' },
];

export const PART6_ACTIVITY_OPTIONS = [
  { value: 'apenas_visitei', label: 'Apenas visitei as páginas' },
  { value: 'comecei_compra', label: 'Comecei uma compra' },
  { value: 'conclui_compra', label: 'Concluí uma compra' },
  { value: 'recebi_email', label: 'Recebi um e-mail do site' },
  { value: 'entrei_area_privada', label: 'Entrei na minha área privada' },
  { value: 'abri_conteudo', label: 'Abri um conteúdo adquirido' },
  { value: 'voltei_acessar', label: 'Voltei para acessar novamente' },
  { value: 'outro_aparelho', label: 'Tentei acessar em outro aparelho' },
];

export const ISSUE_AREA_OPTIONS = [
  'Página inicial',
  'Packs',
  'Personalizados',
  'Chamadas VIP',
  'Compra ou pagamento',
  'Minha área privada',
  'Fotos ou vídeos',
  'Outro lugar',
] as const;

export const ISSUE_REPEAT_OPTIONS: Array<{ value: IssueRepeatAnswer; label: string }> = [
  { value: 'yes', label: 'Sim' },
  { value: 'no', label: 'Não' },
  { value: 'not_tried', label: 'Não tentei novamente' },
];

export const FEEDBACK_INTRO = {
  title: 'Sua opinião faz parte dessa história.',
  paragraphs: [
    'Você está entre as primeiras pessoas que vão conhecer o site da Nua. Queremos saber o que você achou, o que gostou, o que ficou confuso e se alguma coisa não funcionou direito.',
    'Pode falar com sinceridade. Não existe resposta certa ou errada. Sua ajuda vai fazer toda a diferença!',
  ],
};

export const FEEDBACK_COMPLETION = {
  title: 'Obrigada por fazer parte desse momento!',
  message:
    'Recebemos sua avaliação. Suas respostas vão nos ajudar a deixar tudo ainda melhor antes do lançamento.',
};

export const FEEDBACK_PARTS: FeedbackPartDef[] = [
  {
    part: 1,
    shortTitle: 'Primeira impressão',
    title: 'O que achou do site?',
    subtitle: 'Conte como foi abrir o site pela primeira vez e o que você sentiu ao navegar.',
    questions: [
      {
        id: 'p1_primeira_impressao',
        part: 1,
        label: 'O que você achou quando abriu o site pela primeira vez?',
        kind: 'textarea',
        placeholder: 'Conte com suas palavras qual foi a sua primeira impressão...',
      },
      {
        id: 'p1_nota_aparencia',
        part: 1,
        label: 'Que nota você daria para a aparência do site?',
        helper: '1 = não gostei · 5 = adorei',
        kind: 'rating',
      },
      {
        id: 'p1_cores_fotos',
        part: 1,
        label: 'As cores e as fotografias combinaram com a Nua?',
        kind: 'yes_no_maybe',
        explainOnValues: ['nao', 'mais_ou_menos'],
        explainPlaceholder: 'Se quiser, conte o que achou que não combinou...',
      },
      {
        id: 'p1_entendeu_oferta',
        part: 1,
        label: 'Você entendeu o que poderia encontrar no site?',
        kind: 'yes_no_maybe',
        explainOnValues: ['nao', 'mais_ou_menos'],
        explainPlaceholder: 'O que ficou faltando explicar logo no começo?',
      },
      {
        id: 'p1_passou_confianca',
        part: 1,
        label: 'O site passou confiança?',
        kind: 'yes_no_maybe',
        explainOnValues: ['nao', 'mais_ou_menos'],
        explainPlaceholder: 'O que fez você ficar com alguma dúvida ou pé atrás?',
      },
      {
        id: 'p1_chamou_atencao',
        part: 1,
        label: 'Teve alguma coisa que chamou especialmente sua atenção?',
        kind: 'textarea',
        placeholder: 'Pode ser algo que você gostou muito ou que achou diferente...',
      },
      {
        id: 'p1_incomodou_aparencia',
        part: 1,
        label: 'Alguma parte da aparência te incomodou?',
        kind: 'textarea',
        placeholder: 'Se algo te incomodou, conte aqui (opcional)...',
      },
    ],
  },
  {
    part: 2,
    shortTitle: 'Navegação',
    title: 'Foi fácil encontrar as coisas?',
    subtitle: 'Queremos saber se a leitura e o caminho pelas páginas ficaram confortáveis no seu aparelho.',
    questions: [
      {
        id: 'p2_encontrar_paginas',
        part: 2,
        label: 'Foi fácil encontrar as páginas que queria visitar?',
        kind: 'yes_no_maybe',
        explainOnValues: ['nao', 'mais_ou_menos'],
        explainPlaceholder: 'Qual página você teve dificuldade para achar?',
      },
      {
        id: 'p2_nomes_menus',
        part: 2,
        label: 'Os nomes dos menus ficaram claros?',
        kind: 'yes_no_maybe',
        explainOnValues: ['nao', 'mais_ou_menos'],
        explainPlaceholder: 'Algum nome ficou confuso? Qual?',
      },
      {
        id: 'p2_onde_clicar',
        part: 2,
        label: 'Você conseguiu entender onde clicar?',
        kind: 'yes_no_maybe',
        explainOnValues: ['nao', 'mais_ou_menos'],
        explainPlaceholder: 'Em que momento ficou em dúvida sobre onde clicar?',
      },
      {
        id: 'p2_botao_duvida',
        part: 2,
        label: 'Algum botão te deixou em dúvida?',
        kind: 'yes_no_maybe',
        explainOnValues: ['sim', 'mais_ou_menos'],
        explainPlaceholder: 'Qual botão foi e o que você esperava que ele fizesse?',
      },
      {
        id: 'p2_textos_leitura',
        part: 2,
        label: 'Os textos estavam fáceis de ler?',
        kind: 'yes_no_maybe',
        explainOnValues: ['nao', 'mais_ou_menos'],
        explainPlaceholder: 'Algum texto estava pequeno, claro demais ou cansativo?',
      },
      {
        id: 'p2_informacoes_organizadas',
        part: 2,
        label: 'As informações pareciam organizadas?',
        kind: 'yes_no_maybe',
        explainOnValues: ['nao', 'mais_ou_menos'],
        explainPlaceholder: 'Onde você sentiu falta de organização?',
      },
      {
        id: 'p2_pagina_diferente',
        part: 2,
        label: 'Teve alguma página que pareceu diferente das outras?',
        kind: 'yes_no_maybe',
        explainOnValues: ['sim', 'mais_ou_menos'],
        explainPlaceholder: 'Qual página pareceu fora do padrão e por quê?',
      },
      {
        id: 'p2_aparelho',
        part: 2,
        label: 'Você utilizou celular, computador ou ambos?',
        kind: 'choice',
        options: [
          { value: 'celular', label: 'Celular' },
          { value: 'computador', label: 'Computador' },
          { value: 'ambos', label: 'Ambos' },
        ],
      },
      {
        id: 'p2_apareceu_certinho',
        part: 2,
        label: 'No seu aparelho, apareceu tudo certinho?',
        kind: 'yes_no_maybe',
        explainOnValues: ['nao', 'mais_ou_menos'],
        explainPlaceholder: 'O que apareceu estranho ou fora do lugar?',
      },
      {
        id: 'p2_parte_cortada',
        part: 2,
        label: 'Alguma parte ficou cortada, apertada ou difícil de utilizar?',
        kind: 'yes_no_maybe',
        explainOnValues: ['sim', 'mais_ou_menos'],
        explainPlaceholder: 'Conte em qual página isso aconteceu...',
      },
    ],
  },
  {
    part: 3,
    shortTitle: 'Packs',
    title: 'O que achou dos Packs?',
    subtitle: 'Mesmo sem comprar, queremos saber se a apresentação dos Packs ficou clara e interessante.',
    gateQuestion: {
      id: 'p3_visitou_packs',
      label: 'Você chegou a visitar a página de Packs?',
      yesLabel: 'Sim, eu visitei',
      noLabel: 'Não visitei (pular esta parte)',
      areaKey: 'Packs',
    },
    questions: [
      {
        id: 'p3_encontrar_packs',
        part: 3,
        label: 'Foi fácil encontrar os Packs disponíveis?',
        kind: 'yes_no_maybe',
        explainOnValues: ['nao', 'mais_ou_menos'],
        explainPlaceholder: 'O que dificultou encontrar os Packs?',
      },
      {
        id: 'p3_previas_ajudaram',
        part: 3,
        label: 'As imagens de prévia ajudaram a entender o conteúdo?',
        kind: 'yes_no_maybe',
      },
      {
        id: 'p3_apresentacao_fotos',
        part: 3,
        label: 'Você gostou de como as fotografias foram apresentadas?',
        kind: 'rating',
        helper: '1 = não gostei · 5 = adorei',
      },
      {
        id: 'p3_descricoes_claras',
        part: 3,
        label: 'As descrições estavam claras?',
        kind: 'yes_no_maybe',
        explainOnValues: ['nao', 'mais_ou_menos'],
        explainPlaceholder: 'O que poderia estar explicado de um jeito melhor?',
      },
      {
        id: 'p3_entendeu_receberia',
        part: 3,
        label: 'Você conseguiu compreender o que receberia?',
        kind: 'yes_no_maybe',
      },
      {
        id: 'p3_quantidade_clara',
        part: 3,
        label: 'A quantidade de fotos e vídeos ficou clara?',
        kind: 'yes_no_maybe',
      },
      {
        id: 'p3_preco_facil',
        part: 3,
        label: 'O preço estava fácil de encontrar?',
        kind: 'yes_no_maybe',
      },
      {
        id: 'p3_como_comprar',
        part: 3,
        label: 'Foi fácil entender como comprar?',
        kind: 'yes_no_maybe',
        explainOnValues: ['nao', 'mais_ou_menos'],
        explainPlaceholder: 'Em que ponto você ficou em dúvida?',
      },
      {
        id: 'p3_info_repetida',
        part: 3,
        label: 'Teve alguma informação repetida ou desnecessária?',
        kind: 'yes_no_maybe',
        explainOnValues: ['sim', 'mais_ou_menos'],
        explainPlaceholder: 'Qual informação pareceu repetida ou sobrando?',
      },
      {
        id: 'p3_melhoraria',
        part: 3,
        label: 'O que você melhoraria nessa parte?',
        kind: 'textarea',
        placeholder: 'Fique à vontade para dar ideias ou apontar detalhes (opcional)...',
      },
    ],
  },
  {
    part: 4,
    shortTitle: 'Personalizados',
    title: 'Como foi montar um Personalizado?',
    subtitle: 'Conte como foi a experiência no Ateliê Privativo escolhendo as opções da encomenda.',
    gateQuestion: {
      id: 'p4_visitou_personalizados',
      label: 'Você chegou a conhecer a página de Personalizados?',
      yesLabel: 'Sim, experimentei',
      noLabel: 'Não experimentei (pular esta parte)',
      areaKey: 'Personalizados',
    },
    questions: [
      {
        id: 'p4_entendeu_encomendar',
        part: 4,
        label: 'Você entendeu o que poderia encomendar?',
        kind: 'yes_no_maybe',
        explainOnValues: ['nao', 'mais_ou_menos'],
        explainPlaceholder: 'O que não ficou claro sobre o que pode ser pedido?',
      },
      {
        id: 'p4_quantidade_fotos',
        part: 4,
        label: 'Foi fácil escolher a quantidade de fotos?',
        kind: 'yes_no_maybe',
      },
      {
        id: 'p4_opcoes_video',
        part: 4,
        label: 'As opções de vídeo ficaram claras?',
        kind: 'yes_no_maybe',
        explainOnValues: ['nao', 'mais_ou_menos'],
        explainPlaceholder: 'O que ficou confuso nas opções de vídeo?',
      },
      {
        id: 'p4_valores_opcoes',
        part: 4,
        label: 'Você entendeu os valores de cada opção?',
        kind: 'yes_no_maybe',
      },
      {
        id: 'p4_precos_mudaram',
        part: 4,
        label: 'Os preços mudaram corretamente conforme suas escolhas?',
        kind: 'yes_no_maybe',
        explainOnValues: ['nao', 'mais_ou_menos'],
        explainPlaceholder: 'Qual combinação de escolhas pareceu com valor estranho?',
      },
      {
        id: 'p4_detalhes_adicionais',
        part: 4,
        label: 'Foi fácil escolher os detalhes adicionais?',
        kind: 'yes_no_maybe',
      },
      {
        id: 'p4_escrever_preferencias',
        part: 4,
        label: 'Você conseguiu escrever suas preferências?',
        kind: 'yes_no_maybe',
      },
      {
        id: 'p4_resumo_pedido',
        part: 4,
        label: 'O resumo do pedido ficou fácil de entender?',
        kind: 'yes_no_maybe',
        explainOnValues: ['nao', 'mais_ou_menos'],
        explainPlaceholder: 'O que você mudaria no resumo do pedido?',
      },
      {
        id: 'p4_sem_saber_fazer',
        part: 4,
        label: 'Em algum momento ficou sem saber o que fazer?',
        kind: 'yes_no_maybe',
        explainOnValues: ['sim', 'mais_ou_menos'],
        explainPlaceholder: 'Conte em que momento você travou...',
      },
      {
        id: 'p4_mudaria_pagina',
        part: 4,
        label: 'O que mudaria nessa página?',
        kind: 'textarea',
        placeholder: 'Comentários sobre opções específicas ou sugestões (opcional)...',
      },
    ],
  },
  {
    part: 5,
    shortTitle: 'Chamadas VIP',
    title: 'Como foi escolher uma Chamada VIP?',
    subtitle: 'Queremos saber se escolher a modalidade, o dia e o horário foi tranquilo.',
    gateQuestion: {
      id: 'p5_visitou_chamadas',
      label: 'Você chegou a experimentar a página de Chamadas VIP?',
      yesLabel: 'Sim, experimentei',
      noLabel: 'Não experimentei (pular esta parte)',
      areaKey: 'Chamadas VIP',
    },
    questions: [
      {
        id: 'p5_tipos_chamada',
        part: 5,
        label: 'Você entendeu os tipos de chamada disponíveis?',
        kind: 'yes_no_maybe',
      },
      {
        id: 'p5_duracao_preco',
        part: 5,
        label: 'A duração e o preço ficaram claros?',
        kind: 'yes_no_maybe',
      },
      {
        id: 'p5_escolher_modalidade',
        part: 5,
        label: 'Foi fácil escolher uma modalidade?',
        kind: 'yes_no_maybe',
      },
      {
        id: 'p5_calendario_claro',
        part: 5,
        label: 'O calendário foi fácil de entender?',
        kind: 'yes_no_maybe',
        explainOnValues: ['nao', 'mais_ou_menos'],
        explainPlaceholder: 'O que ficou confuso no calendário?',
      },
      {
        id: 'p5_dias_disponiveis',
        part: 5,
        label: 'Você conseguiu distinguir dias disponíveis e indisponíveis?',
        kind: 'yes_no_maybe',
      },
      {
        id: 'p5_escolher_horario',
        part: 5,
        label: 'Foi fácil escolher um horário?',
        kind: 'yes_no_maybe',
      },
      {
        id: 'p5_entendeu_dia_hora',
        part: 5,
        label: 'Você entendeu o dia e a hora escolhidos?',
        kind: 'yes_no_maybe',
      },
      {
        id: 'p5_resumo_reserva',
        part: 5,
        label: 'O resumo da reserva estava claro?',
        kind: 'yes_no_maybe',
      },
      {
        id: 'p5_algo_confuso',
        part: 5,
        label: 'Alguma coisa pareceu confusa durante o agendamento?',
        kind: 'yes_no_maybe',
        explainOnValues: ['sim', 'mais_ou_menos'],
        explainPlaceholder: 'Conte o que pareceu confuso...',
      },
      {
        id: 'p5_melhorar',
        part: 5,
        label: 'O que poderia melhorar?',
        kind: 'textarea',
        placeholder: 'Sugestões ou comentários sobre as Chamadas VIP (opcional)...',
      },
    ],
  },
  {
    part: 6,
    shortTitle: 'Compra e acesso',
    title: 'Conseguiu comprar e acessar seus conteúdos?',
    subtitle:
      'Marque primeiro o que você realmente chegou a fazer. Não é necessário fazer nenhuma compra real apenas para responder.',
    questions: [
      {
        id: 'p6_como_comprar',
        part: 6,
        label: 'Foi fácil entender como comprar?',
        kind: 'yes_no_maybe',
        showForActivities: ['apenas_visitei', 'comecei_compra', 'conclui_compra'],
      },
      {
        id: 'p6_valor_claro',
        part: 6,
        label: 'O valor estava claro?',
        kind: 'yes_no_maybe',
        showForActivities: ['apenas_visitei', 'comecei_compra', 'conclui_compra'],
      },
      {
        id: 'p6_instrucoes_pagamento',
        part: 6,
        label: 'Conseguiu seguir as instruções de pagamento?',
        kind: 'yes_no_maybe',
        showForActivities: ['comecei_compra', 'conclui_compra'],
        explainOnValues: ['nao', 'mais_ou_menos'],
        explainPlaceholder: 'Alguma coisa deu errado quando você tentou pagar?',
      },
      {
        id: 'p6_depois_pagar',
        part: 6,
        label: 'Depois de pagar, entendeu o que aconteceria?',
        kind: 'yes_no_maybe',
        showForActivities: ['conclui_compra'],
        explainOnValues: ['nao', 'mais_ou_menos'],
        explainPlaceholder: 'O que faltou explicar depois do pagamento?',
      },
      {
        id: 'p6_recebeu_email',
        part: 6,
        label: 'Recebeu o e-mail esperado?',
        kind: 'yes_no_maybe',
        showForActivities: ['conclui_compra', 'recebi_email'],
      },
      {
        id: 'p6_entrar_area_privada',
        part: 6,
        label: 'Foi fácil entrar na sua área privada?',
        kind: 'yes_no_maybe',
        showForActivities: ['conclui_compra', 'recebi_email', 'entrei_area_privada'],
        explainOnValues: ['nao', 'mais_ou_menos'],
        explainPlaceholder: 'O que dificultou entrar na sua área privada?',
      },
      {
        id: 'p6_encontrou_compra',
        part: 6,
        label: 'Encontrou o que comprou?',
        kind: 'yes_no_maybe',
        showForActivities: ['conclui_compra', 'entrei_area_privada', 'abri_conteudo'],
      },
      {
        id: 'p6_abrir_fotos_videos',
        part: 6,
        label: 'Conseguiu abrir as fotos ou vídeos?',
        kind: 'yes_no_maybe',
        showForActivities: ['conclui_compra', 'entrei_area_privada', 'abri_conteudo'],
        explainOnValues: ['nao', 'mais_ou_menos'],
        explainPlaceholder: 'O que aconteceu quando tentou abrir?',
      },
      {
        id: 'p6_voltar_depois',
        part: 6,
        label: 'Foi fácil voltar ao conteúdo depois?',
        kind: 'yes_no_maybe',
        showForActivities: ['voltei_acessar', 'abri_conteudo'],
      },
      {
        id: 'p6_outro_navegador',
        part: 6,
        label: 'Quando tentou acessar por outro navegador ou celular, deu tudo certo?',
        kind: 'yes_no_maybe',
        showForActivities: ['outro_aparelho'],
        explainOnValues: ['nao', 'mais_ou_menos'],
        explainPlaceholder: 'Conte como foi tentar acessar em outro aparelho...',
      },
      {
        id: 'p6_algo_impediu',
        part: 6,
        label: 'Alguma coisa impediu você de acessar sua compra?',
        kind: 'yes_no_maybe',
        showForActivities: [
          'conclui_compra',
          'entrei_area_privada',
          'abri_conteudo',
          'voltei_acessar',
          'outro_aparelho',
        ],
        explainOnValues: ['sim', 'mais_ou_menos'],
        explainPlaceholder: 'Conte o que impediu o acesso (não coloque senhas ou códigos)...',
      },
      {
        id: 'p6_mais_simples',
        part: 6,
        label: 'O que poderia ser mais simples?',
        kind: 'textarea',
        placeholder: 'Se tiver alguma ideia para deixar essa parte mais fácil (opcional)...',
        showForActivities: [
          'apenas_visitei',
          'comecei_compra',
          'conclui_compra',
          'recebi_email',
          'entrei_area_privada',
          'abri_conteudo',
          'voltei_acessar',
          'outro_aparelho',
        ],
      },
    ],
  },
  {
    part: 7,
    shortTitle: 'Problemas',
    title: 'Alguma coisa deu errado?',
    subtitle:
      'Se alguma página travou, algo não abriu ou não funcionou como você esperava, conte aqui. Você pode adicionar quantos relatos quiser.',
    questions: [],
  },
  {
    part: 8,
    shortTitle: 'Sugestões finais',
    title: 'O que você mudaria?',
    subtitle: 'Pode falar com toda sinceridade — elogios, críticas e detalhes que ainda precisam melhorar.',
    questions: [
      {
        id: 'p8_mais_gostou',
        part: 8,
        label: 'O que você mais gostou?',
        kind: 'textarea',
        placeholder: 'O que mais te agradou no site...',
      },
      {
        id: 'p8_pagina_mais_bonita',
        part: 8,
        label: 'Qual página achou mais bonita ou interessante?',
        kind: 'text',
        placeholder: 'Ex.: Página inicial, Sobre, Packs...',
      },
      {
        id: 'p8_pagina_mais_confusa',
        part: 8,
        label: 'Qual página pareceu mais confusa?',
        kind: 'text',
        placeholder: 'Se nenhuma pareceu confusa, pode deixar em branco ou escrever "nenhuma"...',
      },
      {
        id: 'p8_pareceu_incompleta',
        part: 8,
        label: 'Teve alguma coisa que pareceu incompleta?',
        kind: 'textarea',
        placeholder: 'Conte se sentiu falta de alguma informação ou detalhe...',
      },
      {
        id: 'p8_mudaria_uma_coisa',
        part: 8,
        label: 'Se pudesse mudar uma coisa, o que mudaria?',
        kind: 'textarea',
        placeholder: 'Sua principal sugestão de melhoria...',
      },
      {
        id: 'p8_melhorar_antes_lancamento',
        part: 8,
        label: 'O que você acha que precisa melhorar antes do lançamento?',
        kind: 'textarea',
        placeholder: 'O que você considera mais importante ajustar antes de abrir ao público...',
      },
      {
        id: 'p8_nota_geral',
        part: 8,
        label: 'Que nota daria para sua experiência geral?',
        helper: '1 = muito ruim · 5 = excelente',
        kind: 'rating',
      },
      {
        id: 'p8_mais_alguma_coisa',
        part: 8,
        label: 'Quer contar mais alguma coisa?',
        kind: 'textarea',
        placeholder: 'Espaço totalmente livre para recados ou comentários extras (opcional)...',
      },
    ],
  },
];

export const ALL_QUESTIONS_BY_ID: Record<string, FeedbackQuestionDef> = Object.fromEntries(
  FEEDBACK_PARTS.flatMap((p) => p.questions.map((q) => [q.id, q]))
);

/**
 * Gera chave normalizada para detectar relatos semelhantes sem mesclá-los automaticamente.
 */
export function buildIssueClusterKey(area: string, whatHappened: string): string {
  const normArea = String(area || 'outro')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  const stopWords = new Set([
    'para', 'como', 'quando', 'onde', 'mais', 'menos', 'muito', 'muita', 'tudo',
    'nada', 'esta', 'este', 'essa', 'esse', 'isso', 'aqui', 'ficou', 'estava',
    'tentei', 'tentar', 'fazer', 'site', 'pagina', 'depois', 'antes', 'porque',
  ]);
  const tokens = String(whatHappened || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stopWords.has(w))
    .slice(0, 4)
    .sort();
  return `${normArea}:${tokens.join('_') || 'geral'}`;
}

export interface ConsolidatedFeedbackMetrics {
  linksGenerated: number;
  linksAvailable: number;
  linksInProgress: number;
  linksCompleted: number;
  linksRevoked: number;
  responsesReceived: number;
  responsesPendingReview: number;
  issuesReported: number;
  issuesResolved: number;
  averageOverallRating: number | null;
  averageAppearanceRating: number | null;
  averagePacksRating: number | null;
  topEvaluatedAreas: Array<{ area: string; count: number }>;
  areasWithMostIssues: Array<{ area: string; count: number }>;
}

export function computeFeedbackMetrics(
  links: FeedbackLinkRecord[],
  responses: FeedbackResponseRecord[],
  issues: FeedbackIssueRecord[]
): ConsolidatedFeedbackMetrics {
  const avg = (nums: number[]): number | null => {
    const valid = nums.filter((n) => Number.isFinite(n) && n >= 1 && n <= 5);
    if (valid.length === 0) return null;
    return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100;
  };

  const areaEvalCounts = new Map<string, number>();
  const packsRatings: number[] = [];

  for (const r of responses) {
    for (const area of r.areasVisited || []) {
      areaEvalCounts.set(area, (areaEvalCounts.get(area) || 0) + 1);
    }
    const pr = Number(r.answers?.p3_apresentacao_fotos);
    if (Number.isFinite(pr) && pr >= 1 && pr <= 5) {
      packsRatings.push(pr);
    }
  }

  const issueAreaCounts = new Map<string, number>();
  for (const issue of issues) {
    if (issue.issueStatus === 'dismissed') continue;
    issueAreaCounts.set(issue.area, (issueAreaCounts.get(issue.area) || 0) + 1);
  }

  const sortMap = (m: Map<string, number>) =>
    [...m.entries()]
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count);

  return {
    linksGenerated: links.length,
    linksAvailable: links.filter((l) => l.status === 'available').length,
    linksInProgress: links.filter((l) => l.status === 'in_progress').length,
    linksCompleted: links.filter((l) => l.status === 'completed').length,
    linksRevoked: links.filter((l) => l.status === 'revoked').length,
    responsesReceived: responses.length,
    responsesPendingReview: responses.filter((r) => r.reviewStatus !== 'reviewed').length,
    issuesReported: issues.length,
    issuesResolved: issues.filter((i) => i.issueStatus === 'resolved').length,
    averageOverallRating: avg(responses.map((r) => Number(r.overallRating))),
    averageAppearanceRating: avg(responses.map((r) => Number(r.appearanceRating))),
    averagePacksRating: avg(packsRatings),
    topEvaluatedAreas: sortMap(areaEvalCounts),
    areasWithMostIssues: sortMap(issueAreaCounts),
  };
}

export function annotateSimilarIssues(issues: FeedbackIssueRecord[]): FeedbackIssueRecord[] {
  const counts = new Map<string, number>();
  for (const issue of issues) {
    const key = issue.clusterKey || buildIssueClusterKey(issue.area, issue.whatHappened);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return issues.map((issue) => {
    const key = issue.clusterKey || buildIssueClusterKey(issue.area, issue.whatHappened);
    return {
      ...issue,
      clusterKey: key,
      similarCount: counts.get(key) || 1,
    };
  });
}

function escapeCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  // Previne CSV formula injection em Excel/Sheets
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function buildFeedbackCsvExport(
  scope: 'responses' | 'summary' | 'issues',
  responses: FeedbackResponseRecord[],
  issues: FeedbackIssueRecord[]
): string {
  const rows: string[][] = [];

  if (scope === 'issues') {
    rows.push([
      'ID Problema',
      'Participante',
      'Área',
      'O que tentou fazer',
      'O que aconteceu',
      'Resultado esperado',
      'Repetiu',
      'Estado',
      'Recorrência',
      'Anexos (IDs)',
      'Observações internas',
      'Data',
    ]);
    const annotated = annotateSimilarIssues(issues);
    for (const item of annotated) {
      rows.push([
        item.id,
        item.participantName,
        item.area,
        item.whatTrying,
        item.whatHappened,
        item.whatExpected,
        item.happenedMoreThanOnce,
        item.issueStatus,
        String(item.similarCount || 1),
        (item.attachments || []).map((a) => a.id).join('; '),
        item.adminNotes || '',
        item.createdAt,
      ]);
    }
  } else if (scope === 'summary') {
    rows.push([
      'ID Avaliação',
      'Código Link',
      'Nome',
      'Sobrenome',
      'Nota Geral',
      'Nota Aparência',
      'Aparelho',
      'Áreas Experimentadas',
      'Problemas Relatados',
      'Situação Análise',
      'Observações internas',
      'Data de Envio',
    ]);
    for (const r of responses) {
      rows.push([
        r.id,
        r.adminCode || '',
        r.firstName,
        r.lastName,
        r.overallRating ? String(r.overallRating) : '',
        r.appearanceRating ? String(r.appearanceRating) : '',
        r.deviceUsed || '',
        (r.areasVisited || []).join('; '),
        String(r.issuesCount || 0),
        r.reviewStatus,
        r.adminNotes || '',
        r.submittedAt,
      ]);
    }
  } else {
    // Avaliações completas (sem tokens/hashes/segredos)
    const questionIds = FEEDBACK_PARTS.flatMap((p) => p.questions.map((q) => q.id));
    rows.push([
      'ID Avaliação',
      'Código Link',
      'Nome',
      'Sobrenome',
      'Data de Envio',
      'Situação Análise',
      'Nota Geral',
      'Áreas Experimentadas',
      'Qtd Problemas',
      'Observações internas',
      ...questionIds,
    ]);
    for (const r of responses) {
      rows.push([
        r.id,
        r.adminCode || '',
        r.firstName,
        r.lastName,
        r.submittedAt,
        r.reviewStatus,
        r.overallRating ? String(r.overallRating) : '',
        (r.areasVisited || []).join('; '),
        String(r.issuesCount || 0),
        r.adminNotes || '',
        ...questionIds.map((qid) => {
          const val = r.answers?.[qid];
          const exp = r.answers?.[`${qid}_explain`];
          const base = Array.isArray(val) ? val.join('; ') : val ?? '';
          return exp ? `${base} — ${exp}` : String(base);
        }),
      ]);
    }
  }

  return '\uFEFF' + rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

export function buildFeedbackJsonExport(
  links: FeedbackLinkRecord[],
  responses: FeedbackResponseRecord[],
  issues: FeedbackIssueRecord[],
  settings: FeedbackSettings
): Record<string, unknown> {
  const annotatedIssues = annotateSimilarIssues(issues);
  const metrics = computeFeedbackMetrics(links, responses, annotatedIssues);

  // Nunca exportar tokens, hashes ou segredos
  return {
    exportedAt: new Date().toISOString(),
    settings: {
      collectionActive: settings.collectionActive,
      retentionDays: settings.retentionDays,
      closedAt: settings.closedAt,
    },
    consolidated: metrics,
    links: links.map((l) => ({
      id: l.id,
      adminCode: l.adminCode,
      status: l.status,
      startedAt: l.startedAt,
      completedAt: l.completedAt,
      revokedAt: l.revokedAt,
      responseId: l.responseId,
      createdAt: l.createdAt,
    })),
    responses: responses.map((r) => ({
      id: r.id,
      adminCode: r.adminCode,
      firstName: r.firstName,
      lastName: r.lastName,
      overallRating: r.overallRating,
      appearanceRating: r.appearanceRating,
      deviceUsed: r.deviceUsed,
      areasVisited: r.areasVisited,
      answers: r.answers,
      reviewStatus: r.reviewStatus,
      adminNotes: r.adminNotes,
      issuesCount: r.issuesCount,
      submittedAt: r.submittedAt,
    })),
    issues: annotatedIssues.map((i) => ({
      id: i.id,
      responseId: i.responseId,
      participantName: i.participantName,
      area: i.area,
      whatTrying: i.whatTrying,
      whatHappened: i.whatHappened,
      whatExpected: i.whatExpected,
      happenedMoreThanOnce: i.happenedMoreThanOnce,
      attachments: (i.attachments || []).map((a) => ({
        id: a.id,
        name: a.name,
        mimeType: a.mimeType,
        size: a.size,
      })),
      issueStatus: i.issueStatus,
      adminNotes: i.adminNotes,
      similarCount: i.similarCount,
      createdAt: i.createdAt,
    })),
  };
}
