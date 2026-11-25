'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowUpDown,
  Ban,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Laptop,
  Loader2,
  LogOut,
  Mail,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  ShieldAlert,
  StickyNote,
  Tag,
  UserCheck,
  Users,
  Video,
  X,
} from 'lucide-react';
import { getPublicApiUrl, getStoredSessionToken } from '@/lib/contentStore';
import { useScrollLock } from '@/hooks/useScrollLock';
import type { AdminModuleId } from '@/app/admin/components/types';
import { HelpTriggerButton } from './help/HelpTriggerButton';
import { ManualRefundModal } from './ManualRefundModal';
import { PageHeader, AdminTabs } from './ui/AdminPrimitives';
import { VipLeadsEditor } from './VipLeadsEditor';
import type { SiteContent } from '@/lib/types';

interface CustomerSummaryRow {
  id: string;
  accountType?: 'nua_id' | 'guest';
  displayName: string;
  email: string;
  phone?: string;
  contactChannel?: 'telegram' | 'whatsapp' | 'email' | null;
  status: 'active' | 'suspended' | 'anonymized' | 'guest';
  createdAt: string;
  counts: {
    orders: number;
    paidOrders: number;
    libraryActive: number;
    appointments: number;
    personalizados: number;
  };
  totalSpent: number;
  hasPendingRefund: boolean;
  needsAttention: boolean;
  attentionReasons?: string[];
  marketingOptIn?: boolean;
  crmTags?: string[];
  lastOrderAt: string | null;
}

interface CustomerDetailPayload {
  customer: {
    id: string;
    accountType?: 'nua_id' | 'guest';
    displayName: string;
    email: string;
    phone?: string;
    contacts?: string[];
    reviewReason?: string | null;
    accessRestrictions?: Record<string, true>;
    crmNotes?: string;
    crmTags?: string[];
    crmUpdatedAt?: string | null;
    activeSessionsCount?: number;
    lastSessionAt?: string | null;
    status: 'active' | 'suspended' | 'anonymized' | 'guest';
    marketingOptIn: boolean;
    termsAcceptedAt: string | null;
    createdAt: string;
    updatedAt: string;
    anonymizedAt: string | null;
  };
  orders: Array<{
    id: string;
    kind: 'pack' | 'vip' | 'custom';
    kindLabel: string;
    title: string;
    amount: number;
    financialStatus: string;
    financialLabel: string;
    operationalLabel: string;
    createdAt: string;
    paidAt?: string | null;
  }>;
  library: Array<{
    entitlementId: string;
    orderRef: string;
    title: string;
    status: string;
    purchasedAt: string;
  }>;
  appointments: Array<{
    id: string;
    modalityName: string;
    displayDateBr: string;
    displayTimeBr: string;
    operationalStatus: string;
    financialStatus: string;
    hasMeetingLink?: boolean;
    refundStatus?: string | null;
    createdAt?: string;
    history?: Array<{
      at: string;
      action: string;
      author: 'client' | 'admin' | 'system' | 'mercadopago_webhook';
    }>;
  }>;
  personalizados: Array<{
    id: string;
    photoCount: number;
    videoDurationMinutes?: number;
    totalPrice: number;
    deliveryChannel?: string;
    operationalStatus: string;
    financialStatus: string;
    createdAt?: string;
  }>;
  auditEvents: Array<{
    id: string;
    action: string;
    createdAt: string;
    details?: Record<string, any>;
  }>;
}

interface ClientesModuleProps {
  searchQuery?: string;
  initialSearch?: string;
  onSelectModule?: (id: AdminModuleId, subAction?: string) => void;
  content?: SiteContent;
  onContentChange?: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
}

type CustomerFilter =
  | 'all'
  | 'nua_id'
  | 'guest'
  | 'paying'
  | 'attention'
  | 'refunds'
  | 'optin'
  | 'empty'
  | 'active'
  | 'suspended'
  | 'anonymized';

type CustomerSort = 'recent' | 'spent' | 'orders' | 'created';

const PRESET_CRM_TAGS = ['VIP', 'Recorrente', 'Prioridade', 'Personalizado', 'Atenção'];

interface PendingActionModal {
  action: 'revoke_sessions' | 'suspend' | 'reactivate' | 'revoke_entitlement' | 'restore_entitlement'
    | 'resend_access_email' | 'mark_guest_review' | 'clear_guest_review' | 'restrict_order_access' | 'restore_order_access';
  title: string;
  description: string;
  confirmLabel: string;
  variant: 'danger' | 'primary';
  defaultReason: string;
  extra?: Record<string, any>;
}

const PAGE_SIZE = 20;

const CUSTOMER_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  active: { label: 'Conta ativa', cls: 'bg-emerald-500/15 text-emerald-300' },
  guest: { label: 'Visitante', cls: 'bg-sky-500/15 text-sky-300' },
  suspended: { label: 'Conta suspensa', cls: 'bg-rose-500/15 text-rose-300' },
  anonymized: { label: 'Dados pessoais removidos', cls: 'bg-zinc-600/20 text-zinc-400' },
};

const ORDER_KIND_LABELS = {
  pack: 'Conteúdo',
  vip: 'Chamada VIP',
  custom: 'Personalizado',
};

const PAYMENT_LABELS: Record<string, string> = {
  paid: 'Pagamento confirmado',
  pending: 'Aguardando pagamento',
  failed: 'Pagamento recusado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
  charged_back: 'Pagamento contestado',
};

const UNKNOWN_STATUS = 'Situação não informada';
const LABEL_DATE_TIME = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

function dateTimeLabel(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? LABEL_DATE_TIME.format(date) : null;
}

const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  aguardando_pagamento: 'Aguardando pagamento',
  confirmada: 'Confirmada',
  reagendamento_pendente: 'Mudança de horário em análise',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
  reembolso_pendente: 'Reembolso em análise',
  nao_compareceu: 'Não compareceu',
};

const REFUND_LABELS: Record<string, string> = {
  pending: 'Reembolso em andamento',
  failed: 'Não foi possível devolver o valor',
  manual_required: 'Reembolso precisa de atenção',
  awaiting_finance: 'Reembolso em análise',
  completed: 'Reembolso concluído',
  refunded: 'Reembolso concluído',
};

