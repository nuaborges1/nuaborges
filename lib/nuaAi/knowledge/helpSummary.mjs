/**
 * lib/nuaAi/knowledge/helpSummary.mjs
 *
 * Manual Operacional Oficial do Painel Nua Borges para a Nua IA (Nay).
 * 100% sincronizado com a estrutura atual do painel, sem jargões técnicos internos.
 */

export const SYSTEM_HELP = {
  mensalidade: {
    titulo: 'Mensalidade do Site',
    resumo: 'Acompanhamento do pagamento do desenvolvimento e manutenção do site.',
    regras: [
      'Contrato dividido em 10 parcelas fixas de R$ 200,00.',
      'Pagamento via PIX com QR Code e código Copia e Cola, com confirmação automática em segundos.',
      'Para cada parcela paga, é possível baixar o Recibo oficial em PDF.',
      'Parcelas futuras podem ser adiantadas a qualquer momento.',
    ],
  },
  contrato: {
    titulo: 'Contrato Digital & Assinaturas',
    resumo: 'Documentação jurídica formal do desenvolvimento do site.',
    regras: [
      'Contrato principal com cláusulas de direitos autorais exclusivos sobre fotos e vídeos da Nua.',
      'Memorial Descritivo (Anexo I) e Certificado de Assinatura Digital com validade jurídica.',
      'Cópia completa disponível para download em PDF na aba Configurações.',
    ],
  },
  cofre_senhas: {
    titulo: 'Acessos e Senhas',
    resumo: 'Registro seguro dos serviços conectados à marca.',
    regras: [
      'A Nay nunca lê, armazena ou revela senhas em texto puro.',
      'Se precisar consultar alguma credencial, oriente a abrir a área de configurações do painel.',
    ],
  },
};

export const COMMERCE_HELP = {
  packs: {
    titulo: 'Conteúdos & Packs Avulsos',
    resumo: 'Catálogo de packs digitais exclusivos para venda direta via PIX.',
    regras: [
      'Cada pack tem capa, fotos/vídeos de prévia (públicos) e mídias exclusivas entregues no Cofre Digital após a confirmação do pagamento.',
      'Novos packs nascem como rascunho seguro (ocultos no site) até serem ativados e publicados.',
      'Por proteção contra vazamentos, os packs são visualizados no Cofre Digital (sem download liberado por padrão) com verificação por e-mail em novos navegadores.',
    ],
  },
  personalizados: {
    titulo: 'Pedidos Personalizados (Sob Medida)',
    resumo: 'Encomendas exclusivas de fotos e vídeos feitas sob medida.',
    regras: [
      'Organizado em 3 abas: Fila de Pedidos, Entregues e Preços e Regras.',
      'Calculadora configurável: valor por foto (mínimo e máximo), opções de vídeo por duração, adicional para falar o nome do fã e Prioridade Express (24h).',
      'Status da fila: aguardando pagamento -> em produção -> pronto -> entregue (ou cancelado).',
      'A entrega principal ocorre no Cofre Digital do site: a Nua sobe os arquivos direto no pedido e o cliente recebe o link privado por e-mail.',
    ],
  },
  chamadas_vip: {
    titulo: 'Chamadas de Vídeo VIP',
    resumo: 'Agendamentos privativos 1 a 1 em sala virtual segura.',
    regras: [
      'Organizado em 3 abas: Agenda & Reservas (com alternância entre Lista de Reservas e Calendário Visual), Horários & Disponibilidade e Modalidades & Preços.',
      'Permite criar reserva manual, colar o link da sala virtual, enviar proposta de novo horário ao cliente, analisar pedidos de cancelamento e acompanhar estornos.',
      'Proteções de agenda: intervalo (buffer) entre chamadas, antecedência mínima, limite de dias futuros e bloqueio de datas pontuais (viagens/folgas).',
      'Lembretes automáticos são enviados por e-mail no dia da chamada e 1 hora antes do início.',
    ],
  },
  clientes_e_lista_vip: {
    titulo: 'Clientes (NUA ID) & Lista VIP',
    resumo: 'Contas de compradores no site e lista de fãs cadastrados por e-mail.',
    regras: [
      'Na aba Clientes ficam as contas NUA ID dos compradores (com histórico de compras, acessos ao Cofre Digital e suporte).',
      'Lista VIP: funciona 100% por e-mail (aparece na página inicial e em /acervo). Quando um fã se cadastra, o sistema envia automaticamente um e-mail de boas-vindas e salva o contato na lista.',
      'No painel, a Nua apenas ativa ou desativa a Lista VIP com um clique, copia os e-mails ou baixa a planilha.',
    ],
  },
  financeiro_comercial: {
    titulo: 'Financeiro Comercial',
    resumo: 'Visão executiva das vendas de Packs, Personalizados e Chamadas VIP.',
    regras: [
      'Diferente da Mensalidade do Site: este módulo mostra o faturamento que entra das vendas da Nua via PIX (Mercado Pago).',
      'Exibe receita bruta, taxas, saldo líquido e divisão por modalidade.',
    ],
  },
};

