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
    dashboard: 'Visão Geral → KPIs faturamento, pedidos pendentes e chamadas do dia',
    historico: 'Histórico de Pedidos → Histórico unificado consolidado de todos os pedidos já entregues e concluídos',
    conteudos: 'Conteúdos & Packs → Catálogo de packs avulsos à venda e cofre criptografado de mídias',
    personalizados: 'Pedidos Personalizados → Fila de encomendas sob medida e calculadora de preços',
    chamadas: 'Chamadas VIP → Fila de reservas, calendário, modalidades e agenda de horários',
    financeiro: 'Financeiro Comercial → Relatório executivo de vendas de packs, personalizados e chamadas',
    midias: 'Biblioteca de Mídias (Acervo B2) → Repositório privado com todos os arquivos originais de fotos e vídeos',
    vitrine: 'Editar Meu Site → Foto da capa (hero slides), Vitrine de Ensaios (antiga Galeria), Sobre mim e Rodapé',
    conexoes: 'Redes e Contato → Links oficiais de canais e formulário de contato',
    mensalidade: 'Mensalidade do Site → 10 parcelas do contrato do site, pagamento PIX e recibos PDF',
    contratos: 'Contrato Digital → Memorial descritivo, termos de desenvolvimento e certificados de assinatura',
    cofre: 'Acessos e Senhas → Metadados seguros de credenciais da marca (sem exposição de senhas)',
    configuracoes: 'Configurações → Preferências do sistema, notificações e diagnósticos',
  };
}
