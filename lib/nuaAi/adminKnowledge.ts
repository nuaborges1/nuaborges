/**
 * lib/nuaAi/adminKnowledge.ts
 *
 * Estrutura DINÂMICA do painel administrativo da Nua Borges.
 * Gerada a partir dos tipos reais (types/admin.ts) e do FIELD_MAP (toolRegistry.mjs).
 * Qualquer novo módulo, subaba ou campo deve ser adicionado aqui para a IA
 * enxergar sem precisar editar o prompt hardcoded.
 */

import type { AdminModuleId } from '@/types/admin';

export interface AdminSubTab {
  id: string;
  label: string;
  component?: string;
  desc: string;
}

export const ADMIN_KNOWLEDGE_VERSION = '2026-10-25';

/**
 * Módulos raiz do sidebar, com seus grupos e descrições.
 * Fonte: MODULE_METADATA (app/admin/components/types.ts)
 */
export const ADMIN_MODULES: Record<
  AdminModuleId,
  { group: string; label: string; desc: string; subTabs?: AdminSubTab[]; editableFields?: Record<string, string[]> }
> = {
  dashboard: {
    group: 'VISÃO GERAL',
    label: 'Dashboard',
    desc: 'Resumo operacional, alertas prioritários, faturamento e ações rápidas',
    subTabs: [],
    editableFields: {},
  },
  midias: {
    group: 'MEU SITE',
    label: 'Biblioteca de Mídias',
    desc: 'Acervo central unificado de fotos, vídeos, álbuns e favoritos',
    subTabs: [],
    editableFields: {
      library: ['id', 'name', 'url', 'objectKey', 'isVideo', 'favorite', 'albumIds[]'],
      albums: ['id', 'name', 'description', 'coverUrl', 'mediaIds[]'],
    },
  },
  conteudos: {
    group: 'OPERAÇÃO COMERCIAL',
    label: 'Conteúdos & Packs',
    desc: 'Catálogo de packs avulsos e cofre de mídias criptografado',
    subTabs: [
      { id: 'catalog', label: 'Catálogo de produtos', component: 'AvulsosEditor.tsx', desc: 'Lista e edita packs avulsos à venda' },
      { id: 'library', label: 'Biblioteca de mídia', component: 'LibraryEditor.tsx', desc: 'Fotos, vídeos, álbuns e favoritos' },
      { id: 'edit_pack', label: 'Editar pack', component: 'PackEditorPage.tsx', desc: 'Editor completo de pack individual' },
    ],
    editableFields: {
      avulsos: ['eyebrow', 'title', 'subtitle', 'active', 'upsellText', 'upsellUrl'],
      'avulsos.items[]': ['id', 'slug', 'title', 'price', 'numericPrice', 'description', 'longDescription', 'badge', 'imageUrl', 'checkoutUrl', 'buttonText', 'active', 'duration', 'previewImages[]', 'exclusivePhotos[]', 'videos[]', 'technicalDetails'],
      library: ['id', 'name', 'url', 'objectKey', 'isVideo', 'favorite', 'albumIds[]'],
      albums: ['id', 'name', 'description', 'coverUrl', 'mediaIds[]'],
    },
  },
  personalizados: {
    group: 'OPERAÇÃO COMERCIAL',
    label: 'Pedidos personalizados',
    desc: 'Calculadora de preços, fila de pedidos sob medida e cofre de entrega',
    subTabs: [
      { id: 'settings', label: 'Configurações', component: 'PersonalizadosSettingsTab.tsx', desc: 'Calculadora de preços e regras de negócio' },
      { id: 'orders', label: 'Pedidos', component: 'PersonalizadosOrdersTab.tsx', desc: 'Fila de pedidos recebidos' },
    ],
    editableFields: {
      personalizados: [
        'enabled', 'eyebrow', 'title', 'subtitle', 'pricePerPhoto', 'minPhotos', 'maxPhotos',
        'videoEnabled', 'videoOptions[]', 'mentionNameEnabled', 'mentionNamePrice',
        'express24hEnabled', 'express24hPrice', 'minOrderTotal', 'estimatedDeliveryText',
        'termsAndLimitsText', 'deliveryMethods.telegram', 'deliveryMethods.vault',
      ],
      'personalizados.orders[]': ['id', 'clientName', 'status', 'totalPrice', 'photoCount', 'videoDurationMinutes', 'deliveryChannel', 'adminNotes', 'vaultFiles'],
    },
  },
  chamadas: {
    group: 'OPERAÇÃO COMERCIAL',
    label: 'Chamadas VIP',
    desc: 'Agendamentos de vídeo, links de salas e disponibilidade',
    subTabs: [
      { id: 'queue', label: 'Fila de reservas', component: 'AppointmentsQueueTab.tsx', desc: 'Fila de reservas com filtros' },
      { id: 'calendar', label: 'Calendário visual', component: 'AppointmentsCalendarTab.tsx', desc: 'Calendário de agendamentos' },
      { id: 'modalities', label: 'Modalidades e preços', component: 'AppointmentsModalitiesTab.tsx', desc: 'Modalidades de chamada' },
      { id: 'settings', label: 'Horários & agenda', component: 'AppointmentsSettingsTab.tsx', desc: 'Horários de atendimento e datas bloqueadas' },
    ],
    editableFields: {
      appointments: [
        'weeklyHours[0-6].enabled', 'weeklyHours[n].ranges[0].start', 'weeklyHours[n].ranges[0].end',
        'bufferMinutes', 'minNoticeHours', 'maxFutureDays', 'blockedDates[]',
      ],
      'appointments.modalities[]': ['id', 'name', 'description', 'durationMinutes', 'price', 'active', 'rules[]', 'clientInstructions'],
      'appointments.bookings[]': ['id', 'clientName', 'status', 'date', 'startTime', 'modalityName', 'price', 'meetingUrl', 'instructions'],
    },
  },
  vitrine: {
    group: 'GESTÃO DO SITE',
    label: 'Editar meu site',
    desc: 'Apresentação inicial, curadoria da galeria pública e biografia',
    subTabs: [
      { id: 'hero', label: 'Capa / Hero', component: 'HeroEditor.tsx', desc: 'Hero, carrossel, logo, CTA da capa' },
      { id: 'gallery', label: 'Galeria', component: 'GalleryEditor.tsx', desc: 'Galeria pública e lightbox' },
      { id: 'about', label: 'Sobre mim', component: 'AboutEditor.tsx', desc: 'Biografia e manifesto' },
    ],
    editableFields: {
      hero: ['eyebrow', 'title', 'tagline', 'description', 'ctaText', 'ctaUrl', 'exploreText', 'fullVerticalPhoto', 'cinematicCoverLayout', 'logoUrl', 'useLogo', 'photos[]'],
      gallery: ['eyebrow', 'title', 'subtitle', 'photos[].title', 'photos[].caption', 'photos[].imageUrl', 'photos[].linkUrl', 'photos[].active', 'photos[].blurred'],
      about: ['eyebrow', 'headline', 'role', 'pullQuote', 'paragraph1', 'paragraph2', 'signature', 'photoUrl'],
    },
  },
  conexoes: {
    group: 'GESTÃO DO SITE',
    label: 'Redes e contato',
    desc: 'Canais oficiais externos e endereço de contato com fãs',
    subTabs: [
      { id: 'channels', label: 'Canais', component: 'ChannelsEditor.tsx', desc: 'OnlyFans, Privacy, CloseFans, Instagram' },
      { id: 'contact', label: 'Contato', component: 'ContactEditor.tsx', desc: 'Modal de contato, e-mail e assuntos' },
    ],
    editableFields: {
      header: ['brandName', 'brandMonogram', 'navLogoStyle', 'showInstagram', 'showOnlyFans', 'onlyFansText', 'onlyFansUrl'],
      channels: ['eyebrow', 'title', 'subtitle', 'contactBanner.title', 'contactBanner.description', 'contactBanner.buttonText'],
      'channels.onlyfans': ['title', 'badge', 'description', 'tags[]', 'buttonText', 'url', 'active'],
      'channels.privacy': ['title', 'badge', 'description', 'tags[]', 'buttonText', 'url', 'active'],
      'channels.closefans': ['title', 'badge', 'description', 'tags[]', 'buttonText', 'url', 'active'],
      'channels.instagram': ['title', 'handle', 'description', 'tags[]', 'buttonText', 'url'],
      contact: ['modalTitle', 'modalSubtitle', 'officialEmail', 'subjects[]'],
    },
  },
  financeiro: {
    group: 'FINANCEIRO',
    label: 'Financeiro',
    desc: 'Receitas comerciais das vendas e faturamento consolidado',
    subTabs: [
      { id: 'metrics', label: 'Métricas', component: 'CommercialFinanceMetrics.tsx', desc: 'KPIs e resumos de receita' },
      { id: 'modalities', label: 'Receitas por modalidade', component: 'CommercialFinanceModalities.tsx', desc: 'Receitas detalhadas' },
      { id: 'timeline', label: 'Linha do tempo', component: 'CommercialFinanceTimeline.tsx', desc: 'Evolução financeira' },
      { id: 'transactions', label: 'Transações', component: 'CommercialFinanceTransactions.tsx', desc: 'Tabela de transações' },
    ],
    editableFields: {
      finance: [],
    },
  },
  contratos: {
    group: 'JURÍDICO & CONTRATOS',
    label: 'Contratos',
    desc: 'Instrumento contratual, Anexo I e assinaturas digitais',
    subTabs: [
      { id: 'contrato', label: 'Contrato', desc: 'Cláusulas canônicas e visualização' },
      { id: 'anexo', label: 'Anexo I', desc: 'Termos específicos do cliente' },
    ],
    editableFields: {
      contrato: [],
    },
  },
  cofre: {
    group: 'SEGURANÇA',
    label: 'Acessos e senhas',
    desc: 'Armazenamento seguro e criptografado de senhas, e-mails e acessos',
    subTabs: [],
    editableFields: {
      vault: ['id', 'categoria', 'servico', 'usuario', 'senha', 'url', 'notas'],
    },
  },
  configuracoes: {
    group: 'SISTEMA',
    label: 'Configurações',
    desc: 'Preferências de alertas sonoros, notificações do sistema e diagnósticos',
    subTabs: [
      { id: 'notificacoes', label: 'Notificações', desc: 'Alertas sonoros, aba piscando, notificações Windows' },
      { id: 'diagnostico', label: 'Diagnóstico', desc: 'Status do sistema e saúde das integrações' },
      { id: 'cms', label: 'CMS', desc: 'Cache local e revalidação de conteúdo' },
    ],
    editableFields: {
      configuracoes: ['soundEnabled', 'tabFlashEnabled', 'windowsNotificationEnabled'],
    },
  },
  beta_player: {
    group: 'BETA EXPERIMENTAL',
    label: 'Player de Áudio',
    desc: 'Trilha sonora ambiente e controle do catálogo musical do site',
    subTabs: [],
    editableFields: {
      musica: ['faixas[]', 'volume', 'autoplay', 'loop'],
    },
  },
  beta_ia: {
    group: 'BETA EXPERIMENTAL',
    label: 'Assistente Nua IA',
    desc: 'Base de conhecimento proprietária e suporte com inteligência artificial',
    subTabs: [],
    editableFields: {},
  },
  alertas: {
    group: 'SISTEMA',
    label: 'Pedidos recebidos',
    desc: 'Notificações de pedidos, logs de segurança e avisos do sistema',
    subTabs: [],
    editableFields: {},
  },
  seo: {
    group: 'GESTÃO DO SITE',
    label: 'Divulgação & SEO',
    desc: 'Metadados de busca, imagem de compartilhamento e páginas legais',
    subTabs: [],
    editableFields: {
      seo: ['title', 'description', 'keywords', 'canonicalUrl', 'ogImage'],
      institutional: ['sectionTitle', 'description', 'links[].name', 'links[].label', 'links[].description', 'links[].url', 'links[].iconName', 'links[].active', 'links[].order', 'links[].openInNewTab', 'ageNoticeTitle', 'ageNoticeDescription', 'termsSummary', 'privacySummary'],
      footer: ['brandName', 'role', 'concept', 'copyrightText', 'signOff'],
    },
  },
  mensalidade: {
    group: 'FINANCEIRO',
    label: 'Mensalidade do Site',
    desc: 'Faturas e manutenção técnica de hospedagem via Mercado Pago',
    subTabs: [],
    editableFields: {
      mensalidade: ['parcelas[]', 'mercadopagoStatus', 'recibo'],
    },
  },
};

