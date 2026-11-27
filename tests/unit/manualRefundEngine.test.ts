import { describe, it, expect, vi } from 'vitest';
import {
  executeManualRefund,
  inspectRefundEligibility,
  type RefundGatewayDeps,
} from '@/functions/api/payments/_refundEngine';
import {
  createMemoryNuaIdStore,
  grantEntitlement,
  listEntitlementsByProfile,
  listRefundsByOrderRef,
  getPaymentByOrderRef,
} from '@/functions/api/id/_nuaIdStore';

const ADMIN_ACTOR = { profile: 'nua' as const, subject: 'nua', role: 'admin' };

function makeBaseEnv() {
  const store = createMemoryNuaIdStore();
  const sentEmails: Array<{ to: string; subject: string; html: string }> = [];
  const env: any = {
    ENVIRONMENT: 'test',
    NEXT_PUBLIC_SITE_URL: 'https://nuaborges.com.br',
    __NUA_ID_TEST_STORE__: store,
    __EMAIL_SENDER__: async (mail: any) => {
      sentEmails.push(mail);
      return true;
    },
    __CUSTOMER_DATA_FIXTURES__: {
      catalog: [{ id: 'pack-ouro', slug: 'pack-ouro', title: 'Ensaio Ouro' }],
      orders: {
        ord_pack_ok: {
          id: 'ord_pack_ok',
          packId: 'pack-ouro',
          amount: 120,
          status: 'paid',
          customerName: 'Marcos',
          customerEmail: 'marcos@example.com',
          providerPaymentId: '9911223344',
        },
        ord_pack_other: {
          id: 'ord_pack_other',
          packId: 'pack-ouro',
          amount: 120,
          status: 'paid',
          customerName: 'Marcos',
          customerEmail: 'marcos@example.com',
          providerPaymentId: '9911223399',
        },
        sub_future_01: {
          id: 'sub_future_01',
          packId: 'clube-vip-mensal',
          amount: 199.9,
          status: 'paid',
          customerName: 'Rafael',
          customerEmail: 'rafael@example.com',
          providerPaymentId: '777888999',
        },
      },
      personalizados: {
        pers_prod_1: {
          id: 'pers_prod_1',
          clientName: 'André',
          clientContact: 'andre@example.com',
          photoCount: 10,
          videoDurationMinutes: 2,
          totalPrice: 300,
          status: 'em_producao',
          payment: { status: 'approved', transactionId: '555666777', method: 'pix' },
        },
      },
      appointments: {
        apt_vip_1: {
          id: 'apt_vip_1',
          modalityName: 'Chamada VIP 30min',
          clientName: 'Bruno',
          clientEmail: 'bruno@example.com',
          price: 400,
          status: 'confirmada',
          payment: { status: 'approved', transactionId: '111222333', method: 'pix' },
          history: [],
        },
      },
    },
  };
  return { env, store, sentEmails };
}

