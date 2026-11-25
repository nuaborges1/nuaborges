/**
 * Cloudflare Pages Function: /api/finance/admin
 *
 * Endpoint de Gestão Financeira para o Admin Geral (Central phdev).
 * 
 * Permite:
 * - GET: Retorna o panorama financeiro das 10 parcelas, status do Mercado Pago e resumo executivo.
 * - POST action 'manual_pay': Dá baixa manual em uma parcela (ex: Pix direto, transferência).
 * - POST action 'revert': Reverte quitação de uma parcela para aberta/pendente.
 * - POST action 'sync_mp': Consulta a API do Mercado Pago para conciliar pagamentos pendentes.
 * - POST action 'reset_defaults': Restaura as 10 parcelas com a 1ª quitada.
 */

import {
  FinancialInstallment,
  FinancialSummary,
  getDefaultInstallments,
  calculateFinanceSummary,
  generateReceiptHash,
  KV_FINANCE_KEY,
} from '../../../lib/financeCanonical';
import { recordAuditEvent } from '../_auditHelper';

interface Env {
  MP_ACCESS_TOKEN?: string;
  ADMIN_API_SECRET?: string;
  ADMIN_PASSWORD?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  [key: string]: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

import { getFinanceInstallments, saveFinanceInstallments } from './_financeStore';

async function checkMercadoPagoStatus(accessToken?: string) {
  if (!accessToken) {
    return {
      configured: false,
      connected: false,
      message: 'A integração com o Mercado Pago ainda não está configurada.',
    };
  }

  try {
    const res = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (res.ok) {
      const data = (await res.json()) as any;
      return {
        configured: true,
        connected: true,
        id: data.id,
        nickname: data.nickname,
        email: data.email,
        siteId: data.site_id,
        countryId: data.country_id,
      };
    } else {
      return {
        configured: true,
        connected: false,
        status: res.status,
        message: 'Não foi possível conectar ao Mercado Pago. Verifique a configuração.',
      };
    }
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      error: 'Não foi possível conectar ao Mercado Pago.',
    };
  }
}

