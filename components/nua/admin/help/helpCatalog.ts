import type { HelpId, HelpItem } from './types';

export const HELP_CATALOG: Record<HelpId, HelpItem> = {
  // =========================================================================
  // 1. CONTA E SISTEMA (Mensalidade, Contrato, Senhas e Configurações)
  // =========================================================================
  mensalidade_parcelas: {
    id: 'mensalidade_parcelas',
    moduleLabel: 'CONTA E SISTEMA',
    title: 'Mensalidade do Site',
    subtitle: 'Acompanhe as parcelas de pagamento do seu site, veja quanto já pagou, pague parcelas via PIX e baixe recibos em PDF.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Para que serve esta página?',
        content: 'Aqui você acompanha o pagamento das parcelas do desenvolvimento e manutenção do seu site. Você pode conferir o valor total do contrato, quantas parcelas já foram quitadas, quanto ainda resta pagar e gerar o PIX para pagamento com um clique.',
        defaultOpen: true,
      },
      {
        id: 'options',
        iconName: 'sliders',
        title: 'Entenda os valores na tela',
        options: [
          {
            label: 'Total Contratado',
            description: 'O valor total do projeto do seu site dividido em 10 parcelas fixas de R$ 200,00.',
          },
          {
            label: 'Total Já Quitado',
            description: 'A soma de todas as parcelas que você já pagou até o momento.',
          },
          {
            label: 'Saldo Restante',
            description: 'O valor que ainda falta quitar e quantas parcelas continuam em aberto.',
          },
          {
            label: 'Próxima Fatura',
            description: 'O card superior mostra qual parcela está para vencer (ou pendente) com a data exata de vencimento e o valor.',
          },
          {
            label: 'Botão Pagar via Pix',
            description: 'Abre a janela com o QR Code e o código Pix Copia e Cola para você pagar no aplicativo do seu banco.',
          },
          {
            label: 'Baixar Recibo (PDF)',
            description: 'Para cada parcela com status Pago, você pode baixar o comprovante oficial em PDF para seus registros.',
          },
        ],
      },
      {
        id: 'usage',
        iconName: 'workflow',
        title: 'Como pagar uma parcela via PIX',
        steps: [
          'Clique no botão rosa "Pagar via Pix" no topo ou no botão "Pagar PIX" ao lado da parcela pendente.',
          'Uma janela abrirá com o QR Code na tela e o botão "Copiar Chave Pix".',
          'Abra o aplicativo do seu banco no celular, escolha a opção Pix Copia e Cola e conclua o pagamento.',
          'Após o pagamento, o status da parcela mudará para "Pago" e o botão de Recibo em PDF ficará liberado.',
        ],
      },
      {
        id: 'faq',
        iconName: 'help',
        title: 'Dúvidas frequentes',
        faqs: [
          {
            question: 'Se eu atrasar o pagamento de uma parcela, o site sai do ar?',
            answer: 'Não, o site não sai do ar de imediato. A parcela fica marcada como pendente no seu painel para você regularizar assim que puder pelo PIX.',
          },
          {
            question: 'Como comprovo o pagamento da parcela?',
            answer: 'Basta clicar no botão "Baixar Recibo" na linha da parcela paga. Um documento PDF oficial com data, valor e dados do serviço será salvo no seu aparelho.',
          },
          {
            question: 'Posso adiantar parcelas futuras?',
            answer: 'Sim, você pode clicar em qualquer parcela pendente da lista para gerar o PIX e adiantar o pagamento.',
          },
        ],
      },
    ],
    warningItems: [
      'O pagamento via PIX é identificado automaticamente em poucos segundos.',
      'Guarde os recibos em PDF para sua declaração de despesas ou controle contábil.',
    ],
    version: 1,
  },

  mensalidade_contrato: {
    id: 'mensalidade_contrato',
    moduleLabel: 'CONTA E SISTEMA',
    title: 'Contrato Digital & Assinaturas',
    subtitle: 'Consulte o contrato digital de criação do seu site, o memorial descritivo dos recursos entregues e baixe a cópia em PDF com validade jurídica.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Para que serve esta página?',
        content: 'Reúne a documentação jurídica formal do desenvolvimento do seu site oficial, garantindo seus direitos de propriedade, prazos de entrega e segurança técnica.',
        defaultOpen: true,
      },
      {
        id: 'options',
        iconName: 'sliders',
        title: 'Documentos e Certificados',
        options: [
          {
            label: 'Contrato Principal',
            description: 'Texto completo do contrato com cláusulas sobre direitos autorais das suas fotos, formas de pagamento e garantias.',
          },
          {
            label: 'Memorial Descritivo (Anexo I)',
            description: 'Documento técnico que lista todos os recursos entregues: vitrine, venda de packs, chamadas VIP, cofre e painel.',
          },
          {
            label: 'Certificado de Assinatura Digital',
            description: 'Registro com data, hora, endereço IP e hash criptográfico comprovando a assinatura de ambas as partes.',
          },
          {
            label: 'Baixar em PDF',
            description: 'Botões para você salvar a via assinada do contrato e do anexo no seu computador ou celular.',
          },
        ],
      },
      {
        id: 'faq',
        iconName: 'help',
        title: 'Dúvidas frequentes',
        faqs: [
          {
            question: 'O contrato digital tem validade jurídica?',
            answer: 'Sim, ele segue as normas legais de contratos eletrônicos no Brasil com registro de assinatura digital e identificação das partes.',
          },
          {
            question: 'Onde ficam os direitos autorais das minhas fotos e vídeos?',
            answer: 'As cláusulas do contrato garantem que todos os direitos sobre suas fotos, vídeos e materiais exclusivos pertencem exclusivamente a você.',
          },
        ],
      },
    ],
    version: 1,
  },

  cofre_senhas: {
    id: 'cofre_senhas',
    moduleLabel: 'CONTA E SISTEMA',
    title: 'Acessos e Senhas',
    subtitle: 'Guarde com segurança suas senhas de e-mail, redes sociais, plataformas e serviços em um único lugar criptografado.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Para que serve o cofre de senhas?',
        content: 'Evita que você perca senhas importantes do seu negócio (Instagram, OnlyFans, Privacy, E-mail profissional, Mercado Pago). Tudo fica protegido por criptografia e só você tem acesso.',
        defaultOpen: true,
      },
      {
        id: 'options',
        iconName: 'sliders',
        title: 'Recursos do cofre',
        options: [
          {
            label: 'Cadastrar Credencial (Botão Rosa)',
            description: 'Abre o formulário para salvar um novo acesso com nome do serviço, login, senha e link direto.',
          },
          {
            label: 'Atalhos Rápidos por Serviço',
            description: 'Botões prontos para cadastrar logins do OnlyFans, Privacy, Instagram, E-mail, Registro.br ou Mercado Pago com um clique.',
          },
          {
            label: 'Ícone de Olho',
            description: 'Clique para visualizar temporariamente a senha salva na tela.',
          },
          {
            label: 'Copiar Usuário e Senha',
            description: 'Botões de cópia rápida para colar no site que você deseja entrar sem precisar digitar.',
          },
          {
            label: 'Gerador de Senha Forte',
            description: 'Cria automaticamente senhas longas e indecifráveis para proteger suas contas contra invasões.',
          },
        ],
      },
      {
        id: 'faq',
        iconName: 'help',
        title: 'Dúvidas frequentes',
        faqs: [
          {
            question: 'Outra pessoa consegue ver minhas senhas?',
            answer: 'Não. As senhas ficam gravadas no banco de dados com criptografia de ponta a ponta e só são exibidas para você autenticada no painel.',
          },
        ],
      },
    ],
    warningItems: [
      'Nunca tire print das suas senhas em computadores compartilhados.',
      'Sempre clique no ícone de fechar o olho após visualizar uma senha.',
    ],
    version: 1,
  },

  config_notificacoes: {
    id: 'config_notificacoes',
    moduleLabel: 'CONTA E SISTEMA',
    title: 'Alertas & Notificações',
    subtitle: 'Personalize os avisos sonoros e notificações de tela para saber na hora quando entrar um novo pedido ou mensagem.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Para que serve esta tela?',
        content: 'Permite configurar como o painel chama sua atenção quando um fã compra um pack, solicita uma encomenda personalizada ou agenda uma chamada de vídeo.',
        defaultOpen: true,
      },
      {
        id: 'options',
        iconName: 'sliders',
        title: 'Configurações disponíveis',
        options: [
          {
            label: 'Toque Sonoro',
            description: 'Toca um aviso sonoro agradável no computador ou celular assim que um pagamento for aprovado.',
          },
          {
            label: 'Botão Testar Som',
            description: 'Permite ouvir o toque antes de salvar para regular o volume do seu aparelho.',
          },
          {
            label: 'Aba do Navegador Piscando',
            description: 'Faz o título da aba mudar para "(1) Novo Pedido!" quando você estiver com outra janela aberta.',
          },
          {
            label: 'Assistente Nua IA',
            description: 'Interruptor para habilitar ou pausar o co-piloto de inteligência artificial no painel.',
          },
        ],
      },
    ],
    version: 1,
  },

  config_diagnostico: {
    id: 'config_diagnostico',
    moduleLabel: 'CONTA E SISTEMA',
    title: 'Status dos Serviços & Diagnóstico',
    subtitle: 'Verifique em tempo real se o site, os pagamentos e o envio de e-mails estão operando 100% no ar.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Para que serve o diagnóstico?',
        content: 'Oferece um painel de luzes verdes que comprova que todos os serviços integrados ao seu site estão funcionando sem instabilidades.',
        defaultOpen: true,
      },
      {
        id: 'options',
        iconName: 'sliders',
        title: 'Serviços monitorados',
        options: [
          {
            label: 'Armazenamento de Fotos e Vídeos (R2)',
            description: 'Confirma que suas fotos da capa, galeria e packs estão carregando em alta velocidade.',
          },
          {
            label: 'Processamento de Pagamentos (Mercado Pago)',
            description: 'Confirma que o checkout de Pix e pagamentos no site estão recebendo vendas normalmente.',
          },
          {
            label: 'Disparo de E-mails (Resend)',
            description: 'Confirma que os e-mails com links de entrega estão sendo enviados para os compradores.',
          },
          {
            label: 'Botão Diagnóstico Completo',
            description: 'Testa todos os canais em tempo real e exibe um relatório com o tempo de resposta.',
          },
        ],
      },
    ],
    version: 1,
  },

  config_sistema: {
    id: 'config_sistema',
    moduleLabel: 'CONTA E SISTEMA',
    title: 'Sessão & Rascunhos Locais',
    subtitle: 'Gerencie rascunhos de edição armazenados neste navegador e restaure a versão publicada caso necessário.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Para que serve?',
        content: 'Enquanto você edita o site, suas alterações ficam salvas no seu aparelho. Se você fizer muitos testes e quiser recomeçar do zero, pode descartar o rascunho aqui e puxar a versão que está no ar.',
        defaultOpen: true,
      },
      {
        id: 'options',
        iconName: 'sliders',
        title: 'Opções principais',
        options: [
          {
            label: 'Descartar Rascunho Local',
            description: 'Apaga as alterações não publicadas deste aparelho e recarrega o que está publicado no ar.',
          },
          {
            label: 'Encerrar Sessão',
            description: 'Desconecta seu usuário administrativo deste computador com segurança.',
          },
        ],
      },
    ],
    version: 1,
  },

  // =========================================================================
  // 2. SHELL GLOBAL E VISÃO GERAL
  // =========================================================================
  shell_header: {
    id: 'shell_header',
    moduleLabel: 'COMANDO SUPERIOR',
    title: 'Cabeçalho e Publicação',
    subtitle: 'O centro de comando superior onde você acompanha rascunhos salvos, pesquisa itens e coloca suas alterações no ar.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Para que serve esta barra superior?',
        content: 'Garante controle total sobre o que você está editando em rascunho e o momento exato em que deseja colocar essas alterações no ar para seus fãs.',
        defaultOpen: true,
      },
      {
        id: 'options',
        iconName: 'sliders',
        title: 'Entenda os botões e avisos',
        options: [
          {
            label: 'Botão "Publicar no Site" (Rosa)',
            description: 'Aparece destacado sempre que você altera textos, fotos ou links do site. Clicar nele envia as novidades para o ar instantaneamente.',
          },
          {
            label: 'Status do Site',
            description: 'Exibe "Site no ar atualizado" (verde) quando tudo já está publicado, ou "Rascunho salvo • Publicar" (amarelo) quando há edições pendentes.',
          },
          {
            label: 'Ver Site',
            description: 'Abre nuaborges.com.br em uma nova aba para você ver exatamente como os visitantes estão visualizando a página.',
          },
          {
            label: 'Central de Alertas (Sino)',
            description: 'Exibe notificações instantâneas de novas compras de packs, encomendas sob medida e chamadas agendadas.',
          },
          {
            label: 'Botão Sair',
            description: 'Encerra sua sessão administrativa com segurança.',
          },
        ],
      },
      {
        id: 'faq',
        iconName: 'help',
        title: 'Dúvidas frequentes',
        faqs: [
          {
            question: 'Se eu fechar o navegador sem publicar, eu perco o que editei?',
            answer: 'Não! O rascunho fica guardado no seu computador. Quando você abrir o painel novamente, tudo continuará lá para você revisar e clicar em Publicar.',
          },
          {
            question: 'Packs e vitrine dependem de clicar em Publicar no Site?',
            answer: 'Sim! Os packs, fotos e textos da vitrine ficam salvos no seu rascunho de trabalho e entram no ar no site público quando você clica em "Publicar no Site". Já a agenda de chamadas e pedidos de clientes funcionam em tempo real diretamente pelo painel.',
          },
        ],
      },
    ],
    version: 1,
  },

  shell_sidebar: {
    id: 'shell_sidebar',
    moduleLabel: 'NAVEGAÇÃO PRINCIPAL',
    title: 'Menu Lateral e Áreas de Trabalho',
    subtitle: 'Navegue rapidamente entre os quatro universos da sua plataforma: Visão Geral, Vendas, Meu Site e Conta.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Para que serve o menu lateral?',
        content: 'Separa o dia a dia de atendimento aos fãs da edição visual do site e do controle financeiro, para você trabalhar com foco e rapidez.',
        defaultOpen: true,
      },
      {
        id: 'options',
        iconName: 'sliders',
        title: 'Os 4 grupos do painel',
        options: [
          {
            label: '1. VISÃO GERAL',
            description: 'A Dashboard principal com faturamento consolidado e o feed de alertas de pedidos em tempo real.',
          },
          {
            label: '2. VENDAS E ATENDIMENTO',
            description: 'Catálogo de packs à venda, encomendas sob medida, chamadas de vídeo VIP e o relatório financeiro.',
          },
          {
            label: '3. MEU SITE',
            description: 'Acervo de fotos e vídeos, edição da capa, galeria pública, seção Sobre Mim, SEO e links de redes e contato.',
          },
          {
            label: '4. CONTA E SISTEMA',
            description: 'Mensalidade e parcelas do site, contrato digital assinado, cofre de senhas e configurações.',
          },
        ],
      },
      {
        id: 'faq',
        iconName: 'help',
        title: 'Dúvidas frequentes',
        faqs: [
          {
            question: 'O que significam as bolinhas rosas com números ao lado dos nomes?',
            answer: 'São pedidos novos que você ainda não entregou, chamadas agendadas para os próximos dias ou alertas não lidos.',
          },
        ],
      },
    ],
    version: 1,
  },

  spotlight_search: {
    id: 'spotlight_search',
    moduleLabel: 'BUSCA RÁPIDA',
    title: 'Busca Global e Atalhos',
    subtitle: 'Encontre qualquer página, pedido de fã, foto ou configuração em menos de um segundo usando a barra de busca.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Como funciona a busca global?',
        content: 'Funciona como um localizador inteligente. Basta pressionar Ctrl + K (ou ⌘K no Mac) ou clicar na barra superior e digitar o que você procura.',
        defaultOpen: true,
      },
      {
        id: 'options',
        iconName: 'sliders',
        title: 'O que você pode encontrar',
        options: [
          {
            label: 'Telas e Módulos',
            description: 'Digite "redes", "mensalidade", "galeria" ou "senhas" para abrir a tela na hora.',
          },
          {
            label: 'Nomes de Clientes',
            description: 'Digite o nome de um fã para abrir diretamente o pedido e o cofre de entrega dele.',
          },
          {
            label: 'Fotos e Vídeos',
            description: 'Procure pelo nome cadastrado na biblioteca de mídias.',
          },
        ],
      },
    ],
    version: 1,
  },

  dashboard_geral: {
    id: 'dashboard_geral',
    moduleLabel: 'VISÃO GERAL',
    title: 'Visão Geral e Indicadores',
    subtitle: 'Acompanhe suas vendas, pedidos personalizados pendentes, próximas chamadas VIP e atalhos rápidos do dia.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Para que serve a Visão Geral?',
        content: 'É o termômetro do seu negócio. Ao entrar no painel, esta tela mostra o resumo de quanto você faturou, se há pedidos aguardando produção e quais chamadas de vídeo acontecem hoje.',
        defaultOpen: true,
      },
      {
        id: 'options',
        iconName: 'sliders',
        title: 'Entenda os cards principais',
        options: [
          {
            label: 'Faturamento Total e Líquido',
            description: 'Soma de todas as vendas confirmadas (packs, personalizados e chamadas) já com desconto das taxas.',
          },
          {
            label: 'Personalizados Pendentes',
            description: 'Número de encomendas que você precisa gravar ou produzir para entregar aos fãs.',
          },
          {
            label: 'Próximas Chamadas VIP',
            description: 'Horários marcados para hoje e próximos dias com atalho direto para a sala de vídeo.',
          },
          {
            label: 'Atalhos Rápidos',
            description: 'Botões para adicionar novas fotos ao acervo, cadastrar um pack ou editar a capa com um clique.',
          },
        ],
      },
    ],
    version: 1,
  },

  alertas_sistema: {
    id: 'alertas_sistema',
    moduleLabel: 'VISÃO GERAL',
    title: 'Pedidos e Alertas em Tempo Real',
    subtitle: 'Feed operacional com o histórico de compras de packs, encomendas sob medida e agendamentos de chamadas.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Para que serve esta lista?',
        content: 'Mostra cada compra que entra no site em ordem cronológica para que você saiba quem comprou, quanto pagou e quando foi.',
        defaultOpen: true,
      },
      {
        id: 'options',
        iconName: 'sliders',
        title: 'Filtros úteis',
        options: [
          {
            label: 'Filtro por Tipo',
            description: 'Isole apenas compras de packs, apenas pedidos sob medida ou apenas agendamentos de chamadas.',
          },
          {
            label: 'Marcar como Lidas',
            description: 'Limpa o contador do sininho superior após você verificar as pendências.',
          },
        ],
      },
    ],
    version: 1,
  },

  // =========================================================================
  // 3. MEU SITE (Vitrine, Galeria, Sobre, Redes, Contato e SEO)
  // =========================================================================
  conexoes_redes: {
    id: 'conexoes_redes',
    moduleLabel: 'MEU SITE',
    title: 'Redes e Contato',
    subtitle: 'Aqui você configura os links das suas plataformas, redes sociais e os canais de contato com seu público.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Para que serve esta página?',
        content: 'Permite organizar e exibir, no seu site, os links das suas plataformas de assinatura (Privacy, OnlyFans, Close Fans, Telegram), redes sociais, e seus contatos profissionais.',
        defaultOpen: true,
      },
      {
        id: 'activities',
        iconName: 'check',
        title: 'O que você pode fazer aqui?',
        bullets: [
          'Adicionar e atualizar links do OnlyFans, Privacy e Close Fans.',
          'Configurar o seu perfil oficial do Instagram.',
          'Ativar ou desativar canais exibidos no site público.',
          'Personalizar textos, etiquetas de destaque e chamadas de cada rede.',
        ],
      },
      {
        id: 'options',
        iconName: 'sliders',
        title: 'Entenda as principais opções',
        options: [
          {
            label: 'Link da plataforma',
            description: 'O endereço completo da sua página na plataforma (ex: https://onlyfans.com/nuaborges).',
          },
          {
            label: 'Etiqueta de destaque',
            description: 'Badge promocional no card (ex: INTERNACIONAL (USD), EXCLUSIVO, ASSINATURA PIX).',
          },
          {
            label: 'Descrição',
            description: 'Pequeno texto explicando o que o fã encontra naquele canal.',
          },
          {
            label: 'Destaques e tags',
            description: 'Etiquetas temáticas como Ensaios Completos, Chat VIP ou Lives.',
          },
          {
            label: 'Interruptor Ativo',
            description: 'Liga ou desliga a exibição daquele canal no site imediatamente.',
          },
        ],
      },
      {
        id: 'usage',
        iconName: 'workflow',
        title: 'Como configurar um canal',
        steps: [
          'Clique no card da plataforma que deseja configurar (ex: OnlyFans ou Privacy).',
          'Cole o link oficial do seu perfil no campo "Link da plataforma".',
          'Defina se o canal deve ficar ativo no site através do interruptor.',
          'Ao terminar, clique em "Publicar no Site" no topo direito para colocar no ar.',
        ],
      },
      {
        id: 'faq',
        iconName: 'help',
        title: 'Dúvidas frequentes',
        faqs: [
          {
            question: 'Se eu desativar um canal, eu perco o link que digitei?',
            answer: 'Não! O interruptor apenas oculta o card no site. Quando você reativar, o link continuará lá.',
          },
          {
            question: 'As alterações entram no ar na hora?',
            answer: 'Elas ficam salvas no seu rascunho. Lembre-se de clicar em "Publicar no Site" no cabeçalho superior para atualizar o site público.',
          },
        ],
      },
    ],
    warningItems: [
      'Ativar um canal faz com que ele apareça no seu site.',
      'A etiqueta e a descrição ficam visíveis para seus fãs.',
      'O link deve ser o endereço completo da sua página na plataforma.',
      'Alterações são salvas em rascunho e vão para o ar ao clicar em Publicar no Site.',
    ],
    version: 1,
  },

  conexoes_contato: {
    id: 'conexoes_contato',
    moduleLabel: 'MEU SITE',
    title: 'Contato Comercial & Assessoria',
    subtitle: 'Configure o canal oficial para recebimento de propostas comerciais, palestras, parcerias e imprensa.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Para que serve esta aba?',
        content: 'Controla para onde vão as mensagens que contratantes e marcas enviam pelo formulário de contato do seu site.',
        defaultOpen: true,
      },
      {
        id: 'options',
        iconName: 'sliders',
        title: 'Campos do formulário',
        options: [
          {
            label: 'E-mail Comercial',
            description: 'O endereço de e-mail onde você deseja receber as propostas enviadas pelo site.',
          },
          {
            label: 'WhatsApp Comercial',
            description: 'Número com DDD caso queira exibir um botão direto para conversa no WhatsApp.',
          },
        ],
      },
    ],
    version: 1,
  },

  vitrine_capa: {
    id: 'vitrine_capa',
    moduleLabel: 'MEU SITE',
    title: 'Foto e Textos da Capa',
    subtitle: 'Personalize a foto principal do topo do site, seu nome artístico, frase de destaque e os botões de ação.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'O que você edita aqui?',
        content: 'A capa é a primeira coisa que o visitante vê ao abrir nuaborges.com.br. Aqui você escolhe sua foto vertical mais marcante e define os botões que levam o fã para assinar seu club ou ver seus packs.',
        defaultOpen: true,
      },
      {
        id: 'options',
        iconName: 'sliders',
        title: 'Elementos da capa',
        options: [
          {
            label: 'Foto da Capa (Trocar Imagem)',
            description: 'Abre sua biblioteca para escolher uma foto vertical em alta resolução.',
          },
          {
            label: 'Nome / Título Central',
            description: 'Seu nome artístico em tipografia editorial (padrão: "Nua Borges").',
          },
          {
            label: 'Frase de Apresentação',
            description: 'Texto curto de impacto abaixo do nome que convida o visitante a explorar o site.',
          },
          {
            label: 'Botão 1 (Principal)',
            description: 'O botão de maior destaque na tela (ex: "ASSINAR CLUB").',
          },
          {
            label: 'Botão 2 (Secundário)',
            description: 'Atalho secundário (ex: "VER CONTEÚDOS AVULSOS").',
          },
        ],
      },
    ],
    version: 1,
  },

  vitrine_galeria: {
    id: 'vitrine_galeria',
    moduleLabel: 'MEU SITE',
    title: 'Galeria Pública de Fotos',
    subtitle: 'Curadoria das fotos que ficam visíveis gratuitamente para encantar visitantes e atrair novos assinantes.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Para que serve a galeria pública?',
        content: 'É a sua vitrine fotográfica gratuita. Visitantes podem navegar pelas fotos em alta resolução, sentindo a qualidade do seu trabalho autoral.',
        defaultOpen: true,
      },
      {
        id: 'options',
        iconName: 'sliders',
        title: 'Como organizar as fotos',
        options: [
          {
            label: 'Adicionar Fotos da Biblioteca',
            description: 'Clique para escolher fotos do seu acervo com seleção múltipla.',
          },
          {
            label: 'Arrastar para Reordenar',
            description: 'Mude a posição de qualquer foto arrastando o card para definir a ordem na tela.',
          },
          {
            label: 'Legenda da Imagem',
            description: 'Texto opcional que aparece quando o visitante clica para ampliar a foto.',
          },
        ],
      },
    ],
    version: 1,
  },

  vitrine_sobre: {
    id: 'vitrine_sobre',
    moduleLabel: 'MEU SITE',
    title: 'Seção Sobre Mim',
    subtitle: 'Conte sua trajetória, sua essência e os diferenciais do seu universo exclusivo.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Para que serve?',
        content: 'Apresenta sua história pessoal para criar uma conexão autêntica e próxima com os fãs que visitam seu site.',
        defaultOpen: true,
      },
      {
        id: 'options',
        iconName: 'sliders',
        title: 'Campos',
        options: [
          {
            label: 'Texto Biográfico',
            description: 'Parágrafos contando sobre sua carreira, estilo de vida e produções.',
          },
          {
            label: 'Foto de Perfil',
            description: 'Foto dedicada que acompanha a biografia na lateral.',
          },
          {
            label: 'Frase de Destaque',
            description: 'Sua assinatura ou frase marcante (ex: "Deixa de vergonha").',
          },
        ],
      },
    ],
    version: 1,
  },

  vitrine_topo_rodape: {
    id: 'vitrine_topo_rodape',
    moduleLabel: 'MEU SITE',
    title: 'Menu e Rodapé do Site',
    subtitle: 'Personalize o monograma "NB", botões fixos de navegação e as informações do rodapé.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'O que você configura aqui?',
        content: 'Padroniza o topo do site (monograma e botão de assinar) e o rodapé final com direitos autorais.',
        defaultOpen: true,
      },
    ],
    version: 1,
  },

  seo_divulgacao: {
    id: 'seo_divulgacao',
    moduleLabel: 'MEU SITE',
    title: 'Divulgação & Google',
    subtitle: 'Defina a foto, título e texto que aparecem automaticamente quando você envia seu link no WhatsApp e Instagram.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Como funciona o card de compartilhamento?',
        content: 'Quando você cola o link nuaborges.com.br no WhatsApp, Twitter ou Telegram, um card bonito com sua foto e frase aparece na hora. Aqui você escolhe exatamente qual foto e texto devem aparecer.',
        defaultOpen: true,
      },
      {
        id: 'options',
        iconName: 'sliders',
        title: 'Configurações',
        options: [
          {
            label: 'Título da Prévia',
            description: 'Nome principal exibido no card do WhatsApp (ex: "Nua Borges — Site Oficial").',
          },
          {
            label: 'Descrição Curta',
            description: 'Frase convidativa de 1 a 2 linhas que resume seu universo exclusivo.',
          },
          {
            label: 'Foto de Compartilhamento',
            description: 'Foto no formato horizontal recomendada para garantir que o card fique lindo em celulares.',
          },
        ],
      },
    ],
    version: 1,
  },

  seo_legal: {
    id: 'seo_legal',
    moduleLabel: 'MEU SITE',
    title: 'Páginas Legais & Termos',
    subtitle: 'Consulte os Termos de Uso, Políticas de Privacidade e o aviso obrigatório de maioridade (+18).',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Para que servem os termos legais?',
        content: 'Protegem judicialmente seus direitos autorais, proíbem pirataria e vazamento de conteúdos e deixam claro que o site é exclusivo para maiores de 18 anos.',
        defaultOpen: true,
      },
    ],
    version: 1,
  },

  // =========================================================================
  // 4. VENDAS E ATENDIMENTO (Packs, Personalizados, Chamadas e Financeiro)
  // =========================================================================
  conteudos_catalogo: {
    id: 'conteudos_catalogo',
    moduleLabel: 'VENDAS',
    title: 'Catálogo de Conteúdos & Packs',
    subtitle: 'Crie e gerencie pacotes avulsos de fotos e vídeos para venda direta aos fãs no site.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Para que serve esta página?',
        content: 'Permite vender ensaios e produções em formato avulso. O fã paga via PIX ou cartão pelo site e recebe acesso imediato a um cofre digital com os arquivos para download.',
        defaultOpen: true,
      },
      {
        id: 'options',
        iconName: 'sliders',
        title: 'Controles do catálogo',
        options: [
          {
            label: 'Novo Pack Autoral (Botão Rosa)',
            description: 'Cria um novo pacote à venda com capa, valor em R$, amostras gratuitas e fotos protegidas.',
          },
          {
            label: 'Status do Pack (Ativo / Pausado)',
            description: 'Permite pausar as vendas de um ensaio temporariamente sem apagar os arquivos cadastrados.',
          },
          {
            label: 'Preço em Reais e Desconto',
            description: 'Defina o valor cobrado e um preço comparativo "De / Por" para destacar ofertas.',
          },
        ],
      },
      {
        id: 'faq',
        iconName: 'help',
        title: 'Dúvidas frequentes',
        faqs: [
          {
            question: 'Como o cliente acessa os arquivos após pagar?',
            answer: 'O sistema libera um link único e seguro do cofre na mesma hora. O fã clica e visualiza todas as fotos e vídeos em alta resolução no celular ou computador.',
          },
        ],
      },
    ],
    version: 1,
  },

  conteudos_secao: {
    id: 'conteudos_secao',
    moduleLabel: 'VENDAS',
    title: 'Textos da Seção de Conteúdos',
    subtitle: 'Ajuste o título e a descrição que apresentam seus packs na página inicial do site.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'O que configurar aqui?',
        content: 'Altere as frases que chamam os fãs para conhecerem seus ensaios exclusivos à venda.',
        defaultOpen: true,
      },
    ],
    version: 1,
  },

  pack_editor_info: {
    id: 'pack_editor_info',
    moduleLabel: 'VENDAS',
    title: 'Informações Comerciais do Pack',
    subtitle: 'Defina o título do ensaio, preço em Reais, foto de capa e descrição promocional do pacote.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Como preencher os dados comerciais?',
        content: 'Escolha um nome atrativo para o ensaio, selecione a foto de capa que ficará na vitrine e informe o preço que o fã pagará.',
        defaultOpen: true,
      },
      {
        id: 'options',
        iconName: 'sliders',
        title: 'Campos principais',
        options: [
          {
            label: 'Título do Pack',
            description: 'Nome que aparecerá na loja (ex: "Ensaio Seda & Renda").',
          },
          {
            label: 'Preço de Venda (R$)',
            description: 'Valor real cobrado do comprador.',
          },
          {
            label: 'Foto de Capa',
            description: 'A imagem principal que representa o pacote na loja.',
          },
          {
            label: 'Descrição',
            description: 'Texto contando o que o fã vai encontrar dentro deste ensaio exclusivo.',
          },
        ],
      },
    ],
    version: 1,
  },

  pack_editor_previews: {
    id: 'pack_editor_previews',
    moduleLabel: 'VENDAS',
    title: 'Amostras Gratuitas (Previews)',
    subtitle: 'Fotos ou teasers de vídeo que o visitante pode ver antes de comprar para se interessar pelo ensaio.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Para que servem as amostras?',
        content: 'Funcionam como uma degustação: o fã vê a qualidade das fotos antes de decidir pagar pelo pacote completo.',
        defaultOpen: true,
      },
    ],
    version: 1,
  },

  pack_editor_vault: {
    id: 'pack_editor_vault',
    moduleLabel: 'VENDAS',
    title: 'Cofre Protegido do Pack',
    subtitle: 'Fotos e vídeos em alta resolução entregues com exclusividade somente para quem comprou o pacote.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Como funciona o cofre?',
        content: 'Estes arquivos ficam trancados por segurança. Somente após a confirmação do pagamento pelo Mercado Pago é que o cliente recebe acesso aos arquivos para ver e baixar.',
        defaultOpen: true,
      },
    ],
    warningItems: [
      'Coloque aqui apenas os arquivos pagos e exclusivos do pack.',
    ],
    version: 1,
  },

  personalizados_pedidos: {
    id: 'personalizados_pedidos',
    moduleLabel: 'VENDAS',
    title: 'Fila de Pedidos Personalizados',
    subtitle: 'Acompanhe as encomendas sob medida compradas pelos fãs, o que pediram e o status de entrega.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Para que serve esta fila?',
        content: 'Mostra todos os pedidos de fotos ou vídeos encomendados sob medida pelos fãs: o nome do fã, briefing do pedido, contato de entrega e status da produção.',
        defaultOpen: true,
      },
      {
        id: 'options',
        iconName: 'sliders',
        title: 'Status de atendimento',
        options: [
          {
            label: 'Pendente',
            description: 'O fã comprou a encomenda e aguarda você iniciar a gravação.',
          },
          {
            label: 'Em Produção',
            description: 'Você está gravando ou editando o material solicitado.',
          },
          {
            label: 'Pronto / Entregue',
            description: 'Arquivos já foram colocados no cofre digital do cliente.',
          },
        ],
      },
    ],
    version: 1,
  },

  personalizados_entrega: {
    id: 'personalizados_entrega',
    moduleLabel: 'VENDAS',
    title: 'Cofre de Entrega do Pedido',
    subtitle: 'Envie as fotos e vídeos encomendados pelo fã e copie o link de entrega para enviar a ele.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Como fazer a entrega do pedido?',
        content: 'Faça upload dos vídeos e fotos produzidos no cofre deste pedido. O sistema gera um link seguro que você pode copiar e mandar no WhatsApp ou Telegram do cliente.',
        defaultOpen: true,
      },
      {
        id: 'options',
        iconName: 'sliders',
        title: 'Ações da tela',
        options: [
          {
            label: 'Adicionar Arquivos ao Cofre',
            description: 'Envie as fotos ou vídeos em alta resolução feitos especialmente para o fã.',
          },
          {
            label: 'Copiar Link de Rastreio',
            description: 'Copia o link privado do cofre do cliente com um clique.',
          },
          {
            label: 'Anotações Internas',
            description: 'Espaço para você anotar observações suas sobre aquele pedido sem que o cliente veja.',
          },
        ],
      },
    ],
    version: 1,
  },

  personalizados_regras: {
    id: 'personalizados_regras',
    moduleLabel: 'VENDAS',
    title: 'Preços e Regras de Personalizados',
    subtitle: 'Configure os valores das opções de fotos e vídeos sob medida e os prazos médios de entrega.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'O que você define aqui?',
        content: 'Controla a tabela de preços cobrada dos fãs na página pública de encomenda e o prazo estimado em dias para você entregar.',
        defaultOpen: true,
      },
    ],
    version: 1,
  },

  chamadas_fila: {
    id: 'chamadas_fila',
    moduleLabel: 'VENDAS',
    title: 'Fila de Chamadas VIP',
    subtitle: 'Veja os agendamentos de chamadas de vídeo confirmados, horários marcados e links da sala de atendimento.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Para que serve a fila?',
        content: 'Lista todas as chamadas de vídeo agendadas pelos fãs com data, hora, tempo contratado e botão para entrar na sala.',
        defaultOpen: true,
      },
    ],
    version: 1,
  },

  chamadas_calendario: {
    id: 'chamadas_calendario',
    moduleLabel: 'VENDAS',
    title: 'Calendário de Chamadas',
    subtitle: 'Visualize seus atendimentos distribuídos nos dias do mês para planejar sua rotina com tranquilidade.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Como usar o calendário?',
        content: 'Mostra os dias com chamadas marcadas em destaque visual para você bater o olho e saber seus horários de atendimento.',
        defaultOpen: true,
      },
    ],
    version: 1,
  },

  chamadas_modalidades: {
    id: 'chamadas_modalidades',
    moduleLabel: 'VENDAS',
    title: 'Modalidades de Chamada',
    subtitle: 'Cadastre as opções de duração (ex: 15 min, 30 min, 1 hora) e os respectivos preços cobrados dos fãs.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'O que configurar aqui?',
        content: 'Crie ou edite as opções de tempo e preço que os visitantes podem contratar no site.',
        defaultOpen: true,
      },
    ],
    version: 1,
  },

  chamadas_horarios: {
    id: 'chamadas_horarios',
    moduleLabel: 'VENDAS',
    title: 'Horários Disponíveis e Bloqueios',
    subtitle: 'Defina em quais dias da semana e horários você atende chamadas e bloqueie datas indisponíveis.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Para que serve esta agenda?',
        content: 'Garante que os fãs só consigam agendar chamadas nos horários em que você realmente estiver disponível.',
        defaultOpen: true,
      },
    ],
    version: 1,
  },

  chamadas_modal_link: {
    id: 'chamadas_modal_link',
    moduleLabel: 'VENDAS',
    title: 'Link da Sala de Chamada',
    subtitle: 'Acesse ou envie o link da sala de vídeo para o cliente no horário marcado.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Como atender a chamada?',
        content: 'Copie o link seguro da sala de vídeo e envie para o fã ou entre diretamente pela sala do painel.',
        defaultOpen: true,
      },
    ],
    version: 1,
  },

  financeiro_geral: {
    id: 'financeiro_geral',
    moduleLabel: 'VENDAS',
    title: 'Financeiro das Vendas',
    subtitle: 'Acompanhe as receitas das vendas de packs avulsos, encomendas personalizadas e chamadas VIP.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Para que serve esta tela?',
        content: 'Consolida todas as entradas financeiras geradas pelas suas vendas no site, mostrando quanto você faturou em cada linha de produto.',
        defaultOpen: true,
      },
      {
        id: 'options',
        iconName: 'sliders',
        title: 'Indicadores',
        options: [
          {
            label: 'Faturamento Líquido',
            description: 'Valor líquido total liberado para você no Mercado Pago.',
          },
          {
            label: 'Divisão por Categoria',
            description: 'Quanto veio de packs, quanto de encomendas sob medida e quanto de chamadas VIP.',
          },
          {
            label: 'Filtro por Período',
            description: 'Consulte o faturamento dos últimos 7 dias, do mês atual ou de todo o histórico.',
          },
        ],
      },
    ],
    version: 1,
  },

  // =========================================================================
  // 5. MÍDIAS E ACERVO (Biblioteca, Álbuns e Seletor)
  // =========================================================================
  midias_acervo: {
    id: 'midias_acervo',
    moduleLabel: 'MEU SITE',
    title: 'Biblioteca de Mídias',
    subtitle: 'Acervo central de fotos, vídeos e álbuns para publicação no site e nos conteúdos.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Para que serve a biblioteca?',
        content: 'É o cofre central onde ficam todas as suas fotos e vídeos. Qualquer arquivo enviado aqui pode ser selecionado na capa, na galeria ou nos packs com um clique.',
        defaultOpen: true,
      },
      {
        id: 'options',
        iconName: 'sliders',
        title: 'Recursos do acervo',
        options: [
          {
            label: 'Botão "Adicionar mídias"',
            description: 'Envie novas fotos ou vídeos direto do seu celular ou computador com otimização automática.',
          },
          {
            label: 'Filtros Rápidos',
            description: 'Isole apenas fotos, apenas vídeos ou suas mídias marcadas com estrela (favoritas).',
          },
          {
            label: 'Álbuns',
            description: 'Separe suas fotos em coleções temáticas por ensaio fotográfico.',
          },
          {
            label: 'Seleção em Lote',
            description: 'Marque várias fotos de uma vez para favoritar ou excluir.',
          },
        ],
      },
      {
        id: 'faq',
        iconName: 'help',
        title: 'Dúvidas frequentes',
        faqs: [
          {
            question: 'Preciso diminuir o tamanho da foto antes de enviar?',
            answer: 'Não! Nosso sistema compacta e otimiza tudo automaticamente em alta definição WebP/MP4.',
          },
        ],
      },
    ],
    version: 1,
  },

  midias_albuns: {
    id: 'midias_albuns',
    moduleLabel: 'MEU SITE',
    title: 'Álbuns e Coleções',
    subtitle: 'Agrupe fotos e vídeos de um mesmo ensaio para encontrar tudo com facilidade.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Para que servem os álbuns?',
        content: 'Permitem organizar seu acervo por tema ou data (ex: "Ensaio Seda", "Viagem Paris").',
        defaultOpen: true,
      },
    ],
    version: 1,
  },

  midias_visualizador: {
    id: 'midias_visualizador',
    moduleLabel: 'MEU SITE',
    title: 'Detalhes da Mídia',
    subtitle: 'Veja a foto ampliada, tamanho do arquivo e onde ela está sendo usada no site.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'O que você descobre aqui?',
        content: 'Mostra em quais partes do site aquela foto está aparecendo (na capa, na galeria ou em algum pack) antes de você decidir excluí-la.',
        defaultOpen: true,
      },
    ],
    version: 1,
  },

  modal_seletor_midia: {
    id: 'modal_seletor_midia',
    moduleLabel: 'MEU SITE',
    title: 'Seletor de Mídias',
    subtitle: 'Escolha fotos ou vídeos do seu acervo ou envie novos arquivos do seu aparelho.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Como usar o seletor?',
        content: 'Aparece sempre que você clica para trocar uma imagem no site, permitindo reaproveitar fotos já salvas na sua biblioteca sem precisar reenviar.',
        defaultOpen: true,
      },
    ],
    version: 1,
  },

  // =========================================================================
  // 6. FERRAMENTAS BETA
  // =========================================================================
  beta_player: {
    id: 'beta_player',
    moduleLabel: 'FERRAMENTAS BETA',
    title: 'Player de Áudio Autoral',
    subtitle: 'Biblioteca de trilha sonora exclusiva e teste de reprodução contínua do player de música.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Para que serve o Player?',
        content: 'Permite gerenciar as músicas e faixas de ambientação sonora que tocam no site.',
        defaultOpen: true,
      },
      {
        id: 'options',
        iconName: 'sliders',
        title: 'Abas',
        options: [
          {
            label: 'Biblioteca de Faixas',
            description: 'Envie e gerencie seus arquivos de áudio com capa e nome da faixa.',
          },
          {
            label: 'Preview do Player',
            description: 'Teste os controles de play, pause e volume em tempo real.',
          },
        ],
      },
    ],
    version: 1,
  },

  beta_ia: {
    id: 'beta_ia',
    moduleLabel: 'FERRAMENTAS BETA',
    title: 'Assistente Nua IA',
    subtitle: 'Co-piloto inteligente para tirar dúvidas operacionais, sugerir textos e agilizar sua rotina no painel.',
    sections: [
      {
        id: 'purpose',
        iconName: 'target',
        title: 'Como a Nua IA ajuda você?',
        content: 'A assistente entende todas as telas do seu painel e ajuda a responder perguntas sobre suas vendas, localizar pedidos e sugerir ideias de textos para seus packs.',
        defaultOpen: true,
      },
    ],
    version: 1,
  },
};

export function getHelpItem(id: HelpId): HelpItem | null {
  return HELP_CATALOG[id] || null;
}

export function getAllHelpIds(): HelpId[] {
  return Object.keys(HELP_CATALOG) as HelpId[];
}
