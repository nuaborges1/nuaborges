/**
 * lib/nuaAi/knowledge/helpSummary.mjs
 *
 * Manual Operacional do Painel Nua Borges para a Nua IA.
 * Destilado a partir dos 39 tópicos oficiais de `components/nua/admin/help/helpCatalog.ts`.
 * Fornece à IA a base de conhecimento de cada tela, regra de negócio, fluxo de entrega e FAQs.
 */

export const SYSTEM_HELP = {
  mensalidade: {
    titulo: 'Mensalidade do Site',
    resumo: 'Acompanhamento do pagamento do desenvolvimento e suporte do site.',
    regras: [
      'Contrato total dividido em 10 parcelas fixas de R$ 200,00.',
      'Pagamento facilitado via PIX com QR Code dinâmico e código Copia e Cola.',
      'Identificação automática em poucos segundos após o pagamento.',
      'Para cada parcela com status "Pago", a administradora pode baixar o Recibo oficial em PDF.',
      'Se uma parcela atrasar, o site NÃO sai do ar imediatamente; fica marcada como pendente no painel.',
      'É permitido adiantar parcelas futuras a qualquer momento.',
    ],
  },
  contrato: {
    titulo: 'Contrato Digital & Assinaturas',
    resumo: 'Documentação jurídica formal do desenvolvimento do site.',
    regras: [
      'Contrato principal com cláusulas de direitos autorais exclusivos sobre fotos e vídeos da Nua.',
      'Memorial Descritivo (Anexo I) listando todos os módulos entregues.',
      'Certificado de Assinatura Digital com hash criptográfico, IP e carimbo de data/hora com validade jurídica.',
      'Cópia completa disponível para download em PDF a qualquer momento.',
    ],
  },
  cofre_senhas: {
    titulo: 'Cofre de Senhas e Acessos',
    resumo: 'Gerenciador seguro de credenciais dos serviços da marca.',
    regras: [
      'Armazena apenas metadados seguros: nome do serviço, URL, usuário e categoria.',
      'A Nua IA NUNCA lê, armazena ou revela senhas em texto puro. Se pedirem senha, orientar a abrir o cofre no painel.',
    ],
  },
};

export const COMMERCE_HELP = {
  packs: {
    titulo: 'Conteúdos & Packs Avulsos',
    resumo: 'Catálogo de produtos digitais exclusivos para venda direta.',
    regras: [
      'Cada pack possui fotos e vídeos de prévia (públicos) e mídias exclusivas (entregues no cofre pós-compra).',
      'Preço definido em reais, com badge destacada (ex: "Mais Vendido", "Exclusivo").',
      'Ao comprar, o cliente recebe acesso criptografado com OTP (código temporário por e-mail) para assistir e baixar.',
      'Suporta texto de upsell para direcionar assinantes ao OnlyFans da Nua.',
    ],
  },
  personalizados: {
    titulo: 'Pedidos Personalizados (Sob Medida)',
    resumo: 'Fila de encomendas exclusivas e calculadora de regras de negócio.',
    regras: [
      'Calculadora de preços: valor por foto (com mínimo e máximo), opção de vídeo por minuto, taxa para falar o nome do fã (+R$) e taxa expressa 24h (+R$).',
      'Configurações da calculadora salvam automaticamente ao alterar toggles e valores.',
      'Fila de pedidos com status: pendente -> pago / em_producao -> pronto -> entregue -> cancelado.',
      'Entrega Segura via Cofre Digital: a administradora faz o upload dos arquivos diretamente no card do pedido, gerando um link exclusivo criptografado para o cliente.',
      'Também permite envio alternativo por Telegram ou WhatsApp caso o cliente tenha preferido.',
    ],
  },
  chamadas_vip: {
    titulo: 'Chamadas de Vídeo VIP',
    resumo: 'Agendamentos privativos 1 a 1 com a Nua.',
    regras: [
      '4 subabas: Fila de reservas, Calendário visual, Modalidades e Horários semanais.',
      'Dias e faixas de atendimento possuem salvamento automático ao alternar dias ou editar horários.',
      'Parâmetros de proteção: tempo de intervalo (buffer) entre chamadas, antecedência mínima para agendar (ex: 2h ou 24h) e limite de dias futuros abertos.',
      'Datas bloqueadas pontuais permitem fechar dias de viagem, feriados ou eventos sem alterar a rotina semanal.',
      'Salas de chamada: suporta links Google Meet ou Whereby com instruções personalizadas enviadas ao cliente.',
      'Política de ausência: se o cliente não comparecer, a chamada é marcada como "Ausente"; o contrato estipula as regras de remarcação.',
    ],
  },
  financeiro_comercial: {
    titulo: 'Relatório Financeiro Comercial',
    resumo: 'Visão executiva das vendas de produtos e serviços da marca.',
    regras: [
      'Diferente da mensalidade do site: este módulo trata do dinheiro que ENTRA das vendas da Nua.',
      'Demonstra faturamento bruto, taxas do gateway de pagamento (Mercado Pago / Stripe / PIX) e saldo líquido real.',
      'Divisão analítica da receita por modalidade: Packs de Conteúdo, Personalizados e Chamadas VIP.',
    ],
  },
};