/**
 * Campos editáveis por seção do SiteContent (FIELD_MAP).
 * Usado para validação de caminho e anti-alucinação.
 */
export const EDITABLE_FIELDS_BY_SECTION: Record<string, string[]> = {
  hero: ['eyebrow', 'title', 'tagline', 'description', 'ctaText', 'ctaUrl', 'exploreText', 'fullVerticalPhoto', 'cinematicCoverLayout', 'logoUrl', 'useLogo'],
  about: ['eyebrow', 'headline', 'role', 'pullQuote', 'paragraph1', 'paragraph2', 'signature', 'photoUrl'],
  gallery: ['eyebrow', 'title', 'subtitle'],
  contact: ['modalTitle', 'modalSubtitle', 'officialEmail', 'subjects'],
  footer: ['brandName', 'role', 'concept', 'copyrightText', 'signOff'],
  seo: ['title', 'description', 'keywords', 'canonicalUrl', 'ogImage'],
  header: ['brandName', 'brandMonogram', 'navLogoStyle', 'showInstagram', 'showOnlyFans', 'onlyFansText', 'onlyFansUrl'],
  institutional: ['sectionTitle', 'description', 'ageNoticeTitle', 'ageNoticeDescription', 'termsSummary', 'privacySummary'],
  vipClub: ['eyebrow', 'title', 'subtitle', 'buttonText'],
  avulsos: ['eyebrow', 'title', 'subtitle', 'active', 'upsellText', 'upsellUrl'],
  channels: ['eyebrow', 'title', 'subtitle'],
  'channels.onlyfans': ['title', 'description', 'badge', 'buttonText', 'url', 'active'],
  'channels.privacy': ['title', 'description', 'badge', 'buttonText', 'url', 'active'],
  'channels.closefans': ['title', 'description', 'badge', 'buttonText', 'url', 'active'],
  'channels.instagram': ['title', 'handle', 'description', 'buttonText', 'url'],
  'channels.contactBanner': ['title', 'description', 'buttonText'],
};

/**
 * Endpoints reais do backend por domínio.
 */
export const ADMIN_ENDPOINTS = {
  content: '/api/admin/content-ops',
  personalizados: '/api/personalizados/admin',
  appointments: '/api/appointments/admin',
  finance: '/api/finance/admin',
  vault: '/api/admin/vault',
  stripe: '/api/stripe/dashboard',
  ordersFeed: '/api/admin/orders-feed',
  media: '/api/media',
  music: '/api/music',
};

/**
 * Retorna a lista de IDs de módulo disponíveis.
 */
export function listModuleIds(): AdminModuleId[] {
  return Object.keys(ADMIN_MODULES) as AdminModuleId[];
}

/**
 * Retorna os campos editáveis de uma seção do SiteContent.
 */
export function getEditableFields(section: string): string[] {
  return EDITABLE_FIELDS_BY_SECTION[section] ?? [];
}

/**
 * Verifica se um campo é editável em uma seção.
 */
export function isFieldEditable(section: string, field: string): boolean {
  return EDITABLE_FIELDS_BY_SECTION[section]?.includes(field) ?? false;
}
