/**
 * Tipos centrais do sistema de Identidade Verbal — Nua Borges
 *
 * Mantém contrato tipado único entre a comunicação original (`original.ts`)
 * e a identidade verbal experimental (`nua-autoral.experimental.ts`).
 */

export type CopyMode = 'original' | 'nua_autoral_experimental';

export interface VerbalIdentityConfig {
  mode: CopyMode;
  enabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  version: number;
}

export interface RouteSeoCopy {
  title: string;
  description: string;
}

export type PublicSeoRoute =
  | '/'
  | '/sobre'
  | '/avulsos'
  | '/acervo'
  | '/chamadas'
  | '/personalizados'
  | '/contato'
  | '/termos'
  | '/privacidade';

export type CmsStockOverrideKey =
  | 'hero.eyebrow'
  | 'hero.tagline'
  | 'hero.description'
  | 'hero.ctaText'
  | 'hero.exploreText'
  | 'about.eyebrow'
  | 'about.headline'
  | 'about.role'
  | 'about.pullQuote'
  | 'about.paragraph1'
  | 'about.paragraph2'
  | 'gallery.eyebrow'
  | 'gallery.title'
  | 'gallery.subtitle'
  | 'avulsos.eyebrow'
  | 'avulsos.title'
  | 'avulsos.subtitle'
  | 'avulsos.upsellText'
  | 'vipClub.eyebrow'
  | 'vipClub.title'
  | 'vipClub.subtitle'
  | 'vipClub.buttonText'
  | 'personalizados.eyebrow'
  | 'personalizados.title'
  | 'personalizados.subtitle'
  | 'personalizados.estimatedDeliveryText'
  | 'personalizados.termsAndLimitsText'
  | 'contact.modalTitle'
  | 'contact.modalSubtitle'
  | 'footer.role'
  | 'footer.concept'
  | 'institutional.sectionTitle'
  | 'channels.onlyfans.subtitle'
  | 'channels.onlyfans.ctaText'
  | 'channels.privacy.subtitle'
  | 'channels.privacy.ctaText'
  | 'channels.instagram.subtitle'
  | 'channels.instagram.ctaText'
  | 'channels.contactBanner.title'
  | 'channels.contactBanner.subtitle'
  | 'channels.contactBanner.ctaText';

export interface CopyFaqEntry {
  question: string;
  answer: string;
}

export interface CopyCaminhoEntry {
  id: 'acervo' | 'avulsos' | 'experiencias';
  title: string;
  subtitle: string;
  subtitleComingSoon?: string;
  description: string;
  descriptionComingSoon?: string;
  buttonText: string;
  buttonTextComingSoon?: string;
  secondaryButtonTextComingSoon?: string;
}

