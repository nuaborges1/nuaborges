/**
 * lib/nuaAi/tools/agendaTools.mjs
 *
 * Ferramentas de alta conveniência para bloqueio e liberação rápida
 * de datas na agenda de Chamadas VIP (`appointments.blockedDates`).
 */

export function registerAgendaTools(define, { S, apiCall, proposal }) {
  define('block_appointment_date', {
    description: 'Bloqueia uma data inteira na agenda de Chamadas VIP (ex: dia de viagem ou folga). Ação sensível: gera cartão de confirmação para a usuária aprovar.',
    risk: 'medium',
    parameters: {
      date: S('Data a ser bloqueada no formato YYYY-MM-DD (ex: "2026-11-20").'),
      reason: S('Motivo opcional do bloqueio (ex: "Viagem", "Gravação externa").'),
    },
    required: ['date'],
    run: async (args, ctx) => {
      const dateStr = String(args.date || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        throw new Error('Formato de data inválido. Use YYYY-MM-DD (ex: 2026-11-20).');
      }

      const current = await apiCall(ctx, '/api/appointments/admin');
      const settings = current?.settings || {};
      const blocked = Array.isArray(settings.blockedDates) ? [...settings.blockedDates] : [];
      const dayOverrides = { ...(settings.dayOverrides || {}) };

      if (blocked.includes(dateStr) || dayOverrides[dateStr] === false) {
        return { summary: `A data ${dateStr} já está bloqueada na sua agenda de chamadas.` };
      }

      const nextBlocked = [...blocked, dateStr].sort();
      dayOverrides[dateStr] = false;
      const nextSettings = { ...settings, blockedDates: nextBlocked, dayOverrides };

      const prop = proposal(ctx, {
        actionType: 'update_appointment_settings',
        targetId: 'appointments_settings',
        summary: `Bloquear o dia ${dateStr} na agenda de Chamadas VIP (${args.reason || 'Folga / Indisponível'}).`,
        proposedChanges: {
          settings: nextSettings,
          blockedDates: nextBlocked,
          dateBlocked: dateStr,
          reason: args.reason || 'Folga / Indisponível',
        },
        payload: {
          settings: nextSettings,
        },
      });

      await ctx.services.write(`nua_ai_proposal:${prop.proposalId}`, prop);

      return {
        summary: `Preparei o bloqueio da data ${dateStr} na sua agenda. Como isso impacta a disponibilidade pública de agendamento, confirme no cartão abaixo.`,
        proposal: {
          proposalId: prop.proposalId,
          nonce: prop.nonce,
          actionType: prop.actionType,
          targetId: prop.targetId,
          summary: prop.summary,
          proposedChanges: prop.proposedChanges,
        },
      };
    },
  });

  define('unblock_appointment_date', {
    description: 'Remove o bloqueio de uma data na agenda de Chamadas VIP, liberando os horários normais daquele dia da semana.',
    risk: 'medium',
    parameters: {
      date: S('Data a ser liberada no formato YYYY-MM-DD.'),
    },
    required: ['date'],
    run: async (args, ctx) => {
      const dateStr = String(args.date || '').trim();
      const current = await apiCall(ctx, '/api/appointments/admin');
      const settings = current?.settings || {};
      const blocked = Array.isArray(settings.blockedDates) ? [...settings.blockedDates] : [];
      const dayOverrides = { ...(settings.dayOverrides || {}) };

      if (!blocked.includes(dateStr) && dayOverrides[dateStr] !== false) {
        return { summary: `A data ${dateStr} não estava bloqueada na sua agenda.` };
      }

      const nextBlocked = blocked.filter((d) => d !== dateStr);
      delete dayOverrides[dateStr];
      const nextSettings = { ...settings, blockedDates: nextBlocked, dayOverrides };

      const prop = proposal(ctx, {
        actionType: 'update_appointment_settings',
        targetId: 'appointments_settings',
        summary: `Desbloquear o dia ${dateStr} na agenda de Chamadas VIP, liberando novos agendamentos.`,
        proposedChanges: {
          settings: nextSettings,
          blockedDates: nextBlocked,
          dateUnblocked: dateStr,
        },
        payload: {
          settings: nextSettings,
        },
      });

      await ctx.services.write(`nua_ai_proposal:${prop.proposalId}`, prop);

      return {
        summary: `Preparei o desbloqueio da data ${dateStr} na sua agenda. Confirme no cartão abaixo para liberar os horários.`,
        proposal: {
          proposalId: prop.proposalId,
          nonce: prop.nonce,
          actionType: prop.actionType,
          targetId: prop.targetId,
          summary: prop.summary,
          proposedChanges: prop.proposedChanges,
        },
      };
    },
  });
}
