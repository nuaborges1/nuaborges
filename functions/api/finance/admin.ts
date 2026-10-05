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
  NUA_CONTENT?: any;
  CONTENT_KV?: any;
  MP_ACCESS_TOKEN?: string;
  ADMIN_API_SECRET?: string;
  ADMIN_PASSWORD?: string;
  [key: string]: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

// Fallback em memória para desenvolvimento local
let memoryInstallments: FinancialInstallment[] | null = null;

async function getStoredInstallments(kv: any): Promise<FinancialInstallment[]> {
  if (kv && typeof kv.get === 'function') {
    const raw = await kv.get(KV_FINANCE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === 10) {
          return parsed;
        }
      } catch {
        // Fall through to default
      }
    }
    const def = getDefaultInstallments();
    await kv.put(KV_FINANCE_KEY, JSON.stringify(def));
    return def;
  }

  if (!memoryInstallments) {
    memoryInstallments = getDefaultInstallments();
  }
  return memoryInstallments;
}

async function saveStoredInstallments(kv: any, installments: FinancialInstallment[]): Promise<void> {
  if (kv && typeof kv.put === 'function') {
    await kv.put(KV_FINANCE_KEY, JSON.stringify(installments));
  } else {
    memoryInstallments = installments;
  }
}

async function checkMercadoPagoStatus(accessToken?: string) {
  if (!accessToken) {
    return {
      configured: false,
      connected: false,
      message: 'Token de acesso do Mercado Pago não configurado nas variáveis de ambiente.',
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
        message: 'Token presente, mas chamada à API do Mercado Pago retornou erro.',
      };
    }
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      error: err.message,
    };
  }
}

export const onRequestGet = async (context: PagesContext<Env>) => {
  const { env, request } = context;
  const kv = env.NUA_CONTENT || env.CONTENT_KV;
  const mpToken =
    env.MP_ACCESS_TOKEN ||
    (typeof process !== 'undefined' ? process.env?.MP_ACCESS_TOKEN : undefined);

  try {
    const installments = await getStoredInstallments(kv);

    // Garante quitação da parcela 1
    const p1 = installments.find((p) => p.number === 1);
    if (p1 && p1.status !== 'paid') {
      p1.status = 'paid';
      p1.paidAt = '2026-10-05T11:00:00-03:00';
      p1.paidAmount = 200;
      p1.paymentMethod = 'pix';
      p1.paymentId = 'PIX-NUA-20261005-001';
      p1.receiptHash = generateReceiptHash(p1);
      await saveStoredInstallments(kv, installments);
    }

    const summary = calculateFinanceSummary(installments);
    const mpStatus = await checkMercadoPagoStatus(mpToken);

    return new Response(
      JSON.stringify({
        success: true,
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
        error: err.message || 'Erro ao carregar dados administrativos de finanças.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { env, request } = context;
  const kv = env.NUA_CONTENT || env.CONTENT_KV;
  const mpToken =
    env.MP_ACCESS_TOKEN ||
    (typeof process !== 'undefined' ? process.env?.MP_ACCESS_TOKEN : undefined);

  try {
    const body = (await request.json()) as any;
    const action = body.action;

    const installments = await getStoredInstallments(kv);

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
      const notes = body.notes ? String(body.notes).trim() : 'Baixa manual pelo Admin Geral';

      inst.status = 'paid';
      inst.paidAt = paidAt;
      inst.paidAmount = paidAmount;
      inst.paymentMethod = paymentMethod;
      inst.paymentId = paymentId;
      inst.receiptHash = generateReceiptHash(inst);

      await saveStoredInstallments(kv, installments);

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
      const reason = body.reason || 'Reversão solicitada no painel Admin Geral';

      inst.status = 'pending';
      delete (inst as any).paidAt;
      delete (inst as any).paidAmount;
      delete (inst as any).paymentMethod;
      delete (inst as any).paymentId;
      delete (inst as any).receiptHash;

      await saveStoredInstallments(kv, installments);

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

    // 3. Sincronizar com a API do Mercado Pago
    if (action === 'sync_mp') {
      if (!mpToken) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'MP_ACCESS_TOKEN não configurado.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const mpSearchUrl =
        'https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=50';
      const searchRes = await fetch(mpSearchUrl, {
        headers: {
          Authorization: `Bearer ${mpToken}`,
        },
      });

      if (!searchRes.ok) {
        const errText = await searchRes.text();
        return new Response(
          JSON.stringify({
            success: false,
            error: `Erro ao consultar pagamentos no Mercado Pago: HTTP ${searchRes.status}`,
            details: errText,
          }),
          { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const searchData = (await searchRes.json()) as any;
      const results: any[] = searchData.results || [];
      const updatedParcelas: number[] = [];

      for (const payment of results) {
        if (payment.status !== 'approved') continue;

        let targetNumber: number | null = null;
        const extRef = payment.external_reference || '';

        // Tenta extrair número da parcela
        const match = extRef.match(/nua-parcela-(\d+)/);
        if (match) {
          targetNumber = parseInt(match[1], 10);
        } else if (payment.metadata && payment.metadata.installment_number) {
          targetNumber = parseInt(payment.metadata.installment_number, 10);
        }

        if (targetNumber && targetNumber >= 1 && targetNumber <= 10) {
          const inst = installments.find((p) => p.number === targetNumber);
          if (inst && inst.status !== 'paid') {
            inst.status = 'paid';
            inst.paidAt = payment.date_approved || payment.date_created || new Date().toISOString();
            inst.paidAmount = payment.transaction_amount || inst.amount;
            inst.paymentMethod =
              payment.payment_method_id === 'pix' ? 'pix' : 'credit_card';
            inst.paymentId = String(payment.id);
            inst.receiptHash = generateReceiptHash(inst);
            updatedParcelas.push(targetNumber);
          }
        }
      }

      if (updatedParcelas.length > 0) {
        await saveStoredInstallments(kv, installments);

        try {
          await recordAuditEvent(env, request, {
            type: 'CONTENT_PUBLISH',
            severity: 'info',
            summary: `Conciliação MP automática: ${updatedParcelas.length} parcela(s) atualizada(s) [${updatedParcelas.join(', ')}].`,
            details: { updatedParcelas },
          });
        } catch {}
      }

      return new Response(
        JSON.stringify({
          success: true,
          message:
            updatedParcelas.length > 0
              ? `Sincronização concluída! ${updatedParcelas.length} nova(s) parcela(s) quitada(s): [${updatedParcelas.join(', ')}].`
              : 'Sincronização concluída. Todas as parcelas já estavam conciliadas com o Mercado Pago.',
          updatedParcelas,
          totalChecked: results.length,
          summary: calculateFinanceSummary(installments),
          installments,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Restaurar padrão
    if (action === 'reset_defaults') {
      const def = getDefaultInstallments();
      await saveStoredInstallments(kv, def);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Parcelas restauradas para o estado padrão canônico.',
          installments: def,
          summary: calculateFinanceSummary(def),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: `Ação desconhecida: ${action}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Falha ao processar comando financeiro.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