export interface CopyDictionary {
  nav: {
    inicio: string;
    avulsos: string;
    chamadas: string;
    personalizados: string;
    sobre: string;
    minhaConta: string;
    emBreveBadge: string;
    brandAriaSuffix: string;
    mainNavAria: string;
    mobileNavAria: string;
    openMenuAria: string;
    closeMenuAria: string;
  };
  footer: {
    ariaLabel: string;
    brandBackHomeAria: (brandName: string) => string;
    exploreHeading: string;
    exploreLinks: {
      inicio: string;
      acervo: string;
      avulsos: string;
      chamadas: string;
      personalizados: string;
    };
    emBreveBadge: string;
    infoHeadingDefault: string;
    infoLinks: {
      sobre: string;
      contato: string;
      termos: string;
      privacidade: string;
      acessoPrivado: string;
    };
    platformsHeading: string;
    platformAriaOf: (title: string, brandName: string) => string;
    developedBy: string;
    copyrightFallback: (year: number, brandName: string) => string;
  };
  home: {
    hero: {
      scrollLabel: string;
      scrollAria: string;
      imageCounterAria: (current: number, total: number) => string;
      goToPhotoAria: (index: number) => string;
    };
    lancamentos: {
      eyebrowFallback: string;
      titleFallback: string;
      subtitleFallback: string;
      exploreAllCta: string;
      badgeFallback: string;
      cardMetaFeatured: string;
      cardMetaStandard: string;
      cardCta: string;
      mediaSummaryFallback: string;
      formatPhotos: (count: number) => string;
      formatVideos: (count: number) => string;
    };
    manifesto: {
      eyebrowFallback: string;
      quoteFallback: string;
      bioFallback: string;
      ctaLabel: string;
    };
    bastidores: {
      eyebrowFallback: string;
      titleFallback: string;
      seeAllCta: string;
      regionAria: string;
      openAcervoAria: string;
      openPreviewAria: string;
      blurredTitle: string;
      blurredCta: string;
    };
    caminhos: {
      eyebrow: string;
      title: string;
      subtitle: string;
      items: CopyCaminhoEntry[];
    };
    faq: {
      eyebrow: string;
      title: string;
      subtitle: string;
      items: CopyFaqEntry[];
    };
    vipBanner: {
      eyebrowFallback: string;
      titleFallback: string;
      subtitleFallback: string;
      buttonFallback: string;
    };
    vipModal: {
      closeAria: string;
      eyebrowFallback: string;
      titleFallback: string;
      subtitleFallback: string;
      nameLabel: string;
      namePlaceholder: string;
      nameRequiredError: string;
      emailLabel: string;
      emailPlaceholder: string;
      emailRequiredError: string;
      emailInvalidError: string;
      privacyNote: string;
      submitFallback: string;
      submitting: string;
      turnstileHint: string;
      genericError: string;
      networkError: string;
      successTitle: string;
      successBodyWithEmail: string;
      successBodyDefault: string;
      successDoneCta: string;
    };
  };
  avulsos: {
    pageHeroEyebrow: string;
    pageHeroTitleFallback: string;
    pageHeroSubtitle: string;
    filterAll: string;
    filterPhotos: string;
    filterVideos: string;
    filterMixed: string;
    searchPlaceholder: string;
    emptyCatalogTitle: string;
    emptyCatalogBody: string;
    emptyFilterTitle: string;
    emptyFilterBody: string;
    clearFiltersCta: string;
    cardCta: string;
    cardPrivateTag: string;
    cardSinglePaymentTag: string;
    cardPreviewCount: (photos: number, videos: number) => string;
    backToCatalog: string;
    aboutProductionHeading: string;
    includedHeading: string;
    includedPhotos: (count: number) => string;
    includedVideos: (count: number) => string;
    includedPrivateVault: string;
    includedSinglePayment: string;
    includedEmailNotice: string;
    purchaseCard: {
      singlePaymentEyebrow: string;
      buyNowCta: string;
      pixInstantBadge: string;
      vaultAccessNote: string;
      paymentNote: string;
      supportLinkLabel: string;
      alreadyBoughtHint: string;
      openAccountLink: string;
    };
    upsell: {
      eyebrow: string;
      title: string;
      subtitleFallback: string;
      cta: string;
    };
    notFound: {
      badge: string;
      title: string;
      descriptionPrefix: string;
      descriptionSuffix: string;
      otherAvailableHeading: string;
      backCatalogCta: string;
      backHomeCta: string;
    };
    gallery: {
      previewBadge: string;
      lockedOverlayTitle: string;
      lockedOverlaySubtitle: string;
      photoLabel: (current: number, total: number) => string;
      avulsoVideoEyebrow: string;
      avulsoPhotoEyebrow: string;
      avulsoVideoTitle: string;
      avulsoPhotoTitle: string;
      avulsoBody: string;
      avulsoFooterVideoTitle: string;
      avulsoFooterPhotoTitle: string;
      avulsoFooterSubtitle: string;
      reservedPreviewTitle: string;
      reservedPreviewSubtitle: string;
      prevPreviewAria: string;
      nextPreviewAria: string;
    };
    catalogDetails: {
      eyebrowFallback: string;
      titleFallback: string;
      subtitleFallback: string;
      emptyEditingNotice: string;
      emptyModalityNotice: string;
      featuredBadgeFallback: string;
      featuredEyebrow: string;
      accessVaultShort: string;
      pixSingleShort: string;
      pixShort: string;
      upsellEyebrow: string;
      upsellTitle: string;
      upsellBody: string;
      upsellCta: string;
      bottomTrustPix: string;
      bottomTrustVault: string;
      bottomTrustAuto: string;
      loadingProduction: string;
      backToCatalogLabel: string;
      collectionNotesEyebrow: string;
      collectionNotesTitle: string;
      collectionBadgeFallback: string;
      alreadyOwnedNotice: string;
      viewInLibraryCta: string;
      openLibraryCta: string;
      checkingAvailability: string;
      unavailableNow: string;
      singlePaymentMeta: string;
      noRecurrenceBadge: string;
      buyButtonFallback: string;
      pixReleaseNote: string;
      alreadyOwnedLink: string;
      claimPreviousLink: string;
      upsellAsideEyebrow: string;
      upsellAsideTitle: string;
      upsellAsideBody: string;
      upsellAsideCta: string;
    };
  };
  checkout: {
    modalCloseAria: string;
    steps: {
      review: string;
      identification: string;
      pix: string;
      approved: string;
    };
    summary: {
      eyebrow: string;
      totalLabel: string;
      pixBadge: string;
      emailFieldLabel: string;
      emailPlaceholder: string;
      nameFieldLabel: string;
      namePlaceholder: string;
      generatePixCta: string;
      generatingPix: string;
      securityNote: string;
      emailRequiredError: string;
      emailInvalidError: string;
      genericOrderError: string;
    };
    inlineAuth: {
      badge: string;
      title: string;
      subtitle: string;
      loggedInAs: (email: string) => string;
      changeAccount: string;
      emailLabel: string;
      emailPlaceholder: string;
      sendCodeCta: string;
      sendingCode: string;
      codeLabel: string;
      codePlaceholder: string;
      codeHint: (email: string) => string;
      verifyCodeCta: string;
      verifyingCode: string;
      resendCode: string;
      resendCountdown: (seconds: number) => string;
      changeEmail: string;
      continueWithoutLogin: string;
    };
    pix: {
      eyebrow: string;
      title: string;
      subtitle: string;
      expiresIn: (formatted: string) => string;
      expiredLabel: string;
      copyCodeCta: string;
      copiedCodeCta: string;
      howToPayTitle: string;
      howToPaySteps: [string, string, string];
      checkingStatus: string;
      checkNowCta: string;
      privacyNote: string;
      regenerateCta: string;
    };
    approved: {
      eyebrow: string;
      title: string;
      titleChamada: string;
      titlePersonalizado: string;
      subtitle: string;
      paidConfirmationPrefix: string;
      paidConfirmationSuffix: string;
      tokenHeading: string;
      tokenSingleUseBadge: string;
      tokenCopyCta: string;
      tokenCopiedCta: string;
      tokenWarningPrefix: string;
      tokenWarningStrong: string;
      tokenWarningMiddle: string;
      tokenWarningOnce: string;
      tokenWarningSuffix: string;
      confirmedBanner: string;
      navigatingLabel: string;
      myAccountChamadaCta: string;
      myAccountPersonalizadoCta: string;
      myAccountBibliotecaCta: string;
      vaultCta: string;
      orderCodeLabel: string;
      emailSentNote: string;
      closeCta: string;
    };
    status: {
      rejectedTitle: string;
      rejectedBody: string;
      expiredTitle: string;
      expiredBody: string;
      expiredRetryCta: string;
      errorTitle: string;
      errorBodyFallback: string;
      errorRetryCta: string;
      cancelCta: string;
    };
    pixScreenExtra: {
      openLibraryCta: string;
      preparingPix: string;
      expiresLabel: string;
      checkInBankApp: string;
      pixCopyPasteLabel: string;
      clickToCopyHint: string;
      copyManualHint: string;
      copiedHint: string;
      generatingQr: string;
      privacyPrefix: string;
      waitingBankTitle: string;
      waitingBankSubtitle: string;
    };
    inlineAuthExtra: {
      connectedAs: (name: string) => string;
      connectedSuffix: string;
      promptHeading: string;
      continueGuestLabel: string;
      turnstileError: string;
    };
  };
  acervo: {
    eyebrow: string;
    title: string;
    subtitle: string;
    popularBadge: string;
    partnerPayTitle: string;
    partnerPayBody: string;
    partnerPayPix: string;
    partnerPayCards: string;
    partnerPayAccess: string;
    faqEyebrow: string;
    faqTitle: string;
    vipInviteTitle: string;
    vipInviteBody: string;
    vipInviteCta: string;
    platformsHeading: string;
    platformsSubheading: string;
    featuredBadge: string;
    openPlatformCtaFallback: string;
    noPlatformsTitle: string;
    noPlatformsBody: string;
    avulsosBlockEyebrow: string;
    avulsosBlockTitle: string;
    avulsosBlockBody: string;
    avulsosBlockCta: string;
    personalizadosBlockEyebrow: string;
    personalizadosBlockTitle: string;
    personalizadosBlockBody: string;
    personalizadosBlockCta: string;
    transparencyNote: string;
  };
  chamadas: {
    pageHeroEyebrow: string;
    pageHeroTitle: string;
    pageHeroSubtitle: string;
    comingSoon: {
      badge: string;
      title: string;
      subtitle: string;
      statusBadge: string;
      statusMain: string;
      statusSub: string;
      statusFollowCta: string;
      proposalEyebrow: string;
      proposalTitle: string;
      proposalP1Before: string;
      proposalP1Strong: string;
      proposalP1After: string;
      proposalP2Before: string;
      proposalP2Acervo: string;
      proposalP2Middle: string;
      proposalP2Avulsos: string;
      proposalP2After: string;
      expectEyebrow: string;
      expectTitle: string;
      expectItems: string[];
      boundariesEyebrow: string;
      boundariesTitle: string;
      boundariesItems: string[];
      howItWillWorkEyebrow: string;
      howItWillWorkTitle: string;
      howItWillWorkSubtitle: string;
      howSteps: Array<{ step: string; title: string; description: string }>;
      pillars: Array<{ title: string; description: string }>;
      alternativesEyebrow: string;
      alternativesTitle: string;
      alternativesSubtitle: string;
      altAcervoTitle: string;
      altAcervoDesc: string;
      altAcervoCta: string;
      altAvulsosTitle: string;
      altAvulsosDesc: string;
      altAvulsosCta: string;
      altPersonalizadosTitle: string;
      altPersonalizadosDesc: string;
      altPersonalizadosCta: string;
      contactPrompt: string;
      avulsosCta: string;
      personalizadosCta: string;
      acervoCta: string;
      notifyEyebrow: string;
      notifyTitle: string;
      notifySubtitle: string;
      notifyNamePlaceholder: string;
      notifyEmailPlaceholder: string;
      notifySubmitCta: string;
      notifySubmitting: string;
      notifySuccessTitle: string;
      notifySuccessBody: string;
      notifyErrorFallback: string;
      faqEyebrow: string;
      faqTitle: string;
      faqItems: CopyFaqEntry[];
    };
    step1Title: string;
    step2Title: string;
    step3Title: string;
    step4Title: string;
    modalitiesEmpty: string;
    durationMinutes: (minutes: number) => string;
    selectedBadge: string;
    selectModalityCta: string;
    rulesLabel: string;
    calendarLoading: string;
    calendarEmpty: string;
    calendarTimezoneNote: string;
    slotsPickDateFirst: string;
    slotsEmpty: string;
    slotsAvailableCount: (count: number) => string;
    summaryCard: {
      heading: string;
      eyebrow: string;
      modalityLabel: string;
      durationRowLabel: string;
      dateRowLabel: string;
      toSelectLabel: string;
      dateTimeLabel: string;
      totalLabel: string;
      rulesHeading: string;
      clientSectionHeading: string;
      clientSectionEyebrow: string;
      clientSectionSubtitle: string;
      nameLabel: string;
      namePlaceholder: string;
      emailLabel: string;
      emailPlaceholder: string;
      contactLabel: string;
      contactPlaceholder: string;
      notesLabel: string;
      notesPlaceholder: string;
      termsAcceptPrefix: string;
      termsLinkLabel: string;
      termsSuffix: string;
      privacyBadge: string;
      privacyNote: string;
      confirmCta: string;
      confirming: string;
      incompleteHint: string;
    };
    reserva: {
      eyebrow: string;
      title: string;
      loading: string;
      notFoundTitle: string;
      notFoundBody: string;
      backToChamadas: string;
      holderLabel: string;
      dateLabel: string;
      durationLabel: string;
      codeLabel: string;
      statusLabels: Record<string, string>;
      roomLinkHeading: string;
      openRoomCta: string;
      roomPendingNote: string;
      instructionsHeading: string;
      rulesHeading: string;
      pixPendingHeading: string;
      pixPendingSubtitle: string;
      copyPixCta: string;
      copiedPixCta: string;
      verifyPaymentCta: string;
      verifyingPayment: string;
      myAccountCta: string;
    };
    statusLookup: {
      eyebrow: string;
      title: string;
      subtitle: string;
      codeLabel: string;
      codePlaceholder: string;
      emailLabel: string;
      emailPlaceholder: string;
      searchCta: string;
      searching: string;
      notFoundError: string;
      backToChamadas: string;
    };
  };
  personalizados: {
    pageHeroEyebrowFallback: string;
    pageHeroTitleFallback: string;
    pageHeroSubtitleFallback: string;
    unavailableTitle: string;
    unavailableBody: string;
    backToAvulsosCta: string;
    photoCard: {
      stepLabel: string;
      title: string;
      subtitle: string;
      unitPriceLabel: (formattedPrice: string) => string;
      countLabel: (count: number) => string;
      noPhotosLabel: string;
      minHint: (min: number) => string;
    };
    videoCard: {
      stepLabel: string;
      title: string;
      subtitle: string;
      includedLabel: string;
      noVideoLabel: string;
    };
    preferencesCard: {
      stepLabel: string;
      title: string;
      subtitle: string;
      briefingLabel: string;
      briefingPlaceholder: string;
      briefingHelper: string;
      mentionNameTitle: string;
      mentionNameDesc: string;
      express24hTitle: string;
      express24hDesc: string;
      deliveryChannelLabel: string;
      deliveryVaultTitle: string;
      deliveryVaultDesc: string;
      deliveryTelegramTitle: string;
      deliveryTelegramDesc: string;
      limitsHeading: string;
    };
    summaryCard: {
      heading: string;
      eyebrow: string;
      photosRow: (count: number) => string;
      videoRow: string;
      mentionRow: string;
      expressRow: string;
      totalLabel: string;
      minOrderWarning: (formattedMin: string) => string;
      deliveryEstimateLabel: string;
      express24hDeliveryText: string;
      vaultDeliveryTitle: string;
      vaultDeliveryDesc: string;
      telegramDeliveryTitle: string;
      telegramDeliveryDesc: string;
      guidelinesHeading: string;
      clientSectionHeading: string;
      clientSectionEyebrow: string;
      clientSectionSubtitle: string;
      nameLabel: string;
      namePlaceholder: string;
      contactLabel: string;
      contactLabelTelegram: string;
      contactPlaceholderVault: string;
      contactPlaceholderTelegram: string;
      vaultEmailHint: string;
      termsSuffix: string;
      privacyBadge: string;
      privacyNote: string;
      submitCta: string;
      submitting: string;
      emptySelectionHint: string;
    };
    pedido: {
      eyebrow: string;
      title: string;
      loading: string;
      notFoundTitle: string;
      notFoundBody: string;
      backCta: string;
      orderCodeLabel: string;
      statusLabels: Record<string, string>;
      pixHeading: string;
      pixSubtitle: string;
      copyPixCta: string;
      copiedPixCta: string;
      checkPaymentCta: string;
      checkingPayment: string;
      inProductionTitle: string;
      inProductionBody: string;
      readyTitle: string;
      readyBody: string;
      openVaultCta: string;
      openAccountCta: string;
      summaryHeading: string;
      briefingHeading: string;
    };
  };
  sobre: {
    eyebrowFallback: string;
    headlineFallback: string;
    roleFallback: string;
    pullQuoteFallback: string;
    paragraph1Fallback: string;
    paragraph2Fallback: string;
    closingSignPrefix: string;
    closingTitle: string;
    closingSubtitle: string;
    ctaAcervoFallback: string;
    ctaAvulsos: string;
    ctaContato: string;
    backHome: string;
  };
  contato: {
    eyebrow: string;
    title: string;
    subtitle: string;
    directChannelLabel: string;
    copyEmailCta: string;
    copiedEmailCta: string;
    formTitle: string;
    formSubtitle: string;
    nameLabel: string;
    namePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    subjectLabel: string;
    messageLabel: string;
    messagePlaceholder: string;
    submitCta: string;
    submitting: string;
    turnstileHint: string;
    successTitle: string;
    successBody: string;
    sendAnotherCta: string;
    errors: {
      nameRequired: string;
      emailRequired: string;
      emailInvalid: string;
      messageRequired: string;
      sendFailed: string;
      networkFailed: string;
    };
    modalCloseAria: string;
    modalSuccessDoneCta: string;
    otherChannelsHeading: string;
    faqLinkPrompt: string;
    faqLinkLabel: string;
  };
  conta: {
    redirectingLabel: string;
    shell: {
      pageTitle: string;
      subtitleAuthenticated: string;
      tabs: {
        biblioteca: string;
        personalizados: string;
        chamadas: string;
        conta: string;
        perfil: string;
      };
      contextualActions: {
        biblioteca: string;
        personalizados: string;
        chamadas: string;
        conta: string;
      };
      sessionExpiredBanner: string;
      logoutLabel: string;
      refreshAria: string;
      supportButton: string;
    };
    login: {
      eyebrow: string;
      title: string;
      subtitle: string;
      emailLabel: string;
      emailPlaceholder: string;
      sendCodeCta: string;
      sendingCode: string;
      codeStepTitle: string;
      codeStepSubtitle: (email: string) => string;
      codeLabel: string;
      codePlaceholder: string;
      verifyCta: string;
      verifying: string;
      resendCta: string;
      resendCountdown: (seconds: number) => string;
      backToEmailCta: string;
      spamHint: string;
      privacyFooter: string;
      turnstileError: string;
      turnstileRetry: string;
    };
    library: {
      heading: string;
      subtitle: string;
      emptyTitle: string;
      emptyBody: string;
      exploreAvulsosCta: string;
      claimLegacyCta: string;
      openItemCta: string;
      photoCount: (count: number) => string;
      videoCount: (count: number) => string;
      loadingLabel: string;
    };
    personalizados: {
      heading: string;
      subtitle: string;
      emptyTitle: string;
      emptyBody: string;
      newOrderCta: string;
      openDeliveryCta: string;
      payNowCta: string;
      viewDetailsCta: string;
      supportCta: string;
    };
    appointments: {
      heading: string;
      subtitle: string;
      emptyTitle: string;
      emptyBody: string;
      scheduleNewCta: string;
      openRoomCta: string;
      openVoucherCta: string;
      requestRescheduleCta: string;
      requestCancelCta: string;
      modalCancelTitle: string;
      modalRescheduleTitle: string;
      modalCancelBody: string;
      modalRescheduleBody: string;
      modalCancelPlaceholder: string;
      modalReschedulePlaceholder: string;
      modalBackCta: string;
      modalConfirmCta: string;
      modalSubmitting: string;
    };
    orders: {
      heading: string;
      subtitle: string;
      emptyTitle: string;
      emptyBody: string;
      claimToggleCta: string;
      claimBoxTitle: string;
      claimBoxSubtitle: string;
      claimInputLabel: string;
      claimInputPlaceholder: string;
      claimSubmitCta: string;
      claimSubmitting: string;
      claimSuccessFallback: string;
      claimErrorFallback: string;
      receiptCta: string;
      resumePaymentCta: string;
      supportCta: string;
      paymentPanelTitle: string;
      paymentPanelSubtitle: string;
      paymentCopyPixCta: string;
      paymentCopiedPixCta: string;
      paymentRenewCta: string;
      paymentRenewing: string;
    };
    profile: {
      tabs: {
        dados: string;
        seguranca: string;
        privacidade: string;
      };
      dadosTitle: string;
      dadosSubtitle: string;
      saveCta: string;
      savingCta: string;
      savedFeedback: string;
      segurancaTitle: string;
      segurancaSubtitle: string;
      logoutAllCta: string;
      privacidadeTitle: string;
      privacidadeSubtitle: string;
      exportDataCta: string;
      closeAccountTitle: string;
      closeAccountWarning: string;
      closeAccountButton: string;
      closeAccountConfirmPlaceholder: string;
      closeAccountConfirmCta: string;
      closeAccountConfirming: string;
      cancelCta: string;
    };
  };
  vault: {
    backToLibrary: string;
    backToPersonalizados: string;
    backToLogin: string;
    loading: string;
    errorTitle: string;
    errorRetryCta: string;
    photosTab: (count: number) => string;
    videosTab: (count: number) => string;
    emptyMedia: string;
    browserAuthTitle: string;
    browserAuthBody: string;
    browserAuthCta: string;
    browserAuthAuthorizing: string;
    videoLoading: string;
    videoError: string;
    lightboxCloseAria: string;
    lightboxPrevAria: string;
    lightboxNextAria: string;
    photoCounter: (current: number, total: number) => string;
    downloadDisabledNote: string;
    states: Record<
      'confirm' | 'approve' | 'sent' | 'expired' | 'wrongBrowser' | 'wait' | 'unavailable' | 'missing' | 'idle',
      { heading: string; body: string }
    >;
  };
  lightbox: {
    viewingAria: (title: string) => string;
    closeAria: string;
    prevAria: string;
    nextAria: string;
    captionFallback: string;
    openAcervoCta: string;
    openAcervoAria: string;
  };
  musicPlayer: {
    regionAria: string;
  };
  notFound: {
    badge: string;
    title: string;
    description: string;
    backHomeCta: string;
    secondaryChamadasCta: string;
    secondaryAcervoCta: string;
    footerNote: string;
  };
  seo: Record<PublicSeoRoute, RouteSeoCopy>;
  cmsStockOverrides: Record<CmsStockOverrideKey, string>;
}
