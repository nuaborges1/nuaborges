const LABELS = {
  packs: 'Conteúdos & Packs',
  personalizados: 'Personalizados',
  chamadas: 'Chamadas de Vídeo',
};
const STATUS_LABELS = {
  succeeded: 'Confirmado', pending: 'Pendente', failed: 'Cancelado', refunded: 'Reembolsado',
};
const PAID = new Set(['paid', 'approved', 'manual_confirmed', 'pago', 'pago_liberado', 'liberado',
  'confirmada', 'confirmado', 'concluida', 'concluido', 'concluído', 'pronto', 'entregue', 'em_producao']);
const REFUNDED = new Set(['refunded', 'reembolsado']);
const FAILED = new Set(['cancelled', 'canceled', 'cancelada', 'cancelado', 'rejected', 'failed', 'expired']);
const BUSINESS_ZONE = 'America/Sao_Paulo';
const dateFormatter = new Intl.DateTimeFormat('sv-SE', { timeZone: BUSINESS_ZONE, dateStyle: 'short' });

function clean(value) {
  return String(value ?? '').trim().toLowerCase();
}

function cents(value) {
  const number = typeof value === 'string' && value.trim() ? Number(value) : value;
  const amount = typeof number === 'number' ? Math.round(number * 100) : NaN;
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

function readNotes(notes) {
  if (typeof notes !== 'string' || !notes.startsWith('{')) return {};
  try { return JSON.parse(notes) || {}; } catch { return {}; }
}

function normalizeRows(orders, custom, bookings) {
  const domainIds = new Set([...custom, ...bookings].flatMap((row) => [row.id, 'apt_' + row.id]));
  const packs = orders.filter((row) => row.id && !domainIds.has(row.id)
    && !/^(app|apt|book|ped|pers)_/.test(row.id) && !String(row.pack_id || '').startsWith('chamada-'));
  return [
    ...packs.map((row) => ({
      id: row.id, modality: row.modality || 'packs', description: row.title || 'Pedido de conteúdo',
      name: row.customer_name, email: row.customer_email, price: row.amount, status: row.status,
      payment: { method: row.payment_method, paidAt: row.paid_at }, createdAt: row.created_at,
    })),
    ...custom.map((row) => ({
      id: row.id, modality: 'personalizados', description: 'Produção personalizada',
      name: row.client_name, email: row.client_contact, price: row.total_price,
      status: row.status, payment: row.payment, createdAt: row.created_at,
    })),
    ...bookings.map((row) => {
      const notes = readNotes(row.notes);
      return {
        id: row.id, modality: 'chamadas', description: 'Chamada VIP' + (notes.modalityName ? ' • ' + notes.modalityName : ''),
        name: row.client_name || notes.clientName, email: notes.clientEmail,
        price: row.total_price, status: row.status, payment: row.payment, createdAt: row.created_at,
        completedRefundAmount: notes.refundStatus === 'completed' ? notes.refundAmount : null,
        refundCompleted: notes.refundStatus === 'completed',
      };
    }),
  ];
}

async function readRows(client, table) {
  const rows = [];
  const size = 500;
  for (let offset = 0; ; offset += size) {
    const { data, error } = await client.from(table).select('*').order('id').range(offset, offset + size - 1);
    if (error || !Array.isArray(data)) throw new Error('Falha ao consultar ' + table);
    rows.push(...data);
    if (data.length < size) return rows;
  }
}

export async function loadCommercialFinance(client) {
  const [orders, custom, bookings] = await Promise.all([
    readRows(client, 'orders'), readRows(client, 'personalizados_orders'), readRows(client, 'appointments'),
  ]);
  const rows = normalizeRows(orders, custom, bookings);
  const ledger = new Map();
  for (let offset = 0; offset < rows.length; offset += 100) {
    const keys = rows.slice(offset, offset + 100).flatMap(({ id }) => [
      'nua_id:payment_by_order:' + id, 'nua_id:refunds:' + id,
    ]);
    const { data, error } = await client.from('site_content').select('key,content').in('key', keys);
    if (error || !Array.isArray(data)) throw new Error('Falha ao consultar o histórico financeiro');
    data.forEach(({ key, content }) => ledger.set(key, content));
  }
  return { rows, ledger };
}

export function loadLocalCommercialFinance(orders, custom, bookings) {
  const normalizeOrder = (row) => ({
    id: row.orderId, title: row.title, status: row.status, amount: row.paidAmount ?? row.amount ?? row.price,
    modality: row.type === 'personalizado' ? 'personalizados' : row.type === 'chamada' ? 'chamadas' : 'packs',
    customer_name: row.payerName, customer_email: row.payerEmail, payment_method: row.paymentMethod,
    created_at: row.createdAt, paid_at: row.paidAt,
  });
  return {
    rows: normalizeRows(
      Object.values(orders).filter(Boolean).map(normalizeOrder),
      Object.values(custom).filter(Boolean).map((row) => ({
        id: row.id, status: row.status, payment: row.payment, total_price: row.totalPrice,
        client_name: row.clientName, client_contact: row.clientContact, created_at: row.createdAt,
      })),
      Object.values(bookings).filter(Boolean).map((row) => ({
        id: row.id, status: row.status, payment: row.payment, total_price: row.price, client_name: row.clientName,
        created_at: row.createdAt, notes: JSON.stringify({
          clientEmail: row.clientEmail, modalityName: row.modalityName,
          refundStatus: row.refundStatus, refundAmount: row.refundAmount,
        }),
      })),
    ),
    ledger: new Map(),
  };
}

function sum(values) {
  return values.some((amount) => amount == null) ? null : values.reduce((total, amount) => total + amount, 0) / 100;
}

function toCentsField(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function toDate(value) {
  return value && Number.isFinite(Date.parse(value)) ? value : null;
}

function makeTransaction(row, ledger) {
  const record = ledger.get('nua_id:payment_by_order:' + row.id);
  const status = clean(row.status);
  const payment = row.payment || {};
  const paymentStatus = clean(record?.status || payment.status);
  const refunded = REFUNDED.has(paymentStatus) || REFUNDED.has(status) || row.refundCompleted;
  const disputed = paymentStatus === 'charged_back' || status === 'charged_back';
  const approved = PAID.has(paymentStatus) || (!paymentStatus && PAID.has(status));
  const confirmedRefunds = ledger.get('nua_id:refunds:' + row.id);
  const refunds = Array.isArray(confirmedRefunds)
    ? confirmedRefunds.filter((refund) => ['approved', 'refunded', 'completed'].includes(clean(refund.status)))
    : [];
  const refundAmounts = refunds.length
    ? refunds.map((refund) => ({ cents: toCentsField(refund.amountCents), at: toDate(refund.createdAt) }))
    : refunded
      ? [{ cents: cents(payment.refundAmount ?? row.completedRefundAmount), at: toDate(payment.refundedAt) }]
      : [];
  const amount = toCentsField(record?.amountCents) ?? cents(payment.amount ?? row.price);
  const fee = toCentsField(record?.feeCents);
  const net = toCentsField(record?.netCents);
  const paidAt = toDate(record?.paidAt || payment.paidAt);
  const createdAt = toDate(row.createdAt);
  const state = refunded || refunds.length ? 'refunded' : approved ? 'succeeded'
    : disputed || FAILED.has(paymentStatus) || FAILED.has(status) ? 'failed' : 'pending';

  return {
    id: row.id, chargeId: record?.providerPaymentId || row.id, orderId: row.id,
    modality: row.modality, modalityLabel: LABELS[row.modality], description: row.description,
    customerName: row.name || 'Cliente', customerEmail: row.email || '',
    amountGross: amount == null ? null : amount / 100,
    fee: fee == null ? null : fee / 100, amountNet: net == null ? null : net / 100,
    refundAmount: refundAmounts.length ? sum(refundAmounts.map((refund) => refund.cents)) : null,
    currency: 'BRL', status: state, statusLabel: disputed ? 'Contestado' : STATUS_LABELS[state],
    paymentMethod: record?.paymentMethod || payment.method || '',
    paymentMethodLabel: record?.paymentMethod === 'pix' || payment.method === 'mercadopago_pix' ? 'Pix (Mercado Pago)'
      : payment.method === 'pix' ? 'Pix' : 'Forma de pagamento indisponível',
    createdAt: paidAt || createdAt, receiptUrl: null,
    amountCents: amount, feeCents: fee, netCents: net, refundAmounts, paid: approved || refunded || disputed || Boolean(paidAt),
  };
}

export function commercialFinanceReport({ rows, ledger }, params, now = new Date()) {
  const period = params.get('period') || 'current_month';
  let threshold = 0;
  let periodLabel = 'Todo o Histórico';
  if (period === 'current_month') {
    threshold = Date.parse(dateFormatter.format(now).slice(0, 7) + '-01T00:00:00-03:00');
    periodLabel = new Intl.DateTimeFormat('pt-BR', {
      timeZone: BUSINESS_ZONE, month: 'long', year: 'numeric',
    }).format(now);
  } else if (period === '30d' || period === '90d') {
    const days = Number(period.slice(0, -1));
    threshold = now.getTime() - days * 86400000;
    periodLabel = 'Últimos ' + days + ' dias';
  }
  const inPeriod = (date) => date == null ? threshold === 0 : Date.parse(date) >= threshold;
  const history = rows.map((row) => makeTransaction(row, ledger));
  const transactions = history.filter((tx) =>
    inPeriod(tx.createdAt) || tx.refundAmounts.some((refund) => refund.at && inPeriod(refund.at)),
  ).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const paid = transactions.filter((tx) => tx.paid && inPeriod(tx.createdAt));
  const pending = transactions.filter((tx) => tx.status === 'pending');
  const refundAmounts = history.flatMap((tx) => tx.refundAmounts
    .filter((refund) => !refund.at || inPeriod(refund.at))
    .map((refund) => refund.at || !threshold ? refund.cents : null));
  const modality = params.get('modality');
  const status = params.get('status');
  const displayed = transactions.filter((tx) => (!modality || modality === 'all' || tx.modality === modality)
    && (!status || status === 'all' || tx.status === status));
  const modalities = Object.fromEntries(Object.entries(LABELS).map(([key, label]) => {
    const list = paid.filter((tx) => tx.modality === key);
    return [key, {
      label, gross: sum(list.map((tx) => tx.amountCents)), fees: sum(list.map((tx) => tx.feeCents)),
      net: sum(list.map((tx) => tx.netCents)), count: list.length,
    }];
  }));
  const timeline = new Map();
  for (const tx of paid) {
    if (!tx.createdAt || tx.amountCents == null) continue;
    const date = dateFormatter.format(new Date(tx.createdAt));
    const entry = timeline.get(date) || { date, cents: 0, sales: 0 };
    entry.cents += tx.amountCents;
    entry.sales++;
    timeline.set(date, entry);
  }
  return {
    success: true, gateway: 'mercadopago', gatewayConnected: null, period, periodLabel,
    balance: { available: null, pending: null, currency: 'BRL' },
    summary: {
      totalReceived: sum(paid.map((tx) => tx.amountCents)), totalNet: sum(paid.map((tx) => tx.netCents)),
      totalFees: sum(paid.map((tx) => tx.feeCents)), totalRefunds: sum(refundAmounts),
      salesCount: paid.length, pendingCount: pending.length, pendingOrderAmount: sum(pending.map((tx) => tx.amountCents)),
      failedCount: transactions.filter((tx) => tx.status === 'failed').length,
    },
    modalities,
    timeline: [...timeline.values()].reverse().map(({ date, cents: amount, sales }) => ({ date, amount: amount / 100, sales })),
    transactions: displayed.map(({ amountCents, feeCents, netCents, refundAmounts, paid, ...item }) => item),
    totalTransactionsCount: displayed.length, updatedAt: now.toISOString(),
  };
}
