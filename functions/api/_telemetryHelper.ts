/**
 * Telemetry & Analytics Helper — Cloudflare Pages Functions
 *
 * Registra e calcula estatísticas de tráfego e acessos:
 * - Total de Pageviews (Acessos globais e por página)
 * - Visitantes Únicos Diários (hashed IP + data)
 * - Dispositivos (Mobile vs Desktop)
 * - Países e Cidades
 * - Origens / Referrers
 *
 * Mantém estatísticas e histórico de acessos em memória de execução do Edge.
 */

export interface AccessLog {
  id: string;
  timestamp: string;
  path: string;
  ip: string;
  country?: string;
  city?: string;
  device: 'mobile' | 'desktop' | 'tablet' | 'bot';
  userAgent: string;
  referrer?: string;
}

export interface TelemetryData {
  totalPageviews: number;
  todayPageviews: number;
  uniqueVisitorsTotal: number;
  uniqueVisitorsToday: number;
  lastUpdated: string;
  pageviewsByPath: Record<string, number>;
  deviceBreakdown: {
    mobile: number;
    desktop: number;
    tablet: number;
    bot: number;
  };
  topCountries: Record<string, number>;
  recentAccesses: AccessLog[];
}

export interface TelemetryEnv {
  [key: string]: any;
}

const MAX_RECENT_ACCESSES = 300;

// Estado em memória local ao worker isolate
let inMemoryTelemetry: TelemetryData = {
  totalPageviews: 0,
  todayPageviews: 0,
  uniqueVisitorsTotal: 0,
  uniqueVisitorsToday: 0,
  lastUpdated: new Date().toISOString(),
  pageviewsByPath: {},
  deviceBreakdown: { mobile: 0, desktop: 0, tablet: 0, bot: 0 },
  topCountries: {},
  recentAccesses: [],
};

// Set de hashes únicos diários
const dailyUniqueHashes = new Set<string>();

// IPs de administradores autenticados (preenchido em tempo de execução) excluídos da telemetria
const KNOWN_ADMIN_IPS = new Set<string>();

/**
 * Registra um IP autenticado como administrador para ignorá-lo na telemetria
 */
export function registerAdminIp(ip: string) {
  if (ip && ip !== '127.0.0.1') {
    KNOWN_ADMIN_IPS.add(ip);
  }
}

/**
 * Verifica se um IP pertence a um administrador
 */
export function isAdminIp(ip: string): boolean {
  return KNOWN_ADMIN_IPS.has(ip);
}

/**
 * Detecta o tipo de dispositivo a partir do User-Agent
 */
export function detectDevice(ua: string): 'mobile' | 'desktop' | 'tablet' | 'bot' {
  const lower = ua.toLowerCase();
  if (
    lower.includes('bot') ||
    lower.includes('spider') ||
    lower.includes('crawler') ||
    lower.includes('headless')
  ) {
    return 'bot';
  }
  if (lower.includes('ipad') || lower.includes('tablet')) {
    return 'tablet';
  }
  if (
    lower.includes('mobi') ||
    lower.includes('iphone') ||
    lower.includes('android') ||
    lower.includes('phone')
  ) {
    return 'mobile';
  }
  return 'desktop';
}

/**
 * Mascara o IP para conformidade com a LGPD (minimização de dados).
 * Transforma IPv4 em 123.45.***.*** e IPv6 em 2804:14d:5483::****.
 */
export function maskIp(ip: string): string {
  if (!ip) return '0.0.0.0';
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***`;
    }
  }
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return `${parts.slice(0, 3).join(':')}::****`;
  }
  return '***.***';
}

/**
 * Registra um acesso/pageview no sistema (somente para visitantes públicos reais)
 */
export async function recordPageview(
  env: TelemetryEnv,
  request: Request,
  pathOverride?: string
): Promise<AccessLog | null> {
  const url = new URL(request.url);
  const path = pathOverride || url.pathname || '/';

  const clientIp =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For') ||
    '127.0.0.1';

  // 0. Bloqueio absoluto de Administradores:
  // Se o IP for de administrador ou se houver cookie de sessão admin, NUNCA registra
  const cookieHeader = request.headers.get('Cookie') || '';
  const hasAdminBypass =
    cookieHeader.includes('__Host-Admin-Session') ||
    cookieHeader.includes('nua_admin_session') ||
    cookieHeader.includes('nua_admin_bypass=1');

  if (isAdminIp(clientIp) || hasAdminBypass) {
    return null;
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const country = request.headers.get('CF-IPCountry') || 'BR';
  const city = request.headers.get('CF-IPCity') || '';
  const userAgent = request.headers.get('User-Agent') || 'Desconhecido';
  const referrer = request.headers.get('Referer') || undefined;
  const device = detectDevice(userAgent);

  const accessId = `acc_${now.getTime()}_${Math.random().toString(36).substring(2, 7)}`;
  const accessLog: AccessLog = {
    id: accessId,
    timestamp: now.toISOString(),
    path,
    ip: maskIp(clientIp),
    country,
    city: city ? decodeURIComponent(city) : undefined,
    device,
    userAgent,
    referrer,
  };

  // 1. Atualiza métricas em memória
  inMemoryTelemetry.totalPageviews += 1;
  inMemoryTelemetry.todayPageviews += 1;
  inMemoryTelemetry.lastUpdated = now.toISOString();

  // Contagem por página
  inMemoryTelemetry.pageviewsByPath[path] = (inMemoryTelemetry.pageviewsByPath[path] || 0) + 1;

  // Dispositivos
  inMemoryTelemetry.deviceBreakdown[device] = (inMemoryTelemetry.deviceBreakdown[device] || 0) + 1;

  // Países
  if (country) {
    inMemoryTelemetry.topCountries[country] = (inMemoryTelemetry.topCountries[country] || 0) + 1;
  }

  // Visitantes únicos (hash simples de IP + dia)
  const visitorKey = `${todayStr}:${clientIp}`;
  if (!dailyUniqueHashes.has(visitorKey)) {
    dailyUniqueHashes.add(visitorKey);
    inMemoryTelemetry.uniqueVisitorsToday += 1;
    inMemoryTelemetry.uniqueVisitorsTotal += 1;
  }

  // Histórico recente
  inMemoryTelemetry.recentAccesses.unshift(accessLog);
  if (inMemoryTelemetry.recentAccesses.length > MAX_RECENT_ACCESSES) {
    inMemoryTelemetry.recentAccesses.pop();
  }

  return accessLog;
}

/**
 * Recupera o consolidado de telemetria
 */
export async function getTelemetryStats(env: TelemetryEnv): Promise<TelemetryData> {
  return {
    ...inMemoryTelemetry,
    recentAccesses: inMemoryTelemetry.recentAccesses.filter((a) => !isAdminIp(a.ip)),
  };
}

/**
 * Reseta todas as métricas de telemetria (para zerar contagens de teste)
 */
export async function resetTelemetryStats(env: TelemetryEnv): Promise<TelemetryData> {
  inMemoryTelemetry = {
    totalPageviews: 0,
    todayPageviews: 0,
    uniqueVisitorsTotal: 0,
    uniqueVisitorsToday: 0,
    lastUpdated: new Date().toISOString(),
    pageviewsByPath: {},
    deviceBreakdown: { mobile: 0, desktop: 0, tablet: 0, bot: 0 },
    topCountries: {},
    recentAccesses: [],
  };
  dailyUniqueHashes.clear();

  return inMemoryTelemetry;
}
