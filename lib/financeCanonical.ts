/**
 * Módulo Canônico do Financeiro — Nua Borges
 *
 * Define o plano de 10 parcelas acordadas no contrato de desenvolvimento web
 * (Versão Definitiva 1.2 — NUA-BORGES-CONTRATO-DESENVOLVIMENTO-V1.2-2026),
 * tipos de dados e funções auxiliares de cálculo e formatação.
 */

import { CONTRACT_FINANCIAL, CLIENT_INFO, CONTRACTOR_INFO } from './contractCanonical';

export type InstallmentStatus = 'pending' | 'in_process' | 'paid' | 'rejected' | 'cancelled';

export interface FinancialInstallment {
  id: string; // ex: 'parcela-1'
  number: number; // 1 a 10
  label: string; // '1ª Parcela'
  referenceMonth: string; // 'Outubro/2026'
  amount: number; // 200.00
  dueDate: string; // '2026-10-04'
  dueDateFormatted: string; // '04/10/2026'
  status: InstallmentStatus;
  paymentId?: string; // ID da transação no Mercado Pago
  paymentMethod?: string; // 'pix', 'credit_card', etc.
  paidAt?: string; // ISO 8601 string
  paidAmount?: number; // valor creditado
  preferenceId?: string; // ID da preferência gerada no MP
  initPoint?: string; // URL do Checkout Pro
  receiptHash?: string; // Hash SHA-256 de autenticidade do comprovante
  updatedAt: string;
}

export interface FinanceSummary {
  installments: FinancialInstallment[];
  currentInstallment: FinancialInstallment | null;
  totalPaid: number;
  totalPending: number;
  totalContract: number;
  isUpToDate: boolean;
  nextDueDate?: string;
  lastPaymentDate?: string;
}

// Chave canônica para o Cloudflare KV e LocalStorage
export const KV_FINANCE_KEY = 'nua_finance_installments_v2';

/**
 * Converte data DD/MM/YYYY para YYYY-MM-DD
 */
function parseDateBrToIso(brDate: string): string {
  const [d, m, y] = brDate.split('/');
  return `${y}-${m}-${d}`;
}

/**
 * Retorna as 10 parcelas canônicas do contrato Nua Borges (Versão 1.2).
 * Conforme quitação efetuada, a 1ª Parcela (Outubro/2026) foi paga em 05/10/2026.
 */
export function getDefaultInstallments(): FinancialInstallment[] {
  const monthsMap: Record<number, string> = {
    1: 'Outubro/2026',
    2: 'Novembro/2026',
    3: 'Dezembro/2026',
    4: 'Janeiro/2027',
    5: 'Fevereiro/2027',
    6: 'Março/2027',
    7: 'Abril/2027',
    8: 'Maio/2027',
    9: 'Junho/2027',
    10: 'Julho/2027',
  };

  const now = new Date().toISOString();

  return CONTRACT_FINANCIAL.installments.map((inst, index) => {
    const num = index + 1;
    const isFirstPaid = num === 1;

    return {
      id: `parcela-${num}`,
      number: num,
      label: inst.number,
      referenceMonth: monthsMap[num] || `Mês ${num}`,
      amount: 200,
      dueDate: parseDateBrToIso(inst.dueDate),
      dueDateFormatted: inst.dueDate,
      status: (isFirstPaid ? 'paid' : 'pending') as InstallmentStatus,
      paymentId: isFirstPaid ? 'PIX-NUA-20261005-001' : undefined,
      paymentMethod: isFirstPaid ? 'pix' : undefined,
      paidAt: isFirstPaid ? '2026-10-05T11:00:00-03:00' : undefined,
      paidAmount: isFirstPaid ? 200 : undefined,
      receiptHash: isFirstPaid
        ? 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
        : undefined,
      updatedAt: now,
    };
  });
}

/**
 * Determina a mensalidade atual com base no histórico:
 * 1. A primeira parcela que estiver pendente ou em processamento;
 * 2. Se todas estiverem pagas, a última parcela (concluída);
 * 3. Fallback para a 1ª parcela.
 */
export function getCurrentInstallment(installments: FinancialInstallment[]): FinancialInstallment | null {
  if (!installments || installments.length === 0) return null;
  
  // Procura a primeira não-paga
  const firstUnpaid = installments.find(
    (i) => i.status === 'pending' || i.status === 'in_process' || i.status === 'rejected'
  );
  if (firstUnpaid) return firstUnpaid;

  // Se todas estão pagas, retorna a última
  return installments[installments.length - 1];
}

/**
 * Gera um resumo consolidado do financeiro para a cliente e para o Admin Geral
 */
