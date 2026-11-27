/**
 * ==============================================================================
 * NUA BORGES — IDENTIDADE VERBAL AUTORAL (EXPERIMENTAL)
 * ==============================================================================
 *
 * Arquivo único e independente que concentra 100% da comunicação experimental
 * do site público e da área do cliente.
 *
 * Diretrizes editoriais:
 * - Tradução editorial madura, natural, inteligente e autoral da personalidade
 *   de Nua Borges — sem caricatura, sem transcrição oral literal, sem gírias
 *   artificiais e sem clichês de plataformas adultas ou copy genérica de IA.
 * - Assinatura oficial preservada: "Deixa de vergonha ♡" (usada nos contextos
 *   de assinatura da marca, nunca repetida indiscriminadamente).
 * - Registros equilibrados por contexto:
 *   • Autoral (apresentação, editorial, Sobre mim)
 *   • Conversacional (caminhos, catálogo, personalizados, chamadas, contato)
 *   • Comercial (propostas de valor claras, sem pressão exagerada e 100%
 *     transparentes sobre cobrança, extrato e acesso)
 *   • Funcional (checkout, Pix, login, Minha Conta, Cofre, erros e LGPD:
 *     precisão, simplicidade e manutenção de rótulos já adequados)
 * - Zero lógica de negócio, zero dados fictícios, zero promessas inventadas.
 * ==============================================================================
 */

import type { CopyDictionary } from './types';

function plural(count: number, singular: string, pluralWord: string): string {
  return `${count} ${count === 1 ? singular : pluralWord}`;
}