const PERSONALIZADO_STATUS_LABELS: Record<string, string> = {
  aguardando_pagamento: 'Aguardando pagamento',
  em_producao: 'Em produção',
  pronto: 'Pronto',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

const ENTITLEMENT_STATUS_LABELS: Record<string, string> = {
  active: 'Acesso liberado',
  revoked: 'Acesso retirado',
  expired: 'Acesso expirado',
};

const AUDIT_ACTION_LABELS: Record<string, string> = {
  login_otp: 'Entrou na conta',
  login_verified: 'Entrou na conta',
  logout: 'Saiu da conta',
  profile_update: 'Dados da conta atualizados',
  profile_updated: 'Dados da conta atualizados',
  revoke_session: 'Desconectou um aparelho',
  revoke_other_sessions: 'Desconectou outros aparelhos',
  sessions_revoked: 'Aparelhos desconectados',
  order_bound_inline_checkout: 'Compra adicionada à conta',
  legacy_order_claimed: 'Compra anterior adicionada à conta',
  order_claimed: 'Compra adicionada à conta',
  account_anonymized: 'Dados pessoais removidos',
  admin_revoke_all_sessions: 'Todos os aparelhos foram desconectados',
  admin_suspend_account: 'Conta suspensa',
  admin_reactivate_account: 'Conta reativada',
  admin_mark_guest_review: 'Contato marcado para revisão',
  admin_clear_guest_review: 'Marcação removida',
  admin_restrict_order_access: 'Entrega pelo Cofre bloqueada',
  admin_restore_order_access: 'Entrega pelo Cofre desbloqueada',
  admin_revoke_entitlement: 'Acesso ao conteúdo retirado',
  admin_restore_entitlement: 'Acesso ao conteúdo restaurado',
  admin_resend_access_email: 'Link de acesso reenviado por e-mail',
  admin_save_crm_meta: 'Anotações internas atualizadas',
};

const CALL_ACTIVITY_LABELS: Record<string, string> = {
  criada_manual_admin: 'Chamada marcada pelo painel',
  pagamento_confirmado: 'Pagamento da chamada confirmado',
  link_atualizado: 'Link da chamada atualizado',
  reembolso_concluido: 'Reembolso da chamada concluído',
  reembolso_pendente: 'Reembolso da chamada em andamento',
  reembolso_falhou: 'Reembolso da chamada não concluído',
  cancelada: 'Chamada cancelada',
  concluida: 'Chamada concluída',
  ausente: 'Cliente não compareceu à chamada',
  proposta_reagendamento: 'Novo horário proposto',
  proposta_retirada: 'Proposta de horário retirada',
  cancelamento_recusado: 'Pedido de cancelamento recusado',
  cancelamento_aprovado: 'Pedido de cancelamento aceito',
  reagendada: 'Horário da chamada alterado',
  status_alterado: 'Situação da chamada atualizada',
  solicitacao_cancelamento_cliente: 'Cliente pediu para cancelar a chamada',
  cancelamento_solicitado: 'Cliente pediu para cancelar a chamada',
  cancelamento_cliente: 'Cliente cancelou a chamada',
  proposta_aceita: 'Novo horário aceito',
  proposta_recusada: 'Novo horário recusado',
  solicitacao_reagendamento: 'Cliente pediu outro horário',
  pagamento_tardio_apos_cancelamento: 'Pagamento recebido após o cancelamento',
};

function getLabel(labels: Record<string, string>, value: string) {
  return Object.prototype.hasOwnProperty.call(labels, value) ? labels[value] : undefined;
}

function whatsappUrl(contact?: string) {
  const value = contact?.trim() || '';
  if (!/^[+\d().\s-]+$/.test(value)) return null;
  const digits = value.replace(/\D/g, '');
  const international = value.startsWith('+') || digits.length > 11;
  const number = international ? digits : /^[1-9]\d[2-9]\d{7,8}$/.test(digits) ? '55' + digits : '';
  return /^[1-9]\d{7,14}$/.test(number) ? 'https://wa.me/' + number : null;
}

function formatBrl(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function formatCustomerStatus(status: string) {
  return Object.prototype.hasOwnProperty.call(CUSTOMER_STATUS_MAP, status)
    ? CUSTOMER_STATUS_MAP[status]
    : { label: UNKNOWN_STATUS, cls: 'bg-white/[0.06] text-adm-muted' };
}

function customerActionError(status: number) {
  if (status === 401 || status === 403) return 'Sua conta não tem permissão para concluir esta ação.';
  if (status === 404 || status === 409) return 'Atualize a ficha e confira se a ação ainda está disponível.';
  return 'Não foi possível concluir a ação. Tente novamente.';
}

function buildCustomerActivity(detail: CustomerDetailPayload) {
  const items: Array<{ id: string; label: string; at: string; result?: string }> = [];
  for (const order of detail.orders) {
    const kindLabel = order.kind === 'vip' ? 'Chamada solicitada' : order.kind === 'custom' ? 'Personalizado solicitado' : 'Pedido criado';
    if (order.createdAt) items.push({ id: `created:${order.id}`, label: kindLabel, at: order.createdAt, result: order.title });
    if (order.financialStatus === 'paid' && order.paidAt) {
      items.push({ id: `paid:${order.id}`, label: 'Pagamento confirmado', at: order.paidAt, result: order.title });
    }
  }
  for (const appointment of detail.appointments) {
    for (const event of appointment.history || []) {
      const label = getLabel(CALL_ACTIVITY_LABELS, event.action);
      if (!label) continue;
      const matchesOrderPayment = event.action === 'pagamento_confirmado' && detail.orders.some(
        (order) => order.kind === 'vip' && order.id === appointment.id && order.financialStatus === 'paid' && order.paidAt,
      );
      if (matchesOrderPayment) continue;
      items.push({
        id: `appointment-history:${appointment.id}:${event.at}:${event.action}`,
        label,
        at: event.at,
        result: appointment.modalityName,
      });
    }
  }
  for (const event of detail.auditEvents) {
    const label = getLabel(AUDIT_ACTION_LABELS, event.action);
    if (label) {
      const reason = typeof event.details?.reason === 'string' && event.details.reason.trim()
        ? event.details.reason.trim()
        : undefined;
      const orderRef = typeof event.details?.orderRef === 'string' && event.details.orderRef.trim()
        ? event.details.orderRef.trim()
        : undefined;
      const result = [orderRef ? `Pedido ${orderRef}` : '', reason ? `Motivo: ${reason}` : '']
        .filter(Boolean)
        .join(' · ') || undefined;
      items.push({ id: `audit:${event.id}`, label, at: event.createdAt, result });
    }
  }
  return items
    .filter((item) => item.at && Number.isFinite(new Date(item.at).getTime()))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 30);
}

export function ClientesModule({
  searchQuery = '',
  initialSearch = '',
  onSelectModule,
  content,
  onContentChange,
}: ClientesModuleProps) {
  const [sectionTab, setSectionTab] = useState<'clientes' | 'vip'>('clientes');
  const initialQuery = initialSearch || searchQuery;
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery.trim());
  const [filter, setFilter] = useState<CustomerFilter>('all');
  const [sort, setSort] = useState<CustomerSort>('recent');
  const [page, setPage] = useState(1);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const listRequestId = useRef(0);

  const [customers, setCustomers] = useState<CustomerSummaryRow[]>([]);
  const [totals, setTotals] = useState({
    all: 0,
    withAccount: 0,
    guests: 0,
    active: 0,
    attention: 0,
    paying: 0,
    optIn: 0,
    empty: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedContact, setCopiedContact] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailRequestId = useRef(0);
  const [detail, setDetail] = useState<CustomerDetailPayload | null>(null);
  const [crmNotesDraft, setCrmNotesDraft] = useState('');
  const [crmTagsDraft, setCrmTagsDraft] = useState<string[]>([]);
  const [crmSaving, setCrmSaving] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<{ orderId: string; modality: string } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  // Modal de confirmação auditada com campo de motivo
  const [pendingAction, setPendingAction] = useState<PendingActionModal | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  useScrollLock(Boolean(pendingAction));

  useEffect(() => {
    if (!pendingAction) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !actionSubmitting) {
        setPendingAction(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pendingAction, actionSubmitting]);

  useEffect(() => {
    const nextQuery = initialSearch || searchQuery;
    setQuery(nextQuery);
    setDebouncedQuery(nextQuery.trim());
    setPage(1);
  }, [searchQuery, initialSearch]);

  // Debounce de 300ms na busca para evitar tempestade de requisições
  useEffect(() => {
    const nextQuery = query.trim();
    if (nextQuery === debouncedQuery) return;
    const timer = setTimeout(() => {
      setDebouncedQuery(nextQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, debouncedQuery]);

  const loadList = useCallback(async () => {
    const requestId = ++listRequestId.current;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ filter, sort, page: String(page), pageSize: String(PAGE_SIZE) });
      if (debouncedQuery) qs.set('q', debouncedQuery);
      const token = getStoredSessionToken();
      const res = await fetch(`${getPublicApiUrl()}/api/admin/customers?${qs.toString()}`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => ({}));
      if (requestId !== listRequestId.current) return;
      if (!res.ok || !data.success) {
        setError('Não foi possível carregar os clientes. Tente atualizar a lista.');
        setCustomers([]);
        setTotalFiltered(0);
        return;
      }
      setCustomers(data.customers || []);
      setTotalFiltered(data.pagination?.total ?? data.customers?.length ?? 0);
      if (data.pagination?.page && data.pagination.page !== page) setPage(data.pagination.page);
      setTotals({
        all: data.totals?.all ?? 0,
        withAccount: data.totals?.withAccount ?? 0,
        guests: data.totals?.guests ?? 0,
        active: data.totals?.active ?? 0,
        attention: data.totals?.attention ?? 0,
        paying: data.totals?.paying ?? 0,
        optIn: data.totals?.optIn ?? 0,
        empty: data.totals?.empty ?? 0,
      });
    } catch {
      if (requestId !== listRequestId.current) return;
      setError('Erro de conexão ao consultar clientes.');
      setCustomers([]);
      setTotalFiltered(0);
    } finally {
      if (requestId === listRequestId.current) setLoading(false);
    }
  }, [filter, sort, debouncedQuery, page]);

  const loadDetail = useCallback(async (id: string) => {
    const requestId = ++detailRequestId.current;
    setExpandedOrderId(null);
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    try {
      const token = getStoredSessionToken();
      const res = await fetch(`${getPublicApiUrl()}/api/admin/customers?id=${encodeURIComponent(id)}`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => ({}));
      if (requestId !== detailRequestId.current) return;
      if (res.ok && data.success) {
        setDetail(data);
        setCrmNotesDraft(data.customer?.crmNotes || '');
        setCrmTagsDraft(Array.isArray(data.customer?.crmTags) ? data.customer.crmTags : []);
      } else {
        setDetailError(res.status === 404 ? 'Cliente não encontrado. Volte e atualize a lista.' : 'Não foi possível abrir a ficha deste cliente.');
      }
    } catch {
      if (requestId === detailRequestId.current) setDetailError('Falha de conexão ao consultar os dados deste cliente.');
    } finally {
      if (requestId === detailRequestId.current) setDetailLoading(false);
    }
  }, []);

  const handleSaveCrmMeta = async () => {
    if (!detail || crmSaving) return;
    setCrmSaving(true);
    setActionMsg(null);
    try {
      const token = getStoredSessionToken();
      const res = await fetch(`${getPublicApiUrl()}/api/admin/customers`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          profileId: detail.customer.id,
          action: 'save_crm_meta',
          notes: crmNotesDraft,
          tags: crmTagsDraft,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setDetail((prev) =>
          prev
            ? {
                ...prev,
                customer: {
                  ...prev.customer,
                  crmNotes: data.crmNotes,
                  crmTags: data.crmTags,
                  crmUpdatedAt: data.crmUpdatedAt,
                },
              }
            : prev
        );
        setActionMsg({ tone: 'ok', text: 'Anotações e tags internas salvas.' });
        void loadList();
      } else {
        setActionMsg({ tone: 'err', text: data.error || 'Não foi possível salvar as anotações.' });
      }
    } catch {
      setActionMsg({ tone: 'err', text: 'Falha de conexão ao salvar anotações.' });
    } finally {
      setCrmSaving(false);
    }
  };

  const handleExportCsv = () => {
    if (customers.length === 0) return;
    const escapeCsv = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const headers = ['Nome', 'E-mail', 'Telefone', 'Tipo', 'Status', 'Aceita Novidades', 'Tags', 'Total Pago (BRL)', 'Último Pedido'];
    const lines = [
      headers.map(escapeCsv).join(','),
      ...customers.map((c) =>
        [
          c.displayName,
          c.email,
          c.phone || '',
          c.accountType === 'guest' ? 'Visitante' : 'Com conta',
          formatCustomerStatus(c.status).label,
          c.marketingOptIn ? 'Sim' : 'Não',
          (c.crmTags || []).join(' | '),
          (c.totalSpent || 0).toFixed(2),
          c.lastOrderAt || '',
        ]
          .map(escapeCsv)
          .join(',')
      ),
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes-${filter}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedId) {
      setActionMsg(null);
      loadDetail(selectedId);
    }
  }, [selectedId, loadDetail]);

  const openActionModal = (modal: PendingActionModal) => {
    setActionReason(modal.defaultReason);
    setPendingAction(modal);
  };

  const executePendingAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !detail || !pendingAction || actionSubmitting) return;
    const requestId = detailRequestId.current;
    setActionSubmitting(true);
    setActionMsg(null);
    try {
      const token = getStoredSessionToken();
      const res = await fetch(`${getPublicApiUrl()}/api/admin/customers`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          profileId: detail.customer.id,
          action: pendingAction.action,
          reason: actionReason.trim() || pendingAction.defaultReason,
          ...(pendingAction.extra || {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (requestId !== detailRequestId.current) return;
      if (res.ok && data.success) {
        const warning = data.sessionsInvalidated === false
          ? 'Conta suspensa. Não foi possível confirmar a saída de todos os aparelhos.'
          : data.auditRecorded === false ? 'Alteração salva. Não foi possível registrar no histórico de atividades.' : '';
        setActionMsg(warning ? { tone: 'err', text: warning } : { tone: 'ok', text: 'Alteração salva.' });
        setPendingAction(null);
        await Promise.all([loadDetail(selectedId), loadList()]);
      } else {
        setActionMsg({ tone: 'err', text: customerActionError(res.status) });
        setPendingAction(null);
      }
    } catch {
      if (requestId !== detailRequestId.current) return;
      setActionMsg({ tone: 'err', text: 'Houve uma falha de conexão. Atualize a ficha antes de tentar novamente.' });
      setPendingAction(null);
    } finally {
      setActionSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  // Visão de detalhe do cliente selecionado
  if (selectedId) {
    const contactUrl = whatsappUrl(detail?.customer.phone);
    const statusBadge = detail ? formatCustomerStatus(detail.customer.status) : null;
    const activityItems = detail ? buildCustomerActivity(detail) : [];
    const confirmedPaidOrders = detail
      ? detail.orders.filter((order) => order.financialStatus === 'paid')
      : [];
    const confirmedPaidTotal = confirmedPaidOrders.reduce(
      (total, order) => total + Number(order.amount || 0),
      0
    );
    const averageTicket =
      confirmedPaidOrders.length > 0 ? confirmedPaidTotal / confirmedPaidOrders.length : 0;

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              detailRequestId.current++;
              setPendingAction(null);
              setSelectedId(null);
              setDetail(null);
              setActionMsg(null);
            }}
            className="adm-btn adm-btn-ghost cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para Clientes
          </button>
        </div>

        {actionMsg && (
          <div
            role="status"
            className={`adm-card flex items-center gap-2 px-4 py-3 text-xs ${
              actionMsg.tone === 'ok'
                ? 'border-emerald-500/35 text-emerald-200'
                : 'border-rose-500/35 text-rose-200'
            }`}
          >
            {actionMsg.tone === 'ok' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            )}
            <span>{actionMsg.text}</span>
          </div>
        )}

        {detailLoading ? (
          <div className="adm-card h-48 animate-pulse" />
        ) : detailError ? (
          <div role="alert" className="adm-card space-y-3 border-rose-500/30 p-5 text-sm text-rose-200">
            <p>{detailError}</p>
            <button type="button" onClick={() => loadDetail(selectedId)} className="adm-btn adm-btn-ghost cursor-pointer">
              <RefreshCw className="h-3.5 w-3.5" />
              Tentar novamente
            </button>
          </div>
        ) : !detail ? (
          <div className="adm-card p-5 text-sm text-adm-muted">Os dados deste cliente ainda não estão disponíveis.</div>
        ) : (
          <div className="space-y-5">
            {/* Cabeçalho do Cliente + Ações Auditadas */}
            <div className="adm-card min-w-0 p-4 sm:p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h2 className="min-w-0 break-words text-lg font-semibold text-adm-text">{detail.customer.displayName}</h2>
                    {statusBadge && (
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${statusBadge.cls}`}>
                        {statusBadge.label}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 break-words text-xs text-adm-muted">{detail.customer.email}</p>
                  {detail.customer.phone && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] border border-white/10 px-2.5 py-0.5 text-[11px] text-adm-text">
                        <MessageCircle className="h-3 w-3 text-adm-accent" />
                        {detail.customer.phone}
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(detail.customer.phone || '');
                            setCopiedContact(detail.customer.phone || null);
                            setTimeout(() => setCopiedContact(null), 2000);
                          } catch {
                            setActionMsg({ tone: 'err', text: 'Não foi possível copiar o contato.' });
                          }
                        }}
                        className="inline-flex items-center gap-1 text-[11px] text-adm-muted hover:text-adm-text cursor-pointer"
                      >
                        {copiedContact === detail.customer.phone ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-300">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copiar contato</span>
                          </>
                        )}
                      </button>
                      {contactUrl && (
                        <a href={contactUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-adm-accent hover:underline">
                          Abrir WhatsApp <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )}
                  {dateTimeLabel(detail.customer.createdAt) && (
                    <p className="mt-1.5 text-xs text-adm-muted">
                      {detail.customer.accountType === 'guest' ? 'Primeiro registro' : 'Cadastro'} em{' '}
                      <time dateTime={detail.customer.createdAt}>{dateTimeLabel(detail.customer.createdAt)}</time>
                    </p>
                  )}
                  {detail.customer.accountType !== 'guest' && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 ${
                          detail.customer.marketingOptIn
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : 'border-white/10 bg-white/[0.03] text-adm-muted'
                        }`}
                      >
                        <Mail className="h-3 w-3" />
                        {detail.customer.marketingOptIn ? 'Aceita novidades' : 'Somente transacionais'}
                      </span>
                      {typeof detail.customer.activeSessionsCount === 'number' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-adm-muted">
                          <Laptop className="h-3 w-3" />
                          {detail.customer.activeSessionsCount}{' '}
                          {detail.customer.activeSessionsCount === 1 ? 'aparelho ativo' : 'aparelhos ativos'}
                          {detail.customer.lastSessionAt && dateTimeLabel(detail.customer.lastSessionAt)
                            ? ` · ${dateTimeLabel(detail.customer.lastSessionAt)}`
                            : ''}
                        </span>
                      )}
                      {detail.customer.termsAcceptedAt && dateTimeLabel(detail.customer.termsAcceptedAt) && (
                        <span className="text-adm-subtle">
                          Termos aceitos em {dateTimeLabel(detail.customer.termsAcceptedAt)}
                        </span>
                      )}
                    </div>
                  )}
                  {detail.customer.accountType === 'guest' && (
                    <p className="mt-1 text-[11px] text-adm-muted">
                      Pedidos de visitante com o mesmo e-mail informado aparecem nesta ficha.
                    </p>
                  )}
                </div>

                {detail.customer.accountType === 'guest' && (
                  <div className="space-y-2">
                    {detail.customer.reviewReason && (
                      <p className="text-xs text-amber-300">Em revisão · {detail.customer.reviewReason}</p>
                    )}
                    <button type="button" className="adm-btn adm-btn-ghost text-xs" onClick={() => {
                      const marked = Boolean(detail.customer.reviewReason);
                      openActionModal({
                        action: marked ? 'clear_guest_review' : 'mark_guest_review',
                        title: marked ? 'Retirar marcação de revisão' : 'Marcar contato para revisão',
                        description: 'A ficha aparecerá em Atendimento enquanto estiver marcada.',
                        confirmLabel: marked ? 'Retirar marcação' : 'Marcar para revisão',
                        variant: 'primary',
                        defaultReason: marked ? 'Revisão concluída' : 'Contato precisa de revisão',
                      });
                    }}>
                      {detail.customer.reviewReason ? 'Retirar marcação' : 'Marcar para revisão'}
                    </button>
                  </div>
                )}
                {detail.customer.accountType !== 'guest' && (
                  <div className="flex flex-wrap gap-2">
                    {detail.customer.status === 'active' && (
                      <button
                        type="button"
                        onClick={() =>
                          openActionModal({
                            action: 'resend_access_email',
                            title: 'Reenviar link de acesso?',
                            description:
                              'Enviará um e-mail discreto para o cliente com atalho direto para entrar em Minha Conta.',
                            confirmLabel: 'Enviar e-mail',
                            variant: 'primary',
                            defaultReason: 'Atendimento ao cliente',
                          })
                        }
                        className="adm-btn adm-btn-ghost cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Reenviar acesso
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        openActionModal({
                          action: 'revoke_sessions',
                          title: 'Desconectar todos os aparelhos?',
                          description:
                            'O cliente sairá da conta em todos os aparelhos. Para voltar, precisará entrar novamente.',
                          confirmLabel: 'Desconectar aparelhos',
                          variant: 'danger',
                          defaultReason: 'Segurança preventiva',
                        })
                      }
                      className="adm-btn adm-btn-ghost cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Desconectar aparelhos
                    </button>
                    {detail.customer.status === 'active' ? (
                      <button
                        type="button"
                        onClick={() =>
                          openActionModal({
                            action: 'suspend',
                            title: 'Suspender conta do cliente?',
                            description:
                              'O cliente sairá da conta em todos os aparelhos e só poderá voltar quando a conta for reativada.',
                            confirmLabel: 'Suspender conta',
                            variant: 'danger',
                            defaultReason: 'Conta suspensa pelo painel',
                          })
                        }
                        className="adm-btn adm-btn-danger cursor-pointer"
                      >
                        <Ban className="h-3.5 w-3.5" />
                        Suspender conta
                      </button>
                    ) : detail.customer.status === 'suspended' ? (
                      <button
                        type="button"
                        onClick={() =>
                          openActionModal({
                            action: 'reactivate',
                            title: 'Reativar conta do cliente?',
                            description:
                              'O cliente poderá entrar novamente e ver os conteúdos disponíveis.',
                            confirmLabel: 'Reativar conta',
                            variant: 'primary',
                            defaultReason: 'Conta reativada pelo painel',
                          })
                        }
                        className="adm-btn adm-btn-primary cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Reativar conta
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Resumo do cliente">
              <div className="adm-card p-3.5">
                <p className="text-[10px] uppercase tracking-wider text-adm-muted">Pedidos e serviços</p>
                <p className="mt-1 text-xl font-semibold text-adm-text">{detail.orders.length}</p>
                <p className="mt-0.5 text-[11px] text-adm-subtle">
                  {confirmedPaidOrders.length} {confirmedPaidOrders.length === 1 ? 'pago' : 'pagos'}
                </p>
              </div>
              <div className="adm-card p-3.5">
                <p className="text-[10px] uppercase tracking-wider text-adm-muted">Chamadas &amp; Pers.</p>
                <p className="mt-1 text-xl font-semibold text-adm-text">
                  {detail.appointments.length} / {detail.personalizados.length}
                </p>
                <p className="mt-0.5 text-[11px] text-adm-subtle">VIP / Personalizados</p>
              </div>
              <div className="adm-card p-3.5">
                <p className="text-[10px] uppercase tracking-wider text-adm-muted">Ticket médio</p>
                <p className="mt-1 text-xl font-semibold text-adm-text">{formatBrl(averageTicket)}</p>
                <p className="mt-0.5 text-[11px] text-adm-subtle">Por pedido confirmado</p>
              </div>
              <div className="adm-card p-3.5">
                <p className="text-[10px] uppercase tracking-wider text-adm-muted">Total pago (LTV)</p>
                <p className="mt-1 text-xl font-semibold text-emerald-300">{formatBrl(confirmedPaidTotal)}</p>
                <p className="mt-0.5 text-[11px] text-adm-subtle">Confirmado no financeiro</p>
              </div>
            </div>

            {/* Notas internas e Tags (CRM — visível apenas no painel) */}
            <section className="adm-card min-w-0 p-4 sm:p-5 space-y-3.5" aria-label="Anotações internas e tags">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-adm-accent" />
                  <h3 className="text-sm font-semibold text-adm-text">Anotações internas &amp; Tags</h3>
                </div>
                <span className="text-[11px] text-adm-subtle">Uso interno · Nunca visível ao cliente</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {PRESET_CRM_TAGS.map((tag) => {
                  const selected = crmTagsDraft.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setCrmTagsDraft((prev) =>
                          prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                        )
                      }
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors cursor-pointer ${
                        selected
                          ? 'border-adm-accent bg-adm-accent-soft text-white font-medium'
                          : 'border-white/10 bg-adm-surface text-adm-muted hover:border-white/20 hover:text-adm-text'
                      }`}
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {tag}
                    </button>
                  );
                })}
              </div>

              <textarea
                rows={2}
                maxLength={1500}
                value={crmNotesDraft}
                onChange={(e) => setCrmNotesDraft(e.target.value)}
                placeholder="Preferências de atendimento, observações de personalizados ou histórico relevante..."
                className="adm-input min-h-[70px] w-full resize-y text-xs leading-relaxed"
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-adm-subtle">
                  {detail.customer.crmUpdatedAt && dateTimeLabel(detail.customer.crmUpdatedAt)
                    ? `Última atualização em ${dateTimeLabel(detail.customer.crmUpdatedAt)}`
                    : 'Nenhuma anotação salva ainda'}
                </span>
                <button
                  type="button"
                  disabled={crmSaving}
                  onClick={handleSaveCrmMeta}
                  className="adm-btn adm-btn-primary cursor-pointer"
                >
                  {crmSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {crmSaving ? 'Salvando...' : 'Salvar anotações'}
                </button>
              </div>
            </section>

            <section className="adm-card min-w-0 p-4 sm:p-5" aria-labelledby="customer-activity-heading">
              <h3 id="customer-activity-heading" className="mb-3 text-sm font-semibold text-adm-text">
                Atividades do cliente
              </h3>
              {activityItems.length === 0 ? (
                <p className="text-xs text-adm-muted">Ainda não há atividades nesta ficha.</p>
              ) : (
                <ol className="divide-y divide-white/[0.06]">
                  {activityItems.map((item) => (
                    <li key={item.id} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-adm-text">{item.label}</p>
                        {item.result && <p className="break-words text-xs text-adm-muted">{item.result}</p>}
                      </div>
                      <time dateTime={item.at} className="text-xs tabular-nums text-adm-muted sm:text-right">
                        {dateTimeLabel(item.at)}
                      </time>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {/* Compras Unificadas (lidas dos módulos reais) */}
            <div className="adm-card min-w-0 p-4 sm:p-5">
              <h3 className="mb-3 text-sm font-semibold text-adm-text">
                Histórico de compras ({detail.orders.length})
              </h3>
              {detail.orders.length === 0 ? (
                <p className="text-xs text-adm-muted">Ainda não há pedidos nesta ficha.</p>
              ) : (
                <div className="divide-y divide-white/[0.06]">
                  {detail.orders.map((order, index) => {
                    const expanded = expandedOrderId === order.id;
                    const detailsId = `customer-order-details-${index}`;
                    const created = dateTimeLabel(order.createdAt);
                    const paid = order.paidAt ? dateTimeLabel(order.paidAt) : null;
                    const restricted = Boolean(detail.customer.accessRestrictions?.[order.id]);
                    const canManageDelivery = order.kind !== 'vip';
                    return (
                      <div key={order.id} className="py-3 text-sm">
                        <div className="grid min-w-0 grid-cols-[minmax(5rem,35%)_minmax(0,1fr)] items-center gap-x-3 gap-y-2 lg:grid-cols-[minmax(0,1fr)_7rem_11rem_8rem]">
                          <div className="col-span-2 min-w-0 lg:col-span-1">
                            <p className="break-words font-medium text-adm-text">{order.title}</p>
                            <p className="text-xs text-adm-muted">
                              {ORDER_KIND_LABELS[order.kind]}
                              {created && order.kind !== 'pack' && <> · <time dateTime={order.createdAt}>{created}</time></>}
                            </p>
                          </div>
                          <span className="whitespace-nowrap font-semibold tabular-nums text-adm-text lg:text-right">
                            {formatBrl(order.amount)}
                          </span>
                          <span className="justify-self-start rounded-full bg-white/[0.06] px-2.5 py-1 text-xs leading-tight text-adm-text">
                            {getLabel(PAYMENT_LABELS, order.financialStatus) || UNKNOWN_STATUS}
                          </span>
                          {order.kind === 'pack' ? (
                            <button
                              type="button"
                              aria-expanded={expanded}
                              aria-controls={detailsId}
                              onClick={() => setExpandedOrderId(expanded ? null : order.id)}
                              className="col-span-2 min-h-11 justify-self-start text-left text-xs font-medium text-adm-text underline decoration-adm-accent underline-offset-4 hover:text-white lg:col-span-1 lg:justify-self-end"
                            >
                              {expanded ? 'Fechar detalhes' : 'Ver detalhes'}
                            </button>
                          ) : onSelectModule && (
                            <button
                              type="button"
                              onClick={() => onSelectModule(order.kind === 'vip' ? 'chamadas' : 'personalizados', order.id)}
                              className="col-span-2 min-h-11 justify-self-start text-left text-xs font-medium text-adm-text underline decoration-adm-accent underline-offset-4 hover:text-white lg:col-span-1 lg:justify-self-end"
                            >
                              {order.kind === 'vip' ? 'Ver chamada' : 'Ver pedido'}
                            </button>
                          )}
                        </div>
                        {order.kind === 'pack' && (
                          <div id={detailsId} hidden={!expanded} className="mt-2 space-y-1 rounded-lg bg-adm-surface px-3 py-2 text-xs text-adm-muted">
                            {paid && order.paidAt && <p>Pago em <time dateTime={order.paidAt}>{paid}</time></p>}
                            {created && <p>Pedido feito em <time dateTime={order.createdAt}>{created}</time></p>}
                            {restricted && <p>Acesso pelo Cofre bloqueado</p>}
                            {!created && !paid && !restricted && <p>Ainda não há outros detalhes sobre este pedido.</p>}
                          </div>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-4">
                          {canManageDelivery && (
                            <button
                              type="button"
                              className="min-h-11 text-left text-xs text-adm-text underline decoration-adm-accent underline-offset-4 cursor-pointer"
                              onClick={() => openActionModal({
                                action: restricted ? 'restore_order_access' : 'restrict_order_access',
                                title: restricted ? 'Desbloquear entrega pelo Cofre?' : 'Bloquear entrega pelo Cofre?',
                                description: restricted ? 'A entrega poderá seguir assim que o pagamento estiver confirmado.' : 'O cliente ficará sem acesso a este pedido pelo Cofre.',
                                confirmLabel: restricted ? 'Desbloquear entrega' : 'Bloquear entrega',
                                variant: restricted ? 'primary' : 'danger',
                                defaultReason: restricted ? 'Bloqueio encerrado' : 'Entrega em revisão',
                                extra: { orderRef: order.id },
                              })}
                            >
                              {restricted ? 'Desbloquear entrega' : 'Bloquear entrega'}
                            </button>
                          )}
                          {order.financialStatus === 'paid' && (
                            <button
                              type="button"
                              onClick={() =>
                                setRefundTarget({
                                  orderId: order.id,
                                  modality:
                                    order.kind === 'vip'
                                      ? 'vip'
                                      : order.kind === 'custom'
                                        ? 'personalizado'
                                        : 'pack',
                                })
                              }
                              className="min-h-11 inline-flex items-center gap-1.5 text-left text-xs font-medium text-rose-300 hover:text-rose-200 underline decoration-rose-500/60 underline-offset-4 cursor-pointer"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>Estornar pagamento</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Chamadas VIP + Personalizados do Cliente */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="adm-card min-w-0 p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-adm-text">
                    <Video className="h-4 w-4 text-adm-accent" />
                    Chamadas VIP ({detail.appointments.length})
                  </h3>
                  {onSelectModule ? (
                    <button
                      type="button"
                      onClick={() => onSelectModule('chamadas')}
                      className="inline-flex items-center gap-1 text-[11px] text-adm-accent hover:underline cursor-pointer"
                    >
                      Gerenciar
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  ) : (
                    <Link
                      href="/admin/chamadas"
                      className="inline-flex items-center gap-1 text-[11px] text-adm-accent hover:underline"
                    >
                      Gerenciar
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
                {detail.appointments.length === 0 ? (
                  <p className="text-xs text-adm-muted">Ainda não há chamadas VIP nesta ficha.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.appointments.map((apt) => {
                      const opLabel = getLabel(APPOINTMENT_STATUS_LABELS, apt.operationalStatus) || UNKNOWN_STATUS;
                      const refundLabel = getLabel(REFUND_LABELS, apt.refundStatus || '');
                      return (
                        <button
                          key={apt.id}
                          type="button"
                          onClick={() => {
                            if (onSelectModule) {
                              onSelectModule('chamadas', apt.id);
                            } else {
                              window.location.href = '/admin/chamadas';
                            }
                          }}
                          className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg bg-adm-surface px-3 py-2.5 text-left text-xs transition-colors hover:bg-adm-hover cursor-pointer"
                        >
                          <div className="min-w-0">
                            <p className="break-words font-medium text-adm-text">{apt.modalityName}</p>
                            <p className="text-[11px] text-adm-muted">
                              {apt.displayDateBr} às {apt.displayTimeBr}
                            </p>
                            {refundLabel && <p className="mt-1 text-[11px] text-adm-muted">{refundLabel}</p>}
                          </div>
                          <span className="shrink-0 rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10px] text-adm-muted">
                            {opLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="adm-card min-w-0 p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-adm-text">
                    <Camera className="h-4 w-4 text-adm-accent" />
                    Personalizados ({detail.personalizados.length})
                  </h3>
                  {onSelectModule ? (
                    <button
                      type="button"
                      onClick={() => onSelectModule('personalizados')}
                      className="inline-flex items-center gap-1 text-[11px] text-adm-accent hover:underline cursor-pointer"
                    >
                      Gerenciar
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  ) : (
                    <Link
                      href="/admin/personalizados"
                      className="inline-flex items-center gap-1 text-[11px] text-adm-accent hover:underline"
                    >
                      Gerenciar
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
                {detail.personalizados.length === 0 ? (
                  <p className="text-xs text-adm-muted">Ainda não há pedidos personalizados nesta ficha.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.personalizados.map((p) => {
                      const opLabel = getLabel(PERSONALIZADO_STATUS_LABELS, p.operationalStatus) || UNKNOWN_STATUS;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            if (onSelectModule) {
                              onSelectModule('personalizados', p.id);
                            } else {
                              window.location.href = `/admin/personalizados?sub=${encodeURIComponent(p.id)}`;
                            }
                          }}
                          className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg bg-adm-surface px-3 py-2.5 text-left text-xs transition-colors hover:bg-adm-hover cursor-pointer"
                        >
                          <div className="min-w-0">
                            <p className="break-words font-medium text-adm-text">
                              {p.photoCount} {p.photoCount === 1 ? 'foto' : 'fotos'}
                              {p.videoDurationMinutes && p.videoDurationMinutes > 0
                                ? ` · ${p.videoDurationMinutes} min vídeo`
                                : ''}{' '}
                              · {formatBrl(p.totalPrice)}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10px] text-adm-muted">
                            {opLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="adm-card min-w-0 p-4 sm:p-5">
              <h3 className="mb-3 text-sm font-semibold text-adm-text">
                Conteúdos do cliente ({detail.library.length})
              </h3>
              {detail.library.length === 0 ? (
                <p className="text-xs text-adm-muted">Ainda não há conteúdos nesta ficha.</p>
              ) : (
                <div className="space-y-2">
                  {detail.library.map((item) => (
                    <div key={item.entitlementId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-adm-surface px-3 py-2.5 text-xs">
                      <div>
                        <p className="font-medium text-adm-text">{item.title}</p>
                        <p className="text-[11px] text-adm-muted">
                          {getLabel(ENTITLEMENT_STATUS_LABELS, item.status) || UNKNOWN_STATUS}
                        </p>
                      </div>
                      {item.status === 'active' ? (
                        <button
                          type="button"
                          onClick={() =>
                            openActionModal({
                              action: 'revoke_entitlement',
                              title: `Retirar acesso a "${item.title}"?`,
                              description:
                                'O cliente deixará de ver este conteúdo no Cofre.',
                              confirmLabel: 'Retirar acesso',
                              variant: 'danger',
                              defaultReason: 'Acesso retirado pelo painel',
                              extra: { orderRef: item.orderRef },
                            })
                          }
                          className="text-[11px] text-rose-300 transition-colors hover:text-rose-200 cursor-pointer"
                        >
                          Retirar acesso
                        </button>
                      ) : item.status === 'revoked' ? (
                        <button
                          type="button"
                          onClick={() =>
                            openActionModal({
                              action: 'restore_entitlement',
                              title: `Restaurar acesso a "${item.title}"?`,
                              description:
                                'O cliente voltará a visualizar este conteúdo na Biblioteca e no Cofre.',
                              confirmLabel: 'Restaurar acesso',
                              variant: 'primary',
                              defaultReason: 'Acesso restaurado pelo painel',
                              extra: { orderRef: item.orderRef },
                            })
                          }
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-300 transition-colors hover:text-emerald-200 cursor-pointer"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Restaurar acesso
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de Confirmação Auditada */}
        {pendingAction && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-action-title"
            onClick={(e) => {
              if (e.target === e.currentTarget && !actionSubmitting) {
                setPendingAction(null);
              }
            }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
          >
            <form
              onSubmit={executePendingAction}
              className="relative w-full max-w-md space-y-4 rounded-xl border border-white/[0.08] bg-[#171821] p-5 sm:p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
                    pendingAction.variant === 'danger'
                      ? 'border-rose-500/25 bg-rose-500/10 text-rose-400'
                      : 'border-[#843C52]/25 bg-[#843C52]/10 text-[#843C52]'
                  }`}
                >
                  <AlertCircle className="h-4 w-4" />
                </div>
                <button
                  type="button"
                  disabled={actionSubmitting}
                  onClick={() => setPendingAction(null)}
                  aria-label="Fechar"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-zinc-400 transition-colors hover:bg-white/[0.1] hover:text-white cursor-pointer disabled:opacity-40"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <h3 id="customer-action-title" className="break-words text-base font-medium text-white">{pendingAction.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">{pendingAction.description}</p>
              </div>

              <div>
                <label htmlFor="admin-action-reason" className="mb-1.5 block text-[11px] text-zinc-400">
                  Motivo da alteração
                </label>
                <input
                  id="admin-action-reason"
                  type="text"
                  maxLength={240}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Informe o motivo desta ação..."
                  className="adm-input min-h-[40px] text-xs"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  disabled={actionSubmitting}
                  onClick={() => setPendingAction(null)}
                  className="h-9 flex-1 rounded-lg border border-white/10 bg-white/[0.06] px-4 text-xs font-medium uppercase tracking-wider text-zinc-300 transition-colors hover:bg-white/[0.1] hover:text-white cursor-pointer disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionSubmitting}
                  className={`inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-4 text-xs font-semibold uppercase tracking-wider text-white transition-all cursor-pointer disabled:opacity-50 ${
                    pendingAction.variant === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-500'
                      : 'bg-[#843C52] hover:bg-[#992b4a]'
                  }`}
                >
                  {actionSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {pendingAction.confirmLabel}
                </button>
              </div>
            </form>
          </div>
        )}
        <ManualRefundModal
          isOpen={Boolean(refundTarget)}
          orderId={refundTarget?.orderId || null}
          modality={refundTarget?.modality}
          onClose={() => setRefundTarget(null)}
          onRefundCompleted={() => {
            if (detail?.customer?.id) {
              void loadDetail(detail.customer.id);
            }
          }}
        />
      </div>
    );
  }

  // Visão de listagem geral
  return (
    <div className="space-y-5">
      <PageHeader
        title="Clientes"
        subtitle="Consulte compras, contatos, acessos ao Cofre e lista VIP em um só lugar."
        helpId="clientes_central"
      >
        {content && onContentChange && (
          <AdminTabs
            activeId={sectionTab}
            onChange={setSectionTab}
            ariaLabel="Áreas de Clientes"
            items={[
              { id: 'clientes', label: 'Clientes & Compras', icon: Users, badge: totals.all || undefined },
              { id: 'vip', label: 'Lista VIP', icon: Mail },
            ]}
          />
        )}
      </PageHeader>

      {sectionTab === 'vip' && content && onContentChange ? (
        <VipLeadsEditor content={content} onChange={onContentChange} searchQuery={searchQuery} />
      ) : (
      <>

      {/* KPIs globais (nunca distorcidos por busca ou filtro) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="adm-card p-4">
          <p className="text-[11px] uppercase tracking-wider text-adm-muted">Registros de clientes</p>
          <p className="mt-1 text-2xl font-semibold text-adm-text">{totals.all}</p>
          <p className="mt-0.5 text-[11px] text-adm-subtle">
            {totals.withAccount} com conta · {totals.guests} {totals.guests === 1 ? 'visitante' : 'visitantes'}
          </p>
        </div>
        <div className="adm-card p-4">
          <p className="text-[11px] uppercase tracking-wider text-adm-muted">Clientes que já pagaram</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-400">{totals.paying}</p>
          <p className="mt-0.5 text-[11px] text-adm-subtle">Sem compras: {totals.empty}</p>
        </div>
        <div className="adm-card p-4">
          <p className="text-[11px] uppercase tracking-wider text-adm-muted">Contas ativas</p>
          <p className="mt-1 text-2xl font-semibold text-adm-text">{totals.active}</p>
        </div>
        <div className="adm-card p-4">
          <p className="text-[11px] uppercase tracking-wider text-adm-muted">Precisam de atendimento</p>
          <p className="mt-1 text-2xl font-semibold text-amber-400">{totals.attention}</p>
        </div>
      </div>

      {/* Barra de busca e filtros */}
      <div className="adm-card flex flex-col gap-3 p-3.5 sm:p-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-adm-subtle" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar clientes"
              placeholder="Buscar por nome, e-mail, telefone, pedido ou tag"
              className="adm-input min-h-[40px] w-full pl-9 text-base sm:text-xs"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <label className="inline-flex items-center gap-1.5 rounded-full border border-adm-line-strong bg-adm-raised px-3 h-9 text-xs text-adm-muted">
              <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
              <span className="sr-only">Ordenar por</span>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as CustomerSort);
                  setPage(1);
                }}
                className="bg-transparent text-xs text-adm-text focus:outline-none cursor-pointer"
              >
                <option value="recent" className="bg-[#14151b]">Atividade recente</option>
                <option value="spent" className="bg-[#14151b]">Maior valor pago</option>
                <option value="orders" className="bg-[#14151b]">Mais pedidos</option>
                <option value="created" className="bg-[#14151b]">Cadastro recente</option>
              </select>
            </label>
            {customers.length > 0 && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="adm-btn adm-btn-ghost cursor-pointer"
                title="Exportar lista visível em CSV"
              >
                <Download className="h-3.5 w-3.5" />
                CSV
              </button>
            )}
            <button
              type="button"
              onClick={loadList}
              className="adm-btn adm-btn-ghost cursor-pointer"
              aria-label="Atualizar"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-t border-white/[0.06] pt-3">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'nua_id', label: 'Com conta' },
            { id: 'guest', label: 'Visitantes' },
            { id: 'paying', label: 'Com pagamento' },
            { id: 'attention', label: 'Atendimento' },
            { id: 'refunds', label: 'Reembolsos' },
            { id: 'optin', label: `Novidades (${totals.optIn})` },
            { id: 'empty', label: 'Sem compras' },
            { id: 'suspended', label: 'Suspensos' },
            { id: 'anonymized', label: 'Anonimizados' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setFilter(f.id as CustomerFilter);
                setPage(1);
              }}
              aria-pressed={filter === f.id}
              className={`adm-btn cursor-pointer ${filter === f.id ? 'adm-btn-primary' : 'adm-btn-ghost'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="adm-card flex items-center gap-2 border-rose-500/30 p-4 text-xs text-rose-300">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="adm-card h-16 animate-pulse" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        error ? null : (
        <div className="adm-card py-12 text-center">
          <Users className="mx-auto mb-2.5 h-7 w-7 text-adm-subtle" />
          <p className="text-sm font-medium text-adm-text">Nenhum cliente encontrado</p>
          <p className="mt-1 text-xs text-adm-muted">
            Tente buscar outro nome ou mudar o filtro.
          </p>
        </div>
        )
      ) : (
        <>
          <div className="adm-card divide-y divide-white/[0.06] overflow-hidden">
            {customers.map((c) => {
              const st = formatCustomerStatus(c.status);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className="flex w-full flex-col justify-between gap-2 px-4 py-3.5 text-left transition-colors hover:bg-adm-hover sm:flex-row sm:items-center cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-adm-text">{c.displayName}</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${st.cls}`}
                      >
                        {c.accountType !== 'guest' && <UserCheck className="h-2.5 w-2.5" />}
                        {st.label}
                      </span>
                      {c.needsAttention && (
                        <span className="inline-flex max-w-[220px] items-center gap-1 truncate rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                          <AlertTriangle className="h-3 w-3" />
                          {c.attentionReasons?.[0] || 'Atenção'}
                        </span>
                      )}
                      {(c.crmTags || []).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full border border-adm-accent/35 bg-adm-accent-soft px-2 py-0.5 text-[10px] font-medium text-adm-text"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="truncate text-xs text-adm-muted">
                      {[c.email, c.phone].filter(Boolean).join(' · ') || 'Sem contato registrado'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-adm-muted">
                    <span>{c.counts.orders} {c.counts.orders === 1 ? 'compra de conteúdo' : 'compras de conteúdo'}</span>
                    <span>{c.counts.appointments} {c.counts.appointments === 1 ? 'chamada VIP' : 'chamadas VIP'}</span>
                    <span>{c.counts.personalizados} {c.counts.personalizados === 1 ? 'personalizado' : 'personalizados'}</span>
                    <span className="text-right">
                      <span className="block text-[9px] uppercase tracking-wide text-adm-subtle">Total pago</span>
                      <span className="font-semibold text-adm-text">{formatBrl(c.totalSpent)}</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-adm-muted">
              <span>
                Página {safePage} de {totalPages} ({totalFiltered} {totalFiltered === 1 ? 'cliente' : 'clientes'})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="adm-btn adm-btn-ghost disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="adm-btn adm-btn-ghost disabled:opacity-40 cursor-pointer"
                >
                  Próxima
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
      </>
      )}

    </div>
  );
}
