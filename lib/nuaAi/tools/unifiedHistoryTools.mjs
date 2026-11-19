/**
 * lib/nuaAi/tools/unifiedHistoryTools.mjs
 *
 * Ferramenta da Nua IA para consulta unificada de pedidos novos e antigos
 * em todas as frentes comerciais (Packs, Personalizados e Chamadas VIP).
 */

export function registerUnifiedHistoryTools(define, { S, N, A, apiCall, norm, withinDateRange, fmtBrl }) {
  define('search_unified_history', {
    description: 'Pesquisa no histórico consolidado de pedidos de todas as modalidades (Packs comerciais, Personalizados sob medida e Chamadas VIP), novos ou antigos.',
    parameters: {
      query: S('Nome do cliente, e-mail, telefone ou termo de busca.'),
      type: S('Tipo de pedido: "all" (padrão), "pack", "personalizado" ou "chamada".'),
      status: S('Status do pedido (ex: "entregue", "concluido", "em_producao", "pago", "cancelado" ou "all").'),
      from: S('Data inicial YYYY-MM-DD.'),
      to: S('Data final YYYY-MM-DD.'),
      limit: N('Limite de resultados (padrão 30, máx 100).'),
    },
    run: async (args, ctx) => {
      const type = (args.type || 'all').toLowerCase();
      const query = norm(args.query || '');
      const limit = Math.min(Math.max(Number(args.limit) || 30, 1), 100);
      const unifiedList = [];

      // 1. Pedidos comerciais (Packs)
      if (type === 'all' || type === 'pack') {
        try {
          if (typeof ctx.services.db?.select === 'function') {
            const rows = await ctx.services.db.select('orders', {
              select: 'id,status,amount,customer_email,customer_name,created_at,metadata',
              order: 'created_at.desc',
              limit: 50,
            });
            for (const o of rows || []) {
              unifiedList.push({
                type: 'pack',
                typeLabel: 'Pack de Conteúdo',
                id: o.id,
                client: o.customer_name || o.customer_email || 'Cliente',
                contact: o.customer_email || '',
                amount: Number(o.amount || 0),
                amountFormatted: fmtBrl(o.amount),
                status: o.status,
                createdAt: o.created_at,
                summary: `Pack comercial no valor de ${fmtBrl(o.amount)}.`,
              });
            }
          }
        } catch {}
      }

      // 2. Pedidos Personalizados
      if (type === 'all' || type === 'personalizado') {
        try {
          const res = await apiCall(ctx, '/api/personalizados/admin').catch(() => null);
          const pers = Array.isArray(res?.orders) ? res.orders : [];
          for (const p of pers) {
            unifiedList.push({
              type: 'personalizado',
              typeLabel: 'Pedido Sob Medida',
              id: p.id,
              client: p.clientName || 'Cliente',
              contact: p.clientContact || p.clientEmail || '',
              amount: Number(p.totalPrice || 0),
              amountFormatted: fmtBrl(p.totalPrice),
              status: p.status,
              createdAt: p.createdAt,
              summary: `Personalizado: ${p.photoCount || 0} fotos, ${p.videoDurationMinutes || 0}m de vídeo via ${p.deliveryChannel || 'cofre'}.`,
            });
          }
        } catch {}
      }

      // 3. Chamadas VIP
      if (type === 'all' || type === 'chamada') {
        try {
          const res = await apiCall(ctx, '/api/appointments/admin').catch(() => null);
          const appts = Array.isArray(res?.bookings) ? res.bookings : [];
          for (const a of appts) {
            const apptWhen = a.date
              ? `${a.date}${a.startTime ? ` às ${a.startTime}` : ''}`
              : a.dateTime || a.createdAt || 'Data não informada';
            const link = a.meeting?.url || a.meetingUrl || 'Pendente';
            unifiedList.push({
              type: 'chamada',
              typeLabel: 'Chamada VIP',
              id: a.id,
              client: a.clientName || 'Cliente',
              contact: a.clientEmail || a.clientPhone || '',
              amount: Number(a.price || a.amount || 0),
              amountFormatted: fmtBrl(a.price || a.amount),
              status: a.status,
              date: a.date || undefined,
              createdAt: a.date || a.dateTime || a.createdAt,
              summary: `Chamada VIP (${a.modalityName || a.modalityId || 'Vídeo'}) marcada para ${apptWhen}. Link: ${link}.`,
            });
          }
        } catch {}
      }

      // Filtros
      let filtered = unifiedList;
      if (query) {
        filtered = filtered.filter(
          (item) =>
            norm(item.client).includes(query) ||
            norm(item.contact).includes(query) ||
            norm(item.id).includes(query) ||
            norm(item.summary).includes(query)
        );
      }

      if (args.status && args.status !== 'all') {
        const targetStatus = norm(args.status);
        filtered = filtered.filter((item) => norm(item.status).includes(targetStatus));
      }

      filtered = filtered.filter((item) => withinDateRange(item, args));

      // Ordena por data decrescente
      filtered.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

      const paged = filtered.slice(0, limit);
      const totalAmount = paged.reduce((acc, curr) => acc + (curr.amount || 0), 0);

      return {
        summary: `Localizei ${paged.length} registro(s) no histórico unificado.`,
        data: {
          totalFound: filtered.length,
          returnedCount: paged.length,
          totalAmount: fmtBrl(totalAmount),
          items: paged,
        },
      };
    },
  });
}