export const NUA_AUTORAL_EXPERIMENTAL_COPY: CopyDictionary = {
  // ---------------------------------------------------------------------------
  // 1. NAVEGAÇÃO & SHELL
  // ---------------------------------------------------------------------------
  nav: {
    inicio: 'Início',
    avulsos: 'Avulsos',
    chamadas: 'Chamadas',
    personalizados: 'Personalizados',
    sobre: 'Sobre mim',
    minhaConta: 'Minha Conta',
    emBreveBadge: 'Em breve',
    brandAriaSuffix: 'Página inicial',
    mainNavAria: 'Navegação principal',
    mobileNavAria: 'Menu',
    openMenuAria: 'Abrir menu',
    closeMenuAria: 'Fechar menu',
  },

  // ---------------------------------------------------------------------------
  // 2. RODAPÉ
  // ---------------------------------------------------------------------------
  footer: {
    ariaLabel: 'Rodapé',
    brandBackHomeAria: (brandName) => `${brandName} — Voltar ao início`,
    exploreHeading: 'Por aqui',
    exploreLinks: {
      inicio: 'Início',
      acervo: 'Acervo',
      avulsos: 'Avulsos',
      chamadas: 'Chamadas',
      personalizados: 'Personalizados',
    },
    emBreveBadge: 'Em breve',
    infoHeadingDefault: 'Informações',
    infoLinks: {
      sobre: 'Sobre mim',
      contato: 'Contato',
      termos: 'Termos de Uso',
      privacidade: 'Política de Privacidade',
      acessoPrivado: 'Minha Conta',
    },
    platformsHeading: 'Onde mais estou',
    platformAriaOf: (title, brandName) => `${title} de ${brandName}`,
    developedBy: 'Desenvolvido por',
    copyrightFallback: (year, brandName) => `© ${year} ${brandName} · Todos os direitos reservados.`,
  },

  // ---------------------------------------------------------------------------
  // 3. PÁGINA INICIAL (HOME)
  // ---------------------------------------------------------------------------
  home: {
    hero: {
      scrollLabel: 'Continuar',
      scrollAria: 'Descer para o conteúdo da página',
      imageCounterAria: (current, total) => `Foto ${current} de ${total}`,
      goToPhotoAria: (index) => `Ver foto ${index}`,
    },
    lancamentos: {
      eyebrowFallback: 'AVULSOS RECENTES',
      titleFallback: 'Para ver no seu ritmo',
      subtitleFallback:
        'Ensaios e vídeos disponíveis em compra única. Você escolhe o que te interessa e acessa com privacidade na sua conta.',
      exploreAllCta: 'Ver todos os avulsos',
      badgeFallback: 'Novo',
      cardMetaFeatured: 'Compra única • Acesso na sua conta',
      cardMetaStandard: 'Compra única',
      cardCta: 'Ver prévia',
      mediaSummaryFallback: 'Disponível na sua conta',
      formatPhotos: (count) => plural(count, 'foto', 'fotos'),
      formatVideos: (count) => plural(count, 'vídeo', 'vídeos'),
    },
    manifesto: {
      eyebrowFallback: 'QUEM ASSINA',
      quoteFallback: 'Falar de corpo e desejo não precisa ser um assunto cheio de cerimônia.',
      bioFallback:
        'Sou educadora sexual, sexóloga em formação e olho para a sensualidade com naturalidade. Aqui o trabalho é autoral, direto e feito com cuidado — sem precisar transformar tudo em mistério.',
      ctaLabel: 'Ler sobre mim',
    },
    bastidores: {
      eyebrowFallback: 'BASTIDORES',
      titleFallback: 'Um recorte do que produzo',
      seeAllCta: 'Ver acervo',
      regionAria: 'Prévias de ensaios',
      openAcervoAria: 'Ir para o acervo',
      openPreviewAria: 'Abrir imagem',
      blurredTitle: 'O restante está no acervo',
      blurredCta: 'Ver onde acessar →',
    },
    caminhos: {
      eyebrow: 'COMO FUNCIONA POR AQUI',
      title: 'Três jeitos de acompanhar meu trabalho',
      subtitle: 'Cada formato tem um ritmo diferente. Escolha o que fizer mais sentido para você.',
      items: [
        {
          id: 'acervo',
          title: 'Acervo por assinatura',
          subtitle: 'Atualizações contínuas',
          description:
            'Ensaios, vídeos e registros publicados ao longo do mês nas plataformas oficiais de assinatura.',
          buttonText: 'Ver plataformas',
        },
        {
          id: 'avulsos',
          title: 'Avulsos',
          subtitle: 'Sem mensalidade',
          description:
            'Escolha apenas o ensaio ou vídeo que chamar sua atenção, pague uma vez via Pix e acesse na sua conta.',
          buttonText: 'Ver avulsos',
        },
        {
          id: 'experiencias',
          title: 'Sob medida e ao vivo',
          subtitle: 'Personalizados e chamadas',
          subtitleComingSoon: 'Personalizados abertos · Chamadas em breve',
          description:
            'Peça fotos e vídeos feitos a partir da sua ideia ou agende uma chamada de vídeo com horário marcado.',
          descriptionComingSoon:
            'Peça fotos e vídeos feitos a partir da sua ideia. A agenda de chamadas ao vivo abre em breve.',
          buttonText: 'Ver opções',
          buttonTextComingSoon: 'Pedir personalizado',
          secondaryButtonTextComingSoon: 'Como vão funcionar as chamadas',
        },
      ],
    },
    faq: {
      eyebrow: 'ANTES DE ESCOLHER',
      title: 'O que costumam perguntar antes',
      subtitle: 'Pagamento, entrega e privacidade explicados de forma direta.',
      items: [
        {
          question: 'O que aparece no extrato bancário?',
          answer:
            'O Pix é gerado com um identificador padrão discreto, mas o texto exato que aparece no extrato varia conforme o seu banco. Sempre confira os dados na tela do seu aplicativo antes de confirmar.',
        },
        {
          question: 'Como recebo depois que pago?',
          answer:
            'Assim que o banco confirma o Pix, o conteúdo fica liberado na sua Minha Conta (no Cofre) e você também recebe um e-mail com o caminho para acessar.',
        },
        {
          question: 'Qual é a diferença entre avulsos e assinatura?',
          answer:
            'Nos avulsos, você paga uma única vez apenas pelo ensaio ou vídeo escolhido, sem renovação. Na assinatura, você acompanha o catálogo contínuo conforme as regras da plataforma externa que escolher.',
        },
        {
          question: 'Meus dados ficam seguros?',
          answer:
            'O site gera a cobrança Pix do pedido, e a confirmação acontece dentro do aplicativo do seu próprio banco. O uso dos seus dados segue exatamente o que está descrito na Política de Privacidade.',
        },
      ],
    },
    vipBanner: {
      eyebrowFallback: 'NOVIDADES POR E-MAIL',
      titleFallback: 'Quando sair algo novo, eu aviso por e-mail',
      subtitleFallback:
        'Sem encher sua caixa de entrada: só avisos de ensaios novos, aberturas de agenda e novidades que realmente valem a pena.',
      buttonFallback: 'Quero receber avisos',
    },
    vipModal: {
      closeAria: 'Fechar',
      eyebrowFallback: 'NOVIDADES POR E-MAIL',
      titleFallback: 'Fique por dentro sem depender de algoritmo',
      subtitleFallback:
        'Deixe seu e-mail para receber avisos de novos ensaios, aberturas de agenda e novidades do site.',
      nameLabel: 'Como posso te chamar? *',
      namePlaceholder: 'Seu nome ou apelido',
      nameRequiredError: 'Me diga como posso te chamar.',
      emailLabel: 'Seu e-mail *',
      emailPlaceholder: 'voce@exemplo.com',
      emailRequiredError: 'Informe um e-mail para receber os avisos.',
      emailInvalidError: 'Esse endereço de e-mail não parece válido.',
      privacyNote: 'Sem spam. Você pode sair da lista quando quiser.',
      submitFallback: 'Confirmar cadastro',
      submitting: 'Confirmando...',
      turnstileHint: 'Complete a verificação de segurança para continuar.',
      genericError: 'Não consegui concluir o cadastro agora. Tente de novo em instantes.',
      networkError: 'A conexão falhou ao enviar. Tente novamente em alguns segundos.',
      successTitle: 'Tudo certo por aqui',
      successBodyWithEmail:
        'Seu e-mail entrou na lista e já mandei uma mensagem de confirmação para a sua caixa de entrada.',
      successBodyDefault:
        'Seu cadastro foi salvo. Quando houver lançamento ou novidade importante, aviso por lá.',
      successDoneCta: 'Voltar para o site',
    },
  },

  // ---------------------------------------------------------------------------
  // 4. AVULSOS (CATÁLOGO E PÁGINA DO PRODUTO)
  // ---------------------------------------------------------------------------
  avulsos: {
    pageHeroEyebrow: 'AVULSOS',
    pageHeroTitleFallback: 'Escolha só o que te chama atenção',
    pageHeroSubtitle:
      'Ensaios e vídeos em compra única via Pix, sem assinatura. Você vê a prévia, decide com calma e acessa direto na sua conta.',
    filterAll: 'Todos',
    filterPhotos: 'Fotos',
    filterVideos: 'Vídeos',
    filterMixed: 'Fotos e vídeos',
    searchPlaceholder: 'Procurar por tema ou título...',
    emptyCatalogTitle: 'Novos ensaios a caminho',
    emptyCatalogBody:
      'Ainda não há avulsos publicados neste momento. Enquanto preparo os próximos, você pode ver as outras opções do site.',
    emptyFilterTitle: 'Nada com esse filtro',
    emptyFilterBody: 'Tente outro termo ou volte para ver todos os ensaios disponíveis.',
    clearFiltersCta: 'Mostrar todos',
    cardCta: 'Ver prévia',
    cardPrivateTag: 'Acesso na conta',
    cardSinglePaymentTag: 'Compra única',
    cardPreviewCount: (photos, videos) => {
      const parts: string[] = [];
      if (photos > 0) parts.push(plural(photos, 'foto', 'fotos'));
      if (videos > 0) parts.push(plural(videos, 'vídeo', 'vídeos'));
      return parts.join(' · ') || 'Disponível na conta';
    },
    backToCatalog: 'Voltar para avulsos',
    aboutProductionHeading: 'O que tem aqui',
    includedHeading: 'Antes de escolher',
    includedPhotos: (count) => `${plural(count, 'foto em alta definição', 'fotos em alta definição')}`,
    includedVideos: (count) => `${plural(count, 'vídeo completo', 'vídeos completos')}`,
    includedPrivateVault: 'Liberado na sua Minha Conta (Cofre) assim que o Pix confirma',
    includedSinglePayment: 'Compra única via Pix — sem cobrança recorrente',
    includedEmailNotice: 'Link e resumo enviados para o seu e-mail',
    purchaseCard: {
      singlePaymentEyebrow: 'COMPRA ÚNICA · PIX',
      buyNowCta: 'Comprar via Pix',
      pixInstantBadge: 'Liberação automática após confirmação do banco',
      vaultAccessNote: 'Fica disponível no seu Cofre, em Minha Conta.',
      paymentNote: 'O texto exibido no extrato depende do seu banco.',
      supportLinkLabel: 'Alguma dúvida antes de comprar?',
      alreadyBoughtHint: 'Já garantiu este conteúdo?',
      openAccountLink: 'Abrir Minha Conta',
    },
    upsell: {
      eyebrow: 'ACERVO POR ASSINATURA',
      title: 'Prefere acompanhar tudo de forma contínua?',
      subtitleFallback:
        'Além dos avulsos, mantenho ensaios, vídeos e registros frequentes nas plataformas de assinatura.',
      cta: 'Ver plataformas do acervo',
    },
    notFound: {
      badge: 'CONTEÚDO INDISPONÍVEL',
      title: 'Esse ensaio não está por aqui',
      descriptionPrefix: 'O endereço',
      descriptionSuffix: 'não foi encontrado, saiu do ar ou mudou.',
      otherAvailableHeading: 'Outros avulsos disponíveis agora:',
      backCatalogCta: 'Ver avulsos disponíveis',
      backHomeCta: 'Ir para o início',
    },
    gallery: {
      previewBadge: 'NUA BORGES • PRÉVIA',
      lockedOverlayTitle: 'O restante abre após a compra',
      lockedOverlaySubtitle: 'Assim que o Pix confirma, todas as mídias ficam liberadas no seu Cofre.',
      photoLabel: (current, total) => `${current} / ${total}`,
      avulsoVideoEyebrow: 'VÍDEO AVULSO',
      avulsoPhotoEyebrow: 'ENSAIO AVULSO',
      avulsoVideoTitle: 'Vídeo disponível após a compra',
      avulsoPhotoTitle: 'Foto disponível após a compra',
      avulsoBody:
        'Este item não tem prévia aberta no navegador. Assim que o Pix for confirmado, o acesso libera na sua Minha Conta.',
      avulsoFooterVideoTitle: 'Vídeo em compra única',
      avulsoFooterPhotoTitle: 'Foto em compra única',
      avulsoFooterSubtitle: 'Fica disponível no seu Cofre logo após a confirmação do pagamento.',
      reservedPreviewTitle: 'Prévia não exibida neste item',
      reservedPreviewSubtitle:
        'As mídias originais ficam liberadas na sua Minha Conta após a confirmação do Pix.',
      prevPreviewAria: 'Prévia anterior',
      nextPreviewAria: 'Próxima prévia',
    },
    catalogDetails: {
      eyebrowFallback: 'AVULSOS',
      titleFallback: 'Escolha só o que te chama atenção',
      subtitleFallback:
        'Ensaios e vídeos em compra única via Pix, sem assinatura. Você vê a prévia, decide com calma e acessa direto na sua conta.',
      emptyEditingNotice: 'Novos ensaios estão em preparo. Volte em breve para conferir.',
      emptyModalityNotice: 'Nenhum conteúdo disponível nesse recorte agora.',
      featuredBadgeFallback: 'Em destaque',
      featuredEyebrow: 'Disponível agora',
      accessVaultShort: 'Acesso na sua conta',
      pixSingleShort: 'Compra única via Pix',
      pixShort: 'Pix',
      upsellEyebrow: 'ACERVO POR ASSINATURA',
      upsellTitle: 'Prefere acompanhar tudo de forma contínua?',
      upsellBody:
        'Nos perfis oficiais do Privacy e do OnlyFans você acompanha ensaios, vídeos e atualizações mensais por assinatura.',
      upsellCta: 'Ver plataformas do acervo',
      bottomTrustPix: 'Identificação no extrato conforme o seu banco',
      bottomTrustVault: 'Fica salvo na sua Minha Conta',
      bottomTrustAuto: 'Liberação automática após confirmação do Pix',
      loadingProduction: 'Carregando detalhes...',
      backToCatalogLabel: 'Voltar para avulsos',
      collectionNotesEyebrow: 'Sobre este ensaio',
      collectionNotesTitle: 'Mais detalhes',
      collectionBadgeFallback: 'Avulso',
      alreadyOwnedNotice: 'Este conteúdo já está liberado na sua conta.',
      viewInLibraryCta: 'Abrir na minha biblioteca',
      openLibraryCta: 'Ir para Minha Conta',
      checkingAvailability: 'Verificando disponibilidade…',
      unavailableNow: 'Este conteúdo não está disponível para compra no momento.',
      singlePaymentMeta: 'Compra única · Acesso privado',
      noRecurrenceBadge: 'Sem assinatura',
      buyButtonFallback: 'Comprar via Pix',
      pixReleaseNote: 'Pagamento único via Pix. Assim que o banco confirmar, o conteúdo abre na sua Minha Conta.',
      alreadyOwnedLink: 'Já comprou este conteúdo? Abra sua conta.',
      claimPreviousLink: 'Vincular compra anterior',
      upsellAsideEyebrow: 'ACERVO POR ASSINATURA',
      upsellAsideTitle: 'Prefere acompanhar todas as novidades do mês?',
      upsellAsideBody: 'Nas plataformas de assinatura você encontra o catálogo contínuo em um só lugar.',
      upsellAsideCta: 'Ver plataformas',
    },
  },

  // ---------------------------------------------------------------------------
  // 5. CHECKOUT & PAGAMENTO PIX (REGISTRO FUNCIONAL LIMPO)
  // ---------------------------------------------------------------------------
  checkout: {
    modalCloseAria: 'Fechar pagamento',
    steps: {
      review: 'Resumo',
      identification: 'Seus dados',
      pix: 'Pix',
      approved: 'Confirmado',
    },
    summary: {
      eyebrow: 'PAGAMENTO VIA PIX',
      totalLabel: 'Total',
      pixBadge: 'Pix',
      emailFieldLabel: 'E-mail para receber o acesso',
      emailPlaceholder: 'voce@email.com',
      nameFieldLabel: 'Como posso te chamar',
      namePlaceholder: 'Seu nome ou apelido',
      generatePixCta: 'Gerar código Pix',
      generatingPix: 'Gerando Pix...',
      securityNote: 'Você confere e aprova o pagamento diretamente no aplicativo do seu banco.',
      emailRequiredError: 'Preciso do seu e-mail para liberar e enviar o acesso.',
      emailInvalidError: 'Confira se o e-mail foi digitado corretamente.',
      genericOrderError: 'Não foi possível gerar o Pix agora. Tente novamente em instantes.',
    },
    inlineAuth: {
      badge: 'MINHA CONTA',
      title: 'Entre para guardar no seu Cofre',
      subtitle: 'Enviamos um código de 6 dígitos para o seu e-mail. Assim suas compras ficam sempre reunidas.',
      loggedInAs: (email) => `Entrando com ${email}`,
      changeAccount: 'Usar outro e-mail',
      emailLabel: 'Seu e-mail',
      emailPlaceholder: 'voce@email.com',
      sendCodeCta: 'Enviar código',
      sendingCode: 'Enviando...',
      codeLabel: 'Código de 6 dígitos',
      codePlaceholder: '000000',
      codeHint: (email) => `Código enviado para ${email}.`,
      verifyCodeCta: 'Confirmar código',
      verifyingCode: 'Confirmando...',
      resendCode: 'Reenviar código',
      resendCountdown: (seconds) => `Reenviar em ${seconds}s`,
      changeEmail: 'Trocar e-mail',
      continueWithoutLogin: 'Seguir sem entrar agora',
    },
    pix: {
      eyebrow: 'PAGAMENTO PIX',
      title: 'Finalize pelo aplicativo do seu banco',
      subtitle: 'Escaneie o QR Code ou copie o código abaixo. A confirmação acontece automaticamente.',
      expiresIn: (formatted) => `Válido por ${formatted}`,
      expiredLabel: 'Código expirado',
      copyCodeCta: 'Copiar código Pix',
      copiedCodeCta: 'Código Pix copiado',
      howToPayTitle: 'Passo a passo',
      howToPaySteps: [
        'Abra o aplicativo do seu banco e escolha Pix Copia e Cola ou QR Code.',
        'Confira o valor e os dados na tela antes de confirmar.',
        'Volte para cá: assim que o banco confirmar, o acesso abre sozinho.',
      ],
      checkingStatus: 'Aguardando confirmação do banco...',
      checkNowCta: 'Já paguei, conferir agora',
      privacyNote:
        'O Pix usa um identificador padrão discreto, mas o texto exibido no extrato depende do seu banco.',
      regenerateCta: 'Gerar novo código Pix',
    },
    approved: {
      eyebrow: 'PAGAMENTO CONFIRMADO',
      title: 'Tudo liberado na sua conta',
      titleChamada: 'Horário confirmado',
      titlePersonalizado: 'Pedido confirmado',
      subtitle: 'O pagamento foi confirmado e o conteúdo já está disponível para você no Cofre.',
      paidConfirmationPrefix: 'Pagamento de',
      paidConfirmationSuffix: 'confirmado pelo banco.',
      tokenHeading: 'Seu código de acesso',
      tokenSingleUseBadge: 'Uso único',
      tokenCopyCta: 'Copiar código',
      tokenCopiedCta: 'Copiado',
      tokenWarningPrefix: '',
      tokenWarningStrong: 'Guarde este código com cuidado.',
      tokenWarningMiddle: ' Ele é individual e vale para ',
      tokenWarningOnce: 'um único uso',
      tokenWarningSuffix: ' na liberação do acesso.',
      confirmedBanner: '✓ Pagamento confirmado',
      navigatingLabel: 'Abrindo acesso...',
      myAccountChamadaCta: 'Ver chamada em Minha Conta',
      myAccountPersonalizadoCta: 'Acompanhar em Minha Conta',
      myAccountBibliotecaCta: 'Abrir minha biblioteca',
      vaultCta: 'Abrir no Cofre',
      orderCodeLabel: 'Pedido',
      emailSentNote: 'Também enviei o resumo e o link de acesso para o seu e-mail.',
      closeCta: 'Fechar',
    },
    status: {
      rejectedTitle: 'Pagamento não concluído',
      rejectedBody: 'Confira o pedido para verificar a situação da cobrança.',
      expiredTitle: 'Esse código Pix expirou',
      expiredBody: 'O prazo terminou antes da confirmação. Confira o pedido para ver como retomar.',
      expiredRetryCta: 'Gerar novo código Pix',
      errorTitle: 'Algo não saiu como esperado',
      errorBodyFallback: 'Houve uma instabilidade ao criar o pedido. Tente novamente em alguns instantes.',
      errorRetryCta: 'Tentar novamente',
      cancelCta: 'Voltar',
    },
    pixScreenExtra: {
      openLibraryCta: 'Abrir minha biblioteca',
      preparingPix: 'Preparando o código Pix…',
      expiresLabel: 'Válido por:',
      checkInBankApp: 'Confira no app do banco',
      pixCopyPasteLabel: 'Pix Copia e Cola',
      clickToCopyHint: 'toque para copiar',
      copyManualHint: 'Selecione o código acima e copie manualmente.',
      copiedHint: 'Código copiado. Agora abra o app do seu banco e cole em Pix Copia e Cola.',
      generatingQr: 'Gerando QR Code...',
      privacyPrefix: 'Sobre o extrato:',
      waitingBankTitle: 'Aguardando confirmação do banco...',
      waitingBankSubtitle: 'Atualiza automaticamente assim que confirmar',
    },
    inlineAuthExtra: {
      connectedAs: (name) => `Entrando como ${name}`,
      connectedSuffix: 'Este pedido fica salvo na sua Minha Conta.',
      promptHeading: 'Entre com seu e-mail para deixar o acesso salvo na sua Minha Conta',
      continueGuestLabel: 'Seguir sem entrar agora',
      turnstileError: 'Complete a verificação de segurança para continuar.',
    },
  },
  acervo: {
    eyebrow: 'ACERVO POR ASSINATURA',
    title: 'Onde acompanho quem prefere assinatura',
    subtitle:
      'Os ensaios contínuos, vídeos e atualizações mensais ficam nos perfis oficiais abaixo. Escolha a plataforma em que você já se sente confortável.',
    popularBadge: 'Mais usada no Brasil',
    partnerPayTitle: 'Cobrança nas plataformas externas',
    partnerPayBody:
      'Pagamentos, renovações e o texto que aparece no extrato seguem as regras da plataforma escolhida e do seu banco. Confira os dados no aplicativo antes de confirmar.',
    partnerPayPix: 'Pix',
    partnerPayCards: 'Cartões',
    partnerPayAccess: 'Acesso após confirmação',
    faqEyebrow: 'ANTES DE ASSINAR',
    faqTitle: 'Perguntas frequentes',
    vipInviteTitle: 'Quer saber quando sair algo novo antes de assinar?',
    vipInviteBody: 'Deixe seu e-mail na lista de avisos — sem spam e saindo quando quiser.',
    vipInviteCta: 'Receber avisos por e-mail',
    platformsHeading: 'Perfis oficiais',
    platformsSubheading: 'Assinatura gerenciada diretamente em cada plataforma.',
    featuredBadge: 'Principal',
    openPlatformCtaFallback: 'Abrir perfil oficial',
    noPlatformsTitle: 'Nenhuma plataforma listada agora',
    noPlatformsBody: 'Você pode conferir os avulsos aqui no site ou mandar mensagem pelo contato.',
    avulsosBlockEyebrow: 'PREFERE SEM ASSINATURA?',
    avulsosBlockTitle: 'Nos avulsos você escolhe caso a caso',
    avulsosBlockBody: 'Compra única via Pix, sem mensalidade e sem renovação automática.',
    avulsosBlockCta: 'Ver avulsos',
    personalizadosBlockEyebrow: 'FEITO SOB PEDIDO',
    personalizadosBlockTitle: 'Tem uma ideia específica em mente?',
    personalizadosBlockBody: 'Nos personalizados você descreve o que quer e eu produzo fotos ou vídeos sob medida.',
    personalizadosBlockCta: 'Ver personalizados',
    transparencyNote:
      'Valores, cobrança e cancelamento de assinaturas seguem as regras da plataforma externa que você escolher.',
  },
  chamadas: {
    pageHeroEyebrow: 'AO VIVO EM VÍDEO',
    pageHeroTitle: 'Chamadas com horário marcado',
    pageHeroSubtitle:
      'Conversa ao vivo, sala privativa e combinados claros antes de agendar — sem improviso nem pressa.',
    comingSoon: {
      badge: 'EM BREVE · CHAMADAS EM VÍDEO',
      title: 'Chamadas ao vivo chegam em breve',
      subtitle:
        'Estou organizando a agenda e os últimos detalhes antes de abrir os horários. Aqui embaixo já deixei claro como vai funcionar — e o que não faz parte — para ninguém chegar com expectativa errada.',
      statusBadge: 'Agenda em preparação',
      statusMain:
        'Os agendamentos ainda estão fechados enquanto finalizo os ajustes de horário e reserva.',
      statusSub:
        'Nenhuma reserva ou cobrança está ativa por aqui agora. Quando a agenda abrir, aviso primeiro nos canais oficiais.',
      statusFollowCta: 'Acompanhar no Instagram',
      proposalEyebrow: 'COMBINADOS CLAROS',
      proposalTitle: 'Conversa real, presença e sensualidade na medida — sem conteúdo explícito ao vivo.',
      proposalP1Before:
        'Prefiro deixar isso claro desde o começo: as chamadas em vídeo comigo ',
      proposalP1Strong: 'não são chamadas sexuais explícitas',
      proposalP1After:
        '. A ideia aqui é outra — ter um tempo reservado para conversar sem pressa, trocar ideias sobre corpo e desejo, rir um pouco e viver uma sensualidade leve e natural, sempre com limites respeitados dos dois lados.',
      proposalP2Before:
        'Se o que você busca é o lado mais explícito do meu trabalho, ele já está disponível no ',
      proposalP2Acervo: 'Acervo por assinatura',
      proposalP2Middle: ' e nos ',
      proposalP2Avulsos: 'Avulsos',
      proposalP2After:
        '. As chamadas existem para quem valoriza presença, conversa aberta e olho no olho.',
      expectEyebrow: 'O que entra na chamada',
      expectTitle: 'Como é o encontro',
      expectItems: [
        'Conversa ao vivo 1 a 1, com horário só nosso',
        'Clima leve, adulto e direto — sem roteiro engessado',
        'Sensualidade natural e sugerida, dentro dos meus limites',
        'Espaço aberto para conversa sobre corpo, curiosidades e histórias',
        'Sala privativa individual, acessada pelo link da sua conta',
      ],
      boundariesEyebrow: 'Limites e respeito',
      boundariesTitle: 'O que fica de fora',
      boundariesItems: [
        'Conteúdo sexual explícito ou nudez explícita ao vivo',
        'Qualquer tipo de gravação, print ou captura de tela/áudio',
        'Falta de respeito, assédio ou insistência fora do combinado',
        'Presença de outras pessoas — o acesso é individual',
        'Se qualquer limite for quebrado, a chamada é encerrada na hora',
      ],
      howItWillWorkEyebrow: 'COMO VAI FUNCIONAR',
      howItWillWorkTitle: 'Quatro passos simples, sem exposição',
      howItWillWorkSubtitle:
        'Quando a agenda abrir, você faz todo o processo direto por aqui em poucos minutos.',
      howSteps: [
        {
          step: '01',
          title: 'Escolha a duração',
          description:
            'Você seleciona a opção de tempo disponível na agenda (como 30 ou 60 minutos) de acordo com o que prefere.',
        },
        {
          step: '02',
          title: 'Marque dia e horário',
          description:
            'O calendário mostra os horários livres já ajustados com clareza de fuso horário.',
        },
        {
          step: '03',
          title: 'Confirme via Pix',
          description:
            'O Pix usa identificador padrão discreto e confirma o horário automaticamente. O texto exibido no extrato depende do seu banco.',
        },
        {
          step: '04',
          title: 'Entre na sala privativa',
          description:
            'Com a reserva confirmada, o link da sala fica disponível na sua Minha Conta e no comprovante enviado por e-mail.',
        },
      ],
      pillars: [
        {
          title: 'Privacidade com transparência',
          description:
            'Seus dados seguem a Política de Privacidade e o Pix usa identificador padrão discreto (a exibição final no extrato depende do banco).',
        },
        {
          title: 'Sem gravações',
          description:
            'A conversa acontece apenas ao vivo. Gravar, fotografar a tela ou compartilhar o link não é permitido.',
        },
        {
          title: 'Limites antes de começar',
          description:
            'Todo mundo fica mais à vontade quando sabe exatamente o que está combinado.',
        },
        {
          title: 'Sem correria',
          description:
            'Intervalos planejados entre uma chamada e outra para começar no horário e estar presente de verdade.',
        },
      ],
      alternativesEyebrow: 'ABERTO AGORA',
      alternativesTitle: 'Enquanto a agenda não abre, o resto do site segue no ar',
      alternativesSubtitle: 'Você já pode acompanhar o acervo, escolher avulsos ou montar um personalizado.',
      altAcervoTitle: 'Acervo por assinatura',
      altAcervoDesc: 'Ensaios, vídeos e atualizações contínuas nas plataformas oficiais.',
      altAcervoCta: 'Ver plataformas',
      altAvulsosTitle: 'Avulsos',
      altAvulsosDesc: 'Escolha apenas o ensaio ou vídeo que quiser, em compra única via Pix e acesso na sua conta.',
      altAvulsosCta: 'Ver avulsos',
      altPersonalizadosTitle: 'Personalizados',
      altPersonalizadosDesc: 'Envie sua ideia para fotos ou vídeos feitos sob pedido, com entrega privada na sua conta.',
      altPersonalizadosCta: 'Montar pedido',
      contactPrompt: 'Alguma dúvida sobre as chamadas? Mande uma mensagem',
      avulsosCta: 'Ver avulsos',
      personalizadosCta: 'Pedir personalizado',
      acervoCta: 'Ver acervo',
      notifyEyebrow: 'LISTA DE AVISO',
      notifyTitle: 'Aviso quando a agenda abrir',
      notifySubtitle: 'Mando um único e-mail assim que os primeiros horários forem liberados.',
      notifyNamePlaceholder: 'Seu nome ou apelido',
      notifyEmailPlaceholder: 'voce@email.com',
      notifySubmitCta: 'Me avise quando abrir',
      notifySubmitting: 'Registrando...',
      notifySuccessTitle: 'Anotado',
      notifySuccessBody: 'Assim que a agenda de chamadas abrir, aviso no seu e-mail.',
      notifyErrorFallback: 'Não foi possível salvar seu e-mail agora. Tente novamente.',
      faqEyebrow: 'PERGUNTAS FREQUENTES',
      faqTitle: 'Antes de agendar',
      faqItems: [
        {
          question: 'As chamadas têm conteúdo sexual explícito?',
          answer:
            'Não. A proposta das chamadas é conversa, presença e sensualidade leve e natural, sem nudez ou sexo explícito ao vivo. Esse tipo de conteúdo fica no Acervo por assinatura e nos Avulsos.',
        },
        {
          question: 'Quando a agenda abre?',
          answer:
            'Assim que eu terminar os ajustes finais de agenda e atendimento. O aviso sai aqui no site e no Instagram @nuaborges.',
        },
        {
          question: 'A chamada é gravada? E o que aparece no extrato do Pix?',
          answer:
            'Não há gravação — e gravar a tela ou o áudio é proibido dos dois lados. No Pix, o sistema usa um identificador padrão discreto, mas o texto exato do extrato varia conforme cada banco.',
        },
        {
          question: 'O que já está disponível enquanto a agenda não abre?',
          answer:
            'Tudo o resto funciona normalmente: Acervo por assinatura, Avulsos em compra única (com acesso privado na sua conta) e Pedidos Personalizados.',
        },
      ],
    },
    step1Title: '1. Escolha a duração',
    step2Title: '2. Escolha o dia',
    step3Title: '3. Escolha o horário',
    step4Title: '4. Seus dados e confirmação',
    modalitiesEmpty: 'Nenhuma opção de chamada disponível no momento.',
    durationMinutes: (minutes) => `${minutes} min`,
    selectedBadge: 'Escolhido',
    selectModalityCta: 'Escolher',
    rulesLabel: 'Combinados antes de confirmar',
    calendarLoading: 'Carregando datas livres...',
    calendarEmpty: 'Sem datas livres neste período.',
    calendarTimezoneNote: 'Horários no fuso de Brasília (BRT).',
    slotsPickDateFirst: 'Escolha um dia no calendário para ver os horários.',
    slotsEmpty: 'Não há horários livres nesse dia.',
    slotsAvailableCount: (count) => plural(count, 'horário livre', 'horários livres'),
    summaryCard: {
      heading: 'Sua chamada',
      eyebrow: 'Resumo',
      modalityLabel: 'Formato',
      durationRowLabel: 'Duração',
      dateRowLabel: 'Dia escolhido',
      toSelectLabel: 'Ainda não escolhido',
      dateTimeLabel: 'Dia e horário',
      totalLabel: 'Total',
      rulesHeading: 'Combinados antes de confirmar',
      clientSectionHeading: 'Seus dados e confirmação',
      clientSectionEyebrow: 'PARA RESERVAR',
      clientSectionSubtitle:
        'O link da sala privativa e o comprovante chegam no seu e-mail assim que o Pix confirma.',
      nameLabel: 'Como posso te chamar',
      namePlaceholder: 'Seu nome ou apelido',
      emailLabel: 'E-mail para receber o link da sala',
      emailPlaceholder: 'voce@email.com',
      contactLabel: 'WhatsApp ou Telegram para contato',
      contactPlaceholder: '(11) 99999-9999 ou @usuario',
      notesLabel: 'Algum recado antes? (opcional)',
      notesPlaceholder: 'Se quiser adiantar algo sobre a conversa, escreva aqui.',
      termsAcceptPrefix: 'Li e concordo com os',
      termsLinkLabel: 'Termos de Uso',
      termsSuffix: ', e sei que o texto exibido no extrato do Pix depende do meu banco.',
      privacyBadge: 'Pix • Confirmação automática',
      privacyNote:
        'O Pix usa identificador padrão discreto; a exibição no extrato depende do seu banco.',
      confirmCta: 'Reservar e gerar Pix',
      confirming: 'Reservando...',
      incompleteHint: 'Escolha duração, dia e horário para continuar.',
    },
    reserva: {
      eyebrow: 'COMPROVANTE DA CHAMADA',
      title: 'Detalhes do seu agendamento',
      loading: 'Buscando os dados da chamada...',
      notFoundTitle: 'Não encontrei esse agendamento',
      notFoundBody: 'Confira o link enviado por e-mail ou consulte usando o código da reserva.',
      backToChamadas: 'Voltar para Chamadas',
      holderLabel: 'Agendado por',
      dateLabel: 'Dia e horário',
      durationLabel: 'Duração',
      codeLabel: 'Código',
      statusLabels: {
        aguardando_pagamento: 'Aguardando pagamento',
        confirmada: 'Confirmada',
        concluida: 'Concluída',
        cancelada: 'Cancelada',
        expirada: 'Expirada',
      },
      roomLinkHeading: 'Link da sala',
      openRoomCta: 'Entrar na sala',
      roomPendingNote: 'O link da sala aparece aqui assim que o pagamento for confirmado.',
      instructionsHeading: 'Como entrar',
      rulesHeading: 'Combinados da chamada',
      pixPendingHeading: 'Finalize o Pix para garantir o horário',
      pixPendingSubtitle: 'O horário fica reservado assim que o banco confirmar o pagamento.',
      copyPixCta: 'Copiar código Pix',
      copiedPixCta: 'Código Pix copiado',
      verifyPaymentCta: 'Verificar pagamento',
      verifyingPayment: 'Verificando...',
      myAccountCta: 'Abrir em Minha Conta',
    },
    statusLookup: {
      eyebrow: 'CONSULTAR CHAMADA',
      title: 'Acompanhe seu agendamento',
      subtitle: 'Digite o código da reserva e o e-mail informado na hora de agendar.',
      codeLabel: 'Código da reserva',
      codePlaceholder: 'Ex.: CHM-XXXXXX',
      emailLabel: 'Seu e-mail',
      emailPlaceholder: 'voce@email.com',
      searchCta: 'Consultar',
      searching: 'Buscando...',
      notFoundError: 'Não encontrei nenhuma reserva com esses dados.',
      backToChamadas: 'Voltar para Chamadas',
    },
  },

  // ---------------------------------------------------------------------------
  // 8. PERSONALIZADOS (SOB ENCOMENDA)
  // ---------------------------------------------------------------------------
  personalizados: {
    pageHeroEyebrowFallback: 'PERSONALIZADOS',
    pageHeroTitleFallback: 'Feito a partir da sua ideia',
    pageHeroSubtitleFallback:
      'Monte seu pedido escolhendo fotos, vídeo e detalhes do que você imagina. Tudo dentro dos meus limites, com prazo claro e entrega privada.',
    unavailableTitle: 'Encomendas pausadas por enquanto',
    unavailableBody:
      'A fila de personalizados está fechada temporariamente. Enquanto isso, você pode conferir os avulsos disponíveis.',
    backToAvulsosCta: 'Ver avulsos',
    photoCard: {
      stepLabel: '01 · FOTOS',
      title: 'Quantas fotos?',
      subtitle: 'Escolha a quantidade de fotos para o seu pedido.',
      unitPriceLabel: (formattedPrice) => `${formattedPrice} cada`,
      countLabel: (count) => plural(count, 'foto', 'fotos'),
      noPhotosLabel: 'Sem fotos',
      minHint: (min) => `Se o pedido for só de fotos, o mínimo sugerido é ${min}.`,
    },
    videoCard: {
      stepLabel: '02 · VÍDEO',
      title: 'Quer incluir vídeo?',
      subtitle: 'Escolha a duração ou siga apenas com fotos.',
      includedLabel: 'Escolhido',
      noVideoLabel: 'Sem vídeo (apenas fotos)',
    },
    preferencesCard: {
      stepLabel: '03 · SUA IDEIA',
      title: 'Detalhes e formato de entrega',
      subtitle: 'Me conte o que você tem em mente e escolha como prefere receber.',
      briefingLabel: 'O que você imagina para esse pedido?',
      briefingPlaceholder: 'Conte o clima, roupa, cenário ou detalhes importantes para eu entender sua ideia...',
      briefingHelper: 'Quanto mais direto você for aqui, melhor fica o resultado.',
      mentionNameTitle: 'Falar seu nome no vídeo',
      mentionNameDesc: 'Eu digo o nome escolhido durante a gravação.',
      express24hTitle: 'Entrega em até 24h',
      express24hDesc: 'Seu pedido passa na frente na fila após a confirmação do Pix.',
      deliveryChannelLabel: 'Onde prefere receber',
      deliveryVaultTitle: 'Na minha conta (Cofre)',
      deliveryVaultDesc: 'Entrega privada dentro do site, disponível na sua Minha Conta.',
      deliveryTelegramTitle: 'Telegram',
      deliveryTelegramDesc: 'Envio direto para o usuário informado.',
      limitsHeading: 'Limites e combinados',
    },
    summaryCard: {
      heading: 'Seu personalizado',
      eyebrow: 'Resumo do pedido',
      photosRow: (count) => plural(count, 'foto', 'fotos'),
      videoRow: 'Vídeo',
      mentionRow: 'Falar seu nome',
      expressRow: 'Entrega em até 24h',
      totalLabel: 'Total',
      minOrderWarning: (formattedMin) => `O valor mínimo para personalizados é ${formattedMin}.`,
      deliveryEstimateLabel: 'Prazo de produção',
      express24hDeliveryText: 'Prioridade na fila: entrega em até 24 horas úteis.',
      vaultDeliveryTitle: 'Entrega no Cofre (Minha Conta)',
      vaultDeliveryDesc: 'Assim que ficar pronto, envio o aviso por e-mail e libero na sua conta.',
      telegramDeliveryTitle: 'Entrega pelo Telegram',
      telegramDeliveryDesc: 'Envio direto para o usuário informado no formulário.',
      guidelinesHeading: 'Limites e combinados',
      clientSectionHeading: 'Seus dados e confirmação',
      clientSectionEyebrow: 'PARA FINALIZAR',
      clientSectionSubtitle:
        'Informe como prefere ser chamado(a) e onde receber o acesso após o Pix.',
      nameLabel: 'Como posso te chamar',
      namePlaceholder: 'Seu nome ou apelido',
      contactLabel: 'E-mail para receber o acesso',
      contactLabelTelegram: 'Seu @ no Telegram',
      contactPlaceholderVault: 'voce@email.com',
      contactPlaceholderTelegram: '@seu_usuario',
      vaultEmailHint:
        'Envio o link de acesso ao Cofre para este e-mail assim que o pagamento confirmar.',
      termsSuffix: ', e sei que o texto exibido no extrato do Pix depende do meu banco.',
      privacyBadge: 'Pix • Entrega privada',
      privacyNote:
        'O Pix usa identificador padrão discreto; a exibição no extrato depende do seu banco.',
      submitCta: 'Gerar Pix e enviar pedido',
      submitting: 'Gerando Pix...',
      emptySelectionHint: 'Escolha fotos ou vídeo para montar seu pedido.',
    },
    pedido: {
      eyebrow: 'SEU PERSONALIZADO',
      title: 'Andamento do pedido',
      loading: 'Carregando seu pedido...',
      notFoundTitle: 'Pedido não encontrado',
      notFoundBody: 'Confira o link recebido por e-mail ou acesse pela sua Minha Conta.',
      backCta: 'Voltar para Personalizados',
      orderCodeLabel: 'Pedido',
      statusLabels: {
        aguardando_pagamento: 'Aguardando pagamento',
        em_producao: 'Em produção',
        pronto: 'Pronto',
        entregue: 'Entregue',
        cancelado: 'Cancelado',
      },
      pixHeading: 'Finalize o Pix',
      pixSubtitle: 'Assim que o pagamento confirmar, começo a preparar seu pedido.',
      copyPixCta: 'Copiar código Pix',
      copiedPixCta: 'Código Pix copiado',
      checkPaymentCta: 'Verificar pagamento',
      checkingPayment: 'Verificando...',
      inProductionTitle: 'Já está em produção',
      inProductionBody: 'Pagamento confirmado e briefing recebido. Assim que ficar pronto, aviso por e-mail.',
      readyTitle: 'Seu pedido está pronto',
      readyBody: 'A entrega já está liberada no seu Cofre.',
      openVaultCta: 'Abrir entrega no Cofre',
      openAccountCta: 'Ver em Minha Conta',
      summaryHeading: 'O que foi pedido',
      briefingHeading: 'Detalhes enviados',
    },
  },

  // ---------------------------------------------------------------------------
  // 9. SOBRE MIM (REGISTRO AUTORAL — SEM INVENTAR FATOS)
  // ---------------------------------------------------------------------------
  sobre: {
    eyebrowFallback: 'SOBRE MIM',
    headlineFallback: 'Corpo, conversa aberta e trabalho autoral.',
    roleFallback: 'Educadora sexual e sexóloga em formação',
    pullQuoteFallback: 'Prazer não precisa de desculpa, nem de personagem.',
    paragraph1Fallback:
      'Estudo sexualidade, falo sobre corpo e relações com naturalidade e levo esse mesmo olhar para a fotografia e para o vídeo.',
    paragraph2Fallback:
      'Este site reúne tudo o que eu produzo com autonomia: ensaios avulsos, pedidos personalizados, canais oficiais e um espaço pensado para quem valoriza respeito, clareza e presença real.',
    closingSignPrefix: 'Um abraço,',
    closingTitle: 'Se quiser continuar por aqui',
    closingSubtitle: 'Veja os formatos disponíveis no site ou mande uma mensagem se tiver algum projeto em mente.',
    ctaAcervoFallback: 'Ver acervo',
    ctaAvulsos: 'Ver avulsos',
    ctaContato: 'Falar comigo',
    backHome: 'Voltar ao início',
  },

  // ---------------------------------------------------------------------------
  // 10. CONTATO & MODAL DE CONTATO
  // ---------------------------------------------------------------------------
  contato: {
    eyebrow: 'CONTATO',
    title: 'Quer falar sobre um projeto ou tirar uma dúvida?',
    subtitle: 'Parcerias, imprensa, palestras, eventos ou suporte sobre algum pedido.',
    directChannelLabel: 'E-mail direto:',
    copyEmailCta: 'Copiar',
    copiedEmailCta: 'Copiado',
    formTitle: 'Mande uma mensagem',
    formSubtitle: 'Preencha abaixo que o retorno chega no seu e-mail.',
    nameLabel: 'Seu nome',
    namePlaceholder: 'Nome ou empresa',
    emailLabel: 'Seu e-mail',
    emailPlaceholder: 'voce@email.com',
    subjectLabel: 'Assunto',
    messageLabel: 'Mensagem',
    messagePlaceholder: 'Conte brevemente do que se trata...',
    submitCta: 'Enviar mensagem',
    submitting: 'Enviando...',
    turnstileHint: 'Complete a verificação de segurança para enviar.',
    successTitle: 'Mensagem recebida',
    successBody: 'Obrigada por escrever. O retorno chega no e-mail que você informou.',
    sendAnotherCta: 'Enviar outra mensagem',
    errors: {
      nameRequired: 'Informe seu nome ou o nome da empresa.',
      emailRequired: 'Informe um e-mail para receber a resposta.',
      emailInvalid: 'Esse e-mail não parece válido (ex.: nome@dominio.com).',
      messageRequired: 'Escreva sua mensagem antes de enviar.',
      sendFailed: 'Não foi possível enviar agora. Tente novamente em instantes.',
      networkFailed: 'Houve erro de conexão. Tente de novo ou copie o e-mail direto.',
    },
    modalCloseAria: 'Fechar',
    modalSuccessDoneCta: 'Fechar',
    otherChannelsHeading: 'Outros canais',
    faqLinkPrompt: 'Dúvida sobre Pix ou acesso?',
    faqLinkLabel: 'Ver perguntas frequentes',
  },

  // ---------------------------------------------------------------------------
  // 11. ÁREA DO CLIENTE (MINHA CONTA — REGISTRO FUNCIONAL + HUMANO)
  // ---------------------------------------------------------------------------
  conta: {
    redirectingLabel: 'Abrindo sua Minha Conta...',
    shell: {
      pageTitle: 'Minha Conta',
      subtitleAuthenticated: 'Tudo o que você comprou, pediu ou agendou organizado em um só lugar.',
      tabs: {
        biblioteca: 'Biblioteca',
        personalizados: 'Personalizados',
        chamadas: 'Chamadas',
        conta: 'Pedidos',
        perfil: 'Perfil',
      },
      contextualActions: {
        biblioteca: 'Ver avulsos',
        personalizados: 'Pedir personalizado',
        chamadas: 'Ver chamadas',
        conta: 'Ir para o site',
      },
      sessionExpiredBanner: 'Sua sessão expirou. Entre de novo com seu e-mail para continuar.',
      logoutLabel: 'Sair',
      refreshAria: 'Atualizar',
      supportButton: 'Ajuda',
    },
    login: {
      eyebrow: 'MINHA CONTA',
      title: 'Acesse seus conteúdos e pedidos',
      subtitle: 'Sem senha para lembrar: digite seu e-mail e eu envio um código temporário para você entrar.',
      emailLabel: 'Seu e-mail',
      emailPlaceholder: 'voce@email.com',
      sendCodeCta: 'Enviar código de acesso',
      sendingCode: 'Enviando código...',
      codeStepTitle: 'Digite o código',
      codeStepSubtitle: (email) => `Enviei um código de 6 dígitos para ${email}.`,
      codeLabel: 'Código',
      codePlaceholder: '000000',
      verifyCta: 'Entrar',
      verifying: 'Verificando...',
      resendCta: 'Reenviar código',
      resendCountdown: (seconds) => `Reenviar em ${seconds}s`,
      backToEmailCta: 'Trocar e-mail',
      spamHint: 'Não encontrou? Vale olhar a pasta de spam ou promoções.',
      privacyFooter: 'Acesso protegido por código temporário enviado ao seu e-mail.',
      turnstileError: 'Não foi possível carregar a verificação de segurança.',
      turnstileRetry: 'Tentar novamente',
    },
    library: {
      heading: 'Biblioteca',
      subtitle: 'Seus ensaios e vídeos avulsos liberados.',
      emptyTitle: 'Nada por aqui ainda',
      emptyBody: 'Assim que você comprar um conteúdo avulso, ele fica salvo aqui para assistir quando quiser.',
      exploreAvulsosCta: 'Ver avulsos',
      claimLegacyCta: 'Comprou antes? Vincular pedido',
      openItemCta: 'Abrir no Cofre',
      photoCount: (count) => plural(count, 'foto', 'fotos'),
      videoCount: (count) => plural(count, 'vídeo', 'vídeos'),
      loadingLabel: 'Carregando sua biblioteca...',
    },
    personalizados: {
      heading: 'Personalizados',
      subtitle: 'Status da produção e acesso às entregas prontas.',
      emptyTitle: 'Você ainda não tem pedidos personalizados',
      emptyBody: 'Quando encomendar fotos ou vídeos sob medida, o acompanhamento aparece aqui.',
      newOrderCta: 'Montar um personalizado',
      openDeliveryCta: 'Abrir entrega',
      payNowCta: 'Concluir Pix',
      viewDetailsCta: 'Ver pedido',
      supportCta: 'Precisa de ajuda?',
    },
    appointments: {
      heading: 'Chamadas',
      subtitle: 'Horários confirmados, sala privativa e pedidos de alteração.',
      emptyTitle: 'Nenhuma chamada agendada',
      emptyBody: 'Quando você agendar uma chamada em vídeo, os detalhes e o link da sala aparecem aqui.',
      scheduleNewCta: 'Ver chamadas',
      openRoomCta: 'Entrar na sala',
      openVoucherCta: 'Ver detalhes',
      requestRescheduleCta: 'Pedir remarcação',
      requestCancelCta: 'Pedir cancelamento',
      modalCancelTitle: 'Pedir cancelamento',
      modalRescheduleTitle: 'Pedir remarcação',
      modalCancelBody:
        'Seu pedido de cancelamento será analisado conforme a política informada no agendamento.',
      modalRescheduleBody:
        'Me diga qual dia ou horário funciona melhor para você. Quando eu responder, você confirma por aqui.',
      modalCancelPlaceholder: 'Se quiser, conte brevemente o motivo...',
      modalReschedulePlaceholder: 'Ex.: Sexta à noite teria horário livre?',
      modalBackCta: 'Voltar',
      modalConfirmCta: 'Confirmar',
      modalSubmitting: 'Enviando…',
    },
    orders: {
      heading: 'Pedidos',
      subtitle: 'Compras, pagamentos pendentes e comprovantes.',
      emptyTitle: 'Nenhum pedido nesta conta',
      emptyBody: 'Se você comprou usando outro e-mail ou antes de entrar aqui, vincule o código do pedido abaixo.',
      claimToggleCta: 'Vincular pedido anterior',
      claimBoxTitle: 'Trazer uma compra anterior',
      claimBoxSubtitle: 'Digite o código que chegou no seu e-mail de confirmação para vincular à conta.',
      claimInputLabel: 'Código do pedido',
      claimInputPlaceholder: 'Ex.: ord_... ou PER-...',
      claimSubmitCta: 'Vincular pedido',
      claimSubmitting: 'Vinculando...',
      claimSuccessFallback: 'Pedido vinculado à sua conta.',
      claimErrorFallback: 'Não encontrei esse pedido para vincular.',
      receiptCta: 'Ver comprovante',
      resumePaymentCta: 'Concluir Pix',
      supportCta: 'Falar com suporte',
      paymentPanelTitle: 'Pix aguardando pagamento',
      paymentPanelSubtitle: 'Escaneie o QR Code ou copie o código abaixo para concluir o pedido.',
      paymentCopyPixCta: 'Copiar código Pix',
      paymentCopiedPixCta: 'Código Pix copiado',
      paymentRenewCta: 'Gerar novo código Pix',
      paymentRenewing: 'Gerando novo Pix...',
    },
    profile: {
      tabs: {
        dados: 'Dados',
        seguranca: 'Segurança',
        privacidade: 'Privacidade',
      },
      dadosTitle: 'Seus dados',
      dadosSubtitle: 'Altere como quer ser chamado(a) ou atualize seu e-mail de acesso.',
      saveCta: 'Salvar',
      savingCta: 'Salvando...',
      savedFeedback: 'Alterações salvas.',
      segurancaTitle: 'Segurança e sessões',
      segurancaSubtitle: 'Veja onde sua conta está conectada e encerre sessões quando precisar.',
      logoutAllCta: 'Sair dos outros dispositivos',
      privacidadeTitle: 'Privacidade e LGPD',
      privacidadeSubtitle: 'Baixe uma cópia dos seus dados ou solicite o encerramento da conta.',
      exportDataCta: 'Baixar meus dados',
      closeAccountTitle: 'Encerrar conta',
      closeAccountWarning:
        'Seus dados identificáveis serão anonimizados e todas as sessões serão encerradas imediatamente. Registros fiscais e financeiros obrigatórios são mantidos sem dados pessoais pelo prazo legal.',
      closeAccountButton: 'Solicitar encerramento e anonimização',
      closeAccountConfirmPlaceholder: 'Digite "ENCERRAR CONTA" para confirmar',
      closeAccountConfirmCta: 'Confirmar anonimização',
      closeAccountConfirming: 'Anonimizando…',
      cancelCta: 'Cancelar',
    },
  },

  // ---------------------------------------------------------------------------
  // 12. VISUALIZADOR DO COFRE
  // ---------------------------------------------------------------------------
  vault: {
    backToLibrary: 'Voltar para Biblioteca',
    backToPersonalizados: 'Voltar para Personalizados',
    backToLogin: 'Voltar para o acesso',
    loading: 'Carregando seu conteúdo...',
    errorTitle: 'Não foi possível abrir agora',
    errorRetryCta: 'Tentar novamente',
    photosTab: (count) => `Fotos (${count})`,
    videosTab: (count) => `Vídeos (${count})`,
    emptyMedia: 'Nenhuma mídia nesta aba.',
    browserAuthTitle: 'Confirme este navegador',
    browserAuthBody: 'Por segurança, autorize este navegador para abrir as mídias do seu Cofre.',
    browserAuthCta: 'Autorizar navegador',
    browserAuthAuthorizing: 'Autorizando...',
    videoLoading: 'Carregando vídeo...',
    videoError: 'Não foi possível reproduzir este vídeo agora.',
    lightboxCloseAria: 'Fechar visualização',
    lightboxPrevAria: 'Foto anterior',
    lightboxNextAria: 'Próxima foto',
    photoCounter: (current, total) => `${current} / ${total}`,
    downloadDisabledNote: 'Visualização protegida na sua conta.',
    states: {
      confirm: {
        heading: 'Confirme este navegador',
        body: 'Enviei um link único de confirmação para o e-mail do pedido. Abra a mensagem neste mesmo navegador para liberar a visualização.',
      },
      approve: {
        heading: 'Autorize este navegador',
        body: 'Confirme abaixo que foi você quem pediu para abrir estes arquivos aqui.',
      },
      sent: {
        heading: 'Link enviado para o seu e-mail',
        body: 'Confira a caixa de entrada e o spam, e abra o link neste mesmo navegador para liberar o acesso.',
      },
      expired: {
        heading: 'Esse link expirou',
        body: 'Ele já venceu ou foi usado antes. Peça um novo link abaixo para continuar.',
      },
      wrongBrowser: {
        heading: 'Abra no mesmo navegador',
        body: 'Por segurança, esse link precisa abrir no navegador onde você pediu o acesso. Se abriu dentro do app de e-mail, copie e cole no navegador.',
      },
      wait: {
        heading: 'Aguarde alguns minutos',
        body: 'Houve vários pedidos de confirmação seguidos. Espere cerca de dez minutos antes de tentar novamente.',
      },
      unavailable: {
        heading: 'Não foi possível abrir agora',
        body: 'Verifique sua conexão e tente de novo em alguns instantes.',
      },
      missing: {
        heading: 'Conteúdo não encontrado',
        body: 'Não consegui localizar esse item na sua conta.',
      },
      idle: {
        heading: 'Visualização pausada por inatividade',
        body: 'Para proteger sua privacidade, o acesso temporário foi fechado. É só reabrir abaixo quando quiser continuar.',
      },
    },
  },

  // ---------------------------------------------------------------------------
  // 13. LIGHTBOX PÚBLICO & PLAYER
  // ---------------------------------------------------------------------------
  lightbox: {
    viewingAria: (title) => `Visualizando: ${title}`,
    closeAria: 'Fechar (Esc)',
    prevAria: 'Foto anterior',
    nextAria: 'Próxima foto',
    captionFallback: 'Nua Borges',
    openAcervoCta: 'Ver acervo',
    openAcervoAria: 'Ir para o acervo',
  },
  musicPlayer: {
    regionAria: 'Player de áudio do site',
  },

  // ---------------------------------------------------------------------------
  // 14. PÁGINA 404
  // ---------------------------------------------------------------------------
  notFound: {
    badge: 'ERRO 404',
    title: 'Essa página não está por aqui',
    description: 'O link pode ter mudado, saído do ar ou ter sido digitado com algum detalhe diferente.',
    backHomeCta: 'Voltar ao início',
    secondaryChamadasCta: 'Ver chamadas',
    secondaryAcervoCta: 'Ver acervo',
    footerNote: 'NUA BORGES',
  },

  // ---------------------------------------------------------------------------
  // 15. METADADOS & SEO PÚBLICOS (COERENTES COM EDGE + CLIENTE)
  // ---------------------------------------------------------------------------
  seo: {
    '/': {
      title: 'Nua Borges — Site oficial',
      description:
        'Educadora sexual e sexóloga em formação. Ensaios avulsos, personalizados, acervo e trabalho autoral com naturalidade.',
    },
    '/sobre': {
      title: 'Sobre mim | Nua Borges',
      description:
        'Quem é Nua Borges: educação sexual, autoimagem, fotografia e trabalho autoral com naturalidade.',
    },
    '/avulsos': {
      title: 'Avulsos | Nua Borges',
      description:
        'Ensaios e vídeos avulsos de Nua Borges em compra única via Pix, sem assinatura, com acesso privado na sua conta.',
    },
    '/acervo': {
      title: 'Acervo por assinatura | Nua Borges',
      description:
        'Veja os perfis oficiais de assinatura para acompanhar ensaios, vídeos e atualizações contínuas de Nua Borges.',
    },
    '/chamadas': {
      title: 'Chamadas em vídeo | Nua Borges',
      description:
        'Como funcionam as chamadas de vídeo com horário marcado com Nua Borges, combinados e disponibilidade.',
    },
    '/personalizados': {
      title: 'Personalizados | Nua Borges',
      description:
        'Encomende fotos e vídeos feitos a partir da sua ideia com Nua Borges, com prazo claro e entrega privada.',
    },
    '/contato': {
      title: 'Contato | Nua Borges',
      description:
        'Canais oficiais de contato de Nua Borges para parcerias, imprensa, eventos e suporte sobre pedidos.',
    },
    '/termos': {
      title: 'Termos de Uso | Nua Borges',
      description: 'Consulte os Termos de Uso do site oficial de Nua Borges.',
    },
    '/privacidade': {
      title: 'Política de Privacidade | Nua Borges',
      description: 'Saiba como o site oficial de Nua Borges trata dados pessoais e como entrar em contato.',
    },
  },

  // ---------------------------------------------------------------------------
  // 16. OVERRIDES CONSERVADORES PARA CAMPOS STOCK DE FÁBRICA DO CMS
  // (Aplicados SOMENTE quando o campo publicado ainda contém o texto original
  //  de fábrica; qualquer edição manual da Nua sempre prevalece.)
  // ---------------------------------------------------------------------------
  cmsStockOverrides: {
    'hero.eyebrow': 'TRABALHO AUTORAL',
    'hero.tagline': 'Corpo, prazer e conversa direta — sem personagem.',
    'hero.description':
      'Educadora sexual e sexóloga em formação. Ensaios, vídeos e encontros feitos com naturalidade.',
    'hero.ctaText': 'Ver o acervo',
    'hero.exploreText': 'Explorar por aqui',
    'about.eyebrow': 'QUEM ASSINA',
    'about.headline': 'Falar de corpo e desejo não precisa ser um assunto cheio de cerimônia.',
    'about.role': 'Educadora sexual e sexóloga em formação',
    'about.pullQuote': 'Prazer não precisa de desculpa, nem de personagem.',
    'about.paragraph1':
      'Sou educadora sexual, sexóloga em formação e levo para a fotografia a mesma naturalidade com que falo sobre corpo e relações.',
    'about.paragraph2':
      'Este espaço reúne o que produzo com autonomia: ensaios avulsos, encomendas personalizadas e canais oficiais, sem pressa e sem exagero.',
    'gallery.eyebrow': 'BASTIDORES',
    'gallery.title': 'Um recorte do que produzo',
    'gallery.subtitle': 'Algumas prévias para você sentir o clima dos ensaios.',
    'avulsos.eyebrow': 'AVULSOS RECENTES',
    'avulsos.title': 'Para ver no seu ritmo',
    'avulsos.subtitle':
      'Ensaios e vídeos disponíveis em compra única. Você escolhe o que te interessa e acessa com privacidade na sua conta.',
    'avulsos.upsellText':
      'Se preferir acompanhar tudo de forma contínua, o acervo mensal também está disponível nas plataformas oficiais.',
    'vipClub.eyebrow': 'NOVIDADES POR E-MAIL',
    'vipClub.title': 'Quando sair algo novo, eu aviso por e-mail',
    'vipClub.subtitle':
      'Sem encher sua caixa de entrada: só avisos de ensaios novos, aberturas de agenda e novidades do site.',
    'vipClub.buttonText': 'Quero receber avisos',
    'personalizados.eyebrow': 'PERSONALIZADOS',
    'personalizados.title': 'Feito a partir da sua ideia',
    'personalizados.subtitle':
      'Monte seu pedido com fotos, vídeo e os detalhes do que você imagina. Tudo com prazo claro e entrega privada.',
    'personalizados.estimatedDeliveryText': 'Em até 72 horas úteis após a confirmação do pagamento.',
    'personalizados.termsAndLimitsText':
      'Produção autoral dentro dos meus limites de consentimento. Não produzo fetiches extremos, conteúdo degradante ou que exponha terceiros, e me reservo o direito de recusar pedidos fora desses critérios.',
    'contact.modalTitle': 'Contato',
    'contact.modalSubtitle': 'Parcerias, imprensa, palestras, eventos ou dúvidas sobre pedidos.',
    'footer.role': 'Educadora sexual e sexóloga em formação',
    'footer.concept': 'Corpo, prazer e conversa aberta — no meu ritmo.',
    'institutional.sectionTitle': 'Informações',
    'channels.onlyfans.subtitle': 'Ensaios, vídeos e atualizações frequentes por assinatura.',
    'channels.onlyfans.ctaText': 'Abrir OnlyFans',
    'channels.privacy.subtitle': 'Catálogo mensal por assinatura com opções de pagamento no Brasil.',
    'channels.privacy.ctaText': 'Abrir Privacy',
    'channels.instagram.subtitle': 'Rotina, conversas sobre sexualidade e bastidores do dia a dia.',
    'channels.instagram.ctaText': 'Abrir Instagram',
    'channels.contactBanner.title': 'Parcerias, imprensa ou eventos?',
    'channels.contactBanner.subtitle': 'Envie sua proposta pelo canal oficial de contato.',
    'channels.contactBanner.ctaText': 'Escrever mensagem',
  },
};
