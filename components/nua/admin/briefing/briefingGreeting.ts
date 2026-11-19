/**
 * components/nua/admin/briefing/briefingGreeting.ts
 *
 * Gera a narrativa editorial e afetuosa da Nua IA para o Briefing Matinal,
 * adaptada ao período do dia e à carga real de trabalho da administradora.
 */

interface BriefingMetrics {
  appointmentsTodayCount: number;
  personalizadosPendingCount: number;
  recentSalesTotal: number;
  isSubscriptionUpToDate: boolean;
  unusedLibraryPhotosCount: number;
}

export function generateBriefingGreeting(metrics: BriefingMetrics): {
  salutation: string;
  leadParagraph: string;
  proactiveTip: string;
} {
  const now = new Date();
  const hour = now.getHours();

  let salutation = 'Bom dia, Nua!';
  if (hour >= 12 && hour < 18) {
    salutation = 'Boa tarde, Nua!';
  } else if (hour >= 18 || hour < 5) {
    salutation = 'Boa noite, Nua!';
  }

  // Lead narrativo baseado nas prioridades reais
  let leadParagraph = '';
  if (metrics.appointmentsTodayCount > 0 && metrics.personalizadosPendingCount > 0) {
    leadParagraph = `Hoje o dia está produtivo! Você tem **${metrics.appointmentsTodayCount} chamada(s) VIP** agendada(s) e **${metrics.personalizadosPendingCount} encomenda(s) sob medida** na fila de gravação. Preparei todos os acessos e horários para você.`;
  } else if (metrics.appointmentsTodayCount > 0) {
    leadParagraph = `Hoje você tem **${metrics.appointmentsTodayCount} chamada(s) VIP** agendada(s). Os links das salas de vídeo já estão prontos para você entrar com total tranquilidade.`;
  } else if (metrics.personalizadosPendingCount > 0) {
    leadParagraph = `Nenhuma chamada VIP para hoje, mas você tem **${metrics.personalizadosPendingCount} pedido(s) personalizado(s)** aguardando produção. Uma ótima oportunidade para focar na gravação com calma.`;
  } else {
    leadParagraph = `Tudo em ordem e em paz na sua plataforma! Nenhuma chamada marcada e sua fila de pedidos sob medida está 100% em dia. Um dia perfeito para criar novos ensaios ou relaxar.`;
  }

  // Micro-sugestão da secretária
  let proactiveTip = '';
  if (metrics.unusedLibraryPhotosCount >= 5) {
    proactiveTip = `Você tem ${metrics.unusedLibraryPhotosCount} fotos inéditas na sua biblioteca de mídias que ainda não estão na Galeria Pública. Se quiser, me peça no chat que seleciono as melhores para renovar sua vitrine!`;
  } else if (!metrics.isSubscriptionUpToDate) {
    proactiveTip = 'Atenção com a mensalidade do site: há uma parcela pendente no seu painel. Você pode gerar o PIX Copia e Cola direto na aba Mensalidade em poucos segundos.';
  } else {
    proactiveTip = 'Dica da secretária: seu site está rodando com alta performance e suas fotos estão atraindo novos visitantes. Lembre-se de sempre atualizar o link do OnlyFans nas redes!';
  }

  return { salutation, leadParagraph, proactiveTip };
}
