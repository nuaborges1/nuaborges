/**
 * Sistema Canônico de Personalizados | Nua Borges
 * 
 * Regras de Negócio, Tipos, Calculadora Dinâmica,
 * Status de Produção e Canais de Entrega.
 */

export const KV_PERSONALIZADOS_SETTINGS_KEY = 'personalizados:settings';
export const KV_PERSONALIZADOS_ORDERS_KEY = 'personalizados:orders';
export const PERSONALIZADOS_STORAGE_KEY = 'nua_personalizados_data';

export type DeliveryChannel = 'telegram' | 'vault';

export const ALLOWED_PERSONALIZADO_STATUSES = [
  'aguardando_pagamento',
  'em_producao',
  'pronto',
  'entregue',
  'cancelado',
] as const;

export type PersonalizadoOrderStatus = (typeof ALLOWED_PERSONALIZADO_STATUSES)[number];

export const PERSONALIZADO_ALLOWED_TRANSITIONS: Record<
  PersonalizadoOrderStatus,
  readonly PersonalizadoOrderStatus[]
> = {
  aguardando_pagamento: ['em_producao', 'cancelado'],
  em_producao: ['pronto', 'entregue', 'cancelado'],
  pronto: ['entregue', 'cancelado'],
  entregue: [],
  cancelado: [],
};

export function isPersonalizadoOrderStatus(value: unknown): value is PersonalizadoOrderStatus {
  return (
    typeof value === 'string' &&
    (ALLOWED_PERSONALIZADO_STATUSES as readonly string[]).includes(value)
  );
}

export interface PersonalizadoStatusTransitionResult {
  valid: boolean;
  code?: 'INVALID_STATUS' | 'PAYMENT_REQUIRED' | 'INVALID_TRANSITION' | 'TERMINAL_STATUS';
  error?: string;
}

/**
 * Valida centralmente transições de estado operacional para pedidos Personalizados (DEF-006).
 */
export function validatePersonalizadoStatusTransition(
  order: Pick<PersonalizadoOrder, 'status' | 'payment'>,
  nextStatus: unknown
): PersonalizadoStatusTransitionResult {
  if (!isPersonalizadoOrderStatus(nextStatus)) {
    return {
      valid: false,
      code: 'INVALID_STATUS',
      error: `Status inválido. Valores permitidos: ${ALLOWED_PERSONALIZADO_STATUSES.join(', ')}.`,
    };
  }

  const currentStatus = order.status;
  const paymentApproved = order.payment?.status === 'approved';

  if (nextStatus === currentStatus) {
    if (['pronto', 'entregue'].includes(nextStatus) && !paymentApproved) {
      return {
        valid: false,
        code: 'PAYMENT_REQUIRED',
        error: 'Não é permitido manter ou liberar entrega sem pagamento aprovado.',
      };
    }
    return { valid: true };
  }

  if (currentStatus === 'entregue' || currentStatus === 'cancelado') {
    return {
      valid: false,
      code: 'TERMINAL_STATUS',
      error: `Pedido em estado terminal (${currentStatus}) não pode ser alterado para ${nextStatus}.`,
    };
  }

  if (['em_producao', 'pronto', 'entregue'].includes(nextStatus) && !paymentApproved) {
    return {
      valid: false,
      code: 'PAYMENT_REQUIRED',
      error: 'Não é possível avançar o pedido para produção ou entrega sem pagamento aprovado.',
    };
  }

  const allowedNext = PERSONALIZADO_ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowedNext.includes(nextStatus)) {
    return {
      valid: false,
      code: 'INVALID_TRANSITION',
      error: `Transição de status não permitida: ${currentStatus} -> ${nextStatus}.`,
    };
  }

  return { valid: true };
}

export interface VideoDurationOption {
  id: string;
  label: string;
  durationMinutes: number;
  price: number;
}

export interface PersonalizadosDeliveryMethods {
  telegram: boolean;
  vault: boolean; // Cofre Digital no Site com link secreto
}

export interface PersonalizadosSettings {
  enabled: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  pricePerPhoto: number;
  minPhotos: number;
  maxPhotos: number;
  videoEnabled: boolean;
  videoOptions: VideoDurationOption[];
  mentionNameEnabled: boolean;
  mentionNamePrice: number;
  express24hEnabled: boolean;
  express24hPrice: number;
  minOrderTotal: number;
  estimatedDeliveryText: string;
  termsAndLimitsText: string;
  deliveryMethods: PersonalizadosDeliveryMethods;
}

