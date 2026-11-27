import type { ProtocolVisualIdentity, SemanticStatusTone } from './types';

const BASE = '/phdev/konohagakure';

export const KONOHA_ASSETS = {
  backgrounds: {
    main: `${BASE}/backgrounds/konoha.webp`,
    dark: `${BASE}/backgrounds/konoha-dark.webp`,
    blur: `${BASE}/backgrounds/konoha-blur.webp`,
  },
  banners: {
    peace: `${BASE}/banners/peace-art.webp`,
    pain: `${BASE}/banners/pain-art.webp`,
  },
  effects: {
    embers: `${BASE}/effects/embers.svg`,
    leafRed: `${BASE}/effects/leaf-red.svg`,
    leafRed02: `${BASE}/effects/leaf-red-02.svg`,
    leafRed03: `${BASE}/effects/leaf-red-03.svg`,
    leavesOverlay: `${BASE}/effects/leaves-overlay.svg`,
  },
  icons: {
    konohaEmblem: `${BASE}/icons/konoha-emblem.svg`,
    akatsukiCloud: `${BASE}/icons/akatsuki-cloud.svg`,
    hagoromo: `${BASE}/icons/hagoromo.svg`,
    kunai: `${BASE}/icons/kunai.svg`,
    byakugan: `${BASE}/icons/byakugan.svg`,
    sharingan: `${BASE}/icons/sharingan.svg`,
  },
  patterns: {
    asanoha: `${BASE}/patterns/asanoha.svg`,
    seigaiha: `${BASE}/patterns/seigaiha.svg`,
  },
} as const;

export const HAGOROMO_AUTHORITY = {
  id: 'hagoromo' as const,
  code: 'ROOT',
  name: 'HAGOROMO',
  subtitle: 'Autoridade Técnica PHDEV · Acesso Emergencial Independente',
  missionStatement:
    'Autoridade técnica transversal do PHDEV. Garante recuperação independente mesmo com o painel administrativo ou sessões normais indisponíveis, via consoles externos verificados.',
  japaneseMark: '六道',
  artwork: `${BASE}/cards/hagoromo.webp`,
  artPosition: 'right 22%',
  heroArtPosition: 'right 20%',
  atmosphere: 'sixpaths' as const,
  icon: `${BASE}/icons/hagoromo.svg`,
  accentHex: '#e3d8be',
  accentSoftRgba: 'rgba(227, 216, 190, 0.16)',
  accentBorderRgba: 'rgba(227, 216, 190, 0.36)',
} as const;

/**
 * Os 9 protocolos oficiais do NUA Protocol v1.0.
 * KAGE BUNSHIN excluído; PAIN restrito ao banner visual de incidente crítico;
 * HAGOROMO separado como autoridade raiz transversal.
 */
