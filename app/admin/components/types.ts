import type { AdminTab, AdminModuleId, ModuleBadgeInfo } from '@/types/admin';

export type { AdminTab, AdminModuleId, ModuleBadgeInfo };

/**
 * Fonte única de verdade da arquitetura de navegação do CMS.
 * Grupos e rótulos seguem a Segunda Auditoria de Organização (2026-11-14):
 * Visão Geral → Vendas e Atendimento → Meu Site → Conta e Sistema.
 * Ferramentas Beta ficam isoladas (visíveis apenas em ambiente local).
 */
export const NAV_GROUPS = {
  overview: 'VISÃO GERAL',
  sales: 'VENDAS E ATENDIMENTO',
  site: 'MEU SITE',
  account: 'CONTA E SISTEMA',
  beta: 'FERRAMENTAS BETA',
} as const;

export const MODULE_METADATA: Record<AdminModuleId, { group: string; label: string; desc: string }> = {
  dashboard: {
    group: NAV_GROUPS.overview,
    label: 'Dashboard',
    desc: 'Resumo do seu negócio e o que precisa da sua atenção hoje',
  },
  alertas: {
    group: NAV_GROUPS.overview,
    label: 'Pedidos e Alertas',
    desc: 'Pedidos recebidos, avisos e notificações do sistema',
  },
  historico: {
    group: NAV_GROUPS.overview,
    label: 'Histórico de Pedidos',
    desc: 'Arquivo unificado de pedidos entregues ou cancelados',
  },
  conteudos: {
    group: NAV_GROUPS.sales,
    label: 'Conteúdos & Packs',
    desc: 'Packs à venda: capa, amostras gratuitas e conteúdo protegido',
  },
  personalizados: {
    group: NAV_GROUPS.sales,
    label: 'Personalizados',
    desc: 'Fila de pedidos sob medida, preços e regras de atendimento',
  },
  chamadas: {
    group: NAV_GROUPS.sales,
    label: 'Chamadas VIP',
    desc: 'Agendamentos, calendário, modalidades e horários',
  },
  financeiro: {
    group: NAV_GROUPS.sales,
    label: 'Financeiro',
    desc: 'Receitas das suas vendas e histórico de transações',
  },
  midias: {
    group: NAV_GROUPS.site,
    label: 'Biblioteca de Mídias',
    desc: 'Todas as suas fotos e vídeos, organizados em álbuns',
  },
  vitrine: {
    group: NAV_GROUPS.site,
    label: 'Editar Meu Site',
    desc: 'Capa, galeria pública, sobre mim, topo e rodapé',
  },
  seo: {
    group: NAV_GROUPS.site,
    label: 'Divulgação e Google',
    desc: 'Como seu site aparece no Google e no WhatsApp, e páginas legais',
  },
  conexoes: {
    group: NAV_GROUPS.site,
    label: 'Redes e Contato',
    desc: 'Redes sociais, plataformas e contato profissional',
  },
  mensalidade: {
    group: NAV_GROUPS.account,
    label: 'Mensalidade e Contrato',
    desc: 'Mensalidade do site, comprovantes e contrato de prestação de serviços',
  },
  contratos: {
    group: NAV_GROUPS.account,
    label: 'Mensalidade e Contrato',
    desc: 'Contrato de prestação de serviços, anexo e assinaturas',
  },
  cofre: {
    group: NAV_GROUPS.account,
    label: 'Acessos e Senhas',
    desc: 'Senhas e acessos guardados com criptografia',
  },
  configuracoes: {
    group: NAV_GROUPS.account,
    label: 'Configurações',
    desc: 'Notificações, conexões do sistema e sessão',
  },
  beta_player: {
    group: NAV_GROUPS.beta,
    label: 'Player de Áudio',
    desc: 'Trilha sonora ambiente do site (somente em desenvolvimento)',
  },
  beta_ia: {
    group: NAV_GROUPS.beta,
    label: 'Assistente Nua IA',
    desc: 'Base de conhecimento e limites do assistente',
  },
};

export function resolveModuleFromParam(param: string | null): AdminModuleId {
  if (!param) return 'dashboard';
  const clean = param.toLowerCase().trim();
  if (['dashboard', 'inicio', 'home', 'visao-geral', 'visao_geral', 'overview'].includes(clean)) {
    return 'dashboard';
  }
  if (['midias', 'biblioteca', 'library', 'media', 'acervo'].includes(clean)) {
    return 'midias';
  }
  if (['conteudos', 'packs', 'avulsos', 'music'].includes(clean)) {
    return 'conteudos';
  }
  if (['personalizados', 'custom', 'encomendas'].includes(clean)) {
    return 'personalizados';
  }
  if (['chamadas', 'appointments', 'agenda', 'video'].includes(clean)) {
    return 'chamadas';
  }
  if (['seo', 'divulgacao', 'seo-editor'].includes(clean)) {
    return 'seo';
  }
  if (['vitrine', 'hero', 'capa', 'gallery', 'galeria', 'about', 'sobre'].includes(clean)) {
    return 'vitrine';
  }
  if (['conexoes', 'channels', 'redes', 'contact', 'contato'].includes(clean)) {
    return 'conexoes';
  }
  if (['financeiro', 'mercadopago', 'vendas', 'receita', 'financeior'].includes(clean)) {
    return 'financeiro';
  }
  if (['contratos', 'contrato'].includes(clean)) {
    return 'contratos';
  }
  if (['cofre', 'credenciais', 'vault', 'passwords', 'senhas'].includes(clean)) {
    return 'cofre';
  }
  if (['configuracoes', 'config', 'settings'].includes(clean)) {
    return 'configuracoes';
  }
  if (['player', 'beta_player', 'music_player'].includes(clean)) {
    return 'beta_player';
  }
  if (['ia', 'ai', 'beta_ia'].includes(clean)) {
    return 'beta_ia';
  }
  if (['mensalidade', 'finance', 'hospedagem', 'faturas'].includes(clean)) {
    return 'mensalidade';
  }
  if (['alertas', 'notifications', 'sistema', 'pedidos'].includes(clean)) {
    return 'alertas';
  }
  if (['historico', 'historico-pedidos', 'pedidos-finalizados', 'entregues', 'concluidos', 'cancelados', 'arquivo'].includes(clean)) {
    return 'historico';
  }

  return 'dashboard';
}
