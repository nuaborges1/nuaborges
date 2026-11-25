import { AvulsoProductItem } from '@/lib/types';

export type CheckoutItemType = 'avulso' | 'chamada' | 'personalizado' | 'vip';

export interface CheckoutDetailItem {
  label: string;
  value: string;
}

export interface UniversalCheckoutContext {
  type: CheckoutItemType;
  id: string; // slug, bookingId, orderId ou planId
  title: string;
  subtitle?: string;
  priceFormatted: string;
  numericPrice: number;
  badge?: string;
  imageUrl?: string;
  details?: CheckoutDetailItem[];
  accessUrl?: string;
  accessButtonText?: string;
  initialPayment?: {
    orderId: string;
    purchaseToken?: string;
    qrCode: string;
    qrCodeUrl?: string;
    amount?: number;
    expiresAt?: string | null;
  };
}

export interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: AvulsoProductItem | null;
  checkoutContext?: UniversalCheckoutContext | null;
  onSuccess?: (result: { orderId: string; purchaseToken?: string }) => void;
}