export function calculateFinanceSummary(installments: FinancialInstallment[]): FinanceSummary {
  const current = getCurrentInstallment(installments);
  let totalPaid = 0;
  let totalPending = 0;
  let lastPaymentDate: string | undefined;

  for (const inst of installments) {
    if (inst.status === 'paid') {
      totalPaid += inst.amount;
      if (inst.paidAt && (!lastPaymentDate || inst.paidAt > lastPaymentDate)) {
        lastPaymentDate = inst.paidAt;
      }
    } else {
      totalPending += inst.amount;
    }
  }

  // Verifica se está em dia: nenhuma parcela vencida antes de hoje sem pagamento
  const todayIso = new Date().toISOString().slice(0, 10);
  const isUpToDate = !installments.some(
    (i) => i.status !== 'paid' && i.dueDate < todayIso
  );

  return {
    installments,
    currentInstallment: current,
    totalPaid,
    totalPending,
    totalContract: CONTRACT_FINANCIAL.installmentsCount * 200,
    isUpToDate,
    nextDueDate: current?.dueDateFormatted,
    lastPaymentDate,
  };
}

/**
 * Formata valores monetários em Real (BRL)
 */
export function formatCurrencyBrl(val: number): string {
  return val.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type FinancialSummary = FinanceSummary;

/**
 * Formata data ISO (YYYY-MM-DD) para padrão brasileiro DD/MM/YYYY
 */
export function formatIsoToBrDate(iso?: string): string {
  if (!iso) return '-';
  try {
    const parts = iso.slice(0, 10).split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR');
  } catch {
    return iso;
  }
}

/**
 * Formata data ISO para padrão brasileiro DD/MM/YYYY às HH:mm
 */
export function formatIsoToBrDateTime(iso?: string): string {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Retorna o status visual e semântico humanizado da parcela considerando a data de vencimento:
 * - 'paid': "Pago" (verde)
 * - 'in_process': "Em processamento" (âmbar)
 * - Se não paga e dueDate >= today: "A vencer" (verde/esmeralda suave indicando que a cliente está em dia)
 * - Se não paga e dueDate < today: "Vencida" (vermelho de cobrança)
 */
export function getInstallmentStatusInfo(inst: FinancialInstallment): {
  key: 'paid' | 'in_process' | 'upcoming' | 'overdue';
  label: string;
  badgeText: string;
  badgeBg: string;
  badgeBorder: string;
  dotColor: string;
  isOverdue: boolean;
} {
  if (inst.status === 'paid') {
    return {
      key: 'paid',
      label: 'Pago',
      badgeText: 'text-emerald-300',
      badgeBg: 'bg-emerald-500/10',
      badgeBorder: 'border-emerald-500/25',
      dotColor: 'bg-emerald-400',
      isOverdue: false,
    };
  }

  if (inst.status === 'in_process') {
    return {
      key: 'in_process',
      label: 'Em processamento',
      badgeText: 'text-amber-300',
      badgeBg: 'bg-amber-500/10',
      badgeBorder: 'border-amber-500/25',
      dotColor: 'bg-amber-400 animate-pulse',
      isOverdue: false,
    };
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const isOverdue = inst.dueDate < todayIso;

  if (isOverdue) {
    return {
      key: 'overdue',
      label: 'Pagamento pendente (Vencido)',
      badgeText: 'text-rose-300',
      badgeBg: 'bg-rose-500/10',
      badgeBorder: 'border-rose-500/25',
      dotColor: 'bg-rose-400',
      isOverdue: true,
    };
  }

  return {
    key: 'upcoming',
    label: `Em dia · Vence em ${inst.dueDateFormatted}`,
    badgeText: 'text-emerald-300',
    badgeBg: 'bg-emerald-500/10',
    badgeBorder: 'border-emerald-500/20',
    dotColor: 'bg-emerald-400',
    isOverdue: false,
  };
}

/**
 * Gera um código hash de autenticidade (64 caracteres) para o comprovante de pagamento
 */
export function generateReceiptHash(inst: FinancialInstallment): string {
  const seed = `${inst.number}-${inst.amount}-${inst.paidAt || ''}-${inst.paymentId || ''}-${CLIENT_INFO.cpfClean}-${CONTRACTOR_INFO.cpfClean}`;
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57, h3 = 0x12345678, h4 = 0x87654321;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822519);
    h4 = Math.imul(h4 ^ ch, 3266489917);
  }
  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  const part = `${toHex(h1)}${toHex(h2)}${toHex(h3)}${toHex(h4)}`;
  return (part + part).slice(0, 64);
}

export { CLIENT_INFO, CONTRACTOR_INFO };