export const SHOWCASE_HELP = {
  vitrine_capa: {
    titulo: 'Início & Capa (Hero)',
    resumo: 'Primeira impressão do site público.',
    regras: [
      'Slideshow fotográfico em tela cheia com fotos autorais da Nua.',
      'Títulos sofisticados, subtítulo, botão principal (CTA) direcionando para o canal oficial (ex: OnlyFans) e botão explorar.',
    ],
  },
  vitrine_galeria: {
    titulo: 'Galeria Pública de Ensaios',
    resumo: 'Amostra gratuita de ensaios autorais em alta resolução.',
    regras: [
      'A administradora pode adicionar novas fotos da biblioteca, definir título e legenda para cada ensaio.',
      'Reordenação visual por drag-and-drop para compor a estética desejada.',
      'Cada ensaio pode ser ocultado temporariamente sem precisar ser excluído da biblioteca.',
      'Ao clicar na foto, o visitante vê em tamanho expandido e tem o link para acessar o ensaio completo.',
    ],
  },
  vitrine_sobre: {
    titulo: 'Seção Sobre Mim',
    resumo: 'Apresentação pessoal, trajetória artística e formação sexológica.',
    regras: [
      'Foto dedicada de retrato, parágrafos biográficos e a frase de assinatura oficial: "Deixa de vergonha ♡".',
    ],
  },
  midias_acervo: {
    titulo: 'Biblioteca Central de Mídias',
    resumo: 'Armazenamento em nuvem de alta fidelidade (Backblaze B2 / S3).',
    regras: [
      'Acervo único de fotos e vídeos originais.',
      'Organização por álbuns temáticos e marcação de favoritos.',
      'Visualizador inteligente com inspeção de tamanho, resolução e onde a mídia está em uso no site (usedIn).',
      'Proteção contra exclusão: deletar um arquivo do storage é irreversível e exige confirmação com visualização prévia da imagem.',
    ],
  },
};

export const OPERATIONS_HELP = {
  dashboard: {
    titulo: 'Dashboard Geral',
    resumo: 'Painel de controle com indicadores em tempo real.',
    regras: [
      'Exibe faturamento líquido do período, contagem de personalizados na fila e chamadas do dia.',
      'Atalhos rápidos para adicionar mídias, criar packs e editar a vitrine.',
    ],
  },
  alertas: {
    titulo: 'Central de Alertas & Notificações',
    resumo: 'Avisos imediatos de novos pedidos e eventos do sistema.',
    regras: [
      'Filtros por: Urgentes, Novos Pedidos, Chamadas Agendadas e Avisos do Sistema.',
      'Badge vermelha no topo mostra a quantidade de itens não lidos.',
      'Tocar som de alerta suave configurável para pedidos novos.',
    ],
  },
  spotlight: {
    titulo: 'Busca Rápida Global (Spotlight)',
    resumo: 'Localizador instantâneo acionado por Ctrl+K ou ⌘K.',
    regras: [
      'Busca telas, pedidos por nome de fã, fotos pelo nome do arquivo ou comandos rápidos.',
    ],
  },
  publicacao: {
    titulo: 'Publicação Segura do Site',
    resumo: 'Controle de rascunho vs produção.',
    regras: [
      'Edições no conteúdo da vitrine nascem salvas em rascunho local e seguro.',
      'O botão "Publicar Site" no topo destaca o contador de alterações pendentes.',
      'A publicação envia o rascunho para a CDN global (Cloudflare) para os visitantes visualizarem.',
    ],
  },
};

/** Retorna um sumário consolidado e limpo para injeção no prompt da IA */
export function getHelpKnowledgeText() {
  const sections = [
    { name: 'CONTA E SISTEMA', items: SYSTEM_HELP },
    { name: 'VENDAS E OPERAÇÃO', items: COMMERCE_HELP },
    { name: 'MEU SITE E VITRINE', items: SHOWCASE_HELP },
    { name: 'GESTÃO E CONTROLE', items: OPERATIONS_HELP },
  ];

  return sections
    .map((sec) => {
      const body = Object.values(sec.items)
        .map((topic) => `• **${topic.titulo}**: ${topic.resumo} [Regras: ${topic.regras.join(' | ')}]`)
        .join('\n');
      return `### ${sec.name}\n${body}`;
    })
    .join('\n\n');
}
