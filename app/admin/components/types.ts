import type { AdminTab, AdminModuleId, ModuleBadgeInfo } from '@/types/admin';

export type { AdminTab, AdminModuleId, ModuleBadgeInfo };

export const MODULE_METADATA: Record<AdminModuleId, { group: string; label: string; desc: string }> = {
  conteudos: {
    group: 'OPERAÇÃO COMERCIAL',
    label: 'Conteúdos & Packs',
    desc: 'Catálogo de packs avulsos e cofre de mídias criptografado',
  },
  personalizados: {
    group: 'OPERAÇÃO COMERCIAL',
    label: 'Pedidos personalizados',
    desc: 'Fila de pedidos sob medida, calculadora de preços e cofre de entrega',
  },
  chamadas: {
    group: 'OPERAÇÃO COMERCIAL',
    label: 'Chamadas VIP',
    desc: 'Agendamentos de vídeo, links de salas e disponibilidade',
  },
  vitrine: {
    group: 'GESTÃO DO SITE',
    label: 'Editar meu site',
    desc: 'Apresentação inicial, curadoria da galeria pública e biografia',
  },
  conexoes: {
    group: 'GESTÃO DO SITE',
    label: 'Redes e contato',
    desc: 'Canais oficiais externos e endereço de contato com fãs',
  },
  financeiro: {
    group: 'FINANCEIRO',
    label: 'Financeiro',
    desc: 'Receitas comerciais das vendas e faturamento consolidado',
  },
  contratos: {
    group: 'JURÍDICO & CONTRATOS',
    label: 'Contratos',
    desc: 'Instrumento contratual de prestação de serviços, Anexo I e assinaturas digitais',
  },
  cofre: {
    group: 'SEGURANÇA',
    label: 'Acessos e senhas',
    desc: 'Armazenamento seguro e criptografado de senhas, e-mails e acessos',
  },
  configuracoes: {
    group: 'SISTEMA',
    label: 'Configurações',
    desc: 'Preferências de alertas sonoros, notificações do sistema e diagnósticos',
  },
  beta_player: {
    group: 'BETA EXPERIMENTAL',
    label: 'Player de Áudio',
    desc: 'Trilha sonora ambiente e controle do catálogo musical do site',
  },
  beta_ia: {
    group: 'BETA EXPERIMENTAL',
    label: 'Assistente Nua IA',
    desc: 'Base de conhecimento proprietária e suporte com inteligência artificial',
  },
  alertas: {
    group: 'SISTEMA',
    label: 'Pedidos recebidos',
    desc: 'Notificações de pedidos, logs de segurança e avisos do sistema',
  },
  seo: {
    group: 'GESTÃO DO SITE',
    label: 'Divulgação & SEO',
    desc: 'Metadados de busca, imagem de compartilhamento e páginas legais',
  },
  mensalidade: {
    group: 'FINANCEIRO',
    label: 'Mensalidade do Site',
    desc: 'Faturas e manutenção técnica de hospedagem via Mercado Pago',
  },
};

export function resolveModuleFromParam(param: string | null): AdminModuleId {
  if (!param) return 'conteudos';
  const clean = param.toLowerCase().trim();
  if (['inicio', 'home'].includes(clean)) return 'conteudos';

  if (['conteudos', 'packs', 'avulsos', 'library', 'music'].includes(clean)) {
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
  if (['financeiro', 'stripe', 'vendas', 'receita', 'financeior'].includes(clean)) {
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
  if (['alertas', 'notifications', 'sistema'].includes(clean)) {
    return 'alertas';
  }

  return 'conteudos';
}