export const SHOWCASE_HELP = {
  vitrine_capa: {
    titulo: 'Editar Meu Site (Capa, Vitrine e Sobre Mim)',
    resumo: 'Personalização da página inicial, vitrine de ensaios e biografia.',
    regras: [
      'Capa: slideshow fotográfico, títulos, subtítulo e botão principal.',
      'Vitrine de Ensaios (antiga Galeria): amostra gratuita curada na página inicial. Remover uma foto da vitrine NÃO apaga o arquivo da Biblioteca de Mídias.',
      'Sobre Mim: retrato, manifesto, biografia e trajetória sexológica.',
    ],
  },
  midias_acervo: {
    titulo: 'Biblioteca de Mídias',
    resumo: 'Acervo central privado com todas as fotos e vídeos originais.',
    regras: [
      'Organização por álbuns temáticos, favoritos e visualização de onde cada mídia está em uso.',
      'Exclusão permanente de arquivos só é feita 1 por vez, sempre mediante cartão de confirmação visual.',
    ],
  },
};

export const OPERATIONS_HELP = {
  dashboard: {
    titulo: 'Início (Resumo do Dia)',
    resumo: 'Indicadores em tempo real de faturamento, pedidos pendentes e próximas chamadas.',
    regras: [
      'Atalhos rápidos para acompanhar alertas, abrir o Resumo do Dia e acessar os módulos principais.',
    ],
  },
  historico: {
    titulo: 'Histórico de Pedidos',
    resumo: 'Arquivo unificado de pedidos já entregues, concluídos ou cancelados.',
    regras: [
      'Reúne Packs, Personalizados e Chamadas VIP finalizados em uma busca única.',
    ],
  },
  emails: {
    titulo: 'E-mails Oficiais',
    resumo: 'Caixa de e-mail contato@nuaborges.com.br e notificações automáticas.',
    regras: [
      'Todos os e-mails automáticos (acesso ao Cofre, confirmação de chamada, lembretes, personalizados e boas-vindas da Lista VIP) saem oficialmente de NUA Borges <contato@nuaborges.com.br>.',
    ],
  },
  publicacao: {
    titulo: 'Publicação Segura do Site',
    resumo: 'Separação segura entre rascunho no painel e site no ar.',
    regras: [
      'Alterações de vitrine e textos ficam primeiro em rascunho seguro no painel.',
      'Para ir ao ar para o público, a Nua confirma no botão Publicar Site (ou no cartão de confirmação gerado pela Nay).',
    ],
  },
};

export function getHelpKnowledgeText() {
  const sections = [
    { name: 'Vendas, Atendimento & Relacionamento', data: COMMERCE_HELP },
    { name: 'Meu Site & Biblioteca', data: SHOWCASE_HELP },
    { name: 'Operação & Publicação', data: OPERATIONS_HELP },
    { name: 'Conta & Sistema', data: SYSTEM_HELP },
  ];

  return sections
    .map((sec) => {
      const items = Object.values(sec.data)
        .map((item) => `- **${item.titulo}**: ${item.resumo}\n  Regras: ${item.regras.join(' | ')}`)
        .join('\n');
      return `### ${sec.name}\n${items}`;
    })
    .join('\n\n');
}
