/**
 * POST /api/nua-ai/approve-action
 *
 * Executa uma proposta sensível gerada pela Nua IA. Somente após clique humano.
 * Validações: sessão de admin/dev, nonce de uso único, expiração e estado.
 */

import { createAssistantServices } from '../../../lib/nuaAi/assistantServices.mjs';
import { resolveActorRole } from './_actor';

type Env = Record<string, any>;

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

function fail(status: number, error: string) {
  return Response.json({ success: false, error }, { status, headers: NO_STORE });
}

async function executeProposal(proposal: any, services: any) {
  const { actionType, payload } = proposal;

  switch (actionType) {
    case 'delete_media': {
      const del = await services.api('/api/media/delete', {
        method: 'POST',
        body: { keys: [payload.objectKey] },
      });
      if (!del.ok) throw new Error(del.data?.error || 'Falha ao excluir o arquivo do storage.');

      const content = payload.content;
      if (content && Array.isArray(content.library)) {
        content.library = content.library.filter((m: any) => m.id !== payload.mediaId);
      }
      return { message: 'Mídia excluída do storage e removida da biblioteca.', content };
    }

    case 'publish_site': {
      const pub = await services.api('/api/content/sync', {
        method: 'POST',
        body: { content: payload.content },
      });
      if (!pub.ok) throw new Error(pub.data?.error || 'Falha ao publicar o site.');
      return {
        message: 'Site publicado com sucesso.',
        version: pub.data?._version ?? pub.data?.version ?? null,
        updatedAt: pub.data?._updatedAt ?? pub.data?.updatedAt ?? null,
      };
    }

    case 'reschedule_appointment': {
      const res = await services.api('/api/appointments/admin', {
        method: 'POST',
        body: {
          action: 'reschedule',
          bookingId: payload.bookingId,
          newDate: payload.date,
          newStartTime: payload.startTime,
          reason: payload.reason,
        },
      });
      if (!res.ok) throw new Error(res.data?.error || 'Falha ao reagendar.');
      return { message: 'Chamada reagendada.' };
    }

    case 'cancel_appointment': {
      const res = await services.api('/api/appointments/admin', {
        method: 'POST',
        body: { action: 'cancel', bookingId: payload.bookingId, reason: payload.reason },
      });
      if (!res.ok) throw new Error(res.data?.error || 'Falha ao cancelar.');
      return { message: 'Chamada cancelada.' };
    }

    case 'update_appointment_settings': {
      if (payload.settings) {
        const res = await services.api('/api/appointments/admin', {
          method: 'POST',
          body: { action: 'updateSettings', settings: payload.settings },
        });
        if (!res.ok) throw new Error(res.data?.error || 'Falha ao salvar horários.');
      }
      if (Array.isArray(payload.modalities)) {
        const res = await services.api('/api/appointments/admin', {
          method: 'POST',
          body: { action: 'updateModalities', modalities: payload.modalities },
        });
        if (!res.ok) throw new Error(res.data?.error || 'Falha ao salvar modalidades.');
      }
      return { message: 'Agenda e modalidades atualizadas.' };
    }

    case 'mark_finance_paid': {
      const res = await services.api('/api/finance/admin', {
        method: 'POST',
        body: {
          action: 'manual_pay',
          installmentNumber: payload.installmentNumber,
          paidAmount: payload.paidAmount,
          paymentMethod: payload.paymentMethod || 'manual',
        },
      });
      if (!res.ok) throw new Error(res.data?.error || 'Falha ao dar baixa na parcela.');
      return { message: 'Parcela baixada.' };
    }

    case 'revert_finance_payment': {
      const res = await services.api('/api/finance/admin', {
        method: 'POST',
        body: { action: 'revert', installmentNumber: payload.installmentNumber },
      });
      if (!res.ok) throw new Error(res.data?.error || 'Falha ao reverter a parcela.');
      return { message: 'Quitação revertida.' };
    }

    case 'update_request_status': {
      const res = await services.api('/api/requests', {
        method: 'POST',
        body: { action: 'update', id: payload.requestId, status: payload.status },
      });
      if (!res.ok) throw new Error(res.data?.error || 'Falha ao atualizar a solicitação.');
      return { message: 'Status da solicitação atualizado.' };
    }

    case 'update_personalizado_settings': {
      const res = await services.api('/api/personalizados/admin', {
        method: 'POST',
        body: { action: 'save_settings', settings: payload.settings },
      });
      if (!res.ok) throw new Error(res.data?.error || 'Falha ao salvar as configurações.');
      return { message: 'Preços da calculadora atualizados.' };
    }

    case 'remove_music_track': {
      const res = await services.api('/api/music/update', {
        method: 'DELETE',
        body: { id: payload.trackId, deleteFile: false },
      });
      if (!res.ok) throw new Error(res.data?.error || 'Falha ao remover a faixa.');
      return { message: 'Faixa removida da biblioteca musical.' };
    }

    case 'edit_admin_ui': {
      const res = await services.api('/api/admin/content-ops', {
        method: 'POST',
        body: { content: payload.content, ops: payload.ops, editorName: 'Nua IA (aprovação humana)' },
      });
      if (!res.ok || res.data?.success !== true) {
        throw new Error(res.data?.error || 'Falha ao atualizar a interface administrativa.');
      }
      return { message: 'Interface administrativa atualizada após confirmação.', content: res.data.content };
    }

    default:
      throw new Error('Não consegui aplicar essa alteração por aqui. Tente novamente pelo painel.');
  }
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const role = await resolveActorRole(request, env);
  if (!role) return fail(401, 'Faça login no painel administrativo.');
  if (!['dev', 'admin'].includes(role)) return fail(403, 'Seu perfil não pode aprovar ações.');

  let body: any;
  try {
    body = await request.json();
  } catch {
    return fail(400, 'Não consegui ler este pedido. Tente novamente.');
  }

  const { proposalId, nonce } = body || {};
  if (typeof proposalId !== 'string' || typeof nonce !== 'string') {
    return fail(400, 'Não consegui identificar este pedido. Peça a ação novamente à Nua IA.');
  }

  let services: any;
  try {
    services = createAssistantServices(env, fetch, { origin: new URL(request.url).origin });
  } catch (error) {
    return fail(503, 'A integração do painel está indisponível no momento. Tente novamente em instantes.');
  }

  const key = `nua_ai_proposal:${proposalId}`;
  const proposal = await services.read(key).catch(() => null);
  if (!proposal) return fail(404, 'Este pedido não está mais disponível. Peça a ação novamente à Nua IA.');
  if (proposal.usedAt) return fail(409, 'Este pedido já foi aplicado.');
  if (Number(proposal.expiresAt) < Date.now()) {
    await services.delete(key).catch(() => {});
    return fail(410, 'Este pedido expirou. Peça a ação novamente à Nua IA.');
  }
  if (proposal.nonce !== nonce) {
    return fail(403, 'Não foi possível confirmar este pedido. Peça a ação novamente à Nua IA.');
  }

  // Marca como usada ANTES de executar (anti-replay).
  await services.write(key, { ...proposal, usedAt: new Date().toISOString() }).catch(() => {});

  try {
    const result = await executeProposal(proposal, services);

    const audit = (await services.read('nua_ai_audit:index').catch(() => [])) || [];
    await services
      .write('nua_ai_audit:index', [
        {
          at: new Date().toISOString(),
          actor: role,
          tool: proposal.actionType,
          args: proposal.proposedChanges,
          ok: true,
          summary: result.message,
          approvedBy: 'human',
          proposalId,
        },
        ...(Array.isArray(audit) ? audit : []),
      ].slice(0, 200))
      .catch(() => {});

    return Response.json({ success: true, ...result }, { headers: NO_STORE });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao executar a ação.';
    // Libera nova tentativa: nada foi aplicado.
    await services.write(key, { ...proposal, usedAt: null, lastError: message }).catch(() => {});
    return Response.json({ success: false, error: message }, { status: 200, headers: NO_STORE });
  }
};