export const OFFICIAL_PROTOCOLS: readonly ProtocolVisualIdentity[] = [
  {
    id: 'kakashi',
    code: 'P01',
    name: 'KAKASHI',
    japaneseMark: '雷',
    responsibility: 'Defesa ativa e segurança',
    missionStatement:
      'Primeira linha de defesa nas bordas do Cloudflare Pages e do gateway de APIs: verificação Turnstile, políticas de rota, headers de segurança, validação de origem e mitigação de abuso.',
    officialCapabilities: [
      'Validação Turnstile na entrada pública e formulários sensíveis',
      'Políticas explícitas por rota aplicadas no gateway de Pages',
      'Proteção CSRF, checagem de Origin e cabeçalhos de endurecimento',
      'Secret Shield e varredura contínua de exposição de segredos',
    ],
    specialMode: { name: 'SHARINGAN', label: 'Defesa reforçada' },
    artwork: `${BASE}/cards/kakashi.webp`,
    artPosition: '88% 24%',
    heroArtPosition: '84% 22%',
    atmosphere: 'lightning',
    icon: `${BASE}/icons/mangekyou-kakashi.svg`,
    accentHex: '#60a5fa',
    accentSoftRgba: 'rgba(96, 165, 250, 0.15)',
    accentBorderRgba: 'rgba(96, 165, 250, 0.36)',
    isDojutsu: true,
    targetSection: 'protocol',
  },
  {
    id: 'minato',
    code: 'P02',
    name: 'MINATO',
    japaneseMark: '閃',
    responsibility: 'Autorização e permissões',
    missionStatement:
      'Separação rígida no servidor entre operação comercial (NUA) e controle técnico/infraestrutura (PHDEV), com sessões persistidas em admin_sessions e reautenticação por senha para ações críticas.',
    officialCapabilities: [
      'Matriz de capacidades no servidor aplicada inclusive em chamadas diretas à API',
      'Persistência e revogação verificável de sessões em admin_sessions',
      'Escopos segregados para credenciais de serviço e automações cron',
      'Reautenticação por senha do operador em estorno, contenção e manutenção',
    ],
    artwork: `${BASE}/cards/minato.webp`,
    artPosition: '90% 24%',
    heroArtPosition: '86% 20%',
    atmosphere: 'hiraishin',
    icon: `${BASE}/icons/kunai.svg`,
    accentHex: '#e5be62',
    accentSoftRgba: 'rgba(229, 190, 98, 0.15)',
    accentBorderRgba: 'rgba(229, 190, 98, 0.36)',
    targetSection: 'protocol',
  },
  {
    id: 'kakuzu',
    code: 'P03',
    name: 'KAKUZU',
    japaneseMark: '金',
    responsibility: 'Integridade financeira',
    missionStatement:
      'Isolamento rigoroso entre o financeiro comercial da NUA (Mercado Pago, pedidos e estornos auditáveis) e a mensalidade de infraestrutura administrada pelo PHDEV (Pix estático separado).',
    officialCapabilities: [
      'Validação de webhooks e conciliação de pedidos comerciais no Mercado Pago',
      'Separação estrita entre caixa comercial da NUA e mensalidade PHDEV',
      'Estornos protegidos por confirmação de senha e rastreabilidade em auditoria',
      'Transparência de saldo real: sem saldo sintético sem fonte confirmada',
    ],
    artwork: `${BASE}/cards/kakuzu.webp`,
    artPosition: '88% 22%',
    heroArtPosition: '84% 20%',
    atmosphere: 'emerald',
    icon: `${BASE}/icons/kakuzu-stitch.svg`,
    accentHex: '#34d399',
    accentSoftRgba: 'rgba(52, 211, 153, 0.15)',
    accentBorderRgba: 'rgba(52, 211, 153, 0.36)',
    targetSection: 'protocol',
  },
  {
    id: 'neji',
    code: 'P04',
    name: 'NEJI',
    japaneseMark: '白',
    responsibility: 'Monitoramento e diagnóstico',
    missionStatement:
      'Visão completa e sem pontos cegos sobre integrações, conectividade, saúde das dependências externas e trilha de auditoria real retornada pelo servidor.',
    officialCapabilities: [
      'Verificação em tempo real de Supabase, Mercado Pago, B2, Turnstile e SMTP',
      'Trilha de auditoria central com severidade, tipo e horário real',
      'Diagnóstico sob demanda (Byakugan) sem alterar estado da aplicação',
      'Acesso direto ao console dedicado /monitoramento/',
    ],
    specialMode: { name: 'BYAKUGAN', label: 'Diagnóstico aprofundado' },
    artwork: `${BASE}/cards/neji.webp`,
    artPosition: '88% 24%',
    heroArtPosition: '84% 22%',
    atmosphere: 'byakugan',
    icon: `${BASE}/icons/byakugan.svg`,
    accentHex: '#ddd6fe',
    accentSoftRgba: 'rgba(221, 214, 254, 0.15)',
    accentBorderRgba: 'rgba(221, 214, 254, 0.36)',
    isDojutsu: true,
    targetSection: 'protocol',
  },
  {
    id: 'tobirama',
    code: 'P05',
    name: 'TOBIRAMA',
    japaneseMark: '水',
    responsibility: 'Engenharia e publicação',
    missionStatement:
      'Governança de build, empacotamento estático segregado (site, admin e admingeral), verificação de integridade, trava de backup Git remoto e manutenção controlada.',
    officialCapabilities: [
      'Export estático validado com fontes locais WOFF2 e zero vazamento PHDEV no site',
      'Separação de pacotes out-site, out-admin e out-admingeral via prepareDeploys',
      'Checklist obrigatório de backup Git remoto, Secret Shield e confirmação de SHA',
      'Controle manual de configurações técnicas e modo manutenção do sistema',
    ],
    artwork: `${BASE}/cards/tobirama.webp`,
    artPosition: '88% 22%',
    heroArtPosition: '84% 20%',
    atmosphere: 'suiton',
    icon: `${BASE}/icons/tobirama-suiton.svg`,
    accentHex: '#38bdf8',
    accentSoftRgba: 'rgba(56, 189, 248, 0.15)',
    accentBorderRgba: 'rgba(56, 189, 248, 0.36)',
    targetSection: 'protocol',
  },
  {
    id: 'itachi',
    code: 'P06',
    name: 'ITACHI',
    japaneseMark: '火',
    responsibility: 'Contenção seletiva',
    missionStatement:
      'Pausa cirúrgica de módulos específicos (checkout, reservas VIP, personalizados, login de cliente, contato ou lista VIP) sem derrubar o restante da plataforma. Opera de forma independente de MADARA e KAGUYA.',
    officialCapabilities: [
      'Bloqueio granular por módulo com preservação dos demais fluxos públicos',
      'Exigência de ID de incidente, evidência verificável e senha do operador PHDEV',
      'Coexistência independente com MADARA e KAGUYA (encerrar um preserva os outros)',
      'Registro imediato com revisão concorrente otimista no banco',
    ],
    specialMode: { name: 'TSUKUYOMI', label: 'Contenção por módulo' },
    artwork: `${BASE}/cards/itachi.webp`,
    artPosition: '90% 24%',
    heroArtPosition: '86% 20%',
    atmosphere: 'tsukuyomi',
    icon: `${BASE}/icons/mangekyou-itachi.svg`,
    accentHex: '#e13b47',
    accentSoftRgba: 'rgba(225, 59, 71, 0.17)',
    accentBorderRgba: 'rgba(225, 59, 71, 0.42)',
    usesEmbers: true,
    isDojutsu: true,
    targetSection: 'protocol',
    containmentProtocol: 'itachi',
  },
  {
    id: 'madara',
    code: 'P07',
    name: 'MADARA',
    japaneseMark: '月',
    responsibility: 'Lockdown emergencial',
    missionStatement:
      'Interrupção global de emergência das superfícies da aplicação (gateway, rotas públicas e entrega de mídia protegida em 503) diante de comprometimento confirmado. Requer trava HAGOROMO validada.',
    officialCapabilities: [
      'Suspensão imediata de operações públicas e entrega de mídia protegida (HTTP 503)',
      'Trava de segurança obrigatória vinculada a NUA_EMERGENCY_ACCESS_VERIFIED',
      'Ativa automaticamente a identidade visual PAIN enquanto confirmado ativo',
      'Independente de ITACHI e KAGUYA — desativação não remove outras contenções',
    ],
    specialMode: { name: 'INFINITE TSUKUYOMI', label: 'Lockdown da aplicação' },
    artwork: `${BASE}/cards/madara.webp`,
    artPosition: '88% 22%',
    heroArtPosition: '84% 20%',
    atmosphere: 'rinnegan',
    icon: `${BASE}/icons/rinnegan.svg`,
    accentHex: '#b48ce2',
    accentSoftRgba: 'rgba(180, 140, 226, 0.17)',
    accentBorderRgba: 'rgba(180, 140, 226, 0.40)',
    isDojutsu: true,
    targetSection: 'protocol',
    containmentProtocol: 'madara',
  },
  {
    id: 'naruto',
    code: 'P08',
    name: 'NARUTO',
    japaneseMark: '陽',
    responsibility: 'Resiliência e recuperação',
    missionStatement:
      'Reconciliação automatizada e retomada ordenada das filas críticas de pós-pagamento: liberação do Cofre, envio de confirmações por e-mail e processamento controlado de estornos.',
    officialCapabilities: [
      'Acompanhamento de system:recovery:latest (Cofre, Confirmações e Estornos)',
      'Sinalização de itens acima do limite automático que requerem intervenção',
      'Respeito automático à quarentena de estornos quando pausada',
      'Baryon Mode reservado para homologação própria (nunca simulado)',
    ],
    specialMode: { name: 'BARYON MODE', label: 'Recuperação prioritária' },
    artwork: `${BASE}/cards/naruto-baryon.webp`,
    artPosition: '86% 22%',
    heroArtPosition: '82% 20%',
    atmosphere: 'baryon',
    icon: `${BASE}/icons/uzumaki.svg`,
    accentHex: '#fb7a2c',
    accentSoftRgba: 'rgba(251, 122, 44, 0.17)',
    accentBorderRgba: 'rgba(251, 122, 44, 0.44)',
    usesEmbers: true,
    targetSection: 'protocol',
  },
  {
    id: 'kaguya',
    code: 'P09',
    name: 'KAGUYA',
    japaneseMark: '空',
    responsibility: 'Isolamento da infraestrutura',
    missionStatement:
      'Quarentena por componente crítico na aplicação (Mercado Pago, Backblaze B2, Supabase, Cloudflare ou E-mail), coordenada com isolamento no provedor via HAGOROMO quando necessário.',
    officialCapabilities: [
      'Quarentena isolada por dependência de infraestrutura na camada aplicacional',
      'Trava HAGOROMO obrigatória antes do acionamento em ambiente operacional',
      'Ativa automaticamente a identidade visual PAIN enquanto confirmado ativo',
      'Independente de ITACHI e MADARA — isolamento no provedor exige console externo',
    ],
    specialMode: { name: 'AMENOMINAKA', label: 'Quarentena por componente' },
    artwork: `${BASE}/cards/kaguya.webp`,
    artPosition: '88% 20%',
    heroArtPosition: '84% 18%',
    atmosphere: 'dimensional',
    icon: `${BASE}/icons/rinne-sharingan.svg`,
    accentHex: '#e2a3c7',
    accentSoftRgba: 'rgba(226, 163, 199, 0.16)',
    accentBorderRgba: 'rgba(226, 163, 199, 0.38)',
    isDojutsu: true,
    targetSection: 'protocol',
    containmentProtocol: 'kaguya',
  },
] as const;