export const onRequestGet = async (context: PagesContext<Env>) => {
  const { env, request } = context;
  const mpToken =
    env.MP_ACCESS_TOKEN ||
    (typeof process !== 'undefined' ? process.env?.MP_ACCESS_TOKEN : undefined);

  try {
    const installments = await getFinanceInstallments(env);
    const summary = calculateFinanceSummary(installments);
    const mpStatus = await checkMercadoPagoStatus(mpToken);

    return new Response(
      JSON.stringify({
        success: true,
        mode: 'static_pix',
        staticPixConfigured: Boolean((env.DEV_PIX_KEY || '').trim()),
        installments,
        summary,
        mercadopago: mpStatus,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Não foi possível carregar os dados financeiros. Tente novamente em instantes.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { env, request } = context;
  const mpToken =
    env.MP_ACCESS_TOKEN ||
    (typeof process !== 'undefined' ? process.env?.MP_ACCESS_TOKEN : undefined);

  try {
    const body = (await request.json()) as any;
    const action = body.action;

    const installments = await getFinanceInstallments(env);

    // 1. Dar Baixa Manual
    if (action === 'manual_pay') {
      const installmentNumber = Number(body.installmentNumber);
      if (!installmentNumber || installmentNumber < 1 || installmentNumber > 10) {
        return new Response(
          JSON.stringify({ success: false, error: 'Número de parcela inválido (1 a 10).' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const inst = installments.find((p) => p.number === installmentNumber);
      if (!inst) {
        return new Response(
          JSON.stringify({ success: false, error: 'Parcela não encontrada.' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const nowIso = new Date().toISOString();
      const paidAt = body.paidAt || nowIso;
      const paidAmount = Number(body.paidAmount) || inst.amount;
      const paymentMethod = body.paymentMethod || 'pix';
      const paymentId =
        body.paymentId?.trim() ||
        `MANUAL-${nowIso.slice(0, 10).replace(/-/g, '')}-P${installmentNumber}`;
      const notes = body.notes ? String(body.notes).trim() : 'Baixa manual registrada pelo painel';

      inst.status = 'paid';
      inst.paidAt = paidAt;
      inst.paidAmount = paidAmount;
      inst.paymentMethod = paymentMethod;
      inst.paymentId = paymentId;
      inst.receiptHash = generateReceiptHash(inst);

      await saveFinanceInstallments(env, installments);

      // Registra evento na auditoria
      try {
        await recordAuditEvent(env, request, {
          type: 'CONTENT_PUBLISH',
          severity: 'info',
          summary: `Baixa manual registrada: Parcela ${installmentNumber}/10 (R$ ${paidAmount.toFixed(2)}) via ${paymentMethod}.`,
          details: {
            installmentNumber,
            paidAmount,
            paymentMethod,
            paymentId,
            notes,
          },
        });
      } catch (auditErr) {
        console.warn('[Audit] Erro ao gravar auditoria:', auditErr);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Parcela ${installmentNumber} quitada com sucesso.`,
          installment: inst,
          summary: calculateFinanceSummary(installments),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Reverter Quitação para Aberta / A Vencer
    if (action === 'revert') {
      const installmentNumber = Number(body.installmentNumber);
      if (!installmentNumber || installmentNumber < 1 || installmentNumber > 10) {
        return new Response(
          JSON.stringify({ success: false, error: 'Número de parcela inválido.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const inst = installments.find((p) => p.number === installmentNumber);
      if (!inst) {
        return new Response(
          JSON.stringify({ success: false, error: 'Parcela não encontrada.' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const previousStatus = inst.status;
      const reason = body.reason || 'Reversão solicitada pelo painel';

      inst.status = 'pending';
      delete (inst as any).paidAt;
      delete (inst as any).paidAmount;
      delete (inst as any).paymentMethod;
      delete (inst as any).paymentId;
      delete (inst as any).receiptHash;

      await saveFinanceInstallments(env, installments);

      // Registra na auditoria
      try {
        await recordAuditEvent(env, request, {
          type: 'CONTENT_PUBLISH',
          severity: 'warning',
          summary: `Quitação revertida para pendente: Parcela ${installmentNumber}/10. Motivo: ${reason}`,
          details: {
            installmentNumber,
            previousStatus,
            reason,
          },
        });
      } catch (auditErr) {
        console.warn('[Audit] Erro ao gravar auditoria:', auditErr);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Parcela ${installmentNumber} revertida para pendente.`,
          installment: inst,
          summary: calculateFinanceSummary(installments),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Mensalidade agora opera em Pix direto (desvinculada do Mercado Pago — NUA-AUD-001)
    if (action === 'sync_mp') {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'As mensalidades agora usam Pix direto (chave DEV_PIX_KEY) sem integração com o Mercado Pago. Use "Dar Baixa Manual" após confirmar o recebimento.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Restaurar padrão (NUA-AUD-012: exige confirmação explícita para evitar perda acidental)
    if (action === 'reset_defaults') {
      if (String(body.confirmToken || '').trim() !== 'RESET_ALL_INSTALLMENTS') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Confirmação explícita obrigatória (confirmToken: RESET_ALL_INSTALLMENTS).',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      const def = getDefaultInstallments();
      await saveFinanceInstallments(env, def);
      await recordAuditEvent(env, request, {
        type: 'SECURITY_ACTION',
        severity: 'warning',
        actorRole: 'admin',
        summary: 'Histórico de parcelas da mensalidade restaurado para padrão inicial',
      });
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Parcelas restauradas para o padrão inicial.',
          installments: def,
          summary: calculateFinanceSummary(def),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Ação não reconhecida.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Não foi possível concluir a operação financeira. Tente novamente em instantes.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
