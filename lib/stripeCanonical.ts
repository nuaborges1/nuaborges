/**
 * Stripe Canonical Engine — Nua Borges Platform
 *
 * Módulo de Tipagem Canônica e Utilitários para Stripe Payments & Invoicing:
 * - Produtos: Payments (Checkout Sessions & Payment Intents) e Invoicing (Faturamento & Cobranças)
 * - Moeda primária: BRL (Real Brasileiro) com suporte nativo a USD e EUR para público internacional
 * - Suporte a Cartões de Crédito (Visa, Mastercard, Elo, Amex, Hipercard), Apple Pay, Google Pay e Pix
 */

export const STRIPE_DEFAULT_CURRENCY = 'brl';

export interface StripeCheckoutItem {
  name: string;
  description?: string;
  amount: number; // Valor em reais (ex: 150.00)
  quantity?: number;
  images?: string[];
}

export interface CreateStripeCheckoutOptions {
  items: StripeCheckoutItem[];
  customerEmail?: string;
  customerName?: string;
  orderType: 'personalizado' | 'appointment' | 'avulso' | 'invoice' | 'custom';
  orderId: string;
  successUrl: string;
  cancelUrl: string;
  currency?: string;
  metadata?: Record<string, string>;
}

export interface CreateStripeInvoiceOptions {
  customerEmail: string;
  customerName: string;
  items: {
    description: string;
    amount: number; // em Reais (ex: 350.00)
    quantity?: number;
  }[];
  dueDateDays?: number; // Vencimento em dias (padrão: 3 dias)
  memo?: string;
  currency?: string;
  autoSend?: boolean; // Se true, envia e-mail oficial do Stripe com link da fatura
  metadata?: Record<string, string>;
}

export interface StripeInvoiceResult {
  id: string;
  number: string | null;
  status: string;
  total: number;
  currency: string;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  customerEmail: string | null;
  customerName: string | null;
  createdAt: string;
}

/**
 * Obtém a chave publicável do Stripe de forma segura
 */
export function getStripePublishableKey(): string {
  const key =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    'pk_live_51UQEU61OlpJ0wEmqKoaqTVINAiv6bdSHMFF0AsP7RJl8N8eF95VPdVntxPf1OW7AGsZpXdhN6I2RY4tgsD0iDwP100VaiOduzE';
  return key.trim();
}

/**
 * Obtém a chave secreta do Stripe a partir do ambiente do servidor (Pages Functions ou Node.js)
 */
export function getStripeSecretKey(env?: any): string {
  const key =
    env?.STRIPE_SECRET_KEY ||
    (typeof process !== 'undefined' ? process.env?.STRIPE_SECRET_KEY : '') ||
    '';
  return (key || '').trim();
}

/**
 * Converte valor decimal para a menor unidade monetária do Stripe (centavos em BRL/USD/EUR)
 */
export function toStripeAmount(amount: number): number {
  return Math.round(Number(amount) * 100);
}

/**
 * Converte centavos do Stripe para decimal
 */
export function fromStripeAmount(cents: number): number {
  return Number(cents) / 100;
}
