export type HelpId =
  // Shell e Globais
  | 'shell_header'
  | 'shell_sidebar'
  | 'spotlight_search'
  // Visão Geral
  | 'dashboard_geral'
  | 'alertas_sistema'
  // Vendas e Atendimento
  | 'conteudos_catalogo'
  | 'conteudos_secao'
  | 'pack_editor_info'
  | 'pack_editor_previews'
  | 'pack_editor_vault'
  | 'personalizados_pedidos'
  | 'personalizados_entrega'
  | 'personalizados_regras'
  | 'chamadas_fila'
  | 'chamadas_calendario'
  | 'chamadas_modalidades'
  | 'chamadas_horarios'
  | 'chamadas_modal_link'
  | 'clientes_central'
  | 'financeiro_geral'
  // Meu Site
  | 'midias_acervo'
  | 'midias_albuns'
  | 'midias_visualizador'
  | 'modal_seletor_midia'
  | 'vitrine_capa'
  | 'vitrine_galeria'
  | 'vitrine_sobre'
  | 'vitrine_topo_rodape'
  | 'seo_divulgacao'
  | 'seo_legal'
  | 'conexoes_redes'
  | 'conexoes_contato'
  // Conta e Sistema
  | 'mensalidade_parcelas'
  | 'mensalidade_contrato'
  | 'cofre_senhas'
  | 'config_notificacoes'
  | 'config_diagnostico'
  | 'config_sistema'
  // Ferramentas Beta
  | 'beta_player'
  | 'beta_ia';

export interface HelpOptionItem {
  label: string;
  description: string;
}

export interface HelpFaqItem {
  question: string;
  answer: string;
}

export interface HelpSection {
  id: string;
  iconName: 'target' | 'check' | 'sliders' | 'workflow' | 'help' | 'list' | 'info' | 'shield';
  title: string;
  content?: string;
  options?: HelpOptionItem[];
  steps?: string[];
  bullets?: string[];
  faqs?: HelpFaqItem[];
  defaultOpen?: boolean;
}

export interface HelpItem {
  id: HelpId;
  moduleLabel: string;
  title: string;
  subtitle: string;
  sections: HelpSection[];
  warningItems?: string[];
  version: number;
}