export function getOfficialProtocolById(id: string): ProtocolVisualIdentity | undefined {
  return OFFICIAL_PROTOCOLS.find((protocol) => protocol.id === id);
}

/**
 * Tokens semânticos estritamente desacoplados da paleta individual dos personagens.
 * A cor do personagem nunca indica erro, alerta ou incidente.
 */
export const SEMANTIC_STATUS_STYLES: Record<
  SemanticStatusTone,
  { badge: string; dot: string; labelPrefix: string }
> = {
  success: {
    badge: 'bg-emerald-500/12 border-emerald-400/30 text-emerald-200',
    dot: 'bg-emerald-400',
    labelPrefix: 'OK',
  },
  warning: {
    badge: 'bg-amber-500/12 border-amber-400/30 text-amber-200',
    dot: 'bg-amber-400',
    labelPrefix: 'ATENÇÃO',
  },
  info: {
    badge: 'bg-sky-500/12 border-sky-400/30 text-sky-200',
    dot: 'bg-sky-400',
    labelPrefix: 'INFO',
  },
  danger: {
    badge: 'bg-rose-500/15 border-rose-400/35 text-rose-200',
    dot: 'bg-rose-400',
    labelPrefix: 'FALHA',
  },
  critical: {
    badge: 'bg-red-600/20 border-red-400/50 text-red-100',
    dot: 'bg-red-400',
    labelPrefix: 'CRÍTICO',
  },
  containment: {
    badge: 'bg-orange-500/18 border-orange-400/45 text-orange-100',
    dot: 'bg-orange-400',
    labelPrefix: 'CONTENÇÃO',
  },
  recovery: {
    badge: 'bg-amber-500/18 border-amber-300/45 text-amber-100',
    dot: 'bg-amber-300',
    labelPrefix: 'RECUPERAÇÃO',
  },
  unknown: {
    badge: 'bg-zinc-500/15 border-zinc-400/25 text-zinc-300',
    dot: 'bg-zinc-400',
    labelPrefix: 'PENDENTE',
  },
};
