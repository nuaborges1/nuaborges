import {
  LayoutDashboard,
  Images,
  Search,
  Home,
  ShoppingBag,
  Camera,
  Video,
  Share2,
  TrendingUp,
  FileText,
  KeyRound,
  Sliders,
  Bell,
  PackageCheck,
  Music,
  CreditCard,
} from 'lucide-react';
import { StaticAction } from './types';

export const STATIC_ACTIONS: StaticAction[] = [
  // Visão Geral & Biblioteca Central
  {
    id: 'act_dashboard',
    title: 'Abrir Dashboard (Visão Geral)',
    subtitle: 'Visão Geral • Resumo de vendas, pedidos pendentes, chamadas e ações rápidas',
    keywords: ['dashboard', 'visão geral', 'inicio', 'home', 'resumo', 'painel'],
    moduleId: 'dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'act_midias',
    title: 'Abrir Biblioteca de Mídias',
    subtitle: 'Meu Site • Gerenciar todas as fotos, vídeos e álbuns',
    keywords: ['biblioteca', 'midias', 'fotos', 'videos', 'albuns', 'acervo', 'upload', 'subir'],
    moduleId: 'midias',
    icon: Images,
  },
  // Vitrine & Capa
  {
    id: 'act_capa',
    title: 'Trocar Fotografia de Capa',
    subtitle: 'Vitrine & Capa • Atualizar a imagem principal de destaque',
    keywords: ['capa', 'foto', 'principal', 'hero', 'imagem', 'home', 'vitrine', 'mudar capa'],
    moduleId: 'vitrine',
    subAction: 'capa',
    icon: Home,
  },
  {
    id: 'act_bio',
    title: 'Editar Biografia & Sobre Mim',
    subtitle: 'Vitrine & Capa • Texto editorial e apresentação',
    keywords: ['sobre', 'bio', 'biografia', 'texto', 'apresentação', 'historia', 'descricao'],
    moduleId: 'vitrine',
    subAction: 'sobre',
    icon: Home,
  },
  {
    id: 'act_galeria',
    title: 'Organizar Galeria Pública',
    subtitle: 'Vitrine & Capa • Fotos em destaque na vitrine aberta',
    keywords: ['galeria', 'fotos', 'publica', 'destaque', 'curadoria', 'feed'],
    moduleId: 'vitrine',
    subAction: 'galeria',
    icon: Home,
  },

  // Conteúdos & Packs
  {
    id: 'act_novo_pack',
    title: 'Cadastrar Novo Pack ou Ensaio',
    subtitle: 'Conteúdos & Packs • Criar novo álbum com fotos ou vídeos exclusivos',
    keywords: ['novo pack', 'criar pack', 'adicionar pack', 'subir fotos', 'ensaio', 'album', 'pack'],
    moduleId: 'conteudos',
    subAction: 'new_pack',
    icon: ShoppingBag,
  },
  {
    id: 'act_precos_packs',
    title: 'Gerenciar Packs & Valores',
    subtitle: 'Conteúdos & Packs • Catálogo completo de vendas avulsas',
    keywords: ['preco', 'valor', 'packs', 'vendas', 'albuns', 'conteudos', 'catalogo'],
    moduleId: 'conteudos',
    subAction: 'list',
    icon: ShoppingBag,
  },

  // Personalizados
  {
    id: 'act_pedidos_fila',
    title: 'Ver Fila de Pedidos Sob Medida',
    subtitle: 'Personalizados • Fotos e vídeos encomendados por clientes',
    keywords: ['personalizados', 'pedidos', 'encomendas', 'fila', 'sob medida', 'custom'],
    moduleId: 'personalizados',
    subAction: 'orders',
    icon: Camera,
  },
  {
    id: 'act_calc_precos',
    title: 'Calculadora de Personalizados',
    subtitle: 'Personalizados • Configurar preços por minuto e pacote de fotos',
    keywords: ['calculadora', 'tabela', 'preço personalizado', 'valores fotos', 'preço video'],
    moduleId: 'personalizados',
    subAction: 'pricing',
    icon: Sliders,
  },

  // Chamadas VIP
  {
    id: 'act_agenda_chamadas',
    title: 'Agenda de Chamadas VIP',
    subtitle: 'Chamadas VIP • Agendamentos de chamadas de vídeo ao vivo',
    keywords: ['chamadas', 'agenda', 'video', 'videochamada', 'calls', 'encontros', 'horarios', 'sessao'],
    moduleId: 'chamadas',
    subAction: 'agenda',
    icon: Video,
  },

  // Conexões & Redes
  {
    id: 'act_whatsapp',
    title: 'Atualizar Número do WhatsApp',
    subtitle: 'Conexões & Redes • Canal direto para contratações e contato',
    keywords: ['whatsapp', 'zap', 'numero', 'celular', 'telefone', 'contato', 'conexoes'],
    moduleId: 'conexoes',
    subAction: 'whatsapp',
    icon: Share2,
  },
  {
    id: 'act_instagram',
    title: 'Editar Link do Instagram',
    subtitle: 'Conexões & Redes • Redirecionamento para o perfil oficial',
    keywords: ['instagram', 'insta', 'rede social', 'redes', 'links', 'social'],
    moduleId: 'conexoes',
    subAction: 'instagram',
    icon: Share2,
  },
  {
    id: 'act_email',
    title: 'Alterar E-mail de Contato',
    subtitle: 'Conexões & Redes • Endereço de contato com fãs e marcas',
    keywords: ['email', 'e-mail', 'contato', 'mensagem', 'caixa postal'],
    moduleId: 'conexoes',
    subAction: 'email',
    icon: Share2,
  },

  // Financeiro
  {
    id: 'act_financeiro_extrato',
    title: 'Extrato de Faturamento & Vendas',
    subtitle: 'Financeiro • Histórico de receitas consolidadas e vendas do Mercado Pago',
    keywords: ['faturamento', 'financeiro', 'vendas', 'receita', 'ganhos', 'extrato', 'quanto ganhei', 'dinheiro'],
    moduleId: 'financeiro',
    icon: TrendingUp,
  },

  // Contratos
  {
    id: 'act_contrato',
    title: 'Contrato de Prestação & Assinaturas',
    subtitle: 'Contratos • Instrumento contratual, Anexo I e validações',
    keywords: ['contrato', 'juridico', 'assinatura', 'anexo', 'termos', 'legal'],
    moduleId: 'contratos',
    icon: FileText,
  },

  // Configurações
  {
    id: 'act_config_som',
    title: 'Alertas Sonoros & Diagnósticos',
    subtitle: 'Configurações • Preferências de notificações e áudio do sistema',
    keywords: ['som', 'audio', 'alerta sonoro', 'notificacao', 'configuracoes', 'diagnostico'],
    moduleId: 'configuracoes',
    icon: Sliders,
  },

  // Histórico de Pedidos
  {
    id: 'act_historico',
    title: 'Histórico de Pedidos Finalizados',
    subtitle: 'Visão Geral • Pedidos entregues ou cancelados de todas as áreas',
    keywords: ['historico', 'pedidos', 'entregues', 'cancelados', 'concluidos', 'alertas', 'notificacoes', 'arquivo'],
    moduleId: 'historico',
    icon: PackageCheck,
  },

  // Player de Áudio
  {
    id: 'act_player_audio',
    title: 'Player de Áudio & Trilha Sonora (Beta)',
    subtitle: 'BETA • Upload de faixas masterizadas no CDN e preview do player',
    keywords: ['musica', 'player', 'audio', 'trilha', 'som', 'faixa', 'mp3', 'streaming'],
    moduleId: 'beta_player',
    icon: Music,
  },

  // Mensalidade do Site
  {
    id: 'act_mensalidade',
    title: 'Mensalidade do Site (Mercado Pago)',
    subtitle: 'Hospedagem • Faturas técnicas e manutenção de infraestrutura',
    keywords: ['mensalidade', 'fatura', 'hospedagem', 'mercado pago', 'pagar site', 'boleto'],
    moduleId: 'mensalidade',
    icon: CreditCard,
  },
];