describe('Motor Extensível de Estorno Manual (_refundEngine)', () => {
  it('respeita o valor aprovado no cancelamento VIP e confirma somente os centavos autorizados', async () => {
    const { env } = makeBaseEnv();
    const booking = env.__CUSTOMER_DATA_FIXTURES__.appointments.apt_vip_1;
    Object.assign(booking, { status: 'cancelada', refundAmount: 160, refundStatus: 'pending' });
    const refundPayment = vi.fn().mockResolvedValue({ success: true, id: 'vip_parcial', status: 'approved', amount: 160 });
    const deps: RefundGatewayDeps = {
      getPayment: vi.fn().mockResolvedValue({ success: true, status: 'approved', amount: 400, externalReference: 'apt_vip_1' }),
      listRefunds: vi.fn().mockResolvedValue([]), refundPayment,
    };
    expect((await inspectRefundEligibility(env, booking.id, 'vip', deps)).summary?.refundableAmount).toBe(160);
    const params = { orderId: booking.id, modality: 'vip', reason: 'Cancelamento aprovado', confirmRefund: true, actor: ADMIN_ACTOR };
    expect((await executeManualRefund(env, { ...params, expectedRefundAmount: 400 }, deps)).httpStatus).toBe(409);
    expect(refundPayment).not.toHaveBeenCalled();
    expect((await executeManualRefund(env, { ...params, expectedRefundAmount: 160 }, deps)).state).toBe('refunded');
    expect(refundPayment).toHaveBeenCalledExactlyOnceWith(env, '111222333', booking.id, 160, { scope: 'nua-manual-refund:vip' });
  });

  it('nega execução para reserva VIP cancelada sem devolução aprovada', async () => {
    const { env } = makeBaseEnv();
    const booking = env.__CUSTOMER_DATA_FIXTURES__.appointments.apt_vip_1;
    Object.assign(booking, { status: 'cancelada', refundAmount: 0, refundStatus: 'not_applicable' });
    const refundPayment = vi.fn();
    const deps: RefundGatewayDeps = {
      getPayment: vi.fn().mockResolvedValue({ success: true, status: 'approved', amount: 400, externalReference: 'apt_vip_1' }),
      listRefunds: vi.fn().mockResolvedValue([]), refundPayment,
    };
    expect((await inspectRefundEligibility(env, booking.id, 'vip', deps)).summary).toMatchObject({ eligible: false, refundableAmount: 0 });
    await executeManualRefund(env, { orderId: booking.id, modality: 'vip', reason: 'Cancelamento', confirmRefund: true, actor: ADMIN_ACTOR }, deps);
    expect(refundPayment).not.toHaveBeenCalled();
  });

  it('estorna Pack aprovado, revoga apenas entitlement daquele pedido e envia e-mail', async () => {
    const { env, sentEmails } = makeBaseEnv();
    await grantEntitlement(env, {
      profileId: 'prof_1',
      orderRef: 'ord_pack_ok',
      kind: 'pack',
      resourceId: 'pack-ouro',
      title: 'Ensaio Ouro',
    });
    await grantEntitlement(env, {
      profileId: 'prof_1',
      orderRef: 'ord_pack_other',
      kind: 'pack',
      resourceId: 'pack-ouro',
      title: 'Ensaio Ouro',
    });

    const deps: RefundGatewayDeps = {
      getPayment: vi.fn().mockResolvedValue({
        success: true,
        status: 'approved',
        amount: 120,
        externalReference: 'ord_pack_ok',
      }),
      listRefunds: vi.fn().mockResolvedValue([]),
      refundPayment: vi.fn().mockResolvedValue({
        success: true,
        id: 'ref_mp_100',
        status: 'approved',
        amount: 120,
      }),
    };

    const res = await executeManualRefund(
      env,
      {
        orderId: 'ord_pack_ok',
        modality: 'pack',
        reason: 'Solicitação do cliente',
        confirmRefund: true,
        actor: ADMIN_ACTOR,
      },
      deps
    );

    expect(res.success).toBe(true);
    expect(res.state).toBe('refunded');
    expect(res.refundId).toBe('ref_mp_100');
    expect(env.__CUSTOMER_DATA_FIXTURES__.orders.ord_pack_ok.status).toBe('refunded');

    // Revogou apenas ord_pack_ok, preservou ord_pack_other!
    const ents = await listEntitlementsByProfile(env, 'prof_1');
    const entRefunded = ents.find((e) => e.orderRef === 'ord_pack_ok');
    const entValid = ents.find((e) => e.orderRef === 'ord_pack_other');
    expect(entRefunded?.revokedAt).toBeTruthy();
    expect(entValid?.revokedAt).toBeUndefined();

    // Atualizou PaymentRecord e RefundRecord
    const paymentRec = await getPaymentByOrderRef(env, 'ord_pack_ok');
    expect(paymentRec?.status).toBe('refunded');
    const refunds = await listRefundsByOrderRef(env, 'ord_pack_ok');
    expect(refunds).toHaveLength(1);
    expect(refunds[0].amountCents).toBe(12000);

    // Enviou e-mail de confirmação
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].to).toBe('marcos@example.com');
  });

  it('funciona automaticamente para uma modalidade futura genérica sem alterar o motor', async () => {
    const { env } = makeBaseEnv();
    const deps: RefundGatewayDeps = {
      getPayment: vi.fn().mockResolvedValue({
        success: true,
        status: 'approved',
        amount: 199.9,
        externalReference: 'sub_future_01',
      }),
      listRefunds: vi.fn().mockResolvedValue([]),
      refundPayment: vi.fn().mockResolvedValue({
        success: true,
        id: 'ref_future_1',
        status: 'approved',
        amount: 199.9,
      }),
    };

    const elig = await inspectRefundEligibility(env, 'sub_future_01', undefined, deps);
    expect(elig.found).toBe(true);
    expect(elig.summary?.eligible).toBe(true);

    const res = await executeManualRefund(
      env,
      {
        orderId: 'sub_future_01',
        reason: 'Cancelamento de nova modalidade',
        confirmRefund: true,
        actor: ADMIN_ACTOR,
      },
      deps
    );
    expect(res.success).toBe(true);
    expect(res.state).toBe('refunded');
    expect(env.__CUSTOMER_DATA_FIXTURES__.orders.sub_future_01.status).toBe('refunded');
  });

  it('estorna Personalizado em produção cancelando fila sem apagar dados e estorna Chamada VIP cancelando reserva', async () => {
    const { env } = makeBaseEnv();
    const depsPers: RefundGatewayDeps = {
      getPayment: vi.fn().mockResolvedValue({
        success: true,
        status: 'approved',
        amount: 300,
        externalReference: 'pers_prod_1',
      }),
      listRefunds: vi.fn().mockResolvedValue([]),
      refundPayment: vi.fn().mockResolvedValue({
        success: true,
        id: 'ref_pers_1',
        status: 'approved',
        amount: 300,
      }),
    };

    const resPers = await executeManualRefund(
      env,
      {
        orderId: 'pers_prod_1',
        modality: 'personalizado',
        reason: 'Desistência antes da entrega',
        confirmRefund: true,
        actor: ADMIN_ACTOR,
      },
      depsPers
    );
    expect(resPers.success).toBe(true);
    expect(env.__CUSTOMER_DATA_FIXTURES__.personalizados.pers_prod_1.status).toBe('cancelado');
    expect(env.__CUSTOMER_DATA_FIXTURES__.personalizados.pers_prod_1.payment.status).toBe('refunded');

    const depsVip: RefundGatewayDeps = {
      getPayment: vi.fn().mockResolvedValue({
        success: true,
        status: 'approved',
        amount: 400,
        externalReference: 'apt_apt_vip_1',
      }),
      listRefunds: vi.fn().mockResolvedValue([]),
      refundPayment: vi.fn().mockResolvedValue({
        success: true,
        id: 'ref_vip_1',
        status: 'approved',
        amount: 400,
      }),
    };

    const resVip = await executeManualRefund(
      env,
      {
        orderId: 'apt_vip_1',
        modality: 'vip',
        reason: 'Cancelamento combinado',
        confirmRefund: true,
        actor: ADMIN_ACTOR,
      },
      depsVip
    );
    expect(resVip.success).toBe(true);
    expect(env.__CUSTOMER_DATA_FIXTURES__.appointments.apt_vip_1.status).toBe('cancelada');
    expect(env.__CUSTOMER_DATA_FIXTURES__.appointments.apt_vip_1.refundStatus).toBe('completed');
  });

  it('bloqueia pagamento pendente, paymentId de outro pedido e external_reference divergente', async () => {
    const { env } = makeBaseEnv();

    // 1. paymentId de outro pedido
    const wrongId = await executeManualRefund(env, {
      orderId: 'ord_pack_ok',
      reason: 'Teste',
      confirmRefund: true,
      requestedPaymentId: '000000000',
      actor: ADMIN_ACTOR,
    });
    expect(wrongId.success).toBe(false);
    expect(wrongId.httpStatus).toBe(409);

    // 2. Pagamento pendente no MP
    const pendingRes = await executeManualRefund(
      env,
      {
        orderId: 'ord_pack_ok',
        reason: 'Teste',
        confirmRefund: true,
        actor: ADMIN_ACTOR,
      },
      {
        getPayment: vi.fn().mockResolvedValue({
          success: true,
          status: 'pending',
          amount: 120,
          externalReference: 'ord_pack_ok',
        }),
        listRefunds: vi.fn().mockResolvedValue([]),
        refundPayment: vi.fn(),
      }
    );
    expect(pendingRes.success).toBe(false);
    expect(pendingRes.state).toBe('not_eligible');

    // 3. external_reference divergente no MP
    const mismatchRes = await executeManualRefund(
      env,
      {
        orderId: 'ord_pack_ok',
        reason: 'Teste',
        confirmRefund: true,
        actor: ADMIN_ACTOR,
      },
      {
        getPayment: vi.fn().mockResolvedValue({
          success: true,
          status: 'approved',
          amount: 120,
          externalReference: 'ord_outro_cliente',
        }),
        listRefunds: vi.fn().mockResolvedValue([]),
        refundPayment: vi.fn(),
      }
    );
    expect(mismatchRes.success).toBe(false);
    expect(mismatchRes.httpStatus).toBe(409);
  });

  it('trata recusa do MP (rejected) e timeout/inconclusivo (unknown_awaiting_reconciliation) sem enviar e-mail falso', async () => {
    const { env, sentEmails } = makeBaseEnv();

    const rejectedRes = await executeManualRefund(
      env,
      {
        orderId: 'ord_pack_ok',
        reason: 'Teste recusa',
        confirmRefund: true,
        actor: ADMIN_ACTOR,
      },
      {
        getPayment: vi.fn().mockResolvedValue({
          success: true,
          status: 'approved',
          amount: 120,
          externalReference: 'ord_pack_ok',
        }),
        listRefunds: vi.fn().mockResolvedValue([]),
        refundPayment: vi.fn().mockResolvedValue({
          success: false,
          inconclusive: false,
          error: 'Saldo insuficiente no Mercado Pago',
        }),
      }
    );
    expect(rejectedRes.success).toBe(false);
    expect(rejectedRes.state).toBe('rejected');
    expect(sentEmails).toHaveLength(0);

    const timeoutRes = await executeManualRefund(
      env,
      {
        orderId: 'ord_pack_ok',
        reason: 'Teste timeout',
        confirmRefund: true,
        actor: ADMIN_ACTOR,
      },
      {
        getPayment: vi.fn().mockResolvedValue({
          success: true,
          status: 'approved',
          amount: 120,
          externalReference: 'ord_pack_ok',
        }),
        listRefunds: vi.fn().mockResolvedValue([]),
        refundPayment: vi.fn().mockResolvedValue({
          success: false,
          inconclusive: true,
          error: 'Timeout no Mercado Pago',
        }),
      }
    );
    expect(timeoutRes.success).toBe(false);
    expect(timeoutRes.state).toBe('unknown_awaiting_reconciliation');
    expect(sentEmails).toHaveLength(0);
  });

  it('bloqueia concorrência (clique duplo) e reconcilia quando webhook já estornou no MP', async () => {
    const { env } = makeBaseEnv();
    let releaseMp!: () => void;
    const mpWait = new Promise<void>((resolve) => {
      releaseMp = resolve;
    });

    const slowDeps: RefundGatewayDeps = {
      getPayment: vi.fn().mockResolvedValue({
        success: true,
        status: 'approved',
        amount: 120,
        externalReference: 'ord_pack_ok',
      }),
      listRefunds: vi.fn().mockResolvedValue([]),
      refundPayment: vi.fn().mockImplementation(async () => {
        await mpWait;
        return { success: true, id: 'ref_conc', status: 'approved', amount: 120 };
      }),
    };

    const p1 = executeManualRefund(
      env,
      { orderId: 'ord_pack_ok', reason: 'Clique 1', confirmRefund: true, actor: ADMIN_ACTOR },
      slowDeps
    );
    // Aguarda 1 tick para p1 adquirir o lock
    await new Promise((r) => setTimeout(r, 10));
    const p2 = executeManualRefund(
      env,
      { orderId: 'ord_pack_ok', reason: 'Clique 2', confirmRefund: true, actor: ADMIN_ACTOR },
      slowDeps
    );
    releaseMp();

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(false);
    expect(r2.state).toBe('processing');
    expect(r2.httpStatus).toBe(409);

    // Webhook chegou antes / reconciliação segura
    const reconcileRes = await executeManualRefund(
      env,
      {
        orderId: 'ord_pack_other',
        reason: 'Reconciliação',
        confirmRefund: true,
        actor: ADMIN_ACTOR,
      },
      {
        getPayment: vi.fn().mockResolvedValue({
          success: true,
          status: 'refunded',
          amount: 120,
          externalReference: 'ord_pack_other',
        }),
        listRefunds: vi.fn().mockResolvedValue([]),
        refundPayment: vi.fn(),
      }
    );
    expect(reconcileRes.success).toBe(true);
    expect(reconcileRes.reconciled).toBe(true);
    expect(reconcileRes.state).toBe('refunded');
  });
});
