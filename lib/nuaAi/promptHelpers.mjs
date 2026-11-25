/**
 * lib/nuaAi/promptHelpers.mjs
 *
 * Funções auxiliares modulares para formatação do contexto do rascunho
 * e estado do sistema no prompt da Nua IA.
 */

export function galleryIndex(content) {
  const photos = Array.isArray(content?.gallery?.photos) ? content.gallery.photos : [];
  return photos.map((p, idx) => ({
    position: idx + 1,
    id: p.id || `gal-${idx + 1}`,
    title: p.title || 'Ensaio sem título',
    caption: p.caption || '',
    imageUrl: p.imageUrl || '',
    linkUrl: p.linkUrl || '',
    active: p.active !== false,
  }));
}

export function heroIndex(content) {
  const slides = Array.isArray(content?.hero?.photos) ? content.hero.photos : [];
  return slides.map((s, idx) => ({
    slideNumber: idx + 1,
    id: s.id || `slide-${idx + 1}`,
    title: s.title || '',
    session: s.session || '',
    imageUrl: s.imageUrl || '',
  }));
}

export function buildNavigationMap() {
  return {
    dashboard: 'Visão Geral → Início: resumo operacional, faturamento e alertas do dia',
    clientes: 'Visão Geral → Clientes: contas NUA ID, compras vinculadas, Cofre Digital e Lista VIP por e-mail',
    historico: 'Visão Geral → Histórico de Pedidos: arquivo consolidado de pedidos entregues, concluídos e cancelados',
    conteudos: 'Vendas e Atendimento → Conteúdos & Packs: catálogo de packs avulsos e arquivos do Cofre Digital',
    personalizados: 'Vendas e Atendimento → Personalizados: Fila de Pedidos, Entregues e Preços e Regras',
    chamadas: 'Vendas e Atendimento → Chamadas VIP: Agenda & Reservas (Lista/Calendário), Horários & Disponibilidade e Modalidades & Preços',
    financeiro: 'Vendas e Atendimento → Financeiro: receitas de vendas via PIX (Mercado Pago) por modalidade',
    midias: 'Meu Site → Biblioteca de Mídias: acervo privado de fotos, vídeos, álbuns e favoritos',
    vitrine: 'Meu Site → Editar Meu Site: Capa, Vitrine de Ensaios (antiga Galeria), Sobre Mim e Rodapé',
    conexoes: 'Meu Site → Redes e Contato: links oficiais de canais externos e formulário de contato',
    mensalidade: 'Conta e Sistema → Mensalidade: parcelas do contrato do site, pagamento PIX e recibos PDF',
    configuracoes: 'Conta e Sistema → Configurações: alertas sonoros, notificações, contrato e preferências do painel',
  };
}
