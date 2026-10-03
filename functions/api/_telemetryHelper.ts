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
 * Persiste no Cloudflare R2 ('audit/telemetry.json') com buffer em memória.
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

interface EnvWithR2 {
  BUCKET?: any;
  [key: string]: any;
}

const R2_TELEMETRY_KEY = 'audit/telemetry.json';
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

// IPs e Identificadores de Administradores/Desenvolvedores a serem 100% excluídos da telemetria
const KNOWN_ADMIN_IPS = new Set<string>([
  '186.251.246.210', // IP do Desenvolvedor / Philippe
]);

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
 * Registra um acesso/pageview no sistema (somente para visitantes públicos reais)
 */
export async function recordPageview(
  env: EnvWithR2,
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
  // Se o IP for de administrador ou se houver cookie de bypass/sessão admin, NUNCA registra
  const cookieHeader = request.headers.get('Cookie') || '';
  const hasAdminBypass =
    cookieHeader.includes('nua_admin_bypass=1') ||
    cookieHeader.includes('__Host-Admin-Session') ||
    cookieHeader.includes('nua_admin_session');

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
    ip: clientIp,
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

  // 2. Persiste no Cloudflare R2 se disponível (amostragem ou batch assíncrono)
  if (env.BUCKET && typeof env.BUCKET.put === 'function') {
    try {
      // Salva snapshot consolidado
      await env.BUCKET.put(R2_TELEMETRY_KEY, JSON.stringify(inMemoryTelemetry, null, 2), {
        httpMetadata: { contentType: 'application/json' },
      });
    } catch (err) {
      console.error('[Telemetry] Falha ao persistir no R2:', err);
    }
  }

  return accessLog;
}

/**
 * Recupera o consolidado de telemetria
 */
export async function getTelemetryStats(env: EnvWithR2): Promise<TelemetryData> {
  if (env.BUCKET && typeof env.BUCKET.get === 'function') {
    try {
      const obj = await env.BUCKET.get(R2_TELEMETRY_KEY);
      if (obj) {
        const text = await obj.text();
        const stored: TelemetryData = JSON.parse(text);

        // Mescla com acessos mais recentes em memória e filtra IPs de administração
        const rawAccesses = inMemoryTelemetry.recentAccesses.length > 0
          ? inMemoryTelemetry.recentAccesses
          : stored.recentAccesses || [];
        const filteredAccesses = rawAccesses.filter((a) => !isAdminIp(a.ip));

        return {
          ...stored,
          totalPageviews: Math.max(stored.totalPageviews || 0, inMemoryTelemetry.totalPageviews),
          uniqueVisitorsToday: Math.max(
            stored.uniqueVisitorsToday || 0,
            inMemoryTelemetry.uniqueVisitorsToday
          ),
          recentAccesses: filteredAccesses,
        };
      }
    } catch (err) {
      console.error('[Telemetry] Falha ao ler do R2:', err);
    }
  }

  return {
    ...inMemoryTelemetry,
    recentAccesses: inMemoryTelemetry.recentAccesses.filter((a) => !isAdminIp(a.ip)),
  };
}

/**
 * Reseta todas as métricas de telemetria (para zerar contagens de teste)
 */
export async function resetTelemetryStats(env: EnvWithR2): Promise<TelemetryData> {
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

  if (env.BUCKET && typeof env.BUCKET.put === 'function') {
    try {
      await env.BUCKET.put(R2_TELEMETRY_KEY, JSON.stringify(inMemoryTelemetry, null, 2), {
        httpMetadata: { contentType: 'application/json' },
      });
    } catch (err) {
      console.error('[Telemetry] Falha ao zerar no R2:', err);
    }
  }

  return inMemoryTelemetry;
}