export interface VaultMediaFile {
  id: string;
  name: string;
  url: string;
  type: 'photo' | 'video';
  sizeBytes?: number;
  uploadedAt: string;
}

export interface PersonalizadoOrder {
  id: string;
  publicToken: string;
  createdAt: string;
  updatedAt: string;
  clientName: string;
  clientContact: string; // WhatsApp com DDD, @username do Telegram ou email
  deliveryChannel: DeliveryChannel;
  photoCount: number;
  videoOptionId?: string;
  videoDurationMinutes: number;
  mentionName: boolean;
  express24h: boolean;
  briefing: string;
  totalPrice: number;
  status: PersonalizadoOrderStatus;
  payment: {
    status: 'pending' | 'approved' | 'rejected' | 'refunded';
    method: 'pix';
    pixPayload?: string;
    pixQrCode?: string;
    amount: number;
    paidAt?: string;
    expiresAt?: string;
    transactionId?: string;
  };
  vaultFiles?: VaultMediaFile[];
  deliveredAt?: string;
  adminNotes?: string;
}

export const DEFAULT_PERSONALIZADOS_SETTINGS: PersonalizadosSettings = {
  enabled: true,
  eyebrow: 'PRODUÇÃO AUTORAL SOB MEDIDA',
  title: 'Ateliê Privativo',
  subtitle:
    'Encomende uma produção exclusiva de fotos e vídeos feita sob medida para você, com discrição absoluta e entrega personalizada.',
  pricePerPhoto: 25,
  minPhotos: 3,
  maxPhotos: 30,
  videoEnabled: true,
  videoOptions: [
    { id: 'vid_none', label: 'Sem Vídeo (Apenas Fotos)', durationMinutes: 0, price: 0 },
    { id: 'vid_1m', label: '1 Minuto Privativo', durationMinutes: 1, price: 100 },
    { id: 'vid_3m', label: '3 Minutos Envolventes', durationMinutes: 3, price: 220 },
    { id: 'vid_5m', label: '5 Minutos Completo', durationMinutes: 5, price: 350 },
    { id: 'vid_10m', label: '10 Minutos Experiência VIP', durationMinutes: 10, price: 600 },
  ],
  mentionNameEnabled: true,
  mentionNamePrice: 50,
  express24hEnabled: true,
  express24hPrice: 80,
  minOrderTotal: 75,
  estimatedDeliveryText: 'Em até 72 horas úteis após a confirmação do pagamento.',
  termsAndLimitsText:
    'Produção autoral intimista e elegante. Não inclui fetiches extremos, conteúdo degradante ou exposição de terceiros. A criadora reserva o direito de recusar pedidos incompatíveis com seus termos de consentimento.',
  deliveryMethods: {
    telegram: true,
    vault: true,
  },
};

export function formatCurrencyBrl(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val);
}

export function calculateOrderPrice(
  photoCount: number,
  videoOptionId: string,
  mentionName: boolean,
  express24h: boolean,
  settings: PersonalizadosSettings = DEFAULT_PERSONALIZADOS_SETTINGS
): {
  photosPrice: number;
  videoPrice: number;
  mentionPrice: number;
  expressPrice: number;
  subtotal: number;
  total: number;
  selectedVideoOption?: VideoDurationOption;
} {
  const safePhotoCount = Math.max(0, photoCount);
  const photosPrice = safePhotoCount * settings.pricePerPhoto;

  const selectedVideoOption = settings.videoOptions.find((v) => v.id === videoOptionId) || settings.videoOptions[0];
  const videoPrice = settings.videoEnabled && selectedVideoOption ? selectedVideoOption.price : 0;

  const mentionPrice = mentionName && settings.mentionNameEnabled ? settings.mentionNamePrice : 0;
  const expressPrice = express24h && settings.express24hEnabled ? settings.express24hPrice : 0;

  const subtotal = photosPrice + videoPrice + mentionPrice + expressPrice;
  const total = Math.max(subtotal, subtotal > 0 ? settings.minOrderTotal : 0);

  return {
    photosPrice,
    videoPrice,
    mentionPrice,
    expressPrice,
    subtotal,
    total,
    selectedVideoOption,
  };
}
